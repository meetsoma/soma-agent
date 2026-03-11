# Changelog

All notable changes to the Soma agent are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- **`soma-guard.ts` extension** — safe file operation enforcement. Intercepts `write` to unread files (confirms), critical path protection (identity, settings, protocols, .env), dangerous bash patterns (rm -rf, force push, git reset). Graduated from `safe-file-ops` muscle to executable extension. `/guard-status` command.
- **Workspace scan scripts** (`.soma/scripts/`) — `soma-scan.sh` (session/topic scanner), `soma-context.sh` (pre-change context gatherer), `soma-stale.sh` (stale doc finder), `soma-frontmatter.sh` (frontmatter status scanner). Operate across the full workspace.
- **Community protocols v1.1.0** — all 7 protocols refined with `spec-ref` fields linking to curtismercier/protocols specs. pattern-evolution trimmed 181→89 lines, session-checkpoints trimmed 183→103 lines. Misplaced pre-publish gate removed from breath-cycle.
- **Muscle review & consolidation** — 93 muscles across 9 sources triaged: 41 archived, 7 duplicate pairs resolved, 6 merges completed, agent-ops cluster consolidated to 4 canonical muscles.
- **Session checkpoints protocol** — two-track version control: `.soma/` committed every exhale (local git), project code checkpointed locally, squashed before push. Configurable via `settings.checkpoints`.
- **`soma-audit.sh`** — ecosystem health check orchestrating 11 focused audits: PII, code drift, stale content, stale terms, docs sync, command consistency, roadmap claims, overlap detection, settings validation, test coverage, frontmatter validation.
- **Hub commands** — `/install <type> <name>` fetches from hub, `/list local|remote` browses content. Templates resolve dependencies automatically.
- **Preact islands on hub** — `HubFilters` (type/tier/search) and `HubGrid` (reactive filtered cards) as interactive Preact islands with Nano Stores for cross-island state.
- **View Transitions** — smooth page navigation across the website via `astro:transitions`.
- **Checkpoint settings** — `SomaSettings.checkpoints` with configurable auto-commit, checkpoint style (commit/tag/stash), diff-on-boot, max diff lines.
- **`.soma/` git tracking** — local git repos initialized in agent, website, and core `.soma/` directories for session-over-session diff visibility.
- **Boot checkpoint diffs** — `git-context` boot step surfaces `.soma/` changes since last checkpoint when `diffOnBoot` is enabled.
- **`/rest` command** — disable cache keepalive + exhale in one motion. For when you're done for the night. No pings fire after you walk away.
- **`/keepalive` command** — toggle cache keepalive on/off/status. Prevents expensive prompt re-caching during idle periods.
- **Cache keepalive system** — 300s TTL, 45s threshold, 30s cooldown. Auto-ping on idle. ◷ cache TTL display in footer.
- **10 focused audit scripts** — `scripts/audits/` with PII, drift, command consistency, stale terms, roadmap claims, docs sync, stale content, overlap, tests, settings checks. Orchestrated by `soma-audit.sh`.
- **Test coverage** — added discovery, identity, preload, utils tests. 161/161 passing across 9 test suites.
- **Configurable boot sequence** — `settings.boot.steps` controls what loads on session start.
- **Git context on boot** — new `git-context` boot step injects recent commits and changed files.
- **Configurable context warnings** — `settings.context` controls notification, warning, and auto-exhale thresholds.
- **Configurable preload staleness** — `settings.preload.staleAfterHours`.
- **Heat system docs** — standalone `docs/heat-system.md`.
- **breath-cycle ships on init** — `soma init` scaffolds `protocols/breath-cycle.md` + `_template.md`.

### Changed
- **Extension ownership refactor** — `soma-boot.ts` owns all lifecycle (context warnings, flush detection, auto-continue, commands). `soma-statusline.ts` owns only rendering + cache keepalive. Cross-extension signal via `globalThis.__somaKeepalive`.
- Boot extension refactored from monolithic function to step-based pipeline.
- Configuration docs expanded — boot, git-context, context warnings, preload settings with examples.
- All docs cross-linked: heat-system ↔ configuration ↔ protocols ↔ muscles ↔ commands.

### Fixed
- **PII scrubbed from all git history** — 4 repos force-pushed clean via git-filter-repo. Zero personal names/emails in any commit.
- **CLI stripped to distribution only** — removed 15 duplicated files (docs, scripts, protocols). Agent is source of truth; CLI gets only runtime files.
- **Missing init templates in CLI** — `soma init` from npm now correctly scaffolds protocols.
- **Stale references cleaned** — continuation-prompt→preload-next, somas-daddy removed, draft protocols archived, STATE.md updated.
- **Blog accuracy** — `/rest` in breath cycle section, `/pulse` removed (not implemented), roadmap claims validated.

---

## [0.2.0] — 2026-03-09

### Added

- **Protocols & Heat System** — behavioral rules that load by temperature. Hot protocols inject full content, warm ones show breadcrumbs, cold ones stay dormant. Heat rises through use and decays through neglect.
- **Muscle loading at boot** — learned patterns discovered, sorted by heat, loaded within configurable token budget. Digest-first loading for context efficiency.
- **Settings system** — `settings.json` with chain resolution (project → parent → global). Configurable heat thresholds, muscle budgets, auto-detection settings.
- **Mid-session heat tracking** — auto-detects protocol usage from tool results (YAML frontmatter → frontmatter-standard, git commands → git-identity, etc.)
- **Domain scoping** — `applies-to` frontmatter on protocols. `detectProjectSignals()` scans for git, TypeScript, Python, etc. Protocols only load in matching projects.
- **Breath cycle commands** — `/exhale` (save state, alias: `/flush`), `/inhale` (fresh start), `/pin <name>` (lock to hot), `/kill <name>` (drop to cold)
- **Script awareness** — boot surfaces available `.soma/scripts/` as a table so the agent knows what tools exist
- **Template-aware init** — `soma init` resolves templates from the soma chain with built-in fallback
- **9 core modules** — `discovery.ts`, `identity.ts`, `protocols.ts`, `muscles.ts`, `settings.ts`, `heat.ts`, `signals.ts`, `preload.ts`, `scripts.ts`
- **Test suites** — protocols (63 tests), muscles (37 tests), settings (14 tests), init, applies-to
- **NPM packages** — `meetsoma@0.1.0` (public), `@gravicity.ai/soma@0.1.0` (enterprise)
- **Website** — soma.gravicity.ai with docs, blog, ecosystem page, SEO foundation

### Documentation

- 7 user-facing docs: getting-started, how-it-works, protocols, memory-layout, extending, configuration, commands
- Blog: "Introducing Soma" with four-layer architecture, heat system, breath cycle
- SEO: sitemap, robots.txt, JSON-LD structured data, breadcrumbs on all pages

### Fixed

- Extensions now load correctly (auto-flush, preload, statusline all working)
- Skills install to `~/.soma/agent/skills/` (not `~/.agents/skills/`)
- Startup shows Soma changelog (not Pi's)

---

## [0.1.0] — 2026-03-08

### Born

- σῶμα (sōma) — *Greek for "body."* The vessel that grows around you.
- Built on Pi with `piConfig.configDir: ".soma"`
- Identity system: `.soma/identity.md` — discovered, not configured
- Memory structure: `.soma/memory/` — muscles, sessions, preloads
- Breath cycle concept: sessions exhale what was learned, next session inhales it
- Logo designed — planet + moon mascot through 36 SVG iterations
- First muscle formed: `svg-logo-design` from iterative learning
