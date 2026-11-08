---
name: ux-strategy
description: How Pinch's designer works out the right experience before anything is built - the audience, 1-3 personas, what matters most to them, analogues from other products (in any domain), web research, and a plan of proposals the user approves one by one. Read before writing or revising docs/ux/, and before implementing any approved UX proposal.
---

# UX strategy

Adapted for Pinch from BMAD's `bmad-ux` (named-protagonist journeys, *how it looks* kept apart
from *how it behaves*, every need landing on a screen), Anthropic's `frontend-design` (a
point of view, not a template) and this repo's `ui-craft` (the quality floor). Fixed rule:
**research and plan first; build only what the user approved.**

## The outputs (all in `docs/ux/`)

| File | What it holds | Changes |
|---|---|---|
| `plan.md` | The living plan: audience, personas, their top jobs, principles, the look, the experience, and the numbered proposals with their status | Revised every milestone |
| `research.md` | Sources: similar apps, analogues from other domains, articles and studies, each with its link and the one thing worth taking | Appended |
| `m<NN>.md` | One pass per milestone: what changed in the app since the last pass, what still hurts, proposals added, changed or retired | One per milestone |

Screenshots go to `.metrics/ux/m<NN>/` (git-ignored).

## Method, in order

1. **Understand the product as built.** Read `CLAUDE.md`, `docs/system-design.md` (§1
   requirements, §14 screens, §12 milestones), `docs/progress.md`, the last `docs/ux/m<NN>.md`
   and `docs/metrics/` reports. Then *use* the app: run the production build, go through every
   screen at 360, 768 and 1440 px, paste a link, paste text, review a draft, search, filter,
   open a recipe as if cooking from it. Note every moment of friction with a screenshot.
2. **Audience.** Who pinches recipes from reels, and when? Back each claim with a source from
   the web (surveys, articles, app-store reviews of similar apps, Reddit threads), not
   intuition. Mark anything unbacked `[ASSUMPTION]`.
3. **Personas, 1-3.** Each a named person with a real situation, not a demographic table:
   who they are, where and on what device they meet Pinch, their goal, their frustration
   today, what "done" feels like, and one quote in their voice. Fewer and sharper beats more.
   Say which persona is primary and why.
4. **What matters most.** For each persona, the top 3 jobs ranked, and the moment of truth
   (the climax beat) of each: e.g. "standing at the stove with wet hands, finding step 4".
   Then one journey per primary job, numbered steps, through Pinch as it is today, marking
   where it breaks.
5. **Analogues.** Similar products (recipe managers, read-it-later apps, saved-reel tools) and
   analogues from other worlds that solved the same shape of problem: capture now, use later
   (Pocket, Raindrop), a queue that processes in the background (photo uploads, email send),
   step-by-step use with busy hands (car navigation, workout apps, karaoke lyrics), a library
   to browse by mood (Spotify, Letterboxd). For each: the pattern, why it fits a persona's
   job, and how it would look in Pinch. Search the web for each; cite the link.
6. **Principles.** 3-5 experience principles derived from the personas ("one thumb, one
   hand", "never lose a pinch"), each ruling out something concrete.
7. **The look and the experience.** Two separate sections in `plan.md`:
   - *Look:* direction, palette (named hex values), type, radii, imagery, motion, dark mode;
     as tokens for `client/src/globals.css`'s `@theme`. Check the result against
     `frontend-design`'s list of generic defaults and revise anything that reads as a template.
   - *Experience:* information architecture (screens and navigation), the key flows, states
     (loading, empty, error, partial, offline), microcopy voice, accessibility floor
     (`ui-craft`). **Surface closure:** every persona job has a screen that serves it, and every
     screen serves a job; flag screens that serve none.
8. **Proposals.** Numbered `U1`, `U2`, ... each with: the problem (persona, job, evidence or
   screenshot), the change, its type (`look` / `flow` / `component` / `feature`), what it
   touches (files, new components, whether the server or `shared/` must change), the
   effort in PRs of ≤ ~300 lines, the persona impact (high / medium / low), and its
   **status**: `proposed`, `approved`, `in progress`, `done`, `declined`. Rank by impact over
   effort. A good plan has a few high-impact changes, not fifty polish items.

## Boundaries

- **The stack is fixed:** React 19 + Vite + TypeScript, Tailwind v4, TanStack Query and Form,
  React Router, Radix (`radix-ui`), Express + MongoDB + Gemini on the server. Propose within
  it. Suggesting a new UI component, a Radix primitive, an icon set, a font or a small library
  is fine, each with one line on why and its cost in bundle size; replacing a framework is
  not.
- **New features** are welcome when a persona's job needs them (e.g. a cooking mode, a PWA
  share target from §1 "Later", favourites). Name any server, `shared/` or
  `docs/system-design.md` change they need; the design doc is the spec, so a feature changes
  it in the same PR.
- **The user decides.** Nothing moves from `proposed` to `approved` except by the user's words.
  Never implement a proposal that isn't `approved`.
- Media is never stored (system design §1): no proposal may need stored video or full-size
  images.

## Implementing an approved proposal

Only when the brief names approved proposals. Follow `.claude/skills/ship/SKILL.md` exactly
(one small PR at a time, the branch naming, `npm run check`, the Opus review, open the PR,
wait for **merged**), plus `stack-conventions` (`react-vite.md`, `styling.md`) and `ui-craft`.
Tokens before components; screenshots of before and after at 360 and 1440 px in the PR. Set
the proposal's status to `in progress`, then `done` in the PR that finishes it.
