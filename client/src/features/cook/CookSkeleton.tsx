import { useTranslation } from "react-i18next";

// While cook mode loads (its chunk, then the recipe): the page's shape, so it doesn't jump from one
// line of text to the step. Said once for screen readers; the shapes are hidden.
export function CookSkeleton() {
  const { t } = useTranslation();
  return (
    <>
      <p className="sr-only">{t("recipe.loading")}</p>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        {/* As CookPage: the breadcrumbs, title, subtitle, the step's label, bar and card. */}
        <div className="my-3 h-5 w-48 rounded-control bg-fill" />
        <div className="mt-2 h-9 w-2/3 rounded-control bg-fill" />
        <div className="mt-2 h-5 w-56 rounded-control bg-fill" />
        <div className="mt-8 h-5 w-24 rounded-control bg-fill" />
        <div className="mt-2 h-1 rounded-full bg-fill" />
        <div className="mt-4 h-48 w-[calc(100%-2rem)] rounded-card bg-fill" />
      </div>
    </>
  );
}
