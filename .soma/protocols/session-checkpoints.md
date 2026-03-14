---
type: protocol
name: session-checkpoints
status: active
heat-default: warm
applies-to: [git]
breadcrumb: "Soma can auto-commit .soma/ state on every exhale and surface git diffs on boot. Two tracks: .soma/ internal git (never pushed) and project code (squash before push)."
version: 2.0.0
tier: core
scope: bundled
tags: [session, git, continuity, self-awareness]
created: 2026-03-10
updated: 2026-03-14
---

# Session Checkpoints

> How Soma persists state across sessions using git. Auto-commit and diff-on-boot are configurable.

## How It Works

Soma uses two git tracks:

**Track 1: `.soma/` internal** — its own git repo inside `.soma/`. Committed on exhale, never pushed. Gives you `git diff HEAD~1` on boot to see what changed between sessions.

**Track 2: Project code** — your project's git repo. Soma suggests checkpoint commits but doesn't auto-push. Squash checkpoints into clean commits before pushing.

### What Happens on Exhale

If `checkpoints.soma.autoCommit` is true, the exhale instructions include committing `.soma/` changes.

### What Happens on Boot

If `checkpoints.diffOnBoot` is true, boot surfaces:
- `.soma/` changes since last checkpoint
- Project changes since last checkpoint
- Recent git log (commits by others, CI, etc.)

## Settings

```jsonc
{
  "checkpoints": {
    "soma": {
      "autoCommit": true
    },
    "project": {
      "style": "commit",
      "autoCheckpoint": false
    },
    "diffOnBoot": true,
    "maxDiffLines": 80
  }
}
```

### Customization

| Goal | Adjust |
|------|--------|
| No auto-commits | `soma.autoCommit: false` |
| See more context on boot | Raise `maxDiffLines` |
| Tag instead of commit | `project.style: "tag"` |
| Disable boot diffs | `diffOnBoot: false` |

## Source

- Checkpoint logic: `extensions/soma-boot.ts` → exhale handler
- Git context on boot: `extensions/soma-boot.ts` → `case "git-context"` in boot steps
- Settings: `core/settings.ts` → `CheckpointSettings`
