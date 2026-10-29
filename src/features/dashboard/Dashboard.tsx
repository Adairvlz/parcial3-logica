import { ArrowUpRight } from "lucide-react";
export function Dashboard({ openDemo }: { openDemo: () => void }) {
  return (
    <section className="welcome-panel glass">
      <span className="eyebrow">INTERACTIVE LOGIC LABORATORY</span>
      <h1>
        No solo evalúes la lógica.
        <br />
        <em>Observa cómo razona.</em>
      </h1>
      <p>
        Una fórmula se convierte en un organismo de ideas. Sigue sus ramas y
        descubre la razón detrás de cada resultado.
      </p>
      <button className="primary-button" onClick={openDemo}>
        Explorar el laboratorio <ArrowUpRight size={16} />
      </button>
      <small>FASE 1.5 · ORGANIC LUMINOUS REASONING TREE</small>
    </section>
  );
}
