import type { Import, Recipe, RecipeInput } from "@pinch/shared";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp } from "../../test-utils.tsx";

afterEach(() => {
  vi.unstubAllGlobals();
});

const reel = "https://www.instagram.com/p/DOxAbc123/";

const draft: RecipeInput = {
  title: "Tomato pasta",
  ingredients: [{ name: "spaghetti" }],
  steps: ["Boil it."],
  tags: [],
};

const ready: Import = {
  id: "6650a1b2c3d4e5f600000001",
  status: "ready",
  input: { type: "link", url: reel, platform: "instagram" },
  attempts: 1,
  stalled: false,
  draft,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
};

const saved: Recipe = {
  ...draft,
  id: "6650a1b2c3d4e5f600000002",
  title: "Nonna's tomato pasta",
  source: { type: "instagram", url: reel },
  createdAt: "2026-11-01T10:01:00.000Z",
  updatedAt: "2026-11-01T10:01:00.000Z",
};

// A fake API: this import, the recipe approve makes, DELETE answering 204 (or the status
// given), and an empty /.
function stubApi(job: Import = ready, deleteStatus = 204) {
  const fetch = vi.fn((path: string, init?: RequestInit) => {
    if (init?.method === "DELETE") {
      return Promise.resolve(new Response(null, { status: deleteStatus }));
    }
    if (path.endsWith("/approve")) return Promise.resolve(Response.json(saved, { status: 201 }));
    if (path === `/api/imports/${job.id}`) return Promise.resolve(Response.json(job));
    if (path === `/api/recipes/${saved.id}`) return Promise.resolve(Response.json(saved));
    if (path === "/api/imports") return Promise.resolve(Response.json({ items: [] }));
    return Promise.resolve(Response.json({ items: [], nextCursor: null }));
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

test("the draft opens in the form; Save approves it as edited and shows the recipe", async () => {
  const fetch = stubApi();
  renderApp(`/imports/${ready.id}`);

  const title = await screen.findByLabelText("Title");
  expect(title).toHaveValue("Tomato pasta");
  await userEvent.clear(title);
  await userEvent.type(title, "Nonna's tomato pasta");
  await userEvent.click(screen.getByRole("button", { name: "Save to My recipes" }));

  expect(
    await screen.findByRole("heading", { level: 1, name: "Nonna's tomato pasta" }),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(`/api/imports/${ready.id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...draft, title: "Nonna's tomato pasta" }),
  });
});

test("the draft sits under Add recipe, says where Pinch read it and links to the post", async () => {
  stubApi();
  renderApp(`/imports/${ready.id}`);

  const breadcrumb = await screen.findByRole("navigation", { name: "Breadcrumb" });
  expect(within(breadcrumb).getByRole("link", { name: "Add recipe" })).toHaveAttribute("href", "/");
  expect(within(breadcrumb).getByText("Review: Tomato pasta")).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByText("Pinch read this from Instagram")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Watch the video/ })).toHaveAttribute("href", reel);
});

test("Discard asks first; keeping the draft keeps it", async () => {
  const fetch = stubApi();
  renderApp(`/imports/${ready.id}`);

  await userEvent.click(await screen.findByRole("button", { name: "Discard" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Discard this draft?" });
  await userEvent.click(within(dialog).getByRole("button", { name: "Keep reviewing" }));

  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Title")).toHaveValue("Tomato pasta");
  expect(fetch.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
});

test("the question names the draft by its title as it is now", async () => {
  stubApi();
  renderApp(`/imports/${ready.id}`);

  const title = await screen.findByLabelText("Title");
  await userEvent.clear(title);
  await userEvent.type(title, "Nonna's pasta");
  await userEvent.click(screen.getByRole("button", { name: "Discard" }));

  expect(await screen.findByRole("alertdialog")).toHaveTextContent(
    "“Nonna's pasta” won't be saved.",
  );
});

test("Discard doesn't open while the draft is being saved", async () => {
  const fetch = stubApi();
  // Approve never answers: the draft stays "Saving…".
  fetch.mockImplementation((path: string) =>
    path.endsWith("/approve")
      ? new Promise<Response>(() => undefined)
      : Promise.resolve(
          path === "/api/imports" ? Response.json({ items: [] }) : Response.json(ready),
        ),
  );
  renderApp(`/imports/${ready.id}`);

  await screen.findByLabelText("Title");
  await userEvent.click(screen.getByRole("button", { name: "Save to My recipes" }));
  expect(await screen.findByRole("button", { name: "Saving…" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Discard" }));

  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(fetch.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
});

test("Discard draft deletes the import and goes back to Add recipe", async () => {
  const fetch = stubApi();
  renderApp(`/imports/${ready.id}`);

  await userEvent.click(await screen.findByRole("button", { name: "Discard" }));
  await userEvent.click(screen.getByRole("button", { name: "Discard draft" }));

  const heading = await screen.findByRole("heading", { level: 1, name: "Add recipe" });
  // Still there once the dialog's own focus handling (a tick later) is done.
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(heading).toHaveFocus();
  expect(fetch).toHaveBeenCalledWith(`/api/imports/${ready.id}`, { method: "DELETE" });
});

test("when Discard fails, a toast says so and the draft stays", async () => {
  stubApi(ready, 500);
  renderApp(`/imports/${ready.id}`);

  await userEvent.click(await screen.findByRole("button", { name: "Discard" }));
  await userEvent.click(screen.getByRole("button", { name: "Discard draft" }));

  expect(await screen.findByText("Couldn't save")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  expect(screen.getByLabelText("Title")).toHaveValue("Tomato pasta");
});

test("a draft from pasted text says so, with no link to a post", async () => {
  stubApi({ ...ready, input: { type: "text", text: "Tomato pasta: spaghetti, tomatoes." } });
  renderApp(`/imports/${ready.id}`);

  expect(await screen.findByText("Pinch read this from the text you pasted")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /opens in a new tab/ })).not.toBeInTheDocument();
});

test("the draft's picture shows, from the import", async () => {
  stubApi({ ...ready, thumbnail: { width: 400, height: 225 } });
  renderApp(`/imports/${ready.id}`);

  // Twice: first on a phone, in the right column from 1024 px (CSS shows one; jsdom has no CSS).
  for (const picture of await screen.findAllByRole("presentation")) {
    expect(picture).toHaveAttribute("src", `/api/imports/${ready.id}/thumbnail`);
  }
});

test("an import with no draft yet says so", async () => {
  stubApi({ ...ready, status: "processing", draft: undefined });
  renderApp(`/imports/${ready.id}`);

  expect(
    await screen.findByRole("heading", { level: 1, name: "No draft yet" }),
  ).toBeInTheDocument();
});

test("an import that doesn't exist has no draft either, and leads back to Add recipe", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
  renderApp(`/imports/${ready.id}`);

  expect(
    await screen.findByRole("heading", { level: 1, name: "No draft yet" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to Add recipe" })).toHaveAttribute("href", "/");
});

test("a draft's things to look at are marked on their fields, and editing a field clears its mark", async () => {
  const marked: Import = {
    ...ready,
    draft: {
      ...draft,
      ingredients: [{ name: "spaghetti" }, { name: "tomatoes" }],
      steps: ["Boil it.", "Toss it."],
      uncertain: [
        { path: "ingredients.1.quantity", reason: "The video says “a can”." },
        { path: "steps.1", reason: "Too fast to follow." },
      ],
    },
  };
  stubApi(marked);
  renderApp(`/imports/${ready.id}`);

  // Each marked box is read with its reason; the count sits under the banner.
  const amounts = await screen.findAllByLabelText("Amount");
  expect(amounts[1]).toHaveAccessibleDescription("To look at: The video says “a can”.");
  expect(amounts[0]).not.toHaveAccessibleDescription();
  expect(screen.getByText(/2 things to look at/)).toBeInTheDocument();

  // Go to the first: focus on the first marked box.
  await userEvent.click(screen.getByRole("button", { name: "Go to the first" }));
  expect(amounts[1]).toHaveFocus();

  // Typing in it clears its mark, and the count.
  await userEvent.type(amounts[1] as HTMLElement, "400");
  expect(amounts[1]).not.toHaveAccessibleDescription();
  expect(screen.getByText(/1 thing to look at/)).toBeInTheDocument();

  // Removing the first step moves the second's mark up with it.
  await userEvent.click(screen.getByRole("button", { name: "Remove step 1" }));
  expect(screen.getByLabelText("Step 1")).toHaveAccessibleDescription(
    "To look at: Too fast to follow.",
  );
});

test("removing a row above a marked one moves its mark up; removing the marked row takes it away", async () => {
  stubApi({
    ...ready,
    draft: {
      ...draft,
      ingredients: [{ name: "spaghetti" }, { name: "tomatoes" }, { name: "garlic" }],
      uncertain: [{ path: "ingredients.2.name", reason: "Hard to hear." }],
    },
  });
  renderApp(`/imports/${ready.id}`);

  await screen.findAllByLabelText("Ingredient");
  await userEvent.click(screen.getByRole("button", { name: "Remove ingredient 1" }));
  const names = screen.getAllByLabelText("Ingredient");
  expect(names[1]).toHaveValue("garlic");
  expect(names[1]).toHaveAccessibleDescription("To look at: Hard to hear.");
  expect(names[0]).not.toHaveAccessibleDescription();

  await userEvent.click(screen.getByRole("button", { name: "Remove ingredient 2" }));
  expect(screen.queryByText("Hard to hear.")).not.toBeInTheDocument();
  expect(screen.queryByText(/to look at/)).not.toBeInTheDocument();
});

test("changing a marked number clears its mark", async () => {
  stubApi({
    ...ready,
    draft: { ...draft, servings: 2, uncertain: [{ path: "servings", reason: "Not said." }] },
  });
  renderApp(`/imports/${ready.id}`);

  const serves = await screen.findByLabelText("Serves");
  expect(serves).toHaveAccessibleDescription("To look at: Not said.");
  await userEvent.type(serves, "4");
  expect(serves).not.toHaveAccessibleDescription();
  expect(screen.queryByText("Not said.")).not.toBeInTheDocument();
});
