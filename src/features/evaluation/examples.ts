import type { ModelDraft } from "./modelEditor";

/** Exercises solved in class, with the value the course notes reached. */
export interface ClassExample {
  id: string;
  source: string;
  title: string;
  description: string;
  formula: string;
  model: ModelDraft;
  assignment?: Record<string, string>;
  expected: boolean;
}

const predicate = (id: number, name: string, arity: number, table: string) => ({
  id,
  name,
  arity: String(arity),
  category: "predicate" as const,
  table,
});
const fn = (id: number, name: string, arity: number, table: string) => ({
  id,
  name,
  arity: String(arity),
  category: "function" as const,
  table,
});

export const CLASS_EXAMPLES: readonly ClassExample[] = [
  {
    id: "inicio",
    source: "Ejemplo inicial",
    title: "Cada elemento tiene un sucesor",
    description: "∀ verdadero: cada x tiene un testigo y.",
    formula: "∀x ∃y P(x,y)",
    model: {
      domain: "a, b, c",
      symbols: [predicate(1, "P", 2, "(a, b)\n(b, c)\n(c, a)")],
    },
    expected: true,
  },
  {
    id: "entornos-13",
    source: "Entornos, p. 13",
    title: "No es implicación semántica",
    description:
      "La premisa ∀x P(x) → ∀x Q(x) es verdadera y la conclusión ∀x (P(x) → Q(x)) es falsa (contraejemplo x = c).",
    formula: "(∀x P(x) → ∀x Q(x)) → ∀x (P(x) → Q(x))",
    model: {
      domain: "a, b, c",
      symbols: [
        predicate(1, "P", 1, "(b)\n(c)"),
        predicate(2, "Q", 1, "(a)\n(b)"),
      ],
    },
    expected: false,
  },
  {
    id: "entornos-17",
    source: "Entornos, p. 17",
    title: "Una fórmula válida",
    description:
      "Verdadera en esta interpretación y en todas: el buscador no encuentra contraejemplo.",
    formula: "∀x (P(x) → ∃y Q(y)) → ∀x ∃y (P(x) → Q(y))",
    model: {
      domain: "1, 2, 3",
      symbols: [
        predicate(1, "P", 1, "(2)\n(3)"),
        predicate(2, "Q", 1, "(1)\n(3)"),
      ],
    },
    expected: true,
  },
  {
    id: "entornos-18",
    source: "Entornos, p. 18",
    title: "∀ no distribuye sobre ∨",
    description:
      "∀x (P(x) ∨ Q(x)) es verdadera, pero ni ∀x P(x) ni ∀x Q(x) lo son.",
    formula: "∀x (P(x) ∨ Q(x)) → (∀x P(x) ∨ ∀x Q(x))",
    model: {
      domain: "1, 2, 3, 4",
      symbols: [
        predicate(1, "P", 1, "(2)\n(4)"),
        predicate(2, "Q", 1, "(1)\n(3)"),
      ],
    },
    expected: false,
  },
  {
    id: "entornos-6",
    source: "Entornos, p. 6",
    title: "Fórmula abierta con función",
    description:
      "Con el entorno x ↦ a, y ↦ b: f(a, b) = b y (a, b) ∈ Pᴵ.",
    formula: "P(x, f(x,y))",
    model: {
      domain: "a, b, c",
      symbols: [
        predicate(1, "P", 2, "(a, b)\n(b, a)\n(c, c)\n(b, b)"),
        fn(
          2,
          "f",
          2,
          "(a, a) -> c\n(a, b) -> b\n(a, c) -> a\n(b, a) -> c\n(b, b) -> a\n(b, c) -> a\n(c, a) -> a\n(c, b) -> a\n(c, c) -> b",
        ),
      ],
    },
    assignment: { x: "a", y: "b" },
    expected: true,
  },
  {
    id: "entornos-9",
    source: "Entornos, p. 9",
    title: "No hay un primer elemento para todos",
    description: "Ningún x cumple P(x, y) para todo y: falla con y = x.",
    formula: "∃x ∀y P(x,y)",
    model: {
      domain: "0, 1, 2",
      symbols: [predicate(1, "P", 2, "(0, 1)\n(0, 2)\n(1, 2)")],
    },
    expected: false,
  },
  {
    id: "interpretaciones-5",
    source: "Interpretaciones, p. 5",
    title: "Toda fila de R tiene salida",
    description: "Cada elemento está relacionado con alguno por R.",
    formula: "∀x ∃y R(x,y)",
    model: {
      domain: "1, 2, 3",
      symbols: [
        predicate(1, "P", 1, "(1)\n(2)"),
        predicate(2, "R", 2, "(1, 3)\n(2, 1)\n(3, 2)"),
      ],
    },
    expected: true,
  },
  {
    id: "interpretaciones-8",
    source: "Interpretaciones, p. 8",
    title: "Q no es funcional (igualdad)",
    description: "(a, a) y (a, b) están en Qᴵ, pero a ≠ b.",
    formula: "∀x ∀y ∀z ((Q(x,y) ∧ Q(x,z)) → y = z)",
    model: {
      domain: "a, b, c",
      symbols: [
        fn(1, "i", 0, "() -> a"),
        predicate(2, "R", 1, "(b)\n(c)"),
        predicate(3, "Q", 2, "(a, a)\n(a, b)\n(a, c)\n(b, c)\n(c, c)"),
      ],
    },
    expected: false,
  },
];
