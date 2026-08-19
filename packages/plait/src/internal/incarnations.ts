/**
 * Plane: internal — private adapters, housed flat.
 * Seam: planes — the state carriers, one seam per plane.
 *
 * @module
 */
import { Effect } from "effect"

import { Registers } from "../planes/Register.js"
import type { WireValue } from "../truth/Canonical.js"
import { digestOf, type Digest } from "../truth/Digest.js"
import { structuralRefusal, type Next, type Refusal } from "../truth/Refusal.js"

/**
 * The substrate-incarnation fence — one server run over one store directory.
 *
 * An **incarnation** is one run of a server over one store directory,
 * successor-chained. Two servers over one store directory corrupt the store,
 * and the corruption is already in the filesystem by the time anyone could
 * choose between them — so the act is fenced rather than folded, and the fence
 * is the commitment register with its revision-CAS discipline. Winning the
 * register is the exclusive act; a loser never starts a server, and receives a
 * typed refusal carrying its reason, its law and its repair.
 *
 * The register is CONSUMED here, never extended: its five actions and their
 * laws are unchanged, and the incarnation pin it already carries — a fence is
 * honored only by the backing-stream incarnation that minted it — is what
 * makes a fence over a destroyed and reborn bucket refuse instead of landing.
 * That pin is the reason this fence can be built on the register at all.
 *
 * **The key is one chain position, not one store.** A landed outcome never
 * changes, which is exactly right for one round and wrong for a lifetime: a
 * store directory outlives many incarnations, and a key that admitted one
 * landing ever would make succession unsayable. So the key is the digest of
 * the ROUND — the store directory together with the incarnation being
 * succeeded — and the store digest is the round's only free coordinate at any
 * one chain position. At most one incarnation lands per round, which is at
 * most one incarnation current per store directory, which is the fence the
 * store needs.
 *
 * **Crash is not a fact and is not forged into one here.** Nothing in this
 * module retires an incarnation on another's behalf or reads silence as a
 * verdict. A dead incarnation stays unretired and its lanes go quiet; absence
 * is the honest reading, and the verdict on silence belongs to a fenced
 * decision fed by facts, never to this walk.
 */

/** One server run over one store directory, successor-chained. */
export interface SubstrateIncarnation {
  readonly v: 0
  readonly kind: "substrate-incarnation"
  /** The store directory this run owns, by digest. */
  readonly store: string
  /** The declared server-options value this run started under, by digest. */
  readonly options: string
  /** The incarnation this run succeeds, or `null` for a store's first. */
  readonly predecessor: string | null
}

/** One chain position over one store directory: what a decide competes for. */
export interface IncarnationRound {
  readonly v: 0
  readonly kind: "substrate-incarnation-round"
  readonly store: string
  readonly predecessor: string | null
}

/** Declares one incarnation value. */
export const incarnation = (input: {
  readonly store: Digest
  readonly options: Digest
  readonly predecessor: Digest | null
}): SubstrateIncarnation => ({
  v: 0,
  kind: "substrate-incarnation",
  store: input.store,
  options: input.options,
  predecessor: input.predecessor,
})

/** The incarnation's name: SHA-256 over its canonical bytes. */
export const incarnationName = (
  value: SubstrateIncarnation,
): Effect.Effect<Digest, Refusal> => digestOf(value as unknown as WireValue)

/**
 * The register key one decide competes at.
 *
 * A digest rather than a composed string: the register maps a work digest to
 * one literal key, and a digest is one literal key by construction — no
 * separator can appear inside a coordinate and split it.
 */
export const roundKey = (
  store: Digest,
  predecessor: Digest | null,
): Effect.Effect<Digest, Refusal> =>
  digestOf(
    { v: 0, kind: "substrate-incarnation-round", store, predecessor } satisfies
      IncarnationRound as unknown as WireValue,
  )

/** One incarnation landed by right of a token. */
export interface LandedIncarnation {
  /** The register key the decide was taken at. */
  readonly round: Digest
  /** The fencing token the landing was made under. */
  readonly token: number
  /** The incarnation value that landed. */
  readonly value: SubstrateIncarnation
  /** The incarnation's name. */
  readonly digest: Digest
}

/**
 * Lands one incarnation by right of a token.
 *
 * Grant then commit, in that order and with the granted token carried between
 * them: the register's own five actions, used as they are defined. A racing
 * decide loses at the grant, or — if it granted first and stalled — at the
 * commit, and either way it receives a typed refusal and lands nothing. There
 * is no path through this function that starts a server; starting one is the
 * winner's act, performed after this returns.
 */
export const decideIncarnation = Effect.fn("Incarnation.decide")(function* (input: {
  readonly store: Digest
  readonly options: Digest
  readonly predecessor: Digest | null
  readonly holder: string
}): Effect.fn.Return<LandedIncarnation, Refusal, Registers> {
  const registers = yield* Registers
  const round = yield* roundKey(input.store, input.predecessor)
  const value = incarnation(input)
  const digest = yield* incarnationName(value)
  const granted = yield* registers.grant(round, input.holder)
  const landed = yield* registers.commit(round, granted.token, digest)
  return { round, token: landed.token, value, digest }
})

/**
 * What landed at one chain position, if anything has.
 *
 * A round nobody has decided reads as `null`. That is absence at a position,
 * not a claim about the world: nothing here says a server is or is not
 * running.
 */
export const landedAt = Effect.fn("Incarnation.landedAt")(function* (
  store: Digest,
  predecessor: Digest | null,
): Effect.fn.Return<string | null, Refusal, Registers> {
  const registers = yield* Registers
  const round = yield* roundKey(store, predecessor)
  const state = yield* registers.observe(round)
  return state.outcome === null ? null : state.outcome.value
})

const teachSeedChain: ReadonlyArray<Next> = [{
  subject: "incarnation.chain",
  note: "Walk the chain over a history carrying every incarnation the walk reaches, each named by its own canonical bytes.",
}]

const chainRefusal = (
  path: ReadonlyArray<string>,
  got: string,
  expected: string,
): Refusal => structuralRefusal({
  kind: "malformed-value",
  law: "An incarnation chain is walked by predecessor digest and every step names an incarnation the history carries.",
  path,
  got,
  expected,
  next: teachSeedChain,
})

/**
 * Walks one incarnation chain from a head, newest first.
 *
 * Total and acyclic, and both are checked rather than argued. A step naming an
 * incarnation the history does not carry refuses instead of stopping quietly,
 * because a chain that ends early reads as a shorter history rather than as a
 * missing one. A step naming an incarnation already walked refuses instead of
 * looping: a cycle cannot be built out of honest digests, since a value's name
 * covers its predecessor's name, and the check is here for the histories that
 * were not built out of honest digests.
 *
 * Nothing about liveness is read here. The walk is a history, and a history
 * says what happened, never what is.
 */
export const walkChain = Effect.fn("Incarnation.walkChain")(function* (
  history: ReadonlyMap<string, SubstrateIncarnation>,
  head: string,
): Effect.fn.Return<ReadonlyArray<string>, Refusal> {
  const walked: Array<string> = []
  const seen = new Set<string>()
  let cursor: string | null = head
  while (cursor !== null) {
    if (seen.has(cursor)) {
      return yield* chainRefusal(["chain", cursor], "already walked", "an unwalked predecessor")
    }
    const value: SubstrateIncarnation | undefined = history.get(cursor)
    if (value === undefined) {
      return yield* chainRefusal(["chain", cursor], "absent", "an incarnation the history carries")
    }
    seen.add(cursor)
    walked.push(cursor)
    cursor = value.predecessor
  }
  return walked
})
