---
type: plan
status: draft
updated: 2026-03-10
created: 2026-03-10
tags: [architecture, core, parent-child, memory-flow, light-core, body-that-grows]
---

# Soma Light Core — The Body That Grows

> Soma's core should be almost nothing. A skeleton. The body grows by adding skills, earning muscles, wiring extensions. Each `.soma/` instance is an organism — and organisms in a workspace form a body with organs.

## The Principle

Most agent frameworks ship fat. Hundreds of built-in tools, prompts, configurations. You get everything on day one and spend the rest of your life ignoring 90% of it.

Soma ships thin. On day one you get:
- A skeleton (`.soma/` directory structure)
- A brain stem (boot sequence, identity discovery, memory loading)
- A heartbeat (context monitoring, flush cycle)

That's it. Everything else is grown:
- **Skills** are learned abilities — installed when you need them, ignored when you don't
- **Muscles** are muscle memory — earned through repetition, not installed
- **Extensions** are reflexes — automatic responses wired into the nervous system
- **Rituals** are practiced routines — multi-step workflows you do often enough to name

The `.soma/` directory IS the body. You can literally watch it grow. Day one it has 4 files. After a month of work it has dozens of muscles, project-specific skills, custom extensions. That growth is the product.

## What Ships in Core

The absolute minimum that makes Soma recognizable as Soma:

```
soma-core/
├── boot.ts              ← discover .soma/, load identity, read preload
├── flush.ts             ← context monitoring, threshold detection, state extraction
├── memory.ts            ← muscle loading, promotion logic
├── identity.ts          ← identity file discovery, inheritance
├── protocols.ts         ← protocol discovery, heat tracking, system prompt injection
└── templates/
    └── init/            ← soma init scaffold templates
```

That's ~6 files of actual logic. Everything else is a plugin.

`protocols.ts` handles:
- Scanning `.soma/protocols/` for `.md` files
- Reading/writing `.protocol-state.json`
- Heat calculation (events, decay, thresholds)
- Building the protocol injection block for system prompt (breadcrumbs vs full)
- Respecting `settings.json` thresholds and limits

**What's NOT in core:**
- No built-in skills (install what you need)
- No default rituals (define your own workflows)
- No opinionated extensions beyond boot/flush (add your own hooks)
- No themes, no branding, no UI beyond the essentials
- No cloud services, no accounts, no telemetry

The header, statusline, greeting — those are extensions that happen to ship in the default install. But they're removable. Someone could run Soma with zero extensions and it would still work — it just wouldn't be pretty.

## The `.soma/` Anatomy

```
.soma/                          ← this IS the body
├── identity.md                 ← who am I here?
├── STATE.md                    ← what do I know about this system?
├── settings.json               ← how do I behave? what flows where?
├── memory/
│   ├── muscles/                ← earned patterns (grows over time)
│   │   ├── git-workflow.md     ← "I know how this team uses git"
│   │   └── api-patterns.md    ← "I know how this API is structured"
│   └── preload-next.md        ← session continuation state
├── protocols/                  ← behavioral rules (plug and play)
│   ├── frontmatter-standard.md ← "how I format documents"
│   ├── breath-cycle.md         ← "how I manage session lifecycle"
│   └── .protocol-state.json    ← heat tracking (enterprise)
├── skills/                     ← installed abilities (project-level)
│   └── deploy-vercel/          ← "I know how to deploy this specific project"
├── extensions/                 ← project-level hooks
│   └── pre-commit-check.ts     ← "always lint before committing in this project"
└── rituals/                    ← project workflows
    └── release/                ← "how we ship a release in this project"
```

Every directory starts empty (or near-empty). The body grows as you work.

### The Body Metaphor — Updated

The four plugin layers map to the body:

| Body Part | Plugin Layer | Behavior |
|-----------|-------------|----------|
| **Reflexes** | Extensions | Automatic, always on, wired into the nervous system |
| **Knowledge** | Skills | Called on when needed, like looking something up |
| **Habits** | Rituals | Practiced routines, triggered by cue (/command) |
| **Values** | Protocols | Shape all behavior, rise/fall by how much you live them |
| **Muscle memory** | Muscles | Earned through repetition, never installed |

