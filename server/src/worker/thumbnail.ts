import { Binary } from "mongodb";
import sharp from "sharp";
import type { StoredThumbnail } from "../db/thumbnail.ts";

// Fetching the post's picture: a few hundred KB, from the platform's image servers.
const FETCH_TIMEOUT_MS = 15_000;

// Caps on what's read and decoded, as on every outside input (the yt-dlp output, the
// download): a cover is a few hundred KB, a few million pixels.
const MAX_BYTES = 5_000_000;
const MAX_PIXELS = 40_000_000;

// WebP inside 400 × 500 (4:5, a portrait card's shape), about 30 KB (design §5): enough for a
// card and the top of a recipe. A tall reel cover is 281 × 500, a YouTube one 400 × 225.
const MAX_WIDTH = 400;
const MAX_HEIGHT = 500;

// The queue's tile is 64 × 80 CSS px (Thumbnail's "tile"): this is it at 2.5× DPR, cropped to
// its 4:5, a few KB, so the queue's pictures don't compete with the app's JS (docs/metrics/m08.md).
const SMALL_WIDTH = 160;
const SMALL_HEIGHT = 200;

// The post's own picture (yt-dlp's "thumbnail": YouTube's, or the reel's cover), made small.
// Never fails the import: without a picture the recipe is still a recipe, so any error is
// "no thumbnail" (not logged: Extract has no logger). The picture is read now and kept, as
// platforms' image links expire.
export async function makeThumbnail(
  url: string,
  signal: AbortSignal,
): Promise<StoredThumbnail | undefined> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(FETCH_TIMEOUT_MS)]),
      // The link as yt-dlp gave it (https): a redirect could lead anywhere, even to http.
      redirect: "error",
    });
    const size = Number(response.headers.get("content-length") ?? Infinity);
    if (!response.ok || size > MAX_BYTES) return undefined;
    const image = Buffer.from(await response.arrayBuffer());
    return await shrink(image);
  } catch {
    return undefined;
  }
}

// Any image to WebP inside the box (never bigger than it was), keeping its shape; and the
// queue's tile, cropped to it.
export async function shrink(image: Buffer): Promise<StoredThumbnail> {
  const input = sharp(image, { limitInputPixels: MAX_PIXELS });
  const [{ data, info }, small] = await Promise.all([
    input
      .clone()
      .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer({ resolveWithObject: true }),
    input
      .clone()
      .resize({ width: SMALL_WIDTH, height: SMALL_HEIGHT, fit: "cover" })
      .webp({ quality: 70 })
      .toBuffer(),
  ]);
  return {
    webp: new Binary(data),
    small: new Binary(small),
    width: info.width,
    height: info.height,
  };
}
