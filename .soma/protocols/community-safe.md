---
type: protocol
name: community-safe
status: active
heat-default: warm
applies-to: [always]
breadcrumb: "Community/public content must never contain private data. The channel-guard script catches leaks pre-push. This protocol covers the judgment — what to keep private, where it belongs."
version: 2.0.0
tier: core
scope: bundled
tags: [privacy, safety, self-awareness]
created: 2026-03-10
updated: 2026-03-14
author: Curtis Mercier
license: CC BY 4.0
---
# Community Safe

> How Soma keeps private data out of public content. The channel-guard script catches leaks mechanically — this protocol covers the judgment that prevents creating them.

## What's Automated

**`soma-channel-guard.sh`** — pre-push hook that scans for:
- Email addresses, IP addresses, API keys
- Absolute paths containing usernames
- Private repo references
- `.soma/secrets/` content

If it finds PII in a public repo commit, it blocks the push.

## What Needs Judgment

The script catches obvious leaks. These need your awareness:

**Private data belongs in:**
- `.soma/secrets/` (gitignored)
- `.soma/identity.md` (project-local, not pushed to public repos)
- Environment variables / `.env` files (gitignored)

**Protocols and muscles must be generic:**
- ✅ "Read before edit" — universal pattern
- ❌ "User prefers tabs over spaces" — personal preference in public protocol
- ✅ "Check git config before committing" — universal
- ❌ "Set email to user@example.com" — private data

**When sharing to the hub:**
- Strip all absolute paths
- Remove references to private repos, internal tools, specific projects
- Keep patterns universal — if it only works for your setup, it's local, not community

## Source

- Channel guard: `scripts/soma-channel-guard.sh`
- Guard extension: `extensions/soma-guard.ts`
- PII audit: `scripts/soma-audit.sh` → PII check

---

<!--
Licensed under CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Author: Curtis Mercier
-->
