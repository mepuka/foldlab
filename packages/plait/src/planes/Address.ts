/**
 * Plane: planes — the state carriers, one seam per plane.
 *
 * Addressing: a path is an iterated resolve from an explicit root.
 *
 * A directory is the finite set of `(petname, digest)` bindings a cataloged
 * value carries, merged by set union — the carrier the fabric model's F12
 * family is stated over, held as the map's graph so a name valued by the empty
 * set is unrepresentable rather than merely unused. A path is a petname list
 * read from a root digest: each hop resolves the current digest, reads one
 * binding out of the directory it decoded, and hands the bound digest to the
 * next hop. That is the whole construction.
 *
 * **No new machinery.** Every fetch on this path is `Resolved.resolve`, so
 * verify-on-read is inherited rather than restated: a hop cannot open a value
 * whose digest was not re-derived. This module ships no service, no store, no
 * layer, and no cache — a caller who wants the resolve memo provides
 * `ResolveCache` and changes nothing this module can observe.
 *
 * **The root is explicit, and rootlessness has nowhere to be written.** `at`
 * takes the root digest as its first parameter, so there is no current
 * directory to read and no ambient position to inherit; a rootless walk is not
 * validated away, it cannot be spelled — the same fence the kernel builder's
 * clock control states, and `negative-controls/Address.rootless.mutant.ts` is
 * where this module spends it. The relative names `.` and `..` are refused for
 * the same reason: each names a position rather than a value, and a walk that
 * honoured them would be reading the caller's context instead of its argument.
 *
 * **Under a fixed root every verdict is permanent.** A root digest names one
 * immutable directory, so unbound and ambiguous are functions of the root and
 * never move — they are structural, and retrying them re-reads the same bytes.
 * The one head-relative fact on this path is whether a store holds a directory
 * yet, and that arrives as `resolve`'s own `cataloged-value-absent` absence,
 * passed through untouched. Anything naming *whatever is current* is an anchor
 * question and does not enter here.
 *
 * **What is not shipped.** The model's resolution also has a sealed-at
 * verdict — the binding sealed at the greatest observed fencing token — and it
 * is deliberately absent: seals are the commitment register's evidence, and
 * reading them here would put a second arbitration path beside `Register.ts`.
 * Ambiguity therefore refuses instead of being decided, and its refusal says
 * so. No watch, feed, or subscription over a directory ships either; a live
 * view is the consumer seam's, not this module's. Nothing here discharges an
 * F12 theorem: the model resolves a snapshot pair, this code walks cataloged
 * values, and no correspondence between the two is claimed.
 *
 * @module
 */
import { Effect, Schema } from "effect"

import { canonicalBytes, type WireValue } from "../truth/Canonical.js"
import { Digest } from "../truth/Digest.js"
import {
  decodeRefusing,
  structuralRefusal,
  type Next,
  type Refusal,
  type StructuralRefusal,
} from "../truth/Refusal.js"
import type { Catalog, Payloads } from "./Catalog.js"
import { resolve } from "./Resolved.js"

/**
 * The name law in one expression: non-empty, no separator and no control
 * character, and never `.` or `..`.
 */
const petnamePattern = /^(?!\.{1,2}$)[^\p{Cc}\/\\]+$/u

/**
 * A name inside a directory. Naming, never identity: nothing derives a digest
 * from a petname, and the resolution that reads one is a directory fold.
 *
 * The law's last clause is its fence. The relative forms are the only names
 * whose meaning would depend on where the reader stands, and a path this
 * package admits depends on its root and its names alone.
 */
export const Petname = Schema.String
  .check(Schema.isPattern(petnamePattern))
  .pipe(Schema.brand("@foldlab/plait/Petname"))
  .annotate({ identifier: "PlaitPetname" })

/** A name inside a directory. */
export type Petname = typeof Petname.Type

/** One directory binding: a petname and the digest it names. */
export const Binding = Schema.Struct({ name: Petname, digest: Digest })

/** One directory binding: a petname and the digest it names. */
export type Binding = typeof Binding.Type

/**
 * The cataloged value a path walks through: a binding set under a closed
 * header, so a hop landing on any other value refuses instead of being
 * reinterpreted as an empty directory.
 */
export const Directory = Schema.Struct({
  v: Schema.Literal(0),
  kind: Schema.Literal("directory"),
  bindings: Schema.Array(Binding),
})

/** The cataloged value a path walks through. */
export type Directory = typeof Directory.Type

const teachBind: ReadonlyArray<Next> = [{
  subject: "Address.directory",
  note:
    "Bind the name in a directory value, publish it, and walk from the digest that publication returned.",
}]

