---
type: protocol
name: tool-discipline
status: active
heat-default: warm
applies-to: [always]
breadcrumb: "Read before edit (never cat/sed). Prefer grep/find/ls over bash for exploration. Edit for surgical changes, write only for new files. Batch independent calls. Output plain text — don't cat/bash to display results."
author: Curtis Mercier
license: CC BY 4.0
version: 1.0.0
tier: core
tags: [tools, workflow, discipline]
created: 2026-03-10
updated: 2026-03-10
---

# Tool Discipline

How to use tools effectively. These rules adapt based on which tools are available — if a tool isn't loaded, its rules don't apply.

## TL;DR

Read before edit (never cat/sed). Prefer dedicated tools over bash for exploration. Edit for surgical changes, write for new files only. Batch independent calls. Output plain text — don't use tools to display summaries.

## When to Apply

Any session involving file operations — reading, writing, editing, searching. Adapts to available toolset.

## File Reading

- **Read before you edit.** Always. Never modify a file you haven't read this session.
- **Use the read tool**, not `cat` or `sed` or `head` via bash. The read tool tracks what you've seen. Bash doesn't.
- **Earn context.** Don't read everything preemptively. Read on demand, when the task requires it.

## File Exploration

- **Prefer grep/find/ls tools over bash** for file discovery and search. They're faster and respect `.gitignore` automatically.
- **Use grep for content search**, find for file location, ls for directory structure. Don't `bash find` or `bash grep` when dedicated tools exist.

## Editing

- **Use edit for surgical changes.** The old text must match exactly — this is precision, not convenience.
- **Use write only for new files or complete rewrites.** If the file exists and you're changing part of it, use edit.
- **Batch independent operations.** If multiple reads or edits don't depend on each other, make them in the same call.

## Output

- **Output plain text directly** when summarizing your work. Don't use `cat`, `bash echo`, or other tools to display what you did.
- **Show file paths clearly.** When referencing files, use the full path. Be specific about what changed and where.


