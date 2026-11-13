import type { Import } from "@pinch/shared";
import { ExternalLink, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { platformNames } from "../../lib/platformNames.ts";

// At the top of a draft (design §14, shadcn's Alert): where Pinch read it, and the way back to
// the post to compare. The things to look at are counted under it, and marked on their fields
// (RecipeForm).
export function DraftBanner({ input }: { input: Import["input"] }) {
  const { t } = useTranslation();
  // Whole sentences, as Hebrew joins "from" to the word after it (מ‑Instagram, מהטקסט).
  const readFrom =
    input.type === "link"
      ? t("editor.readFromPlatform", { platform: platformNames[input.platform] })
      : input.type === "text"
        ? t("editor.readFromText")
        : t("editor.readFromScreenshots");
  return (
    <div className="flex gap-3 rounded-card border border-border p-4">
      <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold">{readFrom}</p>
        <p className="text-sm text-muted-foreground">{t("editor.checkThenSave")}</p>
        {/* A new tab: going to the post here would lose what was typed. */}
        {input.type === "link" && (
          <a
            href={input.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1 text-sm underline underline-offset-4 hover:text-foreground"
          >
            {t("editor.watchVideo")}
            <span className="sr-only"> {t("recipe.opensInNewTab")}</span>
            {/* Its arrow leaves toward the end, so it mirrors in Hebrew (design §16.4). */}
            <ExternalLink aria-hidden="true" className="size-3.5 rtl:-scale-x-100" />
          </a>
        )}
      </div>
    </div>
  );
}
