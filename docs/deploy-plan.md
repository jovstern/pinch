# Pinch online: the new plan (2026-11-28)

A proposal that replaces M11's order (design §15, `progress.md`). Nothing here is decided until
the user says so; once it is, §15, the D-rows and `progress.md` are rewritten to match, in the
same PR, and this file goes.

It answers three things: what it takes to put Pinch online, how it becomes an app on a phone,
and whether to move to Next.js or TanStack Start first.

## 1. What we know now that the old plan didn't

| Since §15 was written | What it changes |
|---|---|
| Sign-up is open, and every import spends Gemini money | A public address needs a gate: only invited emails can sign up (new, §2 step 4). The daily caps (D30) stay as the second line |
| Google sign-in works | A forgotten password is no longer a locked account for most users. Password reset moves out of the first deploy |
| `index.html` has an inline script (the language and the queue preload) | helmet's CSP blocks it the moment the API serves the page. The CSP hash (D36) must ship with the production server, not later with the domain |
| Recipes keep their thumbnails in Mongo, and users upload photos | Real data is worth more: backups move up, to right after the first deploy |
| Photo upload, text paste and "By me" exist | If Instagram blocks the cloud's IPs, the user already has three other ways in. Fallback (b) of §15.6 is less urgent |
| The household wants Pinch on phones (the share sheet) | The app work (§3) is planned with the deploy, as it needs HTTPS |

What stays as it was: Fly.io with one image and two process groups (D31), Atlas M0 (D32), a
merge deploys (D35), helmet (D36), the logs and the optional alerts (D37), encrypted nightly
backups (D38), and Claude never deploys or touches production.

## 2. Going online: the order

