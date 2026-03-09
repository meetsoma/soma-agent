# Website Plan — meetsoma/website

> soma.gravicity.ai — Landing page, blog (Souls & Symlinks), docs, and ecosystem showcase.
> Reference: openclaw.ai (Astro, Vercel, same structural pattern)

## Framework

**Astro 5** — static output, deployed to Vercel.

Why Astro:
- Markdown-native blog via content collections (no CMS needed)
- Static by default — fast, cheap, zero server
- OpenClaw proves the pattern works at scale
- Light deps — no React runtime unless we need islands later
- RSS, sitemap, OG images all built-in or trivial

## Reference Site Analysis

OpenClaw.ai (`_reference-site/`) gives us a clean template:

| Section | OpenClaw has | Soma equivalent |
|---------|-------------|-----------------|
| Hero | Lobster icon + tagline + description | σῶμα logotype + tagline + description |
| Latest post banner | Blog post link card | Same |
| Testimonials carousel | Twitter quotes, dual-row scroll | Skip for now (no testimonials yet) |
| Quick Start | Multi-mode install block (one-liner/npm/hackable/macOS) | Simpler: `npm i -g @gravicity.ai/soma` + `soma` |
| Features grid | 6 feature cards with icons | Adapt for Soma's features (memory, identity, extensions, skills, rituals) |
| Integrations pills | 15+ service icons | Skip or adapt (Soma integrates with pi, not chat apps) |
| Press section | MacStories, StarryHope | Skip for now |
| CTA grid | Discord, Docs, GitHub, ClawhHub | GitHub, Docs, Blog, maybe Discord later |
| Newsletter | Buttondown embed | Optional — could use Buttondown or skip |
| Sponsors | Logo grid | Skip for now |
| Blog | Content collection, post cards, [slug] pages | Same — Souls & Symlinks content |
| Showcase | Community projects | Skip for now |
| Shoutouts | Extended testimonials | Skip for now |
| Integrations page | Full integration list with icons | Skip or reimagine as "ecosystem" page |
| Trust/Threat model | Security docs | Skip for now |
| RSS | Built-in | Yes |
| Theme toggle | Light/dark with localStorage | Yes — Gravicity dark as default |

## Site Map

### Phase 1 (launch)

```
/                    Landing page
/blog                Blog index (Souls & Symlinks)
/blog/[slug]         Individual posts
/docs                Docs index → links to getting-started, how-it-works, etc.
/rss.xml             RSS feed
```

### Phase 2 (grow)

```
/extensions          Extension showcase / directory
/rituals             Ritual catalog
/ecosystem           How agent + cli + skills + extensions fit together
/about               About Soma, Gravicity, the philosophy
```

## Design Direction

### Theme: Gravicity Dark

Adapt OpenClaw's deep-space palette to Gravicity's identity:

| OpenClaw | Soma |
|----------|------|
| Coral red `#ff4d4d` | Gravicity violet/indigo (TBD — pull from existing brand) |
| Cyan `#00e5cc` | Keep or shift to a warm gold accent |
| Deep space `#050810` | Same or similar dark base |
| Lobster icon | σῶμα logotype (animated SVG from media kit) |
| "The AI that actually does things" | Soma's tagline (TBD — "An AI agent that remembers"?) |
| Clash Display + Satoshi fonts | Keep or swap — these are good fonts |

### Hero

```
[σῶμα animated logo]

  Soma

  An AI agent that grows with you.

  Memory that persists. Identity that evolves.
  Built on pi. Yours to shape.

  [npm i -g @gravicity.ai/soma]    [View on GitHub →]
```

### Key visual elements to keep from OpenClaw
- Starfield background (`.stars` + `.nebula`) — fits the Gravicity aesthetic
- Card hover effects with glow
- Theme toggle (light/dark)
- Code block with copy buttons
- Blog post cards with author, date, read time, tags

### Key things to change
- Remove lobster branding entirely
- Replace coral palette with Soma's colors
- Simplify quick-start (no Windows/macOS/one-liner modes — just npm)
- Remove integrations, testimonials, press, sponsors, showcase, shoutouts
- Add docs section
- Blog becomes Souls & Symlinks — agent-authored content

