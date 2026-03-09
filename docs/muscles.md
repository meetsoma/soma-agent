# Muscles

<!-- tldr -->
Learned patterns in `.soma/memory/muscles/` as markdown with frontmatter (type, status, topic, keywords, heat, loads). Loaded by heat within token budget (default: 2000). Hot (≥5) = full body, warm (≥1) = digest only, cold = name listed. Digest blocks between `<!-- digest:start -->` / `<!-- digest:end -->` markers. Write digests — they're what loads 90% of the time. `/pin` to keep hot, `/kill` to drop cold.
<!-- /tldr -->

Muscles are **learned patterns** — reusable knowledge that Soma builds from experience. Unlike protocols (which are behavioral rules you write), muscles emerge organically from work. They're Soma's playbook.

## How Muscles Form

Muscles start as observations. When Soma notices a pattern across sessions — a deployment process, a code style, an API workflow — she writes it down as a muscle file in `.soma/memory/muscles/`.

A muscle is a markdown file with frontmatter:

```markdown
---
type: muscle
status: active
topic: [deployment, vercel, astro]
keywords: [deploy, build, preview, production]
created: 2026-03-09
updated: 2026-03-09
heat: 3
loads: 0
---

# Deployment — Muscle

> Learned patterns for deploying Astro sites to Vercel.

<!-- digest:start -->
> **Deployment** — build with `pnpm build`, deploy with `npx vercel --prod`.
> Always verify with curl after deploy. Check build output for page count changes.
<!-- digest:end -->

## Full Process

1. Run `pnpm build` and check for errors
2. Verify page count matches expectations
3. Deploy with `npx vercel --prod`
4. Confirm alias URL responds with 200
5. Commit and push
```

## Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"muscle"` | Always `muscle` |
| `status` | `active \| dormant \| retired` | Controls discovery. Only `active` muscles load. |
| `topic` | `string[]` | What this muscle covers (broad categories) |
| `keywords` | `string[]` | Finer search terms for lookup |
| `heat` | `number` | Current heat level — determines loading tier |
| `loads` | `number` | How many times loaded at boot (tracked automatically) |
| `created` | `date` | When the muscle first formed |
| `updated` | `date` | Last modification |

## The Digest System

Muscles can be large — a full logo design muscle might be 200+ lines. Loading all of that into the system prompt wastes context. The **digest system** solves this with a two-tier approach.

Every muscle should have a **digest block** between markers:

```markdown
<!-- digest:start -->
> **Topic** — concise summary of the key patterns
> - Bullet points the agent needs at a glance
> - 2-6 lines max
<!-- digest:end -->
```

When a muscle loads as **warm** (digest tier), only the content between `<!-- digest:start -->` and `<!-- digest:end -->` enters the prompt. When it loads as **hot**, the full body loads.

No digest block? The muscle can only load as hot (full) or cold (not at all). Write digests.

## Heat & Loading Tiers

Like protocols, muscles use the [heat system](/docs/protocols#heat-system) to decide what loads:

| Tier | Heat | What Loads | When |
|------|------|-----------|------|
| 🔥 Hot | ≥ `fullThreshold` (default: 5) | Full body | Heavily used, recent |
| 🟡 Warm | ≥ `digestThreshold` (default: 1) | Digest block only | Occasionally used |
| ❄️ Cold | 0 | Name listed, nothing loaded | Unused, decayed |

Loading respects a **token budget** (default: 2000 estimated tokens). Hot muscles load first (up to `maxFull`, default: 2), then warm muscles fill remaining budget (up to `maxDigest`, default: 8). Cold muscles are listed by name so the agent knows they exist.

All thresholds are configurable in [settings.json](/docs/configuration#muscles).

## Writing a Muscle Manually

You don't have to wait for Soma to discover patterns. Create a muscle directly:

```bash
touch .soma/memory/muscles/my-workflow.md
```

```markdown
---
type: muscle
status: active
topic: [testing, ci]
keywords: [jest, vitest, test-runner]
heat: 3
loads: 0
---

# Testing Workflow — Muscle

<!-- digest:start -->
> **Testing** — run `pnpm test` before every commit. Use vitest for unit tests.
> Coverage threshold is 80%. CI runs the same suite.
<!-- digest:end -->

## Full Process

...your detailed patterns here...
```

Set `heat: 3` or higher so it loads on next boot. Heat will decay naturally if the muscle isn't used.

## Where Muscles Live

```
.soma/memory/muscles/
├── svg-logo-design.md      ← learned from logo sessions
├── deployment.md           ← learned from deploy workflows
├── github-app-auth.md      ← learned from auth patterns
└── social-preview-gen.md   ← learned from OG image work
```

Project-level only. Muscles don't inherit from parent `.soma/` directories (yet — see `memory.flowUp` in [configuration](/docs/configuration)).

## Heat Commands

| Command | Effect |
|---------|--------|
| `/pin my-muscle` | Bumps heat by `pinBump` (default: +5). Keeps it loaded. |
| `/kill my-muscle` | Drops heat to 0. Won't load until used again. |

## Tips

- **Keep muscles focused.** One muscle per domain. Don't mix deployment and testing.
- **Write digests first.** The digest is what loads 90% of the time. Make it good.
- **Let heat do the work.** Don't manually set heat to 15 on everything. Let usage patterns decide what matters.
- **Retire, don't delete.** Set `status: retired` instead of removing. The knowledge stays searchable.
- **Update, don't duplicate.** When patterns evolve, update the existing muscle. Don't create `deployment-v2.md`.
