import type {
  Diagnostic,
  FormulaAST,
  LogicalLanguage,
  SourceRange,
  TermAST,
} from "./types";

export const IDENTIFIER = /^[\p{L}_][\p{L}\p{N}_]*$/u;
export const SYNTAX_LIMITS = {
  characters: 8192,
  tokens: 2048,
  depth: 128,
} as const;
/** Keyboard spellings. Tokens keep their source text, so ranges stay exact. */
const SYMBOL_ALIASES: readonly (readonly [string, string])[] = [
  ["<->", "↔"],
  ["->", "→"],
  ["~", "¬"],
  ["&", "∧"],
  ["|", "∨"],
];
const WORD_ALIASES = new Map([
  ["forall", "∀"],
  ["exists", "∃"],
]);
export const isReservedWord = (name: string) => WORD_ALIASES.has(name);
export interface Token {
  kind: string;
  text: string;
  range: SourceRange;
}
class SyntaxFailure extends Error {
  constructor(readonly diagnostic: Diagnostic) {
    super(diagnostic.message);
  }
}
function fail(code: string, message: string, range: SourceRange): never {
  throw new SyntaxFailure({ code, message, range });
}
export function tokenize(
  text: string,
): { valid: true; tokens: Token[] } | { valid: false; errors: Diagnostic[] } {
  try {
    if (text.length > SYNTAX_LIMITS.characters)
      fail(
        "resource",
        `La fórmula supera el límite de ${SYNTAX_LIMITS.characters} caracteres.`,
        { start: 0, end: text.length },
      );
    const tokens: Token[] = [];
    let i = 0;
    while (i < text.length) {
      if (/\s/u.test(text[i])) {
        i++;
        continue;
      }
      const start = i;
      const name = /^[\p{L}_][\p{L}\p{N}_]*/u.exec(text.slice(i));
      if (name) {
        i += name[0].length;
        tokens.push({
          kind: WORD_ALIASES.get(name[0]) ?? "name",
          text: name[0],
          range: { start, end: i },
        });
      } else if ("¬∧∨→↔∀∃=(),.".includes(text[i])) {
        i++;
        tokens.push({
          kind: text[start],
          text: text[start],
          range: { start, end: i },
        });
      } else {
        const alias = SYMBOL_ALIASES.find(([spelling]) =>
          text.startsWith(spelling, i),
        );
        if (!alias)
          fail(
            "character",
            `Símbolo «${text[i]}» no admitido. Usa ¬, ∧, ∨, →, ↔, ∀, ∃ y =, o desde el teclado ~, &, |, ->, <->, forall y exists.`,
            { start, end: start + 1 },
          );
        i += alias[0].length;
        tokens.push({
          kind: alias[1],
          text: alias[0],
          range: { start, end: i },
        });
      }
      if (tokens.length > SYNTAX_LIMITS.tokens)
        fail(
          "resource",
          "La fórmula supera el límite de tokens del analizador.",
          { start, end: i },
        );
    }
    tokens.push({ kind: "eof", text: "", range: { start: i, end: i } });
    return { valid: true, tokens };
  } catch (error) {
    if (error instanceof SyntaxFailure)
      return { valid: false, errors: [error.diagnostic] };
    throw error;
  }
}

/** Quantifiers bind like ¬: only the next unary formula, as in the course notation. */
export function parseFormula(
  text: string,
  language: LogicalLanguage,
): { valid: true; ast: FormulaAST } | { valid: false; errors: Diagnostic[] } {
  const lexed = tokenize(text);
  if (!lexed.valid) return lexed;
  const tokens = lexed.tokens;
  let cursor = 0,
    depth = 0;
  const constants = new Set(
    language.functions.filter((f) => f.arity === 0).map((f) => f.name),
  );
  const peek = () => tokens[cursor];
  const take = () => tokens[cursor++];
  const accept = (kind: string) => (peek().kind === kind ? take() : undefined);
  const expect = (kind: string) => {
    if (peek().kind !== kind)
      fail(
        "syntax",
        `Se esperaba ${kind === "name" ? "un identificador" : kind === "eof" ? "el final de la fórmula" : `«${kind}»`}; se encontró ${peek().kind === "eof" ? "el final de la fórmula" : `«${peek().text}»`}.`,
        peek().range,
      );
    return take();
  };
  const nested = <T>(work: () => T): T => {
    if (++depth > SYNTAX_LIMITS.depth)
      fail(
        "resource",
        "Anidamiento demasiado profundo para este analizador.",
        peek().range,
      );
    try {
      return work();
    } finally {
      depth--;
    }
  };
  function argumentsList(): TermAST[] {
    const args: TermAST[] = [];
    if (accept(")")) return args;
    do {
      args.push(term());
    } while (accept(","));
    expect(")");
    return args;
  }
  function application(token: Token): TermAST {
    if (accept("(")) {
      const args = argumentsList();
      return {
        kind: "function",
        name: token.text,
        args,
        range: {
          start: token.range.start,
          end: tokens[cursor - 1].range.end,
        },
      };
    }
    return constants.has(token.text)
      ? { kind: "function", name: token.text, args: [], range: token.range }
      : { kind: "variable", name: token.text, range: token.range };
  }
  function term(): TermAST {
    return nested(() => application(expect("name")));
  }
  function unary(): FormulaAST {
    return nested(() => {
      const token = peek();
      if (accept("¬")) {
        const operand = unary();
        return {
          kind: "not",
          operand,
          range: { start: token.range.start, end: operand.range.end },
        };
      }
      if (token.kind === "∀" || token.kind === "∃") {
        take();
        const variable = expect("name");
        accept(".");
        const body = unary();
        return {
          kind: token.kind === "∀" ? "forall" : "exists",
          variable: variable.text,
          body,
          range: { start: token.range.start, end: body.range.end },
        };
      }
      if (accept("(")) {
        const ast = iff();
        const close = expect(")");
        return {
          ...ast,
          range: { start: token.range.start, end: close.range.end },
        };
      }
      const head = application(expect("name"));
      if (accept("=")) {
        const right = term();
        return {
          kind: "equals",
          left: head,
          right,
          range: { start: head.range.start, end: right.range.end },
        };
      }
      return {
        kind: "predicate",
        name: head.name,
        args: head.kind === "function" ? head.args : [],
        range: head.range,
      };
    });
  }
  function and(): FormulaAST {
    let left = unary();
    while (accept("∧")) {
      const right = unary();
      left = {
        kind: "and",
        left,
        right,
        range: { start: left.range.start, end: right.range.end },
      };
    }
    return left;
  }
  function or(): FormulaAST {
    let left = and();
    while (accept("∨")) {
      const right = and();
      left = {
        kind: "or",
        left,
        right,
        range: { start: left.range.start, end: right.range.end },
      };
    }
    return left;
  }
  function implication(): FormulaAST {
    return nested(() => {
      const left = or();
      if (!accept("→")) return left;
      const right = implication();
      return {
        kind: "implies",
        left,
        right,
        range: { start: left.range.start, end: right.range.end },
      };
    });
  }
  function iff(): FormulaAST {
    let left = implication();
    while (accept("↔")) {
      const right = implication();
      left = {
        kind: "iff",
        left,
        right,
        range: { start: left.range.start, end: right.range.end },
      };
    }
    return left;
  }
  try {
    const ast = iff();
    expect("eof");
    return { valid: true, ast };
  } catch (error) {
    if (error instanceof SyntaxFailure)
      return { valid: false, errors: [error.diagnostic] };
    throw error;
  }
}
