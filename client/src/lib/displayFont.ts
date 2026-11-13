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

// Fraunces has no Hebrew, so a Hebrew title gets Frank Ruhl Libre (design §16.6, D45), SIL OFL
// (public/fonts/frank-ruhl-libre-OFL.txt), as a second "Fraunces" face for the Hebrew block only:
// 9.6 kB. Made with fonttools 4.68 from google/fonts' ofl/frankruhllibre/FrankRuhlLibre[wght].ttf
// at commit a60a77e (upstream fontef/frankruhllibre 2372d19):
//   fonttools varLib.instancer "FrankRuhlLibre[wght].ttf" wght=500:700 -o frl-500-700.ttf
//   pyftsubset frl-500-700.ttf --unicodes="U+0590-05FF,U+FB1D-FB4F" --flavor=woff2 \
//     --output-file=frank-ruhl-libre.woff2
const HEBREW = "U+0590-05FF, U+FB1D-FB4F";

export function loadDisplayFont() {
  const font = new FontFace("Fraunces", 'url("/fonts/fraunces.woff2") format("woff2")', {
    weight: "500 700",
    // It's added once loaded, so it never blocks text; said anyway, for audits that look.
    display: "swap",
  });
  const hebrew = new FontFace("Fraunces", 'url("/fonts/frank-ruhl-libre.woff2") format("woff2")', {
    weight: "500 700",
    unicodeRange: HEBREW,
    // Added before it's loaded, so this one applies: the sized fallback ("Frank Ruhl Fallback"
    // in globals.css) is drawn until it arrives.
    display: "swap",
  });
  window.addEventListener(
    "load",
    () => {
      setTimeout(() => {
        // Not loaded here: the browser fetches it only when Hebrew is drawn in this family, so
        // a page with no Hebrew title never does.
        document.fonts.add(hebrew);
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
