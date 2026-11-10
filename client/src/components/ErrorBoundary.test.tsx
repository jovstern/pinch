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

test("a part of a page that throws shows its fallback, and the rest stays", () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  render(
    <>
      <p>What was typed</p>
      <ErrorBoundary fallback={null}>
        <Broken />
      </ErrorBoundary>
    </>,
  );

  expect(screen.getByText("What was typed")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  vi.restoreAllMocks();
});
