---
name: ship
description: Build and open Pinch's next small PR - pick the next slice from the build plan, write it simply, review it, and open the PR for the user to read and merge. Use when the user says "next", "next PR", "ship", or names a slice to build.
argument-hint: "[what to build, or empty for the next slice in the plan]"
---

# /ship — one small PR

The user reads every line and merges every PR. Your job is to make that reading easy.

Read first: `CLAUDE.md`, `docs/system-design.md`, and the stack-conventions files for what
you touch (`react-vite.md`, `node-api.md`, `mongodb.md`, `styling.md`), plus `ui-craft` for UI.

## 1. Pick the slice

- If the last PR is still open, stop: say so and wait for **merged** or review comments.
- Otherwise `git switch master && git pull --ff-only`, then take the next slice: `$ARGUMENTS`
  if given, else the next unchecked item of the milestone in `docs/system-design.md` §12 (and
  its slice list in `docs/progress.md`).
- **Size:** about 300 changed lines or less (lockfiles and generated files don't count). One
  idea per PR. If it's bigger, split it and say how.
- Tell the user in 2–3 lines what this PR will do, then build it. Don't ask unless it's a real
  design question (one that changes `docs/system-design.md`).

## 2. Build it

- Branch `m<N>-<short-slug>` from `master`. One or a few commits.
- **Simplicity and consistency above all:**
  - The most obvious code that works. No abstraction until there's a second real use.
  - Same problem, same solution: follow the pattern already in the repo; if there is none
    yet, the one you write becomes the pattern — make it a good one.
  - Small functions with names that say what they do. Short files.
  - Comments only for *why* (the decision behind a line), especially when it links to a
    design concept: `// Atomic claim: two workers can never take the same job (design §4.3)`.
  - No clever TypeScript. No dependency without a line in the PR saying why.
- Tests per `quality-gates`. `npm run check` green before every commit.
- If the code shows the design was wrong, update `docs/system-design.md` in the same PR and
  say so.

## 3. Review it

Dispatch one **Opus** reviewer subagent (`general-purpose`, `model: "opus"`) on
`git diff master...HEAD` with: the slice's goal, the design doc sections it implements, and
"Review for correctness, security, the stack-conventions rules, and above all simplicity and
consistency — the user will read every line. Flag anything clever, anything inconsistent with
the rest of the repo, and anything a reader would have to think twice about. Findings as
Critical / Important / Minor with file:line and a concrete fix."

Fix every Critical and Important finding, rerun `npm run check`. Minors: fix if trivial,
otherwise list them in the PR.

**Last PR of a milestone only:** also run the `ui-reviewer` agent (if UI changed) and the
`observer` agent, fix their must-fixes, run `npm run e2e`, and record the demo with `pr-demo`.

## 4. Open the PR and stop

Push and `gh pr create --base master --title "M<N>: <what>" --body-file <tmp>`:

```
## What this does            <2–4 bullets>
## How to read it            <the order to read the files in, and the one idea to understand>
## Design link               <the design doc sections this implements; any change to the doc>
## Review                    <findings fixed; minors left>
## Checks                    <commands run and results>
## Demo                      <last PR of a milestone only>
```

Then tick the slice in `docs/progress.md` (on the branch, in the same PR), post the PR link and
"Read it and reply **merged**, or leave comments on the PR." **Wait.** Never merge.

On **merged**: `git switch master && git pull --ff-only`, then the next `/ship`.
On comments: `gh pr view <N> --comments`, fix on the branch, rerun checks, push, answer each.
