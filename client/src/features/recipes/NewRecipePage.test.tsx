import type { Recipe } from "@pinch/shared";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp, renderInHebrew } from "../../test-utils.tsx";

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

test("writing by hand sits under Add recipe, with a tip to paste instead", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  const breadcrumb = await screen.findByRole("navigation", { name: "Breadcrumb" });
  expect(within(breadcrumb).getByRole("link", { name: "Add recipe" })).toHaveAttribute("href", "/");
  expect(within(breadcrumb).getByText("Write a recipe")).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: "Paste it on Add recipe" })).toHaveAttribute("href", "/");
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

// In Hebrew (design §16.11): the editor's own words are Hebrew; what's typed keeps its own
// direction (§16.5), and the fields' messages are the shared schemas' English until I8.
test("in Hebrew, writing a recipe: its page, fields and buttons are in Hebrew", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  await renderInHebrew("/recipes/new");

  const title = await screen.findByLabelText("שם המתכון");
  expect(document.title).toBe("לכתוב מתכון · Pinch");
  expect(screen.getByRole("heading", { level: 1, name: "לכתוב מתכון" })).toBeInTheDocument();
  const breadcrumb = screen.getByRole("navigation", { name: "נתיב ניווט" });
  expect(within(breadcrumb).getByRole("link", { name: "להוסיף מתכון" })).toHaveAttribute(
    "href",
    "/",
  );
  expect(screen.getByRole("link", { name: "להדביק אותו בהוספת מתכון" })).toHaveAttribute(
    "href",
    "/",
  );
  expect(title).toHaveAttribute("placeholder", "למשל: מרק עדשים כתומות");
  expect(title).toHaveAttribute("dir", "auto");
  expect(screen.getByLabelText("תיאור")).toBeInTheDocument();
  expect(screen.getByRole("group", { name: "מצרכים" })).toBeInTheDocument();
  const row = within(screen.getByRole("group", { name: "מצרך 1" }));
  expect(row.getByLabelText("כמות")).toHaveAttribute("placeholder", "200");
  // The unit's label and example are Hebrew; its suggestions are tested below.
  expect(row.getByLabelText("יחידה")).toHaveAttribute("placeholder", "גרם");
  expect(row.getByLabelText("מצרך")).toHaveAttribute("placeholder", "למשל: קמח");
  expect(row.getByLabelText("הערה")).toHaveAttribute("placeholder", "הערה (לא חובה)");
  expect(row.getByRole("button", { name: "להסיר את מצרך 1" })).toBeDisabled();
  expect(screen.getByRole("group", { name: "אופן ההכנה" })).toBeInTheDocument();
  expect(screen.getByLabelText("שלב 1")).toHaveAttribute(
    "placeholder",
    "למשל: לשטוף את העדשים ולרכך את הבצל.",
  );
  expect(screen.getByRole("button", { name: "להסיר את שלב 1" })).toBeDisabled();
  expect(screen.getByText("מקור:", { exact: false })).toHaveTextContent("מקור: נכתב ידנית");
  expect(screen.getByLabelText("מנות")).toBeInTheDocument();
  expect(screen.getByLabelText("הכנה (דק׳)")).toBeInTheDocument();
  expect(screen.getByLabelText("בישול (דק׳)")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "לבטל" })).toHaveAttribute("href", "/");

  await userEvent.click(screen.getByRole("button", { name: "להוסיף מצרך" }));
  expect(screen.getByRole("group", { name: "מצרך 2" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "להוסיף שלב" }));
  expect(screen.getByLabelText("שלב 2")).toBeInTheDocument();

  // Empty, Save says how many things to fix, in Hebrew's plural.
  await userEvent.click(screen.getByRole("button", { name: "לשמור מתכון" }));
  expect(await screen.findByText("5 דברים לתקן לפני השמירה")).toBeInTheDocument();
});

test("in Hebrew, the form's own check says what to fix in Hebrew", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  await renderInHebrew("/recipes/new");

  await userEvent.click(await screen.findByRole("button", { name: "לשמור מתכון" }));

  // shared's messages, by their names (design §16.7).
  expect(await screen.findByText("צריך לתת למתכון שם.")).toHaveAttribute("role", "alert");
  expect(screen.getByLabelText("שם המתכון")).toHaveAccessibleDescription("צריך לתת למתכון שם.");
  expect(screen.getByText("צריך לכתוב את שם המצרך.")).toBeInTheDocument();
});

test("in Hebrew, one thing to fix is said in words", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  await renderInHebrew("/recipes/new");

  await userEvent.type(await screen.findByLabelText("שם המתכון"), "Toast");
  await userEvent.type(screen.getByLabelText("מצרך"), "bread");
  await userEvent.click(screen.getByRole("button", { name: "לשמור מתכון" }));

  expect(await screen.findByText("דבר אחד לתקן לפני השמירה")).toBeInTheDocument();
});

