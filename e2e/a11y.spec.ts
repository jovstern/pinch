import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures.ts";

test("the home page has no accessibility violations", async ({ page }) => {
  await page.goto("/");
  // Scan the settled page, with the sample recipes (playwright.config.ts), not the loading state.
  await expect(page.getByRole("link", { name: /Red lentil soup/ })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("the recipe form has no accessibility violations, with its errors showing", async ({
  page,
}) => {
  await page.goto("/recipes/new");
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByText("Give the recipe a title.")).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
