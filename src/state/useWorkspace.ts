import { useEffect, useState } from "react";
import { EXAMPLE_FORMULA } from "../features/evaluation/modelEditor";
export type Page = "evaluate" | "laboratory";
const pageFromHash = (): Page =>
  window.location.hash.slice(2) === "laboratory" ? "laboratory" : "evaluate";
export function useWorkspace() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [formula, setFormula] = useState(EXAMPLE_FORMULA);
  useEffect(() => {
    const change = () => setPage(pageFromHash());
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return {
    page,
    formula,
    setFormula,
    navigate: (next: Page) => {
      window.location.hash = `/${next}`;
    },
  };
}
