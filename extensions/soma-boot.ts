/**
 * Soma Boot Extension
 *
 * Single source of truth for session lifecycle:
 *   - Discovery + identity + preload + protocols + muscles + scripts + git-context
 *   - Context warnings (50% → 70% → 80% → 85% auto-flush)
 *   - FLUSH COMPLETE detection + auto-rotation
 *   - Preload watcher (tool_result) + auto-inject on fresh boot
 *   - /exhale, /breathe, /inhale, /pin, /kill, /soma, /preload, /auto-continue
 *   - Heat tracking (auto-detect + decay)
 *
 * Statusline extension ONLY handles: footer rendering, cache keepalive, /status, /keepalive
 *
 * ─── Protocol Map ───────────────────────────────────────────────────────
 * This file embeds logic for multiple protocols. Each section is marked
 * with a PROTOCOL comment block. When changing one section, you should NOT
 * need to understand unrelated sections. If you do, it's time to extract.
 *
 * Protocol              │ Sections (search for ═══ PROTOCOL: <name>)
 * ──────────────────────┼─────────────────────────────────────────────
 * breath-cycle          │ session_start (preload auto-inject),
 *                       │   session_switch (re-discovery + preload),
 *                       │   context warnings, /exhale, /breathe, /rest,
 *                       │   /auto-continue, /inhale, /preload,
 *                       │   FLUSH COMPLETE detection, preload watcher
 * heat-tracking         │ HEAT_RULES, tool_result auto-detect,
 *                       │   session_shutdown decay, /pin, /kill
 * session-checkpoints   │ session_start (git-context), /exhale step 1
 *                       │   (checkpoint commands), .soma diff on boot
 * discovery             │ session_start (identity, protocols, muscles,
 *                       │   scripts), /soma status
 * ────────────────────────────────────────────────────────────────────────
 */

import { join, dirname, resolve } from "path";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
	findSomaDir,
	getSomaChain,
	buildLayeredIdentity,
	findPreload,
	discoverProtocolChain,
	detectProjectSignals,
	loadProtocolState,
	saveProtocolState,
	bootstrapProtocolState,
	syncProtocolState,
	buildProtocolInjection,
	applyDecay,
	discoverMuscleChain,
	buildMuscleInjection,
	trackMuscleLoads,
	decayMuscleHeat,
	bumpMuscleHeat,
	recordHeatEvent,
	getProtocolHeat,
	loadSettings,
	initSoma,
	installItem,
	listRemote,
	listLocal,
	compileFrontalCortex,
	compileFullSystemPrompt,
	detectProjectContext,
	resolveSomaPath,
	createDebugLogger,
	type DebugLogger,
	type SomaDir,
	type SomaSettings,
	type ProtocolState,
	discoverAutomationChain,
	buildAutomationInjection,
	bumpAutomationHeat,
	decayAutomationHeat,
	type ContentType,
	type Protocol,
	type Muscle,
	type Automation,
} from "../core/index.js";

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

// Auto-extract script description from first comment line (# description).
// Falls back to hardcoded overrides for scripts with verbose headers.
const SCRIPT_DESCRIPTION_OVERRIDES: Record<string, string> = {
	"soma-audit.sh": "Ecosystem health check — 11 audits: PII, drift, stale content/terms, docs sync, commands, roadmap, overlap, settings, tests, frontmatter. `--list`, `--quiet`, or name specific audits",
};

