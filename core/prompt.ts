/**
 * Soma Core — Compiled System Prompt ("Frontal Cortex")
 *
 * Phase 0: Prepend-only — compile Soma's core + protocol summaries + muscle digests
 * Phase 1: Section extraction — transplant skills, project context, date/time from Pi's prompt
 * Phase 2: Dynamic tool section — build tool list + guidelines from active tools + protocols
 * Phase 3: Full replacement — assemble complete system prompt, replace Pi's default
 *
 * The system prompt has a metabolism: as protocols cool and muscles fade, it shrinks.
 * As the user works and patterns earn heat, it grows — but only with what matters.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import type { Protocol, ProtocolState } from "./protocols.js";
import { getProtocolHeat } from "./protocols.js";
import type { Muscle } from "./muscles.js";
import type { SomaSettings } from "./settings.js";

// Known Soma doc files — label + filename pairs
const SOMA_DOC_FILES: [string, string][] = [
	["Getting started", "getting-started.md"],
	["How it works", "how-it-works.md"],
	["Configuration & settings", "configuration.md"],
	["Protocols", "protocols.md"],
	["Muscles & memory", "muscles.md"],
	["Commands", "commands.md"],
	["Heat system", "heat-system.md"],
	["Identity", "identity.md"],
	["Memory layout", "memory-layout.md"],
	["Extending Soma", "extending.md"],
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompiledPrompt {
	/** The compiled system prompt block to prepend */
	block: string;
	/** Number of protocol summaries included */
	protocolCount: number;
	/** Number of muscle digests included */
	muscleCount: number;
	/** Estimated token count */
	estimatedTokens: number;
}

export interface CompileOptions {
	/** All discovered protocols */
	protocols: Protocol[];
	/** Protocol heat state */
	protocolState: ProtocolState | null;
	/** All discovered muscles (pre-sorted by heat) */
	muscles: Muscle[];
	/** Settings for thresholds */
	settings: SomaSettings;
	/** Custom core template path (optional — defaults to bundled) */
	coreTemplatePath?: string;
}

/** Full system prompt compilation options (Phase 3) */
export interface FullCompileOptions extends CompileOptions {
	/** Pi's original system prompt (for transplanting sections) */
	piSystemPrompt: string;
	/** Active tool names from pi.getActiveTools() */
	activeTools: string[];
	/** All tools from pi.getAllTools() — includes descriptions */
	allTools: { name: string; description?: string; parameters?: unknown }[];
	/** Agent installation directory (for resolving Soma/Pi docs paths) */
	agentDir?: string;
	/** Built identity string from chain (layered: project → parent → global) */
	identity?: string | null;
}

/** Extracted sections from Pi's system prompt */
export interface ExtractedSections {
	skills: string | null;
	projectContext: string | null;
	piDocs: string | null;
	dateTimeCwd: string | null;
	appendSystem: string | null;
}

// ---------------------------------------------------------------------------
// Phase 1: Section Extraction
// ---------------------------------------------------------------------------

/**
 * Extract the <available_skills> XML block from Pi's system prompt.
 */
export function extractSkillsBlock(prompt: string): string | null {
	const startTag = "<available_skills>";
	const endTag = "</available_skills>";
	const startIdx = prompt.indexOf(startTag);
	const endIdx = prompt.indexOf(endTag);
	if (startIdx === -1 || endIdx === -1) return null;
	return prompt.slice(startIdx, endIdx + endTag.length);
}

/**
 * Extract the "# Project Context" section from Pi's system prompt.
 * This includes everything from "# Project Context" up to (but not including)
 * the skills block or date/time lines.
 */
export function extractProjectContext(prompt: string): string | null {
	const marker = "\n# Project Context\n";
	const idx = prompt.indexOf(marker);
	if (idx === -1) return null;

	// Find the end: skills block, or date/time line, whichever comes first
	const afterMarker = idx + marker.length;
	const skillsIdx = prompt.indexOf("<available_skills>", afterMarker);
	const dateIdx = prompt.indexOf("\nCurrent date and time:", afterMarker);

	// Also check for the skills preamble that Pi adds before <available_skills>
	const skillsPreamble = prompt.indexOf("\nThe following skills provide", afterMarker);

	let endIdx = prompt.length;
	for (const candidate of [skillsIdx, dateIdx, skillsPreamble]) {
		if (candidate !== -1 && candidate < endIdx) endIdx = candidate;
	}

	const content = prompt.slice(idx, endIdx).trim();
	return content || null;
}

