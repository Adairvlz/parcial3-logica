import { useEffect, useMemo, useState } from "react";
import { Check, Expand, FlaskConical, GitBranch, Play, Shrink } from "lucide-react";
import { useWorkspace } from "./state/useWorkspace";
import { usePlayback, useReducedMotion } from "./state/usePlayback";
import { frameAt } from "./reasoning/demoPlayback";
import { DEMO_FORMULA } from "./features/demo/scenario";
import { Inspector } from "./features/laboratory/Inspector";
import { Timeline } from "./features/laboratory/Timeline";
import { ReasoningCanvas } from "./visualization/ReasoningCanvas";
import { SemanticWorkspace } from "./features/evaluation/SemanticWorkspace";

export function App() {
  const ws = useWorkspace();
  const [inspector, setInspector] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [follow, setFollow] = useState(false);
  const reduced = useReducedMotion();
  const p = usePlayback(true);
  const frame = useMemo(() => frameAt(p.time, reduced), [p.time, reduced]);
  useEffect(() => {
    if (ws.page === "evaluate") p.pause();
  }, [ws.page]);
  const select = (id: string) => {
    ws.selectNode(id);
    setInspector(!!id);
    setFollow(false);
  };
  const playDemo = () => {
    ws.selectNode("");
    setInspector(false);
    setFollow(true);
    p.play();
  };
  return (
    <div
      className={`living-app ${immersive ? "immersive" : ""} ${reduced ? "reduce-motion" : ""}`}
    >
      <button
        className="skip-link"
        onClick={() => document.getElementById("main-content")?.focus()}
      >
        Saltar al contenido
      </button>
      {!immersive && (
        <header className="living-header">
          <a className="living-brand" href="#/evaluate" aria-label="LOGOS inicio">
            <img src="/logos.svg" alt="" />
            <strong>LOGOS</strong>
          </a>
          <nav className="view-tabs" aria-label="Vistas">
            <a
              href="#/evaluate"
              aria-current={ws.page === "evaluate" ? "page" : undefined}
            >
              <FlaskConical size={14} /> Evaluador
            </a>
            <a
              href="#/laboratory"
              aria-current={ws.page === "laboratory" ? "page" : undefined}
            >
              <GitBranch size={14} /> Árbol
            </a>
          </nav>
          <span className="course-label">
            MM3032 · Lógica Matemática · Diego Quan y Adair Velásquez
          </span>
        </header>
      )}
      <main id="main-content" tabIndex={-1} className="living-stage">
        <SemanticWorkspace
          formula={ws.formula}
          onChange={ws.setFormula}
          visible={ws.page === "evaluate"}
        />
        <div className="demo-workspace" hidden={ws.page === "evaluate"}>
          <ReasoningCanvas
            selectedId={ws.selectedId}
            onSelect={select}
            active
            frame={frame}
            reduced={reduced}
            follow={follow}
            setFollow={setFollow}
            playing={p.playing}
          />
          <div className="formula-dock glass">
            <span className="active-formula">
              <span>{DEMO_FORMULA}</span>
            </span>
            <span className="demo-label">DEMO</span>
            <button
              className="evaluate-button"
              aria-label="Animar demo"
              onClick={playDemo}
            >
              <Play size={12} fill="currentColor" />
              <span>Animar</span>
            </button>
          </div>
          <div className="scene-actions">
            <button
              className="glass"
              aria-label={
                immersive ? "Salir del modo inmersivo" : "Modo inmersivo"
              }
              title={immersive ? "Salir del modo inmersivo" : "Modo inmersivo"}
              onClick={() => setImmersive(!immersive)}
            >
              {immersive ? <Shrink size={17} /> : <Expand size={17} />}
            </button>
          </div>
          {inspector && (
            <Inspector
              selectedId={ws.selectedId || "root"}
              active
              onSelect={select}
              frame={frame}
              onClose={() => setInspector(false)}
            />
          )}
          <div className="universe-note">
            <span className="eyebrow">UNIVERSO / 03</span>
            <code>D = {"{a, b, c}"}</code>
            <span>P = {"{(a,b), (b,c), (c,a)}"}</span>
            <div className="node-key">
              <span>
                <i className="key-universal" />∀ universal
              </span>
              <span>
                <i className="key-existential" />∃ existencial
              </span>
              <span>
                <i className="key-atom" />P predicado
              </span>
            </div>
          </div>
          <div
            className={`result-beacon ${frame.result ? "resolved" : ""}`}
            role="status"
          >
            <span className="beacon-icon">
              {frame.result ? (
                <Check size={17} />
              ) : (
                <span className="tiny-ring" />
              )}
            </span>
            <div>
              <span>{frame.result ? "Verdadero" : "Razonamiento en curso"}</span>
              <small>
                {frame.result ? "3 de 3 casos · DEMO" : "Secuencia demostrativa"}
              </small>
            </div>
          </div>
          <Timeline playback={p} enabled />
        </div>
      </main>
    </div>
  );
}
