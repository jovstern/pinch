import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "../../components/Button.tsx";
import { RecipeLoadError } from "../recipes/RecipeLoadError.tsx";
import { recipeQuery } from "../recipes/recipeQueries.ts";
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
  const wakeLock = useWakeLock();

  if (status === "pending") return <p className="text-text-muted">Loading the recipe…</p>;
  if (isLoadingError) {
    return <RecipeLoadError error={error} retry={() => void refetch()} retrying={isFetching} />;
  }

  const recipePath = `/recipes/${recipe.id}`;
  // An edit elsewhere may have removed steps since: never past the last one.
  const last = recipe.steps.length - 1;
  const current = Math.min(index, last);

  return (
    <article>
      <title>{`Cooking ${recipe.title} · Pinch`}</title>
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl font-semibold text-balance">{recipe.title}</h1>
        <Button asChild variant="secondary" className="shrink-0">
          <Link to={recipePath}>Exit</Link>
        </Button>
      </div>
      <p className="mt-1 text-sm text-text-muted">
        {wakeLock === "on" ? "The screen stays on." : "The screen may lock: this browser decides."}
      </p>

      {/* Announced as it changes, so a screen reader reads each new step. */}
      <section aria-live="polite" className="mt-8">
        <h2 className="text-sm font-semibold text-text-muted">
          Step {current + 1} of {recipe.steps.length}
        </h2>
        <p className="mt-3 max-w-prose font-display text-2xl text-pretty sm:text-3xl">
          {recipe.steps[current]}
        </p>
      </section>

      {/* Big, side by side, at the bottom of the step: easy to reach with a knuckle. */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:max-w-md">
        <Button
          variant="secondary"
          className="min-h-14 text-lg"
          disabled={current === 0}
          onClick={() => {
            setIndex(current - 1);
          }}
        >
          Back
        </Button>
        {current < last ? (
          <Button
            variant="primary"
            className="min-h-14 text-lg"
            onClick={() => {
              setIndex(current + 1);
            }}
          >
            Next
          </Button>
        ) : (
          <Button asChild variant="primary" className="min-h-14 text-lg">
            <Link to={recipePath}>Done</Link>
          </Button>
        )}
      </div>
    </article>
  );
}
