/**
 * Soma Core — Muscles
 *
 * Discovers, loads, and manages muscle memory files.
 * Muscles are learned patterns stored in .soma/memory/muscles/.
 * They load at boot based on heat, within a configurable token budget.
 *
 * Loading tiers:
 *   - cold: name only (listed, not injected)
 *   - warm: digest block only (compact context)
 *   - hot: full body (complete reference)
 *
 * Frontmatter fields (muscle convention):
 *   - topic: string[]  — what this muscle covers
 *   - keywords: string[] — finer search terms
 *   - heat: number — current heat (0 = cold)
 *   - loads: number — how many times loaded at boot
 *   - status: active | dormant | retired
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join, basename } from "path";
import { safeRead } from "./utils.js";
import type { SomaDir } from "./discovery.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Muscle {
	/** Muscle name (from filename, kebab-case) */
	name: string;
	/** Full file content */
	content: string;
	/** Digest block content (between digest markers) */
	digest: string | null;
	/** File path */
	path: string;
	/** Topics from frontmatter */
	topics: string[];
	/** Keywords from frontmatter */
	keywords: string[];
	/** Current heat level */
	heat: number;
	/** Times loaded at boot */
	loads: number;
	/** Status */
	status: "active" | "dormant" | "retired";
	/** Created date (YYYY-MM-DD from frontmatter, if present) */
	created: string | null;
}

export interface MuscleInjection {
	/** Hot muscles — full content in system prompt */
	hot: Muscle[];
	/** Warm muscles — digest only in system prompt */
	warm: Muscle[];
	/** Cold muscles — name listed, not loaded */
	cold: Muscle[];
	/** Formatted string ready for system prompt injection */
	systemPromptBlock: string;
	/** Total estimated tokens used */
	estimatedTokens: number;
}

export interface MuscleLoadConfig {
	/** Max estimated tokens for all muscle content (default: 2000) */
	tokenBudget: number;
	/** Max muscles to load with full content (default: 2) */
	maxFull: number;
	/** Max muscles to load with digest (default: 8) */
	maxDigest: number;
	/** Heat threshold for full loading (default: 5) */
	fullThreshold: number;
	/** Heat threshold for digest loading (default: 1) */
	digestThreshold: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: MuscleLoadConfig = {
	tokenBudget: 2000,
	maxFull: 2,
	maxDigest: 8,
	fullThreshold: 5,
	digestThreshold: 1,
};

// ---------------------------------------------------------------------------
// Frontmatter + digest parsing
// ---------------------------------------------------------------------------

function extractFrontmatter(content: string): Record<string, string> {
	const fm: Record<string, string> = {};
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return fm;

	for (const line of match[1].split("\n")) {
		const idx = line.indexOf(":");
		if (idx > 0) {
			const key = line.slice(0, idx).trim();
			let value = line.slice(idx + 1).trim();
			if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
				value = value.slice(1, -1);
			}
			fm[key] = value;
		}
	}
	return fm;
}

function parseArrayField(value: string | undefined): string[] {
	if (!value) return [];
	// Handle YAML array syntax: [a, b, c]
	const match = value.match(/^\[(.*)\]$/);
	if (match) {
		return match[1].split(",").map(s => s.trim()).filter(Boolean);
	}
	// Single value
	return [value.trim()].filter(Boolean);
}

function extractDigest(content: string): string | null {
	const match = content.match(/<!-- digest:start -->\n([\s\S]*?)\n<!-- digest:end -->/);
	return match ? match[1].trim() : null;
}

function stripFrontmatter(content: string): string {
	return content.replace(/^---\n[\s\S]*?\n---\n*/, "").trim();
}

/** Rough token estimate: ~4 chars per token */
function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Discover all muscle files in a soma directory.
 *
 * @param soma - The SomaDir to scan
 * @param overrideDir - Optional override for muscle directory path (from settings.paths)
 * @returns Array of Muscle objects sorted by heat (descending)
 */
