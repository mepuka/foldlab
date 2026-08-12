# P4 — Exactly-Once Effector (the distributed claim protocol)

Status: **SPEC RULED — climbing.** Fitness functions:
`go/effector/effector_test.go` (Go half, adversarially reviewed and hardened
at f4f3235) AND `packages/kernel/test/engine.effector.laws.test.ts` (TS half
— see Part 2, the escalation ruled after P3b was beaten: this rung is not
climbed until exactly-once EFFECTS holds through the live plane). Renumbered
from P3 when the Journal Engine took that slot (the engine makes ONE worker
durable; this rung makes MANY workers safe). Both suites coordinator-owned;
do not edit them or this document. A law that seems wrong is a finding for
the attempts log, not an edit.

## The honest claim

Exactly-once *execution* of a side effect is impossible: a worker can always
crash in the window between performing an effect and recording that it did.
This rung does not pretend otherwise. It delivers the decomposition that IS
achievable, and names both halves:

> **At-least-once execution, exactly-once commitment.**
> The effect may run more than once. The *outcome* is committed at most once,
> and a committed outcome is never overwritten, so every reader of the store
> sees one result forever.

Two mechanisms, with strictly separate jobs — this separation is the whole
lesson of the rung:

- **The lease is for LIVENESS.** It stops a crashed worker's work from being
  stranded forever. It is a wall-clock heuristic and it can be wrong (clock
  skew, a paused process). Being wrong costs a duplicate *execution*, never a
  duplicate *commitment*.
- **The fence is for SAFETY.** Every claim carries a strictly increasing
  fence per digest. A commit is accepted only under the fence that currently
  holds the claim. So when a lease is wrongly stolen, the old owner's commit
  is *refused* rather than racing. Safety does not depend on the clock.

Work is identified by CONTENT: the digest is a P1/P2b entry digest. Nothing
is trusted that was not recomputed or refused by the broker.

## Definition

One new Go package: `go/effector` (module `playground/kernel`, depends on
`playground/kernel/canonical` and the pinned jetstream client; nothing else).

```go
package effector

type State string
const (
    Unclaimed State = "unclaimed" // never claimed, or the claim's lease lapsed
    Held      State = "held"      // a live claim exists
    Committed State = "committed" // an outcome is recorded, forever
)

type Claim struct {
    Digest string
    Fence  uint64    // strictly increasing per digest; 1 for the first claim
    Owner  string
    Expiry time.Time // absolute; liveness only, never safety
}

type Outcome struct {
    Digest string
    Fence  uint64 // the fence that committed
    Result string // opaque caller value (e.g. a result digest)
}

// Sentinel errors (errors.Is-able):
var ErrBadBucket error // existing bucket fails the shape proof at bind
var ErrHeld      error // a live claim by another owner
var ErrCommitted error // already committed (Claim), or committed with a
                       // DIFFERENT result (Commit)
var ErrFenced    error // the claim was superseded; this commit is refused

type Effector struct{ /* opaque */ }

// Open ensures the KV bucket exists with the PINNED shape, or PROVES the
// shape of an existing one and refuses (ErrBadBucket) otherwise.
func Open(ctx context.Context, js jetstream.JetStream, name string) (*Effector, error)

// Claim takes the work. ErrCommitted if an outcome exists. ErrHeld if a live
// claim exists. An EXPIRED claim is stolen with fence+1.
func (e *Effector) Claim(ctx context.Context, digest, owner string, lease time.Duration) (Claim, error)

// Commit records the outcome under the claim's fence. THE FENCE IS CHECKED
// FIRST: a superseded claim is ErrFenced whether or not an outcome exists
// (safety before bookkeeping). Commit NEVER consults Expiry: an effect that
// outlived its lease with nobody stealing the claim still commits. The clock
// decides who may START work; only the fence decides who may FINISH it.
//   - refused ErrFenced if the live claim's fence differs from c.Fence
//   - first==true when this call created the outcome
//   - first==false, nil error when the SAME result is already committed
//   - ErrCommitted when a DIFFERENT result is already committed
func (e *Effector) Commit(ctx context.Context, c Claim, result string) (first bool, err error)

func (e *Effector) Lookup(ctx context.Context, digest string) (State, Outcome, error)

// Do is the composed loop: skip if committed, else claim, run, commit.
// ran==true only when effect was invoked AND its result was committed by
// this call. If effect returns an error, Do returns it and commits nothing;
// the claim lapses with its lease and the work becomes claimable again.
func (e *Effector) Do(
    ctx context.Context, digest, owner string, lease time.Duration,
    effect func(context.Context) (string, error),
) (Outcome, bool, error)
```

