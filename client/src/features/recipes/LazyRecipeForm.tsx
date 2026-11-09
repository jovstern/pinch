import { lazy, Suspense, useEffect, type ComponentProps } from "react";

// The form and its library load only when a form opens, while the page's heading shows at once:
// in the first load they'd put the JS over its 150 kB budget (docs/metrics/m02.md). New, Edit
// and an import's review use it.
const loadRecipeForm = () => import("./RecipeForm.tsx");
const RecipeForm = lazy(async () => ({
  default: (await loadRecipeForm()).RecipeForm,
}));

// A page that shows the form only after its data arrives (Edit, Review) starts the form's chunk
// as it opens, so the two load side by side, not one after the other (docs/metrics/m06.md).
export function usePreloadRecipeForm() {
  // An effect: it starts a download, something outside React; once, as the page opens.
  useEffect(() => {
    void loadRecipeForm();
  }, []);
}

export function LazyRecipeForm(props: ComponentProps<typeof RecipeForm>) {
  return (
    <Suspense fallback={<p className="mt-6 text-text-muted">Loading the form…</p>}>
      <RecipeForm {...props} />
    </Suspense>
  );
}
