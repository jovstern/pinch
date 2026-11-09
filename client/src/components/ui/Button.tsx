import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "../../lib/cn.ts";

// shadcn/ui's Button (D26), on Pinch's tokens: 44 px tall for touch, body-size text, and the
// global focus ring (globals.css). One look per kind of action, so every button and button-like
// link matches. An unavailable one (aria-disabled) doesn't answer hover or a press.
const buttonVariants = cva(
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-control px-4 font-semibold whitespace-nowrap disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:not-aria-disabled:bg-primary/90 active:not-aria-disabled:bg-primary/80",
        // A fill, not a bordered box (plan §6: depth from surfaces, not lines).
        secondary:
          "bg-secondary text-secondary-foreground hover:not-aria-disabled:bg-border active:not-aria-disabled:bg-border/70",
        // Only for what can't be undone. Its label is on-accent too (globals.css).
        destructive:
          "bg-destructive text-on-accent hover:not-aria-disabled:bg-destructive/90 active:not-aria-disabled:bg-destructive/80",
        // A destructive action that isn't the page's main one (or only opens a question): it
        // shouldn't shout.
        "destructive-ghost":
          "text-destructive hover:not-aria-disabled:bg-destructive/10 active:not-aria-disabled:bg-destructive/20",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    // Render the child instead (a Link, a Radix trigger) with these styles (Radix Slot).
    asChild?: boolean;
  };

export function Button({ className, variant, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";
  return <Component className={cn(buttonVariants({ variant }), className)} {...props} />;
}
