// A face for a recipe written by hand (design D25): no model reads it, so its title picks one.
// Kept small on purpose: a few common dishes, in English and Hebrew; any other title gets none,
// and the client shows its plate. A word that starts with a keyword counts ("soups", "eggs"), and
// a Hebrew word also without its first letter, which may be a one-letter prefix (ה, ו, ב, ל, מ,
// ש, כ: "המרק"). The lines are tried in list order and the first that matches wins, so the
// narrower dish comes first ("chicken tacos" is a taco, "eggplant" isn't an egg, "עוגיות" are
// cookies, not a cake).
const faces: [emoji: string, keywords: string[]][] = [
  ["🌮", ["taco"]],
  ["🍆", ["eggplant", "aubergine", "חציל"]],
  ["🍲", ["soup", "stew", "מרק"]],
  ["🥗", ["salad", "סלט"]],
  ["🍝", ["pasta", "spaghetti", "noodle", "lasagn", "פסטה"]],
  ["🍕", ["pizza", "פיצה"]],
  ["🍛", ["curry"]],
  ["🥞", ["pancake", "crepe", "פנקייק"]],
  ["🍪", ["cookie", "עוגיות"]],
  ["🍰", ["cake", "עוג"]],
  ["🍞", ["bread", "לחם"]],
  ["🍔", ["burger", "המבורגר"]],
  ["🍳", ["egg", "omelet", "shakshuka", "שקשוקה", "חביתה"]],
  ["🍗", ["chicken", "עוף"]],
  ["🍚", ["rice", "אורז"]],
];

export function titleEmoji(title: string) {
  const words = title
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .flatMap((word) => (/^\p{Script=Hebrew}/u.test(word) ? [word, word.slice(1)] : [word]));
  const face = faces.find(([, keywords]) =>
    keywords.some((keyword) => words.some((word) => word.startsWith(keyword))),
  );
  return face?.[0];
}
