import { pageLanguage } from "../i18n.ts";

// Minutes and nutrition, the numbers that can pass 1000, by Intl in the page's language (design
// §16.3): "1,440" in both, with Western digits in Hebrew too. Smaller counts are said as they are.
export function formatNumber(number: number) {
  return new Intl.NumberFormat(pageLanguage()).format(number);
}
