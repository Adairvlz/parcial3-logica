import type { Interpretation, LogicalLanguage } from "../../core/types";
import type { EvaluationTrace, ReasoningNode } from "../../reasoning/types";
export const DEMO_FORMULA = "∀x ∃y P(x,y)";
export const language: LogicalLanguage = {
  functions: [],
  predicates: [{ name: "P", arity: 2 }],
};
export const interpretation: Interpretation = {
  domain: ["a", "b", "c"],
  relations: {
    P: [
      ["a", "b"],
      ["b", "c"],
      ["c", "a"],
    ],
  },
  functions: {},
};
// Authored fixture, NOT a semantic evaluator. Each existential uses one sufficient witness.
const branches = [
  { x: "a", y: "b" },
  { x: "b", y: "c" },
  { x: "c", y: "a" },
];
export const demoTrace: EvaluationTrace = {
  source: "demo",
  formula: DEMO_FORMULA,
  mode: "evaluation",
  nodes: [
    {
      id: "root",
      formula: DEMO_FORMULA,
      kind: "universal",
      environment: {},
      state: "true",
      rule: "Cuantificador universal",
      explanation:
        "Para cada elemento x del dominio existe al menos un y que satisface P(x,y). Se verifican los tres casos: x = a, x = b y x = c.",
    },
    ...branches.flatMap(({ x, y }): ReasoningNode[] => [
      {
        id: `exists-${x}`,
        parentId: "root",
        formula: `∃y P(${x},y)`,
        kind: "existential",
        environment: { x },
        state: "true",
        witness: y,
        rule: "Cuantificador existencial",
        explanation: `Para x = ${x}, el elemento y = ${y} es un testigo: (${x},${y}) pertenece a la relación P. Un testigo basta para demostrar este existencial.`,
      },
      {
        id: `atom-${x}`,
        parentId: `exists-${x}`,
        formula: `P(${x},${y})`,
        kind: "predicate",
        environment: { x, y },
        state: "true",
        witness: y,
        rule: "Pertenencia a la relación",
        explanation: `La tupla (${x},${y}) está incluida en P = {(a,b), (b,c), (c,a)}. Por definición de la interpretación, P(${x},${y}) es verdadera.`,
      },
    ]),
  ],
};
export function pathToNode(
  id: string,
  nodes: readonly ReasoningNode[] = demoTrace.nodes,
): string[] {
  const path: string[] = [];
  let current = nodes.find((n) => n.id === id);
  while (current && !path.includes(current.id)) {
    path.unshift(current.id);
    current = nodes.find((n) => n.id === current?.parentId);
  }
  return path;
}
