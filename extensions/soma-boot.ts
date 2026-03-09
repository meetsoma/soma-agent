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
import { existsSync, readdirSync } from "fs";
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
	type SomaDir,
	type SomaSettings,
	type ProtocolState,
} from "../core/index.js";

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

// Script descriptions for boot injection (tooling awareness)
const SCRIPT_DESCRIPTIONS: Record<string, string> = {
	"soma-search.sh": "Query memory by type/status/tags/domain. `--deep` for TL;DR, `--brief` for breadcrumbs, `--missing-tldr` for audit",
	"soma-scan.sh": "Scan frontmatter across docs. `--stale` for outdated, `--type`/`--status` filters",
	"soma-tldr.sh": "Generate TL;DR/digest sections via Haiku. `--scan` gaps, `--batch` all, `--dry-run`",
	"gh-app-token.sh": "Source to get `$GH_APP_TOKEN` for meetsoma[bot] auth (1hr)",
	"soma-init.sh": "Scaffold new .soma/ directory for a project",
	"soma-skill.sh": "Manage soma skills (install, list)",
	"soma-snapshot.sh": "Rolling backup snapshots of .soma/",
	"protocol-sync.sh": "Sync operational protocols from upstream specs",
	"frontmatter-date-hook.sh": "Git pre-commit hook: auto-update `updated:` in frontmatter",
};

