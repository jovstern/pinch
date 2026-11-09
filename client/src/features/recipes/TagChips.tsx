import { Check } from "lucide-react";
import { Toggle } from "../../components/ui/Toggle.tsx";
import { tagLabel } from "./tagLabels.ts";

// The quick filters under the search (design §14). Fixed for now: the household's most-used
// tags need the API to count them (M8 F1).
const commonTags = [
  "fit:quick",
  "meal:dinner",
  "diet:vegetarian",
  "meal:breakfast",
  "flavor:sweet",
];

type TagChipsProps = {
  selected: string[];
  onChange: (tags: string[]) => void;
};

// A row of toggles for the common tags, on the same tags as the Filters (the address's). It
// scrolls sideways on a phone rather than wrap: one row, so the grid starts high. It runs to the
// screen's edges (the negative margins), so a cut-off chip shows there is more, and no scrollbar:
// the cut-off chip says it.
export function TagChips({ selected, onChange }: TagChipsProps) {
  return (
    <div
      role="group"
      aria-label="Common tags"
      className="-mx-4 mt-3 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-0.5 sm:-mx-6 sm:px-6"
    >
      {commonTags.map((tag) => (
        <Toggle
          key={tag}
          pressed={selected.includes(tag)}
          onPressedChange={(on) => {
            onChange(on ? [...selected, tag] : selected.filter((other) => other !== tag));
          }}
        >
          {selected.includes(tag) && <Check aria-hidden="true" className="size-4" />}
          {tagLabel(tag)}
        </Toggle>
      ))}
    </div>
  );
}
