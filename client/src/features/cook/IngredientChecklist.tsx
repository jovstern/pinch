import type { Ingredient } from "@pinch/shared";
import { ingredientLine } from "../recipes/ingredientLine.ts";

type IngredientChecklistProps = {
  // The id of the heading that names the list, for screen readers (and the tests).
  labelledBy: string;
  ingredients: Ingredient[];
  // Which of them to show, by their place in the recipe's list.
  shown: number[];
  ticked: number[];
  onToggle: (index: number, on: boolean) => void;
};

// Ingredients to tick off as they go in (docs/ux/plan.md U2): a visible box, not TagPicker's
// chips, as it's a list ticked off, not tags chosen. Real checkboxes, so they work with a
// keyboard and a screen reader; each row is 44 px tall, for a wet knuckle.
export function IngredientChecklist({
  labelledBy,
  ingredients,
  shown,
  ticked,
  onToggle,
}: IngredientChecklistProps) {
  return (
    <ul aria-labelledby={labelledBy} className="grid">
      {ingredients.map(
        (ingredient, index) =>
          shown.includes(index) && (
            <li key={index}>
              {/* dir="auto": a Hebrew row has its box on the right, as the text reads. */}
              <label
                dir="auto"
                className="flex min-h-11 cursor-pointer items-center gap-3 has-checked:text-text-muted has-checked:line-through"
              >
                <input
                  type="checkbox"
                  className="size-5 shrink-0 accent-accent-strong"
                  checked={ticked.includes(index)}
                  onChange={(event) => {
                    onToggle(index, event.target.checked);
                  }}
                />
                <span>
                  {ingredientLine(ingredient)}
                  {ingredient.note && <span className="text-text-muted">, {ingredient.note}</span>}
                </span>
              </label>
            </li>
          ),
      )}
    </ul>
  );
}
