import type { Recipe } from "@pinch/shared";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp, stubFetch } from "../../test-utils.tsx";

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
  tags: ["meal:breakfast", "cuisine:middle-eastern"],
  nutritionPerServing: { calories: 251.4, proteinG: 13, carbsG: 0.6, fatG: 21.5 },
  source: { type: "manual" },
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
};

// A fake API: the recipe, an empty list, and DELETE answering 204 (or the status given).
function stubApi(deleteStatus = 204) {
  const fetch = vi.fn((path: string, init?: RequestInit) => {
    if (init?.method === "DELETE") {
      return Promise.resolve(new Response(null, { status: deleteStatus }));
    }
    if (path === "/api/recipes")
      return Promise.resolve(Response.json({ items: [], nextCursor: null }));
    return Promise.resolve(Response.json(omelette));
  });
  // Delete goes to /, which asks for the imports too.
  stubFetch(fetch);
  return fetch;
}

test("shows the recipe: its details, nutrition, tags, ingredients and steps", async () => {
  stubApi();
  renderApp(`/recipes/${omelette.id}`);

  expect(await screen.findByRole("heading", { level: 1, name: "Omelette" })).toBeInTheDocument();
  expect(screen.getByText(/Prep 5 min/)).toHaveTextContent(
    "Written by you · Serves 1 · Prep 5 min",
  );
  expect(screen.getByText(/≈ 251 kcal/)).toHaveTextContent(
    "≈ 251 kcal · 13 g protein · 1 g carbs · 22 g fat per serving (estimate)",
  );
  const tags = screen.getByRole("list", { name: "Tags" });
  expect(
    within(tags)
      .getAllByRole("listitem")
      .map((item) => item.textContent),
  ).toEqual(["breakfast", "middle eastern"]);
  // Each tag opens My recipes filtered by it.
  expect(within(tags).getByRole("link", { name: "breakfast" })).toHaveAttribute(
    "href",
    "/recipes?tags=meal%3Abreakfast",
  );
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

test("when loading fails, it offers to try again", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
  renderApp(`/recipes/${omelette.id}`);

  expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
});

test("Delete asks first, then deletes the recipe and goes back to the list", async () => {
  const fetch = stubApi();
  renderApp(`/recipes/${omelette.id}`);

  await chooseDelete();
  const dialog = await screen.findByRole("alertdialog", { name: "Delete this recipe?" });
  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  expect(await screen.findByRole("heading", { level: 1, name: "My recipes" })).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(`/api/recipes/${omelette.id}`, { method: "DELETE" });
});

test("Keep it closes the question without deleting", async () => {
  const fetch = stubApi();
  renderApp(`/recipes/${omelette.id}`);

  await chooseDelete();
  await userEvent.click(await screen.findByRole("button", { name: "Keep it" }));

  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  // Focus goes back to ⋯, for a keyboard to carry on from there (a tick later: Radix's way).
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "More actions" })).toHaveFocus();
  });
  expect(fetch).not.toHaveBeenCalledWith(expect.anything(), { method: "DELETE" });
});

test("a failed delete keeps the question open and says so", async () => {
  stubApi(500);
  renderApp(`/recipes/${omelette.id}`);

  await chooseDelete();
  const dialog = await screen.findByRole("alertdialog");
  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  expect(await within(dialog).findByRole("alert")).toHaveTextContent("It couldn't be deleted.");
  expect(screen.queryByRole("heading", { level: 1, name: "My recipes" })).not.toBeInTheDocument();
});

test("shows the post's picture at the top, at its size, when the recipe has one", async () => {
  stubFetch(() =>
    Promise.resolve(Response.json({ ...omelette, thumbnail: { width: 281, height: 500 } })),
  );
  renderApp(`/recipes/${omelette.id}`);

  await screen.findByRole("heading", { level: 1, name: "Omelette" });
  // Decorative (alt=""), so a presentation, not an image.
  const picture = screen.getByRole("presentation");
  expect(picture).toHaveAttribute("src", `/api/recipes/${omelette.id}/thumbnail`);
  expect(picture).toHaveAttribute("width", "281");
  expect(picture).toHaveAttribute("height", "500");
});

test("a recipe with no picture shows none", async () => {
  stubApi();
  renderApp(`/recipes/${omelette.id}`);

  await screen.findByRole("heading", { level: 1, name: "Omelette" });
  expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
});

test("a picture that doesn't load is left out, with no broken image", async () => {
  stubFetch(() =>
    Promise.resolve(Response.json({ ...omelette, thumbnail: { width: 281, height: 500 } })),
  );
  renderApp(`/recipes/${omelette.id}`);

  fireEvent.error(await screen.findByRole("presentation"));

  expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
});

test("⋯ holds Edit, Share (coming soon) and Delete", async () => {
  stubApi();
  renderApp(`/recipes/${omelette.id}`);

  await userEvent.click(await screen.findByRole("button", { name: "More actions" }));
  const menu = await screen.findByRole("menu");
  expect(within(menu).getByRole("menuitem", { name: "Edit" })).toHaveAttribute(
    "href",
    `/recipes/${omelette.id}/edit`,
  );
  expect(within(menu).getByRole("menuitem", { name: "Share · coming soon" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  expect(within(menu).getByRole("menuitem", { name: "Delete…" })).toBeInTheDocument();
});

test("Comments are there, and say they're coming", async () => {
  stubApi();
  renderApp(`/recipes/${omelette.id}`);

  expect(await screen.findByRole("heading", { level: 2, name: "Comments" })).toBeInTheDocument();
  expect(screen.getByText(/Coming soon: notes from whoever/)).toBeInTheDocument();
});

test("breadcrumbs lead back to My recipes, then name the recipe", async () => {
  stubApi();
  renderApp(`/recipes/${omelette.id}`);

  const breadcrumb = await screen.findByRole("navigation", { name: "Breadcrumb" });
  expect(within(breadcrumb).getByRole("link", { name: "My recipes" })).toHaveAttribute(
    "href",
    "/recipes",
  );
  expect(within(breadcrumb).getByText("Omelette")).toHaveAttribute("aria-current", "page");
});

test("a recipe from a link names its site and links to the post, in a new tab", async () => {
  const url = "https://www.instagram.com/reel/abc123/";
  stubFetch(() =>
    Promise.resolve(Response.json({ ...omelette, source: { type: "instagram", url } })),
  );
  renderApp(`/recipes/${omelette.id}`);

  const post = await screen.findByRole("link", { name: /^Instagram.*opens in a new tab/ });
  expect(post).toHaveAttribute("href", url);
  expect(post).toHaveAttribute("target", "_blank");
  expect(screen.queryByText(/Written by you/)).not.toBeInTheDocument();
});

// Delete is in the ⋯ menu.
async function chooseDelete() {
  await userEvent.click(await screen.findByRole("button", { name: "More actions" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Delete…" }));
}
