# Adversarial audit: digest resolution and verify-on-read

Scope: `packages/plait/src/` (application layer) and `go/journal`, `go/register`,
`go/canonical` (the Go twins), audited against the estate's verify-on-read law —
every path where bytes become values re-derives the digest and refuses on
mismatch, with absence and tamper as distinct refusals.

Read in full: `Resolved.ts`, `Catalog.ts`, `Blob.ts`, `Cell.ts`, `Digest.ts`,
`Wire.ts`, `Canonical.ts`, `Refusal.ts`, `Register.ts`, `CasDaemon.ts`, and
`internal/{cas,cells,anchors,nats,transport,digests,refusals,registers,pump,successors}.ts`;
`packages/core/src/jcs.ts`; `go/journal/journal.go`, `go/register/register.go`,
`go/canonical/canonical.go`; the pinned `effect@4.0.0-rc.108` `Cache.ts` and
`Duration.ts`; `docs/design/2026-08-17-plait-effect-affordances.md` §A-8;
`docs/research/2026-08-12-jetstream-guarantees-source-verified.md` §§2, 4, 5.

**Counts: 7 findings — 0 exploitable-now, 4 latent, 3 hygiene. 11 candidates
checked and held.**

---

## Findings, severity-ranked

### F-1 (latent) — the payload resolve leg launders its input: `JSON.parse` over a non-fatal `TextDecoder`, so the digest pins the value and never the bytes

**Where.** `packages/plait/src/Resolved.ts:106-113`

```ts
const decodePayload = (digest, bytes) =>
  Effect.try({
    try: () => JSON.parse(new TextDecoder().decode(bytes)) as WireValue,
    catch: (cause) => malformedPayload(digest, String(cause)),
  })
```

and `packages/plait/src/Resolved.ts:97-104`

```ts
const verified = ... function* (digest, value) {
  const rederived = yield* digestOf(value)
  if (rederived === digest) return value
  return yield* incoherent(digest, rederived)
}
```

`digestOf` (`Digest.ts:31-36`) canonicalizes *then* hashes. So the check performed
on `resolve`'s payload leg (`Resolved.ts:141`) is `sha256(canonical(parse(bytes))) == D`.
It is never `sha256(bytes) == D`. Nothing on this path ever looks at the fetched
bytes again.

Two amplifiers, both in the one line:

1. `new TextDecoder()` defaults to `fatal: false`. Invalid UTF-8 is silently
   replaced with U+FFFD. This is precisely the hazard the Go twin names and
   refuses at `go/journal/journal.go:406-410`: *"Invalid UTF-8 is outside the
   canonical domain: both the wire encoder and EntryDigest would launder it to
   U+FFFD, collapsing distinct payloads to one journal identity."*
2. `JSON.parse` is not the estate's decoder. Every other constrained-decode door
   in the package uses `decodeJson` from `@foldlab/core/jcs` — `Wire.ts:240`,
   `internal/anchors.ts:92`, `internal/anchors.ts:157` — which decodes through
   `strictUtf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })`
   (`packages/core/src/jcs.ts:36, 355`) and refuses duplicate member names
   (`jcs.ts:202`), non-finite numbers (`jcs.ts:334`), and over-deep nesting
   (`jcs.ts:171, 189`). `Resolved.decodePayload` is the only verify-on-read door
   in the package that uses the platform parser instead.

**Failure scenario (concrete).** A `Payloads` layer is asked for digest `D`,
which names a value `v` containing the string `"�"`. The store returns a
byte string in which those three UTF-8 bytes are replaced by the single invalid
byte `0x80`. The non-fatal decoder restores `U+FFFD`; `JSON.parse` succeeds;
`canonical(v)` is unchanged; `digestOf` returns `D`; `resolve` returns `v`. Two
distinct byte strings verified against one digest, and the reader cannot tell
which it received. The same holds, without needing invalid UTF-8 at all, for a
store that returns `{"a":1,"a":2}` (duplicate member — refused by the estate's
own decoder, accepted here, last-wins), or simply reordered keys or added
whitespace.

**The doc this contradicts.** `internal/digests.ts:29-33` licenses
`digestOfStoredBytes` by saying that this door *"claims nothing about the bytes
being one canonical wire value, and the seam that needs that claim
(`Resolved.decodePayload`) checks it itself."* `decodePayload` performs no such
check. The refusal minted one function above even prints the law as if it did:
*"Stored payload bytes decode as one RFC 8785 wire value before any identity
check"* (`Resolved.ts:90`).

**Why it is latent, not exploitable-now.** `Payloads.layer` answers every lookup
with `Option.none()` (`Catalog.ts:143-146`), so the shipped layer stack never
reaches `decodePayload`. But `Payloads.testLayer` is public, the seam's stated
purpose is *"so a lying layer can be supplied under it and refused at the one
verify door"* (`Catalog.ts:60-63`), and the shipped negative control
(`test/Resolved.test.ts:120-128`) lies only with a *different value* — no wall
covers the class of lie where the value is right and the bytes are not.

**Refutation attempted and failed.** One could argue that content addressing
names a value, not a byte string, so a value-level check is sufficient. The
estate does not say that: `Resolved.ts:198-200` licenses `ResolveCache` on
*"A digest names exactly one canonical byte string"*, and A-8a's license in the
design record is the same sentence. That sentence is false of this door.

