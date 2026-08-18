/**
 * Plane: kernel — the language: corpus, door, programs, and wire grammar.
 *
 * What a host operation says, written in the model-generated candidate
 * language. Every constructor below returns a `KernelCandidateAct` from
 * `KernelSchemas.generated.ts`; none of them judges, and none of them restates
 * a field the generated grammar already spells.
 *
 * This module exists because the alternative is worse. A host that owns its
 * own mapping owns a second vocabulary, and two hosts that map the same
 * operation differently are a second door wearing a translation layer. The
 * mapping is stated once, in the plane that owns the language, and the hosts
 * hand their input to it.
 *
 * ## The identity map is the trusted base
 *
 * The model carries identity labels — unbounded integers — and states nothing
 * about any hash function. The runtime carries content addresses: lowercase
 * SHA-256 hexadecimal. {@link kernelIdentity} is the map between them, and it
 * is believed because base-16 is a reading of the same bytes, not because
 * anything here was proved. It lives at exactly one seam so that a reviewer
 * can bound the trust by reading one function, and so that no carriage or
 * surface module ever performs the conversion itself.
 *
 * The map is injective on the digest domain: a lowercase 64-character hex
 * string is the base-16 numeral of exactly one integer below 2^256, so two
 * distinct digests can never name one identity. It is not surjective, and
 * nothing here claims a model identity comes from a digest.
 *
 * ## What each mapping does and does not carry
 *
 * A candidate is what the caller asks for, not everything the caller holds.
 * Each constructor states the bound it accepts in its own docstring; the
 * shared one is that an envelope's or a declaration's opaque content reaches
 * the candidate as its identity, because the kernel's argument atoms carry
 * unbounded integers and not bytes.
 *
 * @module
 */
import type {
  KernelCandidateAct,
  KernelDoorContext,
  KernelRawArg,
} from "./KernelDoor.js"
import type { KernelDeclKind } from "./KernelTables.generated.js"
import type { Envelope } from "./Wire.js"

/**
 * The runtime's content address read as the model's identity label.
 *
 * The one place in this package where a digest becomes a `KernelNat`. See the
 * module docstring for the bound: this is the trusted base's map, not a
 * theorem, and it is injective on lowercase hexadecimal digests.
 *
 * @example
 * ```ts
 * import { kernelIdentity } from "@foldlab/plait/Candidates"
 *
 * kernelIdentity("0".repeat(63) + "f")
 * // 15n
 * ```
 */
export const kernelIdentity = (digestHex: string): bigint => BigInt(`0x${digestHex}`)

/**
 * An admission context over declarations a caller already holds by address.
 *
 * A context is data, not judgment: it says which declarations this actor has
 * seen admitted and which of them its writ pins. Building one is how a host
 * says what it knows; the verdict over it stays the door's.
 *
 * @example
 * ```ts
 * import { admissionContextOver } from "@foldlab/plait/Candidates"
 *
 * admissionContextOver([{ kind: "lane", digest: laneDigest }])
 * ```
 */
export const admissionContextOver = (
  admitted: ReadonlyArray<{ readonly kind: KernelDeclKind; readonly digest: string }>,
): KernelDoorContext => {
  const refs = admitted.map((entry) => ({
    kind: entry.kind,
    id: kernelIdentity(entry.digest),
  }))
  return { catalog: refs, pinned: refs }
}

/**
 * Publishing one envelope onto its lane, as the kernel sentence it is.
 *
 * An envelope publication is an `emit`: the lane the envelope names must be a
 * declared lane in the acting catalog, or the door refuses `forward-reference`
 * before any byte reaches the fabric. Every envelope kind maps to `emit` —
 * `attest`, `checkpoint`, and `sealed` are observations on a lane exactly as
 * `emit` is, and the kernel's generator set does not separate them.
 *
 * Bound, stated rather than hidden: the envelope's `pins` do not reach the
 * candidate. A pin is a bare digest and the kernel's `digestRef` atom demands
 * a declaration kind, which the wire envelope does not carry; constructing one
 * would mean inventing the kind. Pin well-foundedness therefore stays the
 * fabric's own check and is not claimed here. What does reach the candidate is
 * the envelope's identity, as the one literal atom whose canonicalization
 * becomes the emitted sentence's value.
 */
export const envelopePublication = (
  envelope: Envelope,
  identity: string,
): KernelCandidateAct => ({
  _tag: "emit",
  lane: kernelIdentity(envelope.lane),
  body: [{ _tag: "literal", value: kernelIdentity(identity) }],
})

/**
 * Publishing one declaration under a writ.
 *
 * The declaration's lineage reaches the candidate as digest references, so a
 * declaration descending from something the catalog has not admitted is
 * refused `forward-reference`, and one descending from outside the writ's
 * pinned universe is refused `off-writ-referent`. Lineage is already carried
 * as model identity labels by the declaration form, so no conversion happens
 * on that path.
 */
export const declarationPublication = (
  kind: KernelDeclKind,
  lineage: ReadonlyArray<bigint>,
  identity: string,
  writ: bigint,
): KernelCandidateAct => ({
  _tag: "declare",
  kind,
  payload: [
    ...lineage.map((id): KernelRawArg => ({ _tag: "digestRef", kind: "program", id })),
    { _tag: "literal", value: kernelIdentity(identity) },
  ],
  writ,
})

/**
 * Reading back what a digest names.
 *
 * `resolve` is anchor-free because a digest names one value forever: an
 * anchored resolve is spellable here so the door can refuse it
 * `anchored-resolve` rather than silently ignoring the anchor.
 */
export const digestResolution = (
  kind: KernelDeclKind,
  identity: string,
  anchor?: bigint,
): KernelCandidateAct => ({
  _tag: "resolveDigest",
  kind,
  target: kernelIdentity(identity),
  anchor,
})

/** Where a partitioned read stands, in the generated anchor's own fields. */
export interface SpanAnchor {
  readonly foldId: bigint
  readonly lane: bigint
  readonly shard: bigint
  readonly floor: bigint
  readonly state: bigint
  readonly head: bigint
}

/**
 * Reading one declared fold at an anchor.
 *
 * The lane rides the query as a digest reference, so a read pointed at a lane
 * the fold's declaration did not commit is refused `forward-reference`, and a
 * read whose anchor names a different fold than the one declared is refused
 * `cross-sort-identifier`.
 */
export const anchoredRead = (
  declared: bigint,
  anchor: SpanAnchor,
  query: ReadonlyArray<KernelRawArg>,
): KernelCandidateAct => ({
  _tag: "fold",
  declared,
  anchor,
  query,
})

/**
 * Reading whatever is current.
 *
 * There is no lawful spelling of this: the fold carrier has no head parameter,
 * so an unanchored read is refused `ambient-query-input` with the anchor as
 * its taught repair. A host that offers an unpinned read spells it here and
 * lets the door say so, instead of writing the law out again itself.
 */
export const latestRead = (subject: bigint): KernelCandidateAct => ({
  _tag: "readLatest",
  subject,
})

/**
 * Landing a decided outcome against its register.
 *
 * A landing with no token is refused `unfenced-decide`, and one whose token
 * claims a different register than the decision's is refused
 * `cross-sort-identifier`. Both shapes are spellable so that both refusals are
 * demonstrable rather than assumed.
 */
export const outcomeLanding = (
  register: string,
  outcome: string,
  token?: { readonly register: bigint; readonly value: bigint },
): KernelCandidateAct => ({
  _tag: "decide",
  register: kernelIdentity(register),
  token,
  outcome: [{ _tag: "literal", value: kernelIdentity(outcome) }],
})
