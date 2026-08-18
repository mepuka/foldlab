/**
 * EXEMPLAR ONLY — the ONE seam where this scratch directory reaches the estate's
 * pinned Effect, and the only file that carries the path.
 *
 * `effect@4.0.0-rc.108` is a workspace dependency of `packages/plait`, so bun
 * installs it at `packages/plait/node_modules/effect`. `scratch/` is outside the
 * `packages/*` workspace globs, so the bare specifier `effect` does not resolve
 * from here. A generator inside the estate writes `import { Schema } from
 * "effect"` and is done; this exemplar reaches the same pinned build by path so
 * that the diff stays inside `scratch/km-expressibility/` and the root manifest,
 * the lockfile, and every gate stay untouched.
 *
 * The BOUND that matters for reading the wall's output: this is the same build
 * the estate compiles against, not a second copy and not a different version.
 * `run.sh` asserts the resolved version equals the catalog pin before any arm
 * runs, so "the wall decoded with the pinned Schema" is checked rather than
 * claimed.
 */

export {
  Context,
  Data,
  Effect,
  Layer,
  Result,
  Schema,
} from "../../packages/plait/node_modules/effect/dist/index.js"
