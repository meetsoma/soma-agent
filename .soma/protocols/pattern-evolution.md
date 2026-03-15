---
type: protocol
name: pattern-evolution
status: active
heat-default: warm
applies-to: [always]
breadcrumb: "Patterns mature through layers: Skills (knowledge) → Muscles (learned) → Protocols (universal rules) → Automations (executable). Identity sharpens protocols for a specific project but never replaces them. Protocols should work without identity. During mid-session reflections, check: should this observation become a muscle? Should this muscle become a protocol? Is this identity line actually universal?"
author: Curtis Mercier
license: CC BY 4.0
version: 1.4.0
tier: core
scope: bundled
tags: [learning, patterns, growth]
spec-ref: curtismercier/protocols/amp (v0.2, §3.2)
created: 2026-03-09
updated: 2026-03-14
---

# Pattern Evolution Protocol

## TL;DR
Maturation: Skills → Muscles → Protocols → Automations. Born from gaps and repeated friction. Not every pattern climbs the full ladder.

## The Maturation Layers

```
observation (noticed gap, repeated action)
  ↓ write it down as reusable knowledge
skill (plug-and-play expertise — works across frameworks)
  ↓ applied repeatedly, patterns emerge
muscle (learned pattern — refines through use, tracked by heat)
  ↓ becomes mandatory, skipping causes failures
protocol (behavioral rule — universal, ships to all users)
  ↓ becomes executable, runs without thinking
automation (executable workflow — hooks, rituals, enforcement)
```

| Layer | When | Nature |
|-------|------|--------|
| **Skill** | Domain knowledge — teaches, doesn't enforce. Works across any agent. | On-demand. |
| **Muscle** | Repeated pattern — refines through use, builds heat. | Learned. |
| **Protocol** | Pattern becomes a behavioral *rule*. Skipping it causes mistakes. | Mandatory. |
| **Automation** | Protocol becomes executable — enforces without thinking. | Automatic. |

Automations are the final crystallization. The protocol explains *why*; the automation enforces *how*. An agent with the automation but without the protocol can't reason about edge cases.

## Identity: The Override Layer

Identity sits outside the maturation ladder. It doesn't replace protocols — it sharpens them for a specific project.

```
protocol: "Verify after you build"           ← universal rule
identity: "Verify using soma-verify.sh"      ← project-specific application
```

**Protocols should work without identity.** A user who never writes an identity file should still get useful behavior from protocols alone. If a protocol requires project-specific knowledge to be useful, it's too narrow.

**Identity overrides, never conflicts.** Identity can make protocols more specific ("always use X tool for verification") but shouldn't contradict them. If identity says "skip verification" and a protocol says "always verify," that's a design problem in the protocol (too rigid) or the identity (too reckless).

**The reverse check:** During mid-session reflections, scan identity for lines that aren't project-specific. If a principle would help any Soma user, extract it into a protocol. Identity accumulates fast — protocols should accumulate the universal parts.

```
identity insight: "After structural changes, verify scripts still produce correct output"
  ↓ is this project-specific? No — it's universal.
  ↓ extract to protocol (quality-standards or tool-discipline)
  ↓ identity keeps the project-specific version: "run soma-verify.sh after path changes"
```

## How Muscles Are Born

Muscles come from **gaps** — not from planning sessions.

| Source | Example |
|--------|---------|
| Agent notices own friction | "I keep checking test counts manually" |
| Agent notices user friction | "User keeps asking me to open URLs" |
| Post-incident | "We deleted working automations with no cleanup protocol" |
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
| Skill → Muscle | You keep applying this knowledge — it's becoming a pattern. |
| Muscle → Protocol | Skipping it causes failures. It's not optional. AND it's universal — not project-specific. |
| Protocol → Automation | The rule is clear enough to enforce without thinking. |
| Identity → Protocol | The insight isn't project-specific. Extract the universal part. |
| Muscle stays muscle | Useful pattern but doesn't rise to rule/workflow. |

## When to Check for Evolution

**Mid-session reflections** are the best time. You've been doing real work, you have context, and the patterns are fresh. During session log writing:

1. **Check observations** — do any of these recur from previous sessions? If so → muscle.
2. **Check muscles** — are you following any muscle so consistently that skipping it would be a mistake? If so → protocol candidate.
3. **Check identity** — did you add anything this session? Is any of it universal? If so → extract to protocol.
4. **Check gaps** — did you hit an issue that a tool should have caught? If so → update the tool AND the muscle/protocol that references it.

The session log's Observations section is the raw material. The reflection is where you ask: *should this stay an observation, or has it earned promotion?*

## What Doesn't Evolve

- One-off solutions (specific bug fix, not a pattern)
- Context-dependent decisions ("we chose React for this project")
- Preferences that change weekly (not a pattern yet)
- Low-heat muscles after 10 unused sessions (consider retiring, not deleting)

## When to Apply

Always. This protocol governs how the agent's knowledge base grows.

## When NOT to Apply

Don't force evolution. If a pattern hasn't naturally emerged, don't manufacture it. The hierarchy is descriptive (what happens) not prescriptive (what must happen on schedule).

---

<!--
Licensed under CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Author: Curtis Mercier
-->