const invalidPetname = (
  name: string,
  path: ReadonlyArray<string>,
): StructuralRefusal =>
  structuralRefusal({
    kind: "invalid-petname",
    law:
      "A petname is one non-empty name carrying no separator and no control character, and is never . or ..: the relative forms name a position instead of a value.",
    path,
    got: name,
    expected: "one literal petname",
    next: [{
      subject: "Address.at",
      note:
        "Replace the refused segment with a literal name; reach an enclosing directory by starting the walk at its own root digest, never by stepping out of this one.",
    }],
  })

const notADirectory = (
  digest: Digest,
  path: ReadonlyArray<string>,
  refused: Refusal,
): StructuralRefusal =>
  structuralRefusal({
    kind: "not-a-directory",
    law:
      "Every hop of a path opens a directory value; a walk never reinterprets a value that is not one.",
    path,
    got: { digest, refused: refused.kind },
    expected: "one directory value",
    next: [{
      subject: "Address.directory",
      note:
        "Publish a directory under this digest, or shorten the path to the value this hop already names.",
    }],
  })

const unboundPetname = (
  name: Petname,
  path: ReadonlyArray<string>,
): StructuralRefusal =>
  structuralRefusal({
    kind: "unbound-petname",
    law:
      "A name resolves only against a directory that binds it, and a root digest names one immutable directory, so the answer never moves.",
    path,
    got: name,
    expected: "one binding for this name in the directory this hop opened",
    next: teachBind,
  })

const ambiguousBinding = (
  name: Petname,
  candidates: ReadonlyArray<Digest>,
  path: ReadonlyArray<string>,
): StructuralRefusal =>
  structuralRefusal({
    kind: "ambiguous-binding",
    law:
      "A name bound to more than one digest resolves to none of them: the directory carries every candidate, and nothing in a walk arbitrates between them.",
    path,
    got: { name, candidates },
    expected: "exactly one digest bound to this name",
    next: [{
      subject: "Address.directory",
      note:
        "Publish a directory binding this name to exactly one digest and walk from that root; arbitration between concurrent binders is a fenced register decision and is not read here.",
    }],
  })

const admit = (
  text: string,
  path: ReadonlyArray<string>,
): Effect.Effect<Petname, StructuralRefusal> =>
  petnamePattern.test(text)
    ? Effect.succeed(Petname.make(text))
    : Effect.fail(invalidPetname(text, path))

const bindingKey = Effect.fn("Address.bindingKey")(function* (
  binding: Binding,
): Effect.fn.Return<string, StructuralRefusal> {
  return new TextDecoder().decode(
    yield* canonicalBytes(binding as unknown as WireValue),
  )
})

/**
 * Returns the canonical, duplicate-free directory over a binding list.
 *
 * This is the directory fold, and the join with it: the union of two
 * directories is `directory([...left.bindings, ...right.bindings])`, because
 * union of binding graphs is componentwise union of the maps they induce.
 * Idempotence, commutativity, and associativity are properties of this
 * function — arrival order and multiplicity are erased before any byte is
 * compared, so a directory says what is bound and never when it was bound.
 *
 * **Canonical order is declared, not derived.** Bindings sort by their RFC 8785
 * canonical bytes, which is what makes the returned value's digest a name for
 * the *set*. A directory assembled by hand in some other order is a different
 * digest holding the same bindings, and `list` answers the same for both
 * because it folds what it read.
 *
 * @example
 * ```ts
 * import { directory } from "@foldlab/plait/Address"
 * import { Effect } from "effect"
 *
 * Effect.runSync(directory([{ name, digest }, { name, digest }]))
 * // { v: 0, kind: "directory", bindings: [{ name, digest }] }
 * ```
 */
export const directory = Effect.fn("Address.directory")(function* (
  bindings: ReadonlyArray<Binding>,
): Effect.fn.Return<Directory, StructuralRefusal> {
  const keyed: Array<readonly [string, Binding]> = []
  for (const binding of bindings) {
    keyed.push([yield* bindingKey(binding), binding])
  }
  keyed.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
  const canonical: Array<Binding> = []
  let previous: string | undefined
  for (const [key, binding] of keyed) {
    if (key === previous) continue
    previous = key
    canonical.push(binding)
  }
  return { v: 0, kind: "directory", bindings: canonical }
})

/**
 * Admits one petname, refusing every name whose meaning would depend on where
 * the reader stands.
 *
 * @example
 * ```ts
 * import { petname } from "@foldlab/plait/Address"
 * import { Effect } from "effect"
 *
 * Effect.runSync(Effect.flip(petname("..")))
 * // StructuralRefusal { kind: "invalid-petname" }
 * ```
 */
