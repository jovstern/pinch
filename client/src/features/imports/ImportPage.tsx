import { useQuery } from "@tanstack/react-query";
import { PenLine } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "../../components/ui/Button.tsx";
import { cn } from "../../lib/cn.ts";
import { useHeadingFocus } from "../../lib/useHeadingFocus.ts";
import { ImportList } from "./ImportList.tsx";
import { importListQuery } from "./importQueries.ts";
import { LazyImportForm } from "./LazyImportForm.tsx";
import { LazyPasteHelp } from "./LazyPasteHelp.tsx";

// The Add recipe tab, at / (design §14, D24): paste a link or a post's text, and the queue of
// what's being turned into recipes.
export function ImportPage() {
  const { t } = useTranslation();
  // The paste box, where focus goes after an import is retried or dismissed.
  const pasteBoxRef = useRef<HTMLInputElement>(null);
  const headingRef = useHeadingFocus();
  // The queue's height decides where the centred block sits, so the block shows once the queue
  // is known (or failed to load): drawn before, it would jump as the cards arrive (CLS).
  const { isPending } = useQuery(importListQuery);
  return (
    <>
      {/* The page is named by its tab (design §16.3: "· Pinch" is kept). */}
      <title>{`${t("header.addRecipe")} · Pinch`}</title>
      {/* The selected tab names the page on screen; the heading names it for screen readers. */}
      <h1 ref={headingRef} tabIndex={-1} className="sr-only">
        {t("header.addRecipe")}
      </h1>
      {/* In the middle of the height the header leaves (main is a column here: Layout). As the
          queue grows the block grows, and once it no longer fits my-auto is 0: the field is at
          the top and the page scrolls. Not justify-center, which would push the top out of
          reach. */}
      <div className={cn("my-auto", isPending && "invisible")}>
        <LazyImportForm inputRef={pasteBoxRef} />
        {/* Screenshots: hidden for now (user, 2026-11-10). <ScreenshotsUpload /> */}
        {/* The other way in, quiet: the paste is the main one (design §14). Write a recipe's
            pen, as in the header. Then, under Pinch it, the (i): where to find a post's link.
            Left to right in Hebrew too, as the box above (§16.4): the link on the left, the (i)
            on the right. */}
        <div dir="ltr" className="mt-1 flex items-center justify-between gap-2">
          <Button asChild variant="link" className="px-0 text-sm">
            <Link to="/recipes/new">
              <PenLine aria-hidden="true" className="size-4" />
              {t("imports.writeItYourself")}
            </Link>
          </Button>
          <LazyPasteHelp />
        </div>
        <ImportList focusPasteBox={() => pasteBoxRef.current?.focus()} />
      </div>
    </>
  );
}
