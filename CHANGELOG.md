# Changelog

All notable changes to the Soma agent are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versioning follows [Semantic Versioning](https://semver.org/).

---

## [0.5.0] — 2026-03-12

### Added
- **`/auto-commit` command** — toggle `.soma/` auto-commit on exhale/breathe (`on|off|status`).
- **Auto-commit `.soma/` state** — `.soma/` changes committed to local git on every exhale/breathe. Configurable via `settings.checkpoints.soma.autoCommit`.
- **`/pin` and `/kill` invalidate prompt cache** — heat changes take effect on the next turn, not next session.
- **`/soma prompt` diagnostic** — shows compiled sections, identity status, heat levels, context %, and runtime state.
- **Improved preload template** — DRY'd exhale/breathe preload instructions with `buildPreloadInstructions()` helper.
- **`sync-to-cli.sh`** — one-command sync from agent to CLI repo.
- **`sync-to-website.sh`** — sync docs to website with frontmatter preservation.

### Changed
- **Command cleanup** — removed `/flush` (redundant alias for `/exhale`). Folded `/preload` into `/soma preload` and `/debug` into `/soma debug on|off`. 19 commands → 15, clearer surface.
- **`system-core.md` rewrite** — day-one user focused. Commands table, "How to Work" section, actionable not descriptive.
- **CI improvements** — PR check and release workflows now run all 10 test suites. Release uses full `sync-from-agent.sh` instead of hardcoded doc list.

### Fixed
- **System prompt dropped after turn 1** — Pi resets to base each `before_agent_start`. Now caches compiled prompt and returns it every turn.
- **Identity never in compiled prompt** — `isPiDefaultPrompt()` checked for "inside pi" but Soma CLI says "inside Soma". Phase 3 full replacement never activated.
- **Context warnings never fired** — `getContextUsage()` returns undefined on turn 1. Now handles gracefully with `usage?.percent ?? 0`.
- **Identity lost after /auto-continue or /breathe** — `session_switch` cleared `builtIdentity` but not `compiledSystemPrompt`, and never rebuilt identity. Now rebuilds from chain and clears prompt cache.
- **Guard false positive on `2>/dev/null`** — stderr redirects no longer trigger write warnings.
- **Preload auto-injected on continue/resume** — `soma -c` and `soma -r` no longer auto-inject preloads (session already has its full history).
- **`/soma prompt` crash** — `getProtocolHeat` was used but never imported.
- **Audit false positives** — all 11 audit scripts improved. Settings audit recognizes all valid keys. Drift audit skips hub-only protocols. PII audit excludes example emails. Test audit counts all 255 tests correctly.

---

## [0.4.0] — 2026-03-11

### Added
- **Compiled system prompt ("Frontal Cortex")** — `core/prompt.ts` assembles complete system prompt from identity chain, protocol summaries, muscle digests, dynamic tool section. Replaces Pi's default prompt entirely when detected; falls back to prepend for custom SYSTEM.md.
- **Session-scoped preloads** — `preload-<sessionId>.md` prevents multi-terminal conflicts.
- **Identity in system prompt** — moved from boot user message for better token caching.
- **Parent-child inheritance** — `inherit: { identity, protocols, muscles, tools }` in settings.
- **Persona support** — `persona: { name, emoji, icon }` for named agent instances.
- **Smart init** — `detectProjectContext()` scans for parent .soma/, CLAUDE.md, project signals, package manager.
- **`systemPrompt` settings** — toggle docs, guard, CLAUDE.md awareness in system prompt assembly.
- **`prompts/system-core.md`** — static behavioral DNA skeleton for system prompt.
- **Debug mode** — `.soma/debug/` logging, `/soma debug on|off`.
- **Protocol graduation** — heat decay floor, frontmatter enforcement nudges, preload quality validation, git identity pre-commit hook.
- **Configurable boot sequence** — `settings.boot.steps` array.
- **Git context on boot** — `git-context` boot step injects recent commits and changed files.
- **Configurable context warnings** — `settings.context` thresholds.

### Changed
- **Extension ownership refactor** — `soma-boot.ts` owns lifecycle + commands. `soma-statusline.ts` owns rendering + keepalive.
- **Boot user message trimmed** — identity, protocol breadcrumbs, and muscle digests moved to system prompt.
- **CLAUDE.md awareness, not adoption** — system prompt notes existence but doesn't inject content.

### Fixed
- Print-mode race condition — `ctx.hasUI` guard on `sendUserMessage` in `session_start`.
- Skip scaffolding core extensions into project `.soma/extensions/`.
- Template placeholder substitution on install.

---

## [0.3.0] — 2026-03-10

### Added
- **AMPS content type system** — 4 shareable types: Automations, Muscles, Protocols, Skills. `scope` field (bundled/hub) controls distribution. `depends-on` for cross-type dependencies.
- **Hub commands** — `/install <type> <name>`, `/list local|remote`. Templates resolve dependencies.
- **`core/content-cli.ts`** — non-interactive content commands for CLI wiring.
- **`core/install.ts`** — hub content installation with dependency resolution.
- **`core/prompt.ts`** — compiled system prompt assembly (12th core module).
- **`soma-guard.ts` extension** — safe file operation enforcement. `/guard-status` command.
- **`soma-audit.sh`** — ecosystem health check orchestrating 11 focused audits.
- **`/rest` command** — disable cache keepalive + exhale.
- **`/keepalive` command** — toggle cache keepalive on/off/status.
- **`/status` command** — footer status display.
- **Cache keepalive system** — 300s TTL, 45s threshold, 30s cooldown. Auto-ping on idle.
- **Session checkpoints** — `.soma/` committed every exhale (local git).
- **Test suites** — 10 bash test scripts, 255 passing.
- **Workspace scripts** — `soma-scan.sh`, `soma-search.sh`, `soma-snapshot.sh`, `soma-tldr.sh`.
- **`_tool-template.ts`** — starter template for agent-created extensions.

### Changed
- **Distribution scope** — bundled protocols slimmed from all to 4 (breath-cycle, heat-tracking, session-checkpoints, pattern-evolution). Hub protocols install via templates.

### Fixed
- PII scrubbed from git history across all repos.
- CLI stripped to distribution only — agent is source of truth.

---

## [0.2.0] — 2026-03-09

### Added
- **Protocols & Heat System** — behavioral rules loaded by temperature. Heat rises through use, decays through neglect.
- **Muscle loading at boot** — sorted by heat, loaded within configurable token budget.
- **Settings chain** — `settings.json` with resolution: project → parent → global.
- **Mid-session heat tracking** — auto-detects protocol usage from tool results.
- **Domain scoping** — `applies-to` frontmatter + `detectProjectSignals()`.
- **Breath cycle commands** — `/exhale`, `/inhale`, `/pin`, `/kill`.
- **Script awareness** — boot surfaces `.soma/scripts/` inventory.
- **9 core modules** — discovery, identity, protocols, muscles, settings, init, preload, utils, index.

### Fixed
- Extensions load correctly.
- Skills install to correct path.
- Startup shows Soma changelog.

---

## [0.1.0] — 2026-03-08

### Born
- σῶμα (sōma) — *Greek for "body."* The vessel that grows around you.
- Built on Pi with `piConfig.configDir: ".soma"`.
- Identity system: `.soma/identity.md` — discovered, not configured.
- Memory structure: `.soma/memory/` — muscles, sessions, preloads.
- Breath cycle concept: sessions exhale what was learned, next session inhales it.
- 9 core modules, 4 extensions, logo through 36 SVG iterations.
