import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures.ts";

test("the home page has no accessibility violations", async ({ page }) => {
  await page.goto("/");
  // Scan the settled page, not the loading state.
  await expect(page.getByRole("link", { name: "Add your first recipe" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
