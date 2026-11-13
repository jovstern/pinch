import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { Breadcrumb } from "../../components/ui/Breadcrumb.tsx";
import { isolate } from "../../lib/isolate.ts";
import { useMediaQuery } from "../../lib/useMediaQuery.ts";
import { RecipeLoadError } from "../recipes/RecipeLoadError.tsx";
import { RecipeSource } from "../recipes/RecipeSource.tsx";
import { recipeQuery } from "../recipes/recipeQueries.ts";
import { CookSkeleton } from "./CookSkeleton.tsx";
import { IngredientChecklist } from "./IngredientChecklist.tsx";
import { StepCard } from "./StepCard.tsx";
import { StepCarousel } from "./StepCarousel.tsx";
import { TimerBar } from "./TimerBar.tsx";
import { useTimers } from "./useTimers.ts";
import { useWakeLock } from "./useWakeLock.ts";

// Cook mode (docs/ux/plan.md U2, design §14): one step at a time, in big type, with the screen
// kept on, for a cook standing at the stove with wet hands. The steps are StepCarousel's.
export function CookPage() {
  const { t } = useTranslation();
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

  const timerBar = <TimerBar timers={timers} now={now} onStop={stop} />;

  return (
    <article>
      {/* The title in isolates, as a <title> can't hold <bdi> (design §16.3, §16.5). */}
      <title>{`${t("cook.pageTitle", { title: isolate(recipe.title) })} · Pinch`}</title>
      {/* The way out (no Exit): the recipe's crumb, a link that pushes like every crumb. Only Done
          replaces, as it ends the cooking. */}
      <Breadcrumb
        links={[
          { label: t("header.myRecipes"), to: "/recipes" },
          { label: recipe.title, to: recipePath },
        ]}
        page={t("cook.cook")}
      />
      <h1 dir="auto" className="mt-2 text-3xl font-bold tracking-tight text-balance">
        {recipe.title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <RecipeSource source={recipe.source} />
        {/* Nothing while the browser is still asked, so it doesn't flicker from one to the other. */}
        {wakeLock === "on" && ` · ${t("cook.screenOn")}`}
        {wakeLock === "off" && ` · ${t("cook.mayLock")}`}
      </p>

      {/* As on the recipe's page: from 1024 px the checklist sits on the left, beside the steps;
          on a phone it's folded under them, as the step is what matters at the stove. */}
      <div className="mt-8 lg:mt-10 lg:grid lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
        {wide && (
          <section className="rounded-card border border-border p-5">
            <h2 id={allId} className="text-xl font-semibold">
              {t("cook.allIngredients", { number: recipe.ingredients.length })}
            </h2>
            <div className="mt-3">{checklist}</div>
          </section>
        )}

        <StepCarousel
          steps={recipe.steps}
          card={(step) => (
            <StepCard
              step={step}
              ingredients={recipe.ingredients}
              ticked={ticked}
              onToggle={toggle}
              isRunning={isRunning}
              onStart={start}
            />
          )}
          onDone={() => {
            // replace, as the form's Cancel: the phone's Back then doesn't reopen cook mode.
            void navigate(recipePath, { replace: true });
          }}
          timers={!wide && timerBar}
        >
          {!wide && (
            <details className="mt-4">
              <summary id={allId} className="cursor-pointer py-2.5 font-semibold">
                {t("cook.allIngredients", { number: recipe.ingredients.length })}
              </summary>
              {checklist}
            </details>
          )}
        </StepCarousel>
      </div>

      {/* From 1024 px the timers sit under both columns, kept at the bottom of the screen. Below
          it they're in the steps' footer, with Back and Next. */}
      {wide && <div className="sticky bottom-0 mt-8">{timerBar}</div>}
    </article>
  );
}
