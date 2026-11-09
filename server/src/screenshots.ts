import { Binary } from "mongodb";
import sharp from "sharp";

// A screenshot as it's kept for the worker (design §4.1): a JPEG at most 1600 px on a side,
// about 200–400 KB, so four of them sit well inside a Mongo document (16 MB). Text in a phone
// screenshot stays readable at that size.
const MAX_SIDE = 1600;

// As the thumbnail's limit: an upload is outside input.
const MAX_PIXELS = 40_000_000;

// Turned the right way up (a photo's EXIF), made smaller, as JPEG. Throws on a file that isn't
// an image sharp can read: the route answers 400.
export async function readScreenshot(file: Buffer): Promise<Binary> {
  const jpeg = await sharp(file, { limitInputPixels: MAX_PIXELS })
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  return new Binary(jpeg);
}
