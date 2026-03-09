---
type: plan
status: draft
created: 2026-03-10
updated: 2026-03-09
tags: [templates, sharing, community, agent-identity, ecosystem]
related: [plugin-architecture, protocol-architecture, light-core-architecture]
---

# Agent Templates — Shareable Soma Configurations

> A template is a preconfigured `.soma/` bundle — identity, protocols, skills, settings — that anyone can clone and customize. Start with a personality, not a blank slate.

## The Idea

Right now `soma init` creates a bare scaffold. Empty protocols dir, empty skills, generic identity. You start from zero every time.

Templates are opinionated starting points. Someone configures a great agent setup — curated protocols, installed skills, tuned settings, a voice — and exports it as a template. Others install it and get a running agent in seconds.

This is the most shareable thing in Soma. Skills are individual. Protocols are individual. A template is the **whole personality** — the combination of everything that makes an agent useful for a specific domain.

---

## What a Template Contains

```
templates/devops/
├── template.json             ← manifest (name, description, author, version)
├── identity.md               ← who this agent is
├── settings.json             ← preconfigured settings (protocol thresholds, etc.)
├── protocols/                ← curated protocol set
│   ├── ci-cd-standard.md
│   ├── deployment-checklist.md
│   └── incident-response.md
├── skills/                   ← pre-installed skills (or references to install)
│   └── .install-list.json    ← skills to fetch from registry on init
└── README.md                 ← what this template is, how to customize it
```

### template.json

```json
{
  "name": "devops",
  "display_name": "DevOps Agent",
  "description": "Deployment protocols, CI/CD skills, infra rituals. Pre-heated for shipping code to production.",
  "version": "1.0.0",
  "author": "Curtis Mercier",
  "license": "MIT",
  "icon": "🛠️",
  "tags": ["devops", "deployment", "ci-cd", "infrastructure"],
  "protocols": ["ci-cd-standard", "deployment-checklist", "incident-response"],
  "skills": ["docker-compose", "github-actions", "terraform-basics"],
  "heat_presets": {
    "ci-cd-standard": 8,
    "deployment-checklist": 6,
    "incident-response": 3
  }
}
```

`heat_presets` — templates can pre-heat protocols. A DevOps template ships with CI/CD already hot. The user doesn't have to earn it through usage — the template author did that work.

---

## Commands

```bash
# Init from template (instead of bare scaffold)
soma init --template devops

# What happens:
# 1. Fetch template from registry (GitHub)
# 2. Create .soma/ (or configured root)
# 3. Copy identity.md, settings.json, protocols/
# 4. Install skills from .install-list.json
# 5. Set heat presets in .protocol-state.json
# 6. Done — agent is ready with a personality

# List available templates
soma template list

# Browse with descriptions
soma template list --verbose

# Export your current setup as a template
soma template export my-agent
# → Creates templates/my-agent/ with your current config
# → Strips memory/, preloads, session data (personal)
# → Keeps identity, settings, protocols, skill list

# Publish to community
soma template publish my-agent
# → Pushes to meetsoma/templates registry (via PR)
```

### `soma template export` — What Gets Included vs Excluded

| Included | Excluded |
|----------|----------|
| `identity.md` | `memory/` (session data, muscles) |
| `settings.json` | `preload-next.md` (session state) |
| `protocols/*.md` | `.protocol-state.json` (personal heat) |
| Skill install list | Actual skill files (fetched on init) |
| `STATE.md` (if generic) | Secrets, `.env`, credentials |

The template is the **structure and personality**, not the accumulated experience. That's earned per-user.

**But** — heat presets let template authors say "these protocols should start hot." So you get the author's opinion on what matters, without their actual usage data.

---

## Template Registry

Same pattern as skills and protocols — extend `plugin-index.json`:

```json
{
  "name": "devops",
  "type": "template",
  "display_name": "DevOps Agent",
  "description": "Deployment protocols, CI/CD skills, infra rituals.",
  "version": "1.0.0",
  "author": "Curtis Mercier",
  "icon": "🛠️",
  "tags": ["devops", "deployment", "ci-cd"],
  "path": "templates/devops/",
  "repository": "meetsoma/templates"
}
```

Templates could live in:
- **`meetsoma/templates`** — dedicated repo (cleanest)
- **`meetsoma/agent`** in a `templates/` dir (simpler, fewer repos)

Leaning toward **dedicated repo** since templates are community-contributed. Keeps agent repo focused on core.

---

## Template Hierarchy

Templates can extend other templates:

