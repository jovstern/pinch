import type { Thumbnail } from "@pinch/shared";
import type { Binary } from "mongodb";

// A recipe's or an import's picture as stored (design §5): the WebP itself, 20–40 KB, and its
// size. Both name it `thumbnail`, so one projection serves both. `small` is the queue's tile:
// 160 × 200, cropped, a few KB; pictures made before it have none, and serve the big one.
export type StoredThumbnail = Thumbnail & { webp: Binary; small?: Binary };

// What a query reading recipes or imports to send leaves out: the picture, served apart (its
// size stays, so the API can say there is one and how big), and an import's screenshots, which
// only the worker reads. The documents read still type them: only the thumbnail routes and the
// worker, which read them whole, may use them.
export const WITHOUT_MEDIA = {
  "thumbnail.webp": 0,
  "thumbnail.small": 0,
  "input.images": 0,
} as const;
