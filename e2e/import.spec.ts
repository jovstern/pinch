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
  await expect(link.getByText(/Ready to review/)).toBeVisible({ timeout: 15_000 });
  // The fake extractor marks two fields it was unsure of (design §9).
  await expect(link).toContainText("Ready to review · ◆ 2 things to look at");
  await page.waitForTimeout(1000);
  await link.getByRole("link", { name: "Review" }).click();

  await expect(page.getByText("Pinch read this from YouTube")).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue("Tomato pasta (from youtube)");
  // A marked field is read with its reason; changing it clears the mark.
  await expect(page.getByText("2 things to look at, marked below")).toBeVisible();
  const tomatoes = page.getByLabel("Amount").nth(1);
  await expect(tomatoes).toHaveAccessibleDescription("To look at: The video says “a can”.");
  await page.waitForTimeout(1000);
  await tomatoes.fill("1 can");
  await expect(tomatoes).not.toHaveAccessibleDescription(/To look at/);
  await expect(page.getByText("1 thing to look at, marked below")).toBeVisible();
  await page.getByLabel("Title").fill("Weeknight tomato pasta");
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Save to My recipes" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Weeknight tomato pasta" }),
  ).toBeVisible();
  // The draft's nutrition estimate came with it, though the form doesn't show it (D14).
  await expect(page.getByText(/≈ 520 kcal/)).toBeVisible();
  await page.waitForTimeout(1000);
  // Approved: the import is deleted, so the link has left the queue.
  await page.getByRole("link", { name: /^New recipe/ }).click();
  // On / first: the recipe's page has no queue either, so the next line would pass there too.
  // The heading, not the address: the address changes before the new page shows.
  await expect(page.getByRole("heading", { level: 1, name: "New recipe" })).toBeAttached();
  await expect(link).toHaveCount(0);
  await page.getByRole("link", { name: "My recipes" }).click();
  await expect(page.getByRole("link", { name: /Weeknight tomato pasta/ })).toBeVisible();
  await page.waitForTimeout(1000);

  await page.getByRole("link", { name: /Weeknight tomato pasta/ }).click();
  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Delete…" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "My recipes" })).toBeVisible();
});