function getScriptDescription(scriptPath: string, scriptName: string): string {
	// Check overrides first
	if (SCRIPT_DESCRIPTION_OVERRIDES[scriptName]) return SCRIPT_DESCRIPTION_OVERRIDES[scriptName];

	// Auto-extract: read first 5 lines, find first comment (not shebang)
	try {
		const content = readFileSync(scriptPath, "utf-8");
		const lines = content.split("\n").slice(0, 5);
		for (const line of lines) {
			if (line.startsWith("#!")) continue; // skip shebang
			if (line.startsWith("# ")) {
				// Strip "scriptname.sh — " prefix if present
				let desc = line.replace(/^#\s*/, "");
				desc = desc.replace(/^\S+\.sh\s*[—–-]\s*/, "");
				if (desc.length > 0) return desc;
			}
		}
	} catch { /* can't read — fall through */ }
	return "—";
}

// Resolve agent dir from this module's location (extensions/ → parent)
const __dirname = dirname(fileURLToPath(import.meta.url));
const somaAgentDir = resolve(__dirname, "..");

export default function somaBootExtension(pi: ExtensionAPI) {

	// REFACTOR: #1 — 30+ state vars should be grouped into typed objects (SessionState, BreatheState, etc.)
	// See .soma/plans/soma-boot-refactor.md for details.
	let soma: SomaDir | null = null;
	let settings: SomaSettings | null = null;
	let debug: DebugLogger = createDebugLogger(null); // no-op until boot
	let protocolState: ProtocolState | null = null;
	let builtIdentity: string | null = null;
	let protocolsReferenced = new Set<string>();
	let musclesReferenced = new Set<string>();
	let knownProtocols: Protocol[] = [];
	let knownProtocolNames: string[] = [];
	let knownMuscles: Muscle[] = [];
	let knownMuscleNames: string[] = [];
	let knownAutomations: Automation[] = [];
	let knownAutomationNames: string[] = [];
	let automationsReferenced = new Set<string>();
	let booted = false;
	let frontalCortexCompiled = false;
	let compiledSystemPrompt: string | null = null;

	// Context warning state
	let lastContextWarningPct = 0;
	let wrapUpSent = false;
	let autoFlushSent = false;

	// Track work after preload (edge case: user sends more requests after preload written)
	let toolCallsAfterPreload = 0;

	// Deferred followUp messages — sendUserMessage from before_agent_start races with
	// Pi's prompt processing. We queue messages here and flush them in agent_end.
	let pendingFollowUps: string[] = [];

	// Flush/continue state
	let flushCompleteDetected = false;
	let preloadWrittenThisSession = false;
	let preloadPath: string | null = null;
	let breatheCommandCtx: any = null;
	let breathePending = false;
	let breatheTurnCount = 0;
	let autoBreatheTriggerSent = false;
	let autoBreatheRotateSent = false;
	let currentSessionId = "";

	/** Build preload filename: preload-next-YYYY-MM-DD-XXXXXX.md (6 chars of session ID) */
	function preloadFilename(): string {
		const today = new Date().toISOString().split("T")[0];
		const shortId = currentSessionId ? currentSessionId.slice(-6) : "000000";
		return `preload-next-${today}-${shortId}.md`;
	}

	// Queued boot message for post-rotation delivery (set in session_switch, sent after newSession returns)
	let pendingRotationBoot: string | null = null;

	// ═══════════════════════════════════════════════════════════════════
	// PROTOCOL: discovery — boot context builder (reusable)
	// Builds protocol bodies, muscle bodies, script table, git-context.
	// Called from session_start AND session_switch (after rotation).
	// ═══════════════════════════════════════════════════════════════════

	/** Run discovery steps and return boot context parts for injection. */
	function runBootDiscovery(chain: SomaDir[], opts?: { skipGitContext?: boolean }): string[] {
		if (!soma || !settings) return [];
		const parts: string[] = [];
		const steps = settings.boot.steps;

		for (const step of steps) {
			debug.boot(`step: ${step}`);
			switch (step) {

			case "identity": {
				builtIdentity = buildLayeredIdentity(chain, settings);
				debug.boot(`identity built (${builtIdentity?.length ?? 0} chars)`);
				break;
			}

			case "preload": {
				// Preload injection is handled separately — see session_start and session_switch.
				break;
			}

			case "protocols": {
				const signals = detectProjectSignals(soma.projectDir);
				const protocols = discoverProtocolChain(chain, signals, settings);
				knownProtocols = protocols;
				knownProtocolNames = protocols.map(p => p.name);
				if (protocols.length > 0) {
					protocolState = loadProtocolState(soma);
					const protoThresholds = settings.protocols;

					if (!protocolState) {
						protocolState = bootstrapProtocolState(protocols, protoThresholds);
						saveProtocolState(soma, protocolState);
					} else {
						if (syncProtocolState(protocolState, protocols, protoThresholds)) {
							saveProtocolState(soma, protocolState);
						}
					}

					const injection = buildProtocolInjection(protocols, protocolState, protoThresholds);
					if (injection.hot.length > 0) {
						const hotBlock = injection.hot.map(p => {
							const body = p.content.replace(/^---\n[\s\S]*?\n---\n*/, "").trim();
							return `### Protocol: ${p.name}\n${body}`;
						}).join("\n\n");
						parts.push(`\n---\n## Hot Protocols (full reference)\n\n${hotBlock}`);
					}
				}
				break;
			}

			case "muscles": {
				const muscles = discoverMuscleChain(chain, settings);
				knownMuscles = muscles;
				knownMuscleNames = muscles.map(m => m.name);
				if (muscles.length > 0) {
					const muscleInjection = buildMuscleInjection(muscles, settings.muscles);
					if (muscleInjection.hot.length > 0) {
						const hotBlock = muscleInjection.hot.map(m => {
							const body = m.content.replace(/^---\n[\s\S]*?\n---\n*/, "").trim();
							return `### Muscle: ${m.name}\n${body}`;
						}).join("\n\n");
						parts.push(`\n---\n## Hot Muscles (full reference)\n\n${hotBlock}`);
					}
					const loaded = [...muscleInjection.hot, ...muscleInjection.warm];
					if (loaded.length > 0) trackMuscleLoads(loaded);
				}
				break;
			}

			// REFACTOR: #7 — muscles and automations discovery have identical load/format patterns.
			// Extract shared formatHotBlock() and formatColdList() helpers.
			case "automations": {
				const automations = discoverAutomationChain(chain, settings);
				knownAutomations = automations;
				knownAutomationNames = automations.map(a => a.name);
				if (automations.length > 0) {
					const automationInjection = buildAutomationInjection(automations, settings.automations);
					if (automationInjection.hot.length > 0) {
						const hotBlock = automationInjection.hot.map(a => {
							const body = a.content.replace(/^---\n[\s\S]*?\n---\n*/, "").trim();
							return `### Automation: ${a.name}\n${body}`;
						}).join("\n\n");
						parts.push(`\n---\n## Hot Automations (full reference)\n\n${hotBlock}`);
					}
					if (automationInjection.warm.length > 0) {
						const warmBlock = automationInjection.warm.map(a => {
							const desc = a.description ? ` — ${a.description}` : "";
							return a.digest
								? `- **${a.name}**${desc}\n  ${a.digest}`
								: `- **${a.name}**${desc}`;
						}).join("\n");
						parts.push(`\n**Available automations (digest):** ${warmBlock}`);
					}
					if (automationInjection.cold.length > 0) {
						const coldList = automationInjection.cold.map(a => {
							const desc = a.description ? ` (${a.description})` : "";
							return `${a.name}${desc}`;
						}).join("; ");
						parts.push(`\n**Available automations (not loaded):** ${coldList}`);
					}
				}
				break;
			}

			case "scripts": {
				const scriptDirs: string[] = [resolveSomaPath(soma.path, "scripts", settings)];
				if (settings.inherit.tools && chain.length > 1) {
					for (let i = 1; i < chain.length; i++) {
						scriptDirs.push(resolveSomaPath(chain[i].path, "scripts", settings));
					}
				}

				const seenScripts = new Set<string>();
				const allScripts: { name: string; dir: string }[] = [];
				for (const dir of scriptDirs) {
					if (!existsSync(dir)) continue;
					try {
						const scripts = readdirSync(dir).filter(f => f.endsWith(".sh"));
						for (const s of scripts) {
							if (!seenScripts.has(s)) {
								seenScripts.add(s);
								allScripts.push({ name: s, dir });
							}
						}
					} catch { /* ignore */ }
				}

				if (allScripts.length > 0) {
					const scriptLines = [
						"## Available Scripts\n",
						"| Script | Location | What it does |",
						"|--------|----------|-------------|",
						...allScripts.map(({ name, dir }) => {
							const desc = getScriptDescription(join(dir, name), name);
							return `| \`${name}\` | \`${dir}/\` | ${desc} |`;
						}),
						"",
						"Run with `bash <path>`. Use `--help` for options.",
						"",
					];
					parts.push(`\n---\n${scriptLines.join("\n")}`);
				}
				break;
			}

			case "git-context": {
				if (opts?.skipGitContext) break;
				const gc = settings.boot.gitContext;
				if (!gc.enabled) break;

				if (settings.checkpoints?.diffOnBoot) {
					try {
						const somaGit = join(soma.path, ".git");
						if (existsSync(somaGit)) {
							const maxLines = settings.checkpoints.maxDiffLines ?? 80;
							const somaDiff = execSync(
								`git diff HEAD~1 --stat --no-color 2>/dev/null | head -${maxLines}`,
								{ cwd: soma.path, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
							).trim();

							if (somaDiff) {
								parts.push(
									`\n---\n## .soma Changes (since last checkpoint)\n\n\`\`\`\n${somaDiff}\n\`\`\`\n`
								);
							}
						}
					} catch { /* no .soma git or no previous commit */ }
				}

				try {
					const cwd = soma.projectDir;
					execSync("git rev-parse --is-inside-work-tree", { cwd, stdio: "pipe" });

					const lines: string[] = ["## Recent Changes (git)\n"];

					if (gc.maxCommits > 0) {
						let sinceArg = "";
						if (gc.since === "last-session") {
							const preload = findPreload(soma, settings.preload.staleAfterHours, settings);
							if (preload) {
								const since = new Date(Date.now() - preload.ageHours * 3600000);
								sinceArg = `--since="${since.toISOString()}"`;
							} else {
								sinceArg = '--since="24 hours ago"';
							}
						} else if (/^\d+h$/.test(gc.since)) {
							sinceArg = `--since="${parseInt(gc.since)} hours ago"`;
						} else if (/^\d+d$/.test(gc.since)) {
							sinceArg = `--since="${parseInt(gc.since)} days ago"`;
						} else {
							sinceArg = `--since="${gc.since}"`;
						}

						const log = execSync(
							`git log --oneline ${sinceArg} -${gc.maxCommits} 2>/dev/null`,
							{ cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
						).trim();

						if (log) {
							lines.push("### Commits\n");
							lines.push("```");
							lines.push(log);
							lines.push("```\n");
						}
					}

					if (gc.diffMode !== "none" && gc.maxDiffLines > 0) {
						const diffCmd = gc.diffMode === "full"
							? `git diff HEAD~5 --no-color 2>/dev/null | head -${gc.maxDiffLines}`
							: `git diff HEAD~5 --stat --no-color 2>/dev/null | head -${gc.maxDiffLines}`;

						const diff = execSync(diffCmd, {
							cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"]
						}).trim();

						if (diff) {
							lines.push("### Changed Files\n");
							lines.push("```");
							lines.push(diff);
							lines.push("```\n");
						}
					}

					if (lines.length > 1) {
						parts.push(`\n---\n${lines.join("\n")}`);
					}
				} catch { /* not a git repo */ }
				break;
			}

			default:
				break;
			}
		}

		return parts;
	}

	// ═══════════════════════════════════════════════════════════════════
	// PROTOCOL: discovery — session boot (first process start)
	// Also: breath-cycle (preload auto-injection), session-checkpoints (git context)
	// ═══════════════════════════════════════════════════════════════════

	pi.on("session_start", async (_event, ctx) => {
		// Capture session ID for preload metadata
		try {
			const sessionFile = ctx.sessionManager.getSessionFile?.() || "";
			currentSessionId = sessionFile ? sessionFile.split("/").pop()?.replace(/\.[^.]+$/, "") || "" : "";
		} catch { currentSessionId = ""; }

		soma = findSomaDir();

		if (!soma) {
			// Auto-init: create .soma/ without prompting.
			const detection = detectProjectContext(process.cwd());
			const somaPath = initSoma(process.cwd());
			soma = findSomaDir();
			ctx.ui.notify(`🌱 Soma planted at ${somaPath}`, "info");

			const contextNotes: string[] = [];
			if (detection.parent) {
				contextNotes.push(`Parent workspace detected at \`${detection.parent.path}\` (${detection.parent.distance} level${detection.parent.distance > 1 ? "s" : ""} up).`);
			}
			if (detection.claudeMd) {
				contextNotes.push(`CLAUDE.md found at \`${detection.claudeMd.path}\` (${detection.claudeMd.ageDays}d old). Review it as one input for understanding this project.`);
			}
			if (detection.agentsMd) {
				contextNotes.push(`AGENTS.md found at \`${detection.agentsMd.path}\` (${detection.agentsMd.ageDays}d old).`);
			}
			if (detection.signals.length > 0) {
				contextNotes.push(`Detected stack: ${detection.signals.join(", ")}.`);
			}
			if (detection.packageManager) {
				contextNotes.push(`Package manager: ${detection.packageManager}.`);
			}

			const contextBlock = contextNotes.length > 0
				? `\n**Context detected:**\n${contextNotes.map(n => `- ${n}`).join("\n")}\n`
				: "";

			if (ctx.hasUI) {
				pi.sendUserMessage(
					`[Soma Boot — First Run]\n\n` +
					`Created memory at \`${somaPath}\`.\n` +
					contextBlock +
					`\nA starter identity file is at \`${somaPath}/identity.md\` (pre-filled with detected context).\n` +
					`Review it, examine the project structure, and rewrite it to reflect who you are in this context. ` +
					`Keep it specific and under 30 lines.`,
					{ deliverAs: "followUp" }
				);
			}
		}

		// Initialize settings + debug
		const chain = getSomaChain();
		settings = loadSettings(chain);
		debug = createDebugLogger(soma?.path ?? null, settings.debug);
		if (debug.enabled) {
			debug.boot(`session start — soma: ${soma?.path}, cwd: ${process.cwd()}`);
			debug.boot(`settings loaded from chain: [${chain.map(c => c.path).join(", ")}]`);
			debug.boot(`session id: ${currentSessionId}`);
		}

		const isResumed = ctx.sessionManager.getEntries().some(
			(e: any) => e.type === "message"
		);

		// Run all boot discovery steps
		const parts = runBootDiscovery(chain);

		// Auto-inject preload on fresh boot (not resumed sessions — those have full history)
		if (!isResumed && soma) {
			const preload = findPreload(soma, settings.preload.staleAfterHours, settings);
			if (preload && !preload.stale) {
				const staleTag = preload.stale ? " ⚠️stale" : "";
				parts.unshift(
					`\n---\n## Preload (from last session${staleTag})\n\n${preload.content}\n`
				);
				debug.boot(`preload auto-injected: ${preload.name} (${Math.floor(preload.ageHours)}h old)`);
			}
		}

		if (parts.length > 0) {
			booted = true;
			pi.appendEntry("soma-boot", { timestamp: Date.now(), resumed: isResumed });

			const sessionTag = currentSessionId ? `\nSession ID: \`${currentSessionId}\`` : "";
		const greetStyle = isResumed
				? `You've resumed a Soma session. Your preload and hot protocols are above. Identity and behavioral rules are in your system prompt. If the preload has an "Orient From" section, read those files before doing anything else. Then greet the user briefly and await instructions.${sessionTag}`
				: `You've booted into a fresh Soma session. Identity and behavioral rules are in your system prompt. Hot protocols are above if any. Greet the user briefly and await instructions.${sessionTag}`;

			if (ctx.hasUI) {
				pi.sendUserMessage(
					`[Soma Boot${isResumed ? " — resumed" : ""}]\n\n${parts.join("\n")}\n\n${greetStyle}`,
					{ deliverAs: "followUp" }
				);
			}
		}
	});

	// ═══════════════════════════════════════════════════════════════════
	// PROTOCOL: breath-cycle — context warnings + auto-flush
	// 50%: UI notify | 70%: UI notify | 80%: system prompt warn | 85%: auto-flush
	// ═══════════════════════════════════════════════════════════════════

	// REFACTOR: #2 — this handler does prompt compilation + context warnings + auto-breathe.
	// 200+ lines. Extract: compileSessionPrompt(), evaluateContextPressure(), handleAutoBreathe().
	pi.on("before_agent_start", async (event, ctx) => {
		if (!soma || !booted) return;

		// ═══════════════════════════════════════════════════════════════════
		// PROTOCOL: frontal-cortex — compiled system prompt
		// Phase 3: Full replacement when Pi's default detected.
		// Falls back to prepend when custom SYSTEM.md is in use.
		// Compiled once per session, cached thereafter.
		// ═══════════════════════════════════════════════════════════════════

		// Use cached compiled prompt on turn 2+, or compile fresh on turn 1.
		// Pi resets system prompt to base each turn, so we MUST return the compiled
		// prompt every time — not just the first turn.
		let systemPrompt = compiledSystemPrompt ?? event.systemPrompt;

		if (!frontalCortexCompiled && settings) {
			const activeTools = pi.getActiveTools?.() ?? [];
			const allTools = pi.getAllTools?.() ?? [];

			if (activeTools.length > 0) {
				// Phase 3: full replacement (or fallback to prepend for custom prompts)
				const compiled = compileFullSystemPrompt({
					protocols: knownProtocols,
					protocolState: protocolState,
					muscles: knownMuscles,
					settings,
					piSystemPrompt: event.systemPrompt,
					activeTools,
					allTools,
					agentDir: somaAgentDir,
					identity: builtIdentity,
				});
				systemPrompt = compiled.block;
				compiledSystemPrompt = systemPrompt;
				frontalCortexCompiled = true;
				debug.systemPrompt(systemPrompt);
				debug.boot(`system prompt compiled (${systemPrompt.length} chars, ${knownProtocols.length} protocols, ${knownMuscles.length} muscles)`);
			} else {
				// Fallback: Phase 0 prepend (tools not yet available)
				const compiled = compileFrontalCortex({
					protocols: knownProtocols,
					protocolState: protocolState,
					muscles: knownMuscles,
					settings,
				});
				if (compiled.block) {
					systemPrompt = compiled.block + "\n\n---\n\n" + event.systemPrompt;
					compiledSystemPrompt = systemPrompt;
					frontalCortexCompiled = true;
				}
			}
		}

		const usage = ctx.getContextUsage?.();
		const pct = usage?.percent ?? 0;

		const thresholds = settings?.context ?? { notifyAt: 50, warnAt: 70, urgentAt: 80, autoExhaleAt: 85 };
		const breatheSettings = settings?.breathe ?? { auto: false, triggerAt: 50, rotateAt: 70 };
		const additions: string[] = [];
		const memDir = soma ? resolveSomaPath(soma.path, "preloads", settings) : null;
		const preloadTarget = memDir ? join(memDir, preloadFilename()) : null;

		// Helper: initiate breathe rotation (shared by auto-breathe and auto-flush safety net)
		// NOTE: This runs inside before_agent_start. Calling pi.sendUserMessage here races
		// with Pi's prompt processing (the agent is about to start). Instead, we queue the
		// message and flush it in agent_end, when it's safe to send followUps.
		const initiateBreathe = (label: string, message: string) => {
			if (breathePending) return; // already in progress
			// Save heat state
			const decay = settings?.protocols.decayRate ?? 1;
			if (protocolState) { applyDecay(protocolState, protocolsReferenced, decay, knownProtocols); saveProtocolState(soma!, protocolState); }
			decayMuscleHeat(soma!, musclesReferenced, decay, settings);
			decayAutomationHeat(soma!, automationsReferenced, decay, settings);
			const commitResult = autoCommitSomaState(label);
			if (commitResult) ctx.ui.notify(`✅ ${commitResult}`, "info");
			breathePending = true;
			breatheTurnCount = 0;
			breatheCommandCtx = ctx;
			// Queue for delivery after agent finishes this turn
			pendingFollowUps.push(message);
		};

		// ── AUTO-BREATHE MODE (proactive) ──────────────────────────────
		// When enabled, the agent wraps up gracefully instead of panicking at 85%.
		// triggerAt (default 50%): finish current task, start wrap-up
		// rotateAt (default 70%): write preload and rotate
		// 85% safety net still exists but should never be reached.

		if (breatheSettings.auto && soma) {

			// Phase 2: ROTATE — write preload and go
			if (pct >= breatheSettings.rotateAt && !autoBreatheRotateSent) {
				autoBreatheRotateSent = true;

				additions.push(
					`\n## 🫁 Auto-Breathe: Rotate (${Math.round(pct)}%)\n` +
					`Wrap up and write preload. Session will auto-rotate.`
				);

				if (preloadWrittenThisSession && preloadPath) {
					initiateBreathe("auto-breathe-rotate",
						`[AUTO-BREATHE — time to rotate (${Math.round(pct)}%)]\n\n` +
						`Preload already at \`${preloadPath}\`. Update it if needed, then say "BREATHE COMPLETE".`
					);
				} else {
					initiateBreathe("auto-breathe-rotate",
						`[AUTO-BREATHE — time to rotate (${Math.round(pct)}%)]\n\n` +
						`Wrap up what you're doing and prepare for rotation.\n\n` +
						`1. Commit uncommitted work\n` +
						`2. Update session log\n` +
						`3. Write \`${preloadTarget}\` — Resume Point, What Shipped, Next Priorities, Orient From\n` +
						`4. Say "BREATHE COMPLETE"\n\n` +
						`Session auto-rotates with your preload injected.`
					);
				}

				ctx.ui.notify(`🫁 Auto-breathe: rotating at ${Math.round(pct)}%`, "info");
				lastContextWarningPct = pct;

			// Phase 1: TRIGGER — finish current task, start wrapping up
			} else if (pct >= breatheSettings.triggerAt && !autoBreatheTriggerSent) {
				autoBreatheTriggerSent = true;

				// Signal for extensions (e.g. soma-steno) — ghost if no listener
				pi.events.emit("soma:recall", { reason: "auto-breathe-trigger", pct });

				// Phase 1 is a gentle nudge — NOT a shutdown order.
				// The agent should keep working. Just be aware context is accumulating.
				const preloadHint = preloadTarget ? `\n- Preload target: \`${preloadTarget}\`` : "";
				additions.push(
					`\n## 🫁 Auto-Breathe: Notice (${Math.round(pct)}%)\n` +
					`Context is at ${Math.round(pct)}%. Keep working — just be aware. ` +
					`Consider updating session logs as you go. Rotation at ~${breatheSettings.rotateAt}%.${preloadHint}`
				);

				// Soft notice — agent keeps working, just knows rotation is ahead
				pendingFollowUps.push(
					`[AUTO-BREATHE — ${Math.round(pct)}% context]\n\n` +
					`Just a heads up — context is at ${Math.round(pct)}%. No need to stop. ` +
					`Keep working on your current task. As you finish things, consider:\n` +
					`- Committing completed work\n` +
					`- Updating session log with what you've done so far${preloadHint}\n\n` +
					`Rotation happens at ~${breatheSettings.rotateAt}% — you've got room.`
				);

				ctx.ui.notify(`🫁 Context ${Math.round(pct)}% — rotation at ~${breatheSettings.rotateAt}%`, "info");
				lastContextWarningPct = pct;
			}
		}

		// ── SAFETY NET (85%) ───────────────────────────────────────────
		// Always active — catches sessions that didn't rotate via auto-breathe or /breathe.
		// With auto-breathe enabled, this should rarely fire.

		if (pct >= thresholds.autoExhaleAt && !autoFlushSent) {
			autoFlushSent = true;

			additions.push(
				`\n## ⚠️ CONTEXT CRITICAL (${Math.round(pct)}%)\n` +
				`Context nearly full. Stop new work. Flush NOW.`
			);

			if (breathePending) {
				// Already rotating — just hurry up
				ctx.ui.notify(`🔴 Context at ${Math.round(pct)}% — breathe in progress, hurry up`, "error");
			} else {
				// Emergency: no breathe was triggered — initiate now with minimal instructions
				initiateBreathe("auto-breathe-emergency",
					`[EMERGENCY AUTO-BREATHE — context at ${Math.round(pct)}%]\n\n` +
					`Context is critical. Stop ALL work. Write a preload NOW.\n\n` +
					`1. Commit any uncommitted work.\n` +
					`2. Write \`${preloadTarget}\` — MINIMAL format:\n` +
					`   - **Resume Point** (2 sentences)\n` +
					`   - **What Shipped** (bullet list)\n` +
					`   - **In-Flight** (what's unfinished, where you stopped)\n` +
					`   - **Next Priorities**\n` +
					`3. Say "BREATHE COMPLETE" — session auto-rotates.\n\n` +
					`No session log — no time. Preload only.`
				);
				ctx.ui.notify(`🔴 Context at ${Math.round(pct)}% — EMERGENCY AUTO-BREATHE`, "error");
			}
			lastContextWarningPct = pct;

		// ── PASSIVE WARNINGS (when auto-breathe is off) ────────────────
		} else if (!breatheSettings.auto) {
			// Signal steno at notifyAt even when auto-breathe is off
			if (pct >= thresholds.notifyAt && lastContextWarningPct < thresholds.notifyAt) {
				pi.events.emit("soma:recall", { reason: "context-notify", pct });
			}
			if (pct >= thresholds.urgentAt && lastContextWarningPct < thresholds.urgentAt) {
				const preloadNote = preloadTarget ? ` Write preload to \`${preloadTarget}\`.` : "";
				additions.push(
					`\n## ⚠️ Context High (${Math.round(pct)}%)\n` +
					`Wrap up current task.${preloadNote} Use /breathe to rotate or /exhale to end.`
				);
				ctx.ui.notify(`⚠️ Context ${Math.round(pct)}% — use /breathe or /exhale`, "warning");
				lastContextWarningPct = pct;
			} else if (pct >= thresholds.warnAt && lastContextWarningPct < thresholds.warnAt) {
				ctx.ui.notify(`Context ${Math.round(pct)}% — consider /breathe soon`, "info");
				lastContextWarningPct = pct;
			} else if (pct >= thresholds.notifyAt && lastContextWarningPct < thresholds.notifyAt) {
				ctx.ui.notify(`Context: ${Math.round(pct)}%`, "info");
				lastContextWarningPct = pct;
			}
		}

		if (additions.length > 0) {
			return { systemPrompt: systemPrompt + "\n" + additions.join("\n") };
		}

		// Always return compiled prompt — Pi resets to base each turn
		return { systemPrompt };
	});

	// ═══════════════════════════════════════════════════════════════════
	// PROTOCOL: breath-cycle — FLUSH COMPLETE detection
	// ═══════════════════════════════════════════════════════════════════

	pi.on("message_end", async (event) => {
		if (event.message.role !== "assistant") return;
		const content = event.message.content;
		const hasFlush = (text: string) => text.includes("FLUSH COMPLETE") || text.includes("BREATHE COMPLETE");
		if (typeof content === "string") {
			if (hasFlush(content)) flushCompleteDetected = true;
		} else if (Array.isArray(content)) {
			if (content.some((block: any) => block.type === "text" && hasFlush(block.text || ""))) {
				flushCompleteDetected = true;
			}
		}
	});

	// ═══════════════════════════════════════════════════════════════════
	// PROTOCOL: breath-cycle — preload watcher + post-preload work detection
	// ═══════════════════════════════════════════════════════════════════

	pi.on("tool_result", async (event, ctx) => {
		if (event.toolName !== "write" || event.isError) return;
		const writePath = (event.input as any)?.path as string;
		if (!writePath) return;
		const filename = writePath.split("/").pop() || "";

		if (filename.startsWith("preload-") && filename.endsWith(".md")) {
			preloadWrittenThisSession = true;
			preloadPath = writePath;
			toolCallsAfterPreload = 0; // Reset counter

			// --- Preload validation (Phase 4) ---
			const content = (event.input as any)?.content as string || "";
			const REQUIRED_SECTIONS = ["What Shipped", "Next Session Priorities"];
			const RECOMMENDED_SECTIONS = ["Key Decisions", "Orient From", "Do NOT Re-Read"];
			const missing = REQUIRED_SECTIONS.filter(s => !content.includes(`## ${s}`));
			const recommended = RECOMMENDED_SECTIONS.filter(s => !content.includes(`## ${s}`));
			const lineCount = content.split("\n").length;

			if (missing.length > 0) {
				ctx.ui.notify(
					`⚠️ Preload missing required sections: ${missing.join(", ")}`,
					"warning"
				);
			} else if (lineCount < 20) {
				ctx.ui.notify(
					`⚠️ Preload is thin (${lineCount} lines) — consider adding more detail`,
					"warning"
				);
			} else {
				const recNote = recommended.length > 0
					? ` (consider adding: ${recommended.join(", ")})`
					: "";
				ctx.ui.notify(`✅ Preload written: ${filename} (${lineCount} lines)${recNote}`, "info");
			}
		}

		// Track work after preload write
		if (preloadWrittenThisSession && event.toolName !== "read") {
			toolCallsAfterPreload++;
		}
	});

	// ═══════════════════════════════════════════════════════════════════
	// PROTOCOL: breath-cycle — agent_end (auto-continue offer, post-preload warning)
	// ═══════════════════════════════════════════════════════════════════

	pi.on("agent_end", async (_event, ctx) => {
		// Flush deferred followUp messages (queued from before_agent_start to avoid race condition)
		if (pendingFollowUps.length > 0) {
			const messages = [...pendingFollowUps];
			pendingFollowUps = [];
			for (const msg of messages) {
				try {
					pi.sendUserMessage(msg, { deliverAs: "followUp" });
				} catch (err: any) {
					debug.boot(`deferred followUp failed: ${err?.message?.slice(0, 100)}`);
				}
			}
		}

		// If breathe/auto-breathe is pending but didn't complete, give the user a way forward
		if (breathePending && !flushCompleteDetected) {
			if (preloadWrittenThisSession) {
				ctx.ui.notify(
					"⚠️ Preload written but rotation didn't complete. Say BREATHE COMPLETE to rotate, or /breathe to retry.",
					"warning"
				);
			} else {
				ctx.ui.notify(
					"⚠️ Session ended without preload. Use /exhale or /breathe next session.",
					"warning"
				);
			}
		} else if (flushCompleteDetected && preloadWrittenThisSession && !breathePending) {
			// Flush complete but no breathe — manual exhale flow. Preload auto-loads on next boot.
			ctx.ui.notify(
				"🟢 Preload saved. Next session will auto-load it, or use /inhale to load now.",
				"info"
			);
		}

		// Warn if significant work happened after preload was written
		if (preloadWrittenThisSession && toolCallsAfterPreload > 5 && !flushCompleteDetected) {
			ctx.ui.notify(
				`⚠️ ${toolCallsAfterPreload} tool calls since preload was written — consider updating it before session ends`,
				"warning"
			);
		}
	});

	// ═══════════════════════════════════════════════════════════════════
	// PROTOCOL: breath-cycle — /breathe auto-rotate (turn_end watcher)
	// ═══════════════════════════════════════════════════════════════════

	pi.on("turn_end", async (_event, ctx) => {
		if (!breathePending) return;
		breatheTurnCount++;

		// Happy path: preload written + completion signal → rotate
		if (preloadWrittenThisSession && flushCompleteDetected && breathePending) {
			breathePending = false;
			breatheTurnCount = 0;
			breatheCommandCtx = null;
			ctx.ui.notify("🫁 Preload saved — rotating to fresh session...", "info");
			// Use turn_end ctx for newSession — before_agent_start ctx may not have it
			const rotateCtx = ctx;
			setTimeout(async () => {
				try {
					pendingRotationBoot = null; // reset before newSession
					const result = await rotateCtx.newSession({});
					if (!result.cancelled) {
						// session_switch handler queued a boot message with preload included.
						// Send it now that newSession() has returned and agent is idle.
						if (pendingRotationBoot) {
							pi.sendUserMessage(pendingRotationBoot, { deliverAs: "followUp" });
							pendingRotationBoot = null;
							rotateCtx.ui.notify("✅ Rotated — boot context + preload injected", "info");
						} else {
							// Fallback: no boot message queued — inject preload directly
							const preload = findPreload(soma!);
							if (preload) {
								pi.sendUserMessage(preload.content, { deliverAs: "followUp" });
								rotateCtx.ui.notify("✅ Rotated — preload injected", "info");
							}
						}
					}
				} catch (err: any) {
					rotateCtx.ui.notify(`❌ Rotation failed: ${err.message}`, "error");
				}
			}, 1500);
			return;
		}

		// Preload written but agent forgot the magic words → nudge
		if (preloadWrittenThisSession && !flushCompleteDetected && breatheTurnCount >= 2) {
			pi.sendUserMessage(
				`[Soma] Preload written — say "BREATHE COMPLETE" to trigger rotation.`,
				{ deliverAs: "followUp" }
			);
			return;
		}

		// Timeout: 4+ turns with no preload written → cancel breathe, notify
		if (breatheTurnCount >= 4 && !preloadWrittenThisSession) {
			breathePending = false;
			breatheTurnCount = 0;
			breatheCommandCtx = null;
			ctx.ui.notify(
				"⚠️ Breathe timed out — no preload written after 4 turns. Use /breathe to retry or /exhale to end.",
				"warning"
			);
		}
	});

	// ═══════════════════════════════════════════════════════════════════
	// PROTOCOL: breath-cycle + heat-tracking — session lifecycle resets + decay
	// ═══════════════════════════════════════════════════════════════════

	pi.on("session_switch", async (event, ctx) => {
		if (event.reason === "new") {
			// Reset all session state
			lastContextWarningPct = 0;
			wrapUpSent = false;
			autoFlushSent = false;
			flushCompleteDetected = false;
			preloadWrittenThisSession = false;
			breathePending = false;
			breatheTurnCount = 0;
			autoBreatheTriggerSent = false;
			autoBreatheRotateSent = false;
			toolCallsAfterPreload = 0;
			pendingFollowUps = [];
			// REFACTOR: #1 — these 15+ resets should be `sessionState = createFreshState()`
			protocolsReferenced = new Set();
			musclesReferenced = new Set();
			automationsReferenced = new Set();
			frontalCortexCompiled = false;
			compiledSystemPrompt = null;

			// Re-run full boot discovery (protocols, muscles, scripts — NOT git-context to save tokens)
			// Also inject preload inline so everything arrives in ONE message.
			if (soma) {
				const chain = getSomaChain();
				settings = loadSettings(chain);
				const parts = runBootDiscovery(chain, { skipGitContext: true });

				// Inject preload into the boot message (not separately — avoids race with newSession)
				const preload = findPreload(soma, settings.preload?.staleAfterHours, settings);
				if (preload && !preload.stale) {
					parts.unshift(
						`\n---\n## Preload (from last session)\n\n${preload.content}\n`
					);
				}

				// Queue boot message for delivery AFTER newSession() completes.
				// We can't call sendUserMessage here — we're inside newSession()'s
				// session_switch emit, and prompt() during newSession() causes issues.
				// Instead, queue it and let the turn_end handler (or next prompt cycle) pick it up.
				if (parts.length > 0 && ctx.hasUI) {
					pendingRotationBoot = 
						`[Soma Boot — rotated session]\n\n${parts.join("\n")}\n\n` +
						`You've rotated into a fresh session. Identity and behavioral rules are in your system prompt. ` +
						`Hot protocols and muscles are above. ` +
						(preload ? `Your preload from the previous session is included above — read it, orient from its targets, then greet the user briefly and await instructions.` :
						`Greet the user briefly and await instructions.`);
				}
			}
		}
	});

	pi.on("session_shutdown", async () => {
		if (!soma) return;
		const decay = settings?.protocols.decayRate ?? 1;
		if (protocolState) {
			applyDecay(protocolState, protocolsReferenced, decay, knownProtocols);
			saveProtocolState(soma, protocolState);
		}
		decayMuscleHeat(soma, musclesReferenced, decay, settings);
		// REFACTOR: #8 — this 3-line heat decay pattern is called in 4+ places. Extract saveHeatState().
		decayAutomationHeat(soma, automationsReferenced, decay, settings);
	});

	// ═══════════════════════════════════════════════════════════════════
	// PROTOCOL: heat-tracking — HEAT_RULES auto-detect from tool results
	// ═══════════════════════════════════════════════════════════════════

	const HEAT_RULES: Array<{
		match: (toolName: string, input: any, output: string) => boolean;
		target: string;
		type: "protocol" | "muscle";
	}> = [
		{
			match: (tool, input) =>
				tool === "write" && typeof input?.content === "string" && input.content.startsWith("---\n"),
			target: "frontmatter-standard",
			type: "protocol",
		},
		{
			match: (tool, input) =>
				tool === "bash" && typeof input?.command === "string" && /git (config|commit|push|remote)/.test(input.command),
			target: "git-identity",
			type: "protocol",
		},
		{
			match: (tool, input) =>
				tool === "write" && typeof input?.path === "string" && /preload|continuation/.test(input.path),
			target: "breath-cycle",
			type: "protocol",
		},
		{
			match: (tool, input) =>
				tool === "write" && typeof input?.path === "string" && input.path.endsWith(".svg"),
			target: "svg-logo-design",
			type: "muscle",
		},
		{
			match: (tool, input) =>
				tool === "bash" && typeof input?.command === "string" &&
				/checkpoint:|\.soma.*git (add|commit)/.test(input.command),
			target: "session-checkpoints",
			type: "protocol",
		},
	];

	pi.on("tool_result", async (event) => {
		if (!soma || !protocolState || !settings?.heat.autoDetect) return;

		const toolName = event.toolName;
		const input = event.input as any;
		const output = typeof event.output === "string" ? event.output : "";
		const bump = settings.heat.autoDetectBump;

		for (const rule of HEAT_RULES) {
			if (!rule.match(toolName, input, output)) continue;

			if (rule.type === "protocol" && knownProtocolNames.includes(rule.target)) {
				if (!protocolsReferenced.has(rule.target)) {
					protocolsReferenced.add(rule.target);
					recordHeatEvent(protocolState, rule.target, "applied");
					debug.heat(`protocol detected: ${rule.target} (auto-detect from tool_result)`);
				}
			} else if (rule.type === "muscle" && knownMuscleNames.includes(rule.target)) {
				if (!musclesReferenced.has(rule.target)) {
					musclesReferenced.add(rule.target);
					bumpMuscleHeat(soma, rule.target, bump, settings);
					debug.heat(`muscle detected: ${rule.target} +${bump} (auto-detect from tool_result)`);
				}
			}
		}
	});

	// ═══════════════════════════════════════════════════════════════════
	// COMMANDS — organized by protocol
	// ═══════════════════════════════════════════════════════════════════

	// --- heat-tracking: /pin, /kill ---

	/** Invalidate compiled system prompt so it recompiles on next turn with updated heat */
	function invalidateCompiledPrompt() {
		frontalCortexCompiled = false;
		compiledSystemPrompt = null;
	}

	// /pin — bump heat to hot
	pi.registerCommand("pin", {
		description: "Pin a protocol or muscle to hot — keeps it loaded across sessions",
		handler: async (args, ctx) => {
			const name = args.trim();
			if (!name) { ctx.ui.notify("Usage: /pin <protocol-or-muscle-name>", "info"); return; }
			if (!soma || !protocolState) { ctx.ui.notify("No soma booted", "error"); return; }

			if (knownProtocolNames.includes(name)) {
				recordHeatEvent(protocolState, name, "pinned");
				saveProtocolState(soma, protocolState);
				protocolsReferenced.add(name);
				invalidateCompiledPrompt();
				ctx.ui.notify(`📌 ${name} pinned (heat locked hot) — prompt will recompile`, "info");
			} else if (knownMuscleNames.includes(name)) {
				bumpMuscleHeat(soma, name, settings?.heat.pinBump ?? 5, settings);
				musclesReferenced.add(name);
				invalidateCompiledPrompt();
				ctx.ui.notify(`📌 ${name} pinned (heat bumped to hot) — prompt will recompile`, "info");
			} else if (knownAutomationNames.includes(name)) {
				bumpAutomationHeat(soma, name, settings?.heat.pinBump ?? 5, settings);
				automationsReferenced.add(name);
				invalidateCompiledPrompt();
				ctx.ui.notify(`📌 ${name} automation pinned (heat bumped to hot) — prompt will recompile`, "info");
			} else {
				ctx.ui.notify(`Unknown protocol, muscle, or automation: ${name}`, "error");
			}
		},
	});

	// /kill — drop heat to zero
	pi.registerCommand("kill", {
		description: "Kill a protocol, muscle, or automation — drops heat to zero",
		handler: async (args, ctx) => {
			const name = args.trim();
			if (!name) { ctx.ui.notify("Usage: /kill <name>", "info"); return; }
			if (!soma || !protocolState) { ctx.ui.notify("No soma booted", "error"); return; }

			if (knownProtocolNames.includes(name)) {
				recordHeatEvent(protocolState, name, "killed");
				saveProtocolState(soma, protocolState);
				invalidateCompiledPrompt();
				ctx.ui.notify(`💀 ${name} killed (heat → 0) — prompt will recompile`, "info");
			} else if (knownMuscleNames.includes(name)) {
				bumpMuscleHeat(soma, name, -15, settings);
				invalidateCompiledPrompt();
				ctx.ui.notify(`💀 ${name} killed (heat → 0) — prompt will recompile`, "info");
			} else if (knownAutomationNames.includes(name)) {
				bumpAutomationHeat(soma, name, -15, settings);
				invalidateCompiledPrompt();
				ctx.ui.notify(`💀 ${name} automation killed (heat → 0) — prompt will recompile`, "info");
			} else {
				ctx.ui.notify(`Unknown protocol, muscle, or automation: ${name}`, "error");
			}
		},
	});

	// --- session toggles: /auto-commit ---
	// REFACTOR: #4 — /auto-commit and /auto-breathe are structurally identical.
	// Extract registerToggleCommand(pi, { name, settingsPath, onLabel, offLabel }).

	pi.registerCommand("auto-commit", {
		description: "Toggle auto-commit of .soma/ state on exhale/breathe",
		getArgumentCompletions: (prefix) =>
			["on", "off", "status"].filter(o => o.startsWith(prefix)).map(o => ({ value: o, label: o })),
		handler: async (args, ctx) => {
			if (!soma || !settings) { ctx.ui.notify("No soma booted", "error"); return; }

			const arg = args.trim().toLowerCase();

			if (arg === "status" || !arg) {
				const current = settings.checkpoints?.soma?.autoCommit ?? true;
				const projectAuto = settings.checkpoints?.project?.autoCheckpoint ?? false;
				ctx.ui.notify(
					`Auto-commit status:\n` +
					`  .soma/ state: ${current ? "✅ on" : "❌ off"}\n` +
					`  project code: ${projectAuto ? "✅ on" : "❌ off"}\n\n` +
					`Toggle: /auto-commit on | /auto-commit off\n` +
					`Persists in settings.json via checkpoints.soma.autoCommit`,
					"info"
				);
				return;
			}

			if (arg === "on" || arg === "off") {
				const value = arg === "on";
				// Update in-memory settings
				if (!settings.checkpoints) (settings as any).checkpoints = {};
				if (!settings.checkpoints.soma) (settings as any).checkpoints.soma = {};
				settings.checkpoints.soma.autoCommit = value;

				// Persist to settings.json
				try {
					const settingsPath = join(soma.path, "settings.json");
					const raw = existsSync(settingsPath) ? JSON.parse(readFileSync(settingsPath, "utf-8")) : {};
					if (!raw.checkpoints) raw.checkpoints = {};
					if (!raw.checkpoints.soma) raw.checkpoints.soma = {};
					raw.checkpoints.soma.autoCommit = value;
					writeFileSync(settingsPath, JSON.stringify(raw, null, 2) + "\n");
					ctx.ui.notify(`${value ? "✅" : "❌"} Auto-commit .soma/ state: ${arg}`, "info");
				} catch (err: any) {
					ctx.ui.notify(`⚠️ Updated in-memory but failed to persist: ${err?.message?.slice(0, 80)}`, "warning");
				}
				return;
			}

			ctx.ui.notify("Usage: /auto-commit on | off | status", "info");
		},
	});

	// --- session toggles: /auto-breathe ---

	pi.registerCommand("auto-breathe", {
		description: "Toggle auto-breathe — proactive context management that rotates before 85%",
		getArgumentCompletions: (prefix) =>
			["on", "off", "status"].filter(o => o.startsWith(prefix)).map(o => ({ value: o, label: o })),
		handler: async (args, ctx) => {
			if (!soma || !settings) { ctx.ui.notify("No soma booted", "error"); return; }

			const breatheSettings = (settings as any).breathe ?? { auto: false, triggerAt: 50, rotateAt: 70 };
			const arg = args.trim().toLowerCase();

			if (arg === "status" || !arg) {
				ctx.ui.notify(
					`Auto-breathe: ${breatheSettings.auto ? "✅ on" : "❌ off"}\n` +
					`  Wrap-up at: ${breatheSettings.triggerAt}%\n` +
					`  Rotate at: ${breatheSettings.rotateAt}%\n` +
					`  Safety net: 85% (always on)\n\n` +
					`Toggle: /auto-breathe on | /auto-breathe off\n` +
					`Persists in settings.json via breathe.auto`,
					"info"
				);
				return;
			}

			if (arg === "on" || arg === "off") {
				const value = arg === "on";
				// Update in-memory settings
				if (!(settings as any).breathe) (settings as any).breathe = {};
				(settings as any).breathe.auto = value;

				// Persist to settings.json
				try {
					const settingsPath = join(soma.path, "settings.json");
					const raw = existsSync(settingsPath) ? JSON.parse(readFileSync(settingsPath, "utf-8")) : {};
					if (!raw.breathe) raw.breathe = {};
					raw.breathe.auto = value;
					writeFileSync(settingsPath, JSON.stringify(raw, null, 2) + "\n");
					ctx.ui.notify(`${value ? "🫁 Auto-breathe ON" : "❌ Auto-breathe OFF"} — ${value ? `wrap-up at ${breatheSettings.triggerAt}%, rotate at ${breatheSettings.rotateAt}%` : "using passive warnings only"}`, "info");
				} catch (err: any) {
					ctx.ui.notify(`⚠️ Updated in-memory but failed to persist: ${err?.message?.slice(0, 80)}`, "warning");
				}
				return;
			}

			ctx.ui.notify("Usage: /auto-breathe on | off | status", "info");
		},
	});

	// --- breath-cycle: /exhale, /rest, /breathe, /auto-continue, /inhale ---

	// --- Auto-commit .soma/ internal state (heat, protocol-state, etc.) ---
	function autoCommitSomaState(label: string): string | null {
		const checkpointSettings = settings?.checkpoints;
		const somaAutoCommit = checkpointSettings?.soma?.autoCommit ?? true;
		if (!somaAutoCommit || !soma) return null;

		const checkpointPrefix = checkpointSettings?.project?.prefix ?? "checkpoint:";
		const timestamp = new Date().toISOString().replace(/\.\d+Z$/, "Z");

		try {
			const somaGit = join(soma.path, ".git");
			if (!existsSync(somaGit)) return null;

			// Stage and commit internal state changes (heat, protocol-state, etc.)
			execSync(`git add -A`, { cwd: soma.path, stdio: "pipe" });
			const status = execSync(`git status --porcelain`, { cwd: soma.path, encoding: "utf-8", stdio: "pipe" }).trim();
			if (!status) return null; // nothing to commit

			execSync(
				`git commit -m "${checkpointPrefix} ${label} ${timestamp}"`,
				{ cwd: soma.path, stdio: "pipe" }
			);
			return `Committed .soma/ state: ${checkpointPrefix} ${label}`;
		} catch {
			return null; // git failed — not fatal
		}
	}

	// --- Shared preload template for /exhale and /breathe ---
	function buildPreloadInstructions(target: string, logPath: string, today: string): { template: string; steps: string[] } {
		const checkpointSettings = settings?.checkpoints;
		const projectAutoCheckpoint = checkpointSettings?.project?.autoCheckpoint ?? false;
		const checkpointPrefix = checkpointSettings?.project?.prefix ?? "checkpoint:";
		const timestamp = new Date().toISOString().replace(/\.\d+Z$/, "Z");

		// .soma/ state is auto-committed in the handler before this runs.
		// Steps here are only for the agent to execute.
		const steps: string[] = [];
		if (projectAutoCheckpoint) {
			steps.push(
				`**Step 1:** Checkpoint project code:\n` +
				`\`\`\`bash\ngit add -A && git commit -m "${checkpointPrefix} ${timestamp}"\n\`\`\``
			);
		} else {
			steps.push(
				`**Step 1:** Review uncommitted project changes — commit if meaningful work exists.`
			);
		}

		const template =
			`**Step 2:** Append to \`${logPath}\` — daily session log. ` +
			`Read first if it exists — append a new \`## HH:MM\` section, never overwrite previous entries. ` +
			`Only record what actually happened — never claim a preload was written before you write it.\n\n` +
			`**Step 3:** Write \`${target}\` — this is the LAST file you write.\n\n` +
			`This IS the continuation prompt for the next session. The next agent sees ONLY this file — ` +
			`not the conversation history. Write it like a briefing for someone taking over your shift.\n\n` +
			`**Quality bar:** Could a new agent read this preload and immediately start working without ` +
			`re-reading any files? If not, add more detail.\n\n` +
			`**Format:**\n` +
			`\`\`\`markdown\n` +
			`---\n` +
			`type: preload\n` +
			`created: ${today}\n` +
			`session: ${currentSessionId || "unknown"}\n` +
			`commits: []        # list commit hashes from this session\n` +
			`projects: []       # project names touched (e.g. [soma-agent, website])\n` +
			`tags: []           # topics/themes (e.g. [refactor, amps, paths])\n` +
			`files-changed: 0   # total files modified\n` +
			`tests: ""          # test results summary (e.g. "333/333")\n` +
			`---\n\n` +
			`## Resume Point\n` +
			`<!-- 2-3 sentences: what was this session about, what state are things in. -->\n\n` +
			`## What Shipped\n` +
			`<!-- Numbered list. Each: description (\`commit\`), key files changed. Dense. -->\n\n` +
			`## Next Session: [Task Name]\n` +
			`<!-- THE AMNESIA-PROOF SECTION. Write as if next agent has zero context.\n` +
			`     Include:\n` +
			`     - Quick Start: exact bash commands to run first (no reading required)\n` +
			`     - Steps: numbered, with exact file:line refs (e.g. muscles.ts [97-138])\n` +
			`     - After each step: test + verify commands\n` +
			`     - After all steps: commit + sync commands\n` +
			`     This section should be executable top-to-bottom without reading Orient From. -->\n\n` +
			`## In-Flight (not started)\n` +
			`<!-- Unfinished work NOT covered by Next Session. Brief. -->\n\n` +
			`## Key Decisions\n` +
			`<!-- Decisions with rationale. Only include if next session needs them. -->\n\n` +
			`## Orient From\n` +
			`<!-- Files to read ONLY IF the Next Session section isn't enough.\n` +
			`     Always include [line-ranges] for code files.\n` +
			`     Example: \`core/utils.ts\` [39-91] — canonical shared helpers -->\n\n` +
			`## Do NOT Re-Read\n` +
			`<!-- Files fully understood. Brief reason why. -->\n` +
			`\`\`\`\n\n` +
			`⚠️ **Order matters:** session log (Step 2) FIRST, then preload (Step 3) LAST. ` +
			`The preload write triggers the rotation watcher.`;

		return { template, steps };
	}

	// /exhale — save state, session ends
	const exhaleHandler = async (_args: string, ctx: any) => {
		if (!soma) { ctx.ui.notify("No .soma/ found. Run /soma init first.", "error"); return; }

		const memDir = resolveSomaPath(soma.path, "preloads", settings);
		const target = join(memDir, preloadFilename());
		const today = new Date().toISOString().split("T")[0];
		const logPath = join(resolveSomaPath(soma.path, "sessions", settings), `${today}.md`);

		// Save heat state to disk
		const decay = settings?.protocols.decayRate ?? 1;
		if (protocolState) { applyDecay(protocolState, protocolsReferenced, decay, knownProtocols); saveProtocolState(soma, protocolState); }
		decayMuscleHeat(soma, musclesReferenced, decay, settings);
		decayAutomationHeat(soma, automationsReferenced, decay, settings);

		// Auto-commit .soma/ internal state (heat, protocol-state, etc.)
		const commitResult = autoCommitSomaState("exhale");
		if (commitResult) {
			ctx.ui.notify(`✅ ${commitResult}`, "info");
		}

		const { template, steps } = buildPreloadInstructions(target, logPath, today);

		pi.sendUserMessage(
			`[EXHALE — save session state]\n\n` +
			`${steps.join("\n\n")}\n\n` +
			`${template}\n\n` +
			`**Final step:** Say "FLUSH COMPLETE".`,
			{ deliverAs: "followUp" }
		);

		ctx.ui.notify("Exhale initiated — write preload, then FLUSH COMPLETE", "info");
	};

	pi.registerCommand("exhale", { description: "Exhale — save session state", handler: exhaleHandler });

	// /rest — disable keepalive + exhale (going to bed)
	pi.registerCommand("rest", {
		description: "Rest — disable keepalive, save state, end session",
		handler: async (args, ctx) => {
			// Disable keepalive via cross-extension signal
			const ka = (globalThis as any).__somaKeepalive;
			if (ka) { ka.enabled = false; }
			ctx.ui.notify("💤 Keepalive disabled — entering rest mode", "info");

			// Trigger exhale
			await exhaleHandler(args, ctx);
		},
	});

	// /breathe — exhale + auto-continue
	pi.registerCommand("breathe", {
		description: "Breathe — save state and continue in a fresh session",
		handler: async (_args, ctx) => {
			if (!soma) { ctx.ui.notify("No .soma/ found. Run /soma init first.", "error"); return; }

			const usage = ctx.getContextUsage?.();
			const pct = usage?.percent ?? 0;

			const memDir = resolveSomaPath(soma.path, "preloads", settings);
			const target = join(memDir, preloadFilename());
			const today = new Date().toISOString().split("T")[0];
			const logPath = join(resolveSomaPath(soma.path, "sessions", settings), `${today}.md`);

			// Save heat state to disk
			// REFACTOR: #8 — this 4-line block is copy-pasted 4 times. Extract saveAllHeatState().
			const decay = settings?.protocols.decayRate ?? 1;
			if (protocolState) { applyDecay(protocolState, protocolsReferenced, decay, knownProtocols); saveProtocolState(soma, protocolState); }
			decayMuscleHeat(soma, musclesReferenced, decay, settings);
			decayAutomationHeat(soma, automationsReferenced, decay, settings);

			// Auto-commit .soma/ internal state
			const commitResult = autoCommitSomaState("breathe");
			if (commitResult) {
				ctx.ui.notify(`✅ ${commitResult}`, "info");
			}

			breathePending = true;
			breatheTurnCount = 0;
			breatheCommandCtx = ctx;

			// --- Edge case: preload already written this session (earlier /exhale or auto-flush) ---
			if (preloadWrittenThisSession && preloadPath) {
				pi.sendUserMessage(
					`[BREATHE — preload already written this session]\n\n` +
					`A preload was already saved to \`${preloadPath}\`. ` +
					`If significant work happened since then, update it. Otherwise, say "BREATHE COMPLETE" to rotate.`,
					{ deliverAs: "followUp" }
				);
				ctx.ui.notify("🫁 Preload exists — update or confirm to rotate", "info");
				return;
			}

			// --- Edge case: auto-flush already fired → upgrade to breathe (don't re-inject full template) ---
			if (autoFlushSent) {
				pi.sendUserMessage(
					`[BREATHE — upgrading auto-flush to breathe]\n\n` +
					`Auto-flush already requested a preload. Write it to \`${target}\` if you haven't yet, then say "BREATHE COMPLETE". ` +
					`The session will auto-rotate to a fresh context with your preload injected.`,
					{ deliverAs: "followUp" }
				);
				ctx.ui.notify("🫁 Upgrading auto-flush → breathe (will auto-rotate)", "info");
				return;
			}

			// --- Context-aware instructions ---
			let urgency: string;
			let preloadGuidance: string;
			if (pct >= 75) {
				urgency = `Context is at ${Math.round(pct)}% — be fast. Minimal preload, skip the session log.`;
				preloadGuidance =
					`Write \`${target}\` NOW. Focus on: Resume Point (2 sentences), What Shipped (bullet list), ` +
					`In-Flight (what's unfinished + where you stopped), Next Priorities. Skip other sections.`;
			} else if (pct >= 40) {
				urgency = `Context at ${Math.round(pct)}% — good time to rotate.`;
				const { template, steps } = buildPreloadInstructions(target, logPath, today);
				preloadGuidance = `${steps.join("\n\n")}\n\n${template}`;
			} else {
				urgency = `Context at ${Math.round(pct)}% — early rotation. Keep the preload proportional to work done.`;
				preloadGuidance =
					`If this was a short session, a brief preload is fine:\n` +
					`1. Commit any uncommitted work.\n` +
					`2. Write \`${target}\` — include Resume Point, What Shipped (even if minimal), and Next Priorities.\n` +
					`   Skip sections that don't apply (no In-Flight if nothing is in-flight).`;
			}

			pi.sendUserMessage(
				`[BREATHE — save and continue]\n\n` +
				`${urgency}\n\n` +
				`${preloadGuidance}\n\n` +
				`**When done:** Say "BREATHE COMPLETE" — the session will auto-rotate and inject your preload.`,
				{ deliverAs: "followUp" }
			);

			ctx.ui.notify("🫁 Breathing — write preload, then BREATHE COMPLETE to rotate", "info");
		},
	});

	// /auto-continue — manual trigger for new session + preload + boot context
	// (same as what /breathe's rotation does, but manually triggered)
	pi.registerCommand("auto-continue", {
		description: "Rotate to fresh session with preload + full boot context",
		handler: async (_args, ctx) => {
			if (!soma) { ctx.ui.notify("No .soma/ found", "error"); return; }

			const preload = findPreload(soma);
			if (!preload) {
				ctx.ui.notify("⚠️ No preload found — nothing to continue from. Use /inhale after writing one.", "warning");
				return;
			}

			ctx.ui.notify("🔄 Rotating to fresh session...", "info");
			try {
				pendingRotationBoot = null;
				const result = await ctx.newSession({});
				if (!result.cancelled) {
					// session_switch handler queued boot context + preload
					if (pendingRotationBoot) {
						pi.sendUserMessage(pendingRotationBoot, { deliverAs: "followUp" });
						pendingRotationBoot = null;
						ctx.ui.notify("✅ Rotated — boot context + preload injected", "info");
					} else {
						// Fallback
						pi.sendUserMessage(preload.content, { deliverAs: "followUp" });
						ctx.ui.notify("✅ Rotated — preload injected", "info");
					}
				}
			} catch (err: any) {
				ctx.ui.notify(`⚠️ Rotation failed: ${err?.message?.slice(0, 100)}`, "error");
			}
		},
	});

	// /inhale — orient for fresh session
	pi.registerCommand("inhale", {
		description: "Inhale — load preload from last session into current conversation",
		handler: async (_args, ctx) => {
			if (!soma) { ctx.ui.notify("No .soma/ — nothing to inhale. Run /soma init first.", "info"); return; }
			const preload = findPreload(soma);
			if (!preload) {
				ctx.ui.notify("🫁 No preload found — nothing to inhale.", "info");
				return;
			}
			const staleTag = preload.stale ? ` ⚠️ (${Math.floor(preload.ageHours)}h old — may be stale)` : "";
			pi.sendUserMessage(
				`[Soma Inhale — Loading Preload${staleTag}]\n\n${preload.content}`,
				{ deliverAs: "followUp" }
			);
			ctx.ui.notify(`🫁 Preload inhaled (${Math.floor(preload.ageHours)}h old)`, "info");
		},
	});

	// --- discovery: /soma ---
	// REFACTOR: #6 — /soma is 200 lines with 6 subcommands. Consider a dispatch table.

	// /soma — status and management
	pi.registerCommand("soma", {
		description: "Soma memory status and management",
		getArgumentCompletions: (prefix) =>
			["status", "init", "prompt", "prompt full", "prompt identity", "preload", "debug", "debug on", "debug off"].filter(o => o.startsWith(prefix)).map(o => ({ value: o, label: o })),
		handler: async (args, ctx) => {
			const cmd = args.trim().toLowerCase() || "status";

			if (cmd === "init") {
				if (soma) { ctx.ui.notify(`Soma already planted at ${soma.path}`, "info"); return; }
				const somaPath = initSoma(process.cwd());
				soma = findSomaDir();
				ctx.ui.notify(`🌱 Soma planted at ${somaPath}`, "info");
				return;
			}

			if (cmd.startsWith("prompt")) {
				if (!soma || !settings) { ctx.ui.notify("No Soma found. Use /soma init", "info"); return; }

				const subCmd = cmd.replace("prompt", "").trim();

				// Re-compile to show current state
				const activeTools = pi.getActiveTools?.() ?? [];
				const allToolsList = pi.getAllTools?.() ?? [];

				// Get the current base system prompt for accurate Phase 3 test
				const currentBasePrompt = ctx.getSystemPrompt?.() ?? "";
				const compiled = compileFullSystemPrompt({
					protocols: knownProtocols,
					protocolState: protocolState,
					muscles: knownMuscles,
					settings,
					piSystemPrompt: currentBasePrompt || "You are an expert coding assistant operating inside pi",
					activeTools,
					allTools: allToolsList,
					agentDir: somaAgentDir,
					identity: builtIdentity,
				});

				// Section detection
				const sectionChecks = [
					["Soma core", "You are Soma"],
					["Identity", "# Identity"],
					["Behavioral rules", "## Active Behavioral Rules"],
					["Learned patterns", "## Learned Patterns"],
					["Tools", "Available tools:"],
					["Guard", "## Guard"],
					["Soma docs", "Soma documentation"],
					["External context", "## External Project Context"],
					["Skills", "<available_skills>"],
					["Date/time", "Current date and time:"],
				] as const;

				// Heat tables
				const protoHeat = knownProtocols
					.map(p => ({ name: p.name, heat: getProtocolHeat(p, protocolState) }))
					.sort((a, b) => b.heat - a.heat);
				const warmThresh = settings.protocols?.warmThreshold ?? 3;
				const hotThresh = settings.protocols?.hotThreshold ?? 8;

				const muscleDigestThresh = settings.muscles?.digestThreshold ?? 1;
				const muscleFullThresh = settings.muscles?.fullThreshold ?? 4;

				if (subCmd === "full") {
					// Dump the full compiled prompt via sendUserMessage
					pi.sendUserMessage(
						`[/soma prompt full — compiled system prompt (${compiled.estimatedTokens} tokens)]\n\n` +
						"```\n" + compiled.block + "\n```",
						{ deliverAs: "followUp" }
					);
					return;
				}

				if (subCmd === "identity") {
					pi.sendUserMessage(
						`[/soma prompt identity]\n\n` +
						`**Built identity:** ${builtIdentity ? `${builtIdentity.length} chars` : "❌ NONE"}\n` +
						`**In compiled prompt:** ${compiled.block.includes("# Identity") ? "✅ yes" : "❌ NO — BUG"}\n` +
						`**persona.name:** ${settings.persona?.name ?? "(null)"}\n` +
						`**identityInSystemPrompt:** ${(settings as any).systemPrompt?.identityInSystemPrompt ?? "(default: true)"}\n\n` +
						(builtIdentity ? "```\n" + builtIdentity.slice(0, 2000) + "\n```" : "No identity found in chain."),
						{ deliverAs: "followUp" }
					);
					return;
				}

				// Default: diagnostic summary
				const lines: string[] = [];
				lines.push(`**Compiled System Prompt** — ${compiled.block.length} chars (~${compiled.estimatedTokens} tokens)`);
				lines.push(`Full replacement: ${compiled.fullReplacement} | Cached: ${frontalCortexCompiled}`);
				lines.push(``);

				// Sections
				lines.push(`**Sections:**`);
				for (const [label, marker] of sectionChecks) {
					const found = compiled.block.includes(marker);
					lines.push(`  ${found ? "✅" : "❌"} ${label}`);
				}
				lines.push(``);

				// Identity
				lines.push(`**Identity:** ${builtIdentity ? `${builtIdentity.length} chars` : "❌ NONE"} → ${compiled.block.includes("# Identity") ? "in prompt ✅" : "MISSING from prompt ❌"}`);
				lines.push(`  persona.name: ${settings.persona?.name ?? "(null)"} | emoji: ${settings.persona?.emoji ?? "(null)"}`);
				lines.push(``);

				// Protocol heat
				lines.push(`**Protocols:** ${compiled.protocolCount} in prompt (max ${settings.protocols?.maxBreadcrumbsInPrompt ?? 12})`);
				for (const p of protoHeat) {
					const tier = p.heat >= hotThresh ? "🔴" : p.heat >= warmThresh ? "🟡" : "⚪";
					const inPrompt = p.heat >= warmThresh ? "✅" : "—";
					lines.push(`  ${tier} ${p.name}: heat=${p.heat} ${inPrompt}`);
				}
				lines.push(``);

				// Muscle heat
				lines.push(`**Muscles:** ${compiled.muscleCount} digests in prompt (max ${settings.muscles?.maxDigest ?? 5})`);
				for (const m of knownMuscles.slice(0, 10)) {
					const tier = m.heat >= muscleFullThresh ? "🔴" : m.heat >= muscleDigestThresh ? "🟡" : "⚪";
					const status = m.status !== "active" ? ` [${m.status}]` : "";
					lines.push(`  ${tier} ${m.name}: heat=${m.heat}${status}`);
				}
				lines.push(``);

				// Context state
				const usage = ctx.getContextUsage?.();
				lines.push(`**Runtime:**`);
				lines.push(`  Context: ${usage?.percent != null ? Math.round(usage.percent) + "%" : "unknown"}`);
				lines.push(`  Warnings sent at: ${lastContextWarningPct > 0 ? Math.round(lastContextWarningPct) + "%" : "none yet"}`);
				lines.push(`  Thresholds: ${JSON.stringify(settings.context ?? { notifyAt: 50, warnAt: 70, urgentAt: 80, autoExhaleAt: 85 })}`);
				lines.push(``);
				lines.push(`💡 \`/soma prompt full\` — dump compiled prompt | \`/soma prompt identity\` — identity debug`);

				ctx.ui.notify(lines.join("\n"), "info");
				return;
			}

			if (cmd === "status") {
				if (!soma) { ctx.ui.notify("No Soma found. Use /soma init", "info"); return; }
				const preload = findPreload(soma);
				const chain = getSomaChain();
				const protocols = discoverProtocolChain(chain);
				ctx.ui.notify([
					`🌿 Soma: ${soma.path} (${soma.rootName}/)`,
					`Chain: ${chain.length} level${chain.length !== 1 ? "s" : ""}`,
					`Preload: ${preload ? "✓" : "none"}`,
					`Protocols: ${protocols.length}`,
					`System prompt: ~${frontalCortexCompiled ? "compiled" : "pending"}`,
				].join("\n"), "info");
				return;
			}

			// /soma preload — show available preloads (was standalone /preload)
			if (cmd === "preload") {
				if (!soma) { ctx.ui.notify("No .soma/ found", "info"); return; }
				const preload = findPreload(soma);
				if (preload) {
					const stale = preload.stale ? " ⚠️stale" : "";
					ctx.ui.notify(`${preload.name} (${Math.floor(preload.ageHours)}h ago${stale})`, "info");
				} else {
					ctx.ui.notify("No preloads found", "info");
				}
				return;
			}

			// /soma debug — toggle debug logging (was standalone /debug)
			if (cmd.startsWith("debug")) {
				const debugCmd = cmd.replace("debug", "").trim() || "status";

				if (debugCmd === "status") {
					const debugDir = soma ? join(soma.path, "debug") : null;
					const hasLogs = debugDir && existsSync(debugDir);
					ctx.ui.notify(
						`Debug mode: ${debug.enabled ? "ON 🔴" : "OFF"}\n` +
						`Debug dir: ${debugDir || "(no .soma/)"}\n` +
						(hasLogs ? `Logs exist — read .soma/debug/ for diagnostics` : `No debug logs yet`),
						"info"
					);
					return;
				}

				if (debugCmd === "on") {
					if (!soma) { ctx.ui.notify("No .soma/ found.", "error"); return; }
					debug = createDebugLogger(soma.path, true);
					debug.boot("debug mode enabled via /soma debug on");
					ctx.ui.notify("🔴 Debug mode ON — logging to .soma/debug/", "info");
					return;
				}

				if (debugCmd === "off") {
					if (debug.enabled) {
						debug.boot("debug mode disabled via /soma debug off");
					}
					debug = createDebugLogger(null);
					ctx.ui.notify("Debug mode OFF", "info");
					return;
				}

				ctx.ui.notify("Usage: /soma debug on|off|status", "info");
				return;
			}

			ctx.ui.notify("Usage: /soma status | init | prompt [full|identity] | preload | debug [on|off]", "info");
		},
	});

	// --- hub: /install, /list ---

	const VALID_TYPES: ContentType[] = ["protocol", "muscle", "skill", "template"];

	pi.registerCommand("install", {
		description: "Install a protocol, muscle, skill, or template from the Soma Hub",
		getArgumentCompletions: (prefix) =>
			VALID_TYPES
				.filter(t => t.startsWith(prefix))
				.map(t => ({ value: t, label: `${t} — install a ${t} from hub` })),
		handler: async (args, ctx) => {
			if (!soma) { ctx.ui.notify("No .soma/ found. Run /soma init first.", "error"); return; }

			const parts = args.trim().split(/\s+/);
			const force = parts.includes("--force");
			const filtered = parts.filter(p => p !== "--force");

			if (filtered.length < 2) {
				ctx.ui.notify("Usage: /install <type> <name> [--force]\nTypes: protocol, muscle, skill, template", "info");
				return;
			}

			const type = filtered[0] as ContentType;
			const name = filtered[1];

			if (!VALID_TYPES.includes(type)) {
				ctx.ui.notify(`Invalid type: ${type}. Use: ${VALID_TYPES.join(", ")}`, "error");
				return;
			}

			ctx.ui.notify(`📦 Installing ${type}: ${name}...`, "info");

			try {
				const result = await installItem(soma, type, name, { force });

				if (result.success) {
					const msgs = [`✅ Installed ${type}: ${name}`];
					if (result.path) msgs.push(`   → ${result.path}`);

					// Show dependency results for templates
					if (result.dependencies && result.dependencies.length > 0) {
						msgs.push(`   Dependencies:`);
						for (const dep of result.dependencies) {
							const icon = dep.success ? "✓" : dep.error?.includes("Already exists") ? "·" : "✗";
							msgs.push(`     ${icon} ${dep.type}: ${dep.name}${dep.error ? ` (${dep.error})` : ""}`);
						}
					}

					ctx.ui.notify(msgs.join("\n"), "info");

					// Notify about reboot
					if (type === "protocol" || type === "muscle") {
						ctx.ui.notify("💡 New content will load on next session boot (or /breathe to rotate now)", "info");
					}
				} else {
					ctx.ui.notify(`❌ ${result.error || "Install failed"}`, "error");
				}
			} catch (err: any) {
				ctx.ui.notify(`❌ Install error: ${err.message}`, "error");
			}
		},
	});

	pi.registerCommand("list", {
		description: "List installed or remote Soma content",
		getArgumentCompletions: (prefix) =>
			["local", "remote", ...VALID_TYPES]
				.filter(o => o.startsWith(prefix))
				.map(o => ({ value: o, label: o })),
		handler: async (args, ctx) => {
			const parts = args.trim().split(/\s+/).filter(Boolean);
			const mode = parts[0] || "local";
			const typeFilter = parts[1] as ContentType | undefined;

			if (mode === "remote") {
				ctx.ui.notify("🔍 Fetching from hub...", "info");
				try {
					const items = await listRemote(typeFilter);
					if (items.length === 0) {
						ctx.ui.notify("No remote content found.", "info");
						return;
					}

					const grouped: Record<string, string[]> = {};
					for (const item of items) {
						if (!grouped[item.type]) grouped[item.type] = [];
						grouped[item.type].push(item.name);
					}

					const lines = ["📡 Hub content:"];
					for (const [type, names] of Object.entries(grouped)) {
						lines.push(`  ${type}s: ${names.join(", ")}`);
					}
					lines.push(`\nInstall: /install <type> <name>`);
					ctx.ui.notify(lines.join("\n"), "info");
				} catch (err: any) {
					ctx.ui.notify(`❌ Failed to fetch: ${err.message}`, "error");
				}
				return;
			}

			// Local listing
			if (!soma) { ctx.ui.notify("No .soma/ found.", "info"); return; }

			const items = listLocal(soma, typeFilter && VALID_TYPES.includes(typeFilter) ? typeFilter : undefined);
			if (items.length === 0) {
				ctx.ui.notify("No local content found. Try /list remote to see what's available.", "info");
				return;
			}

			const grouped: Record<string, string[]> = {};
			for (const item of items) {
				if (!grouped[item.type]) grouped[item.type] = [];
				grouped[item.type].push(item.name);
			}

			const lines = ["📋 Installed content:"];
			for (const [type, names] of Object.entries(grouped)) {
				lines.push(`  ${type}s: ${names.join(", ")}`);
			}
			ctx.ui.notify(lines.join("\n"), "info");
		},
	});

	// --- user tools: /scratch ---

	pi.registerCommand("scratch", {
		description: "Quick notes — append to scratchpad without agent seeing it",
		getArgumentCompletions: (prefix) =>
			["read", "clear"].filter(o => o.startsWith(prefix)).map(o => ({ value: o, label: o })),
		handler: async (args, ctx) => {
			if (!soma) { ctx.ui.notify("No .soma/ found. Run /soma init first.", "error"); return; }

			const scratchPath = join(resolveSomaPath(soma.path, "sessions", settings), "scratchpad.md");
			const trimmed = args.trim();

			// /scratch read — agent reads the scratchpad
			if (trimmed === "read") {
				if (!existsSync(scratchPath)) {
					ctx.ui.notify("📝 Scratchpad is empty.", "info");
					return;
				}
				const content = readFileSync(scratchPath, "utf-8");
				pi.sendUserMessage(
					`[Scratchpad — ${scratchPath}]\n\n${content}`,
					{ deliverAs: "followUp" }
				);
				return;
			}

			// /scratch clear — empty the scratchpad
			if (trimmed === "clear") {
				if (existsSync(scratchPath)) {
					writeFileSync(scratchPath, "");
					ctx.ui.notify("🗑️ Scratchpad cleared.", "info");
				} else {
					ctx.ui.notify("📝 Scratchpad already empty.", "info");
				}
				return;
			}

			// /scratch <text> — append to scratchpad (agent doesn't see this)
			if (!trimmed) {
				ctx.ui.notify(
					"Usage:\n" +
					"  /scratch <note>  — append a note (agent won't see it)\n" +
					"  /scratch read    — show scratchpad to agent\n" +
					"  /scratch clear   — empty the scratchpad",
					"info"
				);
				return;
			}

			const timestamp = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
			const entry = `- [${timestamp}] ${trimmed}\n`;

			try {
				const existing = existsSync(scratchPath) ? readFileSync(scratchPath, "utf-8") : "";
				writeFileSync(scratchPath, existing + entry);
				ctx.ui.notify(`📝 Noted. (${scratchPath.split("/").pop()})`, "info");
			} catch (err: any) {
				ctx.ui.notify(`❌ Failed to write: ${err?.message?.slice(0, 80)}`, "error");
			}
		},
	});
}
