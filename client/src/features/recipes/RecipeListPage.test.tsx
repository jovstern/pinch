import type { Recipe } from "@pinch/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp, renderInHebrew, stubFetch } from "../../test-utils.tsx";

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
  // (A no-break space joins the number to its unit, design §16.9.)
  expect(link).toHaveAccessibleName("Omelette 10\u00A0min · 2 ingredients Instagram");
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

  expect(await screen.findByRole("heading", { level: 2, name: "No recipes yet" })).toBeVisible();
  expect(screen.getByText("Pinch one from a reel, or write your own.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Pinch a recipe" })).toHaveAttribute("href", "/");
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

  const alert = await screen.findByRole("alert");
  expect(
    within(alert).getByRole("heading", { level: 2, name: "We couldn't load your recipes" }),
  ).toBeInTheDocument();
  expect(within(alert).getByText("Check your connection, then try again.")).toBeInTheDocument();
  await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));
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
  renderApp("/recipes?tags=meal:breakfast", { wide: true });

  // The panel's checkbox (from 1024 px: the test's screen is wide).
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

test("the Filters sheet applies a tag, a time and an order as they're picked, and says how many are left", async () => {
  const fetch = stubList();
  renderApp("/recipes");

  await userEvent.click(await screen.findByRole("button", { name: "Filters" }));
  const sheet = await screen.findByRole("dialog", { name: "Filters" });
  await userEvent.click(within(sheet).getByRole("checkbox", { name: "breakfast" }));
  await userEvent.click(within(sheet).getByRole("radio", { name: "30 min or less" }));
  await userEvent.click(within(sheet).getByRole("radio", { name: "Quickest" }));
  await waitFor(() => {
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/recipes?tags=meal%3Abreakfast&time=30&sort=quickest",
    );
  });

  await userEvent.click(await within(sheet).findByRole("button", { name: "Show 1 recipe" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  // The tag and the time; the order narrows nothing.
  expect(screen.getByRole("button", { name: "Filters 2 applied" })).toHaveFocus();
});

test("the Filters sheet's Clear takes the filters off and keeps the order", async () => {
  const fetch = stubList();
  renderApp("/recipes?tags=meal:breakfast&source=youtube&sort=az");

  await userEvent.click(await screen.findByRole("button", { name: "Filters 2 applied" }));
  const sheet = await screen.findByRole("dialog", { name: "Filters" });
  await userEvent.click(within(sheet).getByRole("button", { name: "Clear" }));

  await waitFor(() => {
    expect(fetch).toHaveBeenLastCalledWith("/api/recipes?sort=az");
  });
  expect(within(sheet).getByRole("radio", { name: "A–Z" })).toBeChecked();
  expect(within(sheet).getByRole("radio", { name: "Any" })).toBeChecked();
});

test("Sort beside the search puts the order in the address", async () => {
  const fetch = stubList();
  renderApp("/recipes");

  await userEvent.selectOptions(await screen.findByRole("combobox", { name: "Sort" }), "A–Z");

  await waitFor(() => {
    expect(fetch).toHaveBeenLastCalledWith("/api/recipes?sort=az");
  });
});

test("while searching, Sort shows Best match and sends no order until one is picked", async () => {
  const fetch = stubList();
  renderApp("/recipes?q=eggs");

  const sort = await screen.findByRole("combobox", { name: "Sort" });
  expect(sort).toHaveDisplayValue("Best match");
  expect(fetch).toHaveBeenCalledWith("/api/recipes?q=eggs");

  await userEvent.selectOptions(sort, "Newest");
  await waitFor(() => {
    expect(fetch).toHaveBeenLastCalledWith("/api/recipes?q=eggs&sort=newest");
  });
});

test("the Filters sheet says when a search shows only its 50 best", async () => {
  const items = Array.from({ length: 50 }, (_, i) => ({
    ...omelette,
    id: `6650a1b2c3d4e5f6000000${String(i).padStart(2, "0")}`,
  }));
  stubFetch(vi.fn().mockResolvedValue(Response.json({ items, nextCursor: null })));
  renderApp("/recipes?q=eggs");

  await userEvent.click(await screen.findByRole("button", { name: "Filters" }));
  const sheet = await screen.findByRole("dialog", { name: "Filters" });
  expect(within(sheet).getByRole("button", { name: "Show the 50 best" })).toBeInTheDocument();
  expect(screen.getByText("The 50 best matches.")).toHaveAttribute("role", "status");
});

test("a page with more after it says so, on the page and in the Filters sheet", async () => {
  const items = Array.from({ length: 50 }, (_, i) => ({
    ...omelette,
    id: `6650a1b2c3d4e5f6000000${String(i).padStart(2, "0")}`,
  }));
  stubFetch(vi.fn().mockResolvedValue(Response.json({ items, nextCursor: "next-page" })));
  renderApp("/recipes?tags=meal:breakfast");

  expect(await screen.findByText("More than 50 recipes match.")).toHaveAttribute("role", "status");
  await userEvent.click(screen.getByRole("button", { name: "Filters 1 applied" }));
  const sheet = await screen.findByRole("dialog", { name: "Filters" });
  expect(within(sheet).getByRole("button", { name: "Show 50+ recipes" })).toBeInTheDocument();
});

test("a value written twice in the address is read once", async () => {
  const fetch = stubList();
  renderApp("/recipes?tags=meal:breakfast,meal:breakfast&source=instagram,instagram");

  expect(await screen.findByText("1 recipe matches.")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith("/api/recipes?tags=meal%3Abreakfast&source=instagram");
});

test("a source and a time in the address tick the panel, and each one's ✕ takes it off", async () => {
  const fetch = stubList();
  renderApp("/recipes?source=instagram,manual&time=30", { wide: true });

  expect(await screen.findByRole("checkbox", { name: "Instagram" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "30 min or less" })).toBeChecked();
  expect(fetch).toHaveBeenCalledWith("/api/recipes?source=instagram%2Cmanual&time=30");

  await userEvent.click(screen.getByRole("button", { name: "Remove Written by me" }));
  await waitFor(() => {
    expect(fetch).toHaveBeenLastCalledWith("/api/recipes?source=instagram&time=30");
  });
  await userEvent.click(screen.getByRole("button", { name: "Remove 30 min or less" }));
  await waitFor(() => {
    expect(fetch).toHaveBeenLastCalledWith("/api/recipes?source=instagram");
  });
});

test("Clear all clears the search and the tags", async () => {
  const fetch = stubList();
  renderApp("/recipes?q=eggs&tags=meal:breakfast", { wide: true });

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
  expect(screen.getByText("soup", { selector: "p bdi" }).closest("p")).toHaveTextContent(
    "“soup”, italian",
  );
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

test("a tag, source, time or order in the address that isn't in the lists is left out", async () => {
  const fetch = stubList();
  renderApp("/recipes?tags=meal:martian,meal:breakfast&source=tiktok&time=45&sort=oldest");

  expect(await screen.findByText("1 recipe matches.")).toHaveAttribute("role", "status");
  expect(fetch).toHaveBeenCalledWith("/api/recipes?tags=meal%3Abreakfast");
});

// In Hebrew (design §16.11): My recipes and its Filters say it in Hebrew; the tags' codes stay in
// the address, and what the user typed or wrote keeps its own direction (§16.5).
test("in Hebrew, My recipes names itself and each card says its time and ingredients", async () => {
  const lemonade = { ...omelette, id: "6650a1b2c3d4e5f600000003", ingredients: [{ name: "x" }] };
  stubFetch(
    vi.fn().mockResolvedValue(Response.json({ items: [omelette, lemonade], nextCursor: null })),
  );
  await renderInHebrew("/recipes");

  expect(
    await screen.findByRole("heading", { level: 1, name: "המתכונים שלי" }),
  ).toBeInTheDocument();
  expect(document.title).toBe("המתכונים שלי · Pinch");
  const [first, second] = await screen.findAllByRole("link", { name: /Omelette/ });
  expect(first).toHaveTextContent("10 דק׳ · 2 מצרכים");
  // One, in words.
  expect(second).toHaveTextContent("10 דק׳ · מצרך אחד");
  expect(screen.getByRole("searchbox", { name: "חיפוש במתכונים שלי" })).toHaveAttribute(
    "placeholder",
    "חיפוש מתכונים",
  );
  expect(screen.getByRole("button", { name: "לדלג על הסינון" })).toBeInTheDocument();
  const chips = screen.getByRole("group", { name: "תגיות נפוצות" });
  expect(within(chips).getByRole("button", { name: "ארוחת בוקר" })).toBeInTheDocument();
});

test("in Hebrew, a search says one match, two and many in their own forms", async () => {
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      ...omelette,
      id: `6650a1b2c3d4e5f6000000${String(i).padStart(2, "0")}`,
    }));
  const fetch = vi.fn((path: string) => {
    const n = path.includes("one") ? 1 : path.includes("two") ? 2 : 7;
    return Promise.resolve(Response.json({ items: many(n), nextCursor: null }));
  });
  stubFetch(fetch);
  await renderInHebrew("/recipes?q=one");

  expect(await screen.findByText("מתכון אחד מתאים.")).toHaveAttribute("role", "status");
  const search = screen.getByRole("searchbox");
  await userEvent.clear(search);
  await userEvent.type(search, "two{Enter}");
  expect(await screen.findByText("2 מתכונים מתאימים.")).toBeInTheDocument();
  await userEvent.clear(search);
  await userEvent.type(search, "seven{Enter}");
  expect(await screen.findByText("7 מתכונים מתאימים.")).toBeInTheDocument();
});

test("in Hebrew, when loading fails, it says so and offers to try again", async () => {
  stubFetch(vi.fn().mockResolvedValue(new Response(null, { status: 502 })));
  await renderInHebrew("/recipes");

  const alert = await screen.findByRole("alert");
  expect(within(alert).getByRole("heading", { name: "המתכונים לא נטענו" })).toBeInTheDocument();
  expect(within(alert).getByText("כדאי לבדוק את החיבור ולנסות שוב.")).toBeInTheDocument();
  expect(within(alert).getByRole("button", { name: "לנסות שוב" })).toBeInTheDocument();
});

test("in Hebrew, with no recipes, it offers to add the first one", async () => {
  stubFetch(vi.fn().mockResolvedValue(Response.json({ items: [], nextCursor: null })));
  await renderInHebrew("/recipes");

  expect(await screen.findByRole("heading", { name: "עדיין אין מתכונים" })).toBeInTheDocument();
  expect(screen.getByText("אפשר לשמור מתכון מסרטון או לכתוב מתכון ידנית.")).toBeInTheDocument();
  // As the header's tab says it, to the same page.
  expect(
    within(screen.getByRole("main")).getByRole("link", { name: "להוסיף מתכון" }),
  ).toHaveAttribute("href", "/");
});

test("in Hebrew, when nothing matches, the search is in its own <bdi> inside the sentence", async () => {
  stubFetch(vi.fn().mockResolvedValue(Response.json({ items: [], nextCursor: null })));
  await renderInHebrew("/recipes?q=soup&tags=cuisine:italian");

  expect(await screen.findByRole("heading", { name: "אין מתכונים מתאימים" })).toBeInTheDocument();
  const asked = screen.getByText("soup", { selector: "p bdi" }).closest("p");
  expect(asked).toHaveTextContent('"soup", איטלקי');
  expect(asked).not.toHaveAttribute("dir");
  expect(screen.getByRole("button", { name: "לנקות את הסינון" })).toBeInTheDocument();
  const searchAll = screen.getByRole("button", { name: 'לחפש את "soup" בכל המתכונים' });
  expect(within(searchAll).getByText("soup").tagName).toBe("BDI");
});

test("in Hebrew, the Filters sheet, its choices, its count and its close are in Hebrew", async () => {
  const fetch = stubList();
  await renderInHebrew("/recipes");

  await userEvent.click(await screen.findByRole("button", { name: "סינון" }));
  const sheet = await screen.findByRole("dialog", { name: "סינון" });
  for (const legend of ["מיון", "זמן", "מקור", "מטבח", "ארוחה", "תזונה", "טעם", "מתאים"]) {
    expect(within(sheet).getByRole("group", { name: legend })).toBeInTheDocument();
  }
  expect(within(sheet).getByRole("radio", { name: "הכי חדשים" })).toBeChecked();
  expect(within(sheet).getByRole("radio", { name: "הכול" })).toBeChecked();
  // The sites keep their names (D46).
  expect(within(sheet).getByRole("checkbox", { name: "Instagram" })).toBeInTheDocument();
  expect(within(sheet).getByRole("checkbox", { name: "נכתבו ידנית" })).toBeInTheDocument();
  await userEvent.click(within(sheet).getByRole("checkbox", { name: "ארוחת בוקר" }));
  await userEvent.click(within(sheet).getByRole("radio", { name: "עד 30 דק׳" }));
  await waitFor(() => {
    expect(fetch).toHaveBeenLastCalledWith("/api/recipes?tags=meal%3Abreakfast&time=30");
  });
  expect(await within(sheet).findByRole("button", { name: "להציג מתכון אחד" })).toBeInTheDocument();

  await userEvent.click(within(sheet).getByRole("button", { name: "לסגור" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "סינון 2 פעילים" })).toHaveFocus();
});

test("in Hebrew, the Filters panel and the filters beside the grid are in Hebrew", async () => {
  const fetch = stubList();
  await renderInHebrew("/recipes?tags=meal:breakfast&source=manual", { wide: true });

  const panel = await screen.findByRole("complementary", { name: "סינון" });
  expect(within(panel).getByRole("checkbox", { name: "ארוחת בוקר" })).toBeChecked();
  expect(within(panel).getByRole("button", { name: "לנקות" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "מיון" })).toHaveDisplayValue("הכי חדשים");
  expect(await screen.findByText("מתכון אחד מתאים.")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "להסיר: נכתבו ידנית" }));
  await waitFor(() => {
    expect(fetch).toHaveBeenLastCalledWith("/api/recipes?tags=meal%3Abreakfast");
  });
  expect(screen.getByRole("button", { name: "לנקות הכול" })).toBeInTheDocument();
});
