/**
 * soma-route.ts — Capability Router for Soma Extensions
 * ======================================================
 *
 * WHY THIS EXISTS:
 * ----------------
 * Pi extensions can't import from each other. They share a process but have no
 * clean way to call each other's functions. Before this router, we used globalThis
 * hacks (e.g. `globalThis.__somaKeepalive`) — fragile, untyped, undiscoverable.
 *
 * The router solves three problems:
 * 1. **Capability sharing** — one extension provides a function, others consume it.
 *    Example: /inhale command provides `session:new`, turn_end handler consumes it.
 * 2. **Signal broadcasting** — one extension emits, many listen.
 *    Example: boot emits `breathe:start`, statusline pauses keepalive.
 * 3. **Hot-swap readiness** — capabilities are late-bound. If an extension reloads,
 *    it re-provides its capabilities. Consumers get `null` in the gap, not a crash.
 *
 * HOW IT WORKS:
 * -------------
 * The router lives on `globalThis.__somaRoute` so all extensions can access it
 * without imports. It provides two patterns:
 *
 *   **Capabilities** (provide/get/revoke):
 *   One provider, many consumers. Like a service registry.
 *   ```
 *   route.provide("session:new", ctx.newSession);     // provider
 *   const fn = route.get("session:new");               // consumer
 *   if (fn) await fn({});
 *   ```
 *
 *   **Signals** (emit/on):
 *   Many emitters, many listeners. Fire-and-forget events.
 *   ```
 *   route.emit("breathe:start", { pct: 70 });          // emitter
 *   route.on("breathe:start", (data) => { ... });       // listener
 *   ```
 *
 * LOADING ORDER:
 * --------------
 * Pi loads extensions sequentially in discovery order. The router initializes
 * on globalThis during module load (not in session_start), so it's available
 * immediately when other extensions load. If soma-route.ts loads after another
 * extension, that extension can still provide/consume — the registry is just
 * a Map, and capabilities are typically provided in event handlers (runtime),
 * not at load time.
 *
 * For safety, access the router via `getRoute()` which returns null if not
 * initialized. Never cache the router reference — always call `getRoute()`.
 *
 * PI CONTEXT TYPES (important for understanding capabilities):
 * ------------------------------------------------------------
 * Pi has two context types for extension handlers:
 *
 *   **ExtensionContext** — available in ALL event handlers (session_start, turn_end,
 *   before_agent_start, tool_result, etc.). Has:
 *     - ctx.getContextUsage()   — current token usage
 *     - ctx.compact()           — trigger compaction
 *     - ctx.getSystemPrompt()   — read system prompt
 *     - ctx.sessionManager      — read session entries
 *     - ctx.ui.notify()         — show UI notifications
 *     - ctx.hasUI               — check if UI is available
 *
 *   **ExtensionCommandContext** — available ONLY in command handlers (/inhale,
 *   /breathe, etc.). Extends ExtensionContext with:
 *     - ctx.newSession()        — start a fresh session (clears all messages)
 *     - ctx.fork()              — fork from an entry
 *     - ctx.navigateTree()      — navigate session tree
 *     - ctx.switchSession()     — switch to a different session file
 *     - ctx.reload()            — reload extensions
 *     - ctx.waitForIdle()       — wait for agent to stop streaming
 *
 *   This means: if turn_end needs to call newSession(), it CAN'T — unless
 *   a command handler captured it and shared it via the router.
 *
 * SENDUSERMESSAGE GOTCHA:
 * -----------------------
 * pi.sendUserMessage() passes `expandPromptTemplates: false` internally.
 * This means sending "/inhale" via sendUserMessage does NOT execute the
 * /inhale command — it's sent as literal text to the LLM. Commands can
 * ONLY be triggered by user input or by calling the handler directly.
 * The router's capability pattern solves this — capture the handler or
 * the context method, share it, call it from anywhere.
 *
 * CAPABILITY CATALOG:
 * -------------------
 * Pre-defined routes. Providers register when they have the capability.
 * Consumers check availability at call time. `null` = not yet available.
 *
 * | Route                  | Type       | Provider         | Description                                    |
 * |------------------------|------------|------------------|------------------------------------------------|
 * | session:new            | capability | soma-boot        | Start fresh session (newSession from command)   |
 * | session:fork           | capability | (future)         | Fork session from entry                         |
 * | session:navigate       | capability | (future)         | Navigate session tree                           |
 * | session:switch         | capability | (future)         | Switch to different session file                |
 * | session:reload         | capability | (future)         | Reload all extensions                           |
 * | session:waitForIdle    | capability | (future)         | Wait for agent to finish streaming              |
 * | session:compact        | capability | soma-boot        | Trigger context compaction                      |
 * | context:usage          | capability | soma-boot        | Get current context token usage                 |
 * | context:systemPrompt   | capability | soma-boot        | Get current system prompt                       |
 * | ui:notify              | capability | soma-boot        | Show UI notification                            |
 * | keepalive:toggle       | capability | soma-statusline  | Enable/disable keepalive timer                  |
 * | keepalive:status       | capability | soma-statusline  | Get keepalive enabled + remaining seconds       |
 * | message:send           | capability | soma-boot        | Send user message (NOT as command — see gotcha) |
 * | message:steer          | capability | (future)         | Steer agent during streaming                    |
 * | tools:active           | capability | (future)         | Get/set active tools                            |
 * | model:set              | capability | (future)         | Change model                                    |
 * | model:thinking         | capability | (future)         | Get/set thinking level                          |
 * |                        |            |                  |                                                |
 * | breathe:start          | signal     | soma-boot        | Breathe rotation initiated (pct, reason)        |
 * | breathe:complete       | signal     | soma-boot        | Rotation finished, new session started          |
 * | breathe:cancel         | signal     | soma-boot        | Rotation cancelled (timeout, error)             |
 * | preload:written        | signal     | soma-boot        | Preload file detected (path, lineCount)         |
 * | preload:stale          | signal     | soma-boot        | Post-preload work detected (toolCalls)          |
 * | context:threshold      | signal     | soma-boot        | Context crossed a threshold (pct, level)        |
 * | session:booted         | signal     | soma-boot        | Boot discovery complete (isResumed, somaPath)   |
 * | guard:warn             | signal     | soma-guard       | File protection warning (path, rule)            |
 * | guard:block            | signal     | soma-guard       | File protection blocked (path, rule)            |
 * | recall:trigger         | signal     | soma-boot        | Memory recall requested (reason, pct)           |
 * | heat:changed           | signal     | (future)         | Heat value changed (name, type, old, new)       |
 *
 * MIGRATION FROM globalThis:
 * --------------------------
 * Old:  (globalThis as any).__somaKeepalive.enabled = false;
 * New:  const toggle = route.get("keepalive:toggle");
 *       if (toggle) toggle(false);
 *
 * Old:  const ka = (globalThis as any).__somaKeepalive;
 *       if (ka) { ka.enabled = true; }
 * New:  route.get("keepalive:toggle")?.(true);
 *
 * HOT-SWAP PATTERN:
 * -----------------
 * When an extension reloads (e.g. via /reload or future hot-swap):
 * 1. Old extension's capabilities become stale (functions point to old closure)
 * 2. Router doesn't auto-clean — the new extension calls provide() again,
 *    which overwrites the old reference
 * 3. Consumers always call get() fresh — they never cache the function
 * 4. Between unload and reload, get() returns the stale function (harmless
 *    if extension state was cleared) or null (if revoke() was called)
 *
 * For clean hot-swap, extensions should:
 *   - Call route.revoke("my:capability") in a shutdown handler
 *   - Call route.provide("my:capability", newFn) on reload
 *   - Consumers handle null gracefully (always check get() result)
 *
 * RELATED FILES:
 * - soma-boot.ts      — primary provider (session, context, breathe signals)
 * - soma-statusline.ts — keepalive provider
 * - soma-guard.ts      — guard signal emitter
 * - soma-scratch.ts    — (future) scratch:save capability
 * - event-bus.ts       — Pi's built-in event system (pi.events)
 *   We use pi.events for Pi-level events (soma:recall) and the router
 *   for inter-extension communication. Don't mix them.
 *
 * @ships yes — this is a core extension, not workspace-only
 */

