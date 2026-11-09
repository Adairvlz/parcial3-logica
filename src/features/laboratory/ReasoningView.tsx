import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Check,
  Expand,
  Eye,
  EyeOff,
  GitBranch,
  Play,
  Shrink,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { Evidence, Interpretation } from "../../core/types";
import { compileTimeline, frameAt } from "../../reasoning/playback";
import {
  buildVisibleTree,
  prettyFormula,
  toggledMode,
  type BranchModes,
} from "../../reasoning/tree";
import { usePlayback, useReducedMotion } from "../../state/usePlayback";
import { useReasoningSound } from "../../state/useReasoningSound";
import { ReasoningCanvas } from "../../visualization/ReasoningCanvas";
import { Inspector } from "./Inspector";
import { Timeline } from "./Timeline";

// three.js is only downloaded when the 3D view is first opened.
const ReasoningScene3D = lazy(
  () => import("../../visualization/ReasoningScene3D"),
);

export interface Evaluation {
  id: number;
  formula: string;
  evidence: Evidence;
  interpretation: Interpretation;
}

const TUPLES_SHOWN = 4;
const RELATIONS_SHOWN = 3;
function relationSummary([name, tuples]: [
  string,
  readonly (readonly string[])[],
]) {
  const shown = tuples.slice(0, TUPLES_SHOWN).map((t) => `(${t.join(",")})`);
  if (tuples.length > TUPLES_SHOWN) shown.push("…");
  return `${name} = {${shown.join(", ")}}`;
}

