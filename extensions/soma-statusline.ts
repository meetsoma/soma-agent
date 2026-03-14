/**
 * Soma Statusline Extension
 *
 * Footer rendering, cache keepalive, session timing.
 *
 * OWNS: visual display, cache management, /status, /keepalive
 * DOES NOT OWN: context warnings, flush detection, auto-continue
 * (those live in soma-boot.ts — single source of truth for session lifecycle)
 *
 * Layout:
 *   ╭─ Opus-4.6─●36%─$1.01─◷4:15─♥on
 *   │  ⊛ main 🌿soma ¶12
 *   ╰─ ~/project 5m33s +72-2
 */

import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";
import { execSync } from "child_process";
import { findSomaDir, fmtDuration } from "../core/index.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CONFIG = {
	contextWarnPct: 50,
	contextCritPct: 75,
	updateIntervalMs: 5000,
	// Cache keepalive — hardcoded, not configurable (simplicity > flexibility)
	cacheTtlSeconds: 300,        // standard Anthropic prompt cache TTL
	keepaliveThresholdSeconds: 45, // ping when this much time remains
	keepaliveCooldownSeconds: 30,  // minimum gap between pings
	keepaliveEnabled: true,
};

// Keepalive control is via soma-route.ts capabilities:
//   route.get("keepalive:toggle")?.(false)   — disable
//   route.get("keepalive:toggle")?.(true)    — enable
//   route.get("keepalive:status")?.()        — { enabled, intervalMs }

// Register keepalive capabilities on the router (if available).
// soma-route.ts may load before or after us — that's fine.
// We also re-register in session_start to catch late router init.
function provideKeepaliveToRouter() {
	const route = (globalThis as any).__somaRoute;
	if (!route) return;

	route.provide("keepalive:toggle", (enabled: boolean) => {
		CONFIG.keepaliveEnabled = enabled;
	}, {
		provider: "soma-statusline",
		description: "Enable/disable keepalive timer (true=on, false=off)",
	});

	route.provide("keepalive:status", () => ({
		enabled: CONFIG.keepaliveEnabled,
		intervalMs: CONFIG.keepaliveIntervalMs,
	}), {
		provider: "soma-statusline",
		description: "Get keepalive status { enabled, intervalMs }",
	});
}

// Try to register immediately (works if soma-route loaded first)
provideKeepaliveToRouter();

// ---------------------------------------------------------------------------
// Restart-required signal — uses execSync to avoid adding fs/path imports
// (jiti in Bun binary is sensitive to import changes)
// ---------------------------------------------------------------------------

let restartSignalPath: string | null = null;
let restartRequired = false;

function checkRestartSignal(): boolean {
	if (!restartSignalPath) return false;
	try {
		execSync(`test -f "${restartSignalPath}"`, { stdio: "ignore" });
		restartRequired = true;
		return true;
	} catch {
		restartRequired = false;
		return false;
	}
}

function clearRestartSignal(): void {
	if (!restartSignalPath) return;
	try {
		execSync(`rm -f "${restartSignalPath}"`, { stdio: "ignore" });
	} catch {}
	restartRequired = false;
}

