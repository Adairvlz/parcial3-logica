import { describe, expect, it } from "vitest";
import {
  DEMO_DURATION,
  demoSteps,
  frameAt,
  getStep,
  stepStarts,
} from "../../src/reasoning/demoPlayback";
import { demoTrace } from "../../src/features/demo/scenario";
import {
  organicCurve,
  organicLayout,
  syntheticTree,
} from "../../src/visualization/organicLayout";

describe("Declarative proof presentation", () => {
  it("starts without any truth claim and reveals only the root first", () => {
    const frame = frameAt(1000);
    expect(frame.nodes.root.appearance).toBe(1);
    expect(frame.nodes.root.state).toBe("running");
    expect(frame.nodes["exists-a"].appearance).toBe(0);
    expect(frame.result).toBe(false);
  });
  it("grows all three universal branches before any witness is proved", () => {
    const frame = frameAt(stepStarts[2] - 1);
    for (const x of ["a", "b", "c"]) {
      expect(frame.edges[`exists-${x}`].growth).toBe(1);
      expect(frame.nodes[`exists-${x}`].state).toBe("pending");
      expect(frame.nodes[`atom-${x}`].appearance).toBe(0);
    }
  });
  it("resolves an existential only after its atomic witness and return pulse", () => {
    for (let i = 0; i < 3; i++) {
      const x = ["a", "b", "c"][i];
      const before = frameAt(stepStarts[i + 2] + 1400);
      expect(before.nodes[`atom-${x}`].state).toBe("running");
      expect(before.nodes[`exists-${x}`].state).toBe("running");
      const during = frameAt(stepStarts[i + 2] + 2000);
      expect(during.nodes[`atom-${x}`].state).toBe("true");
      expect(during.nodes[`exists-${x}`].state).toBe("running");
      expect(during.edges[`atom-${x}`].reverse).toBe(true);
      const after = frameAt(stepStarts[i + 2] + 2700);
      expect(after.nodes[`exists-${x}`].state).toBe("true");
    }
  });
  it("returns the three established results before concluding the universal", () => {
    const propagation = frameAt(stepStarts[5] + 900);
    for (const x of ["a", "b", "c"]) {
      expect(propagation.nodes[`exists-${x}`].state).toBe("true");
      expect(propagation.edges[`exists-${x}`].reverse).toBe(true);
      expect(propagation.edges[`exists-${x}`].pulse).not.toBeNull();
    }
    expect(propagation.result).toBe(false);
    expect(frameAt(stepStarts[6] + 800).result).toBe(true);
  });
  it("reconstructs deterministically after backward and out-of-order seeks", () => {
    const expected = frameAt(8000);
    for (const t of [DEMO_DURATION, 0, 17000, 2300, 8000]) frameAt(t);
    expect(frameAt(8000)).toEqual(expected);
    expect(frameAt(-100)).toEqual(frameAt(0));
    expect(frameAt(DEMO_DURATION + 100)).toEqual(frameAt(DEMO_DURATION));
    expect(getStep(DEMO_DURATION)).toBe(demoSteps.length - 1);
  });
  it("reduced motion preserves semantic states but eliminates traveling pulses", () => {
    for (let time = 0; time < DEMO_DURATION; time += 137) {
      const normal = frameAt(time),
        reduced = frameAt(time, true);
      expect(reduced.result).toBe(normal.result);
      for (const id of Object.keys(normal.nodes))
        expect(reduced.nodes[id].state).toBe(normal.nodes[id].state);
      for (const edge of Object.values(reduced.edges))
        expect(edge.pulse).toBeNull();
    }
  });
  it("has exactly the six dependencies from the mathematical fixture", () => {
    expect(Object.keys(frameAt(DEMO_DURATION).edges).sort()).toEqual(
      demoTrace.nodes
        .filter((n) => n.parentId)
        .map((n) => n.id)
        .sort(),
    );
    expect(
      Object.values(frameAt(DEMO_DURATION).nodes).every(
        (n) => n.state === "true" && n.appearance === 1,
      ),
    ).toBe(true);
  });
});
describe("Organic geometry", () => {
  it("keeps nodes and labels apart in both 7- and 40-node layouts", () => {
    for (const nodes of [demoTrace.nodes, syntheticTree()]) {
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
  it("labels the synthetic fixture without assigning mathematical truth", () => {
    const nodes = syntheticTree();
    expect(nodes).toHaveLength(40);
    expect(nodes.filter((n) => n.parentId)).toHaveLength(39);
    expect(nodes.every((n) => n.state === "pending" && !n.witness)).toBe(true);
  });
});
