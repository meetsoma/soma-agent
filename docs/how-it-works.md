# How Soma Works

## The Core Idea

Soma is an AI coding agent that **remembers**. Unlike tools that start fresh every session, Soma carries identity, context, and learned patterns across sessions.

σῶμα (sōma) — *Greek for "body."* The vessel that grows around you.

## The Breath Cycle

Sessions are breaths. Each session **inhales** what was learned before, and **exhales** what it learned this time.

```
Session 1 (inhale) → work → exhale (preload + session log)
                                    ↓
Session 2 (inhale) ← picks up preload → work → exhale
                                                      ↓
Session 3 (inhale) ← ...and so on
```

### Inhale (Session Start)

When Soma starts, she loads:
- **Identity** (`identity.md`) — who she is, always loaded
- **Preload** (`preload-next.md`) — what happened last session, only on `--continue`

Fresh sessions (`soma`) load identity only. Resumed sessions (`soma --continue`) load both.

### Exhale

When context fills up (~85%), Soma exhales:
1. Writes a **preload** for the next session (`preload-next.md`)
2. Saves protocol and muscle heat state
3. Commits all work
4. Auto-continues into a fresh session

The `/exhale` command triggers this manually (`/flush` also works as an alias).

## Identity

Soma doesn't come pre-configured with a personality. She **discovers** who she is through working with you. Her `identity.md` is written by her, not for her.

On first run, Soma sees an empty identity file and writes her own based on the workspace and your interactions. See [Identity](identity.md) for the full guide on discovery, layering, and customization.

## Muscles

Patterns observed across sessions become **muscles** — reusable knowledge files that load automatically when relevant.

Examples:
- A muscle for your project's deployment process
- A muscle for your preferred code style
- A muscle for how to handle a specific API

Muscles live in `.soma/memory/muscles/` and grow organically. Like protocols, they're loaded by **heat** — frequently-used muscles get full content in the prompt, less-used ones get a digest summary, and cold ones stay available but unloaded. See [Muscles](muscles.md) for the full guide on writing muscles and the digest system.

## Protocols

Protocols are behavioral rules that guide Soma's actions: how to format files, how to attribute git commits, when to exhale. They live in `.soma/protocols/` as markdown files with frontmatter.

### Heat System

Every protocol has a temperature:
- 🔥 **Hot** (8+) — full body loaded into system prompt
- 🟡 **Warm** (3–7) — breadcrumb reminder only (one sentence)
- ❄️ **Cold** (0–2) — name listed, content not loaded

Heat rises when protocols get used (+1 per action, +2 per explicit reference) and decays by 1 each session if unused. You can also `/pin` a protocol to keep it hot or `/kill` it to drop to cold. All thresholds are configurable in [settings.json](configuration.md).

### Domain Scoping

Protocols declare which projects they apply to via an `applies-to` field. For example, `git-identity` only loads in projects with a `.git/` directory. Meta-protocols like `breath-cycle` use `applies-to: [always]`.

Available signals: `always`, `git`, `typescript`, `javascript`, `python`, `rust`, `go`, `frontend`, `docs`, `multi-repo`.

See [docs/protocols.md](protocols.md) for how to write your own.

## Context Management

Soma monitors context usage and provides escalating warnings:

| Threshold | Action |
|-----------|--------|
| 50% | Info notification |
| 70% | Wrap-up warning |
| 80% | Flush soon warning |
| 85% | **Auto-flush** — writes preload, commits, continues |

This prevents context loss and enables seamless multi-session work.
