/**
 * Soma Core — Identity
 *
 * Loads and layers identity files from the soma directory chain.
 * Project identity overrides parent, which overrides global.
 */

import { existsSync } from "fs";
import { join } from "path";
import { safeRead } from "./utils.js";
import type { SomaDir } from "./discovery.js";
import type { SomaSettings } from "./settings.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IdentityInfo {
	/** The loaded identity content */
	content: string;
	/** Which soma directory it came from */
	source: SomaDir;
	/** Whether it's a meaningful identity (> 50 chars, not just template) */
	meaningful: boolean;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load the identity file from a single soma directory.
 *
 * @param soma - The SomaDir to load identity from
 * @returns IdentityInfo if found and non-empty, null otherwise
 */
export function loadIdentity(soma: SomaDir): IdentityInfo | null {
	const identityPath = join(soma.path, "identity.md");
	const content = safeRead(identityPath);
	if (!content || content.trim().length === 0) return null;

	return {
		content,
		source: soma,
		meaningful: content.trim().length > 50,
	};
}

/**
 * Load identities from the full soma chain, most specific first.
 * Returns all found identities — caller decides how to layer them.
 *
 * @param chain - Array of SomaDir from getSomaChain()
 * @returns Array of IdentityInfo, most specific first
 */
export function loadIdentityChain(chain: SomaDir[]): IdentityInfo[] {
	const identities: IdentityInfo[] = [];
	for (const soma of chain) {
		const identity = loadIdentity(soma);
		if (identity && identity.meaningful) {
			identities.push(identity);
		}
	}
	return identities;
}

/**
 * Build a layered identity string from the chain.
 * Project identity comes first (primary), parent/global add context.
 *
 * When `settings.inherit.identity` is false, only the project-level
 * identity (chain[0]) is loaded — parent/global identities are excluded.
 *
 * @param chain - Array of SomaDir from getSomaChain()
 * @param settings - Optional settings (for inherit.identity control)
 * @returns Formatted identity string, or null if none found
 */
export function buildLayeredIdentity(chain: SomaDir[], settings?: SomaSettings): string | null {
	// Respect inherit.identity — if false, only load from chain[0]
	const effectiveChain = (settings?.inherit?.identity === false && chain.length > 1)
		? [chain[0]]
		: chain;

	const identities = loadIdentityChain(effectiveChain);
	if (identities.length === 0) return null;

	if (identities.length === 1) {
		return `# Identity\n${identities[0].content}`;
	}

	// Multiple identities: primary + context layers
	const parts: string[] = [];
	parts.push(`# Identity\n${identities[0].content}`);

	for (let i = 1; i < identities.length; i++) {
		const label = i === identities.length - 1 ? "Global Context" : "Parent Context";
		parts.push(`\n## ${label} (from ${identities[i].source.projectDir})\n${identities[i].content}`);
	}

	return parts.join("\n");
}

/**
 * Check if a soma directory has a meaningful identity.
 */
export function hasIdentity(soma: SomaDir): boolean {
	const identityPath = join(soma.path, "identity.md");
	if (!existsSync(identityPath)) return false;
	const content = safeRead(identityPath);
	return content !== null && content.trim().length > 50;
}
