// The display face (docs/ux/plan.md §6): Fraunces, SIL OFL (public/fonts/OFL.txt), cut down to
// what the titles use (Latin, weights 500–700, one optical size: 29.5 kB). Served from public/
// by its path.
//
// Not fetched with the page: then it shared a phone's link with the recipe's JS, data and
// picture, and a recipe showed 300–450 ms later (docs/metrics/m06.md, Miss 1). Nor at `load`:
// in this app that's before the data is even asked for. A second and a half after it, when the
// page has drawn (measured: the data pages then load as if there were no font). Until it's here
// the titles are in a Georgia sized to match ("Fraunces Fallback" in globals.css), so nothing
// moves when it swaps in; after the first visit it's cached.
const AFTER_LOAD_MS = 1500;

export function loadDisplayFont() {
  const font = new FontFace("Fraunces", 'url("/fonts/fraunces.woff2") format("woff2")', {
    weight: "500 700",
    // It's added once loaded, so it never blocks text; said anyway, for audits that look.
    display: "swap",
  });
  window.addEventListener(
    "load",
    () => {
      setTimeout(() => {
        // Not having it is fine: the titles stay in Georgia.
        font
          .load()
          .then((loaded) => document.fonts.add(loaded))
          .catch(() => undefined);
      }, AFTER_LOAD_MS);
    },
    { once: true },
  );
}
