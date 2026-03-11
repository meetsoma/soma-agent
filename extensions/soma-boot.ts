/**
 * Soma Boot Extension
 *
 * Single source of truth for session lifecycle:
 *   - Discovery + identity + preload + protocols + muscles + scripts + git-context
 *   - Context warnings (50% → 70% → 80% → 85% auto-flush)
 *   - FLUSH COMPLETE detection + auto-continue
 *   - Preload watcher (tool_result)
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
 * breath-cycle          │ session_start (preload), context warnings,
 *                       │   /exhale, /breathe, /rest, /auto-continue,
 *                       │   /inhale, /preload, FLUSH COMPLETE detection,
 *                       │   preload watcher, post-preload work detection
 * heat-tracking         │ HEAT_RULES, tool_result auto-detect,
 *                       │   session_shutdown decay, /pin, /kill
 * session-checkpoints   │ session_start (git-context), /exhale step 1
 *                       │   (checkpoint commands), .soma diff on boot
 * discovery             │ session_start (identity, protocols, muscles,
 *                       │   scripts), /soma status
 * ────────────────────────────────────────────────────────────────────────
 */

import { join, dirname, resolve } from "path";
import { existsSync, readdirSync } from "fs";
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
	loadSettings,
	initSoma,
	installItem,
	listRemote,
	listLocal,
	compileFrontalCortex,
	compileFullSystemPrompt,
	detectProjectContext,
	type SomaDir,
	type SomaSettings,
	type ProtocolState,
	type ContentType,
	type Protocol,
	type Muscle,
} from "../core/index.js";

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

// Script descriptions for boot injection
const SCRIPT_DESCRIPTIONS: Record<string, string> = {
	"soma-audit.sh": "Ecosystem health check — 11 audits: PII, drift, stale content/terms, docs sync, commands, roadmap, overlap, settings, tests, frontmatter. `--list`, `--quiet`, or name specific audits",
	"soma-search.sh": "Query memory by type/status/tags/domain. `--deep` for TL;DR, `--brief` for breadcrumbs, `--missing-tldr` for audit",
	"soma-scan.sh": "Scan frontmatter across docs. `--stale` for outdated, `--type`/`--status` filters",
	"soma-tldr.sh": "Generate TL;DR/digest sections via Haiku. `--scan` gaps, `--batch` all, `--dry-run`",
	"soma-snapshot.sh": "Rolling backup snapshots of .soma/",
	"frontmatter-date-hook.sh": "Git pre-commit hook: auto-update `updated:` in frontmatter",
};

// Resolve agent dir from this module's location (extensions/ → parent)
const __dirname = dirname(fileURLToPath(import.meta.url));
const somaAgentDir = resolve(__dirname, "..");

