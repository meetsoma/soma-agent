/**
 * Soma Statusline Extension
 *
 * Lightweight footer for Soma sessions. Shows model, context usage,
 * cost, uptime, and git status. Derived from Gravicity's statusline
 * but stripped of vault/keepalive/cache complexity.
 *
 * Layout:
 *   ╭─ Opus-4.6─●36%─$1.01─♥on
 *   │  ⊛ main ⚡soma ¶12
 *   ╰─ ~/project 5m33s +72-2
 */

import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";
import { getAgentDir } from "@mariozechner/pi-coding-agent";
import { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";
import { basename, dirname, resolve } from "path";

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

const AGENT_DIR = getAgentDir();
const CONFIG_DIR = basename(dirname(AGENT_DIR)); // ".soma"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CONFIG = {
	contextWarnPct: 50,
	contextCritPct: 75,
	updateIntervalMs: 5000,
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface StatusState {
	sessionStartTs: number;
	turnCount: number;
	isAgentBusy: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDuration(ms: number): string {
	const secs = Math.floor(ms / 1000);
	if (secs >= 3600) return `${Math.floor(secs / 3600)}h${Math.floor((secs % 3600) / 60)}m`;
	if (secs >= 60) return `${Math.floor(secs / 60)}m${(secs % 60).toString().padStart(2, "0")}s`;
	return `${secs}s`;
}

let cachedGitInfo = { branch: "", dirty: false, stats: "", ts: 0 };

function getGitInfo(): { branch: string; dirty: boolean; stats: string } {
	if (Date.now() - cachedGitInfo.ts < 5000) return cachedGitInfo;
	try {
		const branch = execSync("git branch --show-current 2>/dev/null", { encoding: "utf-8", timeout: 2000 }).trim() || "detached";
		const porcelain = execSync("git status --porcelain 2>/dev/null | head -1", { encoding: "utf-8", timeout: 2000 }).trim();
		const dirty = porcelain.length > 0;
		let stats = "";
		try {
			const raw = execSync("git diff --shortstat HEAD 2>/dev/null", { encoding: "utf-8", timeout: 2000 }).trim();
			if (raw) {
				const ins = raw.match(/(\d+) insertion/)?.[1] || "0";
				const del = raw.match(/(\d+) deletion/)?.[1] || "0";
				stats = `+${ins}-${del}`;
			}
		} catch {}
		cachedGitInfo = { branch, dirty, stats, ts: Date.now() };
		return cachedGitInfo;
	} catch {
		return { branch: "", dirty: false, stats: "" };
	}
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function somaStatuslineExtension(pi: ExtensionAPI) {
	const state: StatusState = {
		sessionStartTs: Date.now(),
		turnCount: 0,
		isAgentBusy: false,
	};

	// Flush detection
	let continuationPromptPath: string | null = null;
	let flushCompleteDetected = false;
	let autoFlushSent = false;
	let wrapUpSent = false;
	let lastWarnThreshold = 0;

	function findContinuationPrompt(): string | null {
		if (continuationPromptPath) return continuationPromptPath;
		let dir = process.cwd();
		const root = "/";
		while (dir !== root) {
			// Check .soma/ and .soma/memory/
			for (const sub of ["", "/memory"]) {
				const candidate = `${dir}/${CONFIG_DIR}${sub}/continuation-prompt.md`;
				try { readFileSync(candidate); return candidate; } catch {}
			}
			dir = resolve(dir, "..");
		}
		return null;
	}

	// -------------------------------------------------------------------
	// Footer
	// -------------------------------------------------------------------

	function installFooter(ctx: ExtensionContext): void {
		ctx.ui.setFooter((tui, theme, footerData) => {
			const unsub = footerData.onBranchChange(() => tui.requestRender());
			const renderTimer = setInterval(() => tui.requestRender(), 5000);

			return {
				dispose: () => { unsub(); clearInterval(renderTimer); },
				invalidate() {},
				render(width: number): string[] {
					const RESET = "\x1b[0m";
					const truecolor = theme.getColorMode() === "truecolor";

					const MUTED = truecolor ? "\x1b[38;2;148;163;184m" : "\x1b[38;5;248m";
					const dim = (t: string) => `${MUTED}${t}${RESET}`;
					const C_GOOD = truecolor ? "\x1b[1;38;2;34;197;94m" : "\x1b[1;38;5;35m";
					const C_WARN = truecolor ? "\x1b[1;38;2;234;179;8m" : "\x1b[1;38;5;220m";
					const C_CRIT = truecolor ? "\x1b[1;38;2;239;68;68m" : "\x1b[1;38;5;196m";
					const good = (t: string) => `${C_GOOD}${t}${RESET}`;
					const warn = (t: string) => `${C_WARN}${t}${RESET}`;
					const crit = (t: string) => `${C_CRIT}${t}${RESET}`;

					// Brand accent
					const BRAND = truecolor ? "\x1b[1;38;2;124;156;255m" : "\x1b[1;38;5;111m";
					const brand = (t: string) => `${BRAND}${t}${RESET}`;

					const B_CYAN = truecolor ? "\x1b[1;38;2;80;200;220m" : "\x1b[1;36m";
					const B_YELLOW = truecolor ? "\x1b[1;38;2;234;179;8m" : "\x1b[1;33m";
					const B_BLUE = truecolor ? "\x1b[1;38;2;100;140;220m" : "\x1b[1;34m";

					const SEP = brand("─");

					// Data
					let totalCost = 0;
					for (const entry of ctx.sessionManager.getEntries()) {
						if (entry.type === "message" && entry.message.role === "assistant") {
							totalCost += (entry.message as AssistantMessage).usage.cost.total;
						}
					}

					const contextUsage = ctx.getContextUsage();
					const contextPct = contextUsage?.percent ?? 0;
					const git = getGitInfo();
					const uptime = fmtDuration(Date.now() - state.sessionStartTs);

					// Model display
					const shortModel = (ctx.model?.id || "no-model")
						.replace("claude-", "")
						.replace(/-(\d+)-(\d+)$/, "-$1.$2")
						.replace(/^(\w)/, (_, c: string) => c.toUpperCase());

					const thinkingLevel = pi.getThinkingLevel();
					const thinkingStr = ctx.model?.reasoning && thinkingLevel !== "off" ? ` • ${thinkingLevel}` : "";

					// Context color
					let ctxColor = good;
					if (contextPct >= CONFIG.contextCritPct) ctxColor = crit;
					else if (contextPct >= CONFIG.contextWarnPct) ctxColor = warn;
					const ctxStr = `${contextPct.toFixed(0)}%`;

					// Line 1
					const line1 = [
						brand("╭─"),
						brand(shortModel + thinkingStr),
						ctxColor(`◉${ctxStr}`),
						brand(`$${totalCost.toFixed(2)}`),
					].join(SEP);

					// Line 2
					const gitIcon = git.dirty ? `${B_YELLOW}⊛${RESET}` : `${B_BLUE}⊚${RESET}`;
					const line2Items: string[] = [brand("│ ")];
					if (git.branch) {
						const branchColor = git.dirty ? B_YELLOW : B_BLUE;
						const branchDisplay = git.branch.length > 18 ? git.branch.slice(0, 15) + ".." : git.branch;
						line2Items.push(`${gitIcon} ${branchColor}${branchDisplay}${RESET}`);
					}
					line2Items.push(brand("⚡soma"));
					line2Items.push(dim(`¶${state.turnCount}`));
					const line2 = line2Items.join(" ");

					// Line 3
					let pwd = process.cwd();
					const home = process.env.HOME || process.env.USERPROFILE;
					if (home && pwd.startsWith(home)) pwd = `~${pwd.slice(home.length)}`;
					if (pwd.length > 30) pwd = `…${pwd.slice(-(29))}`;

					const line3Items = [brand("╰─"), `${B_CYAN}${pwd}${RESET}`];
					line3Items.push(brand(uptime));
					if (git.stats) {
						const parts = git.stats.match(/\+(\d+)-(\d+)/);
						if (parts) {
							line3Items.push(`${C_GOOD}+${parts[1]}${RESET}${C_CRIT}-${parts[2]}${RESET}`);
						}
					}
					const line3 = line3Items.join(" ");

					return [
						truncateToWidth(line1, width, dim("...")),
						truncateToWidth(line2, width, dim("...")),
						truncateToWidth(line3, width, dim("...")),
					];
				},
			};
		});
	}

	// -------------------------------------------------------------------
	// Events
	// -------------------------------------------------------------------

	pi.on("session_start", async (_event, ctx) => {
		state.sessionStartTs = Date.now();

		// Restore turn count from persisted state
		for (const entry of ctx.sessionManager.getEntries()) {
			if (entry.type === "custom" && entry.customType === "soma-statusline" && entry.data) {
				state.turnCount = (entry.data as any).turnCount || 0;
				if ((entry.data as any).sessionStartTs) state.sessionStartTs = (entry.data as any).sessionStartTs;
			}
		}

		installFooter(ctx);
	});

	pi.on("turn_start", async () => {
		state.turnCount++;
		state.isAgentBusy = true;
	});

	pi.on("turn_end", async (_event, ctx) => {
		state.isAgentBusy = false;

		// Persist state periodically
		if (state.turnCount % 5 === 0) {
			pi.appendEntry("soma-statusline", {
				turnCount: state.turnCount,
				sessionStartTs: state.sessionStartTs,
			});
		}

		// Context warnings
		const usage = ctx.getContextUsage?.();
		if (!usage || usage.percent === null) return;
		const pct = usage.percent;

		let threshold = 0;
		if (pct >= 85) threshold = 85;
		else if (pct >= 80) threshold = 80;
		else if (pct >= 70) threshold = 70;
		else if (pct >= 50) threshold = 50;

		if (threshold > 0 && threshold > lastWarnThreshold) {
			lastWarnThreshold = threshold;

			if (pct >= 85 && !autoFlushSent) {
				autoFlushSent = true;
				ctx.ui.notify(`🔴 Context at ${pct.toFixed(0)}% — AUTO-FLUSH`, "error");

				// Find .soma dir for paths
				let somaDir = "";
				let dir = process.cwd();
				while (dir !== "/") {
					if (existsSync(`${dir}/${CONFIG_DIR}`)) { somaDir = `${dir}/${CONFIG_DIR}`; break; }
					dir = resolve(dir, "..");
				}
				const contPath = somaDir ? `${somaDir}/memory/continuation-prompt.md` : `${CONFIG_DIR}/memory/continuation-prompt.md`;
				const preloadPath = somaDir ? `${somaDir}/memory/preload-next.md` : `${CONFIG_DIR}/memory/preload-next.md`;

				pi.sendUserMessage(
					`[AUTO-FLUSH — context at ${pct.toFixed(0)}%]\n\n` +
					`Context is critically full. Flush NOW.\n\n` +
					`1. Write \`${preloadPath}\` — what shipped, key decisions, next priorities.\n` +
					`2. Write \`${contPath}\` — instructions to yourself for fresh session.\n` +
					`3. Commit all work.\n` +
					`4. Say "FLUSH COMPLETE".`,
					{ deliverAs: "followUp" }
				);
			} else if (pct >= 80) {
				ctx.ui.notify(`⚠️ Context ${pct.toFixed(0)}% — flush soon`, "warning");
			} else if (pct >= 70 && !wrapUpSent) {
				wrapUpSent = true;
				ctx.ui.notify(`Context ${pct.toFixed(0)}%`, "info");
			} else if (pct >= 50) {
				ctx.ui.notify(`Context ${pct.toFixed(0)}%`, "info");
			}
		}
	});

	// Detect "FLUSH COMPLETE"
	pi.on("message_end", async (event) => {
		if (event.message.role !== "assistant") return;
		const content = event.message.content;
		if (typeof content === "string") {
			if (content.includes("FLUSH COMPLETE")) flushCompleteDetected = true;
		} else if (Array.isArray(content)) {
			if (content.some((block: any) => block.type === "text" && block.text?.includes("FLUSH COMPLETE"))) {
				flushCompleteDetected = true;
			}
		}
	});

	// Detect flush file writes
	pi.on("tool_result", async (event, ctx) => {
		if (event.toolName !== "write" || event.isError) return;
		const writePath = (event.input as any)?.path as string;
		if (!writePath) return;
		const filename = writePath.split("/").pop() || "";

		if (filename === "continuation-prompt.md") {
			continuationPromptPath = writePath;
			ctx.ui.notify(`✅ Continuation prompt captured`, "info");
		} else if (filename.startsWith("preload-next") && filename.endsWith(".md")) {
			ctx.ui.notify(`✅ Preload written`, "info");
		}
	});

	// After flush: prompt for auto-continue
	pi.on("agent_end", async (_event, ctx) => {
		if (flushCompleteDetected && continuationPromptPath) {
			ctx.ui.notify(
				"🟢 FLUSH COMPLETE — Hit Ctrl+N or type /auto-continue",
				"info"
			);
		}
	});

	// Auto-continue command
	pi.registerCommand("auto-continue", {
		description: "Create new session and inject continuation prompt",
		handler: async (_args, ctx) => {
			const promptPath = continuationPromptPath || findContinuationPrompt();
			if (!promptPath) {
				ctx.ui.notify("⚠️ No continuation prompt found", "warning");
				return;
			}

			let content = "";
			try { content = readFileSync(promptPath, "utf-8").trim(); } catch {}
			if (!content) {
				ctx.ui.notify("⚠️ Continuation prompt is empty", "warning");
				return;
			}

			ctx.ui.notify("🔄 Creating new session...", "info");
			try {
				const result = await ctx.newSession({});
				if (!result.cancelled) {
					pi.sendUserMessage(content, { deliverAs: "followUp" });
					ctx.ui.notify("✅ Auto-continued", "info");
				}
			} catch (err: any) {
				ctx.ui.notify(`⚠️ Auto-continue failed: ${err?.message?.slice(0, 100)}`, "error");
			}

			// Reset
			continuationPromptPath = null;
			flushCompleteDetected = false;
			autoFlushSent = false;
			wrapUpSent = false;
			lastWarnThreshold = 0;
		},
	});

	// Handle manual /new — inject continuation if available
	pi.on("session_switch", async (event, ctx) => {
		if (event.reason !== "new") return;

		state.turnCount = 0;
		state.sessionStartTs = Date.now();
		wrapUpSent = false;
		autoFlushSent = false;
		flushCompleteDetected = false;
		lastWarnThreshold = 0;

		installFooter(ctx);

		// Check for continuation prompt on disk
		if (!continuationPromptPath) {
			const promptPath = findContinuationPrompt();
			if (promptPath) {
				try {
					const prompt = readFileSync(promptPath, "utf-8");
					if (prompt.trim()) {
						ctx.ui.notify("📋 Continuation prompt found — injecting", "info");
						pi.sendUserMessage(prompt, { deliverAs: "followUp" });
					}
				} catch {}
			}
		}
		continuationPromptPath = null;
	});

	// -------------------------------------------------------------------
	// /status command
	// -------------------------------------------------------------------

	pi.registerCommand("status", {
		description: "Show session stats",
		handler: async (_args, ctx) => {
			const usage = ctx.getContextUsage?.();
			ctx.ui.notify([
				`Context: ${usage?.percent ?? "?"}% (${usage?.tokens ?? "?"} / ${usage?.contextWindow ?? "?"} tokens)`,
				`Turns: ${state.turnCount} | Uptime: ${fmtDuration(Date.now() - state.sessionStartTs)}`,
			].join("\n"), "info");
		},
	});

	pi.on("session_shutdown", async () => {});
}
