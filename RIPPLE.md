---
type: config
status: active
created: 2026-03-14
updated: 2026-03-14
---

# Ripple Map

> **When X changes, check Y.** This is the dependency matrix for the Soma ecosystem.
> Read this before making changes. Update this after structural changes.
> `soma-verify.sh` checks claims here are still valid.

## How to Read

Each row is a **source of change**. The bullets are **what needs checking/updating**.
Priority: 🔴 = must check (will break), 🟡 = should check (may drift), 🟢 = nice to check.

---

## Extensions

### `extensions/soma-boot.ts` (2398 lines — the monolith)

Changes to boot sequence, commands, rotation, or auto-breathe:

- 🔴 **Restart required** — `.restart-required` signal auto-created by post-commit hook
- 🔴 `tests/test-auto-breathe.sh` — if context thresholds, rotation flow, or grace turns changed
- 🔴 `tests/test-protocols.sh` — if protocol discovery/injection changed
- 🔴 `docs/how-it-works.md` — boot sequence table (7 steps), context management section
- 🔴 `docs/commands.md` — if any `/command` handler changed (16 registered commands)
- 🟡 `docs/configuration.md` — if new settings consumed or defaults changed
- 🟡 `docs/sessions.md` — if rotation paths or auto-breathe behavior changed (planned doc)
- 🟡 `prompts/system-core.md` — if system prompt compilation changed
- 🟡 `.soma/amps/scripts/soma-verify.sh` — if boot steps or file layout changed
- 🟢 `docs/getting-started.md` — if init or first-run behavior changed

