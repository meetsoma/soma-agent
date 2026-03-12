---
type: protocol
name: content-triage
status: active
heat-default: warm
applies-to: [always]
breadcrumb: "New AMPS content gets classified: bundled (ships with Soma), hub (on SomaHub), workspace (project-local), or internal (dev tooling). Scope determines distribution. Tier determines trust."
author: Curtis Mercier
license: CC BY 4.0
version: 1.0.0
tier: core
scope: hub
tags: [content, distribution, amps]
created: 2026-03-12
updated: 2026-03-12
---

# Content Triage Protocol

## TL;DR
- Every new muscle, protocol, automation, or skill gets a **scope** (where it lives) and **tier** (who wrote it)
- **scope: bundled** = ships with `meetsoma` npm. Only for Soma's DNA (breath-cycle, heat-tracking, session-checkpoints, pattern-evolution)
- **scope: hub** = on SomaHub, available via `/install`. Default for community content.
- **scope: workspace** = project `.soma/` only. Private patterns, never shared.
- **scope: internal** = Gravicity dev tooling. May be forked for hub versions.

## When to Apply

When creating, promoting, or reviewing any AMPS content.

## Decision Tree

```
New content created
  ├─ Is this specific to one project's repos/workflow/secrets?
  │   YES → scope: workspace
  │   │   Could a sanitized version help others?
  │   │     YES → add to hub candidate list (see below)
  │   │     NO → stays workspace
  │   │
  │   NO → Is this fundamental to how Soma works?
  │       YES → scope: bundled (must be tier: core)
  │       │   Without this, does Soma boot correctly?
  │       │     YES → truly bundled
  │       │     NO → scope: hub (install via template)
  │       │
  │       NO → scope: hub
  │           Is it opinionated (communication style, tool preferences)?
  │             YES → belongs in a template's requires, not forced
  │             NO → general-purpose, tier: community or official
```

## Scope Rules

| Scope | Tier allowed | Heat system? | Published? |
|-------|-------------|-------------|-----------|
| bundled | core only | Yes | npm package |
| hub | any | Yes | SomaHub |
| workspace | n/a (private) | Yes | Never |
| internal | n/a (private) | No | Never |

## Hub Promotion Triggers

Workspace content should be evaluated for hub promotion when:
- Muscle heat reaches **5+** and loads reach **3+**
- Pattern has been applied across **2+ projects**
- Another user or agent asks about the same pattern
- Content is **not project-specific** after removing paths/names

## Hub Promotion Process

1. Copy workspace content to a new file
2. Strip all project-specific references (paths, repo names, API keys, usernames)
3. Generalize the pattern (replace "our Vercel deploy" with "deployment pipeline")
4. Add proper frontmatter: `scope: hub`, appropriate `tier`
5. Validate: `./scripts/validate-frontmatter.sh`
6. Submit via `/share` or PR to `meetsoma/community`

## Bundled Content Criteria

Content should only be `scope: bundled` if ALL of these are true:
- Soma doesn't function correctly without it
- It's not opinionated (no style preferences, no tool choices)
- It applies to every user regardless of workflow
- It's authored and maintained by Gravicity (`tier: core`)

Currently bundled: breath-cycle, heat-tracking, session-checkpoints, pattern-evolution.

## Release Impact

- Changing bundled content = version bump required (affects every install)
- Changing hub content = no version bump (users pull on `/install`)
- Scope changes (hub→bundled or bundled→hub) = minor version bump
