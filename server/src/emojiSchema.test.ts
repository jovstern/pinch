import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

test("without Intl.Segmenter (an older browser) a recipe's emoji is dropped, not an error", async () => {
  // Intl's own properties aren't enumerable: a copy that inherits them, without the Segmenter.
  vi.stubGlobal(
    "Intl",
    Object.assign(Object.create(Intl) as typeof Intl, { Segmenter: undefined }),
  );
  vi.resetModules();
  // Imported again, so the schema is made without it.
  const { EmojiSchema } = await import("@pinch/shared");

  expect(EmojiSchema.parse("🍲")).toBeUndefined();
});