---

### F-2 (latent) — cross-layer asymmetry: the Go twin closes the byte loop, no TypeScript read path does; the same stored bytes are `tampered` in Go and accepted in TS

**Where (Go, correct).** `go/journal/journal.go:361-382`, `verifyStoredEntry`:

```go
entry, err := decodeEntry(raw.Data)          // lenient encoding/json — journal.go:563
...
digest, err := canonical.EntryDigest(entry)  // re-derive from the DECODED entry
if canonical.DigestHex(raw.Data) != digest { // ...and compare to SHA over the RAW BYTES
    return ..., tampered(position, "wire bytes are not canonical")
}
```

Go tolerates a lenient parser precisely because it closes the loop with the raw
bytes at `journal.go:379`. Any laundering, duplicate key, reordering, or added
whitespace makes the re-encode differ from what was stored and the comparison
fails. `canonical.EntryDigest` (`go/canonical/canonical.go:246-250`) additionally
refuses invalid UTF-8 in `payload` and `prev` outright.

**Where (TypeScript, no equivalent).** No read path in `packages/plait/src`
performs that comparison:

- `Resolved.verified` — `Resolved.ts:101` hashes the value (see F-1).
- `Wire.decodeEnvelope` — `Wire.ts:253-258` re-canonicalizes the decoded envelope
  and hashes *the re-canonicalized bytes*, discarding the bytes it was handed:
  ```ts
  const bytesCanonical = yield* canonicalBytes(decoded.success)
  return { envelope: decoded.success, bytes: bytesCanonical,
           digest: digestOfCanonicalBytes(bytesCanonical) }
  ```
  `verifyEnvelopeDigest` (`Wire.ts:279-284`) then compares that laundered digest
  to the `Nats-Msg-Id`. An envelope stored with non-canonical bytes carrying the
  canonical digest as its message id is accepted.
- `internal/anchors.ts:157-169` `loadState` — decodes with `decodeJson` (good) but
  then hashes the decoded value, not the entry bytes.

**Same value, opposite verdicts.** A stored record whose fields are in
non-canonical order, or that carries one extra space after a colon, carrying the
correct canonical digest as its identity: refused by Go as
`ErrTampered "wire bytes are not canonical"` (`journal.go:379`), accepted by
every TypeScript read path (`Wire.ts:253-257`, `Resolved.ts:101`,
`anchors.ts:165`).

**The intra-file inconsistency that makes this a defect rather than a taste
call.** `internal/anchors.ts` enforces bytes when it *writes* and only values when
it *reads*. `ensureState`'s duplicate-create reconciliation compares raw bytes —
`bytesEqual(existing.value, bytes)` at `anchors.ts:141`, with the refusal text
*"different bytes at digest key"* — while `loadState`, the actual read door for
the same key, does not. One file, one key, two different notions of what the
digest names.

**Refutation attempted and partly succeeded.** No single record is read by both
twins today (the Go journal owns its own subject; TS reads `flb.fab.fact.*`), so
there is no live divergence between two running readers. Hence *latent*. The
existing cross-language corpus wall proves *encoder* parity — one corpus, three
languages, byte-identical both ways — and by construction cannot see this, which
is a *decoder-admission* asymmetry.

---

### F-3 (latent) — the register's pre-CAS staleness check treats a stale direct-get as proof of current state and mints a permanent structural refusal; both twins

**Where.** `packages/plait/src/internal/registers.ts:386-402` (`commit`), and the
same shape at `:343-363` (`renew`), `:423-433` (`expireSteal`), `:175-186`
(`requirePresent`):

```ts
const entry = yield* requirePresent(yield* read(bucket, work))
const stored = yield* decode(entry)
...
if (token !== entry.revision) return yield* lawRefusal(
  "stale-register-token", "no stale token ever lands",
  ["token"], token, entry.revision, teachSupersededRound,
)
```

`read` is `bucket.get` (`registers.ts:166-173`) — a **direct get**. Per the
source-verified research, §5: buckets are always `AllowDirect: true`, `kv.Get`
routes to `$JS.API.DIRECT.GET`, *"Reads are performed directly to any replica,
including out of date ones"*, and there is no read-after-write consistency. The
Go twin is identical: `go/register/register.go:257-260` (`Renew`),
`:285-288` (`Commit`), `:236-249` (`get` → `register-absent`).

`stale-register-token` and `register-absent` are **structural** kinds
(`Refusal.ts:48-50`), so `Refusal.retryAbsence` passes them through once and
never retries (`Refusal.ts:115-116, 144-150`). Their taught next steps are
terminal: *"this round is superseded; do not retry this commit"*
(`registers.ts:104-107`).

**Failure scenario (concrete, R>1 bucket).** Holder H holds work `W`.
1. H's heartbeat calls `renew`; the `bucket.update` ack returns revision **6**,
   which is leader-authoritative, and `renew` returns `token: 6`
   (`registers.ts:365-382`). `Register.hold` stores it (`Register.ts:89-90`).
