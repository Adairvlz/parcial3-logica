import type { VariableAssignment } from "../core/types";
export type ReasoningState = "pending" | "running" | "true" | "false" | "error";
export interface ReasoningNode {
  id: string;
  parentId?: string;
  formula: string;
  kind: "universal" | "existential" | "predicate";
  environment: VariableAssignment;
  state: ReasoningState;
  witness?: string;
  rule: string;
  explanation: string;
}
export interface EvaluationTrace {
  source: "demo";
  formula: string;
  mode: "evaluation";
  nodes: readonly ReasoningNode[];
}
