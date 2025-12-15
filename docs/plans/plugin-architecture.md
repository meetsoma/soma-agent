---
type: plan
status: draft
updated: 2026-03-09
created: 2026-03-10
tags: [architecture, plugins, skills, extensions, rituals, protocols, soma-init, slash-commands]
---

# Soma Plugin Architecture — Design Document

> This is the design thinking for how Soma's four layers (extensions, skills, rituals, protocols) actually work as a unified plugin system. Covers discovery, installation, resolution, `soma init`, `/` commands, the website skills page, and the relationship with Pi's SDK.
>
> **See also:** `protocol-architecture.md` for the full protocol + heat tracking design.

## What We Have Today

Let's be honest about the current state:

**Extensions:** Three TypeScript files (`soma-boot.ts`, `soma-header.ts`, `soma-statusline.ts`) that hook into Pi's lifecycle. They work. They're manually installed to `~/.soma/extensions/`. There's no install command, no versioning, no update mechanism.

**Skills:** Markdown files copied to `~/.soma/skills/`. Pi's skill resolver finds them by matching task descriptions to skill descriptions. Works, but discovery is manual — you have to know skills exist to install them.

**Rituals:** A concept in a doc. Nothing implemented. We said `/publish` would be the first one. It doesn't exist yet.

**`soma init`:** Doesn't exist. To use Soma in a project, you manually create `.soma/` and its contents.

**Website:** soma.gravicity.ai has an ecosystem page that *describes* the three layers. It doesn't have a skills directory, install instructions, or anything actionable.

So: the architecture is *designed* but the infrastructure isn't built. This doc is about building it.

---

## The Big Design Questions

### 1. How do skills get discovered?

Right now: you don't discover skills unless someone tells you about them.

**Options:**

**A) GitHub-based registry (simplest)**
A repo (`meetsoma/skills` or just a directory in `meetsoma/agent`) with an `index.json`:
```json
{
  "skills": [
    {
      "name": "favicon-gen",
      "description": "Generate favicons from logos, text, or brand colors",
      "version": "1.0.0",
      "path": "skills/favicon-gen/",
      "keywords": ["favicon", "icon", "branding", "web"],
      "author": "Curtis Mercier"
    }
  ]
}
```
CLI fetches the index, user browses, installs by name.

Pros: Simple, version-controlled, community can PR new skills.
Cons: GitHub API rate limits, no search beyond keywords, no metrics.

**B) Website-based directory**
soma.gravicity.ai/skills — a browsable page with cards, search, categories. Backed by the same JSON but rendered as a nice UI.

Pros: Discoverable, visual, marketing surface.
Cons: Need to keep website + registry in sync.

**C) Both (obvious answer)**
The JSON index is canonical (lives in a repo). The website reads it and renders a pretty page. The CLI reads it for `soma skill list --remote`. Same source, two views.

**Going with C.** The question is which repo owns the index.

### 2. How do skills get installed?

**Current:** Copy files manually.

**Target:**
```bash
soma skill install favicon-gen
```

**What happens under the hood:**
1. CLI reads skill index (cached locally, refreshed periodically)
2. Finds `favicon-gen` in the index
3. Fetches the skill files from GitHub (sparse checkout or raw API)
4. Writes to `~/.soma/skills/favicon-gen/`
5. Writes a local manifest (`~/.soma/skills/.installed.json`) for tracking

**Versioning:** Skills have a `version` field. `soma skill update` checks for newer versions. Simple semver comparison, not a full package manager.

**Where do they install?**
```
~/.soma/skills/                 ← user-global skills (most common)
<root>/skills/                  ← project-local skills (override)
```
Project-local skills shadow user-global ones (same name = project wins).

### 3. How do extensions ship?

Extensions are harder than skills because they're code. You can't just copy a Markdown file — TypeScript needs to be compatible with the Pi runtime.

**Current reality:** Soma ships with 3 core extensions. Users don't write their own (yet).

**Future options:**

**A) Extensions are part of Soma's core (not user-installable)**
Keep it simple. Extensions are what Soma ships with. If you want to customize, you fork. Community contributes skills, not extensions.

**B) Extension packages (npm)**
Each extension is an npm package. `soma extension install @gravicity/soma-git-hooks`. Gets messy — dependency management, runtime compatibility, security.

**C) Single-file extensions with a stable API**
Extensions are `.ts` files that conform to a contract. The contract is Pi's extension API. Users drop files into `~/.soma/extensions/`. No package manager needed.

**Leaning toward A for now, C eventually.** Extensions are power-user territory. Don't over-engineer the distribution before there's demand. Skills are the community play.

### 4. What ARE rituals, really?

This is the most important design question and we've been dancing around it.

