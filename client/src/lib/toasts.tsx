import { LoaderCircle } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import type { ExternalToast } from "sonner";
import { ApiError } from "./api.ts";

// Every toast in the app, by name, with how long it stays (design §14; the table in the
// wireframe home.html). In English in both languages (the user's call, design §16.8, D46), so
// written here, not in the locales; the Toaster lays them out left to right. A recipe's title is
// in a <bdi>, in its own direction (design §16.5).
const seconds = (n: number) => n * 1000;
const short = seconds(3);
const normal = seconds(5);
const long = seconds(8);
// An error stays until it's closed, so it can't be missed.
const untilClosed = Infinity;

// Whether a toast has been sent yet. The Layout mounts the Toaster only then: fetched as the app
// started, it and Sonner were on every page's path to its first paint, ~0.2 s of LCP
// (docs/metrics/m08.md). A toast sent before the Toaster is there shows once it is: Sonner gives
// a new Toaster the toasts still open.
let toastSent = false;
const listeners = new Set<() => void>();

// The store React reads it from (useSyncExternalStore: it lives outside React).
export function useToastSent() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => toastSent,
  );
}

// Sonner is its own chunk, as the Toaster is (Layout): it keeps ~9 kB out of the first load. If
// it can't be fetched, nothing is shown: a toast is a nicety, and the page shows the change too.
function showToast(
  kind: "message" | "success" | "error",
  title: ReactNode,
  options: ExternalToast,
) {
  if (!toastSent) {
    toastSent = true;
    listeners.forEach((listener) => {
      listener();
    });
  }
  import("sonner").then(
    ({ toast }) => toast[kind](title, options),
    () => undefined,
  );
}

export function dismissToast(id: string) {
  // None sent, none to close: Sonner isn't fetched for nothing (the review page closes its
  // draft's toast as it opens).
  if (!toastSent) return;
  import("sonner").then(
    ({ toast }) => toast.dismiss(id),
    () => undefined,
  );
}

// Every toast closed: a session that ended mid-visit (SessionGate) leaves nothing of the user's.
export function dismissAllToasts() {
  if (!toastSent) return;
  import("sonner").then(
    ({ toast }) => toast.dismiss(),
    () => undefined,
  );
}

// Undo, on the toasts of a send or a delete (design D27). What it does is the caller's: a request,
// then the queries to refresh. Sonner closes the toast as it's pressed; a failure says so, with
// Try again. A 404 isn't the connection: what it would bring back is gone (deleted for good, or in
// another tab), and Try again would only fail again.
function undoAction(undo: () => Promise<void>) {
  const run = () => {
    undo().catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) {
        showToast("error", "Can't undo", {
          description: "It's already gone",
          duration: normal,
        });
      } else {
        toastCouldntSave(run, "Couldn't undo");
      }
    });
  };
  return { label: "Undo", onClick: run };
}

// Green, for a step that finished while the user was elsewhere: a draft ready, a recipe saved or
// back (design §14). Merged with the Toaster's own classes; important (!) over Sonner's. The
// other toasts stay neutral: an undo's, a cancel's, an error's.
const finished = {
  classNames: { toast: "border-success! bg-success-soft! text-success!", icon: "*:text-success!" },
};

// Sent: the queue takes it from here. Undo cancels it.
export function toastPinching(undo: () => Promise<void>) {
  showToast("message", "Pinching it", {
    description: "Usually under a minute",
    icon: <LoaderCircle className="size-4 motion-safe:animate-spin" />,
    duration: normal,
    action: undoAction(undo),
  });
}

// Pinch it undone: the queue drops it too.
export function toastCancelled() {
  showToast("success", "Cancelled", { duration: short });
}

// The import's id is the toast's: a ready one takes the place of its failure, and the failure
// can be closed once it's retried or gone (importToasts.ts).
// lookAt: what the draft asks the user to check ("3 things to look at"), when it asks anything.
export function toastReady(id: string, title: string, review: () => void, lookAt?: string) {
  showToast(
    "success",
    <>
      <bdi>{title}</bdi> is ready to review
    </>,
    {
      ...finished,
      id,
      description: lookAt,
      duration: long,
      action: { label: "Review", onClick: review },
    },
  );
}

// retry is left out when no retry can fix it (D23).
export function toastImportFailed(
  id: string,
  title: string,
  reason: string | undefined,
  retry: (() => void) | undefined,
) {
  showToast("error", title, {
    id,
    description: reason,
    duration: untilClosed,
    closeButton: true,
    action: retry && { label: "Retry", onClick: retry },
  });
}

// A link the user pinched before (design §4.6): not an error, a pointer to what they have. A
// draft of it that's ready has the queue's own toast (toastReady); these two are neutral, as
// nothing has just finished.
export function toastAlreadySaved(title: string, view: () => void) {
  showToast("message", "Already in My recipes", {
    description: <bdi>{title}</bdi>,
    duration: normal,
    action: { label: "View", onClick: view },
  });
}

// A link the worker already has: it says where it is, as there's nothing to open yet.
export function toastAlreadyPinching() {
  showToast("message", "Already pinching it", {
    description: "It's in your queue",
    duration: normal,
  });
}

// Past the day's cap, the user's or everyone's (design §1, D30): trying again won't help, so no
// Try again. Neutral, not red: a limit isn't something that went wrong (as under the paste box).
export function toastLimit(message: string) {
  showToast("message", message, { duration: untilClosed, closeButton: true });
}

// A new recipe in My recipes, from Review or written by hand. Without the wireframe's View:
// saving already opens the recipe.
export function toastSaved(title: string) {
  showToast("success", "Saved to My recipes", {
    ...finished,
    description: <bdi>{title}</bdi>,
    duration: normal,
  });
}

export function toastChangesSaved() {
  showToast("success", "Changes saved", { duration: short });
}

export function toastDeleted(title: string, undo: () => Promise<void>) {
  showToast(
    "success",
    <>
      Deleted <bdi>{title}</bdi>
    </>,
    {
      duration: long,
      action: undoAction(undo),
    },
  );
}

// A deleted recipe undone. The user has left its page (Delete goes to My recipes), so View.
export function toastRestored(title: string, view: () => void) {
  showToast("success", "Back in My recipes", {
    ...finished,
    description: <bdi>{title}</bdi>,
    duration: normal,
    action: { label: "View", onClick: view },
  });
}

// An undone discard or dismiss needs no toast of its own: the import is back in the queue, and
// the queue's toast says it is ready to review, or failed (useImportToasts).
export function toastDiscarded(title: string | undefined, undo: () => Promise<void>) {
  showToast("success", "Discarded", {
    description: title === undefined ? undefined : <bdi>{title}</bdi>,
    duration: long,
    action: undoAction(undo),
  });
}

export function toastDismissed(undo: () => Promise<void>) {
  showToast("success", "Dismissed", { duration: long, action: undoAction(undo) });
}

// A change that couldn't reach the server, with Try again. Only for one-click actions, which can
// simply be sent again; a form keeps its error by its fields.
export function toastCouldntSave(tryAgain: () => void, title = "Couldn't save") {
  showToast("error", title, {
    description: "Check your connection",
    duration: untilClosed,
    closeButton: true,
    action: { label: "Try again", onClick: tryAgain },
  });
}
