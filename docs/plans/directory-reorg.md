---
type: plan
status: complete
created: 2026-03-10
updated: 2026-03-09
tags: [directory, organization, workspace, cleanup]
priority: high
---

# Local Directory Reorganization

> Soma-related files are scattered across 5 locations. Time to clean up.

## Current State (the mess)

```
~/Gravicity/
├── products/soma/              ← meetsoma/agent repo (PRIVATE)
│   ├── .git                       remote: meetsoma/agent
│   ├── .soma/                     our brain (gitignored, huge)
│   ├── extensions/                the 3 runtime extensions
│   ├── docs/                      mix of public + internal docs
│   ├── website/                   meetsoma/website repo (NESTED .git!)
│   │   └── .git                   remote: meetsoma/website
│   └── _reference-site/           openclaw reference (NESTED .git!)
│       └── .git
│
├── Soma/                       ← "personal Soma instance" (??)
│   ├── .soma/                     has its own memory, muscles
│   └── logos/                     logo iterations
│
├── tools/pi/soma/              ← OLD soma source (pre-CLI)
│   ├── src/                       TypeScript extension code
│   └── package.json               "soma-ai" v0.1.0
│
├── tools/pi/soma-cli/          ← the ACTUAL Pi wrapper CLI
│   ├── package.json               "@gravicity.ai/soma" v0.1.0
│   ├── extensions/                built-in extensions copy
│   └── dist/                      compiled output
│
~/.soma/                        ← user-level runtime
├── agent/extensions/              symlinks → products/soma/extensions/
├── agent/skills/                  installed skills
├── agent/settings.json
├── identity.md
└── memory/muscles/
```

Problems:
1. **Nested git repos** — website and _reference-site inside agent repo = git confusion
2. **Scattered Soma code** — extensions in products/soma/, CLI in tools/pi/soma-cli/, old code in tools/pi/soma/
3. **Duplicate/ambiguous** — `Soma/` vs `products/soma/` — which is "Soma"?
4. **~/.soma/ symlinks** point to products/soma/extensions/ — fragile, breaks if we move things

## Proposed Structure

```
~/Gravicity/
├── products/
│   └── soma/                   ← the PRODUCT directory (not a git repo itself)
│       ├── agent/              ← meetsoma/agent (PRIVATE) git repo
│       │   ├── extensions/        source of truth for extensions
│       │   ├── core/              protocol implementations (Phase 1 output)
│       │   ├── docs/              public docs (synced to soma repo)
│       │   └── .soma/            our brain (plans, secrets, scripts, registry)
│       │
│       ├── soma/               ← meetsoma/soma (PUBLIC) git repo
│       │   ├── extensions/        published extensions
│       │   ├── core/              published core
│       │   ├── templates/         init templates
│       │   ├── scripts/           user-facing scripts
│       │   └── docs/              public docs
│       │
│       ├── website/            ← meetsoma/website (PUBLIC) git repo
│       │   └── (astro site)
│       │
│       ├── cli/                ← meetsoma/cli (PUBLIC) — the npx soma wrapper
│       │   └── (pi wrapper)
│       │
│       └── media/              ← meetsoma/media (PUBLIC) — brand assets
│           └── (logos, og images)
│
├── archives/
│   ├── soma-old/               ← tools/pi/soma (archived, old version)
│   └── openclaw-ref/           ← _reference-site (archived)
│
└── Soma/ → REMOVE              ← merge into products/soma/agent/.soma/ or archive
```

### Key Changes

1. **`products/soma/` is a parent directory, not a git repo.** Each child is its own repo.
2. **No nested .git repos.** Website, agent, soma (public) are siblings, not nested.
3. **Old code archived.** `tools/pi/soma/` → `archives/soma-old/`
4. **CLI moves** from `tools/pi/soma-cli/` to `products/soma/cli/`
5. **`Soma/` personal instance** — its muscles merge into agent/.soma/, then delete
6. **~/.soma/ symlinks** updated to point to new locations

## The `.soma/` Hierarchy (After Reorg)

