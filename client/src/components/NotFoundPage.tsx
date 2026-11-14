import { MapPinOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { EmptyState } from "./EmptyState.tsx";
import { Button } from "./ui/Button.tsx";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <>
      <title>{`${t("frame.notFound")} · Pinch`}</title>
      <EmptyState
        icon={MapPinOff}
        as="h1"
        title={t("frame.notFound")}
        subtitle={t("frame.nothingHere")}
        action={
          <Button asChild>
            <Link to="/recipes">{t("frame.backToRecipes")}</Link>
          </Button>
        }
      />
    </>
  );
}
