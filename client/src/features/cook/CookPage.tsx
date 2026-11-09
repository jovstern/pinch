import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Breadcrumb } from "../../components/ui/Breadcrumb.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { useMediaQuery } from "../../lib/useMediaQuery.ts";
import { RecipeLoadError } from "../recipes/RecipeLoadError.tsx";
import { RecipeSource } from "../recipes/RecipeSource.tsx";
import { recipeQuery } from "../recipes/recipeQueries.ts";
import { CookSkeleton } from "./CookSkeleton.tsx";
import { IngredientChecklist } from "./IngredientChecklist.tsx";
import { StepCard } from "./StepCard.tsx";
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
  const allId = useId();
  const wakeLock = useWakeLock();
  const { timers, now, start, stop, isRunning } = useTimers();
  const navigate = useNavigate();
  // lg: Tailwind's 1024 px, where the whole checklist is a panel beside the steps, not folded
  // under them: a <details> can't be opened from CSS.
  const wide = useMediaQuery("(min-width: 64rem)");

  if (status === "pending") return <CookSkeleton />;
  if (isLoadingError) {
    return <RecipeLoadError error={error} retry={() => void refetch()} retrying={isFetching} />;
  }

  const recipePath = `/recipes/${recipe.id}`;
  // An edit elsewhere may have removed steps since: never past the last one.
  const last = recipe.steps.length - 1;
  const current = Math.min(index, last);
  const step = recipe.steps[current] ?? "";
  const all = recipe.ingredients.map((_, position) => position);

  // As TagPicker's toggle: in the order ticked.
  function toggle(position: number, on: boolean) {
    setTicked((before) =>
      on ? [...before, position] : before.filter((other) => other !== position),
    );
  }

  const checklist = (
    <IngredientChecklist
      labelledBy={allId}
      ingredients={recipe.ingredients}
      shown={all}
      ticked={ticked}
      onToggle={toggle}
    />
  );

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

      {/* As on the recipe's page: from 1024 px the checklist sits on the left, beside the steps;
          on a phone it's folded under them, as the step is what matters at the stove. */}
      <div className="mt-8 lg:mt-10 lg:grid lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start lg:gap-12">
        {wide && (
          <section className="rounded-card border border-border p-5">
            <h2 id={allId} className="text-xl font-semibold">
              All ingredients ({recipe.ingredients.length})
            </h2>
            <div className="mt-3">{checklist}</div>
          </section>
        )}

        <section>
          {/* A status (polite, read whole), so a screen reader reads each new step and its
              number: the step's words again, as the card itself isn't announced. */}
          <p role="status" className="text-sm font-semibold text-muted-foreground">
            {`Step ${String(current + 1)} of ${String(recipe.steps.length)}`}
            <span className="sr-only">: {step}</span>
          </p>
          <div className="mt-3">
            <StepCard
              step={step}
              ingredients={recipe.ingredients}
              ticked={ticked}
              onToggle={toggle}
              isRunning={isRunning}
              onStart={start}
            />
          </div>

          {/* Big, side by side, at the bottom of the step: easy to reach with a knuckle. Each stays
              the same button from step to step (aria-disabled, not disabled; Next turns into Done),
              so a keyboard's focus stays on it. */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
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
        </section>

        {!wide && (
          <details className="mt-8">
            <summary id={allId} className="cursor-pointer py-2.5 font-semibold">
              All ingredients ({recipe.ingredients.length})
            </summary>
            {checklist}
          </details>
        )}
      </div>

      <TimerBar timers={timers} now={now} onStop={stop} />
    </article>
  );
}
