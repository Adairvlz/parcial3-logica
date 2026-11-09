import { useState } from "react";
import { FlaskConical, GitBranch } from "lucide-react";
import { useWorkspace } from "./state/useWorkspace";
import {
  ReasoningView,
  type Evaluation,
} from "./features/laboratory/ReasoningView";
import { SemanticWorkspace } from "./features/evaluation/SemanticWorkspace";

export function App() {
  const ws = useWorkspace();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [immersive, setImmersive] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false);
  const [view3d, setView3d] = useState(false);
  const [playRequest, setPlayRequest] = useState(0);
  // Immersive mode hides the tabs, so it only makes sense with a result on screen.
  const fullscreen = immersive && !!evaluation && ws.page === "laboratory";
  return (
    <div className={`living-app ${fullscreen ? "immersive" : ""}`}>
      <button
        className="skip-link"
        onClick={() => document.getElementById("main-content")?.focus()}
      >
        Saltar al contenido
      </button>
      {!fullscreen && (
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
          onResult={setEvaluation}
          onShowTree={() => {
            setPlayRequest((n) => n + 1);
            ws.navigate("laboratory");
          }}
        />
        <div className="tree-workspace" hidden={ws.page === "evaluate"}>
          {evaluation ? (
            <ReasoningView
              key={evaluation.id}
              evaluation={evaluation}
              visible={ws.page === "laboratory"}
              immersive={immersive}
              setImmersive={setImmersive}
              controlsHidden={controlsHidden}
              setControlsHidden={setControlsHidden}
              view3d={view3d}
              setView3d={setView3d}
              playRequest={playRequest}
            />
          ) : (
            <div className="reasoning-canvas organic-scene">
              <div className="canvas-empty">
                <span className="empty-symbol">φ</span>
                <h2>Sin evaluación vigente</h2>
                <p>
                  El árbol se genera a partir de un resultado del motor. Evalúa
                  una fórmula para verlo.
                </p>
                <a className="primary-button" href="#/evaluate">
                  Ir al Evaluador
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
