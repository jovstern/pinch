import { tagFacets } from "@pinch/shared";
import { FieldError } from "../../components/FieldError.tsx";
import { facetNames, tagLabel } from "./tagLabels.ts";

// What TagPicker needs from the form's tags field (like TextField's).
type TagsFieldApi = {
  state: { value: string[]; meta: { errors: unknown[] } };
  handleChange: (value: string[]) => void;
};

// Object.keys types its keys as plain strings; these are the facets.
const facets = Object.keys(facetNames) as (keyof typeof tagFacets)[];

// The recipe's tags, a group of toggles per facet (design §7). Each is a real checkbox, so Tab,
// Space and screen readers work as usual; only its label shows, drawn as a chip.
export function TagPicker({ field }: { field: TagsFieldApi }) {
  const selected = field.state.value;

  function toggle(tag: string, on: boolean) {
    field.handleChange(on ? [...selected, tag] : selected.filter((other) => other !== tag));
  }

  return (
    <fieldset className="mt-4 grid gap-4">
      <legend className="mb-3 text-xl font-semibold">Tags</legend>
      <FieldError errors={field.state.meta.errors} />
      {facets.map((facet) => (
        <fieldset key={facet}>
          <legend className="mb-2 text-sm font-semibold">{facetNames[facet]}</legend>
          <div className="flex flex-wrap gap-2">
            {tagFacets[facet].map((value) => {
              const tag = `${facet}:${value}`;
              return (
                // The checkbox is hidden, so the chip shows its state and its focus ring.
                <label
                  key={tag}
                  className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-border bg-surface-raised px-4 text-sm has-checked:border-accent-strong has-checked:bg-accent-strong has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-strong"
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selected.includes(tag)}
                    onChange={(event) => {
                      toggle(tag, event.target.checked);
                    }}
                  />
                  {tagLabel(tag)}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </fieldset>
  );
}
