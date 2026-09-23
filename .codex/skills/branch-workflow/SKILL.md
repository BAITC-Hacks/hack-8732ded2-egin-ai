---
name: branch-workflow
description: |
  Enforces a consistent git branching workflow — one feature per branch,
  consistent naming, clean merges back to main. Triggers when starting a
  new feature/task the user has scoped (e.g. "let's build the calibration
  endpoint", "next feature: forecast route"), when the user says "new
  branch", "start a feature", or at the start of any of the 4 core features
  defined in the project plan (dataset loading, power curve calibration,
  Open-Meteo forecast integration, agent explanation layer). Does NOT
  trigger for small fixes/tweaks to code already merged into main within
  the same session — those can be committed directly if the user says so.
metadata:
  author: egin-ai
  project: windcast-agent
  version: "1.0"
---

## Instructions

### 1. Before starting a new feature — check current state

```bash
git status --short
git branch --show-current
```

- If there are uncommitted changes on the current branch that belong to a _different_, already-finished feature — stop and ask whether to commit/push them first (use the `auto-commit-push` skill) before switching. Never silently carry unrelated uncommitted changes into a new branch.
- If currently on a feature branch that is done and already merged, switch back to `main` first:
  ```bash
  git checkout main
  git pull origin main
  ```

### 2. Branch naming convention

```
feature/<short-kebab-case-description>
fix/<short-kebab-case-description>
chore/<short-kebab-case-description>
```

Match the branch name to the actual scope of the task, not a generic label. For this project's 4 core features, use exactly:

```
feature/dataset-loading
feature/power-curve-calibration
feature/weather-forecast-integration
feature/agent-explanation
```

For anything outside the core 4 (stretch features, fixes), derive a short descriptive name from the task — do not reuse or extend an existing branch name for an unrelated change.

### 3. Create the branch

```bash
git checkout -b <branch-name>
```

Confirm the branch was created and checked out:

```bash
git branch --show-current
```

### 4. Work stays scoped to the branch's purpose

While on a feature branch, only make changes relevant to that feature. If mid-task the user asks for something unrelated ("also fix that CORS issue while we're at it"), point out it's out of scope for this branch and ask whether to: (a) do it on this same branch anyway because it's trivial, or (b) create a separate branch for it. Default to (b) for anything non-trivial.

### 5. Finishing a feature — merge back to main

Once the feature is complete and committed (via `auto-commit-push`):

```bash
git checkout main
git pull origin main
git merge <branch-name> --no-ff
git push origin main
```

Use `--no-ff` so the merge shows up as a distinct point in history — useful later when generating the README/changelog and when explaining the day's progress.

- If the merge has conflicts, do NOT resolve them by guessing which side is "more correct." Show the conflicting sections to the user and ask how to resolve them, unless the conflict is trivial and obvious (e.g. two independent additions to the same file with no actual logical overlap).
- After a successful merge, the feature branch can be deleted locally to keep things tidy:
  ```bash
  git branch -d <branch-name>
  ```
  Do not delete the remote branch unless the user asks — leaving it on GitHub is harmless and can help if judges want to see individual feature history.

### 6. If time runs short mid-feature

If a feature branch is left incomplete near a time-boxed cutoff (the user says something like "running out of time, move on"), do NOT force-merge broken/incomplete code into `main`. Instead:

- Commit the in-progress work on its own branch (clearly marked, e.g. `git commit -m "wip: partial dataset loading, not merged"`)
- Leave `main` in its last known-working state
- Report clearly to the user what's merged vs. what's left in progress, so the README generation step later doesn't describe unfinished work as done

## Constraints

- Never work directly on `main` for a new feature — always branch first
- Never merge a branch into `main` with known failing tests/lint (run the checks from `auto-commit-push` before merging)
- Never resolve merge conflicts by guessing silently — ask, unless truly trivial
- Never force-merge incomplete/broken work into `main` under time pressure — keep `main` always in a demo-able state
