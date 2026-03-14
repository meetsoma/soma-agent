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
import { deepMerge } from "./utils.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SomaSettings {
	/** Root directory name */
	root: string;

	/** Inheritance settings — what to inherit from parent .soma/ */
	inherit: {
		/** Layer parent's identity below child's (default: true if parent exists) */
		identity: boolean;
		/** Discover parent's protocols (default: true) */
		protocols: boolean;
		/** Discover parent's muscles (default: true) */
		muscles: boolean;
		/** Use parent's tools/scripts (default: true) */
		tools: boolean;
	};

	/** Persona — cosmetic identity overrides */
	persona: {
		/** Custom agent name (null = inherit or default) */
		name: string | null;
		/** Custom emoji for status/logs */
		emoji: string | null;
		/** Custom icon path (SVG/PNG) */
		icon: string | null;
	};

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

	/** Automation loading settings */
	automations: {
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
		/** Auto-exhale threshold (default: 85) — safety net, should never be reached with auto-breathe */
		autoExhaleAt: number;
	};

	/** Breathe settings — session rotation behavior */
	breathe: {
		/** Enable proactive auto-breathe — wraps up at triggerAt% instead of panicking at 85% */
		auto: boolean;
		/** Context % to start wrap-up sequence (default: 50) */
		triggerAt: number;
		/** Context % to write preload and rotate (default: 70) */
		rotateAt: number;
	};

	/** Preload settings */
	preload: {
		/** Hours before a preload is considered stale (default: 48) */
		staleAfterHours: number;
	};

	/** Guard settings — file protection tiers */
	guard: {
		/** Protection level for core soma files (identity.md, STATE.md, protocols/, settings.json, etc.)
		 * "allow" — no guard, power user mode
		 * "warn" — notify on write (default)
		 * "block" — require explicit confirmation before write
		 */
		coreFiles: "allow" | "warn" | "block";
		/**
		 * Dangerous bash command guard.
		 * "allow" — no confirmation prompts (power user / dev mode)
		 * "warn" — confirm before rm -rf, git push --force, etc. (default)
		 * "block" — block dangerous commands entirely
		 */
		bashCommands: "allow" | "warn" | "block";
		/** Expected git identity for this project. Pre-commit hook validates against this.
		 * null = hook checks that email is set (not empty), but doesn't enforce a specific value.
		 */
		gitIdentity: {
			email: string;
			name?: string;
		} | null;
	};

	/** Script discovery settings */
	scripts: {
		/** File extensions to discover as scripts (default: [".sh", ".py", ".ts", ".js", ".mjs"]) */
		extensions: string[];
	};

	/** Session settings — ID format, overwrite protection */
	sessions: {
		/** Session ID format: "hex" (6-char random hash) or "sequential" (s01, s02...) */
		idFormat: "hex" | "sequential";
		/** Prevent overwriting existing session logs and preloads (default: true) */
		overwriteGuard: boolean;
	};

	/** Steno — background session observer. Ghost setting: does nothing without soma-steno extension. */
	steno: {
		/** Enable steno extraction (default: false) */
		enabled: boolean;
	};

	/** Enable debug logging to .soma/debug/ (default: false). Also toggleable via SOMA_DEBUG=1 env var. */
	debug: boolean;

	/** Customizable directory paths (relative to .soma/ root) */
	paths: {
		/** Muscles directory (default: "amps/muscles") */
		muscles: string;
		/** Protocols directory (default: "amps/protocols") */
		protocols: string;
		/** Scripts directory (default: "amps/scripts") */
		scripts: string;
		/** Automations directory (default: "amps/automations") */
		automations: string;
		/** Skills directory (default: "skills") */
		skills: string;
		/** Extensions directory (default: "extensions") */
		extensions: string;
		/** Preloads directory — where preload-*.md files live (default: "memory/preloads") */
		preloads: string;
		/** Identity file path (default: "identity.md") */
		identity: string;
		/** Plans directory (default: "plans") */
		plans: string;
		/** Ideas directory (default: "memory/ideas") */
		ideas: string;
		/** Sessions directory (default: "memory/sessions") */
		sessions: string;
		/** Logs directory (default: "memory/logs") */
		logs: string;
		/** Secrets directory (default: "secrets") */
		secrets: string;
	};

	/** System prompt compilation settings */
	systemPrompt: {
		/** Max estimated tokens for Soma's portion (default: 4000) */
		maxTokens: number;
		/** Include Soma documentation references (default: true) */
		includeSomaDocs: boolean;
		/** Include Pi framework documentation references (default: true) */
		includePiDocs: boolean;
		/** Include CLAUDE.md awareness note (default: true) */
		includeContextAwareness: boolean;
		/** Include skills block from Pi (default: true) */
		includeSkills: boolean;
		/** Include guard awareness (default: true) */
		includeGuardAwareness: boolean;
		/** Put identity in system prompt vs user message (default: true) */
		identityInSystemPrompt: boolean;
	};

	/** Session checkpoint settings — two-track version control */
	checkpoints: {
		/** .soma internal tracking */
		soma: {
			/** Auto-commit .soma on exhale (default: true) */
			autoCommit: boolean;
		};
		/** Project code checkpoints */
		project: {
			/** Checkpoint style: commit, tag, or stash (default: "commit") */
			style: "commit" | "tag" | "stash";
			/** Auto-create checkpoint on exhale (default: false — prompt first) */
			autoCheckpoint: boolean;
			/** Commit message prefix (default: "checkpoint:") */
			prefix: string;
			/** Working branch name, null = current branch (default: null) */
			workingBranch: string | null;
		};
		/** Show diffs from last checkpoint on boot (default: true) */
		diffOnBoot: boolean;
		/** Max diff lines to surface on boot (default: 80) */
		maxDiffLines: number;
	};
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS: SomaSettings = {
	root: ".soma",
	inherit: {
		identity: true,
		protocols: true,
		muscles: true,
		tools: true,
	},
	persona: {
		name: null,
		emoji: null,
		icon: null,
	},
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
	automations: {
		tokenBudget: 1500,
		maxFull: 1,
		maxDigest: 3,
		fullThreshold: 5,
		digestThreshold: 1,
	},
	heat: {
		autoDetect: true,
		autoDetectBump: 1,
		pinBump: 5,
	},
	scripts: {
		extensions: [".sh", ".py", ".ts", ".js", ".mjs"],
	},
	sessions: {
		idFormat: "hex" as const,
		overwriteGuard: true,
	},
	steno: {
		enabled: false,
	},
	debug: false,
	paths: {
		muscles: "amps/muscles",
		protocols: "amps/protocols",
		scripts: "amps/scripts",
		automations: "amps/automations",
		skills: "skills",
		extensions: "extensions",
		preloads: "memory/preloads",
		identity: "identity.md",
		plans: "plans",
		ideas: "memory/ideas",
		sessions: "memory/sessions",
		logs: "memory/logs",
		secrets: "secrets",
	},
	boot: {
		steps: ["identity", "preload", "protocols", "muscles", "automations", "scripts", "git-context"],
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
	breathe: {
		auto: false,
		triggerAt: 50,
		rotateAt: 70,
	},
	preload: {
		staleAfterHours: 48,
	},
	guard: {
		coreFiles: "warn",
		bashCommands: "warn",
		gitIdentity: null,
	},
	systemPrompt: {
		maxTokens: 4000,
		includeSomaDocs: true,
		includePiDocs: true,
		includeContextAwareness: true,
		includeSkills: true,
		includeGuardAwareness: true,
		identityInSystemPrompt: true,
	},
	checkpoints: {
		soma: {
			autoCommit: true,
		},
		project: {
			style: "commit",
			autoCheckpoint: false,
			prefix: "checkpoint:",
			workingBranch: null,
		},
		diffOnBoot: true,
		maxDiffLines: 80,
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

/**
 * Resolve a configured path relative to the soma root.
 * If settings is null/undefined, uses built-in defaults.
 *
 * @param somaPath - Absolute path to the .soma/ directory
 * @param key - Path key from settings.paths
 * @param settings - SomaSettings (optional — falls back to defaults)
 * @returns Absolute path
 */
export function resolveSomaPath(
	somaPath: string,
	key: keyof SomaSettings["paths"],
	settings?: SomaSettings | null
): string {
	const paths = settings?.paths ?? DEFAULTS.paths;
	return join(somaPath, paths[key]);
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------
