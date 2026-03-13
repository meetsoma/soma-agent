/**
 * Soma Core — Utilities
 *
 * Shared helpers used across all core modules.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join, basename } from "path";

/**
 * Safely read a file, returning null on any error.
 */
export function safeRead(path: string): string | null {
	try {
		if (existsSync(path)) return readFileSync(path, "utf-8");
	} catch {
		/* ignore */
	}
	return null;
}

/**
 * Format milliseconds as human-readable duration.
 */
export function fmtDuration(ms: number): string {
	const secs = Math.floor(ms / 1000);
	if (secs >= 3600) return `${Math.floor(secs / 3600)}h${Math.floor((secs % 3600) / 60)}m`;
	if (secs >= 60) return `${Math.floor(secs / 60)}m${(secs % 60).toString().padStart(2, "0")}s`;
	return `${secs}s`;
}

// ---------------------------------------------------------------------------
// Frontmatter & Content Parsing — shared across protocols, muscles, automations
// ---------------------------------------------------------------------------

/**
 * Extract frontmatter key-value pairs from a markdown file.
 * Returns empty object if no frontmatter found.
 */
export function extractFrontmatter(content: string): Record<string, string> {
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

/**
 * Parse a YAML-style array field: "[a, b, c]" → ["a", "b", "c"]
 * Also handles single values.
 */
export function parseArrayField(value: string | undefined): string[] {
	if (!value) return [];
	const match = value.match(/^\[(.*)\]$/);
	if (match) {
		return match[1].split(",").map(s => s.trim()).filter(Boolean);
	}
	return [value.trim()].filter(Boolean);
}

/**
 * Extract digest block from markdown content (between digest markers).
 */
export function extractDigest(content: string): string | null {
	const match = content.match(/<!-- digest:start -->\n([\s\S]*?)\n<!-- digest:end -->/);
	return match ? match[1].trim() : null;
}

/**
 * Strip frontmatter from markdown content.
 */
export function stripFrontmatter(content: string): string {
	return content.replace(/^---\n[\s\S]*?\n---\n*/, "").trim();
}

/**
 * Rough token estimate: ~4 chars per token.
 */
export function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}

// ---------------------------------------------------------------------------
// Content Discovery — generic skeleton for protocols, muscles, automations
// ---------------------------------------------------------------------------

export interface DiscoverOptions<T> {
	/** Directory to scan */
	dir: string;
	/** Parse a file into a T, or return null to skip */
	parser: (opts: { file: string; filePath: string; content: string; fm: Record<string, string> }) => T | null;
	/** Optional file filter (default: .md, no dotfiles, no underscores) */
	fileFilter?: (filename: string) => boolean;
	/** Optional sort comparator */
	sort?: (a: T, b: T) => number;
}

/**
 * Generic content discovery. Scans a directory for markdown files,
 * parses frontmatter, and builds typed objects via a parser function.
 *
 * Used by discoverProtocols, discoverMuscles, discoverAutomations.
 */
export function discoverContent<T>(options: DiscoverOptions<T>): T[] {
	const { dir, parser, sort } = options;
	if (!existsSync(dir)) return [];

	const fileFilter = options.fileFilter ?? (f =>
		f.endsWith(".md") && !f.startsWith(".") && !f.startsWith("_") && f !== "README.md"
	);

	const items: T[] = [];

	try {
		const files = readdirSync(dir).filter(fileFilter);

		for (const file of files) {
			const filePath = join(dir, file);
			const content = safeRead(filePath);
			if (!content) continue;

			const fm = extractFrontmatter(content);
			const item = parser({ file, filePath, content, fm });
			if (item !== null) items.push(item);
		}
	} catch {
		/* ignore scan errors */
	}

	if (sort) items.sort(sort);
	return items;
}

// ---------------------------------------------------------------------------
// Heat Tiering — shared across muscles and automations
// ---------------------------------------------------------------------------

export interface TierConfig {
	fullThreshold: number;
	digestThreshold: number;
	maxFull: number;
	maxDigest: number;
	tokenBudget: number;
}

export interface TierResult<T> {
	hot: T[];
	warm: T[];
	cold: T[];
	tokensUsed: number;
}