test("in Hebrew, a failed save says so in Hebrew", async () => {
  stubApi(() => new Response(null, { status: 500 }));
  await renderInHebrew("/recipes/new");

  await userEvent.type(await screen.findByLabelText("שם המתכון"), "Toast");
  await userEvent.type(screen.getByLabelText("מצרך"), "bread");
  await userEvent.type(screen.getByLabelText("שלב 1"), "Toast the bread.");
  await userEvent.click(screen.getByRole("button", { name: "לשמור מתכון" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("השמירה נכשלה. אפשר לנסות שוב.");
});

test("in Hebrew, Add tag's sheet names the tags in Hebrew, and a chip's ✕ says which it removes", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  await renderInHebrew("/recipes/new");

  expect(await screen.findByRole("group", { name: "תגיות" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "להוסיף תגית" }));
  const sheet = await screen.findByRole("dialog", { name: "תגיות" });
  expect(within(sheet).getByRole("group", { name: "ארוחה" })).toBeInTheDocument();
  await userEvent.click(within(sheet).getByRole("checkbox", { name: "ארוחת בוקר" }));
  expect(within(sheet).getByRole("button", { name: "לסגור" })).toBeInTheDocument();
  await userEvent.click(within(sheet).getByRole("button", { name: "סיום" }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "להסיר: ארוחת בוקר" }));
  expect(screen.queryByText("ארוחת בוקר")).not.toBeInTheDocument();
});

test("in Hebrew, Cancel with changes asks first, in Hebrew", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  await renderInHebrew("/recipes/new");

  await userEvent.type(await screen.findByLabelText("שם המתכון"), "Toast");
  await userEvent.click(screen.getByRole("button", { name: "לבטל" }));

  const dialog = await screen.findByRole("alertdialog", { name: "לצאת בלי לשמור?" });
  expect(dialog).toHaveAccessibleDescription("השינויים כאן לא יישמרו.");
  expect(within(dialog).getByRole("button", { name: "לצאת בלי לשמור" })).toBeInTheDocument();
  await userEvent.click(within(dialog).getByRole("button", { name: "להמשיך לערוך" }));
  expect(screen.getByLabelText("שם המתכון")).toHaveValue("Toast");
});

// The unit's combobox (design §16.12): suggestions as you type, any text kept.
function shownOptions() {
  return screen.queryAllByRole("option").map((option) => option.textContent);
}

// The ingredients the editor sent.
function sentIngredients(fetch: ReturnType<typeof stubApi>) {
  const body = fetch.mock.calls.find(([, init]) => init?.method === "POST")?.[1]?.body;
  if (typeof body !== "string") throw new Error("Nothing was saved.");
  return (JSON.parse(body) as { ingredients: unknown }).ingredients;
}

test("the unit suggests the common units that start with what's typed, ignoring case", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  const unit = await screen.findByRole("combobox", { name: "Unit" });
  expect(unit).toHaveAttribute("aria-expanded", "false");
  expect(unit).toHaveAttribute("aria-autocomplete", "list");
  await userEvent.type(unit, "T");

  expect(unit).toHaveAttribute("aria-expanded", "true");
  const list = screen.getByRole("listbox", { name: "Suggestions" });
  expect(unit).toHaveAttribute("aria-controls", list.id);
  expect(shownOptions()).toEqual(["tsp", "tbsp"]);
  // Nothing starts with it: no list, and what's typed stays.
  await userEvent.type(unit, "x");
  expect(unit).toHaveAttribute("aria-expanded", "false");
  expect(shownOptions()).toEqual([]);
  expect(unit).toHaveValue("Tx");
});

test("the arrow keys move through the units, wrapping, and Enter picks one without saving", async () => {
  const fetch = stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  const unit = await screen.findByRole("combobox", { name: "Unit" });
  await userEvent.click(screen.getByLabelText("Title"));
  await userEvent.tab();
  await userEvent.tab();
  await userEvent.tab();
  expect(unit).toHaveFocus();
  expect(unit).toHaveAttribute("aria-expanded", "false");

  await userEvent.keyboard("{ArrowDown}");
  expect(unit).toHaveAttribute("aria-expanded", "true");
  const active = () => document.getElementById(unit.getAttribute("aria-activedescendant") ?? "");
  expect(active()).toHaveTextContent("g");
  expect(active()).toHaveAttribute("aria-selected", "true");
  await userEvent.keyboard("{ArrowDown}");
  expect(active()).toHaveTextContent("kg");
  await userEvent.keyboard("{ArrowUp}{ArrowUp}");
  expect(active()).toHaveTextContent("bunch");
  await userEvent.keyboard("{Enter}");

  expect(unit).toHaveValue("bunch");
  expect(unit).toHaveAttribute("aria-expanded", "false");
  expect(unit).not.toHaveAttribute("aria-activedescendant");
  expect(fetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
});

test("Escape closes the units, and Tab leaves with what's typed", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  const unit = await screen.findByRole("combobox", { name: "Unit" });
  await userEvent.type(unit, "c");
  expect(shownOptions()).toEqual(["cup", "clove", "can"]);
  await userEvent.keyboard("{ArrowDown}{Escape}");
  expect(unit).toHaveAttribute("aria-expanded", "false");
  expect(unit).toHaveValue("c");

  await userEvent.type(unit, "u");
  expect(shownOptions()).toEqual(["cup"]);
  await userEvent.tab();
  expect(screen.getByLabelText("Ingredient")).toHaveFocus();
  expect(unit).toHaveValue("cu");
  expect(shownOptions()).toEqual([]);
});

