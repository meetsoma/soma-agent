# Memory Layout

Soma uses two levels of storage: **project-level** (`.soma/` in your repo) and **user-level** (`~/.soma/agent/`).

## Project-Level: `.soma/`

Lives in your project root. Contains everything specific to this project.

```
.soma/
├── identity.md              ← who Soma is in this project
├── STATE.md                 ← project architecture truth (ATLAS)
├── memory/
│   ├── muscles/             ← learned patterns (auto-discovered)
│   │   └── deployment.md    ← example: learned deployment process
│   ├── preload-next.md      ← state for next session inhale
│   ├── continuation-prompt.md ← exact instructions for continuation
│   └── sessions/
│       └── 2026-03-08.md    ← daily work log
├── skills/                  ← project-specific skills
│   └── my-custom-skill/
│       └── SKILL.md
└── extensions/              ← project-specific extensions (optional)
```

### Marker Files

Soma identifies a valid `.soma/` directory by looking for at least one of:
- `identity.md`
- `STATE.md`
- `memory/` directory

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
├── extensions/              ← globally installed extensions
│   ├── soma-boot.ts         ← identity + preload loading
│   ├── soma-header.ts       ← branded startup header
│   └── soma-statusline.ts   ← footer with context/cost/git
├── skills/                  ← globally installed skills
├── sessions/                ← Pi session JSONL files
└── auth.json                ← API keys (auto-managed)
```

## How Memory Flows

```
Fresh session:
  ~/.soma/agent/extensions/ load
  → walk up CWD for .soma/
  → load identity.md (always)
  → inject into session as first message

Resumed session (--continue):
  → same as above, plus:
  → load .soma/memory/preload-next.md
  → inject preload after identity

Flush:
  → agent writes .soma/memory/preload-next.md
  → agent writes .soma/memory/continuation-prompt.md
  → agent commits work
  → "FLUSH COMPLETE" triggers auto-continue

Auto-continue:
  → new session created
  → continuation-prompt.md injected as first message
  → seamless handoff
```

## Multiple Projects

Each project gets its own `.soma/`. When you `cd` between projects and run `soma`, she loads the identity and memory for *that* project. Different projects, different Somas.

```
~/project-a/.soma/identity.md   ← "I'm a frontend specialist"
~/project-b/.soma/identity.md   ← "I'm a systems engineer"
```

Same `soma` CLI, different memories.
