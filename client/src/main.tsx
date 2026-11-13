import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Direction } from "radix-ui";
import { BrowserRouter } from "react-router";
import { App } from "./App.tsx";
import { queueKnown } from "./features/imports/importQueries.ts";
import { pageIsRtl, pageLanguage, startI18n } from "./i18n.ts";
import { ApiError } from "./lib/api.ts";
import { loadDisplayFont } from "./lib/displayFont.ts";
import "./globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");

// One retry, not TanStack's default three (about 7 s), so an error shows up quickly; and none
// for a 404 or a 401, which will not change on a second try.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        failureCount < 1 &&
        !(error instanceof ApiError && (error.status === 404 || error.status === 401)),
    },
  },
});

loadDisplayFont();

// Radix's menus and radio groups follow the page's direction (§16.4): a menu aligned to the end
// opens toward the left in Hebrew, and the arrow keys follow.
function render(root: HTMLElement) {
  createRoot(root).render(
    <StrictMode>
      <Direction.Provider dir={pageIsRtl() ? "rtl" : "ltr"}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </Direction.Provider>
    </StrictMode>,
  );
}

// What the first render waits for, so nothing is drawn twice: the strings of the language
// index.html's script chose (design §16.2), and on / the queue (below). Fetched side by side.
const waits: Promise<unknown>[] = [startI18n(pageLanguage())];

// Add recipe centres its block by the queue's height, so it waits for the queue (ImportPage).
// Opened there, the app renders once the queue is in, asked for by index.html's preload with the
// page: the block paints with the header (LCP 0.75 s in Lighthouse, not 2.6). queueKnown gives up
// after 1 s or on any failure, and the page then shows its error or its queue when it comes. Not
// a top-level await, which splits the entry into many chunks. Only signed in, as index.html's
// preload (the pinch_signed_in hint, design §8.3): signed out, the queue is a 401 in the console,
// and the page is Log in.
if (location.pathname === "/" && /(^|; )pinch_signed_in=1/.test(document.cookie)) {
  waits.push(queueKnown(queryClient));
}
void Promise.all(waits).then(() => {
  render(root);
});
