import { tupleKey } from "../../core/validation";
import type {
  Diagnostic,
  Interpretation,
  LogicalLanguage,
} from "../../core/types";
export interface SymbolDraft {
  id: number;
  name: string;
  arity: string;
  category: "predicate" | "function";
  table: string;
  /** How the table is edited; the text is always the source of truth. */
  view?: "grid" | "text";
}
export interface ModelDraft {
  domain: string;
  symbols: SymbolDraft[];
}
export const EXAMPLE_FORMULA = "∀x ∃y P(x,y)";
export const initialModel: ModelDraft = {
  domain: "a, b, c",
  symbols: [
    {
      id: 1,
      name: "P",
      arity: "2",
      category: "predicate",
      table: "(a, b)\n(b, c)\n(c, a)",
    },
  ],
};

/** `(a, b)` → ["a", "b"]; `()` → []; anything else is not a tuple. */
function tupleContent(text: string): string[] | null {
  const value = text.trim();
  if (!value.startsWith("(") || !value.endsWith(")")) return null;
  const content = value.slice(1, -1).trim();
  return content ? content.split(",").map((v) => v.trim()) : [];
}
const tupleText = (tuple: readonly string[]) => `(${tuple.join(", ")})`;
const FUNCTION_ARROW = /->|↦/;

/** Text tables are a UI format; mathematical validation remains in core. */
export function readModelDraft(
  draft: ModelDraft,
):
  | { valid: true; language: LogicalLanguage; interpretation: Interpretation }
  | { valid: false; errors: Diagnostic[] } {
  const errors: Diagnostic[] = [];
  const domain = draft.domain.trim()
    ? draft.domain.split(/[,\n]/).map((v) => v.trim())
    : [];
  const functions: LogicalLanguage["functions"][number][] = [];
  const predicates: LogicalLanguage["predicates"][number][] = [];
  const relationEntries: [string, string[][]][] = [];
  const functionEntries: [string, { inputs: string[]; output: string }[]][] =
    [];
  for (const symbol of draft.symbols) {
    const name = symbol.name.trim();
    const arity = /^\d+$/.test(symbol.arity.trim())
      ? Number(symbol.arity)
      : NaN;
    const declaration = { name, arity };
    const parseTuple = (text: string, line: number): string[] => {
      const tuple = tupleContent(text);
      if (tuple) return tuple;
      errors.push({
        code: "table-format",
        path: `${name}, fila ${line}`,
        message:
          "Escribe cada tupla entre paréntesis, por ejemplo (a, b) o () para aridad cero.",
      });
      return [];
    };
    const rows = symbol.table
      .split("\n")
      .map((text, i) => ({ text: text.trim(), line: i + 1 }))
      .filter((row) => row.text);
    if (symbol.category === "predicate") {
      predicates.push(declaration);
      relationEntries.push([
        name,
        rows.map((row) => parseTuple(row.text, row.line)),
      ]);
    } else {
      functions.push(declaration);
      functionEntries.push([
        name,
        rows.map((row) => {
          const parts = row.text.split(FUNCTION_ARROW);
          if (parts.length !== 2) {
            errors.push({
              code: "table-format",
              path: `${name}, fila ${row.line}`,
              message:
                "Usa una entrada y una salida: (a, b) -> c. Para constantes: () -> a.",
            });
            return { inputs: [], output: "" };
          }
          return {
            inputs: parseTuple(parts[0], row.line),
            output: parts[1].trim(),
          };
        }),
      ]);
    }
  }
  return errors.length
    ? { valid: false, errors }
    : {
        valid: true,
        language: { functions, predicates },
        interpretation: {
          domain,
          functions: Object.fromEntries(functionEntries),
          relations: Object.fromEntries(relationEntries),
        },
      };
}

/** Past this many inputs a table stops being usable; the text editor remains. */
export const GRID_LIMIT = 216;

