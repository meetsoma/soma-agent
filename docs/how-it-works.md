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

### Exhale (Flush)

When context fills up (~85%), Soma flushes:
1. Writes a **preload** for the next session
2. Writes a **continuation prompt** with exact next steps
3. Commits all work
4. Says "FLUSH COMPLETE" — the system auto-continues

The `/flush` command triggers this manually.

## Identity

Soma doesn't come pre-configured with a personality. She **discovers** who she is through working with you. Her `identity.md` is written by her, not for her.

On first run, Soma sees an empty identity file and writes her own based on the workspace and your interactions.

## Muscles

Patterns observed across sessions become **muscles** — reusable knowledge files that load automatically when relevant.

Examples:
- A muscle for your project's deployment process
- A muscle for your preferred code style
- A muscle for how to handle a specific API

Muscles live in `.soma/memory/muscles/` and grow organically.

## Context Management

Soma monitors context usage and provides escalating warnings:

| Threshold | Action |
|-----------|--------|
| 50% | Info notification |
| 70% | Wrap-up warning |
| 80% | Flush soon warning |
| 85% | **Auto-flush** — writes preload, commits, continues |

This prevents context loss and enables seamless multi-session work.