## Wire mapping (pinned — AMENDED A6, ratified 2026-08-11)

> RATIFICATION NOTE: the original two-key mapping (claim.<digest> +
> done.<digest>) is REFUTED and withdrawn. Countermodel (audit CEX-3,
> bounded check at depth 14, trace begin/steal/finish): the commit-side
> fence check reads one key while the outcome create targets another, so a
> stale owner that passes its check, pauses through a steal, and wins the
> outcome create commits under a superseded fence — fencing safety
> (SPEC §6.3) fails while unique commitment survives. No black-box schedule
> can force the interleaving, which is why fifteen laws stayed green over
> an unsafe protocol. The repair couples fence validation and protected
> mutation at ONE linearization point. Full provenance:
> docs/research/kernel-formal-specification-primary-sources.md.

- Bucket `E_<name>`; `<name>` matches `^[A-Za-z0-9_-]+$` (refuse otherwise).
- **ONE authority key per digest: `work.<digest>`.** Its value is one of:
  - claim: `{"expiry":<unix millis int>,"fence":<int>,"owner":<string>,"tag":"claim"}`
  - outcome: `{"fence":<int>,"result":<string>,"tag":"done"}`
  Values are canonical encodings (`canonical.Canonicalize`), keys code-unit
  sorted, no whitespace. `done` is TERMINAL: no protocol transition leaves
  it; nothing is ever deleted; the bucket carries no TTL.
- **First claim** is `kv.Create` with fence 1 (K1). **Stealing** an expired
  claim is `kv.Update` at the revision just observed, fence+1 (K2). A lost
  steal race (`ErrKeyRevisionMismatch`) is `ErrHeld`.
