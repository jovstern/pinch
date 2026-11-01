import { Button } from "../../components/Button.tsx";
import { NotFoundPage } from "../../components/NotFoundPage.tsx";
import { ApiError } from "../../lib/api.ts";

type RecipeLoadErrorProps = {
  error: Error;
  retry: () => void;
  retrying: boolean;
};

// When a recipe doesn't load: "not found" if it doesn't exist (no retry would change that),
// otherwise Try again. Shared by the recipe page and its edit page.
export function RecipeLoadError({ error, retry, retrying }: RecipeLoadErrorProps) {
  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />;
  return (
    <div role="alert">
      <p>We couldn't load this recipe.</p>
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
