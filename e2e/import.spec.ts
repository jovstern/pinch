import { expect, test } from "./fixtures.ts";

// M4's whole flow, and its demo (pr-demo skill): a pasted link becomes a draft (the fake
// extractor, about 4 s with the worker's claim), which is checked, edited and saved as a recipe.
// It deletes the recipe it made, as recipes.spec.ts does: the files share one database.
test("paste a link, review the draft, save it as a recipe", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Pinch a recipe from a reel").fill("https://youtu.be/e2e-pasta");
  await page.getByRole("button", { name: "Pinch it" }).click();

  const link = page.getByRole("listitem").filter({ hasText: "youtu.be/e2e-pasta" });
  await expect(link).toContainText(/Waiting to start…|Working on it…/);
  await link.getByRole("link", { name: "Review the recipe" }).click({ timeout: 15_000 });

  await expect(page.getByRole("heading", { level: 1, name: "Review the recipe" })).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue("Tomato pasta (from youtube)");
  await page.getByLabel("Title").fill("Weeknight tomato pasta");
  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Weeknight tomato pasta" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Pinch" }).click();
  await expect(page.getByRole("link", { name: /Weeknight tomato pasta/ })).toBeVisible();
  // Approved: the import is deleted, so the link has left Your links.
  await expect(link).toHaveCount(0);

  await page.getByRole("link", { name: /Weeknight tomato pasta/ }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your recipes" })).toBeVisible();
});
