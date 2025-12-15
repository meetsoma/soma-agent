# Contributing to Soma

Thanks for your interest in contributing to Soma! Whether it's a bug fix, new skill, extension, or documentation improvement — all contributions are welcome.

## Getting Started

1. Fork the repo: [github.com/meetsoma/soma](https://github.com/meetsoma/soma)
2. Clone your fork
3. Install Soma globally for testing: `npm install -g @gravicity.ai/soma`

## Project Structure

```
soma/
├── extensions/          ← Soma's core extensions (TypeScript)
│   ├── soma-boot.ts     ← Identity, preload, /flush, /soma commands
│   ├── soma-header.ts   ← Branded startup header
│   └── soma-statusline.ts ← Footer with model/context/cost/git
├── docs/                ← Living documentation
├── .soma/
│   └── STATE.md         ← Architecture truth (tracked)
├── README.md
├── LICENSE              ← MIT
└── CONTRIBUTING.md      ← You are here
```

## Ways to Contribute

### 🐛 Bug Reports

Open an issue with:
- What you expected
- What actually happened
- Steps to reproduce
- Soma version (`soma --version`) and OS

### 💪 Skills

Skills are the easiest way to contribute. A skill is a markdown file that teaches Soma how to handle a specific task.

**Creating a skill:**

```
my-skill/
└── SKILL.md
```

Your `SKILL.md` needs:
- A clear **description** (Soma uses this to decide when to load it)
- Step-by-step **instructions** for the task
- Optional file references for context

**Example:**

```markdown
# Docker Deployment Skill

**Description:** Help with Docker container builds, multi-stage Dockerfiles,
and deployment to container registries.

## Instructions

When the user asks about Docker deployment:
1. Check for existing Dockerfile in the project root
2. Prefer multi-stage builds for production
3. Use .dockerignore to exclude node_modules, .git, etc.
...
```

**Where skills live:**
- `~/.soma/agent/skills/` — global (all projects)
- `.soma/skills/` — project-local

### 🔌 Extensions

Extensions hook into Soma's lifecycle. See [docs/extending.md](docs/extending.md) for the full API.

**Quick start:**

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function myExtension(pi: ExtensionAPI) {
  pi.registerCommand("hello", {
    description: "Say hello",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Hello!", "info");
    },
  });
}
```

Save as `my-extension.ts` in `~/.soma/agent/extensions/` (global) or `.soma/extensions/` (project-local).

### 📝 Documentation

Docs live in `docs/`. Edit or add pages:
- `how-it-works.md` — breath cycle, identity, muscles
- `getting-started.md` — install, usage, commands
- `memory-layout.md` — `.soma/` structure
- `extending.md` — skills + extension development

### 🧠 Core Extensions

To contribute to Soma's built-in extensions (`extensions/`):

1. Read the existing code — each file is self-contained
2. Test your changes by symlinking to `~/.soma/agent/extensions/`
3. Keep it clean — no external dependencies beyond Pi's packages
4. Soma extensions should **not** require a vault, agent profiles, or any infrastructure beyond `.soma/`

## Code Style

- TypeScript, targeting Node 20+
- Use Pi's extension API types: `@mariozechner/pi-coding-agent`
- Concise. Direct. Ship-oriented.
- Comments explain *why*, not *what*
- No unnecessary abstractions

## Pull Requests

1. Branch from `main`
2. Keep PRs focused — one feature or fix per PR
3. Include a description of what changed and why
4. Test with a live Soma session before submitting

## Questions?

- Open a [Discussion](https://github.com/meetsoma/soma/discussions)
- Join the community (links TBD)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
