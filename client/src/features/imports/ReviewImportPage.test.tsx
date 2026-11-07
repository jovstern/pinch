import type { Import, Recipe, RecipeInput } from "@pinch/shared";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp } from "../../test-utils.tsx";

afterEach(() => {
  vi.unstubAllGlobals();
});

const reel = "https://www.instagram.com/p/DOxAbc123/";

const draft: RecipeInput = {
  title: "Tomato pasta",
  ingredients: [{ name: "spaghetti" }],
  steps: ["Boil it."],
  tags: [],
};

const ready: Import = {
  id: "6650a1b2c3d4e5f600000001",
  status: "ready",
  input: { type: "link", url: reel, platform: "instagram" },
  attempts: 1,
  stalled: false,
  draft,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
};

const saved: Recipe = {
  ...draft,
  id: "6650a1b2c3d4e5f600000002",
  title: "Nonna's tomato pasta",
  source: { type: "instagram", url: reel },
  createdAt: "2026-11-01T10:01:00.000Z",
  updatedAt: "2026-11-01T10:01:00.000Z",
};

// A fake API: this import, the recipe approve makes, DELETE answering 204 (or the status
// given), and an empty /.
function stubApi(job: Import = ready, deleteStatus = 204) {
  const fetch = vi.fn((path: string, init?: RequestInit) => {
    if (init?.method === "DELETE") {
      return Promise.resolve(new Response(null, { status: deleteStatus }));
    }
    if (path.endsWith("/approve")) return Promise.resolve(Response.json(saved, { status: 201 }));
    if (path === `/api/imports/${job.id}`) return Promise.resolve(Response.json(job));
    if (path === `/api/recipes/${saved.id}`) return Promise.resolve(Response.json(saved));
    if (path === "/api/imports") return Promise.resolve(Response.json({ items: [] }));
    return Promise.resolve(Response.json({ items: [], nextCursor: null }));
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

test("the draft opens in the form; Save approves it as edited and shows the recipe", async () => {
  const fetch = stubApi();
  renderApp(`/imports/${ready.id}`);

  const title = await screen.findByLabelText("Title");
  expect(title).toHaveValue("Tomato pasta");
  await userEvent.clear(title);
  await userEvent.type(title, "Nonna's tomato pasta");
  await userEvent.click(screen.getByRole("button", { name: "Save recipe" }));

  expect(
    await screen.findByRole("heading", { level: 1, name: "Nonna's tomato pasta" }),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(`/api/imports/${ready.id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...draft, title: "Nonna's tomato pasta" }),
  });
});

test("Discard deletes the import and goes back to the recipes", async () => {
  const fetch = stubApi();
  renderApp(`/imports/${ready.id}`);

  await userEvent.click(await screen.findByRole("button", { name: "Discard" }));

  expect(
    await screen.findByRole("heading", { level: 1, name: "Your recipes" }),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(`/api/imports/${ready.id}`, { method: "DELETE" });
});

test("when Discard fails, it says so and keeps the draft", async () => {
  stubApi(ready, 500);
  renderApp(`/imports/${ready.id}`);

  await userEvent.click(await screen.findByRole("button", { name: "Discard" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "It couldn't be discarded. Try again.",
  );
  expect(screen.getByLabelText("Title")).toHaveValue("Tomato pasta");
});

test("an import with no draft yet says it isn't ready", async () => {
  stubApi({ ...ready, status: "processing", draft: undefined });
  renderApp(`/imports/${ready.id}`);

  expect(
    await screen.findByRole("heading", { level: 1, name: "Not ready to review" }),
  ).toBeInTheDocument();
});

test("an import that doesn't exist shows the not-found page", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
  renderApp(`/imports/${ready.id}`);

  expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
});
