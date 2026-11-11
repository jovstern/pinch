import type { Me } from "@pinch/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { toast } from "sonner";
import { vi } from "vitest";
import { App } from "./App.tsx";
import { meQuery } from "./features/auth/authQueries.ts";

// The user every test is signed in as, unless it passes { me: null }.
export const testUser: Me = {
  id: "6650a1b2c3d4e5f600000099",
  email: "cook@example.com",
  name: "Dana",
};

// Renders the whole app at one address, with what main.tsx provides. No retries, so a failing
// request shows its error straight away. jsdom has no matchMedia, which the Toaster and My
// recipes' Filters panel read: here the screen is a phone's, or with wide a desktop's (1024 px
// and up). Sonner keeps its toasts outside React and shows a new Toaster the ones still open, so
// a test's toasts are closed before the next. Signed in already (who's signed in is in the cache,
// as the app has it once GET /api/auth/me answers), so the page renders at once.
export function renderApp(
  path: string,
  { wide = false, me = testUser }: { wide?: boolean; me?: Me | null } = {},
) {
  toast.dismiss();
  vi.stubGlobal("matchMedia", () => ({
    matches: wide,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(meQuery.queryKey, me);
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
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