export default function somaBootExtension(pi: ExtensionAPI) {

	let soma: SomaDir | null = null;
	let settings: SomaSettings | null = null;
	let protocolState: ProtocolState | null = null;
	let protocolsReferenced = new Set<string>();
	let musclesReferenced = new Set<string>();
	let knownProtocolNames: string[] = [];
	let knownMuscleNames: string[] = [];
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

		// Settings (merged from chain: project overrides parent overrides global)
		settings = loadSettings(chain);

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

		// Protocols (discover from chain, filter by project signals — G6)
		const signals = detectProjectSignals(soma.projectDir);
		const protocols = discoverProtocolChain(chain, signals);
		knownProtocolNames = protocols.map(p => p.name);
		if (protocols.length > 0) {
			protocolState = loadProtocolState(soma);

			const protoThresholds = settings.protocols;

			if (!protocolState) {
				// G1: First boot — bootstrap state from heat-default values
				protocolState = bootstrapProtocolState(protocols, protoThresholds);
				saveProtocolState(soma, protocolState);
			} else {
				// Sync: add entries for any new protocols discovered since last boot
				if (syncProtocolState(protocolState, protocols, protoThresholds)) {
					saveProtocolState(soma, protocolState);
				}
			}

			const injection = buildProtocolInjection(protocols, protocolState, protoThresholds);
			if (injection.systemPromptBlock.trim()) {
				parts.push(`\n---\n${injection.systemPromptBlock}`);
			}
		}

		// Muscles (discover from chain, load by heat within token budget)
		const muscles = discoverMuscleChain(chain);
		knownMuscleNames = muscles.map(m => m.name);
		if (muscles.length > 0) {
			const muscleInjection = buildMuscleInjection(muscles, settings.muscles);
			if (muscleInjection.systemPromptBlock.trim()) {
				parts.push(`\n---\n${muscleInjection.systemPromptBlock}`);
			}
			// Track load counts for loaded muscles
			const loaded = [...muscleInjection.hot, ...muscleInjection.warm];
			if (loaded.length > 0) {
				trackMuscleLoads(loaded);
			}
		}

		// Scripts (tooling awareness — agent needs to know it has hands)
		const scriptsDir = join(soma.path, "scripts");
		if (existsSync(scriptsDir)) {
			try {
				const scripts = readdirSync(scriptsDir).filter(f => f.endsWith(".sh"));
				if (scripts.length > 0) {
					const scriptLines = [
						"## Available Scripts\n",
						`Location: \`${scriptsDir}/\`\n`,
						"| Script | What it does |",
						"|--------|-------------|",
						...scripts.map(s => {
							const desc = SCRIPT_DESCRIPTIONS[s] || "—";
							return `| \`${s}\` | ${desc} |`;
						}),
						"",
						"Run with `bash <path>`. Use `--help` for options.",
						"",
					];
					parts.push(`\n---\n${scriptLines.join("\n")}`);
				}
			} catch { /* ignore */ }
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
		const decay = settings?.protocols.decayRate ?? 1;
		// Decay protocol heat
		if (protocolState) {
			applyDecay(protocolState, protocolsReferenced, decay);
			saveProtocolState(soma, protocolState);
		}
		// Decay muscle heat
		decayMuscleHeat(soma, musclesReferenced, decay);
	});

	// -------------------------------------------------------------------
	// G2: Mid-session heat tracking — auto-detect from tool results (PI132)
	// -------------------------------------------------------------------

	// Detection rules: map tool actions to protocol/muscle names
	const HEAT_RULES: Array<{
		match: (toolName: string, input: any, output: string) => boolean;
		target: string;  // protocol or muscle name
		type: "protocol" | "muscle";
	}> = [
		// frontmatter-standard: agent writes a file with YAML frontmatter
		{
			match: (tool, input) =>
				tool === "write" &&
				typeof input?.content === "string" &&
				input.content.startsWith("---\n"),
			target: "frontmatter-standard",
			type: "protocol",
		},
		// git-identity: agent runs git config or git commit
		{
			match: (tool, input) =>
				tool === "bash" &&
				typeof input?.command === "string" &&
				/git (config|commit|push|remote)/.test(input.command),
			target: "git-identity",
			type: "protocol",
		},
		// breath-cycle: agent writes a preload file
		{
			match: (tool, input) =>
				tool === "write" &&
				typeof input?.path === "string" &&
				/preload|continuation/.test(input.path),
			target: "breath-cycle",
			type: "protocol",
		},
		// svg-logo-design muscle: agent writes SVG
		{
			match: (tool, input) =>
				tool === "write" &&
				typeof input?.path === "string" &&
				input.path.endsWith(".svg"),
			target: "svg-logo-design",
			type: "muscle",
		},
		// github-app-auth muscle: agent uses gh-app-token or GH_APP_TOKEN
		{
			match: (tool, input) =>
				tool === "bash" &&
				typeof input?.command === "string" &&
				/gh-app-token|GH_APP_TOKEN/.test(input.command),
			target: "github-app-auth",
			type: "muscle",
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

	// -------------------------------------------------------------------
	// /pin and /kill commands — manual heat overrides (PI132)
	// -------------------------------------------------------------------

	pi.registerCommand("pin", {
		description: "Pin a protocol or muscle to hot — keeps it loaded across sessions",
		handler: async (args, ctx) => {
			const name = args.trim();
			if (!name) {
				ctx.ui.notify("Usage: /pin <protocol-or-muscle-name>", "info");
				return;
			}
			if (!soma || !protocolState) {
				ctx.ui.notify("No soma booted", "error");
				return;
			}

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

	pi.registerCommand("kill", {
		description: "Kill a protocol or muscle — drops heat to zero",
		handler: async (args, ctx) => {
			const name = args.trim();
			if (!name) {
				ctx.ui.notify("Usage: /kill <protocol-or-muscle-name>", "info");
				return;
			}
			if (!soma || !protocolState) {
				ctx.ui.notify("No soma booted", "error");
				return;
			}

			if (knownProtocolNames.includes(name)) {
				recordHeatEvent(protocolState, name, "killed");
				saveProtocolState(soma, protocolState);
				ctx.ui.notify(`💀 ${name} killed (heat → 0)`, "info");
			} else if (knownMuscleNames.includes(name)) {
				bumpMuscleHeat(soma, name, -15); // Force to 0 (clamped in bumpMuscleHeat)
				ctx.ui.notify(`💀 ${name} killed (heat → 0)`, "info");
			} else {
				ctx.ui.notify(`Unknown protocol or muscle: ${name}`, "error");
			}
		},
	});

	// -------------------------------------------------------------------
	// /exhale command (was /flush — breath-cycle alignment, D012)
	// -------------------------------------------------------------------

	const exhaleHandler = async (_args: string, ctx: any) => {
		if (!soma) {
			ctx.ui.notify("No .soma/ found. Run /soma init first.", "error");
			return;
		}

		const memDir = join(soma.path, "memory");
		const preloadPath = join(memDir, "preload-next.md");
		const today = new Date().toISOString().split("T")[0];
		const logPath = join(memDir, "sessions", `${today}.md`);

		// Save protocol heat state on exhale
		const decay = settings?.protocols.decayRate ?? 1;
		if (protocolState && soma) {
			applyDecay(protocolState, protocolsReferenced, decay);
			saveProtocolState(soma, protocolState);
		}
		// Decay muscle heat on exhale
		if (soma) {
			decayMuscleHeat(soma, musclesReferenced, decay);
		}

		pi.sendUserMessage(
			`[EXHALE — save session state]\n\n` +
			`**Step 1:** Commit all uncommitted work.\n\n` +
			`**Step 2:** Write \`${preloadPath}\` — compact session state:\n` +
			`- What shipped this session\n` +
			`- Key files changed\n` +
			`- What's next (priority order)\n` +
			`- What NOT to re-read\n\n` +
			`**Step 3:** Append to \`${logPath}\` — daily session log.\n\n` +
			`**Step 4:** Say "FLUSH COMPLETE".`,
			{ deliverAs: "followUp" }
		);

		ctx.ui.notify("Exhale initiated — heat will be saved, preload is your continuation prompt", "info");
	};

	pi.registerCommand("exhale", {
		description: "Exhale — save session state for next inhale (breath-cycle protocol)",
		handler: exhaleHandler,
	});

	// Backward compat: /flush still works (D012)
	pi.registerCommand("flush", {
		description: "Alias for /exhale — save session state",
		handler: exhaleHandler,
	});

	// -------------------------------------------------------------------
	// /breathe command — exhale + auto-continue (seamless session rotation)
	// -------------------------------------------------------------------

	pi.registerCommand("breathe", {
		description: "Breathe — save state and continue in a fresh session (exhale + inhale)",
		handler: async (_args, ctx) => {
			if (!soma) {
				ctx.ui.notify("No .soma/ found. Run /soma init first.", "error");
				return;
			}

			const memDir = join(soma.path, "memory");
			const preloadPath = join(memDir, "preload-next.md");
			const today = new Date().toISOString().split("T")[0];
			const logPath = join(memDir, "sessions", `${today}.md`);

			// Save heat state (same as exhale)
			const decay = settings?.protocols.decayRate ?? 1;
			if (protocolState && soma) {
				applyDecay(protocolState, protocolsReferenced, decay);
				saveProtocolState(soma, protocolState);
			}
			if (soma) {
				decayMuscleHeat(soma, musclesReferenced, decay);
			}

			pi.sendUserMessage(
				`[BREATHE — save and continue]\n\n` +
				`**Step 1:** Commit all uncommitted work.\n\n` +
				`**Step 2:** Write \`${preloadPath}\` — compact session state:\n` +
				`- What shipped this session\n` +
				`- Key files changed\n` +
				`- What's next (priority order)\n` +
				`- What NOT to re-read\n\n` +
				`**Step 3:** Append to \`${logPath}\` — daily session log.\n\n` +
				`**Step 4:** Say "BREATHE COMPLETE — starting fresh inhale" then use /auto-continue to rotate.`,
				{ deliverAs: "followUp" }
			);

			ctx.ui.notify("🫁 Breathing — exhale then auto-continue into fresh session", "info");
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
	// /inhale command — start fresh session (breath-cycle alignment, D012)
	// -------------------------------------------------------------------

	pi.registerCommand("inhale", {
		description: "Inhale — start fresh session, loading identity + memory + protocols",
		handler: async (_args, ctx) => {
			if (!soma) {
				ctx.ui.notify("No .soma/ — nothing to inhale. Run /soma init first.", "info");
				return;
			}

			const preload = findPreload(soma);
			if (preload && !preload.stale) {
				ctx.ui.notify(
					`🫁 Fresh preload ready (${Math.floor(preload.ageHours)}h ago). Hit Ctrl+N to inhale — preload will auto-load.`,
					"info"
				);
			} else {
				ctx.ui.notify(
					"🫁 No fresh preload. Hit Ctrl+N for clean inhale (identity + protocols only).",
					"info"
				);
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
