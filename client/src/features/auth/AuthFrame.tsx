import type { ReactNode } from "react";

// Log in and Sign up's frame (design §14): the logo over a card, in the middle of the screen. Not
// the app's header: its tabs, counts and Write a recipe are a signed-in user's, and each would only
// lead back here. The footer links to the other page.
export function AuthFrame({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <title>{`${title} · Pinch`}</title>
      {/* The wordmark (D24), in the dark theme's accent in the dark theme, as in the header. */}
      <picture>
        <source media="(prefers-color-scheme: dark)" srcSet="/logo-dark.svg" />
        <img src="/logo.svg" alt="Pinch" width={79} height={32} className="h-10 w-auto" />
      </picture>
      <div className="mt-8 w-full max-w-sm rounded-card border border-border bg-card p-6 sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {children}
      </div>
      <p className="mt-6 text-center text-text-muted">{footer}</p>
    </main>
  );
}
