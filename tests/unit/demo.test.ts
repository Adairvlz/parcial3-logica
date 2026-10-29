import { describe, it, expect } from "vitest";
import {
  demoTrace,
  interpretation,
  pathToNode,
} from "../../src/features/demo/scenario";
import { insertAtSelection } from "../../src/features/editor/FormulaEditor";

describe("Mathematical integrity of the authored demo", () => {
  it("covers every universal assignment exactly once", () => {
    const children = demoTrace.nodes.filter((n) => n.parentId === "root");
    expect(children.map((n) => n.environment.x).sort()).toEqual(
      [...interpretation.domain].sort(),
    );
    expect(new Set(children.map((n) => n.environment.x)).size).toBe(
      interpretation.domain.length,
    );
  });
  it("provides a valid domain witness and true relational atom for every existential", () => {
    for (const node of demoTrace.nodes.filter(
      (n) => n.kind === "existential",
    )) {
      expect(interpretation.domain).toContain(node.witness);
      expect(interpretation.relations.P).toContainEqual([
        node.environment.x,
        node.witness,
      ]);
      const atom = demoTrace.nodes.find((n) => n.parentId === node.id)!;
      expect(atom.environment).toEqual({
        x: node.environment.x,
        y: node.witness,
      });
      expect(atom.state).toBe("true");
    }
  });
  it("has one root and no disconnected or cyclic nodes", () => {
    expect(demoTrace.nodes.filter((n) => !n.parentId)).toHaveLength(1);
    for (const node of demoTrace.nodes) {
      const path = pathToNode(node.id);
      expect(path[0]).toBe("root");
      expect(new Set(path).size).toBe(path.length);
      expect(path.at(-1)).toBe(node.id);
    }
  });
  it("selects only the ancestor route", () => {
    expect(pathToNode("atom-b")).toEqual(["root", "exists-b", "atom-b"]);
    expect(pathToNode("missing")).toEqual([]);
  });
});
describe("Formula editing", () => {
  it("inserts at the cursor without destroying the surrounding formula", () => {
    expect(insertAtSelection("P(x)", "¬", 0, 0)).toEqual({
      value: "¬P(x)",
      cursor: 1,
    });
  });
  it("replaces the exact selection and returns the next cursor position", () => {
    expect(insertAtSelection("P(x) & Q(x)", "∧", 5, 6)).toEqual({
      value: "P(x) ∧ Q(x)",
      cursor: 6,
    });
  });
});
