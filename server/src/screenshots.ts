import { Binary } from "mongodb";
import sharp from "sharp";

// A screenshot as it's kept for the worker (design §4.1): a JPEG at most 1600 px on a side,
// typically 200–400 KB and under 2 MB at worst, so four sit well inside a Mongo document (16 MB)
// and a Gemini request (20 MB). Text in a phone screenshot stays readable at that size.
const MAX_SIDE = 1600;

// A phone's screenshot is 3–4 million pixels; this is room enough, and bounds the decoding.
const MAX_PIXELS = 25_000_000;

// What a screenshot is saved as. Anything else sharp could read (SVG, TIFF…) is refused, so
// less of a stranger's file reaches a decoder. (HEIC isn't one sharp reads: an iPhone's
// screenshots are PNG.)
const FORMATS = new Set(["png", "jpeg", "webp"]);

// Turned the right way up (a photo's EXIF), made smaller, as JPEG. Throws on a file that isn't
// one of those images: the route answers 400.
export async function readScreenshot(file: Buffer): Promise<Binary> {
  const image = sharp(file, { limitInputPixels: MAX_PIXELS });
  const { format } = await image.metadata();
  if (!FORMATS.has(format)) throw new Error(`Not a screenshot: ${format}`);
  const jpeg = await image
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  return new Binary(jpeg);
}
