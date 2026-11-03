import { Check, ChevronRight, ScanLine, X } from "lucide-react";
import type { Evidence } from "../../core/types";
import type { ReasoningFrame } from "../../reasoning/playback";
import {
  isCompleteCheck,
  pathToNode,
  prettyFormula,
  type VisibleNode,
  type VisibleTree,
} from "../../reasoning/tree";
import { Badge } from "../../ui/Badge";

function ruleEquation(e: Evidence) {
  const v = e.variable;
  switch (e.kind) {
    case "forall":
      return `⟦∀${v} φ⟧ = V ⇔ para toda d ∈ D, ⟦φ⟧[${v}↦d] = V`;
    case "exists":
      return `⟦∃${v} φ⟧ = V ⇔ para alguna d ∈ D, ⟦φ⟧[${v}↦d] = V`;
    case "predicate":
      return "⟦P(t₁,…,tₙ)⟧ = V ⇔ (a₁,…,aₙ) ∈ Pᴵ";
    case "equals":
      return "⟦t = s⟧ = V ⇔ t y s valen el mismo elemento de D";
    case "not":
      return "⟦¬φ⟧ = V ⇔ ⟦φ⟧ = F";
    case "and":
      return "⟦φ ∧ ψ⟧ = V ⇔ ⟦φ⟧ = V y ⟦ψ⟧ = V";
    case "or":
      return "⟦φ ∨ ψ⟧ = V ⇔ ⟦φ⟧ = V o ⟦ψ⟧ = V";
    case "implies":
      return "⟦φ → ψ⟧ = F ⇔ ⟦φ⟧ = V y ⟦ψ⟧ = F";
    case "iff":
      return "⟦φ ↔ ψ⟧ = V ⇔ ⟦φ⟧ = ⟦ψ⟧";
  }
}

function Finding({ node }: { node: VisibleNode }) {
  const e = node.evidence;
  const found = e.witness ?? e.counterexample;
  if (found)
    return (
      <div className={`decisive ${e.witness ? "" : "refutes"}`}>
        <span className="eyebrow">
          {e.witness ? "TESTIGO ENCONTRADO" : "CONTRAEJEMPLO ENCONTRADO"}
        </span>
        <strong>
          {found.variable} = {found.value}
        </strong>
      </div>
    );
  if (isCompleteCheck(e))
    return (
      <div className="decisive">
        <span className="eyebrow">
          COMPROBACIÓN COMPLETA · {e.checked} CASOS
        </span>
        <strong>
          {e.children
            .map(
              (child) =>
                `${child.environment[e.variable!]} ${child.value ? "V" : "F"}`,
            )
            .join(" · ")}
        </strong>
      </div>
    );
  if (node.role)
    return (
      <div className={`decisive ${node.role === "witness" ? "" : "refutes"}`}>
        <span className="eyebrow">
          {node.role === "witness" ? "ES EL TESTIGO" : "ES EL CONTRAEJEMPLO"}
        </span>
        <strong>{node.edgeLabel}</strong>
      </div>
    );
  return null;
}

export function Inspector({
  tree,
  selectedId,
  frame,
  domain,
  onSelect,
  onToggle,
  onClose,
}: {
  tree: VisibleTree;
  selectedId: string;
  frame: ReasoningFrame;
  domain: readonly string[];
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const node = tree.byId.get(selectedId) ?? tree.root;
  const e = node.evidence;
  const state = frame.nodes[node.id];
  const visible = state.appearance > 0;
  const resolved = visible && (state.state === "true" || state.state === "false");
  return (
    <aside
      className="inspector floating-inspector glass"
      aria-label="Inspector del nodo"
    >
      <div className="panel-heading">
        <span>
          <ScanLine size={14} /> INSPECTOR
        </span>
        <button aria-label="Cerrar inspector" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <div className="inspector-body">
        <div className="eyebrow">{e.rule}</div>
        <div className="inspector-formula">{node.label}</div>
        <Badge tone={!resolved ? "purple" : e.value ? "mint" : "coral"}>
          {resolved && e.value ? (
            <Check size={12} />
          ) : resolved ? (
            <X size={12} />
          ) : (
            <span className="tiny-ring" />
          )}
          {!visible
            ? "Aún no aparece"
            : resolved
              ? e.value
                ? "Verdadero"
                : "Falso"
              : state.state === "running"
                ? "En proceso"
                : "Pendiente"}
        </Badge>
        <div className="inspector-divider" />
        <div className="eyebrow">ENTORNO</div>
        <div className="environment">
          {Object.entries(e.environment).length ? (
            Object.entries(e.environment).map(([key, value]) => (
              <span key={key}>
                {key}
                <i>↦</i>
                <b>{value}</b>
              </span>
            ))
          ) : (
            <span>
              ∅ <i>Sin asignaciones</i>
            </span>
          )}
        </div>
        {e.terms?.some((term) => term.expression !== term.value) && (
          <div className="domain-line">
            Términos
            <code>
              {e.terms
                .map((term) => `${prettyFormula(term.expression)} ↦ ${term.value}`)
                .join(" · ")}
            </code>
          </div>
        )}
        <div className="domain-line">
          Dominio <code>{`{ ${domain.join(", ")} }`}</code>
        </div>
        <div className="inspector-divider" />
        <div className="eyebrow">REGLA SEMÁNTICA</div>
        <p className="rule-equation">{ruleEquation(e)}</p>
        <p className="explanation">
          {resolved
            ? e.explanation
            : "El razonamiento todavía no ha establecido el resultado de este nodo. Avanza para observar su justificación."}
        </p>
        {resolved && e.skipped && <p className="explanation">{e.skipped}</p>}
        {resolved && <Finding node={node} />}
        {e.children.length > 0 && (
          <button className="branch-toggle" onClick={() => onToggle(node.id)}>
            {node.hiddenChildren > 0
              ? `Ver ${node.hiddenChildren} ${node.hiddenChildren === 1 ? "rama más" : "ramas más"}`
              : "Colapsar esta rama"}
          </button>
        )}
        {node.truncated && (
          <p className="explanation">
            Esta rama no cabe: hay demasiados nodos abiertos. Colapsa otra rama
            para abrirla.
          </p>
        )}
        <div className="breadcrumb-nodes">
          {pathToNode(tree, node.id).map((id, i) => (
            <span key={id}>
              {i > 0 && <ChevronRight size={12} />}
              <button onClick={() => onSelect(id)}>
                {tree.byId.get(id)!.symbol}
              </button>
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