/**
 * Extract the "Current date and time:" and "Current working directory:" lines.
 * These are always the last two lines of Pi's prompt.
 */
export function extractDateTimeCwd(prompt: string): string | null {
	const dateMatch = prompt.match(/\nCurrent date and time: .+/);
	const cwdMatch = prompt.match(/\nCurrent working directory: .+/);
	if (!dateMatch && !cwdMatch) return null;
	const parts: string[] = [];
	if (dateMatch) parts.push(dateMatch[0].trim());
	if (cwdMatch) parts.push(cwdMatch[0].trim());
	return parts.join("\n");
}

/**
 * Extract the Pi documentation references section.
 */
export function extractPiDocs(prompt: string): string | null {
	const marker = "Pi documentation (read only when the user asks about pi";
	const idx = prompt.indexOf(marker);
	if (idx === -1) return null;

	// Find the end — it's followed by an empty line or APPEND_SYSTEM or Project Context
	const afterMarker = idx;
	// Walk forward to find the block end (double newline after the Pi docs section)
	const rest = prompt.slice(afterMarker);
	// The Pi docs block ends at a double newline
	const endMatch = rest.indexOf("\n\n");
	if (endMatch === -1) return rest.trim();
	return rest.slice(0, endMatch).trim();
}

/**
 * Extract all transplantable sections from Pi's system prompt.
 */
export function extractSections(prompt: string): ExtractedSections {
	return {
		skills: extractSkillsBlock(prompt),
		projectContext: extractProjectContext(prompt),
		piDocs: extractPiDocs(prompt),
		dateTimeCwd: extractDateTimeCwd(prompt),
		appendSystem: null, // APPEND_SYSTEM is hard to isolate — deferred
	};
}

/**
 * Detect whether a system prompt is Pi's default (vs. a custom SYSTEM.md).
 * Per spec Q3: only do full replacement when we detect Pi's default.
 */
export function isPiDefaultPrompt(prompt: string): boolean {
	return prompt.includes("You are an expert coding assistant operating inside pi");
}

// ---------------------------------------------------------------------------
// Phase 2: Dynamic Tool Section
// ---------------------------------------------------------------------------

/** Known Pi built-in tool descriptions */
const BUILTIN_TOOL_DESCRIPTIONS: Record<string, string> = {
	read: "Read file contents",
	bash: "Execute bash commands (ls, grep, find, etc.)",
	edit: "Make surgical edits to files (find exact text and replace)",
	write: "Create or overwrite files",
	grep: "Search file contents for patterns (respects .gitignore)",
	find: "Find files by glob pattern (respects .gitignore)",
	ls: "List directory contents",
};

/**
 * Build the tool list section with descriptions.
 */
function buildToolList(
	activeTools: string[],
	allTools: { name: string; description?: string }[],
): string {
	const toolMap = new Map(allTools.map(t => [t.name, t.description]));

	const lines = activeTools.map(name => {
		const desc = toolMap.get(name) ?? BUILTIN_TOOL_DESCRIPTIONS[name] ?? name;
		return `- ${name}: ${desc}`;
	});

	return lines.join("\n");
}

/**
 * Build conditional guidelines based on active tools.
 * These replicate Pi's logic but can be overridden by protocols.
 */
function buildToolGuidelines(activeTools: string[]): string[] {
	const guidelines: string[] = [];
	const has = (name: string) => activeTools.includes(name);

	// File exploration
	if (has("bash") && !has("grep") && !has("find") && !has("ls")) {
		guidelines.push("Use bash for file operations like ls, rg, find");
	} else if (has("bash") && (has("grep") || has("find") || has("ls"))) {
		guidelines.push("Prefer grep/find/ls tools over bash for file exploration (faster, respects .gitignore)");
	}

	// Read before edit
	if (has("read") && has("edit")) {
		guidelines.push("Use read to examine files before editing. You must use this tool instead of cat or sed.");
	}

	// Edit
	if (has("edit")) {
		guidelines.push("Use edit for precise changes (old text must match exactly)");
	}

	// Write
	if (has("write")) {
		guidelines.push("Use write only for new files or complete rewrites");
	}

	// Output
	if (has("edit") || has("write")) {
		guidelines.push("When summarizing your actions, output plain text directly - do NOT use cat or bash to display what you did");
	}

	// Always
	guidelines.push("Be concise in your responses");
	guidelines.push("Show file paths clearly when working with files");

	return guidelines;
}

