import { Binary } from "mongodb";
import sharp from "sharp";
import type { StoredThumbnail } from "../db/recipes.ts";

// Fetching the post's picture: a few hundred KB at most, from the platform's image servers.
const FETCH_TIMEOUT_MS = 15_000;

// WebP inside 400 × 500 (4:5, a portrait card's shape), about 30 KB (design §5): enough for a
// card and the top of a recipe. A tall reel cover is 281 × 500, a YouTube one 400 × 225.
const MAX_WIDTH = 400;
const MAX_HEIGHT = 500;

// The post's own picture (yt-dlp's "thumbnail": YouTube's, or the reel's cover), made small.
// Never fails the import: without a picture the recipe is still a recipe, so any error is
// "no thumbnail". The picture is read now and kept, as platforms' image links expire.
export async function makeThumbnail(
  url: string,
  signal: AbortSignal,
): Promise<StoredThumbnail | undefined> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(FETCH_TIMEOUT_MS)]),
    });
    if (!response.ok) return undefined;
    const image = Buffer.from(await response.arrayBuffer());
    return await shrink(image);
  } catch {
    return undefined;
  }
}

// Any image to WebP inside the box (never bigger than it was), keeping its shape.
export async function shrink(image: Buffer): Promise<StoredThumbnail> {
  const { data, info } = await sharp(image)
    .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 70 })
    .toBuffer({ resolveWithObject: true });
  return { webp: new Binary(data), width: info.width, height: info.height };
}
