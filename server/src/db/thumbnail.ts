import type { Thumbnail } from "@pinch/shared";
import type { Binary } from "mongodb";

// A recipe's or an import's picture as stored (design §5): the WebP itself, 20–40 KB, and its
// size. Both name it `thumbnail`, so one projection serves both.
export type StoredThumbnail = Thumbnail & { webp: Binary };

// What a query reading recipes or imports to send leaves out: the image, served apart. Its
// size stays, so the API can say there is one and how big. The documents read still type
// `webp`: only the thumbnail routes, which read it whole, may use it.
export const WITHOUT_THUMBNAIL_IMAGE = { "thumbnail.webp": 0 } as const;
