// The oxc engine — DELIBERATELY self-contained (.mjs, no imports from
// ../src): the two engines are independent implementations of the same
// manifest, and the agreement gate is only meaningful while they share
// nothing but the contract's shapes and codes. Do not "deduplicate"
// this file into lift.ts — that would blind the gate.
//
// DSL v0 — the store-language lift as an oxlint rule on the
// effect-oxlint chassis (grill ruling 2026-08-28: parser-spined, oxc
// hot path). Ports the v0 recognition rules (1,3,4,5,6,9 + refusal
// classifiers) from lift.ts onto ESTree. Each candidate declaration
// yields ONE diagnostic whose message is the canonical-JSON verdict —
// evidence, not lint style; hoover-side under the direction law.
import * as Effect from 'effect/Effect';
import { Diagnostic, Plugin, Rule, RuleContext } from 'effect-oxlint';

const EFFECT_MODULE = /^(effect(\/|$)|@effect\/|@effect-ts\/)/;

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

function chainParts(n) {
  const parts = [];
  let cur = n;
  while (cur && cur.type === 'MemberExpression' && !cur.computed && isId(cur.property)) {
    parts.unshift(cur.property.name);
    cur = cur.object;
  }
  if (!isId(cur)) return null;
  parts.unshift(cur.name);
  return parts;
}

function containsGen(node, bindings, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 40) return false;
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
  const intOf = (e, role) => {
    const v = numVal(e);
    if (v === null) throw new Refuse('E-ARG-DYNAMIC', `${role} is not a literal`);
    return v;
  };
  const version = intOf(kp.get('version'), 'version');
  const tag = intOf(kp.get('tag'), 'tag');

  const payload = props.get('payload');
  const payloadOk = payload && payload.type === 'CallExpression' && isId(payload.callee) &&
    payload.callee.name === 'hex' && payload.arguments.length === 1 && strVal(payload.arguments[0]) !== null;
  if (!payloadOk) throw new Refuse('E-ARG-DYNAMIC', 'payload is not hex("…")');
  const payloadHex = strVal(payload.arguments[0]);

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
    let genCall = init;
    if (init.type === 'ArrowFunctionExpression') {
      if (init.params.length !== 1) throw new Refuse('E-PARAM-SHAPE', `${init.params.length} parameters`);
      const p0 = init.params[0];
      if (!isId(p0)) throw new Refuse('E-PARAM-SHAPE', 'destructured store parameter');
      storeBinder = p0.name;
      if (init.body.type === 'BlockStatement') throw new Refuse('E-SPINE-ESCAPE', 'block-bodied arrow');
      genCall = init.body;
    }
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
        const op = d.init.argument;
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
        return { kind: 'lifted', name, storeBinder, instructions, word: instructions.map((x) => x.index), helperUnpinned: true };
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

const liftRule = Rule.define({
  name: 'lift',
  meta: Rule.meta({ type: 'suggestion', description: 'store-language v0 lift verdicts as evidence diagnostics' }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      Program: (program) => {
        const bindings = new Set();
        for (const st of program.body) {
          if (st.type !== 'ImportDeclaration') continue;
          const mod = strVal(st.source);
          if (!mod || !EFFECT_MODULE.test(mod)) continue;
          for (const sp of st.specifiers) if (sp.local && isId(sp.local)) bindings.add(sp.local.name);
        }
        if (bindings.size === 0) return Effect.void;
        const verdicts = [];
        for (const st of program.body) {
          const decl = st.type === 'ExportNamedDeclaration' ? st.declaration : st;
          if (!decl || decl.type !== 'VariableDeclaration') continue;
          for (const d of decl.declarations) {
            if (!isId(d.id) || !d.init) continue;
            if (!containsGen(d.init, bindings)) continue;
            verdicts.push({ node: d, verdict: liftDecl(d.id.name, d.init, bindings) });
          }
        }
        return Effect.forEach(verdicts, ({ node, verdict }) =>
          ctx.report(Diagnostic.make({ node, message: canonJson(verdict) })));
      },
    };
  },
});

export default Plugin.define({
  name: 'dslv0',
  specifier: 'dslv0',
  rules: { lift: liftRule },
});
