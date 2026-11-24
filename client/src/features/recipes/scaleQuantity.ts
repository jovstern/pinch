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
// What's read: those, and a few more recipes write but a scaled amount isn't shown in.
const GLYPHS: Record<string, number> = {
  ...Object.fromEntries(FRACTIONS.map(([value, glyph]) => [glyph, value])),
  "⅕": 1 / 5,
  "⅙": 1 / 6,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
};

// One number, in the forms recipes write it: "1 1/2" or "1-1/2", "1/2", "1½" or "½", "1.5",
// ".5", "1,5" or "1,000" (a comma before three digits groups thousands), "2".
const NUMBER = String.raw`(?:\d+[ -])?\d+\/\d+|(?:\d+ ?)?[⅛¼⅓½⅔¾⅕⅙⅜⅝⅞]|\d*[.,]?\d+`;
// The quantity's amount: its first number, or a range ("2-3", "2 – 3").
const AMOUNT = new RegExp(`(${NUMBER})(?:\\s?([-–])\\s?(${NUMBER}))?`);

// A quantity for more or fewer people (design D48): its amount multiplied, the rest kept as
// written, so "2-3" becomes "4-6", "2 x 400" becomes "4 x 400" (the pack's size isn't the
// amount) and "a pinch" stays "a pinch". Only for showing: the recipe isn't changed.
export function scaleQuantity(quantity: string, factor: number) {
  if (factor === 1) return quantity;
  return quantity.replace(AMOUNT, (match: string, from: string, dash?: string, to?: string) => {
    const low = read(from);
    const high = to === undefined ? undefined : read(to);
    // "1/0" isn't an amount: left as written.
    if (!Number.isFinite(low) || (high !== undefined && !Number.isFinite(high))) return match;
    const scaled = formatAmount(low * factor);
    return high === undefined ? scaled : `${scaled}${dash ?? "-"}${formatAmount(high * factor)}`;
  });
}

export function scaleIngredients(ingredients: Ingredient[], factor: number): Ingredient[] {
  return ingredients.map((ingredient) =>
    ingredient.quantity
      ? { ...ingredient, quantity: scaleQuantity(ingredient.quantity, factor) }
      : ingredient,
  );
}

// One NUMBER's value.
function read(number: string) {
  const fraction = /^(?:(\d+)[ -])?(\d+)\/(\d+)$/.exec(number);
  if (fraction) {
    const [, whole = "0", top, bottom] = fraction;
    return Number(whole) + Number(top) / Number(bottom);
  }
  const glyph = /^(?:(\d+) ?)?(.)$/u.exec(number);
  if (glyph?.[2] && glyph[2] in GLYPHS) return Number(glyph[1] ?? 0) + (GLYPHS[glyph[2]] ?? 0);
  return Number(/^\d+,\d{3}$/.test(number) ? number.replace(",", "") : number.replace(",", "."));
}

// 1.5 → "1½", 0.333 → "⅓", 2.4 → "2.4", 133.3 → "133", 0.04 → "0.04": from 10 a whole number
// (no one weighs 133⅓ g); under it a fraction when it's close to one a cook measures, else a
// tenth; and never 0 for something there is some of.
function formatAmount(amount: number) {
  if (amount >= 10) return String(Math.round(amount));
  if (amount < 0.1) return String(Number(amount.toPrecision(1)));
  const whole = Math.floor(amount);
  const rest = amount - whole;
  if (rest < 0.04) return String(whole);
  if (rest > 0.96) return String(whole + 1);
  const fraction = FRACTIONS.find(([value]) => Math.abs(rest - value) < 0.04);
  if (fraction) return `${whole > 0 ? String(whole) : ""}${fraction[1]}`;
  return String(Math.round(amount * 10) / 10);
}
