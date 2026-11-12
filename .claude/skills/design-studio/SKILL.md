---
name: design-studio
description: Run a full product-design pass for Pinch (or a new web app) - plan, research of similar apps including other industries, personas, feature proposals, colour scheme, and desktop + mobile wireframes, every decision explained. Starts only when the user runs /design-studio.
argument-hint: "[focus: a screen, a flow, or empty for the whole app]"
model: claude-fable-5-1
disable-model-invocation: true
---

# /design-studio — a design pass with reasons

**Start it with:** `/design-studio` for the whole app, or `/design-studio <focus>`, e.g.
`/design-studio cook mode` or `/design-studio the home screen on phone`. It never starts on
its own. It runs on **Claude Fable 5.1** (`claude-fable-5-1`), and so does every agent it
spawns — the user chose Fable for design work; this overrides CLAUDE.md's "every agent runs
on Opus" for this skill only.

You are a senior product designer. Every decision you write down carries a short **Why**
that points to evidence: a research finding (with its source), a persona, or a rule in
`ui-craft`. A choice with no Why does not go in. Recommend one direction; name the
alternatives in a line.

This skill writes **design docs and wireframes only, never app code**. Changes to the app
reach the code through `/ship`, one small PR at a time.

## Read first

`CLAUDE.md`, `docs/system-design.md` (§1 requirements, §10 decisions, §14 screens),
`.claude/skills/ui-craft/SKILL.md`, `.claude/skills/stack-conventions/styling.md`, and what
already exists in `docs/ux/`: `plan.md` (audience, personas, analogues, principles, look,
tokens, experience), `research.md` (passes of research with sources) and the latest
`m<NN>.md` (what hurts, by screen). **Build on them; do not start over.** Keep what is still
true, change what the new evidence contradicts, and say what changed and why.

For a brand-new app (no `docs/ux/` yet), create the same files from scratch.

## Intake

If `$ARGUMENTS` and the docs leave the focus unclear, ask once (AskUserQuestion, at most 3
questions): which screens or flows, what feels wrong today, and any app the user loves or
hates as a reference. Otherwise state your reading of the focus at the top of the pass and go.

## The pass (one task-list item each; share each draft as it's done)

1. **Plan.** At the top of a new `docs/ux/pass-<NN>.md` (next number): the focus, the
   problem in one paragraph, 2–3 measurable success signals, what is out of scope. If the app
   is running, screenshot the screens in focus at 360 and 1440 px first (Playwright; the
   ui-reviewer agent's method) so the pass starts from what is real.

2. **Research.** Append `## Pass <NN> — <topic>, <date>` to `docs/ux/research.md`, the file's
   existing format. Study 6–8 products with WebSearch/WebFetch:
   - 3–4 direct ones (recipe savers, meal planners, social-to-recipe tools);
   - 3–4 from **unrelated domains** that solve the same interaction problem (e.g. saving
     for later: Pocket, Pinterest, read-later apps; step-by-step doing: workout apps, IKEA
     instructions, navigation; capture from share-sheet: note apps, bookmarking).
   For each: one pattern it does well (specific), what users complain about (reviews,
   Reddit, app stores), how it changes between phone and desktop, and **one thing to
   borrow**. End with "Adopt / avoid" and update `plan.md` §4 Analogues. Cite every source.

3. **Personas.** Update `plan.md` §2 (Noa, Daniel) with what the research changed, or add a
   persona only if the research shows a group the two don't cover. Each persona: context and
   device split (phone vs desktop, kitchen vs couch), goals, frustrations, a line in their
   own words, their **moment of truth**, and one accessibility stretch (wet hands, phone on
   the counter at arm's length, low vision, Hebrew/RTL, slow connection). Then a short
   journey for each persona's main task, marking where it breaks today.

4. **Features.** In the pass file: the features in focus, each mapped to persona + goal.
   Then **proposed new features**, only where a persona or a research finding shows a gap:
   the problem, the evidence, effort (S/M/L), and MoSCoW priority for the next milestone.
   Say which existing ones to cut or simplify, and why. Proposals are proposals: anything
   accepted goes into `system-design.md` §1/§14 through `/ship`, not here.

5. **Information architecture and responsive behaviour.** Screen inventory against §14,
   the main flows (a Mermaid diagram in the pass file), and per screen: what changes at
   360 / 768 / 1024 / 1440 px (`ui-craft` breakpoints) — navigation, what collapses or
   reorders, thumb reach on phone, the one focal point and one primary action — and why.

6. **Colour scheme and visual foundations.** Update `plan.md` §6 The look and its token
   block (for `client/src/globals.css` `@theme`; **existing token names stay**, new ones are
   added; semantic names per `styling.md`). Give: neutrals (a 50–950 scale), one accent,
   status colours, light and dark themes, type pair and scale, spacing, radii, shadows,
   motion. For every colour: its role, why it suits cooking and this audience, how it sets
   Pinch apart from the products researched. **Check contrast with the script:**
   `node .claude/skills/design-studio/contrast.mjs '<json pairs>'`; every text pair must
   reach AA (4.5:1 body, 3:1 large text and UI). Fix failures before presenting; paste the
   script's table into the pass file. Show the palette as a swatch page
   (`docs/ux/wireframes/palette.html`).

7. **Wireframes, desktop and mobile.** For each screen in focus write one self-contained
   HTML file in `docs/ux/wireframes/<screen>.html`: the phone (360 px) and desktop (1440 px)
   frames side by side, mid-fidelity greyscale, real Pinch content (real recipe titles,
   Hebrew as well as English, a long ingredient list), and the states §14 lists (loading,
   empty, error) as extra frames. Numbered callouts on each frame, explained under it: why
   this hierarchy, why this placement, what the user sees first. Then **one** high-fidelity
   screen in the new tokens. Screenshot each file with Playwright into
   `docs/ux/wireframes/shots/` and look at the shots yourself before calling them done.
   If the `figma` MCP is connected and the user wants it, offer to push the frames to Figma.

8. **Decision log.** In the pass file: a table — Decision | Options considered | Choice |
   Why (evidence) | Risk / open question. Decisions that change the spec are proposed as new
   entries for `system-design.md` §10, for the user to accept.

9. **Check, then hand over.** Spawn a fresh reviewer agent (`model: fable`) that has not seen the
   work: give it the pass file, `plan.md`, the shots and `ui-craft`, and ask it to find
   features with no persona, decisions with no evidence, failed contrast, screens missing a
   phone or desktop frame, and breaks of `ui-craft`. Fix what it finds. Then tell the user,
   briefly: what changed, the files, the top 3 proposals, and 3 questions worth testing with
   real users. Suggest the first `/ship` slice that would carry the design into the app.

## Rules

- Docs and wireframes live in `docs/ux/`; nothing in `client/`, `server/` or `shared/`.
- Never push to `master`. Work on the current branch or a `ux-pass-<NN>` branch; the user
  reviews and merges, as with every PR.
- Explanations stay short: one or two sentences per Why. Sources are linked, never pasted.
- This skill and every agent it spawns run on Fable (`claude-fable-5-1`).
