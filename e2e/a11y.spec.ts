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

// The pages added since M4, each in both themes: the colours are tokens with a dark set
// (docs/ux/plan.md §6), so contrast is checked in each.
for (const colorScheme of ["light", "dark"] as const) {
  test(`a recipe and cook mode have no accessibility violations (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await page.getByRole("link", { name: /Red lentil soup/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Red lentil soup" })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page.getByRole("link", { name: "Cook", exact: true }).click();
    await expect(page.getByText(/^Step 1 of/)).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

  test(`a draft's review page, with its picture, has no accessibility violations (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    // Its own link, so the files sharing the database never pick up each other's imports.
    const url = `https://www.instagram.com/reel/e2e-a11y-${colorScheme}/`;
    await page.getByLabel("Pinch a recipe from a reel").fill(url);
    await page.getByRole("button", { name: "Pinch it" }).click();
    const item = page.getByRole("listitem").filter({ hasText: `e2e-a11y-${colorScheme}` });
    await expect(item.getByText("Ready to review")).toBeVisible({ timeout: 15_000 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await item.getByRole("link", { name: "Review the recipe" }).click();
    await expect(page.getByRole("presentation")).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole("button", { name: "Discard" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Your recipes" })).toBeVisible();
  });
}
