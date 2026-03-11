---
title: "Workspaces"
description: "Parent-child inheritance, monorepo patterns, solo body mode."
section: "Core Concepts"
order: 8
---

# Workspaces

<!-- tldr -->
Soma supports parent-child `.soma/` directories for monorepos and multi-project setups. Parent provides shared identity, protocols, muscles, tools — child inherits by default, overrides what it needs. Solo body mode: when only a parent exists, child projects use it directly. All inheritance is toggleable per-dimension via `inherit` settings. Smart init detects parent workspaces automatically on first run.
<!-- /tldr -->

## The Problem

Monorepos have shared conventions (git identity, commit style, deployment) and per-project specifics (this app uses React, that service uses Go). A single `.soma/` doesn't fit. Per-project `.soma/` directories duplicate everything.

## The Solution: Parent-Child Inheritance

Place a `.soma/` at the workspace root for shared knowledge. Child projects inherit from it automatically.

```
~/work/monorepo/
├── .soma/                          ← parent
│   ├── identity.md                 ← "We use pnpm, conventional commits, TypeScript"
│   ├── protocols/
│   │   ├── git-identity.md         ← shared: use work email
│   │   └── code-review.md          ← shared: review checklist
│   └── settings.json               ← shared thresholds
│
├── apps/web/
│   └── .soma/                      ← child
│       ├── identity.md             ← "I'm a Next.js frontend"
│       └── protocols/
│           └── testing.md          ← project-specific: Playwright tests
│
├── apps/api/
│   └── .soma/                      ← child
│       ├── identity.md             ← "I'm a Hono API service"
│       └── protocols/
│           └── api-versioning.md   ← project-specific
│
└── packages/shared/                ← no .soma/ — uses parent directly
```

## How It Works

On boot, Soma walks up the filesystem from your CWD looking for `.soma/` directories. The chain is:

```
child (.soma/ in current project)
  → parent (.soma/ in workspace root)
    → global (~/.soma/agent/)
```

Each level contributes:

| Layer | Identity | Protocols | Muscles | Tools |
|-------|----------|-----------|---------|-------|
| **Child** | Primary — defines who Soma is here | Discovered first, highest priority | Loaded first within budget | Listed first |
| **Parent** | Context — adds below child's identity | Discovered alongside child's | Fill remaining budget | Listed after child's |
| **Global** | Baseline — universal traits | Discovered last | Fill remaining budget | Listed last |

Identity layers stack (all are visible). Protocols and muscles merge into one pool — the heat system decides what loads regardless of which level they came from.

## Solo Body Mode

When a child project has **no `.soma/`** of its own, Soma uses the parent directly. No need to run `soma init` in every sub-project.

In the example above, `packages/shared/` has no `.soma/`. When you run `soma` there, Soma finds the parent at `~/work/monorepo/.soma/` and uses it as the primary. The parent's identity, protocols, and muscles all load directly.

This is the default behavior — you only create a child `.soma/` when you need project-specific overrides.

## Controlling Inheritance

Each dimension is independently toggleable in `settings.json`:

```json
{
  "inherit": {
    "identity": true,
    "protocols": true,
    "muscles": true,
    "tools": true
  }
}
```

All default to `true`. Set to `false` to make a project standalone:

### Standalone Project (No Inheritance)

```json
{
  "inherit": {
    "identity": false,
    "protocols": false,
    "muscles": false,
    "tools": false
  }
}
```

### Selective Inheritance

Share protocols but use independent identity and muscles:

```json
{
  "inherit": {
    "identity": false,
    "protocols": true,
    "muscles": false,
    "tools": true
  }
}
```

## Patterns

### Monorepo with Shared Standards

Parent holds team conventions. Children specialize.

**Parent `identity.md`:**
> We're a TypeScript shop. pnpm everywhere. Conventional commits. PRs require review.

**Child `identity.md` (web app):**
> I'm the customer-facing Next.js app. Playwright for E2E, Vitest for unit. Deploy to Vercel.

### Open Source Project with Private Workspace

Parent holds your personal preferences (gitignored). The project `.soma/` is minimal and tracked.

```
~/oss/
├── .soma/                    ← gitignored, personal
│   ├── identity.md           ← your voice, your style
│   └── protocols/
│       └── git-identity.md   ← your email
│
└── cool-project/
    └── .soma/                ← tracked in repo
        ├── STATE.md          ← project architecture
        └── protocols/
            └── contributing.md ← project rules
```

### Multiple Clients

One workspace per client. Global identity stays consistent.

```
~/.soma/agent/identity.md         ← "I think in systems, I value clean code"

~/client-a/.soma/identity.md      ← "Client A uses AWS, Python, Django"
~/client-b/.soma/identity.md      ← "Client B uses GCP, Go, Kubernetes"
```

## Smart Init Detection

When you run `soma init` or first-run `soma`, smart init detects:

- Whether a parent `.soma/` exists (and offers to inherit from it)
- Your package manager, language, and framework
- Whether you're in a monorepo (workspace config files)
- Whether `CLAUDE.md` exists (acknowledges it, no conflict)

This context shapes the initial identity and suggested protocols.

## Tips

- **Start with a parent.** Put shared conventions at the workspace root. Add child `.soma/` only when needed.
- **Don't duplicate protocols.** If a protocol applies workspace-wide, keep it in the parent. Children inherit it automatically.
- **Use solo body mode.** Most sub-packages in a monorepo don't need their own `.soma/`. The parent handles it.
- **Override, don't fight.** If a child needs different behavior, create a child `.soma/` with just the overrides. Everything else inherits.

## Related

- [Configuration — Inheritance](/docs/configuration#inheritance) — toggle settings
- [Identity](/docs/identity) — how layering works
- [Memory Layout](/docs/memory-layout#parent-chain-discovery) — filesystem discovery
- [How It Works](/docs/how-it-works#parent-child-workspaces) — overview
