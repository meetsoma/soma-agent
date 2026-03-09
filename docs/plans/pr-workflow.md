---
type: plan
status: draft
created: 2026-03-09
updated: 2026-03-09
tags: [ci, workflow, github, agents, pr, multi-agent]
related: [branching-strategy]
---

# Agent-Driven Development — PR Workflow

> Agents build. Agents review. Agents plan. Curtis approves. Nothing merges without passing the gauntlet.

## The Vision

Development flows through a pipeline of agent roles. Each role has a clear responsibility and a clear handoff. The pipeline produces PRs that arrive at Curtis fully vetted — tests passing, conflicts resolved, changelog updated, reviewed by another agent, staged merge verified.

Two modes of execution:
1. **Multi-agent** — parallel agents in different roles, communicating via GitHub (issues, PRs, comments)
2. **Sequential** — single agent wearing different hats in sequence (build → self-review → refine → submit)

Both converge to the same output: a clean PR with Curtis as final approver.

---

## Agent Roles

### 🔨 Builder

**Identity:** Zenith (or any dev agent)
**Responsibility:** Write code, write tests, submit PR.

- Works on a feature branch (`feature/`, `fix/`, `docs/`)
- Commits with clear messages, updates CHANGELOG.md
- Runs tests locally before pushing
- Creates PR with structured body: What, Why, Changes, Tests
- Does NOT merge. Does NOT approve their own PR.

### 🔍 Critic

**Identity:** New role — could be Nova, or a dedicated review agent
**Responsibility:** Quality gate. Find what's wrong, what's missing, what could break.

- Reads the full diff
- Checks: test coverage, edge cases, stale references, cross-link integrity
- Checks: does the PR description match what actually changed?
- Checks: would this break anything downstream? (other docs, website sync, npm)
- Posts review: approve, request changes, or ask questions
- Can run tests independently to verify
- Tone: constructive but thorough. Not a rubber stamp.

### 📐 Architect

**Identity:** Nova or a planning-focused agent
**Responsibility:** Define the work before it starts. Turn vague ideas into scoped issues with acceptance criteria.

- Creates GitHub issues with: problem statement, proposed solution, acceptance criteria, files affected
- Breaks large work into smaller issues when needed
- Links issues to plans in `docs/plans/`
- Tags issues: `priority`, `scope`, `blocking`
- Reviews PRs from an architecture perspective: does this fit the system design?

### 🎯 Orchestrator

**Identity:** Forge (exists in `agents/hq/forge/`)
**Responsibility:** Run the pipeline. Ensure every step happens. Escalate to Curtis.

- Assigns issues to Builder agents
- Monitors PR status: CI passing? Review done? Conflicts?
- Requests additional review or refinement if needed
- Runs staged merge test (merge to temp branch, run full test suite, verify clean)
- Ensures all requirements from the issue are met before escalating
- Final check: "Is this ready for Curtis?" — if yes, requests Curtis's review
- Does NOT approve. Curtis approves.

---

## The Pipeline

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Architect│────►│  Issue   │────►│ Builder  │────►│  Critic  │────►│Orchestr. │
│          │     │ (GitHub) │     │          │     │          │     │          │
│ Defines  │     │ Scoped   │     │ Branch + │     │ Reviews  │     │ Staged   │
│ the work │     │ criteria │     │ PR       │     │ PR       │     │ merge    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                                         │
                                                                         ▼
                                                                   ┌──────────┐
                                                                   │ Curtis   │
                                                                   │          │
                                                                   │ Final    │
                                                                   │ approval │
                                                                   └──────────┘
```

### Step by Step

#### 1. Issue Creation (Architect)

```bash
gh issue create \
  --title "G6: Protocol applies-to filtering" \
  --body "## Problem
Protocols load regardless of project type. A TypeScript protocol loads in a Python project.

## Proposed Solution
Add \`applies-to\` frontmatter field. Detect project signals at boot. Filter protocols by match.

## Acceptance Criteria
- [ ] \`detectProjectSignals()\` returns signal set for current project
- [ ] \`protocolMatchesSignals()\` filters by applies-to field
- [ ] Protocols without applies-to load everywhere (backward compat)
- [ ] Test suite covers: match, no-match, no-field, multiple signals
- [ ] CHANGELOG.md updated

## Files Likely Affected
- \`core/signals.ts\` (new)
- \`core/protocols.ts\` (modify)
- \`tests/test-applies-to.sh\` (new)
- \`extensions/soma-boot.ts\` (wire in)

## Scope
~30 min. Single agent. No breaking changes." \
  --label "feature,core" \
  --assignee "meetsoma-builder"
```

