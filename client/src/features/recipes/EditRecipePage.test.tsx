import type { Recipe } from "@pinch/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp, stubFetch } from "../../test-utils.tsx";

afterEach(() => {
  vi.unstubAllGlobals();
});

const omelette: Recipe = {
  id: "6650a1b2c3d4e5f600000001",
  title: "Omelette",
  ingredients: [{ name: "eggs", quantity: "2" }],
  steps: ["Beat the eggs.", "Cook them in butter."],
  servings: 1,
  tags: ["meal:breakfast"],
  source: { type: "manual" },
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
};

// A fake API: the recipe, an empty list, and PUT answering with the recipe as the test saves
// it (retitled, servings cleared).
function stubApi() {
  const fetch = vi.fn((path: string, init?: RequestInit) => {
    if (init?.method === "PUT") {
      const saved = { ...omelette, title: "Cheese omelette", servings: undefined };
      return Promise.resolve(Response.json(saved));
    }
    if (path === "/api/recipes")
      return Promise.resolve(Response.json({ items: [], nextCursor: null }));
    return Promise.resolve(Response.json(omelette));
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

test("shows the recipe in the form, saves the whole of it, and focuses its title", async () => {
  const fetch = stubApi();
  renderApp(`/recipes/${omelette.id}/edit`);

  const title = await screen.findByLabelText("Title");
  expect(title).toHaveValue("Omelette");
  expect(screen.getByLabelText("Step 2")).toHaveValue("Cook them in butter.");
  await userEvent.clear(title);
  await userEvent.type(title, "Cheese omelette");
  // A field emptied in the form is left out, so PUT clears it (design D20).
  await userEvent.clear(screen.getByLabelText("Serves"));
  // Its tag shows as a chip; remove it and add another.
  await userEvent.click(screen.getByRole("button", { name: "Remove breakfast" }));
  await userEvent.click(screen.getByRole("button", { name: "Add tag" }));
  await userEvent.click(await screen.findByRole("checkbox", { name: "spicy" }));
  await userEvent.click(screen.getByRole("button", { name: "Done" }));
  await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

  expect(await screen.findByRole("heading", { level: 1, name: "Cheese omelette" })).toHaveFocus();
  // Keys in the schema's order.
  expect(fetch).toHaveBeenCalledWith(`/api/recipes/${omelette.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Cheese omelette",
      ingredients: omelette.ingredients,
      steps: omelette.steps,
      tags: ["flavor:spicy"],
    }),
  });
});

test("the editor sits under the recipe, with Save changes and Cancel", async () => {
  stubApi();
  renderApp(`/recipes/${omelette.id}/edit`);

  const breadcrumb = await screen.findByRole("navigation", { name: "Breadcrumb" });
  expect(within(breadcrumb).getByRole("link", { name: "Omelette" })).toHaveAttribute(
    "href",
    `/recipes/${omelette.id}`,
  );
  expect(within(breadcrumb).getByText("Edit")).toHaveAttribute("aria-current", "page");
  expect(await screen.findByText("Source: Written by you")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Cancel" })).toBeInTheDocument();
});

test("editing a recipe that doesn't exist shows the not-found page", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
  renderApp("/recipes/6650a1b2c3d4e5f600000099/edit");

  expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
});

test("Cancel with no changes goes straight back to the recipe", async () => {
  stubApi();
  renderApp(`/recipes/${omelette.id}/edit`);

  await screen.findByLabelText("Title");
  await userEvent.click(screen.getByRole("link", { name: "Cancel" }));

  expect(await screen.findByRole("heading", { level: 1, name: "Omelette" })).toBeInTheDocument();
});

test("Cancel with changes asks first; Keep editing keeps them", async () => {
  stubApi();
  renderApp(`/recipes/${omelette.id}/edit`);

  await userEvent.type(await screen.findByLabelText("Title"), " with herbs");
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  const dialog = screen.getByRole("alertdialog", { name: "Discard your changes?" });
  await userEvent.click(within(dialog).getByRole("button", { name: "Keep editing" }));

  expect(screen.getByLabelText("Title")).toHaveValue("Omelette with herbs");
});

test("Discard changes goes back to the recipe, unchanged", async () => {
  const fetch = stubApi();
  renderApp(`/recipes/${omelette.id}/edit`);

  await userEvent.type(await screen.findByLabelText("Title"), " with herbs");
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await userEvent.click(screen.getByRole("button", { name: "Discard changes" }));

  expect(await screen.findByRole("heading", { level: 1, name: "Omelette" })).toBeInTheDocument();
  expect(fetch.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);
});

test("a failed refetch keeps the form and what was typed", async () => {
  // The first load works; every request after it fails.
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json(omelette))
    .mockResolvedValue(new Response(null, { status: 500 }));
  stubFetch(fetch);
  renderApp(`/recipes/${omelette.id}/edit`);

  const title = await screen.findByLabelText("Title");
  await userEvent.type(title, " with herbs");
  // Coming back to the tab refetches the recipe (TanStack Query's refetch on window focus).
  window.dispatchEvent(new Event("visibilitychange"));

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  expect(screen.getByLabelText("Title")).toHaveValue("Omelette with herbs");
});
