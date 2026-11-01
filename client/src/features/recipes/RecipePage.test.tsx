import type { Recipe } from "@pinch/shared";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp } from "../../test-utils.tsx";

afterEach(() => {
  vi.unstubAllGlobals();
});

const omelette: Recipe = {
  id: "6650a1b2c3d4e5f600000001",
  title: "Omelette",
  ingredients: [
    { name: "eggs", quantity: "2" },
    { name: "butter", quantity: "1", unit: "tbsp", note: "soft" },
  ],
  steps: ["Beat the eggs.", "Cook them in butter."],
  servings: 1,
  prepMinutes: 5,
  source: { type: "manual" },
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
};

// A fake API: the recipe, an empty list, and DELETE answering 204.
function stubApi() {
  const fetch = vi.fn((path: string, init?: RequestInit) => {
    if (init?.method === "DELETE") return Promise.resolve(new Response(null, { status: 204 }));
    if (path === "/api/recipes")
      return Promise.resolve(Response.json({ items: [], nextCursor: null }));
    return Promise.resolve(Response.json(omelette));
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

test("shows the recipe: its details, ingredients and steps", async () => {
  stubApi();
  renderApp(`/recipes/${omelette.id}`);

  expect(await screen.findByRole("heading", { level: 1, name: "Omelette" })).toBeInTheDocument();
  expect(screen.getByText("Serves 1 · Prep 5 min")).toBeInTheDocument();
  const ingredients = screen.getByRole("list", { name: "Ingredients" });
  expect(
    within(ingredients)
      .getAllByRole("listitem")
      .map((item) => item.textContent),
  ).toEqual(["2 eggs", "1 tbsp butter, soft"]);
  const steps = screen.getByRole("list", { name: "Steps" });
  expect(within(steps).getAllByRole("listitem")).toHaveLength(2);
});

test("a recipe that doesn't exist shows the not-found page", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
  renderApp("/recipes/6650a1b2c3d4e5f600000099");

  expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
});

test("Delete asks first, then deletes the recipe and goes back to the list", async () => {
  const fetch = stubApi();
  renderApp(`/recipes/${omelette.id}`);

  await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
  const dialog = screen.getByRole("alertdialog", { name: "Delete this recipe?" });
  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  expect(await screen.findByRole("heading", { name: "Your recipes" })).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(`/api/recipes/${omelette.id}`, { method: "DELETE" });
});

test("Keep it closes the question without deleting", async () => {
  const fetch = stubApi();
  renderApp(`/recipes/${omelette.id}`);

  await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
  await userEvent.click(screen.getByRole("button", { name: "Keep it" }));

  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalledWith(expect.anything(), { method: "DELETE" });
});
