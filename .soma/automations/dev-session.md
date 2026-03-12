---
type: automation
name: dev-session
status: active
heat: 5
created: 2026-03-12
updated: 2026-03-12
tags: [dev, workflow, autonomous]
trigger: session-start
description: Autonomous dev session — check kanban, pre-flight, implement, ship, wrap up.
---

# Dev Session Automation

<!-- digest:start -->
> **Dev Session** — autonomous work loop: (1) Orient from kanban + preload, (2) Pre-flight: read related code/docs, (3) Plan: break into small tasks, (4) Implement: edit → test → commit per task, (5) Ship: push → cherry-pick → sync CLI, (6) Doc refresh: audit → update docs → sync website → deploy, (7) Wrap up: update kanban → session log → preload. Follow each step. Note gaps.
<!-- digest:end -->

## When to Run

- Start of any dev session (after boot/preload)
- When the user says "keep going" or "keep rolling"
- When you have clear kanban items and no blocking questions

## Steps

### 1. ORIENT (every session start)

```
□ Read preload Orient From targets
□ Read .soma/_kanban.md — what's Active? What's In Progress?
□ Pick the highest-priority unblocked item
□ If unclear, ask the user. Don't guess on priority.
```

### 2. PRE-FLIGHT (before touching code)

```
□ Read the files related to the task (source, tests, docs)
□ Check: does a test already exist? What's the current state?
□ Check: any open TODOs or known bugs in that area?
□ Mental model: can you explain the change before making it?
```

### 3. PLAN (break it down)

```
□ If the task is > 1 commit of work, break into sub-tasks
□ Write sub-tasks as a checklist (in your response, not a file)
□ Each sub-task should be: edit → test → commit
□ Estimate: will this fit in remaining context? If tight, do fewer tasks.
```

### 4. IMPLEMENT (per sub-task)

```
□ Make the edit
□ Run tests: for t in tests/test-*.sh; do bash "$t" 2>&1 | grep Results; done
□ If tests fail: fix before moving on. Never commit broken tests.
□ Commit: type(scope): description
□ Move to next sub-task
```

### 5. SHIP (after all sub-tasks done)

```
□ Push agent-stable: git push meetsoma main
□ Cherry-pick to dev: cd ../agent && git cherry-pick <hash> && git push meetsoma dev
□ Sync CLI: bash scripts/sync-to-cli.sh → commit + push CLI
□ If extension/runtime changed: note that self-switch is needed
```

### 6. DOC REFRESH (after shipping — don't skip this)

```
□ Run audit: bash scripts/soma-audit.sh
□ Check: any new settings? → update configuration.md
□ Check: any new commands? → update commands.md
□ Check: any new scripts? → update scripts.md
□ Check: any new concepts? → update how-it-works.md
□ Update CHANGELOG.md unreleased section
□ Update website roadmap if feature status changed
□ Sync: bash scripts/sync-to-cli.sh (includes docs now)
□ Sync: bash scripts/sync-to-website.sh
□ Deploy: website merge dev→main
□ Verify: bash scripts/soma-audit.sh → 10+/11
```

### 7. WRAP UP

```
□ Update kanban: move completed items to Done, add new items found
□ Append to session log: .soma/memory/sessions/YYYY-MM-DD.md
□ If context > 50%: start wrapping, auto-breathe will handle rotation
□ If switching tasks: update preload Orient From for next task
```

## Gaps Log

> After each session using this automation, note what was missing or wrong.
> These get folded into the steps on next revision.

- (none yet — first version)