/** Distinct, non-empty elements; duplicates are left for validation to report. */
export const domainElements = (text: string) => [
  ...new Set(
    text
      .split(/[,\n]/)
      .map((v) => v.trim())
      .filter(Boolean),
  ),
];
const arityOf = (symbol: SymbolDraft) =>
  /^\d+$/.test(symbol.arity.trim()) ? Number(symbol.arity) : null;
export function allTuples(domain: readonly string[], arity: number) {
  let tuples: string[][] = [[]];
  for (let i = 0; i < arity; i++)
    tuples = tuples.flatMap((tuple) => domain.map((d) => [...tuple, d]));
  return tuples;
}

export type TableGrid =
  | { kind: "text"; reason: string }
  | {
      kind: "relation" | "function";
      tuples: string[][];
      /** Inputs present in the table; for functions, mapped to their output. */
      values: Map<string, string>;
      /** Rows the grid cannot show: outside D, other arity or repeated. */
      foreign: string[];
    };

/**
 * Reads a table as a grid over Dⁿ. Rows that do not fit are kept apart, never
 * dropped, so validation can still report them.
 */
export function tableGrid(
  symbol: SymbolDraft,
  domain: readonly string[],
): TableGrid {
  const arity = arityOf(symbol);
  if (arity === null)
    return { kind: "text", reason: "Indica una aridad entera para usar la tabla." };
  if (!domain.length)
    return { kind: "text", reason: "Define primero el dominio para usar la tabla." };
  const size = domain.length ** arity;
  if (size > GRID_LIMIT)
    return {
      kind: "text",
      reason: `Son ${size} combinaciones de entrada; la tabla admite hasta ${GRID_LIMIT}.`,
    };
  const isFunction = symbol.category === "function";
  const tuples = allTuples(domain, arity);
  const known = new Set(tuples.map(tupleKey));
  const values = new Map<string, string>();
  const foreign: string[] = [];
  for (const raw of symbol.table.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const parts = isFunction ? line.split(FUNCTION_ARROW) : [line];
    const inputs = parts.length === (isFunction ? 2 : 1) ? tupleContent(parts[0]) : null;
    if (!inputs)
      return {
        kind: "text",
        reason: "Hay filas con formato inválido; corrígelas en el texto.",
      };
    const output = isFunction ? parts[1].trim() : "";
    const key = tupleKey(inputs);
    if (
      known.has(key) &&
      !values.has(key) &&
      (!isFunction || domain.includes(output))
    )
      values.set(key, output);
    else foreign.push(line);
  }
  return { kind: isFunction ? "function" : "relation", tuples, values, foreign };
}

export function gridTable(
  category: SymbolDraft["category"],
  tuples: readonly (readonly string[])[],
  values: ReadonlyMap<string, string>,
  foreign: readonly string[],
) {
  const rows = tuples
    .filter((tuple) => values.has(tupleKey(tuple)))
    .map((tuple) =>
      category === "predicate"
        ? tupleText(tuple)
        : `${tupleText(tuple)} -> ${values.get(tupleKey(tuple))}`,
    );
  return [...rows, ...foreign].join("\n");
}

/** Where a diagnostic points, in words instead of internal paths. */
export function diagnosticLocation(path?: string) {
  if (!path) return "Fórmula";
  const table = /^interpretation\.(relations|functions)\.([^[]+)(?:\[(\d+)\])?$/.exec(
    path,
  );
  if (table)
    return `${table[1] === "relations" ? "Relación" : "Función"} ${table[2]}${
      table[3] ? `, fila ${Number(table[3]) + 1}` : ""
    }`;
  if (path.startsWith("interpretation.domain")) return "Dominio";
  if (path.startsWith("interpretation")) return "Interpretación";
  const declaration = /^language\.(functions|predicates)(?:\[(\d+)\])?/.exec(path);
  if (declaration)
    return `${declaration[1] === "functions" ? "Funciones" : "Predicados"} declarados${
      declaration[2] ? `, nº ${Number(declaration[2]) + 1}` : ""
    }`;
  const assignment = /^assignment\.(.+)$/.exec(path);
  if (assignment) return `Asignación de ${assignment[1]}`;
  return path;
}
