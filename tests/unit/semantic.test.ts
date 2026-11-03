import { describe, expect, it } from "vitest";
import { evaluateRequest, EVALUATION_BUDGET } from "../../src/core/evaluator";
import { parseFormula, tokenize } from "../../src/core/parser";
import { analyzeAST, validateModel } from "../../src/core/validation";
import {
  demoTrace,
  interpretation,
  language,
} from "../../src/features/demo/scenario";
import {
  initialModel,
  readModelDraft,
} from "../../src/features/evaluation/modelEditor";
import type {
  EvaluationOutcome,
  Interpretation,
  LogicalLanguage,
} from "../../src/core/types";

const evaluate = (
  formula: string,
  assignment: unknown = {},
  model: Interpretation = interpretation,
  lang: LogicalLanguage = language,
) =>
  evaluateRequest({
    formula,
    assignment,
    interpretation: model,
    language: lang,
  });
function truth(result: EvaluationOutcome) {
  expect(result.status).toBe("evaluated");
  if (result.status !== "evaluated") throw new Error(JSON.stringify(result));
  return result;
}

describe("Syntax, scope and free variables", () => {
  it("tokenizes Unicode identifiers and reports exact invalid character positions", () => {
    const result = tokenize("∀α. P(α)");
    expect(result.valid).toBe(true);
    const invalid = tokenize("P(x) # P(x)");
    expect(invalid.valid).toBe(false);
    if (!invalid.valid)
      expect(invalid.errors[0].range).toEqual({ start: 5, end: 6 });
  });
  it.each([
    "",
    "P(",
    "P(x,)",
    "P(x))",
    "∀ P(x)",
    "P(x) P(x)",
    "P(x) →",
    "x =",
    "x = y = z",
    "- P(x,y)",
    "forall P(x,y)",
  ])("rejects malformed input %s without a truth value", (formula) => {
    const result = evaluate(formula);
    expect(result.status).toBe("invalid");
    expect(result).not.toHaveProperty("value");
  });
  it("respects precedence and right associativity", () => {
    const parsed = parseFormula("P(x) ∨ P(y) ∧ P(z) → P(x) → ¬P(y)", language);
    expect(parsed.valid).toBe(true);
    if (!parsed.valid) return;
    expect(parsed.ast.kind).toBe("implies");
    if (parsed.ast.kind === "implies") {
      expect(parsed.ast.left.kind).toBe("or");
      expect(parsed.ast.right.kind).toBe("implies");
    }
  });
  it("binds quantifiers like negation and respects parentheses and shadowing", () => {
    for (const [formula, expected] of [
      ["∀x P(x,y) → P(x,z)", ["x", "y", "z"]],
      ["(∀x P(x,y)) → P(x,z)", ["x", "y", "z"]],
      ["∀x (P(x,y) → P(x,z))", ["y", "z"]],
      ["¬∀x P(x,y) ∧ P(x,y)", ["x", "y"]],
      ["∀x. P(x,y) ∧ P(x,z)", ["x", "y", "z"]],
      ["∀x ∃x P(x,y)", ["y"]],
    ] as const) {
      const parsed = parseFormula(formula, language);
      if (!parsed.valid) throw new Error("Parse failed");
      expect(analyzeAST(parsed.ast, language).freeVariables).toEqual(expected);
    }
  });
  it("retains complete source text in nested negation explanations", () => {
    const result = truth(evaluate("¬(∃x P(x,x))"));
    expect(result.evidence.formula).toBe("¬(∃x P(x,x))");
    expect(result.value).toBe(true);
  });
  it("requests exactly the missing free variables and rejects invalid assignments", () => {
    expect(evaluate("P(x,y)", { x: "a" })).toEqual({
      status: "needs-assignment",
      variables: ["x", "y"],
      missing: ["y"],
    });
    expect(evaluate("P(x,y)", { x: "a", y: "outside" }).status).toBe("invalid");
    expect(evaluate("∀x ∃y P(x,y)", { x: "a" }).status).toBe("invalid");
    expect(truth(evaluate("P(x,y)", { x: "a", y: "b" })).value).toBe(true);
    expect(truth(evaluate("P(x,y)", { x: "a", y: "a" })).value).toBe(false);
  });
  it("validates both sides even when the first side determines truth", () => {
    expect(evaluate("(∃x ∃y P(x,y)) ∨ Unknown(x)").status).toBe("invalid");
    expect(evaluate("(∃x ∃y P(x,y)) ∨ P(x)").status).toBe("invalid");
  });
  it("rejects excessively nested and long input without throwing", () => {
    expect(evaluate("¬".repeat(500) + "P(x,y)").status).toBe("invalid");
    expect(evaluate("P".repeat(9000)).status).toBe("invalid");
    expect(evaluate(Array(200).fill("P(x,y)").join(" ∧ ")).status).toBe(
      "invalid",
    );
  });
});

