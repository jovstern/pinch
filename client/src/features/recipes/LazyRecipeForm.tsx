import { lazy, Suspense, type ComponentProps } from "react";

// The form and its library load only when a form opens, while the page's heading shows at once:
// in the first load they'd put the JS over its 150 kB budget (docs/metrics/m02.md). New and Edit
// both use it.
const RecipeForm = lazy(async () => ({
  default: (await import("./RecipeForm.tsx")).RecipeForm,
}));

export function LazyRecipeForm(props: ComponentProps<typeof RecipeForm>) {
  return (
    <Suspense fallback={<p className="mt-6 text-text-muted">Loading the form…</p>}>
      <RecipeForm {...props} />
    </Suspense>
  );
}
