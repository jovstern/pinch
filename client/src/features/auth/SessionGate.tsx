import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { whenSignedOut } from "../../lib/api.ts";
import { meQuery, signedOutHere } from "./authQueries.ts";
import { nextPage } from "./nextPage.ts";
import { SessionError } from "./SessionError.tsx";

// Who may see a page (design §8.3): the app's pages are for a signed-in user, Log in and Sign up
// for a signed-out one, and each sends the other kind of visitor where they belong. A layout
// route around each group (App.tsx), so the routes stay declarative (D21).
export function SessionGate({ signedIn }: { signedIn: boolean }) {
  const queryClient = useQueryClient();
  const { pathname, search } = useLocation();
  const { data: me, isPending, isError, isFetching, refetch } = useQuery(meQuery);
  // An effect: it hands a handler to lib/api.ts, outside React. A 401 from the API then signs
  // the user out here, which sends them to Log in (below).
  useEffect(
    () =>
      whenSignedOut(() => {
        signedOutHere(queryClient);
      }),
    [queryClient],
  );

  // Not known yet: nothing, rather than a page that would flash away. It's preloaded, so short.
  if (isPending) return null;
  if (isError) {
    return (
      <SessionError
        retry={() => {
          void refetch();
        }}
        retrying={isFetching}
      />
    );
  }
  if (signedIn && me === null) {
    const here = pathname + search;
    const next = here === "/" ? "" : `?next=${encodeURIComponent(here)}`;
    return <Navigate replace to={`/login${next}`} />;
  }
  // Already signed in (a bookmark of /login): on to next, the same user, so no new page is needed.
  if (!signedIn && me) return <Navigate replace to={nextPage(search)} />;
  return <Outlet />;
}
