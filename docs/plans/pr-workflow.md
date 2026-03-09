---
type: plan
status: draft
created: 2026-03-09
tags: [ci, workflow, github, agents, pr]
related: [branching-strategy]
---

# PR Workflow — Agent-Driven Development

> No more pushing directly to dev. Agents submit PRs. Another agent (or human) reviews. Tests run. Merge happens cleanly.

## Why

Right now we push directly to dev from agent sessions. This works for solo velocity but breaks down when:
- Multiple agents work concurrently (preload collisions, merge conflicts)
- Quality gates matter (tests, lint, changelog entries)
- We want audit trail (who changed what, why, when)
- External contributors show up

## The Flow

```
feature/heat-decay-fix  ──PR──►  dev  ──PR──►  main  ──tag──►  npm publish
       ↑                          ↑                      ↑
   agent works              agent reviews           human approves
   on branch                runs tests              tags release
                            checks changelog
```

### 1. Agent Works on Branch

Every task gets a branch:
```bash
git checkout -b feature/PI-131-applies-to-filtering
# ... agent does work ...
git push origin feature/PI-131-applies-to-filtering
```

Branch naming: `feature/`, `fix/`, `docs/`, `refactor/` + ticket ID if exists.

### 2. Agent Submits PR

Using `gh` CLI or GitHub API:
```bash
gh pr create \
  --base dev \
  --title "G6: applies-to filtering for protocols" \
  --body "## What
Adds domain scoping to protocols via applies-to frontmatter.

## Changes
- core/signals.ts: detectProjectSignals()
- core/protocols.ts: protocolMatchesSignals()
- tests/test-applies-to.sh: 12 new tests

## Tests
All passing: protocols (63), muscles (37), settings (14), applies-to (12)"
```

### 3. CI Runs

GitHub Actions on PR:
```yaml
# .github/workflows/pr-check.yml
name: PR Check
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: bash tests/test-protocols.sh
      - run: bash tests/test-muscles.sh
      - run: bash tests/test-settings.sh
      - run: bash tests/test-init.sh
      - run: bash tests/test-applies-to.sh

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check changelog
        run: |
          if ! git diff origin/dev...HEAD --name-only | grep -q CHANGELOG.md; then
            echo "⚠️ No CHANGELOG.md update — is this intentional?"
          fi
      - name: Check frontmatter
        run: bash .soma/scripts/soma-scan.sh --check
```

### 4. Review Agent

A second agent (or the same agent in review mode) checks the PR:

**Automated checks:**
- Tests pass
- No merge conflicts
- Changelog updated
- Frontmatter valid on new docs

**Agent review (via `gh pr review`):**
- Read the diff
- Check for: stale references, missing cross-links, test coverage gaps
- Approve or request changes with specific comments

```bash
gh pr review 42 --approve --body "Tests pass. Changelog updated. LGTM."
# or
gh pr review 42 --request-changes --body "Missing test for cold protocol edge case."
```

### 5. Merge

Squash merge to dev for clean history:
```bash
gh pr merge 42 --squash --delete-branch
```

### 6. Release Flow

dev → main is a release PR:
```bash
gh pr create --base main --head dev \
  --title "Release 0.3.0" \
  --body "$(cat CHANGELOG.md | sed -n '/## \[0.3.0\]/,/## \[/p' | head -n -1)"
```

After merge to main:
```bash
git tag v0.3.0
git push origin v0.3.0
bash scripts/publish.sh --publish  # npm publish both packages
```

## Branch Protection Rules

### `dev`
- Require PR (no direct push)
- Require CI passing
- Allow squash merge only
- Auto-delete branches after merge

### `main`
- Require PR from dev only
- Require CI passing
- Require 1 approval (human or designated reviewer agent)
- Require changelog update
- No force push

## Agent Roles

| Role | What | Who |
|------|------|-----|
| **Builder** | Works on feature branch, submits PR | Zenith (any session) |
| **Reviewer** | Reads PR, runs tests, approves/requests changes | Zenith (review mode) or Nova |
| **Releaser** | Merges dev→main, tags, publishes npm | Human (Curtis) for now |

## Transition Plan

1. **Now:** Set up GitHub Actions for test suite
2. **Next:** Start using feature branches + PRs for new work
3. **Soon:** Add branch protection rules to dev
4. **Later:** Agent-as-reviewer pattern, auto-merge on CI pass

## Open Questions

- Should the reviewer agent be a separate pi session with a "reviewer" identity?
- Auto-merge on CI pass + agent approval, or always require human?
- Conventional commits for auto-changelog generation?
- Monorepo (agent + cli + website) or keep separate repos with cross-repo PRs?