import type { ExtensionAPI } from "@anthropic-ai/claude-code";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A capability is a function provided by one extension and consumed by others.
 * The generic allows typed get() calls, but in practice most consumers cast.
 */
type Capability = (...args: any[]) => any;

/**
 * A signal handler receives arbitrary data from the emitter.
 */
type SignalHandler = (data: any) => void;

/**
 * Metadata about a provided capability — who provided it and when.
 * Useful for debugging and for hot-swap: you can check if a capability
 * was provided by a stale extension.
 */
interface CapabilityEntry {
	fn: Capability;
	provider: string;      // extension name that provided it (e.g. "soma-boot")
	providedAt: number;    // Date.now() when provided
	description?: string;  // human-readable note
}

/**
 * The router instance. Lives on globalThis.__somaRoute.
 * All methods are safe to call at any time — they never throw.
 */
interface SomaRoute {
	// ── Capabilities (one provider, many consumers) ──────────────────

	/**
	 * Register a capability. Overwrites any previous provider.
	 * Call this when your extension has a function others might need.
	 *
	 * @param name   Route name (e.g. "session:new", "keepalive:toggle")
	 * @param fn     The function to share
	 * @param meta   Optional metadata (provider name, description)
	 *
	 * @example
	 *   // In /inhale command handler (has ExtensionCommandContext):
	 *   route.provide("session:new", ctx.newSession, {
	 *     provider: "soma-boot",
	 *     description: "Start fresh session — clears all messages, fires session_switch"
	 *   });
	 */
	provide(name: string, fn: Capability, meta?: { provider?: string; description?: string }): void;

