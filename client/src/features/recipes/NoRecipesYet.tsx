import { ShoppingBasket } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { EmptyState } from "../../components/EmptyState.tsx";
import { Button } from "../../components/ui/Button.tsx";

// My recipes before the first recipe: a way to Add recipe. Write a recipe is already on the page
// (Header).
export function NoRecipesYet() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={ShoppingBasket}
      as="h2"
      title={t("recipes.noRecipesYet")}
      subtitle={t("recipes.pinchOrWrite")}
      action={
        <Button asChild>
          <Link to="/">{t("recipes.pinchRecipe")}</Link>
        </Button>
      }
    />
  );
}
