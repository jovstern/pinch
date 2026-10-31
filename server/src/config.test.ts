import { expect, test } from "vitest";
import { loadConfig } from "./config.ts";

test("PORT and LOG_LEVEL have defaults", () => {
  expect(loadConfig({})).toEqual({ PORT: 3000, LOG_LEVEL: "info" });
});

test("PORT is read as a number", () => {
  expect(loadConfig({ PORT: "4000" }).PORT).toBe(4000);
});

test("a PORT that is not a number stops startup", () => {
  expect(() => loadConfig({ PORT: "abc" })).toThrow();
});
