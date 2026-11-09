import { describe, expect, it } from "vitest";
import { evaluateRequest } from "../../src/core/evaluator";
import { buildVisibleTree } from "../../src/reasoning/tree";
import { coneLayout } from "../../src/visualization/coneLayout";
import type { LayoutNode } from "../../src/visualization/organicLayout";

const distance = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function exampleTree() {
  const outcome = evaluateRequest({
    formula: "∀x ∃y P(x,y)",
    language: { functions: [], predicates: [{ name: "P", arity: 2 }] },
    interpretation: {
      domain: ["a", "b", "c"],
      functions: {},
      relations: {
        P: [
          ["a", "b"],
          ["b", "c"],
          ["c", "a"],
        ],
      },
    },
  });
  if (outcome.status !== "evaluated") throw new Error("not evaluated");
  return buildVisibleTree(outcome.evidence).nodes;
}
function wide(leaves: number): LayoutNode[] {
  return [
    { id: "r" },
    ...Array.from({ length: leaves }, (_, i) => ({ id: `r.${i}`, parentId: "r" })),
  ];
}

describe("Cone layout for the 3D view", () => {
  it("puts the root on the axis and every level lower than its parent", () => {
    const nodes = exampleTree();
    const layout = coneLayout(nodes);
    expect(Math.hypot(layout.r.x, layout.r.y, layout.r.z)).toBe(0);
    for (const n of nodes.filter((n) => n.parentId))
      expect(layout[n.id].y).toBeLessThan(layout[n.parentId!].y);
  });
  it.each([
    ["the class example", exampleTree()],
    ["one hundred cases", wide(100)],
  ])("keeps the spheres of %s apart", (_, nodes) => {
    const layout = coneLayout(nodes);
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++)
        expect(
          distance(layout[nodes[i].id], layout[nodes[j].id]),
        ).toBeGreaterThan(1.5);
  });
  it("is a pure function of the tree", () => {
    const nodes = exampleTree();
    expect(coneLayout(nodes)).toEqual(coneLayout(nodes));
  });
});
