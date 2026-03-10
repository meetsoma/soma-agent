/**
 * Soma Core — Settings
 *
 * Reads and merges settings.json from the soma chain.
 * Project settings override parent, which override global.
 * Missing fields fall back to built-in defaults.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { SomaDir } from "./discovery.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SomaSettings {
	/** Root directory name */
	root: string;

	/** Memory system settings */
	memory: {
		/** Allow memories to flow up to parent soma (default: false) */
		flowUp: boolean;
	};

	/** Protocol heat thresholds */
	protocols: {
		/** Heat level to show breadcrumb (default: 3) */
		warmThreshold: number;
		/** Heat level to load full body (default: 8) */
		hotThreshold: number;
		/** Maximum heat value (default: 15) */
		maxHeat: number;
		/** Heat decay per session for unused protocols (default: 1) */
		decayRate: number;
		/** Max breadcrumbs in system prompt (default: 10) */
		maxBreadcrumbsInPrompt: number;
		/** Max full protocols in system prompt (default: 3) */
		maxFullProtocolsInPrompt: number;
	};

	/** Muscle loading settings */
	muscles: {
		/** Max estimated tokens for all muscle content (default: 2000) */
		tokenBudget: number;
		/** Max muscles to load with full body (default: 2) */
		maxFull: number;
		/** Max muscles to load with digest (default: 8) */
		maxDigest: number;
		/** Heat threshold for full loading (default: 5) */
		fullThreshold: number;
		/** Heat threshold for digest loading (default: 1) */
		digestThreshold: number;
	};

	/** Heat tracking settings */
	heat: {
		/** Auto-detect protocol usage from tool results (default: true) */
		autoDetect: boolean;
		/** Heat bump for auto-detected usage (default: 1) */
		autoDetectBump: number;
		/** Heat bump for explicit /pin (default: 5) */
		pinBump: number;
	};

	/** Boot sequence settings */
	boot: {
		/** Ordered list of boot steps to run on session start */
		steps: string[];
		/** Git context settings — inject recent changes on boot */
		gitContext: {
			/** Whether to load git context on boot (default: true) */
			enabled: boolean;
			/** How far back to look — "last-session" uses preload timestamp, or a git ref/timespec (default: "24h") */
			since: string;
			/** Max diff lines to include (default: 50) */
			maxDiffLines: number;
			/** Max commit log entries (default: 10) */
			maxCommits: number;
			/** Show full diff or just --stat summary (default: "stat") */
			diffMode: "stat" | "full" | "none";
		};
	};

	/** Context warning thresholds (percentages) */
	context: {
		/** Notify threshold (default: 50) */
		notifyAt: number;
		/** Warning threshold (default: 70) */
		warnAt: number;
		/** Urgent threshold (default: 80) */
		urgentAt: number;
		/** Auto-exhale threshold (default: 85) */
		autoExhaleAt: number;
	};

	/** Preload settings */
	preload: {
		/** Hours before a preload is considered stale (default: 48) */
		staleAfterHours: number;
	};
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS: SomaSettings = {
	root: ".soma",
	memory: {
		flowUp: false,
	},
	protocols: {
		warmThreshold: 3,
		hotThreshold: 8,
		maxHeat: 15,
		decayRate: 1,
		maxBreadcrumbsInPrompt: 10,
		maxFullProtocolsInPrompt: 3,
	},
	muscles: {
		tokenBudget: 2000,
		maxFull: 2,
		maxDigest: 8,
		fullThreshold: 5,
		digestThreshold: 1,
	},
	heat: {
		autoDetect: true,
		autoDetectBump: 1,
		pinBump: 5,
	},
	boot: {
		steps: ["identity", "preload", "protocols", "muscles", "scripts", "git-context"],
		gitContext: {
			enabled: true,
			since: "24h",
			maxDiffLines: 50,
			maxCommits: 10,
			diffMode: "stat",
		},
	},
	context: {
		notifyAt: 50,
		warnAt: 70,
		urgentAt: 80,
		autoExhaleAt: 85,
	},
	preload: {
		staleAfterHours: 48,
	},
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load settings from a single soma directory.
 * Returns partial settings (only what's in the file).
 */
export function loadSettingsFile(soma: SomaDir): Partial<SomaSettings> | null {
	const settingsPath = join(soma.path, "settings.json");
	if (!existsSync(settingsPath)) return null;

	try {
		const raw = readFileSync(settingsPath, "utf-8");
		return JSON.parse(raw) as Partial<SomaSettings>;
	} catch {
		return null;
	}
}

/**
 * Load and merge settings from a soma chain.
 * Project settings override parent, which override global.
 * Missing fields use built-in defaults.
 *
 * @param chain - SomaDir array from getSomaChain() (project first)
 * @returns Complete SomaSettings with all defaults filled
 */
export function loadSettings(chain: SomaDir[]): SomaSettings {
	// Start with defaults, layer overrides from global → parent → project
	// (reverse so project wins)
	let merged = structuredClone(DEFAULTS);

	for (let i = chain.length - 1; i >= 0; i--) {
		const partial = loadSettingsFile(chain[i]);
		if (partial) {
			merged = deepMerge(merged, partial) as SomaSettings;
		}
	}

	return merged;
}

/**
 * Get built-in defaults (no file reading).
 */
export function getDefaultSettings(): SomaSettings {
	return structuredClone(DEFAULTS);
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/**
 * Deep merge b into a. b's values override a's.
 * Only merges plain objects — arrays and primitives replace.
 */
function deepMerge(a: any, b: any): any {
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