/** Remounted (by key) for each evaluation, so no branch state outlives its result. */
export function ReasoningView({
  evaluation,
  visible,
  immersive,
  setImmersive,
  controlsHidden,
  setControlsHidden,
  view3d,
  setView3d,
  playRequest,
}: {
  evaluation: Evaluation;
  visible: boolean;
  immersive: boolean;
  setImmersive: (value: boolean) => void;
  controlsHidden: boolean;
  setControlsHidden: (value: boolean) => void;
  view3d: boolean;
  setView3d: (value: boolean) => void;
  playRequest: number;
}) {
  const [modes, setModes] = useState<BranchModes>({});
  const [selectedId, setSelectedId] = useState("");
  const [inspector, setInspector] = useState(false);
  const [follow, setFollow] = useState(false);
  const reduced = useReducedMotion();
  const tree = useMemo(
    () => buildVisibleTree(evaluation.evidence, modes),
    [evaluation, modes],
  );
  const timeline = useMemo(() => compileTimeline(tree), [tree]);
  const p = usePlayback(timeline);
  const sound = useReasoningSound(timeline, p, visible);
  const frame = useMemo(
    () => frameAt(timeline, p.time, reduced),
    [timeline, p.time, reduced],
  );
  useEffect(() => {
    if (!visible) p.pause();
  }, [visible]);
  const animate = () => {
    setSelectedId("");
    setInspector(false);
    setFollow(true);
    p.seek(0);
    p.play();
  };
  // Only a request made after this result was mounted starts the animation.
  const handledRequest = useRef(playRequest);
  useEffect(() => {
    if (playRequest === handledRequest.current) return;
    handledRequest.current = playRequest;
    animate();
  }, [playRequest]);
  const select = (id: string) => {
    setSelectedId(id);
    setInspector(!!id);
    setFollow(false);
  };
  const toggle = (id: string) => {
    const node = tree.byId.get(id);
    if (!node) return;
    setModes((current) => ({ ...current, [id]: toggledMode(node) }));
    setFollow(false);
  };
  // Folding can remove the selected node from the tree.
  const shownId = tree.byId.has(selectedId) ? selectedId : "";
  const value = evaluation.evidence.value;
  const { domain, relations } = evaluation.interpretation;
  return (
    <>
      {view3d ? (
        <Suspense
          fallback={
            <div className="reasoning-canvas organic-scene">
              <div className="canvas-empty">
                <h2>Cargando la vista 3D…</h2>
              </div>
            </div>
          }
        >
          <ReasoningScene3D
            tree={tree}
            frame={frame}
            selectedId={shownId}
            onSelect={select}
            reduced={reduced}
            visible={visible}
            clear={controlsHidden}
          />
        </Suspense>
      ) : (
        <ReasoningCanvas
          tree={tree}
          selectedId={shownId}
          onSelect={select}
          onToggle={toggle}
          frame={frame}
          focus={timeline.steps[frame.step].focus}
          reduced={reduced}
          follow={follow}
          setFollow={setFollow}
          playing={p.playing}
          cameraDuration={Math.min(950, (timeline.unit / p.speed) * 0.75)}
          clear={controlsHidden}
        />
      )}
      {!controlsHidden && (
        <div className="formula-dock glass">
          <span className="active-formula">
            <span>{prettyFormula(evaluation.formula)}</span>
          </span>
          <button
            className="evaluate-button"
            aria-label="Animar razonamiento"
            onClick={animate}
          >
            <Play size={12} fill="currentColor" />
            <span>Animar</span>
          </button>
          <div
            className="sound-controls"
            role="group"
            aria-label="Sonido del razonamiento"
          >
            <button
              className="sound-toggle"
              onClick={() => void sound.toggle()}
              aria-label={
                sound.unavailable
                  ? "Audio no disponible"
                  : sound.enabled
                    ? "Silenciar sonido"
                    : "Activar sonido"
              }
              aria-pressed={sound.enabled}
              disabled={sound.unavailable}
              title={
                sound.unavailable
                  ? "Este navegador no pudo iniciar el audio"
                  : sound.enabled
                    ? "Silenciar sonido"
                    : "Activar sonido"
              }
            >
              {sound.enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            {sound.enabled && (
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                aria-label="Volumen del sonido"
                aria-valuetext={`${sound.volume}%`}
                value={sound.volume}
                onChange={(event) => sound.setVolume(Number(event.target.value))}
              />
            )}
          </div>
        </div>
      )}
      <div className="scene-actions">
        <button
          className="glass view-3d-toggle"
          aria-label={view3d ? "Vista 2D" : "Vista 3D"}
          title={view3d ? "Volver a la vista 2D" : "Ver el árbol en 3D"}
          aria-pressed={view3d}
          onClick={() => setView3d(!view3d)}
        >
          {view3d ? <GitBranch size={16} /> : <Box size={16} />}
          <span>{view3d ? "2D" : "3D"}</span>
        </button>
        <button
          className="glass"
          aria-label={controlsHidden ? "Mostrar controles" : "Ocultar controles"}
          title={controlsHidden ? "Mostrar controles" : "Ocultar controles"}
          aria-pressed={controlsHidden}
          onClick={() => setControlsHidden(!controlsHidden)}
        >
          {controlsHidden ? <Eye size={17} /> : <EyeOff size={17} />}
        </button>
        <button
          className="glass"
          aria-label={immersive ? "Salir del modo inmersivo" : "Modo inmersivo"}
          title={immersive ? "Salir del modo inmersivo" : "Modo inmersivo"}
          onClick={() => setImmersive(!immersive)}
        >
          {immersive ? <Shrink size={17} /> : <Expand size={17} />}
        </button>
      </div>
      {inspector && (
        <Inspector
          tree={tree}
          selectedId={shownId}
          frame={frame}
          domain={domain}
          onSelect={select}
          onToggle={toggle}
          onClose={() => setInspector(false)}
        />
      )}
      <div className="universe-note">
        <span className="eyebrow">UNIVERSO / {domain.length}</span>
        <code>D = {`{${domain.join(", ")}}`}</code>
        {Object.entries(relations)
          .slice(0, RELATIONS_SHOWN)
          .map((relation) => (
            <span key={relation[0]}>{relationSummary(relation)}</span>
          ))}
        <div className="node-key">
          <span>
            <i className="key-universal" />∀ universal
          </span>
          <span>
            <i className="key-existential" />∃ existencial
          </span>
          <span>
            <i className="key-connective" />
            conectivo
          </span>
          <span>
            <i className="key-atom" />
            fórmula atómica
          </span>
        </div>
      </div>
      <div
        className={`result-beacon ${frame.result ? (value ? "resolved" : "refuted") : ""}`}
        data-closing={frame.closing !== null}
        style={
          frame.closing === null
            ? undefined
            : {
                filter: `drop-shadow(0 0 ${Math.sin(Math.PI * frame.closing) * 18}px ${value ? "#74f5c9" : "#fb7185"})`,
                transform: `scale(${1 + Math.sin(Math.PI * frame.closing) * 0.04})`,
              }
        }
        role="status"
      >
        <span className="beacon-icon">
          {!frame.result ? (
            <span className="tiny-ring" />
          ) : value ? (
            <Check size={17} />
          ) : (
            <X size={17} />
          )}
        </span>
        <div>
          <span>
            {!frame.result
              ? "Razonamiento en curso"
              : value
                ? "Verdadero"
                : "Falso"}
          </span>
          <small>
            {frame.result
              ? `${tree.nodes.length} nodos a la vista`
              : "Siguiendo al motor"}
          </small>
        </div>
      </div>
      {!controlsHidden && (
        <Timeline
          playback={p}
          timeline={timeline}
          follow={follow}
          onFollow={() => setFollow((current) => !current)}
        />
      )}
    </>
  );
}
