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

import { existsSync, readFileSync } from "fs";
import { join, basename } from "path";
import { extractFrontmatter, extractDigest, parseArrayField, discoverContent, tierByHeat, updateFrontmatterHeat } from "./utils.js";
import type { SomaDir } from "./discovery.js";
import { resolveSomaPath } from "./settings.js";
import type { SomaSettings } from "./settings.js";

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
export function discoverAutomations(soma: SomaDir, settingsOrDir?: SomaSettings | string | null): Automation[] {
	const automationDir = typeof settingsOrDir === "string"
		? settingsOrDir
		: resolveSomaPath(soma.path, "automations", settingsOrDir);
	return discoverContent<Automation>({
		dir: automationDir,
		fileFilter: f => f.endsWith(".md") && !f.startsWith(".") && !f.startsWith("_"),
		parser: ({ file, filePath, content, fm }) => {
			const status = fm["status"] as Automation["status"] || "active";
			if (status === "retired") return null;
			return {
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
			};
		},
		sort: (a, b) => b.heat - a.heat,
	});
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
		const automations = discoverAutomations(soma, settings);
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
	const { hot, warm, cold, tokensUsed } = tierByHeat(automations, cfg);
	return { hot, warm, cold, estimatedTokens: tokensUsed };
}

// ---------------------------------------------------------------------------
// Heat management
// ---------------------------------------------------------------------------

/**
 * Bump heat for an automation by name.
 * Reads the file, updates frontmatter heat, writes back.
 */
export function bumpAutomationHeat(soma: SomaDir, name: string, bump: number, settings?: SomaSettings | null): void {
	const automationDir = resolveSomaPath(soma.path, "automations", settings);
	const filePath = join(automationDir, `${name}.md`);
	if (!existsSync(filePath)) return;

	try {
		const content = readFileSync(filePath, "utf-8");
		const fm = extractFrontmatter(content);
		const currentHeat = parseInt(fm["heat"] || "0", 10) || 0;
		updateFrontmatterHeat(filePath, currentHeat + bump, true);
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
	decayRate: number,
	settings?: SomaSettings | null
): void {
	const automations = discoverAutomations(soma, settings);
	for (const automation of automations) {
		if (referenced.has(automation.name)) continue;
		if (automation.heat <= 0) continue;
		updateFrontmatterHeat(automation.path, automation.heat - decayRate);
	}
}