**Option A: Rituals are just skills with steps**
A ritual is a Markdown file that describes a multi-step procedure. The agent reads it and follows the steps. No special runtime support needed.

```markdown
---
type: ritual
name: publish
trigger: /publish
description: Write, commit, push, and deploy a blog post
---

# /publish Ritual

## Step 1: Draft
Ask the user for a title and topic. Write the post in `src/content/blog/`.

## Step 2: Review  
Show the draft. Ask for approval.

## Step 3: Commit
`git add` the new file. Commit with message "blog: <title>".

## Step 4: Push
`git push origin main`.

## Step 5: Deploy
Run `vercel --prod` or wait for auto-deploy.
```

The agent sees `/publish` in the user's message, loads this skill, follows the steps.

Pros: Dead simple. No new runtime. Works today.
Cons: No state tracking (agent doesn't know which step it's on across sessions). No error handling beyond "the agent figures it out."

**Option B: Rituals are extensions + skills combined**
An extension listens for `/publish` in the user message, sets up state tracking, and loads the corresponding skill. The extension handles the lifecycle, the skill handles the knowledge.

```typescript
// rituals/publish.ts (extension part)
export default {
  name: "publish-ritual",
  on_user_message: async (msg, ctx) => {
    if (msg.startsWith("/publish")) {
      ctx.state.ritual = "publish";
      ctx.state.step = 1;
      ctx.loadSkill("rituals/publish"); // skill part
    }
  }
};
```

Pros: State tracking, error handling, can pause/resume.
Cons: Requires extension code for each ritual. Higher barrier.

**Option C: Rituals are prompt patterns (no infrastructure)**
The agent is just trained (via its identity/skills) to recognize `/` commands as ritual triggers. When it sees `/publish`, it knows what to do because it has the knowledge. No special runtime.

This is basically Option A but without even calling it a "ritual system." It's just... skills that respond to `/` commands.

Pros: Zero infrastructure. Works right now.
Cons: Fragile. Depends on the agent "remembering" the ritual. If the skill isn't loaded, the `/` command does nothing. No discoverability (user doesn't know what `/` commands exist).

**My take:** Start with **Option A** (rituals as stepped skills). Add a simple convention: ritual skills have `trigger: /command` in frontmatter. When the agent sees `/command`, it searches skills for a matching trigger. This works within Pi's existing skill resolution. No extension code needed for basic rituals. Option B is the upgrade path when rituals need state management across sessions.

### 5. How does `soma init` work?

**What it does:** Creates the soma root directory in the current project with the right scaffolding.

```bash
soma init                    # creates .soma/ (default)
soma init --root .claude     # creates .claude/ (for Claude Code users)
soma init --root .cursor     # creates .cursor/ (for Cursor users)
soma init --root custom/     # any path
```

**What gets created:**
```
<root>/                  ← .soma/ by default, configurable
├── identity.md          ← project identity (templated)
├── STATE.md             ← project architecture truth (empty template)
├── settings.json        ← project config (protocol thresholds, etc.)
├── memory/
│   ├── muscles/         ← empty, for learned patterns
│   └── .gitkeep
├── protocols/           ← drop protocol .md files here
│   └── .gitkeep
├── extensions/          ← empty, for project-level extensions
│   └── .gitkeep
└── .gitignore           ← ignores memory/preload-next.md, .protocol-state.json, secrets/
```

**Interactive or opinionated?**
Start opinionated. `soma init` creates the above. No questions. If you want to customize, edit the files after.

Maybe one question: "What's this project called?" to populate identity.md.

**Parent-child:**
For monorepos, a parent `.soma/` can discover child `.soma/` instances:
```
workspace/
├── .soma/                ← parent (knows about children)
│   └── children.json     ← list of child paths
├── app/
│   └── .soma/            ← child (independent memory)
└── api/
    └── .soma/            ← child (independent memory)
```

But this is Phase 2. Don't build it until someone needs it. `soma init` v1 is just the flat scaffold.

### 6. The `/` Command Problem — Pi's Limits

Pi has built-in `/` commands: `/new`, `/model`, `/cost`, etc. These are hardcoded in Pi's source. The extension API doesn't expose command registration.

**So how do we get `/publish`, `/molt`, `/patrol`?**

**Approach A: Prompt pattern matching (no Pi changes)**
The agent recognizes `/publish` as a prompt, not a command. Pi doesn't intercept it — it just passes through as a user message. The agent sees it and acts.

This works if:
- The agent has the ritual skill loaded (or can discover it)
- The agent reliably recognizes the pattern
- The user understands these aren't "real" CLI commands — they're agent directives

**Approach B: Soma CLI wrapper intercepts**
The `soma` CLI (which wraps `pi`) intercepts `/` commands before passing to Pi:
```
user types: /publish "My Post Title"
soma cli: recognizes /publish, injects ritual context, passes to pi
pi agent: receives enriched prompt with ritual instructions
```

