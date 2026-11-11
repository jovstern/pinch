import { QueryClient } from "@tanstack/react-query";
import { afterEach, expect, test, vi } from "vitest";
import { importListQuery, queueKnown } from "./importQueries.ts";

// The gate before /'s first render (main.tsx): it must always end, or the page stays blank.

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test("queueKnown settles with the queue in the cache once it answers", async () => {
  vi.stubGlobal("fetch", () => Promise.resolve(Response.json({ items: [] })));
  const queryClient = new QueryClient();

  await queueKnown(queryClient);
  expect(queryClient.getQueryData(importListQuery.queryKey)).toEqual({ items: [] });
});

test("queueKnown settles when the queue answers an error, or can't be reached", async () => {
  vi.stubGlobal("fetch", () => Promise.resolve(new Response(null, { status: 401 })));
  await expect(queueKnown(new QueryClient())).resolves.toBeUndefined();

  vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
  await expect(queueKnown(new QueryClient())).resolves.toBeUndefined();
});

test("queueKnown gives up after 1 s when the queue doesn't answer", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", () => new Promise<Response>(() => undefined));
  let settled = false;
  void queueKnown(new QueryClient()).then(() => {
    settled = true;
  });

  await vi.advanceTimersByTimeAsync(999);
  expect(settled).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(settled).toBe(true);
});
