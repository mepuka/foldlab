// The oxc ENGINE — the recognition logic itself, independent of how it is
// invoked. DELIBERATELY shares nothing with `lift.ts` but the manifest's
// bytes and the contract's codes: the two engines are independent
// implementations, and the agreement gate is only meaningful while that
// holds. Do not "deduplicate" this into lift.ts — that would blind the gate.
//
// Two invocation surfaces sit on top of this one file:
//   plugin.mjs   the oxlint rule (production chassis, the gate's oxc leg)
//   test/        oxc-parser's parseSync, in-process (the suite)
// Sharing the recognizer between them is the point: a suite that exercised
// a SECOND implementation would be testing the wrong engine.
//
// DEVIANT AST SHAPES ARE ASSUMED, NOT TRUSTED AWAY. The two surfaces do not
// hand us the same tree: `oxc-parser` defaults `preserveParens: true` and so
// emits `ParenthesizedExpression` (explicitly non-standard — it appears
// nowhere in the ESTree spec), while the oxlint pipeline strips parens
// before a rule sees them. Babel-style `NumericLiteral` / `StringLiteral` /
// `ObjectProperty` are likewise outside the spec. Every accessor below
// therefore admits both spellings.
//
// `unwrap` covers the PAREN forms and nothing else. TypeScript wrappers
// (`TSAsExpression` and friends) are deliberately NOT unwrapped: R5 ruled on
// parentheses, `as`-casts are an unruled form axis, and unwrapping them here
// would be this engine inventing a ruling the ck leg never received — which
// is exactly the divergence T4(b) caught when an earlier draft of this file
// did it.
//
// `test/T8-estree.test.ts` audits what the parser actually emits against the
// pinned spec (.reference/clones/estree @ 875bf704) so a new deviant is
// REPORTED rather than silently mis-recognized.
// R11 - the manifest is the shared AUTHORITY: this leg imports the same
// bytes `contract.ts` decodes. Engines share DATA, never code; that is the
// whole reason the agreement gate proves anything. A JSON import attribute,
// not `readFileSync`: this module is loaded by TWO foreign hosts (oxlint's
// plugin runtime and vitest's node worker) and must not assume either has a
// filesystem it may reach for.
import MANIFEST from '../../../library/effects/src/cas/generated/lift/manifest.json' with { type: 'json' };

/** Fill a pinned detail template. Implemented INDEPENDENTLY of the ck leg's
 * `detail` on purpose - R10 puts detail strings inside gate equality, so a
 * divergence here is a gate failure rather than a silent drift. */
