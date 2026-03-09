---
type: plan
status: draft
created: 2026-03-10
updated: 2026-03-10
tags: [architecture, protocols, heat-tracking, system-prompt, plugin, enterprise]
related: [plugin-architecture, light-core-architecture, breath-cycle]
---

# Protocol Architecture — Design Document

> Protocols are behavioral rules the agent follows. Drop a `.md` into `.soma/protocols/`, and the agent becomes aware of it. Use it enough and it auto-loads into the system prompt. This is the nervous system's thermostat.

## The Insight

Skills tell an agent *how to do things*. Protocols tell an agent *how to be*. A skill is "generate a favicon." A protocol is "always use frontmatter on documents" or "exhale memory at session end" or "heat-track what matters."

Protocols are plug-and-play behavioral rules. And the system that governs which protocols are active... is itself a protocol.

---

## Four-Layer Plugin Model

With protocols, Soma's plugin architecture becomes four layers:

| Layer | What | Format | Installs To | Who Makes Them |
|-------|------|--------|-------------|----------------|
| **Extensions** | Runtime hooks into Pi lifecycle | `.ts` | `~/.soma/agent/extensions/` | Power users / Soma core |
| **Skills** | Knowledge + procedures | `.md` | `~/.soma/agent/skills/` | Anyone |
| **Rituals** | Multi-step skills with `/trigger` | `.md` | `~/.soma/agent/skills/` | Anyone |
| **Protocols** | Behavioral rules / standards | `.md` | `.soma/protocols/` | Anyone |

### How They Differ

**Skills** = "I know how to do X" → loaded on-demand when task matches
**Protocols** = "I always do X this way" → loaded by temperature into system prompt
**Rituals** = "When user says /X, follow these steps" → triggered by command
**Extensions** = "I hook into lifecycle event X" → always running

Skills are **reactive** (loaded when needed). Protocols are **ambient** (shape behavior continuously). That's the core distinction.

---

## Protocol File Format

```markdown
---
type: protocol
name: frontmatter-standard
version: 1.0.0
status: active
created: 2026-03-10
author: Curtis Mercier
license: MIT
tags: [frontmatter, documentation, standards]
heat-default: warm

# The compressed version injected at warm temperature
breadcrumb: "All .md files get YAML frontmatter: type, status, created, updated. 8 statuses: draft/active/stable/stale/archived/deprecated/blocked/review."
---

# Frontmatter Standard Protocol

## Rule

Every Markdown document in a Soma-managed workspace MUST have YAML frontmatter with at minimum:

- `type` — what kind of document (plan, spec, note, index, memory, etc.)
- `status` — lifecycle state (draft, active, stable, stale, archived, deprecated, blocked, review)
- `created` — ISO date
- `updated` — ISO date

## When to Apply

- Creating any new `.md` file
- Editing a file that's missing frontmatter (add it)
- Reviewing documents (check for stale status)

## Examples

...full examples, edge cases, detailed rules...
```

Key frontmatter fields:
- **`breadcrumb`** — the compressed one-liner that gets injected at warm temperature. This is what makes it token-efficient. The full doc might be 200 lines; the breadcrumb is 1-2 sentences.
- **`heat-default`** — starting temperature when first discovered. Core protocols can start `warm` or `hot`. Community ones start `cold`.

---

## The Heat Model

### Temperature Scale

```
COLD (0-2)          WARM (3-7)           HOT (8+)
│                    │                    │
│ Discoverable.      │ Breadcrumb in      │ Full protocol
│ Not loaded.        │ system prompt.      │ in system prompt.
│ Agent can find     │ Agent is "aware"    │ Agent follows
│ via search if      │ — knows the rule    │ with full detail.
│ asked.             │ exists, applies     │
│                    │ the gist.           │
│                    │                     │
│ .protocol-state:   │ .protocol-state:    │ .protocol-state:
│ { heat: 1 }        │ { heat: 5 }        │ { heat: 9 }
└────────────────────┴─────────────────────┘
```

### Heat Events