2. H immediately calls `commit(W, 6, outcome)`.
3. `bucket.get` is served by a replica that has applied only through revision 5.
4. `token (6) !== entry.revision (5)` → structural `stale-register-token`,
   `got: 6`, `expected: 5` — the refusal names H's genuinely-current token as the
   stale one and the lagging replica's revision as current — teaching H not to
   retry. The CAS, the only authority, is never attempted.
5. Through `Register.hold`, a refusal in the renewal branch interrupts the held
   work via `raceFirst` (`Register.ts:97-102`): H loses a lease it holds.

The identical inversion applies to `requirePresent`: a granted register read from
a lagging replica reads absent and refuses `register-absent` structurally,
teaching "grant first" against a register that already exists.

**Why this is the discipline being inverted.** The research doc's own verdict is
that a stale `Get` *"costs a retry, never a lost decision"* — but that holds only
because *"every decision point is a CAS or a re-read"* (§5). This pre-check is a
decision point that is neither. Safety is being taken from a non-authoritative
read rather than from the CAS. It is also a refusal-taxonomy leak in the sense of
`internal/transport.ts`'s two-sided discipline: a condition whose cause is
transport lag wears a structural kind that no retry policy can see.

**Refutation attempted, survives with a named trigger.** The bucket shape guard
pins `replicas === 1` at open (`registers.ts:211-212`; likewise
`anchors.ts:189-190`, `cells.ts:228-229`), and on R=1 the direct get is served by
the only replica. So this is **not exploitable today**. Two things keep it a
finding: (i) the guard is evaluated once at open, and the module header already
concedes that administrative lifecycle mutation is outside the guard
(`registers.ts:25-36`) — a bucket scaled to R=3 after open is exactly that; and
(ii) the research doc's *deployment assumption #1* requires *"R>=3 file-backed
replicas for both journal streams and effector buckets"*, i.e. the estate's own
recommended deployment is the one this pre-check is unsafe in and the one the
shape guard currently refuses to open at all. The pre-check is the thing that
breaks the day the recommended deployment is adopted.

---

### F-4 (latent) — `ensureState` classifies a vanished read-back as tamper; the register adapter classifies the same situation as transport, in the same package

**Where.** `packages/plait/src/internal/anchors.ts:133-145`:

```ts
.pipe(Effect.catch(({ cause }) => {
  if (!isCasRefusal(cause)) return Effect.fail(transportRefusal("anchor.state.create", cause))
  return Effect.flatMap(
    readEntry(bucket, stateKey(digest), "anchor.state.read-existing"),
    (existing) => existing !== null && bytesEqual(existing.value, bytes)
      ? Effect.void
      : Effect.fail(malformed(
          ["state", digest],
          existing === null ? "absent after duplicate create" : "different bytes at digest key",
          ...)),
  )
}))
```

`malformed` mints a **structural** `malformed-anchor-state` (`anchors.ts:59-73`),
non-retryable, teaching *"Restore the checkpoint fact and state bytes written only
by the anchor adapter"* — an operator-level tamper alarm.

**Failure scenario.** The CAS refused with 10071, proving the key was occupied.
The confirming read-back is a direct get (`anchors.ts:113-120`) with no
read-after-write consistency (research §5), so a lagging replica returns `null`
for a key the leader holds. The adapter reports substrate tampering. The research
doc names a second route to the same state: nats-server issue #5162, KV Create
racing Delete on a tombstoned key returning wrong-last-sequence spuriously (§5).
Both are transport conditions; both surface here as structural tamper.

**The inconsistency.** The register adapter meets the identical situation and
rules the other way, with the reasoning written out:

```ts
// registers.ts:268-272
if (entry === null) {
  // Vanishing mid-flight is lifecycle mutation: outside the fixed
  // backing-stream incarnation this adapter is bounded to.
  return yield* transportRefusal(operation, cause)
}
```

and the Go twin agrees with the register (`go/register/register.go:158-163`).
Two adapters, one situation, two classifications, and no note anywhere saying the
divergence is intended. At least one is wrong; the undeclared divergence is the
defect regardless of which.

**Refutation attempted.** One could argue the anchor bucket has a stronger writer
invariant — only the anchor adapter writes it, and a single pump owns each
partition — so a vanished key really is corruption. The register comment makes the
same single-writer argument (*"only this register's contenders write the key"*,
`registers.ts:252-254`) and reaches the opposite conclusion. The argument does not
distinguish the two cases. Survives as latent.

---

### F-5 (hygiene) — failed `ResolveCache` lookups occupy capacity and evict verified successes; the design record's stated mechanism (`§A-8a`) is not the one that runs

**Where.** `packages/plait/src/Resolved.ts:174-186`:

```ts
const cache = yield* Cache.makeWith(resolve, {
  capacity: options.capacity,
  timeToLive: (exit) => Exit.isSuccess(exit) ? Duration.infinity : Duration.zero,
})
```

Verified against the pin (`effect@4.0.0-rc.108`):

