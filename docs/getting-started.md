# Getting Started

<!-- tldr -->
`npm i -g meetsoma` → `cd your-project` → `soma`. First run creates `.soma/` and discovers identity. Use `soma -c` to continue with last session's context. `/breathe` saves + continues, `/exhale` saves + stops, `/pin` keeps protocols hot, `/kill` drops them cold.
<!-- /tldr -->

## Install

```bash
npm install -g meetsoma
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

Starts fresh. Runs the [boot sequence](configuration.md#boot-sequence): identity, protocols, muscles, scripts, git context. No replay of previous session context.

### Resume Session

```bash
soma --continue
# or
soma -c
```

Resumes the last session. Runs all boot steps including preload (what happened, what's next).

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
| `/inhale` | Start fresh — shows preload status, suggests `soma -c` |
| `/breathe` | Save state + auto-continue into fresh session |
| `/exhale` | Save state, write preload, session ends (alias: `/flush`) |
| `/pin <name>` | Pin a protocol/muscle to hot (stays loaded) |
| `/kill <name>` | Kill a protocol/muscle (drops to cold) |
| `/soma status` | Show memory status (identity, preload, muscles, protocols) |
| `/soma init` | Create `.soma/` in current directory |
| `/preload` | List available preload files |

## The `.soma/` Directory

Created by `soma init` or on first run:

```
.soma/
├── identity.md              ← who Soma becomes (discovered through use)
├── STATE.md                 ← project architecture truth
├── settings.json            ← configurable thresholds (optional)
├── protocols/               ← behavioral rules (heat-tracked)
├── memory/
│   ├── muscles/             ← patterns learned from experience
│   ├── preload-next.md      ← continuation for next session
│   └── sessions/            ← daily logs
└── scripts/                 ← dev tooling (search, scan, etc.)
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
- **Tune settings** — everything is configurable: boot steps, heat thresholds, context warnings. See [Configuration](configuration.md).
