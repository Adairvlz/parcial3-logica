import { describe, expect, it } from "vitest";
import { evaluateRequest } from "../../src/core/evaluator";
import type { LogicalLanguage } from "../../src/core/types";
import {
  compileTimeline,
  frameAt,
  getStep,
} from "../../src/reasoning/playback";
import {
  buildVisibleTree,
  MAX_VISIBLE_NODES,
  pathToNode,
  toggledMode,
  type BranchModes,
} from "../../src/reasoning/tree";
import {
  organicCurve,
  organicLayout,
  type LayoutNode,
} from "../../src/visualization/organicLayout";

const language: LogicalLanguage = {
  functions: [{ name: "c", arity: 0 }],
  predicates: [
    { name: "P", arity: 2 },
    { name: "Q", arity: 1 },
  ],
};
const interpretation = {
  domain: ["a", "b", "c"],
  functions: { c: [{ inputs: [], output: "a" }] },
  relations: {
    P: [
      ["a", "b"],
      ["b", "c"],
      ["c", "a"],
    ],
    Q: [["a"]],
  },
};
function evidenceOf(formula: string, assignment = {}) {
  const outcome = evaluateRequest({
    formula,
    language,
    interpretation,
    assignment,
  });
  if (outcome.status !== "evaluated") throw new Error(JSON.stringify(outcome));
  return outcome.evidence;
}
const treeOf = (formula: string, modes?: BranchModes) =>
  buildVisibleTree(evidenceOf(formula), modes);
const ids = (formula: string, modes?: BranchModes) =>
  treeOf(formula, modes).nodes.map((n) => n.id);

