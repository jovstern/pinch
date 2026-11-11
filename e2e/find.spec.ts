import { expect, test } from "./fixtures.ts";

// M3's flow, and its demo (pr-demo skill), on the sample recipes (e2e/fixtures.ts): a
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

  // The Filters panel on the left (Desktop Chrome is 1280 px wide). click, not check: the box
  // follows the address, which changes a moment after the click, and check() wants it at once.
  await page.getByRole("checkbox", { name: "comfort" }).click();
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

// M8 F1: the Sort beside the search and a time in the Filters panel (Desktop Chrome), kept in
// the address, on the sample recipes (e2e/fixtures.ts).
test("sort by the quickest and filter by time, kept in the address", async ({ page }) => {
  await page.goto("/recipes");
  await page.getByRole("combobox", { name: "Sort" }).selectOption("Quickest");
  // click, not check: the radio follows the address, a moment after the click.
  await page.getByRole("radio", { name: "15 min or less" }).click();
  await expect(page).toHaveURL("/recipes?time=15&sort=quickest");

  // Mujadara takes 45 minutes; Greek salad 10 and the spaghetti 15, so the salad comes first.
  await expect(page.getByRole("link", { name: /Mujadara/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Spaghetti aglio e olio/ })).toBeVisible();
  const titles = await page.getByRole("main").getByRole("heading", { level: 2 }).allInnerTexts();
  expect(titles.indexOf("Greek salad")).toBeLessThan(titles.indexOf("Spaghetti aglio e olio"));
  await expect(page.getByRole("button", { name: "Remove 15 min or less" })).toBeVisible();
});
