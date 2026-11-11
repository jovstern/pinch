# Progress

Each milestone from `docs/system-design.md` §12, split into small PRs. Ticked when merged.
Slices for later milestones are filled in when the milestone starts.

## M0 — Spike: can we get recipes out of links?

- [x] `spike/`: a script that takes a list of links, downloads with `yt-dlp` (or passes YouTube
      URLs straight through), sends to Gemini, and writes what came back to a results table
- [x] Run it on real links (10 Instagram reels, 5 Facebook reels, 3 YouTube, 3 stories);
      write the findings into `docs/spike-results.md` and adjust the design if needed

## M1 — Scaffold

- [x] Workspaces + `client/` from the Vite starter (Tailwind), gates green
- [x] `server/`: Express app, config, logging, error handler, `/api/health`, tests
- [x] `server/`: Mongo client, `/api/ready`, dev-user middleware, test database
- [x] `shared/` schemas, Vite proxy `/api`, the client calls `/api/health`; root `check`
- [x] Playwright (`npm run e2e`) with one test of the main flow; end of milestone: UI review,
      observer metrics, demo

## M2 — Recipes CRUD

- [x] Recipe schemas in `shared/`; `POST /api/recipes`, `GET /api/recipes/:id`; Zod → 400 with
      `fields`
- [x] `GET /api/recipes` (newest first, capped at 50; the cursor comes in M3), `PUT`, `DELETE`
- [x] Client: router, app layout, the recipe list with its empty state
- [x] Client: recipe detail, and delete
- [x] Client: the recipe form, and New recipe
- [x] Client: Edit recipe (the same form, filled in; `PUT`)
- [x] e2e of create → list → edit → delete; end of milestone: UI review, observer metrics, demo

## M3 — Find

- [x] Indexes in one module and `npm run db:indexes`; cursor pagination on `GET /api/recipes`,
      its index checked with `explain` in a test
- [x] Tags: the fixed facet lists in `shared/`, stored and kept by `PUT`;
      `GET /api/recipes?tags=` filters with `$all`, on its own index
- [x] Text search: `GET /api/recipes?q=` on the text index, first 50 by score, with the tags
- [x] Client: Show more on the list (the cursor)
- [x] Client: tags in the form and on the recipe
- [x] Client: search and tag filters on the list, kept in the URL
- [x] `npm run db:seed`; e2e of finding a recipe; end of milestone: UI review, observer
      metrics, demo
## M4 — Pipeline without AI

- [x] Imports API: `POST /api/imports { url }` (platform from the link, 202), `GET` the list and
      one, `DELETE`; the imports indexes, with the TTL
- [x] The worker: a second entry point, the atomic claim with a lease (a job whose lease ran
      out is claimed again), 2 jobs at a time, the fake extractor
- [x] Failures: retries with backoff, failed after 3, a deadline under the lease, a killed
      worker's job finished by another
- [x] Approve (idempotent: unique `sourceImportId`), retry (back to pending with `attempts`
      and `error` cleared), discard
- [x] Client: paste a link on `/`, import status polled every 2 s
- [x] Client: review the draft in the recipe form, approve or discard it
- [x] Client: retry or dismiss a failure
- [x] e2e of link → draft → recipe; end of milestone: UI review, observer metrics, demo
- [x] Follow-up: a worker that hits a database error goes on; an import no worker takes is shown
      as stalled, with Dismiss
## M5 — Gemini

- [x] The daily cap: 20 links a day (pasted or retried), a per-user, per-day count; 429 past it
- [x] `extractRecipe` with Gemini (structured output from the Zod schema, a timeout); the worker
      uses it, e2e keeps the fake
- [x] The post's caption and length with `yt-dlp` before Gemini; "This doesn't look like a
      recipe"
- [x] Text fallback, the pipeline: an import can be a post's pasted text (`{ type: "text" }`);
      the worker sends it to Gemini alone; the list and the review page show it
- [x] Text fallback, the box: one textarea on `/` takes a link or the text (auto-detected)
- [x] Nutrition per serving, shown as an estimate
- [x] End of milestone: a real YouTube link becomes a draft; UI review, observer metrics, demo
## The look and cook mode (docs/ux/plan.md U4, U2; approved 2026-11-09)

