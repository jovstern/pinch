import { Button } from "../../components/Button.tsx";
import type { Timer } from "./useTimers.ts";

type TimerBarProps = {
  timers: Timer[];
  now: number;
  onStop: (id: number) => void;
};

// The running timers, kept at the bottom of the screen while the cook moves between steps.
export function TimerBar({ timers, now, onStop }: TimerBarProps) {
  if (timers.length === 0) return null;
  return (
    <ul
      aria-label="Timers"
      className="sticky bottom-0 mt-8 grid gap-2 border-t border-border bg-surface py-3"
    >
      {timers.map((timer) => {
        const left = Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
        return (
          <li key={timer.id} className="flex items-center justify-between gap-3">
            {left > 0 ? (
              <p className="tabular-nums">
                <span dir="auto">{timer.label}</span>: {clock(left)} left
              </p>
            ) : (
              // Said aloud once, as it ends.
              <p role="alert" className="font-semibold text-accent-strong">
                <span dir="auto">{timer.label}</span>: done
              </p>
            )}
            {/* Named for its timer: with two running, "Stop" alone wouldn't say which. */}
            <Button
              type="button"
              variant="secondary"
              aria-label={`${left > 0 ? "Stop" : "Dismiss"} the ${timer.label} timer`}
              onClick={() => {
                onStop(timer.id);
              }}
            >
              {left > 0 ? "Stop" : "Dismiss"}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

// "4:05", or "1:02:30" past an hour.
function clock(seconds: number) {
  const pad = (part: number) => String(part).padStart(2, "0");
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours > 0
    ? `${String(hours)}:${pad(minutes)}:${pad(rest)}`
    : `${String(minutes)}:${pad(rest)}`;
}