/**
 * Build the complete tool section (Phase 2).
 * Combines tool list + conditional guidelines.
 */
export function buildToolSection(
	activeTools: string[],
	allTools: { name: string; description?: string }[],
): string {
	const toolList = buildToolList(activeTools, allTools);
	const guidelines = buildToolGuidelines(activeTools);

	return `Available tools:
${toolList}

In addition to the tools above, you may have access to other custom tools depending on the project.

Guidelines:
${guidelines.map(g => `- ${g}`).join("\n")}`;
}

// ---------------------------------------------------------------------------
// Core template loading
// ---------------------------------------------------------------------------

let cachedCoreTemplate: string | null = null;

/**
 * Load the static core template. Cached after first read.
 * Falls back to a minimal identity if file not found.
 */
function loadCoreTemplate(customPath?: string): string {
	if (cachedCoreTemplate && !customPath) return cachedCoreTemplate;

	const paths = customPath
		? [customPath]
		: [
			// Relative to this module (works in built/dist and jiti)
			resolve(dirname(new URL(import.meta.url).pathname), "..", "prompts", "system-core.md"),
			// Fallback: relative to cwd
			join(process.cwd(), ".soma", "prompts", "system-core.md"),
		];

	for (const p of paths) {
		if (existsSync(p)) {
			const content = readFileSync(p, "utf-8").trim();
			if (!customPath) cachedCoreTemplate = content;
			return content;
		}
	}

	// Minimal fallback if template not found
	return "You are Soma (σῶμα) — an AI coding agent with self-growing memory.";
}

// ---------------------------------------------------------------------------
// Compilation helpers
// ---------------------------------------------------------------------------

/**
 * Estimate tokens from text (rough: ~4 chars per token).
 */
function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}

/**
 * Extract a one-line summary from a protocol for system prompt inclusion.
 * Uses breadcrumb if available, otherwise first sentence of body.
 */
function protocolSummary(proto: Protocol): string {
	if (proto.breadcrumb) return proto.breadcrumb;

	// Strip frontmatter, take first meaningful line
	const body = proto.content.replace(/^---\n[\s\S]*?\n---\n*/, "").trim();
	const lines = body.split("\n").filter(l => l.trim() && !l.startsWith("#"));
	if (lines.length > 0) {
		const first = lines[0].trim();
		return first.length > 120 ? first.slice(0, 117) + "..." : first;
	}
	return `Follow the ${proto.name} protocol.`;
}

/**
 * Extract digest from a muscle for system prompt inclusion.
 * Returns the digest block content (between markers), trimmed.
 */
function muscleDigest(muscle: Muscle): string | null {
	if (muscle.digest) return muscle.digest.trim();
	return null;
}

/**
 * Build protocol summaries + muscle digests section.
 * Protocols sorted by heat (desc) and capped at maxBreadcrumbsInPrompt.
 * Muscle digests capped at settings.muscles.maxDigest.
 */
function buildBehavioralSection(
	protocols: Protocol[],
	protocolState: ProtocolState | null,
	muscles: Muscle[],
	settings: SomaSettings,
): { section: string; protocolCount: number; muscleCount: number } {
	const parts: string[] = [];
	let protocolCount = 0;
	let muscleCount = 0;

	// Protocol governance — warm+ protocols as one-liners, sorted by heat desc, capped
	const warmThreshold = settings.protocols.warmThreshold;
	const maxBreadcrumbs = settings.protocols.maxBreadcrumbsInPrompt;

	// Filter warm+, sort by heat descending (name as tiebreaker for stability)
	const warmProtocols = protocols
		.map(proto => ({ proto, heat: getProtocolHeat(proto, protocolState) }))
		.filter(({ heat }) => heat >= warmThreshold)
		.sort((a, b) => b.heat - a.heat || a.proto.name.localeCompare(b.proto.name))
		.slice(0, maxBreadcrumbs);

	const protoSummaries = warmProtocols.map(({ proto }) => {
		protocolCount++;
		return `- **${proto.name}**: ${protocolSummary(proto)}`;
	});

	if (protoSummaries.length > 0) {
		parts.push("## Active Behavioral Rules\n\n" + protoSummaries.join("\n"));
	}

	// Muscle instincts — hot muscles get digests, capped from settings
	const digestThreshold = settings.muscles.digestThreshold;
	const maxDigestsInPrompt = settings.muscles.maxDigest;
	const muscleLines: string[] = [];
	for (const muscle of muscles) {
		if (muscleCount >= maxDigestsInPrompt) break;
		if (muscle.heat < digestThreshold) continue;
		if (muscle.status !== "active") continue;
		const digest = muscleDigest(muscle);
		if (digest) {
			muscleLines.push(`### ${muscle.name}\n${digest}`);
			muscleCount++;
		}
	}
	if (muscleLines.length > 0) {
		parts.push("## Learned Patterns (Muscle Memory)\n\n" + muscleLines.join("\n\n"));
	}

	return { section: parts.join("\n\n"), protocolCount, muscleCount };
}

