import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { whenSignedOut } from "../../lib/api.ts";
import { meQuery, setMe } from "./authQueries.ts";

// Who may see a page (design §8.3): the app's pages are for a signed-in user, Log in and Sign up
// for a signed-out one, and each sends the other kind of visitor where they belong. A layout
// route around each group (App.tsx), so the routes stay declarative (D21).
export function SessionGate({ signedIn }: { signedIn: boolean }) {
  const queryClient = useQueryClient();
  const { pathname, search } = useLocation();
  const { data: me, isPending } = useQuery(meQuery);
  // An effect: it hands a handler to lib/api.ts, outside React. A 401 from the API then signs
  // the user out here, which sends them to Log in (below).
  useEffect(
    () =>
      whenSignedOut(() => {
        setMe(queryClient, null);
      }),
    [queryClient],
  );

  // Not known yet: nothing, rather than a page that would flash away. It's preloaded, so short.
  if (isPending) return null;
  // Couldn't be asked (offline, a 500): me is undefined, and the page shows; its own requests
  // show their error, and a 401 among them still signs out.
  if (signedIn && me === null) {
    const here = pathname + search;
    const next = here === "/" ? "" : `?next=${encodeURIComponent(here)}`;
    return <Navigate replace to={`/login${next}`} />;
  }
  if (!signedIn && me) return <Navigate replace to={nextPage(search)} />;
  return <Outlet />;
}

// Where Log in sends the user on: the page they asked for, or Add recipe. Only an address in the
// app ("/…", not "//other.site" or "/\other.site", which browsers read as another site), so a link
// can't send a user off from here.
function nextPage(search: string) {
  const next = new URLSearchParams(search).get("next") ?? "/";
  return /^\/(?![/\\])/.test(next) ? next : "/";
}
