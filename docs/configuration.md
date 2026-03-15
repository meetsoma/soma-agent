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
    "bashCommands": "warn",
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
  "automations": {
    "tokenBudget": 1500,
    "maxFull": 1,
    "maxDigest": 3,
    "fullThreshold": 5,
    "digestThreshold": 1
  },
  "heat": {
    "autoDetect": true,
    "autoDetectBump": 1,
    "pinBump": 5
  },
  "boot": {
    "steps": ["identity", "preload", "protocols", "muscles", "automations", "scripts", "git-context"],
    "gitContext": {
      "enabled": true,
      "since": "24h",
      "maxDiffLines": 50,
      "maxCommits": 10,
      "diffMode": "stat"
    }
  },
  "breathe": {
    "auto": false,
    "triggerAt": 50,
    "rotateAt": 70,
    "graceSeconds": 30
  },
  "context": {
    "notifyAt": 50,
    "warnAt": 70,
    "urgentAt": 80,
    "autoExhaleAt": 85
  },
  "preload": {
    "staleAfterHours": 48
  },
  "checkpoints": {
    "soma": {
      "autoCommit": true
    },
    "project": {
      "style": "commit",
      "autoCheckpoint": false,
      "prefix": "checkpoint:",
      "workingBranch": null
    },
    "diffOnBoot": true,
    "maxDiffLines": 80
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
| `bashCommands` | `"warn"` | Dangerous bash command guard (rm -rf, git push --force, etc.). `"allow"` = no prompts (power user), `"warn"` = confirm first, `"block"` = prevent entirely |
| `gitIdentity` | `null` | Expected git identity. `null` = hook checks email is set. Object = validates specific email/name. |
| `toolGates` | `{}` | Tool→muscle gating. Require reading a muscle before using certain bash commands. Keys are command substrings, values are `{ muscle, mode }`. |

**Example: tool→muscle gating:**
```json
{
  "guard": {
    "toolGates": {
      "git push": { "muscle": "ship-cycle", "mode": "warn" },
      "npm publish": { "muscle": "release-pipeline", "mode": "block" }
    }
  }
}
```

When the agent runs `git push` without having read the `ship-cycle` muscle this session, it gets a notification (warn) or is blocked (block). Once the muscle file is read, the gate opens silently.

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

**Example: power user / dev mode (no confirmation prompts):**
```json
{
  "guard": {
    "coreFiles": "allow",
    "bashCommands": "allow"
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

**Why adjust:** If protocols appear too eagerly, raise `warmThreshold`. If important protocols keep fading between sessions, lower `decayRate` or raise `maxHeat`. If you have many protocols competing, increase `maxBreadcrumbsInPrompt` (costs more tokens) or decrease `hotThreshold` (so fewer reach full-body loading).

See [Heat System](heat-system.md) for the full explanation.

### Muscles

| Key | Default | Description |
|-----|---------|-------------|
| `tokenBudget` | `2000` | Total estimated tokens for all loaded muscles |
| `maxFull` | `2` | Maximum muscles loaded with full body text |
| `maxDigest` | `8` | Maximum muscles loaded with digest/TL;DR only |
| `fullThreshold` | `5` | Heat needed to load a muscle in full |
| `digestThreshold` | `1` | Heat needed to load a muscle as digest |

**Why adjust:** If your agent frequently says "I don't remember how to do X" for things you've written muscles about, increase `tokenBudget` or `maxFull`. If boot messages are too long, decrease them. The digest system (via `<!-- digest:start -->` markers) is the best compromise — compact summaries that give the agent enough to know when to read the full muscle.

See [Muscles](muscles.md) for writing muscles and the digest system.

### Automations

| Key | Default | Description |
|-----|---------|-------------|
| `tokenBudget` | `1500` | Total estimated tokens for all loaded automations |
| `maxFull` | `1` | Maximum automations loaded with full body text |
| `maxDigest` | `3` | Maximum automations loaded with digest only |
| `fullThreshold` | `5` | Heat needed to load an automation in full |
| `digestThreshold` | `1` | Heat needed to load an automation as digest |

Automations are procedural step-by-step flows — like protocols but action-oriented. "Do this sequence" rather than "behave like this." They live in `.soma/amps/automations/` and support heat, `/pin`, `/kill`, and cold-start boost just like muscles.

**Why adjust:** If you have many automations competing for prompt space, increase `tokenBudget`. If you want multiple automations loaded in full (e.g. a deploy automation AND a review automation), increase `maxFull`.

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
| `steps` | `["identity", "preload", "protocols", "muscles", "automations", "scripts", "git-context"]` | Ordered list of boot steps. Remove a step to skip it, reorder to change priority. |

**Available steps:**

| Step | What It Does |
|------|-------------|
| `identity` | Load layered identity (project → parent → global) |
| `preload` | Load session continuation state (on resumed sessions only) |
| `protocols` | Discover and inject protocols by heat tier |
| `muscles` | Discover and inject muscles by heat within token budget |
| `automations` | Discover and inject automations by heat (procedural step-by-step flows) |
| `scripts` | List available `.soma/amps/scripts/` with descriptions |
| `git-context` | Inject recent git commits and changed files |

**Why adjust:** Order matters — items earlier in the list get priority in the system prompt. If your automations are more important than scripts, they're already ordered that way by default. If you're on a model with a smaller context window, remove steps to save tokens (e.g. drop `git-context` and `scripts`).

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

### Auto-Breathe

Proactive context management. Instead of waiting until context is critical, auto-breathe gives the agent progressive awareness of context pressure and handles rotation gracefully.

| Key | Default | Description |
|-----|---------|-------------|
| `auto` | `false` | Enable auto-breathe mode |
| `triggerAt` | `50` | Context % to send a gentle notice (agent keeps working, just stays aware) |
| `rotateAt` | `70` | Context % to write preload and start countdown to rotation |
| `graceSeconds` | `30` | Seconds to wait for preload before timing out — time-based, not turn-based |

**How the phases work:**

| Phase | Default % | What happens |
|-------|-----------|-------------|
| Notice | `triggerAt` (50%) | Gentle heads-up. Agent keeps working. "Consider updating logs as you go." |
| Rotate | `rotateAt` (70%) | Firm wrap-up. Agent writes preload, countdown starts. |
| Grace period | (after rotate) | `graceSeconds` (default 30s) timer. Agent writes session log + preload within this window. If preload detected, rotation happens immediately. |
| Rotation | (countdown = 0) | Session rotates to fresh context with preload auto-injected. |
| Emergency | 85% (always on) | Safety net. Fires regardless of auto-breathe setting. "Stop all work, preload NOW." |

The key insight: the notice at 50% is *not* a shutdown signal. It's awareness. The agent should keep working on its current task — it just knows rotation is ahead and can start logging work incrementally.

**The grace period:** After rotation is triggered, the agent has `graceSeconds` (default 30) to write a preload. This is time-based, not turn-based — the agent can make as many tool calls as needed within the window. As soon as the preload file is detected, rotation happens immediately. If the timer expires without a preload, breathe times out and the user can retry with `/breathe`.

**Why enable auto-breathe:** Without it, sessions run until the 85% emergency — which is too late for a clean handoff. Auto-breathe produces better preloads because the agent has time to write them thoughtfully instead of in a panic.

**Example: enable with defaults:**
```json
{
  "breathe": {
    "auto": true
  }
}
```

**Example: later triggers for deep work sessions.**
If your work involves reading many large files, context fills faster. Push triggers later so the agent doesn't get distracted by notices too early:
```json
{
  "breathe": {
    "auto": true,
    "triggerAt": 60,
    "rotateAt": 80
  }
}
```

**Example: tighter rotation for short focused tasks.**
If you're doing quick iterations (fix a bug, ship, rotate), pull the triggers closer together:
```json
{
  "breathe": {
    "auto": true,
    "triggerAt": 40,
    "rotateAt": 55
  }
}
```

You can also toggle at runtime with `/auto-breathe on|off` — useful for switching between deep focus and quick iteration within the same project.

### Context Warnings

Controls when context usage warnings fire during a session. These are the **passive warnings** — they fire when auto-breathe is off (or as a fallback alongside auto-breathe).

| Key | Default | Description |
|-----|---------|-------------|
| `notifyAt` | `50` | Subtle notification in the status area |
| `warnAt` | `70` | Warning-level notification |
| `urgentAt` | `80` | Urgent warning injected into the system prompt |
| `autoExhaleAt` | `85` | Safety net — triggers emergency preload + rotation prompt |

**How context warnings relate to auto-breathe:**
- With auto-breathe **off**: context warnings are your only alert system. The agent sees notifications at each threshold but has to decide what to do.
- With auto-breathe **on**: the auto-breathe phases (`triggerAt`, `rotateAt`) handle rotation proactively. Context warnings still fire as a safety net, but auto-breathe should resolve things before they get to `urgentAt`.
- The `autoExhaleAt` (85%) safety net fires regardless — it's the last resort.

**Why adjust:** If you find the agent panicking too early, push thresholds up. If sessions end abruptly without preloads, you might want them lower — but consider enabling auto-breathe instead, which is more graceful.

**Example: relaxed warnings for longer sessions:**
```json
{
  "context": {
    "notifyAt": 60,
    "urgentAt": 85,
    "autoExhaleAt": 90
  }
}
```

**Example: aggressive (small context models or token-conscious workflows):**
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

**Why adjust:** The stale threshold prevents the agent from acting on outdated context. If you work on a project daily, 48 hours is right — a preload from 2 days ago is probably stale. For side projects you touch weekly, set it higher so your preloads still auto-load after a few days away.

```json
{
  "preload": {
    "staleAfterHours": 168
  }
}
```

### Sessions

| Key | Default | Description |
|-----|---------|-------------|
| `sessions.overwriteGuard` | `true` | Prevent overwriting existing session logs and preloads. Files use unique session IDs in filenames. |

**Session IDs** combine sequential numbering with a random hex suffix: `s05-a3f2c1`. The sequential part (`s05`) gives you human-readable order within a day. The hex part (`a3f2c1`) prevents collisions when multiple terminals run the same Soma agent simultaneously. Both appear in filenames (`2026-03-14-s05-a3f2c1.md`) and frontmatter (`session-id:`).

```json
{
  "sessions": {
    "overwriteGuard": true
  }
}
```

### Checkpoints

Two-track version control: Soma's own `.soma/` state and your project code are checkpointed separately.

#### Soma Track

| Key | Default | Description |
|-----|---------|-------------|
| `soma.autoCommit` | `true` | Auto-commit `.soma/` changes on exhale (identity, heat state, preload) |

#### Project Track

| Key | Default | Description |
|-----|---------|-------------|
| `project.style` | `"commit"` | How to save project state: `"commit"` (git commit), `"tag"` (lightweight tag), or `"stash"` (git stash) |
| `project.autoCheckpoint` | `false` | Auto-create checkpoint on exhale. When `false`, Soma prompts first. |
| `project.prefix` | `"checkpoint:"` | Commit message prefix for project checkpoints |
| `project.workingBranch` | `null` | Branch for checkpoints. `null` = use current branch. |

#### Boot Integration

| Key | Default | Description |
|-----|---------|-------------|
| `diffOnBoot` | `true` | Show diffs from last checkpoint when session starts |
| `maxDiffLines` | `80` | Max lines of diff to surface on boot |

**Example: auto-checkpoint to a dedicated branch:**
```json
{
  "checkpoints": {
    "project": {
      "autoCheckpoint": true,
      "style": "commit",
      "workingBranch": "soma-checkpoints"
    }
  }
}
```

**Example: stash-based (non-destructive):**
```json
{
  "checkpoints": {
    "project": {
      "style": "stash",
      "autoCheckpoint": true
    }
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
