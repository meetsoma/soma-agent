# Heat System

> TL;DR: Everything in Soma has a temperature. Hot content loads fully into the agent's prompt. Warm content loads as a one-line reminder. Cold content is listed but not loaded. Heat rises when things get used, decays when they don't. The agent naturally learns what matters.

The heat system is how Soma decides what to put in the agent's context window. Instead of loading everything (which wastes tokens) or requiring manual configuration (which nobody maintains), heat makes it automatic: use something often and it stays loaded. Stop using it and it fades.

## How It Works

```
  INHALE (boot)              HOLD (work)              EXHALE (session end)
  ─────────────              ───────────              ────────────────────
  Load by heat:              Auto-detect:             For each item:
  🔥 HOT (8+) → full body    write frontmatter → +1   Used this session? → keep
  🟡 WARM (3-7) → breadcrumb  git commit → +1          Unused? → decay -1
  ❄️ COLD (0-2) → name only   write SVG → +1           Pinned? → no decay
                             Manual: /pin /kill        Save state to disk
```

### What Gets Loaded at Each Tier

**Protocols:**
| Tier | What Loads | Example |
|------|-----------|---------|
| 🔥 Hot | Full protocol body — all rules, all sections | The complete breath-cycle protocol with every phase described |
| 🟡 Warm | Breadcrumb — a single sentence from the `breadcrumb:` frontmatter field | "Commits must be attributed correctly. Check git config user.email before first commit." |
| ❄️ Cold | Just the protocol name in a list | `- git-identity` |

**Muscles:**
| Tier | What Loads | Example |
|------|-----------|---------|
| 🔥 Hot | Full muscle body — all learned patterns, rules, examples | The complete SVG logo design muscle with all techniques |
| 🟡 Warm | Digest only — the content between `<!-- digest:start -->` and `<!-- digest:end -->` markers | A 3-line summary of the muscle's key rules |
| ❄️ Cold | Name listed so the agent knows it exists | `- svg-logo-design` |

### Token Budget

Muscles have a token budget (default: 2000 estimated tokens). Hot muscles load first (up to 2 full muscles), then warm muscles fill remaining budget with digests (up to 8). This prevents muscles from consuming the entire context window.

Protocols are smaller and don't have a strict token budget, but are limited by count: max 3 hot (full body) and 10 warm (breadcrumbs).

## Heat Events

Heat changes based on what happens during a session:

| Event | Heat Change | How It's Detected |
|-------|-------------|------------------|
| Agent writes a file with YAML frontmatter | +1 to `frontmatter-standard` | Auto-detect: tool result has `---\n` prefix |
| Agent runs a git command | +1 to `git-identity` | Auto-detect: bash command matches `git config\|commit\|push\|remote` |
| Agent writes a preload file | +1 to `breath-cycle` | Auto-detect: file path contains "preload" or "continuation" |
| Agent writes an SVG file | +1 to `svg-logo-design` muscle | Auto-detect: file path ends in `.svg` |
| Agent uses GitHub App token | +1 to `github-app-auth` muscle | Auto-detect: command contains `gh-app-token` or `GH_APP_TOKEN` |
| You run `/pin <name>` | Heat set to hot + pinned | Manual command |
| You run `/kill <name>` | Heat set to 0 | Manual command |
| Session ends, item was used | No change | — |
| Session ends, item was NOT used | -1 (decay) | Automatic on exhale/shutdown |

Auto-detection runs on every tool result during a session. The agent doesn't need to explicitly say "I'm using this protocol" — the system infers it from actions.

## Commands

| Command | What It Does |
|---------|-------------|
| `/pin <name>` | Lock a protocol or muscle to hot. It stays loaded and doesn't decay. |
| `/kill <name>` | Drop heat to zero. It won't load until used again or manually pinned. |

These work for both protocols and muscles. Tab-complete the name.

## Where Heat Lives

**Protocols:** Heat state is stored in `.soma/.protocol-state.json` — a JSON file managed by the runtime. You don't edit this directly.

```json
{
  "protocols": {
    "breath-cycle": {
      "heat": 10,
      "last_referenced": "2026-03-09",
      "times_applied": 42,
      "pinned": false
    },
    "frontmatter-standard": {
      "heat": 5,
      "last_referenced": "2026-03-08",
      "times_applied": 18,
      "pinned": false
    }
  }
}
```

**Muscles:** Heat is stored in the muscle file's own frontmatter (`heat: N`). The muscle file is the source of truth.

## Configuration

All thresholds are configurable in `settings.json`. Only set what you want to change — defaults fill the rest.

```json
{
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
  }
}
```

See [Configuration](configuration.md) for the full settings reference.

## First Boot

On first boot (no `.protocol-state.json` exists), heat is seeded from each protocol's `heat-default` frontmatter field:

| `heat-default` | Starting Heat | Tier |
|----------------|--------------|------|
| `hot` | 8 (= hotThreshold) | Full body loaded |
| `warm` | 3 (= warmThreshold) | Breadcrumb loaded |
| `cold` | 0 | Name listed only |

After first boot, heat evolves through use and decay. The `heat-default` is just the starting point.

## The Big Picture

Heat solves a fundamental problem: agents have limited context windows, but users accumulate knowledge over time. Without heat, you'd either load everything (wasting tokens on irrelevant content) or manually curate what loads (nobody does this).

With heat, the system self-organizes. Protocols you use daily stay hot and fully loaded. Muscles you haven't touched in a week cool down to digests, then to just names. If you need them again, one use warms them back up.

The result: **the agent's prompt reflects what you actually do, not what you once configured.**
