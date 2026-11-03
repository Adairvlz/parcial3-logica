import type { Evidence, FormulaAST } from "../core/types";

/** Hard ceiling: past this the tree stops being legible and fluid. */
export const MAX_VISIBLE_NODES = 200;

export type NodeRole = "witness" | "counterexample" | null;
export type BranchMode = "all" | "none";
export type BranchModes = Readonly<Record<string, BranchMode>>;
export interface VisibleNode {
  id: string;
  parentId?: string;
  depth: number;
  evidence: Evidence;
  label: string;
  symbol: string;
  edgeLabel: string;
  role: NodeRole;
  childIds: string[];
  /** Children the engine checked that are not drawn right now. */
  hiddenChildren: number;
  /** The user asked to open it but it does not fit in MAX_VISIBLE_NODES. */
  truncated: boolean;
}
export interface VisibleTree {
  nodes: VisibleNode[];
  byId: ReadonlyMap<string, VisibleNode>;
  root: VisibleNode;
}

const KEYBOARD_SPELLINGS: readonly [RegExp, string][] = [
  [/<->/g, "↔"],
  [/->/g, "→"],
  [/~/g, "¬"],
  [/&/g, "∧"],
  [/\|/g, "∨"],
  [/\bforall\s+/g, "∀"],
  [/\bexists\s+/g, "∃"],
];
export const prettyFormula = (source: string) =>
  KEYBOARD_SPELLINGS.reduce(
    (text, [spelling, symbol]) => text.replace(spelling, symbol),
    source,
  );

const SYMBOLS: Record<Exclude<FormulaAST["kind"], "predicate">, string> = {
  forall: "∀",
  exists: "∃",
  equals: "=",
  not: "¬",
  and: "∧",
  or: "∨",
  implies: "→",
  iff: "↔",
};
/** The source of an atom may be wrapped in parentheses: `(P(x))`. */
const predicateName = (e: Evidence) =>
  /[\p{L}_][\p{L}\p{N}_]*/u.exec(e.formula)?.[0] ?? "P";
const symbolOf = (e: Evidence) =>
  e.kind === "predicate" ? [...predicateName(e)][0] : SYMBOLS[e.kind];

function withoutOuterParentheses(text: string): string {
  if (!text.startsWith("(") || !text.endsWith(")")) return text;
  let depth = 0;
  for (let i = 0; i < text.length - 1; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") depth--;
    // The first parenthesis closes early: `(a) → (b)` keeps both.
    if (depth === 0) return text;
  }
  return withoutOuterParentheses(text.slice(1, -1).trim());
}

/** Atoms show the elements they were decided on; the rest keep their source. */
function labelOf(e: Evidence) {
  const values = e.terms?.map((term) => term.value) ?? [];
  if (e.kind === "equals") return `${values[0]} = ${values[1]}`;
  if (e.kind === "predicate")
    return values.length
      ? `${predicateName(e)}(${values.join(",")})`
      : predicateName(e);
  return withoutOuterParentheses(prettyFormula(e.formula));
}

/** A complete check is the whole reason for a true ∀ or a false ∃. */
export const isCompleteCheck = (e: Evidence) =>
  e.checked !== undefined && !e.witness && !e.counterexample;

/**
 * What to draw of the engine's evidence: everything it evaluated, unless a branch
 * was folded. If the ceiling is reached the decisive branch is served first, and
 * the rest stay closed with their value visible.
 */
export function buildVisibleTree(
  root: Evidence,
  modes: BranchModes = {},
): VisibleTree {
  const evidenceOf = new Map<string, Evidence>([["r", root]]);
  const opened = new Map<string, number[]>();
  const truncated = new Set<string>();
  const wanted = (id: string, e: Evidence) =>
    modes[id] === "none" ? [] : e.children.map((_, i) => i);
  let count = 1;
  const required = ["r"];
  const optional: string[] = [];
  const open = (id: string, e: Evidence, children: number[]) => {
    if (count + children.length > MAX_VISIBLE_NODES) {
      truncated.add(id);
      return;
    }
    opened.set(id, children);
    count += children.length;
    for (const i of children) {
      const childId = `${id}.${i}`;
      const child = e.children[i];
      evidenceOf.set(childId, child);
      if (modes[childId] === "all" || (child.decisive && !modes[childId]))
        required.push(childId);
      else if (!modes[childId]) optional.push(childId);
    }
  };
  while (required.length || optional.length) {
    const isRequired = required.length > 0;
    const id = isRequired ? required.shift()! : optional.shift()!;
    const e = evidenceOf.get(id)!;
    const children = wanted(id, e);
    if (!children.length) continue;
    if (isRequired || count + children.length <= MAX_VISIBLE_NODES)
      open(id, e, children);
  }
  const nodes: VisibleNode[] = [];
  const visit = (id: string, parent: VisibleNode | undefined) => {
    const e = evidenceOf.get(id)!;
    const shown = opened.get(id) ?? [];
    const variable = parent?.evidence.variable;
    const node: VisibleNode = {
      id,
      parentId: parent?.id,
      depth: parent ? parent.depth + 1 : 0,
      evidence: e,
      label: labelOf(e),
      symbol: symbolOf(e),
      edgeLabel: variable ? `${variable} = ${e.environment[variable]}` : "",
      role:
        parent && e.decisive
          ? parent.evidence.witness
            ? "witness"
            : parent.evidence.counterexample
              ? "counterexample"
              : null
          : null,
      childIds: shown.map((i) => `${id}.${i}`),
      hiddenChildren: e.children.length - shown.length,
      truncated: truncated.has(id),
    };
    nodes.push(node);
    node.childIds.forEach((childId) => visit(childId, node));
  };
  visit("r", undefined);
  return { nodes, byId: new Map(nodes.map((n) => [n.id, n])), root: nodes[0] };
}

/** Next mode for a branch: open whatever is hidden, otherwise fold it. */
export const toggledMode = (node: VisibleNode): BranchMode =>
  node.hiddenChildren > 0 ? "all" : "none";

export function pathToNode(tree: VisibleTree, id: string) {
  const path: string[] = [];
  for (
    let node = tree.byId.get(id);
    node;
    node = node.parentId ? tree.byId.get(node.parentId) : undefined
  )
    path.unshift(node.id);
  return path;
}
