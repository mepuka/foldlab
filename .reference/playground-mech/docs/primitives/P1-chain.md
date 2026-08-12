# P1 — Chained Fact Log

Status: **SPEC RULED — climbing.** The law suite in
`packages/kernel/test/chain.laws.test.ts` is the fitness function.
Coordinator-owned; an implementing agent MUST NOT edit this document or that
suite. A law that seems wrong is a finding for the attempts log, not an edit.

## Definition

A pure, zero-I/O, content-addressed, hash-chained append-only sequence of
opaque payload bytes, plus verification by recomputation. This is the trustless
identity layer: **equal head digest ⇒ equal history ⇒ equal fold** (with P0's
replay). Integrity derives from content alone — no broker, no ACL, no trusted
mediator, still no async.

Everything lives in ONE new module, `packages/kernel/src/chain.ts`:

```ts
export const GENESIS: string   // "0".repeat(64) — the head of the empty chain

export interface ChainEntry {
  readonly seq: number      // dense, 0-based
  readonly prev: string     // entryDigest of the previous entry; GENESIS at seq 0
  readonly payload: string  // opaque bytes (at the bridge: P0 canonical event bytes)
}

// digestHex over the canonical encoding of the entry (P0 canonical.ts encode
// with a Schema for ChainEntry; keys serialize code-unit sorted: payload, prev, seq).
export const entryDigest: (entry: ChainEntry) => string

export interface Chain {
  readonly entries: ReadonlyArray<ChainEntry>
  readonly head: string     // entryDigest of the last entry; GENESIS if empty
}
export const empty: Chain
export const append: (chain: Chain, payload: string) => Chain   // pure; returns new chain

// Structural verification: internal consistency of a candidate entry sequence.
export type VerifyOk = { readonly ok: true; readonly head: string; readonly length: number }
export type VerifyErr = {
  readonly ok: false
  readonly seq: number                       // seq of the FIRST offending entry
  readonly reason: "seq" | "prev"            // dense-sequence break | chain-link break
}
export const verify: (entries: ReadonlyArray<ChainEntry>) => VerifyOk | VerifyErr

// Anchored verification: structural verify PLUS head equality against an
// expected head. Truncation and tail mutation are detectable ONLY here — a
// structurally valid prefix is still a valid chain (that is inherent, not a bug).
export const verifyAgainst: (
  expectedHead: string,
  entries: ReadonlyArray<ChainEntry>,
) => VerifyOk | VerifyErr | { readonly ok: false; readonly seq: -1; readonly reason: "head" }

// Incremental verification — the pure ancestor of P2's resume cursor.
export interface Cursor { readonly seq: number; readonly head: string }
export const initialCursor: Cursor           // { seq: -1, head: GENESIS }
export const stepVerify: (
  cursor: Cursor,
  entry: ChainEntry,
) => { readonly ok: true; readonly cursor: Cursor } | VerifyErr

// Equivocation: first seq at which two entry sequences diverge (byte-level on
// canonical entry encodings), or null if one is a prefix of the other.
export const firstDivergence: (
  a: ReadonlyArray<ChainEntry>,
  b: ReadonlyArray<ChainEntry>,
) => number | null
```

Ruled semantics:

- `append` computes `seq`/`prev` itself; callers supply only payload bytes.
  Payloads are opaque strings; they MUST be free of `"\n"` (the canonical
  encoding of any P0 value already is; `append` throws `TypeError` on a
  payload containing `"\n"` — a boundary exclusion, same class as malformed
  commands at P0).
- `verify` reports the FIRST offense. `VerifyErr.seq` is the zero-based
  POSITION (index) of the first offending entry in the presented sequence —
  not the entry's own (possibly forged) `seq` field. An entry whose `seq`
  field does not equal its position is reason `"seq"`; a `prev` that does not
  equal the recomputed digest of the predecessor (or `GENESIS` at position 0)
  is reason `"prev"`; when both offend, `"seq"` wins (checked first). An empty
  sequence is `ok` with `head: GENESIS, length: 0`.
- Entries carry no stored self-digest — identity is always recomputed. (A
  stored digest would be a claim; recomputation is the trustless posture.)
- `verifyAgainst` runs structural verification FIRST; only on structural
  success does it compare the recomputed head against `expectedHead`, and a
  mismatch is `{ ok: false, seq: -1, reason: "head" }`. A structurally broken
  sequence therefore reports its structural offense, never `"head"`.
