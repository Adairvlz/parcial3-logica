import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import {
  DEMO_DURATION,
  demoSteps,
  stepStarts,
} from "../../reasoning/demoPlayback";
import type { Playback } from "../../state/usePlayback";
export function Timeline({
  playback: p,
  enabled,
}: {
  playback: Playback;
  enabled: boolean;
}) {
  const current = demoSteps[p.step];
  return (
    <section
      className="timeline glass"
      aria-label="Reproducción demostrativa"
      data-step={p.step}
      data-playing={p.playing}
    >
      <div className="timeline-story" aria-live="polite">
        <span className="step-number">
          0{p.step + 1}
          <i>/ 08</i>
        </span>
        <div>
          <strong>{enabled ? current.title : "Fórmula sin evaluar"}</strong>
          <p>
            {enabled
              ? current.detail
              : "Restaura el ejemplo para reproducir la demostración."}
          </p>
        </div>
        <span className="demo-label">DEMO</span>
      </div>
      <input
        className="time-scrubber"
        type="range"
        min={0}
        max={DEMO_DURATION}
        step={10}
        value={p.time}
        disabled={!enabled}
        aria-label="Tiempo de reproducción"
        aria-valuetext={`Paso ${p.step + 1}: ${current.title}`}
        onChange={(e) => p.seek(Number(e.target.value))}
        style={
          {
            "--progress": `${(100 * p.time) / DEMO_DURATION}%`,
          } as React.CSSProperties
        }
      />
      <div className="timeline-bottom">
        <div className="transport">
          <button
            disabled={!enabled}
            aria-label="Reiniciar"
            title="Reiniciar"
            onClick={p.restart}
          >
            <RotateCcw size={15} />
          </button>
          <button
            disabled={!enabled || p.time === 0}
            aria-label="Paso anterior"
            title="Paso anterior"
            onClick={p.previous}
          >
            <SkipBack size={16} />
          </button>
          <button
            disabled={!enabled}
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
            disabled={!enabled || p.time === DEMO_DURATION}
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
        <div className="step-markers">
          {demoSteps.map((step, i) => (
            <button
              key={step.title}
              disabled={!enabled}
              aria-label={`Ir al paso ${i + 1}: ${step.title}`}
              aria-current={i === p.step ? "step" : undefined}
              onClick={() => p.seek(stepStarts[i])}
              className={i <= p.step ? "reached" : ""}
            >
              <span />
            </button>
          ))}
        </div>
        <span className="timecode">
          {(p.time / 1000).toFixed(1)}{" "}
          <i>/ {(DEMO_DURATION / 1000).toFixed(1)} s</i>
        </span>
      </div>
    </section>
  );
}
