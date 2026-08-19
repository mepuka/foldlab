/**
 * Plane: internal — private adapters, housed flat.
 * Seam: planes — the state carriers, one seam per plane.
 *
 * @module
 */
import { Effect } from "effect"

import { OutcomeValue, Registers, WorkKey } from "../planes/Register.js"
import type { Holder } from "../kernel/Wire.js"
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

/** One store directory, declared as a value so that it has a name of its own. */
export interface SubstrateStore {
  readonly v: 0
  readonly kind: "substrate-store"
  /** The directory the substrate's durable state lives in. */
  readonly dir: string
}

/**
 * Declares one store directory.
 *
 * The DIGEST is what travels — into the round key, into every fact, onto every
 * lane. The directory itself is an ambient coordinate that means nothing to a
 * party on another host, and it never leaves this declaration.
 */
export const store = (dir: string): SubstrateStore => ({ v: 0, kind: "substrate-store", dir })

/** One store directory's name. */
export const storeName = (dir: string): Effect.Effect<Digest, Refusal> =>
  digestOf(store(dir) as unknown as WireValue)

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
): Effect.Effect<WorkKey, Refusal> =>
  Effect.map(
    digestOf(
      { v: 0, kind: "substrate-incarnation-round", store, predecessor } satisfies
        IncarnationRound as unknown as WireValue,
    ),
    WorkKey.make,
  )

/** One incarnation landed by right of a token. */
export interface LandedIncarnation {
  /** The register key the decide was taken at. */
  readonly round: WorkKey
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
  readonly holder: Holder
}): Effect.fn.Return<LandedIncarnation, Refusal, Registers> {
  const registers = yield* Registers
  const round = yield* roundKey(input.store, input.predecessor)
  const value = incarnation(input)
  const digest = yield* incarnationName(value)
  const granted = yield* registers.grant(round, input.holder)
  const landed = yield* registers.commit(round, granted.token, OutcomeValue.make(digest))
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

/**
 * The lifecycle facts an incarnation leaves behind.
 *
 * Established and retired accumulate on the incarnation lane; the lame-duck
 * fact lands on the session lane, because what it is about is the sessions the
 * drain is going to end. The daemon EMITS them and this module DECLARES them,
 * and the two languages are held to one shape by a byte comparison rather than
 * by two tables agreeing on inspection.
 *
 * Staged debt, stated rather than absorbed. These are hand-carried declarations
 * owing the corpus's substrate-vocabulary group, which the emitter does not yet
 * mint — the same waiver the session fact and the readiness observation wear.
 * The lame-duck fact owes one thing more: it is not yet a variant of the
 * session lane's declared event form, so a reader decoding that lane under that
 * form refuses it. Appending the variant is owed work in the module that owns
 * the form.
 */

/** One incarnation's entry into service. */
export interface IncarnationEstablished {
  readonly v: 0
  readonly kind: "substrate-incarnation-established"
  readonly incarnation: string
  readonly store: string
  readonly options: string
  readonly predecessor: string | null
}

/** Declares one incarnation's entry into service. */
export const establishedFact = (
  digest: Digest,
  value: SubstrateIncarnation,
): IncarnationEstablished => ({
  v: 0,
  kind: "substrate-incarnation-established",
  incarnation: digest,
  store: value.store,
  options: value.options,
  predecessor: value.predecessor,
})

/**
 * The pinned vendor's own name for the drain disposition, carried verbatim.
 *
 * The estate invents no name here: this is the event type the vendor's status
 * vocabulary publishes and the estate's status table already transcribes.
 */
export const LAME_DUCK_EVENT = "ldm"

/** One incarnation's drain disposition, as a fact about one session. */
export interface IncarnationLameDuck {
  readonly v: 0
  readonly kind: "substrate-incarnation-lame-duck"
  readonly incarnation: string
  readonly session: string
  readonly event: typeof LAME_DUCK_EVENT
  readonly server: string
}

/**
 * Declares one drain disposition.
 *
 * **The server field is why the server name is a declared row.** Left unset the
 * vendor aliases a fresh identity per run, and this fact would then carry a
 * coordinate that means nothing across a restart.
 */
export const lameDuckFact = (input: {
  readonly incarnation: Digest
  readonly session: Digest
  readonly server: string
}): IncarnationLameDuck => ({
  v: 0,
  kind: "substrate-incarnation-lame-duck",
  incarnation: input.incarnation,
  session: input.session,
  event: LAME_DUCK_EVENT,
  server: input.server,
})

/**
 * The retirement causes.
 *
 * The pinned vendor supplies no retirement-cause vocabulary — its lifecycle
 * surface is verbs, not causes — so both rows are DECLARED ESTATE VALUES and
 * are marked as such, which is the only way a name the vendor does not supply
 * may enter. Neither is a vendor word and neither is presented as one.
 *
 * **There is no row for a crash, and that absence is the point.** A crashed
 * incarnation is an unretired incarnation whose lanes go quiet; the honest
 * reading is absence, and a cause that could name it would be a forgery this
 * roster makes unsayable.
 */
export const RETIREMENT_CAUSES = ["drained", "stopped"] as const

/** One declared retirement cause. */
export type RetirementCause = (typeof RETIREMENT_CAUSES)[number]

/** One incarnation's retirement, naming its cause. */
export interface IncarnationRetired {
  readonly v: 0
  readonly kind: "substrate-incarnation-retired"
  readonly incarnation: string
  readonly cause: RetirementCause
}

/** Declares one incarnation's retirement. */
export const retiredFact = (
  incarnation: Digest,
  cause: RetirementCause,
): IncarnationRetired => ({
  v: 0,
  kind: "substrate-incarnation-retired",
  incarnation,
  cause,
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
