# foldlab's five concepts, as worked audience-calibrated examples

Research memo, 2026-08-13. Purpose: the five core concepts drafted as
tangible, runnable examples — three audience calibrations each (Effect
TypeScript developer, platform/infra engineer, skeptical auditor) — with
every output produced by execution against `1823fdfe9`, not narration.
Filename carries the coordinator-assigned date `2026-08-14`; the memo was
written 2026-08-13 and the discrepancy is left visible rather than
silently reconciled.

Two honesty notes on provenance, before anything else:

- **Evidence sha vs. branch base.** Every command below was run against
  `1823fdfe94e99325e8dc9d0197f4b3603eee4fea`. This branch is based on
  `10e38d1241021ed2d8d920af8748fc9583877826`, which `origin/main`
  advanced to during the drafting session. The only difference between
  the two is 35 added lines in `README.md` (the evening bug-bash live
  watch entry); `git diff --stat 1823fdfe9..10e38d124` touches no other
  file. No code, test, or fixture cited here moved, so every output
  reproduces on the branch base.
- **One finding below was independently found and filed by another lane
  the same day**, in a deeper and more dangerous form. See the Concept 5
  sharp edge and its cross-reference to issue #34.

---

## What I ran (the evidence base)

| Command | Result |
|---|---|
| `bun test` (repo root) | 186 pass, 4 skip, 0 fail, 47364 expects, 190 tests / 16 files, **2.19s** |
| `bun test packages/core/test/stream.combine.test.ts` | 11 pass, 2371 expects, 428ms |
| `bun test packages/core/test/stream.wall.test.ts` | 5 pass |
| `cd go && go test ./journal ./effector ./stream` | ok 1.798s / 3.087s / 1.144s (**5.75s wall**) |
| `cd go && go test ./stream -run Combine -v` | 7 pass, incl. `TestCombineKVAgreesWithTheTypeScriptTwinThroughTheFrozenDigest` |
| `cd go && go test ./journal -run 'TestForgedTailDetected\|TestNonCanonicalWireRejected\|TestAppendCASConflict' -v` | 3 pass |
| `cd proto/ts && bun install && bun test test/smoke.test.ts` | 2 pass, 48 expects, 4.99s (after `go build ./cmd/protod`) |
| temp instrumentation (now committed as `examples/`, or deleted) | outputs quoted verbatim below |

Toolchain: `bun 1.3.14`, `go 1.26.5 windows/amd64`.

**Setup gotcha found:** `proto/ts` is a separate bun project. `bun test
proto/ts/test/smoke.test.ts` from the root fails with `Cannot find package
'effect' from .../proto/ts/src/wire.ts` until you run `bun install` inside
`proto/ts`. Also `effect` is *not* hoisted to the root `node_modules` — it
lives at `packages/core/node_modules/effect`, so a demo script must live
under `packages/core/` (or `proto/ts/`) to resolve it. A script at
`scripts/` cannot import `effect`. This is why the committed tour lives at
`packages/core/examples/tour.ts`.

---

# Concept 1 — the two folds

**Real code:** `packages/core/src/stream.ts`. Identity fold: `streamSeed` /
`extend` / `headFrom` (lines 106–116) — `extend(h,e) = SHA-256(h || enc(e))`.
Meaning fold: `kvStep` (234) / `applyKV` (256) / `foldKV` (267) /
`stateDigest` (343). The forgiveness split is at
`packages/core/src/entity.ts:73` — one line, and it is the whole concept:

```ts
const applySync = (state: KVState, e: StreamEvent): KVState => kvStep(state, e) ?? state
```

`kvStep` returns `undefined` for anything outside the admitted domain.
`applyKV` turns that `undefined` into a typed `MalformedPayload`; the entity
collector turns it into a no-op. One walled decoder, two dispositions.

**The worked example** (`packages/core/examples/tour.ts`), real output:

```
two histories, same two facts, different order

  A head           c0f9c11ccb06bc3c18f4de601b85f44aaf682c83f09090a2c536fa1488d40816
  B head           cbf009894aea951acfd7e7f8157c514fd5144aa6efd7960698855c464533c7ff
  A state digest   62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
  B state digest   62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
  heads equal?     false
  states equal?    true
```

A is `customer=ada`, then `total=42`. B is the same two facts in the other
order. **Same meaning, different identity.** That is "the chain remembers
what the fold forgives" as two hex strings, no metaphor.

### (a) The Effect TypeScript developer

You already write `Stream.runFold` — an accumulator, a step, a stream, one
answer at the end. `foldKV` in `packages/core/src/stream.ts:267` is literally
`Effect.reduce(events, emptyKV, applyKV)`, so you already own the
meaning fold. The delta is that foldlab runs a *second* fold over the same
stream at the same time, whose accumulator is a 32-byte SHA-256 and whose
step is `extend(head, event)`. The second fold has no reducer you write — it
is fixed by the canonical encoding, which is why anyone else can recompute
it. Your reducer answers "what is the total"; the hash fold answers "over
exactly which events". Two `Stream.runFold`s, one pass, and the second one is
the thing you cannot fake.

