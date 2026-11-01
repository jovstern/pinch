import type { Recipe } from "@pinch/shared";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp } from "../../test-utils.tsx";

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
  source: { type: "manual" },
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
};

test("lists each recipe as a link to it, with what it needs", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ items: [omelette], nextCursor: null })),
  );
  renderApp("/");

  const link = await screen.findByRole("link", { name: /Omelette/ });
  expect(link).toHaveAttribute("href", `/recipes/${omelette.id}`);
  expect(link).toHaveTextContent("2 ingredients · 10 min");
});

test("one ingredient is counted in the singular", async () => {
  const lemonade = { ...omelette, ingredients: [{ name: "lemons" }], prepMinutes: undefined };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ items: [lemonade], nextCursor: null })),
  );
  renderApp("/");

  expect(await screen.findByRole("link", { name: /Omelette/ })).toHaveTextContent(
    "1 ingredient · 5 min",
  );
});

test("with no recipes, it offers to add the first one", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ items: [], nextCursor: null })));
  renderApp("/");

  expect(await screen.findByRole("link", { name: "Add your first recipe" })).toHaveAttribute(
    "href",
    "/recipes/new",
  );
});

test("when loading fails, Try again loads the list again", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 502 }))
    .mockResolvedValueOnce(Response.json({ items: [omelette], nextCursor: null }));
  vi.stubGlobal("fetch", fetch);
  renderApp("/");

  await userEvent.click(await screen.findByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("link", { name: /Omelette/ })).toBeInTheDocument();
});
