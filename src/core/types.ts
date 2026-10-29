/** Mathematical contracts; phase 1 does not parse or evaluate arbitrary input. */
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
