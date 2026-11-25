import { useId } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn.ts";
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

  const scaled = value !== (servings ?? 1);
  // The choice's own words, as the list shows it: on paper in place of the list (design D49).
  const chosenLabel = servings ? t("recipe.people", { count: value }) : timesLabel(value);
  // On paper only when the amounts aren't the recipe's own: then the choice and the line under it
  // say whom they're for (design D49).
  return (
    <div className={cn("mt-3 grid gap-1.5", !scaled && "print:hidden")}>
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {servings ? t("recipe.servingsLabel") : t("recipe.amountsLabel")}
        </label>
        {/* Hidden on paper with its chevron, which is outside the <select>. */}
        <div className="print:hidden">
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
        <span aria-hidden="true" className="hidden text-sm font-medium print:inline">
          {chosenLabel}
        </span>
      </div>
      <div id={noteId} className="grid gap-1 text-sm">
        {!servings && (
          <p className="text-muted-foreground print:hidden">{t("recipe.noServings")}</p>
        )}
        {/* In the accent's colour when the amounts aren't the recipe's, so it's noticed. */}
        {scaled && (
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