export interface TierableItem {
	heat: number;
	status: string;
	created: string | null;
	content: string;
	digest: string | null;
}

/**
 * Tier content items by heat into hot/warm/cold buckets.
 * Handles cold-start boost (48h window), dormant skip, and token budgeting.
 * Used by muscles and automations — protocols use different logic.
 */
export function tierByHeat<T extends TierableItem>(items: T[], cfg: TierConfig): TierResult<T> {
	const COLD_START_WINDOW_MS = 48 * 3600 * 1000;
	const COLD_START_BOOST = 3;
	const now = Date.now();

	const effectiveHeat = (item: T): number => {
		if (item.created) {
			try {
				const createdMs = new Date(item.created).getTime();
				if (now - createdMs < COLD_START_WINDOW_MS) {
					return Math.max(item.heat, cfg.digestThreshold + COLD_START_BOOST);
				}
			} catch { /* invalid date, no boost */ }
		}
		return item.heat;
	};

	const sorted = [...items].sort((a, b) => effectiveHeat(b) - effectiveHeat(a));

	const hot: T[] = [];
	const warm: T[] = [];
	const cold: T[] = [];
	let tokensUsed = 0;

	for (const item of sorted) {
		const heat = effectiveHeat(item);

		if (item.status === "dormant" && heat < cfg.fullThreshold) {
			cold.push(item);
			continue;
		}

		if (heat >= cfg.fullThreshold && hot.length < cfg.maxFull) {
			const body = stripFrontmatter(item.content);
			const tokens = estimateTokens(body);
			if (tokensUsed + tokens <= cfg.tokenBudget) {
				hot.push(item);
				tokensUsed += tokens;
				continue;
			}
		}

		if (heat >= cfg.digestThreshold && warm.length < cfg.maxDigest && item.digest) {
			const tokens = estimateTokens(item.digest);
			if (tokensUsed + tokens <= cfg.tokenBudget) {
				warm.push(item);
				tokensUsed += tokens;
				continue;
			}
		}

		cold.push(item);
	}

	return { hot, warm, cold, tokensUsed };
}

// ---------------------------------------------------------------------------
// Frontmatter Heat Updates — shared across muscles and automations
// ---------------------------------------------------------------------------

/**
 * Update the `heat` field in a markdown file's frontmatter.
 * Returns true if file was modified.
 *
 * @param filePath - Path to the .md file
 * @param newHeat - New heat value (clamped to 0-15)
 * @param addIfMissing - If true, adds heat field after `status:` when missing
 */
export function updateFrontmatterHeat(filePath: string, newHeat: number, addIfMissing = false): boolean {
	const content = safeRead(filePath);
	if (!content) return false;

	const clamped = Math.max(0, Math.min(15, newHeat));

	// Try to replace existing heat field
	const updated = content.replace(
		/^(---\n[\s\S]*?)heat:\s*\d+([\s\S]*?\n---)/,
		`$1heat: ${clamped}$2`
	);

	if (updated !== content) {
		writeFileSync(filePath, updated);
		return true;
	}

	// No heat field found — optionally add it
	if (addIfMissing && !content.includes("heat:")) {
		const withHeat = content.replace(
			/^(---\n[\s\S]*?status:\s*\w+)/m,
			`$1\nheat: ${clamped}`
		);
		if (withHeat !== content) {
			writeFileSync(filePath, withHeat);
			return true;
		}
	}

	return false;
}

// ---------------------------------------------------------------------------
// Deep Merge
// ---------------------------------------------------------------------------

/**
 * Deep merge b into a. b's values override a's.
 * Only merges plain objects — arrays and primitives replace.
 */
export function deepMerge(a: any, b: any): any {
	const result = { ...a };
	for (const key of Object.keys(b)) {
		if (
			b[key] !== null &&
			typeof b[key] === "object" &&
			!Array.isArray(b[key]) &&
			typeof a[key] === "object" &&
			!Array.isArray(a[key])
		) {
			result[key] = deepMerge(a[key], b[key]);
		} else if (b[key] !== undefined) {
			result[key] = b[key];
		}
	}
	return result;
}
