import type { ExternalToast } from "sonner";

// Every toast goes through here (design §14). Sonner (~10 kB gzip) is its own chunk, as the
// Toaster is (Layout): in the entry it put first-load JS over its 165 kB budget. The Toaster
// fetches it as the app starts, so by the time anything toasts it is there.
export function showToast(
  kind: "message" | "success" | "error",
  title: string,
  options: ExternalToast,
) {
  void import("sonner").then(({ toast }) => toast[kind](title, options));
}

// A new recipe in My recipes, from Review or written by hand. Without the wireframe's View:
// saving already opens the recipe.
export function toastSaved(title: string) {
  showToast("success", "Saved to My recipes", { description: title, duration: 5000 });
}

// A change that couldn't reach the server: it stays until closed, with Try again. Only for
// one-click actions, which can simply be sent again; a form keeps its error by its fields.
export function toastCouldntSave(tryAgain: () => void) {
  showToast("error", "Couldn't save", {
    description: "Check your connection",
    duration: Infinity,
    closeButton: true,
    action: { label: "Try again", onClick: tryAgain },
  });
}
