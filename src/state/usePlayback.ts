import { useCallback, useEffect, useRef, useState } from "react";
import {
  clamp,
  DEMO_DURATION,
  demoSteps,
  getStep,
  stepStarts,
} from "../reasoning/demoPlayback";

export function useReducedMotion() {
  const [system, setSystem] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [disabled, setDisabled] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystem(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return { reduced: system || disabled, system, disabled, setDisabled };
}

/** One cancellable clock; all visual state is reconstructed from absolute time. */
export function usePlayback(enabled: boolean) {
  const [time, setTime] = useState(DEMO_DURATION);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timeRef = useRef(time);
  const generation = useRef(0);
  const seek = useCallback((next: number) => {
    generation.current++;
    timeRef.current = clamp(next, 0, DEMO_DURATION);
    setTime(timeRef.current);
    setPlaying(false);
  }, []);
  useEffect(() => {
    if (!enabled) seek(0);
  }, [enabled, seek]);
  useEffect(() => {
    if (!playing || !enabled) return;
    const token = ++generation.current;
    let last = performance.now();
    let lastRender = last;
    let raf = 0;
    const tick = (now: number) => {
      if (generation.current !== token) return;
      // Suspended tabs do not fast-forward through explanations.
      const delta = document.hidden ? 0 : Math.min(now - last, 100);
      last = now;
      timeRef.current = Math.min(
        DEMO_DURATION,
        timeRef.current + delta * speed,
      );
      if (now - lastRender >= 30 || timeRef.current === DEMO_DURATION) {
        setTime(timeRef.current);
        lastRender = now;
      }
      if (timeRef.current === DEMO_DURATION) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      generation.current++;
      cancelAnimationFrame(raf);
    };
  }, [playing, speed, enabled]);
  const play = () => {
    if (!enabled) return;
    if (timeRef.current >= DEMO_DURATION) {
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
  return {
    time,
    playing,
    speed,
    setSpeed,
    seek,
    play,
    pause,
    step: getStep(time),
    restart: () => seek(0),
    next: () =>
      seek(
        getStep(timeRef.current) === demoSteps.length - 1
          ? DEMO_DURATION
          : stepStarts[getStep(timeRef.current) + 1],
      ),
    previous: () => seek(stepStarts[Math.max(0, getStep(timeRef.current) - 1)]),
  };
}
export type Playback = ReturnType<typeof usePlayback>;
