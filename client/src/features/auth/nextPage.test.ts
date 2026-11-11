import { expect, test } from "vitest";
import { nextPage } from "./nextPage.ts";

test("next is the page asked for, with its query", () => {
  expect(nextPage("?next=%2Frecipes%3Fq%3Degg")).toBe("/recipes?q=egg");
});

test("without next, it's Add recipe", () => {
  expect(nextPage("")).toBe("/");
});

// Each of these would leave the site: a browser reads the first four as //evil, and the last
// three resolve their dots to //evil.com ("%252e" is "%2e", a dot, once next is read).
test.each([
  "/%09/evil",
  "/%0A/evil",
  "%2F%2Fevil",
  "/%5Cevil",
  "javascript:alert(1)",
  "/.//evil.com",
  "/x/..//evil.com",
  "/%252e//evil.com",
])("next=%s stays on the site", (next) => {
  expect(nextPage(`?next=${next}`)).toBe("/");
});