describe("Mathematical evaluation and evidence", () => {
  it("reproduces the original demo with complete universal coverage and real witnesses", () => {
    const result = truth(evaluate(demoTrace.formula));
    expect(result.value).toBe(true);
    expect(result.evidence.checked).toBe(3);
    expect(result.evidence.children.map((e) => e.witness?.value)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(result.source).toBe("engine");
  });
  it("distinguishes a false formula from a nonempty relation", () => {
    const result = truth(evaluate("∀x ∀y P(x,y)"));
    expect(result.value).toBe(false);
    expect(result.evidence.counterexample).toEqual({
      variable: "x",
      value: "a",
    });
    expect(result.evidence.children[0].counterexample).toEqual({
      variable: "y",
      value: "a",
    });
  });
  it("keeps all checks needed to refute an existential", () => {
    const result = truth(evaluate("∃x P(x,x)"));
    expect(result.value).toBe(false);
    expect(result.evidence.checked).toBe(3);
    expect(result.evidence.children).toHaveLength(3);
  });
  it("does not leak shadowed assignments to sibling subformulas", () => {
    const result = truth(evaluate("(∃x P(x,y)) ∧ P(x,y)", { x: "a", y: "b" }));
    expect(result.value).toBe(true);
    expect(result.evidence.children[1].environment).toEqual({ x: "a", y: "b" });
  });
  it("matches independent truth tables for every binary connective and negation", () => {
    const lang: LogicalLanguage = {
      functions: [
        { name: "a", arity: 0 },
        { name: "b", arity: 0 },
      ],
      predicates: [{ name: "P", arity: 1 }],
    };
    for (const left of [false, true])
      for (const right of [false, true]) {
        const model: Interpretation = {
          domain: ["0", "1", "2"],
          functions: {
            a: [{ inputs: [], output: "0" }],
            b: [{ inputs: [], output: "1" }],
          },
          relations: {
            P: [["2"], ...(left ? [["0"]] : []), ...(right ? [["1"]] : [])],
          },
        };
        for (const [symbol, expected] of [
          ["∧", left && right],
          ["∨", left || right],
          ["→", !left || right],
          ["↔", left === right],
        ] as const) {
          expect(
            truth(evaluate(`P(a) ${symbol} P(b)`, {}, model, lang)).value,
          ).toBe(expected);
        }
        expect(truth(evaluate("¬P(a)", {}, model, lang)).value).toBe(!left);
        const iff = truth(evaluate("P(a) ↔ P(b)", {}, model, lang));
        expect(iff.evidence.children).toHaveLength(2);
      }
  });
  it("matches an independent oracle for every nonempty binary relation on two elements", () => {
    const domain = ["a", "b"];
    const tuples = [
      ["a", "a"],
      ["a", "b"],
      ["b", "a"],
      ["b", "b"],
    ];
    for (let mask = 1; mask < 16; mask++) {
      const relation = tuples.filter((_, i) => (mask & (1 << i)) !== 0);
      const model: Interpretation = {
        domain,
        relations: { P: relation },
        functions: {},
      };
      const contains = (x: string, y: string) =>
        relation.some(([a, b]) => a === x && b === y);
      const cases: [string, boolean][] = [
        [
          "∀x ∃y P(x,y)",
          domain.every((x) => domain.some((y) => contains(x, y))),
        ],
        [
          "∃x ∀y P(x,y)",
          domain.some((x) => domain.every((y) => contains(x, y))),
        ],
        ["¬∃x P(x,x)", !domain.some((x) => contains(x, x))],
        [
          "∀x ∀y (P(x,y) → P(y,x))",
          domain.every((x) =>
            domain.every((y) => !contains(x, y) || contains(y, x)),
          ),
        ],
      ];
      for (const [formula, expected] of cases)
        expect(truth(evaluate(formula, {}, model)).value).toBe(expected);
    }
  });
  it("evaluates composed functions, constants and zero-arity predicates", () => {
    const lang: LogicalLanguage = {
      functions: [
        { name: "c", arity: 0 },
        { name: "f", arity: 1 },
        { name: "g", arity: 2 },
      ],
      predicates: [
        { name: "P", arity: 1 },
        { name: "Ready", arity: 0 },
      ],
    };
    const model: Interpretation = {
      domain: ["a", "b"],
      functions: {
        c: [{ inputs: [], output: "a" }],
        f: [
          { inputs: ["a"], output: "b" },
          { inputs: ["b"], output: "a" },
        ],
        g: [
          { inputs: ["a", "a"], output: "a" },
          { inputs: ["a", "b"], output: "b" },
          { inputs: ["b", "a"], output: "b" },
          { inputs: ["b", "b"], output: "a" },
        ],
      },
      relations: { P: [["a"]], Ready: [[]] },
    };
    expect(truth(evaluate("P(f(f(c))) ∧ Ready()", {}, model, lang)).value).toBe(
      true,
    );
    expect(truth(evaluate("P(g(c(), f(c)))", {}, model, lang)).value).toBe(
      false,
    );
    expect(truth(evaluate("¬Ready", {}, model, lang)).value).toBe(false);
    expect(evaluate("∀c P(c)", {}, model, lang).status).toBe("invalid");
    expect(evaluate("P(f)", {}, model, lang).status).toBe("invalid");
    expect(evaluate("P(h(c))", {}, model, lang).status).toBe("invalid");
  });
  it("uses safe maps for user identifiers that are object prototype names", () => {
    const lang: LogicalLanguage = {
      functions: [],
      predicates: [{ name: "constructor", arity: 1 }],
    };
    const model: Interpretation = {
      domain: ["a"],
      functions: {},
      relations: Object.fromEntries([["constructor", [["a"]]]]),
    };
    expect(
      truth(evaluate("∀__proto__ constructor(__proto__)", {}, model, lang))
        .value,
    ).toBe(true);
  });
  it("returns a computation limit, never a partial truth", () => {
    const domain = Array.from({ length: 23 }, (_, i) => String(i));
    const model: Interpretation = {
      domain,
      functions: {},
      relations: { P: domain.map((x) => [x]) },
    };
    const lang: LogicalLanguage = {
      functions: [],
      predicates: [{ name: "P", arity: 1 }],
    };
    const result = evaluate("∀x ∀y ∀z ∀w P(w)", {}, model, lang);
    expect(result.status).toBe("limit");
    expect(result).not.toHaveProperty("value");
    if (result.status === "limit")
      expect(result.operations).toBe(EVALUATION_BUDGET + 1);
  });
  it("decides three nested quantifiers over 20 elements in the worst case", () => {
    const domain = Array.from({ length: 20 }, (_, i) => `e${i}`);
    const model: Interpretation = {
      domain,
      functions: {},
      relations: { R: domain.flatMap((x) => domain.map((y) => [x, y])) },
    };
    const lang: LogicalLanguage = {
      functions: [],
      predicates: [{ name: "R", arity: 2 }],
    };
    expect(
      truth(evaluate("∀x∀y∀z((R(x,y)∧R(y,z))→R(x,z))", {}, model, lang)).value,
    ).toBe(true);
  });
  it("marks the children that decide the value of their parent", () => {
    const flags = (formula: string, assignment = {}) =>
      truth(evaluate(formula, assignment)).evidence.children.map((c) =>
        Boolean(c.decisive),
      );
    const yes = "P(a0,b0)";
    const no = "P(a0,a0)";
    const env = { a0: "a", b0: "b" };
    expect(flags(`¬${no}`, { a0: "a" })).toEqual([true]);
    expect(flags(`${yes} ∧ ${yes}`, env)).toEqual([true, true]);
    expect(flags(`${yes} ∧ ${no}`, env)).toEqual([false, true]);
    expect(flags(`${no} ∧ ${yes}`, env)).toEqual([true]);
    expect(flags(`${no} ∨ ${yes}`, env)).toEqual([false, true]);
    expect(flags(`${no} ∨ ${no}`, { a0: "a" })).toEqual([true, true]);
    expect(flags(`${yes} → ${yes}`, env)).toEqual([false, true]);
    expect(flags(`${yes} → ${no}`, env)).toEqual([true, true]);
    expect(flags(`${yes} ↔ ${no}`, env)).toEqual([true, true]);
    // Only the counterexample decides; a complete check has no single reason.
    expect(flags("∀x ∀y P(x,y)")).toEqual([true]);
    expect(flags("∃x P(x,x)")).toEqual([false, false, false]);
    expect(flags("∃x P(x,x) ∨ ∃x ∃y P(x,y)")).toEqual([false, true]);
  });
});

describe("Equality and keyboard spellings", () => {
  const lang: LogicalLanguage = {
    functions: [
      { name: "c", arity: 0 },
      { name: "f", arity: 1 },
    ],
    predicates: [{ name: "P", arity: 1 }],
  };
  const model: Interpretation = {
    domain: ["a", "b"],
    functions: {
      c: [{ inputs: [], output: "a" }],
      f: [
        { inputs: ["a"], output: "b" },
        { inputs: ["b"], output: "a" },
      ],
    },
    relations: { P: [["a"]] },
  };
  const value = (formula: string, assignment = {}) =>
    truth(evaluate(formula, assignment, model, lang)).value;

  it("compares term values, not their spelling", () => {
    expect(value("c = c")).toBe(true);
    expect(value("f(f(c)) = c")).toBe(true);
    expect(value("f(c) = c")).toBe(false);
    expect(value("¬f(c) = c")).toBe(true);
    expect(value("x = y", { x: "a", y: "a" })).toBe(true);
    expect(value("x = y", { x: "a", y: "b" })).toBe(false);
    expect(value("∀x x = x")).toBe(true);
    expect(value("∀x ∃y y = f(x)")).toBe(true);
    expect(value("∀x ∀y x = y")).toBe(false);
  });
  it("reports the terms of an equality as evidence", () => {
    const { evidence } = truth(evaluate("f(c) = c", {}, model, lang));
    expect(evidence.rule).toBe("Igualdad");
    expect(evidence.terms).toEqual([
      { expression: "f(c)", value: "b" },
      { expression: "c", value: "a" },
    ]);
  });
  it("validates the symbols, arities and free variables of both sides", () => {
    const status = (formula: string) =>
      evaluate(formula, {}, model, lang).status;
    expect(status("g(c) = c")).toBe("invalid");
    expect(status("f(c, c) = c")).toBe("invalid");
    expect(status("c = P")).toBe("invalid");
    expect(status("P(c) = c")).toBe("invalid");
    expect(evaluate("x = c", {}, model, lang)).toEqual({
      status: "needs-assignment",
      variables: ["x"],
      missing: ["x"],
    });
  });
  it.each([
    ["~P(c)", "¬P(c)"],
    ["P(c) & P(f(c))", "P(c) ∧ P(f(c))"],
    ["P(c) | P(f(c))", "P(c) ∨ P(f(c))"],
    ["P(f(c)) -> P(c)", "P(f(c)) → P(c)"],
    ["P(c) <-> P(f(c))", "P(c) ↔ P(f(c))"],
    ["forall x (P(x) | ~P(x))", "∀x (P(x) ∨ ¬P(x))"],
    ["exists x ~P(x)", "∃x ¬P(x)"],
  ])("reads %s exactly like %s", (typed, symbolic) => {
    expect(value(typed)).toBe(value(symbolic));
  });
  it("keeps source ranges for keyboard spellings and reserves the words", () => {
    const lexed = tokenize("P(x) -> Q");
    if (!lexed.valid) throw new Error("Tokenize failed");
    expect(lexed.tokens[4]).toMatchObject({
      kind: "→",
      text: "->",
      range: { start: 5, end: 7 },
    });
    expect(
      validateModel(
        { functions: [], predicates: [{ name: "forall", arity: 0 }] },
        { domain: ["a"], functions: {}, relations: { forall: [[]] } },
      ).valid,
    ).toBe(false);
  });
});

/** Examples solved in class; expected values come from the course notes. */
describe("Course examples", () => {
  const unary: LogicalLanguage = {
    functions: [],
    predicates: [
      { name: "P", arity: 1 },
      { name: "Q", arity: 1 },
    ],
  };
  const pq = (domain: string[], p: string[], q: string[]): Interpretation => ({
    domain,
    functions: {},
    relations: { P: p.map((x) => [x]), Q: q.map((x) => [x]) },
  });

  it("Entornos p.13: ∀xP(x)→∀xQ(x) does not imply ∀x(P(x)→Q(x))", () => {
    const model = pq(["a", "b", "c"], ["b", "c"], ["a", "b"]);
    expect(truth(evaluate("∀x P(x) → ∀x Q(x)", {}, model, unary)).value).toBe(
      true,
    );
    const conclusion = truth(evaluate("∀x (P(x) → Q(x))", {}, model, unary));
    expect(conclusion.value).toBe(false);
    expect(conclusion.evidence.counterexample?.value).toBe("c");
  });
  it("Entornos p.18: ∀x(P(x)∨Q(x)) does not imply ∀xP(x)∨∀xQ(x)", () => {
    const model = pq(["1", "2", "3", "4"], ["2", "4"], ["1", "3"]);
    const value = (formula: string) =>
      truth(evaluate(formula, {}, model, unary)).value;
    expect(value("∀x (P(x) ∨ Q(x))")).toBe(true);
    expect(value("∀x P(x)")).toBe(false);
    expect(value("∀x Q(x)")).toBe(false);
    expect(value("∀x (P(x) ∨ Q(x)) → (∀x P(x) ∨ ∀x Q(x))")).toBe(false);
  });
  it("Entornos p.17: the valid formula holds in the class interpretation", () => {
    const model = pq(["1", "2", "3"], ["2", "3"], ["1", "3"]);
    const value = (formula: string) =>
      truth(evaluate(formula, {}, model, unary)).value;
    expect(value("∀x (P(x) → ∃y Q(y))")).toBe(true);
    expect(value("∀x ∃y (P(x) → Q(y))")).toBe(true);
    expect(value("∀x (P(x) → ∃y Q(y)) → ∀x ∃y (P(x) → Q(y))")).toBe(true);
  });
  it("Entornos p.6: function table and environment", () => {
    const lang: LogicalLanguage = {
      functions: [{ name: "f", arity: 2 }],
      predicates: [{ name: "P", arity: 2 }],
    };
    const model: Interpretation = {
      domain: ["a", "b", "c"],
      functions: {
        f: [
          { inputs: ["a", "a"], output: "c" },
          { inputs: ["a", "b"], output: "b" },
          { inputs: ["a", "c"], output: "a" },
          { inputs: ["b", "a"], output: "c" },
          { inputs: ["b", "b"], output: "a" },
          { inputs: ["b", "c"], output: "a" },
          { inputs: ["c", "a"], output: "a" },
          { inputs: ["c", "b"], output: "a" },
          { inputs: ["c", "c"], output: "b" },
        ],
      },
      relations: {
        P: [
          ["a", "b"],
          ["b", "a"],
          ["c", "c"],
          ["b", "b"],
        ],
      },
    };
    expect(
      truth(evaluate("P(x, f(x,y))", { x: "a", y: "b" }, model, lang)).value,
    ).toBe(true);
    const universal = truth(evaluate("∀x P(x,y)", { y: "b" }, model, lang));
    expect(universal.value).toBe(false);
    expect(universal.evidence.counterexample?.value).toBe("c");
  });
  it("Entornos p.9: the same formula changes with the environment", () => {
    const lang: LogicalLanguage = {
      functions: [],
      predicates: [{ name: "P", arity: 2 }],
    };
    const model: Interpretation = {
      domain: ["0", "1", "2"],
      functions: {},
      relations: {
        P: [
          ["0", "1"],
          ["0", "2"],
          ["1", "2"],
        ],
      },
    };
    const run = (formula: string, env = {}) =>
      truth(evaluate(formula, env, model, lang)).value;
    expect(run("P(x,y)", { x: "0", y: "2" })).toBe(true);
    expect(run("P(x,y)", { x: "2", y: "1" })).toBe(false);
    expect(run("∃x ∀y P(x,y)")).toBe(false);
  });
  it("Interpretaciones p.8: constant, negation, equality and ∀∃", () => {
    const lang: LogicalLanguage = {
      functions: [{ name: "i", arity: 0 }],
      predicates: [
        { name: "R", arity: 1 },
        { name: "Q", arity: 2 },
      ],
    };
    const model: Interpretation = {
      domain: ["a", "b", "c"],
      functions: { i: [{ inputs: [], output: "a" }] },
      relations: {
        R: [["b"], ["c"]],
        Q: [
          ["a", "a"],
          ["a", "b"],
          ["a", "c"],
          ["b", "c"],
          ["c", "c"],
        ],
      },
    };
    const value = (formula: string) =>
      truth(evaluate(formula, {}, model, lang)).value;
    expect(value("∃y Q(i,y)")).toBe(true);
    expect(value("¬R(i)")).toBe(true);
    expect(value("∀x ∀y ∀z ((Q(x,y) ∧ Q(x,z)) → y = z)")).toBe(false);
    expect(value("∀x ∃y Q(x,y)")).toBe(true);
  });
  it("Interpretaciones p.5: predicates over {1,2,3}", () => {
    const lang: LogicalLanguage = {
      functions: [],
      predicates: [
        { name: "P", arity: 1 },
        { name: "R", arity: 2 },
      ],
    };
    const model: Interpretation = {
      domain: ["1", "2", "3"],
      functions: {},
      relations: {
        P: [["1"], ["2"]],
        R: [
          ["1", "3"],
          ["2", "1"],
          ["3", "2"],
        ],
      },
    };
    const value = (formula: string) =>
      truth(evaluate(formula, {}, model, lang)).value;
    expect(value("∀x P(x)")).toBe(false);
    expect(value("∀x ∃y R(x,y)")).toBe(true);
    expect(value("∀x ∀y (P(x) → R(x,y))")).toBe(false);
  });
  it("Variables y sustituciones: free variables of the class formulas", () => {
    const lang: LogicalLanguage = {
      functions: [],
      predicates: [
        { name: "P", arity: 1 },
        { name: "Q", arity: 1 },
        { name: "S", arity: 2 },
        { name: "T", arity: 2 },
      ],
    };
    for (const [formula, expected] of [
      ["∀x (P(x) → ∃x Q(x))", []],
      ["(∀x (P(x) ∧ Q(x))) → (¬P(x) ∨ Q(y))", ["x", "y"]],
      ["∃x (S(y,z) ∧ ∀y (¬T(y,x) ∨ S(y,z)))", ["y", "z"]],
    ] as const) {
      const parsed = parseFormula(formula, lang);
      if (!parsed.valid) throw new Error(`Parse failed: ${formula}`);
      expect(analyzeAST(parsed.ast, lang).freeVariables).toEqual(expected);
    }
  });
});

describe("Interpretation validation", () => {
  it.each([
    ["empty domain", { domain: [] }],
    ["duplicate domain", { domain: ["a", "a"] }],
    ["empty relation", { relations: { P: [] } }],
    ["missing relation", { relations: {} }],
    ["bad tuple length", { relations: { P: [["a"]] } }],
    ["outside domain", { relations: { P: [["a", "z"]] } }],
    [
      "duplicate tuple",
      {
        relations: {
          P: [
            ["a", "b"],
            ["a", "b"],
          ],
        },
      },
    ],
    ["unknown table", { relations: { P: [["a", "b"]], Q: [["a"]] } }],
    ["malformed table", { relations: { P: "a,b" } }],
  ])("rejects %s", (_, patch) => {
    const result = validateModel(language, { ...interpretation, ...patch });
    expect(result.valid).toBe(false);
  });
  it.each([-1, 0.5, Infinity, NaN, 9])(
    "rejects unsupported arity %s",
    (arity) => {
      expect(
        validateModel(
          { functions: [], predicates: [{ name: "P", arity }] },
          interpretation,
        ).valid,
      ).toBe(false);
    },
  );
  it("rejects duplicated names, invalid shapes and absent total interpretations", () => {
    expect(validateModel(null, interpretation).valid).toBe(false);
    expect(
      validateModel({ functions: [], predicates: null }, interpretation).valid,
    ).toBe(false);
    expect(
      validateModel(
        {
          functions: [{ name: "P", arity: 0 }],
          predicates: [{ name: "P", arity: 2 }],
        },
        interpretation,
      ).valid,
    ).toBe(false);
    const lang: LogicalLanguage = {
      functions: [{ name: "f", arity: 1 }],
      predicates: [],
    };
    for (const rows of [
      [],
      [{ inputs: ["a"], output: "a" }],
      [
        { inputs: ["a"], output: "a" },
        { inputs: ["a"], output: "b" },
      ],
      [
        { inputs: ["a"], output: "a" },
        { inputs: ["b"], output: "z" },
      ],
    ]) {
      expect(
        validateModel(lang, {
          domain: ["a", "b"],
          functions: { f: rows },
          relations: {},
        }).valid,
      ).toBe(false);
    }
    expect(
      validateModel(lang, {
        domain: ["a", "b"],
        functions: {
          f: [
            { inputs: ["a"], output: "b" },
            { inputs: ["b"], output: "a" },
          ],
        },
        relations: {},
      }).valid,
    ).toBe(true);
  });
  it("accepts exactly the nonempty zero-arity relation {()} and a total constant", () => {
    const lang = {
      functions: [{ name: "c", arity: 0 }],
      predicates: [{ name: "P", arity: 0 }],
    };
    expect(
      validateModel(lang, {
        domain: ["a"],
        functions: { c: [{ inputs: [], output: "a" }] },
        relations: { P: [[]] },
      }).valid,
    ).toBe(true);
    expect(
      validateModel(lang, {
        domain: ["a"],
        functions: { c: [{ inputs: [], output: "a" }] },
        relations: { P: [] },
      }).valid,
    ).toBe(false);
  });
  it("reads UI tables without hiding duplicates or dropping empty domain elements", () => {
    const draft = readModelDraft(initialModel);
    expect(draft.valid).toBe(true);
    if (draft.valid)
      expect(validateModel(draft.language, draft.interpretation).valid).toBe(
        true,
      );
    const bad = readModelDraft({ ...initialModel, domain: "a,,b" });
    if (bad.valid)
      expect(validateModel(bad.language, bad.interpretation).valid).toBe(false);
    expect(
      readModelDraft({
        ...initialModel,
        symbols: [
          {
            id: 1,
            name: "f",
            arity: "1",
            category: "function",
            table: "a -> b",
          },
        ],
      }).valid,
    ).toBe(false);
  });
});
