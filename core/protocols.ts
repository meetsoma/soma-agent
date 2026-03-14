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
import { safeRead, extractFrontmatter, discoverContent, stripFrontmatter } from "./utils.js";
import type { SomaDir } from "./discovery.js";
import { resolveSomaPath } from "./settings.js";
import type { SomaSettings } from "./settings.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Protocol {
	/** Protocol name (from frontmatter or filename) */
	name: string;
	/** Full file content */
	content: string;
	/** Breadcrumb — short one-liner (from frontmatter) */
	breadcrumb: string | null;
	/** TL;DR — extracted from ## TL;DR section in body (richer than breadcrumb) */
	tldr: string | null;
	/** File path */
	path: string;
	/** Starting heat level from frontmatter */
	heatDefault: "cold" | "warm" | "hot";
	/** Scope: local (stays in project) or shared (eligible for parent) */
	scope: "local" | "shared";
	/** Enterprise tier only? */
	tier: "free" | "enterprise";
	/** Domain signals this protocol applies to. Empty = always. */
	appliesTo: string[];
}

/** Signals detected from the project directory */
export type ProjectSignal =
	| "git"
	| "typescript"
	| "javascript"
	| "python"
	| "rust"
	| "go"
	| "frontend"
	| "docs"
	| "multi-repo"
	| "always";

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
// Project signal detection
// ---------------------------------------------------------------------------

/**
 * Detect project signals from the filesystem.
 * Scans the project directory for marker files/dirs that indicate
 * what kind of project this is.
 *
 * @param projectDir - The project root to scan
 * @returns Set of detected signals (always includes "always")
 */
export function detectProjectSignals(projectDir: string): Set<ProjectSignal> {
	const signals = new Set<ProjectSignal>(["always"]);

	const has = (p: string) => existsSync(join(projectDir, p));

	// Git
	if (has(".git")) signals.add("git");

	// JavaScript / TypeScript
	if (has("package.json")) signals.add("javascript");
	if (has("tsconfig.json") || has("tsconfig.base.json")) {
		signals.add("typescript");
		signals.add("javascript"); // TS implies JS
	}

	// Python
	if (has("pyproject.toml") || has("requirements.txt") || has("setup.py") || has("Pipfile")) {
		signals.add("python");
	}

	// Rust
	if (has("Cargo.toml")) signals.add("rust");

	// Go
	if (has("go.mod")) signals.add("go");

	// Frontend (framework configs or component dirs)
	if (
		has("next.config.js") || has("next.config.mjs") || has("next.config.ts") ||
		has("vite.config.ts") || has("vite.config.js") ||
		has("svelte.config.js") || has("nuxt.config.ts") ||
		has("src/components") || has("app/components")
	) {
		signals.add("frontend");
	}

	// Docs-heavy (heuristic: docs/ dir or many .md files at root)
	if (has("docs") || has("docs/")) signals.add("docs");

	// Multi-repo (workspace with nested git repos)
	try {
		const entries = readdirSync(projectDir, { withFileTypes: true });
		let gitChildren = 0;
		for (const e of entries) {
			if (e.isDirectory() && !e.name.startsWith(".")) {
				if (existsSync(join(projectDir, e.name, ".git"))) gitChildren++;
			}
		}
		if (gitChildren >= 2) signals.add("multi-repo");
	} catch { /* ignore */ }

	return signals;
}

/**
 * Extract ## TL;DR section from protocol body.
 * Returns the text between ## TL;DR and the next ## heading (or end of content).
 */