## Directory Structure

```
website/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── vercel.json
├── public/
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── favicon-32.png
│   ├── apple-touch-icon.png
│   ├── og-image.png              ← from media kit (social/og-dark.png)
│   ├── site.webmanifest
│   └── media/                    ← logo SVGs, PNGs from media repo
├── src/
│   ├── content/
│   │   ├── config.ts             ← blog collection schema
│   │   └── blog/
│   │       ├── welcome-to-soma.md         ← first post
│   │       └── ...future posts
│   ├── data/
│   │   └── features.json         ← feature card data (optional)
│   ├── layouts/
│   │   └── Layout.astro          ← base layout (head, theme toggle, fonts)
│   ├── components/
│   │   ├── Icon.astro            ← lucide/simple-icons helper
│   │   ├── SectionHeader.astro   ← reusable section title
│   │   ├── CodeBlock.astro       ← install command with copy
│   │   └── BlogCard.astro        ← post preview card
│   ├── lib/
│   │   └── blog.ts               ← getPublishedBlogPosts helper
│   ├── pages/
│   │   ├── index.astro           ← landing
│   │   ├── blog/
│   │   │   ├── index.astro       ← blog listing
│   │   │   └── [...slug].astro   ← post pages
│   │   ├── docs/
│   │   │   └── index.astro       ← docs hub (links to agent repo docs)
│   │   └── rss.xml.js            ← RSS feed
│   └── styles/                   ← optional global CSS if extracted from Layout
└── .gitignore
```

## Blog Content Schema

Adapted from OpenClaw's, extended for Souls & Symlinks:

```typescript
const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    // Who wrote it — agent, human, or co-authored
    author: z.string(),                          // "Soma", "Curtis", "Soma & Curtis"
    authorRole: z.enum(['agent', 'human', 'co-authored']).default('agent'),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    // Souls & Symlinks specific
    series: z.string().optional(),               // "souls-and-symlinks", future series
    sessionRef: z.string().optional(),           // PI session that inspired this post
  }),
});
```

## Build & Deploy

- **Package manager:** pnpm (Gravicity standard)
- **Build:** `pnpm build` → static output in `dist/`
- **Dev:** `pnpm dev` → localhost:4321
- **Deploy:** Vercel (auto-deploy on push to main)
- **Domain:** soma.gravicity.ai (CNAME to Vercel)

## Migration Plan

### From `products/souls-and-symlinks/`
- Posts from `posts/` → `src/content/blog/` (add frontmatter)
- Voice guide from `CLAUDE.md` → internal reference (not published)
- Preview tooling → replaced by Astro dev server

### From `products/soma/docs/`
- `getting-started.md`, `how-it-works.md`, `memory-layout.md`, `extending.md`
- Either rendered as Astro pages or linked to GitHub repo

### From media kit
- Favicons → `public/`
- OG images → `public/`
- Logo SVGs → `public/media/`
- Animated logo → hero component

## Scaffold Steps

1. Init Astro project in `products/soma/website/` (or separate dir for the repo)
2. Copy Layout.astro from reference, rebrand colors + fonts + meta
3. Build landing page (hero, quick-start, features, CTA grid, footer)
4. Set up blog content collection + schema
5. Build blog index + [slug] pages
6. Copy favicons + OG images from media kit
7. Write first blog post (or migrate from souls-and-symlinks)
8. Add RSS feed
9. Test locally with `pnpm dev`
10. Push to meetsoma/website
11. Connect Vercel + domain

## Open Questions

1. **Color palette:** Keep OpenClaw's coral/cyan or shift to new Soma colors? Need to check existing Gravicity brand colors.
2. **Fonts:** Clash Display + Satoshi are excellent. Keep or swap?
3. **First blog post:** Write new "Introducing Soma" or migrate something from Soul Space?
4. **Docs approach:** Render docs in the site (Astro pages) or just link to GitHub? Astro pages are nicer but means maintaining docs in two places.
5. **Newsletter:** Set up Buttondown? Or skip for launch?
6. **Domain:** Is `soma.gravicity.ai` already configured? Need DNS CNAME.

---

*Last updated: 2026-03-08*
