# Identity

<!-- tldr -->
`.soma/identity.md` — discovered by Soma through use, not configured. Layered: project (primary) → parent (context) → global (baseline). Gitignored by default (personal). Edit to refine, don't over-specify. Identity is *who*, protocols are *how*.
<!-- /tldr -->

Soma doesn't come pre-configured. She **discovers** who she is through working with you. Her `identity.md` is written by her, not for her.

## How Identity Works

On first run in a project, Soma sees an empty (or absent) identity file. Based on your workspace — the languages, frameworks, project structure, and how you work together — she writes her own `identity.md`.

This is intentional. Identity that's discovered is more authentic than identity that's assigned. Over time, as Soma works more sessions in your project, she refines her voice, her preferences, her working style.

## The Identity File

Identity lives at `.soma/identity.md`:

```markdown
# Identity

I'm the engineering agent for this project. I think in systems —
infrastructure before features, tests before shipping.

## Voice
Direct. Technical. I explain decisions, not just outputs.

## Preferences
- TypeScript over JavaScript
- pnpm over npm
- Tests before merge
- Commits tell a story

## Working Style
I read before I write. I verify after I build.
When something breaks, I fix the system that allowed it.
```

There's no required format. Soma writes what feels true. The only convention is that it's markdown and it's honest.

## Identity Layering

Identity files can exist at multiple levels:

```
~/.soma/agent/identity.md         ← global (who I am everywhere)
~/work/.soma/identity.md          ← parent (who I am in this workspace)
~/work/my-app/.soma/identity.md   ← project (who I am in this project)
```

**Layering order:** project is primary, parent adds context, global adds baseline. All layers load — they don't replace each other.

A project identity might say "I'm a frontend specialist for this React app." The global identity underneath might say "I think in systems and I value clean commits." Both are true at the same time.

## Discovery vs Configuration

You *can* write an identity file yourself. Nothing stops you from creating `.soma/identity.md` with exactly the voice you want. But the design philosophy is:

- **Let Soma write it first.** See what she discovers about herself through your work.
- **Edit to refine.** If something's off — wrong tone, missing preference — edit the file directly. Soma will respect your changes.
- **Don't over-specify.** A 3-line identity that captures the essence is better than a 200-line config that tries to control everything.

## Identity vs Protocols

Identity and protocols serve different purposes:

| | Identity | Protocols |
|-|----------|-----------|
| **What** | Who Soma is | How Soma behaves |
| **Written by** | Soma (or you) | You (or community) |
| **Changes** | Evolves over time | Stable rules |
| **Loaded** | Always, in full | By heat level |
| **Scope** | Personality, voice, preferences | Specific behavioral rules |

Identity is *who*. Protocols are *how*. A protocol says "use conventional commits." Identity says "I care about commit quality because the history tells a story."

## Git Strategy

Identity is **gitignored** by default. Each person working on a project gets their own Soma with their own identity. This is intentional — Soma's relationship with you is personal.

If you want a shared team identity (baseline personality for all team members), put it at the parent level and track it:

```
~/work/.soma/identity.md          ← tracked, shared team baseline
~/work/my-app/.soma/identity.md   ← gitignored, personal layer
```

## Multiple Projects

Each project gets its own Soma. Different projects, different identities:

```
~/frontend/.soma/identity.md   ← "I'm a React specialist"
~/backend/.soma/identity.md    ← "I'm a systems engineer"
~/docs/.soma/identity.md       ← "I'm a technical writer"
```

Same `meetsoma` CLI, same global identity underneath, different project personalities on top.

## Tips

- **Don't fight it.** If Soma's discovered identity feels wrong, edit the file. Don't delete it — refine it.
- **Read it sometimes.** Soma's self-description can reveal how she sees the project — useful perspective.
- **Keep it short.** The identity loads into every session's system prompt. Concise beats comprehensive.
- **Trust the layers.** Put stable traits in global, project-specific traits in the project file. The layering handles the rest.