	/**
	 * Get a capability. Returns null if not yet provided.
	 * ALWAYS check for null — capabilities are late-bound.
	 * NEVER cache the result — always call get() fresh.
	 *
	 * @example
	 *   const newSession = route.get("session:new");
	 *   if (newSession) await newSession({});
	 *   else ctx.ui.notify("session:new not available yet", "warning");
	 */
	get(name: string): Capability | null;

	/**
	 * Remove a capability. Call on extension shutdown for clean hot-swap.
	 * After revoke, get() returns null until re-provided.
	 */
	revoke(name: string): void;

	/**
	 * Check if a capability is registered (even if the function might be stale).
	 */
	has(name: string): boolean;

	/**
	 * Get metadata about a capability (provider, timestamp, description).
	 * Returns null if not provided.
	 */
	meta(name: string): Omit<CapabilityEntry, "fn"> | null;

	// ── Signals (many emitters, many listeners) ──────────────────────

	/**
	 * Emit a signal. All registered listeners fire (async, errors caught).
	 * Fire-and-forget — emitter doesn't wait for listeners.
	 *
	 * @example
	 *   route.emit("breathe:start", { pct: 72, reason: "auto-breathe-rotate" });
	 */
	emit(signal: string, data?: any): void;

	/**
	 * Listen for a signal. Returns unsubscribe function.
	 *
	 * @example
	 *   const unsub = route.on("breathe:start", (data) => {
	 *     console.log(`Breathe starting at ${data.pct}%`);
	 *   });
	 *   // Later: unsub();
	 */
	on(signal: string, handler: SignalHandler): () => void;

	// ── Introspection ────────────────────────────────────────────────

	/**
	 * List all registered capability names.
	 * Useful for debugging: route.capabilities() → ["session:new", "keepalive:toggle", ...]
	 */
	capabilities(): string[];

	/**
	 * List all signal names that have listeners.
	 */
	signals(): string[];

	/**
	 * Full debug dump — capabilities with metadata, signal listener counts.
	 */
	debug(): { capabilities: Record<string, Omit<CapabilityEntry, "fn">>; signals: Record<string, number> };

