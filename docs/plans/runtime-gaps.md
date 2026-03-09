---
type: plan
status: active
created: 2026-03-07
updated: 2026-03-07
priority: high
tags: [core, runtime, heat, muscles, protocols, atlas]
---

# Runtime Gaps — What's Coded vs What Actually Works

## Context

Core extraction shipped 7 modules + 3 thin extensions. Boot works. Protocols load.
But the system is shallow — heat never persists, muscles never load, ATLAS is stale,
and we're not following our own protocols. This plan maps every gap and sequences the work.

## Gap Inventory

### Tier 1 — Broken / Never Bootstrapped

| # | Gap | Impact | Fix |
|---|-----|--------|-----|
| G1 | **Heat never initializes** | `.protocol-state.json` never created. Heat defaults used forever. No learning. | On first boot with protocols, create state file from discovered protocols + `heat-default` values. |
| G2 | **Heat never updates mid-session** | `recordHeatEvent()` exists but nothing calls it. Protocol usage untracked. | Need a detection mechanism. Simplest: agent self-reports via `/protocol-used <name>`. Better: extension detects protocol references in assistant messages. |
| G3 | **Heat only saves on /flush** | And only if state already exists (chicken-and-egg with G1). | Fix G1 first. Then: save on `/flush` AND on session end (Pi `session_shutdown` event). |
| G4 | **Muscles never load at boot** | `memory/muscles/` has files. Boot ignores them. The whole point of AMP. | New `core/muscles.ts` module. Load at boot by heat, digest-only when tight. Wire into `soma-boot.ts`. |
| G5 | **ATLAS files stale** | Both `STATE.md` (internal) and `products/soma/agent/STATE.md` (ecosystem) are out of date. Missing core extraction, protocols, git identity. | Update both. This session or next. |

### Tier 2 — Missing Features (Designed, Not Built)

| # | Gap | Impact | Fix |
|---|-----|--------|-----|
| G6 | **No `applies-to` filtering** | Every protocol loads regardless of context. Git-identity loads when editing CSS. | Add `applies-to` frontmatter field. Filter in `discoverProtocols()` based on project signals (has `.git/`? has `package.json`? framework detection). |
| G7 | **No `settings.json` reading** | `core/init.ts` writes one, but nothing reads it at runtime. Thresholds are hardcoded. | `core/settings.ts` module. Read at boot, merge with defaults. Pass to protocol/muscle loaders. |
| G8 | **No muscle promotion** | Muscles stay project-level forever. No cross-project learning. | Track loads across projects (needs global state file at `~/.soma/`). Promote when threshold hit. Future — not blocking. |
| G9 | **No ritual system** | Three-layer model has rituals defined but no runtime. | Phase 2. Not blocking anything right now. |

### Tier 3 — Process / Discipline

| # | Gap | Impact | Fix |
|---|-----|--------|-----|
| G10 | **Not following breath cycle** | We don't flush consistently. Preloads written sometimes. | Discipline. The tooling works (auto-flush at 85%). We just need to respect it. |
| G11 | **Not following frontmatter standard** | New files sometimes skip frontmatter. | Discipline + the warm breadcrumb reminds us. |
| G12 | **Not updating ATLAS on arch changes** | Core extraction shipped without STATE.md update. | Discipline. Fix G5 now, then enforce: "same commit" rule. |

## Sequence

```
Phase 1 — Foundation (this session or next)
  G5: Update ATLAS files (both)               ← 30 min, do first
  G1: Bootstrap heat state on first boot       ← 15 min, tiny code change
  G3: Save heat on session_shutdown too        ← 5 min

Phase 2 — Core Runtime
  G4: Muscle loading at boot                   ← new module, 1-2 hours
  G7: Settings.json reading                    ← new module, 30 min
  G6: applies-to filtering                     ← extend protocols.ts, 30 min

Phase 3 — Adaptive Heat
  G2: Mid-session heat tracking                ← needs design decision (self-report vs auto-detect)

Phase 4 — Advanced (future)
  G8: Muscle promotion
  G9: Ritual system
```

## Design Decisions Needed

### D1: How does heat update mid-session?

Options:
1. **Self-report command** — `/protocol-used frontmatter-standard`. Explicit, simple, annoying.
2. **Agent message scanning** — extension scans assistant responses for protocol name mentions. Implicit, clever, fragile.
3. **Tool result scanning** — if the agent writes frontmatter, the frontmatter protocol gets heat. Action-based, accurate, limited scope.
4. **Hybrid** — tool result scanning (#3) for auto-detection + explicit `/pin` and `/kill` for manual control. Skip the fragile message scanning.

**Recommendation: Option 4 (hybrid).** Auto-detect from actions where possible, explicit commands for overrides.

### D2: What signals drive `applies-to`?

Candidates:
- `git` — `.git/` exists in project
- `typescript` / `javascript` — `package.json` or `tsconfig.json` exists
- `python` — `pyproject.toml` or `requirements.txt`
- `frontend` — has `src/components/` or framework config
- `docs` — heavy `.md` content
- `multi-repo` — workspace with multiple `.git/` children
- `always` — load regardless (for meta-protocols like breath-cycle)

Could also just be freeform tags that match against project markers. Don't over-engineer.

### D3: Muscle loading strategy at boot

- Load all muscles? No — could be dozens, burns context.
- Load by heat? Yes — hottest first, within token budget.
- Digest vs full? Digest first, full only for top 3-5.
- Token budget? Configurable in `settings.json`. Default: ~2000 tokens for muscles.
- What about new muscles (heat 0)? Load digest on first session, let heat build.

## Dependencies

```
G1 → G3 (heat save needs state to exist)
G5 → nothing (just discipline)
G4 → G7 (muscle loading needs settings for token budget)
G6 → nothing (can add to protocols.ts independently)
G7 → G4, G6 (settings feed into both)
```

## Success Criteria

After Phase 2:
- `soma --version` boots with zero errors ✅ (already done)
- Protocols load with heat from state file, not just defaults
- Muscles load at boot (at least digests)
- Settings.json controls thresholds
- `applies-to` filters irrelevant protocols
- Both ATLAS files current
