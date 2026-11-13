import { expect, scan, test } from "./fixtures.ts";

// A page whose strings can't be fetched (design §16.3): offline mid-load, or a deploy that replaced
// their chunk. It says so in both languages, instead of the app, and Reload brings the app back.
// Chrome logs the blocked request as an error.
test.use({ expectedConsoleErrors: [/net::ERR_FAILED/] });

test("without its strings, the page says it didn't load, and Reload brings it back", async ({
  page,
}) => {
  await page.route(/\/assets\/en-[\w-]+\.js$/, (route) => route.abort("failed"));
  await page.goto("/recipes");
  await expect(
    page.getByRole("heading", { level: 1, name: /Pinch didn't load\. .*Pinch לא נטען/ }),
  ).toBeVisible();
  expect((await scan(page)).violations).toEqual([]);

  await page.unrouteAll();
  await page.getByRole("button", { name: /Reload/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "My recipes" })).toBeVisible();
});
