---
type: protocol
name: evolution
status: draft
created: 2026-02-01
updated: 2026-03-09
heat-default: warm
breadcrumb: "Ideas evolve upward: conversation → note → plan → spec → code. Audit downward: if code exists without a plan, document it. If a plan shipped, update its status. Track evolution in docs, don't just overwrite."
---

# Evolution Protocol

## TL;DR
- Upward path: idea (conversation) → note (parking-lot) → plan (committed design) → spec (formalized standard) → code (implemented)
- Downward audit: code without documentation = gap. Plan that shipped but still says "active" = stale status
- When building: notice if what you're implementing has a plan. If not, create one or update an existing one
- When planning: check if the idea already exists as a note, muscle, or parking-lot item. Promote, don't duplicate
- Evolution logs: append to docs showing how ideas diverged from plans. Don't overwrite history
- Status discipline: update `status` in the same commit as the work. seed → draft → active → complete

## Rule

### Upward Evolution (ideas become reality)

Every significant decision or pattern should move up this chain as it matures:

| Stage | Location | Trigger to promote |
|-------|----------|-------------------|
| **Idea** | Conversation, preload, session note | Referenced 2+ times across sessions |
| **Note** | `parking-lot.md`, inline comments | Decision made to pursue it |
| **Plan** | `docs/plans/` with frontmatter | Work begins, design solidifies |
| **Spec** | Protocol file or spec doc | Pattern is stable, repeatable, worth standardizing |
| **Code** | `core/`, `extensions/`, scripts | Spec is implemented and running |

### Downward Audit (reality checks docs)

After building, check the chain:
- Does the code match what the plan said? If it diverged, append an evolution note
- Is the plan's status correct? If work shipped, update to `complete` or note what remains
- Are there decisions captured only in preloads/conversations that should be in a plan?
- Are there patterns emerging in muscles that should become protocols?

### Muscle → Protocol Evolution

Same path as vault's evolution protocol:
- Muscle used 5+ sessions → candidate for protocol
- Same pattern across multiple projects → candidate for shared protocol
- Fully deterministic, no judgment needed → candidate for script/automation

## When to Apply

- After shipping code — audit the plan chain
- During planning — check for existing notes/ideas to promote
- At session exhale — note any ideas worth capturing
- During ATLAS updates — verify status fields match reality

## When NOT to Apply

- Quick fixes that don't warrant a plan
- Third-party code changes
- Pure refactors with no design decisions

<!-- upstream: vault/system/protocols/evolution.md (adapted for soma) | v0.1.0 | MIT | Curtis Mercier -->