export function discoverMuscles(soma: SomaDir, overrideDir?: string): Muscle[] {
	const muscleDir = overrideDir || join(soma.path, "memory", "muscles");
	if (!existsSync(muscleDir)) return [];

	const muscles: Muscle[] = [];

	try {
		const files = readdirSync(muscleDir).filter(
			f => f.endsWith(".md") && !f.startsWith(".") && !f.startsWith("_")
		);

		for (const file of files) {
			const filePath = join(muscleDir, file);
			const content = safeRead(filePath);
			if (!content) continue;

			const fm = extractFrontmatter(content);
			const status = fm["status"] as Muscle["status"] || "active";

			// Skip retired muscles
			if (status === "retired") continue;

			muscles.push({
				name: basename(file, ".md"),
				content,
				digest: extractDigest(content),
				path: filePath,
				topics: parseArrayField(fm["topic"]),
				keywords: parseArrayField(fm["keywords"]),
				heat: parseInt(fm["heat"] || "0", 10) || 0,
				loads: parseInt(fm["loads"] || "0", 10) || 0,
				status,
				created: (fm["created"] as string) || null,
			});
		}
	} catch {
		/* ignore scan errors */
	}

	// Sort by heat descending
	return muscles.sort((a, b) => b.heat - a.heat);
}

/**
 * Discover muscles from a soma chain (project → parent → global).
 * Project muscles shadow same-named parent/global ones.
 */
/**
 * Discover muscles from the full soma chain.
 * Child muscles win on name collision (first found).
 *
 * When `settings.inherit.muscles` is false, only scans chain[0].
 *
 * @param chain - SomaDir array from getSomaChain()
 * @param settings - Optional settings (for inherit.muscles control)
 */
export function discoverMuscleChain(
	chain: SomaDir[],
	settings?: import("./settings.js").SomaSettings
): Muscle[] {
	// Respect inherit.muscles — if false, only scan chain[0]
	const effectiveChain = (settings?.inherit?.muscles === false && chain.length > 1)
		? [chain[0]]
		: chain;

	const seen = new Set<string>();
	const all: Muscle[] = [];

	for (const soma of effectiveChain) {
		const muscles = discoverMuscles(soma);
		for (const m of muscles) {
			if (!seen.has(m.name)) {
				seen.add(m.name);
				all.push(m);
			}
		}
	}

	return all.sort((a, b) => b.heat - a.heat);
}

/**
 * Build the muscle injection for the system prompt.
 * Respects token budget and loading tiers.
 *
 * @param muscles - All discovered muscles (pre-sorted by heat)
 * @param config - Loading configuration
 * @returns MuscleInjection with categorized muscles and formatted block
 */
export function buildMuscleInjection(
	muscles: Muscle[],
	config: Partial<MuscleLoadConfig> = {}
): MuscleInjection {
	const cfg = { ...DEFAULT_CONFIG, ...config };

	// Cold-start boost: muscles created in the last 48h get a temporary heat bump
	// so they can compete with established muscles for loading slots.
	// This doesn't mutate the original — we work with effective heat values.
	const COLD_START_WINDOW_MS = 48 * 3600 * 1000;
	const COLD_START_BOOST = 3;
	const now = Date.now();

	const effectiveHeat = (m: Muscle): number => {
		if (m.created) {
			try {
				const createdMs = new Date(m.created).getTime();
				if (now - createdMs < COLD_START_WINDOW_MS) {
					return Math.max(m.heat, cfg.digestThreshold + COLD_START_BOOST);
				}
			} catch { /* invalid date, no boost */ }
		}
		return m.heat;
	};

	// Re-sort with effective heat so boosted muscles compete fairly
	const sorted = [...muscles].sort((a, b) => effectiveHeat(b) - effectiveHeat(a));

	const hot: Muscle[] = [];
	const warm: Muscle[] = [];
	const cold: Muscle[] = [];
	let tokensUsed = 0;

	for (const muscle of sorted) {
		const heat = effectiveHeat(muscle);

		// Skip dormant muscles unless explicitly hot
		if (muscle.status === "dormant" && heat < cfg.fullThreshold) {
			cold.push(muscle);
			continue;
		}

		if (
			heat >= cfg.fullThreshold &&
			hot.length < cfg.maxFull
		) {
			// Full body loading
			const body = stripFrontmatter(muscle.content);
			const tokens = estimateTokens(body);
			if (tokensUsed + tokens <= cfg.tokenBudget) {
				hot.push(muscle);
				tokensUsed += tokens;
				continue;
			}
			// Over budget for full — try digest instead
		}

		if (
			heat >= cfg.digestThreshold &&
			warm.length < cfg.maxDigest &&
			muscle.digest
		) {
			const tokens = estimateTokens(muscle.digest);
			if (tokensUsed + tokens <= cfg.tokenBudget) {
				warm.push(muscle);
				tokensUsed += tokens;
				continue;
			}
		}

		cold.push(muscle);
	}

	// Build system prompt block
	const lines: string[] = [];

	if (hot.length > 0 || warm.length > 0) {
		lines.push("## Muscle Memory\n");
	}

	if (hot.length > 0) {
		for (const m of hot) {
			const body = stripFrontmatter(m.content);
			lines.push(`### ${m.name}\n${body}\n`);
		}
	}

	if (warm.length > 0) {
		for (const m of warm) {
			lines.push(m.digest! + "\n");
		}
	}

	if (cold.length > 0) {
		const coldList = cold.map(m => {
			// Extract a brief hint from digest or first content line after frontmatter
			let hint = "";
			if (m.digest) {
				// Strip markdown bold wrapper and leading "Name —" pattern, take first ~60 chars
				hint = m.digest
					.replace(/^>\s*\*\*[^*]+\*\*\s*[—–-]\s*/m, "")
					.replace(/\n.*/s, "")
					.trim();
				if (hint.length > 60) hint = hint.slice(0, 57) + "...";
			}
			return hint ? `${m.name} (${hint})` : m.name;
		});
		lines.push(`**Available muscles (not loaded):** ${coldList.join("; ")}\n`);
	}

	return {
		hot,
		warm,
		cold,
		systemPromptBlock: lines.join("\n"),
		estimatedTokens: tokensUsed,
	};
}

