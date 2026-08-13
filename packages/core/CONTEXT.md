# packages/core — module vocabulary

Local terms hidden behind this seam. The public language is root
[CONTEXT.md](../../CONTEXT.md); nothing here may leak into it.

**Twin**:
The TS implementation of an algebra whose reference lives in Go. A twin
exists to make the wall provable — it earns byte-identical digests or
it is wrong; it never diverges "for TS convenience".

**Frame fixture**:
The frozen Go-generated gzip frame (`fixtures/stream-wall.json`, via
`go/cmd/streamfix`) that `schema.wall.test.ts` decodes: Go→TS ingestion
typed by a schema, judged by decoded values and heads, never compressed
bytes.

**Combine (KV)**:
`combineKV` in `stream.ts`, twinned as `CombineKV` in `go/stream` — the
last-write-wins map union, right read as the later half of one history.
A monoid and only a monoid: it satisfies the parallel-replay
homomorphism unconditionally, and it is neither commutative nor
idempotent, because order is the semantics of last-write-wins and the
event count is a sum. Say "combine", not "merge": a merge in this lane
is a committed linearization (`MergeFact`), and the two are different
things.

**Join (KV)**:
`combineSeqKV` in `kvSemilattice.ts` — the same fold made idempotent,
commutative and associative by enriching the state to
`key -> (witness, value)` plus the identity coordinates absorbed. The
**witness** is `(seq, stream)`: sequence as logical clock, stream id as
deterministic tie-break. Single-implementation, no Go twin, therefore
not a wall; its one wall-anchored claim is the projection back onto
`KVState`, which reproduces the frozen fold-state digest on the frozen
corpus. A tie at one identity coordinate with two different values
refuses rather than picking. The sequence coordinate is a non-negative
JavaScript safe integer, not an arbitrary u64: event admission and structural
state combination refuse every other number before witness comparison.

**Claimed law**:
A `commutative` or `idempotent` claim carried on an `Algebra` beside its
spec, never inside it — `AlgebraSpec` is hashed into every frozen fold
digest, so the claim rides alongside as `generator` does. The generated
suite turns each claim into a property test and generates nothing where
nothing is claimed, so a suite's list of law names is a faithful
statement of what was checked.

**Walled boundary behavior**:
Canonical JSON encoding and `applyKV` refuse excluded inputs as data; the four
algebra derivation gates withhold identity from unbranded declarations and
unbranded value maps; fold-cache storage and fold handles reject structural
costumes. `kvStep` reports an excluded payload as `undefined`; entity collection
deliberately forgives it as a meaning no-op while its identity fold still
commits the bytes. Declared payload-reading steps use that same constrained
decoder; duplicate-member, over-depth, and other excluded payloads cannot enter
fold state through a looser host parser. Lower-level canonical writers retain their documented range
errors. The algebra's residual — a genuine declaration re-hosted onto foreign
behavior — also reaches the digest-keyed cache and remains a pinned known gap
outside this claim, which does not assert a package-wide error-channel
migration.

**Error discipline** (law):
Three dialects, on purpose. Pure synchronous modules twinned with Go —
`jcs`, `algebra`, `foldCache`, `foldLaws` — return ok-unions
(`{ ok: false, refusal }`), because that path mints digests and must run
as plain functions. `kvSemilattice` joins them for the same reason and
not by analogy: its `projectKV` output goes straight into `stateDigest`,
so the join stays outside Effect exactly where the digests are minted. Effect-shaped surfaces carry `Data.TaggedError`
failures in the typed error channel (`stream.ts`: `MergeGap`,
`MalformedPayload`, `CompactionBoundary`, and the rest). Internal
canonical-encoder range violations throw `RangeError` — they are
programmer errors about the encoding domain, not refusals a caller
repairs. The split is deliberate: Effect stays OUTSIDE the
digest-minting path that the cross-language wall proves byte-identical
to Go, since unification would put `Effect.runSync` inside it.
Unifying the three is a stated non-goal, not an unfinished migration.
