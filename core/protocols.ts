/**
 * Soma Core — Protocols
 *
 * Discovers, loads, and manages behavioral protocol files.
 * Handles heat tracking, breadcrumb extraction, and system prompt injection.
 *
 * v1: Discovery + static loading (free tier)
 * v2: Heat tracking + adaptive injection (enterprise)
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join, basename } from "path";
import { safeRead } from "./utils.js";
import type { SomaDir } from "./discovery.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Protocol {
	/** Protocol name (from frontmatter or filename) */
	name: string;
	/** Full file content */
	content: string;
	/** Breadcrumb TL;DR (from frontmatter) */
	breadcrumb: string | null;
	/** File path */
	path: string;
	/** Starting heat level from frontmatter */
	heatDefault: "cold" | "warm" | "hot";
	/** Scope: local (stays in project) or shared (eligible for parent) */
	scope: "local" | "shared";
	/** Enterprise tier only? */
	tier: "free" | "enterprise";
}

export interface ProtocolHeatState {
	heat: number;
	lastReferenced: string | null;
	timesApplied: number;
	firstSeen: string;
	pinned: boolean;
}

export interface ProtocolState {
	version: number;
	updated: string;
	protocols: Record<string, ProtocolHeatState>;
}

export interface ProtocolInjection {
	/** Hot protocols — full content for system prompt */
	hot: Protocol[];
	/** Warm protocols — breadcrumbs for system prompt */
	warm: Protocol[];
	/** Cold protocols — just names, available but not loaded */
	cold: Protocol[];
	/** Formatted string ready for system prompt injection */
	systemPromptBlock: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_THRESHOLDS = {
	warmThreshold: 3,
	hotThreshold: 8,
	maxHeat: 15,
	decayRate: 1,
	maxBreadcrumbsInPrompt: 10,
	maxFullProtocolsInPrompt: 3,
};

// ---------------------------------------------------------------------------
// Frontmatter parsing (lightweight, no deps)
// ---------------------------------------------------------------------------

function extractFrontmatter(content: string): Record<string, string> {
	const fm: Record<string, string> = {};
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return fm;

	for (const line of match[1].split("\n")) {
		const idx = line.indexOf(":");
		if (idx > 0) {
			const key = line.slice(0, idx).trim();
			let value = line.slice(idx + 1).trim();
			// Strip quotes
			if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
				value = value.slice(1, -1);
			}
			fm[key] = value;
		}
	}
	return fm;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Discover all protocol .md files in a soma directory.
 *
 * @param soma - The SomaDir to scan
 * @returns Array of Protocol objects
 */
export function discoverProtocols(soma: SomaDir): Protocol[] {
	const protocolDir = join(soma.path, "protocols");
	if (!existsSync(protocolDir)) return [];

	const protocols: Protocol[] = [];

	try {
		const files = readdirSync(protocolDir).filter(
			f => f.endsWith(".md") && !f.startsWith(".")
		);

		for (const file of files) {
			const filePath = join(protocolDir, file);
			const content = safeRead(filePath);
			if (!content) continue;

			const fm = extractFrontmatter(content);

			protocols.push({
				name: fm["name"] || basename(file, ".md"),
				content,
				breadcrumb: fm["breadcrumb"] || null,
				path: filePath,
				heatDefault: parseHeatDefault(fm["heat-default"]),
				scope: fm["scope"] === "shared" ? "shared" : "local",
				tier: fm["tier"] === "enterprise" ? "enterprise" : "free",
			});
		}
	} catch {
		/* ignore scan errors */
	}

	return protocols;
}

/**
 * Discover protocols from a soma chain (project + parent @children/ + global).
 * Project protocols shadow same-named parent/global ones.
 *
 * @param chain - Array of SomaDir from getSomaChain()
 * @returns Deduplicated array of protocols (project wins on name collision)
 */
export function discoverProtocolChain(chain: SomaDir[]): Protocol[] {
	const seen = new Set<string>();
	const all: Protocol[] = [];

	for (const soma of chain) {
		const protocols = discoverProtocols(soma);
		for (const proto of protocols) {
			if (!seen.has(proto.name)) {
				seen.add(proto.name);
				all.push(proto);
			}
		}
	}

	return all;
}

/**
 * Load protocol heat state from .protocol-state.json.
 *
 * @param soma - The SomaDir to read state from
 * @returns ProtocolState or null if not found
 */
export function loadProtocolState(soma: SomaDir): ProtocolState | null {
	const statePath = join(soma.path, ".protocol-state.json");
	const raw = safeRead(statePath);
	if (!raw) return null;

	try {
		return JSON.parse(raw) as ProtocolState;
	} catch {
		return null;
	}
}

/**
 * Save protocol heat state.
 */
export function saveProtocolState(soma: SomaDir, state: ProtocolState): void {
	const statePath = join(soma.path, ".protocol-state.json");
	state.updated = new Date().toISOString();
	writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
}

/**
 * Get the effective heat for a protocol, considering state and defaults.
 */
export function getProtocolHeat(protocol: Protocol, state: ProtocolState | null): number {
	if (state?.protocols[protocol.name]) {
		return state.protocols[protocol.name].heat;
	}
	// No state entry — use heat-default
	switch (protocol.heatDefault) {
		case "hot": return DEFAULT_THRESHOLDS.hotThreshold;
		case "warm": return DEFAULT_THRESHOLDS.warmThreshold;
		default: return 0;
	}
}

/**
 * Build the protocol injection for the system prompt.
 * Sorts protocols by heat, applies limits, formats output.
 *
 * @param protocols - All discovered protocols
 * @param state - Current heat state (null = use defaults only)
 * @param thresholds - Custom thresholds (optional)
 * @returns ProtocolInjection with categorized protocols and formatted block
 */
export function buildProtocolInjection(
	protocols: Protocol[],
	state: ProtocolState | null,
	thresholds = DEFAULT_THRESHOLDS
): ProtocolInjection {
	// Calculate heat and sort
	const withHeat = protocols.map(p => ({
		protocol: p,
		heat: getProtocolHeat(p, state),
	})).sort((a, b) => b.heat - a.heat);

	const hot: Protocol[] = [];
	const warm: Protocol[] = [];
	const cold: Protocol[] = [];

	for (const { protocol, heat } of withHeat) {
		if (heat >= thresholds.hotThreshold && hot.length < thresholds.maxFullProtocolsInPrompt) {
			hot.push(protocol);
		} else if (heat >= thresholds.warmThreshold && warm.length < thresholds.maxBreadcrumbsInPrompt) {
			warm.push(protocol);
		} else {
			cold.push(protocol);
		}
	}

	// Build system prompt block
	const lines: string[] = [];

	if (hot.length > 0) {
		lines.push("## Active Protocols\n");
		for (const p of hot) {
			// Strip frontmatter from content for injection
			const body = p.content.replace(/^---\n[\s\S]*?\n---\n*/, "").trim();
			lines.push(`### ${p.name}\n${body}\n`);
		}
	}

	if (warm.length > 0) {
		lines.push("## Protocol Awareness (apply when relevant)\n");
		for (const p of warm) {
			const bc = p.breadcrumb || `Follow the ${p.name} protocol when applicable.`;
			lines.push(`- **${p.name}**: ${bc}`);
		}
		lines.push("");
	}

	if (cold.length > 0) {
		lines.push(`## Available Protocols (not loaded — reference if needed)\n`);
		lines.push(cold.map(p => `- ${p.name}`).join("\n"));
		lines.push("");
	}

	return {
		hot,
		warm,
		cold,
		systemPromptBlock: lines.join("\n"),
	};
}

/**
 * Record a heat event for a protocol.
 */
export function recordHeatEvent(
	state: ProtocolState,
	protocolName: string,
	event: "referenced" | "applied" | "pinned" | "killed",
	thresholds = DEFAULT_THRESHOLDS
): void {
	if (!state.protocols[protocolName]) {
		state.protocols[protocolName] = {
			heat: 0,
			lastReferenced: null,
			timesApplied: 0,
			firstSeen: new Date().toISOString().slice(0, 10),
			pinned: false,
		};
	}

	const entry = state.protocols[protocolName];
	const today = new Date().toISOString().slice(0, 10);

	switch (event) {
		case "referenced":
			entry.heat = Math.min(entry.heat + 2, thresholds.maxHeat);
			entry.lastReferenced = today;
			break;
		case "applied":
			entry.heat = Math.min(entry.heat + 1, thresholds.maxHeat);
			entry.timesApplied++;
			entry.lastReferenced = today;
			break;
		case "pinned":
			entry.heat = thresholds.hotThreshold + 2;
			entry.pinned = true;
			break;
		case "killed":
			entry.heat = 0;
			entry.pinned = false;
			break;
	}
}

/**
 * Apply session-end decay to all protocols.
 * Protocols referenced this session don't decay.
 *
 * @param state - The protocol state to mutate
 * @param referencedThisSession - Set of protocol names used this session
 * @param decayRate - How much heat to remove (default: 1)
 */
export function applyDecay(
	state: ProtocolState,
	referencedThisSession: Set<string>,
	decayRate: number = DEFAULT_THRESHOLDS.decayRate
): void {
	for (const [name, entry] of Object.entries(state.protocols)) {
		if (entry.pinned) continue;
		if (referencedThisSession.has(name)) continue;
		entry.heat = Math.max(0, entry.heat - decayRate);
	}
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function parseHeatDefault(value: string | undefined): "cold" | "warm" | "hot" {
	if (value === "hot") return "hot";
	if (value === "warm") return "warm";
	return "cold";
}
