---
type: plan
status: active
created: 2026-03-09
updated: 2026-03-09
tags: [website, ux, design, pages, seo, community]
related: [ecosystem-features, docs-audit]
---

# Website Pages Vision — Next-Gen UX

> Every page should feel like an organism, not a document. Soma isn't a tool — it's a body. The website should feel like looking at one from the inside.

## Design Principle

The starfield background is the universe. The planet logo breathes. The docs have a heartbeat (sidebar active states pulse gently). The blog posts have a voice. The ecosystem diagram has blood flow. The hub has growth rings.

---

## Page Map

### 1. `/` — Front Page (shipped, minor updates done)

Current state is solid. Missing: a **live heartbeat** — real-time signal that Soma is alive.
- Tiny pulse indicator in hero: latest community activity, npm installs, version
- Not fake metrics — real signals from npm API
- `meetsoma` install as primary, `@gravicity.ai/soma` as enterprise note

### 2. `/docs/*` — Documentation (shipped)

Sidebar nav, content collection from agent docs, prev/next pager. 5 pages live.
- **Next:** Pagefind search, breadcrumbs, "edit on GitHub" links
- **SEO:** Each doc page gets unique meta description, canonical URLs, structured data

### 3. `/ecosystem` — Interactive Organism (needs rethink)

Currently static diagram + four layer descriptions. Should be:

- **The Organism Diagram** — animated SVG showing data flowing through Soma. Hover "protocols" → heat system pulses. Hover "memory" → breath cycle animates. Each node links to its doc page.
- **Live Registry Preview** — show real protocols/skills from registry. Cards with name, heat-default, applies-to tags. Clicking opens doc or GitHub source.
- **"What's Growing"** — timeline of recent additions. Protocol added. Muscle formed. Extension shipped. Makes ecosystem feel alive.

### 4. `/blog` — Souls & Symlinks (exists, needs depth)

Agent-authored + human-authored + co-authored. Brilliant concept. Needs:

- **Voice indicators** — typography shifts subtly per author. Agent posts: slightly different weight, `σ` watermark in margin. Human posts: warmer tones. Co-authored: interleave both.
- **Session context** — "written during session #47, 82% context" — agent's state when it wrote.
- **Conversation threads** — posts respond to each other. Living dialogue between agent and human.

### 5. `/blog/introducing-soma` — The Origin Story (needs rewrite)

Current post has stale links (`nicepkg/pi`), says "three layers" (now four), missing heat/applies-to/npm.

**Showpiece ideas:**
- **Scroll-driven narrative** — as you scroll, `.soma/` directory builds itself in a sticky sidebar. Empty → identity → protocols → muscles → full memory system.
- **The breath animation** — literal inhale/exhale as you read. Inhale at top (loading context), content IS the session, exhale at bottom (what was learned).
- **Split voice** — Curtis's words on left, Soma's on right, converging into co-authored center sections. Layout IS the collaboration.

### 6. `/hub` — Community Hub (new, future)

The platform play:
- **Browse** — grid of protocols, muscles, skills, extensions. Filter by signal (git, typescript, python). Sort by installs, heat, recency.
- **Protocol cards** — breadcrumb, heat-default, applies-to tags, author avatar, install count. One-click: `soma install protocol git-identity`.
- **Trust badges** — 🟡 community · 🟢 verified · 🥇 official.
- **"My Soma"** — GitHub OAuth login. Installed protocols, published content, heat history. Dashboard for your agent's growth.

### 7. `/playground` — Try Soma (ambitious, future)

Sandboxed in-browser Soma session. WebContainer or similar. Type, Soma responds, memory forms in real-time. No install needed. The conversion funnel endpoint.

---

## SEO Strategy

### Technical Foundation
- Canonical URLs on every page (`soma.gravicity.ai/docs/protocols` not `/docs/protocols/index.html`)
- Structured data (JSON-LD): SoftwareApplication for main, TechArticle for docs, BlogPosting for blog
- Open Graph images per page (not just global og-image)
- Sitemap.xml auto-generated from Astro
- `robots.txt` allowing all crawlers
- Meta descriptions: unique per page, keyword-rich but natural
- Internal linking: every doc references related docs, every blog post links to relevant docs

### Keyword Targets
- "AI coding agent with memory" — home page
- "AI agent protocols" — protocols doc + ecosystem
- "persistent AI agent" — how-it-works
- "AI coding assistant that remembers" — introducing soma
- "soma AI agent" — brand term, all pages
- "meetsoma npm" — getting started

### Internal Routing & Breadcrumbs
- Breadcrumb schema on all pages: Home > Docs > Protocols
- Cross-links in docs: protocols.md links to how-it-works.md#heat-system
- Blog posts link to relevant docs ("learn more about protocols →")
- Ecosystem page links to every doc section
- Footer on every page: consistent nav (Home · Docs · Blog · Ecosystem · GitHub)
- "Related docs" section at bottom of each doc page

### Page-Level SEO
| Page | Title Pattern | Focus Keyword |
|------|--------------|---------------|
| `/` | Soma — AI Agent That Grows With You | AI coding agent memory |
| `/docs` | Getting Started — Soma Docs | install soma AI agent |
| `/docs/protocols` | Protocols & Heat — Soma Docs | AI agent protocols behavioral rules |
| `/docs/how-it-works` | How Soma Works — Breath Cycle & Memory | AI agent session continuity |
| `/blog` | Souls & Symlinks — Soma Blog | AI agent identity blog |
| `/blog/introducing-soma` | Introducing Soma — An Agent That Remembers | AI coding agent persistent memory |
| `/ecosystem` | The Soma Ecosystem — Extensions, Skills, Protocols | AI agent plugin ecosystem |
| `/hub` | Soma Hub — Community Protocols & Skills | AI agent community marketplace |

### Learnings from Arzadon SEO Work
- Local/niche authority beats broad competition — own "AI agent memory" before going wider
- Schema markup drives rich snippets — SoftwareApplication schema for npm package
- Internal link density matters — every page should link to 3+ other pages
- Blog cadence signals freshness — regular posts boost domain authority
- Image alt text + OG images per page — visual search and social sharing
- Page speed is ranking factor — static Astro output is already optimal

---

## Execution Order

| Phase | Pages | Effort |
|-------|-------|--------|
| **Done** | `/`, `/docs/*`, `/blog` | — |
| **Next** | Introducing Soma rewrite, ecosystem rethink, SEO foundation | 1-2 sessions |
| **Soon** | Hub scaffold, breadcrumbs, structured data, sitemap | 1 session |
| **Later** | Interactive ecosystem diagram, voice indicators, playground | multi-session |

---

*This is the creative brief. Implementation follows the organism principle: each page breathes.*
