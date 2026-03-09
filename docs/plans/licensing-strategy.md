---
type: plan
status: complete
updated: 2026-03-07
created: 2026-03-09
topic: licensing-ip-strategy
---

# Licensing & IP Strategy — Gravicity / Soma / Curtis

> How to protect intellectual property while keeping things visible, usable, and community-friendly.

## The Core Idea

Not everything needs to be MIT. Not everything needs to be private. There's a middle ground:

**Source-available but proprietary** — code is public (readable, learnable), but you can't fork it, redistribute it, or build competing products with it. You can USE it with Soma.

## Three License Tiers

### Tier 1: Open Source (MIT)
Free to use, fork, modify, redistribute. Community grows here.

**What goes here:**
- Soma CLI wrapper (`meetsoma/cli`)
- Website source (`meetsoma/website`)
- Media/brand assets (`meetsoma/media`)
- Basic extensions (starter templates)
- Community skills
- Docs, guides, tutorials

**Why:** Adoption. People install Soma because it's open. Low barrier.

### Tier 2: Source-Available / Proprietary Protocol
Code is **public and readable** but protected. Can't redistribute, can't build competing products. Free to use with Soma.

**What goes here:**
- **Memory Protocol** — the system for how agents grow memory (muscles, preloads, flush cycles, promotion). This is Curtis's invention. Others can USE it through Soma, but can't take the protocol and build their own agent with it.
- **Statusline Pro** — enhanced agent UI. Free to use, visible source, but proprietary.
- **Boot/identity system** — how Soma discovers identity, loads preloads, scaffolds `.soma/`
- **Flush pipeline** — steno-brief, auto-compaction, context management
- **Parent-child memory** — how parent `.soma/` aggregates child memories

**License options:**
- **BSL (Business Source License)** — MariaDB's model. Source is public, free for non-competing use. After X years, converts to open source. Used by: Sentry, CockroachDB, HashiCorp.
- **SSPL (Server Side Public License)** — MongoDB's model. If you offer it as a service, you must open-source your entire stack. Controversial but effective.
- **ELv2 (Elastic License v2)** — Can't offer as managed service, can't circumvent license keys. Used by: Elastic, Grafana.
- **Custom "Gravicity Protocol License"** — Write our own. "Free to use with Soma. Free to read/learn. Cannot redistribute, cannot use in competing agent products."

**Leaning: BSL or custom Gravicity license.**

### Tier 3: Private / Internal Only
Never public. Trade secrets, infra, proprietary integrations.

**What goes here:**
- Pi fork (`Gravicity/pi-agent`)
- Infrastructure configs
- Client work
- Internal agent tooling
- Vault contents

## How This Maps to Repos

| Repo/Component | License | Visibility |
|----------------|---------|-----------|
| `meetsoma/cli` | MIT | Public |
| `meetsoma/website` | MIT | Public |
| `meetsoma/media` | CC BY-SA 4.0 | Public |
| `meetsoma/agent` (extensions) | **BSL or Gravicity License** | Public (when ready) |
| Memory Protocol spec | **Gravicity License** | Public |
| Statusline Pro | **Gravicity License** | Public |
| Boot/identity system | **Gravicity License** | Public |
| Community skills | MIT | Public |
| Premium skills | **Gravicity License** | Public |
| `Gravicity/pi-agent` | Private | Private |
| `Gravicity/io` | Private | Private |
| Infra/vault | Private | Private |

## The "Protocol" Concept

Curtis's key insight: the **memory system is a protocol**, not just code. Like HTTP or Git, it's a way of doing things. But unlike those, it's not a standard — it's proprietary innovation.

**What the protocol includes:**
- Muscle format (frontmatter, digest blocks, heat/loads tracking)
- Preload/continuation system (session state → flush → resume)
- Identity discovery (`.soma/identity.md`, project scaffolding)
- Three-layer extensibility (extensions/skills/rituals)
- Parent-child memory aggregation
- Flush pipeline (threshold → extract → write → continue)
- ATLAS method (architecture truth docs)

**This could become:**
- A published spec document (like a whitepaper)
- Referenced by the license: "The Gravicity Agent Memory Protocol"
- Others can implement compatible tools, but only if they credit and don't compete
- Or: others can ONLY use it through Soma (stricter)

## Curtis's Personal Brand

Some IP is Curtis's personally, not Gravicity's:
- The protocol concepts (invented by Curtis)
- Agent identity philosophy
- "The body that grows" / σῶμα branding

Options:
- Curtis licenses IP to Gravicity (keeps personal ownership)
- Gravicity owns it (simpler, but less personal protection)
- Dual: Curtis owns the protocol spec, Gravicity owns the implementation

## Open Questions

1. **Which license?** BSL has precedent and is understood. Custom gives full control but needs a lawyer.
2. **When to apply?** Before making `meetsoma/agent` public. PI116 (public-ready audit) should include license selection.
3. **Protocol spec document** — should we write a formal spec for the memory protocol? Could be published on the website.
4. **Personal vs corporate IP** — does Curtis want to own the protocol personally and license to Gravicity?
5. **Enforcement** — how do we handle violations? BSL is tested in court. Custom isn't.
6. **Community perception** — BSL is accepted in dev tools. SSPL is controversial. Custom might scare contributors.
7. **Contributor agreement** — if community contributes skills/extensions, who owns those contributions? CLA needed?

## Examples From Industry

| Company | Model | License |
|---------|-------|---------|
| **HashiCorp** (Terraform) | Open core → BSL | BSL 1.1 (was MPL) |
| **Elastic** (Elasticsearch) | Open core → ELv2 | Elastic License v2 |
| **Sentry** | Open core → BSL | BSL 1.1 |
| **MongoDB** | Open core → SSPL | SSPL |
| **Grafana** | Open core → AGPL | AGPL v3 |
| **GitLab** | Open core | MIT (CE) + proprietary (EE) |
| **Docker** | Open core | Apache 2.0 + proprietary |

GitLab's model is closest to what we'd want: community edition is MIT, enterprise features are proprietary but source-available.

## Priority

Medium-high. Should be decided BEFORE `meetsoma/agent` goes public (PI116). No rush for implementation, but the decision shapes everything.
