/**
 * The corpus, as the committed manifest describes it — and the honest
 * account of what is and is not on this host.
 *
 * `corpus/` is gitignored (`.gitignore:12`: "Vendored corpus bytes: never
 * committed — the committed artifact is
 * experiments/parser-census/corpus-manifest.json"), so ABSENCE IS THE
 * COMMON CASE and it is a reported state, never a crash and never a red
 * gate. `presence` below is the whole of that policy, and the CLI's
 * `--require-corpus` is the whole of its escape hatch.
 *
 * The label vocabulary is CLOSED (`project-labels.json:2`: "the label
 * vocabulary is closed — extend it here first, never ad hoc in an
 * experiment"). This module enforces that literally: a `--slice` outside
 * the committed vocabulary is refused, and so is a slice a project does not
 * carry. An experiment that could invent a stratum could not produce
 * comparable statistics, which is the one thing the labels file exists for.
 */
import { Data, Effect, FileSystem, Path, Schema } from "effect";
import { CensusPaths } from "./CensusPaths";

export const CorpusProject = Schema.Struct({
  id: Schema.String,
  pin: Schema.String,
  labels: Schema.Array(Schema.String),
  localPath: Schema.String,
});
export type CorpusProject = typeof CorpusProject.Type;

export const CorpusManifest = Schema.Struct({
  corpusRoot: Schema.String,
  projects: Schema.Array(CorpusProject),
});
export type CorpusManifest = typeof CorpusManifest.Type;

export const ProjectLabels = Schema.Struct({
  labelVocabulary: Schema.Record(Schema.String, Schema.String),
});
export type ProjectLabels = typeof ProjectLabels.Type;

export class BadSelection extends Data.TaggedError("BadSelection")<{
  readonly reason: string;
}> {
  override get message() { return this.reason; }
}

export class CorpusAbsent extends Data.TaggedError("CorpusAbsent")<{
  readonly at: string;
}> {
  override get message() {
    return `corpus absent at ${this.at} — a census was demanded (--require-corpus, ` +
      `or an explicit --project) and cannot be run`;
  }
}

export const readCorpusManifest = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const paths = yield* CensusPaths;
  return Schema.decodeUnknownSync(CorpusManifest)(
    JSON.parse(yield* fs.readFileString(paths.corpusManifest)));
}).pipe(Effect.orDie);

export const readLabelVocabulary = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const paths = yield* CensusPaths;
  const labels = Schema.decodeUnknownSync(ProjectLabels)(
    JSON.parse(yield* fs.readFileString(paths.projectLabels)));
  return new Set(Object.keys(labels.labelVocabulary));
}).pipe(Effect.orDie);

/** Is the corpus root on this host at all? */
export const corpusPresent = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const paths = yield* CensusPaths;
  return yield* fs.exists(paths.corpus);
});

/** The pin the checkout is actually at.
 *
 * The manifest's `fetchMethod` is "git init + fetch --depth 1 origin <pin> +
 * checkout <pin>", which leaves a DETACHED head — so `.git/HEAD` holds the
 * raw object id and the pin check is a file read. No `git` process is
 * spawned: the census must not depend on a git binary to state which bytes
 * it measured. `null` means the checkout carries no readable head, which is
 * reported rather than treated as a match.
 */
export const observedPin = (projectDir: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const head = yield* fs.readFileString(path.join(projectDir, ".git", "HEAD"))
      .pipe(Effect.orElseSucceed(() => ""));
    const t = head.trim();
    return /^[0-9a-f]{40}$/.test(t) ? t : null;
  });

/** Resolve `--project` / `--slice` against the committed manifest and the
 * CLOSED label vocabulary. Returns the (project, slice) pairs to capture. */
export const select = (projectId: string, slice: string) =>
  Effect.gen(function* () {
    const manifest = yield* readCorpusManifest;
    const vocabulary = yield* readLabelVocabulary;

    if (slice !== "all" && !vocabulary.has(slice))
      return yield* new BadSelection({
        reason: `slice "${slice}" is not in the CLOSED label vocabulary of ` +
          `project-labels.json (${[...vocabulary].sort().join(", ")}); ` +
          `extend the labels file first, never ad hoc here`,
      });

    const projects = projectId === "all"
      ? manifest.projects
      : manifest.projects.filter((p) => p.id === projectId);
    if (projects.length === 0)
      return yield* new BadSelection({
        reason: `no project "${projectId}" in corpus-manifest.json`,
      });

    const pairs: Array<{ project: CorpusProject; slice: string }> = [];
    for (const project of projects)
      for (const label of [...project.labels].sort())
        if (slice === "all" || label === slice) pairs.push({ project, slice: label });

    if (pairs.length === 0)
      return yield* new BadSelection({
        reason: projectId === "all"
          ? `no project in corpus-manifest.json carries the label "${slice}"`
          : `project "${projectId}" does not carry the label "${slice}" ` +
            `(it carries ${projects[0].labels.join(", ")})`,
      });
    return pairs;
  });

/** The TypeScript sources of one project.
 *
 * SLICE GLOBS ARE NOT APPLIED, and that is a recorded limitation rather than
 * an omission: `project-labels.json`'s `slices` entries are PROSE, not
 * machine globs — "src/compiler/** (sampled)", "content/** code snippets and
 * app src/**", "types/** (stratified random sample of packages …)". An
 * instrument that guessed a glob semantics out of them would be minting a
 * sampling design the labels file never committed to, and the histogram
 * would stop being a function of committed state. So a slice is the whole
 * project tree, attributed to that label, and every summary says so.
 *
 * `.d.ts` files ARE included, unlike the harness's own walk: `dts-only` is a
 * committed stratum ("pure declaration syntax … exercises the type-level
 * grammar surface including variance annotations") and a census that
 * skipped them could not populate it.
 */
export const projectFiles = (dir: string): Effect.Effect<
  ReadonlyArray<string>, never, FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const entries = yield* fs.readDirectory(dir).pipe(Effect.orElseSucceed(() => []));
    const out: string[] = [];
    for (const e of [...entries].sort()) {
      if (SKIP_DIRS.has(e)) continue;
      const p = path.join(dir, e);
      const info = yield* fs.stat(p).pipe(Effect.option);
      if (info._tag === "None") continue;
      if (info.value.type === "Directory") out.push(...(yield* projectFiles(p)));
      else if (TS_EXT.some((x) => p.endsWith(x))) out.push(p);
    }
    return out;
  });

/** Vendored and build sinks. A census that counted a project's `node_modules`
 * would be counting its dependencies' declarations as its own. */
const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "out", ".next", ".turbo", ".cache",
  "coverage", ".output", ".svelte-kit", ".vercel",
]);

const TS_EXT = [".ts", ".tsx", ".mts", ".cts"];