```ts
import { Effect } from "effect"
import { event, foldKV, headFrom, stateDigest, streamSeed } from "./src/stream.ts"

const seed = streamSeed("orders")
const B = [event("orders", 1, "total=42"), event("orders", 2, "customer=ada")]
console.log(headFrom(seed, B))                              // the fold you didn't write
console.log(stateDigest(Effect.runSync(foldKV(B))))         // the fold you did
```
```
cbf009894aea951acfd7e7f8157c514fd5144aa6efd7960698855c464533c7ff
62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
```

The forgiveness delta lands the same way. Feed the meaning fold two bytes
that are not UTF-8:

```ts
const junk = { stream: "orders", seq: 3, payload: new Uint8Array([0xff, 0xfe]) }
headFrom(seed, [...B, junk])   // -> d6c5ccfc0b466cf64532de3f167d89ba710b5aff9f43062c568c816c25da5cfa
Effect.runSync(Effect.flip(applyKV(Effect.runSync(foldKV(B)), junk)))._tag   // -> "MalformedPayload"
```

The head absorbed it. The state refused it, on the `E` channel, as a
`Data.TaggedError` you can match on. You already know that channel; the new
part is that the *other* fold has no such channel because it has no domain to
be outside of.

### (b) The platform / infra engineer

You already trust `git log` because a commit hash covers its parent, so a
rewritten history gets a different hash all the way down — and you already
know `git status` tells you a *different* thing than `git log`, because
working-tree state and commit history are not the same fact. foldlab makes
that split explicit and computes both continuously. The head is the commit
hash of an event stream: `SHA-256(prev_head || canonical_bytes(event))`,
extended in O(1) per event. The state digest is the `terraform show` — the
current values, key-sorted, hashed. Two streams can have identical
`terraform show` output and different `git log`; foldlab gives you both
digests so you can tell which kind of "same" you have.

The output above is that test: two histories that write the same two keys in
opposite order give **one** state digest and **two** heads. This is the
difference between "the infrastructure ended up the same" and "the same
things happened", and it is the difference your postmortem actually needs.

### (c) The skeptical auditor

A ledger has a running balance and a page-by-page record, and you already
know the balance can be right while the pages were reordered, backdated, or
reprinted. Auditors handle that with two separate controls: reconcile the
balance, and separately verify the record's integrity. foldlab computes both
as numbers you can recompute yourself from the same source documents. The
state digest is the balance's fingerprint; the head is the record's
fingerprint. Nothing is attested — you re-run the same function over the same
bytes and compare hex.

The evidence that these are genuinely two controls and not one dressed up
twice is exactly the output above: the balances match (`62ca5c…`) while the
records differ (`c0f9c1…` vs `cbf009…`). A system with only one digest cannot
tell you that. Ask for both, and "the numbers reconcile" stops being an
answer to "was anything moved".

---

# Concept 2 — cut anywhere

**Real code:** `combineKV` in `packages/core/src/stream.ts:307`, with the doc
comment stating the three laws it claims. The license is *not* a property
test over invented data — `packages/core/test/stream.combine.test.ts:76` cuts
the **frozen wall corpus** at every split point and asserts the recombined
`stateDigest` equals `fixtures/stream-wall.json`'s `foldStateDigest` =
`bb947adc8d4623e9340ae0932ac1f7e65dbae211b991b11eaf24817dbe7dafe1`, a pin
generated once by the Go side (`go/cmd/streamfix`).

**Real output** (`packages/core/examples/tour.ts`, history B):

```
cut B anywhere, fold the halves apart, combine:
  cut@0 -> 62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
  cut@1 -> 62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
  cut@2 -> 62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
```

Every cut, one answer, and it is the uncut answer.

### (a) The Effect TypeScript developer

Effect v4 ships `Reducer` — an `initialValue` plus a `combine`, i.e. a monoid
— and you already know that having a lawful `combine` is what lets a runtime
shard work and merge results instead of forcing one sequential pass.
`combineKV` is that `combine` for the KV meaning fold, and the homomorphism
it satisfies is `combineKV(foldKV(xs), foldKV(ys)) === foldKV([...xs, ...ys])`.
The delta from a normal monoid instance: the equality is checked *by digest
against a frozen fixture*, not by `deepEqual` on the in-memory shape, so a
port or a refactor that changes the shape while preserving the answer still
passes and one that changes the answer cannot.

```
$ bun test packages/core/test/stream.combine.test.ts
 11 pass
 0 fail
 2371 expect() calls
Ran 11 tests across 1 file. [428.00ms]
```

