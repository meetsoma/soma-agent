---
type: plan
status: draft
created: 2026-03-10
updated: 2026-03-10
tags: [versioning, releases, github, backup, rollback, semver]
related: [branching-strategy, repo-split]
---

# Versioning & Release Strategy

> How we version, tag, release, and provide rollback across the Gravicity ecosystem. GitHub Releases as both distribution AND backup.

## The Insight

GitHub Releases are free, permanent, downloadable archives. Every release is a snapshot you can roll back to. Attach build artifacts (zips, tarballs, dmgs) and you have version-pinned backups that survive even if you force-push or rewrite history.

OpenClaw ships `.dmg`, `.dSYM.zip`, and `.zip` with every release. We can do the same — not just for distribution but as an insurance policy.

---

## Versioning Scheme Per Repo

Different repos need different versioning:

### meetsoma/agent (PRIVATE) — Semver

```
v0.1.0    ← initial architecture
v0.2.0    ← protocol system
v0.3.0    ← core extraction
v1.0.0    ← first stable release (enterprise-ready)
```

**Semver rules:**
- **Major** (v1 → v2): Breaking changes to protocol format, settings.json schema, or extension API
- **Minor** (v0.1 → v0.2): New features — protocols, skills, core modules
- **Patch** (v0.1.0 → v0.1.1): Bug fixes, doc updates, minor tweaks

Pre-1.0: minor bumps ARE features. We're in rapid development. Don't overthink it.

### curtismercier/protocols (PUBLIC) — Semver per spec

Each protocol spec has its own version in frontmatter. The repo gets tagged when any spec bumps:

```
v0.1.0    ← initial 5 specs published (done)
v0.2.0    ← AMP expansion, heat-tracking spec
v1.0.0    ← all 5 specs stable
```

Individual spec versions live in their frontmatter (`version: 1.0.0`). Repo tags mark the collection state.

### meetsoma/website (PUBLIC) — CalVer or tag milestones

Website doesn't need strict semver. Tag notable deployments:

```
v2026.03.10    ← skills page launched
v2026.03.15    ← protocol docs added
```

Or just don't tag at all — the website auto-deploys from main. Tags are optional here.

### meetsoma/soma (PUBLIC, future) — Semver strict

This is the product. Users install it. Semver is required.

```
v0.1.0    ← first public release (core only)
v0.2.0    ← protocol support
v1.0.0    ← stable, recommended for use
```

### curtismercier/somas-daddy (PRIVATE) — Date tags

This is a personal backup/reference. Semver is overkill.

```
2026-03-10    ← initial extraction
2026-03-15    ← updated scripts + agent definitions
2026-04-01    ← monthly snapshot
```

---

## GitHub Releases as Backup

### What Gets Attached

| Repo | Release Assets |
|------|---------------|
| **meetsoma/agent** | `soma-agent-v0.2.0.zip` (full repo snapshot), `extensions-v0.2.0.zip` (just the runtime code), `protocols-v0.2.0.zip` (reference protocols) |
| **curtismercier/protocols** | `protocol-specs-v0.2.0.zip` (all specs) |
| **meetsoma/soma** (future) | `soma-v0.1.0.zip` (installable package), `soma-v0.1.0.tar.gz` |
| **somas-daddy** | `vault-infra-2026-03-10.zip` (structural extraction) |

### Why This Matters

1. **Rollback** — broke something? Download the last working release zip. Don't even need git.
2. **Offline backup** — releases persist even if repo is deleted (within retention).
3. **Distribution** — users can download a specific version without git.
4. **Artifact preservation** — built code, compiled extensions, bundled configs.

### Release Script

```bash
#!/bin/bash
# soma-release.sh — create a GitHub release with assets
# Usage: soma-release.sh <version> [--repo meetsoma/agent]

set -euo pipefail

VERSION="${1:?Usage: soma-release.sh <version>}"
REPO="${2:-meetsoma/agent}"
TAG="v${VERSION}"

# Build assets
echo "Building release assets..."
TMPDIR=$(mktemp -d)

# Full repo snapshot (excluding .soma/ personal data, .worktrees/)
git archive --format=zip --prefix="soma-agent-${VERSION}/" HEAD \
  -o "${TMPDIR}/soma-agent-${VERSION}.zip"

# Extensions only
zip -r "${TMPDIR}/extensions-${VERSION}.zip" extensions/

# Protocols only  
zip -r "${TMPDIR}/protocols-${VERSION}.zip" protocols/

# Tag
git tag -a "$TAG" -m "Release ${VERSION}"
git push origin "$TAG"

# Create release with assets
gh release create "$TAG" \
  "${TMPDIR}/soma-agent-${VERSION}.zip" \
  "${TMPDIR}/extensions-${VERSION}.zip" \
  "${TMPDIR}/protocols-${VERSION}.zip" \
  --title "Soma Agent ${VERSION}" \
  --notes-file CHANGELOG.md \
  --repo "$REPO"

echo "✅ Released ${TAG} to ${REPO}"
rm -rf "$TMPDIR"
```

