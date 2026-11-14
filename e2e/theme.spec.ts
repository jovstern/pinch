import { expect, scan, test } from "./fixtures.ts";

// The theme (design §14): the system's by default; Light or Dark from the avatar's menu, kept on
// this device (localStorage, which each test's new browser context starts without).

test("the theme follows the system, then a choice in the menu, kept over a reload", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/recipes");
  const html = page.locator("html");
  const logo = page.getByRole("img", { name: "Pinch" });
  await expect(page.getByRole("heading", { level: 1, name: "My recipes" })).toBeVisible();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(23, 19, 15)");
  await expect(logo).toHaveAttribute("src", "/logo-dark.svg");

  await page.getByRole("button", { name: "Your account" }).click();
  await page.getByRole("menuitemradio", { name: "Light" }).click();
  await expect(html).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(251, 248, 242)");
  await expect(logo).toHaveAttribute("src", "/logo.svg");

  // index.html's script reads the choice before the first paint, the browser's bar too.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "My recipes" })).toBeVisible();
  await expect(html).toHaveAttribute("data-theme", "light");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#fbf8f2");
  await expect(logo).toHaveAttribute("src", "/logo.svg");

  await page.getByRole("button", { name: "Your account" }).click();
  await page.getByRole("menuitemradio", { name: "System" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#17130f");
});

// The menu open, in each theme chosen against the system's other one: the new radio group's
// colours and the page around it pass in both.
test("the avatar's menu, open, has no accessibility violations in either theme", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/recipes");
  await expect(page.getByRole("link", { name: /Red lentil soup/ })).toBeVisible();
  await page.getByRole("button", { name: "Your account" }).click();

  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect((await scan(page)).violations).toEqual([]);

  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByRole("menuitemradio", { name: "Light" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect((await scan(page)).violations).toEqual([]);
});

// Sonner draws its own colours too (the close button's hover): they follow the chosen theme, not
// the system's.
test("the toasts follow the theme chosen, against the system's", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: "Your account" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await page.keyboard.press("Escape");
  await page
    .getByLabel("Pinch a recipe from a reel")
    .fill("https://www.instagram.com/reel/e2e-theme-toast/");
  await page.getByRole("button", { name: "Pinch it" }).click();
  await expect(page.locator("[data-sonner-toaster]")).toHaveAttribute("data-sonner-theme", "dark");
});