```
products/soma/agent/.soma/      ← Soma's dev brain (plans, secrets, registry)
    │
    │ parent-child relationship
    │
    ├── products/soma/soma/.soma/        ← public repo's own .soma (if needed)
    ├── products/soma/website/.soma/     ← website's .soma (if needed)
    └── products/soma/cli/.soma/         ← cli's .soma (if needed)

~/.soma/                        ← user-level Soma runtime
    │                              extensions, skills, global memory
    │
    └── agent/extensions/       ← updated symlinks to agent/extensions/
```

## Migration Steps

### Phase 1: Move website out of agent repo

```bash
# Website is currently nested inside agent repo
# Move it to a sibling directory
mv ~/Gravicity/products/soma/website ~/Gravicity/products/soma-website-tmp
# Clean agent repo — remove website from gitignore/tracking
# Move website back as sibling
mkdir -p ~/Gravicity/products/soma-reorg
mv ~/Gravicity/products/soma ~/Gravicity/products/soma-reorg/agent
mv ~/Gravicity/products/soma-website-tmp ~/Gravicity/products/soma-reorg/website
mv ~/Gravicity/products/soma-reorg ~/Gravicity/products/soma
```

Actually, simpler approach — the website already has its own .git and is gitignored by the agent repo. We just need to physically move things:

### Phase 1 (Simplified): Restructure

```bash
# 1. Create new structure
mkdir -p ~/Gravicity/products/soma-new

# 2. Move agent repo (currently products/soma/ root)
#    But we need to separate website first since it's nested
mv ~/Gravicity/products/soma/website ~/Gravicity/products/soma-new/website
mv ~/Gravicity/products/soma ~/Gravicity/products/soma-new/agent

# 3. Rename
mv ~/Gravicity/products/soma-new ~/Gravicity/products/soma

# 4. Archive old stuff
mv ~/Gravicity/tools/pi/soma ~/Gravicity/archives/soma-v0
mv ~/Gravicity/products/soma/agent/_reference-site ~/Gravicity/archives/openclaw-ref

# 5. Move CLI
mv ~/Gravicity/tools/pi/soma-cli ~/Gravicity/products/soma/cli

# 6. Merge Soma/ personal instance
#    Move muscles and logos, delete directory
cp -r ~/Gravicity/Soma/.soma/memory/muscles/* ~/Gravicity/products/soma/agent/.soma/memory/muscles/ 2>/dev/null
mv ~/Gravicity/Soma/logos ~/Gravicity/products/soma/agent/.soma/
mv ~/Gravicity/Soma ~/Gravicity/archives/soma-personal

# 7. Update ~/.soma/ symlinks
cd ~/.soma/extensions
rm soma-boot.ts soma-header.ts soma-statusline.ts
ln -s ~/Gravicity/products/soma/agent/extensions/soma-boot.ts .
ln -s ~/Gravicity/products/soma/agent/extensions/soma-header.ts .
ln -s ~/Gravicity/products/soma/agent/extensions/soma-statusline.ts .
```

### Phase 2: Create public soma repo

```bash
mkdir ~/Gravicity/products/soma/soma
cd ~/Gravicity/products/soma/soma
git init
git remote add origin https://github.com/meetsoma/soma.git
```

### Phase 3: Update references

- `~/Gravicity/STATE.md` — update paths
- `~/Gravicity/products/soma/agent/.soma/STATE.md` — update paths
- `~/Gravicity/products/soma/agent/STATE.md` (public-facing) — update paths
- Any scripts that reference old paths

## Risk Check

- **Will this break running Soma sessions?** Only if ~/.soma/ symlinks break. Step 7 fixes those.
- **Will git history be affected?** No — we're moving directories, not rewriting git history. Each repo keeps its full history.
- **What about the agent repo's .gitignore?** Currently ignores `website/` and `.soma/`. After move, `website/` reference is stale but harmless.

## Timing

This should happen in ONE focused session. It's a reorganization, not a feature. Do it, update all references, test that Soma boots correctly, commit, push, done.

Ideally: right now or next session start.
