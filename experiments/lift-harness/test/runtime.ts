/**
 * The world the SUITE runs in.
 *
 * `src/` satisfies none of its own requirements, so somebody has to choose
 * a platform — and for the suite that platform is node, because vitest
 * executes test bodies in a node worker even when the runner is launched
 * with `bun x` (verified: no `Bun` global, `process.versions.node` set).
 * The CLI's entry point chooses bun. Same code, two worlds, which is the
 * property the refactor was for.
 *
 * The corpus is read HERE, through the same `FileSystem` service the gate
 * uses, so no tier needs a `node:fs` import to sweep it.
 */
import { NodeServices } from "@effect/platform-node";
import { Effect, FileSystem, Layer, Path } from "effect";
import * as HarnessPaths from "../src/HarnessPaths";
import { fixtureFiles, hasFixtureLane } from "../src/gate";

/** Platform services plus this checkout's layout. */
export const world = Layer.mergeAll(
  NodeServices.layer,
  HarnessPaths.layer.pipe(Layer.provide(NodeServices.layer)),
);

export type World = Layer.Success<typeof world>;

/** Run a harness effect in the suite's world. */
export const run = <A, E>(effect: Effect.Effect<A, E, World>): Promise<A> =>
  Effect.runPromise(Effect.provide(effect, world) as Effect.Effect<A, E, never>);

/** Resolved once, at module load, because vitest's `runIf`/`skipIf` need a
 * plain boolean before any test body runs. Top-level await is the honest
 * way to get one out of an Effect — the alternative is a synchronous
 * filesystem call, which is exactly what this refactor removed. */
export const LANE: boolean = await run(hasFixtureLane);

/** Where this checkout keeps its material, for assertions about layout. */
export const PATHS = await run(Effect.gen(function* () {
  return yield* HarnessPaths.HarnessPaths;
}));

export type Fixture = { readonly path: string; readonly name: string; readonly src: string };

/** The by-construction corpus, read once through the `FileSystem` service. */
export const FIXTURES: ReadonlyArray<Fixture> = await run(Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const files = yield* fixtureFiles;
  const out: Fixture[] = [];
  for (const f of files)
    out.push({ path: f, name: path.basename(f), src: yield* fs.readFileString(f) });
  return out;
}).pipe(Effect.orDie));
