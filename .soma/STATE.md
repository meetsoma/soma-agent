---
type: state
method: atlas
project: soma
updated: 2026-03-12
status: active
rule: Update this file whenever architecture, memory structure, or extension behavior changes.
---

# Soma — Architecture State

> **ATLAS** — Single source of truth for how Soma works right now.

## What Soma Is

An AI coding agent with self-growing memory. Built on Pi (0.57.1) with custom `piConfig.configDir: ".soma"`. Identity is discovered through use, not pre-configured.

## Public Identity

| Layer | Value |
|-------|-------|
| GitHub org | `github.com/meetsoma` |
| Main repo | `meetsoma/soma-agent` (private), `meetsoma/cli` (public) |
| npm (public) | `meetsoma` |
| npm (enterprise) | `@gravicity.ai/soma` |
| CLI command | `soma` |
| Website | `soma.gravicity.ai` |
| License | MIT |
| Made by | Gravicity (gravicity.ai) |

## System Diagram

```
┌─────────────────────────────────────────────────────┐
│  soma (CLI)                                          │
│  Built on: Pi 0.57.1 (via soma-cli package)          │
│  configDir: .soma                                    │
│                                                      │
│  Core Modules (products/soma/agent/core/)             │
│  ├── discovery.ts    — find .soma/ dirs, walk chain  │
│  ├── identity.ts     — load + layer identity files   │
│  ├── preload.ts      — session resumption            │
│  ├── protocols.ts    — discovery, heat, injection    │
│  ├── muscles.ts      — muscle discovery, loading,    │
│  │                      heat, digest, token budget   │
│  ├── settings.ts     — read + merge settings.json   │
│  │                      from soma chain              │
│  ├── init.ts         — scaffold new .soma/           │
│  ├── install.ts      — hub install + list (GitHub raw)│
│  ├── prompt.ts       — compiled system prompt        │
│  ├── content-cli.ts  — non-interactive hub commands  │
│  ├── debug.ts        — debug logging to .soma/debug/ │
│  ├── utils.ts        — safeRead, fmtDuration         │
│  └── index.ts        — public API re-exports         │
│                                                      │
│  Extensions (products/soma/agent/extensions/)          │
│  ├── soma-boot.ts       — identity, preload, protos, │
│  │                        muscles, scripts, heat     │
│  ├── soma-header.ts     — branded σῶμα header        │
│  ├── soma-statusline.ts — footer + context monitor   │
│  └── soma-guard.ts      — safe file operation guard  │
│                                                      │
│  ~/.soma/agent/                                      │
│  ├── settings.json   (compaction off, quiet)         │
│  ├── extensions/     (symlinks → agent/extensions/)  │
│  ├── core/           (symlink → agent/core/)         │
│  ├── skills/                                         │
│  └── sessions/       (Pi session JSONL)              │
│                                                      │
│  Project Instance: CWD/.soma/                         │
│  ├── identity.md     — who the agent is here         │
│  ├── STATE.md        — YOU ARE HERE                  │
│  ├── protocols/      — operational protocol files    │
│  │   ├── breath-cycle.md      (hot)                  │
│  │   ├── heat-tracking.md     (hot)                  │
│  │   ├── frontmatter-standard.md (warm)              │
│  │   ├── git-identity.md      (warm)                 │
│  │   ├── _template.md         (skipped)              │
│  │   ├── README.md            (skipped)              │
│  │   └── drafts/              (not scanned)          │
│  ├── scripts/        — dev tooling (not product)     │
│  │   ├── soma-search.sh  (query memory system)       │
│  │   ├── soma-tldr.sh    (agent TL;DR generator)     │
│  │   └── ...             (auth, sync, init, etc.)    │
│  │                                                   │
│  Workspace Scripts (.soma/scripts/ — top-level)       │
│  ├── soma-scan.sh        — session/topic scanner     │
│  ├── soma-context.sh     — pre-change context        │
│  ├── soma-stale.sh       — stale/overlap detector    │
│  └── soma-frontmatter.sh — frontmatter status        │
│  └── memory/                                         │
│      ├── muscles/    — learned patterns              │
│      ├── preload-<sessionId>.md — session continuations      │
│      └── sessions/   — daily logs                    │
└─────────────────────────────────────────────────────┘
```

## Protocol Two-Tier System

Every protocol exists in two forms:

| Tier | Location | Purpose |
|------|----------|---------|
| **Spec** | `protocols/<name>/README.md` | Public CC BY 4.0 spec. Educational, for humans/implementors. |
| **Operational** | `.soma/protocols/<name>.md` | Dense rules for the agent. Loaded into system prompt at boot. |

Loading by heat: hot = full content, warm = breadcrumb only, cold = name listed.

Three loading tiers per doc:
- **Breadcrumb** — `breadcrumb:` frontmatter field (1-2 sentences, warm protocol injection)
- **TL;DR** — `## TL;DR` section in body (3-7 dense bullets, first thing loaded on deeper read). Protocols use `## TL;DR` (visible in markdown). Muscles use `<!-- digest:start/end -->` (agent-facing).
- **Full body** — complete rules (only for hot protocols or when agent needs full context)

Frontmatter convention: files keep `type`, `status`, `updated`, `tags` for tooling (`soma-scan.sh`). Runtime-only fields (`name`, `heat-default`, `breadcrumb`, `scope`, `tier`) for the protocol loader. Attribution metadata (`author`, `license`, `version`, `created`, `upstream`) in trailing HTML comment.

**Runtime status:** Core engine complete. All Tier 2 runtime gaps shipped 2026-03-09: G1 (bootstrap), G2 (mid-session tracking), G3 (shutdown save), G4 (muscle loading), G6 (applies-to filtering), G7 (settings). Boot sequence now configurable via `settings.boot.steps`. Git context, context warning thresholds, and preload staleness also configurable. Full gap analysis: `docs/plans/runtime-gaps.md`.

### Heat System (how it works)

```
  INHALE (boot)              HOLD (work)              EXHALE (/exhale)
  ─────────────              ───────────              ────────────────
  Load by heat:              Auto-detect:             For each item:
  🔥 HOT (8+) → full body    write frontmatter → +1   Used? → keep heat
  🟡 WARM (3-7) → breadcrumb  git commit → +1          Unused? → decay -1
  ❄️  COLD (0-2) → name only   write SVG → +1           Pinned? → no decay
                             Manual: /pin /kill        Save to disk
```

Protocols store heat in `.protocol-state.json`. Muscles store heat in frontmatter (`heat: N`). Thresholds configurable in `settings.json`.

## Protocol Inventory

| Protocol | Heat Default | Applies-to | Upstream Spec | Status |
|----------|-------------|-----------|---------------|--------|
| breath-cycle | hot | always | `protocols/breath-cycle/` | Operational ✅ |
| heat-tracking | hot | always | (self-referential) | Operational ✅ |
| frontmatter-standard | warm | always | `protocols/atlas/` | Operational ✅ |
| git-identity | warm | git | `protocols/git-identity/` | Operational ✅ |
| pattern-evolution | hot | always | `protocols/amp/` (§3.2) | Operational ✅ |
| session-checkpoints | hot | always | `protocols/amp/` (§8) | Operational ✅ |
| community-safe | warm | always | (community-only) | Operational ✅ |
| collaborative-flow | cold | — | — | Draft (in `drafts/`) |

## Git Identity

| Context | Name | Email |
|---------|------|-------|
| Personal repos | (configure in identity.md) | (configure in identity.md) |
| Business repos | (configure in identity.md) | (configure in identity.md) |

Configured via `~/.gitconfig` `includeIf` rules. See `protocols/git-identity/`.

## Settings

| Setting | Location | Value |
|---------|----------|-------|
| Auto-compaction | `~/.soma/agent/settings.json` | `false` |
| Quiet startup | `~/.soma/agent/settings.json` | `true` |
| Collapse changelog | `~/.soma/agent/settings.json` | `true` |

**Note:** `settings.json` written by `core/init.ts`, read at runtime by `core/settings.ts` (G7 shipped). Project settings override parent, which override global. Missing fields use built-in defaults.

## What's Working

