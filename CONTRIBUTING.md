# Contributing to Soma

Thanks for wanting to help Soma grow! There are two ways to contribute, depending on what you're building.

## Content Contributions (Protocols, Muscles, Skills, Automations)

Most contributions are **AMPS** — the shareable content types that make Soma smarter. No TypeScript knowledge needed.

### Quick Start

```bash
# 1. Fork and clone
git clone https://github.com/<your-user>/soma-agent.git
cd soma-agent && git checkout -b contrib/my-protocol dev

# 2. Write your content
# Protocols: behavioral rules the agent follows
# Muscles: learned patterns from experience
# Skills: knowledge sets loaded on demand
# Automations: multi-step workflows

# 3. Validate
bash scripts/validate-content.sh my-protocol.md

# 4. Test in a sandbox
bash scripts/soma-sandbox.sh create --signals
# Copy your file to the sandbox's .soma/protocols/ (or muscles/, skills/)
# Boot soma there and verify it loads correctly

# 5. Clean up and PR
bash scripts/soma-sandbox.sh destroy /tmp/soma-sandbox-XXXXXX
git add . && git commit -m "feat: add my-protocol"
git push origin contrib/my-protocol
# → Open PR targeting `dev` branch
```

### Content Guidelines

**Protocols** must have:
- Frontmatter: `type`, `name`, `status`, `heat-default`, `applies-to`, `breadcrumb`
- `breadcrumb` under 200 chars — this is ALL the agent sees when the protocol is warm
- `## TL;DR` section with 3-7 dense bullets
- `## Rule` section — what the agent must do
- `## When to Apply` and `## When NOT to Apply`

**Muscles** must have:
- Frontmatter: `type`, `name`, `status`, `heat`, `topic`, `keywords`
- Digest markers: `<!-- digest -->` ... `<!-- /digest -->`
- The digest is the compact version loaded at warm heat

**Naming**: `kebab-case.md` (e.g., `git-workflow.md`, `test-hygiene.md`)

Run `bash scripts/validate-content.sh your-file.md` to check all of this automatically.

### Tier System

Content is classified by tier:
- **core** — bundled with npm (only 4 protocols, maintainer-only)
- **official** — Gravicity-authored, recommended
- **community** — contributed (this is you!)
- **pro** — private/commercial (future)

Your contribution will be `community` tier by default. Exceptional content may be promoted to `official`.

## Core Contributions (TypeScript)

Changes to `core/`, `extensions/`, or `scripts/`. More involved — here's the setup.

### Prerequisites

- Node.js 22+
- Git with worktree support
- A working Soma install (`npm i -g meetsoma`)

### Setup

```bash
# 1. Fork and clone
git clone https://github.com/<your-user>/soma-agent.git
cd soma-agent && git checkout dev

# 2. Set up dual-track development
git worktree add ../agent-stable main
# agent/        → dev branch (your changes)
# agent-stable/ → main branch (stable daily use)

# 3. Point your local soma at dev for testing
bash scripts/soma-install.sh dev

# 4. When done testing, switch back to stable
bash scripts/soma-install.sh stable
```

### Development Cycle

```bash
# Make your changes in core/ or extensions/

# Run unit tests (must all pass)
for t in tests/test-*.sh; do bash "$t"; done

# Run smoke test (integration check)
bash scripts/soma-smoke-test.sh

# Live test: switch to dev, restart soma, exercise your feature
bash scripts/soma-install.sh dev
soma  # in a test project or sandbox

# Switch back to stable when done
bash scripts/soma-install.sh stable

# Commit and PR
git add . && git commit -m "feat: describe your change"
git push origin feat/my-feature
# → Open PR targeting `dev` branch
```

### Test Isolation

**All tests run in `/tmp/soma-sandbox-*`** — never inside your real project tree.

Why? Soma's `findSomaDir()` walks up the filesystem. Testing inside a project with a real `.soma/` parent would contaminate results. `/tmp` has no `.soma/` ancestor — tests are fully isolated.

```bash
# Create a clean sandbox
bash scripts/soma-sandbox.sh create --signals

# Reset between tests (wipes .soma/, keeps project files)
bash scripts/soma-sandbox.sh reset /tmp/soma-sandbox-XXXXXX

# Destroy when done
bash scripts/soma-sandbox.sh destroy /tmp/soma-sandbox-XXXXXX
```

### Architecture Overview

```
core/
├── debug.ts       ← Debug logging (.soma/debug/)
├── discovery.ts   ← Find .soma/ directories
├── identity.ts    ← Load/layer identity files
├── init.ts        ← Scaffold new .soma/ directories
├── install.ts     ← Install content from hub
├── muscles.ts     ← Muscle discovery, heat, loading
├── preload.ts     ← Session resumption
├── prompt.ts      ← System prompt compilation ("Frontal Cortex")
├── protocols.ts   ← Protocol discovery, heat tracking
├── settings.ts    ← Settings cascade (project → parent → global)
└── utils.ts       ← Shared helpers

extensions/
├── soma-boot.ts       ← Main extension: boot, commands, heat, context
├── soma-guard.ts      ← File protection
├── soma-header.ts     ← Header display
└── soma-statusline.ts ← Statusline + cache keepalive
```

## Commit Conventions

```
feat: add new feature
fix: fix a bug
docs: documentation only
test: add or update tests
chore: maintenance (deps, CI, scripts)
```

## Branch Targeting

- **Content PRs** → `dev` branch
- **Core PRs** → `dev` branch
- **Hotfixes** → `main` branch (exceptional, maintainer-coordinated)

## Review Process

1. CI must pass (unit tests + smoke test)
2. Maintainer reviews the change
3. Content PRs: validated with `validate-content.sh`
4. Core PRs: must include tests for new functionality
5. Merged to `dev` → soaks → promoted to `beta` → then `main`

## Questions?

Open an issue or join the discussion. We're building this together.
