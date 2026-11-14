import {
  dailyLimitMessage,
  globalLimitMessage,
  messages,
  type DuplicateLink,
  type Import,
} from "@pinch/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { inHebrew, renderApp, renderInHebrew, toastTitled } from "../../test-utils.tsx";
import { ImportList } from "./ImportList.tsx";
import { pollInterval } from "./importQueries.ts";
import { ScreenshotsUpload } from "./ScreenshotsUpload.tsx";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const reel = "https://www.instagram.com/p/DOxAbc123/";
// What the worker made of it, once ready.
const draft = {
  title: "Tomato pasta",
  ingredients: [{ name: "pasta" }],
  steps: ["Boil it."],
  tags: [],
};

function importOf(fields: Partial<Import>): Import {
  return {
    id: "6650a1b2c3d4e5f600000001",
    status: "pending",
    input: { type: "link", url: reel, platform: "instagram" },
    attempts: 0,
    stalled: false,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
    ...fields,
  };
}

// A fake API for /: no recipes; the imports each GET /api/imports answers, in turn (the last
// one again and again); and what POST and DELETE answer (a new Response each time: a body is
// read once).
function stubApi(
  lists: Import[][],
  post = () => Response.json(importOf({}), { status: 202 }),
  remove = () => new Response(null, { status: 204 }),
) {
  let gets = 0;
  const fetch = vi.fn((path: string, init?: RequestInit) => {
    if (init?.method === "POST") return Promise.resolve(post());
    if (init?.method === "DELETE") return Promise.resolve(remove());
    if (path === "/api/imports") {
      const items = lists[Math.min(gets, lists.length - 1)];
      gets += 1;
      return Promise.resolve(Response.json({ items }));
    }
    return Promise.resolve(Response.json({ items: [], nextCursor: null }));
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

test("a pasted link is sent trimmed, the box empties, and the link shows as waiting", async () => {
  const fetch = stubApi([[], [importOf({})]]);
  renderApp("/");

  const box = await screen.findByRole("textbox", { name: "Pinch a recipe from a reel" });
  await userEvent.type(box, ` ${reel}`);
  await userEvent.click(screen.getByRole("button", { name: "Pinch it" }));

  expect(fetch).toHaveBeenCalledWith("/api/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "link", url: reel }),
  });
  expect(await screen.findByText("Waiting to start…")).toBeInTheDocument();
  expect(screen.getByText("Instagram link")).toBeInTheDocument();
  expect(box).toHaveValue("");
});

test("a pasted text, anything with a space or a new line in it, is sent as text", async () => {
  const fetch = stubApi([[]]);
  renderApp("/");

  const box = await screen.findByRole("textbox", { name: "Pinch a recipe from a reel" });
  await userEvent.type(box, "Shakshuka: 4 eggs, 1 can of tomatoes.");
  await userEvent.click(screen.getByRole("button", { name: "Pinch it" }));

  expect(fetch).toHaveBeenCalledWith("/api/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "text", text: "Shakshuka: 4 eggs, 1 can of tomatoes." }),
  });
});

test("Enter sends what's in the box", async () => {
  const fetch = stubApi([[]]);
  renderApp("/");

  await userEvent.type(
    await screen.findByRole("textbox", { name: "Pinch a recipe from a reel" }),
    `${reel}{Enter}`,
  );

  expect(fetch).toHaveBeenCalledWith("/api/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "link", url: reel }),
  });
});

test("a pasted recipe's lines become one line, at the caret, and are sent so", async () => {
  const fetch = stubApi([[]]);
  renderApp("/");

  const box = await screen.findByRole("textbox", { name: "Pinch a recipe from a reel" });
  await userEvent.type(box, "Shakshuka: ");
  await userEvent.paste("\n4 eggs\r\n1 can of tomatoes, crushed\n\n");
  expect(box).toHaveValue("Shakshuka: 4 eggs · 1 can of tomatoes, crushed");

  await userEvent.type(box, "{Enter}");
  expect(fetch).toHaveBeenCalledWith("/api/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "text", text: "Shakshuka: 4 eggs · 1 can of tomatoes, crushed" }),
  });
});

