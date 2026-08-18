/**
 * Plane: kernel — the language: corpus, door, programs, and wire grammar.
 *
 * The admission door seam: candidate in, verdict out.
 *
 * The kernel model splits its sentences in two. The intrinsic layer has no
 * constructor for an unlawful act, so unlawfulness is unspellable there. The
 * candidate layer spells everything an agent can say, including every unlawful
 * shape, and one door either translates a candidate into an intrinsic sentence
 * or refuses it with the law it defends. This module is the runtime's spelling
 * of that candidate layer and of the door's contract.
 *
 * The shipping implementation lives in `Door.ts`; `Admission.ts` exposes it
 * as the one Effect service and translates its verdict into the runtime
 * refusal family. The conformance harness checks that shipping implementation
 * verdict-for-verdict against the model's emitted admission vectors.
 * Conformance to those vectors is agreement with the model, never a runtime
 * guarantee promoted out of it.
 *
 * The refusal vocabulary is not restated here. It is read from the generated
 * tables, so a reason this package can name is a reason the model emitted.
 *
 * @module
 */
import type { KernelDeclKind, KernelRefusalReason } from "./KernelTables.generated.js"

/**
 * A raw argument atom. The lawful atoms are digest references and literals;
 * a hole is lawful inside a program declaration and refused in a single
 * sentence; the rest stay spellable precisely so the door's refusal of them is
 * demonstrable rather than asserted.
 */
export type KernelRawArg =
  | { readonly _tag: "digestRef"; readonly kind: KernelDeclKind; readonly id: number }
  | { readonly _tag: "literal"; readonly value: number }
  | { readonly _tag: "hole"; readonly name: number }
  | { readonly _tag: "clockNow" }
  | { readonly _tag: "randomSeed" }
  | { readonly _tag: "secretBytes"; readonly bytes: number }
  | { readonly _tag: "mintedId"; readonly token: number }
  | { readonly _tag: "functionValue"; readonly code: number }

/**
 * A candidate resume coordinate. Its fold rides as data rather than as a type
 * index, which is exactly what lets a cross-fold anchor be spelled and refused.
 */
export interface KernelCandidateAnchor {
  readonly foldId: number
  readonly lane: number
  readonly shard: number
  readonly floor: number
  readonly state: number
  readonly head: number
}

/**
 * A raw token claim: the register the claimant believes the token belongs to,
 * carried as data so a cross-register claim is spellable and refused.
 */
export interface KernelTokenClaim {
  readonly register: number
  readonly value: number
}

/**
 * A candidate merge strategy. The lawful one names a declared merge algebra;
 * last-writer-wins is spellable and refused, because no such carrier exists.
 */
export type KernelMergeStrategy =
  | { readonly _tag: "declaredAlgebra"; readonly algebra: number }
  | { readonly _tag: "lastWriterWins" }

/**
 * The candidate trigger grammar: the five lawful monotone productions plus the
 * shapes the closed grammar deliberately cannot carry.
 */
export type KernelCandidatePredicate =
  | { readonly _tag: "evidenceAppears"; readonly lane: number; readonly pattern: number }
  | { readonly _tag: "cellReaches"; readonly cell: number; readonly threshold: number }
  | { readonly _tag: "holeReaches"; readonly hole: number; readonly stage: number }
  | { readonly _tag: "outcomeLanded"; readonly register: number }
  | {
    readonly _tag: "headAdvancedPast"
    readonly lane: number
    readonly shard: number
    readonly position: number
  }
  | { readonly _tag: "onAbsence"; readonly subject: number }
  | { readonly _tag: "negation"; readonly inner: KernelCandidatePredicate }
  | { readonly _tag: "deadline"; readonly tick: number }
  | { readonly _tag: "absentEverywhere"; readonly cell: number }

/**
 * The raw candidate grammar. Every generator is spellable, and so is every
 * unlawful shape: an anchored resolve, a trusted read, an unfenced or
 * cross-register decide, a last-writer-wins join, an unanchored latest read,
 * and an in-place mutation of the past. A `null` optional field is the model's
 * `none`.
 */
export type KernelCandidateAct =
  | {
    readonly _tag: "declare"
    readonly kind: KernelDeclKind
    readonly payload: ReadonlyArray<KernelRawArg>
    readonly writ: number
  }
  | {
    readonly _tag: "resolveDigest"
    readonly kind: KernelDeclKind
    readonly target: number
    readonly anchor: number | null
  }
  | {
    readonly _tag: "trustBytes"
    readonly kind: KernelDeclKind
    readonly target: number
    readonly asserted: number
  }
  | { readonly _tag: "emit"; readonly lane: number; readonly body: ReadonlyArray<KernelRawArg> }
  | {
    readonly _tag: "join"
    readonly cell: number
    readonly contribution: ReadonlyArray<KernelRawArg>
    readonly strategy: KernelMergeStrategy
  }
  | { readonly _tag: "readLatest"; readonly subject: number }
  | {
    readonly _tag: "fold"
    readonly declared: number
    readonly anchor: KernelCandidateAnchor | null
    readonly query: ReadonlyArray<KernelRawArg>
  }
  | {
    readonly _tag: "decide"
    readonly register: number
    readonly token: KernelTokenClaim | null
    readonly outcome: ReadonlyArray<KernelRawArg>
  }
  | {
    readonly _tag: "trigger"
    readonly predicate: KernelCandidatePredicate
    readonly declaration: number
  }
  | { readonly _tag: "spawn"; readonly parent: number; readonly request: number }
  | {
    readonly _tag: "updateInPlace"
    readonly target: number
    readonly payload: ReadonlyArray<KernelRawArg>
  }

/** A kind-tagged reference: the one lawful way a heterogeneous digest set travels. */
export interface KernelRef {
  readonly kind: KernelDeclKind
  readonly id: number
}

/**
 * The admission context: the already-admitted catalog and the universe of
 * referents the acting writ pins. A referent can resolve in the catalog and
 * still lie outside the pinned universe, which is its own refusal.
 */
export interface KernelDoorContext {
  readonly catalog: ReadonlyArray<KernelRef>
  readonly pinned: ReadonlyArray<KernelRef>
}

/**
 * The verdict of one admission. An admitted candidate carries the canonical
 * encoding of the intrinsic sentence it translated into — the sentence's
 * identity, and therefore the thing a conformance vector can compare. A
 * refusal carries the wire reason, and the taught law and repair are looked up
 * from the generated table rather than restated at each door.
 */
export type KernelVerdict =
  | { readonly verdict: "admitted"; readonly encoded: ReadonlyArray<number> }
  | { readonly verdict: "refused"; readonly reason: KernelRefusalReason }

/**
 * One admission door. The runtime's single constructor of intrinsic acts: if a
 * candidate did not come through here, it has no sentence.
 */
export interface KernelDoor {
  readonly admit: (candidate: KernelCandidateAct) => KernelVerdict
}
