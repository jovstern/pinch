import { lazy, Suspense, type ComponentProps } from "react";

// The Filters panel (from 1024 px) is its own chunk, with its groups (shared with the phone's
// sheet): every page's first load carried it, and the editor's went over its budget
// (docs/metrics/m08.md, Method note). The grid, the page's LCP, doesn't wait for it.
const FiltersPanel = lazy(async () => ({
  default: (await import("./FiltersPanel.tsx")).FiltersPanel,
}));

export function LazyFiltersPanel(props: ComponentProps<typeof FiltersPanel>) {
  return (
    // The panel's width, so the grid beside it doesn't move when it arrives.
    <Suspense fallback={<div className="hidden w-60 shrink-0 lg:block" />}>
      <FiltersPanel {...props} />
    </Suspense>
  );
}
