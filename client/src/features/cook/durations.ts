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
  שניות: 1,
  דקה: 60,
  דקות: 60,
  שעה: 3600,
  שעות: 3600,
};

// A number, or a range ("6–7"), then a unit as a whole word: "20 min", "6-7 minutes",
// "10 דקות". Not "1 minced onion": the unit must end where the word does.
const DURATION = new RegExp(
  `(\\d+)(?:\\s*[-–]\\s*\\d+)?\\s*(${Object.keys(UNIT_SECONDS).join("|")})(?!\\p{L})`,
  "giu",
);

// The durations in a step, in order. A range's timer is its shorter end: the cook checks then,
// and can start another.
export function stepDurations(step: string): Duration[] {
  return [...step.matchAll(DURATION)].map(([label, amount = "", unit = ""]) => ({
    label,
    seconds: Number(amount) * (UNIT_SECONDS[unit.toLowerCase()] ?? 0),
  }));
}
