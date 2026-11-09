import type { ComponentProps } from "react";
import { Slot } from "radix-ui";

// One look per kind of action, so every button and button-like link matches (styling.md).
const variants = {
  primary: "bg-accent-strong text-on-accent hover:bg-accent-strong/90 active:bg-accent-strong/80",
  // A tinted fill, not a bordered box (plan §6: depth from surfaces, not lines).
  secondary: "bg-surface-sunken hover:bg-border active:bg-border/70",
  danger: "bg-danger text-on-accent hover:bg-danger/90 active:bg-danger/80",
  // A destructive action that isn't the page's main one (or only opens a question): it
  // shouldn't shout.
  "danger-quiet": "text-danger hover:bg-danger/10 active:bg-danger/20",
};

type ButtonProps = ComponentProps<"button"> & {
  variant: keyof typeof variants;
  // Render the child instead (a Link, a Radix trigger) with these styles (Radix Slot).
  asChild?: boolean;
};

export function Button({ variant, asChild = false, className = "", ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      className={`inline-flex min-h-11 items-center justify-center rounded-control px-4 font-semibold disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
