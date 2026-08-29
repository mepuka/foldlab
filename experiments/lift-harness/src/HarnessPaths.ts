/**
 * Where the harness's material lives — as a SERVICE, not as arithmetic on
 * `import.meta.url`.
 *
 * The gate used to compute `../../../.staging/fixture-gen/ts-leg/fixtures`
 * from its own module URL. That made the gate's correctness depend on how
 * deep `gate.ts` sits in the tree: move the file, and the gate silently
 * looks in the wrong place — or, worse, finds nothing and reports a missing
 * lane. Depth in a directory tree is a deployment fact, and the gate has no
 * business knowing it.
 *
 * So the locations arrive from outside. `gate.ts` asks for them; this
 * module's default layer resolves them for a checkout; a test supplies its
 * own and points the same gate at a fixture set it built in memory. The
 * seam is the requirement channel, exactly as it is for `FileSystem`.
 */
import { Context, Effect, Layer, Path } from "effect";

export interface HarnessPathsShape {
  /** The by-construction fixture corpus the agreement gate consumes. */
  readonly fixtures: string;
  /** The oxlint binary that runs the oxc leg. */
  readonly oxlintBin: string;
  /** The oxlint config that loads the dslv0 plugin. */
  readonly oxlintConfig: string;
  /** Generated evidence records (`records/*.json`). */
  readonly records: string;
  /** The sieve's pinned model directory. */
  readonly models: string;
  /** Repository root, for the wild-corpus census. */
  readonly repoRoot: string;
}

export class HarnessPaths extends Context.Service<HarnessPaths, HarnessPathsShape>()(
  "foldlab/lift-harness/HarnessPaths",
) {}

/**
 * The layout of a checkout, resolved once from this module's own URL.
 *
 * The `../..` arithmetic still exists — it has to live somewhere — but it
 * lives HERE, in the one module whose job is the layout, and it is replaced
 * wholesale by providing a different layer. Nothing downstream computes a
 * path again.
 */
export const layerFromModuleUrl = (moduleUrl: URL): Layer.Layer<HarnessPaths, never, Path.Path> =>
  Layer.effect(HarnessPaths)(Effect.gen(function* () {
    const path = yield* Path.Path;
    // A module URL that is not a file URL is a build defect, not a runtime
    // condition, so it dies rather than widening every caller's error type.
    const src = yield* path.fromFileUrl(moduleUrl).pipe(Effect.orDie);
    const pkg = path.join(src, "..");                        // …/experiments/lift-harness
    const repoRoot = path.join(pkg, "../..");                // …/foldlab
    return HarnessPaths.of({
      fixtures: path.join(repoRoot, ".staging/fixture-gen/ts-leg/fixtures"),
      oxlintBin: path.join(pkg, "node_modules/.bin/oxlint"),
      oxlintConfig: path.join(pkg, ".oxlintrc.json"),
      records: path.join(pkg, "records"),
      models: path.join(pkg, "models"),
      repoRoot,
    });
  }));

/** The default layout for this checkout. */
export const layer: Layer.Layer<HarnessPaths, never, Path.Path> =
  layerFromModuleUrl(new URL(".", import.meta.url));
