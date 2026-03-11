# Memory Layout

<!-- tldr -->
Two levels: project (`.soma/` in repo) and user (`~/.soma/agent/`). Project has: identity.md, STATE.md, protocols/, memory/ (muscles, preloads, sessions), settings.json, scripts/. User has: global settings, extensions (soma-boot, soma-header, soma-statusline), global skills. Identity + memory are gitignored (personal). STATE.md + skills are tracked (shareable).
<!-- /tldr -->

Soma uses two levels of storage: **project-level** (`.soma/` in your repo) and **user-level** (`~/.soma/agent/`).

## Project-Level: `.soma/`

Lives in your project root. Contains everything specific to this project.

```
.soma/
├── identity.md              ← who Soma is in this project
├── STATE.md                 ← project architecture truth (ATLAS)
├── settings.json            ← configurable thresholds (optional)
├── .protocol-state.json     ← heat state for protocols (auto-managed)
├── protocols/               ← behavioral rules (heat-tracked)
│   ├── breath-cycle.md      ← hot: always loaded
│   ├── git-identity.md      ← warm: breadcrumb in prompt
│   └── _template.md         ← template for new protocols
├── memory/
│   ├── muscles/             ← learned patterns (auto-discovered)
│   │   └── deployment.md    ← example: learned deployment process
│   ├── preload-<sessionId>.md ← session-scoped continuations
│   └── sessions/
│       └── 2026-03-08.md    ← daily work log
├── skills/                  ← project-specific skills (optional)
└── extensions/              ← project-specific extensions (optional)
```

### Marker Files

Soma identifies a valid `.soma/` directory by looking for at least one of:
- `STATE.md`
- `identity.md`
- `memory/` directory
- `protocols/` directory
- `settings.json`

### Git Strategy

| File | Git Status | Reason |
|------|-----------|--------|
| `STATE.md` | Tracked | Architecture truth, useful to collaborators |
| `skills/` | Tracked | Project-specific skills, shareable |
| `identity.md` | **Gitignored** | Personal — Soma's identity is unique to each user |
| `memory/` | **Gitignored** | Session-specific, personal |
| `sessions/` | **Gitignored** | Daily logs, personal |

## User-Level: `~/.soma/agent/`

Global settings and runtime. Shared across all projects.

```
~/.soma/agent/
├── settings.json            ← compaction, startup, changelog prefs
├── core/                    ← symlink → agent/core/ (runtime modules)
├── extensions/              ← globally installed extensions
│   ├── soma-boot.ts         ← identity + preload + protocols + muscles
│   ├── soma-header.ts       ← branded σῶμα header
│   └── soma-statusline.ts   ← footer with context/cost/git
├── skills/                  ← globally installed skills
└── sessions/                ← Pi session JSONL files
```

## How Memory Flows

```
Fresh session (soma):
  ~/.soma/agent/extensions/ load
  → walk up CWD for .soma/ (project → parent → global chain)
  → run boot steps (configurable in settings.json):
    1. identity — load identity.md (layered)
    2. preload — skip (fresh session)
    3. protocols — load by heat (hot=full, warm=breadcrumb, cold=name)
    4. muscles — load by heat within token budget
    5. scripts — list available .soma/scripts/
    6. git-context — inject recent commits + changed files
  → inject all into system prompt

Continue session (soma -c):
  → same as above, plus:
  → step 2 loads most recent .soma/memory/preload-<sessionId>.md

Breathe (/breathe or auto at configurable threshold):
  → agent writes .soma/memory/preload-<sessionId>.md
  → save protocol + muscle heat state (with decay for unused)
  → agent commits work
  → auto-continues into fresh session

Exhale (/exhale):
  → same save as breathe, but session ends
```

## Session-Scoped Preloads

Preload files are named `preload-<sessionId>.md` — each exhale writes a unique file rather than overwriting a single `preload-next.md`. On resume, Soma picks the most recent preload by modification time.

This means you can have multiple preloads from different sessions and resume any of them. The session ID comes from the Pi session that created the preload.

## Parent Chain Discovery

On boot, Soma walks up the filesystem from the current directory looking for `.soma/` directories. This creates a chain:

```
/home/user/work/monorepo/app/.soma/     ← child (primary)
/home/user/work/monorepo/.soma/          ← parent (inherited)
/home/user/.soma/agent/                  ← global (baseline)
```

Content from each level merges according to the `inherit` settings. See [Configuration](/docs/configuration#inheritance).

## Multiple Projects

Each project gets its own `.soma/`. When you `cd` between projects and run `soma`, she loads the identity and memory for *that* project. Different projects, different Somas.

```
~/project-a/.soma/identity.md   ← "I'm a frontend specialist"
~/project-b/.soma/identity.md   ← "I'm a systems engineer"
```

Same `soma` CLI, different memories.
