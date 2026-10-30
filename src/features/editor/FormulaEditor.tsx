import { useRef } from "react";
import { CornerDownLeft, RotateCcw, Braces } from "lucide-react";
import { Badge } from "../../ui/Badge";
const symbols = ["¬", "∧", "∨", "→", "↔", "∀", "∃", "(", ")"];
export function insertAtSelection(
  value: string,
  symbol: string,
  start: number,
  end: number,
) {
  return {
    value: value.slice(0, start) + symbol + value.slice(end),
    cursor: start + symbol.length,
  };
}
export function FormulaEditor({
  formula,
  onChange,
  isDemo,
  onReset,
  mode = "demo",
}: {
  formula: string;
  onChange: (value: string) => void;
  isDemo: boolean;
  onReset: () => void;
  mode?: "demo" | "semantic";
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  function insert(symbol: string) {
    const el = input.current;
    if (!el) return;
    const next = insertAtSelection(
      formula,
      symbol,
      el.selectionStart,
      el.selectionEnd,
    );
    onChange(next.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.cursor, next.cursor);
    });
  }
  return (
    <section className="formula-editor" aria-label="Editor de fórmulas">
      <div className="section-heading">
        <span>
          <Braces size={15} /> FÓRMULA ACTIVA
        </span>
        <Badge tone={isDemo ? "mint" : "amber"}>
          {mode === "semantic"
            ? "Motor semántico"
            : isDemo
              ? "Ejemplo demostrativo"
              : "Sin evaluar"}
        </Badge>
      </div>
      <div className="formula-input">
        <span className="line-number">01</span>
        <textarea
          ref={input}
          aria-label="Fórmula lógica"
          spellCheck={false}
          rows={1}
          value={formula}
          onChange={(e) => onChange(e.target.value)}
        />
        <CornerDownLeft size={15} />
      </div>
      <div className="editor-bottom">
        <div className="symbol-buttons">
          {symbols.map((s) => (
            <button
              key={s}
              aria-label={`Insertar ${s}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          className="text-button"
          onClick={onReset}
          title="Restaurar ejemplo"
          aria-label="Restaurar ejemplo"
        >
          <RotateCcw size={13} />
          <span>Restaurar</span>
        </button>
      </div>
      <p className="editor-note">
        {mode === "semantic"
          ? "Se analiza y evalúa con el lenguaje y la interpretación de esta vista."
          : isDemo
            ? "Vista de un ejemplo predefinido. Abre Evaluar para usar el motor real."
            : "Texto personalizado · abre Evaluar para analizarlo con tu interpretación."}
      </p>
    </section>
  );
}
