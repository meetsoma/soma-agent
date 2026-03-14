# Memory Layout

<!-- tldr -->
Core structure: `.soma/` has five parts — `amps/` (Automations, Muscles, Protocols, Scripts), `memory/` (sessions, preloads), `projects/` (per-project context), `skills/` (Pi-native knowledge sets), and root files (identity.md, settings.json, state.json). AMPS is the content system — what Soma learns and how it behaves. Memory is temporal state. Skills route through Pi's native discovery. Projects hold per-project specs and notes. User-level `~/.soma/agent/` holds global settings and runtime.
<!-- /tldr -->

Soma uses two levels of storage: **project-level** (`.soma/` in your repo) and **user-level** (`~/.soma/agent/`).

## Project-Level: `.soma/`

Lives in your project root.

```
.soma/
├── identity.md              ← who Soma is in this project
├── settings.json            ← configurable thresholds (optional)
├── state.json               ← heat state for AMPS content (auto-managed)
│
├── amps/                    ← the AMPS content system
│   ├── automations/         ← triggered actions (heat-tracked)
│   ├── muscles/             ← learned patterns (heat-tracked)
│   ├── protocols/           ← behavioral rules (heat-tracked)
│   └── scripts/             ← developer tools
│
├── memory/                  ← temporal state
│   ├── preloads/            ← session continuations
│   └── sessions/            ← per-session work logs
│
├── projects/                ← per-project specs, plans, notes
│
└── skills/                  ← knowledge sets (Pi-native SKILL.md format)
```

Extensions (`.soma/extensions/`) are optional — advanced TypeScript runtime hooks that grow with the user.

### AMPS — The Content System

**A**utomations, **M**uscles, **P**rotocols, **S**cripts — four layers that give Soma learned behavior. All live under `amps/`, all are heat-tracked (except scripts), all discovered at boot. See [How It Works](/docs/how-it-works) for the boot sequence.

| Layer | What | Format | Heat-tracked |
|-------|------|--------|-------------|
| Automations | Triggered actions — "do this sequence" | Markdown | ✅ |
| Muscles | Learned patterns — "how I've done this before" | Markdown | ✅ |
| Protocols | Behavioral rules — "how to be" | Markdown | ✅ |
| Scripts | Developer tools — reusable bash commands | Shell | Listed at boot |

### Marker Files

Soma identifies a valid `.soma/` directory by looking for at least one of:
- `identity.md`
- `amps/` directory
- `memory/` directory
- `settings.json`

### Git Strategy

| Path | Git Status | Reason |
|------|-----------|--------|
| `skills/` | Tracked | Project-specific skills, shareable |
| `amps/protocols/` | Tracked | Behavioral rules, shareable across team |
| `amps/scripts/` | Tracked | Developer tools, shareable |
| `identity.md` | **Gitignored** | Personal — Soma's identity is unique to each user |
| `amps/muscles/` | **Gitignored** | Personal learned patterns |
| `amps/automations/` | **Gitignored** | Personal triggers |
| `memory/` | **Gitignored** | Session-specific, personal |
| `state.json` | **Gitignored** | Personal heat state |

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
    5. automations — load by heat
    6. scripts — list available .soma/amps/scripts/
    7. git-context — inject recent commits + changed files
  → inject all into system prompt

Continue session (soma -c):
  → same as above, plus:
  → step 2 loads most recent preload from .soma/memory/preloads/

Breathe (/breathe or auto at configurable threshold):
  → agent writes preload to .soma/memory/preloads/preload-next-<date>-<id>.md
  → save protocol + muscle heat state (with decay for unused)
  → agent commits work
  → auto-continues into fresh session

Exhale (/exhale):
  → same save as breathe, but session ends
```

## Session Logs

Session log files are named `YYYY-MM-DD-sNN.md` — the date plus an auto-incrementing session number (`s01`, `s02`, etc.). Each session gets its own file. The number increments by scanning the directory for existing files, so sessions never overwrite each other — even across restarts.

## Session-Scoped Preloads

Preload files are named `preload-next-YYYY-MM-DD-XXXXXX.md` — the date plus 6 characters from the session ID. Each exhale writes a unique file. On resume, Soma picks the most recent preload by modification time.

This means you can have multiple preloads from different sessions. The unique filename prevents overwrites. Soma searches: `memory/preloads/` (configured) → `.soma/` root (legacy) → `memory/` (legacy).

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
