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
import { resolveSomaPath } from "./settings.js";
import type { SomaSettings } from "./settings.js";

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
 * Checks configured preloads dir, root, and legacy memory/ subdirectory.
 * Falls back to most recent preload-*.md.
 *
 * @param soma - The SomaDir to search in
 * @param maxAgeHours - Maximum age before marking stale (default: 48)
 * @param settings - Optional settings for path resolution
 * @returns PreloadInfo if found, null otherwise
 */
export function findPreload(soma: SomaDir, maxAgeHours: number = 48, settings?: SomaSettings | null): PreloadInfo | null {
	const preloadDir = resolveSomaPath(soma.path, "preloads", settings);
	const searchDirs: string[] = [];
	// Configured preloads dir first
	if (existsSync(preloadDir)) searchDirs.push(preloadDir);
	// Then soma root (legacy location)
	if (!searchDirs.includes(soma.path)) searchDirs.push(soma.path);
	// Legacy: memory/ subdirectory
	const legacyMemoryDir = join(soma.path, "memory");
	if (existsSync(legacyMemoryDir) && !searchDirs.includes(legacyMemoryDir)) searchDirs.push(legacyMemoryDir);

	// Find most recent preload-*.md (session-scoped or legacy preload-next.md)
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
export function hasPreload(soma: SomaDir, settings?: SomaSettings | null): boolean {
	const preloadDir = resolveSomaPath(soma.path, "preloads", settings);
	const dirs = [preloadDir, soma.path, join(soma.path, "memory")];
	// Deduplicate
	const unique = [...new Set(dirs)];
	for (const dir of unique) {
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