- `Cache.ts:633-637` — `if (Duration.isFinite(ttl)) { entry.expiresAt = now + 0 } else if (Duration.isZero(ttl)) { MutableHashMap.remove(...) }`. `Duration.isFinite` tests only for the `Infinity`/`NegativeInfinity` tags (`Duration.ts:454-455`), and `Duration.zero` carries `Millis`, so the **first** branch fires and the removal branch is unreachable.
- `Cache.ts:674-679` — `hasExpired` returns `now >= expiresAt`, true immediately. So **the fence holds**: a failed lookup is never served.
- `Cache.ts:639-642` — `MutableHashMap.set(self.map, key, entry)` then `checkCapacity(self)`; `checkCapacity` (`:681-690`) evicts oldest-first by map insertion order and does not skip expired entries.

**Consequence.** N lookups of N distinct absent digests insert N permanently-dead
entries and evict N verified successes. Correctness is untouched; the memo's whole
purpose is not. Concretely: at `capacity: 4096`, an agent walking the references of
a frame whose targets are not yet published — ordinary head-relative absence, not
an attack — flushes every hot entry out of the memo.

**Doc drift.** `docs/design/2026-08-17-plait-effect-affordances.md` §A-8a states
the mechanism as *"failures are never cached (zero TTL removes the entry —
Cache.ts:445-448)"*. That branch never executes. The shipped JSDoc
(`Resolved.ts:176-184`, citing DEV-739 T2) already corrects this in place and is
accurate — the design record is the stale surface, and it is the one a reader
consults for the license.