	/**
	 * Router version. Bump when the interface changes.
	 */
	version: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Implementation
// ─────────────────────────────────────────────────────────────────────────────

function createSomaRoute(): SomaRoute {
	const caps = new Map<string, CapabilityEntry>();
	const sigs = new Map<string, Set<SignalHandler>>();

	return {
		version: "1.0.0",

		// ── Capabilities ───────────────────────────────────────────────

		provide(name, fn, meta) {
			caps.set(name, {
				fn,
				provider: meta?.provider ?? "unknown",
				providedAt: Date.now(),
				description: meta?.description,
			});
		},

		get(name) {
			return caps.get(name)?.fn ?? null;
		},

		revoke(name) {
			caps.delete(name);
		},

		has(name) {
			return caps.has(name);
		},

		meta(name) {
			const entry = caps.get(name);
			if (!entry) return null;
			const { fn: _, ...rest } = entry;
			return rest;
		},

		// ── Signals ────────────────────────────────────────────────────

		emit(signal, data) {
			const handlers = sigs.get(signal);
			if (!handlers) return;
			for (const handler of handlers) {
				try {
					// Fire-and-forget — don't await, don't block
					Promise.resolve(handler(data)).catch((err) => {
						console.error(`[soma-route] signal handler error (${signal}):`, err);
					});
				} catch (err) {
					console.error(`[soma-route] signal handler threw (${signal}):`, err);
				}
			}
		},

		on(signal, handler) {
			if (!sigs.has(signal)) sigs.set(signal, new Set());
			sigs.get(signal)!.add(handler);
			// Return unsubscribe function
			return () => {
				sigs.get(signal)?.delete(handler);
				// Clean up empty sets
				if (sigs.get(signal)?.size === 0) sigs.delete(signal);
			};
		},

		// ── Introspection ──────────────────────────────────────────────

		capabilities() {
			return [...caps.keys()];
		},

		signals() {
			return [...sigs.keys()];
		},

		debug() {
			const capDump: Record<string, Omit<CapabilityEntry, "fn">> = {};
			for (const [name, entry] of caps) {
				const { fn: _, ...rest } = entry;
				capDump[name] = rest;
			}
			const sigDump: Record<string, number> = {};
			for (const [name, handlers] of sigs) {
				sigDump[name] = handlers.size;
			}
			return { capabilities: capDump, signals: sigDump };
		},
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Global Access
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the router instance. Returns null if not initialized.
 * This is the ONLY way other extensions should access the router.
 *
 * Usage in other extensions:
 * ```typescript
 * function getRoute(): SomaRoute | null {
 *   return (globalThis as any).__somaRoute ?? null;
 * }
 * ```
 *
 * Or inline:
 * ```typescript
 * const route = (globalThis as any).__somaRoute;
 * route?.get("session:new")?.({});
 * ```
 */
function getRoute(): SomaRoute | null {
	return (globalThis as any).__somaRoute ?? null;
}

/**
 * Initialize the router on globalThis. Idempotent — if a router already
 * exists (e.g. from a previous load), it's preserved to maintain capability
 * registrations across reloads.
 *
 * Returns the (possibly pre-existing) router instance.
 */
function initRoute(): SomaRoute {
	if (!(globalThis as any).__somaRoute) {
		(globalThis as any).__somaRoute = createSomaRoute();
	}
	return (globalThis as any).__somaRoute;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extension Entry Point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Soma Route Extension
 *
 * Initializes the capability router and provides /route command for debugging.
 * This extension should load early — but even if it loads late, the router
 * is initialized during module evaluation (before any event handlers fire).
 */
export default function somaRoute(pi: ExtensionAPI) {
	// Initialize immediately — available to all extensions from this point
	const route = initRoute();

	// ─── /route command — debug + introspection ────────────────────────
	pi.registerCommand("route", {
		description: "Soma Route — capability router status and debugging",
		getArgumentCompletions: (prefix: string) =>
			["status", "capabilities", "signals", "debug"]
				.filter((o) => o.startsWith(prefix))
				.map((o) => ({ value: o, label: o })),
		handler: async (args, ctx) => {
			const cmd = args.trim().toLowerCase() || "status";

			if (cmd === "status" || cmd === "capabilities") {
				const caps = route.capabilities();
				if (caps.length === 0) {
					ctx.ui.notify("📡 No capabilities registered yet", "info");
					return;
				}
				const lines = caps.map((name) => {
					const m = route.meta(name);
					const age = m ? `${Math.round((Date.now() - m.providedAt) / 1000)}s ago` : "?";
					const desc = m?.description ? ` — ${m.description}` : "";
					return `  ${name} (${m?.provider ?? "?"}, ${age})${desc}`;
				});
				ctx.ui.notify(`📡 Capabilities (${caps.length}):\n${lines.join("\n")}`, "info");
			}

			if (cmd === "signals" || cmd === "status") {
				const sigs = route.signals();
				if (sigs.length === 0) {
					ctx.ui.notify("📡 No signal listeners registered", "info");
					return;
				}
				const dump = route.debug();
				const lines = sigs.map((name) => `  ${name} (${dump.signals[name]} listeners)`);
				ctx.ui.notify(`📡 Signals (${sigs.length}):\n${lines.join("\n")}`, "info");
			}

			if (cmd === "debug") {
				const dump = route.debug();
				// Send as user message so the agent can read it
				pi.sendUserMessage(
					`[Soma Route Debug]\n\n` +
					`**Capabilities:**\n\`\`\`json\n${JSON.stringify(dump.capabilities, null, 2)}\n\`\`\`\n\n` +
					`**Signals:**\n\`\`\`json\n${JSON.stringify(dump.signals, null, 2)}\n\`\`\``,
					{ deliverAs: "followUp" }
				);
			}
		},
	});

	// ─── Lifecycle: clean up on shutdown ────────────────────────────────
	// Don't destroy the router on shutdown — it persists across reloads.
	// Extensions should revoke their own capabilities if they need clean teardown.
	pi.on("session_shutdown", async () => {
		// Log final state for debugging
		const dump = route.debug();
		const capCount = Object.keys(dump.capabilities).length;
		const sigCount = Object.keys(dump.signals).length;
		if (capCount > 0 || sigCount > 0) {
			// Just a debug breadcrumb — no UI needed during shutdown
			console.error(`[soma-route] shutdown: ${capCount} capabilities, ${sigCount} signal channels`);
		}
	});
}
