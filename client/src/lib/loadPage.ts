// A full navigation: a new document, not a route change. For a change of user (design §8.3): the
// new document asks again for what index.html preloads, now with the new cookie, and starts with
// nothing of the last user's (cached queries, toasts, module state). A function of its own, so a
// test can stand in for it (jsdom can't navigate).
export function loadPage(address: string) {
  window.location.replace(address);
}
