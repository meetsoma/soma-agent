# Changelog

All notable changes to the Soma agent are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- **identity layer in pattern-evolution, tool-awareness in working-style**
- **Git hooks: auto-changelog + docs-drift nudge** — `post-commit` appends feat/fix entries to CHANGELOG.md automatically. `pre-push` warns when code changed but docs weren't updated. Non-blocking.
- **Bundled protocols: `correction-capture` + `detection-triggers`** — learning-agent protocols from ClawHub competitive analysis. Capture corrections as muscles, recognize when to log vs crystallize patterns.
- **Auto-breathe mode** — proactive context management. Triggers wrap-up at configurable %, auto-rotates at higher %. Safety net at 85% always on. Opt-in via `settings.json` `breathe.auto`.
- **`/auto-breathe` command** — runtime toggle for auto-breathe mode (`on|off|status`). Persists to settings.json.
- **Smarter `/breathe`** — context-aware instructions (light/full/urgent). Handles edge cases: preload already written, timeout after 4 turns, re-prompt after 2.
- **Cold-start muscle boost** — muscles created <48h get +3 effective heat so they load as digests for at least 2 sessions.
- **Orient-from preloads** — preload template includes `## Orient From` section pointing to files next session should read first.
- **`soma:recall` event signal** — extensions can listen for context pressure events (used by steno integration).
- **`soma-compat.sh`** — compatibility checker. Detects protocol/muscle overlap, redundancy, directive conflicts. Scores 0–100.
- **`soma-update-check.sh`** — compare local protocol/muscle versions against hub. `--update` to pull, `--json` for machine output.
- **`/scratch` command** — quick notes to `.soma/scratchpad.md`. Agent doesn't see it unless `/scratch read`. Append-only by default, `/scratch clear` to reset.
- **`guard.bashCommands` setting** — `"allow"` / `"warn"` / `"block"` for dangerous bash command prompts. Default `"warn"`. Set `"allow"` for power user mode (no confirmation prompts).
- **Automations system** — `.soma/automations/` directory for step-by-step procedural flows. First automation: `dev-session` (orient → pre-flight → plan → implement → ship → doc-refresh → wrap-up).
- **Polyglot script discovery** — boot discovers `.sh`, `.py`, `.ts`, `.js`, `.mjs` scripts (was `.sh` only). Description extractor handles `#`, `//`, and `"""` comment styles.
- **Auto-extract script descriptions** — script descriptions pulled from file headers automatically. Zero-config user scripts appear with descriptions in boot table.
- **`soma init --orphan`** — `--orphan`/`-o` flag sets all `inherit.*` to false for clean child projects with zero parent inheritance. Combines with `--template`.

### Changed
- **Config-first script extensions** — `settings.scripts.extensions` controls which file types are discovered. No more hardcoded lists.

### Fixed
- **Auto-breathe race condition** — `sendUserMessage` from `before_agent_start` raced with Pi's prompt processing. Now deferred to `agent_end` via pending message queue.
- **Auto-breathe phase 1 ignored by agent** — wrap-up trigger only added to system prompt + UI toast, which agents don't reliably act on. Now sends a followUp user message so the agent actually responds.
- **Bash guard false positive on `>>`** — append redirects (`>>`) no longer trigger the dangerous redirect guard. Only single `>` to root paths triggers.
- **CLI docs not syncing** — `sync-from-agent.sh` was missing `docs/` copy step. All 14 doc files now sync.
- **New protocols missing breadcrumbs/TL;DRs** — correction-capture and detection-triggers now pass all protocol tests.
- **Settings audit false positive** — `breathe` and `steno` recognized as valid top-level settings keys.

---

## [0.5.0] — 2026-03-12

### Added
- **identity layer in pattern-evolution, tool-awareness in working-style**
- **post-commit auto-changelog + pre-push docs-drift nudge**
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
- **identity layer in pattern-evolution, tool-awareness in working-style**
- **post-commit auto-changelog + pre-push docs-drift nudge**
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
- **identity layer in pattern-evolution, tool-awareness in working-style**
- **post-commit auto-changelog + pre-push docs-drift nudge**
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
- **identity layer in pattern-evolution, tool-awareness in working-style**
- **post-commit auto-changelog + pre-push docs-drift nudge**
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
