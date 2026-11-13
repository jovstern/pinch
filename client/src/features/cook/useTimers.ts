import { useEffect, useRef, useState } from "react";
import type { Duration } from "./durations.ts";

// key: which of the recipe's times it is (its step's words and its place in them), so one can't
// run twice.
export type Timer = { id: number; key: string; seconds: number; endsAt: number };

// Cook mode's timers (docs/ux/plan.md U2): each runs to its end time, and the page redraws
// every second while any is running, so the time left is always worked out from the end time.
// Several can run at once (the pasta and the sauce). A hidden tab's clock is slowed by the
// browser, so a ring there may come late; cook mode keeps the screen on, so it rarely is.
export function useTimers() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const running = timers.some((timer) => timer.endsAt > now);
  const nextId = useRef(0);
  // Made on the first Start: a phone plays sound only from a context a tap made.
  const audio = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(tick);
    };
  }, [running]);

  // A beep and a buzz as a timer ends, for a cook who isn't looking: an effect, as it reaches
  // outside React. It rings when the count of ended timers goes up, not when one is dismissed.
  const ended = timers.filter((timer) => timer.endsAt <= now).length;
  const endedBefore = useRef(0);
  useEffect(() => {
    if (ended > endedBefore.current) ring(audio.current);
    endedBefore.current = ended;
  }, [ended]);

  // Closed on leaving, as the wake lock is let go: a phone allows only a few at once.
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );

  // Whether that time's timer is running, as the screen shows it.
  function isRunning(key: string) {
    return timers.some((timer) => timer.key === key && timer.endsAt > now);
  }

  // Pressed again while it runs (a double tap with wet hands): nothing more.
  function start(key: string, { seconds }: Duration) {
    if (isRunning(key)) return;
    if ("AudioContext" in window) {
      audio.current ??= new AudioContext();
      // A phone call or another app may have paused it; a tap may start it again.
      void audio.current.resume();
    }
    // The clock stops while no timer runs: bring it up to date, so the new one starts full.
    const startedAt = Date.now();
    setNow(startedAt);
    const id = nextId.current++;
    setTimers((before) => [...before, { id, key, seconds, endsAt: startedAt + seconds * 1000 }]);
  }

  function stop(id: number) {
    setTimers((before) => before.filter((timer) => timer.id !== id));
  }

  return { timers, now, start, stop, isRunning };
}

// Three short beeps (Web Audio, no sound file to load) and a buzz where the phone can. An
// iPhone has no buzz and its mute switch silences the beeps: there, only the screen says it.
function ring(audio: AudioContext | null) {
  if ("vibrate" in navigator) navigator.vibrate([300, 150, 300]);
  if (!audio) return;
  for (const at of [0, 0.4, 0.8]) {
    const tone = audio.createOscillator();
    tone.frequency.value = 880;
    tone.connect(audio.destination);
    tone.start(audio.currentTime + at);
    tone.stop(audio.currentTime + at + 0.2);
  }
}
