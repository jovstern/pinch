import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The React Compiler memoizes components, so the code never uses useMemo/useCallback/memo.
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  // The browser calls the API on the same origin, so no CORS in development (design §8.3).
  server: { proxy: { "/api": "http://localhost:3000" } },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
