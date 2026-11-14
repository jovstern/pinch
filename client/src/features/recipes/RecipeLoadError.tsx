import { CloudOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../../components/EmptyState.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { NotFoundPage } from "../../components/NotFoundPage.tsx";
import { ApiError } from "../../lib/api.ts";

type RecipeLoadErrorProps = {
  error: Error;
  retry: () => void;
  retrying: boolean;
};

// When a recipe doesn't load: "not found" if it doesn't exist (no retry would change that),
// otherwise Try again, as an empty state, centred as the page that didn't load. Shared by the
// recipe page, its edit page, cook mode and an import's review page, each of which it is whole.
export function RecipeLoadError({ error, retry, retrying }: RecipeLoadErrorProps) {
  const { t } = useTranslation();
  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />;
  return (
    <>
      <title>{`${t("recipe.notLoaded")} · Pinch`}</title>
      <EmptyState
        icon={CloudOff}
        as="h1"
        title={t("recipe.couldntLoad")}
        subtitle={t("auth.checkAndTryAgain")}
        role="alert"
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={retry}
            disabled={retrying}
            aria-busy={retrying}
          >
            {retrying ? t("auth.trying") : t("auth.tryAgain")}
          </Button>
        }
      />
    </>
  );
}
