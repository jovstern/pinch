import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/Popover.tsx";
import { pageIsRtl } from "../../i18n.ts";
import { PasteHelpButton } from "./PasteHelpButton.tsx";

// Where to find the link (design §14): one line per app, by the names their share menus use, then
// the other thing the box takes, a recipe's text. The apps' names and their menus' words stay in
// English in Hebrew too (D46, the user's call): each step reads left to right, its → intact. Loaded on the (i)'s first press (LazyPasteHelp),
// and open as it appears.
export function PasteHelp() {
  const { t } = useTranslation();
  const titleId = useId();
  // "Copy link" with a no-break space, so it's never split over two lines.
  const apps = [
    ["Instagram", t("imports.pasteHelp.instagram"), "Share (the paper plane) → Copy\u00A0link"],
    ["Facebook", t("imports.pasteHelp.facebook"), "Share → Copy\u00A0link"],
    ["YouTube", t("imports.pasteHelp.youtube"), "Share → Copy\u00A0link"],
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
          {/* In the body's face, as the Filters panel's heading: a small title, not a page's. */}
          <h2 id={titleId} className="font-sans font-semibold">
            {t("imports.pasteHelp.label")}
          </h2>
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
