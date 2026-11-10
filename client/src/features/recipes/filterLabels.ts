import type { ListSource, RecipeSort, TimeLimit } from "@pinch/shared";
import { platformNames } from "../../lib/platformNames.ts";
import type { RecipeFilters } from "./recipeQueries.ts";
import { tagLabel } from "./tagLabels.ts";

// My recipes' Sort and Filters as the wireframe names them (docs/ux/wireframes/recipes.html), in
// the order shown. The record types make every value need a name.
export const sortNames: Record<RecipeSort, string> = {
  newest: "Newest",
  quickest: "Quickest",
  az: "A–Z",
};

export const timeNames: Record<TimeLimit, string> = {
  "15": "15 min or less",
  "30": "30 min or less",
  "60": "1 hour or less",
};

export const sourceNames: Record<ListSource, string> = {
  instagram: platformNames.instagram,
  youtube: platformNames.youtube,
  facebook: platformNames.facebook,
  manual: "Written by me",
};

// The choices of a group, for ChoiceGroup. Object.entries types its keys as plain strings.
export function choicesOf<Value extends string>(names: Record<Value, string>) {
  return (Object.entries(names) as [Value, string][]).map(([value, label]) => ({ value, label }));
}

// What narrows the list besides the search, by name, each with the filters it leaves when taken
// off: the ✕ chips beside the grid, the count on Filters and "No recipes match"'s line.
export function appliedFilters(filters: RecipeFilters) {
  const { time, sources, tags } = filters;
  const applied: { label: string; without: RecipeFilters }[] = [];
  if (time !== "") applied.push({ label: timeNames[time], without: { ...filters, time: "" } });
  for (const source of sources) {
    const others = sources.filter((other) => other !== source);
    applied.push({ label: sourceNames[source], without: { ...filters, sources: others } });
  }
  for (const tag of tags) {
    const others = tags.filter((other) => other !== tag);
    applied.push({ label: tagLabel(tag), without: { ...filters, tags: others } });
  }
  return applied;
}
