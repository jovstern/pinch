import type { Ingredient } from "@pinch/shared";

// The fractions a cook measures in, by their value: an amount is shown as one when it's close.
const FRACTIONS: [number, string][] = [
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
];
const GLYPHS: Record<string, number> = Object.fromEntries(
  FRACTIONS.map(([value, glyph]) => [glyph, value]),
);

// A number in a quantity, in the forms recipes write it (the longest first): "1½" or "½", "1 1/2",
// "1/2", "1.5", "1,5" or "1,000" (a comma before three digits groups thousands), "2".
const AMOUNT = /(?:(\d+) ?)?([⅛¼⅓½⅔¾])|(\d+) (\d+)\/(\d+)|(\d+)\/(\d+)|\d+(?:[.,]\d+)?/g;

// A quantity for more or fewer people (design D48): each number in it multiplied, the rest kept,
// so "2-3" becomes "4-6" and "a pinch" stays "a pinch". Only for showing: the recipe isn't changed.
export function scaleQuantity(quantity: string, factor: number) {
  if (factor === 1) return quantity;
  const scaled = quantity.replace(
    AMOUNT,
    (
      match: string,
      whole?: string,
      glyph?: string,
      mixed?: string,
      top?: string,
      bottom?: string,
      numerator?: string,
      divisor?: string,
    ) => {
      let amount: number;
      if (glyph) amount = Number(whole ?? 0) + (GLYPHS[glyph] ?? 0);
      else if (mixed) amount = Number(mixed) + Number(top) / Number(bottom);
      else if (numerator) amount = Number(numerator) / Number(divisor);
      else
        amount = Number(
          /^\d+,\d{3}$/.test(match) ? match.replace(",", "") : match.replace(",", "."),
        );
      // "1/0" isn't an amount: left as written.
      return Number.isFinite(amount) ? formatAmount(amount * factor) : match;
    },
  );
  // An amount with a fraction ("2¼", "3-4½") set left to right in an isolate: the fraction is a
  // neutral character, so a Hebrew line would put it before the number ("¼2"). As ranges.ts.
  return scaled.replace(WITH_FRACTION, "\u2066$&\u2069");
}

const WITH_FRACTION = /(?:\d+[-–])?\d*[⅛¼⅓½⅔¾]/g;

export function scaleIngredients(ingredients: Ingredient[], factor: number): Ingredient[] {
  return ingredients.map((ingredient) =>
    ingredient.quantity
      ? { ...ingredient, quantity: scaleQuantity(ingredient.quantity, factor) }
      : ingredient,
  );
}

// 1.5 → "1½", 0.333 → "⅓", 2.4 → "2.4", 133.3 → "133": from 10 a whole number (no one weighs
// 133⅓ g); under it a fraction when it's close to one a cook measures, else a tenth.
function formatAmount(amount: number) {
  if (amount >= 10) return String(Math.round(amount));
  const whole = Math.floor(amount);
  const rest = amount - whole;
  if (rest < 0.04) return String(whole);
  if (rest > 0.96) return String(whole + 1);
  const fraction = FRACTIONS.find(([value]) => Math.abs(rest - value) < 0.04);
  if (fraction) return `${whole > 0 ? String(whole) : ""}${fraction[1]}`;
  return String(Math.round(amount * 10) / 10);
}
