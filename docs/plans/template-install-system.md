---
type: plan
status: seed
created: 2026-03-09
updated: 2026-03-09
priority: high
tags: [templates, install, security, settings, scaffolding]
related: [agent-templates, repo-split, light-core-architecture]
---

# Template Install System

## Concept

A `.soma` can be bootstrapped from a **template file** — a portable config that declares what protocols, skills, settings, and identity shape to install. Templates are shareable: created on the Soma website, exported from an existing soma, or hand-written.

```bash
soma init --template marketing-team.soma.yaml
soma init --template https://soma.gravicity.ai/templates/oss-maintainer
soma init --template ./my-team-template.yaml
```

## Template File Format

```yaml
# marketing-team.soma.yaml
name: marketing-team
version: 1.0.0
description: "Soma template for marketing content teams"
author: Soma Team
source: https://soma.gravicity.ai/templates/marketing-team

# What to install
protocols:
  - name: breath-cycle
    source: official          # from meetsoma/protocols registry
    heat-default: hot
  - name: brand-voice
    source: official
    heat-default: warm
  - name: content-calendar
    source: community/acme-corp    # third-party — triggers warning
    heat-default: warm

skills:
  - name: social-preview-gen
    source: official          # from meetsoma/skills registry
  - name: seo-optimizer
    source: community/seo-tools    # third-party — triggers warning + security check

settings:
  muscles:
    tokenBudget: 3000         # content teams need more context
  protocols:
    maxFullProtocolsInPrompt: 4
  heat:
    autoDetect: true

identity:
  template: |
    You help the marketing team create consistent, on-brand content.
    You follow the brand voice protocol for tone and messaging.
    You track content calendar deadlines.

# Optional: pre-seed muscles from shared team knowledge
muscles:
  - name: brand-guidelines
    source: https://internal.acme.com/soma/muscles/brand-guidelines.md
    # ⚠️ External URL — security check required
```

## Trust Tiers

| Tier | Source | Install behavior |
|------|--------|-----------------|
| **Official** | `meetsoma/protocols`, `meetsoma/skills` | Install silently. Verified, signed. |
| **Verified** | Community packages that passed review | Install with note: "verified by Soma team" |
| **Community** | Any published package | ⚠️ Warning: "unverified community package — review before trusting" |
| **External URL** | Raw URLs, custom repos | 🔴 Security check required. Sandboxed audit before install. |

## Security Sandbox — The Auditor Baby

For unverified/external content, Soma spawns an **isolated child soma** (a "baby") that:

1. Lives in a temp directory inside the project root (`.soma/.audit/`)
2. Has NO access to the parent's memory, secrets, or identity
3. Receives ONLY the candidate file (protocol/skill/muscle)
4. Runs a security audit:
   - Scans for: shell injection patterns, encoded payloads, prompt injection attempts
   - Checks: does it reference paths outside `.soma/`? Does it try to read env vars?
   - For skills with code: static analysis of any scripts/extensions
5. Reports: PASS / WARN (with details) / FAIL (blocked)
6. User confirms or rejects based on report
7. Audit baby is destroyed after check

```
.soma/
├── .audit/                    ← temp, gitignored, created per-check
│   └── sandbox-{hash}/       ← isolated child soma
│       ├── candidate.md      ← the file being audited
│       ├── report.md         ← audit results
│       └── .soma/            ← minimal soma (audit protocols only)
```

This is the same parent-child architecture (PI118) used for delegation — the auditor is just a specialized child with a locked-down scope.

## Template Sources

### Soma Website (soma.gravicity.ai)
- Template builder UI: pick protocols, skills, settings from dropdowns
- Export as `.soma.yaml` file or shareable URL
- Browse community templates with trust ratings

### CLI Export
```bash
soma export-template > my-setup.soma.yaml
# Exports current protocols, skills, settings (NOT identity or memories)
```

### Direct Share
- Send `.soma.yaml` file to teammate
- They run `soma init --template that-file.yaml`
- Same trust tier rules apply

## Settings Integration

Templates set initial `settings.json` values. The settings system (G7, `core/settings.ts`) already supports deep merge — template values become the project-level settings, overrideable by the user later.

Template settings are a **starting point**, not a lock. Users can always edit `settings.json` after init.

## Relation to Existing Plans

| Plan | Connection |
|------|-----------|
| `agent-templates.md` | Predecessor — this supersedes the simpler "baby from clone" concept |
| `light-core-architecture.md` | Parent-child model powers the audit sandbox |
| `repo-split.md` | Public repo needs template support as a launch feature |
| `plugin-architecture.md` | Skills install from registry, same as template references |

## Open Questions

1. **Template versioning** — how to handle breaking changes in protocol specs that templates reference?
2. **Template composition** — can templates extend other templates? (`extends: base-team.soma.yaml`)
3. **Signing** — how to sign official/verified packages? GPG? Sigstore?
4. **Registry hosting** — npm-style? GitHub releases? Custom API?
5. **Update mechanism** — `soma update` to re-apply template with newer versions of protocols/skills?

## What's NOT in Scope (Yet)

- Runtime template switching (templates are init-time only)
- Template marketplace / ratings
- Paid templates
- Template auto-discovery from project type