- `stepVerify` reports `seq: cursor.seq + 1` — the absolute position in the
  chain — regardless of where the cursor was resumed from.
- The entry encoding is pinned independently of any implementation:
  `entryDigest({ seq: 0, prev: GENESIS, payload: "p" })` MUST equal
  `d5a1b56d653004c5659c1aae4dc41470dfd2a3656f14f2966d2f01c4287340b4`
  (sha256 of `{"payload":"p","prev":"0"×64,"seq":0}`), and the head of the
  two-payload chain `["a","b"]` MUST equal
  `c2ac792d912155f8ea3b2b3b132180eff86c1993e224ca0168e00247840a6fdc`.
  These literals were computed by the coordinator without reference to any
  chain implementation; they are what makes the golden fixtures a pin rather
  than a fixed point of the code under test.
- Collision resistance of sha256 is an assumption of the ladder, stated at P0.
- **Fixture handoff (ruled):** after `chain.ts` first passes CL1–CL6, the
  implementing agent runs `bun packages/kernel/scripts/gen-golden-p1.ts`
  exactly ONCE and commits `fixtures/golden-chain-heads.json`; the file is
  frozen thereafter. (Same handoff as P0's L5d.)

## Laws

- **CL1 — Append determinism and head–history identity.** Building a chain
  from a payload list is deterministic (same list ⇒ byte-identical entries and
  head), and heads are injective over histories in the generated corpus:
  two payload lists yield equal heads iff the lists are equal.
- **CL2 — Completeness.** Every honestly appended chain passes `verify`, and
  passes `verifyAgainst(chain.head, …)`; `verify` of any of its PREFIXES also
  passes (prefix-validity is inherent); the returned `head`/`length` match.
- **CL3 — Anchored soundness under adversarial mutation.** For any built chain
  and any effective mutation (payload edit, seq bump, prev rewrite, entry
  deletion at any position including the tail, duplication, adjacent swap,
  truncation), `verifyAgainst(originalHead, mutated)` is `ok: false`.
  Additionally, any mutation NOT confined to a suffix of the sequence (i.e.
  one that breaks internal consistency) is caught by structural `verify`
  alone, with the correct first-offense `seq`.
- **CL4 — Fork detection.** Two chains sharing a common prefix and then
  diverging: `firstDivergence` returns exactly the first divergent seq; their
  heads differ; and each side's own anchored verify still passes (a fork is
  two valid histories — the crime is the pair, which is why the head is the
  identity).
- **CL5 — The bridge law (P1 consumes P0).** For any catalog decider driven by
  any seeded command sequence: appending each emitted event's canonical bytes
  to a chain, verifying, decoding the payloads back, and P0-replaying them
  byte-equals direct P0 replay of the raw events. The chain is a faithful
  carrier: verification changes nothing, loses nothing, reorders nothing.
- **CL6 — Incremental verify ≡ whole verify.** Folding `stepVerify` from
  `initialCursor` over any entry sequence (honest or mutated) yields exactly
  `verify`'s verdict: same ok/err, same first-offense seq, and on success a
  cursor whose `head` equals `verify`'s head. Resume from any intermediate
  cursor over the remaining entries agrees likewise (the P2 cursor law in
  pure form).

Golden fixtures: `packages/kernel/fixtures/golden-chain-heads.json`, generated
ONCE by the coordinator-owned `packages/kernel/scripts/gen-golden-p1.ts`
(drive each catalog decider over the pinned seeds, append emitted event bytes,
record head + length), then frozen — the Go conformance gate at P2, like P0's
L5d fixtures.

## Verification

`bun run typecheck && bun test packages/kernel` — the P0 suite MUST stay green
(a P1 climb that breaks P0 is a failed climb). In-process, zero I/O beyond
fixtures, sub-second. Counterexamples shrink to a minimal payload list plus a
minimal mutation description.

## References

- RFC 6962 (Certificate Transparency) — append-only Merkle/chain logs;
  equivocation as the detectable crime.
- Crosby & Wallach, "Efficient Data Structures for Tamper-Evident Logging"
  (USENIX Security 2009) — the mutation/soundness adversary model.
- Baquero/Almeida/Shoker — per-origin gap-free FIFO as the delivery
  precondition (what `seq` density buys P5's merge).
- Local prior art: tailtalk per-origin chains (self-hash before chain-link
  ordering; quarantine-not-repair), Cotal content addressing, P0's
  `history-register` (the pure oracle this rung realizes as a data structure).