function detail(key, subs = {}) {
  let out = MANIFEST.details[key];
  if (out === undefined) throw new Error(`no pinned detail "${key}"`);
  for (const [k, v] of Object.entries(subs)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

const EFFECT_MODULE = /^(effect(\/|$)|@effect\/|@effect-ts\/)/;

/** Unwrap the non-standard wrappers oxc may or may not emit. `parseSync`
 * gives `ParenthesizedExpression` by default; the oxlint pipeline does not.
 * R5 rules parentheses to be parser-stratum trivia, so BOTH surfaces must
 * read through them and agree. TS-only wrappers are transparent for the
 * same reason: they are type-stratum, and this recognizer is type-blind. */
const unwrap = (n) => {
  let cur = n;
  while (cur && typeof cur === 'object' &&
         (cur.type === 'ParenthesizedExpression' || cur.type === 'TSParenthesizedExpression'))
    cur = cur.expression;
  return cur;
};

const isId = (n) => !!n && n.type === 'Identifier';
const numVal = (n) =>
  !n ? null
  : n.type === 'Literal' && typeof n.value === 'number' ? n.value
  : n.type === 'NumericLiteral' ? n.value
  : null;
const strVal = (n) =>
  !n ? null
  : n.type === 'Literal' && typeof n.value === 'string' ? n.value
  : n.type === 'StringLiteral' ? n.value
  : null;
const isProp = (p) => !!p && (p.type === 'Property' || p.type === 'ObjectProperty') && !p.computed && isId(p.key);

/** R2 - `?.` or `!` anywhere in a recognized spine. oxc surfaces these as
 * `ChainExpression` / `TSNonNullExpression`; detected EXPLICITLY so the
 * refusal is the ruled one and never an accidental fall-through code. */
function spineOptional(e) {
  let cur = unwrap(e);
  for (;;) {
    if (!cur || typeof cur !== 'object') return false;
    if (cur.type === 'ChainExpression' || cur.type === 'TSNonNullExpression') return true;
    if (cur.type === 'MemberExpression') {
      if (cur.optional) return true;
      cur = unwrap(cur.object);
      continue;
    }
    if (cur.type === 'CallExpression') {
      if (cur.optional) return true;
      cur = unwrap(cur.callee);
      continue;
    }
    return false;
  }
}

function chainParts(n) {
  const parts = [];
  let cur = unwrap(n);
  while (cur && cur.type === 'MemberExpression' && !cur.computed && isId(cur.property)) {
    if (cur.optional) return null;               // R2 - refused explicitly below
    parts.unshift(cur.property.name);
    cur = unwrap(cur.object);
  }
  if (!isId(cur)) return null;
  parts.unshift(cur.name);
  return parts;
}

// R4 - the candidate search is BOUNDED by manifest data, identically on
// both legs: a spine deeper than the bound is not a candidate at all, so
// both engines go silent by rule rather than by whichever cutoff each host
// happened to have. (This leg's AST already has parentheses stripped, which
// is R5's reason for treating them as trivia on the ck leg too.)
function containsGen(node, bindings, depth = 0) {
  if (!node || typeof node !== 'object' || depth > MANIFEST.candidateDepthMax) return false;
  if (node.type === 'CallExpression') {
    const parts = chainParts(node.callee);
    if (parts && bindings.has(parts[0]) && parts[parts.length - 1] === 'gen') return true;
  }
  for (const k of Object.keys(node)) {
    if (k === 'parent' || k === 'loc' || k === 'range') continue;
    const v = node[k];
    if (Array.isArray(v)) { for (const x of v) if (containsGen(x, bindings, depth + 1)) return true; }
    else if (v && typeof v === 'object' && v.type) { if (containsGen(v, bindings, depth + 1)) return true; }
  }
  return false;
}

// canonical JSON: sorted keys at every level (CAS-003 shape)
function canonJson(v) {
  if (Array.isArray(v)) return '[' + v.map(canonJson).join(',') + ']';
  if (v && typeof v === 'object')
    return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonJson(v[k])).join(',') + '}';
  return JSON.stringify(v);
}

class Refuse extends Error {
  constructor(code, detail) { super(code); this.code = code; this.detail = detail; }
}

function parseNodeLiteral(arg, binders) {
  if (!arg) throw new Refuse('E-NODE-SHAPE', 'put arity');
  if (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression')
    throw new Refuse('E-ARG-CLOSURE', 'function-valued op argument');
  if (arg.type !== 'ObjectExpression') throw new Refuse('E-NODE-SHAPE', 'put argument is not an object literal');
  const props = new Map();
  for (const p of arg.properties) {
    if (!isProp(p)) throw new Refuse('E-NODE-SHAPE', 'non-plain property');
    props.set(p.key.name, p.value);
  }
  if ([...props.keys()].sort().join(',') !== 'kind,payload,refs')
    throw new Refuse('E-NODE-SHAPE', `keys {${[...props.keys()].sort().join(',')}}`);

  const kind = props.get('kind');
  if (!kind || kind.type !== 'ObjectExpression') throw new Refuse('E-NODE-SHAPE', 'kind is not an object');
  const kp = new Map();
  for (const p of kind.properties) {
    if (!isProp(p)) throw new Refuse('E-NODE-SHAPE', 'kind property');
    kp.set(p.key.name, p.value);
  }
  if ([...kp.keys()].sort().join(',') !== 'tag,version') throw new Refuse('E-NODE-SHAPE', 'kind keys');
  // R6 - the source must BE canonical decimal, not be forgiven into it.
  // `raw` (the SOURCE spelling), never `value`: oxc has already normalized
  // `1_000` to 1000 and `0x1f` to 31, which is exactly the forgiveness this
  // ruling refuses.
  const intOf = (e, role) => {
    if (numVal(e) === null) throw new Refuse('E-ARG-DYNAMIC', detail('natNotLiteral', { role }));
    const raw = e.raw !== undefined ? e.raw : String(e.value);
    if (!new RegExp(MANIFEST.natLiteralPattern).test(raw))
      throw new Refuse('E-ARG-DYNAMIC', detail('natNotCanonical', { role }));
    if (Number(raw) >= 2 ** MANIFEST.natBits)
      throw new Refuse('E-ARG-DYNAMIC', detail('natOutOfRange', { role, bits: MANIFEST.natBits }));
    return Number(raw);
  };
  const version = intOf(kp.get('version'), 'version');
  const tag = intOf(kp.get('tag'), 'tag');

  const payload = props.get('payload');
  const calleeOk = payload && payload.type === 'CallExpression' && isId(payload.callee) &&
    payload.callee.name === 'hex' && payload.arguments.length === 1;
  if (!calleeOk) throw new Refuse('E-ARG-DYNAMIC', detail('payloadNotHexCall'));
  // R1 - a plain string literal only. A template literal is a different
  // FORM (oxc gives `TemplateLiteral`, so `strVal` reads null), and the
  // manifest rules on forms.
  const payloadHex = strVal(payload.arguments[0]);
  if (payloadHex === null) throw new Refuse('E-ARG-DYNAMIC', detail('payloadNotStringLiteral'));
  // R7 - lowercase even-length hex, empty admissible, no normalization.
  if (!new RegExp(MANIFEST.payloadHexPattern).test(payloadHex))
    throw new Refuse('E-ARG-DYNAMIC', detail('payloadHexDomain'));

  const refsE = props.get('refs');
  if (!refsE || refsE.type !== 'ArrayExpression') throw new Refuse('E-ARG-DYNAMIC', 'refs is not an array literal');
  const refs = refsE.elements.map((el) => {
    if (!el || el.type !== 'ObjectExpression') throw new Refuse('E-NODE-SHAPE', 'ref entry');
    const rp = new Map();
    for (const p of el.properties) {
      if (!isProp(p)) throw new Refuse('E-NODE-SHAPE', 'ref property');
      rp.set(p.key.name, p.value);
    }
    if ([...rp.keys()].sort().join(',') !== 'expectedTag,id') throw new Refuse('E-NODE-SHAPE', 'ref keys');
    const idE = rp.get('id');
    if (!isId(idE)) throw new Refuse('E-ARG-DYNAMIC', 'ref id is not an identifier');
    const source = binders.indexOf(idE.name);
    if (source < 0) throw new Refuse('E-REF-UNBOUND', `ref ${idE.name} resolves to no earlier binder`);
    return { source, expectedTag: intOf(rp.get('expectedTag'), 'expectedTag') };
  });
  return { version, tag, payloadHex, refs };
}

function liftDecl(name, init, bindings) {
  try {
    let storeBinder = '';
    let genCall = unwrap(init);
    const initU = unwrap(init);
    if (initU.type === 'ArrowFunctionExpression') {
      if (init.params.length !== 1) throw new Refuse('E-PARAM-SHAPE', `${init.params.length} parameters`);
      const p0 = initU.params[0];
      if (!isId(p0)) throw new Refuse('E-PARAM-SHAPE', 'destructured store parameter');
      storeBinder = p0.name;
      if (initU.body.type === 'BlockStatement') throw new Refuse('E-SPINE-ESCAPE', 'block-bodied arrow');
      genCall = unwrap(initU.body);
    }
    if (spineOptional(genCall)) throw new Refuse('E-STMT-SHAPE', detail('optionalChain'));
    if (genCall.type !== 'CallExpression') throw new Refuse('E-SPINE-ESCAPE', 'body is not a call');
    const callee = chainParts(genCall.callee);
    if (!callee || !bindings.has(callee[0]) || callee[callee.length - 1] !== 'gen')
      throw new Refuse('E-SPINE-ESCAPE', `callee ${callee ? callee.join('.') : '?'} is not import-resolved Effect.gen`);
    const genFn = genCall.arguments[0];
    if (!genFn || genFn.type !== 'FunctionExpression' || !genFn.generator)
      throw new Refuse('E-SPINE-ESCAPE', 'Effect.gen argument is not a generator function');

    const binders = [];
    const instructions = [];
    const stmts = genFn.body.body;
    for (let i = 0; i < stmts.length; i++) {
      const st = stmts[i];
      const last = i === stmts.length - 1;
      if (st.type === 'IfStatement') throw new Refuse('E-BRANCH', 'if in statement position');
      if (st.type === 'ForStatement' || st.type === 'ForOfStatement' || st.type === 'ForInStatement' ||
          st.type === 'WhileStatement' || st.type === 'DoWhileStatement')
        throw new Refuse('E-LOOP', 'loop in body');
      if (st.type === 'TryStatement') throw new Refuse('E-HANDLER', 'try/catch in body');

      if (st.type === 'VariableDeclaration') {
        if (st.declarations.length !== 1) throw new Refuse('E-STMT-SHAPE', 'multiple declarators');
        const d = st.declarations[0];
        if (!isId(d.id)) throw new Refuse('E-BIND-SHAPE', 'destructured binder');
        if (!d.init || d.init.type !== 'YieldExpression' || !d.init.delegate || !d.init.argument)
          throw new Refuse('E-STMT-SHAPE', 'binding without yield*');
        const op = unwrap(d.init.argument);
        if (spineOptional(op)) throw new Refuse('E-STMT-SHAPE', detail('optionalChain'));
        if (op.type !== 'CallExpression') throw new Refuse('E-YIELD-POSITION', 'yield* of a non-call');
        const parts = chainParts(op.callee);
        if (!parts) throw new Refuse('E-STMT-SHAPE', 'unrecognizable callee');
        if (parts.length === 2 && binders.includes(parts[0]))
          throw new Refuse('E-ANSWER-HIGHER-ORDER', `answer ${parts[0]} used as an operation`);
        if (parts[0] !== storeBinder || parts.length !== 2) {
          if (bindings.has(parts[0])) throw new Refuse('E-OP-UNKNOWN', `import-resolved op ${parts.join('.')} is not a signature operation`);
          throw new Refuse('E-OP-RECEIVER', `receiver ${parts[0]} is not the bound store parameter`);
        }
        if (parts[1] === 'load') throw new Refuse('E-OP-UNKNOWN', 'load-not-yet-documented');
        if (parts[1] !== 'put') throw new Refuse('E-OP-UNKNOWN', `store member ${parts[1]}`);
        if (op.arguments.length !== 1) throw new Refuse('E-NODE-SHAPE', 'put arity');
        const fields = parseNodeLiteral(op.arguments[0], binders);
        instructions.push({ index: binders.length, ...fields });
        binders.push(d.id.name);
        continue;
      }

      if (st.type === 'ReturnStatement') {
        if (!last) throw new Refuse('E-STMT-SHAPE', 'return before final position');
        const e = st.argument;
        if (e && e.type === 'YieldExpression') throw new Refuse('E-FAIL-NOT-DOCUMENTED', 'yield* in return (fail-shaped)');
        if (!e || e.type !== 'ArrayExpression') throw new Refuse('E-RETURN-SHAPE', 'return is not an array literal');
        const names = e.elements.map((x) => (isId(x) ? x.name : null));
        if (names.some((x) => x === null) || names.length !== binders.length || names.some((x, k) => x !== binders[k]))
          throw new Refuse('E-RETURN-SHAPE', `return [${names.join(',')}] ≠ binders [${binders.join(',')}]`);
        return { kind: 'lifted', name, storeBinder, instructions, helperUnpinned: true };
      }

      if (st.type === 'ExpressionStatement' && st.expression.type === 'YieldExpression')
        throw new Refuse('E-YIELD-POSITION', 'yield outside a binding position');
      throw new Refuse('E-STMT-SHAPE', st.type);
    }
    throw new Refuse('E-RETURN-SHAPE', 'body has no return');
  } catch (e) {
    if (e instanceof Refuse) return { kind: 'refusal', name, code: e.code, detail: e.detail };
    throw e;
  }
}



/* -------------------------------------------------------------------- */
/* The engine's entry point: an ESTree Program -> Verdict[].              */
/*                                                                       */
/* `recognize : SourceText -> Verdict[]` is what the README's port seam   */
/* fixes; this is that function minus the parse, so both invocation       */
/* surfaces (oxlint rule, oxc-parser) can share one recognizer.           */
/* -------------------------------------------------------------------- */

/** Effect-module bindings declared by PARSED imports (R3). A recognizer
 * that scanned text would be fooled by import spellings inside comments
 * and string literals; the sieve's regex stays sieve-side. */
export function programBindings(program) {
  const bindings = new Set();
  for (const st of program.body) {
    if (st.type !== 'ImportDeclaration') continue;
    const mod = strVal(st.source);
    if (!mod || !EFFECT_MODULE.test(mod)) continue;
    for (const sp of st.specifiers) if (sp.local && isId(sp.local)) bindings.add(sp.local.name);
  }
  return bindings;
}

/** Candidate declarations of a Program, paired with their verdicts. The
 * `node` is kept so the oxlint surface can anchor a diagnostic to it. */
export function recognizeProgramWithNodes(program) {
  const bindings = programBindings(program);
  if (bindings.size === 0) return [];
  const out = [];
  for (const st of program.body) {
    const decl = st.type === 'ExportNamedDeclaration' ? st.declaration : st;
    if (!decl || decl.type !== 'VariableDeclaration') continue;
    for (const d of decl.declarations) {
      if (!isId(d.id) || !d.init) continue;
      if (!containsGen(d.init, bindings)) continue;
      out.push({ node: d, verdict: liftDecl(d.id.name, d.init, bindings) });
    }
  }
  return out;
}

/** The engine, in the shape the port seam names. */
export function recognizeProgram(program) {
  return recognizeProgramWithNodes(program).map((x) => x.verdict);
}

export { canonJson, MANIFEST };
