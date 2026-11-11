import type { Request, Response } from "express";
import { z } from "zod";
import type { StoredThumbnail } from "../db/thumbnail.ts";
import { parseInput } from "../errors.ts";

// ?size=small asks for the queue's tile (§5); without it, the picture.
const ThumbnailQuerySchema = z.object({ size: z.literal("small").optional() });

// A recipe's or a draft's picture, as WebP (design §5). It never changes once made (a draft's is
// replaced only by a retry, which makes the same picture), so the browser keeps it for a year
// without asking again; private, as it's the user's. A Buffer, as Express sends a Buffer as
// bytes (a Uint8Array would go out as JSON). A picture made before the tile existed has none,
// and sends itself instead: the browser shrinks it, as it did before.
export function sendThumbnail(req: Request, res: Response, thumbnail: StoredThumbnail) {
  const { size } = parseInput(ThumbnailQuerySchema, req.query);
  const image = (size === "small" && thumbnail.small) || thumbnail.webp;
  res
    .type("image/webp")
    .set("Cache-Control", "private, max-age=31536000, immutable")
    .send(Buffer.from(image.buffer));
}
