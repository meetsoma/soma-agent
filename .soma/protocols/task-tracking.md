---
type: protocol
name: task-tracking
status: active
heat-default: warm
applies-to: [always]
breadcrumb: "Keep a live kanban in .soma/_kanban.md. Move cards as you work — not after. On exhale, the board should reflect reality: what's active, what shipped, what's parked. A stale board is worse than no board."
author: meetsoma
license: MIT
version: 1.0.0
tier: core
scope: bundled
tags: [workflow, planning, continuity, kanban]
created: 2026-03-12
updated: 2026-03-14
---

# Task Tracking Protocol

A live kanban board that moves with you across sessions. The board is the single source of truth for what's happening, what's done, and what's waiting. It's updated as you work — not reconstructed after the fact.

## TL;DR

- **One board, one file:** `.soma/_kanban.md`. Four lanes: Active, In Progress, Done, Parked.
- **Move cards in real time.** Starting a task → In Progress. Finished → Done. Blocked or deprioritized → Parked. Don't batch updates.
- **On exhale, verify the board.** Does it match what actually happened this session? If not, fix it before writing your preload.
- **On inhale, read Active + In Progress.** That's your orientation. Don't read Done unless checking prior work.

## When to Apply

Every session. This protocol complements session-checkpoints (which tracks code state) and breath-cycle (which tracks session continuity). This one tracks *intent* — what you planned, what you did, what you deferred.

## The Board

```markdown
## Active
<!-- Tasks ready to be worked on. Ordered by priority. -->

## In Progress
<!-- What you're working on right now. Should be 1-3 items max. -->

## Done
<!-- Completed this session. Include date and commit hash if applicable. -->

## Parked
<!-- Not now. Blocked, deprioritized, or waiting on something external. -->
```

### Card Format

```markdown
- [ ] Short description (added:YYYY-MM-DD @agent) <!-- id:PREFIX### -->
```

- **Prefix** matches your project (e.g., `SOMA`, `APP`, `DOCS`)
- **IDs are sequential** — never reuse, never renumber
- **@agent** identifies who created it (useful in multi-agent setups)
- When completed: `- [x]` and add completion date

### Lane Rules

| Action | Board update |
|--------|-------------|
| Starting a task | Active → In Progress |
| Task completed | In Progress → Done (add date, commit hash) |
| Task blocked | In Progress → Parked (add reason) |
| New idea mid-session | Add to Active or Parked depending on urgency |
| Deprioritized | Active → Parked |
| Resuming parked work | Parked → In Progress |

## The Rhythm

### On Inhale (session start)
1. Read Active + In Progress lanes
2. Orient: what was I doing? What's next?
3. Don't re-read Done unless you need to verify something shipped

### During Work
- Move cards as state changes — not later
- If you finish something, move it to Done immediately
- If a new task emerges, add it to the right lane
- Keep In Progress small (1-3 items). If it's growing, you're context-switching too much.

### On Exhale (session end)
1. Verify: does the board match reality?
2. Everything you shipped → Done with date
3. Anything you started but didn't finish → stays In Progress with a note
4. New discoveries → Active or Parked
5. The preload should reference the board, not duplicate it

## Grouping

For larger projects, group cards by category within lanes:

```markdown
## Active

### Release
- [ ] Tag v1.0.0-rc.1 (added:2026-03-12 @soma) <!-- id:APP100 -->

### Bugs
- [ ] Fix login redirect loop (added:2026-03-12 @soma) <!-- id:APP101 -->
```

Group Done cards by session date so you can see velocity:

```markdown
## Done

### 2026-03-12
- [x] Fix breathe rotation bug (`abc123`) (2026-03-12 @soma) <!-- id:APP098 -->
```

## Anti-Patterns

- ❌ **Updating the board only at exhale** — by then you've forgotten what you did. Move cards as you go.
- ❌ **Duplicating the board in preloads** — the preload should say "see _kanban.md", not copy the lanes.
- ❌ **Too many items in Active** — if Active has 20+ items, you need to park or cut. A long Active list is a backlog pretending to be a plan.
- ❌ **No IDs on cards** — IDs let you reference tasks in commits, preloads, and session logs without repeating the description.
- ❌ **Stale board** — a board that hasn't been touched in 2+ sessions is actively misleading. Better to delete it than leave it stale.

## Pairing with Other Protocols

- **breath-cycle:** On exhale wrap-up, board verification is a checklist item.
- **session-checkpoints:** Commit the board with `.soma/` state — it diffs cleanly on next boot.
- **workflow:** Each card completion maps to the test → commit → push loop.

## Settings

```json
{
  "kanban": {
    "file": "_kanban.md",
    "prefix": "SOMA",
    "maxInProgress": 3
  }
}
```

---
