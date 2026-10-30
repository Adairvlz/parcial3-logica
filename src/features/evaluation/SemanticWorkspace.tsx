import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleAlert,
  FlaskConical,
  Plus,
  Play,
  Trash2,
} from "lucide-react";
import { FormulaEditor } from "../editor/FormulaEditor";
import { evaluateRequest } from "../../core/evaluator";
import type { EvaluationOutcome, Evidence } from "../../core/types";
import { initialModel, readModelDraft, type ModelDraft } from "./modelEditor";
import { DEMO_FORMULA } from "../demo/scenario";
import "./semantic.css";

interface SavedState {
  model: ModelDraft;
  assignment: Record<string, string>;
  variables: string[];
}
export function SemanticWorkspace({
  formula,
  onChange,
  onClose,
  visible,
}: {
  formula: string;
  onChange: (text: string) => void;
  onClose: () => void;
  visible: boolean;
}) {
  const [state, setState] = useState<SavedState>({
    model: structuredClone(initialModel),
    assignment: {},
    variables: [],
  });
  const [outcome, setOutcome] = useState<EvaluationOutcome | null>(null);
  useEffect(() => {
    setOutcome(null);
    setState((s) => ({ ...s, variables: [], assignment: {} }));
  }, [formula]);
  const nextId = useRef(2);
  const formRef = useRef<HTMLTextAreaElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const assignmentRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!outcome) return;
    const animation = requestAnimationFrame(() => {
      const target =
        outcome.status === "needs-assignment"
          ? assignmentRef.current
          : resultRef.current;
      target?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(animation);
  }, [outcome]);
  const invalidate = () => setOutcome(null);
  const updateModel = (model: ModelDraft) => {
    setState({ model, assignment: {}, variables: [] });
    invalidate();
  };
  const updateFormula = (text: string) => {
    onChange(text);
    setState((s) => ({ ...s, variables: [], assignment: {} }));
    invalidate();
  };
  const reset = () => {
    onChange(DEMO_FORMULA);
    setState({
      model: structuredClone(initialModel),
      assignment: {},
      variables: [],
    });
    invalidate();
  };
  const run = () => {
    const model = readModelDraft(state.model);
    if (!model.valid) {
      setOutcome({ status: "invalid", errors: model.errors });
      return;
    }
    const result = evaluateRequest({
      formula,
      language: model.language,
      interpretation: model.interpretation,
      assignment: state.assignment,
    });
    if (result.status === "needs-assignment")
      setState((s) => ({ ...s, variables: result.variables }));
    setOutcome(result);
  };
  const symbolChange = (
    id: number,
    patch: Partial<ModelDraft["symbols"][number]>,
  ) =>
    updateModel({
      ...state.model,
      symbols: state.model.symbols.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    });
  const domain = readModelDraft(state.model);
  return (
    <section
      className="semantic-workspace"
      aria-label="Evaluador semántico"
      hidden={!visible}
    >
      <header className="semantic-heading">
        <div>
          <span className="eyebrow">
            <FlaskConical size={13} /> FASE 02 · MOTOR DETERMINISTA
          </span>
          <h1>Del símbolo al significado.</h1>
          <p>
            Define un universo finito. Evalúa una fórmula. Revisa su
            justificación.
          </p>
        </div>
        <button className="secondary-button" onClick={onClose}>
          <ArrowLeft size={14} /> Volver al árbol DEMO
        </button>
      </header>
      <div className="semantic-layout">
        <div className="semantic-inputs">
          <section className="semantic-card">
            <div className="semantic-card-title">
              <span>01</span>
              <h2>Lenguaje e interpretación</h2>
            </div>
            <label className="domain-editor">
              Dominio finito
              <input
                aria-label="Dominio finito"
                value={state.model.domain}
                placeholder="a, b, c"
                onChange={(e) =>
                  updateModel({ ...state.model, domain: e.target.value })
                }
              />
              <small>
                Elementos separados por comas o saltos de línea; sin duplicados.
                Las etiquetas no son constantes hasta declararlas.
              </small>
            </label>
            <div className="declaration-heading">
              <h3>Símbolos declarados</h3>
              <button
                className="text-button"
                onClick={() =>
                  updateModel({
                    ...state.model,
                    symbols: [
                      ...state.model.symbols,
                      {
                        id: nextId.current++,
                        name: "",
                        arity: "1",
                        category: "predicate",
                        table: "",
                      },
                    ],
                  })
                }
              >
                <Plus size={14} /> Añadir símbolo
              </button>
            </div>
            {state.model.symbols.map((symbol, index) => (
              <fieldset className="symbol-declaration" key={symbol.id}>
                <legend>Símbolo {index + 1}</legend>
                <div className="symbol-fields">
                  <label>
                    Tipo
                    <select
                      aria-label={`Tipo del símbolo ${index + 1}`}
                      value={symbol.category}
                      onChange={(e) =>
                        symbolChange(symbol.id, {
                          category: e.target.value as "predicate" | "function",
                          table: "",
                        })
                      }
                    >
                      <option value="predicate">Predicado</option>
                      <option value="function">Función / constante</option>
                    </select>
                  </label>
                  <label>
                    Nombre
                    <input
                      aria-label={`Nombre del símbolo ${index + 1}`}
                      value={symbol.name}
                      onChange={(e) =>
                        symbolChange(symbol.id, { name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Aridad
                    <input
                      aria-label={`Aridad del símbolo ${index + 1}`}
                      type="number"
                      min="0"
                      max="8"
                      step="1"
                      value={symbol.arity}
                      onChange={(e) =>
                        symbolChange(symbol.id, { arity: e.target.value })
                      }
                    />
                  </label>
                  <button
                    aria-label={`Eliminar símbolo ${index + 1}`}
                    title="Eliminar símbolo"
                    onClick={() =>
                      updateModel({
                        ...state.model,
                        symbols: state.model.symbols.filter(
                          (s) => s.id !== symbol.id,
                        ),
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <label className="table-editor">
                  {symbol.category === "predicate"
                    ? "Tuplas de la relación"
                    : "Tabla total de la función"}
                  <textarea
                    aria-label={`Interpretación del símbolo ${index + 1}`}
                    value={symbol.table}
                    spellCheck={false}
                    rows={Math.min(
                      7,
                      Math.max(3, symbol.table.split("\n").length),
                    )}
                    onChange={(e) =>
                      symbolChange(symbol.id, { table: e.target.value })
                    }
                  />
                </label>
                <small>
                  {symbol.category === "predicate"
                    ? "Una tupla por línea: (a, b). La relación debe ser no vacía; () representa una tupla de aridad cero."
                    : "Una fila por entrada: (a) -> b. Para aridad cero: () -> a. Debe existir una salida para cada entrada de Dⁿ."}
                </small>
              </fieldset>
            ))}
          </section>
          <section className="semantic-card">
            <div className="semantic-card-title">
              <span>02</span>
              <h2>Fórmula</h2>
            </div>
            <div
              ref={(el) => {
                formRef.current = el?.querySelector("textarea") ?? null;
              }}
            >
              <FormulaEditor
                formula={formula}
                onChange={updateFormula}
                isDemo={false}
                onReset={reset}
                mode="semantic"
              />
            </div>
            <details className="grammar-help">
              <summary>
                Notación y alcance de los cuantificadores{" "}
                <ChevronDown size={13} />
              </summary>
              <p>
                Precedencia: ¬, ∧, ∨, →, ↔. La implicación se asocia a la
                derecha. ∀x y ∃x abarcan la expresión siguiente hasta el cierre
                de paréntesis: ∀x P(x) → Q(x) significa ∀x (P(x) → Q(x)). Usa
                (∀x P(x)) → Q(x) para dejar libre la segunda x.
              </p>
              <p>
                Se admite un punto opcional: ∀x. P(x). Las constantes son
                funciones de aridad cero, escritas c o c(). No se admiten
                igualdad ni alias ASCII en esta versión.
              </p>
            </details>
          </section>
          {state.variables.length > 0 && (
            <section ref={assignmentRef} className="semantic-card">
              <div className="semantic-card-title">
                <span>03</span>
                <h2>Asignaciones de variables libres</h2>
              </div>
              <div className="assignment-fields">
                {state.variables.map((name) => (
                  <label key={name}>
                    {name}
                    <select
                      aria-label={`Asignación de ${name}`}
                      value={state.assignment[name] ?? ""}
                      onChange={(e) => {
                        setState((s) => ({
                          ...s,
                          assignment: {
                            ...s.assignment,
                            [name]: e.target.value,
                          },
                        }));
                        invalidate();
                      }}
                    >
                      <option value="" disabled>
                        Selecciona un elemento
                      </option>
                      {domain.valid &&
                        domain.interpretation.domain.map((value, i) => (
                          <option key={i} value={value}>
                            {value}
                          </option>
                        ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>
          )}
          <div className="semantic-run">
            <button className="primary-button" onClick={run}>
              <Play size={14} /> Evaluar fórmula
            </button>
            <span>Evaluación local · sin IA · sin backend</span>
          </div>
        </div>
        <aside className="semantic-results" aria-live="polite">
          <div ref={resultRef} className="semantic-card result-card">
            <div className="eyebrow">RESULTADO DEL MOTOR</div>
            {!outcome && (
              <div className="semantic-empty">
                <FlaskConical size={32} />
                <h2>Sin evaluar</h2>
                <p>
                  Configura el lenguaje, la interpretación y la fórmula. Cada
                  modificación retira el resultado anterior.
                </p>
              </div>
            )}
            {outcome?.status === "invalid" && (
              <>
                <h2 className="invalid-title">
                  <CircleAlert size={22} /> Entrada inválida
                </h2>
                <p>No se asigna un valor de verdad.</p>
                <ul className="diagnostics">
                  {outcome.errors.map((error, i) => (
                    <li key={i}>
                      <strong>{error.path ?? "Fórmula"}</strong>
                      <p>{error.message}</p>
                      {error.range && (
                        <button
                          onClick={() => {
                            formRef.current?.focus();
                            formRef.current?.setSelectionRange(
                              error.range!.start,
                              error.range!.end,
                            );
                            formRef.current?.scrollIntoView({
                              block: "center",
                            });
                          }}
                        >
                          Seleccionar posición {error.range.start + 1}–
                          {Math.max(error.range.start + 1, error.range.end)}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {outcome?.status === "needs-assignment" && (
              <>
                <h2 className="pending-title">Fórmula abierta</h2>
                <p>
                  Asigna valores de D a {outcome.missing.join(", ")} y vuelve a
                  evaluar.
                </p>
              </>
            )}
            {outcome?.status === "limit" && (
              <>
                <h2 className="pending-title">Límite de cálculo</h2>
                <p>{outcome.message}</p>
                <small>{outcome.operations} operaciones intentadas.</small>
              </>
            )}
            {outcome?.status === "evaluated" && (
              <>
                <div
                  className={`engine-truth ${outcome.value ? "true" : "false"}`}
                >
                  <Check size={24} />
                  <h2>{outcome.value ? "Verdadero" : "Falso"}</h2>
                  <span>MOTOR REAL</span>
                </div>
                <p className="engine-explanation">
                  {outcome.evidence.explanation}
                </p>
                <div className="engine-meta">
                  <span>
                    {outcome.freeVariables.length
                      ? "Fórmula abierta"
                      : "Fórmula cerrada"}
                  </span>
                  <span>{outcome.operations} operaciones</span>
                </div>
                <h3 className="evidence-heading">Justificación verificable</h3>
                <EvidenceView evidence={outcome.evidence} root />
                <p className="semantic-boundary">
                  Este resultado corresponde a tus entradas actuales. El árbol
                  luminoso de siete nodos sigue siendo una demostración
                  independiente; los árboles de evaluación arbitrarios llegarán
                  en fase 3.
                </p>
              </>
            )}
          </div>
          <div className="semantic-card model-notes">
            <h3>Condiciones del modelo</h3>
            <p>
              Dominio no vacío. Todas las funciones son totales. Todas las
              relaciones tienen al menos una tupla, pero no necesitan contener
              todas las tuplas posibles.
            </p>
            <p>
              Un error de sintaxis, aridad, tabla o asignación impide evaluar.
              Un resultado falso es una fórmula válida bajo una interpretación
              válida.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function EvidenceView({
  evidence: e,
  root = false,
}: {
  evidence: Evidence;
  root?: boolean;
}) {
  const [expanded, setExpanded] = useState(root);
  return (
    <div className={`evidence ${e.value ? "true" : "false"}`}>
      <button
        className="evidence-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <span>{e.value ? "V" : "F"}</span>
        <code>{e.formula}</code>
        {Object.keys(e.environment).length > 0 && (
          <small className="evidence-assignment">
            {Object.entries(e.environment)
              .map(([key, value]) => `${key}↦${value}`)
              .join(" · ")}
          </small>
        )}
        <ChevronDown size={13} />
      </button>
      {expanded && (
        <div className="evidence-body">
          <strong>{e.rule}</strong>
          <p>{e.explanation}</p>
          {Object.keys(e.environment).length > 0 && (
            <code className="evidence-env">
              {Object.entries(e.environment)
                .map(([key, value]) => `${key} ↦ ${value}`)
                .join(" · ")}
            </code>
          )}
          {e.terms?.map((term, i) => (
            <code className="evidence-env" key={i}>
              {term.expression} ↦ {term.value}
            </code>
          ))}
          {e.witness && (
            <span className="evidence-finding">
              Testigo: {e.witness.variable} = {e.witness.value}
            </span>
          )}
          {e.counterexample && (
            <span className="evidence-finding">
              Contraejemplo: {e.counterexample.variable} ={" "}
              {e.counterexample.value}
            </span>
          )}
          {e.checked !== undefined && (
            <small>Casos comprobados: {e.checked}</small>
          )}
          {e.skipped && <p className="evidence-skipped">{e.skipped}</p>}
          {e.children.map((child, i) => (
            <EvidenceView key={i} evidence={child} />
          ))}
        </div>
      )}
    </div>
  );
}
