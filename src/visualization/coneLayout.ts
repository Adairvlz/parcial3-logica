import { organicLayout, type LayoutNode } from "./organicLayout";

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

const LEVEL_HEIGHT = 3.2;
const MIN_RING = 3.4;
/** Arc length kept between neighbouring leaves on the outer ring. */
const LEAF_SPACING = 1.7;

/**
 * A cone tree: the root on the axis, each level on a lower and wider ring.
 * Angles come from the 2D leaf order, so every subtree keeps its own sector.
 */
export function coneLayout(nodes: readonly LayoutNode[]): Record<string, Point3> {
  const flat = organicLayout(nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const depthOf = (id: string): number => {
    const parent = byId.get(id)?.parentId;
    return parent ? depthOf(parent) + 1 : 0;
  };
  const depths = new Map(nodes.map((n) => [n.id, depthOf(n.id)]));
  const maxDepth = Math.max(1, ...depths.values());
  const xs = nodes.map((n) => flat[n.id].x);
  const min = Math.min(...xs);
  const leaves = nodes.filter((n) => !nodes.some((c) => c.parentId === n.id));
  // One leaf width of slack keeps the first and last subtree from touching.
  const span = Math.max(...xs) - min + 235;
  const ring = Math.max(
    MIN_RING,
    (leaves.length * LEAF_SPACING) / (2 * Math.PI * maxDepth),
  );
  const result: Record<string, Point3> = {};
  for (const n of nodes) {
    const depth = depths.get(n.id)!;
    const angle = (2 * Math.PI * (flat[n.id].x - min)) / span;
    result[n.id] = {
      x: depth * ring * Math.cos(angle),
      y: -depth * LEVEL_HEIGHT,
      z: depth * ring * Math.sin(angle),
    };
  }
  return result;
}
