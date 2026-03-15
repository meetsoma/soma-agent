---
type: protocol
name: detection-triggers
status: active
heat-default: warm
applies-to: [always]
version: 1.0.0
created: 2026-03-12
updated: 2026-03-15
tags: [learning, self-improvement, memory, awareness]
tier: core
scope: bundled
breadcrumb: "Capture on corrections, preferences, 3+ patterns, knowledge gaps. Bubble-up: log → muscle → protocol → core."
author: meetsoma
license: MIT
---

# Detection Triggers

## TL;DR
Capture on: corrections, preferences, 3+ repeated patterns, knowledge gaps. Skip one-time instructions. Bubble-up: session log → muscle → protocol → core.

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
observation → session log → repeated? → muscle → universal? → protocol
                                              → project-specific? → identity
```

This is the bubble-up flow. Each level requires more evidence:
- **Session log:** saw it once
- **Muscle:** saw it 2-3 times, or user explicitly stated it
- **Protocol:** applies across users/projects — ships to all Soma users
- **Identity:** project-specific sharpening of a protocol's universal rule

**The key question at the muscle→protocol boundary:** would this help someone who isn't us? If yes → protocol. If it's about our specific tools, repos, or workflow → identity.

**Identity is not "above" protocols.** It's a parallel track. Protocols are universal defaults. Identity customizes them. A Soma with good protocols and no identity should still work well. A Soma with identity but no protocols is fragile — it has opinions but no foundation.

---
