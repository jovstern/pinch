import { useTranslation } from "react-i18next";
import { Skeleton } from "../../components/ui/Skeleton.tsx";

// While a recipe loads: its top's shape (as RecipePage: breadcrumbs, the picture, the title,
// the subtitle, Cook and ⋯), so the page doesn't jump from one line of text to the recipe. Said
// once for screen readers; the shapes are hidden.
export function RecipeSkeleton() {
  const { t } = useTranslation();
  return (
    <>
      <p className="sr-only">{t("recipe.loading")}</p>
      <div aria-hidden="true">
        <Skeleton className="my-3 h-5 w-48" />
        <div className="mt-2 lg:flex lg:items-end lg:gap-12">
          <Skeleton className="-mx-4 aspect-5/4 rounded-none sm:mx-0 sm:max-h-96 sm:rounded-card lg:aspect-4/5 lg:w-80 lg:shrink-0" />
          <div className="mt-4 grow lg:mt-0">
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="mt-2 h-5 w-1/2" />
            <div className="mt-5 flex gap-2">
              <Skeleton className="h-11 flex-1 sm:w-48 sm:flex-none" />
              <Skeleton className="size-11" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
