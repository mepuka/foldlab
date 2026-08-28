// The full circle — Effect TypeScript → the store language's linear
// operation sequence, per the recognition proposal's v0 rules (§8) and
// the ratified direction law: this is HOOVER-side evidence. It parses
// pinned sources and classifies; it never mints a fixture, a word, or
// an identity — execution belongs to the Lean model alone.
//
// Implemented rules: 1 (program-decl), 3 (const-yield-put),
// 4 (node-literal), 5 (answer-ref), 6 (return-word), 9 (partition),
// plus the refusal-only classifiers. Deviations from the proposal,
// recorded honestly:
//  - Rule 7 hex pinning is checked only when the helper is defined
//    in-file; a bare `hex` callee is flagged helperUnpinned, not refused.
//  - E-BRANCH arms are NOT attempted (all branches classify monadic,
//    where the proposal would try both arms for `selective`).
import ts from "typescript";
import {
  EFFECT_MODULE, MANIFEST_V0, detail, isCanonicalNat, isPayloadHex,
} from "./contract";
import type { Instruction, Ref, Verdict } from "./contract";
export type { Instruction, Lift, Ref, Refusal, Verdict } from "./contract";

class Refuse extends Error {
  constructor(public code: string, public detail: string, public pos: number) { super(code); }
}

/** R5 - parentheses are parser-stratum TRIVIA. The oxc plugin's AST arrives
 * with them already stripped, so a ruling that refused them could be
 * implemented faithfully on only one leg; both legs see through them
 * instead, and so does the Lean walker. */
function unparen(e: ts.Expression): ts.Expression {
  while (ts.isParenthesizedExpression(e)) e = e.expression;
  return e;
}

function chainParts(n: ts.Expression): string[] | null {
  const parts: string[] = [];
  let cur: ts.Expression = unparen(n);
  while (ts.isPropertyAccessExpression(cur)) {
    if (cur.questionDotToken) return null;          // R2 - refused explicitly below
    parts.unshift(cur.name.text);
    cur = unparen(cur.expression);
  }
  if (!ts.isIdentifier(cur)) return null;
  parts.unshift(cur.text);
  return parts;
}

/** R2 - `?.` or `!` anywhere in a recognized spine. Detected EXPLICITLY so
 * the refusal is the ruled one and never an accidental fall-through code. */
function spineOptional(e: ts.Expression): boolean {
  let cur: ts.Expression = e;
  for (;;) {
    if (ts.isParenthesizedExpression(cur)) { cur = cur.expression; continue; }
    if (ts.isNonNullExpression(cur)) return true;
    if (ts.isPropertyAccessExpression(cur) || ts.isElementAccessExpression(cur) ||
        ts.isCallExpression(cur)) {
      if (cur.questionDotToken) return true;
      cur = cur.expression;
      continue;
    }
    return false;
  }
}

/** R3 - bindings come from a PARSED import walk, never the sieve's regex: a
 * recognizer must not be fooled by import text inside a comment or a string
 * literal. The regex scan stays sieve-side, where triage lives. Declared
 * deviation: `import type` bindings still count - the recognizer is
 * syntax-only and type-blind, and both legs are blind identically. */
function importBindings(sf: ts.SourceFile): Set<string> {
  const out = new Set<string>();
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st)) continue;
    if (!ts.isStringLiteral(st.moduleSpecifier) ||
        !EFFECT_MODULE.test(st.moduleSpecifier.text)) continue;
    const cl = st.importClause;
    if (!cl) continue;
    if (cl.name) out.add(cl.name.text);
    const nb = cl.namedBindings;
    if (nb && ts.isNamespaceImport(nb)) out.add(nb.name.text);
    if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) out.add(el.name.text);
  }
  return out;
}

