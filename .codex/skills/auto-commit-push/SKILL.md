---
name: auto-commit-push
description: |
  Automatically commits and pushes changes to the repository after a task
  or feature is completed. Triggers when the user asks to "commit", "push",
  "save changes", "commit after finishing this feature", or at the end of a
  task if the user has instructed to commit after every feature. Does NOT
  trigger for incomplete, in-progress, or broken changes — the code must be
  working first.
metadata:
  author: egin-ai
  project: windcast-agent
  version: "1.0"
---

## Instructions

You help commit and push changes to the git repository. Follow the steps strictly in order, do not skip checks.

### 1. Pre-commit check

```bash
git status --short
```

- If there are no changes, say so and stop — nothing to commit.
- If there are unexpected files (node_modules, .env, dist/, build/, raw dataset dumps larger than a few MB) — do NOT add them. Check `.gitignore` and suggest adding those paths if missing.

### 2. Quick sanity check

Run lint/tests if configured (check package.json → scripts) in both `/backend` and `/frontend` if the change touches both:

```bash
npm run lint 2>&1 | tail -c 3000
npm test 2>&1 | tail -c 3000
```

- If a script exists and fails, **stop and report the error**, do not commit broken code.
- If no such script exists, skip — do not invent commands.
- For this project specifically: if the change touches `powerCurve.js` or the calibration logic, also run the calibration script if one exists (e.g. `npm run calibrate:test`) to confirm MAE/RMSE didn't silently break.

### 3. Commit message (Conventional Commits)

```bash
git diff --cached --stat
git diff --stat
```

Prefixes: `feat:` `fix:` `chore:` `docs:` `refactor:`

Format:
```
<type>: <short one-sentence description>

<optional: 1-2 lines of detail for non-trivial changes>
```

No generic messages ("update", "fix stuff") — derive the message from the actual diff content.

### 4. Commit

```bash
git add <specific changed files, not a blind "git add .">
git commit -m "<generated message>"
```

If the user explicitly asks to commit everything, `git add -A` is fine — but re-check `git status --short` first for junk files.

### 5. Confirm the remote/destination BEFORE pushing

Never assume `origin` points to the right place. Check it explicitly every time:

```bash
git remote -v
```

- If there is exactly one remote named `origin` and its URL matches the repository documented in `AGENTS.md` (or the one the user has referenced earlier in the session) — proceed.
- If there are multiple remotes (e.g. `origin` + `upstream`, or a fork setup) — do NOT guess which one to push to. Ask the user which remote to use, or use the one explicitly named in `AGENTS.md` under a "Remote" or "Repository" field.
- If `git remote -v` returns nothing (no remote configured yet) — stop and ask the user for the repository URL before doing anything else. Do not invent or guess a GitHub URL.
- If the user gives a specific path/URL in their instruction (e.g. "push to https://github.com/BAITC-Hacks/hack-8732ded2-egin-ai.git" or "push to the hackathon repo"), use exactly that — set it explicitly if it's not already configured:
  ```bash
  git remote add origin <url>   # only if no origin exists yet
  # or, if origin exists but points elsewhere:
  git remote set-url origin <url>
  ```
  Always confirm with the user before overwriting an existing `origin` URL — this is a destructive action if done by mistake.

Record the confirmed remote URL in `AGENTS.md` under a "Repository" note once established, so future tasks in this project don't need to re-ask.

### 6. Push

```bash
git branch --show-current
```

- If branch is `main`/`master` and there are signs of multiple contributors — warn and ask for confirmation before pushing directly.
- If it's a feature branch, push without extra questions:

```bash
git push origin <current-branch>
# first push of a new branch:
git push -u origin <current-branch>
```

### 7. Conflicts

- If push is rejected, do NOT force-push automatically. Report the conflict and suggest `git pull --rebase` or manual resolution.
- Never use `--force` without explicit permission in that specific moment.

### 8. Summary

Report: branch pushed, files changed count, final commit message.

## Constraints

- Never commit `.env`, `node_modules/`, `dist/`, `build/`, API keys, or large raw dataset files
- Never `git push --force` without explicit in-the-moment permission
- Never commit code with failing tests/lint
- Do not invent npm scripts that don't exist in package.json
- Never guess a remote URL — check `git remote -v`, ask if ambiguous or missing, and never overwrite an existing `origin` without confirmation


