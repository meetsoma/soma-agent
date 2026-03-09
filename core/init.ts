/**
 * Soma Core — Init
 *
 * Scaffolds a fresh .soma/ (or configured root) directory.
 *
 * Template resolution (first match wins):
 *   1. Explicit templateDir option (from CLI or .soma.yaml)
 *   2. Parent .soma/templates/init/ (team defaults walk up chain)
 *   3. Global ~/.soma/templates/init/ (personal defaults)
 *   4. Bundled defaults (hardcoded — always works standalone)
 *
 * Templates use {{PLACEHOLDER}} syntax:
 *   {{PROJECT_NAME}} — project name (from option or directory name)
 *   {{DATE}}          — today's date (YYYY-MM-DD)
 *   {{ROOT}}          — root directory name (.soma, .claude, etc.)
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "fs";
import { join, basename, resolve, dirname } from "path";
import { DEFAULT_ROOT } from "./discovery.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InitOptions {
	/** Root directory name (default: ".soma") */
	rootName?: string;
	/** Project name for templates (default: directory name) */
	projectName?: string;
	/** Explicit template directory (overrides chain walk) */
	templateDir?: string;
	/** Skip settings.json generation (for child somas inheriting from parent) */
	inheritSettings?: boolean;
}

// ---------------------------------------------------------------------------
// Built-in defaults (always available — no external files needed)
// ---------------------------------------------------------------------------

const BUILTIN_IDENTITY = `---
type: identity
agent: soma
project: {{PROJECT_NAME}}
created: {{DATE}}
---

# Soma — {{PROJECT_NAME}}

## Who You Are

You are Soma (σῶμα) — an AI coding agent with self-growing memory. You learn from every session, remember across conversations, and evolve your understanding of this project over time.

## This Project

{{PROJECT_NAME}} — describe what this project is and what you're building.

## How You Work

- Read your memory (muscles) before starting unfamiliar tasks
- Write preloads at the end of long sessions so you can resume
- Use the ATLAS method: keep STATE.md as the architecture truth
- Follow the breath cycle: inhale (boot) → process (work) → exhale (flush)
- When you learn a reusable pattern, crystallize it as a muscle

## Conventions

- Edit this file to add project-specific conventions
- Add language preferences, framework choices, style guides
- The more specific you are, the better Soma performs in this project
`;

const BUILTIN_STATE = `---
type: state
method: atlas
project: {{PROJECT_NAME}}
updated: {{DATE}}
status: active
rule: Update this file whenever the architecture changes.
---

# {{PROJECT_NAME}} — Architecture State

> ATLAS — single source of truth for this project's architecture.
> Update this file in the same commit as any architectural change.

## What This Is

<!-- Describe the project in 2-3 sentences -->

## System Map

\`\`\`
┌──────────────────┐
│  {{PROJECT_NAME}} │
└──────────────────┘
\`\`\`

## Components

| Component | What | Status | Location |
|-----------|------|--------|----------|

## Decisions

| Decision | Date | Rationale |
|----------|------|-----------|

## Open Questions

-
`;

const BUILTIN_SETTINGS = {
	"$schema": "https://soma.gravicity.ai/schemas/settings-v1.json",
	root: "{{ROOT}}",
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

const BUILTIN_GITIGNORE = `# Session data (personal, not shared)
memory/preload-*.md
memory/continuation-prompt.md
memory/sessions/
.protocol-state.json

# Secrets
secrets/
*.env
`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize a soma directory in the given path.
 *
 * Template resolution: explicit → parent chain → global → built-in.
 * Built-in defaults always work — no external dependencies needed.
 *
 * @param cwd - Directory to create the soma root in
 * @param options - Configuration options
 * @returns Absolute path to the created soma directory
 */
export function initSoma(cwd: string, options: InitOptions = {}): string {
	const rootName = options.rootName || DEFAULT_ROOT;
	const somaDir = join(cwd, rootName);
	const projectName = options.projectName || basename(cwd);
	const dateStr = today();

	// Resolve template directory
	const templateDir = resolveTemplateDir(cwd, rootName, options.templateDir);

	// Substitution context
	const vars: Record<string, string> = {
		"PROJECT_NAME": projectName,
		"DATE": dateStr,
		"ROOT": rootName,
	};

	// Create directory structure
	const dirs = [
		somaDir,
		join(somaDir, "memory"),
		join(somaDir, "memory", "muscles"),
		join(somaDir, "memory", "sessions"),
		join(somaDir, "protocols"),
		join(somaDir, "scripts"),
		join(somaDir, "skills"),
		join(somaDir, "extensions"),
	];

	for (const dir of dirs) {
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	}

	// Scaffold files — template if available, built-in fallback
	writeIfMissing(
		join(somaDir, "identity.md"),
		loadTemplate(templateDir, "identity.md", vars) || substitute(BUILTIN_IDENTITY, vars)
	);

	writeIfMissing(
		join(somaDir, "STATE.md"),
		loadTemplate(templateDir, "STATE.md", vars) || substitute(BUILTIN_STATE, vars)
	);

	if (!options.inheritSettings) {
		const settingsContent = loadTemplate(templateDir, "settings.json", vars);
		if (settingsContent) {
			writeIfMissing(join(somaDir, "settings.json"), settingsContent);
		} else {
			// Built-in settings — substitute root name, write as JSON
			const settings = JSON.parse(JSON.stringify(BUILTIN_SETTINGS).replace("{{ROOT}}", rootName));
			writeIfMissing(join(somaDir, "settings.json"), JSON.stringify(settings, null, 2) + "\n");
		}
	}

	writeIfMissing(
		join(somaDir, ".gitignore"),
		loadTemplate(templateDir, ".gitignore", vars) || BUILTIN_GITIGNORE
	);

	return somaDir;
}

/**
 * Find available template directories for init.
 * Returns the first one found, or null (use built-in defaults).
 *
 * Resolution order:
 *   1. Explicit templateDir option
 *   2. Walk up from cwd checking .soma/templates/init/
 *   3. Global ~/.soma/templates/init/
 */
export function resolveTemplateDir(
	cwd: string,
	rootName: string = DEFAULT_ROOT,
	explicit?: string
): string | null {
	// 1. Explicit
	if (explicit && existsSync(explicit)) return explicit;

	// 2. Walk up parent chain
	let dir = resolve(cwd, "..");  // Start above cwd (don't find ourselves)
	const root = resolve("/");
	while (dir !== root) {
		const candidate = join(dir, rootName, "templates", "init");
		if (existsSync(candidate)) return candidate;
		dir = resolve(dir, "..");
	}

	// 3. Global
	const home = process.env.HOME || process.env.USERPROFILE;
	if (home) {
		const globalCandidate = join(home, rootName, "templates", "init");
		if (existsSync(globalCandidate)) return globalCandidate;
	}

	return null;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function today(): string {
	return new Date().toISOString().slice(0, 10);
}

/** Replace {{PLACEHOLDER}} with values from vars map */
function substitute(content: string, vars: Record<string, string>): string {
	return content.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match);
}

/** Load a template file and apply substitutions. Returns null if not found. */
function loadTemplate(
	templateDir: string | null,
	filename: string,
	vars: Record<string, string>
): string | null {
	if (!templateDir) return null;
	const filePath = join(templateDir, filename);
	if (!existsSync(filePath)) return null;
	try {
		const raw = readFileSync(filePath, "utf-8");
		return substitute(raw, vars);
	} catch {
		return null;
	}
}

/** Write content to path only if the file doesn't already exist */
function writeIfMissing(path: string, content: string): void {
	if (!existsSync(path)) {
		writeFileSync(path, content);
	}
}
