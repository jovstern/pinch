import { randomUUID } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

// The e2e run gets its own API, client and database, on their own ports, so it never touches
// the dev servers or the app's data. The name goes through an env var so e2e/teardown.ts can
// drop it; `??=` keeps one name when Playwright loads this file again.
process.env.E2E_DB_NAME ??= `pinch-test-${randomUUID()}`;
const apiPort = 3110;
const clientPort = 4173;

export default defineConfig({
  testDir: "e2e",
  globalTeardown: "./e2e/teardown.ts",
  forbidOnly: !!process.env.CI,
  // Every run is recorded: the video is the milestone's demo (pr-demo skill).
  use: {
    baseURL: `http://localhost:${String(clientPort)}`,
    video: "on",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // The database gets the app's indexes (text search needs its own) and the sample
      // recipes, then the API starts. Its log is kept for the observer, who reads it for 5xx
      // and errors (metrics skill).
      command:
        "node src/dbIndexes.ts && node src/dbSeed.ts && mkdir -p ../.metrics && node src/index.ts > ../.metrics/e2e-server.log",
      cwd: "server",
      url: `http://localhost:${String(apiPort)}/api/ready`,
      env: { PORT: String(apiPort), DB_NAME: process.env.E2E_DB_NAME },
      // Runs the API's own shutdown (server/src/index.ts) instead of killing it.
      gracefulShutdown: { signal: "SIGTERM", timeout: 2000 },
    },
    {
      // The import worker, on the same database, so a pasted link becomes a draft (M4). It has
      // no address to wait for: Playwright waits for its "worker started" line instead, and tee
      // keeps its log next to the API's for the observer.
      command: "mkdir -p ../.metrics && node src/worker.ts | tee ../.metrics/e2e-worker.log",
      cwd: "server",
      wait: { stdout: /worker started/ },
      env: { DB_NAME: process.env.E2E_DB_NAME },
      // Its own shutdown (server/src/worker.ts): it finishes the job in hand, a few seconds.
      gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
    },
    {
      // The production build, as users get it; preview proxies /api like the dev server.
      command: `npm run build && npx vite preview --port ${String(clientPort)} --strictPort`,
      cwd: "client",
      url: `http://localhost:${String(clientPort)}`,
      env: { API_URL: `http://localhost:${String(apiPort)}` },
    },
  ],
});
