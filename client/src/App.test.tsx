import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { App } from "./App.tsx";

test("shows the app name as the page heading", () => {
  render(<App />);
  expect(screen.getByRole("heading", { level: 1, name: "Pinch" })).toBeInTheDocument();
});