describe("Tree derived from the engine's evidence", () => {
  it("draws everything the engine evaluated, failed attempts included", () => {
    const tree = treeOf("∀x ∃y P(x,y)");
    expect(tree.nodes.map((n) => n.label)).toEqual([
      "∀x ∃y P(x,y)",
      "∃y P(x,y)",
      "P(a,a)",
      "P(a,b)",
      "∃y P(x,y)",
      "P(b,a)",
      "P(b,b)",
      "P(b,c)",
      "∃y P(x,y)",
      "P(c,a)",
    ]);
    expect(tree.nodes.every((n) => n.hiddenChildren === 0)).toBe(true);
    const witnesses = tree.nodes.filter((n) => n.role === "witness");
    expect(witnesses.map((n) => n.edgeLabel)).toEqual([
      "y = b",
      "y = c",
      "y = a",
    ]);
    // ∃y for x = a tried y = a first; that attempt is drawn but is no witness.
    expect(tree.byId.get("r.0.0")!.role).toBeNull();
    expect(tree.byId.get("r.0.1")!.role).toBe("witness");
  });
  it("a false universal stops at its counterexample, as the engine did", () => {
    const tree = treeOf("∀x ∀y P(x,y)");
    expect(tree.nodes.map((n) => n.id)).toEqual(["r", "r.0", "r.0.0"]);
    expect(tree.byId.get("r.0")!.role).toBe("counterexample");
    expect(tree.byId.get("r.0.0")!.role).toBe("counterexample");
    expect(tree.byId.get("r.0.0")!.edgeLabel).toBe("y = a");
    // x = a already refutes it, so the engine checked nothing else.
    expect(tree.root.hiddenChildren).toBe(0);
    // Here x = a holds first, so it is drawn before the counterexample x = b.
    const later = treeOf("∀x Q(x)");
    expect(later.root.childIds).toEqual(["r.0", "r.1"]);
    expect(later.byId.get("r.0")!.role).toBeNull();
    expect(later.byId.get("r.1")!.role).toBe("counterexample");
  });
  it("a false existential keeps its complete check visible", () => {
    const tree = treeOf("∃x P(x,x)");
    expect(tree.root.childIds).toEqual(["r.0", "r.1", "r.2"]);
    expect(tree.nodes.every((n) => n.evidence.value === false)).toBe(true);
    expect(tree.nodes.every((n) => n.role === null)).toBe(true);
  });
  it("a short circuit draws only the operand the engine evaluated", () => {
    const tree = treeOf("∃x P(x,x) ∧ ∀x Q(x)");
    expect(tree.root.evidence.children).toHaveLength(1);
    expect(tree.root.childIds).toEqual(["r.0"]);
    expect(tree.root.hiddenChildren).toBe(0);
  });
  it("draws connectives, negation and equality with the elements they used", () => {
    const tree = treeOf("¬(c = c) ∨ ¬(Q(c))");
    expect(tree.nodes.map((n) => n.symbol)).toEqual(["∨", "¬", "=", "¬", "Q"]);
    expect(tree.nodes.map((n) => n.label).slice(1)).toEqual([
      "¬(c = c)",
      "a = a",
      "¬(Q(c))",
      "Q(a)",
    ]);
  });
  it("drops only the parentheses that wrap a whole label", () => {
    expect(treeOf("(∀x Q(x)) → (∃x Q(x))").root.label).toBe(
      "(∀x Q(x)) → (∃x Q(x))",
    );
    const nested = treeOf("((∀x Q(x)) → (∃x Q(x))) ∧ ((∃x Q(x)))");
    expect(nested.byId.get("r.0")!.label).toBe("(∀x Q(x)) → (∃x Q(x))");
    expect(nested.byId.get("r.1")!.label).toBe("∃x Q(x)");
  });
  it("shows keyboard spellings with the course symbols", () => {
    expect(treeOf("forall x (Q(x) -> ~Q(x))").root.label).toBe(
      "∀x (Q(x) → ¬Q(x))",
    );
  });
  it("folds a branch on request and opens it again", () => {
    const open = treeOf("∀x Q(x)");
    expect(toggledMode(open.root)).toBe("none");
    const folded = treeOf("∀x Q(x)", { r: "none" });
    expect(ids("∀x Q(x)", { r: "none" })).toEqual(["r"]);
    expect(folded.root.hiddenChildren).toBe(2);
    expect(toggledMode(folded.root)).toBe("all");
    expect(treeOf("∀x Q(x)", { r: "all" }).root.childIds).toEqual([
      "r.0",
      "r.1",
    ]);
    const inner = treeOf("∀x ∃y P(x,y)", { "r.0": "none" });
    expect(inner.byId.get("r.0")!.hiddenChildren).toBe(2);
    expect(inner.byId.has("r.0.0")).toBe(false);
    expect(inner.byId.get("r.1")!.childIds).toHaveLength(3);
  });
  it("selects only the ancestor route", () => {
    const tree = treeOf("∀x ∃y P(x,y)");
    expect(pathToNode(tree, "r.1.2")).toEqual(["r", "r.1", "r.1.2"]);
    expect(pathToNode(tree, "missing")).toEqual([]);
  });
  it("closes what does not fit and never draws past the ceiling", () => {
    const domain = Array.from({ length: 20 }, (_, i) => `e${i}`);
    const outcome = evaluateRequest({
      formula: "∀x ∀y R(x,y)",
      language: { functions: [], predicates: [{ name: "R", arity: 2 }] },
      interpretation: {
        domain,
        functions: {},
        relations: { R: domain.flatMap((x) => domain.map((y) => [x, y])) },
      },
    });
    if (outcome.status !== "evaluated") throw new Error("not evaluated");
    const settled = buildVisibleTree(outcome.evidence);
    expect(settled.nodes.length).toBeLessThanOrEqual(MAX_VISIBLE_NODES);
    expect(settled.root.childIds).toHaveLength(20);
    expect(settled.byId.get("r.19")!.hiddenChildren).toBe(20);
    const everything = Object.fromEntries(
      domain.map((_, i) => [`r.${i}`, "all" as const]),
    );
    const crowded = buildVisibleTree(outcome.evidence, everything);
    expect(crowded.nodes.length).toBeLessThanOrEqual(MAX_VISIBLE_NODES);
    expect(crowded.nodes.some((n) => n.truncated)).toBe(true);
  });
});

