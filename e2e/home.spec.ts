import { expect, test } from "./fixtures.ts";

test("the home page loads and reaches the API", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Pinch" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Connected to the API");
  // A pause so the demo video shows the result (pr-demo skill).
  await page.waitForTimeout(1000);
});
