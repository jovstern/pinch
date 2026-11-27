import { PlatformSchema, type Recipe } from "@pinch/shared";
import i18next from "i18next";
import { Link } from "react-router";
import { RecipeFace } from "../../components/RecipeFace.tsx";
import { Thumbnail } from "../../components/Thumbnail.tsx";
import { Badge } from "../../components/ui/Badge.tsx";
import { formatNumber } from "../../lib/formatNumber.ts";
import { editedSincePinched } from "./editedSincePinched.ts";
import { sourceLabels } from "./filterLabels.ts";

// A recipe in My recipes' grid (design §14): its picture, where it came from, its title, and the
// two things that decide what to cook tonight. One link, so the grid is one tab stop a recipe.
type RecipeCardProps = {
  recipe: Recipe;
  // Its picture loads at once, not when it nears the screen: the first row's (RecipeListPage).
  eager: boolean;
  // Its title's heading: a level under the heading it's listed under (h2 in My recipes, under
  // the page's h1; h3 under a recipe's "Similar recipes").
  titleAs?: "h2" | "h3";
};

export function RecipeCard({ recipe, eager, titleAs: Title = "h2" }: RecipeCardProps) {
  // Read by Pinch from a post or pasted text: without a picture or an emoji, its pot has sparkles.
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
        <Title className="mt-2 line-clamp-2 text-base font-semibold group-hover:underline">
          {recipe.title}
        </Title>
        <p className="text-sm text-muted-foreground">
          <bdi>{summary(recipe)}</bdi>
        </p>
      </div>
      {/* 4:5, cropped, so the grid's rows line up whatever the post's shape. Without a picture
          its face (D25), so it doesn't look like a card still loading; if the picture fails, the
          plain tile stays. */}
      <div className="relative order-first aspect-4/5 overflow-hidden rounded-card bg-muted">
        {recipe.thumbnail ? (
          <Thumbnail
            src={`/api/recipes/${recipe.id}/thumbnail`}
            size={recipe.thumbnail}
            shape="cover"
            eager={eager}
          />
        ) : (
          <RecipeFace
            emoji={recipe.emoji}
            fromVideo={platform !== undefined}
            className="h-full text-5xl"
          />
        )}
        {/* Where it came from, on every card (design D52). */}
        <Badge
          variant="secondary"
          className="absolute end-2 top-2 bg-background/90 px-2 py-0.5 text-xs font-medium"
        >
          {sourceLabels()[recipe.source.type]}
        </Badge>
      </div>
    </Link>
  );
}

// "10 min · 2 ingredients", as the wireframe, then "Edited" when it is; no time when the recipe
// has none.
function summary(recipe: Recipe) {
  const minutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  const ingredients = i18next.t("recipes.ingredients", { count: recipe.ingredients.length });
  const parts: string[] = [ingredients];
  if (minutes > 0) parts.unshift(i18next.t("recipes.minutes", { minutes: formatNumber(minutes) }));
  // Pinched, then changed (design D50).
  if (editedSincePinched(recipe)) parts.push(i18next.t("recipe.edited"));
  return parts.join(" · ");
}