```json
{
  "name": "fullstack-devops",
  "extends": "devops",
  "description": "DevOps + frontend skills + API protocols",
  "additional_protocols": ["api-naming", "component-standards"],
  "additional_skills": ["react-patterns", "nextjs-deploy"]
}
```

`extends` means: start with the parent template, then layer on additions. Like class inheritance but for agent personalities.

v1: no inheritance. Just flat templates. v2: `extends` for composition.

---

## Example Templates

| Template | Icon | Description | Protocols | Skills |
|----------|------|-------------|-----------|--------|
| **devops** | 🛠️ | Ship code to production | ci-cd, deployment-checklist, incident-response | docker, github-actions, terraform |
| **writer** | ✍️ | Content creation + publishing | seo-standard, tone-of-voice, publish-workflow | blog-writing, social-media, markdown |
| **architect** | 📐 | System design + documentation | frontmatter-standard, adr-format, code-review | diagramming, api-design, documentation |
| **solo-dev** | 🧑‍💻 | Full-stack solo developer | git-branching, test-first, ship-daily | full-stack, debugging, deployment |
| **team-lead** | 👥 | Coordinate team + review code | code-review, standup-format, sprint-planning | pr-review, meeting-notes, roadmap |
| **researcher** | 🔬 | Deep dives + note-taking | citation-format, source-tracking, literature-review | arxiv-search, note-synthesis |

### The Meta-Template: "Soma's Daddy"

Curtis's personal setup — extracted and sanitized — could be the ultimate template:

```bash
soma init --template somas-daddy
```

This would be the reference implementation. Every protocol, every pattern, the full behavior cascade. The template that built the templates. Private for now (it's literally `curtismercier/somas-daddy`), but it shows the ceiling of what a template can be.

---

## Enterprise Templates

Enterprise tier gets:
- **Private template registry** — company-internal templates, not public
- **Template enforcement** — "all projects in this org must use the `acme-standard` template"
- **Template versioning** — lock projects to a template version, upgrade path
- **Template diff** — "your project has drifted from the template" reports
- **Heat inheritance from template** — template author's heat presets flow to all users

Free tier: community templates, manual init.
Enterprise: organizational templates, enforcement, drift detection.

---

## Implementation Priority

| # | What | Effort | Notes |
|---|------|--------|-------|
| 1 | Template directory convention + `template.json` schema | Tiny | Just define the format |
| 2 | `soma init --template` (fetch + scaffold) | Medium | Core feature |
| 3 | 2-3 example templates | Small | devops, writer, architect |
| 4 | `soma template export` | Medium | Strip personal data, package config |
| 5 | `soma template list` | Small | Read registry |
| 6 | Website /templates page | Medium | Browse + install instructions |
| 7 | `meetsoma/templates` repo | Small | Community contributions |
| 8 | Template inheritance (`extends`) | Medium | v2 |
| 9 | Enterprise: private registries + enforcement | Large | Enterprise tier |

## Evolution Note: Dev .soma/ vs Product .soma/ (2026-03-07)

The `.soma/` at `products/soma/agent/.soma/` is **our developer workspace** — not what ships. It contains:
- Our internal protocols (git-identity, frontmatter-standard — specific to how we build Soma)
- Our muscles (github-app-auth, svg-logo-design — specific to our workflows)
- Our scripts (soma-scan, soma-search, soma-tldr — developer tooling)
- Our STATE.md (architecture truth about Soma's internals)

None of this goes into the product. `core/init.ts` scaffolds a clean `.soma/` with empty dirs and templates. Templates are how users get pre-configured setups — and our scripts like `soma-search.sh` and `soma-tldr.sh` could eventually ship as optional skills or as part of a "developer" template.

**The `somas-daddy` template** (documented above) is the bridge — it's Curtis's personal setup extracted and sanitized. It's the most opinionated template possible: every protocol we've built, every pattern we use. Private, but shows the ceiling.

**Baby somas from clones** — when a user installs a template, they're getting a "baby" pre-configured with someone else's choices. The baby then evolves through use: heat adjusts, muscles grow, identity sharpens. Two agents initialized from the same template will diverge as they work in different contexts. That's the design — templates are starting points, not constraints.

## Open Questions

1. **Should templates include actual skill files or just references?** References (`.install-list.json`) are lighter and always pull latest. But require network. Ship core skills inline, reference optional ones?
2. **Template updates** — if a template updates, how do existing projects know? `soma template check` that diffs against the latest version? Enterprise feature.
3. **Template + agnostic root** — templates should work regardless of root dir name. Template contains relative paths only.
4. **Template marketplace?** Website page with ratings, downloads, featured templates. That's marketing infrastructure — later.
