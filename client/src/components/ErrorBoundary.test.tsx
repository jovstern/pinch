import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary.tsx";

function Broken(): never {
  throw new Error("chunk failed to load");
}

test("a screen that throws shows a way forward, not a blank page", () => {
  // React reports the caught error to the console; that's expected here.
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  render(
    <ErrorBoundary>
      <Broken />
    </ErrorBoundary>,
  );

  expect(screen.getByRole("heading", { name: "This page didn't load" })).toBeInTheDocument();
  vi.restoreAllMocks();
});
