import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, test } from "vitest";
import { Breadcrumb } from "./Breadcrumb.tsx";

function renderBreadcrumb(links: { label: string; to: string }[], page: string) {
  render(
    <MemoryRouter>
      <Breadcrumb links={links} page={page} />
    </MemoryRouter>,
  );
  return screen.getByRole("navigation", { name: "Breadcrumb" });
}

test("links lead back, and the page is named, not linked", () => {
  const nav = renderBreadcrumb([{ label: "My recipes", to: "/recipes" }], "Omelette");

  expect(within(nav).getByRole("link", { name: "My recipes" })).toHaveAttribute("href", "/recipes");
  expect(within(nav).getByText("Omelette")).toHaveAttribute("aria-current", "page");
  expect(within(nav).getAllByRole("link")).toHaveLength(1);
});

// jsdom has no layout, so this checks the rule's classes: only the title may shrink (and be cut).
test("only the title gives way: never the first crumb, nor the page after the title", () => {
  const nav = renderBreadcrumb(
    [
      { label: "My recipes", to: "/recipes" },
      { label: "A very long title", to: "/recipes/1" },
    ],
    "Cook",
  );

  expect(within(nav).getByRole("link", { name: "My recipes" }).parentElement).toHaveClass(
    "shrink-0",
  );
  expect(within(nav).getByRole("link", { name: "A very long title" }).parentElement).toHaveClass(
    "min-w-0",
  );
  expect(within(nav).getByText("Cook").parentElement).toHaveClass("shrink-0");
});
