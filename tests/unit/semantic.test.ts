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
    const invalid = tokenize("P(x) & P(x)");
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
    "x = x",
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
  it("uses wide quantifier scope, parentheses and lexical shadowing", () => {
    for (const [formula, expected] of [
      ["∀x P(x,y) → P(x,z)", ["y", "z"]],
      ["(∀x P(x,y)) → P(x,z)", ["x", "y", "z"]],
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
    const result = evaluate("∀x ∀y ∀z P(z)", {}, model, lang);
    expect(result.status).toBe("limit");
    expect(result).not.toHaveProperty("value");
    if (result.status === "limit")
      expect(result.operations).toBe(EVALUATION_BUDGET + 1);
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