- **Commit is a revision-CAS on the SAME key**: read the claim, require its
  fence to equal the caller's, then `kv.Update(work.<d>, done-value,
  claimRevision)`. SUCCESS ⇒ `first=true`. On revision mismatch, re-read
  and map: claim or done at a different fence ⇒ `ErrFenced`; done at the
  same fence with the same result ⇒ `first=false, nil`; done at the same
  fence with a different result ⇒ `ErrCommitted`; absent ⇒ `ErrFenced`.
  A steal bumps the revision, so a superseded owner's commit CANNOT land —
  fencing is enforced by the store's linearization, not by a client-side
  check (SPEC Theorems A6.1–A6.3; 3,919-state enumeration clean).
- Consequence for `Commit` semantics vs the original Definition text: a
  commit against an outcome recorded under a DIFFERENT fence is now
  `ErrFenced` (the claim was superseded), not `ErrCommitted`;
  `ErrCommitted` at commit means exactly "same fence, conflicting result."
  The law suite was amended accordingly
  (TestCommitRefusesToOverwriteAForeignOutcome, TestWireValuesAreCanonical).

**Measured client traps (nats.go v1.53.1, server v2.14.4 — do not rediscover
these):**

- A stale `kv.Update` returns an error matching BOTH `ErrKeyRevisionMismatch`
  AND `ErrKeyExists` (both carry code 10071 on an R1 stream). Match
  `ErrKeyRevisionMismatch` at the claim CAS site and `ErrKeyExists` at the
  outcome create site — one shared "is this a conflict" helper takes the
  wrong branch.
- `CreateKeyValue` on an IDENTICAL existing bucket returns nil, and on a
  DIFFERING one returns `ErrBucketExists` — never `ErrBadBucket`. So `Open`
  must be **lookup-then-prove** (the `journal.Open` idiom), never
  create-and-catch, or both the wrong-shape and conformant-variant laws fail.
- `kv.Create` returns revision 1 and `Get().Revision()` agrees; a bucket with
  `History > 1` does not change `Update`-with-revision behavior.

**Contracts the laws do not pin, ruled here so they are not guessed:**

- `Lookup` on a digest that was never claimed returns
  `(Unclaimed, Outcome{}, nil)` — absence is an answer, not an error.
- A lapsed claim re-taken by its ORIGINAL owner still increments the fence.
  There is no owner exception: fencing is about generations, not identity.
- `Commit` with a claim for a digest that holds no live claim is `ErrFenced`
  (fence-first, and the live fence is 0).
- `Do` returning a non-nil error returns the zero `Outcome`; callers read the
  error, not the outcome.
- `Do` MAY return `ErrHeld` to its caller or wait for the holder — both are
  conformant; the caller owns the retry policy either way.
- **`*Effector` is safe for concurrent use by multiple goroutines.**

## Bucket shape (pinned, and PROVED at bind)

- `Storage: FileStorage`, `History >= 1`, `TTL == 0`, `MaxBytes` unlimited
  (`0` or `-1`).
- A non-zero TTL is REFUSED: an expiring outcome key silently reopens
  committed work — the "evaporating commitment" failure. This is the
  retention-by-outcome posture from Cotal, applied to authority keys.
- Open never "fixes" a nonconformant bucket, and accepts a CONFORMANT
  variant (e.g. `History: 5`, a description) — the proof is of the pinned
  properties, not of byte-equal config.

## Laws (obligation table in the test file)

- **EL0 — Shape**: Open creates the pinned bucket; refuses a pre-existing
  bucket with a TTL or memory storage (ErrBadBucket); accepts a conformant
  variant.
- **EL1 — Mutual exclusion**: with a live lease, a second Claim on the same
  digest is ErrHeld; a claim on a different digest is unaffected.
- **EL2 — Exactly-once commitment under concurrency**: N workers race `Do` on
  one digest with an effect counting invocations. Exactly one call reports
  ran=true; every other call either reports ran=false with the identical
  committed outcome or fails ErrHeld; `Lookup` shows exactly one outcome, and
  every non-erroring caller agrees on its Result.
- **EL3 — Fencing (safety without the clock)**: A claims with a short lease
  and stalls; after expiry B steals (fence strictly greater); **A's Commit is
  ErrFenced** and writes nothing; B's Commit succeeds. Then A's second
  attempt still cannot overwrite.
- **EL4 — Already terminal = success**: after a commit, `Do` does NOT invoke
  the effect (counter unchanged) and returns ran=false with the committed
  outcome; `Claim` returns ErrCommitted.
- **EL5 — No permanent stranding**: a claimed-but-never-committed digest
  returns to `Unclaimed` once the lease lapses and is re-claimable with a
  strictly greater fence; a failing effect commits nothing and leaves the
  work recoverable.
- **EL6 — The honest law, under an adversarial schedule**: workers crash at
  each phase boundary (after claim; after the effect but before commit) with
  short leases. Assertions: committed outcomes == 1; effect invocations >= 1
  and MAY exceed 1 (the law does not promise exactly-once execution); the
  committed Result is one that an actual invocation produced; the committing
  fence is the fence that held the claim at commit time.
- **EL7 — Commit idempotence**: re-committing the same (claim, result)
  returns first=false with no error and leaves the record byte-identical;
  committing a different result after commit is ErrCommitted; the stored
  outcome is unchanged in both cases.
- **EL8 — State lives in the bucket, not the process**: two `Effector`
  bindings to ONE bucket see each other's claims and commitments, and a
  binding opened after the commit sees it too. (An in-process map is not an
  exactly-once effector; it is a mutex.)
- **EL9 — Canonical wire values**: `claim.<digest>` holds exactly the three
  canonical fields with the first fence == 1 and a plausible expiry;
  `done.<digest>` is byte-exactly `{"fence":1,"result":"the-result"}`.
- **EL10 — Foreign outcomes survive**: an outcome written out of band under a
  different fence is never displaced — Commit refuses it and `Do` will not
  invoke the effect over it.

### What this suite does NOT prove — stated honestly

**The outcome write MUST use `kv.Create` (create-only), not read-then-`Put`.**
An implementation that reads the outcome key and then blind-`Put`s passes
every law above: the losing interleaving (A reads while current, B steals and
commits, A then writes) requires B to complete three round trips inside A's
single inter-call gap, and a law that detects it fires in roughly 1 run in 3.
A flaky law is worse than no law, so this is carried as a **review
obligation**, verified by reading the diff, not by the gate. Create-only is
the single atomic primitive that makes commitment exactly-once; nothing else
enforces it.

## Verification

```
cd go && test -z "$(gofmt -l .)" && go vet ./... && go test -race ./...
```

`-race` is part of the gate here, not an optional extra: EL2 shares one
`*Effector` across eight goroutines, and the concurrency contract above is
only meaningful if the detector runs.

Tests run an EMBEDDED nats-server per test (`DontListen` +
`nats.InProcessServer`); no ports are bound. Leases in tests are tens of
milliseconds, so the suite stays fast. Measured margins (Windows, 80
samples): `time.Sleep(150ms)` never returned before 150ms, so every lease
margin is one-sided safe — a slower machine makes a lapse MORE certain, never
less. The TS gate, P2a, and P2b must stay green and untouched.

## References

- Kleppmann, "How to do distributed locking" (2016) — the fencing token: a
  lock whose safety survives a wrongly-expired lease. EL3 is that argument.
- Gray & Lamport / the two-generals impossibility — why exactly-once
  *execution* is not on the table, and why the commit record is the boundary.
- Helland, "Life beyond Distributed Transactions" (CIDR 2007) — idempotent
  activities and the at-least-once + dedupe decomposition.
- tailtalk ADR 0001 — KV `Create`-as-claim, `ErrKeyExists` ⇒ ack and skip;
  recorded in-tree as "never fully built", which is why EL3/EL6 exist here.
- Cotal SPEC §13.4/§13.9 — obligation rows, never-deleted authority keys, the
  lease token living in the owner's record rather than in the work item.
- multica — "already terminal = success" (EL4/EL7).
- Local: P1/P2b (the digest that names the work), P2a (the value encoding).

---

## Part 2 — the effector on the live plane (ruled after P3b)

P3b's LP8 proved fact-level arbitration and explicitly disclaimed effect-level
single-execution ("that is P4's lease"). The robustness review measured the
gap: two racing engines executed 3 activities SIX times. This part closes it.
The rung is climbed only when BOTH halves are green.

### Sidecar protocol extension (journald)

journald (go/cmd/journald — the climber may edit it; it is this rung's
surface) additionally links `playground/kernel/effector` and serves, on the
same NDJSON channel and the same embedded server:

- `{"id":n,"op":"claim","name":s,"digest":d,"owner":o,"leaseMs":m}` ->
  `{"id":n,"ok":true,"fence":f,"expiryMs":e}`
- `{"id":n,"op":"commit","name":s,"digest":d,"fence":f,"owner":o,"result":r}` ->
  `{"id":n,"ok":true,"first":b}`
- `{"id":n,"op":"lookup","name":s,"digest":d}` ->
  `{"id":n,"ok":true,"state":"unclaimed"|"held"|"committed","fence":f,"result":r}`
  (fence 0 / result "" when absent; absence is an answer, not an error)

Error reasons: `ErrHeld` -> `"held"`, `ErrCommitted` -> `"committed"`,
`ErrFenced` -> `"fenced"`, everything else -> `"unavailable"`. The death rule
from P3b applies unchanged: any exit or malformed line fails everything
`"unavailable"`; may fail, may never hang.

IN-CONCERT AMENDMENT (landed while this climb runs):
`go/cmd/journald/conformance_test.go` now exists and is COORDINATOR-OWNED —
a black-box NDJSON-protocol test proving the sidecar's own read refuses a
tampered journal (P3b F1 closure; verified passing against the current
tree). It is frozen like every law suite and runs under the `go test
./cmd/...` already in this rung's gate; keep it green as you extend main.go.
Measured intel for the guarded engine, from the same review: `effect/
Semaphore` permits are NOT reentrant — a permit-holding fiber that awaits
another permit on the same semaphore deadlocks; `Effect.fork` does not exist
at the pin (use `Effect.forkChild`/`forkIn`); `Effect.interrupt` is a value
— interrupt fibers with `Fiber.interrupt(fiber)`.

### TS surface

`packages/kernel/src/effector-live.ts` (new):

```ts
export class EffectorError extends Data.TaggedError("EffectorError")<{
  readonly reason: "held" | "committed" | "fenced" | "unavailable"
  readonly detail: string
}> {}

