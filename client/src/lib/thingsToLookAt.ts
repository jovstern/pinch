import type { Import } from "@pinch/shared";

// How many fields of a draft the model was unsure of (design §6): the queue card, the ready
// toast and the editor say it the same way.
export function countToLookAt(job: Import) {
  return job.draft?.uncertain?.length ?? 0;
}

// In English, for the toasts (D46) and the editor until its strings are translated; the queue
// card says it in the page's language (imports.thingsToLookAt).
export function thingsToLookAt(count: number) {
  return count === 1 ? "1 thing to look at" : `${String(count)} things to look at`;
}
