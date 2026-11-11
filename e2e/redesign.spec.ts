import { expect, test } from "./fixtures.ts";

// M8's demo (pr-demo skill), at a desktop's width and a phone's: a link pasted on Add recipe
// cooks in the queue, its ready toast opens the review, the saved recipe is found in My recipes
// by a tag, and cooked with a swipe. A Facebook link, so the toast is this test's own: the files
// share one database and one user, and every import's toast shows on every page. The pauses let
// a viewer follow the video. It deletes the recipe it made, as the other files do.
for (const phone of [false, true]) {
  test.describe(phone ? "phone" : "desktop", () => {
    // The viewport set for the test, not in it, so the video takes the phone's shape too.
    if (phone) test.use({ viewport: { width: 390, height: 844 } });

    test("paste a link, review it from its toast, find it by a tag, cook it", async ({ page }) => {
      // The pauses for the video and the import's few seconds add up past the default 30 s.
      test.setTimeout(60_000);
      await page.goto("/");
      const url = `https://www.facebook.com/reel/e2e-demo-${phone ? "phone" : "desktop"}`;
      await page.getByLabel("Pinch a recipe from a reel").fill(url);
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: "Pinch it" }).click();
      const card = page.getByRole("listitem").filter({ hasText: url.replace("https://www.", "") });
      // While it cooks, the card's one action says so (ImportList).
      await expect(card.getByRole("button", { name: "Cooking…" })).toBeDisabled();

      const toast = page
        .getByRole("listitem")
        .filter({ hasText: "Tomato pasta (from facebook) is ready to review" });
      await expect(toast).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(1500);
      // Sonner's own key (Alt+T) spreads the stack first: other files' toasts may be on top.
      await page.keyboard.press("Alt+KeyT");
      await toast.getByRole("button", { name: "Review" }).click();

      await expect(page.getByText("Pinch read this from Facebook")).toBeVisible();
      await page.waitForTimeout(1500);
      await page.getByRole("button", { name: "Save to My recipes" }).click();
      const title = page.getByRole("heading", { level: 1, name: "Tomato pasta (from facebook)" });
      await expect(title).toBeVisible();
      await page.waitForTimeout(1500);

      // By a tag: in the Filters sheet on a phone, in the panel beside the grid on a desktop.
      await page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "My recipes" })
        .click();
      await expect(page.getByRole("link", { name: /Red lentil soup/ })).toBeVisible();
      await page.waitForTimeout(1000);
      if (phone) {
        await page.getByRole("button", { name: "Filters" }).click();
        // The chip's label: its checkbox is hidden inside it (TagPicker).
        await page.getByRole("dialog").getByText("italian", { exact: true }).click();
        await page.waitForTimeout(1000);
        // "Show 3 recipes": how many depends on the other files' recipes.
        await page.getByRole("button", { name: /^Show \d+ recipes?$/ }).click();
      } else {
        // Not check(): the tick shows once the address has the tag, a moment after the click.
        await page.getByRole("checkbox", { name: "italian" }).click();
      }
      await expect(page.getByRole("link", { name: /Red lentil soup/ })).toHaveCount(0);
      await page.waitForTimeout(1500);
      await page.getByRole("link", { name: /Tomato pasta \(from facebook\)/ }).click();
      await expect(title).toBeVisible();
      await page.waitForTimeout(1000);

      // A swipe: the steps' row scrolled sideways, as a finger does; it snaps to the next card.
      await page.getByRole("link", { name: "Cook", exact: true }).click();
      await expect(page.getByText("Step 1 of 2")).toBeVisible();
      await page.waitForTimeout(1000);
      await page.getByRole("list", { name: "Steps" }).hover();
      await page.mouse.wheel(600, 0);
      await expect(page.getByText("Step 2 of 2")).toBeVisible();
      await page.waitForTimeout(1500);
      await page.getByRole("button", { name: "Done" }).click();

      await expect(title).toBeVisible();
      await page.getByRole("button", { name: "More actions" }).click();
      await page.getByRole("menuitem", { name: "Delete…" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "My recipes" })).toBeVisible();
    });
  });
}
