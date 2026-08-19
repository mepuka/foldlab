/**
 * The coherence wall: structural equality of envelopes IS identity equality.
 *
 * ```
 * Equal.equals(a.envelope, b.envelope)  <=>  a.digest === b.digest
 * ```
 *
 * Every read-side affordance in this package leans on that coincidence — the
 * digest equivalences replace a structural walk with one string compare, and a
 * decoded value put in a hash-keyed structure is expected to find its twin. The
 * coincidence is a consequence of two facts that are proved elsewhere and stated
 * here, so it is pinned as an executable sentence rather than carried as
 * folklore.
 *
 * **Forward (equal values, equal digests) is canonicalization determinism.**
 * Structurally equal values have one RFC 8785 byte form, and the digest is
 * SHA-256 over exactly those bytes, so equal values cannot carry different
 * digests. That half is walled independently by the canonicalizer's own
 * cross-language differential and is exercised here over the corpus.
 *
 * **Backward (equal digests, equal values) holds modulo SHA-256 collision
 * resistance, which is TRUSTED BASE and not proved anywhere in this estate.**
 * Two structurally different envelopes with one digest would be a SHA-256
 * collision; the wall observes that no such pair appears, and observing that is
 * not a proof that none exists. The sentence is stated in the same terms the
 * verification ledger states it, so the claim is sized to its evidence.
 *
 * **The pin's own gotcha, and how this wall stays clear of it.** The pinned
 * `Equal.equals` caches its answer per object pair in a WeakMap and hashes each
 * object once, so an object mutated after its first comparison keeps answering
 * with the answer it had before. The last case below demonstrates that on real
 * decoded envelopes rather than restating the pin's documentation. Plait values
 * are decode-produced and treated as immutable, and this wall holds itself to
 * that: every comparison above it is over values decoded for that comparison, so
 * no cached answer ever outlives the bytes it was computed from.
 */
import { describe, expect, test } from "bun:test"

import { Effect, Equal } from "effect"
import * as FastCheck from "fast-check"

import { Digest } from "../src/truth/Digest.js"
import {
  decodeEnvelope,
  encodeEnvelope,
  EnvelopeKind,
  byDigest,
  envelopeEquivalence,
  type DecodedEnvelope,
  type Envelope,
} from "../src/kernel/Wire.js"

const utf8 = new TextEncoder()

interface CorpusRow {
  readonly case: string
  readonly digest: string
  readonly envelope: Envelope
}

/**
 * The committed corpus, read as bytes. The rows are the generated ones — the
 * wall's inputs are the same values every other consumer of the corpus reads,
 * never a set typed for this file.
 */
const corpusRows: ReadonlyArray<CorpusRow> = (await Bun.file(
  new URL("../fixtures/envelopes.ndjson", import.meta.url),
).text())
  .trimEnd()
  .split("\n")
  .slice(1)
  .map((line) => JSON.parse(line) as CorpusRow)

/**
 * One decode, performed now. Every comparison in this file calls this for each
 * side, so the two values compared are always distinct objects that were built
 * from bytes moments earlier — which is what keeps the pin's per-pair cache from
 * ever being asked about a value anything could have moved.
 */
const fresh = (envelope: Envelope): DecodedEnvelope =>
  Effect.runSync(encodeEnvelope(envelope))

describe("the Equal-digest coherence wall, over the generated corpus", () => {
  test("the corpus carries rows to compare", () => {
    expect(corpusRows.length).toBeGreaterThan(1)
  })

  test("structural equality and digest equality agree on every ordered pair", () => {
    for (const left of corpusRows) {
      for (const right of corpusRows) {
        const a = fresh(left.envelope)
        const b = fresh(right.envelope)
        expect(Equal.equals(a.envelope, b.envelope)).toBe(a.digest === b.digest)
      }
    }
  })

  test("two independent decodes of one row are distinct objects that agree both ways", () => {
    for (const row of corpusRows) {
      const a = fresh(row.envelope)
      const b = fresh(row.envelope)
      expect(a.envelope).not.toBe(b.envelope)
      expect(Equal.equals(a.envelope, b.envelope)).toBe(true)
      expect(a.digest).toBe(b.digest)
      expect(a.digest).toBe(Digest.make(row.digest))
    }
  })

  test("distinct corpus rows are distinct both ways", () => {
    for (let index = 1; index < corpusRows.length; index++) {
      const a = fresh(corpusRows[index - 1]!.envelope)
      const b = fresh(corpusRows[index]!.envelope)
      expect(a.digest).not.toBe(b.digest)
      expect(Equal.equals(a.envelope, b.envelope)).toBe(false)
    }
  })

  test("the digest equivalence and the derived structural one answer alike", () => {
    for (const left of corpusRows) {
      for (const right of corpusRows) {
        const a = fresh(left.envelope)
        const b = fresh(right.envelope)
        expect(byDigest(a, b)).toBe(envelopeEquivalence(a.envelope, b.envelope))
      }
    }
  })
})

