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
  renderApp("/recipes");

  const link = await screen.findByRole("link", { name: /Omelette/ });
  expect(link).toHaveAttribute("href", `/recipes/${omelette.id}`);
  expect(link).toHaveTextContent("10 min · 2 ingredients");
});

test("a recipe from a post shows its picture and its site in its card", async () => {
  const fromReel = {
    ...omelette,
    thumbnail: { width: 281, height: 500 },
    source: { type: "instagram" as const, url: "https://www.instagram.com/reel/abc/" },
  };
  stubFetch(vi.fn().mockResolvedValue(Response.json({ items: [fromReel], nextCursor: null })));
  renderApp("/recipes");

  const link = await screen.findByRole("link", { name: /Omelette/ });
  expect(within(link).getByRole("presentation")).toHaveAttribute(
    "src",
    `/api/recipes/${omelette.id}/thumbnail`,
  );
  // Decorative: the link is named by the title first, then what it needs and where it's from.
  expect(link).toHaveAccessibleName("Omelette 10 min · 2 ingredients Instagram");
});

test("one ingredient is counted in the singular", async () => {
  const lemonade = { ...omelette, ingredients: [{ name: "lemons" }], prepMinutes: undefined };
  stubFetch(vi.fn().mockResolvedValue(Response.json({ items: [lemonade], nextCursor: null })));
  renderApp("/recipes");

  expect(await screen.findByRole("link", { name: /Omelette/ })).toHaveTextContent(
    "5 min · 1 ingredient",
  );
});

test("with no recipes, it offers to pinch the first one", async () => {
  stubFetch(vi.fn().mockResolvedValue(Response.json({ items: [], nextCursor: null })));
  renderApp("/recipes");

  expect(await screen.findByRole("link", { name: "Pinch a recipe" })).toHaveAttribute("href", "/");
  // Nothing to search yet.
  expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
});

test("when loading fails, Try again loads the list again", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 502 }))
    .mockResolvedValueOnce(Response.json({ items: [omelette], nextCursor: null }));
  stubFetch(fetch);
  renderApp("/recipes");

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
  renderApp("/recipes");

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
  renderApp("/recipes");

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
  renderApp("/recipes");

  const search = await screen.findByRole("searchbox", { name: "Search your recipes" });
  await userEvent.type(search, " eggs {Enter}");

  expect(await screen.findByText("1 recipe matches.")).toHaveAttribute("role", "status");
  expect(fetch).toHaveBeenLastCalledWith("/api/recipes?q=eggs");
  expect(search).toHaveFocus();
});

test("tags in the address tick the Filters, and unticking the last one clears them", async () => {
  const fetch = stubList();
  renderApp("/recipes?tags=meal:breakfast");

  // The panel's checkbox (from 1024 px; jsdom has no widths, so it's always in the page).
  const breakfast = await screen.findByRole("checkbox", { name: "breakfast" });
  expect(breakfast).toBeChecked();
  expect(fetch).toHaveBeenCalledWith("/api/recipes?tags=meal%3Abreakfast");
  expect(await screen.findByText("1 recipe matches.")).toHaveAttribute("role", "status");

  await userEvent.click(breakfast);
  await waitFor(() => {
    expect(fetch).toHaveBeenLastCalledWith("/api/recipes");
  });
});