export const petname = Effect.fn("Address.petname")(function* (
  text: string,
): Effect.fn.Return<Petname, StructuralRefusal> {
  return yield* admit(text, ["petname"])
})

/**
 * Where a refusal about the digest a hop opened points: the root for the first
 * hop, and otherwise the name that produced it.
 */
const openedAt = (hop: number): ReadonlyArray<string> =>
  hop === 0 ? ["root"] : ["names", String(hop - 1)]

const opened = Effect.fn("Address.opened")(function* (
  digest: Digest,
  hop: number,
): Effect.fn.Return<ReadonlyArray<Binding>, Refusal, Catalog | Payloads> {
  const value = yield* resolve(digest)
  const decoded = yield* Effect.mapError(
    decodeRefusing(Directory)(value),
    (refused) => notADirectory(digest, openedAt(hop), refused),
  )
  return decoded.bindings
})

const boundDigest = (
  bindings: ReadonlyArray<Binding>,
  name: Petname,
  hop: number,
): Effect.Effect<Digest, StructuralRefusal> => {
  const path = ["names", String(hop)]
  const candidates = [
    ...new Set(
      bindings.filter((binding) => binding.name === name).map((binding) => binding.digest),
    ),
  ].sort()
  if (candidates.length === 0) return Effect.fail(unboundPetname(name, path))
  if (candidates.length > 1) return Effect.fail(ambiguousBinding(name, candidates, path))
  return Effect.succeed(candidates[0]!)
}

const admitted = Effect.fn("Address.admitted")(function* (
  names: ReadonlyArray<string>,
): Effect.fn.Return<ReadonlyArray<Petname>, StructuralRefusal> {
  const admittedNames: Array<Petname> = []
  for (let index = 0; index < names.length; index++) {
    admittedNames.push(yield* admit(names[index]!, ["names", String(index)]))
  }
  return admittedNames
})

/**
 * Walks a path from an explicit root and answers the digest it names.
 *
 * The whole petname list is judged before the first store is asked, so an
 * unlawful name refuses without reading anything. Each hop then resolves — the
 * one verified seam — decodes a directory, and reads exactly one binding out of
 * it. `at(root)` with no names is the root itself and resolves nothing.
 *
 * The answer is an address, not a value: the digest a binding names is not
 * fetched, because whether it resolves is the reader's question and the store
 * it resolves against is the reader's choice. Compose with `Resolved.resolve`
 * for the value, or hand the digest to a `ResolvedOf` codec.
 *
 * @example
 * ```ts
 * import { at } from "@foldlab/plait/Address"
 * import { substrateLayer } from "@foldlab/plait/Catalog"
 * import { resolve } from "@foldlab/plait/Resolved"
 * import { Effect } from "effect"
 *
 * at(root, "config", "model").pipe(
 *   Effect.flatMap(resolve),
 *   Effect.provide(substrateLayer),
 * )
 * ```
 */
export const at = Effect.fn("Address.at")(function* (
  root: Digest,
  ...names: ReadonlyArray<string>
): Effect.fn.Return<Digest, Refusal, Catalog | Payloads> {
  const admittedNames = yield* admitted(names)
  let current = root
  for (let hop = 0; hop < admittedNames.length; hop++) {
    current = yield* boundDigest(yield* opened(current, hop), admittedNames[hop]!, hop)
  }
  return current
})

/**
 * Lists the directory a path names, folded.
 *
 * The answer is the canonical, duplicate-free binding set of whatever was
 * stored, so two directories holding one set list identically however their
 * bindings were ordered when they were published. A path whose last hop is not
 * a directory refuses here rather than answering an empty listing.
 *
 * This is a read of one immutable value, never a feed: it says what the
 * directory at this digest binds, and nothing about what any later directory
 * will bind.
 *
 * @example
 * ```ts
 * import { list } from "@foldlab/plait/Address"
 * import { substrateLayer } from "@foldlab/plait/Catalog"
 * import { Effect } from "effect"
 *
 * list(root, "config").pipe(Effect.provide(substrateLayer))
 * // [{ name: "model", digest: "015abd7f..." }]
 * ```
 */
export const list = Effect.fn("Address.list")(function* (
  root: Digest,
  ...names: ReadonlyArray<string>
): Effect.fn.Return<ReadonlyArray<Binding>, Refusal, Catalog | Payloads> {
  const address = yield* at(root, ...names)
  const folded = yield* directory(yield* opened(address, names.length))
  return folded.bindings
})
