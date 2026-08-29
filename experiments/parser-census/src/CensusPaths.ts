/**
 * Where the census's material lives — as a SERVICE, not as arithmetic on
 * `import.meta.url`.
 *
 * Same reasoning as the lift harness's `HarnessPaths`: depth in a directory
 * tree is a deployment fact, and an instrument that computes it from its own
 * module URL silently looks in the wrong place the moment a file moves. The
 * layout arrives from outside; a test supplies a different layer and points
 * the same capture at a corpus it built itself.
 */
import { Context, Effect, Layer, Path } from "effect";

export interface CensusPathsShape {
  /** Repository root. */
  readonly repoRoot: string;
  /** The vendored corpus bytes (gitignored; absent on most hosts). */
  readonly corpus: string;
  /** The committed corpus manifest — pins, licences, counts. */
  readonly corpusManifest: string;
  /** The committed, CLOSED label vocabulary. */
  readonly projectLabels: string;
  /** Where capture / tally / gate write. */
  readonly out: string;
}

export class CensusPaths extends Context.Service<CensusPaths, CensusPathsShape>()(
  "foldlab/parser-census/CensusPaths",
) {}

export const layerFromModuleUrl = (moduleUrl: URL): Layer.Layer<CensusPaths, never, Path.Path> =>
  Layer.effect(CensusPaths)(Effect.gen(function* () {
    const path = yield* Path.Path;
    // A module URL that is not a file URL is a build defect, not a runtime
    // condition, so it dies rather than widening every caller's error type.
    const src = yield* path.fromFileUrl(moduleUrl).pipe(Effect.orDie);
    const pkg = path.join(src, "..");                 // …/experiments/parser-census
    const repoRoot = path.join(pkg, "../..");         // …/foldlab
    return CensusPaths.of({
      repoRoot,
      corpus: path.join(repoRoot, "corpus"),
      corpusManifest: path.join(pkg, "corpus-manifest.json"),
      projectLabels: path.join(pkg, "project-labels.json"),
      out: path.join(pkg, "out"),
    });
  }));

/** The default layout for this checkout. */
export const layer: Layer.Layer<CensusPaths, never, Path.Path> =
  layerFromModuleUrl(new URL(".", import.meta.url));
