---
type: plan
status: complete
updated: 2026-03-09
created: 2026-03-09
topic: github-app-strategy
---

# GitHub App Strategy — Open Questions

> How should meetsoma's GitHub App(s) work across our ecosystem and for future users?

## Current State

- **Private app `meetsoma`** created, installed on meetsoma org
- App ID: 3043971, full repo + org permissions
- Just made public so we can install on Gravicity org too
- Used by agents (Zenith now) for bot commits and repo management

## The Two-App Model

### App 1: `meetsoma` (Internal)
- **Who uses it:** Us (Zenith, Soma, Curtis)
- **Installed on:** meetsoma + Gravicity orgs
- **Permissions:** Everything — admin, contents, secrets, workflows, org management
- **Purpose:** Full control bot. Commits as `meetsoma[bot]`, manages repos, CI, deploys
- **Visibility:** Public (so we can install cross-org) but effectively private — no one else would install it

### App 2: `soma` (User-facing — future)
- **Who uses it:** Anyone who installs Soma
- **Installed on:** User's personal account or org
- **Permissions:** Minimal — contents read/write, maybe issues, metadata
- **Purpose:** Soma reads/writes to user's repos during sessions
- **Visibility:** Public, listed, discoverable
- **Install flow:** `soma init` → OAuth → grant repo access → done

## Open Questions

### 1. Do we need two apps?
Could one app serve both purposes with different permission tiers? GitHub Apps have fixed permissions — you can't install the same app with different permissions per org. So probably yes, two apps.

### 2. Public app listing
- Should `meetsoma` (internal) be listed on GitHub Marketplace? **Probably not.**
- Should `soma` (user-facing) be listed? **Eventually yes.**
- Marketplace listing requires: description, screenshots, pricing plan (free), verified domain
- Reference: https://docs.github.com/en/apps/publishing-apps-to-github-marketplace

### 3. Website integration
- Should soma.gravicity.ai link to the app? Where?
  - Docs page: "Connect to GitHub" guide
  - Install page: `soma.gravicity.ai/install` → redirects to GitHub app install
  - Dashboard (Soma OS): GitHub integration settings
- The public app would have a **callback URL** pointing to our website for OAuth

### 4. What does the user-facing app actually DO?
Possibilities:
- **Read repos** — Soma understands your codebase structure
- **Write files** — Soma pushes changes (blog posts, docs, config)
- **Create PRs** — `/publish` ritual creates a PR instead of direct push
- **Manage issues** — Soma triages, labels, closes issues
- **CI status** — Soma checks build status before deploying
- **Webhooks** — React to pushes, PRs, issue comments

### 5. Auth in the CLI
How does `soma` CLI authenticate with GitHub?
- Option A: Reuse user's `gh` auth (simplest, no app needed)
- Option B: OAuth flow through the Soma app (proper, scoped)
- Option C: PAT that user provides (manual, ugly)
- Leaning: **A for now, B when we ship the public app**

### 6. Bot identity for users
When Soma commits to a user's repo, what identity?
- `soma[bot]` via the public app — clean, branded
- User's own identity — simpler, no app needed
- Configurable per-project in `.soma/config`?

### 7. Security considerations before going public
- [ ] Audit what the internal app can access
- [ ] Ensure private key is NEVER in any repo (gitignored in .soma/secrets/)
- [ ] Rate limiting — don't burn through 5,000/hr on automation
- [ ] Token rotation plan — what if PEM is compromised?
- [ ] Webhook endpoint security (when we enable webhooks)

### 8. Should the app be in a repo?
The app itself is just credentials + a settings page on GitHub. But:
- Auth scripts → `products/soma/.soma/scripts/`
- Docs → `products/soma/.soma/docs/github-apps.md`
- Webhook handler (future) → could be a Vercel serverless function in the website repo
- Or its own repo: `meetsoma/integrations` or `meetsoma/github-app`

## Decisions Made
- ✅ Private app name: `meetsoma` → `meetsoma[bot]`
- ✅ Broad permissions on internal app (tighten later never)
- ✅ Credentials in `.soma/secrets/` (gitignored)
- ✅ Two-app model (internal + user-facing)

## Decisions Needed
- [ ] When to build the public `soma` app (after CLI ships?)
- [ ] Where webhook handler lives
- [ ] Whether to list on GitHub Marketplace
- [ ] CLI auth strategy (gh reuse vs OAuth)
- [ ] Bot commit identity for end users

## Priority
Low — internal app works. Public app is a post-launch concern. Revisit when CLI (PI115) and ritual system (PI110) are further along.
