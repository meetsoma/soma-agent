---
type: protocol
name: git-identity
status: active
heat-default: warm
applies-to: [git]
breadcrumb: "Commits must be attributed correctly. Check git config user.email before first commit in any repo. Define identity zones (personal, business, agent) and enforce them."
author: Curtis Mercier
license: CC BY 4.0
version: 1.1.0
tier: official
scope: hub
tags: [git, attribution, identity]
spec-ref: curtismercier/protocols/git-identity (v0.2)
created: 2026-03-09
updated: 2026-03-14
---

# Git Identity Protocol

## TL;DR
- Define identity zones: **personal**, **business**, **agent** — each maps to a name/email
- Check `git config user.email` before first commit in any repo
- Human drives → human identity. Agent acts alone → agent identity with `Co-authored-by`
- Fix before push: `git commit --amend --author="Name <email>" --no-edit`

## Rule

Every commit must be attributed to the correct identity. Define your zones:

| Identity | When | Example |
|----------|------|---------|
| personal | Your own projects, open source | `Your Name <you@example.com>` |
| business | Client work, company repos | `Company <team@company.com>` |
| agent | Autonomous commits only (CI, auto-update) | `Agent <agent@example.com>` |

### Before First Commit

```bash
git config user.email
# If wrong:
git config user.name "Your Name"
git config user.email "you@example.com"
```

### Agent-Assisted vs Autonomous

- **Human directs agent** → human identity. You're the author, agent is the tool.
- **Agent acts alone** (scheduled, auto-maintenance) → agent identity with `Co-authored-by: Human <email>`.
- **Never** commit as agent when a human is driving the session.

### Fix Misattribution

Before push: `git commit --amend --author="Name <email>" --no-edit`
After push: `git filter-branch` + force-push (solo repos only — never on shared branches).

## When to Apply

- First commit in any repo
- After cloning a new repo
- After noticing wrong author in `git log`
- When setting up CI/CD commit identity

## When NOT to Apply

- Third-party repos where you're using their contribution identity
- Forks where upstream expects a specific email

---

<!--
Licensed under CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Original: https://github.com/curtismercier/protocols/tree/main/git-identity
Author: Curtis Mercier
-->
