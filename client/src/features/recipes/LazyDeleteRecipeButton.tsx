import { lazy, Suspense, type ComponentProps } from "react";

// Delete's dialog (Radix, ~14 kB) is its own chunk, fetched when a recipe opens, so it isn't in
// every screen's first load (docs/metrics/m02.md). Edit shows at once; Delete appears beside it
// a moment later.
const DeleteRecipeButton = lazy(async () => ({
  default: (await import("./DeleteRecipeButton.tsx")).DeleteRecipeButton,
}));

export function LazyDeleteRecipeButton(props: ComponentProps<typeof DeleteRecipeButton>) {
  return (
    <Suspense>
      <DeleteRecipeButton {...props} />
    </Suspense>
  );
}
