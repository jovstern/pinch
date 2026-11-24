import { useId } from "react";
import { useTranslation } from "react-i18next";
import { NativeSelect } from "../../components/ui/NativeSelect.tsx";
import { TIMES, timesLabel } from "./useScale.ts";

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
  // Up to three times the recipe, at least 12, at most the 100 a recipe may serve.
  const people = servings
    ? Array.from({ length: Math.min(100, Math.max(12, servings * 3)) }, (_, index) => index + 1)
    : [];

  return (
    <div className="mt-3 grid gap-1.5">
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {servings ? t("recipe.servingsLabel") : t("recipe.amountsLabel")}
        </label>
        <NativeSelect
          id={id}
          value={String(value)}
          onChange={(event) => {
            onChange(Number(event.target.value));
          }}
          className="w-auto tabular-nums"
        >
          {servings
            ? people.map((count) => (
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
      {/* In the accent's colour when the amounts aren't the recipe's, so it's noticed. */}
      {servings ? (
        value !== servings && (
          <p className="text-sm font-medium text-accent-strong">
            {t("recipe.scaledFrom", { count: servings })}
          </p>
        )
      ) : (
        <p className="text-sm text-muted-foreground">{t("recipe.noServings")}</p>
      )}
    </div>
  );
}
