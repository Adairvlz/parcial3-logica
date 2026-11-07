import { describe, expect, it } from "vitest";
import { evaluateRequest } from "../../src/core/evaluator";
import { tupleKey, validateModel } from "../../src/core/validation";
import {
  diagnosticLocation,
  domainElements,
  GRID_LIMIT,
  gridTable,
  initialModel,
  readModelDraft,
  tableGrid,
  type SymbolDraft,
} from "../../src/features/evaluation/modelEditor";
import { compileTimeline } from "../../src/reasoning/playback";
import { buildVisibleTree } from "../../src/reasoning/tree";

const relation = (table: string, arity = "2"): SymbolDraft => ({
  id: 1,
  name: "P",
  arity,
  category: "predicate",
  table,
});
const fn = (table: string, arity = "1"): SymbolDraft => ({
  id: 2,
  name: "f",
  arity,
  category: "function",
  table,
});
const D = ["a", "b", "c"];
function grid(symbol: SymbolDraft, domain = D) {
  const g = tableGrid(symbol, domain);
  if (g.kind === "text") throw new Error(g.reason);
  return g;
}

describe("Table editing over Dⁿ", () => {
  it("reads the example relation and writes it back unchanged", () => {
    const symbol = initialModel.symbols[0];
    const g = grid(symbol);
    expect(g.tuples).toHaveLength(9);
    expect([...g.values.keys()]).toEqual(
      [["a", "b"], ["b", "c"], ["c", "a"]].map(tupleKey),
    );
    expect(g.foreign).toEqual([]);
    expect(gridTable("predicate", g.tuples, g.values, g.foreign)).toBe(
      symbol.table,
    );
  });
  it("writes tuples in domain order, whatever order they were marked in", () => {
    const g = grid(relation("(c, a)\n(a, b)"));
    expect(gridTable("predicate", g.tuples, g.values, g.foreign)).toBe(
      "(a, b)\n(c, a)",
    );
  });
  it("keeps rows outside the domain instead of dropping them silently", () => {
    const symbol = relation("(a, b)\n(b, c)\n(c, a)");
    const g = grid(symbol, ["a", "b"]);
    expect([...g.values.keys()]).toEqual([tupleKey(["a", "b"])]);
    expect(g.foreign).toEqual(["(b, c)", "(c, a)"]);
    const table = gridTable("predicate", g.tuples, g.values, g.foreign);
    expect(table).toBe(symbol.table);
    const model = readModelDraft({ domain: "a, b", symbols: [symbol] });
    if (!model.valid) throw new Error("format");
    expect(validateModel(model.language, model.interpretation).valid).toBe(
      false,
    );
  });
  it("sets apart repeated rows and rows of another arity", () => {
    const g = grid(relation("(a, b)\n(a, b)\n(a)"));
    expect(g.values.size).toBe(1);
    expect(g.foreign).toEqual(["(a, b)", "(a)"]);
  });
  it("edits a function as one output per input and leaves missing ones out", () => {
    const g = grid(fn("(a) -> b\n(c) -> z"));
    expect(g.tuples).toEqual([["a"], ["b"], ["c"]]);
    expect(g.values.get(tupleKey(["a"]))).toBe("b");
    // An output outside D cannot be shown in a selector: it stays as a row.
    expect(g.foreign).toEqual(["(c) -> z"]);
    const next = new Map(g.values).set(tupleKey(["b"]), "a");
    expect(gridTable("function", g.tuples, next, [])).toBe(
      "(a) -> b\n(b) -> a",
    );
    const model = readModelDraft({
      domain: "a, b, c",
      symbols: [fn("(a) -> b\n(b) -> a")],
    });
    if (!model.valid) throw new Error("format");
    const result = validateModel(model.language, model.interpretation);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors[0].code).toBe("totality");
  });
  it("handles arity zero: a constant and a propositional letter", () => {
    const constant = grid(fn("() -> b", "0"));
    expect(constant.tuples).toEqual([[]]);
    expect(constant.values.get(tupleKey([]))).toBe("b");
    const letter = grid(relation("()", "0"));
    expect(letter.values.has(tupleKey([]))).toBe(true);
    expect(gridTable("predicate", letter.tuples, new Map(), [])).toBe("");
  });
  it("falls back to text when the table cannot be shown faithfully", () => {
    expect(tableGrid(relation("(a, b"), D).kind).toBe("text");
    expect(tableGrid(fn("(a) b"), D).kind).toBe("text");
    expect(tableGrid(relation("", "x"), D).kind).toBe("text");
    expect(tableGrid(relation(""), []).kind).toBe("text");
    const big = Array.from({ length: 7 }, (_, i) => `e${i}`);
    expect(7 ** 3).toBeGreaterThan(GRID_LIMIT);
    expect(tableGrid(relation("", "3"), big).kind).toBe("text");
    expect(tableGrid(relation("", "3"), D).kind).toBe("relation");
  });
  it("reads the domain without blanks or repeats", () => {
    expect(domainElements(" a, b,, a\nc ")).toEqual(["a", "b", "c"]);
  });
});

describe("Readable diagnostics", () => {
  it.each([
    [undefined, "Fórmula"],
    ["interpretation.relations.P[1]", "Relación P, fila 2"],
    ["interpretation.functions.f", "Función f"],
    ["interpretation.domain[0]", "Dominio"],
    ["interpretation.domain", "Dominio"],
    ["language.predicates[0]", "Predicados declarados, nº 1"],
    ["language.functions", "Funciones declarados"],
    ["assignment.x", "Asignación de x"],
    ["P, fila 3", "P, fila 3"],
  ])("%s → %s", (path, expected) => {
    expect(diagnosticLocation(path)).toBe(
      expected === "Funciones declarados" ? "Funciones declarados" : expected,
    );
  });
});

describe("Decision menu", () => {
  it("names each step by its node and case without its value", () => {
    const outcome = evaluateRequest({
      formula: "∀x ∃y P(x,y)",
      language: { functions: [], predicates: [{ name: "P", arity: 2 }] },
      interpretation: {
        domain: D,
        functions: {},
        relations: {
          P: [
            ["a", "b"],
            ["b", "c"],
            ["c", "a"],
          ],
        },
      },
    });
    if (outcome.status !== "evaluated") throw new Error("not evaluated");
    const timeline = compileTimeline(buildVisibleTree(outcome.evidence));
    const witnesses = timeline.steps.filter((s) => s.finding === "witness");
    expect(witnesses.map((s) => s.subject)).toEqual([
      "∃y P(x,y), x = a",
      "∃y P(x,y), x = b",
      "∃y P(x,y), x = c",
    ]);
    for (const step of timeline.steps)
      expect(step.subject).not.toMatch(/Verdadero|Falso/);
  });
});