// ---------------------------------------------------------------------------
// Soma Documentation Section (Wave 1)
// ---------------------------------------------------------------------------

/**
 * Build documentation reference section.
 * Soma docs are primary; Pi docs are secondary (only for extension dev).
 *
 * @param agentDir - Agent installation directory (from getAgentDir())
 */
export function buildDocsSection(agentDir?: string): string {
	// Soma docs — resolve from this module's location
	const somaDocsDir = resolve(
		dirname(new URL(import.meta.url).pathname),
		"..", "docs"
	);

	const lines = [
		"Soma documentation (read when asked about soma, memory, protocols, muscles, heat, or configuration):",
	];

	for (const [label, file] of SOMA_DOC_FILES) {
		const fullPath = join(somaDocsDir, file);
		if (existsSync(fullPath)) {
			lines.push(`- ${label}: ${fullPath}`);
		}
	}

	// Pi framework docs — secondary, for extension development
	if (agentDir) {
		try {
			const piPkgDir = resolve(agentDir, "..", "..");
			const piReadme = resolve(piPkgDir, "README.md");
			const piDocs = resolve(piPkgDir, "docs");
			const piExamples = resolve(piPkgDir, "examples");
			if (existsSync(piReadme)) {
				lines.push("");
				lines.push("Pi framework (read only when working on extensions, SDK, themes, or TUI):");
				lines.push(`- Pi docs: ${piDocs}`);
				lines.push(`- Pi examples: ${piExamples}`);
			}
		} catch {
			// Pi paths not resolvable — skip
		}
	}

	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Guard Awareness Section (Wave 1)
// ---------------------------------------------------------------------------

/**
 * Build guard awareness section for the system prompt.
 * Only included when guard level is "warn" or "block".
 */
function buildGuardSection(settings: SomaSettings): string | null {
	const guard = settings.guard;
	if (!guard || guard.coreFiles === "allow") return null;

	const level = guard.coreFiles;
	const parts: string[] = [`## Guard\n`];

	if (level === "warn") {
		parts.push("Core file protection: **warn**. You'll be warned before modifying .soma/ core files.");
	} else if (level === "block") {
		parts.push("Core file protection: **block**. Core .soma/ files are protected — ask before modifying.");
	}

	if (guard.gitIdentity?.email) {
		parts.push(`Git identity: ${guard.gitIdentity.email}`);
	}

	return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Phase 0: Prepend-only compilation (existing behavior)
// ---------------------------------------------------------------------------

/**
 * Compile the frontal cortex — prepend block only (Phase 0).
 *
 * Assembly order:
 *   1. Static core template
 *   2. Protocol governance (warm+ protocols as one-liners)
 *   3. Muscle instincts (hot muscle digests)
 *
 * This block is prepended to Pi's system prompt. Pi's tool definitions,
 * guidelines, and built-in instructions remain after it.
 */
export function compileFrontalCortex(options: CompileOptions): CompiledPrompt {
	const { protocols, protocolState, muscles, settings } = options;

	const parts: string[] = [];

	// 1. Static core
	const core = loadCoreTemplate(options.coreTemplatePath);
	parts.push(core);

	// 2 + 3. Behavioral section
	const behavioral = buildBehavioralSection(protocols, protocolState, muscles, settings);
	if (behavioral.section) {
		parts.push(behavioral.section);
	}

	const block = parts.join("\n\n");
	return {
		block,
		protocolCount: behavioral.protocolCount,
		muscleCount: behavioral.muscleCount,
		estimatedTokens: estimateTokens(block),
	};
}

// ---------------------------------------------------------------------------
// Phase 3: Full system prompt replacement
// ---------------------------------------------------------------------------

/**
 * Compile the FULL system prompt — replaces Pi's default entirely.
 *
 * Only activates when Pi's default prompt is detected (contains the
 * "expert coding assistant" identity line). If a custom SYSTEM.md is
 * in use, falls back to Phase 0 prepend behavior.
 *
 * Assembly order:
 *   1. Soma static core (identity, breath, memory, protocol awareness)
 *   2. Behavioral rules (protocol summaries by heat)
 *   3. Learned patterns (muscle digests by heat)
 *   4. Tool list + guidelines (dynamic, from active tools)
 *   5. Pi documentation references (transplanted)
 *   6. Project context (transplanted from Pi's prompt)
 *   7. Skills block (transplanted from Pi's prompt)
 *   8. Date/time + working directory (transplanted)
 */
export function compileFullSystemPrompt(options: FullCompileOptions): CompiledPrompt & { fullReplacement: boolean } {
	const { piSystemPrompt, activeTools, allTools } = options;

	// Guard: only replace Pi's default. Custom prompts get prepend behavior.
	if (!isPiDefaultPrompt(piSystemPrompt)) {
		const prepend = compileFrontalCortex(options);
		return {
			block: prepend.block + "\n\n---\n\n" + piSystemPrompt,
			protocolCount: prepend.protocolCount,
			muscleCount: prepend.muscleCount,
			estimatedTokens: estimateTokens(prepend.block + piSystemPrompt),
			fullReplacement: false,
		};
	}

	const parts: string[] = [];

	// --- 1. Soma static core ---
	const core = loadCoreTemplate(options.coreTemplatePath);
	parts.push(core);

	const sp = options.settings.systemPrompt;

	// --- 2. Project Identity (from identity chain) ---
	if (sp?.identityInSystemPrompt !== false) {
		const persona = options.settings.persona;
		if (persona?.name || options.identity) {
			const identityParts: string[] = [];
			if (persona?.name) {
				const emoji = persona.emoji ? ` ${persona.emoji}` : "";
				identityParts.push(`Your name is **${persona.name}**${emoji}.\n`);
			}
			if (options.identity) {
				identityParts.push(options.identity);
			}
			parts.push(identityParts.join("\n"));
		}
	}

	// --- 3. Behavioral section (protocols + muscles) ---
	const behavioral = buildBehavioralSection(
		options.protocols, options.protocolState, options.muscles, options.settings
	);
	if (behavioral.section) {
		parts.push(behavioral.section);
	}

	// --- 4. Tool section ---
	const toolSection = buildToolSection(activeTools, allTools);
	parts.push(toolSection);

	// --- 5. Guard awareness (only if warn/block and enabled) ---
	if (sp?.includeGuardAwareness !== false) {
		const guardSection = buildGuardSection(options.settings);
		if (guardSection) {
			parts.push(guardSection);
		}
	}

	// --- 6. Soma docs + Pi docs ---
	if (sp?.includeSomaDocs !== false) {
		parts.push(buildDocsSection(
			sp?.includePiDocs !== false ? options.agentDir : undefined
		));
	}

	// --- 7. CLAUDE.md awareness note ---
	if (sp?.includeContextAwareness !== false) {
		const hasProjectContext = piSystemPrompt.includes("# Project Context");
		if (hasProjectContext) {
			parts.push(
				"## External Project Context\n\n" +
				"A CLAUDE.md or AGENTS.md file exists in this project. " +
				"Read it if you need additional project context, but treat it as potentially stale. " +
				"Your primary context comes from .soma/identity.md."
			);
		}
	}

	// --- 8. Skills block (transplanted from Pi's prompt) ---
	const extracted = extractSections(piSystemPrompt);

	if (sp?.includeSkills !== false && extracted.skills) {
		const preamble = "The following skills provide specialized instructions for specific tasks.\n" +
			"Use the read tool to load a skill's file when the task matches its description.\n" +
			"When a skill file references a relative path, resolve it against the skill directory " +
			"(parent of SKILL.md / dirname of the path) and use that absolute path in tool commands.";
		parts.push(preamble + "\n\n" + extracted.skills);
	}

	// --- 9. Date/time + CWD (always included) ---
	if (extracted.dateTimeCwd) {
		parts.push(extracted.dateTimeCwd);
	}

	const block = parts.join("\n\n");
	return {
		block,
		protocolCount: behavioral.protocolCount,
		muscleCount: behavioral.muscleCount,
		estimatedTokens: estimateTokens(block),
		fullReplacement: true,
	};
}

/**
 * Clear the cached core template (for testing or hot reload).
 */
export function clearPromptCache(): void {
	cachedCoreTemplate = null;
}
