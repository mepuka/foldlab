/**
 * Rung 1 as a service — the TRAINED classifier behind a Layer.
 *
 * The instrument is the NB sieve (wink-naive-bayes over char n-grams of
 * the transliterated source, `models/sieve-r1.json` — the model whose
 * training run is the fidelity claim, ~93% capture on the eval set).
 * This service wraps INVOCATION only; the linearization and feature
 * machinery stays in the pure `../sieve` module, exactly where it was.
 *
 * Discipline (register P, confirmed by operator ruling): the sieve is an
 * ANNOTATOR, never a gatekeeper. Every anchored span is emitted with its
 * score; `fired` records the threshold verdict, and rung 2 decides what
 * to do with it. Nothing here deletes a candidate.
 *
 * SPANS ARE THE JOIN KEY between rungs: each span carries line and byte
 * ranges so rung 2's AST pass (node ranges) links to rung 1's capture by
 * containment. Depth (the bracket-height flow-control discriminator)
 * rides along per span from the linearization.
 */
import { createRequire } from "node:module";
import { Context, Effect, Layer } from "effect";
import savedModel from "../../models/sieve-r1.json" with { type: "json" };
import { effectBindings, grams, translitFile } from "../sieve";

/** One rung-1 capture: a maximal run of anchored lines. Lines are
 * 1-based inclusive; bytes are UTF-16 code-unit offsets into the source
 * (the same unit oxc ranges use on this host). */
export type SieveSpan = {
  readonly lineStart: number;
  readonly lineEnd: number;
  readonly byteStart: number;
  readonly byteEnd: number;
  /** Best per-line NB odds within the span. */
  readonly score: number;
  /** score > threshold — the model's own verdict, never a filter. */
  readonly fired: boolean;
  /** Bracket depth at span start and the maximum within it — the
   * flow-control discriminator, straight from the linearization. */
  readonly depthStart: number;
  readonly depthMax: number;
};

export type SieveReading = {
  /** Rung 0: zero-effect files are decided by import resolution, not by
   * the model — `effectful: false` means no bindings and no spans. */
  readonly effectful: boolean;
  readonly spans: readonly SieveSpan[];
};

export class Sieve extends Context.Service<Sieve, {
  readonly captureSpans: (source: string) => Effect.Effect<SieveReading>;
}>()("lift-harness/rung/Sieve") {
  static readonly layer = Layer.sync(Sieve, () => {
    // The trained model, exactly as `cli.ts sieve` loads it: wink's CJS
    // factory via createRequire (the suite's ESM worker has no `require`).
    const require = createRequire(import.meta.url);
    const Classifier = require("wink-naive-bayes-text-classifier") as () => {
      definePrepTasks: (t: Array<(x: string | string[]) => string[]>) => void;
      importJSON: (j: string) => void;
      consolidate: () => void;
      computeOdds: (g: string[]) => [string, number][];
    };
    const saved = savedModel as unknown as {
      model: unknown;
      config: { n: number; threshold: number };
    };
    const nbc = Classifier();
    nbc.definePrepTasks([(t) => (Array.isArray(t) ? t : [t])]);
    nbc.importJSON(JSON.stringify(saved.model));
    nbc.consolidate();
    const score = (g: string[]): number => {
      const m = new Map(nbc.computeOdds(g));
      return (m.get("effect") ?? 0) - (m.get("host") ?? 0);
    };

    const captureSpans = Effect.fn("Sieve.captureSpans")(function* (source: string) {
      if (effectBindings(source).size === 0)
        return { effectful: false, spans: [] } satisfies SieveReading;
      const recs = translitFile(source);
      // per-line byte offsets (line i starts at offsets[i])
      const rawLines = source.split("\n");
      const offsets: number[] = [0];
      for (const l of rawLines) offsets.push(offsets[offsets.length - 1] + l.length + 1);

      const spans: SieveSpan[] = [];
      let open: {
        lineStart: number; score: number; depthStart: number; depthMax: number;
      } | null = null;
      const close = (lastLine: number): void => {
        if (!open) return;
        spans.push({
          lineStart: open.lineStart,
          lineEnd: lastLine,
          byteStart: offsets[open.lineStart - 1],
          byteEnd: Math.min(offsets[lastLine] - 1, source.length),
          score: open.score,
          fired: open.score > saved.config.threshold,
          depthStart: open.depthStart,
          depthMax: open.depthMax,
        });
        open = null;
      };
      recs.forEach((r, i) => {
        const line = i + 1;
        const anchored = r.sym.includes("§") && r.sym.trim().length >= 2;
        if (!anchored) { close(line - 1); return; }
        const s = score(grams(r.sym, r.depth, r.indent, saved.config.n));
        if (open === null)
          open = { lineStart: line, score: s, depthStart: r.depth, depthMax: r.depth };
        else {
          open.score = Math.max(open.score, s);
          open.depthMax = Math.max(open.depthMax, r.depth);
        }
      });
      close(recs.length);
      return { effectful: true, spans } satisfies SieveReading;
    });

    return Sieve.of({ captureSpans });
  });
}
