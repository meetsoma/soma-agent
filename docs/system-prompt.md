---
title: "System Prompt"
description: "How Soma's compiled system prompt is assembled, configured, and previewed."
section: "Core Concepts"
order: 7
---

# System Prompt

<!-- tldr -->
Soma compiles a layered system prompt from: static core → identity → protocols/muscles (behavioral) → docs → guard awareness → CLAUDE.md note → skills. Each section is toggleable via `systemPrompt` settings. Preview with `/soma prompt`. Token budget defaults to 4000 (currently well within range). Identity placement, docs inclusion, and guard awareness are all configurable.
<!-- /tldr -->

## How It's Built

Soma's system prompt is **compiled** at boot from multiple sources. The assembly runs in a fixed order:

| Order | Section | Source | Toggleable |
|-------|---------|--------|------------|
| 1 | Static core | Built-in behavioral rules | No |
| 2 | Identity | `identity.md` (layered: project → parent → global) | `identityInSystemPrompt` |
| 3 | Protocols | Hot = full body, warm = breadcrumb (sorted by heat, capped) | No |
| 4 | Muscles | Hot = full body, warm = digest (within token budget) | No |
| 5 | Soma docs | Documentation references | `includeSomaDocs` |
| 6 | Pi docs | Pi framework documentation | `includePiDocs` |
| 7 | Guard awareness | File protection rules from `guard` settings | `includeGuardAwareness` |
| 8 | CLAUDE.md note | Awareness marker (if file exists in project root) | `includeContextAwareness` |
| 9 | Skills | Pi skills block | `includeSkills` |

Protocols and muscles are always included (they're the core of Soma's memory) — their loading is controlled by the heat system and token budgets, not by system prompt toggles.

## Configuration

All toggles live under the `systemPrompt` key in `settings.json`:

```json
{
  "systemPrompt": {
    "maxTokens": 4000,
    "includeSomaDocs": true,
    "includePiDocs": true,
    "includeContextAwareness": true,
    "includeSkills": true,
    "includeGuardAwareness": true,
    "identityInSystemPrompt": true
  }
}
```

| Key | Default | What It Controls |
|-----|---------|-----------------|
| `maxTokens` | `4000` | Estimated token budget for Soma's portion of the system prompt |
| `includeSomaDocs` | `true` | Soma documentation references (links to docs, how to learn more) |
| `includePiDocs` | `true` | Pi framework documentation references |
| `includeContextAwareness` | `true` | Note about CLAUDE.md presence (if file exists) |
| `includeSkills` | `true` | Skills block from Pi (available skills list) |
| `includeGuardAwareness` | `true` | Guard rules (core file protection, git identity) |
| `identityInSystemPrompt` | `true` | Whether identity goes in system prompt or user message |

## Previewing

Use `/soma prompt` to see the fully assembled system prompt:

```
/soma prompt
```

This shows:
- Each section with its content
- Which toggles are active/inactive
- Estimated token count
- Whether sections were skipped (and why)

Useful for debugging when the agent isn't behaving as expected — see exactly what it's receiving.

## Token Metabolism

The system prompt competes for space in the model's context window. Soma's portion typically uses **500–1600 estimated tokens** depending on how many protocols and muscles are hot.

The `maxTokens` setting (default: 4000) is a budget cap. Currently, prompts are well within this budget, so no trimming occurs. If the budget is exceeded in the future, Soma would trim in this order:

1. Muscle digests (nice-to-have)
2. Protocol breadcrumbs (past the first 3 hottest)
3. Documentation references
4. Guard awareness
5. CLAUDE.md note
6. **Never trimmed:** Static core, identity, tools, skills

## Identity Placement

By default, identity loads into the system prompt between the static core and behavioral sections. This gives it high priority in the model's attention.

Setting `identityInSystemPrompt: false` moves identity to a user message instead. This can be useful if you want identity to be more conversational and less "baked in," but most users should leave this at the default.

## Related

- [Configuration](/docs/configuration#system-prompt) — all toggle settings
- [How It Works](/docs/how-it-works#the-compiled-system-prompt) — overview of the assembly process
- [Identity](/docs/identity) — how identity is layered and loaded
- [Heat System](/docs/heat-system) — how protocol/muscle loading is determined
