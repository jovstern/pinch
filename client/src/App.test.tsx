import { screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp, renderInHebrew, stubFetch } from "./test-utils.tsx";

afterEach(() => {
  vi.unstubAllGlobals();
});

// The page under the header isn't what these tests are about: every request but the imports
// answers 404.
function stubNotFound() {
  stubFetch(() => Promise.resolve(new Response(null, { status: 404 })));
}

function tab(name: string) {
  const nav = screen.getByRole("navigation", { name: "Main" });
  return within(nav).getByRole("link", { name: new RegExp(`^${name}`) });
}

test("an unknown address shows the not-found page with a way back", () => {
  stubNotFound();
  renderApp("/nope");
  const heading = screen.getByRole("heading", { level: 1, name: "Page not found" });
  expect(screen.getByText("There is nothing at this address.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to My recipes" })).toHaveAttribute(
    "href",
    "/recipes",
  );
  // The empty state is main's whole content, which makes main a column it centres in (Layout).
  expect(heading.closest("[data-empty-state]")?.parentElement).toBe(screen.getByRole("main"));
});

test("in Hebrew, the not-found page is in Hebrew", async () => {
  stubNotFound();
  await renderInHebrew("/nope");
  expect(screen.getByRole("heading", { level: 1, name: "הדף לא נמצא" })).toBeInTheDocument();
  expect(screen.getByText("אין כלום בכתובת הזאת.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "לחזור למתכונים שלי" })).toHaveAttribute(
    "href",
    "/recipes",
  );
});

test("the header has the logo, the three tabs, Write a recipe and the avatar", () => {
  stubNotFound();
  renderApp("/nope");
  expect(screen.getByRole("link", { name: "Pinch, Add recipe" })).toHaveAttribute("href", "/");
  expect(tab("Add recipe")).toHaveAttribute("href", "/");
  expect(tab("My recipes")).toHaveAttribute("href", "/recipes");
  expect(tab("All recipes")).toHaveAttribute("href", "/explore");
  expect(screen.getByRole("link", { name: "Write a recipe" })).toHaveAttribute(
    "href",
    "/recipes/new",
  );
  expect(screen.getByRole("button", { name: "Your account" })).toHaveAttribute(
    "aria-haspopup",
    "menu",
  );
});

// Each page and the tab that owns it (design §14): an inner page keeps its tab selected.
test.each([
  ["/", "Add recipe"],
  ["/recipes/new", "Add recipe"],
  ["/imports/6650a1b2c3d4e5f600000001", "Add recipe"],
  ["/recipes", "My recipes"],
  ["/recipes?tags=meal:breakfast", "My recipes"],
  ["/recipes/6650a1b2c3d4e5f600000001", "My recipes"],
  ["/recipes/6650a1b2c3d4e5f600000001/cook", "My recipes"],
  ["/recipes/6650a1b2c3d4e5f600000001/edit", "My recipes"],
  ["/explore", "All recipes"],
])("at %s, %s is the selected tab", (path, selected) => {
  stubNotFound();
  renderApp(path);
  for (const name of ["Add recipe", "My recipes", "All recipes"]) {
    if (name === selected) expect(tab(name)).toHaveAttribute("aria-current", "page");
    else expect(tab(name)).not.toHaveAttribute("aria-current");
  }
});

test("in Hebrew, the header has the logo, the three tabs in Hebrew and the selected one", async () => {
  stubNotFound();
  await renderInHebrew("/recipes");
  // The logo's name keeps Pinch, the brand (design §16.8).
  expect(screen.getByRole("link", { name: "Pinch, להוסיף מתכון" })).toHaveAttribute("href", "/");
  const nav = screen.getByRole("navigation", { name: "ראשי" });
  expect(within(nav).getByRole("link", { name: "להוסיף מתכון" })).toHaveAttribute("href", "/");
  expect(within(nav).getByRole("link", { name: "המתכונים שלי" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(within(nav).getByRole("link", { name: "כל המתכונים" })).toHaveAttribute(
    "href",
    "/explore",
  );
});

test("All recipes is a Coming soon page, until there are recipes to share", async () => {
  stubNotFound();
  renderApp("/explore");
  // Its own chunk (App), so it shows once loaded.
  const heading = await screen.findByRole("heading", { level: 1, name: "Coming soon" });
  expect(
    screen.getByText("Recipes saved across Pinch, ranked, to copy into My recipes."),
  ).toBeInTheDocument();
  expect(document.title).toBe("All recipes · Pinch");
  expect(heading.closest("[data-empty-state]")?.parentElement).toBe(screen.getByRole("main"));
});

test("in Hebrew, All recipes' Coming soon page is in Hebrew", async () => {
  stubNotFound();
  await renderInHebrew("/explore");
  expect(await screen.findByRole("heading", { level: 1, name: "בקרוב" })).toBeInTheDocument();
  expect(
    screen.getByText("מתכונים שנשמרו ב\u2011Pinch, מדורגים, להעתקה אל המתכונים שלי."),
  ).toBeInTheDocument();
});

test("on Write a recipe, its link says it's the current page", () => {
  stubNotFound();
  renderApp("/recipes/new");
  expect(screen.getByRole("link", { name: "Write a recipe" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("a page of no tab selects none", () => {
  stubNotFound();
  renderApp("/nope");
  expect(tab("Add recipe")).not.toHaveAttribute("aria-current");
  expect(tab("My recipes")).not.toHaveAttribute("aria-current");
  expect(tab("All recipes")).not.toHaveAttribute("aria-current");
});

// The imports GET /api/imports answers; anything else is 404. fetch is stubbed directly:
// stubFetch always answers no imports.
function stubImports(statuses: ("ready" | "failed")[]) {
  const items = statuses.map((status, n) => ({
    id: `6650a1b2c3d4e5f60000000${String(n)}`,
    status,
    input: { type: "link", url: "https://www.instagram.com/p/DOxAbc123/", platform: "instagram" },
    attempts: 0,
    stalled: false,
    error: status === "failed" ? "No recipe in this post." : undefined,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
  }));
  vi.stubGlobal("fetch", (path: string) =>
    Promise.resolve(
      path === "/api/imports" ? Response.json({ items }) : new Response(null, { status: 404 }),
    ),
  );
}

test("Add recipe counts the drafts ready to review, on every page", async () => {
  stubImports(["ready", "ready", "failed"]);
  renderApp("/nope");
  expect(await screen.findByRole("link", { name: "Add recipe 2 ready to review" })).toHaveAttribute(
    "href",
    "/",
  );
});

test("with no draft ready, Add recipe has no count", async () => {
  stubImports(["failed"]);
  renderApp("/");
  // The queue shows the imports, so the header has them too.
  expect(await screen.findByText("No recipe in this post.")).toBeInTheDocument();
  expect(tab("Add recipe")).toHaveAccessibleName("Add recipe");
});

test("My recipes shows how many recipes there are, on every page", async () => {
  vi.stubGlobal("fetch", (path: string) =>
    Promise.resolve(
      path === "/api/recipes/count"
        ? Response.json({ count: 12 })
        : new Response(null, { status: 404 }),
    ),
  );
  renderApp("/nope");
  // Asked for a second after the app starts (Header).
  expect(
    await screen.findByRole("link", { name: "My recipes 12 recipes" }, { timeout: 3000 }),
  ).toHaveAttribute("href", "/recipes");
});
