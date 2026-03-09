# Commands

<!-- tldr -->
`/inhale` — start fresh. `/breathe` — save + auto-continue. `/exhale` — save + stop (alias: `/flush`). `/pin <name>` — bump heat +5. `/kill <name>` — drop heat to 0. `/soma` — show status. CLI: `soma` (fresh), `soma -c` (continue). Auto-exhale at 85% context. Warnings at 50/70/80%.
<!-- /tldr -->

Soma registers slash commands that control the breath cycle, heat system, and session management.

## Session Commands

| Command | Description |
|---------|-------------|
| `/inhale` | Start a fresh session. Shows preload status and suggests `soma -c` to continue with context. |
| `/breathe` | Save state and auto-continue into a fresh session. Seamless rotation — exhale + inhale in one motion. |
| `/exhale` | Save state to disk. Writes `preload-next.md`, saves heat state with decay for unused content. Session ends. Alias: `/flush` |

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
| `soma` | Fresh session — loads identity, hot protocols, active muscles |
| `soma -c` | Continue — loads everything above + last session's preload |
| `soma -r` | Resume — pick from previous sessions to restore |

## The Breath Cycle

Commands map to Soma's breath metaphor:

1. **Inhale** — session starts, context loads (identity → protocols → muscles → preload if `-c`)
2. **Work** — the session. Heat shifts based on what you use.
3. **Breathe** — context filling up? `/breathe` saves state and continues seamlessly.
4. **Exhale** — done for now? `/exhale` saves state and ends the session.

See [How It Works](/docs/how-it-works) for the full breath cycle explanation.
