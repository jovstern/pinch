import { randomInt, randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.ts";

// Sign-in (design §8.3), from a browser that isn't signed in: the fixture's cookie is cleared
// first. Chrome logs each 401 a signed-out page gets (who's signed in, the queue's preload, a
// wrong password) as an error: expected here, and only the 401s.
test.use({ expectedConsoleErrors: [/status of 401/] });

const password = "an e2e password";

async function logIn(page: Page, email: string, typed = password) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(typed);
  await page.getByRole("button", { name: "Log in" }).click();
}

// The one sign-up through the page. It comes from the preview's own address (no X-Forwarded-For),
// which no other test signs up from: one of the 10 a minute it gets, in a database of the run's own.
test("a new user signs up, logs out, and logs back in", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/recipes");
  await expect(page).toHaveURL(/\/login\?next=%2Frecipes$/);

  await page.getByRole("link", { name: "Sign up" }).click();
  const email = `e2e-${randomUUID()}@example.com`;
  await page.getByLabel("Name").fill("Noa");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
  // Back to the page it was going to.
  await expect(page).toHaveURL(/\/recipes$/);

  await page.getByRole("button", { name: "Your account" }).click();
  await expect(page.getByRole("menu")).toContainText(email);
  await page.getByRole("menuitem", { name: "Log out" }).click();
  // Plain /login: logging out leaves the page behind.
  await expect(page).toHaveURL(/\/login$/);

  await logIn(page, email, "not the password");
  await expect(page.getByRole("alert")).toHaveText("That email and password don't match.");
  await logIn(page, email);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("Pinch a recipe from a reel")).toBeVisible();
});

test("a session that ends mid-visit goes to Log in and comes back", async ({ page }) => {
  // A user whose email this test knows, signed up through the API as the fixture does, from an
  // address of its own (the sign-up limit, e2e/fixtures.ts).
  const email = `e2e-${randomUUID()}@example.com`;
  const signup = await page.request.post("/api/auth/signup", {
    data: { email, password, name: "Cook" },
    headers: { "X-Forwarded-For": `10.${String(randomInt(256))}.${String(randomInt(256))}.2` },
  });
  expect(signup.status()).toBe(201);
  // The header asks for the recipe count a second in; once it has, nothing else is on its way.
  const counted = page.waitForResponse((response) => response.url().endsWith("/api/recipes/count"));
  await page.goto("/");
  await counted;

  // The session ends (as if it expired): the next request answers 401.
  await page.context().clearCookies();
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: /^My recipes/ })
    .click();
  await expect(page).toHaveURL(/\/login\?next=%2Frecipes$/);
  await logIn(page, email);
  await expect(page).toHaveURL(/\/recipes$/);
});