function initRestartDetection(): void {
	const somaDir = findSomaDir(process.cwd());
	if (somaDir) {
		restartSignalPath = somaDir.path + "/.restart-required";
	}
	if (restartSignalPath) {
		clearRestartSignal();
	}
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface StatusState {
	sessionStartTs: number;
	lastActivityTs: number;
	turnCount: number;
	isAgentBusy: boolean;
	keepalivePingsSent: number;
	lastKeepaliveTs: number;
}

// ---------------------------------------------------------------------------
// Git helper
// ---------------------------------------------------------------------------

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

function fmtTime(secs: number): string {
	if (secs <= 0) return "cold";
	const m = Math.floor(secs / 60);
	const s = secs % 60;
	return `${m}:${s.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function somaStatuslineExtension(pi: ExtensionAPI) {
	const state: StatusState = {
		sessionStartTs: Date.now(),
		lastActivityTs: Date.now(),
		turnCount: 0,
		isAgentBusy: false,
		keepalivePingsSent: 0,
		lastKeepaliveTs: 0,
	};

	let updateTimer: ReturnType<typeof setInterval> | null = null;
	let latestCtx: ExtensionContext | null = null;

	function idleSeconds(): number {
		return Math.floor((Date.now() - state.lastActivityTs) / 1000);
	}

	function cacheRemaining(): number {
		return Math.max(0, CONFIG.cacheTtlSeconds - idleSeconds());
	}

	// -------------------------------------------------------------------
	// Cache Keepalive — prevents expensive prompt re-caching on idle
	// -------------------------------------------------------------------

	function checkKeepalive(ctx: ExtensionContext): void {
		if (!CONFIG.keepaliveEnabled || state.isAgentBusy) return;
		const remaining = cacheRemaining();
		const timeSinceLastPing = (Date.now() - state.lastKeepaliveTs) / 1000;

		if (
			remaining > 0 &&
			remaining <= CONFIG.keepaliveThresholdSeconds &&
			timeSinceLastPing > CONFIG.keepaliveCooldownSeconds
		) {
			state.keepalivePingsSent++;
			state.lastKeepaliveTs = Date.now();
			state.lastActivityTs = Date.now();
			pi.sendUserMessage("[cache keepalive — respond with just 'ok']", { deliverAs: "followUp" });
			ctx.ui.notify(`♥ Cache keepalive #${state.keepalivePingsSent} (${fmtTime(remaining)} was remaining)`, "info");
		}
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
					const BRAND = truecolor ? "\x1b[1;38;2;124;156;255m" : "\x1b[1;38;5;111m";
					const brand = (t: string) => `${BRAND}${t}${RESET}`;
					const B_CYAN = truecolor ? "\x1b[1;38;2;80;200;220m" : "\x1b[1;36m";
					const B_YELLOW = truecolor ? "\x1b[1;38;2;234;179;8m" : "\x1b[1;33m";
					const B_BLUE = truecolor ? "\x1b[1;38;2;100;140;220m" : "\x1b[1;34m";
					const SEP = brand("─");

					// Cache TTL colors — cool→warm (distinct from context health)
					const remaining = cacheRemaining();
					const idleColor = (() => {
						if (remaining <= 0) return MUTED;
						if (truecolor) {
							if (remaining <= 60) return "\x1b[1;38;2;255;140;0m";
							if (remaining <= 180) return "\x1b[1;38;2;100;180;255m";
							return "\x1b[1;38;2;80;140;220m";
						}
						if (remaining <= 60) return "\x1b[1;38;5;208m";
						if (remaining <= 180) return "\x1b[1;38;5;75m";
						return "\x1b[1;38;5;68m";
					})();
					const cacheFmt = (t: string) => `${idleColor}${t}${RESET}`;

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

					const shortModel = (ctx.model?.id || "no-model")
						.replace("claude-", "")
						.replace(/-(\d+)-(\d+)$/, "-$1.$2")
						.replace(/^(\w)/, (_, c: string) => c.toUpperCase());

					const thinkingLevel = pi.getThinkingLevel();
					const thinkingStr = ctx.model?.reasoning && thinkingLevel !== "off" ? ` • ${thinkingLevel}` : "";

					let ctxColor = good;
					if (contextPct >= CONFIG.contextCritPct) ctxColor = crit;
					else if (contextPct >= CONFIG.contextWarnPct) ctxColor = warn;
					const ctxStr = `${contextPct.toFixed(0)}%`;

					// Keepalive indicator
					const kaStr = CONFIG.keepaliveEnabled
						? (state.keepalivePingsSent > 0 ? good(`♥${state.keepalivePingsSent}`) : dim("♥on"))
						: dim("♥off");

					// Line 1: ╭─ Model─●Context%─$Cost─◷Cache─♥KA
					const line1 = [
						brand("╭─"), brand(shortModel + thinkingStr),
						ctxColor(`◉${ctxStr}`), brand(`$${totalCost.toFixed(2)}`),
						cacheFmt(`◷${fmtTime(remaining)}`), kaStr,
					].join(SEP);

					// Line 2: │  ⊛ branch 🌿soma ¶turns 📋session-id
					const gitIcon = git.dirty ? `${B_YELLOW}⊛${RESET}` : `${B_BLUE}⊚${RESET}`;
					const line2Items: string[] = [brand("│ ")];
					if (git.branch) {
						const branchColor = git.dirty ? B_YELLOW : B_BLUE;
						const branchDisplay = git.branch.length > 18 ? git.branch.slice(0, 15) + ".." : git.branch;
						line2Items.push(`${gitIcon} ${branchColor}${branchDisplay}${RESET}`);
					}
					line2Items.push(brand("🌿soma"));
					line2Items.push(dim(`¶${state.turnCount}`));

					// Session ID from soma-boot via router
					const somaRoute = (globalThis as any).__somaRoute;
					const getSessionId = somaRoute?.get("session:id");
					const sessionId = getSessionId?.();
					if (sessionId) {
						line2Items.push(dim(`📋${sessionId}`));
					}

					if (restartRequired) {
						line2Items.push(warn("🔄restart"));
					}
					const line2 = line2Items.join(" ");

					// Line 3: ╰─ ~/path duration +ins-del
					let pwd = process.cwd();
					const home = process.env.HOME || process.env.USERPROFILE;
					if (home && pwd.startsWith(home)) pwd = `~${pwd.slice(home.length)}`;
					if (pwd.length > 30) pwd = `…${pwd.slice(-(29))}`;

					const line3Items = [brand("╰─"), `${B_CYAN}${pwd}${RESET}`];
					line3Items.push(brand(uptime));
					if (git.stats) {
						const parts = git.stats.match(/\+(\d+)-(\d+)/);
						if (parts) line3Items.push(`${C_GOOD}+${parts[1]}${RESET}${C_CRIT}-${parts[2]}${RESET}`);
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
	// Events — only what statusline OWNS
	// -------------------------------------------------------------------

	pi.on("session_start", async (_event, ctx) => {
		latestCtx = ctx;
		state.sessionStartTs = Date.now();
		state.lastActivityTs = Date.now();

		// Re-register keepalive on router (catches late router init)
		provideKeepaliveToRouter();

		// Init restart detection — clears stale signals from prior sessions
		initRestartDetection();

		// Restore persisted state
		for (const entry of ctx.sessionManager.getEntries()) {
			if (entry.type === "custom" && entry.customType === "soma-statusline" && entry.data) {
				state.turnCount = (entry.data as any).turnCount || 0;
				state.keepalivePingsSent = (entry.data as any).keepalivePingsSent || 0;
				if ((entry.data as any).sessionStartTs) state.sessionStartTs = (entry.data as any).sessionStartTs;
			}
		}

		installFooter(ctx);

		// Start keepalive + restart-check timer
		updateTimer = setInterval(() => {
			if (latestCtx) {
				checkKeepalive(latestCtx);
				checkRestartSignal();
			}
		}, CONFIG.updateIntervalMs);
	});

	pi.on("turn_start", async () => {
		state.turnCount++;
		state.isAgentBusy = true;
		state.lastActivityTs = Date.now();
	});

	pi.on("turn_end", async (_event, ctx) => {
		state.isAgentBusy = false;
		state.lastActivityTs = Date.now();
		latestCtx = ctx;

		// Check restart signal after every turn (agent may have just committed)
		const wasRequired = restartRequired;
		checkRestartSignal();
		if (!wasRequired && restartRequired) {
			ctx.ui.notify("🔄 Restart required — core/extension files changed", "warning");
		}

		// Persist state periodically
		if (state.turnCount % 5 === 0) {
			pi.appendEntry("soma-statusline", {
				turnCount: state.turnCount,
				keepalivePingsSent: state.keepalivePingsSent,
				sessionStartTs: state.sessionStartTs,
			});
		}
	});

	pi.on("session_switch", async (event, ctx) => {
		if (event.reason === "new") {
			state.turnCount = 0;
			state.keepalivePingsSent = 0;
			state.lastActivityTs = Date.now();
			state.sessionStartTs = Date.now();
			latestCtx = ctx;
			installFooter(ctx);
		}
	});

	pi.on("session_shutdown", async () => {
		if (updateTimer) clearInterval(updateTimer);
	});

	// -------------------------------------------------------------------
	// Commands — only what statusline OWNS
	// -------------------------------------------------------------------

	pi.registerCommand("status", {
		description: "Show session stats",
		handler: async (_args, ctx) => {
			const usage = ctx.getContextUsage?.();
			ctx.ui.notify([
				`Context: ${usage?.percent ?? "?"}% (${usage?.tokens ?? "?"} / ${usage?.contextWindow ?? "?"} tokens)`,
				`Cache: ${cacheRemaining() > 0 ? fmtTime(cacheRemaining()) : "COLD"} / ${fmtTime(CONFIG.cacheTtlSeconds)}`,
				`Keepalive: ${CONFIG.keepaliveEnabled ? "ON" : "OFF"} (${state.keepalivePingsSent} pings)`,
				`Turns: ${state.turnCount} | Uptime: ${fmtDuration(Date.now() - state.sessionStartTs)}`,
			].join("\n"), "info");
		},
	});

	pi.registerCommand("keepalive", {
		description: "Toggle cache keepalive on/off",
		getArgumentCompletions: (prefix) =>
			["on", "off", "status"].filter(o => o.startsWith(prefix)).map(o => ({ value: o, label: o })),
		handler: async (args, ctx) => {
			const cmd = args.trim().toLowerCase() || "status";
			if (cmd === "on") {
				(CONFIG as any).keepaliveEnabled = true;
				ctx.ui.notify("♥ Keepalive ON", "info");
			} else if (cmd === "off") {
				(CONFIG as any).keepaliveEnabled = false;
				ctx.ui.notify("♥ Keepalive OFF", "info");
			} else {
				ctx.ui.notify([
					`Keepalive: ${CONFIG.keepaliveEnabled ? "ON" : "OFF"} (${state.keepalivePingsSent} pings)`,
					`Cache: ${cacheRemaining() > 0 ? fmtTime(cacheRemaining()) : "COLD"} / ${fmtTime(CONFIG.cacheTtlSeconds)}`,
				].join("\n"), "info");
			}
		},
	});
}
