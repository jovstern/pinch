import { expect, test } from "vitest";
import { loadConfig } from "./config.ts";

test("every setting has a default for local development", () => {
  expect(loadConfig({})).toEqual({
    NODE_ENV: "development",
    TRUST_PROXY: 0,
    PORT: 3000,
    LOG_LEVEL: "info",
    MONGODB_URI: "mongodb://localhost:27017",
    DB_NAME: "pinch",
    GLOBAL_DAILY_IMPORTS: 500,
    DEV_USER_ID: "000000000000000000000001",
    EXTRACTOR: "gemini",
    PUBLIC_URL: "http://localhost:5173",
  });
});

test("PORT is read as a number", () => {
  expect(loadConfig({ PORT: "4000" }).PORT).toBe(4000);
});

test("a PORT that is not a number stops startup", () => {
  expect(() => loadConfig({ PORT: "abc" })).toThrow();
});

test("GLOBAL_DAILY_IMPORTS is read as a number, and must be at least 1", () => {
  expect(loadConfig({ GLOBAL_DAILY_IMPORTS: "50" }).GLOBAL_DAILY_IMPORTS).toBe(50);
  expect(() => loadConfig({ GLOBAL_DAILY_IMPORTS: "0" })).toThrow();
  expect(() => loadConfig({ GLOBAL_DAILY_IMPORTS: "2.5" })).toThrow();
});

test("a DEV_USER_ID that is not an ObjectId stops startup", () => {
  expect(() => loadConfig({ DEV_USER_ID: "alice" })).toThrow();
});
