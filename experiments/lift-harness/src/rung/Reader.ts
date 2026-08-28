/**
 * The rung pipeline — spans link the trained capture to the AST pass.
 *
 *   rung 0  import resolution: zero-effect files are decided, not scored
 *   rung 1  Sieve (the trained NB classifier, a Layer): scored spans
 *   rung 2  oxc parse + PatternBank lookup over the nodes whose ranges
 *           sit inside rung-1 spans — the span is the JOIN KEY
 *
 * Output is a span-reading RECORD (operator ruling): evidence with
 * scores, constructs, classes, and depths. It is not a wire verdict —
 * wire `classified` verdicts mint only once bank-driven classification
 * is differential-gated. Fidelity discipline: chains that resolve to an
 * effect import but leave the pin's universe are RECORDED (`offUniverse`),
 * never silently dropped.
 */
import { parseSync } from "oxc-parser";
import { Context, Effect, Layer } from "effect";
import { EFFECT_MODULE } from "../contract";
import {
  type Contribution, ContributionM,
  hitContribution, legacyContribution, offContribution,
} from "./Algebra";
import { PatternBank } from "./PatternBank";
import { Sieve, type SieveSpan } from "./Sieve";

export type ConstructHit = {
  readonly construct: string;
  readonly semanticClass: string;
  /** The fiber-space boundary (R7): in / out / interior. */
  readonly port: "in" | "out" | "interior";
  readonly typicalDepth: number;
  /** Observed AST depth of the hit — the measured side of the
   * typical-depth signature. */
  readonly nodeDepth: number;
  readonly byteStart: number;
  readonly byteEnd: number;
};

/** A host closure captured into fiber space at a port-in construct —
 * a BLACK-BOX region by construction: fiber-space algebra ends at its
 * byte range, and the model either black-boxes it or does not claim it. */
export type ClosureSpan = {
  readonly construct: string;
  readonly byteStart: number;
  readonly byteEnd: number;
};

export type SpanReading = SieveSpan & {
  readonly constructs: readonly ConstructHit[];
};

/** Generation evidence, all of it COMPUTED: v4-only hits and pre-v4
 * re-homings are set differences between enumerated pins; legacy
 * modules are import-line canaries. */
export type Generation = {
  readonly v4Only: readonly string[];
  readonly preV4: readonly string[];
  readonly legacyModules: readonly string[];
  readonly verdict: "v4" | "pre-v4" | "mixed" | "indeterminate";
};

/** File-level density FACTS (thresholded verdicts are a later ruling):
 * `zeroCapture` is the early-exit signal; a fraction near 1 with hits
 * present is the "100% effectful" signal. */
export type Density = {
  readonly constructHits: number;
  readonly codeLines: number;
  readonly spanLines: number;
  readonly effectLineFraction: number;
  readonly zeroCapture: boolean;
};

/** Per-file role EVIDENCE toward module-graph position (the graph
 * itself joins on the census host from `imports`): port-out hits mark
 * entry points; wiring-class hits mark layer construction. */
export type Roles = {
  readonly entryPoint: boolean;
  readonly portsIn: number;
  readonly portsOut: number;
  readonly wiringHits: number;
};

export type Reading = {
  readonly effectful: boolean;
  /** False when this parser rejects the source (R12's shape: the sieve's
   * lexical spans still stand as evidence; the AST pass abstains). */
  readonly parsed: boolean;
  readonly spans: readonly SpanReading[];
  /** Import-resolved chains outside the pin's enumerated universe. */
  readonly offUniverse: readonly string[];
  readonly generation: Generation;
  /** Host closures captured at port-in constructs — model or black-box,
   * never silently absorb. */
  readonly blackBox: readonly ClosureSpan[];
  readonly density: Density;
  readonly roles: Roles;
  /** Every import specifier in the file, sorted — the census host's
   * module-dependency-graph seed. */
  readonly imports: readonly string[];
};

type Node = { type?: unknown; start?: number; end?: number } & Record<string, unknown>;

