/**
 * The census CLI — pure Effect, no default filesystem.
 *
 * Same discipline as the lift harness's `cli.ts`: every subcommand states
 * what it needs (`FileSystem`, `Path`, `CensusPaths`) and this module
 * satisfies none of them. `bin/main.ts` is the only file that decides what
 * the world is.
 *
 * THE ABSENT-CORPUS RULE, stated once and implemented here.
 *
 * `corpus/` is gitignored and absent on most hosts. Three outcomes, never
 * two:
 *
 *   NOT RUN   nothing to measure, and nobody asked for a measurement.
 *             Printed plainly, exit 0. A missing corpus is the normal state
 *             of a fresh clone and must not be reported as a failure.
 *   RAN       measured; the gate then says green or red on the evidence.
 *   DEMANDED  a caller named a specific `--project` or `--slice`, or passed
 *             `--require-corpus`, and the corpus is not there. Exit non-zero:
 *             asking for a census of something absent is an error about the
 *             request, not a state of the world.
 *
 * The rule is the same one `gate.ts` in the lift harness applies to its
 * fixture lane ("a missing fixture lane is a REPORTED state, never a crash…
 * 'I could not check' must not be mistaken for either green or red"), with
 * the demand escape hatch added because a census, unlike a gate, is
 * something a caller can explicitly ask for.
 */
import { Console, Data, Effect, FileSystem, Path } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import { captureSlice } from "./capture";
import { CensusPaths } from "./CensusPaths";
import { corpusPresent, select } from "./corpus";
import { runGate } from "./gate";
import { writeDeclCounts } from "./manifest";
import { runTally } from "./tally";

class GateRed extends Data.TaggedError("GateRed")<{}> {
  override get message() { return "census gate is RED"; }
}

class CorpusDemanded extends Data.TaggedError("CorpusDemanded")<{
  readonly at: string;
}> {
  override get message() {
    return `a census was demanded but the corpus is absent at ${this.at}`;
  }
}

const projectFlag = Flag.string("project").pipe(
  Flag.withDescription("project id from corpus-manifest.json, or `all`"),
  Flag.withDefault("all"),
);

const sliceFlag = Flag.string("slice").pipe(
  Flag.withDescription("label from the CLOSED vocabulary of project-labels.json, or `all`"),
  Flag.withDefault("all"),
);

const requireCorpus = Flag.boolean("require-corpus").pipe(
  Flag.withDescription("treat an absent corpus as a failure rather than a reported state"),
  Flag.withDefault(false),
);

/* ------------------------------------------------------------------ */
/* capture                                                             */
/* ------------------------------------------------------------------ */

const capture = Command.make("capture", {
  project: projectFlag,
  slice: sliceFlag,
  requireCorpus,
}).pipe(
  Command.withDescription("run both legs over one labelled slice; one row per declaration"),
  Command.withHandler(({ project, slice, requireCorpus }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const paths = yield* CensusPaths;
      // Naming a project or a slice IS demanding a census of it.
      const demanded = requireCorpus || project !== "all" || slice !== "all";

      if (!(yield* corpusPresent)) {
        yield* Console.log(`CENSUS NOT RUN — corpus absent at ${paths.corpus}`);
        yield* Console.log(
          "  corpus/ is gitignored and never committed; corpus-manifest.json's " +
          "`fetchMethod` records how to materialize it");
        if (demanded) return yield* new CorpusDemanded({ at: paths.corpus });
        return;
      }

      const pairs = yield* select(project, slice);
      let ran = 0;
      for (const p of pairs) {
        const dir = path.join(paths.repoRoot, p.project.localPath);
        if (!(yield* fs.exists(dir))) {
          yield* Console.log(`  SKIP ${p.project.id}/${p.slice} — not on this host (${p.project.localPath})`);
          if (demanded) return yield* new CorpusDemanded({ at: dir });
          continue;
        }
        yield* captureSlice(p.project, p.slice);
        ran++;
      }
      yield* Console.log(`captured ${ran}/${pairs.length} slice(s) into ${paths.out}`);
    })),
);

/* ------------------------------------------------------------------ */
/* tally                                                               */
/* ------------------------------------------------------------------ */

const tally = Command.make("tally", {}).pipe(
  Command.withDescription("fold captured rows into out/histogram.json"),
  Command.withHandler(() => runTally),
);

/* ------------------------------------------------------------------ */
/* gate                                                                */
/* ------------------------------------------------------------------ */

const gate = Command.make("gate", { requireCorpus }).pipe(
  Command.withDescription("twin agreement, parse disjointness, and pin verification"),
  Command.withHandler(({ requireCorpus }) =>
    Effect.gen(function* () {
      const green = yield* runGate;
      // A red gate is a FAILURE, not a log line: the exit status is the
      // gate's answer and a caller that pipes this must be able to trust it.
      if (green === false) return yield* new GateRed();
      if (green === null && requireCorpus) {
        const paths = yield* CensusPaths;
        return yield* new CorpusDemanded({ at: paths.corpus });
      }
    })),
);

/* ------------------------------------------------------------------ */
/* manifest                                                            */
/* ------------------------------------------------------------------ */

const manifest = Command.make("manifest", {}).pipe(
  Command.withDescription(
    "write the measured declCounts back into corpus-manifest.json (green slices only)"),
  Command.withHandler(() => writeDeclCounts),
);

/* ------------------------------------------------------------------ */

export const cli = Command.make("parser-census", {}).pipe(
  Command.withDescription("the parser-construct census instrument"),
  Command.withSubcommands([capture, tally, gate, manifest]),
);
