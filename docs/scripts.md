---
title: "Scripts & Audits"
description: "Standalone tools for auditing, verifying, and maintaining your .soma/ ecosystem."
section: "Reference"
order: 9
---

# Scripts & Audits

<!-- tldr -->
Standalone bash tools that run outside agent sessions — no API key, no context window. `soma-audit.sh` runs ecosystem health checks. `soma-verify.sh` handles truth-checking, search, doc sync, and cross-repo state. `soma-snapshot.sh` creates project snapshots. All run from the command line.
<!-- /tldr -->

## Why Scripts?

Not everything needs an agent session. Checking for PII leaks, verifying doc consistency, or searching past sessions are tasks that work better as standalone CLI tools. Soma's scripts run from bash — no API key needed, no context window consumed.

## Core Scripts

Ship with the agent package in `scripts/`.

### soma-verify.sh

Unified tool for truth-checking and ecosystem awareness. Absorbs the functionality of several older scripts (soma-search, soma-scan, soma-context, soma-stale).

```bash
# Verify claims in a doc against code
scripts/soma-verify.sh doc docs/configuration.md

# Search across all sources for a topic
scripts/soma-verify.sh topic "heat system"

# Check protocol versions across all sources
scripts/soma-verify.sh protocols

# Verify website docs are in sync with agent
scripts/soma-verify.sh website

# Multi-repo state check (branches, dirty, unpushed)
scripts/soma-verify.sh repos

# Frontmatter-based search
scripts/soma-verify.sh search --type protocol --status active
scripts/soma-verify.sh search --stale

# Search session logs and preloads
scripts/soma-verify.sh sessions "auto-breathe"

# Cross-ecosystem consistency (protocol drift, agent↔CLI sync)
scripts/soma-verify.sh sync

# Pro vs public stream protection
scripts/soma-verify.sh streams

# Verify changelog claims against commits
scripts/soma-verify.sh changelog

# Find what references a file
scripts/soma-verify.sh impact core/settings.ts

# Trace a value across git history
scripts/soma-verify.sh history "warmThreshold"

# Find related files via frontmatter
scripts/soma-verify.sh related protocols/workflow.md

# Minimal output (errors only — good for CI)
scripts/soma-verify.sh website --compact
```

### soma-audit.sh

Ecosystem health checker. Runs focused audit scripts — each concern is independent.

```bash
# Run all audits
scripts/soma-audit.sh

# Run specific audits
scripts/soma-audit.sh drift pii doc-freshness

# List available audits
scripts/soma-audit.sh --list

# Summary only
scripts/soma-audit.sh --quiet
```

**Available audits:**

| Audit | What It Checks |
|-------|---------------|
| `pii` | Personal information in tracked files (emails, API keys, paths) |
| `drift` | Code sync between agent and CLI repos |
| `commands` | Registered commands vs documented commands |
| `stale-terms` | Deprecated terminology across all content |
| `stale-content` | Old protocols/muscles, orphan memories, dead drafts |
| `doc-freshness` | Features in code but not in docs |
| `docs-sync` | Agent docs ↔ website docs drift |
| `overlap` | Duplicate logic across extensions |
| `tests` | Test coverage gaps |
| `settings` | Settings types with no implementation |
| `roadmap` | Shipped vs planned claims |

### soma-snapshot.sh

Rolling zip snapshots of project directories.

```bash
# Snapshot current directory
scripts/soma-snapshot.sh . "pre-refactor"

# Snapshot with timestamp
scripts/soma-snapshot.sh ./src "before-migration"
```

### soma-compat.sh

Compatibility checker — detects protocol/muscle overlap, redundancy, and directive conflicts. Produces a 0–100 compatibility score.

```bash
scripts/soma-compat.sh              # run compat check
scripts/soma-compat.sh --json       # JSON output (for CI)
```

### soma-update-check.sh

Check installed protocols and muscles against the hub for newer versions.

```bash
scripts/soma-update-check.sh            # check for updates
scripts/soma-update-check.sh --update   # auto-pull updates
scripts/soma-update-check.sh --json     # machine-readable output
```

### frontmatter-date-hook.sh

Git pre-commit hook — auto-updates `updated:` field in modified `.md` files.

```bash
# Install as pre-commit hook
ln -s scripts/frontmatter-date-hook.sh .git/hooks/pre-commit
```

## Using in Workflow

The recommended post-ship workflow:

1. Ship code changes
2. Run `soma-verify.sh website --compact` — check doc sync
3. Run `soma-audit.sh doc-freshness stale-terms` — get the exact update list
4. Fix docs, then re-sync
5. Run `soma-verify.sh repos` — verify all repos clean
