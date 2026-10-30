import { parseFormula } from "./parser";
import { analyzeAST, tupleKey, validateModel } from "./validation";
import type {
  Diagnostic,
  EvaluationOutcome,
  Evidence,
  FormulaAST,
  TermAST,
} from "./types";

export const EVALUATION_BUDGET = 10000;
export interface EvaluationRequest {
  formula: string;
  language: unknown;
  interpretation: unknown;
  assignment?: unknown;
}
class BudgetExceeded extends Error {}

/** Validate first, then evaluate. No invalid/unfinished request receives a boolean. */
export function evaluateRequest(request: EvaluationRequest): EvaluationOutcome {
  const validated = validateModel(request.language, request.interpretation);
  if (!validated.valid) return { status: "invalid", errors: validated.errors };
  if (typeof request.formula !== "string")
    return {
      status: "invalid",
      errors: [{ code: "shape", message: "La fórmula debe ser texto." }],
    };
  const parsed = parseFormula(request.formula, validated.language);
  if (!parsed.valid) return { status: "invalid", errors: parsed.errors };
  const analysis = analyzeAST(parsed.ast, validated.language);
  if (analysis.errors.length)
    return { status: "invalid", errors: analysis.errors };
  const assignment = request.assignment ?? {};
  if (
    typeof assignment !== "object" ||
    Array.isArray(assignment) ||
    assignment === null
  )
    return {
      status: "invalid",
      errors: [
        {
          code: "assignment",
          message: "El entorno debe ser un objeto de asignaciones.",
        },
      ],
    };
  const env = new Map<string, string>();
  const errors: Diagnostic[] = [];
  for (const [name, value] of Object.entries(assignment)) {
    if (!analysis.freeVariables.includes(name))
      errors.push({
        code: "assignment",
        path: `assignment.${name}`,
        message: `${name} no es una variable libre de esta fórmula. Retira su asignación.`,
      });
    else if (
      typeof value !== "string" ||
      !validated.interpretation.domain.includes(value)
    )
      errors.push({
        code: "assignment",
        path: `assignment.${name}`,
        message: `La asignación de ${name} debe pertenecer al dominio.`,
      });
    else env.set(name, value);
  }
  if (errors.length) return { status: "invalid", errors };
  const missing = analysis.freeVariables.filter((name) => !env.has(name));
  if (missing.length)
    return {
      status: "needs-assignment",
      variables: analysis.freeVariables,
      missing,
    };
  const domain = validated.interpretation.domain;
  const relations = new Map(
    Object.entries(validated.interpretation.relations).map(([name, tuples]) => [
      name,
      new Set(tuples.map(tupleKey)),
    ]),
  );
  const functions = new Map(
    Object.entries(validated.interpretation.functions).map(([name, rows]) => [
      name,
      new Map(rows.map((row) => [tupleKey(row.inputs), row.output])),
    ]),
  );
  let operations = 0;
  const tick = () => {
    if (++operations > EVALUATION_BUDGET) throw new BudgetExceeded();
  };
  function term(node: TermAST, environment: Map<string, string>): string {
    tick();
    if (node.kind === "variable") return environment.get(node.name)!;
    const args = node.args.map((arg) => term(arg, environment));
    return functions.get(node.name)!.get(tupleKey(args))!;
  }
  function walk(node: FormulaAST, environment: Map<string, string>): Evidence {
    tick();
    const evidence: Evidence = {
      kind: node.kind,
      range: { ...node.range },
      value: false,
      formula: request.formula.slice(node.range.start, node.range.end),
      rule: node.kind,
      environment: Object.fromEntries(environment),
      explanation: "",
      children: [],
    };
    if (node.kind === "predicate") {
      const args = node.args.map((arg) => term(arg, environment));
      evidence.terms = node.args.map((arg, index) => ({
        expression: request.formula.slice(arg.range.start, arg.range.end),
        value: args[index],
      }));
      evidence.value = relations.get(node.name)!.has(tupleKey(args));
      evidence.rule = "Interpretación del predicado";
      evidence.explanation = `La tupla (${args.join(", ")}) ${evidence.value ? "pertenece" : "no pertenece"} a ${node.name}ᴵ.`;
      return evidence;
    }
    if (node.kind === "not") {
      const child = walk(node.operand, environment);
      evidence.children = [child];
      evidence.value = !child.value;
      evidence.rule = "Negación";
      evidence.explanation = `El operando es ${child.value ? "verdadero" : "falso"}; su negación es ${evidence.value ? "verdadera" : "falsa"}.`;
      return evidence;
    }
    if (node.kind === "forall" || node.kind === "exists") {
      const universal = node.kind === "forall";
      evidence.rule = universal
        ? "Cuantificador universal"
        : "Cuantificador existencial";
      evidence.checked = 0;
      for (const element of domain) {
        const next = new Map(environment);
        next.set(node.variable, element);
        const child = walk(node.body, next);
        evidence.children.push(child);
        evidence.checked++;
        if (universal && !child.value) {
          evidence.value = false;
          evidence.counterexample = { variable: node.variable, value: element };
          evidence.explanation = `Contraejemplo: ${node.variable} = ${element} hace falso el cuerpo.`;
          return evidence;
        }
        if (!universal && child.value) {
          evidence.value = true;
          evidence.witness = { variable: node.variable, value: element };
          evidence.explanation = `Testigo: ${node.variable} = ${element} hace verdadero el cuerpo.`;
          return evidence;
        }
      }
      evidence.value = universal;
      evidence.explanation = universal
        ? `El cuerpo es verdadero para los ${domain.length} elementos del dominio.`
        : `El cuerpo es falso para los ${domain.length} elementos del dominio; no existe testigo.`;
      return evidence;
    }
    const left = walk(node.left, environment);
    evidence.children.push(left);
    const short =
      (node.kind === "and" && !left.value) ||
      (node.kind === "or" && left.value) ||
      (node.kind === "implies" && !left.value);
    const names = {
      and: "Conjunción",
      or: "Disyunción",
      implies: "Implicación",
      iff: "Bicondicional",
    };
    evidence.rule = names[node.kind];
    if (short) {
      evidence.value = node.kind !== "and";
      evidence.skipped =
        "El segundo operando se omite por cortocircuito; su sintaxis y sus símbolos ya fueron validados.";
      evidence.explanation =
        node.kind === "and"
          ? "Un operando falso basta para refutar la conjunción."
          : node.kind === "or"
            ? "Un operando verdadero basta para satisfacer la disyunción."
            : "Un antecedente falso hace verdadera la implicación.";
      return evidence;
    }
    const right = walk(node.right, environment);
    evidence.children.push(right);
    evidence.value =
      node.kind === "and"
        ? left.value && right.value
        : node.kind === "or"
          ? left.value || right.value
          : node.kind === "implies"
            ? !left.value || right.value
            : left.value === right.value;
    evidence.explanation = `Operandos: ${left.value ? "V" : "F"} y ${right.value ? "V" : "F"}. ${evidence.rule}: ${evidence.value ? "verdadera" : "falsa"}.`;
    return evidence;
  }
  try {
    const evidence = walk(parsed.ast, env);
    return {
      status: "evaluated",
      source: "engine",
      value: evidence.value,
      freeVariables: analysis.freeVariables,
      evidence,
      operations,
    };
  } catch (error) {
    if (error instanceof BudgetExceeded)
      return {
        status: "limit",
        message: `Se alcanzó el límite de ${EVALUATION_BUDGET} operaciones. No se emite un valor de verdad parcial.`,
        operations,
      };
    throw error;
  }
}
