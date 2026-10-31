import { expect, test } from "vitest";
import { loadConfig } from "./config.ts";

test("every setting has a default for local development", () => {
  expect(loadConfig({})).toEqual({
    PORT: 3000,
    LOG_LEVEL: "info",
    MONGODB_URI: "mongodb://localhost:27017",
    DB_NAME: "pinch",
    DEV_USER_ID: "000000000000000000000001",
  });
});

test("PORT is read as a number", () => {
  expect(loadConfig({ PORT: "4000" }).PORT).toBe(4000);
});

test("a PORT that is not a number stops startup", () => {
  expect(() => loadConfig({ PORT: "abc" })).toThrow();
});

test("a DEV_USER_ID that is not an ObjectId stops startup", () => {
  expect(() => loadConfig({ DEV_USER_ID: "alice" })).toThrow();
});
