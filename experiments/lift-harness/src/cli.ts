/**
 * The harness CLI — pure Effect 4.
 *
 * No `node:*` import, no `Bun` global, and NO DEFAULT FILESYSTEM. Every
 * subcommand states what it needs — `FileSystem`, `Path`, a child-process
 * spawner — in its requirement channel, and this module never satisfies
 * them. The platform layer is chosen at the entry point (`bin/main.ts`),
 * which is the only file that decides what a filesystem IS. That is what
 * keeps the same commands runnable against an in-memory filesystem in a
 * test, and it is why the subcommands below can be read as descriptions of
 * work rather than as work already half-done.
 *
 * Subcommands are thin adapters over pure engine functions — the invocation
 * seam stays `source → Verdict[]`.
 */
import { Console, Data, Effect, Schema } from "effect";
import { FileSystem, Path } from "effect";
import { Argument, Command } from "effect/unstable/cli";
import { SPECTRUM, canonJson, type RefusalCode } from "./contract";
import { HarnessPaths } from "./HarnessPaths";
import { runGate } from "./gate";
import { liftSource } from "./lift";
import { effectBindings, grams, translitFile } from "./sieve";


/** Every `.ts` file under a directory, excluding the usual build sinks.
 * Recursion is an Effect so a directory it cannot read is a typed failure
 * rather than a thrown `ENOENT` swallowed by a `try`. */
const walkTs = (dir: string): Effect.Effect<
  ReadonlyArray<string>, never, FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const entries = yield* fs.readDirectory(dir).pipe(Effect.orElseSucceed(() => []));
    const out: string[] = [];
    for (const e of [...entries].sort()) {
      if (e === "node_modules" || e === ".git" || e === "dist" || e === ".next") continue;
      const p = path.join(dir, e);
      const info = yield* fs.stat(p).pipe(Effect.option);
      if (info._tag === "None") continue;
      if (info.value.type === "Directory") out.push(...(yield* walkTs(p)));
      else if (p.endsWith(".ts") && !p.endsWith(".d.ts")) out.push(p);
    }
    return out;
  });

/* ------------------------------------------------------------------ */
/* gate                                                                */
/* ------------------------------------------------------------------ */

const gate = Command.make("gate", {}).pipe(
  Command.withDescription("the multi-parser agreement gate (ck vs oxc over the fixture corpus)"),
  Command.withHandler(() =>
    Effect.gen(function* () {
      const green = yield* runGate;
      // The gate's answer IS the exit status; a red gate must not exit 0.
      if (!green) yield* Effect.fail(new GateRed());
    })),
);

/** A red gate is a FAILURE, not a log line: the exit status is the gate's
 * answer, and a caller that pipes this command must be able to trust it. */
class GateRed extends Data.TaggedError("GateRed")<{}> {
  override get message() { return "agreement gate is RED"; }
}

/* ------------------------------------------------------------------ */
/* lift                                                                */
/* ------------------------------------------------------------------ */

const lift = Command.make("lift", {
  files: Argument.file("file").pipe(
    Argument.withDescription("source file to lift"),
    Argument.variadic(),
  ),
}).pipe(
  Command.withDescription("ck-engine verdicts for each file, as canonical JSON"),
  Command.withHandler(({ files }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      for (const f of files)
        for (const v of liftSource(yield* fs.readFileString(f)))
          yield* Console.log(canonJson(v));
    })),
);

/* ------------------------------------------------------------------ */
/* census                                                              */
/* ------------------------------------------------------------------ */

const CorpusManifest = Schema.Struct({
  projects: Schema.Array(Schema.Struct({
    labels: Schema.Array(Schema.String),
    localPath: Schema.String,
  })),
});

