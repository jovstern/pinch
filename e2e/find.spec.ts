import { expect, test } from "./fixtures.ts";

// M3's flow, and its demo (pr-demo skill), on the sample recipes (playwright.config.ts): a
// word, then a tag, kept in the address through a reload. The pauses let a viewer follow it.
test("find a recipe by a word and a tag, and keep the search on reload", async ({ page }) => {
  await page.goto("/recipes");
  await expect(page.getByRole("link", { name: /Red lentil soup/ })).toBeVisible();
  await page.waitForTimeout(1000);

  await page.getByRole("searchbox", { name: "Search your recipes" }).fill("lentils");
  await page.keyboard.press("Enter");
  await expect(page.getByText("2 recipes match.")).toHaveAttribute("role", "status");
  await expect(page.getByRole("link", { name: /Mujadara/ })).toBeVisible();
  await page.waitForTimeout(1000);

  // The fold's summary (the tag group's hidden legend has the same words).
  await page.locator("summary", { hasText: "Filter by tags" }).click();
  // The chip: its checkbox is visually hidden, so it's the label that gets the click.
  await page.locator("details label", { hasText: "comfort" }).click();
  await expect(page.getByText("1 recipe matches.")).toHaveAttribute("role", "status");
  await expect(page.getByRole("link", { name: /Red lentil soup/ })).toHaveCount(0);
  await expect(page).toHaveURL("/recipes?q=lentils&tags=fit%3Acomfort");
  await page.waitForTimeout(1000);

  await page.reload();
  await expect(page.getByRole("searchbox", { name: "Search your recipes" })).toHaveValue("lentils");
  await expect(page.getByRole("checkbox", { name: "comfort" })).toBeChecked();
  await page.getByRole("link", { name: /Mujadara/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mujadara" })).toBeVisible();
  await page.waitForTimeout(1000);
});