#### 2. Build (Builder)

```bash
# Pick up issue
git checkout -b feature/G6-applies-to-filtering

# ... do the work ...

# Run tests locally
bash tests/test-protocols.sh
bash tests/test-applies-to.sh

# Submit PR referencing the issue
gh pr create \
  --base dev \
  --title "G6: applies-to filtering for protocols" \
  --body "Closes #42

## What
Protocol domain scoping via applies-to frontmatter.

## Changes
- \`core/signals.ts\`: detectProjectSignals() scans for git, TS, Python, etc.
- \`core/protocols.ts\`: protocolMatchesSignals() filters at boot
- \`tests/test-applies-to.sh\`: 12 tests covering match/no-match/no-field

## Tests
\`\`\`
protocols:   63/63 passing
applies-to:  12/12 passing
muscles:     37/37 passing
settings:    14/14 passing
\`\`\`

## Checklist
- [x] Tests pass locally
- [x] CHANGELOG.md updated
- [x] No breaking changes
- [x] Acceptance criteria from #42 met"
```

#### 3. CI (Automated)

GitHub Actions runs on every PR push:
- All test suites
- Changelog presence check
- Frontmatter validation
- Build verification (if applicable)

#### 4. Review (Critic)

The Critic agent receives the PR (via assignment or webhook):

```
Read the PR:
  - Diff looks correct for the stated changes
  - Tests actually cover the acceptance criteria
  - No stale references introduced
  - Cross-links intact (docs reference each other correctly)
  - Edge case: protocol with empty applies-to array — handled?
  - Edge case: signal detection in monorepo — handled?

Decision:
  ✅ Approve with notes
  ❌ Request changes with specific asks
  ❓ Ask questions before deciding
```

The Critic posts their review via `gh pr review`. If changes requested, Builder addresses them and pushes. Critic re-reviews.

#### 5. Orchestration (Orchestrator)

Once Critic approves and CI passes, the Orchestrator:

**a) Staged merge test:**
```bash
# Create temp branch from dev
git checkout dev && git pull
git checkout -b merge-test/G6-applies-to

# Merge the PR branch
git merge --no-ff feature/G6-applies-to-filtering

# Run FULL test suite against merged state
bash tests/test-protocols.sh
bash tests/test-muscles.sh
bash tests/test-settings.sh
bash tests/test-init.sh
bash tests/test-applies-to.sh

# If all pass → ready for Curtis
# If any fail → back to Builder with details
git checkout dev && git branch -D merge-test/G6-applies-to
```

**b) Requirements check:**
- All acceptance criteria from issue checked off?
- CI green?
- Critic approved?
- Changelog entry present?
- No merge conflicts?
- Staged merge clean?

**c) Escalate to Curtis:**
```bash
gh pr comment 42 --body "## Orchestrator Summary

✅ CI: all tests passing
✅ Review: Critic approved
✅ Staged merge: clean, all tests pass post-merge
✅ Acceptance criteria: all met
✅ Changelog: updated
✅ Conflicts: none

@curtisj ready for your final approval."

gh pr edit 42 --add-reviewer curtisj
```

#### 6. Final Approval (Curtis)

Curtis reviews the PR. Options:
- **Approve + merge** — squash merge to dev
- **Request changes** — goes back to Builder (or Critic for re-review)
- **Ask questions** — Orchestrator or Builder responds

---

## Sequential Mode (Single Agent)

When multi-agent isn't needed or available, one agent runs the pipeline sequentially:

```
Session 1 (Architect hat):
  → Read the task
  → Create issue with acceptance criteria
  → Plan the approach

Session 2 (Builder hat):
  → Pick up issue
  → Branch, build, test
  → Submit PR

Session 3 (Critic hat):
  → Fresh session, no builder context bias
  → Read PR cold
  → Review, approve or request changes

Session 4 (Orchestrator hat):
  → Staged merge test
  → Requirements checklist
  → Escalate to Curtis
```

