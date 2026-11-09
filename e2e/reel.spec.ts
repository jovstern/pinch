import { expect, test } from "./fixtures.ts";

// M6's demo (pr-demo skill): an Instagram reel becomes a draft with its picture, saved as a
// recipe that shows it, then cooked a step at a time. The fake extractor stands in for yt-dlp and
// Gemini (design §9): its picture is a plain tile. The pauses let a viewer follow the video.
// It deletes the recipe it made, as import.spec.ts does: the files share one database. A picture
// that didn't load would fail the test: Chrome logs it as a console error (fixtures.ts).
test("paste a reel, review the draft with its picture, save it, cook it", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("Pinch a recipe from a reel")
    .fill("https://www.instagram.com/reel/e2e-pasta/");
  await page.getByRole("button", { name: "Pinch it" }).click();

  const reel = page.getByRole("listitem").filter({ hasText: "instagram.com/reel/e2e-pasta" });
  await expect(reel.getByText("Ready to review")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1000);
  await reel.getByRole("link", { name: "Review the recipe" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Review the recipe" })).toBeVisible();
  await expect(page.getByRole("presentation")).toBeVisible();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Save recipe" }).click();

  const title = page.getByRole("heading", { level: 1, name: "Tomato pasta (from instagram)" });
  await expect(title).toBeVisible();
  await expect(page.getByRole("presentation")).toBeVisible();
  await page.waitForTimeout(1500);

  await page.getByRole("link", { name: "Cook", exact: true }).click();
  await expect(page.getByText("Step 1 of 2")).toBeVisible();
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Step 2 of 2")).toBeVisible();
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "Done" }).click();

  await expect(title).toBeVisible();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "My recipes" })).toBeVisible();
});

// The fallback: screenshots chosen on / become a draft, the first one its picture.
test("add screenshots, review the draft made from them", async ({ page }) => {
  // A 1×1 PNG: the fake extractor doesn't read it; the API checks it's an image.
  const screenshot = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.goto("/");
  await page
    .getByLabel("Or add screenshots")
    .setInputFiles([{ name: "recipe.png", mimeType: "image/png", buffer: screenshot }]);

  const shots = page.getByRole("listitem").filter({ hasText: "Screenshots" });
  await expect(shots.getByText("Ready to review")).toBeVisible({ timeout: 15_000 });
  await shots.getByRole("link", { name: "Review the recipe" }).click();

  await expect(page.getByText("Made from your screenshots.")).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue("Tomato pasta (from images)");
  await expect(page.getByRole("presentation")).toBeVisible();
  await page.getByRole("button", { name: "Discard" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "New recipe" })).toBeVisible();
});