export class Reader extends Context.Service<Reader, {
  readonly read: (source: string) => Effect.Effect<Reading>;
}>()("lift-harness/rung/Reader") {
  static readonly layer = Layer.effect(Reader, Effect.gen(function* () {
    const sieve = yield* Sieve;
    const bank = yield* PatternBank;

    type Binding = { module: string; original: string; namespace: boolean };

    const importsOf = (program: Node): Map<string, Binding> => {
      const out = new Map<string, Binding>();
      for (const st of program.body as Node[]) {
        if (st.type !== "ImportDeclaration") continue;
        const src = st.source as Node;
        const mod = typeof src?.value === "string" ? (src.value as string) : null;
        if (!mod || !EFFECT_MODULE.test(mod)) continue;
        for (const sp of st.specifiers as Node[]) {
          const local = (sp.local as Node)?.name;
          if (typeof local !== "string") continue;
          if (sp.type === "ImportNamespaceSpecifier")
            out.set(local, { module: mod, original: local, namespace: true });
          else {
            const imp = sp.imported as Node | undefined;
            const original = typeof imp?.name === "string" ? (imp.name as string) : local;
            out.set(local, { module: mod, original, namespace: false });
          }
        }
      }
      return out;
    };

    /** Member/identifier chain as names, head first; null on anything
     * that is not a plain non-computed chain. */
    const chain = (n: Node): string[] | null => {
      const parts: string[] = [];
      let cur: Node | undefined = n;
      while (cur && cur.type === "MemberExpression" && cur.computed !== true) {
        const prop = cur.property as Node;
        if (typeof prop?.name !== "string") return null;
        parts.unshift(prop.name as string);
        cur = cur.object as Node;
      }
      if (!cur || cur.type !== "Identifier" || typeof cur.name !== "string") return null;
      parts.unshift(cur.name as string);
      return parts;
    };

    const noGeneration: Generation =
      { v4Only: [], preV4: [], legacyModules: [], verdict: "indeterminate" };
    const noRoles: Roles = { entryPoint: false, portsIn: 0, portsOut: 0, wiringHits: 0 };
    const densityOf = (source: string, spanLines: number, hits: number): Density => {
      const codeLines = source.split("\n").filter((l) => l.trim().length > 0).length;
      return {
        constructHits: hits, codeLines, spanLines,
        effectLineFraction: codeLines === 0 ? 0 : spanLines / codeLines,
        zeroCapture: hits === 0,
      };
    };

    const read = Effect.fn("Reader.read")(function* (source: string) {
      const rung1 = yield* sieve.captureSpans(source);
      if (!rung1.effectful)
        return {
          effectful: false, parsed: false, spans: [], offUniverse: [],
          generation: noGeneration, blackBox: [],
          density: densityOf(source, 0, 0), roles: noRoles, imports: [],
        } satisfies Reading;

      const { program, errors } = parseSync("reading.ts", source, {
        lang: "ts", sourceType: "module",
      } as never);
      const sieveSpanLines = rung1.spans
        .reduce((n, s) => n + (s.lineEnd - s.lineStart + 1), 0);
      if (errors.length > 0)
        return {
          effectful: true, parsed: false,
          spans: rung1.spans.map((s) => ({ ...s, constructs: [] })),
          offUniverse: [],
          generation: noGeneration, blackBox: [],
          density: densityOf(source, sieveSpanLines, 0), roles: noRoles, imports: [],
        } satisfies Reading;

      const bindings = importsOf(program as unknown as Node);
      const hits: ConstructHit[] = [];
      const blackBox: ClosureSpan[] = [];
      /** Every piece of evidence contributes to ONE product monoid; the
       * reading's rollups are its foldMap (docs/analysis-algebra.md). */
      const contribs: Contribution[] = [];
      const allImports = new Set<string>();
      for (const st of (program as unknown as Node).body as Node[]) {
        if (st.type !== "ImportDeclaration") continue;
        const v = (st.source as Node)?.value;
        if (typeof v === "string") allImports.add(v);
      }
      for (const m of new Set([...bindings.values()].map((b) => b.module)))
        if (bank.isLegacyModule(m)) contribs.push(legacyContribution(m));

      const record = (parts: string[], node: Node, depth: number): boolean => {
        const b = bindings.get(parts[0]);
        if (!b) return false;
        const path = b.namespace ? parts.slice(1) : [b.original, ...parts.slice(1)];
        const key = bank.canonical(b.module, path);
        if (key === null) {
          // the pre-v4 tripwire: the CURRENT universe refuses the chain,
          // the OLDER one explains it
          contribs.push(offContribution(
            `${b.module}.${path.join(".")}`,
            bank.preV4Canonical(b.module, path)));
          return true;
        }
        const row = bank.lookup(key);
        if (!row) return true;
        hits.push({
          construct: key, semanticClass: row.semanticClass, port: row.port,
          typicalDepth: row.typicalDepth, nodeDepth: depth,
          byteStart: typeof node.start === "number" ? node.start : 0,
          byteEnd: typeof node.end === "number" ? node.end : 0,
        });
        contribs.push(hitContribution(row, bank.generationOf(key)));
        // R7 at the source level: a function-valued argument at a
        // port-in construct is a HOST CLOSURE crossing into fiber
        // space — recorded as a black-box byte range.
        if (row.port === "in" && node.type === "CallExpression") {
          for (const a of node.arguments as Node[]) {
            if (a && (a.type === "ArrowFunctionExpression" || a.type === "FunctionExpression"))
              blackBox.push({
                construct: key,
                byteStart: typeof a.start === "number" ? a.start : 0,
                byteEnd: typeof a.end === "number" ? a.end : 0,
              });
          }
        }
        return true;
      };

      const walk = (n: unknown, depth: number): void => {
        if (!n || typeof n !== "object") return;
        const node = n as Node;
        if (Array.isArray(n)) { for (const x of n) walk(x, depth); return; }
        if (typeof node.type !== "string") return;
        if (node.type.startsWith("TSType") || node.type === "TSTypeAnnotation") return;
        // binding sites are not uses: an import specifier's local name
        // must never read as a construct hit
        if (node.type === "ImportDeclaration") return;
        if (node.type === "CallExpression") {
          const parts = chain(node.callee as Node);
          if (!(parts && record(parts, node, depth))) walk(node.callee, depth + 1);
          walk(node.arguments, depth + 1);
          return;
        }
        if (node.type === "MemberExpression" || node.type === "Identifier") {
          const parts = chain(node);
          if (parts && record(parts, node, depth)) return;
          if (node.type === "MemberExpression") {
            walk(node.object, depth + 1);
            if (node.computed === true) walk(node.property, depth + 1);
          }
          return;
        }
        for (const k of Object.keys(node)) {
          if (k === "parent" || k === "loc" || k === "range" || k === "start" || k === "end") continue;
          walk(node[k], depth + 1);
        }
      };
      walk((program as unknown as Node).body, 0);

      // annotate: the span ⋉ hit join as an ORDERED MERGE — spans are
      // disjoint ascending by construction, hits sorted once; two
      // pointers, no nested filter (docs/analysis-algebra.md §1)
      const sorted = [...hits].sort(
        (a, b) => a.byteStart - b.byteStart || a.construct.localeCompare(b.construct));
      let i = 0;
      const spans: SpanReading[] = rung1.spans.map((s) => {
        while (i < sorted.length && sorted[i].byteStart < s.byteStart) i++;
        let j = i;
        while (j < sorted.length && sorted[j].byteStart <= s.byteEnd) j++;
        const constructs = sorted.slice(i, j);
        i = j;
        return { ...s, constructs };
      });

      // reading = one combineAll into the product reducer; every
      // rollup below is a projection of the measure, and the generation
      // verdict is the lattice join — order-independence by shape
      const m = ContributionM.combineAll(contribs);
      const generation: Generation = {
        v4Only: m.v4Only, preV4: m.preV4, legacyModules: m.legacyModules,
        verdict: m.generation,
      };
      const roles: Roles = {
        entryPoint: m.portsOut > 0,
        portsIn: m.portsIn, portsOut: m.portsOut, wiringHits: m.wiringHits,
      };

      return {
        effectful: true, parsed: true, spans,
        offUniverse: m.offUniverse,
        generation,
        blackBox: blackBox.sort((a, b) => a.byteStart - b.byteStart),
        density: densityOf(source, sieveSpanLines, m.constructHits),
        roles,
        imports: [...allImports].sort(),
      } satisfies Reading;
    });

    return Reader.of({ read });
  }));
}
