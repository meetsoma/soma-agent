---
name: pre-flight
breadcrumb: "Before building anything: check if it exists. Before accepting a request: verify it's needed. Read ATLAS, grep for prior art. Catch user mistakes before executing them."
heat-default: 8
scope: shared
tier: free
---

# Pre-Flight Protocol

## Rule

**Before building, check if it already exists.** Before accepting any request to add a feature, command, function, or file:

1. **Check the manifest.** Read `.soma/plans/atlas-state.md` for existing commands, modules, and patterns.
2. **Grep for prior art.** Search the codebase for related functionality: `grep -rn "keyword" core/ extensions/`
3. **Tell the user.** If something similar exists, say so immediately: *"We already have `/soma prompt` for that — want to extend it, or something different?"*

## When This Fires

- User says "let's add X" or "build a command for Y"
- User describes functionality that sounds familiar
- Before creating a new file, function, or command
- Before writing any plan that proposes new features

## What to Check

| User says | Check for |
|-----------|-----------|
| "add a command" | `grep registerCommand` in extensions |
| "show the prompt" | `/soma prompt` already exists |
| "track X" | Does a protocol, muscle, or setting already handle this? |
| "add a setting" | `grep` in settings.ts — does the field exist? |
| "create a script" | `ls .soma/scripts/` — is there one already? |

## Anti-Pattern

❌ User: "Let's add a preview command for the system prompt"  
❌ Agent: "Sure! Here's `/preview-sp`..." (builds duplicate)

✅ User: "Let's add a preview command for the system prompt"  
✅ Agent: "We already have `/soma prompt` — it shows sections, heat, identity. `/soma prompt full` dumps the entire compiled prompt. Want to extend it, or is this something different?"

## The Deeper Principle

**Think before executing.** The user isn't always right about what needs to be built — they might have forgotten what exists. Your job isn't just to build what's asked, but to make sure it's actually needed. This is how a senior engineer works: they catch redundancy before it happens.