/**
 * Increment load count for muscles that were loaded at boot.
 * Updates the frontmatter `loads` field in-place.
 *
 * @param muscles - Muscles that were loaded (hot + warm)
 */
export function trackMuscleLoads(muscles: Muscle[]): void {
	for (const muscle of muscles) {
		const content = safeRead(muscle.path);
		if (!content) continue;

		const newLoads = muscle.loads + 1;

		// Update loads field in frontmatter
		const updated = content.replace(
			/^(---\n[\s\S]*?)loads:\s*\d+([\s\S]*?\n---)/,
			`$1loads: ${newLoads}$2`
		);

		if (updated !== content) {
			writeFileSync(muscle.path, updated);
			muscle.loads = newLoads;
		}
	}
}

/**
 * Bump heat for a muscle by name. Used when a muscle is referenced mid-session.
 *
 * @param soma - The SomaDir containing the muscle
 * @param muscleName - Muscle filename (without .md)
 * @param amount - Heat to add (default: 1)
 * @param overrideDir - Optional override for muscle directory path (from settings.paths)
 */
export function bumpMuscleHeat(soma: SomaDir, muscleName: string, amount: number = 1, overrideDir?: string): void {
	const filePath = join(overrideDir || join(soma.path, "memory", "muscles"), `${muscleName}.md`);
	const content = safeRead(filePath);
	if (!content) return;

	const fm = extractFrontmatter(content);
	const currentHeat = parseInt(fm["heat"] || "0", 10) || 0;
	const newHeat = Math.max(0, Math.min(currentHeat + amount, 15));

	const updated = content.replace(
		/^(---\n[\s\S]*?)heat:\s*\d+([\s\S]*?\n---)/,
		`$1heat: ${newHeat}$2`
	);

	if (updated !== content) {
		writeFileSync(filePath, updated);
	}
}

/**
 * Decay heat for muscles not referenced this session.
 *
 * @param soma - The SomaDir to scan
 * @param referencedThisSession - Set of muscle names used this session
 * @param decayRate - How much heat to remove (default: 1)
 */
export function decayMuscleHeat(
	soma: SomaDir,
	referencedThisSession: Set<string>,
	decayRate: number = 1
): void {
	const muscles = discoverMuscles(soma);
	for (const muscle of muscles) {
		if (referencedThisSession.has(muscle.name)) continue;
		if (muscle.heat <= 0) continue;

		const content = safeRead(muscle.path);
		if (!content) continue;

		const newHeat = Math.max(0, muscle.heat - decayRate);
		const updated = content.replace(
			/^(---\n[\s\S]*?)heat:\s*\d+([\s\S]*?\n---)/,
			`$1heat: ${newHeat}$2`
		);

		if (updated !== content) {
			writeFileSync(muscle.path, updated);
		}
	}
}
