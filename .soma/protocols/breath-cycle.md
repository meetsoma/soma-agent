---
type: protocol
name: breath-cycle
status: active
updated: 2026-03-09
heat-default: hot
breadcrumb: "Sessions have 3 phases: inhale (boot, load identity + memory + protocols), hold (work, track context), exhale (flush state, update heat, write preload). Never skip exhale."
---

# Breath Cycle Protocol

## TL;DR
- Three phases, no exceptions: **inhale** (boot identity + memory + protocols), **hold** (work + track context), **exhale** (flush state + write preload)
- Exhale triggers at 85% context OR `/exhale` (~~`/flush`~~) — never skip it, or session learnings are lost
- Inhale loads: identity (layered) → preload → muscles (by heat) → protocols → STATE.md
- Exhale writes: preload-next.md (IS the continuation prompt, D011) → .protocol-state.json (heat update)
- This protocol is meta — it governs when all other protocols load and when their heat updates
- Commands: `/exhale` to flush, `/inhale` to start fresh (~~`/flush`~~ still works as alias, D012)

## Rule

Every agent session follows three phases. No exceptions.

### Inhale (Boot)
1. Discover `.soma/` directory (walk up filesystem)
2. Load identity (project → parent → global, layered)
3. Load preload-next.md if exists and fresh (< 48h)
4. Load muscles by heat (hottest first, within token budget)
5. Scan `.soma/protocols/` — inject hot protocols fully, warm as breadcrumbs
6. Surface available scripts (`.soma/scripts/`) — agent knows its tools
7. Load STATE.md for architecture context

### Hold (Work)
1. Monitor context usage (warn at 50%, 70%, 80%)
2. Track which protocols are being applied (heat events)
3. Track which muscles are being referenced
4. Do the actual work the human asked for

### Exhale (Flush)
1. Triggered at 85% context OR by `/exhale` command (~~`/flush`~~ alias still works)
2. Extract session state into preload-next.md
3. Update `.protocol-state.json` — heat up used protocols, decay unused
4. Update muscle frontmatter if muscles were referenced
5. Note any patterns worth crystallizing (muscle candidates)
6. Preload-next.md IS the continuation prompt (D011) — no separate file needed

## Critical Rule

**Never skip exhale.** If context runs out before exhale, the session's learnings are lost. The 85% auto-trigger exists to prevent this. If the human ends the session early, exhale what you can.

## When to Apply

Always. This protocol governs the session lifecycle. It's meta — it's the protocol that makes other protocols work (they load during inhale, their heat updates during exhale).

<!-- v1.0.0 | created: 2026-03-10 | MIT | Curtis Mercier | upstream: curtismercier/protocols/breath-cycle/ -->