/** Lift one candidate declaration (Rule 1 + body partition). */
function liftDecl(sf: ts.SourceFile, name: string, arrowOrCall: ts.Expression, bindings: Set<string>): Verdict {
  try {
    // Rule 1 — unwrap `(store: T) => E.gen(function* () { … })`,
    // or a bare `E.gen(function* () { … })` (no store param bound).
    let storeBinder = "";
    let genCall: ts.Expression = arrowOrCall;
    if (ts.isArrowFunction(arrowOrCall)) {
      if (arrowOrCall.parameters.length !== 1) throw new Refuse("E-PARAM-SHAPE", `${arrowOrCall.parameters.length} parameters`, arrowOrCall.getStart(sf));
      const p0 = arrowOrCall.parameters[0];
      if (!ts.isIdentifier(p0.name)) throw new Refuse("E-PARAM-SHAPE", "destructured store parameter", p0.getStart(sf));
      storeBinder = p0.name.text;
      if (ts.isBlock(arrowOrCall.body)) throw new Refuse("E-SPINE-ESCAPE", "block-bodied arrow", arrowOrCall.body.getStart(sf));
      genCall = arrowOrCall.body;
    }
    if (spineOptional(genCall)) throw new Refuse("E-STMT-SHAPE", detail("optionalChain"), genCall.getStart(sf));
    genCall = unparen(genCall);
    if (!ts.isCallExpression(genCall)) throw new Refuse("E-SPINE-ESCAPE", "body is not a call", genCall.getStart(sf));
    const callee = chainParts(genCall.expression);
    if (!callee || !bindings.has(callee[0]) || callee[callee.length - 1] !== "gen")
      throw new Refuse("E-SPINE-ESCAPE", `callee ${callee?.join(".") ?? "?"} is not import-resolved Effect.gen`, genCall.getStart(sf));
    const genFn = genCall.arguments[0];
    if (!genFn || !ts.isFunctionExpression(genFn) || !genFn.asteriskToken)
      throw new Refuse("E-SPINE-ESCAPE", "Effect.gen argument is not a generator function", genCall.getStart(sf));

    // Rule 9 — partition the body, statements consumed in order.
    const binders: string[] = [];
    const instructions: Instruction[] = [];
    let helperUnpinned = false;
    const stmts = genFn.body.statements;
    for (let i = 0; i < stmts.length; i++) {
      const st = stmts[i];
      const last = i === stmts.length - 1;
      if (ts.isIfStatement(st)) throw new Refuse("E-BRANCH", "if in statement position", st.getStart(sf));
      if (ts.isForStatement(st) || ts.isForOfStatement(st) || ts.isWhileStatement(st) || ts.isDoStatement(st))
        throw new Refuse("E-LOOP", "loop in body", st.getStart(sf));
      if (ts.isTryStatement(st)) throw new Refuse("E-HANDLER", "try/catch in body", st.getStart(sf));

      if (ts.isVariableStatement(st)) {
        // Rule 3 — const ⟨a⟩ = yield* ⟨store⟩.put(nodeLiteral)
        const decls = st.declarationList.declarations;
        if (decls.length !== 1) throw new Refuse("E-STMT-SHAPE", "multiple declarators", st.getStart(sf));
        const d = decls[0];
        if (!ts.isIdentifier(d.name)) throw new Refuse("E-BIND-SHAPE", "destructured binder", d.name.getStart(sf));
        if (!d.initializer || !ts.isYieldExpression(d.initializer) || !d.initializer.asteriskToken || !d.initializer.expression)
          throw new Refuse("E-STMT-SHAPE", "binding without yield*", st.getStart(sf));
        const op = d.initializer.expression;
        if (spineOptional(op)) throw new Refuse("E-STMT-SHAPE", detail("optionalChain"), op.getStart(sf));
        if (!ts.isCallExpression(op)) throw new Refuse("E-YIELD-POSITION", "yield* of a non-call", op.getStart(sf));
        const parts = chainParts(op.expression);
        if (!parts) throw new Refuse("E-STMT-SHAPE", "unrecognizable callee", op.getStart(sf));
        if (parts.length === 2 && binders.includes(parts[0]))
          throw new Refuse("E-ANSWER-HIGHER-ORDER", `answer ${parts[0]} used as an operation`, op.getStart(sf));
        if (parts[0] !== storeBinder || parts.length !== 2) {
          if (bindings.has(parts[0])) throw new Refuse("E-OP-UNKNOWN", `import-resolved op ${parts.join(".")} is not a signature operation`, op.getStart(sf));
          throw new Refuse("E-OP-RECEIVER", `receiver ${parts[0]} is not the bound store parameter`, op.getStart(sf));
        }
        if (parts[1] === "load") throw new Refuse("E-OP-UNKNOWN", "load-not-yet-documented", op.getStart(sf));
        if (parts[1] !== "put") throw new Refuse("E-OP-UNKNOWN", `store member ${parts[1]}`, op.getStart(sf));
        if (op.arguments.length !== 1) throw new Refuse("E-NODE-SHAPE", "put arity", op.getStart(sf));
        const node = parseNodeLiteral(sf, op.arguments[0], binders);
        helperUnpinned ||= node.helperUnpinned;
        instructions.push({ index: binders.length, ...node.fields });
        binders.push(d.name.text);
        continue;
      }

      if (ts.isReturnStatement(st)) {
        if (!last) throw new Refuse("E-STMT-SHAPE", "return before final position", st.getStart(sf));
        const e = st.expression;
        if (e && ts.isYieldExpression(e)) throw new Refuse("E-FAIL-NOT-DOCUMENTED", "yield* in return (fail-shaped)", e.getStart(sf));
        if (!e || !ts.isArrayLiteralExpression(e)) throw new Refuse("E-RETURN-SHAPE", "return is not an array literal", st.getStart(sf));
        // Rule 6 — exactly the binders, in order, dense.
        const names = e.elements.map((x) => (ts.isIdentifier(x) ? x.text : null));
        if (names.some((x) => x === null) || names.length !== binders.length || names.some((x, k) => x !== binders[k]))
          throw new Refuse("E-RETURN-SHAPE", `return [${names.join(",")}] ≠ binders [${binders.join(",")}]`, st.getStart(sf));
        return { kind: "lifted", name, storeBinder, instructions, helperUnpinned };
      }

      if (ts.isExpressionStatement(st) && ts.isYieldExpression(st.expression))
        throw new Refuse("E-YIELD-POSITION", "yield outside a binding position", st.getStart(sf));
      throw new Refuse("E-STMT-SHAPE", ts.SyntaxKind[st.kind], st.getStart(sf));
    }
    throw new Refuse("E-RETURN-SHAPE", "body has no return", genFn.getStart(sf));
  } catch (e) {
    if (e instanceof Refuse) return { kind: "refusal", name, code: e.code, detail: e.detail, pos: e.pos } as Verdict;
    throw e;
  }
}

