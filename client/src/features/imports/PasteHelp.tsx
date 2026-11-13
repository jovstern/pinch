import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/Popover.tsx";
import { pageIsRtl } from "../../i18n.ts";
import { PasteHelpButton } from "./PasteHelpButton.tsx";

// Where to find the link (design §14): one line per app, by the names their share menus use, then
// the other thing the box takes, a recipe's text. Loaded on the (i)'s first press (LazyPasteHelp),
// and open as it appears.
export function PasteHelp() {
  const { t } = useTranslation();
  const titleId = useId();
  // The apps' names stay in English (D46).
  const apps = [
    ["Instagram", t("imports.pasteHelp.instagram")],
    ["Facebook", t("imports.pasteHelp.facebook")],
    ["YouTube", t("imports.pasteHelp.youtube")],
  ];
  return (
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <PasteHelpButton />
      </PopoverTrigger>
      {/* At the (i)'s end, which is on the right in both languages (the row is left to right,
          §16.4), so the popover is too. Its words read in the page's direction, set inside it: a
          dir on the content would reach Radix's positioning, which reads "end" as the left in
          RTL. A fixed width, never wider than the screen. */}
      <PopoverContent
        align="end"
        aria-labelledby={titleId}
        className="w-80 max-w-[calc(100vw-2rem)]"
      >
        <div dir={pageIsRtl() ? "rtl" : "ltr"}>
          <p id={titleId} className="font-semibold">
            {t("imports.pasteHelp.label")}
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            {apps.map(([app, where]) => (
              <div key={app}>
                <dt className="font-semibold">{app}</dt>
                <dd className="text-text-muted">{where}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm">{t("imports.pasteHelp.text")}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
