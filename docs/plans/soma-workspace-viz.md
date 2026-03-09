---
type: plan
status: seed
created: 2026-03-07
updated: 2026-03-07
priority: medium
tags: [visualization, ui, agents, multi-agent, office, orbital, 3d, swarm, extension]
related: [light-core-architecture, protocol-architecture, plugin-architecture]
idea-sources:
  - SwarmWatch (github.com/SwarmPack/SwarmWatch) — orbital agent status TUI
  - pulsar.gravicity.ai — Gravicity orbital viz (planets orbiting center)
  - OpenClaw 3D Office (@iamlukethedev, Mar 6 2026) — isometric agent workspace
  - Soma parent-child identity architecture
---

# Soma Workspace Visualizer — The Office

> A visual representation of the soma ecosystem — mother agent at center, baby somas orbiting, each with their own workspace that grows with their `.soma/` directory. Not a dashboard. An AI workplace.

## The Idea

### View 1: Orbital (SwarmWatch-inspired)
Mother soma at center. Baby somas orbit around it like planets. Each planet's size/brightness reflects:
- Activity (thinking/idle/working)
- Memory size (how grown the `.soma/` is)
- Heat (how many hot protocols/muscles)

Click a planet → zoom into its workspace (View 2).

### View 2: Office (OpenClaw 3D-inspired)
Each soma has a desk. The desk IS the `.soma/` scaffold:
- **File cabinets** → protocols/ (one drawer per protocol, hot ones glow)
- **Bookshelf** → skills/ (installed abilities)
- **Notebook** → memory/muscles/ (thicker = more muscles)
- **Sticky notes** → preload-next.md (session continuation state)
- **Nameplate** → identity.md
- **Blueprint on wall** → STATE.md

As the project grows, the office grows:
- Day 1: empty desk, single chair
- Month 1: full desk, bookshelf filling, file cabinets labeled
- Year 1: corner office with reference library

### View 3: Round Table (parent-child)
Mother soma at center of a round table. Baby somas seated around it. Visual representation of:
- Identity inheritance (parent traits flowing down)
- Protocol sharing (@children/ symlinks)
- Memory promotion (muscle bubbling up from child to parent)

### The Gravitational Metaphor
This is literally the Gravicity brand. Pulsar already had the orbital viz for business tools (Email, Phone, CRM orbiting center). Now it's agents orbiting an agent. The metaphor holds:
- Gravitational pull = identity inheritance
- Orbital distance = scope (closer = tighter coupling)
- Planet size = complexity/maturity
- Moons = sub-agents or skills

## Technical Shape

### Option A: Web App (React + Three.js)
- Full 3D isometric office like OpenClaw
- Reads `.soma/` directories via API or filesystem
- Real-time agent status via WebSocket or polling
- Could be a page on soma.gravicity.ai

### Option B: Pi Extension (TUI)
- ASCII/Unicode orbital view in the terminal
- Fits inside soma's statusline or a `/office` command
- SwarmWatch is already a TUI — proves it works
- Lower fidelity but zero friction (no browser needed)

### Option C: Electron/Desktop App
- Full experience, standalone
- Most effort, most polish
- Could embed the web view

### Option D: Hybrid
- TUI for quick status (`/swarm` command shows orbital overview)
- Web for full 3D office view (`soma office` opens browser)
- Both read from same data source (`.soma/` directories + agent status)

**Lean: Option D.** TUI for daily use, web for the wow factor.

## What It Reads

The visualizer is a pure **read layer** on top of existing soma infrastructure:

| Visual Element | Data Source |
|---------------|-------------|
| Agent name | `identity.md` → name field or filename |
| Agent status | Pi session state (active/idle/thinking) |
| Protocol cabinets | `.soma/protocols/*.md` count + heat |
| Muscle shelves | `.soma/memory/muscles/*.md` count + heat |
| Skill books | `.soma/skills/` count |
| Desk growth | Total `.soma/` file count over time |
| Parent-child | `getSomaChain()` from core/discovery.ts |
| Orbital position | Configurable or auto from directory structure |

No new data formats needed. It just visualizes what `.soma/` already contains.

## Prior Art / Inspiration

| Source | What | Take From It |
|--------|------|-------------|
| SwarmWatch | Orbital TUI, agent status bubbles | The orbital layout, real-time status |
| pulsar.gravicity.ai | Planet metaphor, orbiting services | Brand consistency, gravitational framing |
| OpenClaw 3D Office | Isometric workspace, agents at desks | The office metaphor, furniture = capabilities |
| Soma identity chain | Parent → child inheritance | Visual representation of identity flow |

## Open Questions

1. **How do we detect agent status?** Pi sessions are isolated. Need a status file or IPC mechanism for the visualizer to know which agents are active.
2. **Does each `.soma/` in a workspace = one agent?** Or can a single `.soma/` have multiple "roles" (like frontend identity vs API identity)?
3. **SwarmWatch fork or clean-room?** SwarmWatch is MIT. Could fork the orbital view, rip out Cline/Cursor specifics, wire to soma's discovery. Or build from scratch with same concept.
4. **How does this relate to the ritual system?** Could `/office` be a ritual that opens the visualizer?
5. **Multi-machine?** If agents run on different machines (beast server, local), how does the viz aggregate? Needs a lightweight status protocol.

## Evolution Path

```
Seed (now)
  → Design: wireframes, data model, component map
  → Prototype: TUI orbital view as Pi extension (reads .soma/ dirs)
  → MVP: web 3D office (single workspace, no real-time)
  → v1: real-time status, multi-agent, parent-child visualization
  → v2: interactive — click agent to open chat, drag to reorganize
```

## Relationship to Parent-Child Architecture

This idea forces us to **finalize the parent-child soma model**. Current state:
- `core/discovery.ts` has `getSomaChain()` — walks up to find parent .soma/ dirs
- Identity layering works (project → parent → global)
- But: child somas don't register with parents. There's no "here are my children" discovery.
- The visualizer needs: given a workspace root, find ALL .soma/ instances in the tree

This is the `@children/` symlink concept from `protocol-architecture.md` — parent has symlinks to child somas. Or: a scan-based approach where the visualizer walks the tree.

**Decision needed:** explicit registration (@children/ symlinks) vs implicit discovery (tree walk). Tree walk is simpler, symlinks are faster for large workspaces.
