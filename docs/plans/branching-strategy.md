---
type: plan
status: active
created: 2026-03-10
updated: 2026-03-10
tags: [git, branching, workflow, dev-cycle, organization]
priority: high
---

# Branching & Dev Cycle Strategy

> How we develop, branch, and ship across the Gravicity / meetsoma ecosystem.

## The Constraint

GitHub doesn't have private branches. All branches in a repo share the same visibility.
So we can't put WIP/experimental work on a branch of a public repo and expect it to be hidden.

## The Solution: Two Remotes

For repos that have both private development and public releases:

```
meetsoma/agent (PRIVATE)          ← all development happens here
    │                                dev, feature, and experimental branches
    │                                this IS the backup
    │
    └── meetsoma/website (PUBLIC) ← only release-ready code
         main branch only
         tagged releases
```

**`meetsoma/agent` is already private.** This is our dev workspace. We can branch freely — `dev`, `feature/*`, `experiment/*` — and nothing leaks publicly. When code is ready for public repos (website, cli, media), we push release-quality code there.

For repos that are entirely public (website, cli, protocols):
- `main` = stable, released
- `dev` = active development (visible but that's fine — it's open source)
- Feature branches for anything non-trivial

## Branch Model

### Private Repos (agent, pi-agent, io, studio)

```
main ──────────────────────────────► stable releases
  │
  └── dev ─────────────────────────► active development
        │
        ├── feature/core-extraction ► specific feature work
        ├── feature/muscle-loading  ► specific feature work
        └── experiment/flush-v2     ► exploratory, may not merge
```

- `main`: always works. Tagged releases. What gets deployed/published.
- `dev`: active work. May be broken. Where daily development happens.
- `feature/*`: branches off dev, merges back to dev when done.
- `experiment/*`: may never merge. Throwaway exploration.

### Public Repos (website, cli, protocols, media)

```
main ──────────────────────────────► stable, live
  │
  └── dev ─────────────────────────► next release candidate
        │
        └── feature/skills-page    ► specific feature
```

Same model, just visible. That's fine — "building in public."

## Dev Cycle

### Daily Flow

```
1. Start session → pull dev
2. Create feature branch if needed (or work on dev directly for small stuff)
3. Work, commit often
4. Push to remote (backup)
5. End session → push dev
```

### Release Flow

```
1. dev is stable and tested
2. PR: dev → main (even solo, creates a record)
3. Tag: v0.1.0, v0.2.0, etc.
4. Deploy / publish from main
```

### The "Backup" Question

Curtis asked about backing up work to org repos. The answer:

**Push to `dev` branch on every meaningful session.** That's your backup. It's on GitHub, it's versioned, it's recoverable. You don't need a separate backup mechanism — git IS the backup.

```bash
# End of session ritual
git add -A
git commit -m "wip: session checkpoint"
git push origin dev
```

For the private `meetsoma/agent` repo, this is completely safe — nobody can see dev branch work.

## Worktrees (For Parallel Work)

Git worktrees let you have multiple branches checked out simultaneously without switching:

```bash
# Main checkout (where you normally work)
~/Gravicity/products/soma/              ← on dev branch

# Worktree for stable/main
git worktree add ../soma-stable main    ← separate directory, main branch

# Worktree for a feature
git worktree add ../soma-core-extraction feature/core-extraction
```

This is useful when:
- You need to check something on main without stashing dev work
- You're doing a long-running feature but need to hotfix main
- You want to compare behavior between branches side-by-side

### Worktree Layout

```
~/Gravicity/products/
├── soma/                    ← primary, on dev branch
├── soma-stable/             ← worktree, on main branch (read-mostly)
└── soma-experiments/        ← worktree, on experiment/* branch (optional)
```

Don't go overboard with worktrees. One for `dev` (primary) and one for `main` (stable reference) is enough.

## Repo-Specific Plans

### meetsoma/agent (PRIVATE — the core dev repo)

This is where Soma's brain lives. Set up full branching now.

```bash
# Current state: master branch pushed, no dev branch
# Fix: rename master → main, create dev
git branch -M master main
git push meetsoma main
git push meetsoma --delete master  # clean up old name
git checkout -b dev
git push -u meetsoma dev
# Set dev as the branch we work on daily
```

Branch protection on main:
- Require PR to merge (even solo — creates a paper trail)
- No force pushes to main

### meetsoma/website (PUBLIC)

Already on main. Add dev branch for next release work:
```bash
git checkout -b dev
git push -u origin dev
```

### curtismercier/protocols (PUBLIC)

Keep it simple. Main only. Specs don't need a dev branch — they're documents that get updated in place. Tag when a spec version bumps (v0.1.0 → v0.2.0).

### Gravicity/pi-agent (PRIVATE)

This is a fork of Pi. Branch model:
- `main` = our customized version
- `upstream` = tracking Pi's releases
- `feature/*` = our modifications

```bash
git remote add upstream <pi-source-url>
git fetch upstream
# Periodically: merge upstream/main into our main
```

## What to Do Right Now

1. Set up dev branch on meetsoma/agent ← do this now
2. Push all current work to dev
3. Set main as "stable" with branch protection
4. Set up dev branch on meetsoma/website
5. Establish the daily push habit

## Tagging / Versioning

When we're ready for releases:

```
v0.1.0 — first public-ready release (after PI116 audit)
v0.2.0 — core extraction complete (Phase 1)
v0.3.0 — muscle loading + heat tracking (Phase 2)
v0.4.0 — parent-child + hierarchy (Phase 3)
v1.0.0 — first "real" release
```

Semver: `major.minor.patch`
- Major: breaking changes to the protocol or API
- Minor: new features
- Patch: bug fixes

We're pre-1.0 — everything is minor until we declare stability.
