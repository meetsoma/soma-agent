/**
 * Soma Core — Init
 *
 * Scaffolds a fresh .soma/ (or configured root) directory.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { DEFAULT_ROOT } from "./discovery.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface InitOptions {
	/** Root directory name (default: ".soma") */
	rootName?: string;
	/** Project name for identity template */
	projectName?: string;
}

/**
 * Initialize a soma directory in the given path.
 *
 * @param cwd - Directory to create the soma root in
 * @param options - Configuration options
 * @returns Absolute path to the created soma directory
 */
export function initSoma(cwd: string, options: InitOptions = {}): string {
	const rootName = options.rootName || DEFAULT_ROOT;
	const somaDir = join(cwd, rootName);

	// Create directory structure
	const dirs = [
		somaDir,
		join(somaDir, "memory"),
		join(somaDir, "memory", "muscles"),
		join(somaDir, "memory", "sessions"),
		join(somaDir, "protocols"),
		join(somaDir, "skills"),
		join(somaDir, "extensions"),
	];

	for (const dir of dirs) {
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	}

	// Create identity template
	const identityPath = join(somaDir, "identity.md");
	if (!existsSync(identityPath)) {
		const name = options.projectName || "this project";
		writeFileSync(
			identityPath,
			`---\ntype: identity\nstatus: draft\ncreated: ${today()}\n---\n\n# Identity\n\n<!-- Who are you in the context of ${name}? What do you help with? What's your style? -->\n`
		);
	}

	// Create STATE.md
	const statePath = join(somaDir, "STATE.md");
	if (!existsSync(statePath)) {
		writeFileSync(
			statePath,
			`---\ntype: state\nstatus: draft\ncreated: ${today()}\n---\n\n# Project State\n\nFresh install. Identity will be discovered through use.\n`
		);
	}

	// Create settings.json
	const settingsPath = join(somaDir, "settings.json");
	if (!existsSync(settingsPath)) {
		const settings = {
			"$schema": "https://soma.gravicity.ai/schemas/settings-v1.json",
			root: rootName,
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
		};
		writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
	}

	// Create .gitignore
	const giPath = join(somaDir, ".gitignore");
	if (!existsSync(giPath)) {
		writeFileSync(
			giPath,
			[
				"# Session data (personal, not shared)",
				"memory/preload-next.md",
				"memory/continuation-prompt.md",
				"memory/sessions/",
				".protocol-state.json",
				"",
				"# Secrets",
				"secrets/",
				"*.env",
				"",
			].join("\n")
		);
	}

	return somaDir;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function today(): string {
	return new Date().toISOString().slice(0, 10);
}
