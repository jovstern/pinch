import { useId } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const headingId = useId();
  return (
    // Its own column, held in view as the grid scrolls (sticky), and no taller than the screen
    // under the header: a long list of tags scrolls inside it rather than lengthening the page.
    // 8rem: the header (~5rem) and main's top padding (2rem) above it, and a gap below, so it fits
    // before the page has scrolled too. The padding keeps its focus rings clear of its edges.
    <aside
      aria-labelledby={headingId}
      className="sticky top-4 -mx-1.5 hidden max-h-[calc(100dvh-8rem)] w-63 shrink-0 self-start overflow-y-auto px-1.5 pb-1.5 lg:block"
    >
      <div className="mb-4 flex min-h-11 items-center justify-between">
        <h2 id={headingId} className="font-sans text-lg font-semibold">
          {t("filters.filters")}
        </h2>
        {filtered && (
          <Button
            type="button"
            variant="ghost"
            className="px-2 text-sm underline underline-offset-4"
            onClick={onClear}
          >
            {t("filters.clear")}
          </Button>
        )}
      </div>
      <FilterChoices filters={filters} onChange={onChange} withSort={false} look="list" />
    </aside>
  );
}