test("a common tag's chip turns its tag on and off in the address", async () => {
  const fetch = stubList();
  renderApp("/recipes");

  const chips = await screen.findByRole("group", { name: "Common tags" });
  await userEvent.click(within(chips).getByRole("button", { name: "breakfast" }));
  expect(await screen.findByText("1 recipe matches.")).toHaveAttribute("role", "status");
  expect(fetch).toHaveBeenLastCalledWith("/api/recipes?tags=meal%3Abreakfast");
  expect(within(chips).getByRole("button", { name: "breakfast" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await userEvent.click(within(chips).getByRole("button", { name: "breakfast" }));
  await waitFor(() => {
    expect(fetch).toHaveBeenLastCalledWith("/api/recipes");
  });
});

test("the Filters sheet applies a tag as it's ticked and counts it on its button", async () => {
  const fetch = stubList();
  renderApp("/recipes");

  await userEvent.click(await screen.findByRole("button", { name: "Filters" }));
  const sheet = screen.getByRole("dialog", { name: "Filters" });
  await userEvent.click(within(sheet).getByRole("checkbox", { name: "breakfast" }));
  await waitFor(() => {
    expect(fetch).toHaveBeenLastCalledWith("/api/recipes?tags=meal%3Abreakfast");
  });

  await userEvent.click(within(sheet).getByRole("button", { name: "Show recipes" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Filters 1 applied" })).toHaveFocus();
});

test("Clear all clears the search and the tags", async () => {
  const fetch = stubList();
  renderApp("/recipes?q=eggs&tags=meal:breakfast");

  await userEvent.click(await screen.findByRole("button", { name: "Clear all" }));

  await waitFor(() => {
    expect(fetch).toHaveBeenLastCalledWith("/api/recipes");
  });
  expect(screen.getByRole("searchbox")).toHaveValue("");
  expect(screen.getByRole("checkbox", { name: "breakfast" })).not.toBeChecked();
  expect(screen.getByRole("searchbox")).toHaveFocus();
});

test("an applied tag's ✕ takes it off", async () => {
  const fetch = stubList();
  renderApp("/recipes?tags=meal:breakfast,diet:vegan");

  await userEvent.click(await screen.findByRole("button", { name: "Remove vegan" }));

  await waitFor(() => {
    expect(fetch).toHaveBeenLastCalledWith("/api/recipes?tags=meal%3Abreakfast");
  });
  expect(screen.getByRole("searchbox")).toHaveFocus();
});

test("Skip the filters goes past the Filters panel to the search box", async () => {
  stubList();
  renderApp("/recipes");

  await userEvent.click(await screen.findByRole("button", { name: "Skip the filters" }));

  expect(screen.getByRole("searchbox")).toHaveFocus();
});

test("emptying the search box ends the search, without Enter", async () => {
  const fetch = stubList();
  renderApp("/recipes?q=eggs");

  await userEvent.clear(await screen.findByRole("searchbox"));

  await waitFor(() => {
    expect(fetch).toHaveBeenLastCalledWith("/api/recipes");
  });
});

test("when nothing matches, it says what was asked and offers to clear the search and filters", async () => {
  const fetch = stubList();
  renderApp("/recipes?q=soup&tags=cuisine:italian");

  expect(await screen.findByText("No recipes match.")).toHaveAttribute("role", "status");
  expect(screen.getByText("“soup”, italian")).toBeInTheDocument();
  expect(screen.getByRole("searchbox")).toHaveValue("soup");

  await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));

  expect(await screen.findByRole("link", { name: /Omelette/ })).toBeInTheDocument();
  expect(fetch).toHaveBeenLastCalledWith("/api/recipes");
  expect(screen.getByRole("searchbox")).toHaveValue("");
  // The button went with the filters: the keyboard carries on from the search box.
  expect(screen.getByRole("searchbox")).toHaveFocus();
});

test("with only a search matching nothing, it offers to clear the search", async () => {
  const fetch = stubList();
  renderApp("/recipes?q=soup");

  await userEvent.click(await screen.findByRole("button", { name: "Clear search" }));

  expect(await screen.findByRole("link", { name: /Omelette/ })).toBeInTheDocument();
  expect(fetch).toHaveBeenLastCalledWith("/api/recipes");
});

test("Show more keeps the filter when it asks for the next page", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ items: [omelette], nextCursor: "next-page" }))
    .mockResolvedValueOnce(Response.json({ items: [toast], nextCursor: null }));
  stubFetch(fetch);
  renderApp("/recipes?tags=meal:breakfast");

  await userEvent.click(await screen.findByRole("button", { name: "Show more" }));

  expect(await screen.findByRole("link", { name: /Toast/ })).toBeInTheDocument();
  expect(fetch).toHaveBeenLastCalledWith("/api/recipes?tags=meal%3Abreakfast&cursor=next-page");
});

test("with a search and tags matching nothing, it offers the search without the tags", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ items: [], nextCursor: null }))
    .mockResolvedValueOnce(Response.json({ items: [omelette], nextCursor: null }));
  stubFetch(fetch);
  renderApp("/recipes?q=eggs&tags=cuisine:italian");

  await userEvent.click(
    await screen.findByRole("button", { name: "Search all recipes for “eggs”" }),
  );

  expect(await screen.findByText("1 recipe matches.")).toHaveAttribute("role", "status");
  expect(fetch).toHaveBeenLastCalledWith("/api/recipes?q=eggs");
  expect(screen.getByRole("searchbox")).toHaveFocus();
});

test("a tag in the address that isn't in the lists is left out", async () => {
  const fetch = stubList();
  renderApp("/recipes?tags=meal:martian,meal:breakfast");

  expect(await screen.findByText("1 recipe matches.")).toHaveAttribute("role", "status");
  expect(fetch).toHaveBeenCalledWith("/api/recipes?tags=meal%3Abreakfast");
});
