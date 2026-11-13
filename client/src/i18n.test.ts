import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { afterEach, expect, test, vi } from "vitest";
import { loadHebrew, needsReloadFor } from "./i18n.ts";
import { en } from "./locales/en.ts";
import { he } from "./locales/he.ts";
import { renderInHebrew, stubFetch, testUser } from "./test-utils.tsx";

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

test("in Hebrew, the header, its menu and not found are in Hebrew, right to left", async () => {
  stubFetch(() => Promise.resolve(new Response(null, { status: 404 })));
  await renderInHebrew("/nope");
  expect(screen.getByRole("link", { name: /^המתכונים שלי/ })).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1, name: "הדף לא נמצא" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "לחזור למתכונים שלי" })).toHaveAttribute(
    "href",
    "/recipes",
  );
  await userEvent.setup().click(screen.getByRole("button", { name: "החשבון שלך" }));
  const menu = await screen.findByRole("menu");
  expect(menu).toHaveAttribute("dir", "rtl");
  expect(within(menu).getByRole("group", { name: "שפה" })).toBeInTheDocument();
  // Log out's arrow points the reading way, so it mirrors (design §16.4).
  const logOut = within(menu).getByRole("menuitem", { name: "להתנתק" });
  expect(logOut.querySelector("svg")).toHaveClass("rtl:-scale-x-100");
});

// Each string's {{variables}}, sorted, by its key. A plural's single and dual forms (_one, _two)
// may say their number in words ("מתכון אחד", "שעתיים"), so {{count}} is left out of theirs; their
// other variables still count. Hebrew's dual has no English twin, so it isn't compared.
function placeholders(strings: object, prefix = ""): Record<string, string> {
  const found: Record<string, string> = {};
  for (const [key, value] of Object.entries(strings)) {
    if (key.endsWith("_two")) continue;
    if (typeof value === "string") {
      const words = /_(one|two)$/.test(key);
      const marks = (value.match(/{{\w+}}/g) ?? []).filter(
        (mark) => !(words && mark === "{{count}}"),
      );
      found[prefix + key] = marks.sort().join(" ");
    } else {
      Object.assign(found, placeholders(value as object, `${prefix}${key}.`));
    }
  }
  return found;
}

test("each Hebrew string has its English one's variables (design §16.11)", () => {
  expect(placeholders(he)).toEqual(placeholders(en));
});
