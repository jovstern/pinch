import { expect, test } from "./fixtures.ts";

// M5's demo (pr-demo skill): a post's text, pasted in the same box as a link, becomes a draft,
// which is saved as a recipe with its nutrition estimate and its emoji. The fake extractor stands
// in for Gemini (design §9), so the draft is its fixed one. The pauses let a viewer follow the video.
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

  // By its text: once ready, the card is named by the draft's title.
  const text = page.getByRole("listitem").filter({ hasText: "Tomato pasta for 2" });
  await expect(text).toContainText(/Waiting to start…|Working on it…/);
  await expect(text.getByText("Ready to review")).toBeVisible({ timeout: 15_000 });
  // A text has no picture: the card shows the dish's emoji, the model's pick (D25).
  await expect(text).toContainText("🍝");
  await page.waitForTimeout(1000);
  await text.getByRole("link", { name: "Review" }).click();

  await expect(page.getByText("Pinch read this from the text you pasted")).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue("Tomato pasta (from text)");
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Save to My recipes" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Tomato pasta (from text)" }),
  ).toBeVisible();
  await expect(page.getByText(/≈ 520 kcal · 18 g protein/)).toBeVisible();
  await page.waitForTimeout(2000);
  // The emoji came with it, and is its face in My recipes.
  await page
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link", { name: "My recipes" })
    .click();
  const card = page.getByRole("link", { name: /Tomato pasta \(from text\)/ });
  await expect(card).toContainText("🍝");
  await page.waitForTimeout(1000);
  await card.click();

  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Delete…" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "My recipes" })).toBeVisible();
});
