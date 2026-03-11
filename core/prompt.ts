/**
 * Soma Core — Compiled System Prompt ("Frontal Cortex")
 *
 * Assembles the system prompt from:
 *   1. Static core template (prompts/system-core.md)
 *   2. Hot muscle digests — behavioral instincts always present
 *   3. Active protocol summaries — governance rules
 *
 * This is prepended to Pi's default system prompt via before_agent_start.
 * Pi's tool definitions and guidelines remain intact — we extend, not replace.
 *
 * The "frontal cortex" concept: muscles and protocols that are hot enough
 * get their TL;DR compiled into the system prompt itself, giving them
 * system-level authority rather than user-message-level influence.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import type { Protocol, ProtocolState } from "./protocols.js";
import { getProtocolHeat } from "./protocols.js";
import type { Muscle } from "./muscles.js";
import type { SomaSettings } from "./settings.js";

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
// Compilation
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
 * Compile the frontal cortex — the complete system prompt block.
 *
 * Assembly order:
 *   1. Static core template
 *   2. Protocol governance (hot protocols as one-liners in system prompt)
 *   3. Muscle instincts (hot muscle digests as behavioral patterns)
 *
 * This block is prepended to Pi's system prompt. Pi's tool definitions,
 * guidelines, and built-in instructions remain after it.
 */
export function compileFrontalCortex(options: CompileOptions): CompiledPrompt {
	const { protocols, protocolState, muscles, settings } = options;

	const parts: string[] = [];
	let protocolCount = 0;
	let muscleCount = 0;

	// --- 1. Static core ---
	const core = loadCoreTemplate(options.coreTemplatePath);
	parts.push(core);

	// --- 2. Protocol governance ---
	// Include hot protocols as one-line rules in the system prompt.
	// Full protocol bodies still load via boot injection (user message).
	const hotThreshold = settings.protocols.hotThreshold;
	const warmThreshold = settings.protocols.warmThreshold;

	const protoSummaries: string[] = [];
	for (const proto of protocols) {
		const heat = getProtocolHeat(proto, protocolState);
		if (heat >= warmThreshold) {
			protoSummaries.push(`- **${proto.name}**: ${protocolSummary(proto)}`);
			protocolCount++;
		}
	}

	if (protoSummaries.length > 0) {
		parts.push(
			"\n## Active Behavioral Rules\n\n" +
			protoSummaries.join("\n")
		);
	}

	// --- 3. Muscle instincts ---
	// Hot muscles get their digest compiled into the system prompt.
	// This is the "frontal cortex" — learned behaviors that are always present.
	const fullThreshold = settings.muscles.fullThreshold;
	const digestThreshold = settings.muscles.digestThreshold;
	const maxDigestsInPrompt = 5; // Cap to keep system prompt lean

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
		parts.push(
			"\n## Learned Patterns (Muscle Memory)\n\n" +
			muscleLines.join("\n\n")
		);
	}

	const block = parts.join("\n");
	const estimatedTokenCount = estimateTokens(block);

	return {
		block,
		protocolCount,
		muscleCount,
		estimatedTokens: estimatedTokenCount,
	};
}

/**
 * Clear the cached core template (for testing or hot reload).
 */
export function clearPromptCache(): void {
	cachedCoreTemplate = null;
}
