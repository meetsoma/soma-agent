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

import { writeFileSync } from "fs";
import { join, basename } from "path";
import { safeRead, extractFrontmatter, parseArrayField, extractDigest, stripFrontmatter, discoverContent, tierByHeat, updateFrontmatterHeat } from "./utils.js";
import type { SomaDir } from "./discovery.js";
import { resolveSomaPath } from "./settings.js";
import type { SomaSettings } from "./settings.js";

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
// Public API
// ---------------------------------------------------------------------------

/**
 * Discover all muscle files in a soma directory.
 *
 * @param soma - The SomaDir to scan
 * @param settingsOrDir - Settings for path resolution, or an explicit directory path override
 * @returns Array of Muscle objects sorted by heat (descending)
 */
export function discoverMuscles(soma: SomaDir, settingsOrDir?: SomaSettings | string | null): Muscle[] {
	const muscleDir = typeof settingsOrDir === "string"
		? settingsOrDir
		: resolveSomaPath(soma.path, "muscles", settingsOrDir);
	return discoverContent<Muscle>({
		dir: muscleDir,
		fileFilter: f => f.endsWith(".md") && !f.startsWith(".") && !f.startsWith("_"),
		parser: ({ file, filePath, content, fm }) => {
			const status = fm["status"] as Muscle["status"] || "active";
			if (status === "retired") return null;
			return {
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
			};
		},
		sort: (a, b) => b.heat - a.heat,
	});
}

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
		const muscles = discoverMuscles(soma, settings);
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
	const { hot, warm, cold, tokensUsed } = tierByHeat(muscles, cfg);

	// Build system prompt block
	const lines: string[] = [];

	if (hot.length > 0 || warm.length > 0) {
		lines.push("## Muscle Memory\n");
	}

	if (hot.length > 0) {
		for (const m of hot) {
			// System prompt gets digests only — full bodies are in the boot message
			// to avoid duplication. If no digest, use the name as a placeholder.
			if (m.digest) {
				lines.push(`### ${m.name}\n${m.digest}\n`);
			} else {
				const body = stripFrontmatter(m.content);
				lines.push(`### ${m.name}\n${body}\n`);
			}
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
 * @param settings - Optional settings for path resolution
 */
export function bumpMuscleHeat(soma: SomaDir, muscleName: string, amount: number = 1, settings?: SomaSettings | null): void {
	const filePath = join(resolveSomaPath(soma.path, "muscles", settings), `${muscleName}.md`);
	const content = safeRead(filePath);
	if (!content) return;

	const fm = extractFrontmatter(content);
	const currentHeat = parseInt(fm["heat"] || "0", 10) || 0;
	updateFrontmatterHeat(filePath, currentHeat + amount);
}

/**
 * Decay heat for muscles not referenced this session.
 *
 * @param soma - The SomaDir to scan
 * @param referencedThisSession - Set of muscle names used this session
 * @param decayRate - How much heat to remove (default: 1)
 * @param settings - Optional settings for path resolution
 */
export function decayMuscleHeat(
	soma: SomaDir,
	referencedThisSession: Set<string>,
	decayRate: number = 1,
	settings?: SomaSettings | null
): void {
	const muscles = discoverMuscles(soma, settings);
	for (const muscle of muscles) {
		if (referencedThisSession.has(muscle.name)) continue;
		if (muscle.heat <= 0) continue;
		updateFrontmatterHeat(muscle.path, muscle.heat - decayRate);
	}
}