export default function somaBootExtension(pi: ExtensionAPI) {

	let soma: SomaDir | null = null;
	let settings: SomaSettings | null = null;
	let protocolState: ProtocolState | null = null;
	let builtIdentity: string | null = null;
	let protocolsReferenced = new Set<string>();
	let musclesReferenced = new Set<string>();
	let knownProtocols: Protocol[] = [];
	let knownProtocolNames: string[] = [];
	let knownMuscles: Muscle[] = [];
	let knownMuscleNames: string[] = [];
	let booted = false;
	let frontalCortexCompiled = false;

	// Context warning state
	let lastContextWarningPct = 0;
	let wrapUpSent = false;
	let autoFlushSent = false;

	// Track work after preload (edge case: user sends more requests after preload written)
	let toolCallsAfterPreload = 0;

	// Flush/continue state
	let flushCompleteDetected = false;
	let preloadWrittenThisSession = false;
	let preloadPath: string | null = null;
	let breatheCommandCtx: any = null;
	let breathePending = false;
	let currentSessionId = "";

	// ═══════════════════════════════════════════════════════════════════
	// PROTOCOL: discovery — session boot (identity + preload + protocols + muscles + scripts + git)
	// Also: breath-cycle (preload loading), session-checkpoints (git context)
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
			// ctx.ui.confirm() doesn't work during session_start because
			// the TUI input handler isn't active yet (Pi framework timing).
			const detection = detectProjectContext(process.cwd());
			const somaPath = initSoma(process.cwd());
			soma = findSomaDir();
			ctx.ui.notify(`🌱 Soma planted at ${somaPath}`, "info");

			// Build context-aware first-run message
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

		// Build boot context
		const parts: string[] = [];
		const chain = getSomaChain();

		settings = loadSettings(chain);

		const isResumed = ctx.sessionManager.getEntries().some(
			(e: any) => e.type === "message"
		);

		const steps = settings.boot.steps;

		for (const step of steps) {
			switch (step) {

			case "identity": {
				builtIdentity = buildLayeredIdentity(chain, settings);
				// Identity now goes in compiled system prompt (Wave 2), not boot user message
				break;
			}

			case "preload": {
				if (isResumed) {
					const staleHours = settings.preload.staleAfterHours;
					const preload = findPreload(soma, staleHours);
					if (preload) {
						const staleTag = preload.stale ? " ⚠️ stale" : "";
						parts.push(`\n---\n# Session Preload (${preload.name})${staleTag}\n${preload.content}`);
					}
				}
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

					// Breadcrumbs now in compiled system prompt (Wave 2).
					// Boot message only gets hot protocol FULL BODIES.
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
					// Digests now in compiled system prompt (Wave 2).
					// Boot message only gets hot muscle FULL BODIES.
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

			case "scripts": {
				// Collect script dirs — child first, then parent chain if inherit.tools
				const scriptDirs: string[] = [join(soma.path, "scripts")];
				if (settings.inherit.tools && chain.length > 1) {
					for (let i = 1; i < chain.length; i++) {
						scriptDirs.push(join(chain[i].path, "scripts"));
					}
				}

				// Deduplicate by filename (child wins)
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
							const desc = SCRIPT_DESCRIPTIONS[name] || "—";
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
				const gc = settings.boot.gitContext;
				if (!gc.enabled) break;

				// .soma internal diff (checkpoint protocol)
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
							const preload = findPreload(soma, settings.preload.staleAfterHours);
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

		if (parts.length > 0) {
			booted = true;
			pi.appendEntry("soma-boot", { timestamp: Date.now(), resumed: isResumed });

			const greetStyle = isResumed
				? `You've resumed a Soma session. Your preload and hot protocols are above. Identity and behavioral rules are in your system prompt. Orient briefly and await instructions.`
				: `You've booted into a fresh Soma session. Identity and behavioral rules are in your system prompt. Hot protocols are above if any. Greet the user briefly and await instructions.`;

			pi.sendUserMessage(
				`[Soma Boot${isResumed ? " — resumed" : ""}]\n\n${parts.join("\n")}\n\n${greetStyle}`,
				{ deliverAs: "followUp" }
			);
		}
	});

	// ═══════════════════════════════════════════════════════════════════
	// PROTOCOL: breath-cycle — context warnings + auto-flush
	// 50%: UI notify | 70%: UI notify | 80%: system prompt warn | 85%: auto-flush
	// ═══════════════════════════════════════════════════════════════════

	pi.on("before_agent_start", async (event, ctx) => {
		if (!soma || !booted) return;

		// ═══════════════════════════════════════════════════════════════════
		// PROTOCOL: frontal-cortex — compiled system prompt
		// Phase 3: Full replacement when Pi's default detected.
		// Falls back to prepend when custom SYSTEM.md is in use.
		// Compiled once per session, cached thereafter.
		// ═══════════════════════════════════════════════════════════════════

		let systemPrompt = event.systemPrompt;

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
				frontalCortexCompiled = true;
			} else {
				// Fallback: Phase 0 prepend (tools not yet available)
				const compiled = compileFrontalCortex({
					protocols: knownProtocols,
					protocolState: protocolState,
					muscles: knownMuscles,
					settings,
				});
				if (compiled.block) {
					systemPrompt = compiled.block + "\n\n---\n\n" + systemPrompt;
					frontalCortexCompiled = true;
				}
			}
		}

		const usage = ctx.getContextUsage?.();
		if (!usage?.percent) {
			// No context info yet — still return compiled prompt if we have it
			if (systemPrompt !== event.systemPrompt) {
				return { systemPrompt };
			}
			return;
		}
		const pct = usage.percent;

		const thresholds = settings?.context ?? { notifyAt: 50, warnAt: 70, urgentAt: 80, autoExhaleAt: 85 };
		const additions: string[] = [];

		if (pct >= thresholds.autoExhaleAt && !autoFlushSent) {
			autoFlushSent = true;

			const memDir = join(soma.path, "memory");
			const preloadTarget = join(memDir, `preload-${currentSessionId || "next"}.md`);

			// System prompt injection
			additions.push(
				`\n## ⚠️ CONTEXT CRITICAL (${Math.round(pct)}%)\n` +
				`Context nearly full. Stop new work. Flush NOW.`
			);

			// Detailed flush instructions via user message
			pi.sendUserMessage(
				`[AUTO-FLUSH — context at ${Math.round(pct)}%]\n\n` +
				`Context is critically full. Flush NOW. Do not start new work.\n\n` +
				`1. Commit all uncommitted work.\n` +
				`2. Write \`${preloadTarget}\` — use the preload format: What Shipped (with paths), Key Decisions (with rationale), Key File Locations, Repo State, Next Priorities, Do NOT Re-Read.\n` +
				`3. Say "FLUSH COMPLETE" — system will offer to continue.`,
				{ deliverAs: "followUp" }
			);

			ctx.ui.notify(`🔴 Context at ${Math.round(pct)}% — AUTO-FLUSH`, "error");
			lastContextWarningPct = pct;
		} else if (pct >= thresholds.urgentAt && lastContextWarningPct < thresholds.urgentAt) {
			additions.push(
				`\n## ⚠️ Context High (${Math.round(pct)}%)\n` +
				`Wrap up current task. Prepare to flush.`
			);
			ctx.ui.notify(`⚠️ Context ${Math.round(pct)}% — flush soon`, "warning");
			lastContextWarningPct = pct;
		} else if (pct >= thresholds.warnAt && lastContextWarningPct < thresholds.warnAt) {
			ctx.ui.notify(`Context ${Math.round(pct)}%`, "info");
			lastContextWarningPct = pct;
		} else if (pct >= thresholds.notifyAt && lastContextWarningPct < thresholds.notifyAt) {
			ctx.ui.notify(`Context: ${Math.round(pct)}% — pace yourself`, "info");
			lastContextWarningPct = pct;
		}

		if (additions.length > 0) {
			return { systemPrompt: systemPrompt + "\n" + additions.join("\n") };
		}

		// Return compiled prompt even if no context additions
		if (systemPrompt !== event.systemPrompt) {
			return { systemPrompt };
		}
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
			const RECOMMENDED_SECTIONS = ["Key Decisions", "Key File Locations", "Repo State", "Do NOT Re-Read"];
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
		if (flushCompleteDetected && preloadWrittenThisSession) {
			ctx.ui.notify(
				"🟢 FLUSH COMPLETE — preload ready. Use /auto-continue to resume in a fresh session.",
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

		if (preloadWrittenThisSession && breatheCommandCtx) {
			breathePending = false;
			ctx.ui.notify("🫁 Preload saved — rotating to fresh session...", "info");
			const cmdCtx = breatheCommandCtx;
			breatheCommandCtx = null;
			setTimeout(async () => {
				try {
					const result = await cmdCtx.newSession({});
					if (!result.cancelled) {
						const preload = findPreload(soma!);
						if (preload) {
							pi.sendUserMessage(preload.content, { deliverAs: "followUp" });
							cmdCtx.ui.notify("✅ Auto-continued — preload injected", "info");
						}
					}
				} catch (err: any) {
					cmdCtx.ui.notify(`❌ Auto-continue failed: ${err.message}`, "error");
				}
			}, 1500);
		}
	});

	// ═══════════════════════════════════════════════════════════════════
	// PROTOCOL: breath-cycle + heat-tracking — session lifecycle resets + decay
	// ═══════════════════════════════════════════════════════════════════

	pi.on("session_switch", async (event, ctx) => {
		if (event.reason === "new") {
			lastContextWarningPct = 0;
			wrapUpSent = false;
			autoFlushSent = false;
			flushCompleteDetected = false;
			preloadWrittenThisSession = false;
			breathePending = false;
			toolCallsAfterPreload = 0;
			protocolsReferenced = new Set();
			musclesReferenced = new Set();
			frontalCortexCompiled = false;
			builtIdentity = null;

			// If preload exists, notify (user can /auto-continue)
			if (soma) {
				const preload = findPreload(soma);
				if (preload && !preload.stale) {
					ctx.ui.notify(
						`📋 Preload available (${Math.floor(preload.ageHours)}h ago). Use /auto-continue to load.`,
						"info"
					);
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
		decayMuscleHeat(soma, musclesReferenced, decay);
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
				}
			} else if (rule.type === "muscle" && knownMuscleNames.includes(rule.target)) {
				if (!musclesReferenced.has(rule.target)) {
					musclesReferenced.add(rule.target);
					bumpMuscleHeat(soma, rule.target, bump);
				}
			}
		}
	});

	// ═══════════════════════════════════════════════════════════════════
	// COMMANDS — organized by protocol
	// ═══════════════════════════════════════════════════════════════════

	// --- heat-tracking: /pin, /kill ---

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
				ctx.ui.notify(`📌 ${name} pinned (heat locked hot)`, "info");
			} else if (knownMuscleNames.includes(name)) {
				bumpMuscleHeat(soma, name, settings?.heat.pinBump ?? 5);
				musclesReferenced.add(name);
				ctx.ui.notify(`📌 ${name} pinned (heat bumped to hot)`, "info");
			} else {
				ctx.ui.notify(`Unknown protocol or muscle: ${name}`, "error");
			}
		},
	});

	// /kill — drop heat to zero
	pi.registerCommand("kill", {
		description: "Kill a protocol or muscle — drops heat to zero",
		handler: async (args, ctx) => {
			const name = args.trim();
			if (!name) { ctx.ui.notify("Usage: /kill <protocol-or-muscle-name>", "info"); return; }
			if (!soma || !protocolState) { ctx.ui.notify("No soma booted", "error"); return; }

			if (knownProtocolNames.includes(name)) {
				recordHeatEvent(protocolState, name, "killed");
				saveProtocolState(soma, protocolState);
				ctx.ui.notify(`💀 ${name} killed (heat → 0)`, "info");
			} else if (knownMuscleNames.includes(name)) {
				bumpMuscleHeat(soma, name, -15);
				ctx.ui.notify(`💀 ${name} killed (heat → 0)`, "info");
			} else {
				ctx.ui.notify(`Unknown protocol or muscle: ${name}`, "error");
			}
		},
	});

	// --- breath-cycle: /exhale, /flush, /rest, /breathe, /auto-continue, /inhale, /preload ---

	// /exhale — save state, session ends
	const exhaleHandler = async (_args: string, ctx: any) => {
		if (!soma) { ctx.ui.notify("No .soma/ found. Run /soma init first.", "error"); return; }

		const memDir = join(soma.path, "memory");
		const target = join(memDir, `preload-${currentSessionId || "next"}.md`);
		const today = new Date().toISOString().split("T")[0];
		const logPath = join(memDir, "sessions", `${today}.md`);

		// Save heat
		const decay = settings?.protocols.decayRate ?? 1;
		if (protocolState) { applyDecay(protocolState, protocolsReferenced, decay, knownProtocols); saveProtocolState(soma, protocolState); }
		decayMuscleHeat(soma, musclesReferenced, decay);

		const checkpointSettings = settings?.checkpoints;
		const somaAutoCommit = checkpointSettings?.soma?.autoCommit ?? true;
		const projectAutoCheckpoint = checkpointSettings?.project?.autoCheckpoint ?? false;
		const checkpointPrefix = checkpointSettings?.project?.prefix ?? "checkpoint:";
		const timestamp = new Date().toISOString().replace(/\.\d+Z$/, "Z");

		const checkpointSteps: string[] = [];
		if (somaAutoCommit) {
			checkpointSteps.push(
				`**Step 1a:** Commit .soma/ internal state:\n` +
				`\`\`\`bash\ncd ${soma.path} && git add -A && git commit -m "${checkpointPrefix} ${timestamp}"\n\`\`\``
			);
		}
		if (projectAutoCheckpoint) {
			checkpointSteps.push(
				`**Step 1b:** Checkpoint project code:\n` +
				`\`\`\`bash\ngit add -A && git commit -m "${checkpointPrefix} ${timestamp}"\n\`\`\``
			);
		} else {
			checkpointSteps.push(
				`**Step 1b:** Review uncommitted project changes — checkpoint if meaningful work exists.`
			);
		}

		const preloadTemplate =
			`\`\`\`markdown\n` +
			`---\n` +
			`type: preload\n` +
			`created: ${today}\n` +
			`session: ${currentSessionId || "unknown"}\n` +
			`---\n\n` +
			`# Session State\n\n` +
			`## What Shipped\n` +
			`<!-- Completed items with file paths. Not prose — structured list. -->\n\n` +
			`## Key Decisions\n` +
			`<!-- Decisions with rationale. "Did X because Y, alternative was Z." -->\n\n` +
			`## Key File Locations\n` +
			`<!-- Full paths to files that matter for next session. -->\n\n` +
			`## In-Flight\n` +
			`<!-- Work started but not finished. Where it stopped. Exact next step. -->\n\n` +
			`## Repo State\n` +
			`<!-- Git status across repos: what's committed, what's dirty, which branches. -->\n\n` +
			`## Next Session Priorities\n` +
			`<!-- Ordered list. What to pick up first. -->\n\n` +
			`## Loose Ends\n` +
			`<!-- Items discussed or planned but never executed. Carry forward until resolved or dropped. Don't clear — check off or note why dropped. Accumulates across sessions. -->\n\n` +
			`## Do NOT Re-Read\n` +
			`<!-- Files already internalized. Save context. -->\n` +
			`\`\`\``;

		pi.sendUserMessage(
			`[EXHALE — save session state]\n\n` +
			`${checkpointSteps.join("\n\n")}\n\n` +
			`**Step 2:** Write \`${target}\` using this format:\n\n` +
			`${preloadTemplate}\n\n` +
			`This IS your continuation prompt for the next session. Be concrete — file paths, not descriptions. Decisions with rationale, not just outcomes.\n\n` +
			`**Step 3:** Append to \`${logPath}\` — daily session log. Read first if it exists — append a new \`## HH:MM\` section, never overwrite previous entries.\n\n` +
			`**Step 4:** Say "FLUSH COMPLETE".`,
			{ deliverAs: "followUp" }
		);

		ctx.ui.notify("Exhale initiated — write preload, then FLUSH COMPLETE", "info");
	};

	pi.registerCommand("exhale", { description: "Exhale — save session state", handler: exhaleHandler });
	pi.registerCommand("flush", { description: "Alias for /exhale", handler: exhaleHandler });

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

			const memDir = join(soma.path, "memory");
			const target = join(memDir, `preload-${currentSessionId || "next"}.md`);
			const today = new Date().toISOString().split("T")[0];
			const logPath = join(memDir, "sessions", `${today}.md`);

			// Save heat
			const decay = settings?.protocols.decayRate ?? 1;
			if (protocolState) { applyDecay(protocolState, protocolsReferenced, decay, knownProtocols); saveProtocolState(soma, protocolState); }
			decayMuscleHeat(soma, musclesReferenced, decay);

			breathePending = true;
			breatheCommandCtx = ctx;

			const bCheckpointSettings = settings?.checkpoints;
			const bSomaAutoCommit = bCheckpointSettings?.soma?.autoCommit ?? true;
			const bProjectAutoCheckpoint = bCheckpointSettings?.project?.autoCheckpoint ?? false;
			const bCheckpointPrefix = bCheckpointSettings?.project?.prefix ?? "checkpoint:";
			const bTimestamp = new Date().toISOString().replace(/\.\d+Z$/, "Z");

			const bSteps: string[] = [];
			if (bSomaAutoCommit) {
				bSteps.push(
					`**Step 1a:** Commit .soma/ internal state:\n` +
					`\`\`\`bash\ncd ${soma.path} && git add -A && git commit -m "${bCheckpointPrefix} ${bTimestamp}"\n\`\`\``
				);
			}
			if (bProjectAutoCheckpoint) {
				bSteps.push(
					`**Step 1b:** Checkpoint project code:\n` +
					`\`\`\`bash\ngit add -A && git commit -m "${bCheckpointPrefix} ${bTimestamp}"\n\`\`\``
				);
			} else {
				bSteps.push(
					`**Step 1b:** Review uncommitted project changes — checkpoint if meaningful work exists.`
				);
			}

			const bPreloadTemplate =
				`\`\`\`markdown\n` +
				`---\n` +
				`type: preload\n` +
				`created: ${today}\n` +
				`session: ${currentSessionId || "unknown"}\n` +
				`---\n\n` +
				`# Session State\n\n` +
				`## What Shipped\n` +
				`<!-- Completed items with file paths. Not prose — structured list. -->\n\n` +
				`## Key Decisions\n` +
				`<!-- Decisions with rationale. "Did X because Y, alternative was Z." -->\n\n` +
				`## Key File Locations\n` +
				`<!-- Full paths to files that matter for next session. -->\n\n` +
				`## In-Flight\n` +
				`<!-- Work started but not finished. Where it stopped. Exact next step. -->\n\n` +
				`## Repo State\n` +
				`<!-- Git status across repos: what's committed, what's dirty, which branches. -->\n\n` +
				`## Next Session Priorities\n` +
				`<!-- Ordered list. What to pick up first. -->\n\n` +
				`## Loose Ends\n` +
				`<!-- Items discussed or planned but never executed. Carry forward until resolved or dropped. Don't clear — check off or note why dropped. Accumulates across sessions. -->\n\n` +
				`## Do NOT Re-Read\n` +
				`<!-- Files already internalized. Save context. -->\n` +
				`\`\`\``;

			pi.sendUserMessage(
				`[BREATHE — save and continue]\n\n` +
				`${bSteps.join("\n\n")}\n\n` +
				`**Step 2:** Write \`${target}\` using this format:\n\n` +
				`${bPreloadTemplate}\n\n` +
				`This IS your continuation prompt for the next session. Be concrete — file paths, not descriptions.\n\n` +
				`**Step 3:** Append to \`${logPath}\` — daily session log. Read first if it exists — append a new \`## HH:MM\` section, never overwrite previous entries.\n\n` +
				`**Step 4:** Say "BREATHE COMPLETE" when done.`,
				{ deliverAs: "followUp" }
			);

			ctx.ui.notify("🫁 Breathing — exhale then auto-continue into fresh session", "info");
		},
	});

	// /auto-continue — manual trigger for new session + preload injection
	pi.registerCommand("auto-continue", {
		description: "Create new session and inject preload as continuation",
		handler: async (_args, ctx) => {
			if (!soma) { ctx.ui.notify("No .soma/ found", "error"); return; }

			const preload = findPreload(soma);
			if (!preload) {
				ctx.ui.notify("⚠️ No preload found — nothing to continue from", "warning");
				return;
			}

			// Reset state
			flushCompleteDetected = false;
			preloadWrittenThisSession = false;
			lastContextWarningPct = 0;
			wrapUpSent = false;
			autoFlushSent = false;

			ctx.ui.notify("🔄 Creating new session with preload...", "info");
			try {
				const result = await ctx.newSession({});
				if (!result.cancelled) {
					pi.sendUserMessage(preload.content, { deliverAs: "followUp" });
					ctx.ui.notify("✅ Auto-continued — preload injected", "info");
				}
			} catch (err: any) {
				ctx.ui.notify(`⚠️ Auto-continue failed: ${err?.message?.slice(0, 100)}`, "error");
			}
		},
	});

	// /preload — show available preloads
	pi.registerCommand("preload", {
		description: "List available preload files",
		handler: async (_args, ctx) => {
			if (!soma) { ctx.ui.notify("No .soma/ found", "info"); return; }
			const preload = findPreload(soma);
			if (preload) {
				const stale = preload.stale ? " ⚠️stale" : "";
				ctx.ui.notify(`${preload.name} (${Math.floor(preload.ageHours)}h ago${stale})`, "info");
			} else {
				ctx.ui.notify("No preloads found", "info");
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

	// /soma — status and management
	pi.registerCommand("soma", {
		description: "Soma memory status and management",
		getArgumentCompletions: (prefix) =>
			["status", "init", "prompt"].filter(o => o.startsWith(prefix)).map(o => ({ value: o, label: o })),
		handler: async (args, ctx) => {
			const cmd = args.trim().toLowerCase() || "status";

			if (cmd === "init") {
				if (soma) { ctx.ui.notify(`Soma already planted at ${soma.path}`, "info"); return; }
				const somaPath = initSoma(process.cwd());
				soma = findSomaDir();
				ctx.ui.notify(`🌱 Soma planted at ${somaPath}`, "info");
				return;
			}

			if (cmd === "prompt") {
				if (!soma || !settings) { ctx.ui.notify("No Soma found. Use /soma init", "info"); return; }

				// Re-compile to show current state (uses cached core template)
				const activeTools = pi.getActiveTools?.() ?? [];
				const allToolsList = pi.getAllTools?.() ?? [];
				const compiled = compileFullSystemPrompt({
					protocols: knownProtocols,
					protocolState: protocolState,
					muscles: knownMuscles,
					settings,
					piSystemPrompt: "", // Don't need Pi's prompt for display
					activeTools,
					allTools: allToolsList,
					agentDir: somaAgentDir,
					identity: builtIdentity,
				});

				const summary = [
					`**Compiled System Prompt** — ${compiled.estimatedTokens} tokens`,
					`Protocols: ${compiled.protocolCount} breadcrumbs | Muscles: ${compiled.muscleCount} digests`,
					`Full replacement: ${compiled.fullReplacement}`,
					`Identity: ${builtIdentity ? "yes" : "none"}`,
					`Persona: ${settings.persona?.name || "default"}`,
					``,
					`Use \`/soma prompt\` to view. Changes take effect next session.`,
				].join("\n");
				ctx.ui.notify(summary, "info");
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

			ctx.ui.notify("Usage: /soma status | /soma init | /soma prompt", "info");
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
}
