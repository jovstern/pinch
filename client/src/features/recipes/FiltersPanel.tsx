import { useId } from "react";
import { Button } from "../../components/ui/Button.tsx";
import { FilterChoices } from "./FilterChoices.tsx";
import type { RecipeFilters } from "./recipeQueries.ts";

type FiltersPanelProps = {
  filters: RecipeFilters;
  onChange: (filters: RecipeFilters) => void;
  // Shown while a filter is on; it goes away with them, so the page moves focus (RecipeListPage).
  filtered: boolean;
  onClear: () => void;
};

// The Filters from 1024 px: always open on the left, the same groups as the phone's sheet but
// Sort, which sits beside the search, as radios and checkboxes (design §14). The grid updates as
// they're picked.
export function FiltersPanel({ filters, onChange, filtered, onClear }: FiltersPanelProps) {
  const headingId = useId();
  return (
    <aside aria-labelledby={headingId} className="hidden w-60 shrink-0 lg:block">
      <div className="mb-4 flex min-h-11 items-center justify-between">
        <h2 id={headingId} className="font-sans text-lg font-semibold">
          Filters
        </h2>
        {filtered && (
          <Button
            type="button"
            variant="ghost"
            className="px-2 text-sm underline underline-offset-4"
            onClick={onClear}
          >
            Clear
          </Button>
        )}
      </div>
      <FilterChoices filters={filters} onChange={onChange} withSort={false} look="list" />
    </aside>
  );
}
