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

// A browser with the Wake Lock API, granting the lock.
function stubWakeLock() {
  const request = vi.fn(() =>
    Promise.resolve(Object.assign(new EventTarget(), { release: () => Promise.resolve() })),
  );
  // The real navigator underneath (jsdom has no wakeLock), with one added.
  vi.stubGlobal("navigator", Object.assign(Object.create(navigator), { wakeLock: { request } }));
  return request;
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

  expect(await screen.findByRole("button", { name: "Back" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
  expect(screen.getByText("Cook them in butter.")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByText("Beat the eggs.")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  await userEvent.click(screen.getByRole("link", { name: "Done" }));
  expect(await screen.findByRole("heading", { level: 1, name: "Omelette" })).toBeInTheDocument();
});

test("keeps the screen on, and says so", async () => {
  stubApi();
  const request = stubWakeLock();
  renderApp(`/recipes/${omelette.id}/cook`);

  expect(await screen.findByText("The screen stays on.")).toBeInTheDocument();
  expect(request).toHaveBeenCalledWith("screen");
});

test("says the screen may lock where the browser can't keep it on", async () => {
  stubApi();
  renderApp(`/recipes/${omelette.id}/cook`);

  expect(await screen.findByText(/The screen may lock/)).toBeInTheDocument();
});
