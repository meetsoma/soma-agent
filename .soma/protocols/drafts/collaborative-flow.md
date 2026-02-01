---
type: protocol
name: collaborative-flow
version: 0.1.0
status: draft
created: 2026-03-10
updated: 2026-03-10
author: Soma Team
heat-default: cold
scope: shared
breadcrumb: "Human drives vision + micro-corrections in real-time. Agent builds continuously, weaving ideas into current work or noting for later. Never stop to ask — absorb, adapt, keep moving."
tags: [collaboration, workflow, human-agent, meta]
---

# Collaborative Flow Protocol

> Draft. Observed pattern from real sessions. Not yet formalized.

## The Pattern

Human and agent work in parallel streams:

- **Human stream**: watching, thinking, interjecting with vision-level ideas, micro-corrections, brand opinions, strategic pivots
- **Agent stream**: building, committing, updating docs, maintaining momentum

## Rules (observed, not yet codified)

1. **Don't stop to ask permission.** If the idea fits, weave it in. If it doesn't fit now, note it.
2. **Ideas seed where they belong.** Not in chat, not in a TODO — in the actual file/folder where they'll eventually live. Drafts, not finished products.
3. **Micro-corrections land immediately.** "Use 🌿 not ⚡" → fix it in the current commit, don't open a ticket.
4. **Big ideas get noted and parked.** "What about agent templates?" → capture the concept, write a plan doc, keep building what you were building.
5. **Living docs, not snapshots.** Update existing docs as ideas evolve. Don't create new docs for every thought.
6. **The human shouldn't have to repeat themselves.** If they said it, it's captured somewhere permanent.
7. **Momentum > perfection.** Ship the draft, refine later. A seeded idea beats a perfect plan that never got written.

## Anti-patterns

- Stopping work to have a long discussion about an idea (just note it)
- Asking "should I do X?" when the answer is obviously yes from context
- Creating orphaned notes that don't live near the work they relate to
- Treating every idea as urgent (some are seeds, some are now)

## Where This Fits

- **somas-daddy**: this is how Curtis's setup works — ship hot
- **enterprise**: genericize as "human-agent collaboration protocol"
- **free tier**: maybe as a guide/blog post, not a runtime protocol

## Open Questions

- How does the agent signal "I noted your idea for later" vs "I'm doing it now"?
- Should there be a seeding convention? Like `drafts/` folders in every major directory?
- How does this interact with the heat model? Ideas that keep coming up heat naturally.
