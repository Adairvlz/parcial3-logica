import { useEffect, useState } from "react";
import { DEMO_FORMULA } from "../features/demo/scenario";
export type Page = "evaluate" | "laboratory";
const pageFromHash = (): Page =>
  window.location.hash.slice(2) === "laboratory" ? "laboratory" : "evaluate";
export function useWorkspace() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [formula, setFormula] = useState(DEMO_FORMULA);
  const [selectedId, selectNode] = useState("");
  useEffect(() => {
    const change = () => setPage(pageFromHash());
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return { page, formula, setFormula, selectedId, selectNode };
}
