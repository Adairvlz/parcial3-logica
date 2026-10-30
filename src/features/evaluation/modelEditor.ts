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
}
export interface ModelDraft {
  domain: string;
  symbols: SymbolDraft[];
}
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
      const value = text.trim();
      if (!value.startsWith("(") || !value.endsWith(")")) {
        errors.push({
          code: "table-format",
          path: `${name}, fila ${line}`,
          message:
            "Escribe cada tupla entre paréntesis, por ejemplo (a, b) o () para aridad cero.",
        });
        return [];
      }
      const content = value.slice(1, -1).trim();
      return content ? content.split(",").map((v) => v.trim()) : [];
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
          const parts = row.text.split(/->|↦/);
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
