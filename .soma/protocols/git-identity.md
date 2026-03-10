---
type: protocol
name: git-identity
status: active
created: 2026-02-01
updated: 2026-03-10
heat-default: warm
applies-to: [git]
scope: local
source: meetsoma/agent@0.2.0
source-version: 0.2.0
edited-by: system
tags: [git, attribution, identity, multi-repo]
breadcrumb: "Commits must be attributed correctly. Define identities in .soma/identity.md or settings. Check git config user.email before first commit. Never let bot identity land on human-driven repos."
---

# Git Identity Protocol

## TL;DR
- Define your identities in `.soma/identity.md` (personal, business, agent)
- Map identities to repo patterns (e.g. `clients/*` → business identity)
- Check `git config user.email` before first commit in any repo
- Human drives → human identity. Agent acts alone → agent identity
- Fix before push: `git commit --amend --author="Name <email>" --no-edit`

## Rule

Every commit must be attributed to the correct identity. Define your identities and repo mappings in `.soma/identity.md` or your project's `.soma/settings.json`.

### Identity Types

| Identity | When to use | Repos |
|----------|------------|-------|
| **personal** | Your own projects, open source | Define your personal repo patterns |
| **business** | Client work, company repos | Define your business repo patterns |
| **agent** | Autonomous-only commits (scheduled, auto-maintenance) | Only when no human is driving |

### Before First Commit

Run `git config user.email` in the repo. If it doesn't match the expected identity for this repo pattern, fix it:

```bash
git config user.name "Your Name"
git config user.email "your@email.com"
```

### Agent-Assisted vs Autonomous

- **Human directs agent** → human identity. You're the author, agent is the tool.
- **Agent acts alone** (scheduled, auto-update) → agent identity with `Co-authored-by`.
- **Never** commit as agent when a human is driving the session.

### Fix Misattribution

Before push: `git commit --amend --author="Name <email>" --no-edit`
After push: `git filter-branch` + force-push (solo repos only).

## When to Apply

- First commit in any repo
- After cloning a new repo
- After noticing wrong author in `git log`
- When setting up CI/CD commit identity

## When NOT to Apply

- Third-party repos where you're using their contribution identity
- Forks where upstream expects a specific email
