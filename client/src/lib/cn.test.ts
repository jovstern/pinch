import { expect, test } from "vitest";
import { cn } from "./cn.ts";

test("a class passed in replaces the component's own for the same property", () => {
  expect(cn("h-11 px-4 bg-primary", "px-3 bg-secondary")).toBe("h-11 px-3 bg-secondary");
});

test("Pinch's own radius names are replaced too", () => {
  expect(cn("rounded-control", "rounded-full")).toBe("rounded-full");
});
