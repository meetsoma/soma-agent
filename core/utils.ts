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
