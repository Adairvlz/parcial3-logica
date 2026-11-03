/** Mathematical contracts, independent from React and presentation time. */
export type Domain = readonly string[];
export interface FunctionSymbol {
  name: string;
  arity: number;
}
export interface PredicateSymbol {
  name: string;
  arity: number;
}
export interface LogicalLanguage {
  functions: readonly FunctionSymbol[];
  predicates: readonly PredicateSymbol[];
}
export type VariableAssignment = Readonly<Record<string, string>>;
export interface Interpretation {
  domain: Domain;
  relations: Readonly<Record<string, readonly (readonly string[])[]>>;
  functions: Readonly<
    Record<string, readonly { inputs: readonly string[]; output: string }[]>
  >;
}
export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: readonly { message: string; position?: number }[] };

export interface SourceRange {
  start: number;
  end: number;
}
export interface Diagnostic {
  code: string;
  message: string;
  path?: string;
  range?: SourceRange;
}
export type TermAST =
  | { kind: "variable"; name: string; range: SourceRange }
  | { kind: "function"; name: string; args: TermAST[]; range: SourceRange };
export type FormulaAST =
  | { kind: "predicate"; name: string; args: TermAST[]; range: SourceRange }
  | { kind: "equals"; left: TermAST; right: TermAST; range: SourceRange }
  | { kind: "not"; operand: FormulaAST; range: SourceRange }
  | {
      kind: "and" | "or" | "implies" | "iff";
      left: FormulaAST;
      right: FormulaAST;
      range: SourceRange;
    }
  | { kind: "forall"; variable: string; body: FormulaAST; range: SourceRange }
  | { kind: "exists"; variable: string; body: FormulaAST; range: SourceRange };
export interface Evidence {
  kind: FormulaAST["kind"];
  range: SourceRange;
  value: boolean;
  formula: string;
  rule: string;
  environment: Record<string, string>;
  explanation: string;
  children: Evidence[];
  /** Bound variable of a quantifier; each child fixes it to one element. */
  variable?: string;
  /** The parent's value depends on this child; set by the evaluator. */
  decisive?: boolean;
  witness?: { variable: string; value: string };
  counterexample?: { variable: string; value: string };
  checked?: number;
  skipped?: string;
  terms?: { expression: string; value: string }[];
}
export type EvaluationOutcome =
  | { status: "invalid"; errors: Diagnostic[] }
  | { status: "needs-assignment"; variables: string[]; missing: string[] }
  | { status: "limit"; message: string; operations: number }
  | {
      status: "evaluated";
      source: "engine";
      value: boolean;
      freeVariables: string[];
      evidence: Evidence;
      operations: number;
    };
