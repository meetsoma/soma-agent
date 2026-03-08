/**
 * Soma Boot Extension
 *
 * Auto-discovers and loads Soma's identity and preload from the project's
 * .soma/ directory. No vault, no agent profiles — just memory.
 *
 * Fresh session: loads identity only (who Soma is).
 * Resumed session (--continue): loads identity + preload (what happened).
 *
 * Also provides:
 *   /flush   — write preload + continuation prompt for next session
 *   /preload — list available preloads
 *   /soma    — status and management
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve, basename, dirname } from "path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { getAgentDir } from "@mariozechner/pi-coding-agent";

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

const AGENT_DIR = getAgentDir(); // ~/.soma/agent
const USER_CONFIG_DIR = basename(dirname(AGENT_DIR)); // ".soma"
const CONFIG_DIR = USER_CONFIG_DIR; // ".soma" — project-level config dir

// Marker files that identify a valid .soma/ project directory
const MARKERS = ["STATE.md", "identity.md", "memory"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeRead(path: string): string | null {
	try {
		if (existsSync(path)) return readFileSync(path, "utf-8");
	} catch { /* ignore */ }
	return null;
}

/**
 * Walk up from CWD to find the project .soma/ directory.
 */
function findSomaDir(): string | null {
	let dir = process.cwd();
	const root = resolve("/");
	while (dir !== root) {
		const candidate = join(dir, CONFIG_DIR);
		if (existsSync(candidate) && MARKERS.some(m => existsSync(join(candidate, m)))) {
			return candidate;
		}
		dir = resolve(dir, "..");
	}
	return null;
}

/**
 * Find the best preload file. Checks both root and memory/ subdirectory.
 */
function findPreload(somaDir: string): string | null {
	const searchDirs = [somaDir];
	const memoryDir = join(somaDir, "memory");
	if (existsSync(memoryDir)) searchDirs.push(memoryDir);

	for (const dir of searchDirs) {
		const generic = join(dir, "preload-next.md");
		if (existsSync(generic)) return generic;
	}

	// Fallback: most recent preload-* file
	for (const dir of searchDirs) {
		try {
			const files = readdirSync(dir)
				.filter(f => f.startsWith("preload-") && f.endsWith(".md"))
				.map(f => ({ name: f, path: join(dir, f), mtime: statSync(join(dir, f)).mtimeMs }))
				.sort((a, b) => b.mtime - a.mtime);
			if (files.length > 0) return files[0].path;
		} catch { /* ignore */ }
	}
	return null;
}

function isPreloadStale(path: string, maxAgeHours: number = 48): boolean {
	try {
		const age = (Date.now() - statSync(path).mtimeMs) / 3600000;
		return age > maxAgeHours;
	} catch { return true; }
}

/**
 * Initialize a fresh .soma/ directory in CWD.
 */