describe("Playback compiled from the tree", () => {
  const tree = treeOf("∀x ∃y P(x,y)");
  const timeline = compileTimeline(tree);
  const at = (id: string) => timeline.nodes.find((n) => n.id === id)!;

  it("has an enter and a resolve step per node, plus the conclusion", () => {
    expect(timeline.steps).toHaveLength(2 * tree.nodes.length + 1);
    expect(timeline.steps[0].title).toBe("Evaluamos ∀x ∃y P(x,y)");
    expect(timeline.steps.at(-1)!.title).toBe("Conclusión: Verdadero");
    expect(timeline.steps.at(-1)!.detail).toBe(tree.root.evidence.explanation);
  });
  it("starts without any truth claim and reveals only the root first", () => {
    const frame = frameAt(timeline, timeline.unit * 0.9);
    expect(frame.nodes.r.appearance).toBeGreaterThan(0);
    expect(frame.nodes.r.state).toBe("running");
    expect(frame.nodes["r.0"].appearance).toBe(0);
    expect(frame.nodes["r.0"].state).toBe("pending");
    expect(frame.result).toBe(false);
  });
  it("identifies semantic decisions and links every event to its evidence", () => {
    for (const step of timeline.steps)
      expect(tree.byId.has(step.nodeId)).toBe(true);
    expect(
      timeline.steps
        .filter((s) => s.finding === "witness")
        .map((s) => s.nodeId),
    ).toEqual(["r.0", "r.1", "r.2"]);
    expect(
      timeline.steps.find((s) => s.nodeId === "r" && s.kind === "resolve")
        ?.finding,
    ).toBe("complete");
    const falseLine = compileTimeline(treeOf("∀x Q(x)"));
    expect(
      falseLine.steps.find((s) => s.finding === "counterexample")?.nodeId,
    ).toBe("r");
    const skipped = compileTimeline(treeOf("∃x P(x,x) ∧ ∀x Q(x)"));
    expect(
      skipped.steps.find((s) => s.finding === "short-circuit")?.detail,
    ).toContain(skipped.steps.at(-1)!.detail);
  });
  it("announces folded evidence as a summary without fabricating visible events", () => {
    const folded = treeOf("∀x ∃y P(x,y)", { "r.0": "none" });
    const line = compileTimeline(folded);
    const summary = line.steps.find(
      (s) => s.nodeId === "r.0" && s.kind === "resolve",
    )!;
    expect(summary.finding).toBe("summary");
    expect(summary.detail).toContain("2 ramas evaluadas están plegadas");
    expect(line.steps.some((s) => s.nodeId.startsWith("r.0."))).toBe(false);
    expect(frameAt(line, line.duration).nodes.r.state).toBe("true");
  });
  it("resolves every node only after all of its children", () => {
    for (const n of tree.nodes)
      for (const child of n.childIds)
        expect(at(n.id).resolveAt).toBeGreaterThan(at(child).resolveAt);
  });
  it("follows the engine's depth-first order across branches", () => {
    expect(at("r.0.0").resolveAt).toBeLessThan(at("r.0.1").enterAt);
    expect(at("r.0.1").resolveAt).toBeLessThan(at("r.1").enterAt);
    expect(at("r.1.2").resolveAt).toBeLessThan(at("r.2").enterAt);
  });
  it("sends the result back to the parent only after verifying the child", () => {
    const { enterAt, resolveAt } = at("r.0.1");
    const going = frameAt(timeline, enterAt + timeline.unit * 0.4);
    expect(going.edges["r.0.1"].reverse).toBe(false);
    expect(going.edges["r.0.1"].pulse).not.toBeNull();
    expect(going.nodes["r.0.1"].state).toBe("running");
    const back = frameAt(timeline, resolveAt + timeline.unit * 0.4);
    expect(back.edges["r.0.1"].reverse).toBe(true);
    expect(back.nodes["r.0.1"].state).toBe("true");
    expect(back.nodes["r.0"].state).toBe("running");
  });
  it("ends with exactly the values the engine produced, true or false", () => {
    for (const formula of ["∀x ∃y P(x,y)", "∀x ∀y P(x,y)", "∃x P(x,x)"]) {
      const t = treeOf(formula);
      const line = compileTimeline(t);
      const end = frameAt(line, line.duration);
      expect(end.result).toBe(true);
      expect(end.complete).toBe(true);
      for (const n of t.nodes) {
        expect(end.nodes[n.id].state).toBe(n.evidence.value ? "true" : "false");
        expect(end.nodes[n.id].appearance).toBe(1);
      }
    }
  });
  it("reconstructs deterministically after backward and out-of-order seeks", () => {
    const expected = frameAt(timeline, 8000);
    for (const t of [timeline.duration, 0, 17000, 2300, 8000])
      frameAt(timeline, t);
    expect(frameAt(timeline, 8000)).toEqual(expected);
    expect(frameAt(timeline, -100)).toEqual(frameAt(timeline, 0));
    expect(frameAt(timeline, timeline.duration + 100)).toEqual(
      frameAt(timeline, timeline.duration),
    );
    expect(getStep(timeline, timeline.duration)).toBe(
      timeline.steps.length - 1,
    );
  });
  it("reduced motion preserves semantic states but eliminates traveling pulses", () => {
    for (let time = 0; time < timeline.duration; time += 137) {
      const normal = frameAt(timeline, time),
        reduced = frameAt(timeline, time, true);
      expect(reduced.result).toBe(normal.result);
      for (const id of Object.keys(normal.nodes))
        expect(reduced.nodes[id].state).toBe(normal.nodes[id].state);
      for (const edge of Object.values(reduced.edges))
        expect(edge.pulse).toBeNull();
    }
  });
  it("has one edge per non-root node", () => {
    expect(Object.keys(frameAt(timeline, 0).edges).sort()).toEqual(
      tree.nodes
        .filter((n) => n.parentId)
        .map((n) => n.id)
        .sort(),
    );
  });
  it("keeps large trees within a watchable duration", () => {
    const domain = Array.from({ length: 100 }, (_, i) => `e${i}`);
    const outcome = evaluateRequest({
      formula: "∀x Q(x)",
      language,
      interpretation: {
        domain,
        functions: { c: [{ inputs: [], output: "e0" }] },
        relations: { P: [["e0", "e0"]], Q: domain.map((x) => [x]) },
      },
    });
    if (outcome.status !== "evaluated") throw new Error("not evaluated");
    const line = compileTimeline(buildVisibleTree(outcome.evidence));
    expect(line.duration).toBeLessThan(30000);
  });
});

