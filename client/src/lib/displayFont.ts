// The display face (docs/ux/plan.md §6): Fraunces, SIL OFL (public/fonts/OFL.txt), cut down to
// what the titles use (Latin, weights 500–700, one optical size: 29.5 kB). In public/, by its
// path: the dev server didn't rewrite a relative url() in globals.css.
//
// Loaded once the page has loaded, not with it: fetched with the page, it slowed the recipe's
// JS and data on a phone's link, and a recipe showed 300–450 ms later (docs/metrics/m06.md,
// Miss 1). Until it's here the titles are in a Georgia sized to match ("Fraunces Fallback" in
// globals.css), so nothing moves when it swaps in; after the first visit it's cached.
export function loadDisplayFont() {
  const font = new FontFace("Fraunces", 'url("/fonts/fraunces.woff2") format("woff2")', {
    weight: "500 700",
  });
  const load = async () => {
    document.fonts.add(await font.load());
  };
  // Not having it is fine: the titles stay in Georgia.
  const loadQuietly = () => void load().catch(() => undefined);
  if (document.readyState === "complete") loadQuietly();
  else window.addEventListener("load", loadQuietly, { once: true });
}