The negative controls in the same file are the part worth reading:
`combineKV` is **not** commutative and **not** idempotent, both pinned with
minimized counterexamples (lines 157–181). `combineKV(a,b)` gives
`[["a","2"]]`, `combineKV(b,a)` gives `[["a","1"]]` — last-write-wins *is*
order, so a fold that federates without a committed order needs the
join-semilattice in `kvSemilattice.ts` instead. The suite refuses to let "we
have a combine" be read as "we can merge from anywhere".

### (b) The platform / infra engineer

You already split a big log-processing job across workers and merge partials
— and you already know the sharp edge: the merge is only safe if the operator
is associative, which is usually asserted in a comment rather than proved.
Here the proof is a wall. The Go side froze a digest once; both languages
recompute it, and the TS suite additionally cuts the frozen corpus at every
possible boundary and demands the recombined digest come back byte-identical.
Parallel replay is a *right the code earned*, not an optimization someone
hopes is safe.

```
$ cd go && go test ./stream -run Combine -v
=== RUN   TestCombineKVRecombinesToTheFrozenWallDigest
--- PASS: TestCombineKVRecombinesToTheFrozenWallDigest (0.00s)
=== RUN   TestCombineKVAssociatesAcrossEveryThreeWaySplit
--- PASS: TestCombineKVAssociatesAcrossEveryThreeWaySplit (0.00s)
=== RUN   TestCombineKVIsNeitherCommutativeNorIdempotent
--- PASS: TestCombineKVIsNeitherCommutativeNorIdempotent (0.00s)
=== RUN   TestCombineKVAgreesWithTheTypeScriptTwinThroughTheFrozenDigest
--- PASS: TestCombineKVAgreesWithTheTypeScriptTwinThroughTheFrozenDigest (0.00s)
PASS
ok  	foldlab/stream	0.438s
```

The last test name is the whole cross-language story: TS and Go do not agree
because someone diffed them, they agree because both land on `bb947adc…`.

### (c) The skeptical auditor

Two accountants working the same set of vouchers, splitting the pile between
them, must reach the same total as one accountant working the whole pile —
and you already know this only holds if the split is on a clean boundary and
the operation is a simple sum. foldlab's version is stronger and checkable:
the pile is frozen (`fixtures/stream-wall.json`), and the test cuts it at
*every* boundary, including the degenerate ones, and demands the exact same
fingerprint each time. Nobody chose a convenient split point.

`fixtures/stream-wall.json` carries its own provenance line: `"generated once
by go/cmd/streamfix (go run ./cmd/streamfix); frozen. Regeneration requires a
stated reason in docs/primitives/MECH-attempts.md."` The repo's own contract
(`AGENTS.md`) says a digest mismatch means the *change* is wrong, not the
fixture. That is a control you can audit: the pinned number can only move
with a written reason.

---

# Concept 3 — refusals that teach

**Real code:** `proto/go/protod/refusal.go`. Nine refusal kinds, and the
value shape is `{kind, law, path, got, expected, example, next[], local}`
where `next` is a subject plus a **filled body template**.
`proto/go/protod/read.go:82` shows one being constructed.

**Real output** — I built and ran the actual `protod` binary (embedded NATS,
temp store) and drove it with the real `ProtoClient`
(`proto/ts/examples/refusals.ts`). Submitting a structure with a typo'd node
kind:

```jsonc
{
  "ok": false,
  "refusal": {
    "kind": "invalid-structure",
    "law": "flb.type.v0: unknown kind refuses — the grammar grows under ticket 004, never by admission on faith",
    "path": ["structure", "k"],
    "got": "strng",
    "expected": ["string","bool","int","float","null","opaque","literal","list","struct","union","brand","check","ref"],
    "example": { "k": "string" },
    "next": [
      { "subject": "flb.req.type.create",
        "note": "repair the node at path and resubmit; same bytes converge, they never error" },
      { "subject": "flb.req.contract.describe",
        "note": "request the daemon's contract; every subject and body shape is described there",
        "body": {} }
    ],
    "local": false
  }
}
```

Then I resubmitted `refusal.example` **verbatim** — no docs, no schema
lookup:

```jsonc
{ "ok": true,
  "fact": { "created": true,
    "digest": "3b67b844b3d096bc06a752cfdb4ff7ba292aa25662d6ee36e65135df797f2fc0",
    "catalogSeq": 0,
    "catalogHead": "6eb9fbb9d55ea916cb003bdd9bdb235de3d8b5b36048ed93621a07eb144101c7",
    "next": [ { "subject": "flb.ing.data",
                "body": { "type": "3b67b844…2fc0", "payload": "<your event payload>" } } ] } }
```

The refusal's `example` field was a *valid input*, and the success reply's
`next[].body` is a *pre-filled next request*. This is the whole idea in two
round-trips.

Two more real refusals from the same session:

```jsonc
// claiming a type digest nobody ever created
{ "kind": "unknown-identity",
  "law": "W4: create before publish — an unknown identity never enters a journal; lag is absence, not admission on faith",
  "path": ["type"], "got": "eeee…eeee",
  "expected": "a digest already committed to the catalog",
  "next": [{ "subject": "flb.req.type.create", "body": { "structure": { "k": "string" } } }] }

// asserting an identity the daemon cannot re-derive
{ "kind": "digest-mismatch",
  "law": "W1: no asserted identity — every committed digest is recomputed by the daemon from submitted bytes",
  "path": ["assertedDigest"], "got": "dddd…dddd",
  "expected": "0c1ffc280256132e234ff9bddd2e2a6044c4e82ba06d6e97e059684cc56b3697" }
```

and my client's own local `structureDigest({k:"bool"})` printed
`0c1ffc280256132e234ff9bddd2e2a6044c4e82ba06d6e97e059684cc56b3697` — the
daemon's `expected` value, computed independently on my side.

### (a) The Effect TypeScript developer

You already put failures on the `E` channel as `Data.TaggedError` instead of
throwing, and you already know the payoff: the caller matches on `_tag` and
the compiler tells them when they missed a case. foldlab's refusal is that
discipline pushed across the process boundary — the daemon's "no" is the same
tagged value, marshaled to JSON, decoded on your side against an
`effect/Schema` codec (`proto/ts/src/wire.ts`). The delta over a typed error:
the payload is required to carry a **legal next step**, not just a reason.
`path` + `got` + `expected` locate it, `example` is a value that would have
been accepted, and `next[].body` is a request body already filled in.

The committed proof that this is enough is `proto/ts/test/smoke.test.ts:59` —
the agent's repair line is `session.createType(refusal.example as Json)`, with
the comment `// No docs were consulted.`

```
$ cd proto/ts && bun install && bun test test/smoke.test.ts
 2 pass
 0 fail
 48 expect() calls
Ran 2 tests across 1 file. [4.99s]
```

Note also `local: false` on every daemon refusal, and `local: true` on
client-side ones (`ProtoClient.connect("nats://127.0.0.1:1")` →
`{kind:"unreachable", local:true}`). "I could not reach it" and "it said no"
are different values, not the same exception with different text.

### (b) The platform / infra engineer

You already know the good version of this from `terraform plan`: it does not
say "invalid configuration", it names the resource, the attribute, the value
it got, the values it accepts, and often the exact line to change. And you
know the bad version from every API that returns `400 {"error":"validation
failed"}`. foldlab makes the good version structural: nine refusal kinds,
each carrying `path`/`got`/`expected`, and each carrying `next[]` — the
*subject to publish to* and *a body template already populated with your
values*. There is no free-text error string to parse.

The `unknown-journal` refusal is the clearest one, because it turns a 404
into an instruction:

```jsonc
{ "kind": "unknown-journal",
  "law": "lag is absence: this journal does not exist here (yet)",
  "path": ["journal"], "got": "nope",
  "expected": "a journal that has admitted at least one frame, or \"catalog\"",
  "next": [{ "subject": "flb.ing.nope",
             "note": "publish a canonical frame to bring this journal into being",
             "body": { "type": "<a cataloged digest>", "payload": "<your event payload>" } }] }
```

It told me the subject to publish on to make the thing exist. That is the
delta over a 404.

### (c) The skeptical auditor

A rejection notice that says "declined" is useless to you; a rejection notice
that says *which rule*, *which field*, *what was submitted*, *what was
required*, and *how to refile* is a document you can put in a file and act on.
Every foldlab refusal carries a `law` field naming the specific rule that
refused — `W1: no asserted identity`, `W4: create before publish`, `W6: heads
are claims` — and those W-numbers are ratified in `proto/wire/CONTRACT.md`
and `proto/SPEC.md`, not invented at the point of rejection.

The `digest-mismatch` refusal above is the chain-of-custody one. A submitter
asserted an identity; the daemon refused it and published *its own*
recomputed value (`0c1ffc28…`). I recomputed the same value locally with an
independent function and got the same hex. The rule the daemon enforces is
that it never accepts an identity it did not derive itself — so the party who
synthesized the bytes is, in the repo's own words, permanently untrusted.

---

# Concept 4 — the register linearizes

**Real code:** `go/effector/effector.go`. `Claim` (108) mints
`Fence: previous.Fence + 1` and writes via a version-checked
`kv.Update(..., stored.Revision())`. `Commit` (186) refuses with `ErrFenced`
when `authority.claim.Fence != claim.Fence`. `Do` (272) is the exactly-once
wrapper: `Lookup` → if `Committed`, return without re-running the effect.

**Real output** — a temp Go test against the embedded NATS server, two
workers, one lapsed lease (instrumentation deleted after capture; the
assertions it exercised are permanent in
`go/effector/effector_test.go`):

