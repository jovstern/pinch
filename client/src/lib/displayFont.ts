// The display face (docs/ux/plan.md §6): Fraunces, SIL OFL (public/fonts/OFL.txt), cut down to
// what the titles use (Latin, weights 500–700, one optical size: 29.5 kB). Served from public/
// by its path.
//
// Not fetched with the page: then it shared a phone's link with the recipe's JS and data, and a
// recipe showed 300–450 ms later (docs/metrics/m06.md, Miss 1). It starts once the page has
// loaded (the JS; the data may still be on its way). Until it's here the titles are in a
// Georgia sized to match ("Fraunces Fallback" in globals.css); after the first visit it's cached.
export function loadDisplayFont() {
  const font = new FontFace("Fraunces", 'url("/fonts/fraunces.woff2") format("woff2")', {
    weight: "500 700",
  });
  window.addEventListener(
    "load",
    () => {
      // Not having it is fine: the titles stay in Georgia.
      font
        .load()
        .then((loaded) => document.fonts.add(loaded))
        .catch(() => undefined);
    },
    { once: true },
  );
}