| Event | Heat Change | Description |
|-------|------------|-------------|
| Protocol discovered (first seen) | Set to `heat-default` or 0 | Folder scan picks it up |
| User explicitly references | +2 | "Use the frontmatter protocol" |
| Agent applies in action | +1 | Agent adds frontmatter to a file |
| Loaded into system prompt | +0 (no change) | Just being loaded doesn't heat it |
| Session ends, was referenced | +0 (holds) | No decay if used this session |
| Session ends, was NOT referenced | -1 | Cooling. Unused protocols fade |
| User says "always use X" | Set to HOT (10) | Manual override, pins it |
| User says "stop using X" | Set to COLD (0) | Manual override, kills it |

### Thresholds (configurable in settings.json)

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

Token budget matters. You can't shove 20 full protocols into a system prompt. The limits enforce economy:
- Max 10 breadcrumbs (warm) — ~10-20 tokens each = ~200 tokens
- Max 3 full protocols (hot) — ~200-500 tokens each = ~1500 tokens
- If more protocols are hot than the limit, highest heat wins

### State File

```json
// .soma/.protocol-state.json
{
  "version": 1,
  "updated": "2026-03-10T18:30:00Z",
  "protocols": {
    "frontmatter-standard": {
      "heat": 7,
      "last_referenced": "2026-03-10",
      "times_applied": 14,
      "first_seen": "2026-03-01",
      "pinned": false
    },
    "breath-cycle": {
      "heat": 10,
      "last_referenced": "2026-03-10",
      "times_applied": 42,
      "first_seen": "2026-02-15",
      "pinned": true
    },
    "heat-tracking": {
      "heat": 2,
      "last_referenced": "2026-03-08",
      "times_applied": 3,
      "first_seen": "2026-03-07",
      "pinned": false
    }
  }
}
```

---

## Boot Integration (Breath Cycle)

### Inhale Phase

During soma-boot (the inhale), the extension:

1. Scans `.soma/protocols/` for `.md` files
2. Reads `.soma/.protocol-state.json` for heat values
3. For new protocols (no state entry): assigns `heat-default` from frontmatter, or 0
4. Sorts by heat descending
5. Builds the protocol injection:
   - HOT protocols (≤ max_full): full content injected
   - WARM protocols (≤ max_breadcrumbs): breadcrumb string injected
   - COLD protocols: not injected, but listed in a "available protocols" note
6. Injects into system prompt

```
## Active Protocols

### [HOT] Breath Cycle
<full protocol content here>

### [HOT] Frontmatter Standard  
<full protocol content here>

## Awareness (use when relevant)
- **Heat Tracking**: Track usage frequency of patterns; surface what matters most
- **Git Branching**: dev/main model, daily push to dev = backup
- **Code Review**: Always review before merge, check for...

## Available (not loaded — reference if needed)
- naming-conventions
- deployment-checklist
```

### Exhale Phase

At session end (or during flush):

1. Review which protocols were referenced/applied this session
2. Update heat scores in `.protocol-state.json`
3. Apply decay to unreferenced protocols
4. If a protocol crossed a threshold (cold→warm, warm→hot), note it

This means the agent's behavioral context **evolves across sessions** based on what actually gets used. Protocols that matter rise. Protocols that don't, fade. No manual curation needed.

---

## Protocol Scoping: Project vs Global

```
~/.soma/protocols/              ← user-global protocols (your defaults)
  ├── breath-cycle.md
  ├── frontmatter-standard.md
  └── .protocol-state.json

.soma/protocols/                ← project-local protocols (override/extend)
  ├── api-naming.md             ← project-specific
  ├── deployment-checklist.md   ← project-specific
  └── .protocol-state.json      ← separate heat tracking per project
```

Resolution order:
1. Project protocols loaded first
2. Global protocols loaded if not shadowed by project (same name = project wins)
3. Heat tracked separately per scope (a protocol can be hot globally but cold in a specific project)

---

## Community Sharing

Protocols are the most shareable artifact in Soma. Skills are task-specific. Extensions are runtime-specific. But protocols are universal behavioral patterns.

```bash
soma protocol install code-review-standard
soma protocol install api-naming-conventions
soma protocol install git-conventional-commits
```

**Community protocol registry** (same pattern as skills):

```json
{
  "protocols": [
    {
      "name": "conventional-commits",
      "description": "Enforces conventional commit message format",
      "version": "1.0.0",
      "author": "community",
      "breadcrumb": "Commit messages: type(scope): description. Types: feat, fix, docs, style, refactor, test, chore.",
      "category": "git",
      "keywords": ["git", "commits", "standards"]
    }
  ]
}
```

