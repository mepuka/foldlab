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
 * **Where a lawful root comes from — KM-16's other half.** KM-16 states a path
 * as a petname list resolved from an explicitly named root digest *at an
 * anchor*, and this module implements only the second half: it takes the root
 * as data and never asks where it came from. The anchor read is the caller's,
 * and `Anchor.ts` owns it — a root is the `stateDigest` or `head` of a
 * checkpoint fact somebody read, or a digest a publication returned, handed in
 * as an argument. That is the positive rule behind every negative here: an
 * anchor read is head-relative and belongs to the plane that owns anchors, so a
 * walk that performed one would be resolving against *whatever is current*
 * rather than against its argument, which is the ambient input KM-16 puts on
 * the closure list beside the clock.
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
 * **Law 1 — what derives, and what wears a waiver.** The estate's first
 * standing law is that the machine-generated kernel IS the core, so a public
 * type naming a corpus concept derives from the generated projection or carries
 * an explicit waiver citing the unification ticket. This module does both, and
 * says which is which:
 *
 * - `Petname` DERIVES. Its carrier is the generated `KernelPetname` and nothing
 *   else; what this module adds is one admission check, because the generated
 *   projection carries the concept and not the name law a walk needs.
 * - `ambiguous-binding` is the CORPUS'S SPELLING, not this module's coinage:
 *   the model emits it on the F12 across-bind-orders row, and
 *   `test/Address.test.ts` walls the string minted here against that row so a
 *   model rename reds the gate instead of drifting.
 * - `Binding` and `Directory` WEAR A WAIVER (DEV-796). They are hand-written
 *   definitions of the F12 directory family, which the corpus carries as
 *   conformance rows and no generator projects yet. The owed projection and its
 *   replay wall are named in DECISIONS; until DEV-796's inventory walk lands,
 *   this waiver is the row those types occupy in the debt ledger.
 * - `invalid-petname`, `not-a-directory`, and `unbound-petname` WEAR THE SAME
 *   WAIVER. They are this module's door refusals rather than corpus verdicts —
 *   the corpus has no such reasons — but they are still hand-written entries in
 *   a refusal enum the generated taught-refusal table does not own, which is
 *   the shape Law 1 stages as debt rather than accepts as design.
 *
 * @module
 */
import { Effect, Schema } from "effect"

import { KernelPetname } from "../kernel/KernelSchemas.generated.js"
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
 *
 * The law's last clause is its fence. The relative forms are the only names
 * whose meaning would depend on where the reader stands, and a path this
 * package admits depends on its root and its names alone.
 */
const petnamePattern = /^(?!\.{1,2}$)[^\p{Cc}\/\\]+$/u

const petnameLaw = Schema.makeFilter<{ readonly text: string }>(
  (petname) => petnamePattern.test(petname.text) ? undefined : "expected one literal petname",
  { expected: "one literal petname" },
)

/**
 * A name inside a directory: the generated `KernelPetname` carrier, admitted
 * against this module's name law.
 *
 * The concept, its carrier, and the sentence that says what a petname is are
 * the model's and reach here through `KernelSchemas.generated.ts` — this
 * declaration adds no second definition of either. What it adds is the law:
 * the generated projection admits any text, and a walk cannot, because a name
 * carrying a separator or a relative form would make a path mean something
 * other than its root and its names.
 */
export const Petname = KernelPetname
  .check(petnameLaw)
  .pipe(Schema.brand("@foldlab/plait/Petname"))
  .annotate({ identifier: "PlaitPetname" })

/** A name inside a directory. */
export type Petname = typeof Petname.Type

/**
 * One directory binding: a petname and the digest it names.
 *
 * **Law 1 waiver — DEV-796.** This is a hand-written definition of a corpus
 * concept: the model carries the F12 directory family as conformance rows
 * (`fixtures/fabric-conformance.ndjson`, the `F12` kind), and no generator
 * projects it into this package yet. The waiver is spent, not hidden — the
 * projection and the replay wall it owes are named in DECISIONS, and this type
 * is a ledger row for DEV-796's type-universe walk until they land.
 */
export const Binding = Schema.Struct({ name: Petname, digest: Digest })

/** One directory binding: a petname and the digest it names. */
export type Binding = typeof Binding.Type

/**
 * The cataloged value a path walks through: a binding set under a closed
 * header, so a hop landing on any other value refuses instead of being
 * reinterpreted as an empty directory.
 *
 * **Law 1 waiver — DEV-796**, on the same terms as `Binding`.
 */
export const Directory = Schema.Struct({
  v: Schema.Literal(0),
  kind: Schema.Literal("directory"),
  bindings: Schema.Array(Binding),
})

/** The cataloged value a path walks through. */
export type Directory = typeof Directory.Type

