---
type: protocol
name: community-safe
status: active
heat-default: warm
applies-to: [always]
breadcrumb: "Community assets must never contain private data. No emails, paths, secrets, tokens, user-specific references. Private data belongs in USER.md, .env, .soma/secrets/, project memory. Muscles encode patterns, not personal context."
author: Curtis Mercier
license: CC BY 4.0
version: 1.1.0
tier: core
tags: [safety, privacy, sharing]
created: 2026-03-09
updated: 2026-03-10
---

# Community-Safe Content Protocol

## TL;DR
- Community protocols, muscles, skills, and templates must be **generic and reusable**
- **Never include:** emails, home paths, API keys, tokens, secrets, hardcoded usernames, org-specific URLs
- **Private data belongs in:** `USER.md`, `.env`, `.soma/secrets/`, project memory, identity files
- Muscles encode **patterns** (how to do things). Specifics live in **knowledge** (about this user/project)
- Before sharing: strip all project-specific references. Replace with generic examples.

## Rule

Community assets are loaded into agent context across many users' machines. They must be safe, generic, and useful to anyone.

### What MUST NOT be in community assets

| Category | Examples | Where it belongs instead |
|----------|----------|------------------------|
| **Personal identity** | Email, name, username | `identity.md`, `USER.md` |
| **Paths** | `/Users/username/`, `~/Gravicity/` | Project config, `.env` |
| **Secrets** | API keys, tokens, passwords | `.soma/secrets/`, `.env` |
| **Org-specific URLs** | `mycompany.slack.com`, internal dashboards | Project memory |
| **Hardcoded repos** | `meetsoma/soma-agent` (unless it's an example) | Replace with `your-org/your-repo` |
| **Test counts/data** | "192 tests passing" | Stale immediately — use generic process |
| **Internal decisions** | "We chose React because the lead prefers it" | Project STATE.md |

### What SHOULD be in community assets

| Category | Examples |
|----------|----------|
| **Patterns** | "Run tests after any file removal" |
| **Processes** | "Branch → PR → CI → review → merge" |
| **Anti-patterns** | "Don't delete working scripts during cleanup" |
| **Decision frameworks** | "Three verbs in order: keep, move, delete" |
| **Generic commands** | `git checkout --theirs <files>` (not `git checkout --theirs package.json`) |

### The Pattern vs Knowledge Split

This is the core principle:

```
MUSCLE (community-safe):
  "After any code removal, run all test suites and grep for orphaned references."
  → This is a PATTERN. Works for anyone.

KNOWLEDGE (private):
  "Our test suite is in tests/*.sh, we have 192 tests, the CLI dep test
   needs soma binary installed."
  → This is KNOWLEDGE about a specific project. Stays local.
```

A muscle that says "run `pnpm test`" is fine — that's a generic command. A muscle that says "run `bash tests/test-protocols.sh && bash tests/test-settings.sh`" is too specific — those are project-local paths.

## Before Sharing

Checklist before exporting to community:

1. [ ] `grep -E '(/Users/|/home/|~/|@.*\.(com|ai|io))' my-muscle.md` — no personal paths or emails
2. [ ] `grep -Ei '(sk-|ghp_|npm_|token|secret|password)' my-muscle.md` — no secrets
3. [ ] Replace specific repo names with generic examples
4. [ ] Replace specific test counts, file names, paths with generic descriptions
5. [ ] Set `heat: 0` (muscles) — users control their own heat
6. [ ] Add `author:` and `license:` fields
7. [ ] Verify it makes sense to someone who's never seen your project

## When to Apply

- When running `/sync-community export`
- When writing a PR to meetsoma/community
- When reviewing someone else's PR to the community repo
- When deciding what goes in a muscle vs what goes in project memory

## When NOT to Apply

- Project-local muscles (`.soma/memory/muscles/`) can be as specific as you want
- Identity files are inherently personal
- This protocol only applies to content destined for community sharing
