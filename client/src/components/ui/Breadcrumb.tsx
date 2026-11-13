import { ChevronRight } from "lucide-react";
import { Fragment } from "react";
import { Link } from "react-router";

type BreadcrumbProps = {
  // The pages above this one, from the top: "My recipes", then (in the editor) the recipe.
  links: { label: string; to: string }[];
  // This page: plain text, not a link.
  page: string;
};

// shadcn/ui's Breadcrumb markup (D26), on Pinch's tokens, as one component: every inner page
// says where it belongs (D24). The links are React Router's. Where Pinch departs from shadcn: one
// prop per part instead of six parts to compose, as the pages only ever pass links and a page;
// each link 44 px tall for touch; one row, where only the recipe's title is cut with an
// ellipsis, never the first crumb (the way back), and at 28 characters on every width, so a long
// title never pushes "Cook" or "Edit" to the far side of a wide screen.
export function Breadcrumb({ links, page }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="-mx-1 flex items-center gap-1 text-sm text-muted-foreground">
        {links.map((link, index) => (
          <Fragment key={link.to}>
            <li className={index === 0 ? "shrink-0" : "max-w-[28ch] min-w-0"}>
              <Link
                to={link.to}
                dir="auto"
                className="block truncate px-1 leading-11 underline-offset-4 hover:text-foreground hover:underline"
              >
                {link.label}
              </Link>
            </li>
            <li role="presentation" aria-hidden="true" className="shrink-0">
              {/* Points the reading way, so it mirrors in Hebrew (design §16.4). */}
              <ChevronRight className="size-3.5 rtl:-scale-x-100" />
            </li>
          </Fragment>
        ))}
        {/* The title is the page itself (My recipes › title) or the link before it (My recipes ›
            title › Cook): only the title gives way, so "Cook" or "Edit" stays whole. */}
        <li className={links.length > 1 ? "shrink-0" : "max-w-[28ch] min-w-0"}>
          <span
            aria-current="page"
            dir="auto"
            className="block truncate px-1 font-medium text-foreground"
          >
            {page}
          </span>
        </li>
      </ol>
    </nav>
  );
}