test("the API's message for a text shows under the box", async () => {
  stubApi([[]], () =>
    Response.json(
      { error: { code: "invalid_input", message: "", fields: { text: "Not this one." } } },
      { status: 400 },
    ),
  );
  renderApp("/");

  await userEvent.type(
    await screen.findByRole("textbox", { name: "Pinch a recipe from a reel" }),
    "Shakshuka: 4 eggs, 1 can of tomatoes.",
  );
  await userEvent.click(screen.getByRole("button", { name: "Pinch it" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Not this one.");
});

test("a text too short to be a recipe is refused before it's sent", async () => {
  const fetch = stubApi([[]]);
  renderApp("/");

  await userEvent.type(
    await screen.findByRole("textbox", { name: "Pinch a recipe from a reel" }),
    "2 eggs",
  );
  await userEvent.click(screen.getByRole("button", { name: "Pinch it" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(messages.text);
  expect(fetch).not.toHaveBeenCalledWith("/api/imports", expect.anything());
});

test("an empty box asks for either, and focus goes back to it", async () => {
  stubApi([[]]);
  renderApp("/");

  await userEvent.click(screen.getByRole("button", { name: "Pinch it" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Paste a link or the recipe's text.");
  expect(await screen.findByRole("textbox", { name: "Pinch a recipe from a reel" })).toHaveFocus();
});

test("a link from another site is refused before it's sent, until it's fixed", async () => {
  const fetch = stubApi([[]]);
  renderApp("/");

  const box = await screen.findByRole("textbox", { name: "Pinch a recipe from a reel" });
  await userEvent.type(box, "https://www.tiktok.com/@chef/video/1");
  await userEvent.click(screen.getByRole("button", { name: "Pinch it" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(messages.link);
  // The hint, then the error.
  expect(box).toHaveAccessibleDescription(
    `Paste a YouTube short, a Facebook or Instagram reel, or a recipe as text ${messages.link}`,
  );
  expect(fetch).not.toHaveBeenCalledWith("/api/imports", expect.anything());

  await userEvent.clear(box);
  await userEvent.type(box, reel);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("the API's message for a link shows under the box", async () => {
  stubApi([[]], () =>
    Response.json(
      { error: { code: "invalid_input", message: "", fields: { url: "Not this one." } } },
      { status: 400 },
    ),
  );
  renderApp("/");

  const box = await screen.findByRole("textbox", { name: "Pinch a recipe from a reel" });
  await userEvent.type(box, reel);
  await userEvent.click(screen.getByRole("button", { name: "Pinch it" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Not this one.");
  expect(box).toHaveValue(reel);
});

test("when the link can't be sent, it says so and keeps the link", async () => {
  stubApi([[]], () => new Response(null, { status: 502 }));
  renderApp("/");

  const box = await screen.findByRole("textbox", { name: "Pinch a recipe from a reel" });
  await userEvent.type(box, reel);
  await userEvent.click(screen.getByRole("button", { name: "Pinch it" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't send this. Try again.");
  expect(box).toHaveValue(reel);
});

test("while a link is worked on, its status is asked again until it's ready to review", async () => {
  stubApi([
    [importOf({ status: "processing", attempts: 1 })],
    [importOf({ status: "ready", draft })],
  ]);
  renderApp("/");

  expect(await screen.findByText("Working on it…")).toBeInTheDocument();
  // The 2 s poll, with time to spare.
  expect(await screen.findByText("Ready to review", {}, { timeout: 3000 })).toBeInTheDocument();
  const review = screen.getByRole("link", { name: "Review" });
  expect(review).toHaveAttribute("href", "/imports/6650a1b2c3d4e5f600000001");
  // Nothing left cooking.
  expect(screen.getByRole("heading", { name: "1 ready" })).toBeInTheDocument();
});

// The shimmer itself is CSS (globals.css), still under reduced motion: here, which lines have it.
test("a status shimmers while the worker has the import, and not while it waits", async () => {
  stubApi([
    [
      importOf({ status: "processing", attempts: 1, step: "analyzing" }),
      importOf({ id: "6650a1b2c3d4e5f600000002", status: "pending", attempts: 0 }),
    ],
  ]);
  renderApp("/");

  expect(await screen.findByText("Reading the recipe…")).toHaveClass("shimmer");
  expect(screen.getByText("Waiting to start…")).not.toHaveClass("shimmer");
});

test("a pasted text shows as such, with its text", async () => {
  const text = "Shakshuka: 4 eggs, 1 can of tomatoes.";
  stubApi([[importOf({ input: { type: "text", text } })]]);
  renderApp("/");

  expect(await screen.findByText("Pasted text")).toBeInTheDocument();
  expect(screen.getByText(text)).toBeInTheDocument();
});

// The empty state's words are hidden for now (the user's call, 2026-11-11): an empty queue shows
// the field alone, with no heading and no cards under it.
test("an empty queue shows the field alone", async () => {
  stubApi([[]]);
  renderApp("/");

  expect(await screen.findByLabelText("Pinch a recipe from a reel")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Nothing cooking yet" })).not.toBeInTheDocument();
  expect(screen.queryByText(/^Cooking…/)).not.toBeInTheDocument();
});

test("one still cooking shows a disabled Cooking… where Review will be", async () => {
  stubApi([[importOf({ status: "processing", attempts: 1, step: "fetching" })]]);
  renderApp("/");

  expect(await screen.findByText("Fetching the video…")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "1 in progress" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Cooking…" })).toBeDisabled();
  expect(screen.queryByRole("link", { name: "Review" })).not.toBeInTheDocument();
});

test("a ready one is named by its draft's title, and counted in the heading", async () => {
  stubApi([[importOf({ status: "ready", draft }), importOf({ id: "6650a1b2c3d4e5f600000002" })]]);
  renderApp("/");

  expect(
    await screen.findByRole("heading", { name: "1 ready · 1 in progress" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Review" })).toHaveAccessibleDescription("Tomato pasta");
});

test("the first two cards' pictures load at once, first; the rest when near the screen", async () => {
  const size = { width: 400, height: 225 };
  stubApi([
    ["1", "2", "3"].map((n) =>
      importOf({ id: `6650a1b2c3d4e5f60000000${n}`, status: "ready", draft, thumbnail: size }),
    ),
  ]);
  renderApp("/");

  await screen.findByRole("heading", { name: "3 ready" });
  const pictures = document.querySelectorAll('img[src^="/api/imports/"]');
  // The server's small tile, not the whole picture (design §5).
  expect(pictures[0]).toHaveAttribute(
    "src",
    "/api/imports/6650a1b2c3d4e5f600000001/thumbnail?size=small",
  );
  expect([...pictures].map((img) => img.getAttribute("loading"))).toEqual([
    "eager",
    "eager",
    "lazy",
  ]);
  expect([...pictures].map((img) => img.getAttribute("fetchpriority"))).toEqual([
    "high",
    "high",
    "auto",
  ]);
});

test("the heading counts what's ready, in progress and failed, a stalled one as failed", async () => {
  stubApi([
    [
      importOf({ status: "ready", draft }),
      importOf({ id: "6650a1b2c3d4e5f600000002" }),
      importOf({ id: "6650a1b2c3d4e5f600000003", status: "failed" }),
      importOf({ id: "6650a1b2c3d4e5f600000004", stalled: true }),
    ],
  ]);
  renderApp("/");

  expect(
    await screen.findByRole("heading", { name: "1 ready · 1 in progress · 2 failed" }),
  ).toBeInTheDocument();
});

test("Or write it yourself leads to the empty editor", async () => {
  stubApi([[]]);
  renderApp("/");

  expect(await screen.findByRole("link", { name: "Or write it yourself" })).toHaveAttribute(
    "href",
    "/recipes/new",
  );
});

test("the (i) under Pinch it says where each app keeps a post's link", async () => {
  stubApi([[]]);
  renderApp("/");

  const help = await screen.findByRole("button", { name: "Where to find the link" });
  await userEvent.click(help);

  // A popover, not a tooltip: a tap opens it (design §14). "Copy link" has a no-break space,
  // which Testing Library reads as a space.
  const popover = await screen.findByRole("dialog", { name: "Where to find the link" });
  const [instagram, facebook, youtube] = within(popover).getAllByRole("definition");
  expect(instagram).toHaveTextContent("On a reel: Share (the paper plane) → Copy link");
  expect(facebook).toHaveTextContent("On a video or reel: Share → Copy link");
  expect(youtube).toHaveTextContent("On a Short or video: Share → Copy link");
  expect(
    within(popover).getByText("Or paste the recipe's text, from a post's caption or a website."),
  ).toBeVisible();
});

test("the (i) opens on Enter, and Escape closes it and puts focus back on it", async () => {
  stubApi([[]]);
  renderApp("/");

  (await screen.findByRole("button", { name: "Where to find the link" })).focus();
  await userEvent.keyboard("{Enter}");
  expect(await screen.findByRole("dialog", { name: "Where to find the link" })).toBeVisible();

  await userEvent.keyboard("{Escape}");

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Where to find the link" })).toHaveFocus();
});

test("the paste box's placeholder and an empty box read left to right", async () => {
  stubApi([[]]);
  renderApp("/");

  const box = await screen.findByRole("textbox", { name: "Pinch a recipe from a reel" });
  expect(box).toHaveAttribute("placeholder", "Paste a video or a recipe");
  expect(box).toHaveAttribute("dir", "ltr");
});

test("a ready one counts its things to look at", async () => {
  const uncertain = [
    { path: "title", reason: "Not said." },
    { path: "servings", reason: "Not said." },
  ];
  stubApi([[importOf({ status: "ready", draft: { ...draft, uncertain } })]]);
  renderApp("/");

  expect(await screen.findByText(/Ready to review/)).toHaveTextContent(
    "Ready to review · ◆ 2 things to look at",
  );
});

test("when the queue can't load, Try again asks again", async () => {
  let gets = 0;
  const fetch = vi.fn((path: string) => {
    if (path === "/api/imports") {
      gets += 1;
      if (gets === 1) return Promise.resolve(new Response(null, { status: 502 }));
      return Promise.resolve(Response.json({ items: [importOf({})] }));
    }
    return Promise.resolve(Response.json({ items: [], nextCursor: null }));
  });
  vi.stubGlobal("fetch", fetch);
  renderApp("/");

  await userEvent.click(await screen.findByRole("button", { name: "Try again" }));

  expect(await screen.findByText("Waiting to start…")).toBeInTheDocument();
});

test("a failed link says why", async () => {
  stubApi([[importOf({ status: "failed", attempts: 3, error: "We couldn't read it." })]]);
  renderApp("/");

  expect(await screen.findByText("We couldn't read it.")).toBeInTheDocument();
});

test("a failure no retry can fix offers Dismiss, not Retry", async () => {
  stubApi([
    [
      importOf({
        status: "failed",
        attempts: 1,
        error: "This doesn't look like a recipe.",
        noRetry: true,
      }),
    ],
  ]);
  renderApp("/");

  expect(await screen.findByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
});

test("Retry puts a failed link back in the queue", async () => {
  const fetch = stubApi([
    [importOf({ status: "failed", attempts: 3, error: "No." })],
    [importOf({})],
  ]);
  renderApp("/");

  await userEvent.click(await screen.findByRole("button", { name: "Retry" }));

  expect(await screen.findByText("Waiting to start…")).toBeInTheDocument();
  // The button is gone; focus is on the paste box, not lost to the page.
  expect(await screen.findByRole("textbox", { name: "Pinch a recipe from a reel" })).toHaveFocus();
  expect(fetch).toHaveBeenCalledWith("/api/imports/6650a1b2c3d4e5f600000001/retry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: undefined,
  });
});

test("Dismiss deletes a failed link", async () => {
  const fetch = stubApi([[importOf({ status: "failed", attempts: 3, error: "No." })], []]);
  renderApp("/");

  await userEvent.click(await screen.findByRole("button", { name: "Dismiss" }));

  await waitFor(() => {
    expect(screen.queryByText("No.")).not.toBeInTheDocument();
  });
  expect(await screen.findByRole("textbox", { name: "Pinch a recipe from a reel" })).toHaveFocus();
  expect(fetch).toHaveBeenCalledWith("/api/imports/6650a1b2c3d4e5f600000001", {
    method: "DELETE",
  });
});

test("when Retry fails, it says so and keeps the link", async () => {
  stubApi([[importOf({ status: "failed", attempts: 3, error: "No." })]], () => {
    return new Response(null, { status: 502 });
  });
  renderApp("/");

  await userEvent.click(await screen.findByRole("button", { name: "Retry" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("It couldn't be retried. Try again.");
  expect(screen.getByText("No.")).toBeInTheDocument();
});

test("when Dismiss fails, a toast says so and keeps the link, and Try again sends it again", async () => {
  let deletes = 0;
  stubApi([[importOf({ status: "failed", attempts: 3, error: "No." })]], undefined, () => {
    deletes += 1;
    return new Response(null, { status: deletes === 1 ? 502 : 204 });
  });
  renderApp("/");

  await userEvent.click(await screen.findByRole("button", { name: "Dismiss" }));

  expect(await screen.findByText("Couldn't save")).toBeInTheDocument();
  expect(screen.getByText("No.")).toBeInTheDocument();
  // fireEvent: userEvent's pointer down makes Sonner capture the pointer, which jsdom can't.
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Dismissed")).toBeInTheDocument();
});

test("Undo on Pinch it's toast cancels the import, and the queue drops it", async () => {
  const fetch = stubApi([[], [importOf({})], []]);
  renderApp("/");

  await userEvent.type(
    await screen.findByRole("textbox", { name: "Pinch a recipe from a reel" }),
    reel,
  );
  await userEvent.click(screen.getByRole("button", { name: "Pinch it" }));
  expect(await screen.findByText("Waiting to start…")).toBeInTheDocument();
  fireEvent.click(within(toastOf("Pinching it")).getByRole("button", { name: "Undo" }));

  expect(await screen.findByText("Cancelled")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith("/api/imports/6650a1b2c3d4e5f600000001", {
    method: "DELETE",
  });
  expect(screen.queryByText("Waiting to start…")).not.toBeInTheDocument();
});

test("Undo on Dismiss's toast brings the failed link back", async () => {
  const failed = importOf({ status: "failed", attempts: 3, error: "No." });
  const fetch = stubApi([[failed], [], [failed]], () => Response.json(failed));
  renderApp("/");

  await userEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
  await waitFor(() => {
    expect(screen.queryByText("No.")).not.toBeInTheDocument();
  });
  fireEvent.click(within(toastOf("Dismissed")).getByRole("button", { name: "Undo" }));

  expect(await screen.findByText("No.")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith("/api/imports/6650a1b2c3d4e5f600000001/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: undefined,
  });
});

test("when Undo fails, a toast says so, and Try again undoes it", async () => {
  const failed = importOf({ status: "failed", attempts: 3, error: "No." });
  let restores = 0;
  stubApi([[failed], [], [failed]], () => {
    restores += 1;
    return restores === 1 ? new Response(null, { status: 502 }) : Response.json(failed);
  });
  renderApp("/");

  await userEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
  fireEvent.click(within(await findToast("Dismissed")).getByRole("button", { name: "Undo" }));

  fireEvent.click(
    within(await findToast("Couldn't undo")).getByRole("button", { name: "Try again" }),
  );
  expect(await screen.findByText("No.")).toBeInTheDocument();
});

test("Undo of something already gone says so, without Try again", async () => {
  const failed = importOf({ status: "failed", attempts: 3, error: "No." });
  stubApi([[failed], []], () => new Response(null, { status: 404 }));
  renderApp("/");

  await userEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
  fireEvent.click(within(await findToast("Dismissed")).getByRole("button", { name: "Undo" }));

  const toast = await findToast("Can't undo");
  expect(toast).toHaveTextContent("It's already gone");
  expect(within(toast).queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
});

test("Undo of Pinch it, when the import is already gone, is as good as cancelled", async () => {
  stubApi([[], [importOf({})], []], undefined, () => new Response(null, { status: 404 }));
  renderApp("/");

  await userEvent.type(
    await screen.findByRole("textbox", { name: "Pinch a recipe from a reel" }),
    reel,
  );
  await userEvent.click(screen.getByRole("button", { name: "Pinch it" }));
  fireEvent.click(within(await findToast("Pinching it")).getByRole("button", { name: "Undo" }));

  expect(await screen.findByText("Cancelled")).toBeInTheDocument();
  expect(screen.queryByText("Can't undo")).not.toBeInTheDocument();
});

async function findToast(text: string) {
  await screen.findByText(toastTitled(text));
  return toastOf(text);
}

// The toast with this title (Sonner's list item), to find its buttons.
function toastOf(text: string) {
  const toast = screen.getByText(toastTitled(text)).closest("li");
  if (toast === null) throw new Error(`"${text}" isn't in a toast`);
  return toast;
}

test("an import that becomes ready or fails says so once in a toast, with its next step", async () => {
  // The 2 s polls, without waiting for them; real time still runs, for Testing Library's waits.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const other = "6650a1b2c3d4e5f600000002";
  const failed = importOf({ status: "failed", error: "It may be private." });
  stubApi([
    [importOf({ status: "processing" }), importOf({ id: other, status: "processing" })],
    [failed, importOf({ id: other })],
    [
      failed,
      importOf({
        id: other,
        status: "ready",
        draft: { ...draft, uncertain: [{ path: "title", reason: "Not said." }] },
      }),
    ],
  ]);
  renderApp("/");

  expect(await screen.findAllByText("Working on it…")).toHaveLength(2);
  await vi.advanceTimersByTimeAsync(2000);
  await vi.advanceTimersByTimeAsync(2000);

  // The third list: the failure was seen twice, and said once.
  expect(
    await screen.findByText(toastTitled("Tomato pasta is ready to review")),
  ).toBeInTheDocument();
  expect(
    within(toastOf("Tomato pasta is ready to review")).getByRole("button", { name: "Review" }),
  ).toBeVisible();
  // The title in its own direction (design §16.5).
  expect(within(toastOf("Tomato pasta is ready to review")).getByText("Tomato pasta").tagName).toBe(
    "BDI",
  );
  // With what the draft asks the user to check.
  expect(
    within(toastOf("Tomato pasta is ready to review")).getByText("1 thing to look at"),
  ).toBeInTheDocument();
  expect(screen.getAllByText("Couldn't read that video")).toHaveLength(1);
  const failure = toastOf("Couldn't read that video");
  expect(within(failure).getByText("It may be private.")).toBeInTheDocument();
  expect(within(failure).getByRole("button", { name: "Retry" })).toBeInTheDocument();
});

test("a failure's toast closes once the import is retried elsewhere", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  // Another one still cooking, so the list is asked again after the failure.
  const cooking = importOf({ id: "6650a1b2c3d4e5f600000002", status: "processing" });
  stubApi([
    [importOf({ status: "processing" }), cooking],
    [importOf({ status: "failed", error: "It may be private." }), cooking],
    [importOf({ status: "pending", attempts: 3 }), cooking],
  ]);
  renderApp("/");

  expect(await screen.findAllByText("Working on it…")).toHaveLength(2);
  await vi.advanceTimersByTimeAsync(2000);
  expect(await screen.findByText("Couldn't read that video")).toBeInTheDocument();
  await vi.advanceTimersByTimeAsync(2000);

  await waitFor(() => {
    expect(screen.queryByText("Couldn't read that video")).not.toBeInTheDocument();
  });
});

test("what the first list shows isn't a toast", async () => {
  stubApi([[importOf({ status: "ready", draft })]]);
  renderApp("/");

  expect(await screen.findByText("Ready to review")).toBeInTheDocument();
  expect(
    screen.queryByText(toastTitled("Tomato pasta is ready to review")),
  ).not.toBeInTheDocument();
});

test("a stalled link says nothing is working on it, and offers Dismiss, not Retry", async () => {
  stubApi([[importOf({ status: "processing", attempts: 1, stalled: true })]]);
  renderApp("/");

  expect(await screen.findByText(/Stuck: nothing has worked on this/)).toBeInTheDocument();
  expect(screen.queryByText("Working on it…")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
});

test("past the daily cap, the box says so and keeps the link", async () => {
  stubApi([[]], () =>
    Response.json({ error: { code: "daily_limit", message: dailyLimitMessage } }, { status: 429 }),
  );
  renderApp("/");

  const box = await screen.findByRole("textbox", { name: "Pinch a recipe from a reel" });
  await userEvent.type(box, reel);
  // The live regions are on the page before the answer, so screen readers hear the note.
  const regions = screen.getAllByRole("status");
  await userEvent.click(screen.getByRole("button", { name: "Pinch it" }));

  // A quiet note, not an error (design §14), in a region that was already there.
  expect(regions).toContain(await screen.findByText(dailyLimitMessage));
  expect(box).toHaveValue(reel);
  expect(box).toHaveAttribute("aria-invalid", "false");
});

// A link the user pinched before (design §4.6): the API's 409, with what they have.
function pinchedBefore(existing: DuplicateLink["existing"]) {
  return () =>
    Response.json(
      {
        error: { code: "link_pinched_before", message: "You've pinched this link before." },
        existing,
      },
      { status: 409 },
    );
}

async function pinchReel() {
  const box = await screen.findByRole("textbox", { name: "Pinch a recipe from a reel" });
  await userEvent.type(box, reel);
  await userEvent.click(screen.getByRole("button", { name: "Pinch it" }));
  return box;
}

test("a link already in My recipes empties the box and points to the recipe, not an error", async () => {
  const recipeId = "6650a1b2c3d4e5f600000009";
  const fetch = stubApi([[]], pinchedBefore({ kind: "recipe", id: recipeId, title: "Shakshuka" }));
  renderApp("/");

  const box = await pinchReel();

  const toast = await findToast("Already in My recipes");
  expect(within(toast).getByText("Shakshuka")).toBeInTheDocument();
  expect(box).toHaveValue("");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  fireEvent.click(within(toast).getByRole("button", { name: "View" }));
  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith(`/api/recipes/${recipeId}`);
  });
});

test("a link whose draft is ready says so as the queue does, with Review", async () => {
  const fetch = stubApi(
    [[]],
    pinchedBefore({
      kind: "import",
      id: importOf({}).id,
      status: "ready",
      title: "Shakshuka",
      lookAt: 2,
    }),
  );
  renderApp("/");

  await pinchReel();

  const toast = await findToast("Shakshuka is ready to review");
  expect(within(toast).getByText("2 things to look at")).toBeInTheDocument();
  fireEvent.click(within(toast).getByRole("button", { name: "Review" }));
  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith(`/api/imports/${importOf({}).id}`);
  });
});

test("past the global cap, the box says Pinch has read all it can today", async () => {
  stubApi([[]], () =>
    Response.json(
      { error: { code: "global_limit", message: globalLimitMessage } },
      { status: 429 },
    ),
  );
  renderApp("/");

  await screen.findByRole("textbox", { name: "Pinch a recipe from a reel" });
  const regions = screen.getAllByRole("status");
  await pinchReel();

  // A quiet note, not an error (design §14), in a region that was already there.
  expect(regions).toContain(await screen.findByText(globalLimitMessage));
});

test("a link still in the queue says it's already being pinched", async () => {
  stubApi([[]], pinchedBefore({ kind: "import", id: importOf({}).id, status: "processing" }));
  renderApp("/");

  const box = await pinchReel();

  expect(await screen.findByText("Already pinching it")).toBeInTheDocument();
  expect(box).toHaveValue("");
  expect(screen.queryByText("Pinching it")).not.toBeInTheDocument();
});

test("past the daily cap, Retry says so", async () => {
  stubApi([[importOf({ status: "failed", attempts: 3, error: "No." })]], () =>
    Response.json({ error: { code: "daily_limit", message: dailyLimitMessage } }, { status: 429 }),
  );
  renderApp("/");

  const retry = await screen.findByRole("button", { name: "Retry" });
  const regions = screen.getAllByRole("status");
  await userEvent.click(retry);

  // A quiet note, not an error (design §14), in a region that was already there.
  expect(regions).toContain(await screen.findByText(dailyLimitMessage));
});

test("past the global cap, Retry says so", async () => {
  stubApi([[importOf({ status: "failed", attempts: 3, error: "No." })]], () =>
    Response.json(
      { error: { code: "global_limit", message: globalLimitMessage } },
      { status: 429 },
    ),
  );
  renderApp("/");

  const retry = await screen.findByRole("button", { name: "Retry" });
  const regions = screen.getAllByRole("status");
  await userEvent.click(retry);

  // A quiet note, not an error (design §14), in a region that was already there.
  expect(regions).toContain(await screen.findByText(globalLimitMessage));
});

test("polling runs only while the worker has a link in hand", () => {
  const list = (...statuses: Import["status"][]) => ({
    items: statuses.map((status) => importOf({ status })),
  });
  expect(pollInterval(list("ready", "pending"))).toBe(2000);
  expect(pollInterval(list("processing"))).toBe(2000);
  expect(pollInterval(list("ready", "failed"))).toBe(false);
  expect(pollInterval(undefined)).toBe(false);
});

const screenshot = (name: string) => new File(["png"], name, { type: "image/png" });

// Screenshots are hidden from / for now (ImportPage), so their picker is tested on its own, above
// the queue as it was on the page.
function renderScreenshots() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ScreenshotsUpload />
        <ImportList focusPasteBox={() => undefined} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test("chosen screenshots are sent at once, as a form, and show in the list", async () => {
  const shots = importOf({ input: { type: "images", count: 2 } });
  const fetch = stubApi([[], [shots]], () => Response.json(shots, { status: 202 }));
  renderScreenshots();

  await userEvent.upload(screen.getByLabelText("Or add screenshots"), [
    screenshot("one.png"),
    screenshot("two.png"),
  ]);

  const body = fetch.mock.calls.find(([path]) => path === "/api/imports/screenshots")?.[1]?.body;
  if (!(body instanceof FormData)) throw new Error("No form was sent.");
  expect(body.getAll("images")).toHaveLength(2);
  expect(await screen.findByText("Screenshots")).toBeInTheDocument();
  expect(screen.getByText("2 images")).toBeInTheDocument();
});

test("more than 4 screenshots, or one too big, are refused before anything is sent", async () => {
  const fetch = stubApi([[]]);
  renderScreenshots();
  const picker = screen.getByLabelText("Or add screenshots");

  await userEvent.upload(
    picker,
    ["1", "2", "3", "4", "5"].map((n) => screenshot(`${n}.png`)),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(messages.screenshots);

  const big = screenshot("big.png");
  Object.defineProperty(big, "size", { value: 11_000_000 });
  await userEvent.upload(picker, [big]);
  expect(screen.getByRole("alert")).toHaveTextContent(messages.screenshots);
  expect(fetch).not.toHaveBeenCalledWith("/api/imports/screenshots", expect.anything());
});

test("the API's reason for refusing the screenshots is shown, and tied to the picker", async () => {
  stubApi([[]], () =>
    Response.json({ error: { fields: { images: "Not an image." } } }, { status: 400 }),
  );
  renderScreenshots();

  const picker = screen.getByLabelText("Or add screenshots");
  await userEvent.upload(picker, [screenshot("one.png")]);

  expect(await screen.findByRole("alert")).toHaveTextContent("Not an image.");
  expect(picker).toHaveAccessibleDescription(/Not an image\./);
});

test("a pick while screenshots are sending sends nothing more", async () => {
  // A send that waits until the test answers it.
  let answer: (response: Response) => void = () => undefined;
  const fetch = vi.fn((path: string, init?: RequestInit) => {
    if (init?.method === "POST") return new Promise<Response>((resolve) => (answer = resolve));
    if (path === "/api/imports") return Promise.resolve(Response.json({ items: [] }));
    return Promise.resolve(Response.json({ items: [], nextCursor: null }));
  });
  vi.stubGlobal("fetch", fetch);
  renderScreenshots();

  await userEvent.upload(screen.getByLabelText("Or add screenshots"), [screenshot("one.png")]);
  await userEvent.upload(await screen.findByLabelText("Sending…"), [screenshot("two.png")]);
  answer(Response.json(importOf({}), { status: 202 }));

  expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
});

test("screenshots past the day's cap say so", async () => {
  stubApi([[]], () => Response.json({ error: { code: "daily_limit" } }, { status: 429 }));
  renderScreenshots();

  const regions = screen.getAllByRole("status");
  await userEvent.upload(screen.getByLabelText("Or add screenshots"), [screenshot("one.png")]);

  // A quiet note, not an error (design §14), in a region that was already there.
  expect(regions).toContain(await screen.findByText(dailyLimitMessage));
});

test("screenshots past the global cap say so", async () => {
  stubApi([[]], () => Response.json({ error: { code: "global_limit" } }, { status: 429 }));
  renderScreenshots();

  const regions = screen.getAllByRole("status");
  await userEvent.upload(screen.getByLabelText("Or add screenshots"), [screenshot("one.png")]);

  // A quiet note, not an error (design §14), in a region that was already there.
  expect(regions).toContain(await screen.findByText(globalLimitMessage));
});

// In Hebrew (design §16.11): Add recipe and the queue say it in Hebrew; the toasts stay English
// (D46), and what a user pasted keeps its own direction (§16.5).
test("in Hebrew, Add recipe's box, its button and the way to write a recipe are in Hebrew", async () => {
  stubApi([[]]);
  await renderInHebrew("/");

  const box = await screen.findByRole("textbox", { name: "לשמור מתכון מסרטון" });
  expect(box).toHaveAttribute("placeholder", "להדביק סרטון או מתכון");
  expect(box).toHaveAccessibleDescription(
    "אפשר להדביק סרטון קצר מ\u2011YouTube, ריל מ\u2011Facebook או מ\u2011Instagram, או מתכון כטקסט",
  );
  // "Pinch it" is "Pinch" alone in Hebrew: the brand as the action (D46).
  expect(screen.getByRole("button", { name: "Pinch" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1, name: "להוסיף מתכון" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "או לכתוב מתכון ידנית" })).toHaveAttribute(
    "href",
    "/recipes/new",
  );
  await waitFor(() => {
    expect(document.title).toBe("להוסיף מתכון · Pinch");
  });
});

test("in Hebrew, the paste row is laid out left to right, and its words read right to left", async () => {
  stubApi([[]]);
  await renderInHebrew("/");

  const box = await screen.findByRole("textbox", { name: "לשמור מתכון מסרטון" });
  // The user's call (design §16.4): the sparkles on the left and Pinch on the right, as in
  // English; the link on the left and the (i) on the right under it.
  expect(box.parentElement).toHaveAttribute("dir", "ltr");
  expect(screen.getByRole("link", { name: "או לכתוב מתכון ידנית" }).parentElement).toHaveAttribute(
    "dir",
    "ltr",
  );
  // Empty, the page's direction: the Hebrew placeholder and the caret on the right, by Pinch.
  expect(box).toHaveAttribute("dir", "rtl");
  // Typed in, its own (§16.5): a link left to right, Hebrew right to left.
  await userEvent.type(box, "שקשוקה");
  expect(box).toHaveAttribute("dir", "auto");
});

test("in Hebrew, the (i) is named in Hebrew, says it in Hebrew, and Escape puts focus back", async () => {
  stubApi([[]]);
  await renderInHebrew("/");

  const help = await screen.findByRole("button", { name: "איפה מוצאים את הקישור" });
  await userEvent.click(help);

  const popover = await screen.findByRole("dialog", { name: "איפה מוצאים את הקישור" });
  // Its words read right to left, though the row it opens from is left to right.
  expect(within(popover).getByText("איפה מוצאים את הקישור").parentElement).toHaveAttribute(
    "dir",
    "rtl",
  );
  expect(within(popover).getByText("Instagram")).toBeVisible();
  // The share menus' words stay in English (D46, the user's call), reading left to right.
  const [instagram, facebook, youtube] = within(popover).getAllByRole("definition");
  expect(instagram).toHaveTextContent("בריל: Share (the paper plane) → Copy link");
  expect(facebook).toHaveTextContent("בסרטון או בריל: Share → Copy link");
  expect(youtube).toHaveTextContent("בסרטון או ב\u2011Short: Share → Copy link");
  const steps = within(popover).getByText("Share (the paper plane) → Copy link");
  expect(steps).toHaveAttribute("dir", "ltr");
  expect(steps).toHaveAttribute("lang", "en");
  expect(
    within(popover).getByText("או להדביק את הטקסט של המתכון, מהכיתוב של פוסט או מאתר."),
  ).toBeVisible();

  await userEvent.keyboard("{Escape}");

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "איפה מוצאים את הקישור" })).toHaveFocus();
});

test("in Hebrew, the link to write a recipe reads right to left inside its ltr row", async () => {
  stubApi([[]]);
  await renderInHebrew("/");

  // Its pen at its words' right, as on the header's Write a recipe (design §16.4).
  expect(await screen.findByRole("link", { name: "או לכתוב מתכון ידנית" })).toHaveAttribute(
    "dir",
    "rtl",
  );
});

test("in Hebrew, a refused paste's message is outside the ltr row, in the page's direction", async () => {
  stubApi([[]]);
  await renderInHebrew("/");

  const box = await screen.findByRole("textbox", { name: "לשמור מתכון מסרטון" });
  await userEvent.type(box, "https://www.tiktok.com/@chef/video/1");
  await userEvent.click(screen.getByRole("button", { name: "Pinch" }));

  expect((await screen.findByRole("alert")).closest('[dir="ltr"]')).toBeNull();
});

test("in Hebrew, a link from another site is refused in Hebrew", async () => {
  stubApi([[]]);
  await renderInHebrew("/");

  const box = await screen.findByRole("textbox", { name: "לשמור מתכון מסרטון" });
  await userEvent.type(box, "https://www.tiktok.com/@chef/video/1");
  await userEvent.click(screen.getByRole("button", { name: "Pinch" }));

  // shared's message, by its name (design §16.7).
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "צריך להדביק קישור לפוסט מ\u2011Instagram, מ\u2011Facebook או מ\u2011YouTube.",
  );
});

test("in Hebrew, the queue's heading says one, two and many in their own forms", async () => {
  const ready = (n: number) =>
    importOf({ id: `6650a1b2c3d4e5f60000001${String(n)}`, status: "ready", draft });
  stubApi([
    [
      ready(1),
      ready(2),
      ready(3),
      importOf({ id: "6650a1b2c3d4e5f600000002" }),
      importOf({ id: "6650a1b2c3d4e5f600000003", status: "failed" }),
      importOf({ id: "6650a1b2c3d4e5f600000004", stalled: true }),
    ],
  ]);
  await renderInHebrew("/");

  expect(
    await screen.findByRole("heading", { name: "3 מוכנים · 1 בתהליך · 2 נכשלו" }),
  ).toBeInTheDocument();
});

test("in Hebrew, one ready, two in progress and one failed", async () => {
  stubApi([
    [
      importOf({ status: "ready", draft }),
      importOf({ id: "6650a1b2c3d4e5f600000002" }),
      importOf({ id: "6650a1b2c3d4e5f600000003", status: "processing", step: "analyzing" }),
      importOf({ id: "6650a1b2c3d4e5f600000004", status: "failed" }),
    ],
  ]);
  await renderInHebrew("/");

  expect(
    await screen.findByRole("heading", { name: "1 מוכן · 2 בתהליך · 1 נכשל" }),
  ).toBeInTheDocument();
  expect(screen.getByText("קריאת המתכון…")).toBeInTheDocument();
  expect(screen.getByText("בהמתנה…")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "לבדוק" })).toHaveAccessibleDescription("Tomato pasta");
  expect(screen.getAllByRole("button", { name: "בהכנה…" })[0]).toBeDisabled();
  // A link's card: named by its site, which stays in English; the link reads left to right.
  expect(screen.getAllByText("קישור מ\u2011Instagram")[0]).toHaveAttribute("dir", "auto");
  expect(screen.getAllByText(reel)[0]).toHaveAttribute("dir", "ltr");
});

test("in Hebrew, a ready one counts its things to look at", async () => {
  const uncertain = [
    { path: "title", reason: "Not said." },
    { path: "servings", reason: "Not said." },
  ];
  stubApi([[importOf({ status: "ready", draft: { ...draft, uncertain } })]]);
  await renderInHebrew("/");

  expect(await screen.findByText(/מוכן לבדיקה/)).toHaveTextContent("מוכן לבדיקה · ◆ 2 דברים לבדוק");
});

test("in Hebrew, a failure is said by its reason's key, and one it doesn't know as it came", async () => {
  stubApi([
    [
      importOf({ status: "failed", noRetry: true, error: messages.notARecipe }),
      importOf({
        id: "6650a1b2c3d4e5f600000002",
        status: "failed",
        input: { type: "text", text: "2 eggs, 1 onion, chopped, fried in butter" },
        error: "It may be private.",
      }),
    ],
  ]);
  await renderInHebrew("/");

  expect(await screen.findByText("זה לא נראה כמו מתכון.")).toBeInTheDocument();
  // In English, marked so: read in English, its period at its end.
  expect(screen.getByText("It may be private.")).toHaveAttribute("lang", "en");
  expect(screen.getByText("It may be private.")).toHaveAttribute("dir", "ltr");
  expect(screen.getByText("טקסט מודבק")).toBeInTheDocument();
  // No retry can fix the first (D23): only the second offers one.
  expect(await screen.findAllByRole("button", { name: "להסיר" })).toHaveLength(2);
  expect(screen.getAllByRole("button", { name: "לנסות שוב" })).toHaveLength(1);
});

test("in Hebrew, past the daily cap, Retry's note is in Hebrew", async () => {
  stubApi([[importOf({ status: "failed", attempts: 3, error: "No." })]], () =>
    Response.json({ error: { code: "daily_limit", message: dailyLimitMessage } }, { status: 429 }),
  );
  await renderInHebrew("/");

  await userEvent.click(await screen.findByRole("button", { name: "לנסות שוב" }));

  expect(
    await screen.findByText("המכסה היומית של 20 מתכונים כבר נוצלה. אפשר לנסות שוב מחר."),
  ).toBeInTheDocument();
});

test("in Hebrew, the queue's toasts stay English", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  stubApi([
    [importOf({ status: "processing" })],
    [importOf({ status: "failed", noRetry: true, error: "This doesn't look like a recipe." })],
  ]);
  await renderInHebrew("/");

  expect(await screen.findByText("בעיבוד…")).toBeInTheDocument();
  await vi.advanceTimersByTimeAsync(2000);

  // The card in Hebrew, its toast in English, with the reason as the worker kept it (D46).
  expect(await screen.findByText("זה לא נראה כמו מתכון.")).toBeInTheDocument();
  const failure = await findToast("Couldn't read that video");
  expect(within(failure).getByText("This doesn't look like a recipe.")).toBeInTheDocument();
});

test("in Hebrew, the screenshots' picker, its hint and its card are in Hebrew", async () => {
  const shots = importOf({ input: { type: "images", count: 2 } });
  stubApi([[], [shots]], () => Response.json(shots, { status: 202 }));
  await inHebrew();
  renderScreenshots();

  expect(screen.getByText("עד 4 צילומי מסך של המתכון, כשהקישור והטקסט לא מספיקים.")).toBeVisible();
  await userEvent.upload(screen.getByLabelText("או להוסיף צילומי מסך"), [
    screenshot("one.png"),
    screenshot("two.png"),
  ]);

  expect(await screen.findByText("צילומי מסך")).toBeInTheDocument();
  expect(screen.getByText("2 תמונות")).toBeInTheDocument();
});