```
work digest = 079abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456
lookup before any claim -> state="unclaimed" err=<nil>
worker-A Claim -> fence=1 owner=worker-A err=<nil>
worker-B Claim while A holds -> fence=0 err=effector claim is held: 079abc…3456
worker-B Claim after lapse -> fence=2 owner=worker-B err=<nil>
worker-A Commit under fence 1 -> first=false err=effector claim was superseded: digest 079abc…3456 has fence 2, not 1
worker-B Commit under fence 2 -> first=true  err=<nil>
worker-B Commit AGAIN (retry) -> first=false err=<nil>
worker-A Commit after B committed -> first=false err=effector claim was superseded: digest 079abc…3456 was committed at fence 2, not 1
final Lookup -> state="committed" fence=2 result="B-paid-500" err=<nil>
```

Read the last four lines together. A's write is refused **twice** — once
before B commits and once after, and the two errors differ (`has fence 2, not
1` vs `was committed at fence 2, not 1`), because the fence check runs before
the outcome check. B's *retry* returns `first=false, err=<nil>` — the retry is
absorbed, not an error. That is exactly-once as observable behavior.

### (a) The Effect TypeScript developer

You already reach for `Layer` to guarantee one instance of a resource per
runtime, and you already know its limit: a `Layer` gives you one instance per
*process*, and says nothing about the four other processes doing the same
work. The register is that guarantee moved out of the process and into a
durable KV value: `Register ::= Absent | Claim(fence, owner, lease) |
Done(fence, result)`, keyed by the *digest of the work*, advanced only by
compare-and-swap. The delta: the thing that decides who may commit is a
monotone integer, not the holder's identity — so a worker that stalls, wakes
up, and is *sure* it still holds the lease still cannot land its write.

That is the trap the `Effect` idiom does not close on its own. A lease that
expires does not stop the holder from finishing; it only stops the holder
from *committing*, and only because someone else bumped the fence. In the run
above worker-A never learned it had lost; it was told at commit time, with
the number that beat it.

### (b) The platform / infra engineer

You already trust etcd compare-and-swap and you already know why a plain
distributed lock is not enough — the classic failure is a lock holder that
GC-pauses past its TTL and writes anyway. The standard fix is a fencing
token, and this is that: `Claim` returns a monotonically increasing `fence`,
`Commit` verifies the stored fence still equals yours, and the storage write
is `kv.Update(key, value, storedRevision)` — CAS on JetStream KV. The delta
over Terraform state locking, which you also already know: Terraform's lock
protects the *apply*; this protects the *commit*, and it stores the outcome,
so a rerun of already-done work returns the stored result instead of
re-executing.

`Do()` is the API that matters: `Lookup` → if `Committed`, return the outcome
and `false` for "did I run it". `Open()` additionally refuses a bucket whose
config is wrong (`badShapeReason`, line 465): non-file storage, a TTL, a
bounded `MaxBytes`, or `History < 1` all fail at open time rather than
silently degrading the guarantee.

```
$ cd go && go test ./effector
ok  	foldlab/effector	3.087s
```

The suite's obligation table (`go/effector/effector_test.go:1-17`) maps
eleven laws to named tests 1:1 — EL3 fencing is `TestStolenClaimCannotCommit`,
EL2 exactly-once is `TestConcurrentDoCommitsOnce`, EL7 commit idempotence is
`TestCommitIdempotence`.

### (c) The skeptical auditor

Dual authorization and a numbered-check register are controls you already
understand: a payment goes out once, under one voucher number, and a
superseded voucher cannot be presented later. The output above is that
register operating under an adversarial case — the first worker's payment
instruction is refused after its authorization lapsed, and refused *again*
after the second worker's payment landed, with the reason naming both fence
numbers. One terminal outcome, permanently attributed to fence 2.

**Where the evidence stops, and this is in the repo's own ledger.**
`VERIFICATION.md` claims the effector at R3 (Apalache inductive invariant,
unbounded in fences, bounded at 3 and 4 owners) plus R4 (15,378 schedules
replayed lockstep against the Go binary; 828/828 deliberately corrupted
schedules detected). It then states the residual plainly: *"the proof
artifacts live in `.reference/`, an untracked predecessor repository that is
absent from this checkout, so the public repository asserts this claim
without shipping its evidence"* (ticket 013). For an auditor, that means the
running behavior above is checkable today and the formal proof is not. The
ledger says so itself, which is the control working.

---

# Concept 5 — verify-on-read

**Real code:** two independent implementations, deliberately. Server side:
`go/journal/journal.go:180` `Read` checks, per entry, `entry.Seq == position`,
`entry.Prev == cursor.Head`, and `DigestHex(raw) == EntryDigest(decoded)` —
the last one catches bytes that are semantically right but not canonically
spelled. Client side: `proto/ts/src/jcs.ts:165` `foldChain` re-derives the
chain from the returned entries and `proto/ts/src/client.ts` refuses a head it
cannot reproduce.