export interface EffectorClaim {
  readonly digest: string
  readonly fence: number
  readonly owner: string
  readonly expiryMs: number
}

export interface EffectorService {
  readonly claim: (
    digest: string, owner: string, leaseMs: number,
  ) => Effect.Effect<EffectorClaim, EffectorError>
  readonly commit: (
    claim: EffectorClaim, result: string,
  ) => Effect.Effect<{ readonly first: boolean }, EffectorError>
  readonly lookup: (digest: string) => Effect.Effect<
    { readonly state: "unclaimed" | "held" | "committed"
      readonly fence: number
      readonly result: string },
    EffectorError
  >
}

export class ActivityEffector extends Context.Service<
  ActivityEffector, EffectorService
>()("playground/ActivityEffector") {}

/** Bind an effector bucket over an existing live sidecar (same process,
 *  same store dir — the single-writer rule forbids a second spawn). The
 *  climber wires whatever store-live.ts exposes to make this possible;
 *  store-live.ts is theirs. */
export const effectorOf: (journald: LiveJournald, name: string) => EffectorService
```

### The guarded engine

`packages/kernel/src/engine-guarded.ts` (new):

```ts
export const layerJournalGuarded: Layer.Layer<
  WorkflowEngine.WorkflowEngine,
  never,
  JournalStore | ActivityEffector
