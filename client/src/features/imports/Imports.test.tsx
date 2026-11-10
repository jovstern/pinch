import {
  dailyLimitMessage,
  linkMessage,
  screenshotsMessage,
  textMessage,
  type Import,
} from "@pinch/shared";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp } from "../../test-utils.tsx";
import { pollInterval } from "./importQueries.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  // Paste's clipboard, if a test gave it one.
  Reflect.deleteProperty(navigator, "clipboard");
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

  const box = screen.getByRole("textbox", { name: "Pinch a recipe from a reel" });
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

  const box = screen.getByRole("textbox", { name: "Pinch a recipe from a reel" });
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
    screen.getByRole("textbox", { name: "Pinch a recipe from a reel" }),
    `${reel}{Enter}`,
  );

  expect(fetch).toHaveBeenCalledWith("/api/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "link", url: reel }),
  });
});

test("Shift+Enter makes a new line, and the text is sent with it", async () => {
  const fetch = stubApi([[]]);
  renderApp("/");

  const box = screen.getByRole("textbox", { name: "Pinch a recipe from a reel" });
  await userEvent.type(box, "Shakshuka{Shift>}{Enter}{/Shift}4 eggs, 1 can of tomatoes.");
  expect(box).toHaveValue("Shakshuka\n4 eggs, 1 can of tomatoes.");
  expect(fetch).not.toHaveBeenCalledWith("/api/imports", expect.anything());

  await userEvent.type(box, "{Enter}");
  expect(fetch).toHaveBeenCalledWith("/api/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "text", text: "Shakshuka\n4 eggs, 1 can of tomatoes." }),
  });
});

// A clipboard that holds this text, for Paste (jsdom has none).
function stubClipboard(text: string) {
  Object.defineProperty(navigator, "clipboard", {
    value: { readText: () => Promise.resolve(text) },
    configurable: true,
  });
}

test("Paste fills the box from the clipboard, and doesn't send it", async () => {
  const fetch = stubApi([[]]);
  stubClipboard(reel);
  renderApp("/");

  await userEvent.click(screen.getByRole("button", { name: "Paste" }));

  const box = screen.getByRole("textbox", { name: "Pinch a recipe from a reel" });
  expect(box).toHaveValue(reel);
  expect(box).toHaveFocus();
  expect(fetch).not.toHaveBeenCalledWith("/api/imports", expect.anything());
});

