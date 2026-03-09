---
type: index
status: active
created: 2026-03-07
updated: 2026-03-07
---

# Protocols

Operational protocol files loaded by Soma at boot. These are **dense, agent-facing rules** — not documentation.

## Two-Tier System

Every protocol exists in two forms:

| Tier | Location | Audience | Size |
|------|----------|----------|------|
| **Spec** | `curtismercier/protocols/<name>/README.md` | Humans, implementors | 3-10KB, educational |
| **Operational** | `.soma/protocols/<name>.md` | The agent, at runtime | 1-3KB, compressed rules |

The spec is the full rationale, examples, edge cases. The operational file is the distilled "just follow these rules" version that fits in a system prompt.

## Operational File Format

```yaml
---
type: protocol
name: <kebab-case-name>
version: <semver>
status: active | draft | planned
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
author: Curtis Mercier
license: MIT
heat-default: hot | warm | cold
scope: local | shared
tier: free | enterprise
upstream: curtismercier/protocols/<name>/
breadcrumb: "<1-2 sentence TL;DR for warm loading — this is ALL the agent sees when the protocol isn't hot>"
tags: [searchable, keywords]
---

# <Protocol Name>

## Rule
<The core behavioral rule. Dense. Imperative. No fluff.>

## When to Apply
<Trigger conditions — when should the agent activate this protocol?>

## When NOT to Apply
<Negative conditions — exceptions, edge cases to skip.>
```

### Required Fields

- `name`, `heat-default`, `breadcrumb` — the loading system needs these
- `upstream` — links back to the full spec (omit if no published spec exists)

### Heat Defaults

- **hot** — always fully loaded into system prompt (reserve for core behaviors)
- **warm** — breadcrumb only (good for situational protocols)
- **cold** — listed by name, agent can reference if needed

### Body Rules

- **Under 2KB body** — this goes into the system prompt. Every byte counts.
- **Imperative voice** — "Do X", "Never Y", not "You should consider X"
- **No examples unless critical** — the spec has examples, the operational file has rules
- **No rationale** — the spec explains why, the operational file says what

## Directory Layout

```
.soma/protocols/
├── README.md                    ← this file
├── breath-cycle.md              ← hot: session lifecycle
├── frontmatter-standard.md      ← warm: document metadata
├── heat-tracking.md             ← hot: protocol temperature system
├── git-identity.md              ← warm: commit attribution
└── drafts/                      ← not loaded, incubating
    └── collaborative-flow.md
```

Drafts are never loaded — they live in `drafts/` until promoted to the root.
