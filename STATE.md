---
type: state
method: atlas
project: meetsoma-ecosystem
updated: 2026-03-09
status: active
rule: Update this file whenever repos, infrastructure, skills, or cross-repo relationships change.
---

# meetsoma — Ecosystem State

> **ATLAS** — Single source of truth for the meetsoma GitHub org and Soma's public ecosystem.
> For Soma's internal architecture, see `products/soma/agent/.soma/STATE.md`.
> For the Gravicity-wide map, see `~/Gravicity/STATE.md`.

## What meetsoma Is

The public-facing GitHub org for **Soma** — an AI coding agent with self-growing memory. Built on Pi, extended with three layers (extensions, skills, rituals). Created by Curtis Mercier, shipped under the Gravicity brand.

Soma is the **reference implementation** of Curtis's protocol inventions (AMP, ATLAS, Three-Layer Model, Breath Cycle, Identity System, Git Identity). Six protocols published at `curtismercier/protocols` (CC BY 4.0). Soma implements them as open source (MIT).

### Architecture Note (2026-03-09)

Core extraction complete: **9 TypeScript modules** in `core/` + 3 thin extension wrappers. Full heat system operational end-to-end.

**Core modules:** discovery, identity, preload, protocols, muscles, settings, init, utils, index.

**Heat system (complete):**
- Bootstrap: `.protocol-state.json` seeds from `heat-default` on first boot (G1)
- Mid-session: `tool_result` hook auto-detects usage + `/pin` `/kill` commands (G2)
- Save: heat persists on `/exhale` AND `session_shutdown` with decay (G3)
- Settings: `core/settings.ts` reads thresholds from `settings.json` chain (G7)
- Loading: protocols by heat (hot=full, warm=breadcrumb, cold=name). Muscles by heat within token budget (hot=full, warm=digest) (G4)

**Commands:** `/exhale` (save state, ~~`/flush`~~), `/inhale` (fresh session), `/pin`/`/kill` (heat override), `/soma status`

**Dev tooling:** `soma-search.sh` (memory query), `soma-scan.sh` (frontmatter scanner), `soma-tldr.sh` (agent TL;DR generator) — surfaced at boot.

**All Tier 2 runtime gaps shipped** (G1–G4, G6, G7, G2). G6 adds `applies-to` frontmatter + `detectProjectSignals()` for domain scoping. Template install system planned (PI137).

## Org Map

```
github.com/meetsoma
│
├── agent (PRIVATE)      ← the brain: extensions, skills, docs, STATE
├── website (public)     ← soma.gravicity.ai: landing, blog, docs, ecosystem
├── cli (public)         ← npx soma — CLI wrapper (placeholder)
├── media (public)       ← brand assets: SVGs, PNGs, favicons, OG images
├── .github (public)     ← org profile README
└── blog (public)        ← empty (blog lives in website content collection)
```

## Repo Status

| Repo | Visibility | Stage | Has Code | Notes |
|------|-----------|-------|----------|-------|
| `agent` | **Private** | Active | ✅ | 9 core modules, 3 extensions, 4 operational protocols, 15+ plan docs, full heat system |
| `website` | Public | **Shipped** | ✅ | Astro 5, deployed to Vercel, HTTPS live |
| `media` | Public | **Shipped** | ✅ | Full media kit pushed |
| `.github` | Public | **Shipped** | ✅ | Org profile with ecosystem table |
| `cli` | Public | Placeholder | ❌ | Empty — awaiting soma-cli push |
| `blog` | Public | Dormant | ❌ | May repurpose or delete — blog is a website content collection |

## Website — soma.gravicity.ai

| Aspect | Detail |
|--------|--------|
| Framework | Astro 5, static output |
| Hosting | Vercel (`gravicity-ai-team`, Hobby plan) |
| Domain | `soma.gravicity.ai` → A record `76.76.21.21` (WHC cPanel) |
| SSL | ✅ Live (HTTPS confirmed 2026-03-09) |
| Deploy | `vercel --prod` from CLI (auto-deploy via GitHub not connected — Hobby plan limitation) |

### Pages

| Route | Content |
|-------|---------|
| `/` | Landing — hero with mascot, quick-start, three layers, feature cards, ecosystem map |
| `/blog` | Souls & Symlinks — agent journal with author badges (`⟐ agent` / `◉ human` / `⟐◉ co-authored`) |
| `/blog/[slug]` | Blog posts (content collection, markdown) |
| `/ecosystem` | Architecture diagram, layer breakdowns |
| `/docs` | Docs hub linking to GitHub |
| `/rss.xml` | RSS feed (working) |

### Design

- Gravicity dark theme + light toggle ("darken the lights" pattern)
- Planet blue palette: `#6898be`, `#7cb2d4`, `#e8a87c`
- Fonts: Clash Display + Satoshi
- Starfield background

## Brand Assets (media repo)

