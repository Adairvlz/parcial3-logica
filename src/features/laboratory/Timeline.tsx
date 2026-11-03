import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import type { Timeline as TimelineData } from "../../reasoning/playback";
import type { Playback } from "../../state/usePlayback";

/** Beyond this the markers would be too dense to aim at; the slider remains. */
const MARKER_LIMIT = 40;
const twoDigits = (n: number) => String(n).padStart(2, "0");

export function Timeline({
  playback: p,
  timeline,
}: {
  playback: Playback;
  timeline: TimelineData;
}) {
  const current = timeline.steps[p.step];
  return (
    <section
      className="timeline glass"
      aria-label="Reproducción del razonamiento"
      data-step={p.step}
      data-playing={p.playing}
    >
      <div className="timeline-story" aria-live="polite">
        <span className="step-number">
          {twoDigits(p.step + 1)}
          <i>/ {twoDigits(timeline.steps.length)}</i>
        </span>
        <div>
          <strong>{current.title}</strong>
          <p>{current.detail}</p>
        </div>
      </div>
      <input
        className="time-scrubber"
        type="range"
        min={0}
        max={p.duration}
        step={10}
        value={p.time}
        aria-label="Tiempo de reproducción"
        aria-valuetext={`Paso ${p.step + 1}: ${current.title}`}
        onChange={(e) => p.seek(Number(e.target.value))}
        style={
          {
            "--progress": `${(100 * p.time) / p.duration}%`,
          } as React.CSSProperties
        }
      />
      <div className="timeline-bottom">
        <div className="transport">
          <button
            aria-label="Reiniciar"
            title="Reiniciar"
            onClick={p.restart}
          >
            <RotateCcw size={15} />
          </button>
          <button
            disabled={p.time === 0}
            aria-label="Paso anterior"
            title="Paso anterior"
            onClick={p.previous}
          >
            <SkipBack size={16} />
          </button>
          <button
            className="play-button"
            aria-label={p.playing ? "Pausar" : "Reproducir"}
            onClick={p.playing ? p.pause : p.play}
          >
            <span>
              {p.playing ? (
                <Pause size={17} fill="currentColor" />
              ) : (
                <Play size={17} fill="currentColor" />
              )}
            </span>
          </button>
          <button
            disabled={p.time === p.duration}
            aria-label="Paso siguiente"
            title="Paso siguiente"
            onClick={p.next}
          >
            <SkipForward size={16} />
          </button>
          <select
            aria-label="Velocidad de reproducción"
            value={p.speed}
            onChange={(e) => p.setSpeed(Number(e.target.value))}
          >
            {[0.5, 1, 1.5, 2].map((speed) => (
              <option key={speed} value={speed}>
                {speed}×
              </option>
            ))}
          </select>
        </div>
        {timeline.steps.length <= MARKER_LIMIT && (
          <div className="step-markers">
            {timeline.steps.map((step, i) => (
              <button
                key={i}
                aria-label={`Ir al paso ${i + 1}: ${step.title}`}
                aria-current={i === p.step ? "step" : undefined}
                onClick={() => p.seek(timeline.starts[i])}
                className={i <= p.step ? "reached" : ""}
              >
                <span />
              </button>
            ))}
          </div>
        )}
        <span className="timecode">
          {(p.time / 1000).toFixed(1)}{" "}
          <i>/ {(p.duration / 1000).toFixed(1)} s</i>
        </span>
      </div>
    </section>
  );
}
