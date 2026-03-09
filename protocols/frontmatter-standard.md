---
type: protocol
name: frontmatter-standard
version: 1.0.0
status: active
created: 2026-03-10
updated: 2026-03-10
author: Curtis Mercier
license: MIT
heat-default: warm
upstream: curtismercier/protocols/atlas/
breadcrumb: "All .md files get YAML frontmatter: type, status, created, updated. 8 statuses: draft/active/stable/stale/archived/deprecated/blocked/review. 12 types: plan/spec/note/index/memory/muscle/protocol/decision/log/template/identity/config."
---

# Frontmatter Standard Protocol

## Rule

Every Markdown document in a Soma-managed workspace MUST have YAML frontmatter.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Document type (see below) |
| `status` | string | Lifecycle state (see below) |
| `created` | date | ISO date of creation |
| `updated` | date | ISO date of last meaningful update |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `tags` | string[] | Searchable keywords |
| `related` | string[] | Links to related docs |
| `owner` | string | Who owns this doc |
| `priority` | string | high/medium/low |
| `heat-default` | string | For protocols: starting temperature |
| `breadcrumb` | string | For protocols: compressed TL;DR |

### Valid Types (12)

`plan` · `spec` · `note` · `index` · `memory` · `muscle` · `protocol` · `decision` · `log` · `template` · `identity` · `config`

### Valid Statuses (8)

`draft` · `active` · `stable` · `stale` · `archived` · `deprecated` · `blocked` · `review`

## When to Apply

- Creating any new `.md` file → add frontmatter
- Editing a file missing frontmatter → add it
- Updating content → bump `updated` date
- Reviewing docs → check for `stale` status (not updated in 30+ days)

## When NOT to Apply

- README.md in public repos (conventional format, no frontmatter expected)
- Third-party docs or generated files
- Files explicitly marked as frontmatter-exempt
