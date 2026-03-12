/**
 * Soma Core — Automations
 *
 * Discovers, loads, and manages automation files.
 * Automations are procedural step-by-step flows stored in .soma/automations/.
 * They're like protocols but action-oriented — "do this" not "behave like this".
 *
 * Loading tiers (same as muscles):
 *   - cold: name + description only (listed, not injected)
 *   - warm: digest block only (compact context)
 *   - hot: full body (complete reference)
 *
 * Frontmatter fields:
 *   - name: string — automation name
 *   - status: active | dormant | retired
 *   - heat: number — current heat (0 = cold)
 *   - trigger: string — when this automation applies (e.g. "session-start", "on-demand")
 *   - tags: string[] — categorization
 *   - description: string — one-line summary
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join, basename } from "path";
import { safeRead, extractFrontmatter, extractDigest, parseArrayField, estimateTokens, stripFrontmatter } from "./utils.js";
// NOTE: These parsing functions are now shared in utils.ts (previously duplicated in muscles.ts and protocols.ts)
import type { SomaDir } from "./discovery.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Automation {
	/** Automation name (from frontmatter or filename, kebab-case) */
	name: string;
	/** Full file content */
	content: string;
	/** Digest block content (between digest markers) */
	digest: string | null;
	/** File path */
	path: string;
	/** Current heat level */
	heat: number;
	/** Status */
	status: "active" | "dormant" | "retired";
	/** When this automation applies */
	trigger: string | null;
	/** Tags from frontmatter */
	tags: string[];
	/** One-line description from frontmatter */
	description: string | null;
	/** Created date (YYYY-MM-DD from frontmatter, if present) */
	created: string | null;
}

export interface AutomationInjection {
	/** Hot automations — full content in system prompt */
	hot: Automation[];
	/** Warm automations — digest only in system prompt */
	warm: Automation[];
	/** Cold automations — name listed, not loaded */
	cold: Automation[];
	/** Total estimated tokens used */
	estimatedTokens: number;
}

