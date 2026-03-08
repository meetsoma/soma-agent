<div align="center">

# σῶμα — Soma

**The AI coding agent that grows with you.**

Self-evolving memory · Muscles that form from experience · Sessions that breathe

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Built on Pi](https://img.shields.io/badge/built%20on-Pi-purple.svg)](https://github.com/badlogic/pi-mono)
[![Made by Gravicity](https://img.shields.io/badge/made%20by-Gravicity-black.svg)](https://gravicity.ai)

</div>

---

## What is Soma?

Soma is an AI coding agent with **self-growing memory**. Unlike tools that start fresh every session, Soma remembers. She builds **muscles** — reusable patterns learned from your work — and carries context across sessions through a **breath cycle**: each session exhales what was learned, and the next inhales it.

σῶμα (sōma) — *Greek for "body."* The vessel that grows around you.

## Install

```bash
npm install -g @gravicity.ai/soma
```

## Quick Start

```bash
# Initialize Soma in your project
cd your-project
soma

# That's it. Soma discovers her identity through use.
```

On first run, Soma creates a `.soma/` directory and writes her own identity based on your workspace.

### Session Modes

```bash
soma                # Fresh session — identity only, clean slate
soma --continue     # Resume — picks up where you left off (identity + preload)
soma --resume       # Select a previous session to resume
```

## How It Works

### 🫁 The Breath Cycle

Sessions are breaths. **Exhale** writes what Soma learned. **Inhale** picks it up.

```
Session 1 (inhale) → work → exhale (preload + session log)
                                    ↓
Session 2 (inhale) ← picks up preload → work → exhale
                                                      ↓
Session 3 (inhale) ← ...and so on
```

No context is lost. No cold starts. At 85% context, Soma auto-flushes and continues seamlessly.

### 💪 Muscles

Patterns observed across sessions become **muscles** — reusable knowledge that loads automatically when relevant. Soma builds her own playbook from your work.

### 🧠 Identity is Discovered

Soma doesn't come with a personality config file. She discovers who she is through working with you. Her `identity.md` is written by her, not for her.

## Memory Layout

```
.soma/
├── identity.md          ← who Soma becomes (discovered, not configured)
├── STATE.md             ← project architecture truth
├── memory/
│   ├── muscles/         ← patterns learned from experience
│   ├── preload-next.md  ← continuation for next session
│   └── sessions/        ← daily logs
└── skills/              ← project-specific skills
```

Each project gets its own `.soma/`. Different projects, different Somas.

## Commands

| Command | What it does |
|---------|-------------|
| `/flush` | Write preload + prepare for continuation |
| `/soma status` | Show memory status (identity, preload, muscles) |
| `/soma init` | Create `.soma/` in current directory |
| `/status` | Session stats (context %, turns, uptime) |
| `/auto-continue` | New session with continuation prompt |

## Skills

Soma supports skills — specialized instructions for specific tasks.

```bash
# Install a skill
soma install skill <source>

# Skills live in .soma/skills/ (project) or ~/.soma/agent/skills/ (global)
```

See [docs/extending.md](docs/extending.md) for how to create your own skills and extensions.

## Documentation

| Doc | Contents |
|-----|----------|
| [How It Works](docs/how-it-works.md) | Breath cycle, identity, muscles, context management |
| [Getting Started](docs/getting-started.md) | Install, session modes, commands, `.soma/` layout |
| [Memory Layout](docs/memory-layout.md) | Project vs user level, git strategy, data flow |
| [Extending](docs/extending.md) | Skills, extensions, events, APIs |

## Built on Pi

Soma is built on [Pi](https://github.com/badlogic/pi-mono), the open-source coding agent framework. She inherits Pi's tool system, extension architecture, and model support — then adds identity, memory, and growth on top.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding skills, building extensions, and contributing to Soma's core.

## License

[MIT](LICENSE) — Made with care by [Gravicity](https://gravicity.ai)
