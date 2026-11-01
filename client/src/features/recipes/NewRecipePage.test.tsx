import type { Recipe } from "@pinch/shared";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp } from "../../test-utils.tsx";

afterEach(() => {
  vi.unstubAllGlobals();
});

const saved: Recipe = {
  id: "6650a1b2c3d4e5f600000001",
  title: "Toast",
  ingredients: [
    { name: "bread", quantity: "2", unit: "slices" },
    { name: "butter", note: "soft" },
  ],
  steps: ["Toast the bread."],
  servings: 1,
  source: { type: "manual" },
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
};

// A fake API: POST answers with the given response, the list is empty, and the saved recipe
// is there (its page refetches it).
function stubApi(postResponse: () => Response) {
  const fetch = vi.fn((path: string, init?: RequestInit) => {
    if (init?.method === "POST") return Promise.resolve(postResponse());
    if (path === "/api/recipes")
      return Promise.resolve(Response.json({ items: [], nextCursor: null }));
    return Promise.resolve(Response.json(saved));
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function ingredient(number: number) {
  return within(screen.getByRole("group", { name: `Ingredient ${String(number)}` }));
}

test("saves a new recipe and shows it", async () => {
  const fetch = stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  await userEvent.type(await screen.findByLabelText("Title"), "Toast");
  await userEvent.type(screen.getByLabelText("Serves"), "1");
  await userEvent.type(ingredient(1).getByLabelText("Amount"), "2");
  await userEvent.type(ingredient(1).getByLabelText("Unit"), "slices");
  await userEvent.type(ingredient(1).getByLabelText("Ingredient"), "bread");
  await userEvent.click(screen.getByRole("button", { name: "Add an ingredient" }));
  await userEvent.type(ingredient(2).getByLabelText("Ingredient"), "butter");
  await userEvent.type(ingredient(2).getByLabelText("Note"), "soft");
  await userEvent.type(screen.getByLabelText("Step 1"), "Toast the bread.");
  await userEvent.click(screen.getByRole("button", { name: "Save recipe" }));

  expect(await screen.findByRole("heading", { level: 1, name: "Toast" })).toBeInTheDocument();
  // Blank optional fields aren't sent; the numbers are numbers. (Keys in the schema's order.)
  expect(fetch).toHaveBeenCalledWith("/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Toast",
      ingredients: saved.ingredients,
      steps: ["Toast the bread."],
      servings: 1,
    }),
  });
});

test("an incomplete recipe says what to fix, and focuses the first field", async () => {
  const fetch = stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  await userEvent.type(await screen.findByLabelText("Prep (min)"), "ten");
  await userEvent.click(screen.getByRole("button", { name: "Save recipe" }));

  expect(await screen.findByText("Give the recipe a title.")).toBeInTheDocument();
  expect(screen.getByText("Enter a whole number.")).toBeInTheDocument();
  expect(screen.getByText("Name the ingredient.")).toBeInTheDocument();
  expect(screen.getByText("A step can't be empty.")).toBeInTheDocument();
  expect(screen.getByLabelText("Title")).toHaveFocus();
  expect(screen.getByLabelText("Title")).toHaveAccessibleDescription("Give the recipe a title.");
  expect(fetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
});

test("shows the API's message under the field it names", async () => {
  stubApi(() =>
    Response.json(
      {
        error: {
          code: "invalid_input",
          message: "Some fields are not valid.",
          fields: { "ingredients.0.name": "Keep it under 200 characters." },
        },
      },
      { status: 400 },
    ),
  );
  renderApp("/recipes/new");

  await userEvent.type(await screen.findByLabelText("Title"), "Toast");
  await userEvent.type(ingredient(1).getByLabelText("Ingredient"), "bread");
  await userEvent.type(screen.getByLabelText("Step 1"), "Toast the bread.");
  await userEvent.click(screen.getByRole("button", { name: "Save recipe" }));

  const name = ingredient(1).getByLabelText("Ingredient");
  expect(await ingredient(1).findByRole("alert")).toHaveTextContent("Keep it under 200");
  expect(name).toHaveFocus();
});

test("when saving fails, it says so and keeps what was typed", async () => {
  stubApi(() => new Response(null, { status: 500 }));
  renderApp("/recipes/new");

  await userEvent.type(await screen.findByLabelText("Title"), "Toast");
  await userEvent.type(ingredient(1).getByLabelText("Ingredient"), "bread");
  await userEvent.type(screen.getByLabelText("Step 1"), "Toast the bread.");
  await userEvent.click(screen.getByRole("button", { name: "Save recipe" }));

  expect(await screen.findByText("It couldn't be saved. Try again.")).toBeInTheDocument();
  expect(screen.getByLabelText("Title")).toHaveValue("Toast");
});

test("a 400 that names no field still says it couldn't be saved", async () => {
  stubApi(() =>
    Response.json(
      { error: { code: "bad_request", message: "Send the data as a JSON object." } },
      { status: 400 },
    ),
  );
  renderApp("/recipes/new");

  await userEvent.type(await screen.findByLabelText("Title"), "Toast");
  await userEvent.type(ingredient(1).getByLabelText("Ingredient"), "bread");
  await userEvent.type(screen.getByLabelText("Step 1"), "Toast the bread.");
  await userEvent.click(screen.getByRole("button", { name: "Save recipe" }));

  expect(await screen.findByText("It couldn't be saved. Try again.")).toBeInTheDocument();
});

test("rows can be added and removed; the last one stays", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  expect(await screen.findByRole("button", { name: "Remove ingredient 1" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Add an ingredient" }));
  await userEvent.click(screen.getByRole("button", { name: "Add an ingredient" }));
  await userEvent.type(ingredient(1).getByLabelText("Ingredient"), "bread");
  await userEvent.type(ingredient(2).getByLabelText("Ingredient"), "jam");
  await userEvent.type(ingredient(3).getByLabelText("Ingredient"), "butter");
  await userEvent.click(screen.getByRole("button", { name: "Remove ingredient 2" }));

  // The rows after the removed one move up, with what was typed in them.
  expect(ingredient(1).getByLabelText("Ingredient")).toHaveValue("bread");
  expect(ingredient(2).getByLabelText("Ingredient")).toHaveValue("butter");
  expect(screen.queryByRole("group", { name: "Ingredient 3" })).not.toBeInTheDocument();
});