Before any of it: the three waiting PRs merge (#141, the paste box, the custom tags).

**Stage A: online at `pinch-….fly.dev`, for the household. No domain needed.**

1. **S0, the cloud-IP spike** (as §15.6). Still first, as it is the one thing that can change
   the design: the Dockerfile, a throwaway Fly app, about 10 real links. Needs the Fly and
   Atlas accounts.
2. **D1, the production server:** the API serves `client/dist` (long cache for `/assets`,
   `no-cache` for `index.html`, the fallback to `index.html`), **with the CSP and the script's
   hash, and `img-src` for Google's avatar** (moved here from D3).
3. **D2, Fly and CI:** `fly.toml`, the health checks, `ci.yml` (the gates on every PR, deploy
   on `master`). The first deploy. Google's redirect URI for the `fly.dev` address.
4. **G1, the gate (new):** `ALLOWED_EMAILS`, a list in the config. Sign-up and Google sign-in
   answer "Pinch is invite-only for now" to anyone else. Empty means open, as today. About 60
   lines and their tests.
5. **O1, backups and monitoring** (as §15.5), now before real recipes pile up.
6. **B1, only if S0 found blocks:** the caption fallback and "Paste its text instead".

**Stage B: the domain.**

7. **D3:** the domain, its certificate, `PUBLIC_URL`, Google's production redirect.
8. **P1, P2: password reset** (needs Resend and the domain verified). Unchanged.

**Stage C: the app** (§3). **Stage D: the framework, if wanted** (§4).

End of the milestone as before: e2e, UI review and the observer on the production URL, a smoke
test, a demo.

### Cost a month

| Line | Cost |
|---|---|
| Fly: two shared-CPU machines, 512 MB, always on | about $7–9 (Fly's price rise of 2026-10-01: about $4.40 for a 2x machine; check Fly's page when signing up) |
| Atlas M0, Resend, GitHub Actions, the alerts | $0 |
| The domain (stage B) | about $1 |
| Gemini | as used, under `GLOBAL_DAILY_IMPORTS` |
| **Total** | **about $8–10, plus Gemini** |

### The user's steps for stage A

- [ ] Create the Fly.io and Atlas accounts.
- [ ] Atlas: an M0 cluster in Frankfurt, a database user with a long password, access
      `0.0.0.0/0`.
- [ ] Google Cloud: add the redirect URI of the `fly.dev` address; a budget alert on Gemini.
- [ ] `fly secrets set` for `MONGODB_URI`, `GEMINI_API_KEY`, the Google client's two values.
- [ ] Repo secrets: `FLY_API_TOKEN`, and `MONGODB_URI` for the backups; the `age` key pair.

## 3. The app on a phone

What the household needs is: see a reel, press Share, pick Pinch. In order of cost:

| Step | Gives | Cost |
|---|---|---|
| **1. Installable (PWA)**: a manifest and icons | Pinch on the home screen, full screen, on Android and iPhone | 1 small PR, $0 |
| **2. `/add?url=…` and Android's share target** | On Android, Pinch is in the share sheet. `/add` creates the import and goes to Add recipe | 1 small PR, $0 |
| **3. An iPhone Shortcut** | Safari has no share target for a web app (WebKit's request has been open since 2019). A Shortcut named "Pinch it" does sit in the iPhone's share sheet, and opens `/add?url=…`. The user installs it once from a link | No code beyond step 2: a page that explains it. $0 |
| **4. A Capacitor app** with a native share extension | A real app in the App Store with its own share-sheet entry | Apple's developer account ($99 a year), Xcode, a Swift share extension, App Store review, and Google sign-in redone (Google refuses to sign in inside an app's web view). Several PRs and upkeep |

**Suggested:** steps 1 to 3 (this is U8 of `docs/ux/plan.md`, plus the Shortcut). Step 4 only if
the Shortcut proves too clumsy on the household's iPhones. Still open: which phones the
household uses. All Android means step 3 isn't needed at all.

## 4. Next.js or TanStack Start?

### What Pinch is today

A single-page app: React 19 and Vite 8, React Router, TanStack Query and Form, about 9,800
lines and 345 tests in the client; an Express API of about 3,400 lines and 280 tests; a worker
that polls Mongo and runs `yt-dlp` and `ffmpeg` for up to 150 s a job.

### What a framework would give

| Gain | Is it real for Pinch? |
|---|---|
| The server renders the page (SSR), so it shows before the JS arrives | **Partly.** Add recipe paints in 0.76 s. My recipes, a recipe and cook mode are at 2.4–2.5 s on a throttled phone, close to their budgets (m10.md): SSR would help those. But every page is behind a log-in with private data, so nothing can be cached for everyone |
| Search engines and link previews | **Not yet.** Nothing is public. It becomes real with a shared recipe link (a WhatsApp preview) or All recipes |
| Less JS (Next's server components) | Small: first load is 184 kB against a budget of 195, and the framework's own runtime comes on top |
| Typed routes and validated search params (TanStack Router) | **Yes**: My recipes' filters live in the address, checked by hand today |
| One codebase for pages and API (server functions) | Only if the Express API is ported, which is the expensive part |
| Learning it | Real, if it's a goal of this learning project. That is the user's call |

### What it would cost

| | Next.js (App Router) | TanStack Start |
|---|---|---|
| Build tool | Vite goes; Turbopack. The Vitest setup, the bundle measuring method and the Tailwind plugin are redone | Stays on Vite 8 |
| Router | React Router out, in 31 files; routes become folders | React Router out, in 31 files; TanStack Router in |
| Data | Query can stay on the client (then little is gained), or pages become server components (most pages rewritten) | Query stays, and Start preloads it on the server per route. SSR can be turned on page by page |
| The API | Kept as a second server behind Next (three processes), or ported to route handlers (the 280 server tests with it) | Kept as it is behind the same origin, or ported later, one route at a time |
| Hosting | Vercel can't run the worker (`yt-dlp`, `ffmpeg`, 150 s jobs), so Fly stays anyway and Next runs in the same image. Vercel's benefits don't apply | The same image on Fly, a Node server in place of the static files |
| To redo | i18n's first render (the language must be known on the server, §16.3), the CSP, the preload script, the session cookie on the server, every budget measured again | The same list, smaller: the client code and its tests mostly stay |
| Maturity | Years of production use | 1.0 since October 2026: young, with one security fix already |
| My estimate | 15–25 PRs, no change the user can see | 8–12 PRs; the router alone 3–4 |

The estimates are mine, from the file counts above; they are not measured.

### Suggested

1. **Deploy first, as it is.** A framework doesn't change where Pinch runs: the worker keeps
   it on Fly either way. Migrating first would put weeks between today and a working address.
2. **Not Next.js.** It replaces the build tool and wants the API, for gains Pinch mostly
   doesn't need, and its best host can't run the worker.
3. **If a framework, TanStack Start, in two steps, after stage A.** First TanStack Router
   alone (typed routes and the filters' search params; worth it without SSR). Then Start, with
   SSR for My recipes and a recipe, when there is a public page to preview or the 2.5 s pages
   need it.
4. **A cheaper way to link previews**, if that's the only need: one Express route that answers
   a shared recipe's address with its title and picture in the page's meta tags. About 50 lines.

## 5. What the user decides

1. Stage A's order, with the invite gate and without the domain: yes?
2. Password reset after the domain (stage B): yes?
3. The app: steps 1 to 3, Capacitor only if needed? And which phones?
4. The framework: none for now, TanStack Router after stage A, or the full move (which one)?
