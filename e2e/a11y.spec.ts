import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures.ts";

test("the home page has no accessibility violations", async ({ page }) => {
  await page.goto("/");
  // Scan the settled page, not the loading state. (Empty or not: recipes.spec.ts may have
  // added one by now.)
  await expect(page.getByRole("heading", { name: "Your recipes" })).toBeVisible();
  await expect(page.getByText("Loading your recipes…")).toHaveCount(0);
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
