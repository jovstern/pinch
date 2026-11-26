import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { RecipeCard } from "./RecipeCard.tsx";
import { similarRecipesQuery } from "./recipeQueries.ts";

// Under a recipe (design D51): up to four of the user's other recipes like it, as My recipes'
// cards. An extra: while it loads, when it fails or when nothing is like this recipe, there's no
// section at all, rather than a skeleton or an error for something nobody asked for. Not printed.
export function SimilarRecipes({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data } = useQuery(similarRecipesQuery(id));
  if (!data || data.items.length === 0) return null;
  return (
    <section className="mt-8 print:hidden">
      <h2 id="similar" className="text-xl font-semibold">
        {t("recipe.similar")}
      </h2>
      <ul
        aria-labelledby="similar"
        className="mt-3 grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-4"
      >
        {data.items.map((recipe) => (
          <li key={recipe.id}>
            {/* Under this section's heading, so a level down from the list's cards. */}
            <RecipeCard recipe={recipe} eager={false} titleAs="h3" />
          </li>
        ))}
      </ul>
    </section>
  );
}