export interface AutomationLoadConfig {
	/** Max estimated tokens for all automation content (default: 1500) */
	tokenBudget: number;
	/** Max automations to load with full body (default: 1) */
	maxFull: number;
	/** Max automations to load with digest (default: 3) */
	maxDigest: number;
	/** Heat threshold for full loading (default: 5) */
	fullThreshold: number;
	/** Heat threshold for digest loading (default: 1) */
	digestThreshold: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: AutomationLoadConfig = {
	tokenBudget: 1500,
	maxFull: 1,
	maxDigest: 3,
	fullThreshold: 5,
	digestThreshold: 1,
};

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

/**
 * Discover automations in a single .soma/ directory.
 * Returns sorted by heat descending.
 */
export function discoverAutomations(soma: SomaDir, overrideDir?: string): Automation[] {
	const automationDir = overrideDir || join(soma.path, "automations");
	if (!existsSync(automationDir)) return [];

	const automations: Automation[] = [];

	try {
		const files = readdirSync(automationDir).filter(
			f => f.endsWith(".md") && !f.startsWith(".") && !f.startsWith("_")
		);

		for (const file of files) {
			const filePath = join(automationDir, file);
			const content = safeRead(filePath);
			if (!content) continue;

			const fm = extractFrontmatter(content);
			const status = fm["status"] as Automation["status"] || "active";

			// Skip retired automations
			if (status === "retired") continue;

			automations.push({
				name: (fm["name"] as string) || basename(file, ".md"),
				content,
				digest: extractDigest(content),
				path: filePath,
				heat: parseInt(fm["heat"] || "0", 10) || 0,
				status,
				trigger: (fm["trigger"] as string) || null,
				tags: parseArrayField(fm["tags"]),
				description: (fm["description"] as string) || null,
				created: (fm["created"] as string) || null,
			});
		}
	} catch {
		/* ignore scan errors */
	}

	return automations.sort((a, b) => b.heat - a.heat);
}

/**
 * Discover automations from the full soma chain.
 * Child automations win on name collision (first found).
 */
export function discoverAutomationChain(
	chain: SomaDir[],
	settings?: import("./settings.js").SomaSettings
): Automation[] {
	// Respect inherit settings — reuse tools inheritance flag
	// (automations are tools/scripts-adjacent)
	const effectiveChain = (settings?.inherit?.tools === false && chain.length > 1)
		? [chain[0]]
		: chain;

	const seen = new Set<string>();
	const all: Automation[] = [];

	for (const soma of effectiveChain) {
		const automations = discoverAutomations(soma);
		for (const a of automations) {
			if (!seen.has(a.name)) {
				seen.add(a.name);
				all.push(a);
			}
		}
	}

	return all.sort((a, b) => b.heat - a.heat);
}

// ---------------------------------------------------------------------------
// Injection
// ---------------------------------------------------------------------------

/**
 * Build injection tiers for automations based on heat.
 * Same pattern as muscle injection — hot (full), warm (digest), cold (listed).
 */
export function buildAutomationInjection(
	automations: Automation[],
	config: Partial<AutomationLoadConfig> = {}
): AutomationInjection {
	const cfg = { ...DEFAULT_CONFIG, ...config };

	// Cold-start boost for recently created automations
	const COLD_START_WINDOW_MS = 48 * 3600 * 1000;
	const COLD_START_BOOST = 3;
	const now = Date.now();

	const effectiveHeat = (a: Automation): number => {
		if (a.created) {
			try {
				const createdMs = new Date(a.created).getTime();
				if (now - createdMs < COLD_START_WINDOW_MS) {
					return Math.max(a.heat, cfg.digestThreshold + COLD_START_BOOST);
				}
			} catch { /* invalid date */ }
		}
		return a.heat;
	};

	const sorted = [...automations].sort((a, b) => effectiveHeat(b) - effectiveHeat(a));

	const hot: Automation[] = [];
	const warm: Automation[] = [];
	const cold: Automation[] = [];
	let tokensUsed = 0;

	for (const automation of sorted) {
		const heat = effectiveHeat(automation);

		if (automation.status === "dormant" && heat < cfg.fullThreshold) {
			cold.push(automation);
			continue;
		}

		if (heat >= cfg.fullThreshold && hot.length < cfg.maxFull) {
			const body = stripFrontmatter(automation.content);
			const tokens = estimateTokens(body);
			if (tokensUsed + tokens <= cfg.tokenBudget) {
				hot.push(automation);
				tokensUsed += tokens;
				continue;
			}
		}

		if (heat >= cfg.digestThreshold && warm.length < cfg.maxDigest && automation.digest) {
			const tokens = estimateTokens(automation.digest);
			if (tokensUsed + tokens <= cfg.tokenBudget) {
				warm.push(automation);
				tokensUsed += tokens;
				continue;
			}
		}

		cold.push(automation);
	}

	return { hot, warm, cold, estimatedTokens: tokensUsed };
}

// ---------------------------------------------------------------------------
// Heat management
// ---------------------------------------------------------------------------

/**
 * Bump heat for an automation by name.
 * Reads the file, updates frontmatter heat, writes back.
 */
export function bumpAutomationHeat(soma: SomaDir, name: string, bump: number): void {
	const automationDir = join(soma.path, "automations");
	const filePath = join(automationDir, `${name}.md`);
	if (!existsSync(filePath)) return;

	try {
		const content = readFileSync(filePath, "utf-8");
		const fm = extractFrontmatter(content);
		const currentHeat = parseInt(fm["heat"] || "0", 10) || 0;
		const newHeat = Math.max(0, Math.min(15, currentHeat + bump));

		// Update heat in frontmatter
		const updated = content.replace(
			/^(---\n[\s\S]*?)(heat:\s*\d+)([\s\S]*?---)/m,
			`$1heat: ${newHeat}$3`
		);

		if (updated !== content) {
			writeFileSync(filePath, updated);
		} else if (!content.includes("heat:")) {
			// No heat field — add it after status
			const withHeat = content.replace(
				/^(---\n[\s\S]*?status:\s*\w+)/m,
				`$1\nheat: ${newHeat}`
			);
			writeFileSync(filePath, withHeat);
		}
	} catch {
		/* ignore write errors */
	}
}

/**
 * Decay heat for all automations not referenced this session.
 */
export function decayAutomationHeat(
	soma: SomaDir,
	referenced: Set<string>,
	decayRate: number
): void {
	const automationDir = join(soma.path, "automations");
	if (!existsSync(automationDir)) return;

	try {
		const files = readdirSync(automationDir).filter(
			f => f.endsWith(".md") && !f.startsWith(".") && !f.startsWith("_")
		);

		for (const file of files) {
			const name = basename(file, ".md");
			if (referenced.has(name)) continue; // Used this session — no decay

			const filePath = join(automationDir, file);
			const content = readFileSync(filePath, "utf-8");
			const fm = extractFrontmatter(content);
			const currentHeat = parseInt(fm["heat"] || "0", 10) || 0;

			if (currentHeat <= 0) continue; // Already cold

			const newHeat = Math.max(0, currentHeat - decayRate);
			const updated = content.replace(
				/^(---\n[\s\S]*?)(heat:\s*\d+)([\s\S]*?---)/m,
				`$1heat: ${newHeat}$3`
			);

			if (updated !== content) {
				writeFileSync(filePath, updated);
			}
		}
	} catch {
		/* ignore */
	}
}
