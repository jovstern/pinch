import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../../components/EmptyState.tsx";

// All recipes: the recipes saved across Pinch, ranked, for a user to copy into theirs. Not in
// v1: it needs many recipes first (design §14.1). Until then the tab opens this placeholder.
export function ExplorePage() {
  const { t } = useTranslation();
  return (
    <>
      <title>{`${t("header.allRecipes")} · Pinch`}</title>
      <EmptyState
        icon={Globe}
        as="h1"
        title={t("explore.comingSoon")}
        subtitle={t("explore.willBe")}
      />
    </>
  );
}