describe("Organic geometry", () => {
  /** Ternary tree of 40 nodes, the shape of three nested quantifiers on 3 elements. */
  function ternary(): LayoutNode[] {
    const nodes: LayoutNode[] = [];
    const visit = (id: string, depth: number, parentId?: string) => {
      nodes.push({ id, parentId });
      if (depth < 3)
        for (let i = 0; i < 3; i++) visit(`${id}.${i}`, depth + 1, id);
    };
    visit("r", 0);
    return nodes;
  }
  it("keeps nodes and labels apart and children below their parent", () => {
    for (const nodes of [ternary(), treeOf("∀x ∃y P(x,y)").nodes]) {
      const layout = organicLayout(nodes);
      for (let i = 0; i < nodes.length; i++)
        for (let j = i + 1; j < nodes.length; j++) {
          const a = layout[nodes[i].id],
            b = layout[nodes[j].id];
          expect(Math.abs(a.x - b.x) >= 190 || Math.abs(a.y - b.y) >= 200).toBe(
            true,
          );
        }
      for (const node of nodes.filter((n) => n.parentId))
        expect(layout[node.id].y).toBeGreaterThan(layout[node.parentId!].y);
    }
  });
  it("anchors Bézier pulses to the exact parent and child coordinates", () => {
    const source = { x: 20, y: 40 },
      target = { x: 390, y: 520 };
    const curve = organicCurve(source, target);
    expect(curve.point(0)).toEqual(source);
    expect(curve.point(1)).toEqual(target);
    expect(curve.path).toContain(" C ");
  });
});
