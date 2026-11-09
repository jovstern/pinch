import type { Response } from "express";
import type { StoredThumbnail } from "../db/thumbnail.ts";

// A recipe's or a draft's picture, as WebP (design §5). It never changes once made (a draft's is
// replaced only by a retry, which makes the same picture), so the browser keeps it for a year
// without asking again; private, as it's the user's. A Buffer, as Express sends a Buffer as
// bytes (a Uint8Array would go out as JSON).
export function sendThumbnail(res: Response, thumbnail: StoredThumbnail) {
  res
    .type("image/webp")
    .set("Cache-Control", "private, max-age=31536000, immutable")
    .send(Buffer.from(thumbnail.webp.buffer));
}
