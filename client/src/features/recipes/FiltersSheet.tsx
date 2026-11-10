import { useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button.tsx";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "../../components/ui/Sheet.tsx";
import { FilterChoices } from "./FilterChoices.tsx";
import { recipeListQuery, withoutFilters, type RecipeFilters } from "./recipeQueries.ts";

type FiltersSheetProps = {
  filters: RecipeFilters;
  onChange: (filters: RecipeFilters) => void;
  onClose: () => void;
  // Where focus goes when it closes: the Filters button (ListFilters). The sheet has no Trigger
  // of its own (it loads on the first press), so Radix wouldn't know where to put it back.
  focusOnClose: () => void;
};

// The Filters sheet, on a phone (design §14; FiltersPanel from 1024 px). Every choice applies as
// it's picked, so the grid behind is already filtered when it closes: Show N recipes only closes
// it, and says how many are left before it does.
export function FiltersSheet({ filters, onChange, onClose, focusOnClose }: FiltersSheetProps) {
  // The page's own list, from the cache: no second request.
  const { data, hasNextPage, isPlaceholderData } = useInfiniteQuery(recipeListQuery(filters));
  const count = data?.pages.reduce((sum, page) => sum + page.items.length, 0);
  return (
    // Open while it's on the page; closing (Show recipes, ✕, Escape) asks to be taken away.
    <Sheet
      open
      onOpenChange={(opening) => {
        if (!opening) onClose();
      }}
    >
      {/* No description: the title and the groups' legends say it all. */}
      <SheetContent
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          focusOnClose();
        }}
      >
        <SheetTitle className="px-4 pt-5 pb-2 font-sans text-lg font-semibold">Filters</SheetTitle>
        <div className="overflow-y-auto px-4 pt-4 pb-4">
          <FilterChoices filters={filters} onChange={onChange} withSort look="chips" />
        </div>
        {/* Above the phone's home bar, where it has one. */}
        <div className="flex gap-3 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => {
              onChange(withoutFilters(filters));
            }}
          >
            Clear
          </Button>
          <SheetClose asChild>
            <Button className="flex-2">
              {count === undefined || isPlaceholderData
                ? "Show recipes"
                : showCount(count, hasNextPage)}
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// "Show 4 recipes". The list comes a page at a time, so a full page with more after it says
// "50+" rather than count them all (design §7).
function showCount(count: number, more: boolean) {
  if (more) return `Show ${String(count)}+ recipes`;
  return count === 1 ? "Show 1 recipe" : `Show ${String(count)} recipes`;
}
