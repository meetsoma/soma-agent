---
title: "Scripts"
description: "Standalone tools that ship with Soma for scanning, searching, snapshotting, and content validation."
section: "Reference"
order: 9
---

# Scripts

<!-- tldr -->
Standalone bash tools that ship with Soma — run from the command line, no agent session needed. `soma-scan.sh` scans `.soma/` for content and staleness. `soma-search.sh` searches by type, tags, or content. `soma-compat.sh` checks for conflicts. `soma-update-check.sh` finds outdated content. `soma-snapshot.sh` creates project snapshots. `validate-content.sh` validates content before PRs.
<!-- /tldr -->

## Why Scripts?

Not everything needs an agent session. Scanning your `.soma/` directory, checking for content conflicts, or snapshotting before a big change are tasks that work better as standalone CLI tools. These run from bash — no API key needed, no context window consumed.

Scripts ship with the `meetsoma` npm package. Find them with:

```bash
ls $(npm root -g)/meetsoma/scripts/
```

## Available Scripts

### soma-scan.sh

Scan `.soma/` for protocols, muscles, scripts, and staleness. Quick health check for your workspace.

```bash
soma-scan.sh                    # scan current .soma/
soma-scan.sh --type protocol    # protocols only
soma-scan.sh --stale            # show stale content (30+ days)
soma-scan.sh --all              # everything including cold items
```

### soma-search.sh

Search `.soma/` content by type, tags, or full-text. Find what you need without opening files.

```bash
soma-search.sh "git"                   # search all content for "git"
soma-search.sh --type muscle           # list all muscles
soma-search.sh --tags workflow         # find content tagged "workflow"
soma-search.sh --deep "pattern"        # deep search including body text
soma-search.sh --missing-tldr          # find content without TL;DR sections
```

### soma-compat.sh

Compatibility checker — detects protocol/muscle overlap, redundancy, and directive conflicts. Produces a 0–100 compatibility score.

```bash
soma-compat.sh              # run compat check
soma-compat.sh --json       # JSON output (for CI)
```

### soma-update-check.sh

Check installed protocols and muscles against the hub for newer versions.

```bash
soma-update-check.sh            # check for updates
soma-update-check.sh --update   # auto-pull updates
soma-update-check.sh --json     # machine-readable output
```

### soma-snapshot.sh

Rolling zip snapshots of project directories. Respects `.zipignore`.

```bash
soma-snapshot.sh . "pre-refactor"
soma-snapshot.sh ./src "before-migration"
```

### validate-content.sh

Validate AMPS content files (protocols, muscles, etc.) before submitting a PR to the community hub.

```bash
validate-content.sh protocols/my-protocol.md
```

### git-identity-hook.sh

Git pre-commit hook that validates your git identity matches `guard.gitIdentity` settings.

```bash
# Install as pre-commit hook
ln -s $(npm root -g)/meetsoma/scripts/git-identity-hook.sh .git/hooks/pre-commit
```

### prompt-preview.ts

Preview the compiled system prompt without starting a session. Shows what Soma would inject.

```bash
npx jiti $(npm root -g)/meetsoma/scripts/prompt-preview.ts
```