This is cleaner because:
- `soma` can list available rituals (`/help` or `/rituals`)
- `soma` can validate arguments before the agent sees them
- `soma` can manage ritual state (current step, progress)

**Approach C: Fork Pi, add command plugin API**
Add a hook to Pi: `registerCommand(name, handler)`. Extensions can register custom `/` commands.

This is the "right" answer long-term but:
- Requires maintaining a Pi fork
- Upstream changes could break it
- It's a lot of work for a feature that Approach B handles

**Recommendation:** Start with **A** (prompt patterns) — it works today with zero infrastructure. Build toward **B** (CLI wrapper) as the Soma CLI matures. Consider **C** only if we need deep Pi integration that the wrapper can't provide.

### 7. The Website Skills Page

soma.gravicity.ai/skills — a page where people can browse available skills.

**Data source:** Same `index.json` that the CLI uses. Build step fetches it and generates static pages.

**Page layout:**
```
/skills
├── Hero: "Extend Soma's Knowledge"
├── Search bar (client-side filter)
├── Category filters: [Development, Design, Infrastructure, Marketing, ...]
├── Skill cards grid:
│   ┌─────────────────────┐
│   │ 🎨 favicon-gen      │
│   │ Generate favicons   │
│   │ from logos or text   │
│   │                     │
│   │ v1.0 · by Curtis    │
│   │ [Install] [View]    │
│   └─────────────────────┘
└── CTA: "Create a skill → Contributing guide"
```

**Install button:** Shows the CLI command to copy:
```bash
soma skill install favicon-gen
```

**View button:** Links to the skill's README on GitHub.

**Build process:**
1. `index.json` lives in `meetsoma/agent` (or `meetsoma/skills`)
2. Website build fetches it (fetch at build time, not runtime)
3. Astro generates `/skills` page from the data
4. Each skill can optionally have a detail page (`/skills/favicon-gen`)

This is a Phase 2 website feature. The current site works without it. But it's important for adoption — people need to see what's possible.

---

## Unified Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Soma CLI                              │
│  soma init · soma skill install · soma protocol install      │
│  /command interception                                       │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                     Pi Runtime                                │
│  Session management · LLM calls · Tool execution             │
└──────┬──────────┬──────────┬──────────┬──────────────────────┘
       │          │          │          │
