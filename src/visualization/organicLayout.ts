import type { ReasoningNode } from "../reasoning/types";
export interface Point {
  x: number;
  y: number;
}
export interface LayoutNode {
  id: string;
  parentId?: string;
}
export type TreeLayout = (
  nodes: readonly LayoutNode[],
) => Record<string, Point>;

// Deliberate asymmetry and depth; hierarchy is preserved, never inferred from geometry.
const composition: Record<string, Point> = {
  root: { x: 510, y: 80 },
  "exists-a": { x: 225, y: 235 },
  "atom-a": { x: 90, y: 445 },
  "exists-b": { x: 550, y: 320 },
  "atom-b": { x: 635, y: 540 },
  "exists-c": { x: 865, y: 200 },
  "atom-c": { x: 1060, y: 410 },
};
export const portraitLayout: Record<string, Point> = {
  root: { x: 200, y: 30 },
  "exists-a": { x: 25, y: 220 },
  "atom-a": { x: -35, y: 440 },
  "exists-b": { x: 225, y: 335 },
  "atom-b": { x: 220, y: 575 },
  "exists-c": { x: 430, y: 230 },
  "atom-c": { x: 475, y: 455 },
};
/** Reserved leaf spans keep subtrees separated in the synthetic scalability fixture. */
export const expandedLayout: TreeLayout = (nodes) => {
  const result: Record<string, Point> = {};
  const children = new Map<string, LayoutNode[]>();
  nodes.forEach((n) => {
    if (n.parentId)
      children.set(n.parentId, [...(children.get(n.parentId) ?? []), n]);
  });
  let leaf = 0;
  const visit = (node: LayoutNode, depth: number): number => {
    const descendants = children.get(node.id) ?? [];
    const positions = descendants.map((child) => visit(child, depth + 1));
    const x = positions.length
      ? (positions[0] + positions.at(-1)!) / 2
      : leaf++ * 235;
    result[node.id] = {
      x,
      y: depth * 290 + (depth ? Math.sin(x * 0.003) * 34 : 0),
    };
    return x;
  };
  nodes.filter((n) => !n.parentId).forEach((root) => visit(root, 0));
  return result;
};
export const organicLayout: TreeLayout = (nodes) =>
  nodes.length === 7 && nodes.every((n) => composition[n.id])
    ? composition
    : expandedLayout(nodes);

export function organicCurve(source: Point, target: Point, bend = 1) {
  const dx = target.x - source.x,
    dy = target.y - source.y;
  // Near-vertical dependencies bow around the floating formula below each core.
  const side = Math.sign(bend) || 1;
  const c1 = {
    x: source.x + (Math.abs(dx) < 170 ? side * 160 : dx * 0.18 + bend * 36),
    y: source.y + dy * 0.7,
  };
  const c2 = {
    x: target.x + (Math.abs(dx) < 170 ? side * 120 : -dx * 0.24 - bend * 32),
    y: target.y - dy * 0.65,
  };
  const point = (t: number): Point => ({
    x:
      (1 - t) ** 3 * source.x +
      3 * (1 - t) ** 2 * t * c1.x +
      3 * (1 - t) * t * t * c2.x +
      t ** 3 * target.x,
    y:
      (1 - t) ** 3 * source.y +
      3 * (1 - t) ** 2 * t * c1.y +
      3 * (1 - t) * t * t * c2.y +
      t ** 3 * target.y,
  });
  return {
    path: `M ${source.x} ${source.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${target.x} ${target.y}`,
    point,
  };
}

/** 40-node visual stress case, with no mathematical truth claims. */
export function syntheticTree(): ReasoningNode[] {
  const nodes: ReasoningNode[] = [];
  const visit = (id: string, depth: number, parentId?: string) => {
    nodes.push({
      id,
      parentId,
      formula: id,
      kind:
        depth === 0 ? "universal" : depth === 3 ? "predicate" : "existential",
      environment: {},
      state: "pending",
      rule: "Prueba visual sintética",
      explanation:
        "Nodo de carga gráfica. No representa una evaluación matemática.",
    });
    if (depth < 3)
      for (let i = 0; i < 3; i++) visit(`${id}.${i + 1}`, depth + 1, id);
  };
  visit("S", 0);
  return nodes;
}
