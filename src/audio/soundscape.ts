import { pulseJourneys, type Timeline } from "../reasoning/playback";

export interface SoundCue {
  start: number;
  arrival: number;
  frequency: number;
}

/** Same travel intervals as frameAt: outward along the branch, then back. */
export function soundCues(timeline: Timeline): SoundCue[] {
  const notes = [523.25, 587.33, 659.25, 783.99, 880];
  return pulseJourneys(timeline).map((journey) => ({
    start: journey.start,
    arrival: journey.arrival,
    frequency: notes[(journey.target.split(".").length - 1) % notes.length],
  }));
}

export function arrivalsBetween(
  cues: SoundCue[],
  previous: number,
  time: number,
) {
  return cues.filter((cue) => cue.arrival > previous && cue.arrival <= time);
}

/** A rounded sine bell, with a quiet octave instead of harsh metallic partials. */
export function chime(
  context: BaseAudioContext,
  output: AudioNode,
  frequency: number,
) {
  const now = context.currentTime;
  const voices = [1, 2].map((ratio, index) => {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency * ratio;
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(index ? 0.025 : 0.16, now + 0.012);
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      now + (index ? 0.3 : 0.65),
    );
    envelope.gain.linearRampToValueAtTime(0, now + 0.7);
    oscillator.connect(envelope).connect(output);
    oscillator.start(now);
    oscillator.stop(now + 0.72);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
    return { oscillator, envelope };
  });
  return () =>
    voices.forEach(({ oscillator, envelope }) => {
      const at = context.currentTime;
      envelope.gain.cancelAndHoldAtTime(at);
      envelope.gain.linearRampToValueAtTime(0, at + 0.012);
      try {
        oscillator.stop(at + 0.015);
      } catch {
        /* Already ended. */
      }
    });
}

/** Bounded synthesis: two soft travel voices and at most four bell pairs. */
export class Soundscape {
  private master: GainNode;
  private flow: GainNode;
  private tones: OscillatorNode[];
  private bells: (() => void)[] = [];
  private lastBell = -Infinity;

  constructor(readonly context: AudioContext) {
    this.master = context.createGain();
    this.master.gain.value = 0;
    this.master.connect(context.destination);
    this.flow = context.createGain();
    this.flow.gain.value = 0;
    this.flow.connect(this.master);
    this.tones = [196, 293.66].map((frequency) => {
      const tone = context.createOscillator();
      tone.type = "sine";
      tone.frequency.value = frequency;
      tone.connect(this.flow);
      tone.start();
      return tone;
    });
  }

  volume(value: number) {
    this.master.gain.setTargetAtTime(
      Math.max(0, Math.min(1, value)) * 0.45,
      this.context.currentTime,
      0.025,
    );
  }

  travel(progress: number | null) {
    // Fade into and out of each journey; no hum when there is no traveling light.
    const level = progress === null ? 0 : 0.022 * Math.sin(Math.PI * progress);
    this.flow.gain.setTargetAtTime(level, this.context.currentTime, 0.025);
  }

  arrive(frequency: number) {
    if (this.context.currentTime - this.lastBell < 0.08) return;
    this.lastBell = this.context.currentTime;
    if (this.bells.length >= 4) this.bells.shift()!();
    this.bells.push(chime(this.context, this.master, frequency));
  }

  silence() {
    this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.008);
    this.flow.gain.setTargetAtTime(0, this.context.currentTime, 0.008);
    this.bells.forEach((stop) => stop());
    this.bells = [];
    this.lastBell = -Infinity;
  }

  dispose() {
    this.silence();
    this.tones.forEach((tone) => {
      tone.stop();
      tone.disconnect();
    });
    this.flow.disconnect();
    this.master.disconnect();
    void this.context.close().catch(() => {});
  }
}
