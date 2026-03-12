---
type: protocol
name: breath-cycle
status: active
heat-default: hot
applies-to: [always]
breadcrumb: "Sessions have 3 phases: inhale (automated boot), hold (work — context monitored automatically), exhale (write preload, commit, say FLUSH COMPLETE → system offers auto-continue). Never skip exhale."
author: Curtis Mercier
license: CC BY 4.0
version: 1.2.0
tier: core
scope: bundled
tags: [session, memory, continuity]
spec-ref: curtismercier/protocols/breath-cycle (v0.2)
created: 2026-03-09
updated: 2026-03-10
---

# Breath Cycle Protocol

## TL;DR
- Three phases: **inhale** (boot — automated), **hold** (work — monitored), **exhale** (flush — agent-driven)
- **Inhale is automated:** identity, preload, protocols, muscles, scripts, git context all load via extension
- **Hold is monitored:** context warnings fire automatically at 50/70/80/85% — you don't track this manually
- **Heat tracking is automated:** protocol usage is auto-detected from tool results (writes, git commands, etc.)
- **Exhale is agent-driven:** write the preload, commit work, say "FLUSH COMPLETE" — system handles the rest
- After exhale: system offers `/auto-continue` to rotate into fresh session with your preload injected

## Rule

Every agent session follows three phases. No exceptions.

### Inhale (Automated)

The extension handles boot — you don't do this manually:

1. Discover `.soma/` directory (filesystem walk)
2. Load identity (layered: project → parent → global)
3. Load preload if fresh (< configurable staleness, default 48h)
4. Load protocols by heat (hot → full body, warm → breadcrumb, cold → skip)
5. Load muscles by heat (same tiers)
6. Surface available scripts with descriptions
7. Inject git context (recent commits + changed files + .soma checkpoint diff)

All of this is configured in `settings.json` via `boot.steps`. You receive the result as a boot message.

### Hold (Monitored)

Do the work. The extension monitors context automatically:

- **50%** — UI notification: "pace yourself"
- **70%** — UI notification: "flush soon"
- **80%** — System prompt injection: "wrap up current task"
- **85%** — Auto-flush: detailed instructions injected, stop new work immediately

You do NOT need to check context usage — the system tells you. Thresholds are configurable in `settings.json` via `context.notifyAt/warnAt/urgentAt/autoExhaleAt`.

Heat tracking also runs automatically during this phase:
- Writing frontmatter → frontmatter-standard heat +1
- Git commands → git-identity heat +1
- Writing preload → breath-cycle heat +1
- Writing SVG → svg-logo-design muscle heat +1
- Checkpoint commits → session-checkpoints heat +1

### Exhale (Agent-Driven)

This is the one phase YOU drive. Triggered by `/exhale`, `/breathe`, `/rest`, or auto-flush at 85%.

The extension sends you structured instructions:

**Step 1: Checkpoint**
- `.soma/` internal: `cd .soma && git add -A && git commit -m "checkpoint: <timestamp>"`
- Project code: review uncommitted changes, checkpoint if meaningful

**Step 2: Write preload** (`<.soma>/memory/preload-<sessionId>.md`)
Follow the preload format — this IS your continuation for the next session:
- What shipped (with file paths)
- Key decisions (with rationale)
- Key file locations
- Repo state (committed/dirty across repos)
- Next session priorities (ordered)
- What NOT to re-read

**Step 3: Daily log** (append to `sessions/YYYY-MM-DD.md`)
- One file per day per workspace — always append, never overwrite
- Each entry gets a `## HH:MM` timestamp header
- Multiple sessions on the same day produce multiple sections in the same file
- Also write "micro-exhales" here after completing major workflows — structured summaries that bank as persistent memory for later changelog generation, commit messages, or historical queries

**Step 4: Signal completion** — say "FLUSH COMPLETE" (or "BREATHE COMPLETE" for `/breathe`)

### After Exhale

The system detects "FLUSH COMPLETE" in your response and:
- Notifies user: "preload ready, use /auto-continue"
- `/auto-continue` creates new session and injects your preload as the first message
- `/breathe` does this automatically (exhale + rotate in one motion)

## Edge Cases

**Work after preload:** If the user sends more requests after you've written the preload, update the preload before session ends. The preload must reflect the session's final state.

**Context critical during exhale:** Preload takes priority over finishing current work. Write the preload first, even if incomplete. Something is better than nothing.

**Compaction:** If the session compacts mid-work, read your preload and orient from that. The extension does not yet auto-inject recovery (planned).

## Commands

| Command | What it does |
|---------|-------------|
| `/exhale` (alias `/flush`) | Save state, session ends |
| `/breathe` | Save state + auto-continue into fresh session |
| `/rest` | Disable keepalive + exhale (going to bed) |
| `/auto-continue` | Create new session with preload injection |
| `/inhale` | Load preload into current conversation |

## When to Apply

Always. This protocol governs the session lifecycle. It's meta — it's the protocol that makes other protocols work.

## When NOT to Apply

Never. This is always-on.
