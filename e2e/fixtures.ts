import { randomInt, randomUUID } from "node:crypto";
import { test as base, expect, type BrowserContext, type Cookie } from "@playwright/test";
import { sampleRecipes } from "../server/src/db/seed.ts";

// Each test file has a user of its own (design §8.3), so the files, which run side by side, never
// see each other's recipes, imports or toasts. The file's first test signs up through the API, as
// the app does, and adds the sample recipes; the file's other tests reuse the cookie. The request
// goes to the client's address (baseURL), whose /api the preview proxies to the e2e API
// (vite.config.ts), so the cookie is the client's, as in the app: http, so not Secure.
const cookiesOfFile = new Map<string, Cookie[]>();

async function signIn(context: BrowserContext, file: string) {
  const cookies = cookiesOfFile.get(file);
  if (cookies) return context.addCookies(cookies);
  const signup = await context.request.post("/api/auth/signup", {
    data: { email: `e2e-${randomUUID()}@example.com`, password: "an e2e password", name: "Cook" },
    // The API allows 10 sign-ups a minute from one address (§8.3), fewer than the files. Each
    // file signs up from an address of its own: the preview is a proxy in front of the e2e API,
    // which trusts it (TRUST_PROXY=1 in playwright.config.ts), so the API reads this header.
    headers: { "X-Forwarded-For": `10.${String(randomInt(256))}.${String(randomInt(256))}.1` },
  });
  expect(signup.status()).toBe(201);
  // The samples, newest first as db:seed has them: the last is added first.
  for (const sample of sampleRecipes.toReversed()) {
    expect((await context.request.post("/api/recipes", { data: sample })).status()).toBe(201);
  }
  cookiesOfFile.set(file, await context.cookies());
}

// A console error or an uncaught exception in the page fails the test (quality-gates). A test
// that expects one names it with test.use: Chrome logs every 4xx answer as an error, even one the
// page shows as it should (a link pinched before is a 409, and a toast: design §4.6).
export const test = base.extend<{ expectedConsoleErrors: RegExp[] }>({
  expectedConsoleErrors: [[], { option: true }],
  page: async ({ page, expectedConsoleErrors }, use, testInfo) => {
    await signIn(page.context(), testInfo.file);
    const errors: string[] = [];
    page.on("console", (message) => {
      const expected = expectedConsoleErrors.some((pattern) => pattern.test(message.text()));
      if (message.type() === "error" && !expected) errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await use(page);
    expect(errors).toEqual([]);
  },
});

export { expect };
