# Contributing to Soma (Core)

This repo is Soma's **source code** — the TypeScript core, extensions, and tooling that ship as `meetsoma` on npm. For contributing AMPS content (protocols, muscles, skills, automations), see [soma-community/CONTRIBUTING.md](https://github.com/meetsoma/soma-community/blob/main/CONTRIBUTING.md).

## What Lives Here

```
core/           ← Runtime modules (discovery, init, protocols, muscles, heat, prompt compilation)
extensions/     ← Pi lifecycle hooks (boot, guard, header, statusline)
scripts/        ← Dev tooling (install, smoke test, sandbox, validation, audits)
tests/          ← Bash test suites (256+ tests across 10 files)
docs/           ← User-facing documentation
```

## Setup

```bash
# 1. Fork and clone
git clone https://github.com/<you>/soma-agent.git
cd soma-agent && git checkout dev

# 2. Dual-track development (recommended)
# Keeps your daily Soma stable while testing changes
git worktree add ../agent-stable main

# 3. Point your local soma install at dev for testing
bash scripts/soma-install.sh dev
# → ~/.soma/agent/ now symlinks to your dev branch
# → Restart Pi/Soma to pick up changes

# 4. Switch back to stable when done
bash scripts/soma-install.sh stable
```

## Development Cycle

```bash
# 1. Make changes in core/ or extensions/

# 2. Run unit tests — all must pass
for t in tests/test-*.sh; do bash "$t"; done

# 3. Run smoke test — 53-point integration check in isolated sandbox
bash scripts/soma-smoke-test.sh

# 4. Live test — boot Soma with your changes, exercise the feature
bash scripts/soma-install.sh dev
bash scripts/soma-sandbox.sh create --signals
cd /tmp/soma-sandbox-XXXXXX && soma
# Test your feature, then exit

# 5. Clean up
bash scripts/soma-install.sh stable
bash scripts/soma-sandbox.sh destroy /tmp/soma-sandbox-XXXXXX
```

## Test Isolation

**Tests run in `/tmp/soma-sandbox-*`** — never inside your project tree.

Soma's `findSomaDir()` walks up the filesystem. Testing inside a directory with a real `.soma/` parent contaminates results. `/tmp` has no `.soma/` ancestor — full isolation.

```bash
bash scripts/soma-sandbox.sh create --signals   # new sandbox with project signals
bash scripts/soma-sandbox.sh reset <path>        # wipe .soma/, keep project files
bash scripts/soma-sandbox.sh destroy <path>      # delete everything
bash scripts/soma-sandbox.sh list                # show active sandboxes
```

## Debug Mode

Enable debug logging to `.soma/debug/` for diagnostics:

```bash
# Via settings — add to sandbox's .soma/settings.json:
"debug": true

# Via env var:
SOMA_DEBUG=1 soma

# Mid-session:
/debug on
```

Captures: boot sequence, compiled system prompt snapshot, heat changes, errors.

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `soma-install.sh dev\|stable\|status` | Swap ~/.soma symlinks between branches |
| `soma-smoke-test.sh [--keep]` | Integration verification in isolated sandbox |
| `soma-sandbox.sh create\|reset\|destroy\|list` | Manage test sandboxes |
| `validate-content.sh <file\|dir>` | Validate AMPS frontmatter + structure |
| `soma-audit.sh` | 11-point ecosystem health check |
| `soma-snapshot.sh` | Rolling backups of .soma/ |

## Branch Model

```
main ────── stable, npm published, what users install
  └── dev ── active development, PR target
       └── feat/* / fix/* — your branch
```

- **PR to `dev`** — CI runs tests + smoke check
- dev → beta → main — maintainer promotes when ready
- `upstream/pi-*` branches for Pi version upgrades

## Architecture Quick Reference

**Boot sequence** (`soma-boot.ts`): discover `.soma/` → load settings chain → identity → preload → protocols (by heat) → muscles (by heat) → scripts → git context → compile system prompt

**Heat system**: protocols and muscles have numeric heat (0-15). Hot = full body in prompt. Warm = breadcrumb only. Cold = listed. Heat rises on use, decays per session.

**System prompt** (`prompt.ts`): replaces Pi's default prompt. Compiles identity + protocol breadcrumbs + muscle digests + tool docs + context awareness into one "Frontal Cortex."

**Settings cascade**: project `.soma/settings.json` → parent → global `~/.soma/`. Deep merge, project wins.

## Cross-Repo Changes

Soma spans two repos. Most PRs touch only one — but some changes span both.

| Change | Where | Example |
|--------|-------|---------|
| New protocol or muscle | [soma-community](https://github.com/meetsoma/soma-community) only | A `code-review` protocol |
| Bug fix in heat tracking | soma-agent only | Fix decay math in `protocols.ts` |
| New content type | **Both repos** | Adding "Playbooks" needs `ContentType` here + schema/examples there |
| New settings field a protocol needs | **Both repos** | Protocol references `settings.guard.X` that doesn't exist yet |
| Bundled protocol update | **Both repos** | Changing `breath-cycle.md` (canonical in community, synced to CLI) |

**When your change spans both repos:**

1. **Code lands first.** The core can support a type/field with zero content using it. Content referencing unsupported code breaks at runtime.
2. Open the agent PR first, note "companion PR: [link]" in both descriptions.
3. Agent PR merges to `dev` → smoke test passes → then community PR merges.
4. For bundled content (`scope: bundled`): the community repo is canonical. `sync-from-agent.sh` copies bundled content to the CLI at publish time. Don't edit bundled protocols in the agent/CLI directly.

**What syncs where:**
```
community/ (canonical for all AMPS content)
    ↓ scope: bundled protocols
cli/protocols/  (via sync-from-agent.sh at publish)
    ↓ bundled into npm
users get it via: npm install meetsoma
```

## Code Style

- TypeScript, Node 22+
- Use Pi's extension API: `@mariozechner/pi-coding-agent`
- Comments explain *why*, not *what*
- No external dependencies beyond Pi's packages
- New features must include tests

## Commit Conventions

```
feat: new capability
fix: bug fix
docs: documentation
test: test additions/updates
chore: maintenance (deps, CI, scripts)
```

## Pull Requests

1. Branch from `dev`
2. One feature or fix per PR
3. Tests must pass (CI enforces this)
4. Include: what changed, how to test, any migration notes
5. Core PRs require maintainer review + soak period before reaching `main`

## License

By contributing, you agree your work is MIT licensed.
