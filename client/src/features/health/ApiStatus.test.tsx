import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ApiStatus } from "./ApiStatus.tsx";

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderApiStatus() {
  // No retries, so a failing request shows its error straight away.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ApiStatus />
    </QueryClientProvider>,
  );
}

test("says it is connected when the API answers", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ status: "ok" })));
  renderApiStatus();
  expect(await screen.findByText("Connected to the API")).toBeInTheDocument();
});

test("says it can't reach the API when the request fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 502 })));
  renderApiStatus();
  expect(await screen.findByText("Can't reach the API")).toBeInTheDocument();
});