test("Paste with an empty clipboard keeps what's in the box", async () => {
  stubApi([[]]);
  stubClipboard("");
  renderApp("/");

  const box = screen.getByRole("textbox", { name: "Pinch a recipe from a reel" });
  await userEvent.type(box, reel);
  await userEvent.click(screen.getByRole("button", { name: "Paste" }));

  expect(box).toHaveValue(reel);
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
    screen.getByRole("textbox", { name: "Pinch a recipe from a reel" }),
    "Shakshuka: 4 eggs, 1 can of tomatoes.",
  );
  await userEvent.click(screen.getByRole("button", { name: "Pinch it" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Not this one.");
});

test("a text too short to be a recipe is refused before it's sent", async () => {
  const fetch = stubApi([[]]);
  renderApp("/");

  await userEvent.type(
    screen.getByRole("textbox", { name: "Pinch a recipe from a reel" }),
    "2 eggs",
  );
  await userEvent.click(screen.getByRole("button", { name: "Pinch it" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(textMessage);
  expect(fetch).not.toHaveBeenCalledWith("/api/imports", expect.anything());
});

test("an empty box asks for either, and focus goes back to it", async () => {
  stubApi([[]]);
  renderApp("/");

  await userEvent.click(screen.getByRole("button", { name: "Pinch it" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Paste a link or the recipe's text.");
  expect(screen.getByRole("textbox", { name: "Pinch a recipe from a reel" })).toHaveFocus();
});

test("a link from another site is refused before it's sent, until it's fixed", async () => {
  const fetch = stubApi([[]]);
  renderApp("/");

  const box = screen.getByRole("textbox", { name: "Pinch a recipe from a reel" });
  await userEvent.type(box, "https://www.tiktok.com/@chef/video/1");
  await userEvent.click(screen.getByRole("button", { name: "Pinch it" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(linkMessage);
  // The hint, then the error.
  expect(box).toHaveAccessibleDescription(
    `Paste a YouTube short, a Facebook or Instagram reel, or a recipe as text ${linkMessage}`,
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

  const box = screen.getByRole("textbox", { name: "Pinch a recipe from a reel" });
  await userEvent.type(box, reel);
  await userEvent.click(screen.getByRole("button", { name: "Pinch it" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Not this one.");
  expect(box).toHaveValue(reel);
});

test("when the link can't be sent, it says so and keeps the link", async () => {
  stubApi([[]], () => new Response(null, { status: 502 }));
  renderApp("/");

  const box = screen.getByRole("textbox", { name: "Pinch a recipe from a reel" });
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

test("a pasted text shows as such, with its text", async () => {
  const text = "Shakshuka: 4 eggs, 1 can of tomatoes.";
  stubApi([[importOf({ input: { type: "text", text } })]]);
  renderApp("/");

  expect(await screen.findByText("Pasted text")).toBeInTheDocument();
  expect(screen.getByText(text)).toBeInTheDocument();
});

test("an empty queue says what Pinch does", async () => {
  stubApi([[]]);
  renderApp("/");

  expect(await screen.findByRole("heading", { name: "Nothing cooking yet" })).toBeInTheDocument();
  expect(screen.queryByText(/^Cooking…/)).not.toBeInTheDocument();
});

test("one still cooking shows a disabled Cooking… where Review will be", async () => {
  stubApi([[importOf({ status: "processing", attempts: 1, step: "fetching" })]]);
  renderApp("/");

  expect(await screen.findByText("Fetching the video…")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Cooking…" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Cooking…" })).toBeDisabled();
  expect(screen.queryByRole("link", { name: "Review" })).not.toBeInTheDocument();
});

test("a ready one is named by its draft's title, and counted in the heading", async () => {
  stubApi([[importOf({ status: "ready", draft }), importOf({ id: "6650a1b2c3d4e5f600000002" })]]);
  renderApp("/");

  expect(await screen.findByRole("heading", { name: "Cooking… · 1 ready" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Review" })).toHaveAccessibleDescription("Tomato pasta");
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
  expect(screen.getByRole("textbox", { name: "Pinch a recipe from a reel" })).toHaveFocus();
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
  expect(screen.getByRole("textbox", { name: "Pinch a recipe from a reel" })).toHaveFocus();
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

  await userEvent.type(screen.getByRole("textbox", { name: "Pinch a recipe from a reel" }), reel);
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

async function findToast(text: string) {
  await screen.findByText(text);
  return toastOf(text);
}

// The toast a text is in (Sonner's list item), to find its buttons.
function toastOf(text: string) {
  const toast = screen.getByText(text).closest("li");
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
  expect(await screen.findByText("Tomato pasta is ready to review")).toBeInTheDocument();
  expect(
    within(toastOf("Tomato pasta is ready to review")).getByRole("button", { name: "Review" }),
  ).toBeVisible();
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
  expect(screen.queryByText("Tomato pasta is ready to review")).not.toBeInTheDocument();
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

  const box = screen.getByRole("textbox", { name: "Pinch a recipe from a reel" });
  await userEvent.type(box, reel);
  await userEvent.click(screen.getByRole("button", { name: "Pinch it" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(dailyLimitMessage);
  expect(box).toHaveValue(reel);
});

test("past the daily cap, Retry says so", async () => {
  stubApi([[importOf({ status: "failed", attempts: 3, error: "No." })]], () =>
    Response.json({ error: { code: "daily_limit", message: dailyLimitMessage } }, { status: 429 }),
  );
  renderApp("/");

  await userEvent.click(await screen.findByRole("button", { name: "Retry" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(dailyLimitMessage);
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

test("chosen screenshots are sent at once, as a form, and show in the list", async () => {
  const shots = importOf({ input: { type: "images", count: 2 } });
  const fetch = stubApi([[], [shots]], () => Response.json(shots, { status: 202 }));
  renderApp("/");

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
  renderApp("/");
  const picker = screen.getByLabelText("Or add screenshots");

  await userEvent.upload(
    picker,
    ["1", "2", "3", "4", "5"].map((n) => screenshot(`${n}.png`)),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(screenshotsMessage);

  const big = screenshot("big.png");
  Object.defineProperty(big, "size", { value: 11_000_000 });
  await userEvent.upload(picker, [big]);
  expect(screen.getByRole("alert")).toHaveTextContent(screenshotsMessage);
  expect(fetch).not.toHaveBeenCalledWith("/api/imports/screenshots", expect.anything());
});

test("the API's reason for refusing the screenshots is shown, and tied to the picker", async () => {
  stubApi([[]], () =>
    Response.json({ error: { fields: { images: "Not an image." } } }, { status: 400 }),
  );
  renderApp("/");

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
  renderApp("/");

  await userEvent.upload(screen.getByLabelText("Or add screenshots"), [screenshot("one.png")]);
  await userEvent.upload(await screen.findByLabelText("Sending…"), [screenshot("two.png")]);
  answer(Response.json(importOf({}), { status: 202 }));

  expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
});

test("screenshots past the day's cap say so", async () => {
  stubApi([[]], () => Response.json({ error: { code: "daily_limit" } }, { status: 429 }));
  renderApp("/");

  await userEvent.upload(screen.getByLabelText("Or add screenshots"), [screenshot("one.png")]);

  expect(await screen.findByRole("alert")).toHaveTextContent(dailyLimitMessage);
});
