---
type: protocol
name: session-checkpoints
status: active
heat-default: warm
applies-to: [always]
breadcrumb: "Two-track version control: .soma/ is committed every exhale (local-only git), project code gets lightweight checkpoints (local commits/tags, never pushed raw). Ship by squashing checkpoints into clean commits. On inhale, diff both tracks to see what changed."
author: Curtis Mercier
license: CC BY 4.0
version: 1.1.0
tier: core
scope: bundled
tags: [session, git, workflow, continuity]
spec-ref: curtismercier/protocols/amp (v0.2, §8)
created: 2026-03-10
updated: 2026-03-10
---

# Session Checkpoints Protocol

## TL;DR

Two git tracks, two rhythms:

| | `.soma/` (agent internal) | Project code |
|---|---|---|
| **Tracking** | Own local git repo inside `.soma/` | Project's git repo |
| **Commit cadence** | Every exhale/flush | Checkpoints — local only |
| **Push cadence** | Never pushed | Squashed clean before push |
| **Session resume** | `git diff HEAD~1` | `git diff` from last checkpoint |

## Rule

### Track 1: `.soma/` Internal State

The `.soma/` directory has its own git repository, **never pushed** to a remote.

**On exhale:**
1. `cd .soma && git add -A`
2. `git commit -m "checkpoint: 2026-03-10T02:00Z"`
3. Captures: STATE.md, preload, heat changes, memory additions

**On inhale:**
1. `git diff HEAD~1 --stat` inside `.soma/`
2. Surface changed files as boot context

### Track 2: Project Code Checkpoints

Use the project's git repo, but keep checkpoint commits local.

**On exhale:**
1. `git add -A && git commit -m "checkpoint: 2026-03-10T02:00Z"`
2. Do **not** push

**On ship:**
1. Squash checkpoints: `git rebase -i HEAD~N` or `git merge --squash`
2. Write meaningful commit message
3. Push to remote

**On inhale:**
1. `git log --oneline --grep="checkpoint:" -1` → find last checkpoint
2. `git diff <sha> --stat` → surface changes as boot context

### What Gets Surfaced on Boot

```
── .soma changes ──
  modified: STATE.md (3 lines)
  added: protocols/heat-state.json

── project changes (since checkpoint) ──
  modified: src/core/settings.ts (+12 -3)
  new file: src/components/Filter.tsx
```

## Anti-patterns

- ❌ Pushing checkpoint commits to GitHub — leaks work-in-progress
- ❌ Never committing .soma — loses diff-on-boot advantage
- ❌ Large binary files in .soma — keep text-only (md, json, yaml)
- ❌ Skipping squash before push — noisy git history

## Settings

```json
{
  "checkpoints": {
    "soma": { "autoCommit": true },
    "project": { "style": "commit", "autoCheckpoint": false },
    "diffOnBoot": true,
    "maxDiffLines": 80
  }
}
```

Checkpoint styles: `commit` (default), `tag`, `stash`.

> **Note:** `autoCommit` and `autoCheckpoint` control whether the exhale message **suggests** the commit commands — the extension does not auto-execute them. The agent runs the commands.

## When to Apply

Every exhale and inhale. This protocol is the persistence layer — it's what makes session continuity work.

## When NOT to Apply

Solo scripts, one-off tasks, or repos where you don't want session history.
