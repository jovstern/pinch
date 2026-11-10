import { screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp, stubFetch } from "./test-utils.tsx";

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
  expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to My recipes" })).toHaveAttribute(
    "href",
    "/recipes",
  );
});

test("the header has the two tabs, Write a recipe and the avatar", () => {
  stubNotFound();
  renderApp("/nope");
  expect(tab("Add recipe")).toHaveAttribute("href", "/");
  expect(tab("My recipes")).toHaveAttribute("href", "/recipes");
  expect(screen.getByRole("link", { name: "Write a recipe" })).toHaveAttribute(
    "href",
    "/recipes/new",
  );
  expect(screen.getByRole("button", { name: "Log in · coming soon" })).toHaveAttribute(
    "aria-disabled",
    "true",
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
])("at %s, %s is the selected tab", (path, selected) => {
  stubNotFound();
  renderApp(path);
  const other = selected === "Add recipe" ? "My recipes" : "Add recipe";
  expect(tab(selected)).toHaveAttribute("aria-current", "page");
  expect(tab(other)).not.toHaveAttribute("aria-current");
});

test("on Write a recipe, its link says it's the current page", () => {
  stubNotFound();
  renderApp("/recipes/new");
  expect(screen.getByRole("link", { name: "Write a recipe" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("a page of neither tab selects none", () => {
  stubNotFound();
  renderApp("/nope");
  expect(tab("Add recipe")).not.toHaveAttribute("aria-current");
  expect(tab("My recipes")).not.toHaveAttribute("aria-current");
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
  expect(await screen.findByRole("link", { name: "My recipes 12" })).toHaveAttribute(
    "href",
    "/recipes",
  );
});
