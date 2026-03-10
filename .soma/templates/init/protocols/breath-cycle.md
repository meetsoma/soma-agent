---
type: protocol
name: breath-cycle
status: active
heat-default: hot
applies-to: [always]
breadcrumb: "Sessions have 3 phases: inhale (boot — load identity, memory, protocols), hold (work, track context), exhale (flush state, update heat, write preload). Never skip exhale."
---

# Breath Cycle Protocol

## TL;DR
- Three phases, no exceptions: **inhale** (boot identity + memory + protocols), **hold** (work + track context), **exhale** (flush state + write preload)
- Exhale triggers at 85% context or on `/exhale` — never skip it, or session learnings are lost
- Inhale loads: identity → preload → muscles (by heat) → protocols → STATE.md
- Exhale writes: preload-next.md (continuation for next session) + heat state updates
- This protocol is meta — it governs when all other protocols load and when their heat updates

## Rule

Every agent session follows three phases. No exceptions.

### Inhale (Boot)
1. Discover `.soma/` directory (walk up filesystem)
2. Load identity (project → parent → global, layered)
3. Load preload-next.md if exists and fresh
4. Load muscles by heat (hottest first, within token budget)
5. Scan protocols — inject hot protocols fully, warm as breadcrumbs
6. Surface available scripts
7. Load STATE.md for architecture context

### Hold (Work)
1. Monitor context usage
2. Track which protocols are being applied
3. Track which muscles are being referenced
4. Do the actual work

### Exhale (Flush)
1. Triggered at 85% context or by `/exhale` command
2. Write preload-next.md with session state
3. Update protocol heat — bump used, decay unused
4. Update muscle heat if muscles were referenced
5. Note any patterns worth crystallizing as muscles

## Critical Rule

**Never skip exhale.** If context runs out before exhale, the session's learnings are lost. The 85% auto-trigger exists to prevent this. If the session ends early, exhale what you can.

## When to Apply

Always. This is the meta-protocol — it governs the session lifecycle and makes all other protocols work.

## When NOT to Apply

Never. This always applies.
