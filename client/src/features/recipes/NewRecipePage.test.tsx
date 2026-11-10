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
  tags: [],
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

test("saves a new recipe and shows it, its title focused", async () => {
  const fetch = stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  await userEvent.type(await screen.findByLabelText("Title"), "Toast");
  await userEvent.type(screen.getByLabelText("Serves"), "1");
  await userEvent.type(ingredient(1).getByLabelText("Amount"), "2");
  await userEvent.type(ingredient(1).getByLabelText("Unit"), "slices");
  await userEvent.type(ingredient(1).getByLabelText("Ingredient"), "bread");
  await userEvent.click(screen.getByRole("button", { name: "Add ingredient" }));
  await userEvent.type(ingredient(2).getByLabelText("Ingredient"), "butter");
  await userEvent.type(ingredient(2).getByLabelText("Note"), "soft");
  await userEvent.type(screen.getByLabelText("Step 1"), "Toast the bread.");
  await userEvent.click(screen.getByRole("button", { name: "Add tag" }));
  await userEvent.click(await screen.findByRole("checkbox", { name: "breakfast" }));
  await userEvent.click(screen.getByRole("checkbox", { name: "quick" }));
  await userEvent.click(screen.getByRole("button", { name: "Done" }));
  await userEvent.click(screen.getByRole("button", { name: "Save recipe" }));

  // Focus on the new page's title, not lost to the page (useHeadingFocus).
  expect(await screen.findByRole("heading", { level: 1, name: "Toast" })).toHaveFocus();
  expect(screen.getByText("Saved to My recipes")).toBeInTheDocument();
  // Blank optional fields aren't sent; the numbers are numbers. (Keys in the schema's order.)
  expect(fetch).toHaveBeenCalledWith("/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Toast",
      ingredients: saved.ingredients,
      steps: ["Toast the bread."],
      servings: 1,
      tags: ["meal:breakfast", "fit:quick"],
    }),
  });
});

test("writing by hand sits under New recipe, with a tip to paste instead", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  const breadcrumb = await screen.findByRole("navigation", { name: "Breadcrumb" });
  expect(within(breadcrumb).getByRole("link", { name: "New recipe" })).toHaveAttribute("href", "/");
  expect(within(breadcrumb).getByText("Write a recipe")).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: "Paste it on New recipe" })).toHaveAttribute("href", "/");
  expect(await screen.findByText("Source: Written by you")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/");
});

test("more than 20 tags says so, and focuses Add tag, above the message", async () => {
  const fetch = stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  await userEvent.type(await screen.findByLabelText("Title"), "Toast");
  await userEvent.type(ingredient(1).getByLabelText("Ingredient"), "bread");
  await userEvent.type(screen.getByLabelText("Step 1"), "Toast the bread.");
  await userEvent.click(screen.getByRole("button", { name: "Add tag" }));
  for (const tag of screen.getAllByRole("checkbox").slice(0, 21)) await userEvent.click(tag);
  await userEvent.click(screen.getByRole("button", { name: "Done" }));
  await userEvent.click(screen.getByRole("button", { name: "Save recipe" }));

  expect(await screen.findByText("A recipe can have up to 20 tags.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add tag" })).toHaveFocus();
  expect(fetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
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
  // By the Save button, what's left in all.
  expect(screen.getByText("4 things to fix before saving")).toBeInTheDocument();
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
  await userEvent.click(screen.getByRole("button", { name: "Add ingredient" }));
  await userEvent.click(screen.getByRole("button", { name: "Add ingredient" }));
  await userEvent.type(ingredient(1).getByLabelText("Ingredient"), "bread");
  await userEvent.type(ingredient(2).getByLabelText("Ingredient"), "jam");
  await userEvent.type(ingredient(3).getByLabelText("Ingredient"), "butter");
  await userEvent.click(screen.getByRole("button", { name: "Remove ingredient 2" }));

  // The rows after the removed one move up, with what was typed in them.
  expect(ingredient(1).getByLabelText("Ingredient")).toHaveValue("bread");
  expect(ingredient(2).getByLabelText("Ingredient")).toHaveValue("butter");
  expect(screen.queryByRole("group", { name: "Ingredient 3" })).not.toBeInTheDocument();
});

