import type { VisibleTree } from "./tree";

export type ReasoningState = "pending" | "running" | "true" | "false";

export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));
export const ease = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

const TARGET_DURATION = 26000;
const MIN_UNIT = 90;
const MAX_UNIT = 1300;
/** Past this the camera holds the whole tree instead of chasing each node. */
const FOLLOW_NODE_LIMIT = 15;

export interface TimelineStep {
  kind: "enter" | "resolve" | "conclusion";
  nodeId: string;
  finding?:
    | "witness"
    | "counterexample"
    | "complete"
    | "short-circuit"
    | "summary";
  /** Names the node and its case without revealing the result. */
  subject: string;
  title: string;
  detail: string;
  duration: number;
  focus: readonly string[];
}
interface TimelineNode {
  id: string;
  parentId?: string;
  value: boolean;
  enterAt: number;
  resolveAt: number;
}
export interface Timeline {
  steps: TimelineStep[];
  starts: number[];
  duration: number;
  unit: number;
  nodes: TimelineNode[];
}
const truth = (value: boolean) => (value ? "Verdadero" : "Falso");

/** Replays the engine's depth-first order: a node resolves after its children. */
export function compileTimeline(tree: VisibleTree): Timeline {
  const unit = clamp(
    TARGET_DURATION / (2 * tree.nodes.length + 1),
    MIN_UNIT,
    MAX_UNIT,
  );
  const everything = tree.nodes.map((n) => n.id);
  const near = (...ids: (string | undefined)[]) =>
    tree.nodes.length > FOLLOW_NODE_LIMIT
      ? everything
      : ids.filter((id): id is string => !!id);
  const steps: TimelineStep[] = [];
  const nodes: TimelineNode[] = [];
  let time = 0;
  const visit = (id: string) => {
    const n = tree.byId.get(id)!;
    const entry: TimelineNode = {
      id,
      parentId: n.parentId,
      value: n.evidence.value,
      enterAt: time,
      resolveAt: 0,
    };
    nodes.push(entry);
    const subject = n.edgeLabel ? `${n.label}, ${n.edgeLabel}` : n.label;
    steps.push({
      kind: "enter",
      nodeId: id,
      subject,
      title: `Evaluamos ${n.label}`,
      detail: n.edgeLabel
        ? `Caso ${n.edgeLabel}. ${n.evidence.rule}.`
        : `${n.evidence.rule}.`,
      duration: unit,
      focus: near(n.parentId, id),
    });
    time += unit;
    n.childIds.forEach(visit);
    entry.resolveAt = time;
    steps.push({
      kind: "resolve",
      nodeId: id,
      subject,
      finding: n.hiddenChildren
        ? "summary"
        : n.evidence.witness
          ? "witness"
          : n.evidence.counterexample
            ? "counterexample"
            : n.evidence.skipped
              ? "short-circuit"
              : n.evidence.checked !== undefined
                ? "complete"
                : undefined,
      title: `${n.label}: ${truth(n.evidence.value)}`,
      detail: [
        n.evidence.explanation,
        n.hiddenChildren
          ? `${n.hiddenChildren} ramas evaluadas están plegadas; este paso resume su resultado.`
          : "",
        n.evidence.skipped ?? "",
      ]
        .filter(Boolean)
        .join(" "),
      duration: unit,
      focus: near(id, n.parentId),
    });
    time += unit;
  };
  visit(tree.root.id);
  const closing = Math.max(unit, 1500);
  steps.push({
    kind: "conclusion",
    nodeId: tree.root.id,
    subject: tree.root.label,
    title: `Conclusión: ${truth(tree.root.evidence.value)}`,
    detail: tree.root.evidence.explanation,
    duration: closing,
    focus: everything,
  });
  const starts: number[] = [];
  let start = 0;
  for (const step of steps) {
    starts.push(start);
    start += step.duration;
  }
  return { steps, starts, duration: start, unit, nodes };
}

export function getStep(timeline: Timeline, time: number) {
  const at = clamp(time, 0, timeline.duration);
  let step = 0;
  for (let i = 0; i < timeline.starts.length; i++)
    if (timeline.starts[i] <= at) step = i;
  return step;
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
export interface ReasoningFrame {
  time: number;
  step: number;
  nodes: Record<string, NodeFrame>;
  edges: Record<string, EdgeFrame>;
  result: boolean;
  complete: boolean;
}

/** Pure function of absolute time, so seeking never accumulates mutations. */
export function frameAt(
  timeline: Timeline,
  input: number,
  reduced = false,
): ReasoningFrame {
  const { unit } = timeline;
  const time = clamp(input, 0, timeline.duration);
  const progress = (start: number, duration: number) =>
    reduced ? (time >= start ? 1 : 0) : ease((time - start) / duration);
  const travel = (start: number, duration: number) =>
    !reduced && time >= start && time < start + duration
      ? (time - start) / duration
      : null;
  const nodes: Record<string, NodeFrame> = {};
  const edges: Record<string, EdgeFrame> = {};
  for (const n of timeline.nodes) {
    const resolved = time >= n.resolveAt;
    nodes[n.id] = {
      appearance: progress(n.enterAt + 0.35 * unit, 0.65 * unit),
      state: resolved
        ? n.value
          ? "true"
          : "false"
        : time >= n.enterAt
          ? "running"
          : "pending",
      energy: travel(n.resolveAt, unit) ?? 0,
    };
    if (n.parentId)
      edges[n.id] = {
        growth: progress(n.enterAt, 0.9 * unit),
        pulse: travel(n.resolveAt, unit) ?? travel(n.enterAt, 0.9 * unit),
        reverse: resolved,
      };
  }
  return {
    time,
    step: getStep(timeline, time),
    nodes,
    edges,
    result: time >= timeline.nodes[0].resolveAt,
    complete: time === timeline.duration,
  };
}
