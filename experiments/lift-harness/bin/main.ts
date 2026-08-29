/**
 * The entry point — and the ONLY file that decides what the world is.
 *
 * Everything under `src/` names its requirements (`FileSystem`, `Path`,
 * `ChildProcessSpawner`, `Stdio`, `Terminal`, `HarnessPaths`) and satisfies
 * none of them. That separation is the point of the refactor: the commands
 * describe work, this file chooses the world the work runs in. A test that
 * wants an in-memory filesystem, or a fixture corpus it built itself,
 * provides different layers here and changes nothing else — and a Lean
 * walker joining the gate does the same.
 *
 *   bun bin/main.ts gate                 the multi-parser agreement gate
 *   bun bin/main.ts lift <file...>       ck-engine verdicts, canonical JSON
 *   bun bin/main.ts census               wild refusal histogram + spectrum
 *   bun bin/main.ts sieve <file>         anchor-gated line scores
 */
import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { Command } from "effect/unstable/cli";
import { cli } from "../src/cli";
import * as HarnessPaths from "../src/HarnessPaths";

// The world: platform services, plus where this checkout keeps its material.
// `HarnessPaths.layer` is the one place `../..` is computed, and it is
// swapped wholesale rather than edited.
const world = Layer.mergeAll(
  BunServices.layer,
  HarnessPaths.layer.pipe(Layer.provide(BunServices.layer)),
);

// Arguments come from the `Stdio` service, not from `process.argv`: a node
// global would be exactly the kind of ambient dependency this refactor is
// removing.
Command.run(cli, { version: "0.0.0" }).pipe(
  Effect.provide(world),
  BunRuntime.runMain,
);
