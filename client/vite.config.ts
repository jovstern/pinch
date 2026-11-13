import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

// index.html's script preloads the page's language's strings by their source path (design
// §16.3), which the dev server serves as is; the build gives each its own hashed chunk, so this
// puts the chunks' names in its place. A path not found fails the build rather than preload
// nothing.
function stringsChunks(): Plugin {
  return {
    name: "strings-chunks",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html, { bundle = {} }) {
        let out = html;
        for (const language of ["en", "he"]) {
          const source = `/src/locales/${language}.ts`;
          const chunk = Object.values(bundle).find(
            (file) => file.type === "chunk" && file.facadeModuleId?.endsWith(source),
          );
          if (!chunk || !out.includes(`"${source}"`)) throw new Error(`No chunk for ${source}`);
          out = out.replace(`"${source}"`, `"/${chunk.fileName}"`);
        }
        return out;
      },
    },
  };
}

export default defineConfig({
  // The React Compiler memoizes components, so the code never uses useMemo/useCallback/memo.
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss(), stringsChunks()],
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
