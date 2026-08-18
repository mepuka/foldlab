/**
 * Plane: carriage — hosts and transport clients.
 *
 * The content-addressed daemon: four operations, each judged before it acts.
 *
 * A built program names the services it would need before anything can be
 * wired, and naming them honestly is the point of this module: the builder's
 * requirements channel says `CasDaemon` because a program that publishes a
 * declaration, resolves a digest, reads at an anchor, or lands an outcome
 * needs a daemon that does those four things.
 *
 * **There is no tag, no layer, and no store implementation here.** Not an
 * unimplemented one, not a throwing one, not a stub that fails at runtime —
 * none, because there is nothing to run yet and a placeholder service is how a
 * "not wired" turns into a "wired wrong" three slices later. The wiring is its
 * own separately gated slice; when it lands it mints the tag and supplies a
 * {@link CasStore}, and this interface becomes that tag's service shape,
 * unchanged.
 *
 * What does ship is {@link casDaemonOver}: the admission gate the four
 * operations pass through. Judgment is not the transport slice's to invent
 * later — a store wired under this gate cannot publish a declaration, resolve
 * a digest, read at an anchor, or land an outcome that the kernel door refused,
 * because the store is never called when the verdict is a refusal.
 *
 * Two fences bind the shape below and are worth stating rather than leaving to
 * be inferred from what is missing.
 *
 * No clock, no scheduler, no engine. Nothing here reads a time, waits, retries,
 * or advances a queue. A daemon that could do those things is a workflow
 * engine, and a workflow engine is refused: the claimed time of a fact travels
 * as a tick fact on an evidence lane, and ordering travels as an anchor.
 *
 * No closure crosses the seam. Every operation names its subject by digest,
 * because a function value has no canonical bytes and therefore no identity a
 * content-addressed store could file it under. Closure introspection is not an
 * unimplemented feature; it is a refused one.
 *
 * @module
 */
import { Effect } from "effect"

import {
  Admission,
  admit as admissionAdmit,
  type AdmissionService,
} from "../kernel/Admission.js"
import {
  anchoredRead,
  declarationPublication,
  digestResolution,
  outcomeLanding,
  type SpanAnchor,
} from "../kernel/Candidates.js"
import type { KernelProgramDeclaration } from "../kernel/KernelCorpusSchemas.js"
import { declarationIdentity } from "../kernel/KernelProgram.js"
import type { Refusal } from "../truth/Refusal.js"

/** The one candidate-judgment route; the daemon defines no side door. */
export const admit = admissionAdmit

/**
 * A content address as the runtime spells it: lowercase hexadecimal over the
 * canonical bytes. The model carries identity labels instead, and the map
 * between the two is `kernel/Candidates.ts`'s trusted base, not a theorem.
 */
export type CasDigestHex = string

/**
 * Where a read stands in a partitioned stream.
 *
 * The generated candidate anchor's own fields, at the identity scale the model
 * uses: the runtime does not carry a second spelling of a resume coordinate.
 */
export type CasAnchor = SpanAnchor

/** What a landed outcome is addressed by, once a decision has one. */
export interface CasOutcome {
  readonly register: CasDigestHex
  readonly outcome: CasDigestHex
  /**
   * The fence the claimant holds. Optional in the type because an unfenced
   * landing is spellable and therefore refusable: the door answers it
   * `unfenced-decide` rather than the daemon guessing.
   */
  readonly token?: { readonly register: bigint; readonly value: bigint }
}

/**
 * The byte-moving half a later slice implements: storage, and no judgment.
 *
 * Every operation here is reached only after the door admitted the sentence it
 * names, so a store never sees a refused act and never needs to re-derive one.
 */
