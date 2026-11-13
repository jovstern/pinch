import { screen } from "@testing-library/react";
import i18next from "i18next";
import { afterEach, expect, test, vi } from "vitest";
import { loadHebrew, needsReloadFor } from "./i18n.ts";
import { renderApp, stubFetch, testUser } from "./test-utils.tsx";

// A new device (design §16.1): the page is in English (jsdom's <html> has no lang).
afterEach(async () => {
  document.cookie = "pinch_lang=; Max-Age=0; Path=/";
  // Back to English, the other tests' language (test-setup.ts).
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
  await i18next.changeLanguage("en");
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

// A page in Hebrew (design §16.2): index.html has set <html lang dir>, main.tsx loads Hebrew.
async function inHebrew() {
  document.documentElement.lang = "he";
  document.documentElement.dir = "rtl";
  await i18next.changeLanguage("he");
  await loadHebrew();
}

test("once Hebrew is loaded, i18next says the page is in Hebrew, right to left", async () => {
  await inHebrew();
  expect(i18next.resolvedLanguage).toBe("he");
  expect(i18next.dir()).toBe("rtl");
});

test("in Hebrew, the header's tabs are in Hebrew", async () => {
  await inHebrew();
  stubFetch(() => Promise.resolve(new Response(null, { status: 404 })));
  renderApp("/nope");
  expect(screen.getByRole("link", { name: /^המתכונים שלי/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "החשבון שלך" })).toBeInTheDocument();
});
