---
type: protocol
name: heat-tracking
status: active
heat-default: warm
applies-to: [always]
breadcrumb: "Protocols have temperature: cold (0-2, not loaded), warm (3-7, breadcrumb in prompt), hot (8+, full in prompt). Heat auto-detected from tool results. Manual: /pin (hot), /kill (cold). Decays -1 per unused session."
author: Curtis Mercier
license: CC BY 4.0
version: 1.2.0
tier: core
scope: bundled
tags: [memory, loading, performance]
spec-ref: curtismercier/protocols/amp (v0.2, §5)
created: 2026-03-09
updated: 2026-03-10
---

# Heat Tracking Protocol

## TL;DR
- Three temperatures: **cold** (0-2, name only), **warm** (3-7, breadcrumb in prompt), **hot** (8+, full body in prompt)
- **Auto-detection is limited:** only specific tool results trigger heat (frontmatter writes, git commands, SVG, checkpoints). Many protocol uses go undetected.
- Manual controls: `/pin <name>` → hot, `/kill <name>` → cold
- Decays -1 per session if unused (on session shutdown)
- Thresholds and limits are configurable in `settings.json`, not fixed

## Rule

Every protocol and muscle has a temperature that determines how it loads into the agent's boot context.

### Temperature Scale

| Range | State | Boot Behavior |
|-------|-------|--------------|
| 0-2 | COLD | Not loaded. Discoverable via search. |
| 3-7 | WARM | Breadcrumb (1-2 sentence TL;DR) injected. |
| 8+ | HOT | Full protocol content injected. |

### How Heat Changes

**Automated (limited set):**
The extension watches `tool_result` events and bumps heat when specific patterns match:

| Pattern | Triggers Heat For |
|---------|------------------|
| Write file with YAML frontmatter | frontmatter-standard |
| Git commands (config/commit/push) | git-identity |
| Write to preload/continuation file | breath-cycle |
| Write .svg file | svg-logo-design (muscle) |
| Checkpoint commits (.soma git) | session-checkpoints |

This is a **limited set**. Many protocol applications (e.g., following community-safe rules, applying pattern-evolution principles) are NOT auto-detected. The heat system will under-count usage for protocols without matching tool patterns.

**Manual:**

| Action | Effect |
|--------|--------|
| `/pin <name>` | Bump heat by `settings.heat.pinBump` (default +5) |
| `/kill <name>` | Drop heat to 0 |

**Decay:**
On session shutdown, any protocol/muscle NOT used this session decays by `settings.protocols.decayRate` (default -1).

### Configuration

In `settings.json` (all values have sensible defaults):

```json
{
  "protocols": {
    "hotThreshold": 8,
    "warmThreshold": 3,
    "maxHot": 3,
    "maxWarm": 10,
    "decayRate": 1
  },
  "heat": {
    "autoDetect": true,
    "autoDetectBump": 1,
    "pinBump": 5
  }
}
```

### State Storage

- **Protocols:** `.protocol-state.json` in `.soma/` — JSON map of name → heat + events
- **Muscles:** `heat:` field in each muscle's YAML frontmatter

## When to Apply

Automatically — during every inhale (protocol/muscle loading) and every session shutdown (decay). The extension handles this.

## When NOT to Apply

If you prefer static loading (all protocols always fully loaded), set all heat values high and `decayRate: 0`. Works fine for small protocol sets.