The registry can live alongside skills in the same index, distinguished by `type: protocol`.

---

## Enterprise vs Free

| Feature | Free (soma) | Enterprise (agent) |
|---------|-------------|-------------------|
| Protocol folder discovery | ✅ | ✅ |
| Manual protocol loading | ✅ | ✅ |
| Core protocols (3-5 built-in) | ✅ | ✅ |
| Community protocol install | ✅ | ✅ |
| Heat tracking | ❌ | ✅ |
| Auto system prompt injection | ❌ | ✅ |
| Breadcrumb compression | ❌ | ✅ |
| Heat decay / rise across sessions | ❌ | ✅ |
| Protocol state persistence | ❌ | ✅ |
| Custom thresholds in settings.json | ❌ | ✅ |
| Parent-child protocol inheritance | ❌ | ✅ |

Free tier: you get protocols as reference docs. The agent can read them when asked. But there's no automatic heating, no system prompt injection, no ambient awareness. You have to explicitly say "follow the frontmatter protocol."

Enterprise: the agent evolves. Protocols rise and fall. The system prompt adapts. The agent gets smarter about what matters in YOUR workflow. That's the value.

---

## The Meta-Protocol

Heat tracking itself is a protocol. That's the recursive beauty. You could write:

```markdown
---
type: protocol
name: heat-tracking
breadcrumb: "Track how often patterns/protocols/tools are used. Frequently used = always loaded. Unused = fade out. Heat rises on use, decays on neglect."
heat-default: hot
---
```

It starts hot because it governs the system. But even it could theoretically cool down if you stopped using it — though in practice, it's the engine that makes everything else work.

The breath cycle is also a meta-protocol — it governs how protocols load (inhale) and how heat updates (exhale).

Core meta-protocols that should ship hot:
1. **Breath Cycle** — inhale/exhale session lifecycle
2. **Heat Tracking** — the temperature system itself
3. **Identity System** — who the agent is, layered identity

These three are the kernel. Everything else orbits them.

---

## Relationship to Published Specs (curtismercier/protocols)

The published CC BY 4.0 specs in `curtismercier/protocols` are the **formal documentation** of protocol concepts. The `.md` files in `.soma/protocols/` are the **operational implementations** — compressed, actionable, agent-readable.

```
curtismercier/protocols/amp/spec.md          → formal spec (for humans, for the community)
.soma/protocols/amp.md                        → operational protocol (for the agent, breadcrumb + rules)
```

The published specs explain *why*. The operational protocols say *what to do*. The agent doesn't need to read a 2000-word spec to follow a protocol — it needs the breadcrumb and the rules.

`protocol-sync.sh` could eventually sync: pull latest spec → regenerate operational `.md` with updated breadcrumb. But that's future automation.

---

## Implementation Priority

| # | What | Effort | Tier |
|---|------|--------|------|
| 1 | Protocol folder convention (`.soma/protocols/`) | Tiny | Free |
| 2 | Protocol `.md` format with breadcrumb frontmatter | Tiny | Free |
| 3 | Boot scan: discover protocols, list in system prompt | Small | Free |
| 4 | `.protocol-state.json` schema | Small | Enterprise |
| 5 | Heat tracking: events, decay, thresholds | Medium | Enterprise |
| 6 | System prompt injection: breadcrumbs (warm) + full (hot) | Medium | Enterprise |
| 7 | `soma protocol install` CLI command | Small | Free |
| 8 | Community protocol registry (extend skill-index.json) | Small | Free |
| 9 | Settings.json protocol config | Small | Enterprise |
| 10 | Parent-child protocol inheritance | Medium | Enterprise |

## Open Questions

1. **Should protocols version independently from the agent?** Probably yes — a protocol update shouldn't require a soma update.
2. **Can protocols conflict?** What if two protocols give contradictory rules? Need a precedence system (project > global, higher heat > lower heat, explicit pin > auto).
3. **Should the agent be able to propose new protocols?** "I notice you always do X — should I create a protocol for that?" That's muscle-to-protocol graduation. Very enterprise.
4. **Heat persistence across projects?** If you use frontmatter-standard in every project, should global heat reflect that? Or is each project isolated?
5. **Protocol dependencies?** Heat-tracking depends on breath-cycle. Should protocols declare dependencies? Probably overkill for v1.
