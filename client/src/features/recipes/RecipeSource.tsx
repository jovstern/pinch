import type { Recipe } from "@pinch/shared";
import { ExternalLink } from "lucide-react";
import { platformNames } from "../../lib/platformNames.ts";

// Where the recipe came from, first in its subtitle (a recipe's page, cook mode): the post,
// opened in a new tab, or how it was written. The link is a line of small text, so its touch area
// (the after:) reaches 44 px, as the tags'.
export function RecipeSource({ source }: { source: Recipe["source"] }) {
  if (source.type === "manual") return "Written by you";
  if (source.type === "text") return "From pasted text";
  if (source.type === "image") return "From screenshots";
  // Instagram, YouTube or Facebook.
  const name = platformNames[source.type];
  if (!source.url) return name;
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="relative inline-flex items-center gap-1 underline underline-offset-4 after:absolute after:inset-x-0 after:-inset-y-3 hover:text-foreground"
    >
      {name}
      <span className="sr-only"> (opens in a new tab)</span>
      {/* Its arrow leaves toward the end, so it mirrors in Hebrew (design §16.4). */}
      <ExternalLink aria-hidden="true" className="size-3.5 rtl:-scale-x-100" />
    </a>
  );
}
