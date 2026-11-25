import { useId } from "react";
import { useTranslation } from "react-i18next";
import { NativeSelect } from "../../components/ui/NativeSelect.tsx";
import { peopleChoices, TIMES, timesLabel } from "./useScale.ts";

type ServingsPickerProps = {
  // The recipe's own number of servings, if it says.
  servings: number | undefined;
  // What's picked: people, or a multiplier for a recipe without servings.
  value: number;
  onChange: (value: number) => void;
};

// How many to cook for (design D48): people when the recipe says how many it serves, else
// ×½ to ×3. The recipe's own choice is named in the list, and a line under it says the amounts
// changed, so the original is never lost from sight. Nothing is saved.
export function ServingsPicker({ servings, value, onChange }: ServingsPickerProps) {
  const { t } = useTranslation();
  const id = useId();
  const noteId = useId();

  return (
    <div className="mt-3 grid gap-1.5">
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {servings ? t("recipe.servingsLabel") : t("recipe.amountsLabel")}
        </label>
        <NativeSelect
          id={id}
          // The lines under it, read with it: what the recipe says, and that the amounts changed.
          aria-describedby={noteId}
          value={String(value)}
          onChange={(event) => {
            onChange(Number(event.target.value));
          }}
          className="w-auto tabular-nums"
        >
          {servings
            ? peopleChoices(servings).map((count) => (
                <option key={count} value={count}>
                  {count === servings
                    ? t("recipe.original", { option: t("recipe.people", { count }) })
                    : t("recipe.people", { count })}
                </option>
              ))
            : TIMES.map((times) => (
                <option key={times} value={times}>
                  {times === 1
                    ? t("recipe.original", { option: timesLabel(times) })
                    : timesLabel(times)}
                </option>
              ))}
        </NativeSelect>
      </div>
      <div id={noteId} className="grid gap-1 text-sm">
        {!servings && <p className="text-muted-foreground">{t("recipe.noServings")}</p>}
        {/* In the accent's colour when the amounts aren't the recipe's, so it's noticed. */}
        {value !== (servings ?? 1) && (
          <p className="font-medium text-accent-strong">
            {servings
              ? t("recipe.scaledFrom", { count: servings })
              : t("recipe.scaledTimes", { times: timesLabel(value) })}
          </p>
        )}
      </div>
    </div>
  );
}
