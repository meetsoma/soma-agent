# Commands

<!-- tldr -->
`/inhale` — start fresh. `/breathe` — save + auto-continue. `/exhale` — save + stop (alias: `/flush`). `/rest` — disable keepalive + exhale (going to bed). `/pin <name>` — bump heat +5. `/kill <name>` — drop heat to 0. `/install <type> <name>` — install from hub. `/list local|remote` — browse content. `/soma` — show status. CLI: `soma` (fresh), `soma -c` (continue). Context warnings and auto-exhale thresholds are configurable in `settings.json`.
<!-- /tldr -->

Soma registers slash commands that control the breath cycle, heat system, and session management.

## Session Commands

| Command | Description |
|---------|-------------|
| `/inhale` | Start a fresh session. Shows preload status and suggests `soma -c` to continue with context. |
| `/breathe` | Save state and auto-continue into a fresh session. Seamless rotation — exhale + inhale in one motion. |
| `/exhale` | Save state to disk. Writes `preload-next.md`, saves heat state with decay for unused content. Session ends. Alias: `/flush` |
| `/rest` | Going to bed? Disables cache keepalive, then exhales. No pings will fire after you walk away. |

## Heat Commands

| Command | Description |
|---------|-------------|
| `/pin <name>` | Pin a protocol or muscle — bumps its heat by the configured `pinBump` (default: +5). Keeps it loaded in future sessions. |
| `/kill <name>` | Drop a protocol or muscle's heat to zero. It won't load until used again. |

## Hub Commands

| Command | Description |
|---------|-------------|
| `/install <type> <name>` | Install a protocol, muscle, skill, or template from the Soma Hub. Templates resolve dependencies automatically. Use `--force` to overwrite. |
| `/list local [type]` | Show installed content in your `.soma/`. Optionally filter by type (protocol, muscle, skill, template). |

## Guard Commands

| Command | Description |
|---------|-------------|
| `/guard-status` | Show guard statistics: reads tracked, directories listed, interventions blocked. Provided by `soma-guard.ts` extension. |
| `/list remote [type]` | Browse available content on the hub. Fetches from `meetsoma/community` on GitHub. |

## Info Commands

| Command | Description |
|---------|-------------|
| `/soma` | Show Soma status — loaded identity, protocol heat states, muscle states, context usage. |
| `/soma init` | Create a `.soma/` directory in the current project. |
| `/preload` | Show the current preload content (what will carry to next session). |
| `/status` | Show session stats — context usage, turn count, uptime. |
| `/keepalive` | Toggle cache keepalive. Subcommands: `on`, `off`, `status`. When enabled, sends periodic pings to prevent cache eviction during idle periods. |
| `/auto-continue` | Inject the last continuation prompt into a new session. Used after FLUSH COMPLETE. |

## Context Warnings

Soma monitors context usage and warns at configurable thresholds:

| Setting | Default | Behavior |
|---------|---------|----------|
| `context.notifyAt` | 50% | Gentle note: "Context halfway" |
| `context.urgentAt` | 80% | Strong suggestion to exhale soon (injected into prompt) |
| `context.autoExhaleAt` | 85% | Auto-exhale triggers — state saves, session rotates |

Override in `settings.json` — see [Configuration](configuration.md#context-warnings).

## CLI Flags

| Flag | Description |
|------|-------------|
| `soma` | Fresh session — loads identity, hot protocols, active muscles |
| `soma -c` | Continue — loads everything above + last session's preload |
| `soma -r` | Resume — pick from previous sessions to restore |

## Scripts

Standalone bash tools in `scripts/` — usable outside the agent session.

| Script | Description |
|--------|-------------|
| `soma-audit.sh` | Ecosystem health check — runs 11 focused audits (PII, drift, stale content, docs sync, command consistency, etc.). `--list` to see audits, `--quiet` for summary only, or name specific audits to run. |
| `soma-search.sh` | Query soma memory by type, status, tags, domain. Modes: `--brief`, `--deep` (TL;DR extraction), `--missing-tldr`. |
| `soma-scan.sh` | Frontmatter scanner — audit protocols, muscles, plans for staleness and status. (Note: renamed to `soma-frontmatter.sh` at workspace level.) |
| `soma-snapshot.sh` | Rolling zip snapshots of project directories. |
| `soma-tldr.sh` | Generate or update TL;DR / digest sections in markdown files. |
| `frontmatter-date-hook.sh` | Git pre-commit hook — auto-updates `updated:` field in modified `.md` files. |

### Workspace-Level Scripts (`.soma/scripts/`)

These scripts operate across the full workspace, not just the agent project:

| Script | Description |
|--------|-------------|
| `soma-scan.sh` | Session & topic scanner. Commands: `topic <term>`, `sessions`, `extractions`, `trail <term>`, `related <term>`, `files <term>`. Scans pi jsonl logs, steno extractions, and frontmatter. |
| `soma-context.sh` | Pre-change context gatherer. Shows other versions, references, recent discussions, git history, and related concepts for a given file/topic. |
| `soma-stale.sh` | Stale doc finder. Detects: stale (by age), overlapping (same name in different dirs), orphaned (unreferenced), drafts/seeds. |
| `soma-frontmatter.sh` | Frontmatter status/type scanner. Reports on frontmatter compliance across the workspace. |

```bash
# Examples
scripts/soma-audit.sh --quiet        # ecosystem health check
scripts/soma-audit.sh drift pii      # run specific audits
scripts/soma-search.sh --type protocol --deep
scripts/soma-frontmatter.sh --stale
scripts/soma-snapshot.sh . "pre-refactor"

# Workspace-level (from .soma/scripts/)
.soma/scripts/soma-scan.sh topic "checkpoints"
.soma/scripts/soma-context.sh STATE.md
.soma/scripts/soma-stale.sh
```

## The Breath Cycle

Commands map to Soma's breath metaphor:

1. **Inhale** — session starts, boot steps run in order (identity → preload → protocols → muscles → scripts → git-context). Configurable in [Configuration](configuration.md#boot-sequence).
2. **Work** — the session. Heat shifts based on what you use.
3. **Breathe** — context filling up? `/breathe` saves state and continues seamlessly.
4. **Exhale** — done for now? `/exhale` saves state and ends the session.
5. **Rest** — going to bed? `/rest` disables keepalive pings and exhales. No cache pings will fire after you walk away.

See [How It Works](/docs/how-it-works) for the full breath cycle explanation.
