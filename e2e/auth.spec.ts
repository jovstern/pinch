import { randomInt, randomUUID } from "node:crypto";
import type { APIRequestContext, Page } from "@playwright/test";
import { expect, newVisitor, test } from "./fixtures.ts";

// Sign-in (design §8.3). Chrome logs each 401 as a console error: here a wrong password and a
// session ended on purpose answer 401, so those are expected. A signed-out page gets none (me
// answers null, and the queue isn't preloaded without the signed-in hint). What must
// not happen is checked by the answers themselves (unauthorized, below): once signed in, nothing
// outside /api/auth/* answers 401.
test.use({ expectedConsoleErrors: [/status of 401/] });

const password = "an e2e password";

async function logIn(page: Page, email: string, typed = password) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(typed);
  await page.getByRole("button", { name: "Log in" }).click();
}

// The app's own requests (not /api/auth/*) answered 401 from now on; the test empties it before
// each sign-in, then expects it to stay empty.
function unauthorized(page: Page) {
  const urls: string[] = [];
  page.on("response", (response) => {
    const { pathname } = new URL(response.url());
    if (response.status() === 401 && !pathname.startsWith("/api/auth/")) urls.push(pathname);
  });
  return urls;
}

// The header asks for the recipe count a second in: the last of a page's first requests.
function counted(page: Page) {
  return page.waitForResponse((response) => response.url().endsWith("/api/recipes/count"));
}

// A user whose email the test knows, signed up through the API as the fixture does, from an
// address of its own (the sign-up limit, e2e/fixtures.ts). request has cookies of its own, so the
// page stays signed in as it was.
async function signUpUser(request: APIRequestContext) {
  const email = `e2e-${randomUUID()}@example.com`;
  const signup = await request.post("/api/auth/signup", {
    data: { email, password, name: "Cook" },
    headers: { "X-Forwarded-For": `10.${String(randomInt(256))}.${String(randomInt(256))}.2` },
  });
  expect(signup.status()).toBe(201);
  return email;
}

// The one sign-up through the page. It comes from the preview's own address (no X-Forwarded-For),
// which no other test signs up from: one of the 10 a minute it gets, in a database of the run's own.
test("a new user signs up, logs out, and logs back in", async ({ page }) => {
  const seen = unauthorized(page);
  await newVisitor(page);
  await page.goto("/recipes");
  await expect(page).toHaveURL(/\/login\?next=%2Frecipes$/);

  await page.getByRole("link", { name: "Sign up" }).click();
  const email = `e2e-${randomUUID()}@example.com`;
  await page.getByLabel("Name").fill("Noa");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  seen.length = 0;
  let count = counted(page);
  await page.getByRole("button", { name: "Sign up" }).click();
  // Back to the page it was going to, as a new page whose requests all carry the new cookie.
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.getByRole("heading", { name: "No recipes yet" })).toBeVisible();
  await count;
  expect(seen).toEqual([]);

  await page.getByRole("button", { name: "Your account" }).click();
  await expect(page.getByRole("menu")).toContainText(email);
  await page.getByRole("menuitem", { name: "Log out" }).click();
  // Plain /login: logging out leaves the page behind.
  await expect(page).toHaveURL(/\/login$/);

  await logIn(page, email, "not the password");
  await expect(page.getByRole("alert")).toHaveText("That email and password don't match.");
  seen.length = 0;
  count = counted(page);
  await logIn(page, email);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("Pinch a recipe from a reel")).toBeVisible();
  await count;
  expect(seen).toEqual([]);
});

test("a session that ends mid-visit goes to Log in and comes back", async ({ page, request }) => {
  const email = await signUpUser(request);
  await newVisitor(page);
  await page.goto("/login");
  // Once the count is in, nothing else is on its way that a cleared cookie would turn into a 401.
  const count = counted(page);
  await logIn(page, email);
  await count;

  // The session ends (as if it expired): the next request answers 401.
  await newVisitor(page);
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: /^My recipes/ })
    .click();
  await expect(page).toHaveURL(/\/login\?next=%2Frecipes$/);
  await logIn(page, email);
  await expect(page).toHaveURL(/\/recipes$/);
});

test("after Log out, the next user sees nothing of the last one's", async ({ page, request }) => {
  // The file's user has the sample recipes (e2e/fixtures.ts), and a draft ready, with its toast.
  await page.goto("/");
  const url = "https://www.instagram.com/reel/e2e-auth-last-user/";
  await page.getByLabel("Pinch a recipe from a reel").fill(url);
  await page.getByRole("button", { name: "Pinch it" }).click();
  const item = page.getByRole("listitem").filter({ hasText: "e2e-auth-last-user" });
  await expect(item.getByText("Ready to review")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/is ready to review/)).toBeVisible();

  await page.getByRole("button", { name: "Your account" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  const next = await signUpUser(request);
  const count = counted(page);
  await logIn(page, next);
  await expect(page).toHaveURL(/\/$/);
  await count;
  await expect(page.getByText(/e2e-auth-last-user|ready to review/i)).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: /^My recipes/ })
    .click();
  await expect(page.getByRole("heading", { name: "No recipes yet" })).toBeVisible();
  await expect(page.getByText("Red lentil soup")).toHaveCount(0);
});

// The e2e API has no Google settings (design §8.3), so Log in offers no Google button. A real
// Google sign-in isn't tested: it needs Google.
test("without Google's settings, Log in has no Google button", async ({ page }) => {
  await newVisitor(page);
  const providers = page.waitForResponse((response) =>
    response.url().endsWith("/api/auth/providers"),
  );
  await page.goto("/login");
  expect(await (await providers).json()).toEqual({ google: false });
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue with Google" })).toHaveCount(0);
});
