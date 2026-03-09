---
type: state
method: atlas
project: soma
updated: 2026-03-09
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
| Main repo | `meetsoma/agent` (private), `meetsoma/cli` (public) |
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
│  ├── utils.ts        — safeRead, fmtDuration         │
│  └── index.ts        — public API re-exports         │
│                                                      │
│  Extensions (products/soma/agent/extensions/)          │
│  ├── soma-boot.ts       — identity, preload, protos, │
│  │                        muscles, scripts, heat     │
│  ├── soma-header.ts     — branded σῶμα header        │
│  └── soma-statusline.ts — footer + context monitor   │
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
│  │   ├── soma-scan.sh    (frontmatter scanner)       │
│  │   ├── soma-tldr.sh    (agent TL;DR generator)     │
│  │   └── ...             (auth, sync, init, etc.)    │
│  └── memory/                                         │
│      ├── muscles/    — learned patterns              │
│      ├── preload-next.md — session continuation      │
│      └── sessions/   — daily logs                    │
└─────────────────────────────────────────────────────┘
```

## Protocol Two-Tier System

Every protocol exists in two forms:

| Tier | Location | Purpose |
|------|----------|---------|
| **Spec** | `meetsoma/protocols/<name>/README.md` | Public CC BY 4.0 spec. Educational, for humans/implementors. |
| **Operational** | `.soma/protocols/<name>.md` | Dense rules for the agent. Loaded into system prompt at boot. |

Loading by heat: hot = full content, warm = breadcrumb only, cold = name listed.

Three loading tiers per doc:
- **Breadcrumb** — `breadcrumb:` frontmatter field (1-2 sentences, warm protocol injection)
- **TL;DR** — `## TL;DR` section in body (3-7 dense bullets, first thing loaded on deeper read). Protocols use `## TL;DR` (visible in markdown). Muscles use `<!-- digest:start/end -->` (agent-facing).
- **Full body** — complete rules (only for hot protocols or when agent needs full context)

Frontmatter convention: files keep `type`, `status`, `updated`, `tags` for tooling (`soma-scan.sh`). Runtime-only fields (`name`, `heat-default`, `breadcrumb`, `scope`, `tier`) for the protocol loader. Attribution metadata (`author`, `license`, `version`, `created`, `upstream`) in trailing HTML comment.

**Runtime status:** Core engine complete. All Tier 2 runtime gaps shipped 2026-03-09: G1 (bootstrap), G2 (mid-session tracking), G3 (shutdown save), G4 (muscle loading), G6 (applies-to filtering), G7 (settings). Full gap analysis: `docs/plans/runtime-gaps.md`.

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
| breath-cycle | hot | always | `meetsoma/protocols/breath-cycle/` | Operational ✅ |
| heat-tracking | hot | always | (self-referential) | Operational ✅ |
| frontmatter-standard | warm | always | `meetsoma/protocols/atlas/` | Operational ✅ |
| git-identity | warm | git | `meetsoma/protocols/git-identity/` | Operational ✅ |
| collaborative-flow | cold | — | — | Draft (in `drafts/`) |

## Git Identity

| Context | Name | Email |
|---------|------|-------|
| Personal repos (`personal/`, `products/soma/`) | Soma Team | team@meetsoma.dev |
| Business repos (`clients/`, `infra/`) | Gravicity | team@meetsoma.dev |

Configured via `~/.gitconfig` `includeIf` rules. See `meetsoma/protocols/git-identity/`.

## Settings

| Setting | Location | Value |
|---------|----------|-------|
| Auto-compaction | `~/.soma/agent/settings.json` | `false` |
| Quiet startup | `~/.soma/agent/settings.json` | `true` |
| Collapse changelog | `~/.soma/agent/settings.json` | `true` |

**Note:** `settings.json` written by `core/init.ts`, read at runtime by `core/settings.ts` (G7 shipped). Project settings override parent, which override global. Missing fields use built-in defaults.

## What's Working

- ✅ Boot: discovery → identity → preload → protocols → muscles → scripts → ready
- ✅ Header: σῶμα brand, memory status dots, protocol count
- ✅ Statusline: model, context %, cost, git, uptime
- ✅ Context warnings: 50% → 70% → 80% → 85% auto-exhale
- ✅ Script awareness: `.soma/scripts/` surfaced at boot with descriptions
- ✅ /exhale (~~`/flush`~~), /inhale, /preload, /soma, /status, /auto-continue commands (D012)
- ✅ Core modules importable from extensions via symlink chain

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
products/soma/agent/          ← meetsoma/agent (private)
├── core/                     ← 7 modules — the soma runtime
├── extensions/               ← 3 thin wrappers calling core
├── protocols/                ← 3 reference protocol .md files (published specs)
├── docs/plans/               ← 10+ architecture plans (tracked)
├── registry/plugin-index.json
├── .soma/                    ← OUR dev workspace (not the product)
│   ├── STATE.md              ← THIS FILE (tracked)
│   ├── protocols/            ← operational protocols (tracked — 4 active + 1 draft)
│   ├── scripts/              ← dev tooling: soma-search, soma-scan, soma-tldr (not tracked, future → somas-daddy)
│   ├── memory/muscles/       ← our learned patterns (not tracked, personal)
│   └── memory/sessions/      ← session logs (not tracked, ephemeral)
├── STATE.md                  ← ecosystem-level ATLAS (meetsoma org)
├── README.md
└── LICENSE (MIT)

products/soma/cli/            ← npm package (meetsoma — public)
├── package.json              ← piConfig.configDir: ".soma"
├── dist/                     ← compiled Pi runtime (synced from cli-pro/)
└── README.md

products/soma/cli-pro/        ← npm package (@gravicity.ai/soma — enterprise)
├── package.json              ← same piConfig, may diverge with pro features
├── dist/                     ← compiled Pi runtime (source of truth)
├── extensions/               ← enterprise extensions
└── CHANGELOG.md

products/soma/website/        ← soma.gravicity.ai (Astro)

~/.soma/agent/                ← user-level runtime
├── settings.json
├── extensions/               ← symlinks → agent/extensions/
├── core/                     ← symlink → agent/core/
├── skills/
└── sessions/

personal/protocols/           ← meetsoma/protocols (CC BY 4.0)
├── amp/, atlas/, breath-cycle/, three-layer/, identity/
└── git-identity/             ← NEW this session
```
