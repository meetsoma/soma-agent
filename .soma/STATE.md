---
type: state
method: atlas
project: soma
updated: 2026-03-10
status: active
rule: Update this file whenever architecture, memory structure, or extension behavior changes.
---

# Soma — Architecture State

> **ATLAS** — Single source of truth for how Soma works right now.
> Method docs: `$VAULT_PATH/agents/core/muscles/atlas.md`

## What Soma Is

An AI coding agent with self-growing memory. Built on Pi (0.56.2) with custom `piConfig.configDir: ".soma"`. Identity is discovered through use, not pre-configured.

## Public Identity

| Layer | Value |
|-------|-------|
| GitHub org | `github.com/meetsoma` |
| Main repo | `meetsoma/soma` |
| npm package | `@gravicity.ai/soma` |
| npm org/scope | `@gravicity.ai` |
| CLI command | `soma` |
| Website | `soma.gravicity.ai` |
| Install | `npm i -g @gravicity.ai/soma` |
| License | MIT |
| Made by | Gravicity (gravicity.ai) |

## System Diagram

```
┌─────────────────────────────────────────────────┐
│  soma (CLI)                                      │
│  Built on: Pi 0.57.1 (via soma-cli package)      │
│  configDir: .soma                                │
│                                                  │
│  ~/.soma/agent/                                  │
│  ├── settings.json   (compaction off, quiet)     │
│  ├── extensions/     (soma-boot, header, status) │
│  ├── skills/                                     │
│  └── sessions/       (Pi session JSONL)          │
│                                                  │
│  ~/Gravicity/products/soma/ (meetsoma/soma)       │
│  ├── extensions/     (source — symlinked global) │
│  │   ├── soma-boot.ts                            │
│  │   ├── soma-header.ts                          │
│  │   └── soma-statusline.ts                      │
│  ├── docs/           (living docs for website)   │
│  │   ├── how-it-works.md                         │
│  │   ├── getting-started.md                      │
│  │   ├── memory-layout.md                        │
│  │   └── extending.md                            │
│  ├── .soma/          (project instance)          │
│  │   ├── identity.md    (who she is)             │
│  │   ├── STATE.md       (YOU ARE HERE)           │
│  │   ├── memory/                                 │
│  │   │   ├── muscles/                            │
│  │   │   │   └── svg-logo-design.md              │
│  │   │   └── preload-next.md  (continuation)     │
│  │   └── skills/          (project-level skills) │
│  └── logos/                                      │
│      ├── concepts/        (5 initial concepts)   │
│      └── iterations/      (36 SVG iterations)    │
└─────────────────────────────────────────────────┘
```

## Component Inventory

| Component | Canonical Source | Installed At | Status |
|-----------|-----------------|--------------|--------|
| soma-cli | `tools/pi/soma-cli/` | global npm (`soma` command) | ✓ Built on Pi 0.56.2 |
| identity | `Soma/.soma/identity.md` | — | ✓ Born 2026-03-08 |
| boot preload | `Soma/.soma/preloads/boot.md` | — | ✓ Minimal |
| svg-logo-design muscle | `Soma/.soma/memory/muscles/svg-logo-design.md` | — | ✓ Created from first session |
| logo-designer skill | `~/.agents/skills/logo-designer` | ⚠️ Wrong path — should be `~/.soma/agent/skills/` | Bug (PI080) |
| soma-boot.ts | `Soma/extensions/soma-boot.ts` | `~/.soma/agent/extensions/soma-boot.ts` (symlink) | ✓ Identity loading, preload, /flush, /soma commands |
| soma-header.ts | `Soma/extensions/soma-header.ts` | `~/.soma/agent/extensions/soma-header.ts` (symlink) | ✓ Branded σῶμα header with memory status |
| soma-statusline.ts | `Soma/extensions/soma-statusline.ts` | `~/.soma/agent/extensions/soma-statusline.ts` (symlink) | ✓ Footer with model, context %, cost, git |

## Settings

| Setting | Location | Value |
|---------|----------|-------|
| Auto-compaction | `~/.soma/agent/settings.json` | `false` |
| Quiet startup | `~/.soma/agent/settings.json` | `true` |
| Collapse changelog | `~/.soma/agent/settings.json` | `true` |

## Pi configDir Resolution

Because `piConfig.configDir: ".soma"` in soma-cli's `package.json`:

| Feature | Resolves To |
|---------|-------------|
| User skills | `~/.soma/agent/skills/` |
| Project skills | `CWD/.soma/skills/` |
| Extensions | `~/.soma/agent/extensions/` |
| Sessions | `~/.soma/agent/sessions/` |
| Settings | `~/.soma/agent/settings.json` |
| Context files | Walks up CWD for `AGENTS.md` / `CLAUDE.md` (hardcoded, not configDir) |
| SYSTEM.md | `CWD/.soma/SYSTEM.md` |

## What's NOT Built Yet

| Feature | Blocking? | Ref |
|---------|-----------|-----|
| ~~Extensions (flush, preload, header)~~ | ~~Yes~~ | ✅ PI077 done — agent-boot.ts + statusline.ts symlinked |
| Skill install path | No — workaround: manual move | PI080 |
| Boot system registration | No — can run `soma` directly | PI081 |
| Own CHANGELOG.md | ✅ Done | PI089 |
| Custom branded header | No — cosmetic | PI088 |
| promptSnippet for personality | No — future | PI083 |

## Key Patterns

1. **`.soma/` is the configDir** — Pi resolves all user-level paths under `~/.soma/agent/`. Project-level under `CWD/.soma/`.
2. **Memory lives in project, not user dir** — `Soma/.soma/memory/` is project-scoped. Different Soma projects get different memories.
3. **Identity is prose, not config** — `identity.md` is free-form, written by Soma herself after her first session.
4. **Breath cycle** — sessions exhale (write preload + session log), next session inhales (loads preload). Currently broken without extensions (PI079).

## File Map

```
~/Gravicity/products/soma/     ← OSS repo (meetsoma/soma)
├── extensions/                ← Soma's own extensions (clean, no vault)
│   ├── soma-boot.ts           ← identity, preload, /flush, /soma
│   ├── soma-header.ts         ← branded σῶμα header
│   └── soma-statusline.ts     ← footer with model/context/cost/git
├── docs/                      ← living docs (feeds website)
│   ├── how-it-works.md        ← breath cycle, identity, muscles
│   ├── getting-started.md     ← install + first run
│   ├── memory-layout.md       ← .soma/ structure explained
│   └── extending.md           ← skills + extension development
├── .soma/                     ← project instance (mostly gitignored)
│   ├── identity.md            ← who she is (gitignored)
│   ├── STATE.md               ← architecture truth (tracked)
│   └── memory/                ← muscles, preloads, logs (gitignored)
├── logos/                     ← brand work (SVGs, voting UI)
├── README.md                  ← public readme
└── LICENSE                    ← MIT

~/Gravicity/Soma/              ← personal workspace (identity, memories)

~/Gravicity/tools/pi/soma-cli/ ← CLI package (npm distribution)
├── package.json               ← piConfig.configDir: ".soma"
├── CHANGELOG.md               ← Soma's own changelog
└── dist/                      ← compiled Pi runtime

~/.soma/agent/                 ← user-level runtime
├── settings.json              ← compaction, quiet, changelog
├── extensions/                ← symlinks to Soma/extensions/
├── skills/                    ← globally installed skills
└── sessions/                  ← Pi session JSONL files
```
