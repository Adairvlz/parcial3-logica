import { describe, it, expect } from "vitest";
import { insertAtSelection } from "../../src/features/editor/FormulaEditor";

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
