import type { Platform } from "@pinch/shared";

// The sites Pinch takes links from, as people write them: on the queue's cards and a recipe's.
export const platformNames: Record<Platform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  text: "Plain Text",
};
