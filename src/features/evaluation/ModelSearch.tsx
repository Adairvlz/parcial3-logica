import { useState } from "react";
import { Search } from "lucide-react";
import {
  SEARCH_LIMITS,
  searchInterpretation,
  type SearchOutcome,
} from "../../core/modelSearch";
import type { LogicalLanguage, VariableAssignment } from "../../core/types";
import { diagnosticLocation } from "./modelEditor";

type Search =
  | { state: "idle" }
  | { state: "running"; target: boolean }
  | { state: "done"; target: boolean; outcome: SearchOutcome };

/** Looks for a small interpretation that makes the formula false or true. */
export function ModelSearch({
  formula,
  language,
  onLoad,
  resetKey,
}: {
  formula: string;
  language: LogicalLanguage;
  onLoad: (outcome: Extract<SearchOutcome, { status: "found" }>) => void;
  /** Any change to the formula or the language clears the last search. */
  resetKey: string;
}) {
  const [search, setSearch] = useState<Search>({ state: "idle" });
  const [key, setKey] = useState(resetKey);
  if (key !== resetKey) {
    setKey(resetKey);
    setSearch({ state: "idle" });
  }
  const run = (target: boolean) => {
    setSearch({ state: "running", target });
    // Let "Buscando…" paint before the synchronous search takes the thread.
    setTimeout(
      () =>
        setSearch({
          state: "done",
          target,
          outcome: searchInterpretation({ formula, language, target }),
        }),
      30,
    );
  };
  const running = search.state === "running";
  return (
    <section className="semantic-card search-card" aria-label="Buscador de interpretaciones">
      <div className="eyebrow">BUSCADOR DE INTERPRETACIONES</div>
      <p>
        Prueba todas las interpretaciones del lenguaje declarado con dominios de
        hasta {SEARCH_LIMITS.domain} elementos. No usa las tablas actuales.
      </p>
      <div className="search-actions">
        <button
          className="secondary-action"
          disabled={running}
          onClick={() => run(false)}
        >
          <Search size={13} /> Buscar contraejemplo
          <small>¿es válida?</small>
        </button>
        <button
          className="secondary-action"
          disabled={running}
          onClick={() => run(true)}
        >
          <Search size={13} /> Buscar modelo
          <small>¿es satisfacible?</small>
        </button>
      </div>
      {running && <p className="search-status">Buscando…</p>}
      {search.state === "done" && (
        <SearchResult
          target={search.target}
          outcome={search.outcome}
          onLoad={onLoad}
        />
      )}
    </section>
  );
}

const tupleText = (t: readonly string[]) => `(${t.join(", ")})`;
function Assignment({ assignment }: { assignment: VariableAssignment }) {
  const entries = Object.entries(assignment);
  if (!entries.length) return null;
  return (
    <li>
      <span>Entorno</span>
      <code>{entries.map(([k, v]) => `${k} ↦ ${v}`).join(", ")}</code>
    </li>
  );
}

function SearchResult({
  target,
  outcome,
  onLoad,
}: {
  target: boolean;
  outcome: SearchOutcome;
  onLoad: (outcome: Extract<SearchOutcome, { status: "found" }>) => void;
}) {
  if (outcome.status === "invalid")
    return (
      <ul className="diagnostics">
        {outcome.errors.map((error, i) => (
          <li key={i}>
            <strong>{diagnosticLocation(error.path)}</strong>
            <p>{error.message}</p>
          </li>
        ))}
      </ul>
    );
  if (outcome.status === "found") {
    const { domain, relations, functions } = outcome.interpretation;
    return (
      <div className={`search-found ${target ? "model" : "counter"}`}>
        <h3>{target ? "Modelo encontrado" : "Contraejemplo encontrado"}</h3>
        <p>
          La fórmula es {target ? "verdadera" : "falsa"} en esta
          interpretación ({outcome.checked}{" "}
          {outcome.checked === 1 ? "candidata revisada" : "candidatas revisadas"}
          ):
        </p>
        <ul className="search-model">
          <li>
            <span>D</span>
            <code>{`{${domain.join(", ")}}`}</code>
          </li>
          {Object.entries(relations).map(([name, tuples]) => (
            <li key={name}>
              <span>{name}ᴵ</span>
              <code>{`{${tuples.map(tupleText).join(", ")}}`}</code>
            </li>
          ))}
          {Object.entries(functions).map(([name, rows]) => (
            <li key={name}>
              <span>{name}ᴵ</span>
              <code>
                {rows
                  .map((r) => `${r.inputs.length ? tupleText(r.inputs) : "()"} ↦ ${r.output}`)
                  .join(", ")}
              </code>
            </li>
          ))}
          <Assignment assignment={outcome.assignment} />
        </ul>
        <button className="primary-button" onClick={() => onLoad(outcome)}>
          Cargar en el editor y evaluar
        </button>
      </div>
    );
  }
  if (outcome.status === "incomplete")
    return (
      <div className="search-miss">
        <h3>Búsqueda incompleta</h3>
        <p>
          Se revisaron {outcome.checked} candidatas, el máximo por búsqueda, sin
          terminar los dominios de {outcome.domain} elementos. Prueba con menos
          símbolos o aridades menores.
        </p>
      </div>
    );
  return (
    <div className="search-miss">
      <h3>
        {target
          ? `Sin modelo con hasta ${outcome.domain} elementos`
          : `Sin contraejemplo con hasta ${outcome.domain} elementos`}
      </h3>
      <p>
        Se revisaron las {outcome.checked} interpretaciones posibles.{" "}
        {target
          ? "La fórmula podría ser insatisfacible, o necesitar un dominio mayor o infinito."
          : "Esto no demuestra que sea válida: podría fallar en un dominio mayor."}
      </p>
      <p className="search-note">
        Por el teorema de Church–Turing, la validez en lógica de primer orden es
        indecidible: ningún programa puede decidirla para toda fórmula. Además,
        la app solo admite relaciones no vacías, así que una fórmula como ∃x P(x)
        no tiene contraejemplo aquí aunque no es válida.
      </p>
    </div>
  );
}
