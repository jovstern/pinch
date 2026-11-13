import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.ts";

// A first visit (design §16.1, §16.2): no cookie, so the browser decides, before the first paint.
// Israel's time zone means Hebrew even with an English browser; a Hebrew browser does anywhere.
// The page's strings are still English until M10's I4; the switch names English in itself.
async function firstVisitIsHebrew(page: Page) {
  await page.context().clearCookies();
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("button", { name: "English" })).toHaveAttribute("lang", "en");
}

test.describe("Israel's time zone, an English browser", () => {
  test.use({ timezoneId: "Asia/Jerusalem", locale: "en-US" });

  test("a first visit to Log in is in Hebrew, right to left", async ({ page }) => {
    await firstVisitIsHebrew(page);
  });
});

test.describe("a Hebrew browser, elsewhere", () => {
  test.use({ timezoneId: "UTC", locale: "he-IL" });

  test("a first visit to Log in is in Hebrew, right to left", async ({ page }) => {
    await firstVisitIsHebrew(page);
  });
});
