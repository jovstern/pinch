import { expect, test } from "./fixtures.ts";

// A recipe on paper (design D49): ⋯ Print or save as PDF opens the browser's dialog; the print
// layout is only the recipe, with the amounts as picked, dark on white in the dark theme too.
test("a recipe prints as the recipe alone, for the people picked, dark on white", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/recipes");
  await page.getByRole("link", { name: /Red lentil soup/ }).click();
  await page.getByRole("combobox", { name: "Cooking for" }).selectOption("8");

  // The menu's item calls the browser's print, stubbed here: the dialog isn't the page's.
  await page.evaluate(() => {
    window.print = () => {
      document.body.dataset.printed = "yes";
    };
  });
  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Print or save as PDF" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-printed", "yes");

  // About A4's width less its margins, as print lays the page out at the paper's width.
  await page.setViewportSize({ width: 718, height: 1000 });
  await page.emulateMedia({ media: "print", colorScheme: "dark" });
  await expect(page.getByRole("banner")).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeHidden();
  await expect(page.getByRole("link", { name: "Cook", exact: true })).toBeHidden();
  await expect(page.getByRole("combobox", { name: "Cooking for" })).toBeHidden();
  await expect(page.locator("span", { hasText: "8 people" })).toBeVisible();
  await expect(page.getByText("Amounts changed · the original recipe is for 4")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Comments" })).toBeHidden();
  // The light theme's text colour, though the screen is dark.
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("color", "rgb(34, 26, 18)");

  // A4 across is as wide as a desktop (1024 px): the title still keeps the page's width.
  await page.setViewportSize({ width: 1050, height: 800 });
  const title = await page.getByRole("heading", { level: 1 }).boundingBox();
  expect(title?.width).toBeGreaterThan(500);

  // The PDF Chrome would save, kept with the run's results to look at.
  await page.pdf({ path: testInfo.outputPath("red-lentil-soup.pdf"), format: "A4" });
});
