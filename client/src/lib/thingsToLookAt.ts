import type { Import } from "@pinch/shared";

// How many fields of a draft the model was unsure of (design §6): the queue card, the ready
// toast and the editor count it the same way.
export function countToLookAt(job: Import) {
  return job.draft?.uncertain?.length ?? 0;
}

// In English, for the toasts (D46); the queue card and the editor say it in the page's language
// (imports.thingsToLookAt, editor.lookAt).
export function thingsToLookAt(count: number) {
  return count === 1 ? "1 thing to look at" : `${String(count)} things to look at`;
}
