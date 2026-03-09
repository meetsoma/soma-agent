---
type: plan
status: active
created: 2026-03-10
updated: 2026-03-10
tags: [architecture, core, extraction, audit]
priority: high
---

# Core Extraction Audit — What's Real, What's Convention, What's Missing

> We wrote 5 protocol specs. Now: what does the code actually do? Where does
> the behavior live? What's implemented vs assumed? And how do we extract a
> clean core that any agent (not just Soma) could use?

## The Honest Audit

### 890 Lines of TypeScript. That's It.

Soma's entire runtime is three extension files totaling 890 lines:

| File | Lines | What It Does |
|------|-------|-------------|
| `soma-boot.ts` | 359 | Identity discovery, preload loading, /flush, /preload, /soma commands, context warnings, auto-init |
| `soma-statusline.ts` | 428 | Footer rendering, context monitoring, auto-flush trigger, FLUSH COMPLETE detection, /auto-continue, /status |
| `soma-header.ts` | 103 | Branded header with memory status dots |

Everything else — muscles, preloads, STATE.md, identity.md, the whole memory system — is **just files on disk that the agent reads because the extensions tell it to.**

### Protocol → Code Mapping

| Protocol | What the Spec Says | What the Code Actually Does | Gap |
|----------|-------------------|----------------------------|-----|
| **AMP: Muscle loading** | "Agent loads relevant muscles by heat/context" | ❌ Nothing. No muscle loading code exists. The agent reads muscles because preloads/identity mention them, or the human asks. | **BIG GAP** |
| **AMP: Heat tracking** | "Loads increment, heat recalculated" | ❌ Nothing. Heat/loads fields exist in muscle frontmatter but nothing reads or updates them. | **BIG GAP** |
| **AMP: Promotion** | "Cross-project patterns get promoted" | ❌ Nothing. Purely manual today. | Gap (acceptable for v0.1) |
| **AMP: Preload loading** | "Read preload-next.md on boot" | ✅ `soma-boot.ts` finds and loads preloads. Checks `.soma/` and `.soma/memory/`. Staleness detection (48h). | Solid |
| **AMP: Flush pipeline** | "Detect threshold → extract → persist" | ⚠️ Partial. Statusline detects 85% and sends an LLM prompt to flush. The AGENT writes the preload, not the code. The code just tells the agent to do it. | Works but fragile |
| **AMP: Memory hierarchy** | "Project → workspace → user → system" | ❌ Nothing. Code only looks at project `.soma/`. No parent/user-level resolution. | **BIG GAP** |
| **ATLAS: Frontmatter** | "Standard type/status/updated fields" | ❌ Nothing reads frontmatter programmatically. It's a convention the agent follows. | Acceptable |
| **ATLAS: STATE.md** | "Read on boot, update with changes" | ⚠️ Indirect. STATE.md is a marker file for finding `.soma/`, but the boot extension doesn't inject it into context. | Partial |
| **Three-Layer: Extensions** | "TypeScript hooks into lifecycle" | ✅ This IS the implementation. Pi's extension API. Working. | Solid |
| **Three-Layer: Skills** | "Markdown knowledge loaded on demand" | ✅ Pi's skill resolver handles this. Working. | Solid (Pi's work, not ours) |
| **Three-Layer: Rituals** | "Multi-step workflows, /commands" | ⚠️ /flush exists as a registered command. No general ritual system. | Partial |
| **Breath Cycle: Inhale** | "Discover identity, load preload, load muscles" | ⚠️ Discovers identity + preload. Does NOT load muscles. | Partial |
| **Breath Cycle: Process** | "Work, monitor context" | ✅ Context monitoring works (50/70/80/85% warnings). | Solid |
| **Breath Cycle: Exhale** | "Extract state, write preload, crystallize" | ⚠️ Triggers flush at 85%. Tells the LLM to write files. Detects "FLUSH COMPLETE". No crystallization. | Partial |
| **Breath Cycle: Auto-continue** | "Seamless session handoff" | ✅ /auto-continue command. Detects continuation-prompt.md. Injects into new session. | Solid |
| **Identity: Discovery** | "Walk up filesystem to find .soma/identity.md" | ✅ `findSomaDir()` walks up. Loads identity.md. | Solid |
| **Identity: Inheritance** | "Project layers on base identity" | ❌ Only loads ONE identity (first found). No layering. No ~/.soma/identity.md fallback. | **GAP** |
| **Heat Protocol: Discovery** | "Scan .soma/protocols/ for .md files" | ❌ Nothing. No protocol folder scanning. | **BIG GAP** |
| **Heat Protocol: Temperature** | "Cold/warm/hot based on usage frequency" | ❌ Nothing. No .protocol-state.json, no heat tracking. | **BIG GAP** |
| **Heat Protocol: Prompt injection** | "Breadcrumbs (warm) or full (hot) into system prompt" | ❌ Nothing. Boot doesn't build protocol blocks. | **BIG GAP** |
| **Heat Protocol: Decay** | "Unused protocols cool per session" | ❌ Nothing. | **BIG GAP** |