Protocols are the value system. They don't tell you *what* to do — they tell you *how to be*. And like real values, the ones you practice become part of you (hot), the ones you preach but don't practice fade (cold).

## Parent-Child Architecture

This is where it gets interesting. In a real workspace, you don't have one project — you have many. And they're related.

```
workspace/                          ← the organism
├── .soma/                          ← brain (parent — aggregates everything)
│   ├── identity.md                 ← "I am the workspace agent"
│   ├── settings.json               ← aggregation config
│   └── memory/muscles/             ← workspace-wide patterns
│       ├── team-conventions.md     ← promoted from children
│       └── deploy-pipeline.md      ← promoted from children
│
├── frontend/                       ← an organ
│   └── .soma/                      ← organ brain
│       ├── identity.md             ← "I handle the React frontend"
│       ├── settings.json           ← { "memory": { "flowUp": true } }
│       └── memory/muscles/
│           ├── component-patterns.md    ← stays local (frontend-specific)
│           └── team-conventions.md      ← flows up (useful everywhere)
│
├── api/                            ← another organ
│   └── .soma/                      ← organ brain
│       ├── identity.md             ← "I handle the Go API"
│       ├── settings.json           ← { "memory": { "flowUp": true, "flowFilter": ["scope:shared"] } }
│       └── memory/muscles/
│           ├── endpoint-patterns.md     ← stays local
│           └── error-handling.md        ← flows up (tagged scope:shared)
│
└── infra/
    └── .soma/
        ├── settings.json           ← { "memory": { "flowUp": false } }  ← private!
        └── memory/muscles/
            └── secrets-management.md    ← NEVER flows up (sensitive)
```

### The Flow Rules

**Upward flow is child-controlled.** The child decides what to share, not the parent pulling.

```json
// .soma/settings.json (child)
{
  "memory": {
    "flowUp": true,                    // enable upward flow
    "flowFilter": {
      "mode": "include",               // "include" = only share matching, "exclude" = share all except matching
      "rules": [
        { "scope": "shared" },         // muscles tagged scope:shared flow up
        { "heat": { "min": 5 } },      // only hot muscles (used 5+ times) flow up
        { "topic": ["conventions", "patterns"] }  // topic-based filtering
      ]
    },
    "flowTarget": "parent",            // "parent" (default) or "root" (skip to workspace level)
    "flowMode": "copy"                 // "copy" (duplicate to parent) or "symlink" (reference)
  }
}
```

**Why child-controlled?**
- Privacy: `infra/` might have sensitive patterns (secrets management, credentials handling). It should NEVER auto-share.
- Relevance: frontend component patterns aren't useful to the API. Don't pollute the parent with noise.
- Autonomy: each project team (or project context) decides what's worth sharing.

### Discovery

The parent doesn't magically know about children. Discovery is explicit:

```json
// workspace/.soma/settings.json (parent)
{
  "children": {
    "discovery": "auto",              // "auto" (scan for .soma/ dirs) or "manual" (list paths)
    "paths": [],                       // only used if discovery: "manual"
    "scanDepth": 2,                    // how many levels deep to look for .soma/ dirs
    "exclude": ["node_modules", ".git", "vendor"]  // dirs to skip during scan
  }
}
```

`discovery: "auto"` means: walk the workspace directory tree, find all `.soma/` directories, register them as children. This is the simple default.

`discovery: "manual"` means: only these specific paths are children. For when auto-discovery picks up too much noise.

### Promotion Flow

When a muscle flows up, what actually happens?

**Option A: Copy (simple, safe)**
```
child/.soma/memory/muscles/conventions.md
    ↓ (copy)
parent/.soma/memory/muscles/conventions.md
```
The parent gets its own copy. If the child updates the muscle, the parent's copy is stale until the next promotion cycle. Simple, no surprises.

