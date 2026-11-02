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
- [ ] Text search: `GET /api/recipes?q=` on the text index, first 50 by score, with the tags
- [ ] Client: Show more on the list (the cursor)
- [ ] Client: tags in the form and on the recipe
- [ ] Client: search and tag filters on the list, kept in the URL
- [ ] `npm run db:seed`; e2e of finding a recipe; end of milestone: UI review, observer
      metrics, demo
## M4 — Pipeline without AI
## M5 — Gemini
## M6 — Instagram / Facebook
## M7 — Polish