### The Big Gaps

1. **No muscle loading** — The agent doesn't automatically read muscles at boot. It reads identity and preload. Muscles are just files sitting there hoping to be noticed.

2. **No heat tracking** — Frontmatter has `heat` and `loads` but nothing increments them. They're decorative.

3. **No memory hierarchy** — Only project-level `.soma/` is found. No parent workspace, no user-global `~/.soma/`, no resolution chain.

4. **No identity inheritance** — Finds one identity file, loads it. Doesn't layer project on top of base.

5. **No STATE.md injection** — STATE.md is a marker for directory detection but its content isn't loaded into context at boot.

6. **Flush is prompt-based** — The code doesn't write preloads. It tells the LLM "write a preload." The LLM does the work. This is clever (uses the LLM's understanding of the session) but fragile (the LLM might not follow instructions perfectly).

7. **No protocol discovery** — No code scans `.soma/protocols/` for protocol `.md` files. Protocols are a convention, not a runtime feature.

8. **No protocol heat model** — No `.protocol-state.json`, no temperature tracking, no breadcrumb injection into system prompt. The entire heat system is designed but unbuilt.

9. **No protocol system prompt injection** — Boot doesn't build a protocol block for the system prompt. Protocols don't flow into agent awareness automatically.

### What Actually Works Well

1. **Directory discovery** — `findSomaDir()` reliably walks up the tree
2. **Preload system** — Finds preloads, checks staleness, loads on resume
3. **Context monitoring** — Escalating warnings at 50/70/80/85%
4. **Auto-flush trigger** — Sends structured prompt at 85%
5. **Auto-continue** — Full cycle: flush → detect complete → new session → inject continuation
6. **`/soma init`** — Creates `.soma/` directory with proper structure
7. **Pi commands** — /flush, /preload, /soma, /auto-continue, /status all registered and working
8. **Branded UI** — Header and statusline work correctly

## What the Core Should Be