**Option B: Symlink (live, but fragile)**
```
parent/.soma/memory/muscles/conventions.md → ../../frontend/.soma/memory/muscles/conventions.md
```
Parent always reads the latest version. But: if the child project moves, renames, or is deleted, the symlink breaks.

**Option C: Reference (metadata pointer)**
```json
// parent/.soma/memory/muscles/.references.json
{
  "conventions": {
    "source": "frontend/.soma/memory/muscles/conventions.md",
    "lastSync": "2026-03-10T14:00:00Z",
    "hash": "abc123"
  }
}
```
Parent knows where the muscle came from. Can sync on demand. Can detect if source changed. More complex but most robust.

**Recommendation:** Start with **Option A (copy)** + a sync command (`soma memory sync`). Promotion happens explicitly, not continuously. You run sync when you want the parent to catch up. Automatic promotion is Phase 2.

### What Flows Up vs What Stays Local

| Flows Up (shared) | Stays Local |
|-------------------|-------------|
| Team conventions | Project-specific patterns |
| Error handling patterns | Preloads (session state) |
| Deploy workflows | Identity (who am I HERE) |
| Architecture patterns | Secrets-related muscles |
| Testing approaches | STATE.md (local architecture) |

The muscle format already has frontmatter. We add a `scope` field:

```markdown
---
type: muscle
topic: error-handling
scope: shared        ← "shared" = eligible for upward flow, "local" = stays here
keywords: [errors, api, patterns]
heat: 7
loads: 12
---
```

`scope: local` is the default. You have to explicitly mark a muscle as `shared` for it to flow up. Safe by default.

## Skill Resolution (Connects to PI081)

Skills also follow the hierarchy. When the agent needs a skill, it looks:

```
1. .soma/skills/              ← project-level (most specific)
2. ../.soma/skills/           ← parent workspace level
3. ~/.soma/agent/skills/      ← user global
4. (remote registry)          ← fetch and install if not found locally
```

This means:
- A project can override a global skill (project-specific deploy instructions)
- A workspace parent can share skills across children (workspace-wide conventions)
- Global skills are the fallback (your default toolkit)

```json
// .soma/settings.json
{
  "skills": {
    "resolution": ["local", "parent", "global"],    // search order
    "autoInstall": false,                             // prompt before installing from remote
    "registry": "https://raw.githubusercontent.com/meetsoma/agent/main/skills/index.json"
  }
}
```

## Extension Loading