/**
 * The closed header alone, with the bindings left unread.
 *
 * A hop asks two questions in order, and they have two different repairs. *Is
 * this a directory at all* is the header's question, and a value that fails it
 * refuses `not-a-directory`. *Is every binding in it lawful* is the binding
 * schema's, and a value that fails THAT is a directory — refusing it as
 * `not-a-directory` would teach the caller to publish a directory at a digest
 * that already holds one.
 */
const DirectoryHeader = Schema.Struct({
  v: Schema.Literal(0),
  kind: Schema.Literal("directory"),
  bindings: Schema.Array(Schema.Unknown),
})

const Bindings = Schema.Array(Binding)

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
    got: name.text,
    expected: "one binding for this name in the directory this hop opened",
    next: teachBind,
  })

/**
 * The reason the MODEL names for this verdict, not a coinage of this module.
 *
 * `fixtures/fabric-conformance.ndjson` carries it on the F12
 * `ambiguous-across-bind-orders` row as that row's `verdict.refusal`, and
 * `test/Address.test.ts` walls the two together by reading the row and running
 * a real ambiguous walk: what the shipped path mints is compared to what the
 * model emitted. A rename in the model therefore reds this package rather than
 * leaving two spellings of one reason alive in the estate. The constant stays
 * private — the wall reads the refusal, not a string this module exports.
 */
const AMBIGUOUS_BINDING = "ambiguous-binding"

const ambiguousBinding = (
  name: Petname,
  candidates: ReadonlyArray<Digest>,
  path: ReadonlyArray<string>,
): StructuralRefusal =>
  structuralRefusal({
    kind: AMBIGUOUS_BINDING,
    law:
      "A name bound to more than one digest resolves to none of them: the directory carries every candidate, and nothing in a walk arbitrates between them.",
    path,
    got: { name: name.text, candidates },
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
    ? Effect.succeed(Petname.make({ text }))
    : Effect.fail(invalidPetname(text, path))

const bindingKey = Effect.fn("Address.bindingKey")(function* (
  binding: Binding,
): Effect.fn.Return<Uint8Array, StructuralRefusal> {
  return yield* canonicalBytes(binding as unknown as WireValue)
})

/**
 * Lexicographic order over the canonical bytes themselves, shortest-prefix
 * first — the order the JSDoc on `directory` names.
 *
 * Decoding to a JavaScript string first would sort by UTF-16 code unit, which
 * disagrees with UTF-8 byte order for names outside the BMP: a surrogate pair
 * sorts below U+E000–U+FFFF as code units and above them as bytes. Either order
 * is deterministic, so either would give the fold a digest that names the set —
 * but only one of them is the order this package writes down, and a directory
 * fold written on another runtime to that sentence has to agree with this one.
 */
const byteOrder = (left: Uint8Array, right: Uint8Array): number => {
  const shared = left.length < right.length ? left.length : right.length
  for (let index = 0; index < shared; index++) {
    const difference = left[index]! - right[index]!
    if (difference !== 0) return difference
  }
  return left.length - right.length
}

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
 * canonical bytes, compared as bytes, which is what makes the returned value's
 * digest a name for the *set*. A directory assembled by hand in some other
 * order is a different digest holding the same bindings, and `list` answers the
 * same for both because it folds what it read.
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
  const keyed: Array<readonly [Uint8Array, Binding]> = []
  for (const binding of bindings) {
    keyed.push([yield* bindingKey(binding), binding])
  }
  keyed.sort(([left], [right]) => byteOrder(left, right))
  const canonical: Array<Binding> = []
  let previous: Uint8Array | undefined
  for (const [key, binding] of keyed) {
    if (previous !== undefined && byteOrder(previous, key) === 0) continue
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

/**
 * Opens the directory at a digest: resolve, then the two questions a hop asks,
 * in the order whose repairs differ.
 *
 * The header decides whether this is a directory, and only its failure is
 * wrapped — the wrapper adds the position the walk was at, which the schema
 * cannot know. A directory whose bindings do not decode refuses with the
 * schema's OWN refusal, unwrapped: it names the field that failed and the law
 * that failed it, and calling it `not-a-directory` would teach a repair
 * ("publish a directory here") for a digest that already holds one.
 */
const opened = Effect.fn("Address.opened")(function* (
  digest: Digest,
  hop: number,
): Effect.fn.Return<ReadonlyArray<Binding>, Refusal, Catalog | Payloads> {
  const value = yield* resolve(digest)
  const header = yield* Effect.mapError(
    decodeRefusing(DirectoryHeader)(value),
    (refused) => notADirectory(digest, openedAt(hop), refused),
  )
  return yield* decodeRefusing(Bindings)(header.bindings)
})

const boundDigest = (
  bindings: ReadonlyArray<Binding>,
  name: Petname,
  hop: number,
): Effect.Effect<Digest, StructuralRefusal> => {
  const path = ["names", String(hop)]
  const candidates = [
    ...new Set(
      bindings.filter((binding) => binding.name.text === name.text).map((binding) =>
        binding.digest
      ),
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
 * // [{ name: { text: "model" }, digest: "015abd7f..." }]
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
