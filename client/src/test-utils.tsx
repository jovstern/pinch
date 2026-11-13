import type { Me } from "@pinch/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import i18next from "i18next";
import { Direction } from "radix-ui";
import { MemoryRouter } from "react-router";
import { toast } from "sonner";
import { onTestFinished, vi } from "vitest";
import { App } from "./App.tsx";
import { meQuery } from "./features/auth/authQueries.ts";
import { loadHebrew, pageIsRtl } from "./i18n.ts";

// The user every test is signed in as, unless it passes { me: null } (signed out) or
// { me: "ask" } (the app asks GET /api/auth/me, through the test's fetch).
export const testUser: Me = {
  id: "6650a1b2c3d4e5f600000099",
  email: "cook@example.com",
  name: "Dana",
  language: "en",
};

// Renders the whole app at one address, with what main.tsx provides. No retries, so a failing
// request shows its error straight away. jsdom has no matchMedia, which the Toaster and My
// recipes' Filters panel read: here the screen is a phone's, or with wide a desktop's (1024 px
// and up). Sonner keeps its toasts outside React and shows a new Toaster the ones still open, so
// a test's toasts are closed before the next. Signed in already (who's signed in is in the cache,
// as the app has it once GET /api/auth/me answers), so the page renders at once.
export function renderApp(
  path: string,
  { wide = false, me = testUser }: { wide?: boolean; me?: Me | null | "ask" } = {},
) {
  toast.dismiss();
  vi.stubGlobal("matchMedia", () => ({
    matches: wide,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (me !== "ask") queryClient.setQueryData(meQuery.queryKey, me);
  render(
    <Direction.Provider dir={pageIsRtl() ? "rtl" : "ltr"}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    </Direction.Provider>,
  );
}

// renderApp in Hebrew (design §16.11): <html lang="he" dir="rtl">, as index.html's script sets
// it, and Hebrew's strings, as main.tsx loads them. Back to English once the test is done, the
// other tests' language (test-setup.ts).
export async function renderInHebrew(path: string, options?: Parameters<typeof renderApp>[1]) {
  // First, so a failure below still puts English back.
  onTestFinished(async () => {
    document.documentElement.removeAttribute("lang");
    document.documentElement.removeAttribute("dir");
    await i18next.changeLanguage("en");
  });
  document.documentElement.lang = "he";
  document.documentElement.dir = "rtl";
  await loadHebrew();
  renderApp(path, options);
}

// A toast's title, whole, for getByText and its kin: a recipe's title in it is in its own <bdi>
// (design §16.5), and a plain string only matches an element's own text, not across one.
export function toastTitled(title: string) {
  return (_: string, element: Element | null) =>
    element?.hasAttribute("data-title") === true && element.textContent === title;
}

// Stubs fetch with this one, except GET /api/imports and /api/recipes/count, which answer none:
// every page asks for them (the Header's counts), and these tests are about something else.
export function stubFetch(fetch: (...args: [string, RequestInit?]) => Promise<Response>) {
  // Passed on untouched: toHaveBeenCalledWith tells fetch(path) from fetch(path, undefined).
  vi.stubGlobal("fetch", (...args: [string, RequestInit?]) => {
    if (args[0] === "/api/imports") return Promise.resolve(Response.json({ items: [] }));
    if (args[0] === "/api/recipes/count") return Promise.resolve(Response.json({ count: 0 }));
    return fetch(...args);
  });
}
