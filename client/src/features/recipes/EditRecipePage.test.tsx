import type { Recipe } from "@pinch/shared";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp } from "../../test-utils.tsx";

afterEach(() => {
  vi.unstubAllGlobals();
});

const omelette: Recipe = {
  id: "6650a1b2c3d4e5f600000001",
  title: "Omelette",
  ingredients: [{ name: "eggs", quantity: "2" }],
  steps: ["Beat the eggs.", "Cook them in butter."],
  servings: 1,
  source: { type: "manual" },
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
};

// A fake API: the recipe, an empty list, and PUT answering with what was sent, saved.
function stubApi() {
  const fetch = vi.fn((path: string, init?: RequestInit) => {
    if (init?.method === "PUT") {
      return Promise.resolve(Response.json({ ...omelette, title: "Cheese omelette" }));
    }
    if (path === "/api/recipes")
      return Promise.resolve(Response.json({ items: [], nextCursor: null }));
    return Promise.resolve(Response.json(omelette));
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

test("shows the recipe in the form, and saves the whole of it", async () => {
  const fetch = stubApi();
  renderApp(`/recipes/${omelette.id}/edit`);

  const title = await screen.findByLabelText("Title");
  expect(title).toHaveValue("Omelette");
  expect(screen.getByLabelText("Step 2")).toHaveValue("Cook them in butter.");
  await userEvent.clear(title);
  await userEvent.type(title, "Cheese omelette");
  // A field emptied in the form is left out, so PUT clears it (design D20).
  await userEvent.clear(screen.getByLabelText("Serves"));
  await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

  expect(
    await screen.findByRole("heading", { level: 1, name: "Cheese omelette" }),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(`/api/recipes/${omelette.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Cheese omelette",
      ingredients: omelette.ingredients,
      steps: omelette.steps,
    }),
  });
});

test("editing a recipe that doesn't exist shows the not-found page", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
  renderApp("/recipes/6650a1b2c3d4e5f600000099/edit");

  expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
});

test("Cancel goes back to the recipe, unchanged", async () => {
  const fetch = stubApi();
  renderApp(`/recipes/${omelette.id}/edit`);

  await userEvent.type(await screen.findByLabelText("Title"), " with herbs");
  await userEvent.click(screen.getByRole("link", { name: "Cancel" }));

  expect(await screen.findByRole("heading", { level: 1, name: "Omelette" })).toBeInTheDocument();
  expect(fetch.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);
});
