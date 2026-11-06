import { linkMessage, type Import } from "@pinch/shared";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp } from "../../test-utils.tsx";
import { pollInterval } from "./importQueries.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

const reel = "https://www.instagram.com/p/DOxAbc123/";

function importOf(fields: Partial<Import>): Import {
  return {
    id: "6650a1b2c3d4e5f600000001",
    status: "pending",
    input: { type: "link", url: reel, platform: "instagram" },
    attempts: 0,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
    ...fields,
  };
}

// A fake API for /: no recipes; the imports each GET /api/imports answers, in turn (the last
// one again and again); and what POST answers (a new Response each time: a body is read once).
function stubApi(lists: Import[][], post = () => Response.json(importOf({}), { status: 202 })) {
  let gets = 0;
  const fetch = vi.fn((path: string, init?: RequestInit) => {
    if (init?.method === "POST") return Promise.resolve(post());
    if (path === "/api/imports") {
      const items = lists[Math.min(gets, lists.length - 1)];
      gets += 1;
      return Promise.resolve(Response.json({ items }));
    }
    return Promise.resolve(Response.json({ items: [], nextCursor: null }));
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

test("a pasted link is sent trimmed, the box empties, and the link shows as waiting", async () => {
  const fetch = stubApi([[], [importOf({})]]);
  renderApp("/");

  const box = screen.getByRole("textbox", { name: "Pinch a recipe from a reel" });
  await userEvent.type(box, ` ${reel}{Enter}`);

  expect(fetch).toHaveBeenCalledWith("/api/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: reel }),
  });
  expect(await screen.findByText("Waiting to start…")).toBeInTheDocument();
  expect(screen.getByText("Instagram")).toBeInTheDocument();
  expect(box).toHaveValue("");
});

test("a link from another site is refused before it's sent, until it's fixed", async () => {
  const fetch = stubApi([[]]);
  renderApp("/");

  const box = screen.getByRole("textbox", { name: "Pinch a recipe from a reel" });
  await userEvent.type(box, "https://www.tiktok.com/@chef/video/1{Enter}");

  expect(await screen.findByRole("alert")).toHaveTextContent(linkMessage);
  expect(box).toHaveAccessibleDescription(linkMessage);
  expect(fetch).not.toHaveBeenCalledWith("/api/imports", expect.anything());

  await userEvent.clear(box);
  await userEvent.type(box, reel);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("the API's message for a link shows under the box", async () => {
  stubApi([[]], () =>
    Response.json(
      { error: { code: "invalid_input", message: "", fields: { url: "Not this one." } } },
      { status: 400 },
    ),
  );
  renderApp("/");

  const box = screen.getByRole("textbox", { name: "Pinch a recipe from a reel" });
  await userEvent.type(box, `${reel}{Enter}`);

  expect(await screen.findByRole("alert")).toHaveTextContent("Not this one.");
  expect(box).toHaveValue(reel);
});

test("when the link can't be sent, it says so and keeps the link", async () => {
  stubApi([[]], () => new Response(null, { status: 502 }));
  renderApp("/");

  const box = screen.getByRole("textbox", { name: "Pinch a recipe from a reel" });
  await userEvent.type(box, `${reel}{Enter}`);

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "We couldn't send this link. Try again.",
  );
  expect(box).toHaveValue(reel);
});

test("while a link is worked on, its status is asked again until it's ready to review", async () => {
  stubApi([[importOf({ status: "processing", attempts: 1 })], [importOf({ status: "ready" })]]);
  renderApp("/");

  expect(await screen.findByText("Working on it…")).toBeInTheDocument();
  // The 2 s poll, with time to spare.
  const review = await screen.findByRole("link", { name: "Ready to review" }, { timeout: 3000 });
  expect(review).toHaveAttribute("href", "/imports/6650a1b2c3d4e5f600000001");
});

test("a failed link says why", async () => {
  stubApi([[importOf({ status: "failed", attempts: 3, error: "We couldn't read it." })]]);
  renderApp("/");

  expect(await screen.findByText("We couldn't read it.")).toBeInTheDocument();
});

test("polling runs only while the worker has a link in hand", () => {
  const list = (...statuses: Import["status"][]) => ({
    items: statuses.map((status) => importOf({ status })),
  });
  expect(pollInterval(list("ready", "pending"))).toBe(2000);
  expect(pollInterval(list("processing"))).toBe(2000);
  expect(pollInterval(list("ready", "failed"))).toBe(false);
  expect(pollInterval(undefined)).toBe(false);
});
