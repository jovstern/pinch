import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import { App } from "./App.tsx";

// Renders the whole app at one address, with what main.tsx provides. No retries, so a failing
// request shows its error straight away.
export function renderApp(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// Stubs fetch with this one, except GET /api/imports, which answers none: / asks for the
// imports on every visit, and these tests are about something else.
export function stubFetch(fetch: (...args: [string, RequestInit?]) => Promise<Response>) {
  // Passed on untouched: toHaveBeenCalledWith tells fetch(path) from fetch(path, undefined).
  vi.stubGlobal("fetch", (...args: [string, RequestInit?]) =>
    args[0] === "/api/imports" ? Promise.resolve(Response.json({ items: [] })) : fetch(...args),
  );
}
