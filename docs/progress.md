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

- [x] L1 This user's link found: `linkKey` (`shared/src/linkKey.ts`, every link form tested), on
      imports and on a recipe's source; `POST /api/imports` answers 409 `{ existing }` for one
      of theirs (not deleted, not failed), uncounted; the toasts (View, Review); the indexes;
      `db:backfill-link-keys`
- [x] A1 Users and sessions: signup, login, logout, me; argon2id; the hashed cookie token; the
      login rate limit; the indexes
- [x] A2 The user middleware reads the session (401 without one); e2e signs in once and reuses
      it; `db:adopt-dev-data <email>`; `db:seed <email>`
- [x] A3 The client: Log in and Sign up, redirect to `/login` and back, a 401 signs out, the
      avatar's menu (name, Log out)
- [x] A4 Google sign-in: the OIDC code flow (state, PKCE), linking by verified email; the user
      sets `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- [x] A5 The global daily cap on Gemini calls (D30)
- [x] L2 The shared `links` cache: `EXTRACTION_VERSION`, the worker's lookup (a hit copies and
      is ready) and upsert, recipes only; hits free against both caps; `links:forget <url>`
- [x] End of milestone: UI review, observer, e2e, demo; the fixes (the review's, signed-out pages
      without 401s, the entry as one file: every LCP within its budget, docs/metrics/m09.md)

## M10 — English and Hebrew (design §16, §8.3, D39–D47)

Every Hebrew string is drafted by Claude and read by the user in its PR (§16.9). English stays
exactly as it is: each slice's English screens look the same before and after.

- [x] I1 The language on the account, the API: `language` on the user and in `me` (none reads
      as English), `PATCH /api/auth/me` (JSON only, 400 for anything else), the `pinch_lang`
      cookie on every sign-in, `me` and change (logout keeps it); sign-up's `language` and
      Google's `lang`
- [x] I2 The plumbing, the client: i18next and react-i18next, `en.ts` and `he.ts` typed against
      it; the inline script sets `lang` and `dir`; `main.tsx` waits for Hebrew; Radix's
      `DirectionProvider`; the picker in the avatar's menu, the switch on Log in and Sign up, the
      reload on a new device. Only Header and UserMenu through `t()`; the budget row with the
      app's measured figure (§16.10)
- [x] I3 Right to left: the logical classes and the physical-class test, the mirrored icons,
      Sonner's side, cook mode's row and arrow keys, the import card back to the interface's
      direction (reverses #113); checked with `dir="rtl"`, no Hebrew text yet
- [x] I4 Strings with Hebrew: the frame and accounts (header, Log in, Sign up, the session
      gate, not found); the toasts stay English in both languages (D46, the user's call on
      2026-11-13), left to right with `lang="en"`, a title in its `<bdi>`; `renderInHebrew` and
      its first tests
- [x] I5 Strings with Hebrew: Add recipe and the queue (its heading's plurals, the failure
      reasons by their key; the queue's toasts in `useImportToasts`, "Couldn't read that video",
      "Your recipe" and the things to look at in them, stay English, as every toast, D46)
- [x] I6 Strings with Hebrew: My recipes, Filters and the tag labels; a recipe's page; the
      shared `ui/` labels they bring (Sheet's `aria-label="Close"`, Breadcrumb's
      `aria-label="Breadcrumb"`)
- [x] I7 Strings with Hebrew: the editor and cook mode, page titles with their isolates
- [x] I8 The server's messages and `Intl`: `shared/src/messages.ts` used by the schemas and the
      worker, `validation` in the client; minutes, counts and nutrition through `Intl`
- [x] I9 The Hebrew display face: Frank Ruhl Libre's Hebrew subset with its `unicode-range`,
      its sized fallback, measured
- [x] I10 The unit's combobox (D47, §16.12): the editor's Unit suggests the common units in the
      interface's language, any text still allowed; the ARIA combobox pattern; tests. Also the
      Unit's example ("g") that stays once a row has its name: `form.Field mode="array"` only
      draws again on add or remove, so `example` is stale; read the name through `form.Subscribe`
- [x] End of milestone: UI review in both languages (each screen at 360 and 1440 px in Hebrew),
      observer (budgets, LCP in Hebrew too), e2e with axe in Hebrew and the switch flow, demo

After M10 (found by M10's UI review, not M10's to fix):

- [ ] The floating Write button's place in the tab order on a phone (the review's S4)
- [ ] An English title's alignment on a Hebrew recipe page at desktop width (the review's S6)
- [ ] The quick-tag chips at 40 px, under the 44 px touch target (the review's S7)
- [ ] The top toast covers the paste field on a phone (the review's S8)
- [x] Move the English strings out of the entry (about 6.5 kB gzip that Hebrew users never use;
      measured 3.5, §16.10): frees room on every route and cook's LCP (2.46 of 2.5 s); changes §16.3

## UI pass after M10 (the user's list, 2026-11-13)

- [x] U1 One centred empty state (icon, title, subtitle) for not found, the error page and No recipes yet; the queue's working status shimmers
- [ ] U2 Add recipe's paste box: the row keeps the English layout in Hebrew, an (i) with where to find the link per app, a new placeholder
- [ ] U6 The English strings out of the entry, loaded like Hebrew (the user's choice over raising the budgets; before U3, as the editor is at 209.3 of 210)
- [x] U3 The header: on phones the tabs under the full logo and the avatar; in Hebrew the logo centred; an All recipes tab with a Coming soon page (the shared recipes to clone, ranked: not in v1)
- [x] U4 Light, dark or the system's, from the avatar's menu, saved on this device
- [ ] U5 Google's profile picture in the avatar
- [ ] U7 The header mirrored in Hebrew (the logo at the right) and its tabs centred in both languages (the true centre from 1024 px); on Add recipe, Pinch it and the placeholder in English in Hebrew too, and the (i) hidden for now (the user's calls of 2026-11-14)

## M11 — Pinch online (design §15, §8.3, D31–D38)

The user's steps (accounts, the domain, secrets) are listed in design §15.9; each slice says
which it needs.

- [ ] S0 The cloud-IP spike: the Dockerfile's first version, a throwaway Fly app and Atlas
      database, about 10 real links through the worker on Fly; the results in
      `docs/spike-results.md` and the choice of (a), (b) or (c) (§15.6). Needs the Fly and
      Atlas accounts
- [ ] B1 Only if S0 finds blocks: the fallback (b): a failed download read from its caption, a
      YouTube Short by its URL alone, a readable "Paste its text instead"
- [ ] D1 The production server: the API serves `client/dist` (long cache for `/assets`,
      `no-cache` for `index.html`, the SPA fallback) when `NODE_ENV=production`; the Dockerfile
      builds the client; tested with a built folder
- [ ] D2 Fly: `fly.toml` (two process groups, the release command, blue-green), the API's check
      on `/api/ready`, the worker's health port; `ci.yml` (the gates on every PR, deploy on
      `master`). Needs `FLY_API_TOKEN` and the secrets; the first deploy, on `*.fly.dev`
- [ ] D3 The domain and the headers: helmet's CSP with the inline script's hash computed at start, and `img-src 'self' data: https://*.googleusercontent.com` for the avatar (§15.4), with a header test;
      `PUBLIC_URL` and Google's production redirect. Needs the domain and its certificate
- [ ] P1 Password reset, the API: `passwordResets` and its indexes, `POST /api/auth/forgot` and
      `/reset`, their rate limits, every session ended; `email.ts` (Resend through `fetch`, a
      fake in tests), the email in the account's language (design §16.7). Needs Resend and the domain verified
- [ ] P2 Password reset, the pages: "Forgot password?" on Log in, `/forgot`, `/reset`; e2e of a
      reset (the test writes its own token's hash, so no email is read)
- [ ] O1 Monitoring and backups: the 80% warning, the worker's `HEARTBEAT_URL` ping,
      `backup.yml` (nightly, `age`-encrypted)
- [ ] End of milestone: e2e locally as always; UI review and observer (Lighthouse, axe) on the
      production URL; a smoke test there (sign up, a real link, a reset email); demo
