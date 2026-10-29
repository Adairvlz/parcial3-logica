import { Check, ChevronRight, X, ScanLine } from "lucide-react";
import { demoTrace, pathToNode } from "../demo/scenario";
import type { DemoFrame } from "../../reasoning/demoPlayback";
import { Badge } from "../../ui/Badge";
export function Inspector({
  selectedId,
  active,
  onSelect,
  frame,
  onClose,
}: {
  selectedId: string;
  active: boolean;
  onSelect: (id: string) => void;
  frame: DemoFrame;
  onClose: () => void;
}) {
  const node =
    demoTrace.nodes.find((n) => n.id === selectedId) ?? demoTrace.nodes[0];
  const state = frame.nodes[node.id];
  const visible = active && state.appearance > 0;
  const resolved = visible && state.state === "true";
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
        <div className="eyebrow">{node.rule}</div>
        <div className="inspector-formula">{node.formula}</div>
        <Badge tone={resolved ? "mint" : "purple"}>
          {resolved ? <Check size={12} /> : <span className="tiny-ring" />}
          {!active
            ? "Sin evaluar"
            : !visible
              ? "Aún no aparece"
              : resolved
                ? "Verdadero · DEMO"
                : state.state === "running"
                  ? "En proceso · DEMO"
                  : "Pendiente · DEMO"}
        </Badge>
        <div className="inspector-divider" />
        <div className="eyebrow">ENTORNO</div>
        <div className="environment">
          {Object.entries(node.environment).length ? (
            Object.entries(node.environment).map(([key, value]) => (
              <span key={key}>
                {key}
                <i>↦</i>
                <b>{value}</b>
              </span>
            ))
          ) : (
            <span>
              ∅ <i>Sin asignaciones en la raíz</i>
            </span>
          )}
        </div>
        <div className="domain-line">
          Dominio <code>{"{ a, b, c }"}</code>
        </div>
        <div className="inspector-divider" />
        <div className="eyebrow">REGLA SEMÁNTICA</div>
        <p className="rule-equation">
          {node.kind === "universal"
            ? "⟦∀x φ⟧ = V ⇔ ∀d ∈ D, ⟦φ⟧ₓ↦d = V"
            : node.kind === "existential"
              ? "⟦∃y φ⟧ = V ⇔ ∃d ∈ D, ⟦φ⟧ᵧ↦d = V"
              : "⟦P(x,y)⟧ = V ⇔ (x,y) ∈ Pᴵ"}
        </p>
        <p className="explanation">
          {resolved
            ? node.explanation
            : !active
              ? "El texto ha cambiado. No hay una evaluación asociada."
              : "La demostración todavía no ha establecido el resultado de este nodo. Avanza para observar su justificación."}
        </p>
        {resolved && (
          <div className="decisive">
            <span className="eyebrow">
              <Check size={12} />
              {node.witness ? "TESTIGO ENCONTRADO" : "VERIFICACIÓN COMPLETA"}
            </span>
            <strong>
              {node.witness ? `y = ${node.witness}` : "a → b · b → c · c → a"}
            </strong>
          </div>
        )}
        <div className="breadcrumb-nodes">
          {pathToNode(node.id).map((id, i) => (
            <span key={id}>
              {i > 0 && <ChevronRight size={12} />}
              <button onClick={() => onSelect(id)}>
                {id === "root" ? "∀x" : id.startsWith("exists") ? "∃y" : "P"}
              </button>
            </span>
          ))}
        </div>
        <p className="inspector-foot">
          Escenario fijo · dependencia lógica real
        </p>
      </div>
    </aside>
  );
}
