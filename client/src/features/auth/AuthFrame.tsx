import type { ReactNode } from "react";

// Log in, Sign up and "We couldn't reach Pinch"'s frame (design §14): the logo over a card, in the
// middle of the screen. Not the app's header: its tabs, counts and Write a recipe are a signed-in
// user's, and each would only lead back here. The footer links to the other page.
// The logo is the page's: Log in and Sign up draw the wordmark inline (Wordmark, in their lazy
// chunk), SessionError, in the entry, as a file. role="alert" goes on the card, not on <main>,
// which must keep its own role (axe).
export function AuthFrame({
  title,
  tabTitle = `${title} · Pinch`,
  logo,
  role,
  children,
  footer,
}: {
  title: string;
  tabTitle?: string;
  logo: ReactNode;
  role?: "alert";
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <title>{tabTitle}</title>
      {logo}
      <div
        role={role}
        className="mt-8 w-full max-w-sm rounded-card border border-border bg-card p-6 sm:p-8"
      >
        <h1 className="text-3xl font-bold tracking-tight text-balance">{title}</h1>
        {children}
      </div>
      {footer && <p className="mt-6 text-center text-text-muted">{footer}</p>}
    </main>
  );
}
