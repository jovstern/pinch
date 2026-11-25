import { useTranslation } from "react-i18next";
import { LazyInfoPopover } from "../../components/LazyInfoPopover.tsx";

// Where to find the link (design §14; hidden for now, ImportPage): one line per app, by the names
// their share menus use, then the other thing the box takes, a recipe's text. The apps' names and
// their menus' words stay in English in Hebrew too (D46, the user's call): each step reads left to
// right, its → intact. At the (i)'s end, on the right in both languages (the row is left to right,
// §16.4).
export function LazyPasteHelp() {
  const { t } = useTranslation();
  // "Copy link" with a no-break space, so it's never split over two lines.
  const apps = [
    ["Instagram", t("imports.pasteHelp.instagram"), "Share (the paper plane) → Copy link"],
    ["Facebook", t("imports.pasteHelp.facebook"), "Share → Copy link"],
    ["YouTube", t("imports.pasteHelp.youtube"), "Share → Copy link"],
  ];
  return (
    <LazyInfoPopover label={t("imports.pasteHelp.label")} align="end">
      <dl className="mt-3 space-y-2 text-sm">
        {apps.map(([app, where, steps]) => (
          <div key={app}>
            <dt className="font-semibold">{app}</dt>
            <dd className="text-muted-foreground">
              {where}{" "}
              <span dir="ltr" lang="en">
                {steps}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm">{t("imports.pasteHelp.text")}</p>
    </LazyInfoPopover>
  );
}
