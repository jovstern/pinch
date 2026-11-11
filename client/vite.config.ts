import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The React Compiler memoizes components, so the code never uses useMemo/useCallback/memo.
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  // The browser calls the API on the same origin, so no CORS in development (design §8.3).
  // `vite preview` uses the same proxy; the e2e run points it at its own API (API_URL).
  server: { proxy: { "/api": process.env.API_URL ?? "http://localhost:3000" } },
  // Everything the entry needs in one file. Left alone, Rolldown cuts it into a chunk per set of
  // lazy chunks that share it (react-router's in two since Log in and Sign up, zod, TanStack
  // Query…): 17 files, all asked for at once, which on HTTP/1.1's 6 connections queue behind each
  // other and cost every page its LCP (docs/metrics/m09.md, Miss 3). The lazy chunks still load
  // only what they add.
  build: {
    rolldownOptions: {
      output: { codeSplitting: { groups: [{ name: "index", tags: ["$initial"] }] } },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
