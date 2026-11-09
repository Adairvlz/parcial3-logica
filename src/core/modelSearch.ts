import { evaluateRequest } from "./evaluator";
import { parseFormula } from "./parser";
import { analyzeAST, validateModel } from "./validation";
import type {
  Diagnostic,
  Interpretation,
  LogicalLanguage,
  VariableAssignment,
} from "./types";

/** Element names for the candidate domains, smallest first. */
const ELEMENTS = ["a", "b", "c", "d"];
export const SEARCH_LIMITS = {
  /** Largest domain the search tries. */
  domain: 3,
  /** Candidate (interpretation, environment) pairs checked per search. */
  candidates: 20000,
} as const;

export interface SearchRequest {
  formula: string;
  language: LogicalLanguage;
  /** The value wanted: false looks for a counterexample, true for a model. */
  target: boolean;
}
export type SearchOutcome =
  | { status: "invalid"; errors: Diagnostic[] }
  | {
      status: "found";
      interpretation: Interpretation;
      assignment: VariableAssignment;
      checked: number;
    }
  /** Every candidate up to SEARCH_LIMITS.domain was checked: none works. */
  | { status: "none"; checked: number; domain: number }
  /** The budget ran out before covering every candidate of some domain. */
  | { status: "incomplete"; checked: number; domain: number };

/** All tuples of Dᵏ, in domain order. */
function tuples(domain: readonly string[], arity: number) {
  let result: string[][] = [[]];
  for (let i = 0; i < arity; i++)
    result = result.flatMap((t) => domain.map((d) => [...t, d]));
  return result;
}

/**
 * One coordinate of the search per symbol and free variable. Relations range
 * over the non-empty subsets of Dᵏ, as the app requires; functions over every
 * total table; variables over D.
 */
function axes(
  language: LogicalLanguage,
  freeVariables: readonly string[],
  domain: readonly string[],
) {
  const n = domain.length;
  return [
    ...language.predicates.map((p) => {
      const inputs = tuples(domain, p.arity);
      return {
        size: 2 ** inputs.length - 1,
        // Index i stands for the subset whose bitmask is i + 1.
        apply: (i: number, m: Model) => {
          m.relations[p.name] = inputs.filter((_, bit) => ((i + 1) >> bit) & 1);
        },
      };
    }),
    ...language.functions.map((f) => {
      const inputs = tuples(domain, f.arity);
      return {
        size: n ** inputs.length,
        apply: (i: number, m: Model) => {
          m.functions[f.name] = inputs.map((input, row) => ({
            inputs: input,
            output: domain[Math.floor(i / n ** row) % n],
          }));
        },
      };
    }),
    ...freeVariables.map((name) => ({
      size: n,
      apply: (i: number, m: Model) => {
        m.assignment[name] = domain[i];
      },
    })),
  ];
}
interface Model {
  relations: Record<string, string[][]>;
  functions: Record<string, { inputs: string[]; output: string }[]>;
  assignment: Record<string, string>;
}

/**
 * Brute-force search over small finite interpretations. A miss only says that
 * no candidate up to the domain limit works: validity is undecidable in general.
 */
export function searchInterpretation(request: SearchRequest): SearchOutcome {
  const { language, formula, target } = request;
  // The language is checked on the smallest well-formed candidate.
  const probe = axes(language, [], ["a"]);
  const seed: Model = { relations: {}, functions: {}, assignment: {} };
  probe.forEach((axis) => axis.apply(0, seed));
  const checkedLanguage = validateModel(language, {
    domain: ["a"],
    relations: seed.relations,
    functions: seed.functions,
  });
  if (!checkedLanguage.valid)
    return { status: "invalid", errors: checkedLanguage.errors };
  const parsed = parseFormula(formula, language);
  if (!parsed.valid) return { status: "invalid", errors: parsed.errors };
  const analysis = analyzeAST(parsed.ast, language);
  if (analysis.errors.length)
    return { status: "invalid", errors: analysis.errors };

  let checked = 0;
  for (let n = 1; n <= SEARCH_LIMITS.domain; n++) {
    const domain = ELEMENTS.slice(0, n);
    const dimensions = axes(language, analysis.freeVariables, domain);
    const total = dimensions.reduce((product, axis) => product * axis.size, 1);
    for (let index = 0; index < total; index++) {
      if (checked >= SEARCH_LIMITS.candidates)
        return { status: "incomplete", checked, domain: n };
      checked++;
      const model: Model = { relations: {}, functions: {}, assignment: {} };
      let rest = index;
      for (const axis of dimensions) {
        axis.apply(rest % axis.size, model);
        rest = Math.floor(rest / axis.size);
      }
      const interpretation: Interpretation = {
        domain,
        relations: model.relations,
        functions: model.functions,
      };
      const outcome = evaluateRequest({
        formula,
        language,
        interpretation,
        assignment: model.assignment,
      });
      // A candidate too large to evaluate is skipped, never taken as an answer.
      if (outcome.status === "evaluated" && outcome.value === target)
        return {
          status: "found",
          interpretation,
          assignment: model.assignment,
          checked,
        };
    }
  }
  return { status: "none", checked, domain: SEARCH_LIMITS.domain };
}