┌──────▼────┐┌───▼─────┐┌───▼─────┐┌───▼──────────┐
│Extensions ││ Skills   ││ Rituals ││  Protocols   │
│(.ts hooks)││(.md docs)││(.md +   ││(.md rules)   │
│           ││          ││ /trigger││              │
│soma-boot  ││favicon   ││/publish ││breath-cycle  │
│soma-header││logo-gen  ││/molt    ││frontmatter   │
│soma-status││cpanel-dns││/patrol  ││heat-tracking │
└──────┬────┘└───┬──────┘└───┬─────┘└───┬──────────┘
       │         │           │          │
       │   loaded on-demand  │   loaded by temperature
       │         │           │     ┌────┴─────────┐
       │         │           │  COLD│ WARM  │  HOT │
       │         │           │  off │breadcr│ full │
       │         │           │     └────┬─────────┘
┌──────▼─────────▼───────────▼──────────▼──────────────────────┐
│                    .soma/ (Project)                            │
│  identity.md · STATE.md · memory/ · protocols/ · extensions/ │
└──────────────────────────────────────────────────────────────┘
       │
┌──────▼───────────────────────────────────────────────────────┐
│                  ~/.soma/ (User Global)                       │
│  identity.md · skills/ · extensions/ · protocols/ ·           │
│  .protocol-state.json · settings.json                        │
└──────────────────────────────────────────────────────────────┘
```

### Four Layers — Quick Reference

| Layer | What | How Loaded | Sharing |
|-------|------|-----------|---------|
| **Extensions** | Runtime hooks (`.ts`) | Always running | Soma core ships them |
| **Skills** | Task knowledge (`.md`) | On-demand by task match | Community registry |
| **Rituals** | Stepped skills with `/trigger` (`.md`) | On `/command` | Community registry |
| **Protocols** | Behavioral rules (`.md`) | By heat temperature | Community registry |

Skills = "how to do a thing." Protocols = "how to behave." Templates = "all of the above, bundled as a starting personality." See `protocol-architecture.md` for the full heat model, `agent-templates.md` for the template system.

### Templates — The Fifth Artifact (Not a Layer)

Templates aren't a runtime layer — they're a **packaging format**. A template bundles identity + protocols + skills + settings into a shareable starter. `soma init --template devops` gives you a fully configured agent instead of a blank scaffold. See `agent-templates.md` for the full design.

## Plugin Index Schema (v1)

Unified index for skills, rituals, and protocols. Single source of truth — website and CLI both read this.

```json
{
  "$schema": "https://soma.gravicity.ai/schemas/plugin-index-v1.json",
  "version": "1.0.0",
  "updated": "2026-03-10",
  "plugins": [
    {
      "name": "favicon-gen",
      "type": "skill",
      "description": "Generate custom favicons from logos, text, or brand colors",
      "version": "1.0.0",
      "author": "Curtis Mercier",
      "license": "MIT",
      "keywords": ["favicon", "icon", "branding", "web", "design"],
      "category": "design",
      "files": ["SKILL.md", "templates/"],
      "repository": "meetsoma/agent",
      "path": "skills/favicon-gen/"
    },
    {
      "name": "publish",
      "type": "ritual",
      "description": "Write, commit, push, and deploy a blog post",
      "trigger": "/publish",
      "version": "1.0.0",
      "author": "Curtis Mercier",
      "license": "MIT",
      "keywords": ["blog", "publish", "deploy", "git"],
      "category": "workflow",
      "files": ["SKILL.md"],
      "repository": "meetsoma/agent",
      "path": "skills/publish/"
    },
    {
      "name": "frontmatter-standard",
      "type": "protocol",
      "description": "All .md files get YAML frontmatter with type, status, created, updated",
      "breadcrumb": "All .md files get YAML frontmatter: type, status, created, updated. 8 statuses: draft/active/stable/stale/archived/deprecated/blocked/review.",
      "heat_default": "warm",
      "version": "1.0.0",
      "author": "Curtis Mercier",
      "license": "MIT",
      "keywords": ["frontmatter", "documentation", "standards", "yaml"],
      "category": "standards",
      "files": ["PROTOCOL.md"],
      "repository": "meetsoma/agent",
      "path": "protocols/frontmatter-standard/"
    }
  ]
}
```

Note: `type` field distinguishes skills, rituals, and protocols. CLI commands (`soma skill install`, `soma protocol install`) filter by type. Website can show them in separate tabs or a unified view.

---

## Implementation Priority

| # | What | Effort | Depends On | Value |
|---|------|--------|-----------|-------|
| 1 | `soma init` (basic scaffold, now includes `protocols/`) | Small | Nothing | High — first thing users do |
| 2 | Plugin index JSON (skills + rituals + protocols) | Small | Decide which repo hosts it | High — enables everything else |
| 3 | `soma skill install` | Medium | Plugin index | High — removes manual copy |
| 4 | Protocol folder convention + `.md` format | Tiny | Nothing | High — people can start writing them |
| 5 | Boot scan: discover protocols, inject into system prompt | Small | Protocol format | High — makes protocols alive |
| 6 | `/publish` as prompt-pattern ritual | Small | Write the ritual skill | Medium — proves the ritual concept |
| 7 | `soma protocol install` | Small | Plugin index | Medium — community sharing |
| 8 | Heat tracking + `.protocol-state.json` | Medium | Protocol boot scan | High — enterprise differentiator |
| 9 | Website /plugins page (skills + protocols) | Medium | Plugin index | High — discovery + marketing |
| 10 | `soma skill list --remote` / `soma protocol list` | Small | Plugin index | Low — nice to have |
| 11 | Soma CLI wrapper with `/` command interception | Large | CLI architecture decisions | Medium — upgrade path |
| 12 | Parent-child `.soma/` discovery + protocol inheritance | Medium | Design doc for memory architecture | Low — only for monorepos |

## Open Questions

1. **Which repo hosts the plugin index?** `meetsoma/agent` (where skills already live) or a new `meetsoma/plugins` repo (cleaner separation)?
2. **Should rituals be a subdirectory of skills?** They're similar in format (Markdown). Keeping them in `skills/` with a `type: ritual` frontmatter is simpler than a separate system.
3. **Soma CLI identity** — is it a wrapper around `pi` or a standalone binary? Wrapper is simpler but inherits Pi's limitations. Standalone is more work but full control.
4. **Extension distribution** — do we need this at all in v1? Core extensions ship with Soma. Community writes skills.
5. **Offline-first?** Should `soma skill install` work offline if you've previously fetched the index? Probably yes — cache the index locally.
6. **Pi upstream** — should we propose a command registration API to Pi's maintainer? If accepted, Approach C becomes viable without a fork.
7. **Protocol conflicts** — what if two protocols contradict? Need precedence: project > global, higher heat > lower heat, explicit pin > auto.
8. **Agent-proposed protocols** — "I notice you always do X, want me to make a protocol?" That's muscle-to-protocol graduation. Very enterprise.
9. **Unified or separate registries?** One `plugin-index.json` with type field (leaning yes) vs separate `skill-index.json` + `protocol-index.json`.