**Internal ripples (within soma-boot.ts):**
- `provideCommandCapabilities()` → affects all rotation paths (line 1487)
- `runBootDiscovery()` → affects compiled system prompt (line 291)
- `generateSessionId()` → affects preload/session filenames (line 208)
- State variable resets in `session_switch` → must match variable declarations (line 1288, REFACTOR #1)

### `extensions/soma-route.ts`

Changes to the capability router:

- 🔴 `extensions/soma-boot.ts` — largest consumer (provides 10+ capabilities)
- 🔴 `extensions/soma-statusline.ts` — consumes `session:id`, `keepalive:toggle`
- 🔴 `extensions/soma-scratch.ts` — consumes router for scratch state
- 🟡 All extensions using `getRoute()` pattern
- 🟡 `docs/extending.md` — if router API surface changed

### `extensions/soma-guard.ts`

- 🔴 `docs/extending.md` — guard rules for `.soma/` protection
- 🟡 `tests/` — guard has 0 tests (SOMA debt)

### `extensions/soma-statusline.ts`

- 🟡 `extensions/soma-route.ts` — registers keepalive capability
- 🟢 `docs/configuration.md` — statusline settings

### `extensions/soma-scratch.ts`

- 🟡 `repos/soma-pro/extensions/soma-scratch-pro.ts` — PRO extends free scratch
- 🟡 `.soma/amps/scripts/soma-scratch-diff.sh` — free vs PRO feature comparison

---

## Core Modules

### `core/settings.ts`

Changes to settings schema, defaults, or `resolveSomaPath`:

- 🔴 `docs/configuration.md` — **MUST update** (doc shows default values inline)
- 🔴 `core/init.ts` — scaffolds with settings defaults
- 🔴 `tests/test-settings.sh` — validates defaults and types
- 🔴 Every module using `resolveSomaPath()` — if path resolution logic changed
- 🟡 `docs/memory-layout.md` — if path defaults changed (e.g. `amps/muscles`)

**Consumed by:** automations.ts, identity.ts, muscles.ts, preload.ts, prompt.ts, protocols.ts, soma-boot.ts, soma-guard.ts, soma-scratch.ts

### `core/protocols.ts`

- 🔴 `tests/test-protocols.sh` (127 tests)
- 🔴 `docs/protocols.md` — discovery, heat tiers, injection behavior
- 🔴 `docs/heat-system.md` — heat mechanics
- 🟡 `repos/community/` — if protocol frontmatter format changed
- 🟡 `docs/workspaces.md` — if parent chain discovery changed

### `core/muscles.ts`

- 🔴 `tests/test-muscles.sh` (58 tests)
- 🔴 `docs/muscles.md` — discovery, heat, digest, injection
- 🟡 `docs/heat-system.md` — shared heat mechanics

### `core/discovery.ts`

- 🔴 Everything — this is the `.soma/` finder (MARKERS list)
- 🔴 `docs/workspaces.md` — parent-child chain behavior
- 🔴 `core/init.ts` — scaffolds what discovery expects to find

### `core/init.ts`

- 🔴 `docs/getting-started.md` — first-run experience, directory tree
- 🔴 `docs/memory-layout.md` — must match scaffolded structure
- 🟡 `docs/workspaces.md` — smart init detection

### `core/prompt.ts`

- 🔴 `docs/system-prompt.md` — prompt compilation pipeline
- 🔴 `prompts/system-core.md` — the template it compiles
- 🟡 `docs/how-it-works.md` — prompt assembly description

### `core/preload.ts`

- 🔴 `docs/memory-layout.md` — preload file naming, staleness
- 🟡 `docs/how-it-works.md` — preload lifecycle

---

## Docs

### Any `docs/*.md` change

- 🔴 Run `bash scripts/_dev/sync-to-website.sh` or next release syncs
- 🔴 `soma-verify.sh website` will flag drift until synced
- 🟡 Website `src/content/docs/` — hash must match after sync

### Directory tree diagrams in docs

- 🔴 Must use `amps/` nesting (not flat `protocols/`, `muscles/`, `scripts/`)
- 🔴 `soma-verify.sh website` — awk-based layout checker catches stale trees
- 🟡 Files: getting-started.md, memory-layout.md, workspaces.md, how-it-works.md

---

## AMPS Structure

### Path layout changes (`amps/` → something else)

- 🔴 `core/settings.ts` — DEFAULTS.paths
- 🔴 `core/init.ts` — mkdirSync calls
- 🔴 `core/discovery.ts` — MARKERS array
- 🔴 ALL docs with directory trees (7+ files)
- 🔴 `.soma/amps/scripts/soma-verify.sh` — layout checker
- 🔴 `.soma/amps/scripts/soma-repos.sh` — symlink definitions
- 🟡 `.gitignore` patterns (muscles/automations gitignored, protocols/scripts tracked)

### Protocol format changes (frontmatter fields)

- 🔴 `core/protocols.ts` — parser
- 🔴 `repos/community/` — all community protocols must match
- 🔴 `docs/protocols.md` — format documentation
- 🔴 `.soma/amps/scripts/soma-verify.sh sync` — protocol drift checker
- 🟡 `repos/community/.github/workflows/pr-review.yml` — CI format checks

### Muscle format changes

- 🔴 `core/muscles.ts` — parser
- 🔴 `docs/muscles.md` — format documentation
- 🟡 `repos/community/` — community muscles must match

---

## Scripts (workspace)

### `.soma/amps/scripts/soma-ship.sh`

- 🟡 `repos/STATE.md` — if sync/deploy flow changes
- 🟡 Ship-cycle muscle — if steps change

### `.soma/amps/scripts/soma-verify.sh`

- 🟡 Any new doc, setting, or content type → may need new check
- 🟡 Self-analysis muscle — if subcommands change

---

## Website

### Marketing pages (index.astro, ecosystem/, roadmap/)

- 🔴 `soma-verify.sh copy` — catches stale counts, examples, framing
- 🟡 Must be updated manually after feature ships (no auto-sync)

### Docs pages (synced)

- 🔴 Auto-synced from `repos/agent/docs/` via `sync-to-website.sh`
- 🔴 `soma-verify.sh website` — catches sync drift

---

## CI / GitHub Actions

### `agent-stable: release-publish.yml` (tag v* → npm)

- 🔴 `cli/scripts/sync-from-agent.sh` — must handle new files/paths
- 🔴 `NPM_TOKEN` + `CLI_REPO_TOKEN` secrets valid
- 🟡 If new extension added → update sync script file list

### `community: build-hub-index.yml`

- 🔴 `hub-index.json` count must match after content changes
- 🟡 If new content TYPE added → update glob patterns in workflow

### `core: upstream-sync.yml`

- 🟡 Check for conflicts after Soma-specific patches
- 🟡 `SOMA_APP_ID` + `SOMA_APP_PRIVATE_KEY` secrets valid

---

## Quick Reference: "I just changed X, what do I check?"

| Changed | Must Check | Script |
|---------|-----------|--------|
| `soma-boot.ts` | tests, docs, restart | `soma-ship.sh` (runs tests) |
| `core/settings.ts` | configuration.md, init.ts | `soma-verify.sh doc docs/configuration.md` |
| `core/protocols.ts` | test-protocols, protocols.md | `soma-ship.sh` |
| Any `docs/*.md` | website sync | `soma-verify.sh website` |
| AMPS paths | ALL docs trees, settings, init | `soma-verify.sh website` (layout check) |
| Marketing copy | counts, examples, roadmap | `soma-verify.sh copy` |
| Hub content | hub-index.json count | `soma-verify.sh website` |
| Git hooks | all repos | `soma-repos.sh hooks` |
| Symlinks | npm + ~/.soma | `soma-repos.sh symlinks` |
| New extension | symlinks, sync script, docs | `soma-repos.sh symlinks fix` |
