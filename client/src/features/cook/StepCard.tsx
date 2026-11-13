import type { Ingredient } from "@pinch/shared";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button.tsx";
import { keepRangesTogether } from "../recipes/ranges.ts";
import { stepDurations, type Duration } from "./durations.ts";
import { IngredientChecklist } from "./IngredientChecklist.tsx";
import { stepIngredients } from "./stepIngredients.ts";
import { timeInWords } from "./timeInWords.ts";

type StepCardProps = {
  step: string;
  ingredients: Ingredient[];
  ticked: number[];
  onToggle: (index: number, on: boolean) => void;
  isRunning: (key: string) => boolean;
  onStart: (key: string, duration: Duration) => void;
};

// One step of cook mode as a card (design §14): the step in big type, a timer for each time it
// mentions, and the ingredients it uses, to tick off.
export function StepCard({
  step,
  ingredients,
  ticked,
  onToggle,
  isRunning,
  onStart,
}: StepCardProps) {
  const { t } = useTranslation();
  const forThisStepId = useId();
  const forThisStep = stepIngredients(step, ingredients);
  const durations = stepDurations(step);

  return (
    <div className="rounded-card border border-border bg-card p-5 md:p-8">
      {/* dir="auto": a Hebrew step reads right to left, as in the form (TextField). */}
      <p
        dir="auto"
        className="max-w-prose font-display text-2xl font-semibold text-pretty sm:text-3xl"
      >
        {keepRangesTogether(step)}
      </p>

      {durations.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {durations.map((duration, position) => {
            // The step's own words and the time's place in them: an edit elsewhere that moves
            // the steps can't make another step's button look running.
            const key = `${step}\n${String(position)}`;
            // Not a toggle (pressed again, nothing): unavailable while it runs, as Back is on
            // the first step.
            const running = isRunning(key);
            return (
              <Button
                key={position}
                type="button"
                variant="secondary"
                aria-disabled={running}
                onClick={() => {
                  onStart(key, duration);
                }}
              >
                {/* The time in the interface's words, not the step's (design §16.9). One span,
                    so a flex item's trailing space isn't lost ("Timer:20 min"). */}
                <span>
                  {t(running ? "cook.running" : "cook.timer", {
                    time: timeInWords(duration.seconds),
                  })}
                </span>
              </Button>
            );
          })}
        </div>
      )}

      {forThisStep.length > 0 && (
        <div className="mt-6">
          {/* A label like "Step 2 of 6", not a section title. */}
          <p id={forThisStepId} className="text-sm font-semibold text-muted-foreground">
            {t("cook.forThisStep")}
          </p>
          <IngredientChecklist
            labelledBy={forThisStepId}
            ingredients={ingredients}
            shown={forThisStep}
            ticked={ticked}
            onToggle={onToggle}
          />
        </div>
      )}
    </div>
  );
}
