import { useCallback, useEffect, useRef, useState } from "react";
import { clamp, getStep, type Timeline } from "../reasoning/playback";

export function useReducedMotion() {
  const [system, setSystem] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystem(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return system;
}

/** One cancellable clock; all visual state is reconstructed from absolute time. */
export function usePlayback(timeline: Timeline) {
  const { duration } = timeline;
  const [time, setTime] = useState(duration);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timeRef = useRef(time);
  const generation = useRef(0);
  const seek = useCallback(
    (next: number) => {
      generation.current++;
      timeRef.current = clamp(next, 0, duration);
      setTime(timeRef.current);
      setPlaying(false);
    },
    [duration],
  );
  // Opening or folding a branch recompiles the timeline: show the settled tree.
  useEffect(() => {
    seek(timeline.duration);
  }, [timeline, seek]);
  useEffect(() => {
    if (!playing) return;
    const token = ++generation.current;
    let last = performance.now();
    let lastRender = last;
    let raf = 0;
    const tick = (now: number) => {
      if (generation.current !== token) return;
      // Suspended tabs do not fast-forward through explanations.
      const delta = document.hidden ? 0 : Math.min(now - last, 100);
      last = now;
      timeRef.current = Math.min(duration, timeRef.current + delta * speed);
      if (now - lastRender >= 30 || timeRef.current === duration) {
        setTime(timeRef.current);
        lastRender = now;
      }
      if (timeRef.current === duration) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      generation.current++;
      cancelAnimationFrame(raf);
    };
  }, [playing, speed, duration]);
  const play = () => {
    if (timeRef.current >= duration) {
      timeRef.current = 0;
      setTime(0);
    }
    setPlaying(true);
  };
  const pause = () => {
    generation.current++;
    setPlaying(false);
    setTime(timeRef.current);
  };
  const current = () => getStep(timeline, timeRef.current);
  return {
    time,
    duration,
    playing,
    speed,
    setSpeed,
    seek,
    play,
    pause,
    step: getStep(timeline, time),
    restart: () => seek(0),
    next: () =>
      seek(
        current() === timeline.steps.length - 1
          ? duration
          : timeline.starts[current() + 1],
      ),
    previous: () => seek(timeline.starts[Math.max(0, current() - 1)]),
  };
}
export type Playback = ReturnType<typeof usePlayback>;
