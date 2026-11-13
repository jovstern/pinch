import { Search } from "lucide-react";
import { useId, useState, type RefObject } from "react";
import { Input } from "../../components/ui/Input.tsx";
import { NativeSelect } from "../../components/ui/NativeSelect.tsx";
import { sortChoices } from "./filterLabels.ts";
import { FiltersButton } from "./FiltersButton.tsx";
import type { RecipeFilters } from "./recipeQueries.ts";
import { TagChips } from "./TagChips.tsx";

type ListFiltersProps = {
  filters: RecipeFilters;
  onChange: (filters: RecipeFilters) => void;
  onChangeTags: (tags: string[]) => void;
  // The page focuses the search box after a Clear (RecipeListPage).
  searchRef: RefObject<HTMLInputElement | null>;
};

// The search and, on a phone, the Filters button and the common tags, from 1024 px Sort, above
// the grid (design §7, §14). A search runs on Enter (the keyboard's Search key), not as you
// type: one request per search rather than one per pause, and no timer. A tag applies as it's
// ticked.
export function ListFilters({ filters, onChange, onChangeTags, searchRef }: ListFiltersProps) {
  const searchId = useId();
  const sorts = sortChoices(filters.q !== "");
  // What's typed. When the address's search changes from elsewhere (Clear all, the Pinch link),
  // the box takes it: React docs, "Storing information from previous renders".
  const [text, setText] = useState(filters.q);
  const [prevQ, setPrevQ] = useState(filters.q);
  if (filters.q !== prevQ) {
    setPrevQ(filters.q);
    setText(filters.q);
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
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={searchRef}
            id={searchId}
            type="search"
            enterKeyHint="search"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              // Emptied (Escape, or deleting the words): the search is over, without
              // an Enter, so the box and the address never disagree.
              if (event.target.value === "" && filters.q !== "") onChange({ ...filters, q: "" });
            }}
            placeholder="Search recipes"
            // No native ✕: the browser's own, unlike the rest of Pinch (Escape still empties it).
            className="ps-9 [&::-webkit-search-cancel-button]:appearance-none"
          />
        </form>
        {/* From 1024 px the Filters are a panel beside the grid (FiltersPanel), and the
            common tags are among them; Sort is here, as the wireframe has it. On a phone Sort is
            in the Filters sheet. */}
        <div className="lg:hidden">
          <FiltersButton filters={filters} onChange={onChange} />
        </div>
        {/* No visible label (the user's ask, 2026-11-10): the choices name themselves (Newest,
            Quickest, A–Z); the name is for screen readers. */}
        <div className="max-lg:hidden">
          <NativeSelect
            aria-label="Sort"
            value={filters.sort}
            onChange={(event) => {
              const picked = sorts.find(({ value }) => value === event.target.value);
              onChange({ ...filters, sort: picked?.value ?? "" });
            }}
          >
            {sorts.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="lg:hidden">
        <TagChips selected={filters.tags} onChange={onChangeTags} />
      </div>
    </>
  );
}
