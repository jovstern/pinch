import type { Import } from "@pinch/shared";

// How many fields of a draft the model was unsure of (design §6): the queue card, the ready
// toast and the editor say it the same way.
export function countToLookAt(job: Import) {
  return job.draft?.uncertain?.length ?? 0;
}

export function thingsToLookAt(count: number) {
  return count === 1 ? "1 thing to look at" : `${String(count)} things to look at`;
}
