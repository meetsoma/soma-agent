---
title: "Scripts & Audits"
description: "Standalone tools for searching, auditing, scanning, and maintaining your .soma/ ecosystem."
section: "Reference"
order: 9
---

# Scripts & Audits

<!-- tldr -->
Standalone bash tools in `.soma/scripts/` — usable outside agent sessions. `soma-audit.sh` runs ecosystem health checks (PII, drift, stale content, doc freshness, etc.). `soma-search.sh` queries memory by type/status/tags. `soma-scan.sh` scans sessions and extractions. All work from the command line without starting a Soma session.
<!-- /tldr -->

## Why Scripts?

Not everything needs an agent session. Checking for PII leaks, verifying doc consistency, or searching past sessions are tasks that work better as standalone CLI tools. Soma's scripts run from bash — no API key needed, no context window consumed.

## Project-Level Scripts

Live in your project's `.soma/scripts/` or ship with the agent package.

### soma-audit.sh

The ecosystem health checker. Runs focused audits and reports findings.

```bash
# Run all audits
scripts/soma-audit.sh

# Run specific audits
scripts/soma-audit.sh drift pii doc-freshness

# List available audits
scripts/soma-audit.sh --list

# Summary only (no details)
scripts/soma-audit.sh --quiet
```

**Available audits:**

| Audit | What It Checks |
|-------|---------------|
| `drift` | Settings schema drift between code and docs |
| `pii` | Personal information in tracked files (emails, API keys, paths) |
| `stale-content` | Old protocols/muscles that haven't been updated |
| `stale-terms` | Deprecated terminology across all content surfaces |
| `doc-freshness` | Features in code but not in docs, undocumented settings/commands |
| `docs-sync` | Agent docs ↔ website docs drift |
| `frontmatter` | Frontmatter compliance in protocols and muscles |
| `overlap` | Duplicate content across directories |
| `commands` | Registered commands vs documented commands |
| `settings` | Settings in code vs configuration docs |
| `tests` | Test coverage gaps |
| `roadmap` | Stale roadmap items, completed but unclosed |

### soma-search.sh

Query Soma's memory from the command line.

```bash
# Search by type
scripts/soma-search.sh --type protocol

# Deep search (extracts TL;DR sections)
scripts/soma-search.sh --type muscle --deep

# Find muscles missing TL;DR
scripts/soma-search.sh --missing-tldr

# Search by status
scripts/soma-search.sh --status active
```

### soma-tldr.sh

Generate or update TL;DR / digest sections in markdown files.

```bash
# Generate TL;DR for a file
scripts/soma-tldr.sh protocols/my-protocol.md

# Update all muscles with missing digests
scripts/soma-tldr.sh --scan memory/muscles/
```

### soma-snapshot.sh

Rolling zip snapshots of project directories.

```bash
# Snapshot current directory
scripts/soma-snapshot.sh . "pre-refactor"

# Snapshot with timestamp
scripts/soma-snapshot.sh ./src "before-migration"
```

### git-identity-hook.sh

Git pre-commit hook that validates git identity matches `guard.gitIdentity` settings.

```bash
# Install as pre-commit hook
cp scripts/git-identity-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Workspace-Level Scripts

Live in `~/.soma/scripts/` or your workspace `.soma/scripts/`. Operate across the full workspace.

### soma-scan.sh

Session and topic scanner — searches across Pi session logs, steno extractions, and frontmatter.

```bash
# Find sessions about a topic
.soma/scripts/soma-scan.sh topic "checkpoints"

# List all sessions
.soma/scripts/soma-scan.sh sessions

# List all steno extractions
.soma/scripts/soma-scan.sh extractions

# Trace a concept across sessions
.soma/scripts/soma-scan.sh trail "inheritance"

# Find related concepts
.soma/scripts/soma-scan.sh related "preload"

# Find files mentioning a term
.soma/scripts/soma-scan.sh files "guard"
```

### soma-context.sh

Pre-change context gatherer. Before modifying a file or concept, see what exists.

```bash
# Context for a file
.soma/scripts/soma-context.sh STATE.md

# Context for a concept
.soma/scripts/soma-context.sh "heat system"
```

Shows: other versions, cross-references, recent discussions, git history, and related concepts.

### soma-stale.sh

Finds stale documentation across the workspace.

```bash
.soma/scripts/soma-stale.sh
```

Detects: stale by age, overlapping (same name in different dirs), orphaned (unreferenced), drafts/seeds.

### soma-frontmatter.sh

Frontmatter status/type scanner.

```bash
# Scan all frontmatter
.soma/scripts/soma-frontmatter.sh

# Find stale by frontmatter dates
.soma/scripts/soma-frontmatter.sh --stale
```

## Using Audits in Workflow

The recommended post-ship workflow:

1. Ship code changes
2. Run `soma-audit.sh doc-freshness stale-terms` — get the exact update list
3. Fix docs (source of truth first, then sync)
4. Run `soma-audit.sh docs-sync` — verify zero drift
5. Push all repos

See [Commands](/docs/commands#scripts) for the full listing.
