# Configuration

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
  }
}
```

## Settings Explained

### Memory

| Key | Default | Description |
|-----|---------|-------------|
| `flowUp` | `false` | Allow memories to propagate to parent `.soma/` directories. Currently reserved for future use. |

### Protocols (Heat Thresholds)

| Key | Default | Description |
|-----|---------|-------------|
| `warmThreshold` | `3` | Minimum heat to show as a breadcrumb in the system prompt |
| `hotThreshold` | `8` | Minimum heat to load the full protocol body |
| `maxHeat` | `15` | Heat cap — prevents runaway accumulation |
| `decayRate` | `1` | Heat lost per session if a protocol isn't used |
| `maxBreadcrumbsInPrompt` | `10` | Maximum warm protocols shown as breadcrumbs |
| `maxFullProtocolsInPrompt` | `3` | Maximum hot protocols loaded in full |

### Muscles

| Key | Default | Description |
|-----|---------|-------------|
| `tokenBudget` | `2000` | Total estimated tokens for all loaded muscles |
| `maxFull` | `2` | Maximum muscles loaded with full body text |
| `maxDigest` | `8` | Maximum muscles loaded with digest/TL;DR only |
| `fullThreshold` | `5` | Heat needed to load a muscle in full |
| `digestThreshold` | `1` | Heat needed to load a muscle as digest |

### Heat Tracking

| Key | Default | Description |
|-----|---------|-------------|
| `autoDetect` | `true` | Automatically bump heat when protocol-related patterns are detected in tool results |
| `autoDetectBump` | `1` | How much heat to add on auto-detection |
| `pinBump` | `5` | How much heat to add when using `/pin` |

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

This makes protocols load in full at heat 5 instead of 8 — useful in projects where you want protocols to activate faster.

### Aggressive Muscle Loading

Load more muscles with larger token budget:

```json
{
  "muscles": {
    "tokenBudget": 4000,
    "maxFull": 4,
    "maxDigest": 12
  }
}
```

### Disable Auto-Detection

If you don't want heat to change automatically during work:

```json
{
  "heat": {
    "autoDetect": false
  }
}
```

## How Heat Works

See [Protocols & Heat](/docs/protocols) for the full explanation of the heat system — how protocols warm up through use, cool down through neglect, and how the thresholds in settings control what loads into context.
