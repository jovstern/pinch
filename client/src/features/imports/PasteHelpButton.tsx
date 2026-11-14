import { Info } from "lucide-react";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button.tsx";

// The (i) under Pinch it (design §14; hidden for now, ImportPage): where each app keeps a post's link. A 44 px button; the
// props are its popover's (Radix's trigger, or LazyPasteHelp's).
export function PasteHelpButton(props: ComponentProps<"button">) {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={t("imports.pasteHelp.label")}
      aria-haspopup="dialog"
      className="size-11 shrink-0 px-0 text-muted-foreground"
      {...props}
    >
      <Info aria-hidden="true" className="size-5" />
    </Button>
  );
}