- `soma-logo.svg` — mascot (iteration 37, planet + moon)
- `soma-logo-animated.svg` — breathing animation
- `soma-icon-128.png`, `soma-logo-256.png` — raster exports
- `soma-og-social.svg` — social preview source (1280×640)
- Favicons: `.ico`, `.svg`, `apple-touch-icon.png`

## Three Layers

| Layer | Type | Status | Location |
|-------|------|--------|----------|
| **Extensions** | TypeScript hooks into Pi lifecycle | ✅ Shipped (3 extensions) | `agent` repo → `.soma/extensions/` |
| **Skills** | Markdown knowledge loaded on demand | ✅ Working (manual install) | `~/.soma/agent/skills/` |
| **Rituals** | Multi-step workflows (`/publish`, `/molt`) | 📋 Concept (PI110) | Not yet implemented |

### Skill Distribution (Planned — PI115)

```
soma skill install <name>      # fetch from meetsoma registry → ~/.soma/agent/skills/
soma skill list                 # what's installed locally
soma skill list --remote        # what's available in registry
```

**Current:** Manual copy to `~/.soma/agent/skills/`
**Next:** PI081 (resolution config) → PI115 (install command) → PI102 (community ecosystem)
**Design doc:** `products/soma/agent/.soma/plans/plugin-architecture.md`

### Ritual System (Planned — PI110)

Rituals are multi-step skills triggered by `/` commands. Phase 1: prompt-pattern matching (agent recognizes `/publish` and loads the ritual skill). Phase 2: Soma CLI wrapper intercepts `/` commands for state tracking and discoverability.

**First ritual:** `/publish` — write → commit → push → deploy a blog post.

### `soma init` (Planned — PI117)

Scaffolds `.soma/` in a project:
```
.soma/
├── identity.md     ← project identity (templated)
├── STATE.md        ← architecture truth (empty template)
├── memory/
│   └── muscles/    ← learned patterns
└── extensions/     ← project-level hooks
```

## Cross-Repo Flows

```
agent ──extensions──→ user's .soma/extensions/     (installed by cli or manual)
agent ──skills─────→ user's ~/.soma/agent/skills/  (PI115: soma skill install)
agent ──rituals────→ user's .soma/rituals/          (future)
agent ──docs───────→ website /docs pages            (linked/mirrored)
media ──assets─────→ website /public/media/          (copied at build)
website ──blog─────→ /rss.xml                        (auto-generated)
cli   ──wraps──────→ pi + agent extensions           (npx soma)
```

### Publish Flow (Planned — PI110)

```
/publish "Post Title"
  → creates markdown in website/src/content/blog/
  → sets frontmatter (date, author, authorRole, tags)
  → git commit + push to meetsoma/website
  → Vercel builds + deploys
```

## Planned Repos (Phase 2)

| Repo | Purpose | Depends On |
|------|---------|-----------|
| `hub` | Skill + ritual directory (browse, search, install) | PI081, PI115, community adoption |
| `moltbook` | Soma's Moltbook presence + engagement | Moltbook API, PI111 |

## Topics (GitHub)

| Repo | Topics |
|------|--------|
| `website` | `ai-agent`, `astro`, `coding-agent`, `soma`, `website` |
| `media` | `brand-assets`, `logo`, `media-kit`, `soma` |
| `cli` | `ai-agent`, `cli`, `coding-agent`, `soma` |
| `.github` | `profile`, `soma` |

Social preview image: `soma-og-social.svg` rendered at 1280×640 (upload pending for all repos).

## Open Work

| ID | Task | Status |
|----|------|--------|
| PI081 | Skill resolution config | Design needed |
| PI102 | Skills ecosystem repo | After PI081 |
| PI109 | Vercel GitHub auto-deploy | Blocked (Hobby plan) — using CLI deploy |
| PI110 | Ritual system design | Concept |
| PI111 | Moltbook integration | Future |
| PI112 | Social preview skill | After PI113 |
| PI113 | Port + rebrand logo/SVG skills | Ready |
| PI114 | Push latest to agent repo | After PI112+113 |
| PI115 | `soma skill install` command | After PI081 |

## Key Files

| File | What |
|------|------|
| `products/soma/agent/.soma/STATE.md` | Soma internal architecture ATLAS |
| `products/soma/docs/ecosystem-plan.md` | Original planning doc (historical, partially outdated) |
| `products/soma/docs/website-plan.md` | Astro site plan + reference analysis |
| `products/soma/website/` | Astro site source |
| `products/soma/website/src/layouts/Layout.astro` | Theme variables, fonts, global styles |
| `products/soma/website/src/content/blog/` | Blog posts |
| `Soma/.soma/memory/muscles/` | Soma's learned patterns |

---

*This is the org-level ATLAS. For Soma's internals → `products/soma/agent/.soma/STATE.md`. For Gravicity-wide → `~/Gravicity/STATE.md`.*

