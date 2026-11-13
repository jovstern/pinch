import type { ComponentProps } from "react";
import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn.ts";
import { Button } from "./Button.tsx";

// shadcn/ui's Sheet (D26), on Pinch's tokens: a Radix Dialog (focus kept inside, Escape, focus
// back to its trigger) drawn as a panel from the bottom, over the page's floating button (z-50,
// as shadcn's). Only the bottom side, the one Pinch uses, and only on a phone: centred and
// narrower from 640 px, where the full width would be a long row, and from 768 px a dialog in the
// middle of the screen, as a sheet at the bottom of a big one looks cut off.
export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;
export const SheetTitle = SheetPrimitive.Title;

// Up to 85% of the screen, so the page above shows it's still there; the content scrolls inside.
export function SheetContent({
  className,
  children,
  ...props
}: ComponentProps<typeof SheetPrimitive.Content>) {
  const { t } = useTranslation();
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim/50" />
      <SheetPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-card bg-popover text-popover-foreground shadow-sheet sm:mx-auto sm:max-w-xl md:top-1/2 md:bottom-auto md:-translate-y-1/2 md:rounded-card",
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close asChild>
          <Button variant="ghost" aria-label={t("ui.close")} className="absolute end-2 top-2 px-3">
            <X aria-hidden="true" className="size-5" />
          </Button>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