**Real output** — temp Go test, embedded NATS, a three-entry journal, then two
forgeries published straight to the subject bypassing the journal:

```
appended seq=0 prev=000000000000... payload="invoice-1 100" digest=be9ef7d9ad09...
appended seq=1 prev=be9ef7d9ad09... payload="invoice-2 250" digest=0fd16d44c59f...
appended seq=2 prev=0fd16d44c59f... payload="invoice-3 75"  digest=bc6a5db34418...
CLEAN READ  -> cursor seq=2 head=bc6a5db34418482c023f5aa569cd0b021192756f6fed9995c2b50b6ce491ff6a err=<nil>

TAMPERED READ -> entries=3 cursor seq=2 head=bc6a5db34418…ff6a
TAMPERED READ -> err = journal entry failed verification at position 3: prev does not match the verified head

NON-CANONICAL BYTES -> entries=2 cursor seq=1
NON-CANONICAL BYTES -> err = journal entry failed verification at position 2: wire bytes are not canonical
```

The read **names the position** and hands back the verified prefix. It does
not throw away the good entries and it does not advance the cursor past the
bad one — the committed test `TestForgedTailDetected` pins exactly that
(`cursor.Seq != 2` → "cursor advanced past a forged entry, must stop at 2")
and pins that a *second* read from the returned cursor refuses again at the
same place.

The second case is the one worth staring at. That forgery has the correct
`seq`, the correct `prev`, and valid content — only the byte spelling is off
(`{ "payload": "x", ... }` with spaces). Linkage checks alone cannot see it.
It is caught because `Read` also proves the wire bytes are the canonical
encoding of what they decode to.

**And the same check on the client side**, from the running daemon (real
output):

```jsonc
// client.read("catalog", { seq: -1, head: "aaaa…aaaa" })
{ "ok": false,
  "refusal": {
    "kind": "bad-cursor",
    "law": "W6: heads are claims — the requested cursor does not verify against this journal",
    "path": ["from"],
    "got": { "seq": -1, "head": "aaaa…aaaa" },
    "expected": "a cursor previously returned by a verified read, or {seq:-1, head:genesis}",
    "example": { "journal": "catalog", "from": { "seq": -1, "head": "0000…0000" }, "max": 0 } } }
```

A successful read carries the note `heads are claims: recompute the chain
head from the entries locally` (`proto/go/protod/read.go:17`), and the TS
client does exactly that before returning.

### (a) The Effect TypeScript developer

You already use `Schema.decodeUnknown` at the process boundary because you do
not trust bytes from the network to match your types — parse, don't validate.
Verify-on-read is that same reflex applied to a *claim* rather than a shape:
the daemon returns entries and a head, and the client refuses to believe the
head, re-folding the entries locally and comparing (`foldChain`, then
`if (fold.head !== reply.fact.head)` in `client.ts`). The delta: schema
decoding proves the reply is well-formed; this proves the reply is *the one it
says it is*. If they disagree, you get a local refusal (`kind:
"verify-failed"`, `local: true`) — distinguishable from the daemon saying no.

`proto/ts/test/smoke.test.ts:115` is the assertion:
`expect(data.fact.verified.head).toBe(admitted.fact.head)` with the comment
`// local fold == admit claim`. The client's number and the daemon's claim are
compared, and the client's is the one returned.

### (b) The platform / infra engineer

You already run `git fsck`, and you already know the appeal: nothing is
trusted because it is in the repo, it is trusted because the object's hash
matches its contents and its parent link resolves. The delta here is that
fsck is not a maintenance command you occasionally remember to run — it is
the read path. Every `Read` re-verifies seq, prev-link, and byte-canonicality
per entry, and stops at the first failure with the position, exactly like
`git fsck` naming a broken object.

The `wire bytes are not canonical` case is the one a WAL checksum would miss.
The entry decodes to the right value and links correctly; only its JSON
spelling differs from RFC 8785 canonical form. Because identity is defined
over the canonical bytes, a differently-spelled entry is a *different* entry,
and the read says so at position 2. If you have ever debugged two services
disagreeing about a "same" JSON document, this is that class of bug promoted
to a hard refusal.

### (c) The skeptical auditor

You already ask for a checksum on a delivered file, and you already know its
weakness: the checksum arrives with the file, from the same party. Here the
party that stores the data does not get to be the party that certifies it.
The daemon verifies on its way out, states in the reply that its head is only
a *claim*, and the client independently re-derives the head from the entries
before accepting it. Two computations, one number, and you can perform the
second one yourself.