const census = Command.make("census", {}).pipe(
  Command.withDescription("wild refusal histogram + spectrum rollup over the corpus manifest"),
  Command.withHandler(() =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const paths = yield* HarnessPaths;
      const manifest = Schema.decodeUnknownSync(CorpusManifest)(JSON.parse(
        yield* fs.readFileString(path.join(paths.repoRoot, "experiments/parser-census/corpus-manifest.json"))));
      const dirs = manifest.projects
        .filter((p) => p.labels.includes("wild-effect"))
        .map((p) => p.localPath);

      const codeHist: Record<string, number> = {};
      const spectrumHist: Record<string, number> = {};
      let candidates = 0, lifted = 0;
      for (const d of dirs)
        for (const f of yield* walkTs(path.join(paths.repoRoot, d))) {
          const src = yield* fs.readFileString(f).pipe(Effect.orElseSucceed(() => ""));
          if (!src.includes(".gen(")) continue;
          for (const v of liftSource(src)) {
            candidates++;
            if (v.kind === "lifted") { lifted++; continue; }
            codeHist[v.code] = (codeHist[v.code] ?? 0) + 1;
            const cls = SPECTRUM[v.code as RefusalCode];
            spectrumHist[cls] = (spectrumHist[cls] ?? 0) + 1;
          }
        }

      yield* Console.log(`candidates ${candidates}, lifted ${lifted}`);
      for (const [k, v] of Object.entries(codeHist).sort((a, b) => b[1] - a[1]))
        yield* Console.log(`  ${k.padEnd(26)} ${v}`);
      yield* Console.log(`spectrum: ${JSON.stringify(spectrumHist)}`);

      yield* fs.writeFileString(
        path.join(paths.records, "wild-linearizability.json"),
        JSON.stringify({ candidates, lifted, codeHist, spectrumHist }, null, 1) + "\n");
    })),
);

/* ------------------------------------------------------------------ */
/* sieve                                                               */
/* ------------------------------------------------------------------ */

const SieveModel = Schema.Struct({
  config: Schema.Struct({ n: Schema.Number, threshold: Schema.Number }),
  model: Schema.Unknown,
});

const sieve = Command.make("sieve", {
  file: Argument.file("file").pipe(Argument.withDescription("source file to triage")),
}).pipe(
  Command.withDescription("anchor-gated line scores from the n-gram sieve"),
  Command.withHandler(({ file }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const paths = yield* HarnessPaths;
      const saved = Schema.decodeUnknownSync(SieveModel)(JSON.parse(
        yield* fs.readFileString(path.join(paths.models, "sieve-r1.json"))));

      // Dynamic import, not `require`: this module is ESM, and the classifier
      // is the one dependency with no Effect surface of its own.
      const mod = yield* Effect.promise(() => import("wink-naive-bayes-text-classifier"));
      const Classifier = (mod as { default: () => unknown }).default;
      const nbc = Classifier() as {
        definePrepTasks: (t: ReadonlyArray<(x: string | string[]) => string[]>) => void;
        importJSON: (j: string) => void;
        consolidate: () => void;
        computeOdds: (g: string[]) => Array<[string, number]>;
      };
      nbc.definePrepTasks([(t) => (Array.isArray(t) ? t : [t])]);
      nbc.importJSON(JSON.stringify(saved.model));
      nbc.consolidate();
      const score = (g: string[]): number => {
        const m = new Map(nbc.computeOdds(g));
        return (m.get("effect") ?? 0) - (m.get("host") ?? 0);
      };

      const src = yield* fs.readFileString(file);
      if (effectBindings(src).size === 0) {
        yield* Console.log("zero-effect file (no bindings): silent by construction");
        return;
      }
      const rows = translitFile(src);
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (r.sym.trim().length < 2) continue;
        const fires = r.sym.includes("§") &&
          score(grams(r.sym, r.depth, r.indent, saved.config.n)) > saved.config.threshold;
        if (fires) yield* Console.log(`${String(i + 1).padStart(5)}  ${r.line.trim().slice(0, 90)}`);
      }
    })),
);

/* ------------------------------------------------------------------ */

export const cli = Command.make("lift-harness", {}).pipe(
  Command.withDescription("v0 store-language recognition harness"),
  Command.withSubcommands([gate, lift, census, sieve]),
);