---

## Changelog Convention

Each tagged release should have release notes. Two approaches:

### Option A: CHANGELOG.md (file-based)

```markdown
# Changelog

## [0.2.0] - 2026-03-10

### Added
- Protocol architecture — four-layer plugin model
- Heat tracking model (cold/warm/hot)
- Parent-child protocol flow
- Agnostic root directory (.soma/.claude/.cursor)
- GitHub skill with progressive sub-skills

### Changed
- Flattened paths: ~/.soma/agent/skills/ → ~/.soma/skills/
- Plugin index replaces skill index (v1 → v2)

### Fixed
- Nothing yet

## [0.1.0] - 2026-03-09

### Added
- Initial architecture plans
- 3 core extensions (boot, header, statusline)
- 5 protocol spec outlines
```

### Option B: Release notes only (GitHub-based)

Write notes when creating the release. No file to maintain. Works for repos where you don't want changelog clutter.

**Recommendation:** CHANGELOG.md for `meetsoma/agent` and `meetsoma/soma` (products). Release notes only for `protocols` and `somas-daddy`.

---

## Version Pinning Across Repos

When downstream repos reference upstream:

```json
// meetsoma/agent → protocols.json
{
  "upstream": "curtismercier/protocols",
  "pinned": "v0.1.0",
  "specs": {
    "amp": { "version": "0.1.0", "path": "amp/spec.md" },
    "atlas": { "version": "0.1.0", "path": "atlas/spec.md" }
  }
}
```

`protocol-sync.sh` checks the pinned version. If upstream has a new tag, it warns but doesn't auto-update. Explicit upgrade:

```bash
soma protocol sync --upgrade    # pull latest tag from upstream
soma protocol sync --pin v0.2.0 # pin to specific version
```

---

## Pre-release / Beta Tags

For testing before stable release:

```
v0.2.0-beta.1    ← testing protocol system
v0.2.0-beta.2    ← fixed heat tracking
v0.2.0-rc.1      ← release candidate
v0.2.0           ← stable
```

GitHub marks pre-releases differently in the UI. Good for signaling "don't use this in production."

```bash
gh release create v0.2.0-beta.1 \
  --prerelease \
  --title "v0.2.0-beta.1 — Protocol System" \
  --notes "Testing heat tracking. Not stable."
```

---

## Rollback Procedure

If a release breaks things:

```bash
# Option 1: Git revert to tagged version
git checkout v0.1.0

# Option 2: Download release asset (no git needed)
gh release download v0.1.0 --repo meetsoma/agent --pattern "soma-agent-*.zip"
unzip soma-agent-0.1.0.zip

# Option 3: Revert on dev, tag patch release
git revert HEAD
git tag v0.2.1
gh release create v0.2.1 --title "Hotfix: revert protocol changes"
```

---

## When to Tag / Release

| Event | Action |
|-------|--------|
| Milestone complete (e.g., protocol system done) | Tag minor version, create release with assets |
| Dev → main merge | Tag if meaningful, always push tags |
| Breaking change to any schema | Tag major version |
| Bug fix to released version | Tag patch, create release |
| End of sprint / week | Consider tagging if enough changed |
| somas-daddy extraction | Date tag, zip asset |

**Don't over-tag.** A tag per session is too many. A tag per feature milestone feels right. We're pre-1.0 so tags mark "this was a coherent state worth remembering."

---

## Implementation Priority

| # | What | Effort | Notes |
|---|------|--------|-------|
| 1 | Tag meetsoma/agent v0.1.0 (current state) | Tiny | Mark the starting point |
| 2 | CHANGELOG.md for agent repo | Small | Start tracking now |
| 3 | `soma-release.sh` script | Small | Automate asset building + gh release |
| 4 | Version pinning in protocols.json | Small | Already have the manifest |
| 5 | Pre-release workflow for beta testing | Tiny | Just use `--prerelease` flag |
| 6 | Automated release notes from git log | Medium | Nice to have, not urgent |

## Open Questions

1. **Should plugin-index.json have a version field per plugin that's enforced?** Currently it does, but nothing checks it.
2. **Should `soma update` check for new versions?** Like `brew update`. Checks plugin index + protocol specs for newer versions. Nice UX but adds network dependency.
3. **Monorepo versioning** — when meetsoma/soma ships, does it version independently from meetsoma/agent? Yes, but they'll share protocol versions. Need a compatibility matrix eventually.