Extensions follow a similar pattern but are more restricted (they're code, not knowledge):

```json
// .soma/settings.json
{
  "extensions": {
    "load": ["local", "global"],        // DON'T load parent extensions by default
    "disabled": [],                      // explicitly disable specific extensions
    "core": ["boot", "flush", "memory"] // always loaded, can't disable
  }
}
```

Extensions DON'T inherit from parent by default. Why? Because:
- Extensions are code that runs automatically
- A parent extension might conflict with a child's setup
- Skill inheritance is safe (it's just knowledge). Extension inheritance is dangerous (it's behavior).
- If you want a parent extension in a child, explicitly install it.

## `soma init` Revisited

With this architecture, `soma init` has modes:

```bash
# Initialize a standalone project
soma init

# Initialize a child project (in a workspace that already has a parent .soma/)
soma init --child

# Initialize a workspace parent (scans for existing .soma/ children)
soma init --parent
```

`--child` does the same scaffold but also:
- Sets `"memory": { "flowUp": true }` in settings.json (can be changed later)
- Doesn't create a full identity.md template (inherits context from parent)

`--parent` does the same scaffold but also:
- Sets `"children": { "discovery": "auto" }` in settings.json
- Scans and lists discovered children
- Creates a workspace-level identity.md

Plain `soma init` (no flags) creates a standalone project. Most common case. No parent-child complexity unless you ask for it.

## The Settings File

The settings.json is the nervous system — it controls how the body behaves:

```json
{
  "$schema": "https://soma.gravicity.ai/schemas/settings-v1.json",
  "version": "1.0.0",
  
  "identity": {
    "agent": "soma",
    "inherit": true                    // layer project identity on base identity
  },
  
  "memory": {
    "flowUp": false,                   // does this instance share muscles upward?
    "flowFilter": null,                // filter rules (null = share all if flowUp is true)
    "flowMode": "copy",               // "copy" or "symlink" or "reference"
    "autoPromote": false,              // auto-promote hot local muscles to shared scope?
    "promotionThreshold": {
      "heat": 5,                       // minimum heat to auto-promote
      "loads": 10,                     // minimum loads to auto-promote
      "crossProject": 2               // seen in N+ projects to promote to global
    }
  },
  
  "skills": {
    "resolution": ["local", "parent", "global"],
    "autoInstall": false,
    "registry": "https://raw.githubusercontent.com/meetsoma/agent/main/skills/index.json"
  },
  
  "extensions": {
    "load": ["local", "global"],
    "disabled": [],
    "core": ["boot", "flush", "memory"]
  },
  
  "children": {
    "discovery": "none",               // "none" (standalone), "auto", or "manual"
    "paths": [],
    "scanDepth": 2,
    "exclude": ["node_modules", ".git", "vendor", "dist", "build"]
  },
  
  "flush": {
    "threshold": 0.85,                 // context % that triggers flush
    "autoFlush": true,                 // automatically flush or just warn?
    "autoContinue": true               // automatically start new session after flush?
  }
}
```

Most of these have sensible defaults. A fresh `soma init` creates a minimal settings.json:

```json
{
  "version": "1.0.0"
}
```

Everything else falls back to defaults. You only add settings when you want to change behavior. Like `.gitconfig` — you don't need one until you do.

## How This Connects to the "Body That Grows" Brand

The biological metaphor isn't just marketing. It's the architecture:

| Biology | Soma | Mechanism |
|---------|------|-----------|
| Skeleton | `.soma/` scaffold | `soma init` creates the bones |
| Brain stem | boot + flush + memory | Core extensions (always on) |
| Muscles | `memory/muscles/` | Earned through repetition, get stronger with use |
| Skills | `skills/` | Learned abilities, can be taught (installed) |
| Reflexes | `extensions/` | Automatic responses to stimuli (events) |
| Habits | `rituals/` | Practiced routines triggered by commands |
| Organs | Child `.soma/` instances | Specialized bodies within a larger organism |
| Nervous system | `settings.json` | Controls what signals flow where |
| Growth | Heat + promotion | Patterns that prove useful get elevated |
| Memory | `preload-next.md` | Continuity across "sleep" (sessions) |

The body metaphor IS the architecture. They're the same thing described in different languages.

## Implementation Priority

| # | What | Effort | Depends On |
|---|------|--------|-----------|
| 1 | `settings.json` schema + defaults | Small | Nothing |
| 2 | Update `soma init` to generate settings.json | Small | #1 |
| 3 | Skill resolution respects settings | Medium | #1, PI081 |
| 4 | `scope` field in muscle frontmatter | Small | Nothing |
| 5 | Parent child discovery (auto-scan) | Medium | #1 |
| 6 | Upward flow (copy mode) | Medium | #4, #5 |
| 7 | `soma memory sync` command | Medium | #6 |
| 8 | Auto-promotion (heat-based) | Large | #6, #7 |

Steps 1-4 are quick wins. 5-7 are the real parent-child system. 8 is the magic.

## Open Questions

1. **Settings format:** JSON or YAML? JSON is simpler and parseable everywhere. YAML is more readable for humans. Leaning JSON for consistency with package.json, tsconfig, etc.
2. **Conflict resolution:** If a child and parent both have a muscle with the same name, who wins? (Probably: child wins locally, parent version exists independently)
3. **Cross-child sharing:** Can siblings share directly, or only through the parent? (Start with parent-only, it's simpler)
4. **Muscle versioning:** When a muscle flows up, should it track its version/source? (Yes — the reference metadata approach)
5. **Performance:** Auto-scanning for `.soma/` dirs could be slow in large monorepos. Need exclusion rules and caching.
6. **Git integration:** Should `.soma/settings.json` be committed? (Yes — it's project config, like `.eslintrc`. But `memory/` is gitignored.)
