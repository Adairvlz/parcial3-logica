import { describe, expect, it } from "vitest";
import { arrivalsBetween, soundCues } from "../../src/audio/soundscape";
import {
  compileTimeline,
  frameAt,
  pulseJourneys,
} from "../../src/reasoning/playback";
import { buildVisibleTree } from "../../src/reasoning/tree";
import { evaluateRequest } from "../../src/core/evaluator";

const result = evaluateRequest({
  formula: "∀x P(x)",
  language: { functions: [], predicates: [{ name: "P", arity: 1 }] },
  interpretation: {
    domain: ["a", "b"],
    functions: {},
    relations: { P: [["a"], ["b"]] },
  },
});
if (result.status !== "evaluated") throw new Error("Invalid fixture");
const timeline = compileTimeline(buildVisibleTree(result.evidence));

describe("sound follows the light", () => {
  it("starts contact resonance on the same arrival as each sound", () => {
    for (const journey of pulseJourneys(timeline)) {
      expect(
        frameAt(timeline, journey.arrival).nodes[journey.target].contact,
      ).toBe(0);
      expect(
        frameAt(timeline, journey.arrival + 30).nodes[journey.target].contact,
      ).toBeGreaterThan(0);
      expect(
        soundCues(timeline).some((cue) => cue.arrival === journey.arrival),
      ).toBe(true);
    }
  });
  it("sends the closing wave from root to leaves after the conclusion begins", () => {
    const start = timeline.starts.at(-1)!;
    expect(frameAt(timeline, start - 1).closing).toBeNull();
    const first = frameAt(timeline, start);
    expect(first.nodes.r.finale).toBe(0);
    expect(first.nodes["r.0"].finale).toBeNull();
    expect(first.edges["r.0"].finale).toBe(0);
    const end = frameAt(timeline, timeline.duration);
    expect(end.closing).toBeNull();
    expect(Object.values(end.nodes).every((node) => node.finale === null)).toBe(
      true,
    );
    const reduced = frameAt(timeline, start + 100, true);
    expect(reduced.closing).toBeNull();
    expect(
      Object.values(reduced.nodes).every(
        (node) => node.contact === null && node.finale === null,
      ),
    ).toBe(true);
  });
  it("ends each journey exactly when the visual pulse reaches its sphere", () => {
    const cues = soundCues(timeline);
    expect(cues).toHaveLength(4);
    timeline.nodes
      .filter((n) => n.parentId)
      .forEach((node, i) => {
        for (const cue of cues.slice(i * 2, i * 2 + 2)) {
          const middle = frameAt(timeline, (cue.start + cue.arrival) / 2);
          expect(middle.edges[node.id].pulse).toBeCloseTo(0.5);
          expect(
            frameAt(timeline, cue.arrival).edges[node.id].pulse,
          ).toBeNull();
          expect(cue.frequency).toBeGreaterThan(0);
        }
      });
  });
  it("crosses an arrival once, never on repeated or backward frames", () => {
    const cues = soundCues(timeline);
    const at = cues[0].arrival;
    expect(arrivalsBetween(cues, at - 1, at)).toHaveLength(1);
    expect(arrivalsBetween(cues, at, at)).toHaveLength(0);
    expect(arrivalsBetween(cues, at + 1, at - 1)).toHaveLength(0);
    expect(arrivalsBetween(cues, at, at + 1)).toHaveLength(0);
  });
});
