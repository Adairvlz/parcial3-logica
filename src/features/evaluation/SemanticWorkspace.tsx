import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  CircleAlert,
  FlaskConical,
  GitBranch,
  Plus,
  Play,
  Trash2,
  X,
} from "lucide-react";
import { FormulaEditor } from "../editor/FormulaEditor";
import { evaluateRequest } from "../../core/evaluator";
import type {
  EvaluationOutcome,
  Evidence,
  Interpretation,
} from "../../core/types";
import type { Evaluation } from "../laboratory/ReasoningView";
import {
  diagnosticLocation,
  domainElements,
  draftFromInterpretation,
  EXAMPLE_FORMULA,
  initialModel,
  languageOfDraft,
  readModelDraft,
  type ModelDraft,
} from "./modelEditor";
import { InterpretationEditor } from "./InterpretationEditor";
import { ModelSearch } from "./ModelSearch";
import { CLASS_EXAMPLES, type ClassExample } from "./examples";
import "./semantic.css";

interface SavedState {
  model: ModelDraft;
  assignment: Record<string, string>;
  variables: string[];
}
function evaluateDraft(
  draft: ModelDraft,
  formula: string,
  assignment: Record<string, string>,
): { outcome: EvaluationOutcome; interpretation?: Interpretation } {
  const model = readModelDraft(draft);
  if (!model.valid)
    return { outcome: { status: "invalid", errors: model.errors } };
  return {
    outcome: evaluateRequest({
      formula,
      language: model.language,
      interpretation: model.interpretation,
      assignment,
    }),
    interpretation: model.interpretation,
  };
}
export function SemanticWorkspace({
  formula,
  onChange,
  visible,
  onResult,
  onShowTree,
}: {
  formula: string;
  onChange: (text: string) => void;
  visible: boolean;
  onResult: (evaluation: Evaluation | null) => void;
  onShowTree: () => void;
}) {
  const [state, setState] = useState<SavedState>({
    model: structuredClone(initialModel),
    assignment: {},
    variables: [],
  });
  // The app opens with the example already evaluated, tree included.
  const [result, setResult] = useState<ReturnType<typeof evaluateDraft> | null>(
    () => evaluateDraft(initialModel, formula, {}),
  );
  const outcome = result?.outcome ?? null;
  const evaluationId = useRef(0);
  const nextId = useRef(2);
  const scrollToResult = useRef(false);
  const formRef = useRef<HTMLTextAreaElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const assignmentRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    onResult(
      outcome?.status === "evaluated" && result?.interpretation
        ? {
            id: ++evaluationId.current,
            formula,
            evidence: outcome.evidence,
            interpretation: result.interpretation,
          }
        : null,
    );
  }, [result]);
  useEffect(() => {
    if (!outcome || !scrollToResult.current) return;
    scrollToResult.current = false;
    const animation = requestAnimationFrame(() => {
      const target =
        outcome.status === "needs-assignment"
          ? assignmentRef.current
          : resultRef.current;
      target?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(animation);
  }, [outcome]);
  const invalidate = () => setResult(null);
  // Names the class example on screen until the model or the formula changes.
  const [example, setExample] = useState<ClassExample | null>(null);
  const updateModel = (model: ModelDraft) => {
    setState({ model, assignment: {}, variables: [] });
    setExample(null);
    invalidate();
  };
  const updateFormula = (text: string) => {
    onChange(text);
    setState((s) => ({ ...s, variables: [], assignment: {} }));
    setExample(null);
    invalidate();
  };
  /** Replaces model, formula and environment at once, and evaluates them. */
  const load = (
    model: ModelDraft,
    text: string,
    assignment: Record<string, string> = {},
  ) => {
    nextId.current = Math.max(nextId.current, ...model.symbols.map((s) => s.id + 1));
    onChange(text);
    setState({ model, assignment, variables: Object.keys(assignment) });
    scrollToResult.current = true;
    setResult(evaluateDraft(model, text, assignment));
  };
  const loadExample = (id: string) => {
    const chosen = CLASS_EXAMPLES.find((e) => e.id === id);
    if (!chosen) return;
    load(structuredClone(chosen.model), chosen.formula, chosen.assignment);
    setExample(chosen);
  };
  const reset = () => {
    onChange(EXAMPLE_FORMULA);
    setState({
      model: structuredClone(initialModel),
      assignment: {},
      variables: [],
    });
    setExample(null);
    invalidate();
  };
  const run = () => {
    const next = evaluateDraft(state.model, formula, state.assignment);
    const { outcome } = next;
    if (outcome.status === "needs-assignment")
      setState((s) => ({ ...s, variables: outcome.variables }));
    scrollToResult.current = true;
    setResult(next);
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
  // Switching between table and text does not change the model or its result.
  const setView = (id: number, view: "grid" | "text") =>
    setState((s) => ({
      ...s,
      model: {
        ...s.model,
        symbols: s.model.symbols.map((symbol) =>
          symbol.id === id ? { ...symbol, view } : symbol,
        ),
      },
    }));
  const elements = domainElements(state.model.domain);
  return (
    <section
      className="semantic-workspace"
      aria-label="Evaluador semántico"
      hidden={!visible}
    >
      <div className="semantic-layout">
        <div className="semantic-inputs">
          <section className="semantic-card">
            <div className="semantic-card-title">
              <span>01</span>
              <h2>Lenguaje e interpretación</h2>
              <select
                className="example-picker"
                aria-label="Cargar ejemplo de clase"
                value=""
                onChange={(e) => loadExample(e.target.value)}
              >
                <option value="" disabled>
                  Cargar ejemplo de clase…
                </option>
                {CLASS_EXAMPLES.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.source} · {e.title}
                  </option>
                ))}
              </select>
            </div>
            {example && (
              <p className="example-note">
                <strong>{example.source}.</strong> {example.description}
              </p>
            )}
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
                <InterpretationEditor
                  symbol={symbol}
                  index={index}
                  domain={elements}
                  onTable={(table) => symbolChange(symbol.id, { table })}
                  onView={(view) => setView(symbol.id, view)}
                />
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
                onReset={reset}
              />
            </div>
            <details className="grammar-help">
              <summary>
                Notación y alcance de los cuantificadores{" "}
                <ChevronDown size={13} />
              </summary>
              <p>
                Precedencia: ¬, ∀ y ∃, luego ∧, ∨, →, ↔. La implicación se asocia
                a la derecha. ∀x y ∃x abarcan solo lo inmediato: ∀x P(x) → Q(x)
                significa (∀x P(x)) → Q(x) y deja libre la segunda x. Usa
                ∀x (P(x) → Q(x)) para ligarla.
              </p>
              <p>
                Desde el teclado: ~ para ¬, &amp; para ∧, | para ∨, -&gt; para →,
                &lt;-&gt; para ↔, forall para ∀ y exists para ∃. La igualdad se
                escribe t = s entre términos. Las constantes son funciones de
                aridad cero, escritas c o c().
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
                      {elements.map((value) => (
                        <option key={value} value={value}>
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
                      <strong>{diagnosticLocation(error.path)}</strong>
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
                  {outcome.value ? <Check size={24} /> : <X size={24} />}
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
                <button className="primary-button tree-link" onClick={onShowTree}>
                  <GitBranch size={14} /> Ver razonamiento en el árbol
                </button>
                <EvidenceView evidence={outcome.evidence} root />
              </>
            )}
          </div>
          <ModelSearch
            formula={formula}
            language={languageOfDraft(state.model)}
            resetKey={`${formula}\u0000${JSON.stringify(languageOfDraft(state.model))}`}
            onLoad={(found) =>
              load(
                draftFromInterpretation(state.model, found.interpretation),
                formula,
                { ...found.assignment },
              )
            }
          />
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
  const [expanded, setExpanded] = useState(root || Boolean(e.decisive));
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
