---
type: index
status: active
created: 2026-03-07
updated: 2026-03-09
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
status: active | draft
updated: <YYYY-MM-DD>
heat-default: hot | warm | cold
scope: shared          # only if protocol flows up to parent
tier: enterprise       # only if gated
tags: []               # for soma-scan --related filtering
breadcrumb: "<1-2 sentence TL;DR for warm loading>"
---
```

### What's in frontmatter vs trailing comment

**Frontmatter** — fields read by runtime code OR tooling (soma-scan, protocol-sync):
- `type`, `status`, `updated` → soma-scan filters and staleness
- `tags` → soma-scan `--related` search
- `name`, `heat-default`, `breadcrumb`, `scope`, `tier` → runtime protocol loader

**Trailing comment** — human reference only, not consumed by anything:
```markdown
<!-- v1.0.0 | created: 2026-03-10 | MIT | Curtis Mercier | upstream: curtismercier/protocols/<name>/ -->
```

### Token efficiency

Frontmatter stays rich on disk — tools need it. But **only the breadcrumb or body** gets injected into the system prompt. The `buildProtocolInjection()` function strips frontmatter before injection. Token savings come from the loading tier (cold/warm/hot), not from stripping the file.

### Body Rules

- **Under 2KB body** — this goes into the system prompt. Every byte counts.
- **Imperative voice** — "Do X", "Never Y", not "You should consider X"
- **No examples unless critical** — the spec has examples, the operational file has rules
- **No rationale** — the spec explains why, the operational file says what

## Directory Layout

```
.soma/protocols/
├── README.md                    ← this file (skipped by loader)
├── _template.md                 ← template (skipped by loader)
├── breath-cycle.md              ← hot: session lifecycle
├── heat-tracking.md             ← hot: protocol temperature system
├── frontmatter-standard.md      ← warm: document metadata
├── git-identity.md              ← warm: commit attribution
└── drafts/                      ← not loaded, incubating
```

Drafts are never loaded — they live in `drafts/` until promoted to the root.
