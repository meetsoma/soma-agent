---
type: automation
name: dev-session
status: active
heat: 5
created: 2026-03-12
updated: 2026-03-14
tags: [dev, workflow, autonomous]
trigger: session-start
description: Autonomous dev session — orient, plan, implement, ship, wrap up.
author: meetsoma
license: MIT
---

# Dev Session Automation

<!-- digest:start -->
> **Dev Session** — autonomous work loop: (1) Orient from kanban + preload, (2) Pre-flight: read related code/docs, (3) Plan: break into small tasks, (4) Implement: edit → test → commit per task, (5) Ship: push changes, (6) Wrap up: update kanban → session log → preload. Follow each step. Note gaps.
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
□ Run tests (if the project has them)
□ If tests fail: fix before moving on. Never commit broken tests.
□ Commit: type(scope): description
□ Move to next sub-task
```

### 5. SHIP (after all sub-tasks done)

```
□ Push to remote
□ If docs were affected, verify they're updated
□ If the project has CI, check it passes
```

### 6. WRAP UP

```
□ Update kanban: move completed items to Done, add new items found
□ Append to session log: .soma/memory/sessions/YYYY-MM-DD-sNN.md
□ If context > 50%: start wrapping, auto-breathe will handle rotation
□ If switching tasks: update preload Orient From for next task
```

## Gaps Log

> After each session using this automation, note what was missing or wrong.
> These get folded into the steps on next revision.
