import type { Recipe } from "@pinch/shared";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp, renderInHebrew, stubFetch, toastTitled } from "../../test-utils.tsx";

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

  const heading = await screen.findByRole("heading", {
    level: 1,
    name: "We couldn't load this recipe",
  });
  expect(screen.getByText("Check your connection, then try again.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  // The page is the empty state alone, which makes main a column it centres in (Layout).
  expect(heading.closest("[data-empty-state]")?.parentElement).toBe(screen.getByRole("main"));
});

test("in Hebrew, when loading fails, it says so in Hebrew", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
  await renderInHebrew(`/recipes/${omelette.id}`);

  expect(
    await screen.findByRole("heading", { level: 1, name: "המתכון לא נטען" }),
  ).toBeInTheDocument();
  expect(screen.getByText("כדאי לבדוק את החיבור ולנסות שוב.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "לנסות שוב" })).toBeInTheDocument();
});

test("Delete asks first, then deletes the recipe and goes back to the list, focused on it", async () => {
  const fetch = stubApi();
  renderApp(`/recipes/${omelette.id}`);

  await chooseDelete();
  const dialog = await screen.findByRole("alertdialog", { name: "Delete this recipe?" });
  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  const heading = await screen.findByRole("heading", { level: 1, name: "My recipes" });
  // Still there once the dialog's own focus handling (a tick later) is done.
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(heading).toHaveFocus();
  expect(fetch).toHaveBeenCalledWith(`/api/recipes/${omelette.id}`, { method: "DELETE" });
});

test("Undo on Delete's toast restores the recipe, and View opens it", async () => {
  const fetch = stubApi();
  renderApp(`/recipes/${omelette.id}`);

  await chooseDelete();
  const dialog = await screen.findByRole("alertdialog", { name: "Delete this recipe?" });
  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
  await screen.findByRole("heading", { level: 1, name: "My recipes" });
  // fireEvent: userEvent's pointer down makes Sonner capture the pointer, which jsdom can't.
  fireEvent.click(await toastButton("Deleted Omelette", "Undo"));

  expect(fetch).toHaveBeenCalledWith(`/api/recipes/${omelette.id}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: undefined,
  });
  // Where the user is: My recipes. The toast offers the way back to it.
  expect(screen.getByRole("heading", { level: 1, name: "My recipes" })).toBeInTheDocument();
  fireEvent.click(await toastButton("Back in My recipes", "View"));
  expect(await screen.findByRole("heading", { level: 1, name: "Omelette" })).toBeInTheDocument();
});

test("in Hebrew, the numbers are Intl's: Western digits, grouped by thousands", async () => {
  stubFetch(() =>
    Promise.resolve(
      Response.json({
        ...omelette,
        prepMinutes: 1440,
        nutritionPerServing: { ...omelette.nutritionPerServing, calories: 1250.2 },
      }),
    ),
  );
  await renderInHebrew(`/recipes/${omelette.id}`);

  expect(await screen.findByText(/דק׳/)).toHaveTextContent("הכנה 1,440 דק׳");
  expect(screen.getByText(/קק״ל/)).toHaveTextContent("≈ 1,250 קק״ל");
});

test("in Hebrew, Delete's toast is in English, left to right, the title in its <bdi>", async () => {
  stubApi();
  await renderInHebrew(`/recipes/${omelette.id}`);
  await chooseDelete(hebrewMenu);
  const dialog = await screen.findByRole("alertdialog", { name: "למחוק את המתכון?" });
  await userEvent.click(within(dialog).getByRole("button", { name: "למחוק" }));
  // The toasts are English in both languages (design §16.8, D46).
  const undo = await toastButton("Deleted Omelette", "Undo");
  const toast = undo.closest("li");
  if (toast === null) throw new Error("Undo isn't in a toast");
  expect(within(toast).getByText("Omelette").tagName).toBe("BDI");
  expect(toast.closest("ol")).toHaveAttribute("dir", "ltr");
});

// A button on the toast with this title (Sonner's list item).
async function toastButton(text: string, name: string) {
  const toast = (await screen.findByText(toastTitled(text))).closest("li");
  if (toast === null) throw new Error(`"${text}" isn't in a toast`);
  return within(toast).getByRole("button", { name });
}

test("Keep it closes the question without deleting", async () => {
  const fetch = stubApi();
  renderApp(`/recipes/${omelette.id}`);

  await chooseDelete();
  const dialog = await screen.findByRole("alertdialog", { name: "Delete this recipe?" });
  expect(dialog).toHaveAccessibleDescription("“Omelette” will be deleted from My recipes.");
  await userEvent.click(within(dialog).getByRole("button", { name: "Keep it" }));

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

// Delete is in the ⋯ menu, named in the page's language.
const englishMenu = { more: "More actions", delete: "Delete…" };
const hebrewMenu = { more: "פעולות נוספות", delete: "למחוק…" };
async function chooseDelete(names = englishMenu) {
  await userEvent.click(await screen.findByRole("button", { name: names.more }));
  await userEvent.click(await screen.findByRole("menuitem", { name: names.delete }));
}

test("a recipe opened from My recipes shows at once, from the list, while it loads", async () => {
  // The list answers; the recipe itself never does.
  stubFetch(
    vi.fn((path: string) =>
      path === "/api/recipes"
        ? Promise.resolve(Response.json({ items: [omelette], nextCursor: null }))
        : new Promise<Response>(() => undefined),
    ),
  );
  renderApp("/recipes");

  await userEvent.click(await screen.findByRole("link", { name: /Omelette/ }));

  expect(screen.getByRole("heading", { level: 1, name: "Omelette" })).toBeInTheDocument();
  expect(screen.queryByText("Loading the recipe…")).not.toBeInTheDocument();
});

// In Hebrew (design §16.11): the page's own words are Hebrew; the recipe keeps its own (§16.5).
test("in Hebrew, a recipe's page says its details, sections and tags in Hebrew", async () => {
  stubFetch(() =>
    Promise.resolve(
      Response.json({ ...omelette, servings: 4, cookMinutes: 10, source: { type: "text" } }),
    ),
  );
  await renderInHebrew(`/recipes/${omelette.id}`);

  expect(await screen.findByRole("heading", { level: 1, name: "Omelette" })).toHaveAttribute(
    "dir",
    "auto",
  );
  // The recipe's title in Unicode's isolates (design §16.5).
  expect(document.title).toBe("\u2068Omelette\u2069 · Pinch");
  expect(screen.getByText(/הכנה 5 דק׳/)).toHaveTextContent(
    "מטקסט מודבק · 4 מנות · הכנה 5 דק׳ · בישול 10 דק׳",
  );
  expect(screen.getByText(/קק״ל/)).toHaveTextContent(
    "≈ 251 קק״ל · 13 גרם חלבון · 1 גרם פחמימות · 22 גרם שומן למנה (הערכה)",
  );
  const tags = screen.getByRole("list", { name: "תגיות" });
  expect(
    within(tags)
      .getAllByRole("listitem")
      .map((item) => item.textContent),
  ).toEqual(["ארוחת בוקר", "מזרח תיכוני"]);
  // The tag's code stays in the address (D46).
  expect(within(tags).getByRole("link", { name: "ארוחת בוקר" })).toHaveAttribute(
    "href",
    "/recipes?tags=meal%3Abreakfast",
  );
  expect(screen.getByRole("list", { name: "מצרכים" })).toBeInTheDocument();
  expect(screen.getByRole("list", { name: "אופן ההכנה" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "לבשל" })).toHaveAttribute(
    "href",
    `/recipes/${omelette.id}/cook`,
  );
  expect(screen.getByRole("heading", { level: 2, name: "תגובות" })).toBeInTheDocument();
  const breadcrumb = screen.getByRole("navigation", { name: "נתיב ניווט" });
  expect(within(breadcrumb).getByRole("link", { name: "המתכונים שלי" })).toHaveAttribute(
    "href",
    "/recipes",
  );
  // Its separator points the reading way, so it mirrors (design §16.4).
  expect(breadcrumb.querySelector("svg")).toHaveClass("rtl:-scale-x-100");
});

test("in Hebrew, one serving is said in words, and a post's link opens in a new tab", async () => {
  const url = "https://www.instagram.com/reel/abc123/";
  stubFetch(() =>
    Promise.resolve(Response.json({ ...omelette, source: { type: "instagram", url } })),
  );
  await renderInHebrew(`/recipes/${omelette.id}`);

  // The site's name stays as it is (D46).
  expect(
    await screen.findByRole("link", { name: /^Instagram.*נפתח בכרטיסייה חדשה/ }),
  ).toHaveAttribute("href", url);
  expect(screen.getByText(/מנה אחת/)).toHaveTextContent(
    "Instagram (נפתח בכרטיסייה חדשה) · מנה אחת · הכנה 5 דק׳",
  );
});

test("in Hebrew, ⋯ holds Edit, Share and Delete, and Delete's question holds the title in its <bdi>", async () => {
  stubApi();
  await renderInHebrew(`/recipes/${omelette.id}`);

  await userEvent.click(await screen.findByRole("button", { name: "פעולות נוספות" }));
  const menu = await screen.findByRole("menu");
  expect(within(menu).getByRole("menuitem", { name: "לערוך" })).toHaveAttribute(
    "href",
    `/recipes/${omelette.id}/edit`,
  );
  expect(within(menu).getByRole("menuitem", { name: "לשתף · בקרוב" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await userEvent.click(within(menu).getByRole("menuitem", { name: "למחוק…" }));

  const dialog = await screen.findByRole("alertdialog", { name: "למחוק את המתכון?" });
  // An English title in a Hebrew sentence keeps its own direction (design §16.5).
  expect(dialog).toHaveAccessibleDescription('המתכון "Omelette" יימחק מהמתכונים שלי.');
  expect(within(dialog).getByText("Omelette").tagName).toBe("BDI");
  await userEvent.click(within(dialog).getByRole("button", { name: "להשאיר" }));
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});
