import { PlatformSchema, type Recipe } from "@pinch/shared";
import { CookingPot } from "lucide-react";
import { Link } from "react-router";
import { Thumbnail } from "../../components/Thumbnail.tsx";
import { Badge } from "../../components/ui/Badge.tsx";
import { platformNames } from "../../lib/platformNames.ts";

// A recipe in My recipes' grid (design §14): its picture, where it came from, its title, and the
// two things that decide what to cook tonight. One link, so the grid is one tab stop a recipe.
export function RecipeCard({ recipe }: { recipe: Recipe }) {
  // Instagram, YouTube or Facebook; a recipe written by hand (or from text) has no label.
  const platform = PlatformSchema.safeParse(recipe.source.type).data;
  return (
    // The picture comes first on screen but last in the markup (order-first), so the link is
    // named by its title, then the rest: "Omelette 10 min · 2 ingredients Instagram". The focus
    // ring a little further out than elsewhere (!: over globals.css), clear of the title.
    <Link
      to={`/recipes/${recipe.id}`}
      className="group flex flex-col rounded-card focus-visible:outline-offset-4!"
    >
      {/* dir="auto" on the block: the meta line follows its title's side (a Hebrew title, right),
          its words kept in their own order (bdi), so "120 min" doesn't turn into "min … 120". */}
      <div dir="auto">
        <h2 className="mt-2 line-clamp-2 text-base font-semibold group-hover:underline">
          {recipe.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          <bdi>{summary(recipe)}</bdi>
        </p>
      </div>
      {/* 4:5, cropped, so the grid's rows line up whatever the post's shape. Without a picture
          a pot, as in the queue, so it doesn't look like a card still loading; if the picture
          fails, the plain tile stays. */}
      <div className="relative order-first aspect-4/5 overflow-hidden rounded-card bg-muted">
        {recipe.thumbnail ? (
          <Thumbnail
            src={`/api/recipes/${recipe.id}/thumbnail`}
            size={recipe.thumbnail}
            shape="cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <CookingPot aria-hidden="true" className="size-8" />
          </div>
        )}
        {platform && (
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 bg-background/90 px-2 py-0.5 text-xs font-medium"
          >
            {platformNames[platform]}
          </Badge>
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
