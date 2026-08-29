/**
 * The entry point — and the ONLY file that decides what the world is.
 *
 *   bun bin/main.ts capture --project <id> --slice <label>
 *   bun bin/main.ts tally
 *   bun bin/main.ts gate
 *   bun bin/main.ts manifest
 *
 * Everything under `src/` names its requirements and satisfies none of them;
 * this file chooses the world the work runs in. A test that wants an
 * in-memory filesystem, or a corpus it built itself, provides different
 * layers here and changes nothing else.
 */
import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { Command } from "effect/unstable/cli";
import * as CensusPaths from "../src/CensusPaths";
import { cli } from "../src/cli";

const world = Layer.mergeAll(
  BunServices.layer,
  CensusPaths.layer.pipe(Layer.provide(BunServices.layer)),
);

Command.run(cli, { version: "0.0.0" }).pipe(
  Effect.provide(world),
  BunRuntime.runMain,
);
