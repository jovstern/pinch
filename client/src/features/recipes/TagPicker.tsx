import { tagFacets } from "@pinch/shared";
import { Check } from "lucide-react";
import { useId } from "react";
import { FieldError } from "../../components/FieldError.tsx";
import { facetNames, facets, tagLabel } from "./tagLabels.ts";

type TagPickerProps = {
  legend: string;
  // The form shows its legend as a section heading; My recipes' Filters hide it (their own
  // heading or title names them).
  legendClassName: string;
  selected: string[];
  onChange: (tags: string[]) => void;
  errors?: unknown[];
  // "chips" (the form, the Filters sheet), or "list": a column of checkboxes for a narrow panel
  // (My recipes from 1024 px, as in the wireframe).
  look?: "chips" | "list";
};

// The checkbox is hidden in a chip, so the chip shows its state (a fill and a ✓, not colour
// alone) and its focus ring, in the text colour so it shows on a filled chip too. relative
// keeps the hidden checkbox inside its chip, so focusing it scrolls there. A list's row is the
// checkbox and its label, 44 px tall for touch.
const looks = {
  chips: {
    values: "flex flex-wrap gap-2",
    label:
      "group relative inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-fill px-4 text-sm hover:bg-border has-checked:bg-accent-strong has-checked:text-on-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-text",
    checkbox: "sr-only",
  },
  list: {
    values: "grid",
    label: "flex min-h-11 cursor-pointer items-center gap-3 text-sm",
    checkbox: "size-4 accent-primary",
  },
};

// Tags to tick, a group per facet (design §7): a recipe's in the form, My recipes' Filters on
// the list. Each is a real checkbox, so Tab, Space and screen readers work as usual; drawn as a
// chip (only its label shows) or as a checkbox row.
export function TagPicker({
  legend,
  legendClassName,
  selected,
  onChange,
  errors = [],
  look = "chips",
}: TagPickerProps) {
  // As in TextField: each checkbox is marked invalid and points to the error (over 20 tags), so
  // the form's focus after a failed Save lands on the first chip, just under the message.
  const errorId = useId();
  const invalid = errors.some((message) => typeof message === "string");

  // In the order ticked; the recipe page shows them as stored.
  function toggle(tag: string, on: boolean) {
    onChange(on ? [...selected, tag] : selected.filter((other) => other !== tag));
  }

  return (
    <fieldset className="mt-4 grid gap-4">
      <legend className={legendClassName}>{legend}</legend>
      <FieldError id={errorId} errors={errors} />
      {facets.map((facet) => (
        <fieldset key={facet}>
          <legend className="mb-2 text-sm font-semibold">{facetNames[facet]}</legend>
          <div className={looks[look].values}>
            {tagFacets[facet].map((value) => {
              const tag = `${facet}:${value}`;
              return (
                <label key={tag} className={looks[look].label}>
                  <input
                    type="checkbox"
                    className={looks[look].checkbox}
                    checked={selected.includes(tag)}
                    aria-invalid={invalid}
                    aria-describedby={invalid ? errorId : undefined}
                    onChange={(event) => {
                      toggle(tag, event.target.checked);
                    }}
                  />
                  {look === "chips" && (
                    <Check aria-hidden="true" className="hidden size-4 group-has-checked:block" />
                  )}
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
