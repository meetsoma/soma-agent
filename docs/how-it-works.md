---
title: "How It Works"
description: "Breath cycle, identity, muscles, protocols, context management."
section: "Core Concepts"
order: 2
---


<!-- tldr -->
Sessions are breaths: inhale (configurable boot steps: identity, preload, protocols, muscles, scripts, git-context) → work → breathe or exhale (save state, decay heat, write preload). Git context loads recent commits/diffs automatically. Heat system loads hot content fully, warm as breadcrumbs, cold stays dormant. Context warnings and preload staleness are configurable. All thresholds in `settings.json`.
<!-- /tldr -->

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

When Soma boots, she runs a configurable sequence of **boot steps**:

| Step | What Loads | Default |
|------|-----------|---------|
| `identity` | Layered identity (project → parent → global) | ✅ On |
| `preload` | Last session's state (on `--continue` only) | ✅ On |
| `protocols` | Behavioral rules, sorted by heat tier | ✅ On |
| `muscles` | Learned patterns, within token budget | ✅ On |
| `scripts` | Available `.soma/scripts/` with descriptions | ✅ On |
| `git-context` | Recent commits and changed files from git | ✅ On |

The boot sequence is configurable in `settings.json` — remove steps you don't want, reorder to change priority. See [Configuration](/docs/configuration#boot-sequence).

Fresh sessions (`soma`) load everything except preload. Resumed sessions (`soma -c`) add the preload on top.

#### Git Context

On every boot, Soma checks recent git history and injects a summary of what changed. This gives the agent immediate awareness of the project state without relying on the preload alone.

By default, it shows the last 24 hours of commits and a file-change summary (`--stat`). Configurable:

```json
{
  "boot": {
    "gitContext": {
      "since": "last-session",
      "diffMode": "full",
      "maxCommits": 20
    }
  }
}
```

Set `"enabled": false` to disable. See [Configuration](/docs/configuration#git-context).

### Exhale

When context fills up, Soma automatically breathes — saving state and continuing into a fresh session. You can also trigger this manually:

- **`/breathe`** — save state + auto-continue (seamless rotation)
- **`/exhale`** — save state + stop (alias: `/flush`)
- **`/rest`** — disable keepalive + exhale (for when you're done for the night)

Either way, Soma:
1. Writes a **preload** for the next session (`preload-next.md`)
2. Saves protocol and muscle heat state
3. Commits all work

## Identity

Soma doesn't come pre-configured with a personality. She **discovers** who she is through working with you. Her `identity.md` is written by her, not for her.

On first run, Soma sees an empty identity file and writes her own based on the workspace and your interactions. See [Identity](/docs/identity) for the full guide on discovery, layering, and customization.

## Muscles

Patterns observed across sessions become **muscles** — reusable knowledge files that load automatically when relevant.

Examples:
- A muscle for your project's deployment process
- A muscle for your preferred code style
- A muscle for how to handle a specific API

Muscles live in `.soma/memory/muscles/` and grow organically. Like protocols, they're loaded by **heat** — frequently-used muscles get full content in the prompt, less-used ones get a digest summary, and cold ones stay available but unloaded. See [Muscles](/docs/muscles) for the full guide on writing muscles and the digest system.

## Protocols

Protocols are behavioral rules that guide Soma's actions: how to format files, how to attribute git commits, when to exhale. They live in `.soma/protocols/` as markdown files with frontmatter.

### Heat System

Every protocol has a temperature:
- 🔥 **Hot** (8+) — full body loaded into system prompt
- 🟡 **Warm** (3–7) — breadcrumb reminder only (one sentence)
- ❄️ **Cold** (0–2) — name listed, content not loaded

Heat rises when protocols get used (+1 per action, +2 per explicit reference) and decays by 1 each session if unused. You can also `/pin` a protocol to keep it hot or `/kill` it to drop to cold. All thresholds are configurable in [Configuration](/docs/configuration#protocols-heat-thresholds).

See [Heat System](/docs/heat-system) for the complete guide.

##***REMOVED*** Scoping

Protocols declare which projects they apply to via an `applies-to` field. For example, `git-identity` only loads in projects with a `.git/` directory. Meta-protocols like `breath-cycle` use `applies-to: [always]`.

Available signals: `always`, `git`, `typescript`, `javascript`, `python`, `rust`, `go`, `frontend`, `docs`, `multi-repo`.

See [Protocols](/docs/protocols) for how to write your own.

## Cache Keepalive

Soma automatically keeps the model's prompt cache warm between turns. When you're reading docs, thinking, or reviewing code, the cache stays hot — so the next response is fast and cheap.

The keepalive sends a lightweight ping every ~4.5 minutes (configurable via the 300-second cache TTL). The statusline shows `◷` when keepalive is active.

**Commands:**
- **`/keepalive on`** — enable keepalive (default: on)
- **`/keepalive off`** — disable keepalive
- **`/keepalive status`** — show cache state and ping count
- **`/rest`** — disables keepalive + exhales in one motion (for end of session)

## Context Management

Soma monitors context usage and provides escalating warnings. All thresholds are configurable in [Configuration](/docs/configuration#context-warnings):

| Threshold | Default | Action |
|-----------|---------|--------|
| `notifyAt` | 50% | Info notification |
| `urgentAt` | 80% | "Wrap up" warning injected into prompt |
| `autoExhaleAt` | 85% | **Auto-flush** — writes preload, commits, continues |

For longer sessions, push thresholds up. For aggressive context management, pull them down.
