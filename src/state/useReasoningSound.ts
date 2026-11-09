import { useEffect, useMemo, useRef, useState } from "react";
import { arrivalsBetween, soundCues, Soundscape } from "../audio/soundscape";
import type { Timeline } from "../reasoning/playback";
import type { Playback } from "./usePlayback";

export function useReasoningSound(
  timeline: Timeline,
  playback: Playback,
  visible: boolean,
) {
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(35);
  const [unavailable, setUnavailable] = useState(false);
  const [foreground, setForeground] = useState(!document.hidden);
  const engine = useRef<Soundscape | null>(null);
  const previous = useRef<number | null>(null);
  const cues = useMemo(() => soundCues(timeline), [timeline]);

  // AudioContext is created/resumed directly from the user's sound button.
  const toggle = async () => {
    if (enabled) {
      engine.current?.silence();
      previous.current = null;
      setEnabled(false);
      return;
    }
    try {
      if (!engine.current) engine.current = new Soundscape(new AudioContext());
      await engine.current.context.resume();
      setEnabled(true);
    } catch {
      setUnavailable(true);
      setEnabled(false);
    }
  };

  useEffect(() => {
    const change = () => {
      engine.current?.silence();
      previous.current = null;
      setForeground(!document.hidden);
    };
    document.addEventListener("visibilitychange", change);
    return () => {
      document.removeEventListener("visibilitychange", change);
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    previous.current = null;
    engine.current?.silence();
  }, [timeline]);

  useEffect(() => {
    const sound = engine.current;
    const { time, playing, speed } = playback;
    if (!sound) return;
    if (!enabled || !playing || !visible || !foreground || volume === 0) {
      sound.silence();
      previous.current = null;
      return;
    }
    const last = previous.current;
    // Never replay missed arrivals after a seek, restart, or suspended tab.
    const continuous =
      last !== null && time >= last && time - last <= 220 * speed;
    if (!continuous) sound.silence();
    sound.volume(volume / 100);
    const traveling = cues.find(
      (cue) => time >= cue.start && time < cue.arrival,
    );
    sound.travel(
      traveling
        ? (time - traveling.start) / (traveling.arrival - traveling.start)
        : null,
    );
    if (continuous) {
      const arrivals = arrivalsBetween(cues, last, time);
      if (arrivals.length) sound.arrive(arrivals[0].frequency);
    }
    previous.current = time;
  }, [
    playback.time,
    playback.playing,
    playback.speed,
    cues,
    enabled,
    volume,
    visible,
    foreground,
  ]);

  return { enabled, volume, setVolume, toggle, unavailable };
}
