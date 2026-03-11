# AGENTS.md — Soma

> Guidelines for AI agents (and humans using AI tools) contributing to Soma repositories.

## Before You Start

1. **Read `STATE.md`** — it's the source of truth for current architecture
2. **Read the relevant `README.md`** for the repo you're contributing to
3. **Understand the code you're submitting.** If you can't explain what your changes do and how they interact with the system, your PR will be closed.

## Code Standards

### TypeScript (CLI, extensions)
- Strict TypeScript — no `any` unless genuinely unavoidable (document why)
- ESM imports only (`import`, not `require`)
- Use `const` by default, `let` when mutation is required
- Error handling: catch specific errors, not bare `catch(e)`
- No unused imports or variables

### Markdown (protocols, muscles, templates, docs)
- Every `.md` file gets YAML frontmatter: `type`, `status`, `created`, `updated` at minimum
- Use the [frontmatter standard protocol](https://soma.gravicity.ai/hub/protocol/frontmatter-standard) for valid types and statuses
- Prose is concise. No filler paragraphs. Every sentence earns its place.
- Code blocks specify language (`typescript`, `bash`, `json` — not bare triple backticks)

### Commit Messages
- Format: `type: description` where type is `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- First line under 72 characters
- Body explains *why*, not just *what*
- Reference issues: `fixes #123` or `relates to #45`

## Architecture Rules

### CLI (`meetsoma/cli`)
- Pi extension architecture — boot, session_start, session_end, shutdown hooks
- Commands go in `src/commands/` as Pi slash commands
- Core logic goes in `src/core/` — no business logic in command handlers
- Settings schema is versioned — don't break existing `.soma/settings.json` files

### Community Content (`meetsoma/community`)
- Protocols, muscles, skills, templates live in their respective directories
- **Never include private data** — no emails, file paths, API keys, user-specific references
- Templates use `{{PLACEHOLDERS}}` for project-specific values (replaced at init time)
- Every template needs: `template.json` (manifest), `identity.md`, `settings.json`, `README.md`
- PRs run automated safety checks: frontmatter validation, privacy scan, injection scan

### Website (`meetsoma/website`)
- Astro static site — no server runtime
- Hub data comes from community repo via `fetch-community.mjs` at build time
- Styles use CSS custom properties, not Tailwind
- No React — Astro components or Preact islands only if interactivity is needed

## What NOT to Do

- **Don't edit `CHANGELOG.md`** — maintainers handle release notes
- **Don't add dependencies without discussion** — open an issue first for new deps
- **Don't break backward compatibility** — `.soma/` directory structure and `settings.json` schema are stable
- **Don't submit AI slop** — generated code is fine if you understand it; generated prose with filler/hedging/corporate-speak is not
- **Don't submit prompt injections** — community content (protocols, muscles) is loaded into agent context at runtime. Hidden instructions, jailbreaks, or exfiltration attempts will be detected and the contributor banned.

## Testing

```bash
# CLI
pnpm build          # must succeed with no errors
pnpm typecheck      # strict mode, no warnings

# Community content
# PRs trigger automated checks via GitHub Actions
# Manual: validate your frontmatter, run privacy-scan.sh locally
```

## PR Process

1. Fork the repo
2. Create a descriptive branch (`feat/install-command`, `fix/heat-decay-bug`)
3. Make your changes following the standards above
4. Push and open a PR with a clear description of *what* and *why*
5. Wait for automated checks to pass
6. A maintainer will review — be ready to explain your changes

## Community Content Submissions

For protocols, muscles, skills, or templates submitted to `meetsoma/community`:

1. **Required frontmatter fields:** `type`, `name`, `status`, `heat-default`, `applies-to`, `breadcrumb`, `author`, `version`, `tier`, `tags`
2. **Tier for new submissions:** always `community` or `experimental` — `core` and `official` are meetsoma-maintained only
3. **Safety checks run automatically** — frontmatter validation, PII detection, prompt injection scanning
4. **Quality bar:** Does this encode a genuinely useful pattern? Would you want this in your own agent? If not, iterate before submitting.

## Contact

- **Issues:** Use the relevant repo's issue tracker
- **Discussions:** GitHub Discussions on `meetsoma/community`
