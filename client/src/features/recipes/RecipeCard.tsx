import { PlatformSchema, type Recipe } from "@pinch/shared";
import { Link } from "react-router";
import { Thumbnail } from "../../components/Thumbnail.tsx";
import { platformNames } from "../../lib/platformNames.ts";

// A recipe in My recipes' grid (design §14): its picture, where it came from, its title, and the
// two things that decide what to cook tonight. One link, so the grid is one tab stop a recipe.
export function RecipeCard({ recipe }: { recipe: Recipe }) {
  // Instagram, YouTube or Facebook; a recipe written by hand (or from text) has no label.
  const platform = PlatformSchema.safeParse(recipe.source.type).data;
  return (
    // The picture comes first on screen but last in the markup (order-first), so the link is
    // named by its title, then the rest: "Omelette 10 min · 2 ingredients Instagram".
    <Link to={`/recipes/${recipe.id}`} className="group flex flex-col rounded-card">
      <h2 dir="auto" className="mt-2 line-clamp-2 text-base font-semibold group-hover:underline">
        {recipe.title}
      </h2>
      <p className="text-sm text-muted-foreground">{summary(recipe)}</p>
      {/* 4:5, cropped, so the grid's rows line up whatever the post's shape. Without a picture
          (or if it fails) the plain tile stays. */}
      <div className="relative order-first aspect-4/5 overflow-hidden rounded-card bg-muted">
        {recipe.thumbnail && (
          <Thumbnail
            src={`/api/recipes/${recipe.id}/thumbnail`}
            size={recipe.thumbnail}
            shape="cover"
          />
        )}
        {platform && (
          <span className="absolute top-2 right-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium">
            {platformNames[platform]}
          </span>
        )}
      </div>
    </Link>
  );
}

// "10 min · 2 ingredients", as the wireframe; no time when the recipe has none.
function summary(recipe: Recipe) {
  const minutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  const count = recipe.ingredients.length;
  const ingredients = count === 1 ? "1 ingredient" : `${String(count)} ingredients`;
  return minutes > 0 ? `${String(minutes)} min · ${ingredients}` : ingredients;
}
