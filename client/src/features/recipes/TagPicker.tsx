import { tagFacets } from "@pinch/shared";
import { ChoiceGroup } from "./ChoiceGroup.tsx";
import { facetName, facets, tagLabel } from "./tagLabels.ts";

type TagPickerProps = {
  // Read, not shown: where it's used, a heading or title above already names the tags.
  legend: string;
  selected: string[];
  onChange: (tags: string[]) => void;
  look?: "chips" | "list";
};

// Tags to tick, a group per facet (design §7): a recipe's in the editor's Add tag, My recipes'
// Filters on the list.
export function TagPicker({ legend, selected, onChange, look = "chips" }: TagPickerProps) {
  // In the order ticked; the recipe page shows them as stored.
  function toggle(tag: string, on: boolean) {
    onChange(on ? [...selected, tag] : selected.filter((other) => other !== tag));
  }

  return (
    <fieldset className="grid gap-4">
      <legend className="sr-only">{legend}</legend>
      {facets.map((facet) => (
        <ChoiceGroup
          key={facet}
          legend={facetName(facet)}
          type="checkbox"
          choices={tagFacets[facet].map((value) => {
            const tag = `${facet}:${value}`;
            return { value: tag, label: tagLabel(tag) };
          })}
          selected={selected}
          onChange={toggle}
          look={look}
        />
      ))}
    </fieldset>
  );
}
