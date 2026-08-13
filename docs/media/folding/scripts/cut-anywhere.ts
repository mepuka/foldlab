/**
 * Drives the "Cut anywhere" clip with REAL numbers.
 *
 * Folds one history whole, then cuts it at two different points, folds each
 * piece independently from the algebra's neutral value, and combines the
 * pieces with the algebra's own `combine`. Every digest written to
 * data/cut-anywhere.json is sha256 over the canonical JSON bytes that
 * `encodeFoldState` produces for the state — the same encoding the package
 * uses as its equality witness.
 *
 *   bun docs/media/folding/scripts/cut-anywhere.ts
 */

import { createHash } from "node:crypto"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { algebras, encodeFoldState, product, productStep, steps } from "@foldlab/core/algebra"
import { defineFold } from "@foldlab/core/fold"
import { event, type StreamEvent } from "@foldlab/core/stream"

const here = dirname(fileURLToPath(import.meta.url))

/** The one fold: how many events, and how many payload bytes they carried. */
const fold = defineFold(
  product(algebras.count, algebras.sum),
  productStep<StreamEvent, readonly [number, number]>(steps.constOne, steps.payloadLength),
)

const payloads = ["status=new", "qty=2", "status=paid", "region=eu", "qty=5", "status=shipped"]
const history: ReadonlyArray<StreamEvent> = payloads.map((p, i) => event("orders", i, p))

const digestOf = (state: readonly [number, number]): string => {
  const encoded = encodeFoldState(state as unknown as ReadonlyArray<number>)
  if (!encoded.ok) throw new Error("state is outside the canonical domain")
  return createHash("sha256").update(encoded.bytes, "utf8").digest("hex")
}

const whole = fold.fold(history) as readonly [number, number]

const cutAt = (at: number) => {
  const left = fold.fold(history.slice(0, at)) as readonly [number, number]
  const right = fold.fold(history.slice(at)) as readonly [number, number]
  const combined = fold.algebra.combine(left, right) as readonly [number, number]
  return {
    at,
    left: { state: left, digest: digestOf(left) },
    right: { state: right, digest: digestOf(right) },
    combined: { state: combined, digest: digestOf(combined) },
    matchesWhole: digestOf(combined) === digestOf(whole),
  }
}

const out = {
  _provenance: "bun docs/media/folding/scripts/cut-anywhere.ts",
  foldDigest: fold.digest ?? null,
  events: payloads.map((payload, i) => ({ stream: "orders", seq: i, payload })),
  whole: { state: whole, digest: digestOf(whole) },
  cuts: [cutAt(2), cutAt(4)],
}

if (!out.cuts.every((c) => c.matchesWhole)) throw new Error("a cut disagreed with the whole fold")

mkdirSync(join(here, "..", "data"), { recursive: true })
writeFileSync(join(here, "..", "data", "cut-anywhere.json"), `${JSON.stringify(out, null, 2)}\n`)
console.log(JSON.stringify(out, null, 2))
