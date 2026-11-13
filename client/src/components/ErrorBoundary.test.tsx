import { render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { inHebrew } from "../test-utils.tsx";
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

  const alert = screen.getByRole("alert");
  expect(
    within(alert).getByRole("heading", { level: 1, name: "This page didn't load" }),
  ).toBeInTheDocument();
  expect(
    within(alert).getByText("Check your connection, then reload the page."),
  ).toBeInTheDocument();
  expect(within(alert).getByRole("button", { name: "Reload" })).toBeInTheDocument();
  vi.restoreAllMocks();
});

test("in Hebrew, the page that didn't load says so in Hebrew", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  await inHebrew();
  render(
    <ErrorBoundary>
      <Broken />
    </ErrorBoundary>,
  );

  expect(screen.getByRole("heading", { level: 1, name: "הדף לא נטען" })).toBeInTheDocument();
  expect(screen.getByText("כדאי לבדוק את החיבור ולטעון את הדף מחדש.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "לטעון מחדש" })).toBeInTheDocument();
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
