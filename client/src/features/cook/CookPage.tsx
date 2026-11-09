import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Breadcrumb } from "../../components/ui/Breadcrumb.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { RecipeLoadError } from "../recipes/RecipeLoadError.tsx";
import { RecipeSource } from "../recipes/RecipeSource.tsx";
import { keepRangesTogether } from "../recipes/ranges.ts";
import { recipeQuery } from "../recipes/recipeQueries.ts";
import { stepDurations } from "./durations.ts";
import { CookSkeleton } from "./CookSkeleton.tsx";
import { IngredientChecklist } from "./IngredientChecklist.tsx";
import { stepIngredients } from "./stepIngredients.ts";
import { TimerBar } from "./TimerBar.tsx";
import { useTimers } from "./useTimers.ts";
import { useWakeLock } from "./useWakeLock.ts";

// Cook mode (docs/ux/plan.md U2, design §14): one step at a time, in big type, with the screen
// kept on, for a cook standing at the stove with wet hands.
export function CookPage() {
  // The route is "recipes/:id/cook", so the id is always there.
  const { id = "" } = useParams();
  const {
    status,
    isLoadingError,
    data: recipe,
    error,
    refetch,
    isFetching,
  } = useQuery(recipeQuery(id));
  const [index, setIndex] = useState(0);
  // The ingredients ticked off, by their place in the list: the same ticks in the step's list
  // and the full one. Kept while the page is open, not saved.
  const [ticked, setTicked] = useState<number[]>([]);
  const forThisStepId = useId();
  const allId = useId();
  const wakeLock = useWakeLock();
  const { timers, now, start, stop, isRunning } = useTimers();
  const navigate = useNavigate();

  if (status === "pending") return <CookSkeleton />;
  if (isLoadingError) {
    return <RecipeLoadError error={error} retry={() => void refetch()} retrying={isFetching} />;
  }

  const recipePath = `/recipes/${recipe.id}`;
  // An edit elsewhere may have removed steps since: never past the last one.
  const last = recipe.steps.length - 1;
  const current = Math.min(index, last);
  const step = recipe.steps[current] ?? "";
  const forThisStep = stepIngredients(step, recipe.ingredients);
  const durations = stepDurations(step);
  const all = recipe.ingredients.map((_, position) => position);

  // As TagPicker's toggle: in the order ticked.
  function toggle(position: number, on: boolean) {
    setTicked((before) =>
      on ? [...before, position] : before.filter((other) => other !== position),
    );
  }

  return (
    <article>
      <title>{`Cooking ${recipe.title} · Pinch`}</title>
      {/* The way out (no Exit): the recipe's crumb, a link that pushes like every crumb. Only Done
          replaces, as it ends the cooking. */}
      <Breadcrumb
        links={[
          { label: "My recipes", to: "/recipes" },
          { label: recipe.title, to: recipePath },
        ]}
        page="Cook"
      />
      <h1 dir="auto" className="mt-2 text-3xl font-bold tracking-tight text-balance">
        {recipe.title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <RecipeSource source={recipe.source} />
        {/* Nothing while the browser is still asked, so it doesn't flicker from one to the other. */}
        {wakeLock === "on" && " · The screen stays on."}
        {wakeLock === "off" && " · This browser may let the screen lock."}
      </p>

      {/* A status (polite, read whole), so a screen reader reads each new step and its number. */}
      <section role="status" className="mt-8">
        <p className="text-sm font-semibold text-text-muted">
          {`Step ${String(current + 1)} of ${String(recipe.steps.length)}`}
        </p>
        {/* dir="auto": a Hebrew step reads right to left, as in the form (TextField). */}
        <p
          dir="auto"
          className="mt-3 max-w-prose font-display text-2xl font-semibold text-pretty sm:text-3xl"
        >
          {keepRangesTogether(step)}
        </p>
      </section>

      {/* A timer for each time the step mentions; outside the status, so starting one isn't read
          as a new step. */}
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
                  start(key, duration);
                }}
              >
                {/* One span: a flex item's trailing space would be lost ("Timer:20 min"). */}
                <span>
                  {running ? "Running: " : "Timer: "}
                  <bdi>{duration.label}</bdi>
                </span>
              </Button>
            );
          })}
        </div>
      )}

      {/* Outside the status: ticking one isn't a new step to announce. */}
      {forThisStep.length > 0 && (
        <div className="mt-6">
          {/* A label like "Step 2 of 6" above, not a section title. */}
          <p id={forThisStepId} className="text-sm font-semibold text-text-muted">
            For this step
          </p>
          <IngredientChecklist
            labelledBy={forThisStepId}
            ingredients={recipe.ingredients}
            shown={forThisStep}
            ticked={ticked}
            onToggle={toggle}
          />
        </div>
      )}

      {/* Big, side by side, at the bottom of the step: easy to reach with a knuckle. Each stays
          the same button from step to step (aria-disabled, not disabled; Next turns into Done),
          so a keyboard's focus stays on it. */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:max-w-md">
        <Button
          type="button"
          variant="secondary"
          className="min-h-14 text-lg"
          aria-disabled={current === 0}
          onClick={() => {
            if (current > 0) setIndex(current - 1);
          }}
        >
          Back
        </Button>
        <Button
          type="button"
          className="min-h-14 text-lg"
          onClick={() => {
            if (current < last) setIndex(current + 1);
            // replace, as the form's Cancel: the phone's Back then doesn't reopen cook mode.
            else void navigate(recipePath, { replace: true });
          }}
        >
          {current < last ? "Next" : "Done"}
        </Button>
      </div>

      {/* Folded: the step is what matters at the stove; the whole list is one tap away. */}
      <details className="mt-8">
        <summary id={allId} className="cursor-pointer py-2.5 font-semibold">
          All ingredients ({recipe.ingredients.length})
        </summary>
        <IngredientChecklist
          labelledBy={allId}
          ingredients={recipe.ingredients}
          shown={all}
          ticked={ticked}
          onToggle={toggle}
        />
      </details>

      <TimerBar timers={timers} now={now} onStop={stop} />
    </article>
  );
}