>
```

Identical to `layerJournal` EXCEPT `activityExecute`, which runs the GUARDED
ACTIVITY PROTOCOL (pinned):

1. Work identity: `workDigest = digestHex("<executionId>/<activity.name>/<attempt>")`
   (P0's digestHex over the raw id string).
2. Replay/memo first, as ever — a journaled fact needs no claim.
3. `lookup(workDigest)`: if `committed`, ADOPT — decode the outcome's result
   (below), journal it via the normal appendOutcome path, return it. The
   local effect DOES NOT RUN.
4. Else `claim(workDigest, owner, 30_000)` where owner is any per-Layer
   unique string. On `"held"`: poll lookup every 25ms until `committed`
   (adopt) or claimable (retry claim). On `"committed"`: adopt.
5. On claim success: run the effect, then `commit(claim, result)` where
   `result = canonicalizeJcs(<the JSON-encoded exit>)` — the SAME encoded
   exit object the fact carries, canonically serialized, so any two workers
   committing the same exit commit the same bytes.
   - commit ok (first or not) -> journal the fact, return.
   - commit `"fenced"` or `"committed"` -> the claim was superseded or a
     rival landed first: `lookup`, ADOPT the committed outcome, discard the
     local result. (At-least-once execution across a lease lapse is the
     honest residue — P4's Do contract, unchanged.)
6. Adoption decode: `decodeExitJson(JSON.parse(outcome.result))`. If the
   pinned exit-JSON shape differs at the pin from what a test crafts, that
   is a FINDING for the attempts log, not a workaround.

The unguarded `layerJournal` stays exactly as it is — P3/P3b laws keep
running against it unchanged.

### TS laws (`engine.effector.laws.test.ts`)

- **EF1 — Exactly-once effects under racing engines** (the law LP8
  disclaimed): two guarded engine Layers over ONE live store + ONE effector
  bucket run the same executionId concurrently; activities return different
  bytes per invocation and count executions. Both executes return the SAME
  value; the journal holds exactly one fact per activityId; a third fresh
  guarded engine replays to the same value; and the TOTAL effect executions
  across both engines is EXACTLY the activity count. No lease lapses in this
  law (30s leases, instant effects).
- **EF2 — The fence through the wire**: driving the primitives directly —
  claim with a 300ms lease as one owner; after expiry claim as another owner
  (fence 2); commit as the thief succeeds `first`; the zombie's commit at
  fence 1 is refused `"fenced"`; lookup shows the thief's outcome; a further
  claim is refused `"committed"`. Pins all three error reasons and the
  steal-increments-fence rule through the TS boundary.
- **EF3 — Foreign outcomes are adopted, not re-executed**: pre-commit an
  outcome for one activity's workDigest (crafted success exit, canonically
  serialized); run ONE guarded engine; that activity's effect executes ZERO
  times, the workflow's value embeds the adopted result, and the journal
  fact for it equals the adopted exit.

## Verification (both halves)

```
bun run typecheck && bun test
cd go && test -z "$(gofmt -l .)" && go vet ./canonical/... ./journal/... ./effector/... ./cmd/... && go test ./canonical/... ./journal/... ./effector/... ./cmd/...
```

Every prior suite stays green. Frozen: docs/primitives/, all coordinator test
files, packages/kernel/src/{decider,canonical,chain,catalog,incremental,
store}.ts, go/journal, go/canonical, go/kvprobe, packages/workflow-compat.
UNFROZEN for this climb: go/effector/*.go implementation files (the test file
is frozen), go/cmd/journald/, packages/kernel/src/{store-live,engine,
engine-guarded,effector-live}.ts — engine.ts only for shared-internal
exports the guarded engine needs; every P3/P3b law must stay green over it.
