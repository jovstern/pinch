// A duration a step mentions, as it's written and in seconds, for a timer (docs/ux/plan.md U2).
export type Duration = { label: string; seconds: number };

// Each unit as recipes write it, in English and Hebrew, and its length in seconds.
const UNIT_SECONDS: Record<string, number> = {
  second: 1,
  seconds: 1,
  sec: 1,
  secs: 1,
  minute: 60,
  minutes: 60,
  min: 60,
  mins: 60,
  hour: 3600,
  hours: 3600,
  hr: 3600,
  hrs: 3600,
  שנייה: 1,
  שניה: 1,
  שניות: 1,
  דקה: 60,
  דקות: 60,
  שעה: 3600,
  שעות: 3600,
};

// A number (1.5, or 1,5 as Hebrew writes it), or a range ("6–7", "10 to 12", "10 עד 12"),
// then a unit as a whole word: "20 min", "a 20-minute rest", "10 דקות". Not "1 minced onion":
// the unit must end where the word does. (A shorter unit listed first, as "min" before "mins",
// is fine: when the word goes on, the match tries the longer one.) Not after a digit, "/" or a
// decimal point, so "1 1/2 hours" times nothing rather than 2 hours.
const NUMBER = "\\d+(?:[.,]\\d+)?";
const DURATION = new RegExp(
  `(?:^|[^\\d./,])((${NUMBER})(?:\\s*(?:[-–]|to|עד)\\s*${NUMBER})?\\s*-?\\s*(${Object.keys(UNIT_SECONDS).join("|")}))(?!\\p{L})`,
  "giu",
);

// The durations in a step, in order. A range's timer is its shorter end: the cook checks then,
// and can start another.
export function stepDurations(step: string): Duration[] {
  return [...step.matchAll(DURATION)].map(([, label = "", amount = "", unit = ""]) => ({
    label,
    // Always found: the pattern only matches the table's units.
    seconds: Number(amount.replace(",", ".")) * (UNIT_SECONDS[unit.toLowerCase()] ?? 0),
  }));
}
