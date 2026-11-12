import { afterEach, expect, test } from "vitest";
import { testUser } from "./test-utils.tsx";
import { needsReloadFor } from "./i18n.ts";

// A new device (design §16.1): the page is in English (jsdom's <html> has no lang).
afterEach(() => {
  document.cookie = "pinch_lang=; Max-Age=0; Path=/";
});

test("an account in another language reloads the page once me has set the cookie", () => {
  document.cookie = "pinch_lang=he; Path=/";
  expect(needsReloadFor({ ...testUser, language: "he" })).toBe(true);
});

test("a browser that refused the cookie stays as it is, rather than reload forever", () => {
  expect(needsReloadFor({ ...testUser, language: "he" })).toBe(false);
});

test("an account in the page's language, or nobody signed in, doesn't reload", () => {
  document.cookie = "pinch_lang=en; Path=/";
  expect(needsReloadFor(testUser)).toBe(false);
  expect(needsReloadFor(null)).toBe(false);
});
