# Commands

<!-- tldr -->
`/exhale` — save state + preload (alias: `/flush`). `/inhale` — fresh start. `/pin <name>` — bump heat +5. `/kill <name>` — drop heat to 0. `/soma` — show status. CLI: `meetsoma` (fresh), `meetsoma -c` (continue). Auto-exhale at 85% context. Warnings at 50/70/80%.
<!-- /tldr -->

Soma registers slash commands that control the breath cycle, heat system, and session management.

## Session Commands

| Command | Description |
|---------|-------------|
| `/exhale` | Save state to disk. Writes `preload-next.md`, saves heat state with decay for unused content. Alias: `/flush` |
| `/inhale` | Start a fresh session. Shows preload status and suggests `meetsoma -c` to continue with context. |

## Heat Commands

| Command | Description |
|---------|-------------|
| `/pin <name>` | Pin a protocol or muscle — bumps its heat by the configured `pinBump` (default: +5). Keeps it loaded in future sessions. |
| `/kill <name>` | Drop a protocol or muscle's heat to zero. It won't load until used again. |

## Info Commands

| Command | Description |
|---------|-------------|
| `/soma` | Show Soma status — loaded identity, protocol heat states, muscle states, context usage. |
| `/preload` | Show the current preload content (what will carry to next session). |

## Context Warnings

Soma monitors context usage and warns at thresholds:

| Usage | Behavior |
|-------|----------|
| 50% | Gentle note: "Context halfway" |
| 70% | Reminder to plan an exhale |
| 80% | Strong suggestion to exhale soon |
| 85% | Auto-exhale triggers — state saves, session rotates |

## CLI Flags

| Flag | Description |
|------|-------------|
| `meetsoma` | Fresh session — loads identity and hot content only |
| `meetsoma -c` | Continue — loads identity + last session's preload |

## The Breath Cycle

Commands map to Soma's breath metaphor:

1. **Inhale** — session starts, context loads (identity → protocols → muscles → preload)
2. **Work** — the session. Heat shifts based on what you use.
3. **Exhale** — state saves. Heat decays on unused content. Preload crystallizes for next time.

See [How It Works](/docs/how-it-works) for the full breath cycle explanation.