function initSoma(cwd: string): string {
	const somaDir = join(cwd, CONFIG_DIR);
	const dirs = [
		somaDir,
		join(somaDir, "memory"),
		join(somaDir, "memory", "muscles"),
		join(somaDir, "memory", "sessions"),
		join(somaDir, "skills"),
	];
	for (const dir of dirs) {
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	}

	// Create empty identity
	const identityPath = join(somaDir, "identity.md");
	if (!existsSync(identityPath)) {
		writeFileSync(identityPath, "# Soma Identity\n\n<!-- Write yourself. Who are you? What do you help with? -->\n");
	}

	// Create STATE.md
	const statePath = join(somaDir, "STATE.md");
	if (!existsSync(statePath)) {
		const date = new Date().toISOString().slice(0, 10);
		writeFileSync(statePath, `---\ntype: state\nproject: soma\ncreated: ${date}\n---\n\n# Soma — Project State\n\nFresh install. Identity will be discovered through use.\n`);
	}

	return somaDir;
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function somaBootExtension(pi: ExtensionAPI) {

	let somaDir: string | null = null;
	let booted = false;

	// -------------------------------------------------------------------
	// Session start: find .soma/, load identity, optionally load preload
	// -------------------------------------------------------------------

	pi.on("session_start", async (_event, ctx) => {
		somaDir = findSomaDir();

		if (!somaDir) {
			// No .soma/ found — offer to create one
			const shouldInit = await ctx.ui.confirm(
				"🌱 Soma",
				"No memory found in this project. Create one?"
			);
			if (shouldInit) {
				somaDir = initSoma(process.cwd());
				ctx.ui.notify(`🌱 Soma planted at ${somaDir}`, "info");
				pi.sendUserMessage(
					`You have a fresh memory system at \`${somaDir}\`.\n` +
					`There's an empty identity file at \`${somaDir}/identity.md\`.\n` +
					`Based on what you know about yourself and this workspace, ` +
					`write a brief identity — who are you, what do you help with, ` +
					`what's your style? Keep it under 20 lines.`,
					{ deliverAs: "followUp" }
				);
			}
			return;
		}

		// .soma/ exists — build boot context
		const parts: string[] = [];

		// Always load identity
		const identityPath = join(somaDir, "identity.md");
		const identity = safeRead(identityPath);
		if (identity && identity.trim().length > 50) {
			parts.push(`# Identity\n${identity}`);
		}

		// Load preload only on resumed sessions (--continue has existing messages)
		const isResumed = ctx.sessionManager.getEntries().some(
			(e: any) => e.type === "message"
		);
		if (isResumed) {
			const preloadPath = findPreload(somaDir);
			if (preloadPath) {
				const preload = safeRead(preloadPath);
				if (preload) {
					const stale = isPreloadStale(preloadPath) ? " ⚠️ stale" : "";
					parts.push(`\n---\n# Session Preload (${basename(preloadPath)})${stale}\n${preload}`);
				}
			}
		}

		if (parts.length > 0) {
			booted = true;
			pi.appendEntry("soma-boot", { timestamp: Date.now(), resumed: isResumed });

			const greetStyle = isResumed
				? `You've resumed a Soma session. Your identity and preload are above. Orient briefly — what you know, what you're picking up — and await instructions.`
				: `You've booted into a fresh Soma session. Your identity is above. Greet the user briefly and await instructions.`;

			pi.sendUserMessage(
				`[Soma Boot${isResumed ? " — resumed" : ""}]\n\n${parts.join("\n")}\n\n${greetStyle}`,
				{ deliverAs: "followUp" }
			);
		}
	});

	// -------------------------------------------------------------------
	// Before agent start: inject identity into system prompt + context warnings
	// -------------------------------------------------------------------

	let lastContextWarningPct = 0;

	pi.on("before_agent_start", async (event, ctx) => {
		if (!somaDir || !booted) return;

		const additions: string[] = [];

		// Context monitoring
		const usage = ctx.getContextUsage?.();
		if (usage?.percent != null) {
			const pct = usage.percent;

			if (pct >= 85 && lastContextWarningPct < 85) {
				additions.push(
					`\n## ⚠️ CONTEXT CRITICAL (${Math.round(pct)}%)\n` +
					`Flush now. Write preload, commit work, say "FLUSH COMPLETE".`
				);
				lastContextWarningPct = pct;
			} else if (pct >= 75 && lastContextWarningPct < 75) {
				additions.push(
					`\n## ⚠️ Context High (${Math.round(pct)}%)\n` +
					`Wrap up current task. Prepare to flush.`
				);
				lastContextWarningPct = pct;
			} else if (pct >= 50 && lastContextWarningPct < 50) {
				ctx.ui.notify(`Context: ${Math.round(pct)}% — pace yourself`, "info");
				lastContextWarningPct = pct;
			}
		}

		if (additions.length > 0) {
			return {
				systemPrompt: event.systemPrompt + "\n" + additions.join("\n"),
			};
		}
	});

	// Reset on new session
	pi.on("session_switch", async (_event, _ctx) => {
		lastContextWarningPct = 0;
	});

	// -------------------------------------------------------------------
	// /flush command
	// -------------------------------------------------------------------

	pi.registerCommand("flush", {
		description: "Write session state for next session continuation",
		handler: async (_args, ctx) => {
			if (!somaDir) {
				ctx.ui.notify("No .soma/ found. Run `soma init` first.", "error");
				return;
			}

			const preloadPath = join(somaDir, "memory", "preload-next.md");
			const contPath = join(somaDir, "memory", "continuation-prompt.md");
			const today = new Date().toISOString().split("T")[0];
			const logPath = join(somaDir, "memory", "sessions", `${today}.md`);

			pi.sendUserMessage(
				`[FLUSH]\n\n` +
				`**Step 1:** Commit all uncommitted work.\n\n` +
				`**Step 2:** Write \`${preloadPath}\` — compact session state:\n` +
				`- What shipped this session\n` +
				`- Key files changed\n` +
				`- What's next (priority order)\n` +
				`- What NOT to re-read\n\n` +
				`**Step 3:** Write \`${contPath}\` — instructions to yourself for the next session.\n\n` +
				`**Step 4:** Append to \`${logPath}\` — daily session log.\n\n` +
				`**Step 5:** Say "FLUSH COMPLETE".`,
				{ deliverAs: "followUp" }
			);

			ctx.ui.notify("Flush initiated", "info");
		},
	});

	// -------------------------------------------------------------------
	// /preload command
	// -------------------------------------------------------------------

	pi.registerCommand("preload", {
		description: "List available preload files",
		handler: async (_args, ctx) => {
			if (!somaDir) {
				ctx.ui.notify("No .soma/ found", "info");
				return;
			}

			const searchDirs = [somaDir, join(somaDir, "memory")];
			const items: string[] = [];

			for (const dir of searchDirs) {
				try {
					const files = readdirSync(dir)
						.filter(f => f.startsWith("preload-") && f.endsWith(".md"))
						.map(f => {
							const p = join(dir, f);
							const age = Math.floor((Date.now() - statSync(p).mtimeMs) / 3600000);
							const stale = age > 48 ? " ⚠️stale" : "";
							return `  ${f} (${age}h ago${stale})`;
						});
					if (files.length > 0) items.push(...files);
				} catch { /* ignore */ }
			}

			ctx.ui.notify(items.length > 0 ? items.join("\n") : "No preloads found", "info");
		},
	});

	// -------------------------------------------------------------------
	// /soma command: status and management
	// -------------------------------------------------------------------

	pi.registerCommand("soma", {
		description: "Soma memory status and management",
		getArgumentCompletions: (prefix) =>
			["status", "init"].filter(o => o.startsWith(prefix)).map(o => ({ value: o, label: o })),
		handler: async (args, ctx) => {
			const cmd = args.trim().toLowerCase() || "status";

			if (cmd === "init") {
				if (somaDir) {
					ctx.ui.notify(`Soma already planted at ${somaDir}`, "info");
					return;
				}
				somaDir = initSoma(process.cwd());
				ctx.ui.notify(`🌱 Soma planted at ${somaDir}`, "info");
				return;
			}

			if (cmd === "status") {
				if (!somaDir) {
					ctx.ui.notify("No Soma found. Use /soma init", "info");
					return;
				}
				const hasIdentity = existsSync(join(somaDir, "identity.md"));
				const hasPreload = findPreload(somaDir) !== null;
				const muscleDir = join(somaDir, "memory", "muscles");
				let muscleCount = 0;
				try { muscleCount = readdirSync(muscleDir).filter(f => f.endsWith(".md")).length; } catch {}

				ctx.ui.notify([
					`🌿 Soma: ${somaDir}`,
					`Identity: ${hasIdentity ? "✓" : "empty"}`,
					`Preload: ${hasPreload ? "✓" : "none"}`,
					`Muscles: ${muscleCount}`,
				].join("\n"), "info");
				return;
			}

			ctx.ui.notify("Usage: /soma status | /soma init", "info");
		},
	});
}
