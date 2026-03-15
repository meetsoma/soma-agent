---
type: protocol
name: heat-tracking
status: active
heat-default: warm
applies-to: [always]
breadcrumb: "Soma loads protocols and muscles by temperature: cold (skip), warm (breadcrumb), hot (full). Heat auto-adjusts from usage patterns and decays when idle. /pin and /kill for manual control."
version: 2.0.0
tier: core
scope: bundled
tags: [memory, loading, performance, self-awareness]
created: 2026-03-09
updated: 2026-03-14
author: Curtis Mercier
license: CC BY 4.0
---
# Heat Tracking

> How Soma decides what to load into your context. The heat system runs automatically — this protocol helps you understand and tune it.

## TL;DR
Cold (0-2): skipped. Warm (3-7): TL;DR only. Hot (8+): full body. Heat decays each session, bumps on use. `/pin` heats, `/kill` drops to 0.

## How It Works

Every protocol and muscle has a heat value. Higher heat = more presence in your system prompt.

| Heat | State | What Loads |
|------|-------|-----------|
| 0-2 | Cold | Nothing. Listed as "available" in boot. |
| 3-7 | Warm | Breadcrumb — 1-2 sentence summary. |
| 8+ | Hot | Full content injected into system prompt. |

### Auto-Detection

Soma watches tool results and bumps heat when it sees relevant patterns:
- Frontmatter writes → `frontmatter-standard` +1
- Git commands → `git-identity` +1
- Preload writes → `breath-cycle` +1
- Checkpoint commits → `session-checkpoints` +1

**Limitation:** most protocol usage isn't detectable from tool results. A protocol like `working-style` has no tool signature — its heat only changes via manual `/pin` or `heat-default` in frontmatter.

### Decay

On session end, unused protocols lose `decayRate` heat (default: 1). A protocol you stop using naturally fades from context. Use `/pin` to keep something hot.

## Settings

```jsonc
{
  "protocols": {
    "warmThreshold": 3,
    "hotThreshold": 8,
    "maxHeat": 15,
    "decayRate": 1,
    "maxBreadcrumbsInPrompt": 10,
    "maxFullProtocolsInPrompt": 3
  },
  "muscles": {
    "tokenBudget": 2000,
    "maxFull": 2,
    "maxDigest": 8
  },
  "heat": {
    "autoDetect": true,
    "autoDetectBump": 1,
    "pinBump": 5
  }
}
```

### Tuning Guide

| Goal | Adjust |
|------|--------|
| Load more protocols | Raise `maxFullProtocolsInPrompt`, lower `hotThreshold` |
| Faster protocol rotation | Raise `decayRate` to 2-3 |
| Keep everything loaded | Set `decayRate: 0`, pin what you want |
| Minimize prompt size | Lower `maxFull` and `tokenBudget` |
| Disable auto-detection | Set `autoDetect: false` — manual only |

## Commands

| Command | Effect |
|---------|--------|
| `/pin <name>` | Bump heat by `pinBump` (default +5) |
| `/kill <name>` | Drop heat to 0 |

## Source

- Protocol loading: `core/protocols.ts` → `discoverProtocols()`, `buildProtocolInjection()`
- Muscle loading: `core/muscles.ts` → `discoverMuscles()`, `buildMuscleInjection()`
- Heat state: `.soma/state.json` (protocol heat values)
- Auto-detection: `extensions/soma-boot.ts` → `tool_result` event handler
- Settings: `core/settings.ts` → `ProtocolSettings`, `MuscleSettings`, `HeatSettings`

---

<!--
Licensed under CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Author: Curtis Mercier
-->
