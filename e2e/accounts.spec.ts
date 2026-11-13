import { randomInt, randomUUID } from "node:crypto";
import { expect, newVisitor, test } from "./fixtures.ts";

// M9's demo (pr-demo skill), at a desktop's width and a phone's: a new visitor signs up, pastes a
// link and saves its draft; the same link pasted again points to the saved recipe (design §4.6);
// then they log out and back in. The pauses let a viewer follow the video.
// The second paste's 409 is expected: Chrome logs it as a console error (fixtures.ts).
test.use({ expectedConsoleErrors: [/status of 409 \(Conflict\)/] });

for (const phone of [false, true]) {
  test.describe(phone ? "phone" : "desktop", () => {
    // The viewport set for the test, not in it, so the video takes the phone's shape too.
    if (phone) test.use({ viewport: { width: 390, height: 844 } });

    test("sign up, pinch a link, paste it again, log out and back in", async ({ page }) => {
      test.setTimeout(60_000);
      // A visitor of its own, from an address of its own (the sign-ups a minute per IP, §8.3).
      await newVisitor(page);
      await page.setExtraHTTPHeaders({
        "X-Forwarded-For": `10.${String(randomInt(256))}.${String(randomInt(256))}.2`,
      });
      const email = `e2e-${randomUUID()}@example.com`;
      const password = "an e2e password";

      await page.goto("/");
      await expect(page).toHaveURL(/\/login$/);
      await page.waitForTimeout(1000);
      await page.getByRole("link", { name: "Sign up" }).click();
      await page.getByLabel("Name").fill("Noa");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: "Sign up" }).click();
      const box = page.getByLabel("Pinch a recipe from a reel");
      await expect(box).toBeVisible();
      await page.waitForTimeout(1000);

      const url = `https://www.instagram.com/reel/e2e-m9-${phone ? "phone" : "desktop"}/`;
      await box.fill(url);
      await page.getByRole("button", { name: "Pinch it" }).click();
      const card = page.getByRole("listitem").filter({ hasText: url.replace("https://www.", "") });
      await expect(card.getByText("Ready to review")).toBeVisible({ timeout: 15_000 });
      await card.getByRole("link", { name: "Review" }).click();
      await page.getByRole("button", { name: "Save to My recipes" }).click();
      const title = "Tomato pasta (from instagram)";
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await page.waitForTimeout(1000);

      // The same reel, shared again with other tracking: Pinch points to the recipe.
      await page.getByRole("link", { name: /^Add recipe/ }).click();
      await box.fill(`${url}?igsh=again`);
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: "Pinch it" }).click();
      const toast = page.getByRole("listitem").filter({ hasText: "Already in My recipes" });
      await expect(toast).toContainText(title);
      await page.waitForTimeout(1500);

      await page.getByRole("button", { name: "Your account" }).click();
      await expect(page.getByRole("menu")).toContainText(email);
      await page.waitForTimeout(1000);
      await page.getByRole("menuitem", { name: "Log out" }).click();
      await expect(page).toHaveURL(/\/login$/);
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: "Log in" }).click();
      await expect(box).toBeVisible();
      await page.waitForTimeout(1500);
    });
  });
}
