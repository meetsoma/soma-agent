/**
 * Soma Boot Extension
 *
 * Thin wrapper around soma core. Handles Pi lifecycle hooks,
 * delegates all logic to core modules.
 *
 * Provides:
 *   - Auto-discovery of .soma/ on session start
 *   - Identity + preload + protocol loading
 *   - /flush, /preload, /soma commands
 *   - Context usage warnings
 */

import { join } from "path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
	findSomaDir,
	getSomaChain,
	buildLayeredIdentity,
	findPreload,
	discoverProtocolChain,
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
	initSoma,
	type SomaDir,
	type ProtocolState,
} from "../core/index.js";

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function somaBootExtension(pi: ExtensionAPI) {

	let soma: SomaDir | null = null;
	let protocolState: ProtocolState | null = null;
	let protocolsReferenced = new Set<string>();
	let musclesReferenced = new Set<string>();
	let booted = false;
	let lastContextWarningPct = 0;

	// -------------------------------------------------------------------
	// Session start: discover, load identity + preload + protocols
	// -------------------------------------------------------------------

	pi.on("session_start", async (_event, ctx) => {
		soma = findSomaDir();

		if (!soma) {
			const shouldInit = await ctx.ui.confirm(
				"🌱 Soma",
				"No memory found in this project. Create one?"
			);
			if (shouldInit) {
				const somaPath = initSoma(process.cwd());
				soma = findSomaDir();
				ctx.ui.notify(`🌱 Soma planted at ${somaPath}`, "info");
				pi.sendUserMessage(
					`You have a fresh memory system at \`${somaPath}\`.\n` +
					`There's an empty identity file at \`${somaPath}/identity.md\`.\n` +
					`Based on what you know about yourself and this workspace, ` +
					`write a brief identity — who are you, what do you help with, ` +
					`what's your style? Keep it under 20 lines.`,
					{ deliverAs: "followUp" }
				);
			}
			return;
		}

		// Build boot context
		const parts: string[] = [];
		const chain = getSomaChain();

		// Identity (layered: project → parent → global)
		const identity = buildLayeredIdentity(chain);
		if (identity) {
			parts.push(identity);
		}

		// Preload (only on resumed sessions)
		const isResumed = ctx.sessionManager.getEntries().some(
			(e: any) => e.type === "message"
		);
		if (isResumed) {
			const preload = findPreload(soma);
			if (preload) {
				const staleTag = preload.stale ? " ⚠️ stale" : "";
				parts.push(`\n---\n# Session Preload (${preload.name})${staleTag}\n${preload.content}`);
			}
		}

		// Protocols (discover from chain, build injection)
		const protocols = discoverProtocolChain(chain);
		if (protocols.length > 0) {
			protocolState = loadProtocolState(soma);

			if (!protocolState) {
				// G1: First boot — bootstrap state from heat-default values
				protocolState = bootstrapProtocolState(protocols);
				saveProtocolState(soma, protocolState);
			} else {
				// Sync: add entries for any new protocols discovered since last boot
				if (syncProtocolState(protocolState, protocols)) {
					saveProtocolState(soma, protocolState);
				}
			}

			const injection = buildProtocolInjection(protocols, protocolState);
			if (injection.systemPromptBlock.trim()) {
				parts.push(`\n---\n${injection.systemPromptBlock}`);
			}
		}

		// Muscles (discover from chain, load by heat within token budget)
		const muscles = discoverMuscleChain(chain);
		if (muscles.length > 0) {
			const muscleInjection = buildMuscleInjection(muscles);
			if (muscleInjection.systemPromptBlock.trim()) {
				parts.push(`\n---\n${muscleInjection.systemPromptBlock}`);
			}
			// Track load counts for loaded muscles
			const loaded = [...muscleInjection.hot, ...muscleInjection.warm];
			if (loaded.length > 0) {
				trackMuscleLoads(loaded);
			}
		}

		if (parts.length > 0) {
			booted = true;
			pi.appendEntry("soma-boot", { timestamp: Date.now(), resumed: isResumed });

			const greetStyle = isResumed
				? `You've resumed a Soma session. Your identity, preload, and protocols are above. Orient briefly and await instructions.`
				: `You've booted into a fresh Soma session. Your identity and protocols are above. Greet the user briefly and await instructions.`;

			pi.sendUserMessage(
				`[Soma Boot${isResumed ? " — resumed" : ""}]\n\n${parts.join("\n")}\n\n${greetStyle}`,
				{ deliverAs: "followUp" }
			);
		}
	});

	// -------------------------------------------------------------------
	// Context warnings (injected into system prompt)
	// -------------------------------------------------------------------

	pi.on("before_agent_start", async (event, ctx) => {
		if (!soma || !booted) return;

		const usage = ctx.getContextUsage?.();
		if (!usage?.percent) return;
		const pct = usage.percent;

		const additions: string[] = [];

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

		if (additions.length > 0) {
			return { systemPrompt: event.systemPrompt + "\n" + additions.join("\n") };
		}
	});

	pi.on("session_switch", async () => {
		lastContextWarningPct = 0;
		protocolsReferenced = new Set();
		musclesReferenced = new Set();
	});

	// -------------------------------------------------------------------
	// G3: Save heat state on session shutdown (not just /flush)
	// -------------------------------------------------------------------

	pi.on("session_shutdown", async () => {
		if (!soma) return;
		// Decay protocol heat
		if (protocolState) {
			applyDecay(protocolState, protocolsReferenced);
			saveProtocolState(soma, protocolState);
		}
		// Decay muscle heat
		decayMuscleHeat(soma, musclesReferenced);
	});

	// -------------------------------------------------------------------
	// /flush command
	// -------------------------------------------------------------------

	pi.registerCommand("flush", {
		description: "Write session state for next session continuation",
		handler: async (_args, ctx) => {
			if (!soma) {
				ctx.ui.notify("No .soma/ found. Run /soma init first.", "error");
				return;
			}

			const memDir = join(soma.path, "memory");
			const preloadPath = join(memDir, "preload-next.md");
			const contPath = join(memDir, "continuation-prompt.md");
			const today = new Date().toISOString().split("T")[0];
			const logPath = join(memDir, "sessions", `${today}.md`);

			// Save protocol heat state on flush
			if (protocolState && soma) {
				applyDecay(protocolState, protocolsReferenced);
				saveProtocolState(soma, protocolState);
			}
			// Decay muscle heat on flush
			if (soma) {
				decayMuscleHeat(soma, musclesReferenced);
			}

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

			ctx.ui.notify("Flush initiated — protocol heat will be saved", "info");
		},
	});

	// -------------------------------------------------------------------
	// /preload command
	// -------------------------------------------------------------------

	pi.registerCommand("preload", {
		description: "List available preload files",
		handler: async (_args, ctx) => {
			if (!soma) {
				ctx.ui.notify("No .soma/ found", "info");
				return;
			}

			const preload = findPreload(soma);
			if (preload) {
				const stale = preload.stale ? " ⚠️stale" : "";
				ctx.ui.notify(`${preload.name} (${Math.floor(preload.ageHours)}h ago${stale})`, "info");
			} else {
				ctx.ui.notify("No preloads found", "info");
			}
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
				if (soma) {
					ctx.ui.notify(`Soma already planted at ${soma.path}`, "info");
					return;
				}
				const somaPath = initSoma(process.cwd());
				soma = findSomaDir();
				ctx.ui.notify(`🌱 Soma planted at ${somaPath}`, "info");
				return;
			}

			if (cmd === "status") {
				if (!soma) {
					ctx.ui.notify("No Soma found. Use /soma init", "info");
					return;
				}

				const preload = findPreload(soma);
				const chain = getSomaChain();
				const protocols = discoverProtocolChain(chain);

				const lines = [
					`🌿 Soma: ${soma.path} (${soma.rootName}/)`,
					`Chain: ${chain.length} level${chain.length !== 1 ? "s" : ""}`,
					`Preload: ${preload ? "✓" : "none"}`,
					`Protocols: ${protocols.length}`,
				];

				ctx.ui.notify(lines.join("\n"), "info");
				return;
			}

			ctx.ui.notify("Usage: /soma status | /soma init", "info");
		},
	});
}
