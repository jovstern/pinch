import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.ts";

// Scans the page once nothing on it is moving: a toast fading in or out is drawn in half its
// colours (a contrast failure that isn't one), and the files share one user, so another file's
// import may toast at any time. Endless animations (a spinner) don't count. `include` scans one
// part of the page only.
async function scan(page: Page, include?: string) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== "running" ||
          animation.effect?.getComputedTiming().iterations === Infinity,
      ),
  );
  const axe = new AxeBuilder({ page });
  return (include ? axe.include(include) : axe).analyze();
}

test("My recipes has no accessibility violations", async ({ page }) => {
  await page.goto("/recipes");
  // Scan the settled page, with the sample recipes (playwright.config.ts), not the loading state.
  await expect(page.getByRole("link", { name: /Red lentil soup/ })).toBeVisible();
  const results = await scan(page);
  expect(results.violations).toEqual([]);
});

test("the recipe form has no accessibility violations, with its errors showing", async ({
  page,
}) => {
  await page.goto("/recipes/new");
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByText("Give the recipe a title.")).toBeVisible();
  const results = await scan(page);
  expect(results.violations).toEqual([]);
});

// The pages added since M4, each in both themes: the colours are tokens with a dark set
// (docs/ux/plan.md §6), so contrast is checked in each.
for (const colorScheme of ["light", "dark"] as const) {
  test(`a recipe and cook mode have no accessibility violations (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/recipes");
    await page.getByRole("link", { name: /Red lentil soup/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Red lentil soup" })).toBeVisible();
    expect((await scan(page)).violations).toEqual([]);

    await page.getByRole("link", { name: "Cook", exact: true }).click();
    await expect(page.getByText(/^Step 1 of/)).toBeVisible();
    expect((await scan(page)).violations).toEqual([]);
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
    expect((await scan(page)).violations).toEqual([]);

    await item.getByRole("link", { name: "Review" }).click();
    // The review page first: until it's in, the card's own picture is on the page too.
    await expect(page.getByText("Pinch read this from Instagram")).toBeVisible();
    await expect(page.getByRole("presentation")).toBeVisible();
    expect((await scan(page)).violations).toEqual([]);
    await page.getByRole("button", { name: "Discard" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Discard draft" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Add recipe" })).toBeVisible();
  });
}

// The two states that cover a page. The ⋯ menu isn't modal: the page around it stays readable to
// screen readers (a modal menu hid it, docs/metrics/m08.md). The keyboard stays in the menu all
// the same: Tab doesn't leave it.
test("a recipe's ⋯ menu, open, has no accessibility violations", async ({ page }) => {
  await page.goto("/recipes");
  await page.getByRole("link", { name: /Red lentil soup/ }).click();
  await page.getByRole("button", { name: "More actions" }).focus();
  await page.keyboard.press("Enter");
  // The menu takes the focus as it opens, its first item the next key (LazyRecipeMenu).
  await expect(page.getByRole("menu")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  const edit = page.getByRole("menuitem", { name: "Edit" });
  await expect(edit).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(edit).toBeFocused();
  expect((await scan(page)).violations).toEqual([]);
});

// The Filters sheet, at a phone's width (from 1024 px they're a panel). It is a modal dialog: the
// page behind is hidden from screen readers, as it should be, so the scan reads the sheet. Scanned
// on its own too, so a pass can't come from scanning nothing.
test("the Filters sheet, open, has no accessibility violations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/recipes");
  await page.getByRole("button", { name: "Filters" }).click();
  const sheet = page.getByRole("dialog", { name: "Filters" });
  await expect(sheet.getByRole("checkbox", { name: "breakfast" })).toBeVisible();
  expect((await scan(page)).violations).toEqual([]);
  const inSheet = await scan(page, '[role="dialog"]');
  expect(inSheet.violations).toEqual([]);
  expect(inSheet.passes.map((rule) => rule.id)).toEqual(
    expect.arrayContaining(["aria-dialog-name", "label", "button-name"]),
  );
});
