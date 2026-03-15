# Changelog

All notable changes to the Soma agent are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- Identity bootstrap with 4 sections: This Project, Voice, How I Work, Review & Evolve (#c5086ea)
- "How to Write Identity" guide in docs — what belongs in each section, when to review (#c5086ea)
- `soma inhale` CLI subcommand — fresh session with preload from last session (#f61064f)
- `soma` (no args) now starts clean — no preload injection (#f61064f)
- User interrupt detection during auto-breathe — 1st interrupt resets timer, 2nd cancels (#d530af8)
- Gum-formatted `--help` output with tables and styled header (cli #e20e6f6)
- `response-style` protocol — set voice, length, emoji, and format preferences (#50aee8a)
- Dignity clause in `correction-capture` — acknowledge without over-apologizing (#50aee8a)

### Fixed
- Warm protocol TL;DRs shortened from 400-555 to ~150 chars — saves ~1500 tokens per boot (#9008d43)
- `pre-flight` heat lowered from 8 (hot) to 5 (warm) — too heavy for empty repos (#9008d43)
- `scaffoldProtocols()` now copies ALL bundled protocols on init, not just breath-cycle (#9008d43)
- Auto-breathe grace period is now time-based (30s default) instead of turn-based (#8ca5e52)
- Preload trust hierarchy — boot instructions explicitly require stating resume point (#dfb5ca9)
- Hub protocol TL;DRs tightened (git-identity, session-checkpoints, tool-discipline) (#dd8c4cf)
- Breadcrumbs synced from community — consistent cross-repo references (#9461185)

---

## [0.5.2] — 2026-03-15

### Added
- `/scan-logs` command — search previous tool calls + results across sessions (#31a7e17)
- `/scrape` command + `scrape:build` router capability — intelligent doc discovery (#c950f2b)
- Boot session warnings injection — tool usage stats from previous session (#0cda314)
- Boot last conversation context — inject last N messages on fresh boot (#f1d7f3d)
- Periodic auto-commit for crash resilience (#c6caccc)
- `graceTurns` setting — configurable grace period before auto-breathe rotation (#c9ab5a8)
- Guard v2: tool→muscle gating — require reading muscles before dangerous commands (#1c6b725)
- Protocol TL;DR extraction — `protocolSummary()` prefers `## TL;DR` body section (#83ec9ee)
- Scratch lifecycle: session IDs, date sections, note management, auto-inject (#fd0bda2, #0d364f2)
- Combined session ID format (`sNN-<hex>`) — sequential for order, hex for uniqueness (#e7c4057)
- Statusline session ID display (#d474cbf)
- Polyglot script discovery — .sh, .py, .ts, .js, .mjs (#1acb8c2)
- Session log nudge with template at trigger point (#eb8acc8)
- Identity layer in pattern-evolution, tool-awareness in working-style (#5e4219d)
- Post-commit auto-changelog + pre-push docs-drift nudge hooks (#cc2ef55)

### Changed
- System prompt trimmed ~19% — remove duplication and stale content (#de9c517)
- Self-awareness protocols rewritten — 5 redundant protocols → configuration guides (#b70ca44)
- Config-first script extensions via `settings.scripts.extensions` (#dadb78e)
- Unified rotation through `/inhale`, removed `/auto-continue` (#7b7ba52)
- Migrated `globalThis.__somaKeepalive` to router (#e919481)

### Fixed
- Boot: clean up muscle/protocol/automation formatting (#38a643f)
- Boot: resume without fingerprint sends minimal boot, not full redundant injection (#7fd064b)
- Boot: grace countdown skips tool turns during auto-breathe (#53bd421)
- Boot: preload filename overwrites + rotation when preload pre-exists (#378a1b1)
- Boot: auto-init `.soma/.git` when autoCommit is true (#276f6f2)
- Boot: clear restart signal at factory load time (#0bddce2, #bb8350c)
- Muscles/automations: filter archived status + README in discovery (#5f5ccae, #e42da9b)
- Protocols: clean stale references, fix broken frontmatter (#7087d6a)
- Protocols: correct attribution — Curtis Mercier only on personal/protocols-derived (#5d8fb83)
- Heat: dynamic muscle read + script execution detection (#99a7663)
- Extensions: soma-route.ts import path — use pi-coding-agent not claude-code (#49454ea)
- Scripts: stop shipping dev-only scripts to users (#2c8db4a)
- Scripts: sync paths after _dev/ move, AGENT_DIR resolution (#46615ef, #a520c13)
- Statusline: restart detection, fs/path imports, signal path fixes (#f845894, #926fd4a, #18eba69)
- Auto-breathe: reduce triple notifications, preload-as-signal rotation (#927bd74)

---

## [0.5.1] — 2026-03-14

### Added

- Capability router for inter-extension communication (`soma-route.ts`) — provides/gets capabilities, emits/listens signals. Replaces `globalThis` hacks (#94576f3, #e919481)
- CLI-based session rotation via `.rotate-signal` file — auto-breathe can now rotate without command context (#2da3155)
- Per-session log files with auto-incrementing names (`YYYY-MM-DD-sNN.md`) — prevents overwrites across rotations (#d776dd6)
- Session log and preload paths surfaced in boot message (#d934799)
- Resume boot diffing — `soma -c` skips redundant preload injection (#de39fd1)
- Restart-required detection — signal file, cmux notification, and statusline indicator when core/extension files change (#9f2a103, #f845894, #926fd4a, #18eba69)
- `soma-changelog.sh` — generate categorized changelog entries from conventional commits with `[cl:tag]` consolidation
- `soma-changelog-json.sh` — parse CHANGELOG.md into JSON for website consumption
- ChangelogIsland.tsx + RoadmapTimeline.tsx — Preact islands for `/changelog/` and `/roadmap/` pages
- `soma-threads.sh` — chain-of-thought tracing tool for blog seeds across session logs
- `soma-verify.sh self-analysis` — muscle health, cross-location divergence, orphan detection
- Protocol TL;DR extraction — `protocolSummary()` prefers `## TL;DR` body section over breadcrumb (#83ec9ee)
- Combined session ID format (`sNN-<hex>`) — sequential for human scanning, hex for collision safety (#e7c4057, #618cd9f)
- `commit-msg` git hook — validates conventional commit format + `[cl:tag]` syntax
- `guard.toolGates` setting — require reading muscles before dangerous bash commands (#1c6b725)
- `breathe.graceTurns` setting — configurable auto-breathe grace period, replaces hardcoded 6-turn limit (#c9ab5a8)
- Session log nudge with template at breathe trigger point (#eb8acc8)
- Periodic auto-commit every 5th turn for crash resilience (#c6caccc)
- Scratch note lifecycle — session IDs, date sections, active/done/parked status, router capabilities, auto-inject (#0d364f2)
- Statusline shows session ID on line 2 (#d474cbf)
- Polyglot script discovery — `.sh`, `.py`, `.ts`, `.js`, `.mjs` (#1acb8c2)

### Changed

- Auto-breathe rotation now writes `.rotate-signal` and calls `ctx.shutdown()` immediately when preload already exists — no more waiting for `turn_end` that may not fire (#378a1b1)
- Preload filenames use `sNN` iterating pattern (was static session ID suffix) to prevent overwrites within a session (#378a1b1)
- Self-awareness protocols consolidated — 5 redundant protocols became configuration guides (#b70ca44)
- `/scratch` extracted to standalone `soma-scratch.ts` extension (#932f446)
- Shared helpers extracted to `utils.ts` — deduplication across core modules (#2dbea9a, #3d8467e)
- Unified rotation through `/inhale`, removed `/auto-continue` (#7b7ba52)
- Changelog pipeline switched to Ghostty-style commit-driven entries (#ec27a11)
- `pattern-evolution` protocol updated with identity maturation layer; `working-style` with tool-awareness (#5e4219d)
- Dev hooks generated locally by `soma-dev.sh`, not committed to repo (#efc6ed4)

### Fixed

- Muscle and automation discovery — filter archived status and README files (#e42da9b, #5f5ccae)
- Scratch completions — remove PRO commands from free completions list (#fd0bda2)
- Auto-breathe race condition — `sendUserMessage` from `before_agent_start` raced with Pi's prompt processing, now deferred to `agent_end` via pending message queue (#2823ee9, #927bd74)
- Auto-breathe phase 1 ignored by agent — wrap-up trigger now sends a followUp user message, not just system prompt + UI toast (#9d09dd5)
- Auto-breathe triple notification spam reduced (#927bd74)
- Session management — `/inhale` reset, heat dedup on rotation (#044fb2c)
- Dev-only scripts no longer shipped to users (#2c8db4a)
- Restart signal cleared at factory load time, not `session_start` (#0bddce2)
- Dynamic muscle read and script execution detection for heat tracking (#99a7663)
- `soma-route.ts` import path — uses `@mariozechner/pi-coding-agent`, not `@anthropic-ai/claude-code` (#49454ea)
- Internal protocols (`content-triage`, `community-safe`) removed from bundled set (#3ad0884)
- Auto-init `.soma/.git` when `autoCommit` is true (#276f6f2)
- Missing TL;DRs on 4 self-awareness protocols (#c457752)
- `sync-to-cli` path after `_dev/` directory move (#46615ef)
- Grace countdown skips tool turns during auto-breathe — tool-call turns no longer count toward 6-turn limit (#53bd421)
- Resume without fingerprint sends minimal boot instead of full redundant injection — saves ~4-6k tokens (#7fd064b)
- Preload overwrite guard + auto-breathe rotation fix when preload pre-exists (#378a1b1)
- All doc paths updated to `amps/` layout — `.soma/amps/protocols/`, `.soma/amps/muscles/`, etc. (#420f19b)
- Memory layout docs rewritten — core structure is amps/, memory/, projects/, skills/ (#b35c2be)

---

## [0.5.0] — 2026-03-12

### Added

- Auto-breathe mode — proactive context management that triggers wrap-up at configurable %, auto-rotates at higher %. Safety net at 85% always on. Opt-in via `breathe.auto` in settings (#1d533bf)
- `/auto-breathe` command — runtime toggle (`on|off|status`), persists to settings.json
- Smarter `/breathe` — context-aware instructions (light/full/urgent), handles preload-already-written and timeout edge cases
- Cold-start muscle boost — muscles created <48h get +3 effective heat for at least 2 sessions
- Orient-from preloads — preload template includes `## Orient From` pointing to files next session should read first
- `soma:recall` event signal — extensions can listen for context pressure events (steno integration)
- `/auto-commit` command — toggle `.soma/` auto-commit on exhale/breathe (`on|off|status`)
- Auto-commit `.soma/` state — changes committed to local git on every exhale/breathe via `checkpoints.soma.autoCommit`
- `/pin` and `/kill` invalidate prompt cache — heat changes take effect next turn, not next session
- `/soma prompt` diagnostic — shows compiled sections, identity status, heat levels, context %, runtime state
- `sync-to-cli.sh` and `sync-to-website.sh` — one-command repo sync scripts
- `soma-compat.sh` — detect protocol/muscle overlap, redundancy, directive conflicts
- `soma-update-check.sh` — compare local protocol/muscle versions against hub
- `/scratch` command — quick notes to `.soma/scratchpad.md`, append-only, agent doesn't see unless `/scratch read`
- `guard.bashCommands` setting — `allow`/`warn`/`block` for dangerous bash command prompts
- Automations system — `.soma/automations/` for step-by-step procedural flows
- Polyglot script discovery — boot discovers `.sh`, `.py`, `.ts`, `.js`, `.mjs` scripts with auto-extracted descriptions
- `soma init --orphan` — `--orphan`/`-o` flag for clean child projects with zero parent inheritance
- Git hooks: `post-commit` auto-changelog + `pre-push` docs-drift nudge
- Bundled protocols: `correction-capture` + `detection-triggers` — learning-agent protocols

### Changed

- Config-first script extensions — `settings.scripts.extensions` controls which file types are discovered
- Command cleanup — removed `/flush`, folded `/preload` into `/soma preload` and `/debug` into `/soma debug`
- CI improvements — PR check and release workflows now run all test suites

### Fixed

- System prompt dropped after turn 1 — Pi resets each `before_agent_start`, now caches compiled prompt
- Identity never in compiled prompt — `isPiDefaultPrompt()` checked wrong string
- Context warnings never fired — `getContextUsage()` returns undefined on turn 1, handled gracefully
- Identity lost after `/auto-continue` or `/breathe` — `session_switch` now rebuilds from chain
- Guard false positive on `2>/dev/null` — stderr redirects no longer trigger write warnings
- Bash guard false positive on `>>` — append redirects no longer trigger dangerous redirect guard
- Preload auto-injected on continue/resume — `soma -c` and `soma -r` no longer inject stale preloads
- `/soma prompt` crash — `getProtocolHeat` import missing
- Audit false positives — all 11 audit scripts improved across the board

---

## [0.4.0] — 2026-03-11

### Added

- Compiled system prompt ("Frontal Cortex") — `core/prompt.ts` assembles complete system prompt from identity chain, protocol summaries, muscle digests, dynamic tool section
- Session-scoped preloads — `preload-<sessionId>.md` prevents multi-terminal conflicts
- Identity in system prompt — moved from boot user message for better token caching
- Parent-child inheritance — `inherit: { identity, protocols, muscles, tools }` in settings
- Persona support — `persona: { name, emoji, icon }` for named agent instances
- Smart init — `detectProjectContext()` scans for parent `.soma/`, `CLAUDE.md`, project signals
- `systemPrompt` settings — toggle docs, guard, CLAUDE.md awareness in system prompt assembly
- `prompts/system-core.md` — static behavioral DNA skeleton
- Debug mode — `.soma/debug/` logging, `/soma debug on|off`
- Protocol graduation — heat decay floor, frontmatter enforcement, preload quality validation
- Configurable boot sequence — `settings.boot.steps` array
- Git context on boot — `git-context` step injects recent commits and changed files
- Configurable context warnings — `settings.context` thresholds

### Changed

- Extension ownership refactor — `soma-boot.ts` owns lifecycle + commands, `soma-statusline.ts` owns rendering + keepalive
- Boot user message trimmed — identity, protocol breadcrumbs, and muscle digests moved to system prompt
- CLAUDE.md awareness, not adoption — system prompt notes existence but doesn't inject content

### Fixed

- Print-mode race condition — `ctx.hasUI` guard on `sendUserMessage` in `session_start`
- Skip scaffolding core extensions into project `.soma/extensions/`
- Template placeholder substitution on install

---

## [0.3.0] — 2026-03-10

### Added

- AMPS content type system — 4 shareable types: Automations, Muscles, Protocols, Skills. `scope` field controls distribution
- Hub commands — `/install <type> <name>`, `/list local|remote` with dependency resolution
- `core/content-cli.ts` — non-interactive content commands for CLI wiring
- `core/install.ts` — hub content installation with dependency resolution
- `core/prompt.ts` — compiled system prompt assembly (12th core module)
- `soma-guard.ts` extension — safe file operation enforcement with `/guard-status` command
- `soma-audit.sh` — ecosystem health check orchestrating 11 focused audits
- `/rest` command — disable cache keepalive + exhale
- `/keepalive` command — toggle cache keepalive on/off/status
- Cache keepalive system — 300s TTL, 45s threshold, 30s cooldown
- Session checkpoints — `.soma/` committed every exhale (local git)
- 10 test suites with 255 passing tests
- Workspace scripts — `soma-scan.sh`, `soma-search.sh`, `soma-snapshot.sh`, `soma-tldr.sh`

### Changed

- Bundled protocols slimmed from all to 4 core (breath-cycle, heat-tracking, session-checkpoints, pattern-evolution)

### Fixed

- PII scrubbed from git history across all repos
- CLI stripped to distribution only — agent is source of truth

---

## [0.2.0] — 2026-03-09

### Added

- Protocols and Heat System — behavioral rules loaded by temperature, heat rises through use, decays through neglect
- Muscle loading at boot — sorted by heat, loaded within configurable token budget
- Settings chain — `settings.json` with resolution: project → parent → global
- Mid-session heat tracking — auto-detects protocol usage from tool results
- Domain scoping — `applies-to` frontmatter + `detectProjectSignals()`
- Breath cycle commands — `/exhale`, `/inhale`, `/pin`, `/kill`
- Script awareness — boot surfaces `.soma/scripts/` inventory
- 9 core modules — discovery, identity, protocols, muscles, settings, init, preload, utils, index

### Fixed

- Extensions load correctly
- Skills install to correct path

---

## [0.1.0] — 2026-03-08

### Born

- σῶμα (sōma) — *Greek for "body."* The vessel that grows around you.
- Built on Pi with `piConfig.configDir: ".soma"`
- Identity system: `.soma/identity.md` — discovered, not configured
- Memory structure: `.soma/memory/` — muscles, sessions, preloads
- Breath cycle concept: sessions exhale what was learned, next session inhales it
- 9 core modules, 4 extensions, logo through 36 SVG iterations
