import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <>
      <title>{`${t("frame.notFound")} · Pinch`}</title>
      <h1 className="mt-8 text-3xl font-bold tracking-tight text-balance">{t("frame.notFound")}</h1>
      <p className="mt-3 text-pretty text-text-muted">{t("frame.nothingHere")}</p>
      <Link to="/recipes" className="mt-3 inline-block font-semibold text-accent-strong underline">
        {t("frame.backToRecipes")}
      </Link>
    </>
  );
}
