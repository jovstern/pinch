import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />;
  return (
    <div role="alert">
      <title>{`${t("recipe.notLoaded")} · Pinch`}</title>
      <h1 className="mt-8 text-3xl font-bold tracking-tight text-balance">
        {t("recipe.couldntLoad")}
      </h1>
      <Button
        type="button"
        variant="secondary"
        onClick={retry}
        disabled={retrying}
        aria-busy={retrying}
        className="mt-3"
      >
        {retrying ? t("auth.trying") : t("auth.tryAgain")}
      </Button>
    </div>
  );
}