**Refutation attempted and failed only on severity.** The fence itself is sound
and the shipped code says so honestly, so this is not a correctness finding —
hence hygiene. It is worth recording because the memo silently degrades to
useless under a workload the module explicitly expects (absence is *"the only
retryable sort"*, `Resolved.ts:119-121`).

---

### F-6 (hygiene) — `Blobs.get` materializes an unbounded untrusted payload before it can verify it

**Where.** `packages/plait/src/Blob.ts:170-179`:

```ts
const bytes = yield* fileSystem.readFile(pathOf(digest)).pipe(...)
const rederived = digestOfStoredBytes(bytes)
if (rederived !== digest) return yield* blobMismatch(digest, rederived)
```

No size bound appears anywhere on `BlobsService`. Verification is necessarily
whole-value — ranged reads are refused on purpose because *"A byte range cannot
re-derive the whole-value digest"* (`Blob.ts:52-58`) — so the reader must
materialize whatever the substrate holds at that path before the mismatch can be
detected. A 20 GB file placed at `<root>/ab/abcd…` costs 20 GB of resident memory
to refuse.

The estate bounds the analogous case elsewhere: `Wire.ts:38`
`INLINE_BODY_MAX_BYTES = 256 * 1024`, enforced at `Wire.ts:209-222` with its own
refusal kind. There is no counterpart here.

**Refutation attempted, survives at hygiene.** The substrate is the local
filesystem the layer *"owns outright"* (`Blob.ts:86`), so the threat model is a
compromised or corrupt local disk, which is weak. Against that: the module's own
licensing law is *"no backend is ever trusted about content"* (`Blob.ts:22-24`),
and reading an unbounded quantity of a backend's bytes before checking any of them
is a form of trust. Recorded, not urgent.

---

### F-7 (hygiene) — `verified` returns the object it hashed, not a value reconstructed from the verified bytes

**Where.** `packages/plait/src/Resolved.ts:97-104` hashes `value` and returns that
same `value`. On the catalog leg (`Resolved.ts:137`) that object is the store's
own: the memory catalog stores and returns the caller's reference with no copy
(`Catalog.ts:70-78` — `store.set(digest, value)` / `store.get(digest)`).

So the verification attests to a byte string derived by *walking* an object, and
the caller then reads that same live object. For a plain frozen JSON value the two
coincide. For a value carrying an accessor or fronted by a `Proxy` they need not:
the digest attests to bytes nobody ever observes again. The package already knows
this hazard exists — `Canonical.ts:1-10`: *"A stateful accessor or Proxy can change
between the identity and diagnostic passes."* The cache surface documents the
mutation half of the same problem: *"The cached value is shared by reference …
a caller that mutates one poisons every later resolve of that digest in this
process"* (`Resolved.ts:235-237`).

**Refutation attempted, survives at hygiene.** `encodeJsonValue` refuses non-plain
objects (`jcs.ts:96-100`), but that test reads the prototype, which a `Proxy` over
a plain object passes while still answering differently per read. More decisively:
no shipped layer can produce such a value — the memory catalog returns only what
the same process put in, and `Payloads` returns nothing. Latent-at-best, so
hygiene. The structural repair is the one the payload leg is one line away from:
verify by re-deriving *and return the value parsed back from the canonical bytes*,
so the object handed out is provably the object hashed.

---

## Checked and held

Each of these looked like a finding on first read and dissolved on the second.

1. **`ResolveCache` cannot admit an unverified value.** Its lookup *is* `resolve`
   (`Resolved.ts:174`), so every entry passed re-derivation before insertion. The
   memo decorates the door, not the store; `Catalog.get` and `Payloads.get` are
   unmemoized, exactly as the refereed G-3 amendment requires. Cache poisoning via
   a lying store is refused at the door on every miss.

2. **The memo never serves a failure.** Verified in the pin rather than assumed:
   `Duration.isFinite(Duration.zero)` is `true` (`Duration.ts:454-455`), so
   `expiresAt = now` (`Cache.ts:634-635`) and `hasExpired` rejects on `>=`
   (`Cache.ts:674-679`). The shipped JSDoc's account of *which* branch fires is
   correct; the design record's is not (F-5).

3. **Absence and tamper are correctly split on the resolve path.**
   `cataloged-value-absent` is an `AbsenceRefusal` (`Resolved.ts:67-75`);
   `digest-mismatch` is a `StructuralRefusal` (`Resolved.ts:77-85`). `retryAbsence`
   retries only the former (`Refusal.ts:115-116, 144-150`), so no retry loop can
   form against a corrupt carrier. `Blob.ts` splits identically —
   `blob-absent` absence at `:111-119`, `digest-mismatch` structural at `:121-129`.

4. **`Blobs.get` is byte-tight.** `digestOfStoredBytes` runs over the fetched bytes
   with no value round-trip (`Blob.ts:176`). This is the one TypeScript read door
   where the digest names the bytes, and it is the door that most needed it.

5. **A partial blob can never verify and can never be observed.** `put` writes to a
   staged temp file in the same directory and renames into place
   (`Blob.ts:158-168`), so a digest-named file appears only complete; the reasoning
   and the crash-durable-not-power-durable bound are both stated at `Blob.ts:151-157`.

6. **Ranged and partial reads are refused at the interface, with the missing law
   named.** `Blob.ts:52-58` states why (a range cannot re-derive a whole-value
   digest) and names the candidate future law (a chunk manifest) rather than
   shipping a capability the law does not license. This is the honest disposition
   of the blob half of the hunt list.

7. **The transport/structural fence has no shape-shaped gate.**
   `transportRefusalFor` rethrows any cause the pinned client did not raise
   (`transport.ts:138-141`), so a defect can never wear the absence sort and buy
   itself a retry loop; `isTransportCause` (`:116-117`) admits by pinned class
   membership only, with the reasoning for refusing structural admission written
   out at `:105-115`. Caller-validation classes are excluded by name (`:77-81`).

8. **`casJoinLoop` reconciles before it classifies.** `cas.ts:199-213`: the
   read-back decides success before `failure.conflict` is consulted, and
   `failure.refuse()` — the transport mint — is a thunk reached only on the branch
   that needs it, so a read-back that already carries the contribution never passes
   through it. Bound exhaustion refuses the carrier's own absence
   (`cells.ts:314-321`), correctly sorted as retryable.

9. **The cell path asserts no digest, so there is nothing to verify.** `CellState.digest`
   is derived locally from the canonicalized observation set (`Cell.ts:150-155`);
   no digest is read from the substrate and none is trusted. Likewise
   `Cells.read`'s decode (`cells.ts:115-131`) uses `JSON.parse` but carries no
   identity claim — noted so the F-1 pattern is not mistaken for a second instance.

10. **The `Nats-Msg-Id` check is honestly scoped.** `verifyEnvelopeDigest`
    (`Wire.ts:279-297`) compares a re-derived digest to a header the *publisher*
    set, and both live in the same stored record — so it detects a malformed
    publisher, not a substrate that rewrote both. The law sentence says exactly
    that: *"Nats-Msg-Id must equal SHA-256 over the envelope's canonical
    uncompressed bytes"* (`Wire.ts:287`). Downstream identity is the re-derived
    digest, not the header (`nats.ts:275-280`, `pump.ts:176`, `:222`). No
    overclaim. (The bytes-vs-value laundering inside it is F-2, a separate defect.)

11. **`loadState`'s absent-state-as-structural is ordering-sound.** `ensureState`
    writes the state key *before* the anchor is created or updated
    (`anchors.ts:230-232`, `:248-258`), so an anchor visible to a reader implies its
    state was written first. Surfacing an absent state as `malformed-anchor-state`
    is therefore a genuine broken invariant, not an absence/tamper conflation.
    (`ensureState`'s own read-back is a different case — F-4.)

12. **`lost-anchor-cas` is on the right side of the retry line.** A single live pump
    owns each fold partition, so losing the revision CAS is fatal and the refusal is
    structural with a taught *detach* rather than a retry (`anchors.ts:75-86`), and
    the transport terms for the same adapter explicitly warn against retrying an
    ambiguous anchor write in place (`anchors.ts:49-57`).

---

## Draft findings-register entries

House style: declarative title stating the defect; `## Summary` with `file:line`
evidence first; repro sketch after. Labels per `docs/agents/triage-labels.md` —
`finding` plus one `priority-<n>`. None of these are exploitable today, so none
takes `priority-1`.

---

### Issue A — `finding`, `priority-2`

**Title:** `Resolved.decodePayload` verifies the value and not the bytes: `JSON.parse` over a non-fatal `TextDecoder` lets two distinct byte strings resolve to one digest, and `internal/digests.ts` documents a canonicality check that does not exist

**Body:**

## Summary

`packages/plait/src/Resolved.ts:106-113` decodes stored payload bytes with
`JSON.parse(new TextDecoder().decode(bytes))`. `new TextDecoder()` defaults to
`fatal: false`, so invalid UTF-8 is silently replaced with U+FFFD, and
`JSON.parse` accepts duplicate member names, arbitrary whitespace, and any key
order. `Resolved.ts:97-104` then verifies by `digestOf(value)`, which
canonicalizes and hashes (`Digest.ts:31-36`). The check performed is therefore
`sha256(canonical(parse(bytes))) == D`, never `sha256(bytes) == D`; the fetched
bytes are never looked at again.

This is the only verify-on-read door in the package that does not use the
estate's constrained decoder. `Wire.ts:240`, `internal/anchors.ts:92` and
`internal/anchors.ts:157` all use `decodeJson` from `@foldlab/core/jcs`, which
decodes through `strictUtf8` (`packages/core/src/jcs.ts:36, 355`) and refuses
duplicate member names (`jcs.ts:202`), non-finite numbers (`jcs.ts:334`), and
over-deep nesting (`jcs.ts:171, 189`).

The Go twin names this exact hazard and refuses it: `go/journal/journal.go:406-410`
— "Invalid UTF-8 is outside the canonical domain: both the wire encoder and
EntryDigest would launder it to U+FFFD, collapsing distinct payloads to one
journal identity."

`internal/digests.ts:29-33` licenses `digestOfStoredBytes` on the claim that
"the seam that needs that claim (`Resolved.decodePayload`) checks it itself."
It does not. The refusal minted at `Resolved.ts:87-95` prints the law as though
it did: "Stored payload bytes decode as one RFC 8785 wire value before any
identity check."

`Payloads.layer` currently answers every lookup with `Option.none()`
(`Catalog.ts:143-146`), so no shipped layer reaches this door — the exposure is
latent. But `Payloads.testLayer` is public and the seam exists precisely "so a
lying layer can be supplied under it and refused at the one verify door"
(`Catalog.ts:60-63`), and the shipped tampered-payload control
(`packages/plait/test/Resolved.test.ts:120-128`) lies only with a *different
value* — nothing walls the case where the value is right and the bytes are not.

## Repro sketch

Supply `Payloads.testLayer` returning, for a digest `D` naming a value `v`:

1. the canonical bytes of `v` with two members transposed — `resolve(D)` succeeds;
2. the canonical bytes of `v` with one duplicated member (`{"a":1,"a":2,…}`) whose
   last occurrence matches `v` — `resolve(D)` succeeds, while `decodeJson` on the
   same bytes refuses `"duplicate object member name"`;
3. for a `v` containing `"�"`, the canonical bytes with those three UTF-8
   bytes replaced by the single invalid byte `0x80` — `resolve(D)` succeeds.

Each is a byte string the store was never given, verified against `D`.

---

### Issue B — `finding`, `priority-2`

**Title:** No TypeScript read path compares the stored bytes to the re-derived digest; `journal.go:379` does, so the same record is `tampered` in Go and accepted in TS — and `anchors.ts` enforces bytes when writing and only values when reading

**Body:**

## Summary

`go/journal/journal.go:361-382` decodes with lenient `encoding/json`
(`journal.go:563-573`) and then closes the loop: `canonical.DigestHex(raw.Data)`
— SHA-256 over the raw stored bytes — is compared to `canonical.EntryDigest(entry)`,
re-derived from the decoded entry, and a mismatch is
`tampered(position, "wire bytes are not canonical")` (`journal.go:379`). That one
comparison is what makes a lenient parser safe on the Go side.

No TypeScript read path performs it:

- `Resolved.ts:101` hashes the decoded value.
- `Wire.ts:253-258` re-canonicalizes the decoded envelope and hashes *the
  re-canonicalized bytes*, discarding the received bytes; `verifyEnvelopeDigest`
  (`Wire.ts:279-284`) compares that laundered digest to the `Nats-Msg-Id`.
- `internal/anchors.ts:165` hashes the decoded state value.

A stored record with fields in non-canonical order, or one extra space after a
colon, carrying the correct canonical digest as its identity, is refused by Go
and accepted by every TypeScript reader.

Within one TypeScript file the two notions of identity sit side by side:
`internal/anchors.ts:141` reconciles a duplicate create by raw-byte comparison
(`bytesEqual(existing.value, bytes)`, refusal text "different bytes at digest
key"), while `loadState` — the read door for the same key — checks only the
decoded value. The write path says the digest names the bytes; the read path says
it names the value.

The cross-language corpus wall proves *encoder* parity (one corpus, three
languages, byte-identical both ways) and by construction cannot see this: the
asymmetry is in what each side's *decoder* admits.

No live divergence exists today — the Go journal owns its own subject and the
TypeScript client reads `flb.fab.fact.*`, so no record is read by both twins.

## Repro sketch

- TS: take any envelope, canonicalize it, note the digest; publish the same value
  re-encoded with `JSON.stringify` (insertion order, not JCS order) under that
  digest as `Nats-Msg-Id`; `verifyEnvelopeDigest` accepts.
- Go: write the analogous journal entry (`prev`/`payload`/`seq` in wire order
  rather than canonical order) directly to the stream with the canonical digest
  as its message id; `verifyStoredEntry` refuses `ErrTampered`.
- TS, one file: `internal/anchors.ts` — write a state key through `ensureState`
  twice with byte-differing-but-value-identical encodings (refused at `:141`),
  then read the same key through `loadState` (accepted at `:165`).

---

### Issue C — `finding`, `priority-2`

**Title:** Register `renew`/`commit`/`expire-steal` decide staleness from a direct-get read and mint a non-retryable structural refusal, so under R>1 a holder with the current token is told its round is superseded — the deployment the research doc requires is the one this breaks in

**Body:**

## Summary

`packages/plait/src/internal/registers.ts:397-402` (`commit`), `:356-363`
(`renew`), and `:175-186` (`requirePresent`) decide against the result of
`bucket.get` (`registers.ts:166-173`) — a direct get. Per
`docs/research/2026-08-12-jetstream-guarantees-source-verified.md` §5, KV buckets
are always `AllowDirect: true`, reads are "performed directly to any replica,
including out of date ones", and there is no read-after-write consistency.

The refusals minted are **structural** (`Refusal.ts:48-50`), which
`Refusal.retryAbsence` never retries (`Refusal.ts:115-116, 144-150`), and their
taught next steps are terminal — "this round is superseded; do not retry this
commit" (`registers.ts:104-107`).

The Go twin has the same pre-check: `go/register/register.go:257-260`,
`:285-288`, `:236-249`.

The research doc's own verdict — a stale `Get` "costs a retry, never a lost
decision" — is conditioned on "every decision point is a CAS or a re-read" (§5).
This pre-check is a decision point that is neither: it takes safety from a
non-authoritative read and refuses before the CAS is ever attempted.

Under lag the refusal inverts its own report: `got` is the holder's genuinely
current token and `expected` is the lagging replica's revision.

Blast radius through `Register.hold` (`Register.ts:89-102`): a refusal in the
renewal branch interrupts the held work via `raceFirst`, so a holder loses a lease
it actually holds.

**Why it is not live today, and what makes it live.** The bucket shape guard pins
`replicas === 1` at open (`registers.ts:211-212`; also `anchors.ts:189-190`,
`cells.ts:228-229`), and on R=1 the direct get is served by the only replica. But
the guard runs once at open, and the module header already concedes that
administrative lifecycle mutation is outside it (`registers.ts:25-36`). More
pointedly, the same research doc's *deployment assumption #1* requires "R>=3
file-backed replicas for both journal streams and effector buckets" — the estate's
recommended deployment is simultaneously the one this check is unsafe in and the
one the shape guard refuses to open.

## Repro sketch

Against an R=3 register bucket (shape guard bypassed or relaxed):

1. `grant(W, "h")` → token `t0`.
2. `renew(W, t0)` → token `t1` from the leader's ack.
3. Partition or delay one follower, then issue `commit(W, t1, "x")` with the
   direct get answered by the lagging follower.
4. Observe `StructuralRefusal{kind: "stale-register-token", got: t1, expected: t0}`
   with `teachSupersededRound`, without any CAS having been attempted.

A layer-level reproduction needs no cluster: supply a `Registers` fixture whose
`read` returns a revision one behind the leader's, and drive `commit` with the
leader's token.

---

### Issue D — `finding`, `priority-3`

**Title:** `AnchorStore.ensureState` reports a vanished CAS read-back as `malformed-anchor-state` tamper; `internal/registers.ts` and `go/register` classify the identical situation as transport, and nothing declares the divergence

**Body:**

## Summary

`packages/plait/src/internal/anchors.ts:133-145`: after a duplicate-create CAS
refusal, the state key is read back; `existing === null` mints
`malformed(["state", digest], "absent after duplicate create", …)`, a **structural**
`malformed-anchor-state` (`anchors.ts:59-73`) teaching the operator to "Restore
the checkpoint fact and state bytes".

The read-back is a direct get (`anchors.ts:113-120`) with no read-after-write
consistency (research §5), so a lagging replica returning `null` for a key the
leader holds is an ordinary transport outcome. The research doc names a second
route to the same state: nats-server #5162, KV Create racing Delete on a
tombstoned key returning wrong-last-sequence spuriously (§5).

The register adapter meets the identical situation and rules the other way, with
its reasoning in a comment:

```
// registers.ts:268-272
// Vanishing mid-flight is lifecycle mutation: outside the fixed
// backing-stream incarnation this adapter is bounded to.
return yield* transportRefusal(operation, cause)
```

`go/register/register.go:158-163` agrees with the register. Two adapters in one
package, one situation, two classifications — one retryable, one an operator-level
tamper alarm — and no note declaring the divergence intended.

Not live today: the anchor bucket shape guard pins `replicas === 1`
(`anchors.ts:189-190`).

## Repro sketch

Drive `ensureState` with a KV fixture that (a) fails `create` with
`JetStreamApiError{status: 400, code: 10071}` and (b) answers the subsequent
`get` with `null`. Observe `StructuralRefusal{kind: "malformed-anchor-state",
got: "absent after duplicate create"}`. Drive `Registers.reconcileUpdate` through
the same two-step fixture and observe an `AbsenceRefusal`
(`register-transport-unavailable`).

---

### Issue E — `finding`, `priority-3`

**Title:** Failed `ResolveCache` lookups leave permanently-expired entries that occupy capacity and evict verified successes; §A-8a of the affordances record cites a removal branch that never executes

**Body:**

## Summary

`packages/plait/src/Resolved.ts:174-186` builds the memo with
`timeToLive: (exit) => Exit.isSuccess(exit) ? Duration.infinity : Duration.zero`.

Against the pinned `effect@4.0.0-rc.108`:

- `Cache.ts:633-637` — `Duration.isFinite(ttl)` is tested first, and
  `Duration.isFinite` checks only for the `Infinity`/`NegativeInfinity` tags
  (`Duration.ts:454-455`). `Duration.zero` carries `Millis`, so the
  `expiresAt = now + 0` branch fires and the `MutableHashMap.remove` branch is
  unreachable.
- `Cache.ts:674-679` — `hasExpired` returns `now >= expiresAt`, so the entry is
  never served. **The fence holds.**
- `Cache.ts:639-642` — the entry is inserted, then `checkCapacity` evicts
  oldest-first by insertion order (`:681-690`) without skipping expired entries.

So N lookups of N distinct absent digests insert N dead entries and evict N
verified successes. At `capacity: 4096`, walking the references of a frame whose
targets are not yet published — ordinary head-relative absence, which
`Resolved.ts:119-121` calls "the only retryable sort" — flushes the memo.

Correctness is unaffected; this is a performance and doc-accuracy finding.

`docs/design/2026-08-17-plait-effect-affordances.md` §A-8a states the mechanism as
"failures are never cached (zero TTL removes the entry — Cache.ts:445-448)". That
branch never executes. The shipped JSDoc (`Resolved.ts:176-184`, citing DEV-739
T2) already describes the real mechanism correctly; the design record is the stale
surface, and it is the one a reader consults for the license.

## Repro sketch

Build `ResolveCache.layer({ capacity: 4 })` over a counting `Catalog`. Resolve one
published digest (miss, then hit — one store call). Resolve five distinct
unpublished digests. Resolve the published digest again and observe a second store
call: the successful entry was evicted by dead ones.

---

### Issue F — `finding`, `priority-3`

**Title:** `Blobs.get` reads an unbounded untrusted payload into memory before it can re-derive the digest; the envelope path bounds the analogous case at 256 KiB and the blob path bounds nothing

**Body:**

## Summary

`packages/plait/src/Blob.ts:170-179` reads the whole file
(`fileSystem.readFile(pathOf(digest))`) and only then computes
`digestOfStoredBytes(bytes)`. `BlobsService` carries no size parameter and the
layer options carry only a `root` (`Blob.ts:83-87`).

Verification here must be whole-value by design — "A byte range cannot re-derive
the whole-value digest, so a partial read cannot verify on read"
(`Blob.ts:52-58`) — so the reader is obliged to materialize whatever the substrate
holds at the digest path before any mismatch can be detected. A file of arbitrary
size at `<root>/<xx>/<digest>` costs its full size in resident memory to refuse.

The estate bounds the analogous case elsewhere: `Wire.ts:38`
`INLINE_BODY_MAX_BYTES = 256 * 1024`, enforced with its own refusal kind at
`Wire.ts:209-222`. The blob path has no counterpart, while its module states the
stronger law: "no backend is ever trusted about content" (`Blob.ts:22-24`).

Threat model is a corrupt or compromised local filesystem, which is why this is
recorded rather than urgent.

## Repro sketch

`Blobs.layerFileSystem({ root })`; write a multi-gigabyte file at
`<root>/ab/<64-hex starting ab>`; call `get` with that digest and observe the full
read completing before `digest-mismatch` is minted.

---

### Issue G — `finding`, `priority-3`

**Title:** `Resolved.verified` returns the object it hashed rather than a value reconstructed from the verified bytes, so the digest attests to a byte string the caller may never observe

**Body:**

## Summary

`packages/plait/src/Resolved.ts:97-104` hashes `value` and returns that same
`value`. On the catalog leg (`Resolved.ts:137`) the object is the store's own:
the memory catalog stores and returns the caller's reference with no copy
(`Catalog.ts:70-78`).

Verification therefore attests to bytes produced by *walking* an object, after
which the caller reads the same live object. For frozen plain JSON the two
coincide; for a value carrying an accessor or fronted by a `Proxy` they need not.
The package already records that this class of value exists —
`Canonical.ts:1-10`: "A stateful accessor or Proxy can change between the identity
and diagnostic passes" — and documents the mutation half of the same problem at
`Resolved.ts:235-237`: "a caller that mutates one poisons every later resolve of
that digest in this process."

`encodeJsonValue` refuses non-plain objects (`packages/core/src/jcs.ts:96-100`),
but that test reads the prototype, which a `Proxy` over a plain object passes.

No shipped layer produces such a value — the memory catalog returns only what the
same process put in, and `Payloads.layer` returns nothing — so this is a hygiene
finding about what the seam guarantees rather than a live defect.

The structural repair is one the payload leg is a line away from: verify by
re-deriving *and hand back the value parsed from the canonical bytes*, so the
object returned is provably the object hashed.

## Repro sketch

Supply `Catalog.testLayer` whose `get` returns a `Proxy` over a plain object whose
handler answers one value on the first read of a property and another thereafter.
`resolve` verifies against the first reading and returns the proxy; the caller's
first field access observes the second.
