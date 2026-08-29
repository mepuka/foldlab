/**
 * Rung 2's data — the enumerated construct universe as a service.
 *
 * The bank is the EXHAUSTIVE enumeration of the pinned `effect`
 * package's public constructs (`models/bank-r0.json`, regenerated
 * byte-identically by `bun src/genbank.ts`), joined with the seeded
 * semantic taxonomy (`models/taxonomy-r0.json` — judgment data, marked
 * seeded until measured). Because the universe is CLOSED under the pin,
 * "the constructs we cannot model" is a computed complement, never a
 * guess — `complement()` returns it.
 *
 * The service is a lookup, not a recognizer: rung 2 resolves chains to
 * construct keys and asks the bank what they are. Barrel spellings
 * canonicalize onto their module (`effect.Effect.gen` and
 * `effect/Effect.gen` are one construct), driven by the bank's own
 * module set — data, not a hand table.
 */
import { Context, Layer } from "effect";
import bankJson from "../../models/bank-r0.json" with { type: "json" };
import bankV3Json from "../../models/bank-v3.json" with { type: "json" };
import taxonomyJson from "../../models/taxonomy-r0.json" with { type: "json" };

export type BankRow = {
  /** Canonical construct key: `<module>.<export>`. */
  readonly construct: string;
  readonly module: string;
  readonly export: string;
  /** Runtime kind under the pin (`typeof`). */
  readonly kind: string;
  readonly stability: string;
  /** Semantic class — taxonomy join; "unseeded" is an honest hole. */
  readonly semanticClass: string;
  /** The fiber-space boundary (R7): "in" captures a host closure into
   * fiber space (a black-box region), "out" runs programs on the host
   * (the entry-point signal), "interior" is fiber-space algebra. */
  readonly port: "in" | "out" | "interior";
  /** Typical AST depth for the class; basis "seeded" until measured. */
  readonly typicalDepth: number;
  readonly depthBasis: string;
};

type BankFile = {
  pin: string;
  modules: { module: string; stability: string; exports: Record<string, string> }[];
};
type TaxonomyFile = {
  defaultsByStability: Record<string, string>;
  fallback: string;
  legacyModulePatterns: string[];
  ports: Record<string, string>;
  byModule: Record<string, string>;
  byConstruct: Record<string, string>;
  depthSeedsByClass: Record<string, { typicalDepth: number; basis: string }>;
};

export class PatternBank extends Context.Service<PatternBank, {
  readonly pin: string;
  /** Every construct key in the universe, sorted. */
  readonly universe: readonly string[];
  /** Bank row for a canonical construct key, if the universe has it. */
  readonly lookup: (construct: string) => BankRow | undefined;
  /** Canonicalize a resolved chain onto the universe: barrel members
   * re-home to their module when the bank knows it. Returns the
   * canonical construct key, or null when the chain leaves the pin's
   * universe entirely. */
  readonly canonical: (module: string, path: readonly string[]) => string | null;
  /** The enumerated complement of a covered set — the constructs no
   * pattern models yet. */
  readonly complement: (covered: ReadonlySet<string>) => readonly string[];
  /** Generation canaries as SET DIFFERENCE against the older pin's
   * enumerated universe: "v4-only" marks current-generation code,
   * "shared" discriminates nothing. */
  readonly generationOf: (construct: string) => "v4-only" | "shared";
  /** Canonicalize against the OLDER pin's universe — the pre-v4
   * tripwire for chains the current universe refuses. */
  readonly preV4Canonical: (module: string, path: readonly string[]) => string | null;
  /** Import specifiers that are themselves generation canaries. */
  readonly isLegacyModule: (module: string) => boolean;
}>()("lift-harness/rung/PatternBank") {
  static readonly layer = Layer.sync(PatternBank, () => {
    const bank = bankJson as unknown as BankFile;
    const tax = taxonomyJson as unknown as TaxonomyFile;

    const classOf = (construct: string, module: string, stability: string): string =>
      tax.byConstruct[construct]
        ?? tax.byModule[module]
        ?? tax.defaultsByStability[stability]
        ?? tax.fallback;

    const rows = new Map<string, BankRow>();
    const moduleSet = new Set(bank.modules.map((m) => m.module));
    for (const m of bank.modules) {
      for (const [name, kind] of Object.entries(m.exports)) {
        const construct = `${m.module}.${name}`;
        const semanticClass = classOf(construct, m.module, m.stability);
        const depth = tax.depthSeedsByClass[semanticClass]
          ?? tax.depthSeedsByClass[tax.fallback];
        const port = tax.ports[construct];
        rows.set(construct, {
          construct, module: m.module, export: name, kind,
          stability: m.stability, semanticClass,
          port: port === "in" ? "in" : port === "out" ? "out" : "interior",
          typicalDepth: depth.typicalDepth, depthBasis: depth.basis,
        });
      }
    }
    const universe = [...rows.keys()].sort();

    // the older pin's universe, same key discipline — canaries by set
    // difference, never by heuristics
    const v3 = bankV3Json as unknown as BankFile;
    const v3Constructs = new Set<string>();
    const v3Modules = new Set(v3.modules.map((m) => m.module));
    for (const m of v3.modules)
      for (const name of Object.keys(m.exports)) v3Constructs.add(`${m.module}.${name}`);

    const canonicalIn = (
      constructs: { has: (k: string) => boolean }, modules: Set<string>,
    ) => {
      const go = (module: string, path: readonly string[]): string | null => {
        // barrel member: `effect` + [Layer, effect] re-homes to effect/Layer.effect
        if (path.length >= 2 && modules.has(`${module}/${path[0]}`))
          return go(`${module}/${path[0]}`, path.slice(1));
        if (path.length === 0) return modules.has(module) ? module : null;
        const key = `${module}.${path[0]}`;
        return constructs.has(key) ? key : null;
      };
      return go;
    };
    const canonical = canonicalIn(rows, moduleSet);
    const preV4Canonical = canonicalIn(v3Constructs, v3Modules);

    const legacy = tax.legacyModulePatterns.map((p) => new RegExp(p));

    return PatternBank.of({
      pin: bank.pin,
      universe,
      lookup: (construct) => rows.get(construct),
      canonical,
      complement: (covered) => universe.filter((c) => !covered.has(c)),
      generationOf: (construct) => (v3Constructs.has(construct) ? "shared" : "v4-only"),
      preV4Canonical,
      isLegacyModule: (module) => legacy.some((r) => r.test(module)),
    });
  });
}
