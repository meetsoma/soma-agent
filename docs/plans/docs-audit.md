---
type: plan
status: active
created: 2026-03-09
updated: 2026-03-09
---

# Docs Audit — User-Facing Documentation

> Audit of `docs/` and `README.md` against current architecture. Gaps, stale content, and improvement proposals.

## Summary

The docs were written early (pre-core-extraction, pre-heat-system). They tell a good story but are **behind the codebase** in several places. A user reading these today would miss key features and hit wrong commands.

---

## File-by-File Findings

### README.md

| Issue | Severity | Fix |
|-------|----------|-----|
| `/flush` listed as primary command — now `/exhale` (D012) | 🔴 Wrong | Rename to `/exhale`, note `/flush` as alias |
| `soma install skill` doesn't exist yet | 🟡 Premature | Mark as planned or remove |
| No mention of protocols | 🟡 Missing | Add protocols to "How It Works" section |
| No mention of heat system | 🟡 Missing | At least a sentence about adaptive loading |
| No mention of `applies-to` / signal detection | 🟢 Minor | Internal detail, maybe skip for users |
| Commands table missing `/inhale`, `/pin`, `/kill` | 🟡 Incomplete | Add D012 commands |
| `npm install` — we use pnpm internally but npm is correct for end users | ✅ Fine | Leave as-is |
| "She" pronoun for Soma — intentional brand voice | ✅ Fine | Keep consistent |

### docs/getting-started.md

| Issue | Severity | Fix |
|-------|----------|-----|
| `/flush` as primary command | 🔴 Wrong | → `/exhale` |
| `continuation-prompt.md` mentioned — this is now `preload-next.md` | 🔴 Wrong | Remove or clarify |
| `/auto-continue` listed — this is a pi-level command, not soma-specific | 🟡 Confusing | Clarify it's automatic at 85% |
| `.soma/` layout shows `skills/` — not in current `init.ts` scaffold | 🟡 Premature | Either add to init or mark as manual |
| Missing: protocols, settings.json, scripts | 🟡 Incomplete | At least mention protocols exist |
| "She'll write her own identity" — good, but `init.ts` now uses templates | 🟢 Nuance | Update to reflect template-aware init |

### docs/how-it-works.md

| Issue | Severity | Fix |
|-------|----------|-----|
| `/flush` as the command name | 🔴 Wrong | → `/exhale` |
| No mention of protocols or heat system | 🟡 Major gap | This is the "how it works" doc — heat is THE differentiator |
| No mention of settings.json | 🟡 Missing | Users should know they can configure thresholds |
| "writes a continuation prompt" — no longer a separate file | 🟡 Stale | Preload IS the continuation |
| Muscle section is thin | 🟡 Underdeveloped | Add: how they're discovered, loaded by heat, digest system |
| Context thresholds accurate (50/70/80/85) | ✅ Correct | Matches `soma-statusline.ts` |

### docs/memory-layout.md

| Issue | Severity | Fix |
|-------|----------|-----|
| Shows `continuation-prompt.md` as separate file | 🔴 Stale | Remove — preload-next.md handles this |
| Missing: `protocols/`, `settings.json`, `.protocol-state.json` | 🟡 Incomplete | Add to layout diagram |
| Missing: `scripts/` directory | 🟡 Incomplete | Add — users should know dev tooling exists |
| Marker files list wrong — says identity.md, STATE.md, memory/ | 🟡 Stale | Actual markers: `STATE.md`, `identity.md`, `memory`, `protocols`, `settings.json` |
| Git strategy section is good | ✅ Accurate | Keep |
| "How Memory Flows" section mentions continuation-prompt.md | 🔴 Stale | Update flow to use preload-next.md only |

### docs/extending.md

| Issue | Severity | Fix |
|-------|----------|-----|
| `soma install skill` doesn't exist | 🟡 Premature | Mark as planned |
| Extension example is solid | ✅ Good | Matches Pi API |
| Events table accurate | ✅ Good | Matches soma-boot.ts usage |
| Missing: `before_agent_start` event details (system prompt modification) | 🟢 Enhancement | This is how soma-boot injects protocols |
| Missing: how to write a custom protocol | 🟡 Gap | Users should know they can add `.soma/protocols/my-thing.md` |

---

## New Docs Needed

| Doc | Why | Priority |
|-----|-----|----------|
| ~~**docs/protocols.md**~~ ✅ | Shipped. On website. | — |
| ~~**docs/configuration.md**~~ ✅ | Shipped 2026-03-09. Full settings reference. | — |
| ~~**docs/commands.md**~~ ✅ | Shipped 2026-03-09. Slash commands, CLI flags, context warnings. | — |
| **docs/scripts.md** | `soma-search.sh`, `soma-scan.sh`, `soma-tldr.sh` — dev tooling for power users. | 🟢 Low |

## Structural Improvements

### 1. README should be a landing page, not a manual
The README tries to be both marketing and documentation. Proposal:
- **README**: Quick pitch, install, 3-line quickstart, link to docs
- **docs/**: All details live here

### 2. docs/ needs an index
No `docs/README.md` or `docs/index.md`. A user landing in `docs/` sees a flat list. Add an index with reading order.

### 3. Consistent command reference
Commands appear in README, getting-started, and how-it-works — all slightly different. Single source in `docs/commands.md`, link from others.

### 4. "For Users" vs "For Contributors"
Current docs mix user instructions with contributor details. The audience for "how to use Soma" and "how to hack on Soma" is different. Consider splitting:
- `docs/` — user-facing (install, use, configure, extend)
- `docs/dev/` or `CONTRIBUTING.md` — contributor-facing (architecture, testing, core internals)

### 5. Protocol authoring guide
Users who want to create their own protocols need:
- Frontmatter fields (`name`, `heat-default`, `applies-to`, `breadcrumb`)
- Where to put the file (`.soma/protocols/`)
- How heat works (cold → warm → hot cycle)
- Template reference (`_template.md`)

---

## Proposed Execution Order

1. ~~**Fix the /flush → /exhale rename** across all docs~~ ✅ Already done — `/exhale` primary, `/flush` alias
2. ~~**Remove continuation-prompt.md references**~~ ✅ Already cleaned
3. ~~**Write docs/protocols.md**~~ ✅ Shipped and on website
4. ~~**Update memory-layout.md** with current directory structure~~ ✅ Already current
5. **Write docs/index.md** as reading-order guide — still open
6. ~~**Write docs/configuration.md** for settings.json~~ ✅ Shipped 2026-03-09
7. ~~**Restructure README** to be leaner~~ ✅ Already lean, docs table updated

---

*This audit reflects codebase state at commit `8c3b283` (2026-03-09). All Tier 2 runtime gaps shipped.*
