import { Button } from "../../components/ui/Button.tsx";
import { NotFoundPage } from "../../components/NotFoundPage.tsx";
import { ApiError } from "../../lib/api.ts";

type RecipeLoadErrorProps = {
  error: Error;
  retry: () => void;
  retrying: boolean;
};

// When a recipe doesn't load: "not found" if it doesn't exist (no retry would change that),
// otherwise Try again. Shared by the recipe page, its edit page and an import's review page.
export function RecipeLoadError({ error, retry, retrying }: RecipeLoadErrorProps) {
  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />;
  return (
    <div role="alert">
      <title>Recipe not loaded · Pinch</title>
      <h1 className="mt-8 text-3xl font-bold tracking-tight text-balance">
        We couldn't load this recipe
      </h1>
      <Button
        type="button"
        variant="secondary"
        onClick={retry}
        disabled={retrying}
        className="mt-3"
      >
        {retrying ? "Trying…" : "Try again"}
      </Button>
    </div>
  );
}
