/**
 * Soma Core — Preload
 *
 * Finds, validates, and loads preload files for session resumption.
 * Handles staleness detection and multiple preload locations.
 */

import { existsSync, readdirSync, statSync } from "fs";
import { join, basename } from "path";
import { safeRead } from "./utils.js";
import type { SomaDir } from "./discovery.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PreloadInfo {
	/** Absolute path to the preload file */
	path: string;
	/** Filename */
	name: string;
	/** Age in hours */
	ageHours: number;
	/** Whether the preload is stale (> maxAge) */
	stale: boolean;
	/** File content */
	content: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Find the best preload file in a soma directory.
 * Checks root and memory/ subdirectory. Prefers preload-next.md,
 * falls back to most recent preload-*.md.
 *
 * @param soma - The SomaDir to search in
 * @param maxAgeHours - Maximum age before marking stale (default: 48)
 * @returns PreloadInfo if found, null otherwise
 */
export function findPreload(soma: SomaDir, maxAgeHours: number = 48): PreloadInfo | null {
	const searchDirs = [soma.path];
	const memoryDir = join(soma.path, "memory");
	if (existsSync(memoryDir)) searchDirs.push(memoryDir);

	// First: look for preload-next.md specifically
	for (const dir of searchDirs) {
		const path = join(dir, "preload-next.md");
		if (existsSync(path)) {
			return buildPreloadInfo(path, maxAgeHours);
		}
	}

	// Fallback: most recent preload-*.md
	for (const dir of searchDirs) {
		try {
			const files = readdirSync(dir)
				.filter(f => f.startsWith("preload-") && f.endsWith(".md"))
				.map(f => ({
					path: join(dir, f),
					mtime: statSync(join(dir, f)).mtimeMs,
				}))
				.sort((a, b) => b.mtime - a.mtime);

			if (files.length > 0) {
				return buildPreloadInfo(files[0].path, maxAgeHours);
			}
		} catch {
			/* ignore */
		}
	}

	return null;
}

/**
 * Check if any preload exists (lightweight, no content read).
 */
export function hasPreload(soma: SomaDir): boolean {
	const dirs = [soma.path, join(soma.path, "memory")];
	for (const dir of dirs) {
		try {
			const files = readdirSync(dir).filter(f => f.startsWith("preload-") && f.endsWith(".md"));
			if (files.length > 0) return true;
		} catch {
			/* ignore */
		}
	}
	return false;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function buildPreloadInfo(path: string, maxAgeHours: number): PreloadInfo | null {
	const content = safeRead(path);
	if (!content) return null;

	let ageHours = 0;
	try {
		ageHours = (Date.now() - statSync(path).mtimeMs) / 3600000;
	} catch {
		return null;
	}

	return {
		path,
		name: basename(path),
		ageHours,
		stale: ageHours > maxAgeHours,
		content,
	};
}
