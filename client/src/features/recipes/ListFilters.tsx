import { useId, useState } from "react";
import { Button } from "../../components/ui/Button.tsx";
import { Input } from "../../components/ui/Input.tsx";
import type { RecipeFilters } from "./recipeQueries.ts";
import { TagPicker } from "./TagPicker.tsx";

type ListFiltersProps = {
  filters: RecipeFilters;
  onChange: (filters: RecipeFilters) => void;
};

// Search and tag filters above the list (design §7, §14). A search runs on Enter or Search, so
// each one is a single request; a tag applies as it's ticked.
export function ListFilters({ filters, onChange }: ListFiltersProps) {
  const searchId = useId();
  // What's typed. When the address's search changes from elsewhere (Clear, the Pinch link), the
  // box takes it: React docs, "Storing information from previous renders".
  const [text, setText] = useState(filters.q);
  const [prevQ, setPrevQ] = useState(filters.q);
  if (filters.q !== prevQ) {
    setPrevQ(filters.q);
    setText(filters.q);
  }
  // Folded unless the address already has tags: 35 chips would push the list off a phone's
  // screen. Read once, so unticking the last tag doesn't fold it under the user's finger.
  const [openAtFirst] = useState(filters.tags.length > 0);
  const count = filters.tags.length;

  return (
    <div className="mt-6">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          onChange({ ...filters, q: text.trim() });
        }}
        className="flex gap-2"
      >
        <label htmlFor={searchId} className="sr-only">
          Search your recipes
        </label>
        <Input
          id={searchId}
          type="search"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
          placeholder="Title or ingredient"
        />
        <Button type="submit" variant="secondary" className="shrink-0">
          Search
        </Button>
      </form>

      <details open={openAtFirst} className="mt-3">
        {/* Padding, not flex, for its 44 px: flex would hide the open/closed triangle. */}
        <summary className="cursor-pointer py-2.5 font-semibold">
          {count === 0 ? "Filter by tags" : `Filter by tags (${String(count)})`}
        </summary>
        <TagPicker
          legend="Filter by tags"
          legendClassName="sr-only"
          selected={filters.tags}
          onChange={(tags) => {
            onChange({ ...filters, tags });
          }}
        />
      </details>
    </div>
  );
}
