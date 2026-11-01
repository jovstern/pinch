import { expect, test } from "./fixtures.ts";

test("the home page lists my recipes, and offers to add the first", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your recipes" })).toBeVisible();
  // The e2e database starts empty, so the list shows its empty state.
  await expect(page.getByRole("link", { name: "Add your first recipe" })).toBeVisible();
  // A pause so the demo video shows the result (pr-demo skill).
  await page.waitForTimeout(1000);
});