function extractTldr(content: string): string | null {
	const body = stripFrontmatter(content);
	const match = body.match(/^## TL;DR\s*\n([\s\S]*?)(?=\n## |\n---|\s*$)/m);
	if (!match) return null;
	const text = match[1].trim();
	return text || null;
}

/**
 * Check if a protocol matches the project signals.
 * A protocol with empty appliesTo matches everything (same as "always").
 */
export function protocolMatchesSignals(
	protocol: Protocol,
	signals: Set<ProjectSignal>
): boolean {
	// No applies-to = always applies
	if (protocol.appliesTo.length === 0) return true;
	// Match if ANY signal overlaps
	return protocol.appliesTo.some(tag => signals.has(tag as ProjectSignal));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Discover all protocol .md files in a soma directory.
 *
 * @param soma - The SomaDir to scan
 * @param settings - Optional settings for path resolution
 * @returns Array of Protocol objects
 */
export function discoverProtocols(soma: SomaDir, settings?: SomaSettings | null): Protocol[] {
	const protocolDir = resolveSomaPath(soma.path, "protocols", settings);
	return discoverContent<Protocol>({
		dir: protocolDir,
		parser: ({ file, filePath, content, fm }) => ({
			name: fm["name"] || basename(file, ".md"),
			content,
			breadcrumb: fm["breadcrumb"] || null,
			tldr: extractTldr(content),
			path: filePath,
			heatDefault: parseHeatDefault(fm["heat-default"]),
			scope: fm["scope"] === "shared" ? "shared" : "local",
			tier: fm["tier"] === "enterprise" ? "enterprise" : "free",
			appliesTo: parseAppliesTo(fm["applies-to"]),
		}),
	});
}

/**
 * Discover protocols from the full soma chain.
 * Child protocols win on name collision (first found).
 *
 * When `settings.inherit.protocols` is false, only scans chain[0].
 *
 * @param chain - SomaDir array from getSomaChain()
 * @param signals - Project signals for filtering (optional)
 * @param settings - Optional settings (for inherit.protocols control)
 */
export function discoverProtocolChain(
	chain: SomaDir[],
	signals?: Set<ProjectSignal>,
	settings?: import("./settings.js").SomaSettings
): Protocol[] {
	// Respect inherit.protocols — if false, only scan chain[0]
	const effectiveChain = (settings?.inherit?.protocols === false && chain.length > 1)
		? [chain[0]]
		: chain;

	const seen = new Set<string>();
	const all: Protocol[] = [];

	for (const soma of effectiveChain) {
		const protocols = discoverProtocols(soma, settings);
		for (const proto of protocols) {
			if (seen.has(proto.name)) continue;
			seen.add(proto.name);
			// Filter by signals if provided
			if (signals && !protocolMatchesSignals(proto, signals)) continue;
			all.push(proto);
		}
	}

	return all;
}

/**
 * Load protocol heat state from state.json (or legacy .protocol-state.json).
 *
 * @param soma - The SomaDir to read state from
 * @returns ProtocolState or null if not found
 */
export function loadProtocolState(soma: SomaDir): ProtocolState | null {
	// Try new name first, fall back to legacy
	let statePath = join(soma.path, "state.json");
	if (!existsSync(statePath)) {
		statePath = join(soma.path, ".protocol-state.json");
	}
	const raw = safeRead(statePath);
	if (!raw) return null;

	try {
		return JSON.parse(raw) as ProtocolState;
	} catch {
		return null;
	}
}

/**
 * Save protocol heat state to state.json.
 */
export function saveProtocolState(soma: SomaDir, state: ProtocolState): void {
	const statePath = join(soma.path, "state.json");
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
			const body = stripFrontmatter(p.content);
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
 * Protocols never decay below their heat-default floor — a warm protocol
 * stays warm unless explicitly /kill'd. This prevents behavioral protocols
 * (which have no auto-detection rules) from systematically losing heat.
 *
 * @param state - The protocol state to mutate
 * @param referencedThisSession - Set of protocol names used this session
 * @param decayRate - How much heat to remove (default: 1)
 * @param protocols - Discovered protocols (for heat-default floor). If not provided, floor is 0.
 */
export function applyDecay(
	state: ProtocolState,
	referencedThisSession: Set<string>,
	decayRate: number = DEFAULT_THRESHOLDS.decayRate,
	protocols?: Protocol[]
): void {
	// Build a lookup for heat-default floors
	const floors = new Map<string, number>();
	if (protocols) {
		for (const p of protocols) {
			switch (p.heatDefault) {
				case "hot": floors.set(p.name, DEFAULT_THRESHOLDS.hotThreshold); break;
				case "warm": floors.set(p.name, DEFAULT_THRESHOLDS.warmThreshold); break;
				default: floors.set(p.name, 0);
			}
		}
	}

	for (const [name, entry] of Object.entries(state.protocols)) {
		if (entry.pinned) continue;
		if (referencedThisSession.has(name)) continue;
		const floor = floors.get(name) ?? 0;
		entry.heat = Math.max(floor, entry.heat - decayRate);
	}
}

/**
 * Bootstrap a fresh protocol state from discovered protocols.
 * Seeds heat from each protocol's `heat-default` frontmatter value.
 *
 * Called once on first boot when no `.protocol-state.json` exists.
 * After this, heat evolves through use, decay, and explicit pin/kill.
 *
 * @param protocols - All discovered protocols
 * @param thresholds - Heat thresholds for mapping defaults to numeric values
 * @returns A new ProtocolState ready to be saved
 */
export function bootstrapProtocolState(
	protocols: Protocol[],
	thresholds = DEFAULT_THRESHOLDS
): ProtocolState {
	const today = new Date().toISOString().slice(0, 10);
	const now = new Date().toISOString();

	const entries: Record<string, ProtocolHeatState> = {};
	for (const p of protocols) {
		let heat: number;
		switch (p.heatDefault) {
			case "hot": heat = thresholds.hotThreshold; break;
			case "warm": heat = thresholds.warmThreshold; break;
			default: heat = 0;
		}
		entries[p.name] = {
			heat,
			lastReferenced: today,
			timesApplied: 0,
			firstSeen: today,
			pinned: false,
		};
	}

	return {
		version: 1,
		updated: now,
		protocols: entries,
	};
}

/**
 * Sync state with discovered protocols — add entries for new protocols,
 * leave existing entries untouched (their heat has evolved).
 *
 * Handles the case where new protocol files appear after initial bootstrap.
 *
 * @param state - Existing protocol state
 * @param protocols - Currently discovered protocols
 * @param thresholds - For seeding new protocol heat defaults
 * @returns true if state was modified (caller should save)
 */
export function syncProtocolState(
	state: ProtocolState,
	protocols: Protocol[],
	thresholds = DEFAULT_THRESHOLDS
): boolean {
	const today = new Date().toISOString().slice(0, 10);
	let modified = false;

	for (const p of protocols) {
		if (!state.protocols[p.name]) {
			let heat: number;
			switch (p.heatDefault) {
				case "hot": heat = thresholds.hotThreshold; break;
				case "warm": heat = thresholds.warmThreshold; break;
				default: heat = 0;
			}
			state.protocols[p.name] = {
				heat,
				lastReferenced: today,
				timesApplied: 0,
				firstSeen: today,
				pinned: false,
			};
			modified = true;
		}
	}

	return modified;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function parseHeatDefault(value: string | undefined): "cold" | "warm" | "hot" {
	if (value === "hot") return "hot";
	if (value === "warm") return "warm";
	return "cold";
}

/**
 * Parse applies-to from frontmatter value.
 * Accepts: `[always, git]`, `always`, `git, typescript`, or empty.
 * Returns empty array for missing/empty (means "always applies").
 */
function parseAppliesTo(value: string | undefined): string[] {
	if (!value) return [];
	// Strip brackets if present
	let cleaned = value.trim();
	if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
		cleaned = cleaned.slice(1, -1);
	}
	const tags = cleaned.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
	return tags;
}