test("steps can be added and removed; the last one stays", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  expect(await screen.findByRole("button", { name: "Remove step 1" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Add step" }));
  await userEvent.type(screen.getByLabelText("Step 1"), "Toast the bread.");
  await userEvent.type(screen.getByLabelText("Step 2"), "Butter it.");
  await userEvent.click(screen.getByRole("button", { name: "Remove step 1" }));

  expect(screen.getByLabelText("Step 1")).toHaveValue("Butter it.");
  expect(screen.queryByLabelText("Step 2")).not.toBeInTheDocument();
});

test("a tag chosen in Add tag shows as a chip, and its ✕ removes it", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  await userEvent.click(await screen.findByRole("button", { name: "Add tag" }));
  await userEvent.click(await screen.findByRole("checkbox", { name: "spicy" }));
  await userEvent.click(screen.getByRole("button", { name: "Done" }));
  await userEvent.click(screen.getByRole("button", { name: "Remove spicy" }));

  expect(screen.queryByRole("button", { name: "Remove spicy" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add tag" })).toHaveFocus();
});

test("removing the last row moves focus to its list's Add button", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  await userEvent.click(await screen.findByRole("button", { name: "Add ingredient" }));
  await userEvent.click(screen.getByRole("button", { name: "Remove ingredient 2" }));
  expect(screen.getByRole("button", { name: "Add ingredient" })).toHaveFocus();

  await userEvent.click(screen.getByRole("button", { name: "Add step" }));
  await userEvent.click(screen.getByRole("button", { name: "Remove step 2" }));
  expect(screen.getByRole("button", { name: "Add step" })).toHaveFocus();
});

test("an error stays with its row when a row above it is removed", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  await userEvent.type(await screen.findByLabelText("Title"), "Toast");
  await userEvent.type(screen.getByLabelText("Step 1"), "Toast the bread.");
  await userEvent.type(ingredient(1).getByLabelText("Ingredient"), "bread");
  await userEvent.click(screen.getByRole("button", { name: "Add ingredient" }));
  await userEvent.click(screen.getByRole("button", { name: "Add ingredient" }));
  await userEvent.type(ingredient(3).getByLabelText("Ingredient"), "jam");
  await userEvent.click(screen.getByRole("button", { name: "Save recipe" }));
  expect(await ingredient(2).findByRole("alert")).toHaveTextContent("Name the ingredient.");
  await userEvent.click(screen.getByRole("button", { name: "Remove ingredient 1" }));

  // The empty row is now the first, with its message; "jam" moved up without one.
  expect(ingredient(1).getByRole("alert")).toHaveTextContent("Name the ingredient.");
  expect(ingredient(2).getByLabelText("Ingredient")).toHaveValue("jam");
  expect(ingredient(2).queryByRole("alert")).not.toBeInTheDocument();
});

test("the count by Save goes down as each error is fixed", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  await userEvent.click(await screen.findByRole("button", { name: "Save recipe" }));
  expect(await screen.findByText("3 things to fix before saving")).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText("Title"), "Toast");
  await userEvent.type(ingredient(1).getByLabelText("Ingredient"), "bread");

  expect(screen.getByText("1 thing to fix before saving")).toBeInTheDocument();
});

test("closing the tab with changes asks first; without them it doesn't", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  const title = await screen.findByLabelText("Title");
  const untouched = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(untouched);
  expect(untouched.defaultPrevented).toBe(false);

  await userEvent.type(title, "Toast");
  const changed = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(changed);
  expect(changed.defaultPrevented).toBe(true);
});

test("once saved, closing the tab no longer asks", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  await userEvent.type(await screen.findByLabelText("Title"), "Toast");
  await userEvent.type(ingredient(1).getByLabelText("Ingredient"), "bread");
  await userEvent.type(screen.getByLabelText("Step 1"), "Toast the bread.");
  await userEvent.click(screen.getByRole("button", { name: "Save recipe" }));
  await screen.findByRole("heading", { level: 1, name: "Toast" });

  const leaving = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(leaving);
  expect(leaving.defaultPrevented).toBe(false);
});

test("every Save checks the whole form again, even while errors still show", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  await userEvent.click(await screen.findByRole("button", { name: "Save recipe" }));
  expect(await screen.findByText("Give the recipe a title.")).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText("Title"), "Toast");
  await userEvent.type(screen.getByLabelText("Serves"), "abc");
  await userEvent.click(screen.getByRole("button", { name: "Save recipe" }));

  expect(await screen.findByText("Enter a whole number.")).toBeInTheDocument();
});

test("after the API's message, the next Save goes through", async () => {
  const invalid = Response.json(
    { error: { code: "invalid_input", message: "", fields: { title: "Taken." } } },
    { status: 400 },
  );
  const answers = [invalid, Response.json(saved, { status: 201 })];
  stubApi(() => answers.shift() ?? Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  await userEvent.type(await screen.findByLabelText("Title"), "Toast");
  await userEvent.type(ingredient(1).getByLabelText("Ingredient"), "bread");
  await userEvent.type(screen.getByLabelText("Step 1"), "Toast the bread.");
  await userEvent.click(screen.getByRole("button", { name: "Save recipe" }));
  expect(await screen.findByText("Taken.")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Save recipe" }));

  expect(await screen.findByRole("heading", { level: 1, name: "Toast" })).toBeInTheDocument();
});
