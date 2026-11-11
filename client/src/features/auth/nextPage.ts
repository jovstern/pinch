// Where Log in sends the user on (design §8.3): ?next=, the page they asked for, or Add recipe.
// Only an address on this site, read as the browser reads it: new URL drops tabs and new lines
// ("/\t/x" is "//x") and takes "//x" or "/\x" as another site, and "javascript:" has no origin.
// A path that starts "//" after its dots are resolved ("/.//x", "/a/..//x") is refused too:
// written into a Location header or the address bar, a browser reads it as the site x.
export function nextPage(search: string) {
  const next = new URLSearchParams(search).get("next") ?? "/";
  const url = new URL(next, window.location.origin);
  return url.origin === window.location.origin && !url.pathname.startsWith("//")
    ? url.pathname + url.search + url.hash
    : "/";
}
