import { useEffect, useState } from "react";
import { DEMO_FORMULA } from "../features/demo/scenario";
export type Page = "dashboard" | "laboratory" | "editor" | "evaluate";
const pageFromHash = (): Page => {
  const value = window.location.hash.slice(2);
  return value === "dashboard" || value === "editor" || value === "evaluate"
    ? value
    : "laboratory";
};
export function useWorkspace() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [formula, setFormula] = useState(DEMO_FORMULA);
  const [selectedId, selectNode] = useState("");
  useEffect(() => {
    const change = () => setPage(pageFromHash());
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return {
    page,
    formula,
    setFormula,
    selectedId,
    selectNode,
    isDemo: formula === DEMO_FORMULA,
    navigate: (next: Page) => {
      window.location.hash = `/${next}`;
    },
    reset: () => {
      setFormula(DEMO_FORMULA);
      selectNode("root");
    },
  };
}
