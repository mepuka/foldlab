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
import { effectBindings } from "./sieve";
import type { Instruction, Ref, Refusal, Verdict } from "./contract";
export type { Instruction, Lift, Ref, Refusal, Verdict } from "./contract";
void (0 as unknown as Ref); void (0 as unknown as Instruction); void (0 as unknown as Refusal);

const _UNUSED_SPECTRUM = {
  "E-BIND-SHAPE": "applicative-gap",
  "E-BRANCH": "monadic", // arms unattempted (deviation above)
  "E-LOOP": "monadic", "E-HANDLER": "monadic", "E-ARG-CLOSURE": "monadic",
  "E-ANSWER-HIGHER-ORDER": "monadic", "E-SPINE-ESCAPE": "monadic",
  "E-YIELD-POSITION": "monadic",
  "E-FAIL-NOT-DOCUMENTED": "classification",
  "E-OP-RECEIVER": "classification", "E-OP-UNKNOWN": "classification",
  "E-STMT-SHAPE": "classification", "E-RETURN-SHAPE": "classification",
  "E-NODE-SHAPE": "classification", "E-ARG-DYNAMIC": "classification",
  "E-REF-UNBOUND": "classification", "E-REF-FORWARD": "classification",
  "E-PARAM-SHAPE": "classification",
  "E-IMPORT-OPAQUE": "instrument", "E-HELPER-UNPINNED": "instrument",
};
void _UNUSED_SPECTRUM; // canonical copy lives in ./contract (SPECTRUM)

class Refuse extends Error {
  constructor(public code: string, public detail: string, public pos: number) { super(code); }
}

function chainParts(n: ts.Expression): string[] | null {
  const parts: string[] = [];
  let cur: ts.Expression = n;
  while (ts.isPropertyAccessExpression(cur)) { parts.unshift(cur.name.text); cur = cur.expression; }
  if (!ts.isIdentifier(cur)) return null;
  parts.unshift(cur.text);
  return parts;
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
        return { kind: "lifted", name, storeBinder, instructions, word: instructions.map((x) => x.index), helperUnpinned };
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
  const intOf = (e: ts.Expression, role: string): number => {
    if (!ts.isNumericLiteral(e)) throw new Refuse("E-ARG-DYNAMIC", `${role} is not a literal`, e.getStart(sf));
    return Number(e.text);
  };
  const version = intOf(kp.get("version")!, "version");
  const tag = intOf(kp.get("tag")!, "tag");

  const payload = props.get("payload")!;
  if (!ts.isCallExpression(payload) || !ts.isIdentifier(payload.expression) || payload.expression.text !== "hex" ||
      payload.arguments.length !== 1 || !ts.isStringLiteralLike(payload.arguments[0]))
    throw new Refuse("E-ARG-DYNAMIC", "payload is not hex(\"…\")", payload.getStart(sf));
  const payloadHex = (payload.arguments[0] as ts.StringLiteralLike).text;

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
  const bindings = effectBindings(src);
  if (bindings.size === 0) return [];
  const sf = ts.createSourceFile("f.ts", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out: Verdict[] = [];
  const hasGen = (n: ts.Node): boolean => {
    if (ts.isCallExpression(n)) {
      const parts = chainParts(n.expression);
      if (parts && bindings.has(parts[0]) && parts[parts.length - 1] === "gen") return true;
    }
    return n.getChildren(sf).some(hasGen);
  };
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) {
      if (!ts.isIdentifier(d.name) || !d.initializer) continue;
      if (!hasGen(d.initializer)) continue;
      out.push(liftDecl(sf, d.name.text, d.initializer, bindings));
    }
  }
  return out;
}
