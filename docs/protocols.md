# Protocols

<!-- tldr -->
Behavioral rules in `.soma/protocols/` as markdown with YAML frontmatter. Loaded by heat: hot (≥8) = full body, warm (≥3) = breadcrumb, cold = name only. Heat rises on use (+1 auto-detect), decays per session if unused. Domain scoping via `applies-to` field. Write your own: add `name`, `heat-default`, `breadcrumb`, `applies-to` frontmatter. Configure thresholds in `settings.json`.
<!-- /tldr -->

Protocols are behavioral rules that guide Soma's actions. They live in `.soma/protocols/` as markdown files with YAML frontmatter.

## Built-in Protocols

| Protocol | Default Heat | Applies To | What It Does |
|----------|-------------|-----------|-------------|
| `breath-cycle` | hot | always | Sessions have phases: inhale, hold, exhale. Never skip exhale. |
| `frontmatter-standard` | warm | always | All `.md` files get YAML frontmatter with type, status, dates. |
| `git-identity` | warm | git | Commits use the correct name/email for the repo context. |
| `heat-tracking` | hot | always | Protocols and muscles have temperature that rises on use and decays. |

## Heat System

Every protocol has a temperature that determines how it loads:

| Temperature | Heat Range | What Loads |
|------------|-----------|-----------|
| 🔥 Hot | 8+ | Full protocol body in system prompt |
| 🟡 Warm | 3–7 | Breadcrumb only (1–2 sentence reminder) |
| ❄️ Cold | 0–2 | Name listed, content not loaded |

### How Heat Changes

| Event | Heat Change |
|-------|------------|
| Protocol referenced explicitly | +2 |
| Protocol applied in action (auto-detected) | +1 |
| `/pin <name>` | Set to hot + pinned (no decay) |
| `/kill <name>` | Set to 0 + unpinned |
| Session end (unused protocol) | -1 (decay) |
| Session end (used protocol) | No change |
| Session end (pinned protocol) | No change |

Heat state is stored in `.soma/.protocol-state.json` and persists across sessions.

### Thresholds

Default thresholds can be overridden in `settings.json`:

```json
{
  "protocols": {
    "warmThreshold": 3,
    "hotThreshold": 8,
    "maxHeat": 15,
    "decayRate": 1,
    "maxBreadcrumbsInPrompt": 10,
    "maxFullProtocolsInPrompt": 3
  }
}
```

#***REMOVED*** Scoping (applies-to)

Protocols declare which projects they're relevant to via the `applies-to` frontmatter field. At boot, Soma detects **project signals** by scanning for marker files:

| Signal | Detected By |
|--------|------------|
| `always` | Always matches (meta-protocols) |
| `git` | `.git/` directory exists |
| `typescript` | `tsconfig.json` or `tsconfig.base.json` |
| `javascript` | `package.json` (also set by typescript) |
| `python` | `pyproject.toml`, `requirements.txt`, `setup.py`, `Pipfile` |
| `rust` | `Cargo.toml` |
| `go` | `go.mod` |
| `frontend` | Framework configs (`next.config.*`, `vite.config.*`, etc.) or `src/components/` |
| `docs` | `docs/` directory |
| `multi-repo` | 2+ child directories with `.git/` |

A protocol with `applies-to: [git, typescript]` loads only in projects that have at least one of those signals. A protocol with no `applies-to` field (or `applies-to: [always]`) loads everywhere.

## Writing Your Own Protocol

### 1. Create the file

```bash
cp .soma/protocols/_template.md .soma/protocols/my-protocol.md
```

### 2. Edit the frontmatter

```yaml
---
type: protocol
name: my-protocol
status: active
updated: 2026-03-09
heat-default: warm
applies-to: [typescript]
breadcrumb: "One sentence that captures what this protocol enforces. This is ALL the agent sees when warm."
---
```

**Required frontmatter fields:**

| Field | Purpose |
|-------|---------|
| `name` | Protocol identifier (used in heat state, `/pin`, `/kill`) |
| `heat-default` | Starting temperature: `cold`, `warm`, or `hot` |
| `breadcrumb` | One sentence shown when protocol is warm |

**Optional fields:**

| Field | Default | Purpose |
|-------|---------|---------|
| `applies-to` | `[always]` | Domain signals this protocol applies to |
| `scope` | `local` | `local` = project only, `shared` = eligible for parent chain |
| `tier` | `community` | `community` or `official` |

### 3. Write the body

```markdown
# My Protocol

## TL;DR
- Dense bullet points
- What the agent MUST do
- 3-7 bullets max

## Rule

The detailed behavioral rules go here. This is loaded when the protocol is hot.

## When to Apply

Contexts where this activates.

## When NOT to Apply

Explicit exclusions.
```

### 4. The three loading tiers

| Tier | What the Agent Sees | When |
|------|-------------------|------|
| **Breadcrumb** | `breadcrumb:` frontmatter value | Protocol is warm |
| **TL;DR** | `## TL;DR` section | Agent reads deeper on demand |
| **Full body** | Entire file (minus frontmatter) | Protocol is hot |

Write the breadcrumb to be self-contained — it's the only thing loaded at warm temperature.

## Protocol Resolution Chain

Protocols resolve from project → parent → global, with project protocols shadowing same-named parent/global ones:

```
CWD/.soma/protocols/       ← project (highest priority)
  ↓
../.soma/protocols/         ← parent (if exists)
  ↓
~/.soma/protocols/          ← global (lowest priority)
```

If both project and global define `git-identity.md`, the project version wins.

## Files to Know

| File | Purpose |
|------|---------|
| `.soma/protocols/*.md` | Protocol definitions |
| `.soma/protocols/_template.md` | Template for new protocols |
| `.soma/.protocol-state.json` | Heat state (auto-managed, don't edit) |
| `.soma/settings.json` | Override heat thresholds |
