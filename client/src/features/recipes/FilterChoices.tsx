import { useTranslation } from "react-i18next";
import { ChoiceGroup } from "./ChoiceGroup.tsx";
import { choicesOf, sortChoices, sourceNames, timeNames } from "./filterLabels.ts";
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
  const { t } = useTranslation();
  const { sources } = filters;
  return (
    <div className="grid gap-4">
      {withSort && (
        <ChoiceGroup
          legend={t("filters.sort")}
          type="radio"
          choices={sortChoices(filters.q !== "")}
          selected={[filters.sort]}
          onChange={(sort) => {
            onChange({ ...filters, sort });
          }}
          look={look}
        />
      )}
      <ChoiceGroup
        legend={t("filters.time")}
        type="radio"
        choices={[{ value: "", label: t("filters.anyTime") }, ...choicesOf(timeNames())]}
        selected={[filters.time]}
        onChange={(time) => {
          onChange({ ...filters, time });
        }}
        look={look}
      />
      <ChoiceGroup
        legend={t("filters.source")}
        type="checkbox"
        choices={choicesOf(sourceNames())}
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
        legend={t("filters.byTags")}
        selected={filters.tags}
        onChange={(tags) => {
          onChange({ ...filters, tags });
        }}
        look={look}
      />
    </div>
  );
}
