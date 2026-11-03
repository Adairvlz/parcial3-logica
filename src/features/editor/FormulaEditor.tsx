import { useRef } from "react";
import { RotateCcw } from "lucide-react";
const symbols = ["¬", "∧", "∨", "→", "↔", "∀", "∃", "=", "(", ")"];
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
  onReset,
}: {
  formula: string;
  onChange: (value: string) => void;
  onReset: () => void;
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
      <div className="formula-input">
        <textarea
          ref={input}
          aria-label="Fórmula lógica"
          spellCheck={false}
          rows={1}
          value={formula}
          onChange={(e) => onChange(e.target.value)}
        />
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
    </section>
  );
}
