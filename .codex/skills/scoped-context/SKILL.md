---
name: scoped-context
description: |
  Prevents unnecessary re-exploration of the whole repository on every task.
  Triggers on EVERY task by default — this is a standing behavioral rule,
  not something the user has to ask for each time. It governs how much of
  the codebase Codex reads before acting. Does NOT trigger only when the
  user explicitly asks for a full audit, full refactor, or says "scan the
  whole project" — in that case, skip this skill's restrictions for that
  one task.
metadata:
  author: egin-ai
  project: windcast-agent
  version: "1.0"
---

## Instructions

Your default behavior is to read the MINIMUM amount of the repository needed to complete the current task — not to re-explore the project structure from scratch each time.

### 1. Before reading anything, check what you already know

- If `AGENTS.md` (root and/or subfolder) already describes the relevant file paths, conventions, and commands — trust it. Do not re-run broad discovery commands (`find .`, `ls -R`, reading entire directory trees) to "confirm" what AGENTS.md already states.
- If a previous turn in this same session already read a file and it hasn't changed since, do not re-read it. Reuse what's already in context.

### 2. Scope reads to the task

- If the task is "add a field to the forecast response," only open:
  - the specific route file (`backend/src/routes/forecast.js`)
  - the specific model/type file it touches
  - NOT the entire `/backend` or `/frontend` tree
- If the task is frontend-only (e.g. editing `ForecastChart.jsx`), do not read backend files unless the task explicitly involves the API contract changing.
- Use targeted commands instead of broad ones:

  ```bash
  # Good — scoped
  cat backend/src/routes/forecast.js

  # Avoid — unscoped, burns tokens
  find . -type f | xargs cat
  ```

### 3. Output limits

Always cap command output:

```bash
COMMAND 2>&1 | head -c 4000
```

Never let a command dump an entire log file, full test suite output, or large dataset CSV into context. If you need to inspect a large file, read it in a small `view_range` / `head -n 50` slice first, and only expand if the task genuinely requires more.

### 4. When re-scanning IS justified

Only re-scan more broadly when:

- The user explicitly asks for a project-wide audit, refactor, or review
- A task fails and the error message indicates the assumed file structure is wrong (e.g. "file not found") — then do a narrow, targeted search (`find . -name "specific-file.js"`), not a full tree dump
- `AGENTS.md` is missing entirely for a new/unfamiliar part of the repo

### 5. Ask before large-scope actions

If a task seems to require touching more than 3-4 files or reading a large portion of the codebase, briefly state the scope you're about to read/change before doing it, so the user can redirect if that's not what they intended.

## Constraints

- Do not run `find .`, `ls -R`, or "explore the whole repo" as a default first step for a scoped task
- Do not re-read files already seen in this session unless they were just modified
- Do not dump full file contents when a `grep`/targeted line range would answer the question
- Do not treat "let me understand the project first" as an excuse to read everything — read only what the specific task requires
