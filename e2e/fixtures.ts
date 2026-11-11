import { test as base, expect } from "@playwright/test";

// A console error or an uncaught exception in the page fails the test (quality-gates). A test
// that expects one names it with test.use: Chrome logs every 4xx answer as an error, even one the
// page shows as it should (a link pinched before is a 409, and a toast: design §4.6).
export const test = base.extend<{ expectedConsoleErrors: RegExp[] }>({
  expectedConsoleErrors: [[], { option: true }],
  page: async ({ page, expectedConsoleErrors }, use) => {
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