- ✅ Boot: configurable step pipeline (identity → preload → protocols → muscles → scripts → git-context)
- ✅ Git context: recent commits + changed files injected on boot (configurable since/diffMode/limits)
- ✅ Header: σῶμα brand, memory status dots, protocol count
- ✅ Statusline: model, context %, cost, git, uptime
- ✅ Context warnings: configurable thresholds (default 50/80/85%, via `settings.context`)
- ✅ Preload staleness: configurable (default 48h, via `settings.preload.staleAfterHours`)
- ✅ Script awareness: `.soma/scripts/` surfaced at boot with descriptions
- ✅ /exhale, /inhale, /breathe, /rest, /soma (status/init/prompt/preload/debug), /auto-commit, /status, /keepalive, /auto-continue
- ✅ /breathe — exhale + auto-rotate into fresh session with preload injection
- ✅ /inhale — loads most recent preload into current conversation (not just status)
- ✅ Auto-init — first run creates .soma/ without interactive prompt (Pi TUI timing workaround)
- ✅ Extension scaffolding — `initSoma()` copies bundled extensions into .soma/extensions/
- ✅ FLUSH COMPLETE + BREATHE COMPLETE detection in flush watcher
- ✅ Cache keepalive via statusline extension
- ✅ Core modules importable from extensions via symlink chain
- ✅ Compiled system prompt (Frontal Cortex) — full Pi prompt replacement with identity + protocols + muscles + tools
- ✅ Identity in system prompt — persists across turns, rebuilt on session_switch
- ✅ Auto-commit .soma/ on exhale/breathe (configurable via settings.checkpoints.soma.autoCommit)
- ✅ /soma prompt diagnostic — sections, identity, heat, context %
- ✅ CLI v0.3.0 published to npm (`meetsoma@0.3.0`)
- ✅ /install — fetch protocols, muscles, skills, templates from hub (GitHub raw URLs as registry)
- ✅ /list — show local or remote content

## What's NOT Working

| Gap | Ref | Blocking? |
|-----|-----|-----------|
| ~~Heat never bootstraps~~ | G1 | ✅ Shipped — `bootstrapProtocolState()` + `syncProtocolState()` |
| ~~Heat never updates mid-session~~ | G2 | ✅ Shipped — auto-detect from tool_result + /pin /kill commands |
| ~~Heat only saves on /flush~~ | G3 | ✅ Shipped — `session_shutdown` hook |
| ~~Muscles don't load at boot~~ | G4 | ✅ Shipped — `core/muscles.ts` + boot integration |
| ~~Settings.json not read~~ | G7 | ✅ Shipped — `core/settings.ts` reads + merges from chain |
| ~~`applies-to` filtering missing~~ | G6 | ✅ Shipped — `detectProjectSignals()` + `protocolMatchesSignals()` + frontmatter `applies-to` field |
| Muscle promotion | G8 | No — future |
| Ritual system | G9 | No — future |

Full gap analysis: `docs/plans/runtime-gaps.md`

## File Map

```
products/soma/agent/          ← meetsoma/soma-agent (private)
├── core/                     ← 7 modules — the soma runtime
├── extensions/               ← 4 extensions (3 thin wrappers + guard)
├── protocols/                ← 3 reference protocol .md files (published specs)
├── docs/plans/               ← 10+ architecture plans (tracked)
├── registry/plugin-index.json
├── .soma/                    ← OUR dev workspace (not the product)
│   ├── STATE.md              ← THIS FILE (tracked)
│   ├── protocols/            ← operational protocols (tracked — 4 active + 1 draft)
│   ├── templates/init/       ← default init scaffolding (tracked)
│   │   ├── identity.md, STATE.md, settings.json, .gitignore
│   │   └── protocols/        ← breath-cycle.md + _template.md (ship by default)
│   ├── scripts/              ← dev tooling: soma-search, soma-scan, soma-audit (tracked)
│   ├── memory/muscles/       ← our learned patterns (not tracked, personal)
│   └── memory/sessions/      ← session logs (not tracked, ephemeral)
├── STATE.md                  ← ecosystem-level ATLAS (meetsoma org)
├── README.md
└── LICENSE (MIT)

products/soma/cli/            ← npm package (meetsoma — public)
├── package.json              ← piConfig.configDir: ".soma"
├── dist/                     ← compiled Pi runtime
└── README.md

products/soma/website/        ← soma.gravicity.ai (Astro)

~/.soma/agent/                ← user-level runtime
├── settings.json
├── extensions/               ← symlinks → agent/extensions/
├── core/                     ← symlink → agent/core/
├── skills/
└── sessions/

personal/protocols/           ← curtismercier/protocols (CC BY 4.0, v0.2)
├── amp/, atlas/, breath-cycle/, three-layer/, identity/
└── git-identity/

.soma/scripts/                ← workspace-level scan tools
├── soma-scan.sh, soma-context.sh, soma-stale.sh, soma-frontmatter.sh

.soma/dev/registry/           ← cross-cutting specs
├── protocol-decisions.md, muscle-evolution-spec.md
├── hub-distribution-spec.md, safe-agent-ops-spec.md
```
