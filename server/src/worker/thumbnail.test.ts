import sharp from "sharp";
import { expect, test } from "vitest";
import { shrink } from "./thumbnail.ts";

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
