---
type: protocol
name: git-identity
status: active
updated: 2026-03-09
heat-default: warm
applies-to: [git]
scope: shared
tags: [git, attribution, identity, multi-repo]
breadcrumb: "Commits must be attributed correctly. Personal repos (personal/, products/soma/): Curtis Mercier <curtis@gravicity.ai>. Business repos (clients/, infra/): Gravicity <accounts@gravicity.ca>. Check git config user.email before first commit in any repo. Never let bot identity land on personal repos."
---

# Git Identity Protocol

## TL;DR
- Three identities: **personal** (Curtis Mercier / curtis@gravicity.ai), **business** (Gravicity / accounts@gravicity.ca), **agent** (Soma / soma-agent@gravicity.ai)
- Personal: `personal/*`, `products/soma/*`, `curtismercier/*`, `meetsoma/*`
- Business: `clients/*`, `infra/*`, `Gravicity/*`
- Agent: autonomous-only commits. Human drives → human identity, always
- Check `git config user.email` before first commit in any repo
- Fix before push: `git commit --amend --author="..." --no-edit`

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

<!-- v1.0.0 | created: 2026-03-07 | MIT | Curtis Mercier | upstream: curtismercier/protocols/git-identity/ -->
