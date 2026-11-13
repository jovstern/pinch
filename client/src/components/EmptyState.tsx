import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  // Decoration: the title says it.
  icon: LucideIcon;
  // h1 when it is the whole page (not found, the page that didn't load), h2 inside one.
  as: "h1" | "h2";
  title: string;
  subtitle: ReactNode;
  // The way on: one button, or nothing.
  action?: ReactNode;
  // "alert" for a failure, so a screen reader says it as it appears.
  role?: "alert";
};

// A page with nothing to show (design §14): an icon, a title, a line under it and the way on, in
// the middle of the height the header leaves. my-auto centres it in a flex column: the tab pages'
// main is one, and Layout's main becomes one for any page whose content is this (data-empty-state).
export function EmptyState({
  icon: Icon,
  as: Heading,
  title,
  subtitle,
  action,
  role,
}: EmptyStateProps) {
  return (
    <div data-empty-state="" role={role} className="my-auto text-center">
      <Icon
        aria-hidden="true"
        className="mx-auto size-[5em] text-muted-foreground"
        strokeWidth={1.5}
      />
      <Heading className="mt-1 text-xl font-semibold text-balance">{title}</Heading>
      <p className="mt-2 text-pretty text-muted-foreground">{subtitle}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
