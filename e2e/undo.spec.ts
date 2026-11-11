import { expect, test } from "./fixtures.ts";

// Undo in the toasts (design D27): a delete is kept a while, so Undo brings it back, and Pinch
// it's Undo cancels the import. Each test writes its own recipe or link, as the other files do:
// they run in parallel against one database.
test("delete a recipe, then Undo: it's back in My recipes", async ({ page }) => {
  const created = await page.request.post("/api/recipes", {
    data: { title: "Undo dumplings", ingredients: [{ name: "flour" }], steps: ["Fold."], tags: [] },
  });
  const { id } = (await created.json()) as { id: string };
  await page.goto(`/recipes/${id}`);

  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Delete…" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "My recipes" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Undo dumplings/ })).toHaveCount(0);
  await page.waitForTimeout(500);
  // As below: other files' toasts may be in front, so Alt+T spreads them out first.
  await page.keyboard.press("Alt+KeyT");
  await page
    .getByRole("listitem")
    .filter({ hasText: "Deleted Undo dumplings" })
    .getByRole("button", { name: "Undo" })
    .click();

  await expect(page.getByRole("link", { name: /Undo dumplings/ })).toBeVisible();
  await expect(page.getByText("Back in My recipes")).toBeVisible();
  await page.waitForTimeout(1000);
  await page.keyboard.press("Alt+KeyT");
  await page
    .getByRole("listitem")
    .filter({ hasText: "Back in My recipes" })
    .getByRole("button", { name: "View" })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Undo dumplings" })).toBeVisible();

  await page.request.delete(`/api/recipes/${id}`);
});

test("Pinch it, then Undo: the link leaves the queue", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Pinch a recipe from a reel").fill("https://youtu.be/e2e-undo");
  await page.getByRole("button", { name: "Pinch it" }).click();

  const link = page.getByRole("listitem").filter({ hasText: "youtu.be/e2e-undo" });
  await expect(link).toBeVisible();
  await page.waitForTimeout(500);
  // Other files' imports share the queue (one user), and their "ready" toasts can land in front of
  // this one: Alt+T (Sonner's key) moves focus to the toasts, which spreads them out, and Undo is
  // this toast's.
  await page.keyboard.press("Alt+KeyT");
  await page
    .getByRole("listitem")
    .filter({ hasText: "Pinching it" })
    .getByRole("button", { name: "Undo" })
    .click();

  // The worker never saves a cancelled import's draft: workLoop.test.ts.
  await expect(page.getByText("Cancelled")).toBeVisible();
  await expect(link).toHaveCount(0);
});
