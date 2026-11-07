import type { Recipe } from "@pinch/shared";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp, stubFetch } from "../../test-utils.tsx";

afterEach(() => {
  vi.unstubAllGlobals();
});

const omelette: Recipe = {
  id: "6650a1b2c3d4e5f600000001",
  title: "Omelette",
  ingredients: [{ name: "eggs", quantity: "2" }, { name: "salt" }],
  steps: ["Beat the eggs.", "Cook them in butter."],
  prepMinutes: 5,
  cookMinutes: 5,
  tags: [],
  source: { type: "manual" },
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
};

test("lists each recipe as a link to it, with what it needs", async () => {
  stubFetch(vi.fn().mockResolvedValue(Response.json({ items: [omelette], nextCursor: null })));
  renderApp("/");

  const link = await screen.findByRole("link", { name: /Omelette/ });
  expect(link).toHaveAttribute("href", `/recipes/${omelette.id}`);
  expect(link).toHaveTextContent("2 ingredients · 10 min");
});

test("one ingredient is counted in the singular", async () => {
  const lemonade = { ...omelette, ingredients: [{ name: "lemons" }], prepMinutes: undefined };
  stubFetch(vi.fn().mockResolvedValue(Response.json({ items: [lemonade], nextCursor: null })));
  renderApp("/");

  expect(await screen.findByRole("link", { name: /Omelette/ })).toHaveTextContent(
    "1 ingredient · 5 min",
  );
});

test("with no recipes, it offers to add the first one", async () => {
  stubFetch(vi.fn().mockResolvedValue(Response.json({ items: [], nextCursor: null })));
  renderApp("/");

  expect(await screen.findByRole("link", { name: "Write a recipe" })).toHaveAttribute(
    "href",
    "/recipes/new",
  );
  // Nothing to search yet.
  expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
});

test("when loading fails, Try again loads the list again", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 502 }))
    .mockResolvedValueOnce(Response.json({ items: [omelette], nextCursor: null }));
  stubFetch(fetch);
  renderApp("/");

  await userEvent.click(await screen.findByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("link", { name: /Omelette/ })).toBeInTheDocument();
});

const toast = { ...omelette, id: "6650a1b2c3d4e5f600000002", title: "Toast" };

test("Show more adds the next page, focuses its first recipe, and disappears on the last page", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ items: [omelette], nextCursor: "next-page" }))
    .mockResolvedValueOnce(Response.json({ items: [toast], nextCursor: null }));
  stubFetch(fetch);
  renderApp("/");

  await userEvent.click(await screen.findByRole("button", { name: "Show more" }));

  expect(await screen.findByRole("link", { name: /Toast/ })).toHaveFocus();
  expect(screen.getByRole("link", { name: /Omelette/ })).toBeInTheDocument();
  expect(fetch).toHaveBeenLastCalledWith("/api/recipes?cursor=next-page");
  expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
});

test("when the next page fails, the list stays and says so", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ items: [omelette], nextCursor: "next-page" }))
    .mockResolvedValueOnce(new Response(null, { status: 502 }))
    .mockResolvedValueOnce(Response.json({ items: [toast], nextCursor: null }));
  stubFetch(fetch);
  renderApp("/");

  await userEvent.click(await screen.findByRole("button", { name: "Show more" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load more recipes.");
  expect(screen.getByRole("link", { name: /Omelette/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show more" })).toHaveFocus();

  await userEvent.click(screen.getByRole("button", { name: "Show more" }));
  expect(await screen.findByRole("link", { name: /Toast/ })).toHaveFocus();
  expect(fetch).toHaveBeenLastCalledWith("/api/recipes?cursor=next-page");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

// A fake list API: the omelette, unless the request asks for something it doesn't have.
function stubList() {
  const fetch = vi.fn((path: string) => {
    const found = path === "/api/recipes" || path.includes("egg") || path.includes("breakfast");
    return Promise.resolve(Response.json({ items: found ? [omelette] : [], nextCursor: null }));
  });
  stubFetch(fetch);
  return fetch;
}

test("a search asks the API, says how many match, and leaves focus in the box", async () => {
  const fetch = stubList();
  renderApp("/");

  const search = await screen.findByRole("searchbox", { name: "Search your recipes" });
  await userEvent.type(search, " eggs {Enter}");

  expect(await screen.findByText("1 recipe matches.")).toHaveAttribute("role", "status");
  expect(fetch).toHaveBeenLastCalledWith("/api/recipes?q=eggs");
  expect(search).toHaveFocus();
});

test("tags in the address filter the list, open, and unticking the last one clears it", async () => {
  const fetch = stubList();
  renderApp("/?tags=meal:breakfast");

  const breakfast = await screen.findByRole("checkbox", { name: "breakfast" });
  expect(breakfast).toBeChecked();
  expect(fetch).toHaveBeenCalledWith("/api/recipes?tags=meal%3Abreakfast");
  expect(await screen.findByText("1 recipe matches.")).toHaveAttribute("role", "status");

  await userEvent.click(breakfast);
  await waitFor(() => {
    expect(fetch).toHaveBeenLastCalledWith("/api/recipes");
  });
  // Still open: it doesn't fold away under the user's finger.
  expect(screen.getByRole("checkbox", { name: "breakfast" })).toBeVisible();
});

test("when nothing matches, it says so and offers to clear the search and filters", async () => {
  const fetch = stubList();
  renderApp("/?q=soup&tags=cuisine:italian");

  expect(await screen.findByText("No recipes match.")).toHaveAttribute("role", "status");
  expect(screen.getByRole("searchbox")).toHaveValue("soup");

  await userEvent.click(screen.getByRole("link", { name: "Clear the search and filters" }));

  expect(await screen.findByRole("link", { name: /Omelette/ })).toBeInTheDocument();
  expect(fetch).toHaveBeenLastCalledWith("/api/recipes");
  expect(screen.getByRole("searchbox")).toHaveValue("");
});

test("Show more keeps the filter when it asks for the next page", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ items: [omelette], nextCursor: "next-page" }))
    .mockResolvedValueOnce(Response.json({ items: [toast], nextCursor: null }));
  stubFetch(fetch);
  renderApp("/?tags=meal:breakfast");

  await userEvent.click(await screen.findByRole("button", { name: "Show more" }));

  expect(await screen.findByRole("link", { name: /Toast/ })).toBeInTheDocument();
  expect(fetch).toHaveBeenLastCalledWith("/api/recipes?tags=meal%3Abreakfast&cursor=next-page");
});

test("a tag in the address that isn't in the lists is left out", async () => {
  const fetch = stubList();
  renderApp("/?tags=meal:martian,meal:breakfast");

  expect(await screen.findByText("1 recipe matches.")).toHaveAttribute("role", "status");
  expect(fetch).toHaveBeenCalledWith("/api/recipes?tags=meal%3Abreakfast");
});
