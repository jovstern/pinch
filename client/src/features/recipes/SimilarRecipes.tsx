import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { RecipeCard } from "./RecipeCard.tsx";
import { similarRecipesQuery } from "./recipeQueries.ts";

// Under a recipe (design D51): up to four of the user's other recipes like it, as My recipes'
// cards, smaller: a suggestion, under the recipe that was asked for. An extra: while it loads,
// when it fails or when nothing is like this recipe, there's no section at all, rather than a
// skeleton or an error for something nobody asked for. Not printed.
export function SimilarRecipes({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data } = useQuery(similarRecipesQuery(id));
  if (!data || data.items.length === 0) return null;
  return (
    <section className="mt-8 print:hidden">
      <h2 id="similar" className="text-xl font-semibold">
        {t("recipe.similar")}
      </h2>
      {/* One row of small cards, which scrolls sideways on a phone to the page's edges, as My
          recipes' tag chips (TagChips). The padding keeps a card's focus ring inside the
          scroller, which would cut it. */}
      <ul
        aria-labelledby="similar"
        className="-mx-4 mt-1 flex [scrollbar-width:none] gap-3 overflow-x-auto p-2 px-4 sm:-mx-6 sm:px-6"
      >
        {data.items.map((recipe) => (
          <li key={recipe.id} className="w-28 shrink-0 sm:w-36">
            {/* Under this section's heading, so a level down from the list's cards. */}
            <RecipeCard recipe={recipe} eager={false} titleAs="h3" />
          </li>
        ))}
      </ul>
    </section>
  );
}