test("a picked unit, a unit of one's own and none are each saved as they are", async () => {
  const fetch = stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  await userEvent.type(await screen.findByLabelText("Title"), "Toast");
  // A tap picks: the list shows on a click, as a phone has no arrow keys.
  await userEvent.type(ingredient(1).getByLabelText("Amount"), "2");
  await userEvent.click(ingredient(1).getByRole("combobox", { name: "Unit" }));
  expect(shownOptions()).toHaveLength(14);
  await userEvent.click(screen.getByRole("option", { name: "slice" }));
  await userEvent.type(ingredient(1).getByLabelText("Ingredient"), "bread");
  await userEvent.click(screen.getByRole("button", { name: "Add ingredient" }));
  await userEvent.type(ingredient(2).getByLabelText("Amount"), "1");
  await userEvent.type(ingredient(2).getByLabelText("Unit"), "Knob");
  await userEvent.type(ingredient(2).getByLabelText("Ingredient"), "butter");
  await userEvent.click(screen.getByRole("button", { name: "Add ingredient" }));
  await userEvent.type(ingredient(3).getByLabelText("Amount"), "3");
  await userEvent.type(ingredient(3).getByLabelText("Ingredient"), "eggs");
  await userEvent.type(screen.getByLabelText("Step 1"), "Toast the bread.");
  await userEvent.click(screen.getByRole("button", { name: "Save recipe" }));

  await screen.findByRole("heading", { level: 1, name: "Toast" });
  expect(sentIngredients(fetch)).toEqual([
    { name: "bread", quantity: "2", unit: "slice" },
    { name: "butter", quantity: "1", unit: "Knob" },
    { name: "eggs", quantity: "3" },
  ]);
});

test("a row's examples go once its ingredient is named", async () => {
  stubApi(() => Response.json(saved, { status: 201 }));
  renderApp("/recipes/new");

  await userEvent.click(await screen.findByRole("button", { name: "Add ingredient" }));
  const unit = ingredient(2).getByLabelText("Unit");
  expect(unit).toHaveAttribute("placeholder", "g");
  expect(ingredient(2).getByLabelText("Amount")).toHaveAttribute("placeholder", "200");

  await userEvent.type(ingredient(2).getByLabelText("Ingredient"), "salt");
  expect(unit).not.toHaveAttribute("placeholder");
  expect(ingredient(2).getByLabelText("Amount")).not.toHaveAttribute("placeholder");
  // The first row, still unnamed, keeps its own.
  expect(ingredient(1).getByLabelText("Unit")).toHaveAttribute("placeholder", "g");
});

test("in Hebrew, the unit suggests Hebrew's units, and the arrow keys and Enter pick one", async () => {
  const fetch = stubApi(() => Response.json(saved, { status: 201 }));
  await renderInHebrew("/recipes/new");

  await userEvent.type(await screen.findByLabelText("שם המתכון"), "טוסט");
  const unit = screen.getByRole("combobox", { name: "יחידה" });
  await userEvent.type(unit, "כ");
  expect(screen.getByRole("listbox", { name: "הצעות" })).toBeInTheDocument();
  expect(shownOptions()).toEqual(["כפית", "כף", "כוס"]);
  await userEvent.keyboard("{ArrowDown}{ArrowDown}");
  expect(
    document.getElementById(unit.getAttribute("aria-activedescendant") ?? ""),
  ).toHaveTextContent("כף");
  await userEvent.keyboard("{Enter}");
  expect(unit).toHaveValue("כף");
  expect(unit).toHaveAttribute("aria-expanded", "false");

  // Escape closes; a unit not in the list is kept as typed.
  await userEvent.clear(unit);
  await userEvent.type(unit, "ק");
  expect(shownOptions()).toEqual(["ק״ג", "קורט", "קופסה"]);
  await userEvent.keyboard("{Escape}");
  expect(unit).toHaveAttribute("aria-expanded", "false");
  await userEvent.type(unit, "ערה");
  await userEvent.type(screen.getByLabelText("מצרך"), "חמאה");
  await userEvent.type(screen.getByLabelText("שלב 1"), "למרוח.");
  await userEvent.click(screen.getByRole("button", { name: "לשמור מתכון" }));

  await screen.findByRole("heading", { level: 1, name: "Toast" });
  expect(sentIngredients(fetch)).toEqual([{ name: "חמאה", unit: "קערה" }]);
});
