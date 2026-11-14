import { randomInt, randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect, newVisitor, scan, test } from "./fixtures.ts";

// A first visit (design §16.1, §16.2): no cookie, so the browser decides, before the first paint.
// Israel's time zone means Hebrew even with an English browser; a Hebrew browser does anywhere.
// The page says Log in in Hebrew; the switch names English in itself.
async function firstVisitIsHebrew(page: Page) {
  await page.context().clearCookies();
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1, name: "התחברות" })).toBeVisible();
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

// The pages in Hebrew, right to left, with axe (design §16.11): the file's user's language is
// Hebrew, so each page starts in it, as on the user's own devices.
test.describe("signed in, in Hebrew", () => {
  test.beforeEach(async ({ page }) => {
    const saved = await page.request.patch("/api/auth/me", { data: { language: "he" } });
    expect(saved.ok()).toBe(true);
  });

  test("Add recipe with its queue, a draft's review, My recipes, a recipe and cook mode have no accessibility violations", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.getByLabel("לשמור מתכון מסרטון").fill("https://www.instagram.com/reel/e2e-he-a11y/");
    await page.getByRole("button", { name: "Pinch it" }).click();
    const item = page.getByRole("listitem").filter({ hasText: "e2e-he-a11y" });
    await expect(item.getByText("מוכן לבדיקה")).toBeVisible({ timeout: 15_000 });
    expect((await scan(page)).violations).toEqual([]);

    // The draft's review page, with its picture (as a11y.spec.ts's, in English).
    await item.getByRole("link", { name: "לבדוק" }).click();
    await expect(page.getByText("Pinch קרא את זה מ\u2011Instagram")).toBeVisible();
    await expect(page.getByRole("presentation")).toBeVisible();
    expect((await scan(page)).violations).toEqual([]);

    await page.getByRole("link", { name: /^המתכונים שלי/ }).click();
    await expect(page.getByRole("link", { name: /Red lentil soup/ })).toBeVisible();
    expect((await scan(page)).violations).toEqual([]);

    await page.getByRole("link", { name: /Red lentil soup/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Red lentil soup" })).toBeVisible();
    expect((await scan(page)).violations).toEqual([]);

    await page.getByRole("link", { name: "לבשל", exact: true }).click();
    await expect(page.getByText(/^שלב 1 מתוך/)).toBeVisible();
    expect((await scan(page)).violations).toEqual([]);
  });

  test("the editor, its Unit's list open, has no accessibility violations", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.getByRole("combobox", { name: "יחידה" }).click();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("listbox", { name: "הצעות" })).toBeVisible();
    await expect(page.getByRole("option", { name: "גרם" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect((await scan(page)).violations).toEqual([]);
  });
});

test("Log in in Hebrew has no accessibility violations", async ({ page }) => {
  await page.context().clearCookies();
  await page
    .context()
    .addCookies([{ name: "pinch_lang", value: "he", domain: "localhost", path: "/" }]);
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1, name: "התחברות" })).toBeVisible();
  expect((await scan(page)).violations).toEqual([]);
});

// The language on the account (design §16.1, D40): picked in the avatar's menu, the page reloads
// in it, and it stays, on the account and on this device (the pinch_lang cookie), signed out too.
// Signed in again, the account's language wins over the device's.
test("switch to Hebrew from the avatar's menu: it stays after a reload and on Log in", async ({
  page,
}) => {
  // A visitor of its own, from an address of its own (the sign-ups a minute per IP, §8.3).
  await newVisitor(page);
  await page.setExtraHTTPHeaders({
    "X-Forwarded-For": `10.${String(randomInt(256))}.${String(randomInt(256))}.3`,
  });
  const email = `e2e-${randomUUID()}@example.com`;
  const password = "an e2e password";
  const html = page.locator("html");

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Noa");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Add recipe" })).toBeVisible();
  await expect(html).toHaveAttribute("lang", "en");

  await page.getByRole("button", { name: "Your account" }).click();
  await page.getByRole("menuitemradio", { name: "עברית" }).click();
  await expect(html).toHaveAttribute("lang", "he");
  await expect(html).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1, name: "להוסיף מתכון" })).toBeVisible();

  await page.reload();
  await expect(html).toHaveAttribute("lang", "he");
  await expect(page.getByRole("heading", { level: 1, name: "להוסיף מתכון" })).toBeVisible();

  await page.getByRole("button", { name: "החשבון שלך" }).click();
  await page.getByRole("menuitem", { name: "להתנתק" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(html).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1, name: "התחברות" })).toBeVisible();

  // This device in English, then signed in: the account's Hebrew comes back, and the menu sets
  // English on the account.
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Log in" })).toBeVisible();
  await expect(html).toHaveAttribute("dir", "ltr");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "להוסיף מתכון" })).toBeVisible();
  await page.getByRole("button", { name: "החשבון שלך" }).click();
  await page.getByRole("menuitemradio", { name: "English" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Add recipe" })).toBeVisible();
  await expect(html).toHaveAttribute("lang", "en");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Add recipe" })).toBeVisible();
});
