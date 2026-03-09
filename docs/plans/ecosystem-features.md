---
type: plan
status: active
created: 2026-03-09
updated: 2026-03-09
tags: [ecosystem, api, analytics, community, search, hub]
---

# Ecosystem Features — Roadmap

> Features that make Soma a platform, not just a tool.

## 1. Smart API Search

**What:** REST endpoint that somas can query to find protocols, muscles, skills.
**Why:** When a soma encounters something it doesn't know, it should be able to search the community registry.
**Where:** `api.soma.gravicity.ai` or `soma.gravicity.ai/api/`

```
GET /api/search?q=git+identity&type=protocol
→ [{ name, description, author, heat-default, downloads }]

GET /api/search?q=deployment&type=muscle
→ [{ name, topic, digest, author, installs }]
```

**Design questions:**
- Static JSON index (rebuilt on push) vs dynamic API (Vercel serverless)?
- Start with static — rebuild index when registry repo updates
- Soma CLI calls this: `soma search git-identity` or auto-search on unknown protocol reference

## 2. Analytics

**What:** Track page views, doc reads, install counts, search queries.
**Where:** Already have `@vercel/analytics` in package.json.

**Tiers:**
- Website analytics (Vercel Analytics) — already wired, just needs activation
- npm download stats — public via npm API
- API search analytics — log queries, popular searches → inform what to build
- Opt-in agent telemetry (future, needs careful privacy design)

**Quick win:** Enable Vercel Analytics in layout, add npm download badge to README.

## 3. Community Hub

**What:** Browse, share, install extensions/protocols/muscles with auth.
**Why:** The protocol/muscle system is only useful at scale if people can share.

### Architecture

```
soma.gravicity.ai/hub/          ← browse & search (Astro pages)
soma.gravicity.ai/hub/publish   ← submit (auth required)
api.soma.gravicity.ai/registry  ← JSON API for CLI

Auth: GitHub OAuth (simplest — everyone has GitHub)
Trust tiers:
  - unverified: community submissions, shown with warning
  - verified: reviewed by maintainers, green badge
  - official: meetsoma org, gold badge
```

### Registry Structure

```json
{
  "protocols": [
    {
      "name": "git-identity",
      "version": "1.0.0",
      "author": "curtismercier",
      "description": "Correct git attribution per repo context",
      "applies-to": ["git"],
      "heat-default": "warm",
      "source": "github:curtismercier/protocols/git-identity",
      "trust": "official",
      "installs": 342
    }
  ],
  "muscles": [...],
  "extensions": [...],
  "skills": [...]
}
```

### Install Flow

```bash
soma install protocol git-identity
# → fetches from registry API
# → validates trust tier
# → writes to .soma/protocols/git-identity.md
# → updates .protocol-state.json with heat-default
```

## 4. MDX Converter Pipeline

**What:** `sync-docs.sh` already converts agent docs → website content collection.
**Next steps:**
- Add MDX support for interactive components (code tabs, callouts)
- Custom remark plugin to convert our frontmatter format
- Auto-run on pre-build or as GitHub Action
- Handle cross-references (doc links → website routes)

## 5. Doc Search (Client-Side)

**What:** Pagefind or Fuse.js for instant search across docs.
**Why:** Users need to find things fast. The sidebar helps but search is faster.
**Implementation:** Pagefind (static search index, built at build time, zero runtime cost).

```bash
pnpm add pagefind  # runs post-build, generates search index
```

## Execution Order

| Phase | What | Effort |
|-------|------|--------|
| **Now** | ✅ Docs site with sidebar (done) | — |
| **Next** | Vercel Analytics activation + Pagefind search | 1 hour |
| **Soon** | Static registry JSON + `soma search` CLI | 1 day |
| **Later** | GitHub OAuth + community hub | 1 week |
| **Future** | Dynamic API, telemetry, trust system | ongoing |

---

*This plan covers the transition from "tool" to "platform." Each phase is independently shippable.*
