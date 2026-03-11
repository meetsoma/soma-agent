---
type: protocol
name: pattern-evolution
status: active
heat-default: warm
applies-to: [always]
breadcrumb: "Patterns mature: observation → muscle → muscle memory → protocol/skill/ritual. Muscles grow from gaps noticed during work. Repetition builds heat fast. Mature patterns crystallize into the system."
author: Curtis Mercier
license: CC BY 4.0
version: 1.1.0
tier: core
tags: [learning, patterns, growth]
spec-ref: curtismercier/protocols/amp (v0.2, §3.2)
created: 2026-03-09
updated: 2026-03-10
---

# Pattern Evolution Protocol

## TL;DR
- Patterns climb: **observation** → **muscle** (seen 2+ times) → **muscle memory** (automatic) → **protocol/skill/ritual** (crystallized)
- Muscles are born from **gaps** — moments where you notice missing patterns, repeated friction, workflow holes
- **Burst heat**: 3+ uses in one session → +3 bonus heat (intense repetition accelerates learning)
- Not every pattern climbs the full ladder. Some stay muscles forever. That's fine.

## The Hierarchy

```
observation (noticed gap, repeated action)
  ↓ seen 2+ times → write it down
muscle (learned pattern, markdown file)
  ↓ loaded repeatedly, applied automatically
muscle memory (subconscious — agent applies without thinking)
  ↓ crystallizes based on nature
protocol | skill | ritual | script
```

| Destination | When | Nature |
|-------------|------|--------|
| **Protocol** | Pattern becomes a behavioral *rule*. Skipping it causes mistakes. | Mandatory. |
| **Skill** | Pattern is domain knowledge. Teaches, doesn't enforce. | On-demand. |
| **Ritual** | Pattern is a multi-step workflow. Sequences actions. | Triggered. |
| **Script** | Pattern is automated — protocol becomes executable enforcement. | Automatic. |

Scripts are the final crystallization. The protocol explains *why*; the script enforces *how*. An agent with the script but without the protocol can't reason about edge cases.

## How Muscles Are Born

Muscles come from **gaps** — not from planning sessions.

| Source | Example |
|--------|---------|
| Agent notices own friction | "I keep checking test counts manually" |
| Agent notices user friction | "User keeps asking me to open URLs" |
| Post-incident | "We deleted working scripts with no cleanup protocol" |
| Cross-session repetition | "Third session in a row doing this sequence" |
| Failed assumption | "API works differently than I assumed" |

**Key insight:** The user's repeated behaviors are the richest source. When you notice a pattern — how they like PRs structured, a testing sequence they always follow — that's a muscle waiting to be written.

## Burst Heat *(aspirational — not yet implemented)*

Standard: +1 applied in action, +2 explicitly referenced.

**Burst modifier:** 3+ uses in one session → +3 bonus heat. Intense repetition in a short window builds muscle memory faster than occasional use over months.

> **Implementation status:** Heat auto-detection exists but is limited to specific tool result patterns. Burst counting and the +2 "explicit reference" detection are not yet coded. See heat-tracking protocol for what's actually automated.

## Evolution Triggers

| From → To | Signal |
|-----------|--------|
| Muscle → Protocol | Skipping it causes failures. It's not optional. |
| Muscle → Skill | It's domain knowledge, loads on demand, not a rule. |
| Muscle → Ritual | It's a repeatable multi-step workflow triggered by command. |
| Muscle stays muscle | Useful pattern but doesn't rise to rule/expertise/workflow. |

## What Doesn't Evolve

- One-off solutions (specific bug fix, not a pattern)
- Context-dependent decisions ("we chose React for this project")
- Preferences that change weekly (not a pattern yet)
- Low-heat muscles after 10 unused sessions (consider retiring, not deleting)

## When to Apply

Always. This protocol governs how the agent's knowledge base grows.

## When NOT to Apply

Don't force evolution. If a pattern hasn't naturally emerged, don't manufacture it. The hierarchy is descriptive (what happens) not prescriptive (what must happen on schedule).
