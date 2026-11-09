import { useEffect, useRef, useState } from "react";
import type { Duration } from "./durations.ts";

export type Timer = { id: number; label: string; endsAt: number };

// Cook mode's timers (docs/ux/plan.md U2): each runs to its end time, and the page redraws
// every second while any is running. Several can run at once (the pasta and the sauce).
export function useTimers() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const running = timers.some((timer) => timer.endsAt > now);
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

  // At its end, once: a beep and a buzz, for a cook who isn't looking at the screen.
  const ended = timers.filter((timer) => timer.endsAt <= now).length;
  useEffect(() => {
    if (ended > 0) ring(audio.current);
  }, [ended]);

  function start({ label, seconds }: Duration) {
    if ("AudioContext" in window) audio.current ??= new AudioContext();
    const startedAt = Date.now();
    setNow(startedAt);
    setTimers((before) => [
      ...before,
      { id: startedAt, label, endsAt: startedAt + seconds * 1000 },
    ]);
  }

  function stop(id: number) {
    setTimers((before) => before.filter((timer) => timer.id !== id));
  }

  return { timers, now, start, stop };
}

// Three short beeps (Web Audio, no sound file to load) and a buzz where the phone can.
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
