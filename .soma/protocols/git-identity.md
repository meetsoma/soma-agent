---
type: protocol
name: git-identity
version: 1.0.0
status: active
created: 2026-03-07
updated: 2026-03-07
author: Curtis Mercier
license: MIT
heat-default: warm
scope: shared
tier: free
upstream: curtismercier/protocols/git-identity/
breadcrumb: "Commits must be attributed correctly. Personal repos (personal/, products/soma/): Curtis Mercier <curtis@gravicity.ai>. Business repos (clients/, infra/): Gravicity <accounts@gravicity.ca>. Check git config user.email before first commit in any repo. Never let bot identity land on personal repos."
tags: [git, attribution, identity, multi-repo]
---

# Git Identity Protocol

## Rule

Every commit must be attributed to the correct identity. Three identities exist:

| Identity | Name | Email | Repos |
|----------|------|-------|-------|
| personal | Curtis Mercier | curtis@gravicity.ai | `personal/*`, `products/soma/*`, `curtismercier/*`, `meetsoma/*` |
| business | Gravicity | accounts@gravicity.ca | `clients/*`, `infra/*`, `Gravicity/*` |
| agent | Soma | soma-agent@gravicity.ai | Autonomous-only commits (scheduled, auto-maintenance) |

### Before First Commit

Run `git config user.email` in the repo. If it doesn't match the expected identity above, fix it:

```bash
git config user.name "Curtis Mercier"
git config user.email "curtis@gravicity.ai"
```

### Agent-Assisted vs Autonomous

- **Human directs agent** → human identity. You're the author, agent is the tool.
- **Agent acts alone** (scheduled, auto-update) → agent identity with `Co-authored-by`.
- **Never** commit as agent when a human is driving the session.

### Fix Misattribution

Before push: `git commit --amend --author="Curtis Mercier <curtis@gravicity.ai>" --no-edit`
After push: `git filter-branch` + force-push (solo repos only).

## When to Apply

- First commit in any repo
- After cloning a new repo
- After noticing wrong author in `git log`
- When setting up CI/CD commit identity

## When NOT to Apply

- Third-party repos where you're using their contribution identity
- Forks where upstream expects a specific email
