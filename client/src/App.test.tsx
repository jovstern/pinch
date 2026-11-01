import { screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { renderApp } from "./test-utils.tsx";

test("an unknown address shows the not-found page with a way back", () => {
  renderApp("/nope");
  expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to your recipes" })).toHaveAttribute("href", "/");
});

test("the header links home and to a new recipe", () => {
  // Any page has the header; the not-found page is the one that fetches nothing.
  renderApp("/nope");
  expect(screen.getByRole("link", { name: "Pinch" })).toHaveAttribute("href", "/");
  expect(screen.getByRole("link", { name: "New recipe" })).toHaveAttribute("href", "/recipes/new");
});
