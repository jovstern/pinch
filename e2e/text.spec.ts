import { expect, test } from "./fixtures.ts";

// M5's demo (pr-demo skill): a post's text, pasted in the same box as a link, becomes a draft,
// which is saved as a recipe with its nutrition estimate. The fake extractor stands in for
// Gemini (design §9), so the draft is its fixed one. The pauses let a viewer follow the video.
// It deletes the recipe it made, as import.spec.ts does: the files share one database.
test("paste a recipe's text, review the draft, save it with its nutrition", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("Pinch a recipe from a reel")
    .fill(
      "Tomato pasta for 2: boil 200 g spaghetti. Fry 2 garlic cloves, add 400 g crushed " +
        "tomatoes, simmer 15 minutes, toss with the pasta.",
    );
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "Pinch it" }).click();

  const text = page.getByRole("listitem").filter({ hasText: "Pasted text" });
  await expect(text).toContainText(/Waiting to start…|Working on it…/);
  await expect(text.getByText("Ready to review")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1000);
  await text.getByRole("link", { name: "Review the recipe" }).click();

  await expect(page.getByText("Made from the text you pasted.")).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue("Tomato pasta (from text)");
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Tomato pasta (from text)" }),
  ).toBeVisible();
  await expect(page.getByText(/≈ 520 kcal · 18 g protein/)).toBeVisible();
  await page.waitForTimeout(2000);

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "My recipes" })).toBeVisible();
});
