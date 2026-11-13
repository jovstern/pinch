import { expect, test } from "./fixtures.ts";

// M10's demo (pr-demo skill), at a desktop's width and a phone's: an English user picks עברית in
// the avatar's menu; the page comes back in Hebrew, right to left, its titles in Frank Ruhl Libre
// (design §16); then a Hebrew recipe, its editor, and the Unit's list of Hebrew units (§16.12).
// The pauses let a viewer follow the video.
for (const phone of [false, true]) {
  test.describe(phone ? "phone" : "desktop", () => {
    // The viewport set for the test, not in it, so the video takes the phone's shape too.
    if (phone) test.use({ viewport: { width: 390, height: 844 } });

    test("switch to Hebrew, open a Hebrew recipe and its editor's units", async ({ page }) => {
      // The file's user is shared by both tests: each starts in English.
      const english = await page.request.patch("/api/auth/me", { data: { language: "en" } });
      expect(english.ok()).toBe(true);
      const html = page.locator("html");

      await page.goto("/recipes");
      await expect(page.getByRole("link", { name: /Red lentil soup/ })).toBeVisible();
      await page.waitForTimeout(1000);

      await page.getByRole("button", { name: "Your account" }).click();
      await page.waitForTimeout(800);
      await page.getByRole("menuitemradio", { name: "עברית" }).click();
      await expect(html).toHaveAttribute("dir", "rtl");
      await expect(page.getByRole("link", { name: /סלט ירקות/ })).toBeVisible();
      // The Hebrew display face, fetched after load (§16.6), in before the next step.
      await page.waitForFunction(() => document.fonts.check('1em "Frank Ruhl Libre"', "סלט"));
      await page.waitForTimeout(1500);

      await page.getByRole("link", { name: /סלט ירקות/ }).click();
      await expect(page.getByRole("heading", { level: 1, name: "סלט ירקות" })).toBeVisible();
      await page.waitForTimeout(1500);

      await page.getByRole("button", { name: "פעולות נוספות" }).click();
      await page.getByRole("menuitem", { name: "לערוך" }).click();
      const unit = page.getByRole("combobox", { name: "יחידה" }).first();
      await expect(unit).toBeVisible();
      await page.waitForTimeout(1000);

      await unit.click();
      // The pointer out of the way, so its hover isn't taken for the arrow keys' option.
      await page.mouse.move(0, 0);
      await expect(page.getByRole("option", { name: "גרם" })).toBeVisible();
      await page.waitForTimeout(1000);
      await page.keyboard.type("כ");
      await expect(page.getByRole("option", { name: "כפית" })).toBeVisible();
      await page.waitForTimeout(800);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(800);
      await page.keyboard.press("Enter");
      await expect(unit).toHaveValue("כף");
      await page.waitForTimeout(1500);
    });
  });
}
