# Extending Soma

<!-- tldr -->
Built on Pi — inherits full extension system. Skills: markdown instructions in `.soma/skills/` or `~/.soma/agent/skills/`. Extensions: TypeScript hooks into agent lifecycle (before_agent_start, tool_result, session_shutdown). Built-in extensions: soma-boot (identity + protocols + muscles), soma-header (branded σῶμα header), soma-statusline (context/cost/git footer).
<!-- /tldr -->

Soma is built on [Pi](https://github.com/badlogic/pi-mono) and inherits its full extension system. You can add skills, extensions, and custom tools.

## Skills

Skills are specialized instructions that load when a task matches their description.

### Installing Skills

Place skill directories in one of these locations:

| Location | Scope |
|----------|-------|
| `.soma/skills/` | Project-local (only loads in this project) |
| `~/.soma/agent/skills/` | Global (loads for all projects) |

> **Planned:** `soma install skill <source>` command for automated installation from registries (PI115).

### Creating Skills

Create a directory with a `SKILL.md` file:

```
my-skill/
└── SKILL.md
```

**SKILL.md** contains:
- A `description` that tells Soma when to load it
- Instructions for how to handle the task
- Optional file references for additional context

```markdown
# My Custom Skill

**Description:** Help with deploying to production servers.

## Instructions

When the user asks about deployment:
1. Check the deployment config at `deploy.yaml`
2. Verify all tests pass
3. ...
```

Place in `.soma/skills/` (project) or `~/.soma/agent/skills/` (global).

## Extensions

Extensions are TypeScript files that hook into Soma's lifecycle events.

### Extension Locations

| Location | Scope |
|----------|-------|
| `.soma/extensions/` | Project-local (loads when CWD is in this project) |
| `~/.soma/agent/extensions/` | Global (loads for all projects) |

### Writing an Extension

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function myExtension(pi: ExtensionAPI) {
  // Register a command
  pi.registerCommand("hello", {
    description: "Say hello",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Hello from my extension!", "info");
    },
  });

  // Hook into session lifecycle
  pi.on("session_start", async (_event, ctx) => {
    // Do something on session start
  });

  pi.on("turn_end", async (_event, ctx) => {
    // Do something after each agent turn
  });
}
```

### Available Events

| Event | When |
|-------|------|
| `session_start` | Session loads |
| `session_switch` | User runs /new or resumes |
| `turn_start` | Agent begins processing |
| `turn_end` | Agent finishes processing |
| `message_end` | Message fully rendered |
| `tool_result` | Tool call completes |
| `before_agent_start` | Before each agent turn (can modify system prompt) |
| `session_shutdown` | Session closing |

### Available APIs

| API | What it does |
|-----|-------------|
| `pi.registerCommand(name, opts)` | Add a `/command` |
| `pi.sendUserMessage(text, opts)` | Inject a message |
| `pi.appendEntry(type, data)` | Persist state in session |
| `pi.on(event, handler)` | Listen to lifecycle events |
| `pi.getThinkingLevel()` | Current thinking level |
| `ctx.ui.notify(msg, level)` | Show notification |
| `ctx.ui.setHeader(factory)` | Custom header component |
| `ctx.ui.setFooter(factory)` | Custom footer component |
| `ctx.getContextUsage()` | Token usage stats |
| `ctx.newSession(opts)` | Create new session |

See the [Pi extension docs](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md) for the full API reference.

## Soma's Built-in Extensions

Soma ships with three extensions:

| Extension | Purpose |
|-----------|---------|
| `soma-boot.ts` | Identity loading, preload, /flush, /soma commands |
| `soma-header.ts` | Branded σῶμα header with memory status |
| `soma-statusline.ts` | Footer with model, context %, cost, git status |

These install to `~/.soma/agent/extensions/` and can be customized or replaced.
