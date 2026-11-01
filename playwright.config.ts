import { randomUUID } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

// The e2e run gets its own API, client and database, on their own ports, so it never touches
// the dev servers or the app's data. Workers load this file again; the env var keeps one name.
process.env.E2E_DB_NAME ??= `pinch-test-${randomUUID()}`;
const apiUrl = "http://localhost:3100";
const clientUrl = "http://localhost:4173";

export default defineConfig({
  testDir: "e2e",
  globalTeardown: "./e2e/teardown.ts",
  forbidOnly: !!process.env.CI,
  // Every run is recorded: the video is the milestone's demo (pr-demo skill).
  use: { baseURL: clientUrl, video: "on", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node src/index.ts",
      cwd: "server",
      url: `${apiUrl}/api/ready`,
      env: { PORT: "3100", DB_NAME: process.env.E2E_DB_NAME },
    },
    {
      // The production build, as users get it; preview proxies /api like the dev server.
      command: "npx vite build && npx vite preview --port 4173 --strictPort",
      cwd: "client",
      url: clientUrl,
      env: { API_URL: apiUrl },
    },
  ],
});
