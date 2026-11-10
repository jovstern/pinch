import { ChoiceGroup } from "./ChoiceGroup.tsx";
import { choicesOf, sortNames, sourceNames, timeNames } from "./filterLabels.ts";
import type { RecipeFilters } from "./recipeQueries.ts";
import { TagPicker } from "./TagPicker.tsx";

type FilterChoicesProps = {
  filters: RecipeFilters;
  onChange: (filters: RecipeFilters) => void;
  // On a phone Sort is in the sheet; from 1024 px it sits beside the search (ListFilters).
  withSort: boolean;
  look: "chips" | "list";
};

// The Filters' groups (design §14): Sort, Time and Source, then the tag facets. Each applies as
// it's picked, so the grid behind is already filtered.
export function FilterChoices({ filters, onChange, withSort, look }: FilterChoicesProps) {
  const { sources } = filters;
  return (
    <div className="grid gap-4">
      {withSort && (
        <ChoiceGroup
          legend="Sort"
          type="radio"
          choices={choicesOf(sortNames)}
          selected={[filters.sort]}
          onChange={(sort) => {
            onChange({ ...filters, sort });
          }}
          look={look}
        />
      )}
      <ChoiceGroup
        legend="Time"
        type="radio"
        choices={[{ value: "", label: "Any" }, ...choicesOf(timeNames)]}
        selected={[filters.time]}
        onChange={(time) => {
          onChange({ ...filters, time });
        }}
        look={look}
      />
      <ChoiceGroup
        legend="Source"
        type="checkbox"
        choices={choicesOf(sourceNames)}
        selected={sources}
        onChange={(source, on) => {
          onChange({
            ...filters,
            sources: on ? [...sources, source] : sources.filter((other) => other !== source),
          });
        }}
        look={look}
      />
      <TagPicker
        legend="Filter by tags"
        selected={filters.tags}
        onChange={(tags) => {
          onChange({ ...filters, tags });
        }}
        look={look}
      />
    </div>
  );
}
