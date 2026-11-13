import type { ListSource, RecipeSort, TimeLimit } from "@pinch/shared";
import i18next from "i18next";
import { platformNames } from "../../lib/platformNames.ts";
import type { RecipeFilters } from "./recipeQueries.ts";
import { tagLabel } from "./tagLabels.ts";

// My recipes' Sort and Filters as the wireframe names them (docs/ux/wireframes/recipes.html), in
// the order shown, in the page's language: functions, so they're read once i18next has it. The
// record types make every value need a name.
function sortNames(): Record<RecipeSort, string> {
  return {
    newest: i18next.t("filters.newest"),
    quickest: i18next.t("filters.quickest"),
    az: i18next.t("filters.az"),
  };
}

// Sort's choices. The first is blank, the API's own order: newest first, or while searching, the
// best match first, so a search shows Best match until another order is picked (design §14).
export function sortChoices(searching: boolean) {
  const named = choicesOf(sortNames());
  return searching
    ? [{ value: "" as const, label: i18next.t("filters.bestMatch") }, ...named]
    : [
        { value: "" as const, label: i18next.t("filters.newest") },
        ...named.filter(({ value }) => value !== "newest"),
      ];
}

export function timeNames(): Record<TimeLimit, string> {
  return {
    "15": i18next.t("filters.upTo15"),
    "30": i18next.t("filters.upTo30"),
    "60": i18next.t("filters.upTo60"),
  };
}

// The sites' names stay as they are in Hebrew too (D46).
export function sourceNames(): Record<ListSource, string> {
  return {
    instagram: platformNames.instagram,
    youtube: platformNames.youtube,
    facebook: platformNames.facebook,
    manual: i18next.t("filters.writtenByMe"),
  };
}

// The choices of a group, for ChoiceGroup. Object.entries types its keys as plain strings.
export function choicesOf<Value extends string>(names: Record<Value, string>) {
  return (Object.entries(names) as [Value, string][]).map(([value, label]) => ({ value, label }));
}

// What narrows the list besides the search, by name, each with the filters it leaves when taken
// off: the ✕ chips beside the grid, the count on Filters and "No recipes match"'s line.
export function appliedFilters(filters: RecipeFilters) {
  const { time, sources, tags } = filters;
  const applied: { label: string; without: RecipeFilters }[] = [];
  if (time !== "") applied.push({ label: timeNames()[time], without: { ...filters, time: "" } });
  for (const source of sources) {
    const others = sources.filter((other) => other !== source);
    applied.push({ label: sourceNames()[source], without: { ...filters, sources: others } });
  }
  for (const tag of tags) {
    const others = tags.filter((other) => other !== tag);
    applied.push({ label: tagLabel(tag), without: { ...filters, tags: others } });
  }
  return applied;
}
