<div align="center">

<!-- TODO: Replace with actual mascot image once finalized -->
<!-- <img src="./logos/soma-mascot.svg" alt="Soma" width="200" /> -->

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
soma init

# Start working
soma

# That's it. Soma discovers her identity through use.
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

No context is lost. No cold starts.

### 💪 Muscles

Patterns observed 2+ times become **muscles** — reusable knowledge that loads automatically when relevant. Soma builds her own playbook from your work.

```
.soma/
├── identity.md          ← who Soma becomes (discovered, not configured)
├── memory/
│   ├── muscles/         ← patterns learned from experience
│   ├── preload-next.md  ← continuation for next session
│   └── sessions/        ← daily logs
└── skills/              ← project-specific skills
```

### 🧠 Identity is Discovered

Soma doesn't come with a personality config file. She discovers who she is through working with you. Her `identity.md` is written by her, not for her.

## Skills

Soma supports skills — specialized instructions for specific tasks.

```bash
# Install a community skill
soma install skill <name>

# Skills live in .soma/skills/ (project) or ~/.soma/agent/skills/ (global)
```

## Configuration

Soma uses `.soma/` as her config directory:

| Path | Purpose |
|------|---------|
| `.soma/identity.md` | Who Soma is (auto-discovered) |
| `.soma/memory/muscles/` | Learned patterns |
| `.soma/skills/` | Project-specific skills |
| `~/.soma/agent/settings.json` | Global settings |
| `~/.soma/agent/skills/` | Global skills |

## Built on Pi

Soma is built on [Pi](https://github.com/badlogic/pi-mono), the open-source coding agent framework. She inherits Pi's tool system, extension architecture, and model support — then adds identity, memory, and growth on top.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding skills, building extensions, and contributing to Soma's core.

## License

[MIT](LICENSE) — Made with care by [Gravicity](https://gravicity.ai)
