import { demoTrace } from "../features/demo/scenario";
import type { ReasoningState } from "./types";

/** Authored presentation events for the fixed proof. Not a general evaluator. */
export const demoSteps = [
  {
    title: "Una fórmula, un universo",
    detail: "∀x: debemos verificar cada elemento de D = {a,b,c}.",
    duration: 2200,
    focus: ["root"],
  },
  {
    title: "Tres elementos. Tres ramas.",
    detail:
      "El universal abre exactamente un caso por elemento: x=a, x=b y x=c.",
    duration: 3000,
    focus: ["root", "exists-a", "exists-b", "exists-c"],
  },
  {
    title: "Para a, existe b",
    detail: "(a,b) ∈ P. El testigo y=b demuestra ∃y P(a,y).",
    duration: 3200,
    focus: ["exists-a", "atom-a"],
  },
  {
    title: "Para b, existe c",
    detail: "(b,c) ∈ P. El testigo y=c demuestra ∃y P(b,y).",
    duration: 3200,
    focus: ["exists-b", "atom-b"],
  },
  {
    title: "Para c, existe a",
    detail: "(c,a) ∈ P. El testigo y=a demuestra ∃y P(c,y).",
    duration: 3200,
    focus: ["exists-c", "atom-c"],
  },
  {
    title: "Las ramas convergen",
    detail:
      "Los tres casos verificados envían su resultado al cuantificador universal.",
    duration: 2600,
    focus: ["root", "exists-a", "exists-b", "exists-c"],
  },
  {
    title: "Verdadero, para todo x",
    detail:
      "Todos los elementos tienen un testigo. La fórmula universal es verdadera.",
    duration: 2200,
    focus: ["root"],
  },
  {
    title: "El razonamiento completo",
    detail:
      "Tres testigos. Una conclusión. Explora cada dependencia de la demostración.",
    duration: 2000,
    focus: demoTrace.nodes.map((n) => n.id),
  },
] as const;
export const stepStarts = demoSteps.map((_, index) =>
  demoSteps.slice(0, index).reduce((total, step) => total + step.duration, 0),
);
export const DEMO_DURATION = demoSteps.reduce(
  (total, step) => total + step.duration,
  0,
);
export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));
export const ease = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
export function getStep(time: number) {
  return stepStarts.reduce(
    (index, start, next) =>
      start <= clamp(time, 0, DEMO_DURATION) ? next : index,
    0,
  );
}
export interface NodeFrame {
  appearance: number;
  state: ReasoningState;
  energy: number;
}
export interface EdgeFrame {
  growth: number;
  pulse: number | null;
  reverse: boolean;
}
export interface DemoFrame {
  time: number;
  step: number;
  nodes: Record<string, NodeFrame>;
  edges: Record<string, EdgeFrame>;
  result: boolean;
  complete: boolean;
}
export function frameAt(input: number, reduced = false): DemoFrame {
  const time = clamp(input, 0, DEMO_DURATION);
  const step = getStep(time);
  const nodes: Record<string, NodeFrame> = {};
  const edges: Record<string, EdgeFrame> = {};
  const progress = (start: number, duration: number) =>
    reduced ? (time >= start ? 1 : 0) : ease((time - start) / duration);
  const travel = (start: number, duration: number) =>
    !reduced && time >= start && time < start + duration
      ? (time - start) / duration
      : null;
  const rootDone = stepStarts[6] + 700;
  nodes.root = {
    appearance: progress(0, 900),
    state: time >= rootDone ? "true" : "running",
    energy: travel(time >= stepStarts[6] ? stepStarts[6] : 0, 1500) ?? 0,
  };
  ["a", "b", "c"].forEach((x, i) => {
    const branchStart = stepStarts[1] + i * 320;
    const witnessStart = stepStarts[i + 2];
    const atomDone = witnessStart + 1550;
    const existsDone = witnessStart + 2600;
    const returnStart = stepStarts[5] + i * 250;
    nodes[`exists-${x}`] = {
      appearance: progress(branchStart + 600, 800),
      state:
        time >= existsDone
          ? "true"
          : time >= witnessStart
            ? "running"
            : "pending",
      energy: travel(witnessStart, 1400) ?? travel(existsDone, 600) ?? 0,
    };
    nodes[`atom-${x}`] = {
      appearance: progress(witnessStart + 700, 650),
      state: time >= atomDone ? "true" : "running",
      energy: travel(atomDone, 800) ?? 0,
    };
    edges[`exists-${x}`] = {
      growth: progress(branchStart, 1100),
      pulse: travel(returnStart, 1500) ?? travel(branchStart, 1100),
      reverse: time >= stepStarts[5],
    };
    edges[`atom-${x}`] = {
      growth: progress(witnessStart, 1200),
      pulse: travel(atomDone + 100, 850) ?? travel(witnessStart, 1200),
      reverse: time >= atomDone,
    };
  });
  return {
    time,
    step,
    nodes,
    edges,
    result: time >= rootDone,
    complete: time === DEMO_DURATION,
  };
}
