# Configuration

<!-- tldr -->
`settings.json` at any level in the soma chain (project → parent → global). Project overrides parent overrides global. Controls: heat thresholds, muscle budgets, boot steps (including git-context), context warning thresholds, preload staleness, auto-detection, parent-child inheritance, persona, system prompt toggles, guard rules. Only set what you want to change — defaults fill the rest.
<!-- /tldr -->

Soma's behavior is controlled through `settings.json` files. Settings are optional — Soma works with sensible defaults out of the box.

## Where Settings Live

Settings files can exist at any level in the Soma chain:

```
~/.soma/agent/settings.json      ← global (all projects)
~/work/.soma/settings.json       ← parent (all projects in ~/work)
~/work/my-app/.soma/settings.json ← project (this project only)
```

**Merge order:** global → parent → project. Project settings override parent, which override global. You only need to set the values you want to change.

## Full Reference

```json
{
  "inherit": {
    "identity": true,
    "protocols": true,
    "muscles": true,
    "tools": true
  },
  "persona": {
    "name": null,
    "emoji": null,
    "icon": null
  },
  "guard": {
    "coreFiles": "warn",
    "gitIdentity": null
  },
  "systemPrompt": {
    "maxTokens": 4000,
    "includeSomaDocs": true,
    "includePiDocs": true,
    "includeContextAwareness": true,
    "includeSkills": true,
    "includeGuardAwareness": true,
    "identityInSystemPrompt": true
  },
  "memory": {
    "flowUp": false
  },
  "protocols": {
    "warmThreshold": 3,
    "hotThreshold": 8,
    "maxHeat": 15,
    "decayRate": 1,
    "maxBreadcrumbsInPrompt": 10,
    "maxFullProtocolsInPrompt": 3
  },
  "muscles": {
    "tokenBudget": 2000,
    "maxFull": 2,
    "maxDigest": 8,
    "fullThreshold": 5,
    "digestThreshold": 1
  },
  "heat": {
    "autoDetect": true,
    "autoDetectBump": 1,
    "pinBump": 5
  },
  "boot": {
    "steps": ["identity", "preload", "protocols", "muscles", "scripts", "git-context"],
    "gitContext": {
      "enabled": true,
      "since": "24h",
      "maxDiffLines": 50,
      "maxCommits": 10,
      "diffMode": "stat"
    }
  },
  "context": {
    "notifyAt": 50,
    "warnAt": 70,
    "urgentAt": 80,
    "autoExhaleAt": 85
  },
  "preload": {
    "staleAfterHours": 48
  }
}
```

## Settings Explained

### Inheritance

Controls what a child `.soma/` inherits from its parent chain. All default to `true` when a parent `.soma/` exists.

| Key | Default | Description |
|-----|---------|-------------|
| `identity` | `true` | Layer parent's identity below the child's in the system prompt |
| `protocols` | `true` | Discover and load parent's protocols (respects heat) |
| `muscles` | `true` | Discover and load parent's muscles (respects heat/budget) |
| `tools` | `true` | Surface parent's scripts and tools |

**Example: standalone project** (no parent inheritance):
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

