import type { Recipe } from "@pinch/shared";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp, stubFetch } from "../../test-utils.tsx";

afterEach(() => {
  vi.unstubAllGlobals();
});

const omelette: Recipe = {
  id: "6650a1b2c3d4e5f600000001",
  title: "Omelette",
  ingredients: [{ name: "eggs", quantity: "2" }],
  steps: ["Beat the eggs.", "Cook them in butter."],
  tags: [],
  source: { type: "manual" },
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
};

function stubApi() {
  stubFetch(() => Promise.resolve(Response.json(omelette)));
}

// A browser with the Wake Lock API, granting the lock: the lock (an event target, as a real one
// is) and how it was asked for.
function stubWakeLock() {
  const lock = Object.assign(new EventTarget(), { release: vi.fn(() => Promise.resolve()) });
  const request = vi.fn(() => Promise.resolve(lock));
  // jsdom has no wakeLock: an object that inherits everything from jsdom's navigator, plus one.
  vi.stubGlobal("navigator", Object.assign(Object.create(navigator), { wakeLock: { request } }));
  return { request, lock };
}

test("Cook on a recipe opens cook mode at its first step", async () => {
  stubApi();
  renderApp(`/recipes/${omelette.id}`);

  await userEvent.click(await screen.findByRole("link", { name: "Cook" }));

  expect(await screen.findByText("Step 1 of 2")).toBeInTheDocument();
  expect(screen.getByText("Beat the eggs.")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "New recipe" })).not.toBeInTheDocument();
});

test("Next and Back go through the steps; Done on the last goes back to the recipe", async () => {
  stubApi();
  renderApp(`/recipes/${omelette.id}/cook`);

  expect(await screen.findByRole("button", { name: "Back" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
  expect(screen.getByText("Cook them in butter.")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByText("Beat the eggs.")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  await userEvent.click(screen.getByRole("button", { name: "Done" }));
  expect(await screen.findByRole("heading", { level: 1, name: "Omelette" })).toBeInTheDocument();
});

test("keeps the screen on and says so; lets go when the cook leaves", async () => {
  stubApi();
  const { request, lock } = stubWakeLock();
  renderApp(`/recipes/${omelette.id}/cook`);

  expect(await screen.findByText("The screen stays on.")).toBeInTheDocument();
  expect(request).toHaveBeenCalledWith("screen");

  await userEvent.click(screen.getByRole("link", { name: "Exit" }));
  expect(await screen.findByRole("heading", { level: 1, name: "Omelette" })).toBeInTheDocument();
  expect(lock.release).toHaveBeenCalled();
});

test("says so when the browser lets go of the lock", async () => {
  stubApi();
  const { lock } = stubWakeLock();
  renderApp(`/recipes/${omelette.id}/cook`);
  await screen.findByText("The screen stays on.");

  lock.dispatchEvent(new Event("release"));

  expect(await screen.findByText("This browser may let the screen lock.")).toBeInTheDocument();
});

test("says the screen may lock where the browser can't keep it on", async () => {
  stubApi();
  renderApp(`/recipes/${omelette.id}/cook`);

  expect(await screen.findByText("This browser may let the screen lock.")).toBeInTheDocument();
});
