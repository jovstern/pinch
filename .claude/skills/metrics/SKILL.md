---
name: metrics
description: How apps built with this kit are instrumented and measured - performance budgets, Lighthouse and Core Web Vitals, bundle size, accessibility (axe), API latency, structured logs and console errors, and production monitoring - and the report the observer agent writes each milestone. Read when planning instrumentation, adding logging, or measuring.
---

# Metrics, logs and budgets

What is not measured drifts. Every project sets budgets in the plan, logs in a structured
way from the first milestone, and the **observer** agent measures each milestone against
the budgets before its PR opens.

## Budgets (the plan's defaults; the spec may tighten them)

| Metric | Budget (mobile, production build) |
|---|---|
| Lighthouse Performance / Accessibility / Best Practices / SEO | ≥ 95 / 100 / 100 / 100 |
| LCP | ≤ 2.0 s (Lighthouse mobile throttling); ≤ 2.5 s on pages that draw their content from an API answer after the JS (raised by the user in M7: three round trips in a row — HTML, JS, the data — cost about 2.1 s under that throttling, and 2.5 s is Core Web Vitals' "good" — docs/metrics/m07.md); ≤ 3.0 s on pages whose LCP is a picture drawn from an API answer (a recipe's or a queue item's; `/` with a ready import, `/recipes`, `/recipes/:id`, a draft) — raised by the user in M8: a picture can only be asked for after the entry JS (about 2.4 s under that throttling) and its data, so it lands at 2.7–3.1 s whatever the picture's size (docs/metrics/m08.md). Log in and Sign up get the 2.5 s too (the user, M9): they show nothing until `/api/auth/me` answers (docs/metrics/m09.md). Text-first pages keep 2.0 s (`/` with an empty queue, `/recipes/new`) |
| CLS | ≤ 0.05 |
| TBT (lab proxy for INP) | ≤ 150 ms |
| First-load JS per route | ≤ 130 kB gzip (Next.js) / SPA: ≤ 200 kB on the app's routes, ≤ 210 kB on routes that add their own chunk to the first load (the editor: write, edit, review; cook mode). 150 until M4, 165 until M8, 180/185 until M9, 185/190 until M10, 195/205 until M10's I6; raised by the user in M8 rather than drop TanStack Form from the paste box or tailwind-merge from `cn`: the libraries the conventions require fill most of it, and LCP is set by round trips, not bytes (docs/metrics/m04.md, m08.md); raised by the user in M9: sign-in (the session gate, the avatar's menu) is a fixed cost, and `me` is preloaded so it adds no round trip (docs/metrics/m08.md, its last note); raised by the user in M10: i18next and react-i18next cost 18.1 kB gzip on every route (measured with Vite's figures, design §16.10; in the app, +18.0 kB in M10's I2: the editor 199.4 of 205, `/` 193.9 of 205, the app routes 175.1 of 195), and the English strings join the entry; Hebrew is a lazy chunk; raised by the user on 2026-11-13 (M10 I6): the English strings are in the entry, so each slice's strings cost every route, and I6 put the editor at 203.7 of 205 with I7's strings to come (design §16.10) |
| axe violations | 0 |
| Browser console errors in e2e runs | 0 |
| API p95 latency (local, warm) | ≤ 200 ms reads, ≤ 400 ms writes |
| Server errors (5xx) in the e2e run's log | 0 |

## Instrumentation built into the app

- **Structured logs:** server code logs through one logger module (`pino` JSON for a Node
  API; a thin wrapper over `console` with JSON lines in Next.js unless the plan picks pino):
  level, message, request id or route, duration, error with stack. No bare `console.log`
  left in code.
- **Errors:** every caught server error is logged once with context, at the boundary.
- **Web Vitals:** Next.js `useReportWebVitals` (or `web-vitals` in a SPA) reports LCP, CLS,
  INP to the logger in development and to the production analytics.
- **Production** (decided in the architecture step): on Vercel, Speed Insights + Web
  Analytics + runtime logs; otherwise Sentry (errors + performance) or the host's logs. Every
  project ends with a way to see real-user vitals and server errors after launch.

## How the observer measures (local, every milestone)

1. Production build (`npm run build`), recording first-load JS per route from the build
   output (Vite: `dist/assets` sizes, gzip).
2. Start the production server (and API, database if any) on a free port; capture its log
   to `.metrics/server.log`.
3. **Lighthouse** for each route the milestone touched, mobile and desktop:
   `npx -y lighthouse <url> --quiet --chrome-flags="--headless=new" --output=json
   --output-path=.metrics/lh-<route>-<form>.json --form-factor=<mobile|desktop>`
   (add `--screenEmulation.disabled --preset=desktop` for desktop). Read scores, LCP, CLS,
   TBT, and the top opportunities.
4. **Accessibility:** `@axe-core/playwright` over each route (install it as a dev dependency
   the first time, in `e2e/a11y.spec.ts`, so it becomes a permanent test).
5. **Runtime:** run `npm run e2e` with console and page-error listeners (the shared fixture in
   `e2e/fixtures.ts` fails a test on any console error); read `.metrics/server.log` for 5xx,
   slow requests (> budget) and errors.
6. **API latency** (if the app has an API or Server Actions with real I/O): 50 warm requests
   per main endpoint, report p50/p95 (`npx -y autocannon -a 50 <url>` or a short script).
7. Optional deep dive when a number misses its budget: a Chrome DevTools performance trace
   (the `chrome-devtools` MCP) of the slow route, naming the cause.

## The report

`docs/metrics/m<NN>.md`: a table of each metric → value → budget → ✅/❌ and the change since
the previous milestone, then each miss with its cause and a concrete fix. Append one line per
route to `docs/metrics/history.csv` (milestone, route, perf, a11y, lcp_ms, cls, tbt_ms,
js_kb) so trends are visible. The PR's `## Metrics` section is the table.

A miss is a finding like a review finding: fixed in the milestone's fix wave, or accepted by
the user with the reason written in the report.
