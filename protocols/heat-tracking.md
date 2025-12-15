---
type: protocol
name: heat-tracking
version: 1.0.0
status: planned
created: 2026-03-10
updated: 2026-03-10
author: Soma Team
license: MIT
heat-default: hot
tier: enterprise
breadcrumb: "Protocols have temperature: cold (not loaded), warm (breadcrumb in prompt), hot (full in prompt). Heat rises on use (+1/+2), decays per session if unused (-1). Thresholds configurable in settings.json."
---

# Heat Tracking Protocol

> This protocol is self-referential — it governs its own loading behavior.

## Rule

Every protocol in `.soma/protocols/` has a temperature that determines how it loads into the agent's system prompt.

### Temperature Scale

| Range | State | System Prompt Behavior |
|-------|-------|----------------------|
| 0-2 | COLD | Not loaded. Discoverable via search. |
| 3-7 | WARM | Breadcrumb (1-2 sentence TL;DR) injected. |
| 8+ | HOT | Full protocol content injected. |

### Heat Events

| Event | Δ Heat | Example |
|-------|--------|---------|
| User explicitly references protocol | +2 | "Use the frontmatter standard" |
| Agent applies protocol in action | +1 | Agent adds frontmatter to a file |
| Session ends, protocol was used | +0 | Heat holds, no decay |
| Session ends, protocol NOT used | -1 | Cooling — unused protocols fade |
| User says "always use X" | → 10 | Manual pin to HOT |
| User says "stop using X" | → 0 | Manual kill to COLD |

### Limits (Token Budget)

```json
{
  "protocols": {
    "warm_threshold": 3,
    "hot_threshold": 8,
    "max_heat": 15,
    "decay_rate": 1,
    "max_breadcrumbs_in_prompt": 10,
    "max_full_protocols_in_prompt": 3
  }
}
```

If more protocols qualify for HOT than `max_full_protocols_in_prompt`, highest heat wins. Same for WARM breadcrumbs.

### State Persistence

Heat state lives in `.soma/.protocol-state.json`. Updated during exhale phase of breath cycle.

```json
{
  "protocols": {
    "frontmatter-standard": {
      "heat": 7,
      "last_referenced": "2026-03-10",
      "times_applied": 14,
      "pinned": false
    }
  }
}
```

## When to Apply

During every inhale (protocol loading) and every exhale (heat update). This protocol is always-on — it's the engine that makes the protocol system adaptive.

## Enterprise Note

Heat tracking is an enterprise feature. Free tier loads protocols statically (all or nothing). Enterprise gets the adaptive temperature system — protocols that matter rise, protocols that don't fade. The agent learns what behavioral rules actually get used.
