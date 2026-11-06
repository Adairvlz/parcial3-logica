import { tupleKey } from "../../core/validation";
import {
  gridTable,
  tableGrid,
  type SymbolDraft,
  type TableGrid,
} from "./modelEditor";

type Grid = Exclude<TableGrid, { kind: "text" }>;

/** Edits one symbol's interpretation as a table over Dⁿ, or as text. */
export function InterpretationEditor({
  symbol,
  index,
  domain,
  onTable,
  onView,
}: {
  symbol: SymbolDraft;
  index: number;
  domain: readonly string[];
  onTable: (table: string) => void;
  onView: (view: "grid" | "text") => void;
}) {
  const grid = tableGrid(symbol, domain);
  const showText = symbol.view === "text" || grid.kind === "text";
  const name = symbol.name.trim() || `símbolo ${index + 1}`;
  const isPredicate = symbol.category === "predicate";
  return (
    <div className="interpretation-editor">
      <div className="interpretation-heading">
        <span>
          {isPredicate
            ? `Tuplas de ${name}ᴵ`
            : `Tabla de ${name}ᴵ: una salida por entrada`}
        </span>
        <div className="view-switch" role="group" aria-label="Forma de edición">
          <button
            aria-pressed={!showText}
            aria-label={`Editar el símbolo ${index + 1} como tabla`}
            disabled={grid.kind === "text"}
            onClick={() => onView("grid")}
          >
            Tabla
          </button>
          <button
            aria-pressed={showText}
            aria-label={`Editar el símbolo ${index + 1} como texto`}
            onClick={() => onView("text")}
          >
            Texto
          </button>
        </div>
      </div>
      {showText ? (
        <>
          <textarea
            aria-label={`Interpretación del símbolo ${index + 1}`}
            value={symbol.table}
            spellCheck={false}
            rows={Math.min(7, Math.max(3, symbol.table.split("\n").length))}
            onChange={(e) => onTable(e.target.value)}
          />
          <small>
            {grid.kind === "text" ? `${grid.reason} ` : ""}
            {isPredicate
              ? "Una tupla por línea: (a, b). La relación debe ser no vacía; () representa una tupla de aridad cero."
              : "Una fila por entrada: (a) -> b. Para aridad cero: () -> a. Debe existir una salida para cada entrada de Dⁿ."}
          </small>
        </>
      ) : (
        <GridEditor
          symbol={symbol}
          name={name}
          domain={domain}
          grid={grid as Grid}
          onTable={onTable}
        />
      )}
    </div>
  );
}

function GridEditor({
  symbol,
  name,
  domain,
  grid,
  onTable,
}: {
  symbol: SymbolDraft;
  name: string;
  domain: readonly string[];
  grid: Grid;
  onTable: (table: string) => void;
}) {
  const { tuples, values, foreign } = grid;
  const write = (next: Map<string, string>, keep = foreign) =>
    onTable(gridTable(symbol.category, tuples, next, keep));
  const toggle = (tuple: readonly string[]) => {
    const next = new Map(values);
    const key = tupleKey(tuple);
    if (next.has(key)) next.delete(key);
    else next.set(key, "");
    write(next);
  };
  const setOutput = (tuple: readonly string[], output: string) => {
    const next = new Map(values);
    if (output) next.set(tupleKey(tuple), output);
    else next.delete(tupleKey(tuple));
    write(next);
  };
  const atom = (tuple: readonly string[]) => `${name}(${tuple.join(", ")})`;
  const arity = tuples[0].length;
  const checkbox = (tuple: readonly string[], label: string) => (
    <label className="tuple-check" key={tupleKey(tuple)}>
      <input
        type="checkbox"
        aria-label={atom(tuple)}
        checked={values.has(tupleKey(tuple))}
        onChange={() => toggle(tuple)}
      />
      <span>{label}</span>
    </label>
  );
  return (
    <>
      {grid.kind === "function" ? (
        <div className="function-rows">
          {tuples.map((tuple) => (
            <label key={tupleKey(tuple)}>
              <code>{arity ? atom(tuple) : name}</code>
              <span>=</span>
              <select
                aria-label={arity ? atom(tuple) : name}
                value={values.get(tupleKey(tuple)) ?? ""}
                onChange={(e) => setOutput(tuple, e.target.value)}
              >
                <option value="">—</option>
                {domain.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : arity === 2 ? (
        <div className="relation-matrix-wrap">
          <table className="relation-matrix">
            <thead>
              <tr>
                <th scope="col" title="Primer argumento ↓, segundo argumento →">
                  {name}
                </th>
                {domain.map((d) => (
                  <th scope="col" key={d}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {domain.map((first) => (
                <tr key={first}>
                  <th scope="row">{first}</th>
                  {domain.map((second) => (
                    <td key={second}>{checkbox([first, second], "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : arity === 0 ? (
        <div className="tuple-list">
          {checkbox([], `() ∈ ${name}ᴵ: ${name} es verdadero`)}
        </div>
      ) : (
        <div className={`tuple-list ${arity > 1 ? "scroll" : ""}`}>
          {tuples.map((tuple) =>
            checkbox(tuple, arity === 1 ? tuple[0] : `(${tuple.join(", ")})`),
          )}
        </div>
      )}
      <small>
        {grid.kind === "function"
          ? `${values.size} de ${tuples.length} salidas definidas. La función debe ser total.`
          : `${values.size} de ${tuples.length} tuplas marcadas. La relación debe ser no vacía.`}
        {arity === 2 && grid.kind === "relation"
          ? " Filas: primer argumento; columnas: segundo."
          : ""}
      </small>
      {foreign.length > 0 && (
        <div className="foreign-rows" role="note">
          <span>
            {foreign.length === 1
              ? "1 fila no encaja en la tabla"
              : `${foreign.length} filas no encajan en la tabla`}{" "}
            (fuera del dominio, de otra aridad o repetidas):{" "}
            <code>{foreign.join("  ")}</code>
          </span>
          <button onClick={() => write(values, [])}>Quitarlas</button>
        </div>
      )}
    </>
  );
}
