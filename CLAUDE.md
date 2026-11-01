# pinch

**Pinch** — pinch a recipe from a reel, cook it later. The user pastes an Instagram, Facebook or
YouTube link; a worker turns it into a draft recipe with Gemini; the user reviews and saves it.

A **learning project** (system design) and a POC: it should look finished and be friendly to
use, and the code must be simple enough for the user to read every line.

- **The design:** `docs/system-design.md` — requirements, architecture, data model, API,
  decisions (D1–D14) and the build plan (§12). It is the spec: code follows it, and a change to
  the design is made there in the same PR.
- **Progress:** `docs/progress.md` — milestones split into small PR slices, ticked as they merge.

## Stack

npm workspaces: `client/` (React + Vite + TypeScript + Tailwind, TanStack Query), `server/`
(Express + TypeScript, two entry points: the API and the import worker), `shared/` (Zod schemas
and types used by both). MongoDB through the native driver + Zod. Gemini for extraction,
`yt-dlp` and `ffmpeg` for Instagram/Facebook. Node 24.

## Commands

- `npm run dev` — the client (Vite) on http://localhost:5173; it proxies `/api` to the API.
- `npm run dev:api` — the API on http://localhost:3000 (restarts on change, readable logs).
- `npm run check` — every gate: Prettier, then per workspace ESLint, Vitest and the types
  (shared: lint + `tsc`; client: `tsc -b` + `vite build`; server: `tsc`).
- `npm run format` — Prettier writes.

The rest arrive with later slices (worker dev; e2e; db:indexes; db:seed).

## How work happens

- **`/ship`** builds the next small PR (≤ ~300 lines): Claude writes it, an Opus reviewer
  checks it, the user reads every line and merges. One PR open at a time. **The user merges
  every PR; Claude waits for "merged".**
- **Simplicity and consistency above all.** The most obvious code that works; one pattern per
  problem across the repo; comments explain *why* and point to the design doc.
- No planning ceremony: the design doc is the plan. No Superpowers flow, no worktrees.
- Every agent runs on Opus (`opus`).
- End of each milestone: `ui-reviewer` (if UI changed), `observer`, `npm run e2e` and a demo
  GIF (`pr-demo`) in that milestone's last PR.

## This machine

- MongoDB at `mongodb://localhost:27017` (Homebrew service, standalone — no transactions;
  see D9). `yt-dlp` and `ffmpeg` installed.
- Secrets live only in `.env*` (git-ignored). Never read, print or commit them; ask the user to
  set them (for example `GEMINI_API_KEY`).
- Tests use their own database (`pinch-test-<random>`) and drop it.
- `gh` is logged in as `jovstern`.

## Hard rules

- Follow `.claude/skills/stack-conventions/` (`react-vite.md`, `node-api.md`, `mongodb.md`,
  `styling.md`), `ui-craft` and `quality-gates`.
- Never push to `master` or merge a PR. Never bypass a hook or check; never skip or delete a
  failing test.
- Ask before changing lint, TypeScript or test configuration.
