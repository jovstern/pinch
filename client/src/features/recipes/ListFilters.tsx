import { Search } from "lucide-react";
import { useId, useState, type RefObject } from "react";
import { Input } from "../../components/ui/Input.tsx";
import { FiltersSheet } from "./FiltersSheet.tsx";
import type { RecipeFilters } from "./recipeQueries.ts";
import { TagChips } from "./TagChips.tsx";

type ListFiltersProps = {
  filters: RecipeFilters;
  onChange: (filters: RecipeFilters) => void;
  // The page focuses the search box after a Clear (RecipeListPage).
  searchRef: RefObject<HTMLInputElement | null>;
};

// The search and, on a phone, the Filters button and the common tags, above the grid (design §7,
// §14). A search runs on Enter (the keyboard's Search key), not as you type: one request per
// search rather than one per pause, and no timer. A tag applies as it's ticked.
export function ListFilters({ filters, onChange, searchRef }: ListFiltersProps) {
  const searchId = useId();
  // What's typed. When the address's search changes from elsewhere (Clear all, the Pinch link),
  // the box takes it: React docs, "Storing information from previous renders".
  const [text, setText] = useState(filters.q);
  const [prevQ, setPrevQ] = useState(filters.q);
  if (filters.q !== prevQ) {
    setPrevQ(filters.q);
    setText(filters.q);
  }

  function changeTags(tags: string[]) {
    onChange({ ...filters, tags });
  }

  return (
    <>
      <div className="flex gap-2">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            onChange({ ...filters, q: text.trim() });
          }}
          className="relative flex-1"
        >
          <label htmlFor={searchId} className="sr-only">
            Search your recipes
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground"
          />
          <Input
            ref={searchRef}
            id={searchId}
            type="search"
            enterKeyHint="search"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
            placeholder="Title or ingredient"
            className="pl-9"
          />
        </form>
        {/* From 1024 px the Filters are a panel beside the grid (FiltersPanel), and the
            common tags are among them. */}
        <div className="lg:hidden">
          <FiltersSheet selected={filters.tags} onChange={changeTags} />
        </div>
      </div>
      <div className="lg:hidden">
        <TagChips selected={filters.tags} onChange={changeTags} />
      </div>
    </>
  );
}
