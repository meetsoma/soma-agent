---
type: protocol
name: breath-cycle
status: active
heat-default: warm
applies-to: [always]
breadcrumb: "Soma manages sessions in three phases: inhale (boot — automatic), hold (work — context monitored), exhale (save state — agent-driven). Context thresholds, rotation, and preload injection are all configurable."
version: 2.0.0
tier: core
scope: bundled
tags: [session, memory, continuity, self-awareness]
created: 2026-03-09
updated: 2026-03-14
author: Curtis Mercier
license: CC BY 4.0
---
# Breath Cycle

> How Soma manages session lifecycle. This behavior is built into the boot extension — this protocol helps you understand what's happening and how to change it.

## TL;DR
Three phases: inhale (boot — auto), hold (work — context monitored), exhale (save — agent-driven). Auto-breathe thresholds: `triggerAt` (50%) starts wrap-up, `rotateAt` (70%) writes preload + countdown to rotation, 85% emergency safety net. `graceTurns` (default 2) gives user time to interject before rotation. Commands: `/exhale` (end), `/breathe` (rotate), `/rest` (AFK), `/inhale` (load preload). Settings in `breathe` block.

## How It Works

Soma sessions have three phases, handled by `extensions/soma-boot.ts`:

**Inhale** (automatic on boot)
Identity → preload → protocols → muscles → automations → scripts → git context → compile system prompt. You receive a boot message with the result. No action needed.

**Hold** (automatic monitoring)
Soma watches context usage and notifies at configurable thresholds:
- `breathe.triggerAt` (default 50%) — starts wrap-up suggestions
- `breathe.rotateAt` (default 70%) — writes preload, offers rotation
- 85% — safety net, always fires regardless of settings

**Exhale** (agent-driven)
Triggered by `/exhale`, `/breathe`, `/rest`, or auto at 85%. The agent writes a preload, logs the session, and signals completion.

## Settings

```jsonc
// .soma/settings.json
{
  "breathe": {
    "auto": true,        // enable proactive context management
    "triggerAt": 50,     // % to start suggesting wrap-up
    "rotateAt": 70       // % to auto-rotate into fresh session
  }
}
```

### What changes when you adjust these:

| Setting | Lower value | Higher value |
|---------|------------|-------------|
| `triggerAt` | Earlier wrap-up, shorter sessions, more preloads | Longer sessions, risk of rushed exhale |
| `rotateAt` | Auto-rotates sooner, less context per session | More context per session, risk of hitting 85% wall |
| `auto: false` | No proactive management — only 85% safety net fires | — |

**For deep work sessions:** raise `triggerAt` to 65-70, `rotateAt` to 80. You'll get longer uninterrupted sessions but tighter exhale windows.

**For rapid iteration:** lower `triggerAt` to 40, `rotateAt` to 60. More frequent rotations, cleaner preloads.

## Commands

| Command | Effect |
|---------|--------|
| `/exhale` | Save state, end session |
| `/breathe` | Save + rotate into fresh session |
| `/rest` | Disable keepalive + exhale |
| `/inhale` | Load preload into current session |

## Preload Quality

A good preload is the difference between a productive next session and a wasted one. Key elements:

- **Resume point** — one sentence: what were you doing, where did you stop?
- **What shipped** — commits, features, fixes. Concrete, not vague.
- **Orient From** — exact file paths the next session should read before starting work.
- **Do NOT Re-Read** — files already in context that the next session shouldn't waste tokens on.
- **Actionable next steps** — numbered, with blockers noted. Not a wish list — a plan.

A preload that says "continued working on the feature" is useless. A preload that says "shipped `abc123`, blocked on API auth, next: read `src/auth.ts` lines 40-80" is gold.

## Source

- Boot extension: `extensions/soma-boot.ts` (context monitoring, rotation logic)
- Preload writer: `core/preload.ts` (preload format, staleness check)
- Settings: `core/settings.ts` → `BreatheSettings`

---

<!--
Licensed under CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Original: https://github.com/curtismercier/protocols/tree/main/breath-cycle
Author: Curtis Mercier
-->
