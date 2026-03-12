/**
 * Soma Core — Debug
 *
 * Simple debug logging to .soma/debug/. Off by default.
 * When enabled, writes timestamped entries to:
 *   - .soma/debug/boot.log        — session boot sequence
 *   - .soma/debug/system-prompt.md — compiled system prompt snapshot
 *   - .soma/debug/errors.log      — caught errors
 *   - .soma/debug/heat.log        — heat changes
 *
 * Enable: set "debug": true in settings.json, or start with SOMA_DEBUG=1.
 * Logs are append-only within a session, rotated per day.
 *
 * Design intent: when a user reports "Soma is acting weird", the agent
 * can suggest enabling debug mode. On next session, the debug/ dir fills
 * with diagnostic data the agent can read to self-diagnose.
 */

import { existsSync, mkdirSync, appendFileSync, writeFileSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DebugLogger {
	/** Whether debug mode is active */
	enabled: boolean;
	/** Log to boot.log */
	boot(message: string): void;
	/** Log to errors.log */
	error(message: string, error?: unknown): void;
	/** Log to heat.log */
	heat(message: string): void;
	/** Write the full compiled system prompt snapshot */
	systemPrompt(content: string): void;
	/** Log an arbitrary entry to a named log */
	log(category: string, message: string): void;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a debug logger for a soma directory.
 *
 * Checks (in order):
 *   1. SOMA_DEBUG env var (truthy = enabled)
 *   2. settings.debug flag
 *
 * If disabled, all methods are no-ops (zero cost).
 */
export function createDebugLogger(somaPath: string | null, settingsDebug?: boolean): DebugLogger {
	const enabled = !!(
		process.env.SOMA_DEBUG === "1" ||
		process.env.SOMA_DEBUG === "true" ||
		settingsDebug
	);

	if (!enabled || !somaPath) {
		return {
			enabled: false,
			boot: () => {},
			error: () => {},
			heat: () => {},
			systemPrompt: () => {},
			log: () => {},
		};
	}

	const debugDir = join(somaPath, "debug");
	const dateStr = new Date().toISOString().slice(0, 10);

	// Ensure debug dir exists
	if (!existsSync(debugDir)) {
		mkdirSync(debugDir, { recursive: true });
	}

	const ts = () => new Date().toISOString().slice(11, 23); // HH:mm:ss.mmm

	const append = (file: string, content: string) => {
		try {
			appendFileSync(join(debugDir, file), content);
		} catch { /* silent — debug should never break the app */ }
	};

	return {
		enabled: true,

		boot(message: string) {
			append(`boot-${dateStr}.log`, `[${ts()}] ${message}\n`);
		},

		error(message: string, error?: unknown) {
			const errStr = error instanceof Error
				? `${error.message}\n${error.stack}`
				: error ? String(error) : "";
			append(`errors-${dateStr}.log`, `[${ts()}] ${message}${errStr ? "\n" + errStr : ""}\n`);
		},

		heat(message: string) {
			append(`heat-${dateStr}.log`, `[${ts()}] ${message}\n`);
		},

		systemPrompt(content: string) {
			try {
				writeFileSync(join(debugDir, `system-prompt-${dateStr}.md`), content);
			} catch { /* silent */ }
		},

		log(category: string, message: string) {
			append(`${category}-${dateStr}.log`, `[${ts()}] ${message}\n`);
		},
	};
}
