# Soma Ecosystem Plan

> Living document. High-level vision for the meetsoma GitHub org, repos, and how they connect.
> Detailed plans for each repo get their own doc (linked below as they're written).

## Org: github.com/meetsoma

### Phase 1 — Foundation

| Repo | Purpose | Framework | Status |
|------|---------|-----------|--------|
| **agent** | Extensions, skills, rituals, docs | TypeScript (pi extension API) | Created (empty) |
| **website** | soma.gravicity.ai — landing, blog, docs | Astro | Created (empty) |
| **cli** | `npx soma` / `npm i -g @gravicity.ai/soma` | Node CLI | Created (empty) |
| **media** | Brand assets, logos, media kit | Static files | Created (empty) |
| **.github** | Org profile README | Markdown | Created (empty) |

### Phase 2 — Community

| Repo | Purpose | Framework | Status |
|------|---------|-----------|--------|
| **hub** | Skill + ritual directory (like ClawhHub) | TBD (React + backend?) | Idea |
| **moltbook** | Soma's Moltbook presence + engagement tooling | Node | Idea |

---

## The Three Layers

Soma has three types of addons. Each serves a different purpose and has different authoring patterns.

### Extensions
**What:** TypeScript hooks into pi's lifecycle — headers, statuslines, boot sequences, auto-flush, memory management.

**Where they live:** `.soma/extensions/` (project) or `~/.soma/extensions/` (global)

**Who writes them:** Developers extending Soma's behavior.

**Examples:** `soma-boot.ts`, `soma-header.ts`, `soma-statusline.ts`

**Distribution:** Installed from `meetsoma/agent` repo or written locally.

### Skills
**What:** Markdown instruction sets — domain knowledge the agent loads on demand. Declare *what* the agent should know, not *how* to hook into the system.

**Where they live:** `~/.soma/agent/skills/`, `~/.agents/skills/`, or project `.soma/skills/`

**Who writes them:** Anyone. Low barrier — just markdown.

**Examples:** `logo-creator`, `favicon-gen`, `remotion-best-practices`

**Distribution:** Copy into skills directory. Future: install from **hub**.

**Open question (PI081):** Skill resolution config — search paths, priority order, per-project overrides.

### Rituals
**What:** Multi-step workflows — predefined sequences of commands, checks, and actions triggered by slash commands or events. The Soma equivalent of OpenClaw's Lobster workflows, but identity-aware.

**Where they live:** `meetsoma/agent` repo, installed to `.soma/rituals/` or `~/.soma/rituals/`

**Who writes them:** Developers or power users. More structured than skills, less complex than extensions.

**Examples:**
- `/publish` — draft → preview → approve → frontmatter → git commit → deploy
- `/molt` — memory flush → rotate → compress → commit
- `/patrol` — Moltbook recon → engage → report (future)

**Implementation:** TBD. Could be:
- Extension-based (each ritual is a slash command registered by an extension)
- Config-based (YAML/JSON workflow definitions, interpreted by a ritual-runner extension)
- Hybrid (simple rituals as config, complex ones as extensions)

**Status:** Concept. Needs design doc.

---

## Repo Details

### agent (`meetsoma/agent`)
The core. Everything that makes Soma *Soma* — boot sequence, memory system, identity loading, preload, auto-flush, branded UI.

**Contains:**
- `extensions/` — soma-boot, soma-header, soma-statusline
- `skills/` — Soma-specific skills (if any)
- `rituals/` — workflow definitions (future)
- `docs/` — how-it-works, getting-started, memory-layout, extending
- `.soma/` — STATE.md, default config

**Source:** `~/Gravicity/products/soma/`

**Detailed plan:** [TODO — agent-plan.md]

### website (`meetsoma/website`)
Public face. Landing page, blog (Souls & Symlinks), docs, integrations showcase.

**Framework:** Astro
- Static by default, fast, markdown-native
- Content collections for blog posts
- Same framework as openclaw.ai (proven pattern)
- Deploy to Vercel

**Structure:**
```
src/
├── content/
│   └── blog/              ← Souls & Symlinks posts (markdown)
├── pages/
│   ├── index.astro        ← Landing page
│   ├── blog/
│   │   ├── index.astro    ← Blog index
│   │   └── [...slug].astro ← Post pages
│   ├── docs/              ← Docs pages
│   └── rss.xml.js         ← RSS feed
├── components/            ← Shared UI
├── layouts/               ← Base layouts
└── data/                  ← Testimonials, showcase, etc.
public/
├── media/                 ← Copied/symlinked from media repo
├── favicon.ico
└── og-image.png
```

**Design direction:** Gravicity dark theme. σῶμα logotype. Minimal, identity-forward.

**Blog integration:** Souls & Symlinks content lives here as Astro content collections. Posts authored as markdown, rendered at build time. The `/publish` ritual (from agent repo) would create the post file and push to this repo.

**Reference:** openclaw.ai (Astro, Vercel, content collections, simple-icons for integrations)

**Source:** New. Blog content migrated from `~/Gravicity/products/souls-and-symlinks/`

**Detailed plan:** [TODO — website-plan.md]

### cli (`meetsoma/cli`)
The npm package that lets anyone run `soma` or `npx soma`.

**What it does:**
- Wraps pi with `piConfig.configDir: ".soma"`
- Sets `PI_SKIP_VERSION_CHECK=1`
- Loads soma extensions on boot
- Handles `soma` (fresh) vs `soma -c` (continue with preload)

**Source:** `~/Gravicity/tools/pi/soma-cli/`

**Detailed plan:** [TODO — cli-plan.md]

### media (`meetsoma/media`)
Brand assets for consistent use across all repos and external platforms.

**Contains:**
- `svg/` — soma-logo.svg, soma-icon.svg, soma-logo-animated.svg
- `png/` — logo + icon at 16/32/64/128/256/512/1024px
- `favicon/` — full favicon set (ico, svg, apple-touch, webmanifest)
- `social/` — OG images (dark + light)
- `README.md` — usage guidelines

**Source:** `~/Gravicity/Soma/logos/media-kit/` (symlinked at `products/soma/media`)

**Detailed plan:** Probably doesn't need one — just push when ready.

### .github (`meetsoma/.github`)
Org-level profile and templates.

**Contains:**
- `profile/README.md` — shows on github.com/meetsoma
- Issue/PR templates (future)

### hub (`meetsoma/hub`) — Phase 2
Skill and ritual directory. Like OpenClaw's ClawhHub — a web app where people can browse, search, and install community-contributed skills and rituals.

**Reference:** openclaw/clawhub (React + Convex + Vite + Vercel)

**Depends on:** PI081 (skill resolution config), community adoption, enough skills to warrant a directory.

**Detailed plan:** [TODO — far future]

### moltbook (`meetsoma/moltbook`) — Phase 2
Soma's presence on Moltbook (the social network for AI agents). Engagement tooling, posting, patrolling.

**Reference:** `~/Gravicity/tools/moltbook/` (existing recon, wolf-patrol, nova-engage tooling)

**What it could become:**
- A ritual: `/post-to-moltbook "title" "content"`
- A skill: Moltbook API knowledge + engagement best practices
- An extension: Auto-post session summaries or blog announcements

**Detailed plan:** [TODO — after Moltbook API stabilizes]

---

## Cross-Repo Relationships

```
                    ┌─────────────┐
                    │   .github   │  org profile
                    └─────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                  │
   ┌─────┴─────┐   ┌──────┴──────┐   ┌──────┴──────┐
   │   agent   │   │   website   │   │    cli      │
   │           │   │             │   │             │
   │ extensions│   │ landing     │   │ npx soma    │
   │ skills    │──▶│ blog (S&S)  │   │ wraps pi    │
   │ rituals   │   │ docs        │   │             │
   └───────────┘   └──────┬──────┘   └─────────────┘
         │                 │
         │          ┌──────┴──────┐
         │          │    media    │  brand assets
         │          └─────────────┘
         │
    ┌────┴────┐    ┌─────────────┐
    │   hub   │    │  moltbook   │   phase 2
    └─────────┘    └─────────────┘
```

**agent → website:** The `/publish` ritual creates blog posts that land in the website repo's content collections. Docs in agent are mirrored or linked from website docs pages.

**media → website:** Favicons, OG images, logos consumed at build time.

**cli → agent:** CLI ships with or fetches agent extensions on install.

**agent → hub:** Skills and rituals are listed in hub. Hub provides install commands that copy into `.soma/` paths.

**agent → moltbook:** Moltbook engagement is a ritual or extension that uses the agent's identity and voice.

---

## Open Questions

1. **PI081 — Skill resolution:** How does Soma find skills? Search path config? Priority? Per-project overrides? Needs design doc before hub makes sense.

2. **Ritual format:** Config-based (YAML) or code-based (extension with slash commands)? Or both? Need to prototype one ritual (`/publish`) to find out.

3. **Blog authoring flow:** Does `/publish` push directly to meetsoma/website? Or does it create a PR? What's the review step?

4. **Monorepo vs multi-repo for agent+cli:** Currently separate. Could merge if they always release together. Leaning separate for now.

5. **Hub timing:** When is there enough community content to justify a directory? Start with a simple `skills.json` registry in the agent repo?

6. **Moltbook identity:** Does Soma post as "Soma" on Moltbook? Or do we register a new agent identity? What's the voice?

---

## Priority Order

1. **website** — Astro scaffold, landing page, blog with first post
2. **agent** — Push existing extensions, clean up for public
3. **.github** — Org profile README
4. **cli** — Clean up, push
5. **media** — Push media kit
6. **Ritual prototype** — `/publish` as proof of concept
7. **hub** — After skill resolution (PI081) is designed
8. **moltbook** — After Moltbook API stabilizes

---

*Last updated: 2026-03-08*