/**
 * The generated half. The pool is deliberately small in every coordinate, so a
 * pair drawn from it collides often — a property that only ever produced
 * different envelopes would exercise one side of the biconditional and report a
 * pass for it.
 */
const digestPool = [
  Digest.make("015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862"),
  Digest.make("bb4f3e5e257ca09b067986bbcb6fa72f9b868eea9d4dff92afd94e2876aa795a"),
  Digest.make(`${"0".repeat(63)}1`),
] as const

const envelopeArbitrary: FastCheck.Arbitrary<Envelope> = FastCheck.record({
  v: FastCheck.constant(0 as const),
  kind: FastCheck.constantFrom(...EnvelopeKind.literals),
  lane: FastCheck.constantFrom(...digestPool),
  key: FastCheck.constantFrom<Envelope["key"]>(
    "entity-1",
    17,
    ["corpus", 2],
    { entity: "entity-1", partition: 0 },
  ),
  holder: FastCheck.constantFrom("seat-alpha", "venue-a", "café"),
  body: FastCheck.constantFrom<Envelope["body"]>(
    null,
    true,
    1.5,
    { terms: { "β": 2, a: 1 } },
    [null, true, 1.5],
  ),
  pins: FastCheck.constantFrom<Envelope["pins"]>(
    [],
    [digestPool[0]],
    [digestPool[0], digestPool[1]],
  ),
})

describe("the Equal-digest coherence wall, over generated envelopes", () => {
  test("structural equality and digest equality are the same relation", () => {
    FastCheck.assert(
      FastCheck.property(envelopeArbitrary, envelopeArbitrary, (left, right) => {
        const a = fresh(left)
        const b = fresh(right)
        return Equal.equals(a.envelope, b.envelope) === (a.digest === b.digest)
      }),
      { numRuns: 500 },
    )
  })

  test("the relation is reflexive across two independent decodes of one value", () => {
    FastCheck.assert(
      FastCheck.property(envelopeArbitrary, (envelope) => {
        const a = fresh(envelope)
        const b = fresh(envelope)
        return a.envelope !== b.envelope
          && Equal.equals(a.envelope, b.envelope)
          && a.digest === b.digest
      }),
      { numRuns: 500 },
    )
  })

  test("the pool really does produce colliding pairs, so the positive branch is exercised", () => {
    const sampled = FastCheck.sample(envelopeArbitrary, { numRuns: 200, seed: 1 })
    const digests = sampled.map((envelope) => fresh(envelope).digest)
    expect(new Set(digests).size).toBeLessThan(digests.length)
  })
})

describe("the pin's equality cache, demonstrated rather than cited", () => {
  const envelopeWithHolder = (holder: string): DecodedEnvelope =>
    Effect.runSync(decodeEnvelope(utf8.encode(JSON.stringify({
      v: 0,
      kind: "emit",
      lane: digestPool[0],
      key: "entity-1",
      holder,
      body: null,
      pins: [],
    }))))

  test("a value mutated after its first comparison keeps the answer it had before", () => {
    const left = envelopeWithHolder("seat-alpha")
    const right = envelopeWithHolder("seat-beta")
    expect(Equal.equals(left.envelope, right.envelope)).toBe(false)

    // The only mutation in this package, performed here to show what the
    // discipline above is avoiding.
    ;(right.envelope as { holder: string }).holder = left.envelope.holder
    expect(right.envelope.holder).toBe(left.envelope.holder)

    // Structurally these are now the same value, and the pin still says no.
    expect(Equal.equals(left.envelope, right.envelope)).toBe(false)

    // Decoded afresh, the same two envelopes agree — which is the whole of the
    // discipline: compare values decoded for the comparison, and the cache
    // never has a stale answer to give.
    const reread = envelopeWithHolder("seat-alpha")
    expect(Equal.equals(left.envelope, reread.envelope)).toBe(true)
    expect(left.digest).toBe(reread.digest)
  })
})
