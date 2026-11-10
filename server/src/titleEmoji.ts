// A face for a recipe written by hand (design D25): no model reads it, so its title picks one.
// Kept small on purpose: a few common dishes, in English and Hebrew; any other title gets none,
// and the client shows its plate. A word that starts with a keyword counts ("soups", "eggs"),
// and the first line that matches wins, so the narrower dish comes first ("chicken tacos" is a
// taco, "eggplant" isn't an egg).
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
  ["🍰", ["cake", "עוגה"]],
  ["🍞", ["bread", "לחם"]],
  ["🍔", ["burger", "המבורגר"]],
  ["🍳", ["egg", "omelet", "shakshuka", "שקשוקה", "חביתה"]],
  ["🍗", ["chicken", "עוף"]],
  ["🍚", ["rice", "אורז"]],
];

export function titleEmoji(title: string) {
  const words = title.toLowerCase().split(/[^\p{L}]+/u);
  const face = faces.find(([, keywords]) =>
    keywords.some((keyword) => words.some((word) => word.startsWith(keyword))),
  );
  return face?.[0];
}
