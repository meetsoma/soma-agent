---
title: "Scripts"
description: "Standalone tools that ship with Soma for auditing, snapshotting, and content validation."
section: "Reference"
order: 9
---

# Scripts

<!-- tldr -->
Standalone bash tools that ship with Soma — run from the command line, no agent session needed. `soma-compat.sh` checks for content conflicts. `soma-update-check.sh` finds outdated protocols/muscles. `soma-snapshot.sh` creates project snapshots. `validate-content.sh` validates content before PRs.
<!-- /tldr -->

## Why Scripts?

Not everything needs an agent session. Checking for content conflicts, verifying your setup, or snapshotting before a big change are tasks that work better as standalone CLI tools. These run from bash — no API key needed, no context window consumed.

## Available Scripts

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

### soma-snapshot.sh

Rolling zip snapshots of project directories. Respects `.zipignore`.

```bash
scripts/soma-snapshot.sh . "pre-refactor"
scripts/soma-snapshot.sh ./src "before-migration"
```

### validate-content.sh

Validate AMPS content files (protocols, muscles, etc.) before submitting a PR to the community hub.

```bash
scripts/validate-content.sh protocols/my-protocol.md
```

### git-identity-hook.sh

Git pre-commit hook that validates your git identity matches `guard.gitIdentity` settings.

```bash
# Install as pre-commit hook
ln -s scripts/git-identity-hook.sh .git/hooks/pre-commit
```

### prompt-preview.ts

Preview the compiled system prompt without starting a session. Shows what Soma would inject.

```bash
npx jiti scripts/prompt-preview.ts
```
