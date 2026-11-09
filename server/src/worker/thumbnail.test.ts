import sharp from "sharp";
import { afterEach, expect, test, vi } from "vitest";
import { makeThumbnail, shrink } from "./thumbnail.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("a picture becomes a WebP inside 400 × 500, of the same shape", async () => {
  const photo = await sharp({
    create: { width: 1080, height: 1920, channels: 3, background: "#884422" },
  })
    .jpeg()
    .toBuffer();

  const thumbnail = await shrink(photo);

  expect(thumbnail).toMatchObject({ width: 281, height: 500 });
  expect((await sharp(thumbnail.webp.buffer).metadata()).format).toBe("webp");
});

test("a small picture isn't made bigger", async () => {
  const small = await sharp({
    create: { width: 200, height: 200, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();

  expect(await shrink(small)).toMatchObject({ width: 200, height: 200 });
});

test("a picture that can't be had is no thumbnail, not an error", async () => {
  const noDeadline = new AbortController().signal;
  vi.stubGlobal("fetch", () => Promise.resolve(new Response("not an image")));
  expect(await makeThumbnail("https://cdn/cover.jpg", noDeadline)).toBeUndefined();

  vi.stubGlobal("fetch", () => Promise.resolve(new Response(null, { status: 404 })));
  expect(await makeThumbnail("https://cdn/cover.jpg", noDeadline)).toBeUndefined();

  vi.stubGlobal("fetch", () =>
    Promise.resolve(new Response("x", { headers: { "content-length": "50000000" } })),
  );
  expect(await makeThumbnail("https://cdn/cover.jpg", noDeadline)).toBeUndefined();
});
