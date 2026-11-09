import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
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
  const navigate = useNavigate();

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
        {/* replace, as the form's Cancel: the phone's Back then doesn't reopen cook mode. */}
        <Button asChild variant="secondary" className="shrink-0">
          <Link to={recipePath} replace>
            Exit
          </Link>
        </Button>
      </div>
      {/* Nothing while the browser is still asked, so it doesn't flicker from one to the other. */}
      <p className="mt-1 min-h-5 text-sm text-text-muted">
        {wakeLock === "on" && "The screen stays on."}
        {wakeLock === "off" && "This browser may let the screen lock."}
      </p>

      {/* A status (polite, read whole), so a screen reader reads each new step and its number. */}
      <section role="status" className="mt-8">
        <p className="text-sm font-semibold text-text-muted">
          {`Step ${String(current + 1)} of ${String(recipe.steps.length)}`}
        </p>
        <p className="mt-3 max-w-prose font-display text-2xl text-pretty sm:text-3xl">
          {recipe.steps[current]}
        </p>
      </section>

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
          variant="primary"
          className="min-h-14 text-lg"
          onClick={() => {
            if (current < last) setIndex(current + 1);
            else void navigate(recipePath, { replace: true });
          }}
        >
          {current < last ? "Next" : "Done"}
        </Button>
      </div>
    </article>
  );
}
