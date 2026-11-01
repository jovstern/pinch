import { expect, test } from "./fixtures.ts";

// M2's whole flow, and its demo (pr-demo skill): the pauses let a viewer follow the video. It
// starts and ends with an empty list, so it's the only e2e test that writes recipes: files run
// in parallel against one database.
test("write a recipe, find it in the list, edit it, delete it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Add your first recipe" }).click();

  await page.getByLabel("Title").fill("Shakshuka");
  await page.getByLabel("Serves").fill("2");
  await page.getByLabel("Amount").fill("4");
  await page.getByLabel("Ingredient", { exact: true }).fill("eggs");
  await page.getByRole("button", { name: "Add an ingredient" }).click();
  const second = page.getByRole("group", { name: "Ingredient 2" });
  await second.getByLabel("Amount").fill("400");
  await second.getByLabel("Unit").fill("g");
  await second.getByLabel("Ingredient", { exact: true }).fill("tomatoes");
  await page.getByRole("textbox", { name: "Step 1" }).fill("Simmer the tomatoes.");
  await page.getByRole("button", { name: "Add a step" }).click();
  await page.getByRole("textbox", { name: "Step 2" }).fill("Crack in the eggs and cover.");
  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Shakshuka" })).toBeVisible();
  await expect(page.getByText("400 g tomatoes")).toBeVisible();
  await page.waitForTimeout(1000);

  await page.getByRole("link", { name: "Pinch" }).click();
  await expect(page.getByRole("link", { name: /Shakshuka/ })).toBeVisible();
  await page.waitForTimeout(1000);
  await page.getByRole("link", { name: /Shakshuka/ }).click();

  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Title").fill("Green shakshuka");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Green shakshuka" })).toBeVisible();
  await page.waitForTimeout(1000);

  await page.getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete this recipe?" });
  await page.waitForTimeout(500);
  await dialog.getByRole("button", { name: "Delete" }).click();

  await expect(page.getByRole("link", { name: "Add your first recipe" })).toBeVisible();
  await page.waitForTimeout(1000);
});
