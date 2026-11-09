import { describe, expect, it } from "vitest";
import { evaluateRequest } from "../../src/core/evaluator";
import { SEARCH_LIMITS, searchInterpretation } from "../../src/core/modelSearch";
import type { LogicalLanguage } from "../../src/core/types";
import { CLASS_EXAMPLES } from "../../src/features/evaluation/examples";
import {
  draftFromInterpretation,
  languageOfDraft,
  readModelDraft,
} from "../../src/features/evaluation/modelEditor";

const unary: LogicalLanguage = {
  functions: [],
  predicates: [
    { name: "P", arity: 1 },
    { name: "Q", arity: 1 },
  ],
};
const binary: LogicalLanguage = {
  functions: [{ name: "f", arity: 1 }],
  predicates: [{ name: "P", arity: 2 }],
};
const search = (formula: string, language: LogicalLanguage, target = false) =>
  searchInterpretation({ formula, language, target });

describe("Search for small interpretations", () => {
  it.each([
    ["∀x P(x) → ∀x Q(x)", unary],
    ["∀x (P(x) ∨ Q(x)) → (∀x P(x) ∨ ∀x Q(x))", unary],
    ["∀x ∃y P(x,y) → ∃y ∀x P(x,y)", binary],
    ["∀x ∀y ∀z ((P(x,y) ∧ P(y,z)) → P(x,z))", binary],
    ["∀x P(x, f(x)) → ∃x P(x,x)", binary],
  ] as const)("finds a real counterexample for %s", (formula, language) => {
    const outcome = search(formula, language);
    expect(outcome.status).toBe("found");
    if (outcome.status !== "found") return;
    // The engine confirms the candidate independently of the search.
    const check = evaluateRequest({
      formula,
      language,
      interpretation: outcome.interpretation,
      assignment: outcome.assignment,
    });
    expect(check.status === "evaluated" && check.value).toBe(false);
  });
  it("finds no counterexample for the valid formula of class", () => {
    const outcome = search("∀x (P(x) → ∃y Q(y)) → ∀x ∃y (P(x) → Q(y))", unary);
    expect(outcome.status).toBe("none");
    if (outcome.status === "none") {
      expect(outcome.domain).toBe(SEARCH_LIMITS.domain);
      // Domains of 1, 2 and 3 elements: 1 + 9 + 49 pairs of non-empty relations.
      expect(outcome.checked).toBe(1 + 9 + 49);
    }
  });
  it("prefers the smallest domain", () => {
    const outcome = search("∃x ∃y ¬(x = y)", unary, true);
    expect(outcome.status === "found" && outcome.interpretation.domain).toEqual([
      "a",
      "b",
    ]);
  });
  it("finds a model, or reports none, for satisfiability", () => {
    expect(search("∀x ∀y (P(x,y) → P(y,x))", binary, true).status).toBe("found");
    // Serial, irreflexive and transitive: only infinite domains satisfy it.
    expect(
      search(
        "(∀x ∃y P(x,y)) ∧ ¬∃x P(x,x) ∧ ∀x ∀y ∀z ((P(x,y) ∧ P(y,z)) → P(x,z))",
        binary,
        true,
      ).status,
    ).toBe("none");
  });
  it("searches the environment of an open formula too", () => {
    const outcome = search("P(x) ∧ ¬Q(x)", unary, true);
    expect(outcome.status).toBe("found");
    if (outcome.status === "found") expect(outcome.assignment).toHaveProperty("x");
  });
  it("stops at the budget instead of freezing", () => {
    const heavy: LogicalLanguage = {
      functions: [{ name: "g", arity: 2 }],
      predicates: [{ name: "R", arity: 2 }],
    };
    // A tautology never ends early; with 3 elements there are 511 · 3⁹ candidates.
    const outcome = search("∀x R(x, g(x,x)) ∨ ¬∀x R(x, g(x,x))", heavy, false);
    expect(outcome.status).toBe("incomplete");
    if (outcome.status === "incomplete")
      expect(outcome.checked).toBe(SEARCH_LIMITS.candidates);
  });
  it("reports invalid languages and formulas without searching", () => {
    expect(search("P(x", unary).status).toBe("invalid");
    expect(search("R(x)", unary).status).toBe("invalid");
    expect(
      search("P(x)", { functions: [], predicates: [{ name: "P", arity: NaN }] })
        .status,
    ).toBe("invalid");
  });
});

describe("Class examples", () => {
  it.each(CLASS_EXAMPLES.map((e) => [e.source, e] as const))(
    "%s gives the value of the course notes",
    (_, example) => {
      const model = readModelDraft(example.model);
      if (!model.valid) throw new Error(JSON.stringify(model.errors));
      const outcome = evaluateRequest({
        formula: example.formula,
        language: model.language,
        interpretation: model.interpretation,
        assignment: example.assignment ?? {},
      });
      expect(outcome.status).toBe("evaluated");
      expect(outcome.status === "evaluated" && outcome.value).toBe(
        example.expected,
      );
    },
  );
  it("the valid example has no counterexample in the search", () => {
    const valid = CLASS_EXAMPLES.find((e) => e.id === "entornos-17")!;
    expect(
      search(valid.formula, languageOfDraft(valid.model)).status,
    ).toBe("none");
  });
});

describe("Loading a found interpretation into the editor", () => {
  it("keeps every symbol card and writes the tables the evaluator reads back", () => {
    const draft = CLASS_EXAMPLES.find((e) => e.id === "entornos-6")!.model;
    const outcome = search("¬P(x, f(x,y))", languageOfDraft(draft), true);
    if (outcome.status !== "found") throw new Error(outcome.status);
    const loaded = draftFromInterpretation(draft, outcome.interpretation);
    expect(loaded.symbols.map((s) => [s.id, s.name])).toEqual(
      draft.symbols.map((s) => [s.id, s.name]),
    );
    const model = readModelDraft(loaded);
    if (!model.valid) throw new Error("format");
    expect(model.interpretation).toEqual(outcome.interpretation);
  });
});
