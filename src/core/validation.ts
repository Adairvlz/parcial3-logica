import { IDENTIFIER, SYNTAX_LIMITS } from "./parser";
import type {
  Diagnostic,
  FormulaAST,
  Interpretation,
  LogicalLanguage,
  TermAST,
} from "./types";
export const MODEL_LIMITS = {
  domain: 128,
  arity: 8,
  rows: 20000,
  symbols: 128,
} as const;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const own = (object: object, key: string) =>
  Object.prototype.hasOwnProperty.call(object, key);
export const tupleKey = (tuple: readonly string[]) => JSON.stringify(tuple);

export function validateModel(
  language: unknown,
  interpretation: unknown,
):
  | { valid: true; language: LogicalLanguage; interpretation: Interpretation }
  | { valid: false; errors: Diagnostic[] } {
  const errors: Diagnostic[] = [];
  const add = (code: string, path: string, message: string) => {
    if (errors.length < 100) errors.push({ code, path, message });
  };
  if (!record(language) || !record(interpretation))
    return {
      valid: false,
      errors: [
        {
          code: "shape",
          message: "Lenguaje e interpretación deben ser objetos.",
        },
      ],
    };
  const names = new Set<string>();
  for (const group of ["functions", "predicates"]) {
    const list = language[group];
    if (!Array.isArray(list)) {
      add("shape", `language.${group}`, "Debe ser una lista de símbolos.");
      continue;
    }
    if (list.length > MODEL_LIMITS.symbols) {
      add(
        "resource",
        `language.${group}`,
        "Se supera el límite de 128 símbolos por categoría.",
      );
      continue;
    }
    list.forEach((symbol: unknown, i: number) => {
      const path = `language.${group}[${i}]`;
      if (
        !record(symbol) ||
        typeof symbol.name !== "string" ||
        !IDENTIFIER.test(symbol.name)
      ) {
        add(
          "symbol",
          path,
          "El nombre debe comenzar con una letra o _ y contener solo letras, números o _.",
        );
        return;
      }
      if (names.has(symbol.name))
        add(
          "duplicate",
          path,
          `El símbolo ${symbol.name} está declarado más de una vez (incluidas ambas categorías).`,
        );
      names.add(symbol.name);
      if (
        typeof symbol.arity !== "number" ||
        !Number.isSafeInteger(symbol.arity) ||
        symbol.arity < 0
      )
        add("arity", path, "La aridad debe ser un entero no negativo.");
      else if (symbol.arity > MODEL_LIMITS.arity)
        add(
          "resource",
          path,
          "Esta versión admite aridades hasta 8. No se ha evaluado el modelo.",
        );
    });
  }
  const domain = interpretation.domain;
  if (!Array.isArray(domain) || domain.length === 0)
    add(
      "domain",
      "interpretation.domain",
      "El dominio debe ser una lista no vacía.",
    );
  else if (domain.length > MODEL_LIMITS.domain)
    add(
      "resource",
      "interpretation.domain",
      "Esta versión admite hasta 128 elementos de dominio.",
    );
  else {
    const elements = new Set<string>();
    domain.forEach((item: unknown, i: number) => {
      if (typeof item !== "string" || !item.trim())
        add(
          "domain",
          `interpretation.domain[${i}]`,
          "Cada elemento debe ser una cadena no vacía.",
        );
      else if (elements.has(item))
        add(
          "duplicate",
          "interpretation.domain",
          `Elemento duplicado: ${item}.`,
        );
      else elements.add(item);
    });
  }
  if (!record(interpretation.functions))
    add(
      "shape",
      "interpretation.functions",
      "Las tablas de funciones deben ser un objeto.",
    );
  if (!record(interpretation.relations))
    add(
      "shape",
      "interpretation.relations",
      "Las relaciones deben ser un objeto.",
    );
  if (errors.length) return { valid: false, errors };
  const lang = language as unknown as LogicalLanguage;
  const model = interpretation as unknown as Interpretation;
  const rowCount = [
    ...Object.values(model.functions),
    ...Object.values(model.relations),
  ].reduce((total, rows) => total + (Array.isArray(rows) ? rows.length : 0), 0);
  if (rowCount > MODEL_LIMITS.rows)
    return {
      valid: false,
      errors: [
        {
          code: "resource",
          path: "interpretation",
          message: "La interpretación supera el límite total de 20000 filas.",
        },
      ],
    };
  const elements = new Set(model.domain);
  for (const [group, symbols] of [
    ["functions", lang.functions],
    ["relations", lang.predicates],
  ] as const) {
    const tables = interpretation[group] as Record<string, unknown>;
    for (const name of Object.keys(tables))
      if (!symbols.some((s) => s.name === name))
        add(
          "symbol",
          `interpretation.${group}.${name}`,
          `Tabla para un símbolo no declarado: ${name}.`,
        );
    for (const symbol of symbols) {
      const path = `interpretation.${group}.${symbol.name}`;
      if (!own(tables, symbol.name)) {
        add("missing", path, `Falta interpretar ${symbol.name}.`);
        continue;
      }
      const rows = tables[symbol.name];
      if (!Array.isArray(rows)) {
        add(
          "shape",
          path,
          "La interpretación debe ser una lista de filas o tuplas.",
        );
        continue;
      }
      if (rows.length === 0)
        add(
          "empty",
          path,
          group === "functions"
            ? "La función no puede tener una tabla vacía."
            : "La consigna exige que cada relación sea no vacía.",
        );
      if (rows.length > MODEL_LIMITS.rows) {
        add("resource", path, "La tabla supera el límite de 20000 filas.");
        continue;
      }
      const seen = new Set<string>();
      rows.forEach((row: unknown, index: number) => {
        const rowPath = `${path}[${index}]`;
        const tuple =
          group === "functions" ? (record(row) ? row.inputs : undefined) : row;
        if (!Array.isArray(tuple) || tuple.length !== symbol.arity) {
          add(
            "tuple",
            rowPath,
            `Se requieren exactamente ${symbol.arity} elementos de entrada.`,
          );
          return;
        }
        if (tuple.some((v) => typeof v !== "string" || !elements.has(v)))
          add(
            "domain",
            rowPath,
            "La tupla contiene elementos ajenos al dominio.",
          );
        const key = JSON.stringify(tuple);
        if (seen.has(key))
          add(
            "duplicate",
            rowPath,
            group === "functions"
              ? "Entrada de función duplicada: debe existir una sola salida por entrada."
              : "Tupla repetida en la relación.",
          );
        seen.add(key);
        if (
          group === "functions" &&
          (!record(row) ||
            typeof row.output !== "string" ||
            !elements.has(row.output))
        )
          add(
            "domain",
            rowPath,
            "La salida de la función debe pertenecer al dominio.",
          );
      });
      if (group === "functions") {
        const expected = BigInt(model.domain.length) ** BigInt(symbol.arity);
        if (BigInt(seen.size) !== expected)
          add(
            "totality",
            path,
            `${symbol.name} debe ser total: se requieren ${expected} entradas distintas de D^${symbol.arity}; hay ${seen.size}.`,
          );
      }
    }
  }
  return errors.length
    ? { valid: false, errors }
    : { valid: true, language: lang, interpretation: model };
}

