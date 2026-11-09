import { expect, test } from "./fixtures.ts";

// M4's whole flow, and its demo (pr-demo skill): a pasted link becomes a draft (the fake
// extractor, about 4 s with the worker's claim), which is checked, edited and saved as a recipe.
// The pauses let a viewer follow the video.
// It deletes the recipe it made, as recipes.spec.ts does: the files share one database.
test("paste a link, review the draft, save it as a recipe", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Pinch a recipe from a reel").fill("https://youtu.be/e2e-pasta");
  await page.getByRole("button", { name: "Pinch it" }).click();

  const link = page.getByRole("listitem").filter({ hasText: "youtu.be/e2e-pasta" });
  await expect(link).toContainText(/Waiting to start…|Working on it…/);
  await expect(link.getByText("Ready to review")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1000);
  await link.getByRole("link", { name: "Review the recipe" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Review the recipe" })).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue("Tomato pasta (from youtube)");
  await page.waitForTimeout(1000);
  await page.getByLabel("Title").fill("Weeknight tomato pasta");
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Weeknight tomato pasta" }),
  ).toBeVisible();
  // The draft's nutrition estimate came with it, though the form doesn't show it (D14).
  await expect(page.getByText(/≈ 520 kcal/)).toBeVisible();
  await page.waitForTimeout(1000);
  // Approved: the import is deleted, so the link has left the queue.
  await page.getByRole("link", { name: /^New recipe/ }).click();
  await expect(link).toHaveCount(0);
  await page.getByRole("link", { name: "My recipes" }).click();
  await expect(page.getByRole("link", { name: /Weeknight tomato pasta/ })).toBeVisible();
  await page.waitForTimeout(1000);

  await page.getByRole("link", { name: /Weeknight tomato pasta/ }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "My recipes" })).toBeVisible();
});
