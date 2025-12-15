---
type: spec
status: active
created: 2026-03-10
updated: 2026-03-10
---

# ATLAS Frontmatter Standard

> Part of the ATLAS protocol. Every document in the Soma/Gravicity ecosystem that participates in memory, planning, or architecture MUST have standard frontmatter. This makes docs searchable, filterable, and machine-readable.

## Required Fields (All Docs)

```yaml
---
type: <type>            # what kind of document
status: <status>        # where it is in its lifecycle
created: <YYYY-MM-DD>   # when it was first written
updated: <YYYY-MM-DD>   # when it was last meaningfully changed
---
```

## The `type` Field

What kind of document is this?

| Value | Meaning | Examples |
|-------|---------|---------|
| `state` | ATLAS architecture truth doc | STATE.md files |
| `plan` | Something we intend to build/do | Architecture plans, sprint plans |
| `spec` | A specification or standard | Protocol specs, frontmatter standard |
| `muscle` | A learned pattern | Soma muscles |
| `preload` | Session continuation state | preload-next.md |
| `identity` | Agent identity definition | .soma/identity.md |
| `note` | General reference doc | Business notes, research |
| `index` | Directory listing / navigation | _index.md files |
| `concept` | Early-stage idea exploration | Soma OS concept |
| `ritual` | Workflow definition | /publish, /molt |
| `strategy` | Business/IP/licensing strategy | Licensing, go-to-market |
| `log` | Chronological record | Changelog, commit log |

## The `status` Field

Where is this document in its lifecycle?

```
seed → draft → active → complete
                  ↓
               stale → archived
```

| Value | Meaning | What to do with it |
|-------|---------|-------------------|
| `seed` | Idea planted, minimal content. Not yet developed. | Develop when relevant |
| `draft` | Being actively written/designed. Not yet reliable. | Review, iterate, finalize |
| `active` | Current, maintained, reliable. The truth. | Reference and keep updated |
| `complete` | Done. No more work needed. Delivered. | Reference only |
| `stale` | Was active but hasn't been updated. May be wrong. | Review: update or archive |
| `archived` | No longer relevant. Kept for history. | Ignore unless researching |
| `blocked` | Can't progress without something else | Check dependency, unblock |
| `paused` | Intentionally stopped. Will resume. | Resume when ready |

**Rules:**
- A `state` (ATLAS) doc should always be `active`. If it's not, something's wrong.
- A `plan` moves: `seed` → `draft` → `active` (being executed) → `complete`
- A `muscle` is always `active` (or archived if deprecated)
- A `concept` starts as `seed` or `draft`, becomes a `plan` when committed to

## Optional Fields (Use When Relevant)

```yaml
---
# ... required fields ...
tags: [licensing, ip, soma]        # searchable keywords
project: soma                       # which project this belongs to
author: Soma Team               # who wrote it (for specs, strategies)
depends: [PI081, PI115]              # what this is blocked by
blocks: [PI116]                      # what this blocks
priority: high                       # high, medium, low
reviewed: <YYYY-MM-DD>               # last time a human verified accuracy
scope: shared                        # for muscles: local | shared
---
```

## How to Search

With this standard, finding things is grep:

```bash
# What's not finished?
grep -rl "^status: draft" .soma/ ~/Vault/workspace/

# What needs review?
grep -rl "^status: stale" .soma/ ~/Vault/workspace/

# All plans for Soma
grep -rl "^type: plan" .soma/plans/

# What's blocked?
grep -rl "^status: blocked" .soma/ ~/Vault/workspace/

# Everything updated more than 30 days ago (candidate for stale)
find .soma ~/Vault/workspace -name "*.md" -exec grep -l "^updated: 2026-01" {} \;

# All high-priority items
grep -rl "^priority: high" .soma/ ~/Vault/workspace/
```

For the agent, this means: at boot or when planning, Soma can scan frontmatter across the workspace to know what's in progress, what's blocked, what's stale. The frontmatter IS the project management layer.

## The `updated` Discipline

This is the one people will forget. The rule:

> **Update `updated:` in the same edit as any meaningful content change.**

"Meaningful" means: content changed in a way that affects understanding. NOT: fixing a typo, reformatting, adding a tag.

An agent (Soma, Zenith) should update `updated:` automatically when editing a doc. This could be an extension or just a convention.

## Muscle-Specific Fields

Muscles have additional required fields:

```yaml
---
type: muscle
status: active
topic: git-workflow
scope: local                  # local | shared (eligible for upward flow)
keywords: [git, branching, pr]
heat: 3                       # usage frequency score
loads: 7                      # total times loaded into context
created: 2026-03-08
updated: 2026-03-10
---
```

## Migration

Existing docs need to be swept to conform. The changes are:
1. Normalize `status` values to the defined set
2. Add `updated` where missing (use file modification date as initial value)
3. Add `created` where missing
4. Ensure `type` is present and correct