- [x] U4 PR 1: tokens for light and dark, Fraunces for titles, the type scale
- [x] U4 PR 2: the components on the tokens, the mark
- [x] U2 PR 1: `/recipes/:id/cook`, its type, the steps, Wake Lock
- [x] U2 PR 2: each step's ingredients inline, tick-off
- [x] U2 PR 3: timers
## M6 — Instagram / Facebook

- [x] Instagram and Facebook links: download with `yt-dlp`, length with `ffprobe`, the Gemini
      Files API; media deleted in `finally`
- [x] Thumbnails: the worker makes one (the post's own picture), stored with the draft and
      the recipe, served by the API
- [x] Thumbnails in the client: on the cards, the recipe and the review page
- [x] Screenshot fallback, the pipeline: an import can be up to 4 images
- [x] Screenshot fallback, the box: add images on `/`
- [x] End of milestone: a real reel becomes a draft with a thumbnail; UI review, observer, demo

## M7 — Polish

- [x] Back under the JS budget: Delete's dialog is fetched only when Delete is about to be pressed
- [x] Toward the LCP budget on the pages that wait for data: the font after the page has drawn, the
      form's chunk with the data (2.41 → about 2.11 s; the last 110 ms is a decision, see the PR)
- [x] Logs: request lines without headers; each import attempt's time and Gemini's tokens
- [x] Share and Comments, as "coming soon" (design §1)
- [x] Cook mode, from M6's UI review: more ways of writing a time ("1 hour 20 minutes", "חצי
      שעה"), ranges kept on one line, fewer wrong Hebrew ingredient matches, a loading skeleton
- [x] States: the accessibility e2e on a recipe, cook mode and a draft's review with its picture,
      in both themes (Your imports while loading: left as is, as the list is usually empty and a
      placeholder would jump the other way)
- [x] End of milestone: UI review, observer, demo

## M8 — Redesign (docs/ux/pass-02.md, wireframes in docs/ux/wireframes/)

The UI first, on the API as it is (where they disagree, the API wins for now):

- [x] R1 shadcn/ui base on Pinch's tokens: `cn`, Button, Input, Badge (D26)
- [x] R2 The frame: the two tabs, the avatar, Write a recipe; `/` New recipe, `/recipes` My
      recipes (D24). Breadcrumbs go with each inner page (R6–R8)
- [x] R3 New recipe: the one-line input that grows, the queue as cards
- [x] R4 Toasts for every status change
- [x] R5 My recipes: search, tag chips, Filters (sheet / panel), its states
- [x] R6 A recipe: breadcrumbs, the source in the subtitle, Cook and ⋯
- [x] R7 Cook mode: swipe between steps, breadcrumbs instead of Exit
- [x] R8 The editor: one page for review, writing by hand and editing, with its breadcrumbs
- [x] End of the UI: UI review, observer, e2e, demo

Then the features the design asks the API for, one PR each:

- [x] F1 Filters by source and time, and Sort
- [x] F2 Things to look at: the model marks fields it is unsure of; marks in the editor, the
      count on the queue card
- [x] F3 A face for every recipe: an emoji from the model (D25)
- [x] F4 Undo in the toasts (Pinch it, Delete, Discard, Dismiss): a soft delete (D27)

## M9 — Accounts and links pinched before (design §4.6, §8.3, D28–D30)

Planned, not built yet. In this order:

- [x] L1 This user's link found: `linkKey` (`shared/src/linkKey.ts`, every link form tested), on
      imports and on a recipe's source; `POST /api/imports` answers 409 `{ existing }` for one
      of theirs (not deleted, not failed), uncounted; the toasts (View, Review); the indexes;
      `db:backfill-link-keys`
- [x] A1 Users and sessions: signup, login, logout, me; argon2id; the hashed cookie token; the
      login rate limit; the indexes
- [ ] A2 The user middleware reads the session (401 without one); e2e signs in once and reuses
      it; `db:adopt-dev-data <email>`
- [ ] A3 The client: Log in and Sign up, redirect to `/login` and back, a 401 signs out, the
      avatar's menu (name, Log out)
- [ ] A4 Google sign-in: the OIDC code flow (state, PKCE), linking by verified email; the user
      sets `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- [ ] A5 The global daily cap on Gemini calls (D30)
- [ ] L2 The shared `links` cache: `EXTRACTION_VERSION`, the worker's lookup (a hit copies and
      is ready) and upsert, recipes only; hits free against both caps; `links:forget <url>`
- [ ] End of milestone: UI review, observer, e2e, demo
