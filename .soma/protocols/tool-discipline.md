---
type: protocol
name: tool-discipline
status: active
heat-default: warm
applies-to: [always]
breadcrumb: "Read before edit. grep/find for exploration. Edit for surgical changes. The guard extension blocks dangerous bash commands based on your guard settings."
version: 2.0.0
tier: core
scope: bundled
tags: [tools, safety, self-awareness]
created: 2026-03-10
updated: 2026-03-14
author: Curtis Mercier
license: CC BY 4.0
---
# Tool Discipline

> How Soma uses tools safely. The guard extension enforces some of these mechanically — this protocol covers both the automated safety net and the craft practices.

## TL;DR
Guard extension auto-blocks dangerous bash (rm -rf, force push, credential exposure). Three levels: `allow` (power user), `warn` (flag + confirm), `block` (require override). Craft rules: read before edit, grep/find for exploration, `edit` for surgical changes, `write` for new files only, batch independent calls. Settings: `guard.bashCommands` and `guard.coreFiles`.

## What the Guard Handles (Automatic)

The `soma-guard.ts` extension intercepts bash commands and flags dangerous patterns:

- `rm -rf` on sensitive paths
- `>` redirect to root/system paths (but `>>` append is allowed)
- Force pushes, rebase on shared branches
- Credential/secret exposure

**Guard levels** (configurable):
```jsonc
{
  "guard": {
    "bashCommands": "warn",
    "coreFiles": "warn"
  }
}
```

| Level | Behavior |
|-------|----------|
| `allow` | No prompts. Power user mode. |
| `warn` | Flags dangerous commands, asks for confirmation. |
| `block` | Requires explicit override for each dangerous command. |

## Craft Practices (Not Automated)

These aren't enforced by code — they produce better results:

- **Read before edit** — always check file contents before modifying
- **grep/find/ls for exploration** — cheaper than reading whole files
- **Edit for surgical changes** — `edit` replaces exact text, safer than `write`
- **Write for new files only** — `write` overwrites everything
- **Batch independent calls** — if two reads don't depend on each other, do them in one turn

## Source

- Guard extension: `extensions/soma-guard.ts`
- Settings: `core/settings.ts` → `GuardSettings`

---

<!--
Licensed under CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Author: Curtis Mercier
-->
