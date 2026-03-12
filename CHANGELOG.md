# Changelog

All notable changes to the Soma agent are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- **AMPS content type system** — 4 shareable types: Automations, Muscles, Protocols, Skills. `scope` field (bundled/hub) controls distribution. `depends-on` for cross-type dependencies.
- **Compiled system prompt ("Frontal Cortex")** — `core/prompt.ts` assembles complete system prompt from identity chain, protocol summaries, muscle digests, dynamic tool section. Replaces Pi's default prompt entirely when detected; falls back to prepend for custom SYSTEM.md. 10 sections in assembly order: static core → identity → protocol breadcrumbs → muscle digests → tools → guard → docs → CLAUDE.md awareness → skills → date/time.
- **Waves 0.5–5 features:**
  - Session-scoped preloads (`preload-<sessionId>.md`) — prevents multi-terminal conflicts
  - Identity in system prompt (moved from boot user message) — better token caching
  - Parent-child inheritance — `inherit: { identity, protocols, muscles, tools }` in settings
  - Persona support — `persona: { name, emoji, icon }` for named agent instances
  - Smart init — `detectProjectContext()` scans for parent .soma/, CLAUDE.md, project signals, package manager
  - `/soma prompt` command — preview compiled system prompt
  - `systemPrompt` settings section — toggle docs, guard, CLAUDE.md awareness
- **`prompts/system-core.md`** — static behavioral DNA skeleton (~250 tokens).
- **`soma-guard.ts` extension** — safe file operation enforcement. `/guard-status` command.
- **`soma-audit.sh`** — ecosystem health check orchestrating 11 focused audits.
- **Hub commands** — `/install <type> <name>`, `/list local|remote`. Templates resolve dependencies.
- **`core/content-cli.ts`** — non-interactive content commands for CLI wiring.
- **`core/install.ts`** — hub content installation with dependency resolution.
- **`core/prompt.ts`** — compiled system prompt assembly (12th core module, up from 9 at v0.1.0).
- **`prompt-preview.ts`** — dry run tool with 10 test scenarios for compiled prompt.
- **Session checkpoints** — `.soma/` committed every exhale (local git). Configurable via `settings.checkpoints`.
- **Protocol graduation** — heat decay floor, frontmatter enforcement nudges, preload quality validation, git identity pre-commit hook, configurable core file protection tiers.
- **`/rest` command** — disable cache keepalive + exhale.
- **`/keepalive` command** — toggle cache keepalive on/off/status (soma-statusline.ts).
- **`/status` command** — footer status display (soma-statusline.ts).
- **Cache keepalive system** — 300s TTL, 45s threshold, 30s cooldown. Auto-ping on idle. ◷ cache TTL in footer.
- **Test suites** — 9 bash test scripts, 230/230 passing. Covers: protocols, muscles, settings, init, discovery, identity, preload, utils, applies-to.
- **Workspace scripts** — `soma-scan.sh`, `soma-search.sh`, `soma-snapshot.sh`, `soma-tldr.sh` (query memory, scan frontmatter, snapshot .soma/, generate TL;DRs).
- **`_tool-template.ts`** — starter template for agent-created extensions.
- **Configurable boot sequence** — `settings.boot.steps` array.
- **Git context on boot** — `git-context` boot step injects recent commits and changed files.
- **Configurable context warnings** — `settings.context` thresholds.
- **`/auto-commit` command** — toggle `.soma/` auto-commit on exhale/breathe (`on|off|status`).
- **Auto-commit `.soma/` state** — on exhale and breathe, `.soma/` changes are committed to local git automatically. Configurable via `settings.checkpoints.soma.autoCommit`.
- **`/pin` and `/kill` invalidate prompt cache** — heat changes take effect on the next turn, not next session (`ec7b8fe`).
- **`/soma prompt` diagnostic** — shows compiled sections, identity status, heat levels, context %, and runtime state (`4dc477c`).
- **Improved preload template** — DRY'd exhale/breathe preload instructions with `buildPreloadInstructions()` helper (`9bcef17`).

### Changed
- **Extension ownership refactor** — `soma-boot.ts` owns lifecycle + commands. `soma-statusline.ts` owns rendering + keepalive.
- **Boot user message trimmed** — identity, protocol breadcrumbs, and muscle digests moved to system prompt. Only hot full bodies remain in boot message.
- **CLAUDE.md awareness, not adoption** — system prompt notes existence but doesn't inject content.
- **Distribution scope** — bundled protocols slimmed from all to 4 (breath-cycle, heat-tracking, session-checkpoints, pattern-evolution). Hub protocols install via templates.

### Fixed
- **System prompt dropped after turn 1** — Pi resets to base each `before_agent_start`. Now caches compiled prompt and returns it every turn (`c0070c4`).
- **Identity never in compiled prompt** — `isPiDefaultPrompt()` checked for "inside pi" but Soma CLI says "inside Soma". Phase 3 full replacement never activated (`f9eadce`).
- **Context warnings never fired** — `getContextUsage()` returns undefined on turn 1. Now handles gracefully with `usage?.percent ?? 0` (`c0070c4`).
- **Identity lost after /auto-continue or /breathe** — `session_switch` cleared `builtIdentity` but not `compiledSystemPrompt`, and never rebuilt identity. Now rebuilds identity from chain and clears prompt cache (`5d82af2`).
- **Guard false positive on `2>/dev/null`** — stderr redirects no longer trigger write warnings (`b162191`).
- **Preload auto-injected on continue/resume** — `soma -c` and `soma -r` no longer auto-inject preloads (session already has its full history) (`ae24532`).
- Print-mode race condition — `ctx.hasUI` guard on `sendUserMessage` in `session_start`.
- Skip scaffolding core extensions into project `.soma/extensions/`.
- Template placeholder substitution on install.
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
- **Breath cycle commands** — `/exhale` (alias: `/flush`), `/inhale`, `/pin`, `/kill`.
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
