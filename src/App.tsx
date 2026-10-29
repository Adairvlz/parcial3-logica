import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Braces,
  Check,
  ChevronRight,
  CircleHelp,
  Expand,
  FlaskConical,
  GitBranch,
  Home,
  Menu,
  PanelRight,
  Play,
  Settings2,
  Shrink,
  X,
} from "lucide-react";
import { useWorkspace } from "./state/useWorkspace";
import { usePlayback, useReducedMotion } from "./state/usePlayback";
import { frameAt, DEMO_DURATION } from "./reasoning/demoPlayback";
import { Dashboard } from "./features/dashboard/Dashboard";
import { FormulaEditor } from "./features/editor/FormulaEditor";
import { Inspector } from "./features/laboratory/Inspector";
import { Timeline } from "./features/laboratory/Timeline";
import { ReasoningCanvas } from "./visualization/ReasoningCanvas";
import { Modal } from "./ui/Modal";

export function App() {
  const ws = useWorkspace();
  const [inspector, setInspector] = useState(false);
  const [editor, setEditor] = useState(ws.page === "editor");
  const [settings, setSettings] = useState(false);
  const [menu, setMenu] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [follow, setFollow] = useState(false);
  const [synthetic, setSynthetic] = useState(false);
  const [glow, setGlow] = useState(1);
  const [viewRequest, setViewRequest] = useState(0);
  const [dialog, setDialog] = useState<"examples" | "help" | null>(null);
  const motion = useReducedMotion();
  const p = usePlayback(ws.isDemo && !synthetic);
  const frame = useMemo(
    () => frameAt(p.time, motion.reduced),
    [p.time, motion.reduced],
  );
  useEffect(() => {
    setEditor(ws.page === "editor");
    setMenu(false);
  }, [ws.page]);
  useEffect(() => {
    if (!ws.isDemo) {
      setInspector(false);
      setSynthetic(false);
      setFollow(false);
    }
  }, [ws.isDemo]);
  const select = (id: string) => {
    ws.selectNode(id);
    setInspector(!!id && !synthetic);
    setFollow(false);
  };
  const reset = () => {
    ws.reset();
    p.seek(DEMO_DURATION);
    setSynthetic(false);
    ws.selectNode("");
    setInspector(false);
    setViewRequest((n) => n + 1);
  };
  const openDemo = () => {
    reset();
    ws.navigate("laboratory");
    setEditor(false);
    setDialog(null);
  };
  const playDemo = () => {
    ws.selectNode("");
    setInspector(false);
    setEditor(false);
    setSettings(false);
    setFollow(true);
    p.play();
  };
  const changeFormula = (text: string) => {
    p.pause();
    ws.setFormula(text);
  };
  return (
    <div
      className={`living-app ${immersive ? "immersive" : ""} ${motion.reduced ? "reduce-motion" : ""}`}
      style={{ "--glow": glow } as CSSProperties}
    >
      <button
        className="skip-link"
        onClick={() => document.getElementById("main-content")?.focus()}
      >
        Saltar al árbol
      </button>
      {!immersive && (
        <>
          <header className="living-header">
            <a
              className="living-brand"
              href="#/laboratory"
              aria-label="LOGOS inicio"
            >
              <img src="/logos.svg" alt="" />
              <strong>LOGOS</strong>
              <span>LOGIC, MADE VISIBLE</span>
            </a>
            <div className="header-context">
              <span>Laboratorio</span>
              <ChevronRight size={12} />
              <strong>Living Reasoning Tree</strong>
              <span className="phase-label">1.5</span>
            </div>
            <div className="header-actions">
              <button onClick={() => setDialog("examples")}>
                <BookOpen size={14} />
                <span>Ejemplos</span>
              </button>
              <button
                aria-label="Ayuda"
                title="Ayuda"
                onClick={() => setDialog("help")}
              >
                <CircleHelp size={17} />
              </button>
              <span className="local-dot" />
              <span className="local-label">LOCAL</span>
            </div>
          </header>
          <nav className="navigation-rail" aria-label="Navegación principal">
            <button
              aria-label="Abrir menú"
              title="Abrir menú"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={18} />
            </button>
            <div className="rail-divider" />
            <a
              href="#/dashboard"
              aria-label="Dashboard"
              title="Inicio"
              className={ws.page === "dashboard" ? "active" : ""}
            >
              <Home size={18} />
            </a>
            <a
              href="#/laboratory"
              aria-label="Reasoning Tree"
              title="Reasoning Tree"
              className={ws.page === "laboratory" ? "active" : ""}
            >
              <GitBranch size={19} />
            </a>
            <a
              href="#/editor"
              aria-label="Formula Editor"
              title="Formula Editor"
              className={ws.page === "editor" ? "active" : ""}
            >
              <Braces size={19} />
            </a>
            <button
              aria-label="Experiments · próximamente"
              title="Experiments · próximamente"
              disabled
            >
              <FlaskConical size={18} />
            </button>
            <span className="rail-spacer" />
            <span className="rail-monogram">λ</span>
            <span className="rail-version">01.5</span>
          </nav>
        </>
      )}
      <main id="main-content" tabIndex={-1} className="living-stage">
        <ReasoningCanvas
          selectedId={ws.selectedId}
          onSelect={select}
          active={ws.isDemo}
          frame={frame}
          reduced={motion.reduced}
          follow={follow}
          setFollow={setFollow}
          synthetic={synthetic}
          request={viewRequest}
          playing={p.playing}
        />
        <div className="scene-caption">
          <div className="eyebrow">
            <span className="live-dot" />
            {synthetic ? "VISUAL STRESS TEST" : "ORGANIC LUMINOUS REASONING"}
          </div>
          <h1>
            {synthetic
              ? "40 nodos. Sin evaluación."
              : "El razonamiento cobra vida."}
          </h1>
          <p>
            {synthetic
              ? "Estructura sintética · prueba de layout"
              : "Un universo finito. Infinitas formas de comprender."}
          </p>
        </div>
        <div className="formula-dock glass">
          <button
            className="active-formula"
            aria-label="Editar fórmula"
            onClick={() => setEditor(!editor)}
          >
            <Braces size={15} />
            <span>{ws.formula || "Escribe una fórmula"}</span>
            <span className="edit-hint">EDITAR</span>
          </button>
          <span className="demo-label">
            {ws.isDemo ? "DEMO" : "SIN EVALUAR"}
          </span>
          <button
            className="evaluate-button"
            disabled={!ws.isDemo || synthetic}
            aria-label="Animar demo"
            onClick={playDemo}
          >
            <Play size={12} fill="currentColor" />
            <span>Animar</span>
          </button>
        </div>
        <div className="scene-actions">
          <button
            className={`glass ${inspector ? "active" : ""}`}
            aria-label={inspector ? "Ocultar inspector" : "Mostrar inspector"}
            title="Inspector"
            disabled={synthetic}
            onClick={() => setInspector(!inspector)}
          >
            <PanelRight size={17} />
          </button>
          <button
            className={`glass ${settings ? "active" : ""}`}
            aria-label="Configuración visual"
            title="Configuración visual"
            onClick={() => setSettings(!settings)}
          >
            <Settings2 size={17} />
          </button>
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
        {editor && (
          <div className="editor-popover glass">
            <div className="panel-heading">
              <span>FORMULA EDITOR</span>
              <button
                aria-label="Cerrar editor"
                onClick={() => setEditor(false)}
              >
                <X size={16} />
              </button>
            </div>
            <FormulaEditor
              formula={ws.formula}
              onChange={changeFormula}
              isDemo={ws.isDemo}
              onReset={reset}
            />
          </div>
        )}
        {inspector && !synthetic && (
          <Inspector
            selectedId={ws.selectedId || "root"}
            active={ws.isDemo}
            onSelect={select}
            frame={frame}
            onClose={() => setInspector(false)}
          />
        )}
        {settings && (
          <section
            className="visual-settings glass"
            aria-label="Configuración visual"
          >
            <div className="panel-heading">
              <span>VISUAL EXPERIENCE</span>
              <button
                aria-label="Cerrar configuración"
                onClick={() => setSettings(false)}
              >
                <X size={16} />
              </button>
            </div>
            <label className="setting-row">
              <span>
                Seguir el razonamiento
                <small>Se desactiva al mover la cámara.</small>
              </span>
              <input
                type="checkbox"
                checked={follow}
                onChange={(e) => setFollow(e.target.checked)}
              />
            </label>
            <label className="setting-row">
              <span>
                Reducir movimiento
                <small>
                  {motion.system
                    ? "Activado por tu sistema."
                    : "Sin pulsos ni transiciones de cámara."}
                </small>
              </span>
              <input
                type="checkbox"
                checked={motion.reduced}
                disabled={motion.system}
                onChange={(e) => motion.setDisabled(e.target.checked)}
              />
            </label>
            <label className="glow-setting">
              Intensidad luminosa
              <input
                type="range"
                aria-label="Intensidad luminosa"
                min={0.3}
                max={1.4}
                step={0.1}
                value={glow}
                onChange={(e) => setGlow(Number(e.target.value))}
              />
            </label>
            <div className="settings-divider" />
            <span className="eyebrow">LABORATORIO VISUAL</span>
            <p>
              Prueba el espacio con 40 nodos sintéticos. Sin resultados
              matemáticos.
            </p>
            <button
              className="secondary-button"
              disabled={!ws.isDemo}
              onClick={() => {
                p.pause();
                if (synthetic) reset();
                else setSynthetic(true);
                ws.selectNode("");
                setInspector(false);
                setFollow(false);
                setSettings(false);
                setViewRequest((n) => n + 1);
              }}
            >
              {synthetic
                ? "Volver al ejemplo de 7 nodos"
                : "Probar 40 nodos sintéticos"}
              <ArrowUpRight size={13} />
            </button>
          </section>
        )}
        {ws.page === "dashboard" && <Dashboard openDemo={openDemo} />}
        <div className="universe-note">
          <span className="eyebrow">
            {synthetic ? "SYNTHETIC / 40" : "UNIVERSO / 03"}
          </span>
          {!synthetic && (
            <>
              <code>D = {"{a, b, c}"}</code>
              <span>P = {"{(a,b), (b,c), (c,a)}"}</span>
            </>
          )}
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
          className={`result-beacon ${ws.isDemo && frame.result && !synthetic ? "resolved" : ""}`}
          role="status"
        >
          <span className="beacon-icon">
            {ws.isDemo && frame.result && !synthetic ? (
              <Check size={17} />
            ) : (
              <span className="tiny-ring" />
            )}
          </span>
          <div>
            <span>
              {synthetic
                ? "Prueba visual"
                : !ws.isDemo
                  ? "Sin evaluar"
                  : frame.result
                    ? "Verdadero"
                    : "Razonamiento en curso"}
            </span>
            <small>
              {synthetic
                ? "Sin valor de verdad"
                : !ws.isDemo
                  ? "Motor semántico · fase 2"
                  : frame.result
                    ? "3 de 3 casos · DEMO"
                    : "Secuencia demostrativa"}
            </small>
          </div>
        </div>
        {!synthetic ? (
          <Timeline playback={p} enabled={ws.isDemo} />
        ) : (
          <div className="synthetic-banner glass">
            <span>40 nodos / 39 conexiones · Sin evaluación matemática</span>
            <button
              onClick={() => {
                reset();
              }}
            >
              Volver al árbol DEMO
            </button>
          </div>
        )}
        <div className="scene-footer">
          <span>MM3032 / LOGOS LAB</span>
          <span>
            {motion.reduced ? "MOVIMIENTO REDUCIDO" : "ARRASTRA PARA EXPLORAR"}
            <i /> {follow ? "CÁMARA AUTOMÁTICA" : "CÁMARA LIBRE"}
          </span>
          <span>DEMO · FASE 1.5</span>
        </div>
      </main>
      {menu && (
        <div className="navigation-menu glass">
          <div className="panel-heading">
            <span>LOGIC WORKSPACE</span>
            <button aria-label="Cerrar menú" onClick={() => setMenu(false)}>
              <X size={15} />
            </button>
          </div>
          <a href="#/dashboard" onClick={() => setMenu(false)}>
            Inicio <Home size={15} />
          </a>
          <a href="#/laboratory" onClick={() => setMenu(false)}>
            Reasoning Tree <GitBranch size={15} />
          </a>
          <a href="#/editor" onClick={() => setMenu(false)}>
            Formula Editor <Braces size={15} />
          </a>
          {["Language Builder", "Interpretation Studio", "Experiments"].map(
            (name) => (
              <button key={name} disabled>
                {name}
                <small>Próximamente</small>
              </button>
            ),
          )}
        </div>
      )}
      {dialog && (
        <Modal
          title={
            dialog === "examples"
              ? "Un universo pequeño. Una gran idea."
              : "Explora el árbol viviente."
          }
          close={() => setDialog(null)}
        >
          {dialog === "examples" ? (
            <>
              <p>Para cada elemento existe otro con el que se relaciona.</p>
              <div className="example-formula">∀x ∃y P(x,y)</div>
              <div className="example-details">
                <span>DOMINIO</span>
                <code>D = {"{a,b,c}"}</code>
                <span>RELACIÓN</span>
                <code>P = {"{(a,b),(b,c),(c,a)}"}</code>
              </div>
              <p>
                Una demostración predefinida y matemáticamente correcta: cada
                rama conserva su asignación y su testigo. La animación presenta
                esta traza; no evalúa fórmulas arbitrarias.
              </p>
              <button className="primary-button" onClick={openDemo}>
                Abrir ejemplo <ArrowUpRight size={15} />
              </button>
            </>
          ) : (
            <>
              <p>
                La forma es orgánica. La estructura es lógica. Cada una de las
                seis conexiones representa una relación padre-hijo del ejemplo.
              </p>
              <ul>
                <li>
                  Animar reproduce ocho pasos: creación, testigos, propagación y
                  conclusión.
                </li>
                <li>Pausa, avanza, retrocede o arrastra la línea de tiempo.</li>
                <li>
                  Selecciona un núcleo con ratón o Tab + Enter para
                  inspeccionarlo.
                </li>
                <li>
                  Arrastra y amplía para explorar. El movimiento manual cancela
                  el seguimiento.
                </li>
                <li>
                  Oculta el editor y el inspector, o activa el modo inmersivo.
                </li>
              </ul>
              <p>
                Los colores del núcleo indican la operación. El indicador ✓
                verde muestra un resultado verdadero; ○ significa pendiente.
                Puedes reducir el movimiento desde Configuración visual.
              </p>
              <button
                className="primary-button"
                onClick={() => setDialog(null)}
              >
                Entendido <Check size={15} />
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
