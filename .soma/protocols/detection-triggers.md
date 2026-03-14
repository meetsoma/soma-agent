---
type: protocol
name: detection-triggers
status: active
heat-default: warm
applies-to: [always]
version: 1.0.0
created: 2026-03-12
updated: 2026-03-14
tags: [learning, self-improvement, memory, awareness]
tier: core
version: 1.0.0scope: bundled
appliesTo: [always]
breadcrumb: "Recognize capture moments: corrections/preferences/repeated patterns → muscle. Knowledge gaps/errors → session log. One-time instructions and transient state are NOT worth capturing. Bubble-up: log → muscle → protocol → core."
author: Curtis Mercier
license: CC BY 4.0
---

# Detection Triggers

## TL;DR

Capture learnings when you see: corrections ("no", "wrong", user edits your output), preferences ("I prefer", "always do X"), repeated patterns (3+ times), knowledge gaps, or environment gotchas. Don't capture one-time instructions or transient state. Bubble-up path: session log → muscle → protocol → core. Each level needs more evidence.

Know when to capture a learning. Don't rely on discipline alone — recognize the moments.

## Capture Triggers

### Corrections (→ muscle)
- User says "no", "wrong", "actually", "don't", "stop"
- User edits your output
- User rejects a suggestion
- Same instruction given twice

### Preferences (→ muscle)
- "I like when you..." / "I prefer..."
- "Always do X for me" / "Never do Y"
- "My style is..." / "For this project, use..."
- User consistently chooses one option over another

### Patterns (→ muscle after 3x)
- Same tool/command used 3+ times in a session
- Same workflow repeated across sessions
- User praises a specific approach
- A workaround that keeps being needed

### Knowledge Gaps (→ session log)
- You gave outdated information and were corrected
- You didn't know something the user expected you to know
- External tool/API behavior changed from what you assumed

### Errors (→ session log, maybe muscle)
- A command fails and you find a different fix
- A retry strategy that works
- An environment-specific gotcha (OS, tool version, config)

## What NOT to Capture

- One-time instructions ("do X right now")
- Context-specific details ("in this file on line 42...")
- Hypotheticals ("what if we...")
- Transient state ("the server is down right now")

## Escalation Path

```
observation → session log → repeated? → muscle → shared? → protocol → universal? → core
```

This is the bubble-up flow. Each level requires more evidence:
- **Session log:** saw it once
- **Muscle:** saw it 2-3 times, or user explicitly stated it
- **Protocol:** applies across users/projects
- **Core:** universal agent behavior

---

<!--
Licensed under CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Author: Curtis Mercier
-->