Based on the audit, here's what Soma's core actually needs to do (vs what's currently "someone else's problem"):

### Core Runtime (must exist as code)

```
soma-core/
├── discovery.ts          ← find .soma/ dirs (project, parent, user-global)
├── identity.ts           ← load + layer identity files  
├── memory.ts             ← muscle loading, heat tracking, promotion
├── preload.ts            ← preload loading, staleness, writing
├── flush.ts              ← threshold detection, state extraction
├── protocols.ts          ← protocol discovery, heat model, system prompt injection
├── settings.ts           ← settings.json parsing, defaults
├── hierarchy.ts          ← parent-child resolution, upward flow
└── index.ts              ← ties it all together, exports public API
```

### What Each Module Does

**discovery.ts** — Directory Resolution
```typescript
findSomaDir(cwd: string): string | null           // walk up to find .soma/
findParentSomaDir(somaDir: string): string | null  // find parent .soma/
findUserSomaDir(): string                          // ~/.soma/
resolveHierarchy(cwd: string): SomaDir[]           // [project, parent, user] chain
```
Currently: `findSomaDir()` exists in boot.ts. Duplicated in header.ts. No parent/user resolution.

**identity.ts** — Identity Loading
```typescript  
loadIdentity(hierarchy: SomaDir[]): string         // merge identities from hierarchy
// project identity layers on user identity layers on base
```
Currently: loads ONE identity file. No layering.

**memory.ts** — Muscle Management
```typescript
loadMuscles(hierarchy: SomaDir[], context?: string): Muscle[]  // load relevant muscles
trackLoad(muscle: Muscle): void                                 // increment loads, recalc heat
promoteMuscle(muscle: Muscle, from: Scope, to: Scope): void    // move up the hierarchy
getHotMuscles(dir: string, limit?: number): Muscle[]            // top N by heat
```
Currently: **NOTHING.** This doesn't exist. Muscles are just files.

**preload.ts** — Session Continuation
```typescript
findPreload(somaDir: string): string | null    // find preload-next.md
loadPreload(path: string): PreloadData         // parse preload content
isStale(path: string, maxAge?: number): boolean // check freshness
writePreload(somaDir: string, data: PreloadData): void  // write preload
```
Currently: find + load + stale check exist in boot.ts. Write is done by the LLM, not code.

**flush.ts** — Exhale Pipeline  
```typescript
detectThreshold(usage: ContextUsage): FlushLevel   // none/warning/critical/flush
extractState(session: Session): SessionState        // summarize what happened
triggerFlush(somaDir: string, state: SessionState): void  // orchestrate the flush
```
Currently: threshold detection exists in statusline.ts. Extract + trigger are LLM prompts.

**settings.ts** — Configuration
```typescript
loadSettings(somaDir: string): SomaSettings    // parse settings.json with defaults
getDefault(): SomaSettings                       // sensible defaults
```
Currently: **NOTHING.** No settings.json is read anywhere.

**hierarchy.ts** — Parent-Child
```typescript
discoverChildren(parentDir: string, settings: SomaSettings): string[]  // find child .soma/ dirs
syncMemoryUp(child: string, parent: string, settings: SomaSettings): void  // flow muscles up
```
Currently: **NOTHING.** No parent-child anything.

## The Extraction Plan

### Phase 1: Refactor What Exists (don't add features, just organize)

1. Extract `findSomaDir()` from boot.ts and header.ts → `discovery.ts`
2. Extract preload logic from boot.ts → `preload.ts`  
3. Extract context monitoring from statusline.ts → `flush.ts`
4. Both extensions import from the shared core modules
5. Zero behavior change. Same features, cleaner structure.

### Phase 2: Fill the Gaps (add the missing protocol implementations)

6. `identity.ts` — add user-level fallback (~/.soma/identity.md), layering
7. `memory.ts` — muscle loading at boot (find muscles, read digests, inject into context)
8. `memory.ts` — heat tracking (increment loads when a muscle is read)
9. `settings.ts` — read settings.json, apply defaults
10. `discovery.ts` — add `findParentSomaDir()`, `findUserSomaDir()`, `resolveHierarchy()`

### Phase 3: The New Stuff

11. `hierarchy.ts` — parent-child discovery, upward memory flow
12. `memory.ts` — auto-promotion based on cross-project usage
13. `flush.ts` — code-driven preload writing (not just prompting the LLM)

### The Key Decision: LLM-Driven vs Code-Driven Flush

Right now, flush works like this:
```
Code detects 85% → Code tells LLM "write a preload" → LLM writes the preload
```

This is actually clever because the LLM understands the session context better than any code could. It knows what was important, what decisions were made, what's next.

But it's fragile because:
- The LLM might not follow the format
- The LLM might miss important state
- There's no validation

**Hybrid approach:**
```
Code detects 85% → Code extracts structured data (files changed, tools called, time elapsed)
                  → Code sends structured data + prompt to LLM
                  → LLM writes the narrative preload (what happened, what's next)
                  → Code validates the output (has required sections, not empty)
                  → Code writes to disk
```

The LLM does what it's good at (understanding, summarizing). The code does what it's good at (structure, validation, file I/O). Neither does the other's job.

## Where This Core Lives

### Option A: Inside Soma's extension files (current approach, just organized)
```
products/soma/extensions/
├── core/
│   ├── discovery.ts
│   ├── identity.ts
│   ├── memory.ts
│   ├── preload.ts
│   ├── flush.ts
│   ├── settings.ts
│   └── hierarchy.ts
├── soma-boot.ts          ← imports from core/
├── soma-statusline.ts    ← imports from core/
└── soma-header.ts        ← imports from core/
```

**Pro:** Simple. Everything in one place.
**Con:** Extensions can't easily import from subdirectories in Pi's extension loader (needs testing).

### Option B: npm package (@gravicity/soma-core)
```
packages/soma-core/
├── src/
│   ├── discovery.ts
│   ├── identity.ts
│   ├── memory.ts
│   └── ...
├── package.json
└── tsconfig.json
```

Extensions import: `import { findSomaDir } from "@gravicity/soma-core"`

**Pro:** Clean separation. Reusable. Testable. Other agents could use the core.
**Con:** Needs npm publishing, version management, more infra.

### Option C: Single bundled core file
All core logic in one `soma-core.ts` that extensions import.

**Pro:** No subdirectory import issues. One file.
**Con:** Gets big. Hard to maintain as features grow.

**Recommendation:** Start with **Option A** (subdirectory). Test if Pi's extension loader handles imports. If not, fall back to **Option C** (single file). **Option B** is the eventual goal but premature right now.

## What This Means for the Protocol Repo

The protocol specs at `curtismercier/protocols` describe the WHAT.
The core modules in Soma describe the HOW.

```
curtismercier/protocols      ← "AMP says muscles have heat and get promoted"
    ↓ implemented by
soma/extensions/core/        ← memory.ts actually loads muscles, tracks heat, promotes
    ↓ used by
soma/extensions/soma-boot.ts ← wires core into Pi's lifecycle hooks
```

Any other agent framework could write their own `core/` that implements the protocols differently. The specs are the contract. The code is one implementation.

## Priority

This is the most important technical work right now. The protocol specs are published. The scripts work. The architecture is designed. But the runtime — the actual code that makes Soma *be* Soma — has significant gaps.

### Immediate (next coding session)
1. Phase 1: Refactor (extract shared code into core modules)
2. Add muscle loading at boot (the biggest missing piece)
3. Add settings.json reading

### Next
4. Identity layering
5. Memory hierarchy (project → user-global resolution)
6. Heat tracking

### Later
7. Parent-child discovery
8. Upward memory flow
9. Code-assisted flush (hybrid LLM + code)
