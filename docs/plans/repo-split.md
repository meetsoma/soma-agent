---
type: plan
status: active
created: 2026-03-10
updated: 2026-03-10
tags: [git, repos, public, private, architecture]
priority: high
---

# Repo Split: agent (private) → soma (public)

> meetsoma/agent is our dev workspace. meetsoma/soma is the open source product.
> They're not a fork relationship — they're kitchen vs restaurant.

## The Two Repos

### meetsoma/agent (PRIVATE) — "The Kitchen"

Our working directory. Contains everything including sensitive stuff.

**What stays here (never public):**
- `.soma/` — our brain (plans, secrets, registry, scripts, protocols-ref, STATE.md)
- `.soma/secrets/` — GitHub App credentials, PEM files
- `.soma/plans/` — architecture plans, core extraction audit, strategy docs
- `.soma/scripts/` — internal tooling (gh-app-token.sh, etc.)
- `docs/website-plan.md` — internal planning docs
- `docs/ecosystem-plan.md` — internal planning docs
- Dev branches, experiments, WIP code
- Anything with hardcoded paths, internal references

**Also stays here:**
- The `extensions/` source code (we develop here, publish to soma)
- Internal docs that reference our infrastructure
- STATE.md (internal architecture truth — different from the public one)

### meetsoma/soma (PUBLIC) — "The Restaurant"

The clean, documented, installable open source product.

**What goes here:**
```
soma/
├── LICENSE                      ← MIT
├── README.md                    ← polished, install instructions, badges
├── CONTRIBUTING.md              ← how to contribute
├── CHANGELOG.md                 ← release notes
├── package.json                 ← npm package definition
│
├── core/                        ← the protocol implementations
│   ├── discovery.ts
│   ├── identity.ts
│   ├── memory.ts
│   ├── preload.ts
│   ├── flush.ts
│   ├── settings.ts
│   └── hierarchy.ts
│
├── extensions/                  ← the three Soma extensions
│   ├── soma-boot.ts
│   ├── soma-header.ts
│   └── soma-statusline.ts
│
├── templates/                   ← soma init templates
│   └── init/
│       ├── identity.md
│       ├── STATE.md
│       ├── settings.json
│       └── .gitignore
│
├── scripts/                     ← user-facing scripts
│   ├── soma-init.sh
│   └── soma-skill.sh
│
├── skills/                      ← bundled skills (starter pack)
│   └── find-skills/
│       └── SKILL.md
│
├── rituals/                     ← bundled rituals
│   └── publish/
│       └── SKILL.md
│
├── schemas/                     ← JSON schemas
│   ├── settings-v1.json
│   └── skill-index-v1.json
│
└── docs/                        ← public documentation
    ├── getting-started.md
    ├── how-it-works.md
    ├── memory-layout.md
    ├── extending.md
    └── protocols.md             ← links to curtismercier/protocols
```

**What does NOT go in the public repo:**
- `.soma/` directory (that's user-generated, private)
- Any secrets, PEM files, credentials
- Internal planning docs
- Website source (that's meetsoma/website)
- Hardcoded paths or references to ~/Gravicity

## The Publish Flow

```
meetsoma/agent (private, dev branch)
    │
    │ develop, test, iterate
    │
    ▼
meetsoma/agent (private, main branch)
    │
    │ when ready to release:
    │ run publish script
    │
    ▼
meetsoma/soma (public, main branch)
    │
    │ tagged release (v0.1.0)
    │
    ▼
npm publish @gravicity/soma
```

### The Publish Script

A script that copies release-ready files from agent to soma:

```bash
#!/usr/bin/env bash
# publish-to-soma.sh — sync release-ready code from agent → soma

AGENT_DIR="$HOME/Gravicity/products/soma"
SOMA_DIR="$HOME/Gravicity/products/soma-public"  # or wherever soma repo lives

# Core code
rsync -av --delete "$AGENT_DIR/extensions/" "$SOMA_DIR/extensions/"
# rsync -av --delete "$AGENT_DIR/core/" "$SOMA_DIR/core/"  # when core/ exists

# Templates
rsync -av --delete "$AGENT_DIR/.soma/templates/" "$SOMA_DIR/templates/"

# Scripts (only user-facing ones)
cp "$AGENT_DIR/.soma/scripts/soma-init.sh" "$SOMA_DIR/scripts/"
cp "$AGENT_DIR/.soma/scripts/soma-skill.sh" "$SOMA_DIR/scripts/"

# Rituals
rsync -av --delete "$AGENT_DIR/.soma/rituals/" "$SOMA_DIR/rituals/"

# Docs (only public ones)
for doc in getting-started.md how-it-works.md memory-layout.md extending.md; do
  cp "$AGENT_DIR/docs/$doc" "$SOMA_DIR/docs/" 2>/dev/null
done

# Root files
cp "$AGENT_DIR/LICENSE" "$SOMA_DIR/"
cp "$AGENT_DIR/CONTRIBUTING.md" "$SOMA_DIR/"

# DON'T copy: .soma/, secrets, plans, internal docs, website
```

This is manual for now. Eventually could be a GitHub Action that triggers when agent/main is tagged.

## Relationship Diagram

```
curtismercier/protocols          ← specs (CC BY 4.0)
    │
    │ "implements"
    │
meetsoma/agent (PRIVATE)         ← development (our workspace)
    │
    │ "publishes to"
    │
meetsoma/soma (PUBLIC)           ← product (MIT, what users install)
    │
    │ "deployed as"
    │
meetsoma/website (PUBLIC)        ← marketing site
meetsoma/cli (PUBLIC)            ← npx soma wrapper
meetsoma/media (PUBLIC)          ← brand assets
```

## Migration Steps

1. Create `meetsoma/soma` repo (public, empty)
2. Clone locally to `~/Gravicity/products/soma-public/`
3. Set up initial structure (from the tree above)
4. Copy current extensions + templates + scripts + docs
5. Write a clean public README (not the agent repo one)
6. Add protocol attribution in README and core file headers
7. First commit + push
8. Tag v0.1.0-alpha
9. Update meetsoma org profile to point to soma (not agent)
10. Update website links

## Naming

| Current | New | Notes |
|---------|-----|-------|
| `meetsoma/agent` | `meetsoma/agent` (stays) | Private dev workspace |
| (doesn't exist) | `meetsoma/soma` (create) | Public product repo |
| `meetsoma/cli` | `meetsoma/cli` (stays) | Wraps soma, public |

The npm package will be `@gravicity/soma` (scope already claimed).

## When to Do This

After Phase 1 of core extraction (refactor into core/ modules). No point publishing a messy codebase. The public repo should launch with the clean architecture.

Sequence:
1. ✅ Protocol specs published (curtismercier/protocols)
2. ✅ Branching strategy set up (dev/main on agent and website)
3. 🔲 Phase 1: Core extraction refactor (in agent/dev)
4. 🔲 Create meetsoma/soma, initial publish
5. 🔲 Tag v0.1.0-alpha
6. 🔲 npm publish @gravicity/soma
