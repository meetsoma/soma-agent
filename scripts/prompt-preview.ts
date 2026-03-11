#!/usr/bin/env npx jiti
/**
 * Compiled System Prompt — Preview & Dry Run
 *
 * Generates example system prompts for different scenarios:
 *   1. Fresh session (no preload, default protocols)
 *   2. Continued session (active protocols, hot muscles)
 *   3. Minimal session (all protocols cold)
 *   4. Custom SYSTEM.md (falls back to prepend)
 *
 * Usage:
 *   npx jiti scripts/prompt-preview.ts                # all scenarios → stdout
 *   npx jiti scripts/prompt-preview.ts --out preview   # write to preview/ dir
 *   npx jiti scripts/prompt-preview.ts --scenario 2    # single scenario
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import {
	compileFrontalCortex,
	compileFullSystemPrompt,
	extractSections,
	isPiDefaultPrompt,
	buildToolSection,
	type FullCompileOptions,
} from "../core/prompt.js";
import type { Protocol, ProtocolState } from "../core/protocols.js";
import type { Muscle } from "../core/muscles.js";
import type { SomaSettings } from "../core/settings.js";

// ---------------------------------------------------------------------------
// Fixtures — simulated Pi prompt + Soma state
// ---------------------------------------------------------------------------

const MOCK_PI_PROMPT = `You are an expert coding assistant operating inside pi, a coding agent harness. You help users by reading files, executing commands, editing code, and writing new files.

Available tools:
- read: Read file contents
- bash: Execute bash commands (ls, grep, find, etc.)
- edit: Make surgical edits to files (find exact text and replace)
- write: Create or overwrite files

In addition to the tools above, you may have access to other custom tools depending on the project.

Guidelines:
- Use bash for file operations like ls, rg, find
- Use read to examine files before editing. You must use this tool instead of cat or sed.
- Use edit for precise changes (old text must match exactly)
- Use write only for new files or complete rewrites
- When summarizing your actions, output plain text directly - do NOT use cat or bash to display what you did
- Be concise in your responses
- Show file paths clearly when working with files

Pi documentation (read only when the user asks about pi itself, its SDK, extensions, themes, skills, or TUI):
- Main documentation: ~/.nvm/versions/node/v22.22.0/lib/node_modules/@mariozechner/pi-coding-agent/README.md
- Additional docs: ~/.nvm/versions/node/v22.22.0/lib/node_modules/@mariozechner/pi-coding-agent/docs
- Examples: ~/.nvm/versions/node/v22.22.0/lib/node_modules/@mariozechner/pi-coding-agent/examples

# Project Context

Project-specific instructions and guidelines:

## /Users/user/myproject/CLAUDE.md

Use pnpm. Never npm. TypeScript strict mode.

The following skills provide specialized instructions for specific tasks.
Use the read tool to load a skill's file when the task matches its description.
When a skill file references a relative path, resolve it against the skill directory (parent of SKILL.md / dirname of the path) and use that absolute path in tool commands.

<available_skills>
  <skill>
    <name>github</name>
    <description>Git and GitHub workflow strategies</description>
    <location>/Users/user/.pi/agent/skills/github/SKILL.md</location>
  </skill>
</available_skills>
Current date and time: Tuesday, March 10, 2026 at 01:56:48 AM EDT
Current working directory: /Users/user/myproject`;

const MOCK_CUSTOM_PROMPT = `You are a security-focused code reviewer. Only discuss vulnerabilities.

Current date and time: Tuesday, March 10, 2026 at 01:56:48 AM EDT
Current working directory: /Users/user/myproject`;

// Simulated tool environment
const ACTIVE_TOOLS = ["read", "bash", "edit", "write"];
const ALL_TOOLS = [
	{ name: "read", description: "Read file contents" },
	{ name: "bash", description: "Execute bash commands (ls, grep, find, etc.)" },
	{ name: "edit", description: "Make surgical edits to files (find exact text and replace)" },
	{ name: "write", description: "Create or overwrite files" },
];

// Simulated protocols at different heat levels
function makeProtocol(name: string, breadcrumb: string, heatDefault: "cold" | "warm" | "hot"): Protocol {
	return {
		name,
		content: `---\nname: ${name}\nheat-default: ${heatDefault}\nbreadcrumb: "${breadcrumb}"\n---\n\n# ${name}\n\n${breadcrumb}`,
		breadcrumb,
		path: `.soma/protocols/${name}.md`,
		heatDefault,
		scope: "shared",
		tier: "free",
		appliesTo: [],
	};
}

const PROTOCOLS: Protocol[] = [
	makeProtocol("breath-cycle", "Every session: inhale (load context) → hold (work) → exhale (write preload). Never skip exhale.", "hot"),
	makeProtocol("heat-tracking", "Usage drives visibility. Hot = system prompt. Warm = digest. Cold = listed. Auto-decay between sessions.", "warm"),
	makeProtocol("session-checkpoints", "Commit .soma/ every exhale. Checkpoint project code locally, squash before push.", "warm"),
	makeProtocol("tool-discipline", "Read before edit. Grep before reading whole files. Edit for surgical changes, write for new files only.", "warm"),
	makeProtocol("working-style", "Plan before building multi-file changes. Verify after. Report to files, not chat.", "warm"),
	makeProtocol("quality-standards", "Never delete without asking. Fork-only for upstream repos. Commit messages: conventional format.", "warm"),
	makeProtocol("discovery", "Boot loads identity → preload → protocols → muscles → scripts → git context.", "warm"),
	makeProtocol("pattern-evolution", "Patterns seen twice become muscles. Muscles tested become protocols. Protocols shape the system prompt.", "warm"),
];

// Simulated muscles at different heat levels
function makeMuscle(name: string, digest: string, heat: number): Muscle {
	return {
		name,
		content: `---\ntopic: [${name}]\nheat: ${heat}\nstatus: active\n---\n\n# ${name}\n\n<!-- digest:start -->\n${digest}\n<!-- digest:end -->`,
		digest,
		path: `.soma/memory/muscles/${name}.md`,
		topics: [name],
		keywords: [],
		heat,
		loads: heat > 0 ? heat * 2 : 0,
		status: "active",
	};
}

const MUSCLES_HOT: Muscle[] = [
	makeMuscle("preload-format", "Preload sections: What Shipped (with commits), Key Decisions, File Locations, Repo State, Next Priorities, Loose Ends, Do NOT Re-Read. No section > 200 words.", 8),
	makeMuscle("ecosystem-audit", "Before publishing: run soma-audit.sh. Check PII, drift, stale content, command consistency, roadmap claims. Fix before commit.", 6),
	makeMuscle("micro-exhale", "Daily log entry at session end: 3-5 bullet points of what happened. Not a full preload — just breadcrumbs for the living memory.", 4),
];

const MUSCLES_COLD: Muscle[] = [
	makeMuscle("preload-format", "Preload sections: What Shipped, Key Decisions, File Locations, Repo State, Next Priorities.", 0),
	makeMuscle("ecosystem-audit", "Run soma-audit.sh before publishing.", 0),
];

// Settings
const SETTINGS: SomaSettings = {
	root: ".soma",
	memory: { flowUp: false },
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
		gitContext: { enabled: true, since: "24h", maxDiffLines: 50, maxCommits: 10, diffMode: "stat" as const },
	},
	context: { notifyAt: 50, warnAt: 70, urgentAt: 80, autoExhaleAt: 85 },
	preload: { staleAfterHours: 48 },
	guard: { coreFiles: "warn" as const, gitIdentity: null },
	checkpoints: {
		soma: { autoCommit: true, onExhale: true },
		project: { enabled: false, style: "commit" as const },
		diffOnBoot: true,
		maxDiffLines: 80,
	},
};

// Protocol heat states
function makeProtocolState(heats: Record<string, number>): ProtocolState {
	const protocols: Record<string, { heat: number; lastBumped: string; bumpCount: number }> = {};
	for (const [name, heat] of Object.entries(heats)) {
		protocols[name] = { heat, lastBumped: new Date().toISOString(), bumpCount: heat * 3 };
	}
	return { version: 1, updated: new Date().toISOString(), protocols };
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

interface Scenario {
	id: number;
	name: string;
	description: string;
	build: () => string;
}

const scenarios: Scenario[] = [
	{
		id: 1,
		name: "fresh-session",
		description: "Brand new session. Default protocol heat (warm). No hot muscles. Pi's default prompt detected → full replacement.",
		build() {
			const state = makeProtocolState({
				"breath-cycle": 8,   // hot (default)
				"heat-tracking": 3,  // warm
				"session-checkpoints": 3,
				"tool-discipline": 3,
				"working-style": 3,
				"quality-standards": 3,
				"discovery": 3,
				"pattern-evolution": 3,
			});
			return compileFullSystemPrompt({
				protocols: PROTOCOLS,
				protocolState: state,
				muscles: MUSCLES_COLD,  // no hot muscles yet
				settings: SETTINGS,
				piSystemPrompt: MOCK_PI_PROMPT,
				activeTools: ACTIVE_TOOLS,
				allTools: ALL_TOOLS,
			}).block;
		},
	},
	{
		id: 2,
		name: "continued-session",
		description: "Active session. Some protocols heated up, muscles are hot. Full replacement.",
		build() {
			const state = makeProtocolState({
				"breath-cycle": 12,      // very hot
				"heat-tracking": 7,      // warm+
				"session-checkpoints": 5, // warm
				"tool-discipline": 9,    // hot (used a lot)
				"working-style": 6,      // warm
				"quality-standards": 4,  // warm
				"discovery": 3,          // warm floor
				"pattern-evolution": 8,  // hot
			});
			return compileFullSystemPrompt({
				protocols: PROTOCOLS,
				protocolState: state,
				muscles: MUSCLES_HOT,
				settings: SETTINGS,
				piSystemPrompt: MOCK_PI_PROMPT,
				activeTools: ACTIVE_TOOLS,
				allTools: ALL_TOOLS,
			}).block;
		},
	},
	{
		id: 3,
		name: "minimal-cold",
		description: "All protocols cold (below warm threshold). No muscles. Prompt is just the skeleton + tools + transplanted sections.",
		build() {
			const state = makeProtocolState({
				"breath-cycle": 1,
				"heat-tracking": 0,
				"session-checkpoints": 0,
				"tool-discipline": 1,
				"working-style": 0,
				"quality-standards": 0,
				"discovery": 0,
				"pattern-evolution": 0,
			});
			return compileFullSystemPrompt({
				protocols: PROTOCOLS,
				protocolState: state,
				muscles: MUSCLES_COLD,
				settings: SETTINGS,
				piSystemPrompt: MOCK_PI_PROMPT,
				activeTools: ACTIVE_TOOLS,
				allTools: ALL_TOOLS,
			}).block;
		},
	},
	{
		id: 4,
		name: "custom-system-md",
		description: "User has a custom SYSTEM.md. Pi's default not detected → falls back to prepend (Phase 0 behavior).",
		build() {
			const state = makeProtocolState({
				"breath-cycle": 8,
				"tool-discipline": 5,
			});
			return compileFullSystemPrompt({
				protocols: PROTOCOLS.slice(0, 2), // only 2 protocols
				protocolState: state,
				muscles: [],
				settings: SETTINGS,
				piSystemPrompt: MOCK_CUSTOM_PROMPT,
				activeTools: ACTIVE_TOOLS,
				allTools: ALL_TOOLS,
			}).block;
		},
	},
	{
		id: 5,
		name: "prepend-only-phase0",
		description: "Phase 0 fallback — what happens when tools aren't available yet (compileFrontalCortex only, no tool section).",
		build() {
			const state = makeProtocolState({
				"breath-cycle": 8,
				"heat-tracking": 4,
				"tool-discipline": 5,
			});
			return compileFrontalCortex({
				protocols: PROTOCOLS,
				protocolState: state,
				muscles: MUSCLES_HOT.slice(0, 1), // just preload-format
				settings: SETTINGS,
			}).block;
		},
	},
];

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function formatScenario(s: Scenario): string {
	const prompt = s.build();
	const tokens = Math.ceil(prompt.length / 4);
	const lines = prompt.split("\n").length;
	return [
		`${"═".repeat(78)}`,
		`SCENARIO ${s.id}: ${s.name}`,
		`${"═".repeat(78)}`,
		`Description: ${s.description}`,
		`Stats: ~${tokens} tokens, ${lines} lines, ${prompt.length} chars`,
		`${"─".repeat(78)}`,
		"",
		prompt,
		"",
	].join("\n");
}

// Parse args
const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outDir = outIdx !== -1 ? args[outIdx + 1] : null;
const scenIdx = args.indexOf("--scenario");
const scenFilter = scenIdx !== -1 ? parseInt(args[scenIdx + 1]) : null;

const selected = scenFilter
	? scenarios.filter(s => s.id === scenFilter)
	: scenarios;

if (outDir) {
	const dir = join(process.cwd(), outDir);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

	// Write individual files
	for (const s of selected) {
		const content = formatScenario(s);
		const path = join(dir, `${s.id}-${s.name}.md`);
		writeFileSync(path, content);
		console.log(`  → ${path}`);
	}

	// Write combined
	const combined = [
		"# Compiled System Prompt — Preview",
		`Generated: ${new Date().toISOString()}`,
		`Scenarios: ${selected.length}`,
		"",
		"Use `npx jiti scripts/prompt-preview.ts --out preview` to regenerate.",
		"",
		...selected.map(formatScenario),
	].join("\n");
	const combinedPath = join(dir, "all-scenarios.md");
	writeFileSync(combinedPath, combined);
	console.log(`  → ${combinedPath} (combined)`);
} else {
	for (const s of selected) {
		console.log(formatScenario(s));
	}
}
