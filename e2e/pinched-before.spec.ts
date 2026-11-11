import { expect, test } from "./fixtures.ts";

// M9 L1 (design §4.6): a link saved before, pasted again from another share (other tracking), is
// pointed to, not pinched twice.
// The API's 409 is expected: Chrome logs it as a console error (fixtures.ts).
test.use({ expectedConsoleErrors: [/status of 409 \(Conflict\)/] });

test("a link already in My recipes, pasted again, points to the recipe", async ({ page }) => {
  await page.goto("/");
  const box = page.getByLabel("Pinch a recipe from a reel");
  await box.fill("https://www.instagram.com/reel/e2e-again/?igsh=first");
  await page.getByRole("button", { name: "Pinch it" }).click();

  const reel = page.getByRole("listitem").filter({ hasText: "instagram.com/reel/e2e-again" });
  await expect(reel.getByText("Ready to review")).toBeVisible({ timeout: 15_000 });
  await reel.getByRole("link", { name: "Review" }).click();
  await page.getByLabel("Title").fill("Pasta pinched twice");
  await page.getByRole("button", { name: "Save to My recipes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Pasta pinched twice" })).toBeVisible();

  await page.getByRole("link", { name: /^Add recipe/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Add recipe" })).toBeAttached();
  await box.fill("https://instagram.com/reel/e2e-again?igsh=second");
  await page.getByRole("button", { name: "Pinch it" }).click();

  const toast = page.getByRole("listitem").filter({ hasText: "Already in My recipes" });
  await expect(toast).toContainText("Pasta pinched twice");
  await expect(box).toHaveValue("");
  await expect(reel).toHaveCount(0);
  await toast.getByRole("button", { name: "View" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Pasta pinched twice" })).toBeVisible();
});
