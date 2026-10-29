---
name: quality-gates
description: The definition of done for Pinch - the gate commands, test rules and review layers. Read before saying any work is complete and before opening a PR.
---

# Quality gates

Work is done only when the gates below pass on the current code. "It should pass" is not a
pass: run the command and read the output.

## Gates

| Gate | Command / who | When |
|---|---|---|
| Format, lint, types, unit tests, build | `npm run check` (root; runs every workspace) | before every commit |
| Browser tests (console errors fail them) | `npm run e2e` | in the last PR of a milestone that has UI |
| Code review | an Opus reviewer subagent (see `ship`) | every PR |
| UI/UX review | the `ui-reviewer` agent | the last PR of a milestone that changes UI |
| Metrics | the `observer` agent (`metrics` skill) | the last PR of a milestone |

## Rules

- **Tests where they pay:** services, data access, the worker's claim/retry logic, validation
  and routes get tests (Vitest; Supertest against `app.ts`). Client components get Testing
  Library tests of behaviour, not markup. Each milestone's main flow gets one Playwright test.
- **Simple tests:** one behaviour per test, named as a sentence, no clever helpers. The user
  reads tests like code.
- **Tests never touch the app's data:** their own database (`pinch-test-<random>`), dropped
  at the end.
- **Never bypass a gate.** No `--no-verify`, no skipped or deleted tests, no loosened lint or
  TypeScript settings, no `eslint-disable` to get past an error. Changing a gate's
  configuration needs the user's approval.
- **A red gate you cannot fix in two attempts is a stop:** debug systematically; if still red,
  report what fails and why.
- **Report honestly.** Say which commands ran and their result.