The key insight: **each session starts fresh**. The Critic doesn't carry the Builder's context — they read the PR cold, like a real reviewer would. This catches things the Builder was too close to see.

Over time, which steps need separate sessions and which can be combined will become clear. The pattern refines through use.

---

## Issue Templates

### Feature
```markdown
## Problem
[What's wrong or missing]

## Proposed Solution
[How to fix it]

## Acceptance Criteria
- [ ] [Specific, testable requirement]
- [ ] [Another requirement]
- [ ] Tests pass
- [ ] CHANGELOG.md updated

## Scope
[Estimated effort, files affected, breaking changes?]
```

### Bug
```markdown
## Bug
[What's broken]

## Steps to Reproduce
1. [Step]
2. [Step]

## Expected vs Actual
- Expected: [X]
- Actual: [Y]

## Fix Criteria
- [ ] Bug no longer reproduces
- [ ] Regression test added
- [ ] No side effects
```

### Docs
```markdown
## Doc Gap
[What's missing or wrong]

## Content Needed
[What to write]

## Acceptance Criteria
- [ ] Doc written and synced to website
- [ ] Cross-links to related docs
- [ ] Build passes
```

---

## GitHub Actions

### PR Check (runs on every PR)

```yaml
name: PR Check
on:
  pull_request:
    branches: [dev]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Run test suites
        run: |
          bash tests/test-protocols.sh
          bash tests/test-muscles.sh
          bash tests/test-settings.sh
          bash tests/test-init.sh
          bash tests/test-applies-to.sh

  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Changelog check
        run: |
          if ! git diff origin/dev...HEAD --name-only | grep -q CHANGELOG.md; then
            echo "::warning::No CHANGELOG.md update in this PR"
          fi
      - name: PR body check
        run: |
          # Verify PR has required sections (What, Changes, Tests)
          echo "PR body validation would run here"
```

### Staged Merge Test (runs after approval)

```yaml
name: Staged Merge
on:
  pull_request_review:
    types: [submitted]

jobs:
  staged-merge:
    if: github.event.review.state == 'approved'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: dev
          fetch-depth: 0
      - name: Test merge
        run: |
          git fetch origin ${{ github.head_ref }}
          git merge --no-ff FETCH_HEAD
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Post-merge tests
        run: |
          bash tests/test-protocols.sh
          bash tests/test-muscles.sh
          bash tests/test-settings.sh
          bash tests/test-init.sh
          bash tests/test-applies-to.sh
      - name: Report
        if: always()
        run: |
          if [ $? -eq 0 ]; then
            echo "✅ Staged merge clean — all tests pass"
          else
            echo "❌ Staged merge FAILED — tests broken after merge"
          fi
```

---

## Branch Protection

### `dev`
- Require PR (no direct push)
- Require status checks: `test`, `checks`
- Require 1 review (agent or human)
- Squash merge only
- Auto-delete head branches

### `main`
- Require PR from dev
- Require status checks: `test`, `checks`, `staged-merge`
- Require review from Curtis
- No force push
- Linear history

---

## Transition Plan

| Phase | What | When |
|-------|------|------|
| **1. CI** | Set up GitHub Actions for test suites | Now |
| **2. Branches** | Start using feature branches + PRs | Next session |
| **3. Protection** | Enable branch protection on dev | After 5 successful PRs |
| **4. Critic** | Agent-as-reviewer pattern | After protection is stable |
| **5. Orchestrator** | Full pipeline with staged merge | After critic pattern is proven |
| **6. Issues** | Architect creates issues, Builder picks up | After orchestrator works |

Start simple. Add gates as trust builds. Every successful PR validates the process.

---

## Principles

1. **Curtis has final say.** Always. No auto-merge to dev without human approval. This relaxes over time as trust builds, never before.
2. **Fresh eyes review.** The Critic reads the PR cold. No shared context with the Builder. This is the whole point.
3. **Tests are non-negotiable.** CI must pass. Staged merge must pass. No exceptions.
4. **Issues define done.** Acceptance criteria are written before work starts. The PR is measured against them.
5. **The pattern refines through use.** What works stays. What doesn't gets cut. No ceremony for ceremony's sake.
