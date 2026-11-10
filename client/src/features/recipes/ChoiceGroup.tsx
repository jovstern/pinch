import { Check } from "lucide-react";
import { useId } from "react";

type ChoiceGroupProps<Value extends string> = {
  legend: string;
  // radio: one of them (Sort, Time); checkbox: any of them (Source, a facet's tags).
  type: "radio" | "checkbox";
  choices: { value: Value; label: string }[];
  selected: Value[];
  // A radio only ever turns on: picking another turns the first off.
  onChange: (value: Value, on: boolean) => void;
  // "chips" (the sheets), or "list": a column of rows for a narrow panel (My recipes from
  // 1024 px, as in the wireframe).
  look?: "chips" | "list";
};

// The input is hidden in a chip, so the chip shows its state (a fill and a ✓, not colour alone)
// and its focus ring, in the text colour so it shows on a filled chip too. relative keeps the
// hidden input inside its chip, so focusing it scrolls there. A list's row is the input and its
// label, 44 px tall for touch.
const looks = {
  chips: {
    values: "flex flex-wrap gap-2",
    label:
      "group relative inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-fill px-4 text-sm hover:bg-border has-checked:bg-accent-strong has-checked:text-on-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-text",
    input: "sr-only",
  },
  list: {
    values: "grid",
    label: "flex min-h-11 cursor-pointer items-center gap-3 text-sm",
    input: "size-4 accent-primary",
  },
};

// A group of choices with a legend, each a real radio or checkbox, so Tab, the arrow keys, Space
// and screen readers work as usual; drawn as chips or as rows (design §14).
export function ChoiceGroup<Value extends string>({
  legend,
  type,
  choices,
  selected,
  onChange,
  look = "chips",
}: ChoiceGroupProps<Value>) {
  // The radios' name, so the browser makes them one group (one Tab stop, the arrow keys).
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className={looks[look].values}>
        {choices.map(({ value, label }) => (
          <label key={value} className={looks[look].label}>
            <input
              type={type}
              name={type === "radio" ? name : undefined}
              className={looks[look].input}
              checked={selected.includes(value)}
              onChange={(event) => {
                onChange(value, event.target.checked);
              }}
            />
            {look === "chips" && (
              <Check aria-hidden="true" className="hidden size-4 group-has-checked:block" />
            )}
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