/** Rules 4+5 — the closed node literal, answer refs resolved to indices. */
function parseNodeLiteral(sf: ts.SourceFile, arg: ts.Expression, binders: string[]):
    { fields: { version: number; tag: number; payloadHex: string; refs: Ref[] }; helperUnpinned: boolean } {
  if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) throw new Refuse("E-ARG-CLOSURE", "function-valued op argument", arg.getStart(sf));
  if (!ts.isObjectLiteralExpression(arg)) throw new Refuse("E-NODE-SHAPE", "put argument is not an object literal", arg.getStart(sf));
  const props = new Map<string, ts.Expression>();
  for (const p of arg.properties) {
    if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name)) throw new Refuse("E-NODE-SHAPE", "non-plain property", p.getStart(sf));
    props.set(p.name.text, p.initializer);
  }
  const keys = [...props.keys()].sort().join(",");
  if (keys !== "kind,payload,refs") throw new Refuse("E-NODE-SHAPE", `keys {${keys}}`, arg.getStart(sf));

  const kind = props.get("kind")!;
  if (!ts.isObjectLiteralExpression(kind)) throw new Refuse("E-NODE-SHAPE", "kind is not an object", kind.getStart(sf));
  const kp = new Map<string, ts.Expression>();
  for (const p of kind.properties) {
    if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name)) throw new Refuse("E-NODE-SHAPE", "kind property", p.getStart(sf));
    kp.set(p.name.text, p.initializer);
  }
  if ([...kp.keys()].sort().join(",") !== "tag,version") throw new Refuse("E-NODE-SHAPE", "kind keys", kind.getStart(sf));
  // R6 - the source must BE canonical decimal, not be forgiven into it.
  // `getText` (RAW spelling), never `.text`: the scanner already normalizes
  // `1_000` to "1000" and `0x1f` to "31", which is exactly the forgiveness
  // this ruling refuses.
  const intOf = (e: ts.Expression, role: string): number => {
    if (!ts.isNumericLiteral(e))
      throw new Refuse("E-ARG-DYNAMIC", detail("natNotLiteral", { role }), e.getStart(sf));
    const raw = e.getText(sf);
    if (!new RegExp(MANIFEST_V0.natLiteralPattern).test(raw))
      throw new Refuse("E-ARG-DYNAMIC", detail("natNotCanonical", { role }), e.getStart(sf));
    if (!isCanonicalNat(raw))
      throw new Refuse("E-ARG-DYNAMIC",
        detail("natOutOfRange", { role, bits: MANIFEST_V0.natBits }), e.getStart(sf));
    return Number(raw);
  };
  const version = intOf(kp.get("version")!, "version");
  const tag = intOf(kp.get("tag")!, "tag");

  const payload = props.get("payload")!;
  if (!ts.isCallExpression(payload) || !ts.isIdentifier(payload.expression) ||
      payload.expression.text !== "hex" || payload.arguments.length !== 1)
    throw new Refuse("E-ARG-DYNAMIC", detail("payloadNotHexCall"), payload.getStart(sf));
  // R1 - `isStringLiteral`, NOT `isStringLiteralLike`: a template literal is
  // a different FORM, and the manifest rules on forms.
  const a0 = payload.arguments[0];
  if (!ts.isStringLiteral(a0))
    throw new Refuse("E-ARG-DYNAMIC", detail("payloadNotStringLiteral"), a0.getStart(sf));
  // R7 - lowercase even-length hex, empty admissible, no normalization.
  if (!isPayloadHex(a0.text))
    throw new Refuse("E-ARG-DYNAMIC", detail("payloadHexDomain"), a0.getStart(sf));
  const payloadHex = a0.text;

  const refsE = props.get("refs")!;
  if (!ts.isArrayLiteralExpression(refsE)) throw new Refuse("E-ARG-DYNAMIC", "refs is not an array literal", refsE.getStart(sf));
  const refs: Ref[] = refsE.elements.map((el) => {
    if (!ts.isObjectLiteralExpression(el)) throw new Refuse("E-NODE-SHAPE", "ref entry", el.getStart(sf));
    const rp = new Map<string, ts.Expression>();
    for (const p of el.properties) {
      if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name)) throw new Refuse("E-NODE-SHAPE", "ref property", p.getStart(sf));
      rp.set(p.name.text, p.initializer);
    }
    if ([...rp.keys()].sort().join(",") !== "expectedTag,id") throw new Refuse("E-NODE-SHAPE", "ref keys", el.getStart(sf));
    const idE = rp.get("id")!;
    if (!ts.isIdentifier(idE)) throw new Refuse("E-ARG-DYNAMIC", "ref id is not an identifier", idE.getStart(sf));
    const source = binders.indexOf(idE.text);
    if (source < 0) throw new Refuse("E-REF-UNBOUND", `ref ${idE.text} resolves to no earlier binder`, idE.getStart(sf));
    return { source, expectedTag: intOf(rp.get("expectedTag")!, "expectedTag") };
  });
  return { fields: { version, tag, payloadHex, refs }, helperUnpinned: true /* Rule 7: no in-file pinned helper checked */ };
}