See [How It Works](/docs/how-it-works#parent-child-workspaces) for the full inheritance model.

### Persona

Cosmetic identity overrides — give your agent a custom name, emoji, or icon.

| Key | Default | Description |
|-----|---------|-------------|
| `name` | `null` | Custom agent name (appears in system prompt and status) |
| `emoji` | `null` | Custom emoji for status and logs |
| `icon` | `null` | Path to custom icon (SVG/PNG) |

**Example:**
```json
{
  "persona": {
    "name": "Atlas",
    "emoji": "🗺️"
  }
}
```

When `name` is set, it appears in the system prompt identity section. When `null`, Soma uses the default or inherited name.

### Guard

Protects core Soma files and git identity from accidental modification.

| Key | Default | Description |
|-----|---------|-------------|
| `coreFiles` | `"warn"` | Protection for identity.md, STATE.md, protocols/, settings.json. Options: `"allow"` (no guard), `"warn"` (notify on write), `"block"` (require confirmation) |
| `gitIdentity` | `null` | Expected git identity. `null` = hook checks email is set. Object = validates specific email/name. |

**Example: strict guard with enforced git identity:**
```json
{
  "guard": {
    "coreFiles": "block",
    "gitIdentity": {
      "email": "dev@example.com",
      "name": "Dev"
    }
  }
}
```

### System Prompt

Controls what sections appear in Soma's compiled system prompt. Use `/soma prompt` to preview the assembled result.

| Key | Default | Description |
|-----|---------|-------------|
| `maxTokens` | `4000` | Estimated token budget for Soma's system prompt portion |
| `includeSomaDocs` | `true` | Include Soma documentation references |
| `includePiDocs` | `true` | Include Pi framework documentation references |
| `includeContextAwareness` | `true` | Include CLAUDE.md awareness note |
| `includeSkills` | `true` | Include skills block from Pi |
| `includeGuardAwareness` | `true` | Include guard rules in prompt |
| `identityInSystemPrompt` | `true` | Place identity in system prompt (vs user message) |

**Example: minimal prompt (less context, more room for conversation):**
```json
{
  "systemPrompt": {
    "includeSomaDocs": false,
    "includePiDocs": false,
    "includeSkills": false
  }
}
```

### Memory

| Key | Default | Description |
|-----|---------|-------------|
| `flowUp` | `false` | Allow memories to propagate to parent `.soma/` directories. Reserved for future use. |

### Protocols (Heat Thresholds)

| Key | Default | Description |
|-----|---------|-------------|
| `warmThreshold` | `3` | Minimum heat to show as a breadcrumb in the system prompt |
| `hotThreshold` | `8` | Minimum heat to load the full protocol body |
| `maxHeat` | `15` | Heat cap — prevents runaway accumulation |
| `decayRate` | `1` | Heat lost per session if a protocol isn't used |
| `maxBreadcrumbsInPrompt` | `10` | Maximum warm protocols shown as breadcrumbs |
| `maxFullProtocolsInPrompt` | `3` | Maximum hot protocols loaded in full |

See [Heat System](heat-system.md) for the full explanation.

### Muscles

| Key | Default | Description |
|-----|---------|-------------|
| `tokenBudget` | `2000` | Total estimated tokens for all loaded muscles |
| `maxFull` | `2` | Maximum muscles loaded with full body text |
| `maxDigest` | `8` | Maximum muscles loaded with digest/TL;DR only |
| `fullThreshold` | `5` | Heat needed to load a muscle in full |
| `digestThreshold` | `1` | Heat needed to load a muscle as digest |

See [Muscles](muscles.md) for writing muscles and the digest system.

### Heat Tracking

| Key | Default | Description |
|-----|---------|-------------|
| `autoDetect` | `true` | Automatically bump heat when protocol-related patterns are detected in tool results |
| `autoDetectBump` | `1` | How much heat to add on auto-detection |
| `pinBump` | `5` | How much heat to add when using `/pin` |

### Boot Sequence

The boot sequence controls what loads into the agent's context on session start. Each step is a named stage that runs in order.

| Key | Default | Description |
|-----|---------|-------------|
| `steps` | `["identity", "preload", "protocols", "muscles", "scripts", "git-context"]` | Ordered list of boot steps. Remove a step to skip it, reorder to change priority. |

**Available steps:**

| Step | What It Does |
|------|-------------|
| `identity` | Load layered identity (project → parent → global) |
| `preload` | Load session continuation state (on resumed sessions only) |
| `protocols` | Discover and inject protocols by heat tier |
| `muscles` | Discover and inject muscles by heat within token budget |
| `scripts` | List available `.soma/scripts/` with descriptions |
| `git-context` | Inject recent git commits and changed files |

To disable a step, remove it from the array:

```json
{
  "boot": {
    "steps": ["identity", "preload", "protocols", "muscles"]
  }
}
```

This skips scripts listing and git context on boot.

### Git Context

Controls the `git-context` boot step — what recent git history to load on session start. This gives the agent awareness of what changed since last session without reading the preload.

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | Whether to load git context on boot |
| `since` | `"24h"` | How far back to look. Accepts: `"last-session"` (uses preload timestamp), `"24h"`, `"7d"`, or any git date format |
| `maxDiffLines` | `50` | Max lines of diff output to include |
| `maxCommits` | `10` | Max commit log entries to show |
| `diffMode` | `"stat"` | `"stat"` (file summary), `"full"` (full diff), or `"none"` (commits only) |

**Examples:**

Show full diffs from last session:
```json
{
  "boot": {
    "gitContext": {
      "since": "last-session",
      "diffMode": "full",
      "maxDiffLines": 100
    }
  }
}
```

Only show commits, no diff:
```json
{
  "boot": {
    "gitContext": {
      "diffMode": "none",
      "maxCommits": 20
    }
  }
}
```

Disable git context entirely:
```json
{
  "boot": {
    "gitContext": {
      "enabled": false
    }
  }
}
```

### Context Warnings

Controls when context usage warnings fire during a session. Thresholds are percentages of the model's context window.

| Key | Default | Description |
|-----|---------|-------------|
| `notifyAt` | `50` | Percentage to show a subtle notification |
| `warnAt` | `70` | Percentage to show a warning (currently fires at `urgentAt` in prompt injection) |
| `urgentAt` | `80` | Percentage to inject an urgent warning into the system prompt |
| `autoExhaleAt` | `85` | Percentage to trigger auto-exhale prompt |

For longer sessions, push the thresholds up:
```json
{
  "context": {
    "notifyAt": 60,
    "urgentAt": 85,
    "autoExhaleAt": 90
  }
}
```

For aggressive context management, pull them down:
```json
{
  "context": {
    "notifyAt": 30,
    "urgentAt": 60,
    "autoExhaleAt": 70
  }
}
```

### Preload

| Key | Default | Description |
|-----|---------|-------------|
| `staleAfterHours` | `48` | Hours before a preload file is considered stale. Stale preloads still load but show a ⚠️ warning. |

For projects with weekly cadence:
```json
{
  "preload": {
    "staleAfterHours": 168
  }
}
```

## Examples

### Minimal Override

Only change what matters — everything else uses defaults:

```json
{
  "protocols": {
    "hotThreshold": 5
  }
}
```

### Aggressive Muscle Loading

```json
{
  "muscles": {
    "tokenBudget": 4000,
    "maxFull": 4,
    "maxDigest": 12
  }
}
```

### Quiet Boot (No Git, No Scripts)

```json
{
  "boot": {
    "steps": ["identity", "preload", "protocols", "muscles"]
  }
}
```

### Long-Running Project

Weekly sessions, big context, late warnings:

```json
{
  "preload": {
    "staleAfterHours": 168
  },
  "context": {
    "notifyAt": 60,
    "autoExhaleAt": 90
  },
  "boot": {
    "gitContext": {
      "since": "7d",
      "maxCommits": 30
    }
  }
}
```