export interface CasStore {
  readonly publish: (
    declaration: KernelProgramDeclaration,
    bytes: string,
  ) => Effect.Effect<CasDigestHex, Refusal>
  readonly resolve: (
    digest: CasDigestHex,
  ) => Effect.Effect<KernelProgramDeclaration, Refusal>
  readonly readAt: (anchor: CasAnchor) => Effect.Effect<CasDigestHex, Refusal>
  readonly land: (outcome: CasOutcome) => Effect.Effect<void, Refusal>
}

/**
 * The admission route plus the four daemon operations a built program's
 * requirements channel names.
 *
 * Every operation returns the runtime's one `Refusal` family: a taught kernel
 * refusal when the door refused the act, a transport refusal when the store
 * did.
 */
export interface CasDaemon {
  /** Candidate judgment is the Admission accessor, never daemon-local logic. */
  readonly admit: typeof admissionAdmit

  /**
   * Publishes a declaration under a writ and returns its content address.
   * Publication is an act the caller chooses; building a program never
   * performs it, and a declaration whose lineage or writ the catalog has not
   * admitted never reaches the store.
   */
  readonly publish: (
    declaration: KernelProgramDeclaration,
    writ: bigint,
  ) => Effect.Effect<CasDigestHex, Refusal>

  /** Reads back the declaration a digest names, verifying identity on read. */
  readonly resolve: (
    digest: CasDigestHex,
  ) => Effect.Effect<KernelProgramDeclaration, Refusal>

  /** Reads a partitioned stream at an anchor. Head-relative reads carry their anchor. */
  readonly readAt: (anchor: CasAnchor) => Effect.Effect<CasDigestHex, Refusal>

  /** Lands a decided outcome against its register. */
  readonly land: (outcome: CasOutcome) => Effect.Effect<void, Refusal>
}

const gated = (admission: AdmissionService, store: CasStore): CasDaemon => ({
  admit: admissionAdmit,
  publish: Effect.fn("CasDaemon.publish")(function* (declaration, writ) {
    const identity = declarationIdentity(declaration)
    yield* admission.admit(
      declarationPublication("program", declaration.lineage, identity.digestHex, writ),
    )
    return yield* store.publish(declaration, identity.bytes)
  }),
  resolve: Effect.fn("CasDaemon.resolve")(function* (digest) {
    yield* admission.admit(digestResolution("program", digest))
    return yield* store.resolve(digest)
  }),
  readAt: Effect.fn("CasDaemon.readAt")(function* (anchor) {
    yield* admission.admit(anchoredRead(anchor.foldId, anchor, []))
    return yield* store.readAt(anchor)
  }),
  land: Effect.fn("CasDaemon.land")(function* (outcome) {
    yield* admission.admit(
      outcomeLanding(outcome.register, outcome.outcome, outcome.token),
    )
    return yield* store.land(outcome)
  }),
})

/**
 * Installs the door above one store.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import { casDaemonOver } from "@foldlab/plait/CasDaemon"
 *
 * const daemon = Effect.gen(function* () {
 *   return yield* casDaemonOver(store)
 * })
 * ```
 */
export const casDaemonOver = (
  store: CasStore,
): Effect.Effect<CasDaemon, never, Admission> =>
  Effect.gen(function* () {
    const admission = yield* Admission
    return gated(admission, store)
  })

/**
 * One unfilled hole of a program, as a requirement.
 *
 * The correspondence the kernel model states, carried into the type system: a
 * program's holes are its requirements, providing is filling, and a program
 * with no holes requires nothing. A hole appears in the requirements channel
 * under its own name, so filling it removes exactly one requirement and not a
 * category of them.
 */
export interface CasHoleRequirement<Name extends bigint> {
  readonly "~foldlab/plait/kernel/requires": Name
}

/**
 * What a run would land: the address of the value the program's terminal node
 * produced.
 *
 * Nothing in this package produces one. The type exists so the success channel
 * of a built program's stub is named rather than left as `unknown`, and so a
 * later slice that does wire an executor has a shape to conform to instead of
 * a shape to invent.
 */
export interface CasProgramOutcome {
  readonly landed: CasDigestHex
}
