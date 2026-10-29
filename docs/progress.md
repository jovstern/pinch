# Progress

Each milestone from `docs/system-design.md` §12, split into small PRs. Ticked when merged.
Slices for later milestones are filled in when the milestone starts.

## M0 — Spike: can we get recipes out of links?

- [x] `spike/`: a script that takes a list of links, downloads with `yt-dlp` (or passes YouTube
      URLs straight through), sends to Gemini, and writes what came back to a results table
- [ ] Run it on real links (10 Instagram reels, 5 Facebook reels, 3 YouTube, 3 stories);
      write the findings into `docs/spike-results.md` and adjust the design if needed

## M1 — Scaffold

- [ ] Workspaces + `client/` from the Vite starter (Tailwind), gates green
- [ ] `server/`: Express app, config, error handler, `/health`, dev-user middleware, Mongo client, tests
- [ ] `shared/` schemas, Vite proxy `/api`, the client calls `/health`; root `check`

## M2 — Recipes CRUD
## M3 — Find
## M4 — Pipeline without AI
## M5 — Gemini
## M6 — Instagram / Facebook
## M7 — Polish
