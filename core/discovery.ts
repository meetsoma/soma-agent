/**
 * Soma Core — Discovery
 *
 * Finds .soma/ directories by walking up the filesystem.
 * Handles project-level, parent, and user-global resolution.
 *
 * Root directory is configurable: .soma/ by default, but can be
 * .claude/, .cursor/, or any custom path.
 */

import { existsSync } from "fs";
import { join, resolve, basename, dirname } from "path";
import { getAgentDir } from "@mariozechner/pi-coding-agent";

// ---------------------------------------------------------------------------
// Root directory resolution
// ---------------------------------------------------------------------------

const AGENT_DIR = getAgentDir(); // e.g., ~/.soma/agent
const DEFAULT_ROOT = basename(dirname(AGENT_DIR)); // ".soma"

/**
 * Root directory names to scan for, in priority order.
 * First match wins. Configurable via settings.json (future).
 */
const SCAN_ORDER = [DEFAULT_ROOT, ".claude", ".cursor"];

/**
 * Marker files/dirs that identify a valid soma root directory.
 * At least one must exist for a directory to be recognized.
 * Includes both AMPS layout ("amps") and legacy layout ("memory", "protocols").
 */
const MARKERS = ["STATE.md", "identity.md", "amps", "memory", "protocols", "settings.json"];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SomaDir {
	/** Absolute path to the .soma/ (or equivalent) directory */
	path: string;
	/** The root directory name (e.g., ".soma", ".claude") */
	rootName: string;
	/** The project directory containing this soma root */
	projectDir: string;
}

/**
 * Walk up from `startDir` to find the nearest soma root directory.
 * Checks each directory for SCAN_ORDER names with at least one MARKER.
 *
 * @param startDir - Directory to start searching from (default: cwd)
 * @returns SomaDir if found, null otherwise
 */
export function findSomaDir(startDir?: string): SomaDir | null {
	let dir = startDir || process.cwd();
	const root = resolve("/");

	while (dir !== root) {
		for (const rootName of SCAN_ORDER) {
			const candidate = join(dir, rootName);
			if (existsSync(candidate) && MARKERS.some(m => existsSync(join(candidate, m)))) {
				return {
					path: candidate,
					rootName,
					projectDir: dir,
				};
			}
		}
		dir = resolve(dir, "..");
	}
	return null;
}

/**
 * Find the parent soma directory above the given one.
 * Starts searching from the parent of the project directory.
 *
 * @param childSoma - The child SomaDir to find the parent of
 * @returns SomaDir if a parent exists, null otherwise
 */
export function findParentSomaDir(childSoma: SomaDir): SomaDir | null {
	const parentStart = resolve(childSoma.projectDir, "..");
	return findSomaDir(parentStart);
}

/**
 * Find the user-global soma directory (~/.soma/ or equivalent).
 *
 * @returns SomaDir if found, null otherwise
 */
export function findGlobalSomaDir(): SomaDir | null {
	const home = process.env.HOME || process.env.USERPROFILE;
	if (!home) return null;

	for (const rootName of SCAN_ORDER) {
		const candidate = join(home, rootName);
		if (existsSync(candidate)) {
			return {
				path: candidate,
				rootName,
				projectDir: home,
			};
		}
	}
	return null;
}

/**
 * Get the full resolution chain: project → parent → ... → global.
 * Each level is independent — no automatic inheritance.
 *
 * @param startDir - Directory to start from (default: cwd)
 * @returns Array of SomaDir from most specific to most general
 */
export function getSomaChain(startDir?: string): SomaDir[] {
	const chain: SomaDir[] = [];
	const seen = new Set<string>();

	// Project level
	const project = findSomaDir(startDir);
	if (project) {
		chain.push(project);
		seen.add(project.path);

		// Walk up parents
		let current = project;
		let parent = findParentSomaDir(current);
		while (parent && !seen.has(parent.path)) {
			chain.push(parent);
			seen.add(parent.path);
			current = parent;
			parent = findParentSomaDir(current);
		}
	}

	// Global (if not already in chain)
	const global = findGlobalSomaDir();
	if (global && !seen.has(global.path)) {
		chain.push(global);
	}

	return chain;
}

/** Re-export for convenience */
export { DEFAULT_ROOT, SCAN_ORDER, MARKERS };