The tamper demonstration is a chain of custody test you can run: append three
entries, alter one byte of the linkage on a fourth written outside the
journal, read. The read returns the three entries that verify, refuses the
fourth, and names the position — `at position 3: prev does not match the
verified head`. It does not say "the ledger is corrupt"; it says which page,
and it hands you everything before that page, still good. A second read
cannot be talked past that page.

### The sharp edge I hit — and the deeper one another lane filed the same day

A read from a cursor whose `seq` is already at the journal tail returns
`ok:true` with zero entries and echoes the *submitted* head back inside a
field literally named `verified`:

```jsonc
// client.read("catalog", { seq: 0, head: "aaaa…aaaa" }) on a 1-entry journal
{ "ok": true, "fact": { "entries": [], "verified": { "seq": 0, "head": "aaaa…aaaa" } } }
```

No entries were vouched for, so nothing false was certified — `foldChain` over
an empty list correctly returns its input cursor. But a caller reading
`fact.verified.head` gets a fabricated digest back under that name.

**This is the shallow end of a bug the Go concurrency lane found
independently and filed as
[#34](https://github.com/mepuka/foldlab/issues/34) on 2026-08-13**, per the
README live watch: `Journal.Read` *adopts* an unverified caller-supplied
cursor, so a prior read can poison the next append's chain link —
unrepairably, in a `DenyDelete` stream. Their version is strictly worse than
mine (mine is a naming problem on a read-only path; theirs is durable
corruption on the write path) and it subsumes it. I am recording my
observation only as an independent second sighting of the same root cause —
the read path trusting a cursor it did not issue. Any fix for #34 should also
settle what `fact.verified.head` means on an empty read.

---

# The first ten minutes — candidate README walkthrough

Four commands, all executed. It touches both folds, cut-anywhere, a refusal,
self-repair, and a tamper check **before any concept is named**. Total
elapsed on my machine: about 90 seconds, dominated by the one-time
`go build` of `protod` inside step 4.

### Step 0 — install (5s)

```
$ bun install
```

### Step 1 — the two folds and the cut

```
$ bun packages/core/examples/tour.ts
```
```
two histories, same two facts, different order

  A head           c0f9c11ccb06bc3c18f4de601b85f44aaf682c83f09090a2c536fa1488d40816
  B head           cbf009894aea951acfd7e7f8157c514fd5144aa6efd7960698855c464533c7ff
  A state digest   62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
  B state digest   62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
  heads equal?     false
  states equal?    true

cut B anywhere, fold the halves apart, combine:
  cut@0 -> 62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
  cut@1 -> 62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
  cut@2 -> 62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f

feed the meaning fold something it does not admit:
  head still extends: d6c5ccfc0b466cf64532de3f167d89ba710b5aff9f43062c568c816c25da5cfa
  meaning fold says: MalformedPayload
```

This file did not exist when the memo was drafted; it is committed alongside
this memo at `packages/core/examples/tour.ts`. It *cannot* live under
`scripts/`, because `effect` is not hoisted to the root `node_modules` (it
resolves only from `packages/core/`). Full source, exactly what produced the
output above:

```ts
import { Effect } from "effect"
import { applyKV, combineKV, event, foldKV, headFrom, stateDigest, streamSeed } from "../src/stream.ts"

const seed = streamSeed("orders")
const A = [event("orders", 1, "customer=ada"), event("orders", 2, "total=42")]
const B = [event("orders", 1, "total=42"), event("orders", 2, "customer=ada")]
const st = (e: typeof A) => stateDigest(Effect.runSync(foldKV(e)))

console.log("two histories, same two facts, different order\n")
console.log("  A head          ", headFrom(seed, A))
console.log("  B head          ", headFrom(seed, B))
console.log("  A state digest  ", st(A))
console.log("  B state digest  ", st(B))
console.log("  heads equal?    ", headFrom(seed, A) === headFrom(seed, B))
console.log("  states equal?   ", st(A) === st(B))

console.log("\ncut B anywhere, fold the halves apart, combine:")
for (let k = 0; k <= B.length; k++) {
  const left = Effect.runSync(foldKV(B.slice(0, k)))
  const right = Effect.runSync(foldKV(B.slice(k)))
  console.log(`  cut@${k} ->`, stateDigest(combineKV(left, right)!))
}

console.log("\nfeed the meaning fold something it does not admit:")
const junk = { stream: "orders", seq: 3, payload: new Uint8Array([0xff, 0xfe]) }
console.log("  head still extends:", headFrom(seed, [...B, junk]))
console.log("  meaning fold says:",
  Effect.runSync(Effect.flip(applyKV(Effect.runSync(foldKV(B)), junk)))._tag)
```

### Step 2 — the whole thing is green in seconds (2.4s + 5.8s)

```
$ bun test
 186 pass
 4 skip
 0 fail
 47364 expect() calls
Ran 190 tests across 16 files. [2.19s]

$ cd go && go test ./journal ./effector ./stream
ok  	foldlab/journal	1.798s
ok  	foldlab/effector	3.087s
ok  	foldlab/stream	1.144s
```

### Step 3 — the tamper check (runs today, output is weak)

```
$ cd go && go test ./journal -run 'TestForgedTailDetected|TestNonCanonicalWireRejected' -v
=== RUN   TestForgedTailDetected
--- PASS: TestForgedTailDetected (0.02s)
=== RUN   TestNonCanonicalWireRejected
--- PASS: TestNonCanonicalWireRejected (0.04s)
PASS
ok  	foldlab/journal	1.600s
```

Two `PASS` lines are a poor tenth minute. The interesting thing — `journal
entry failed verification at position 3: prev does not match the verified
head` — is asserted but never printed, because the test file is
coordinator-owned and only asserts `errors.Is(err, journal.ErrTampered)`.
**Recommendation:** add `go/journal/example_tamper_test.go` as a Go `Example`
function (idiomatic, gated by output comparison, doesn't touch the owned
file). I verified the exact output such an example produces; it is the block
quoted under Concept 5. Not committed here — it is a new gate-visible test
file in a coordinator-owned package, which is a ratification decision, not a
research one.

### Step 4 — a refusal, and self-repair from it (~60s cold, 5s warm)

```
$ cd proto/ts && bun install && bun test test/smoke.test.ts
 2 pass
 0 fail
 48 expect() calls
Ran 2 tests across 1 file. [4.99s]
```

This spawns the real `protod` binary against a temp JetStream store and runs a
full agent session: describe → typo → refusal → repair *from the refusal's own
example* → publish → refused unknown identity → verified read → convergence →
refused digest lie. `test/smoke.test.ts` reads top-to-bottom as a transcript
with the comment `// No docs were consulted.` at the repair.

Again the output is a PASS. The capture script that prints the actual refusal
JSON is committed alongside this memo at `proto/ts/examples/refusals.ts`, so
the walkthrough can show the refusals rather than assert them:

```
$ cd proto/ts && bun examples/refusals.ts
```

That JSON is the single most persuasive artifact produced in this pass, and
before this commit nothing in the repo showed it to a newcomer.

**The `bun install` inside `proto/ts` is required and undocumented** — without
it the smoke test dies on `Cannot find package 'effect'`. That belongs in the
README regardless of the walkthrough.

---

# Which concepts resisted concretization

**Concept 4, the register, resisted — genuinely, and it was not forced.**
Three reasons, in order of severity:

1. **The demo needs a wall clock.** Fencing only becomes visible when a lease
   *lapses*, which means the shortest honest example contains a
   `time.Sleep(150ms)` and a lease deliberately set to 60ms. An example whose
   punchline depends on a sleep fails the one-minute test in a different way
   than a long example does: the reader has to be told what to imagine
   happening during the sleep. Every framing tried needed a sentence of
   "pretend worker A is GC-paused here."

2. **There is no runnable surface.** The other four concepts all have
   something a newcomer can invoke: `bun` a script, `go test -v` a named
   test, drive the real daemon. The effector has only
   `go/effector/effector.go` and a coordinator-owned test file. Instrumenting
   it was necessary to see anything at all, and that instrumentation was
   deleted rather than committed, because adding a printing test to a
   coordinator-owned package is a ratification decision. Until there is an
   `Example` function or a small `cmd/`, concept 4 cannot be shown, only
   described.

3. **The headline evidence is not in this repository.** The claim that makes
   the register impressive — Apalache inductive invariant, 15,378 lockstep
   schedules, 828/828 sabotage detection — is asserted in `VERIFICATION.md`
   with the residual stated in the same entry: the proof artifacts live in an
   untracked predecessor repo and are absent from this checkout (ticket 013).
   So the auditor calibration, the one audience that would most want the
   formal claim, has to be told "the running behavior is checkable; the proof
   is not, and the repo says so." That is honest and it is the right thing to
   write, but it means concept 4's strongest calibration is its weakest
   example. **Do not lead the README with the register.** Lead with the two
   folds, which is one script and six lines of hex.

**A softer resistance in concept 1.** The forgiveness half — that the meaning
fold no-ops on an out-of-domain payload while the identity fold absorbs it —
is a *one-line* delta (`kvStep(state, e) ?? state`) and no framing was found
that made it land visually without also explaining that there are two callers
of the same `kvStep`. The version settled on shows the two outcomes side by
side (`MalformedPayload` vs a head that still extends) and skips the
entity-collector caller entirely. That is the right trade, but it means the
README will not teach `applySync`, and the "one walled decoder, two
dispositions" idea stays a code comment.

**Concepts 2, 3, and 5 concretized cleanly** and each has a natural
sub-60-second example: three identical digests from three different cuts; a
refusal whose `example` field is a valid input you resubmit verbatim; a read
that names the position of the byte you flipped.
