import { SlidersHorizontal } from "lucide-react";
import { lazy, Suspense, useRef, useState } from "react";
import { ErrorBoundary } from "../../components/ErrorBoundary.tsx";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { appliedFilters } from "./filterLabels.ts";
import type { RecipeFilters } from "./recipeQueries.ts";

// The sheet (Radix's Dialog: its focus trap, scroll lock and the rest, ~12 kB) is its own chunk,
// fetched on the first press, as DeleteRecipeDialog is: in My recipes' first load it put every
// page over its JS budget, for a button only a phone shows (docs/metrics/m08.md). On a slow link
// the first press waits a moment for it, as Add tag's and the editor's questions do. No busy cue
// on the button meanwhile, unlike ⋯: it can't tell when the sheet has arrived (the sheet opens
// over it), and a cue kept while it's open dims it behind the sheet, which axe counts as contrast.
const FiltersSheet = lazy(async () => ({
  default: (await import("./FiltersSheet.tsx")).FiltersSheet,
}));

type FiltersButtonProps = {
  filters: RecipeFilters;
  onChange: (filters: RecipeFilters) => void;
};

// The Filters button, on a phone (design §14), and the sheet it opens.
export function FiltersButton({ filters, onChange }: FiltersButtonProps) {
  // Open while it's on the page: closing takes it away.
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // The filters on, not the order: Sort is in the sheet but narrows nothing.
  const count = appliedFilters(filters).length;
  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="shrink-0 px-3"
        onClick={() => {
          setOpen(true);
        }}
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Filters
        {/* "Filters 2 applied" to a screen reader (as the Add recipe tab's count). */}
        {count > 0 && (
          <>
            {" "}
            <Badge className="min-w-6 px-1.5 py-0 text-xs font-semibold">{count}</Badge>{" "}
            <span className="sr-only">applied</span>
          </>
        )}
      </Button>
      {/* A sheet that won't load (offline, a new deploy) just doesn't open: caught here, not by
          the page's ErrorBoundary, which would replace My recipes for a sheet. */}
      {open && (
        <ErrorBoundary fallback={null}>
          <Suspense>
            <FiltersSheet
              filters={filters}
              onChange={onChange}
              onClose={() => {
                setOpen(false);
              }}
              focusOnClose={() => buttonRef.current?.focus()}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  );
}
