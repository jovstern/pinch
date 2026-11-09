import type { Recipe } from "@pinch/shared";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp, stubFetch } from "../../test-utils.tsx";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const omelette: Recipe = {
  id: "6650a1b2c3d4e5f600000001",
  title: "Omelette",
  ingredients: [
    { name: "eggs", quantity: "2" },
    { name: "butter", quantity: "1", unit: "tbsp" },
  ],
  steps: ["Beat the eggs.", "Cook them in butter."],
  tags: [],
  source: { type: "manual" },
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
};

function stubApi(recipe = omelette) {
  stubFetch(() => Promise.resolve(Response.json(recipe)));
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

test("the breadcrumbs lead back to the recipe; there's no Exit", async () => {
  stubApi();
  renderApp(`/recipes/${omelette.id}/cook`);

  const breadcrumb = await screen.findByRole("navigation", { name: "Breadcrumb" });
  expect(within(breadcrumb).getByRole("link", { name: "Omelette" })).toHaveAttribute(
    "href",
    `/recipes/${omelette.id}`,
  );
  expect(screen.queryByRole("link", { name: "Exit" })).not.toBeInTheDocument();
  expect(screen.getByText("Written by you", { exact: false })).toBeInTheDocument();
});

test("keeps the screen on and says so; lets go when the cook leaves", async () => {
  stubApi();
  const { request, lock } = stubWakeLock();
  renderApp(`/recipes/${omelette.id}/cook`);

  expect(await screen.findByText("The screen stays on.", { exact: false })).toBeInTheDocument();
  expect(request).toHaveBeenCalledWith("screen");

  await userEvent.click(screen.getByRole("link", { name: "Omelette" }));
  expect(await screen.findByRole("heading", { level: 1, name: "Omelette" })).toBeInTheDocument();
  expect(lock.release).toHaveBeenCalled();
});

test("says so when the browser lets go of the lock", async () => {
  stubApi();
  const { lock } = stubWakeLock();
  renderApp(`/recipes/${omelette.id}/cook`);
  await screen.findByText("The screen stays on.", { exact: false });

  lock.dispatchEvent(new Event("release"));

  expect(
    await screen.findByText("This browser may let the screen lock.", { exact: false }),
  ).toBeInTheDocument();
});

test("says the screen may lock where the browser can't keep it on", async () => {
  stubApi();
  renderApp(`/recipes/${omelette.id}/cook`);

  expect(
    await screen.findByText("This browser may let the screen lock.", { exact: false }),
  ).toBeInTheDocument();
});

test("shows the step's ingredients, ticked off in both lists at once", async () => {
  stubApi();
  renderApp(`/recipes/${omelette.id}/cook`);

  const forStep = await screen.findByRole("list", { name: "For this step" });
  expect(
    within(forStep)
      .getAllByRole("listitem")
      .map((item) => item.textContent),
  ).toEqual(["2 eggs"]);
  await userEvent.click(within(forStep).getByRole("checkbox", { name: "2 eggs" }));

  const all = screen.getByRole("list", { name: "All ingredients (2)" });
  expect(within(all).getByRole("checkbox", { name: "2 eggs" })).toBeChecked();
  expect(within(all).getByRole("checkbox", { name: "1 tbsp butter" })).not.toBeChecked();
  await userEvent.click(within(all).getByRole("checkbox", { name: "2 eggs" }));
  expect(within(forStep).getByRole("checkbox", { name: "2 eggs" })).not.toBeChecked();

  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(
    within(screen.getByRole("list", { name: "For this step" })).getByRole("checkbox", {
      name: "1 tbsp butter",
    }),
  ).toBeInTheDocument();
});

test("a time in the step starts a timer, which counts down and says when it's done", async () => {
  // Fake clocks, moved by hand, and with real time too, so findBy and user-event keep working.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
  stubApi({ ...omelette, steps: ["Cook the eggs for 2 min."] });
  renderApp(`/recipes/${omelette.id}/cook`);

  await user.click(await screen.findByRole("button", { name: "Timer: 2 min" }));
  const timers = screen.getByRole("list", { name: "Timers" });
  expect(timers).toHaveTextContent("2 min: 2:00 left");

  act(() => {
    vi.advanceTimersByTime(60_000);
  });
  expect(timers).toHaveTextContent("2 min: 1:00 left");

  act(() => {
    vi.advanceTimersByTime(60_000);
  });
  expect(within(timers).getByRole("alert")).toHaveTextContent("2 min: done");

  await user.click(screen.getByRole("button", { name: "Dismiss the 2 min timer" }));
  expect(screen.queryByRole("list", { name: "Timers" })).not.toBeInTheDocument();
});

test("each timer rings once as it ends, and not again when one is dismissed", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
  const vibrate = vi.fn(() => true);
  vi.stubGlobal("navigator", Object.assign(Object.create(navigator), { vibrate }));
  stubApi({ ...omelette, steps: ["Cook 1 min, then 2 min."] });
  renderApp(`/recipes/${omelette.id}/cook`);

  await user.click(await screen.findByRole("button", { name: "Timer: 1 min" }));
  await user.click(screen.getByRole("button", { name: "Timer: 2 min" }));
  act(() => {
    vi.advanceTimersByTime(60_000);
  });
  expect(vibrate).toHaveBeenCalledTimes(1);
  // A second more: the 2 min timer was started a moment after the first.
  act(() => {
    vi.advanceTimersByTime(61_000);
  });
  expect(vibrate).toHaveBeenCalledTimes(2);

  await user.click(screen.getByRole("button", { name: "Dismiss the 1 min timer" }));
  expect(vibrate).toHaveBeenCalledTimes(2);
});

test("a timer pressed again while it runs isn't started twice, and shows it's running", async () => {
  stubApi({ ...omelette, steps: ["Cook the eggs for 2 min."] });
  renderApp(`/recipes/${omelette.id}/cook`);

  const timer = await screen.findByRole("button", { name: "Timer: 2 min" });
  await userEvent.dblClick(timer);

  expect(
    within(screen.getByRole("list", { name: "Timers" })).getAllByRole("listitem"),
  ).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Running: 2 min" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
});

test("from 1024 px the whole checklist is a panel beside the steps, not folded", async () => {
  stubApi();
  renderApp(`/recipes/${omelette.id}/cook`);
  // A wide screen from here on: cook mode reads it once the recipe has come.
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

  expect(
    await screen.findByRole("heading", { level: 2, name: "All ingredients (2)" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("list", { name: "All ingredients (2)" })).toBeVisible();
});
