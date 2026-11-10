import { Button } from "../../components/ui/Button.tsx";
import type { Timer } from "./useTimers.ts";

type TimerBarProps = {
  timers: Timer[];
  now: number;
  onStop: (id: number) => void;
};

// The running timers, kept at the bottom of the screen by cook mode while the cook moves between
// steps. At most 40% of the screen's height, scrolling past it, so many timers never hide the step.
export function TimerBar({ timers, now, onStop }: TimerBarProps) {
  if (timers.length === 0) return null;
  return (
    <ul
      aria-label="Timers"
      // Its top border separates it from Back and Next above it in cook mode's footer: meant.
      className="grid max-h-[40dvh] gap-1 overflow-y-auto border-t border-border bg-surface py-2"
    >
      {timers.map((timer) => {
        const left = Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
        return (
          <li key={timer.id} className="flex items-center justify-between gap-3">
            {left > 0 ? (
              // "19:58 left · 20 min timer": the time left first, the minutes not said twice.
              <p className="tabular-nums">
                {clock(left)} left · <bdi>{timer.label}</bdi> timer
              </p>
            ) : (
              // Said aloud once, as it ends. Keyed, so it's a new element: a screen reader may miss
              // an alert role added to one already there.
              <p key="done" role="alert" className="font-semibold text-accent-strong">
                <bdi>{timer.label}</bdi> timer: done
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