/** All candidate declarations of a source text: top-level (exported)
const whose initializer contains an import-resolved `.gen(` spine. */
export function liftSource(src: string): Verdict[] {
  const sf = ts.createSourceFile("f.ts", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  // R12 - a source this engine's own PARSER rejects is a non-candidate, and
  // a non-candidate is silent (the same shape R4 gives an over-deep spine).
  // It must not be classified: a refusal is a claim ABOUT a program, and
  // there is no program here to make a claim about.
  //
  // TypeScript's parser is error-tolerant and hands back a tree anyway, so
  // without this check ck would classify what oxc cannot even parse — which
  // is exactly the W6 divergence. `parseDiagnostics` is not on the public
  // `SourceFile` type, but it is the only place the parser's own verdict is
  // recorded, and this engine asks ITS parser, never the other leg's.
  if (((sf as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics ?? []).length > 0)
    return [];
  const bindings = importBindings(sf);                        // R3
  if (bindings.size === 0) return [];
  const out: Verdict[] = [];
  // R4 - the candidate search is BOUNDED by manifest data. A spine deeper
  // than the bound is not a candidate at all: both legs go silent by rule,
  // rather than by whichever cutoff each host happened to have.
  // `forEachChild` (not `getChildren`) so the walk sees only real nodes -
  // TypeScript's tokens and SyntaxLists are not ESTree nodes, and depth has
  // to mean the same thing on both legs. Parentheses are transparent for
  // the same reason they are in `chainParts` (R5).
  const hasGen = (n: ts.Node, depth: number): boolean => {
    if (depth > MANIFEST_V0.candidateDepthMax) return false;
    if (ts.isCallExpression(n)) {
      const parts = chainParts(n.expression);
      if (parts && bindings.has(parts[0]) && parts[parts.length - 1] === "gen") return true;
    }
    const next = depth + (ts.isParenthesizedExpression(n) ? 0 : 1);
    let found = false;
    ts.forEachChild(n, (c) => { if (!found && hasGen(c, next)) found = true; });
    return found;
  };
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) {
      if (!ts.isIdentifier(d.name) || !d.initializer) continue;
      if (!hasGen(d.initializer, 0)) continue;
      out.push(liftDecl(sf, d.name.text, d.initializer, bindings));
    }
  }
  return out;
}
