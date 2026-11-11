// The post a link points to (design §4.6, D28), so the same reel pasted again (from another
// share, with other tracking parameters, from the app or the site) is found: "instagram:C9x…",
// "youtube:abc", "facebook:123…".
export function linkKey(url: string): string {
  const [, hostname = "", pathname = "", query = ""] = LINK.exec(url.trim()) ?? [];
  // "www." and "m." are the same site.
  const host = hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
  const path = pathname.replace(/\/+$/, "");
  // No id in the link (fb.watch/…, Facebook's share/r/…): the link itself, without its query
  // (tracking) or hash.
  return postId(host, path, query) ?? `url:${host}${path}`;
}

// The url has passed ImportInputSchema: http(s), on one of the platforms' hosts. Read with a
// pattern, not URL: shared/ is plain ES, which has no URL. Its parts: the host (after any
// user@, before any :port), the path, and the query (before any #hash).
const LINK = /^https?:\/\/(?:[^/?#@]*@)?([^/?#:]+)(?::\d*)?([^?#]*)(?:\?([^#]*))?/i;

// An id is kept as written: YouTube's and Instagram's are case-sensitive.
const ID = "([\\w-]+)";

function postId(host: string, path: string, query: string) {
  if (host === "instagram.com") {
    // /reel/ID, /reels/ID, /p/ID, /tv/ID, also under the author's name: /chef/reel/ID.
    const id = new RegExp(`^(?:/[^/]+)?/(?:reels?|p|tv)/${ID}$`).exec(path)?.[1];
    return id && `instagram:${id}`;
  }
  if (host === "youtu.be") {
    const id = new RegExp(`^/${ID}$`).exec(path)?.[1];
    return id && `youtube:${id}`;
  }
  if (host === "youtube.com") {
    const id = new RegExp(`^/(?:shorts|embed|live)/${ID}$`).exec(path)?.[1] ?? watched(path, query);
    return id && `youtube:${id}`;
  }
  if (host === "facebook.com") {
    // /reel/ID and /<page>/videos/ID.
    const id =
      new RegExp(`^(?:/reel|/[^/]+/videos)/${ID}$`).exec(path)?.[1] ?? watched(path, query);
    return id && `facebook:${id}`;
  }
  return undefined;
}

// /watch?v=ID: the id is the query's v.
function watched(path: string, query: string) {
  if (path !== "/watch") return undefined;
  return new RegExp(`(?:^|&)v=${ID}`).exec(query)?.[1];
}
