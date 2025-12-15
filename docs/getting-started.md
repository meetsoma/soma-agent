# Getting Started

## Install

```bash
npm install -g @gravicity.ai/soma
```

## First Run

```bash
cd your-project
soma
```

On first run, Soma will ask to create a `.soma/` directory. Say yes. She'll write her own identity based on your workspace.

## Session Modes

### Fresh Session

```bash
soma
```

Starts clean. Loads identity only. No replay of previous context.

### Resume Session

```bash
soma --continue
# or
soma -c
```

Resumes the last session. Loads identity + preload (what happened, what's next).

### Select a Session

```bash
soma --resume
# or
soma -r
```

Pick from previous sessions to resume.

## Commands

| Command | What it does |
|---------|-------------|
| `/flush` | Write preload + prepare for continuation |
| `/soma status` | Show memory status (identity, preload, muscles) |
| `/soma init` | Create `.soma/` in current directory |
| `/preload` | List available preload files |
| `/status` | Show session stats (context %, turns, uptime) |
| `/auto-continue` | Create new session with continuation prompt |

## The `.soma/` Directory

Created by `soma init` or on first run:

```
.soma/
├── identity.md              ← who Soma becomes (she writes this)
├── STATE.md                 ← project architecture truth
├── memory/
│   ├── muscles/             ← patterns learned from experience
│   ├── preload-next.md      ← continuation for next session
│   ├── continuation-prompt.md ← exact next steps
│   └── sessions/            ← daily logs
└── skills/                  ← project-specific skills
```

### What's Private vs Public

If you're using Soma in a public repo:

- **Ships with repo:** `.soma/STATE.md`, `.soma/skills/`
- **Gitignored (private):** `.soma/identity.md`, `.soma/memory/`, `.soma/sessions/`

Templates ship. Instances don't.

## Tips

- **Let identity grow** — don't pre-write it. Let Soma discover who she becomes through your work.
- **Trust the breath** — don't worry about context limits. Soma flushes and continues automatically.
- **Read muscles** — check `.soma/memory/muscles/` to see what patterns Soma has learned.
