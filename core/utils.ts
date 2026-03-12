/**
 * Soma Core — Utilities
 *
 * Shared helpers used across all core modules.
 */

import { existsSync, readFileSync } from "fs";

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
