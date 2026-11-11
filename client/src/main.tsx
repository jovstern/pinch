import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App.tsx";
import { queueKnown } from "./features/imports/importQueries.ts";
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

function render(root: HTMLElement) {
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}

// Add recipe centres its block by the queue's height, so it waits for the queue (ImportPage).
// Opened there, the app renders once the queue is in, asked for by index.html's preload with the
// page: the block paints with the header (LCP 0.75 s in Lighthouse, not 2.6). queueKnown gives up
// after 1 s or on any failure, and the page then shows its error or its queue when it comes. Not
// a top-level await, which splits the entry into many chunks.
if (location.pathname === "/") {
  void queueKnown(queryClient).then(() => {
    render(root);
  });
} else {
  render(root);
}
