# Changelog

All notable changes to the Soma agent are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- **Configurable boot sequence** — `settings.boot.steps` controls what loads on session start. Default: `["identity", "preload", "protocols", "muscles", "scripts", "git-context"]`. Remove or reorder steps to customize.
- **Git context on boot** — new `git-context` boot step injects recent commits and changed files into the agent's prompt. Configurable: `since` (e.g. `"24h"`, `"last-session"`, `"7d"`), `diffMode` (`"stat"`, `"full"`, `"none"`), `maxCommits`, `maxDiffLines`.
- **Configurable context warnings** — `settings.context` controls notification, warning, and auto-exhale thresholds (was hardcoded to 50/70/80/85%).
- **Configurable preload staleness** — `settings.preload.staleAfterHours` (was hardcoded to 48h).
- **Heat system docs** — new standalone `docs/heat-system.md` with complete guide to temperature-based loading.
- **Agent verification protocol** — draft spec for source-code-as-credential authentication (`protocols/agent-verification.md`).
- **breath-cycle ships on init** — `soma init` now scaffolds `protocols/breath-cycle.md` (hot, meta-protocol) and `protocols/_template.md` (format reference). Built-in fallbacks in `core/init.ts` ensure it works standalone.

### Changed
- Boot extension refactored from monolithic function to step-based pipeline.
- Configuration docs expanded significantly — now covers boot, git-context, context warnings, preload settings with examples.
- All docs cross-linked: heat-system ↔ configuration ↔ protocols ↔ muscles ↔ commands.

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