export function analyzeAST(
  ast: FormulaAST,
  language: LogicalLanguage,
): { errors: Diagnostic[]; freeVariables: string[] } {
  const errors: Diagnostic[] = [];
  const free = new Set<string>();
  const functions = new Map(language.functions.map((s) => [s.name, s.arity]));
  const predicates = new Map(language.predicates.map((s) => [s.name, s.arity]));
  const error = (code: string, message: string, range: FormulaAST["range"]) => {
    if (errors.length < 100) errors.push({ code, message, range });
  };
  function term(node: TermAST, bound: Set<string>, depth: number) {
    if (depth > SYNTAX_LIMITS.depth) {
      error(
        "resource",
        "El término supera el límite de profundidad.",
        node.range,
      );
      return;
    }
    if (node.kind === "variable") {
      if (predicates.has(node.name) || functions.has(node.name))
        error(
          "symbol",
          `${node.name} es un símbolo declarado, no una variable ni una constante de aridad cero.`,
          node.range,
        );
      else if (!bound.has(node.name)) free.add(node.name);
    } else {
      if (!functions.has(node.name))
        error("symbol", `Función no declarada: ${node.name}.`, node.range);
      else if (functions.get(node.name) !== node.args.length)
        error(
          "arity",
          `${node.name} requiere ${functions.get(node.name)} argumentos; recibió ${node.args.length}.`,
          node.range,
        );
      node.args.forEach((arg) => term(arg, bound, depth + 1));
    }
  }
  function walk(node: FormulaAST, bound: Set<string>, depth: number) {
    if (depth > SYNTAX_LIMITS.depth) {
      error(
        "resource",
        "La fórmula supera el límite de profundidad del AST.",
        node.range,
      );
      return;
    }
    switch (node.kind) {
      case "predicate":
        if (!predicates.has(node.name))
          error("symbol", `Predicado no declarado: ${node.name}.`, node.range);
        else if (predicates.get(node.name) !== node.args.length)
          error(
            "arity",
            `${node.name} requiere ${predicates.get(node.name)} argumentos; recibió ${node.args.length}.`,
            node.range,
          );
        node.args.forEach((arg) => term(arg, bound, depth + 1));
        break;
      case "not":
        walk(node.operand, bound, depth + 1);
        break;
      case "forall":
      case "exists": {
        if (functions.has(node.variable) || predicates.has(node.variable))
          error(
            "variable",
            `La variable ligada ${node.variable} colisiona con un símbolo del lenguaje.`,
            node.range,
          );
        const next = new Set(bound);
        next.add(node.variable);
        walk(node.body, next, depth + 1);
        break;
      }
      default:
        walk(node.left, bound, depth + 1);
        walk(node.right, bound, depth + 1);
    }
  }
  walk(ast, new Set(), 0);
  return { errors, freeVariables: [...free].sort() };
}
