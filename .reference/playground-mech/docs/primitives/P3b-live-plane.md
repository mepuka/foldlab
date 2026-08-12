# P3b — The Live Plane (the engine on the real journal, and the standards under law)

Status: **SPEC RULED — climbing.** Fitness functions:
`packages/kernel/test/engine.live.laws.test.ts`,
`packages/kernel/test/engine.perf.laws.test.ts`, and
`packages/standards/test/standards.laws.test.ts`. Coordinator-owned; do not
edit them or this document. A law that seems wrong is a finding for the
attempts log, not an edit.

Reviewed in triplicate before dispatch (novelty: SUBSTANTIVE; performance:
GATE-NOW; robustness: GAPS-NAMED) plus a satisfiability review that built and
ran a full reference stack. All four verdicts are absorbed into this spec and
the law suites. Per the operator's protocol change of 2026-08-11, further
reviews run IN CONCERT with the climb, and the climb is deliberately hard:
the performance laws are red against the dispatched engine by measurement,
and making them green without breaking correctness is the climber's problem.

## Why this rung (the consolidation ruling)

Three lanes advanced independently and must now be bound together or they
diverge:

1. P3 proved the durable engine — but only over an in-memory store. The Go
   journal (P2b) sits on the real JetStream substrate, unused by the engine.
   **The artery is missing.**
2. The standards lane (RFC 8785, CloudEvents, AsyncAPI) produced real
   conformance evidence — but it runs as `conformance:*` scripts a human must
   remember. **Evidence that is not in the gate decays into decoration.**
3. The property-based rigor of P0/P1 (fast-check over the space of inputs) was
   not carried into P3, whose laws are example-based. **The engine's master
   law — interpreter agreement — deserves quantification over programs, not
   one demo.**

This rung closes all three. It is deliberately a consolidation rung: no new
vocabulary, no new workflow features. `packages/workflow-compat` (Serverless
Workflow DSL mapping) is PARKED — queued behind P5 Process Composition, not
to be touched in this climb.

## Boundary ruling (pinned, protects P2b)

The journal wire is the canonical entry bytes, EXACTLY as P2b pinned — no
envelope, ever. CloudEvents is an EDGE format: it may wrap facts at
ingress/egress adapters in later rungs, but nothing under `packages/kernel`
may depend on `packages/standards`. Dependency direction:
`standards -> kernel` allowed, `kernel -> standards` forbidden. This is a law
(SL4), not a convention.

## Part 1 — the live store

### The sidecar: `go/cmd/journald`

A small Go main (new files allowed ONLY under `go/cmd/journald/`) that links
the frozen `playground/kernel/journal` package, embeds a nats-server exactly
as the P2b tests do (JetStream on, `DontListen`, in-process connection), and
serves the journal API as NDJSON over stdio.

- Invocation: `journald --store <dir>`. `<dir>` is the JetStream `StoreDir`;
  restarting on the same dir MUST recover every stream (file storage
  durability is the point).
- On ready, print exactly one line to stdout: `{"ready":true}`. Then serve.
- Requests, one JSON object per line on stdin (`id` is any number, echoed):
  - `{"id":n,"op":"open","name":s}` -> `{"id":n,"ok":true}`
  - `{"id":n,"op":"head","name":s}` -> `{"id":n,"ok":true,"seq":i,"head":h}`
  - `{"id":n,"op":"append","name":s,"payload":p}` ->
    `{"id":n,"ok":true,"entry":{"seq":i,"prev":h,"payload":p},"outcome":"stored"|"duplicate"}`
  - `{"id":n,"op":"appendEntry","name":s,"entry":{...}}` ->
    `{"id":n,"ok":true,"outcome":"stored"|"duplicate"}`
  - `{"id":n,"op":"read","name":s,"seq":i,"head":h,"max":m}` ->
    `{"id":n,"ok":true,"entries":[...],"seq":i2,"head":h2}`
- Errors: `{"id":n,"ok":false,"reason":"conflict"|"tampered"|"unavailable","detail":s}`.
  Mapping from Go: `ErrConflict` -> `conflict`; `ErrTampered` -> `tampered`;
  everything else (including `ErrBadStream` and invalid names) ->
  `unavailable`. A `read` that fails verification reports `tampered` and NO
  entries (the TS store contract has no partial results).
- One `journal.Journal` per name per process, opened lazily and cached.
- The sidecar adds NOTHING to the trust story: it is transport. The TS side
  re-verifies everything (below).

### The TS binding: `packages/kernel/src/store-live.ts`

```ts
import type { JournalStoreService } from "./store.ts"

export interface LiveJournald {
  readonly store: JournalStoreService
  /** OS process id of the sidecar (LP9 terminates it externally). */
  readonly pid: number
  /** Hard-kill the sidecar process (crash semantics). */
  readonly kill: () => Promise<void>
  /** Graceful shutdown. Idempotent; safe after kill(). */
  readonly close: () => Promise<void>
}

/** Spawn a journald sidecar and bind a JournalStoreService to it.
 *  Resolves after the ready line. Retries transient startup failure
 *  (e.g. Windows file-lock release after a recent kill) for up to ~10s. */
export const spawnJournald: (options: {
  readonly binary: string
  readonly storeDir: string
}) => Promise<LiveJournald>
```

Ruled semantics:

- **Trustless read**: the TS handle re-verifies every `read` result itself —
  `chain.stepVerify` folded from the caller's cursor over the returned
  entries, and the returned cursor must equal the folded one. A lying sidecar
  surfaces as `StoreError{reason:"tampered"}` in TS, regardless of what Go
  claimed. ACCEPTED RESIDUE (measured in review): no law in this gate can
  falsify the store-side fold, because LP5 exercises the ENGINE's independent
  verification (P3's ruling, unchanged), which catches a tampered wire on its
  own. The store-side fold is an implementation obligation checked by code
  review, not by the gate. A deliberate lie-mode in the sidecar was
  considered and rejected as a trust liability.
- **Single writer per storeDir**: two journald processes on one `storeDir`
  start without error (measured) and would corrupt the file store. The caller
  owns the invariant: never spawn a second sidecar on a dir whose owner may
  be alive; the laws always await `kill()`/`close()` before respawning.
- `append`/`appendEntry`/`head` map 1:1 onto the protocol; error `reason`
  passes through. Newline refusal may short-circuit in TS (same error shape).
- **Sidecar death is sidecar death, however it happens** (measured: a
  conforming-looking store that only fails on caller-initiated `kill()` hangs
  forever on an OOM/panic/operator kill — and passes a gate that never
  exercises it, which is why LP9 exists). The handle observes the child
  process: on ANY exit — `kill()`, `close()`, a crash, an external terminate —
  every outstanding and subsequent request fails
  `StoreError{reason:"unavailable"}`. Likewise any stdout line that is not a
  well-formed response to an outstanding request (unparseable, no numeric
  `id`, an `id` with no waiter, a truncated final line) means the handle
  treats the sidecar as dead by the same rule. A live-plane store may FAIL,
  but it may never HANG.
- No implicit respawn. A dead sidecar means `unavailable`; recovery is the
  CALLER spawning a new `LiveJournald` on the same `storeDir` — that is
  exactly the crash law's shape.
- No per-request timeout. A sidecar that wedges without exiting hangs the
  caller; a timeout was considered and REJECTED because it manufactures the
  uncertain-outcome schedule (and its re-execution cost) out of a healthy
  store. ACCEPTED RESIDUE.
- Append outcomes are TRUSTED; only reads are trustless. `stored` vs
  `duplicate` is taken on the sidecar's word (the engine never inspects the
  distinction), so a lying sidecar could make one live run's return value
  diverge from what a later replay computes. ACCEPTED RESIDUE, same class as
  the store-side fold above.
- In journald responses, `entries` is ALWAYS present on a successful read,
  possibly empty (`[]`) — never omitted (a Go `omitempty` here costs the
  implementer a confusing hour; measured).
- MEASURED (nats-server v2.14.4 default max_payload): the broker refuses any
  entry whose canonical bytes exceed ~1 MiB (largest accepted raw payload:
  1,048,349 chars; an activity result is JSON-escaped inside its fact, so
  the usable budget is smaller and content-dependent). It surfaces as
  `unavailable`, which the engine treats as a defect: an oversized activity
  result is a POISON PILL — every resume re-executes the activity and dies
  again. ACCEPTED RESIDUE for this rung; result externalization is a later
  rung's problem.
- Restated from P3 because the live plane makes durability look total:
  `scheduleClock` is an in-process timer in the engine Layer's scope. It
  leaves no fact; a crash while a clock is pending restarts the FULL duration
  on resume (measured: a 1200ms clock crashed at 500ms woke 1211ms into the
  resumed run). Durable clocks are a later rung.
- Implementation may use Bun.spawn directly (platform edge; the Effect
  boundary is the `JournalStoreService` it returns). No new dependencies.

## Part 2 — the laws

### Live-plane laws (`engine.live.laws.test.ts`)

The suite builds `journald` once (`go build`) into a temp dir, spawns
sidecars per test, and always closes them.

- **LP1 — Cross-language wire identity**: unicode payloads (incl. U+2028)
  appended from TS through the live store read back verbatim; every stored
  entry's bytes are the TS canonical encoding of the entry; the cursor head
  equals the TS `chain.append` fold over the same payloads.
  AMENDED (in-concert review, F1, measured): the original claim that "a
  green LP1 proves the Go side verifies" was FALSE — the TS-side trustless
  fold and the Go-side read verification mask each other, and a journald
  whose read verifies nothing passes all 53 TS laws. The Go-side obligation
  is now gated independently by the coordinator-owned black-box protocol
  test `go/cmd/journald/conformance_test.go` (frozen; rides the existing
  `go test ./cmd/...` gate): a forged unchained entry landed via appendEntry
  causes journald's OWN read to answer reason "tampered" with no entries,
  no TypeScript in the loop. With both gates, the double-verify ruling is
  finally mechanically enforced on the Go half; the TS half remains the
  accepted residue recorded above.
- **LP2 — Real CAS refusal**: `appendEntry` of a different-bytes entry at an
  occupied position fails with reason `conflict` (the JetStream
  wrong-last-sequence path, observed from TS); a byte-identical re-append
  reports `duplicate`; the journal is unchanged after both.
- **LP3 — Durability across process death**: run the demonstration workflow
  to completion on the live store; `kill()` the sidecar; spawn a fresh one on
  the same `storeDir`; a fresh engine over the fresh store returns the same
  value with ZERO additional effect executions.
- **LP4 — Compound crash (body death + process death)**: with the
  die-before-commit fault armed, the workflow crashes; the sidecar is then
  killed; respawn on the same dir, heal the fault, re-run: completed
  activities do not re-execute, the rest run exactly once, the value matches
  the crash-free oracle.
- **LP5 — Live tamper evidence**: P3's EL9 ruling holds on the live plane —
  a forged, unchained entry lands at a fresh CAS position (`appendEntry`
  accepts the caller's entry as given), and the live `read` refuses the
  journal with reason `tampered`. Pins the `ErrTampered` mapping through the
  wire; replaces a cut law that merely re-ran P3's EL5 over an irrelevant
  substrate (triplicate novelty review, F5).
- **LP6 — Interpreter agreement, quantified (fast-check)**: for randomly
  generated programs — 1..4 sequential activities, each failing 0..2 times
  before succeeding (internal retry), an optional injected body-crash index —
  the journal engine over a shared live sidecar agrees with the `layerMemory`
  oracle on the final value, AND the total effect executions across
  crash + resume equal the oracle's exactly (per-step: failures + 1). Runs a
  small live sample; the same property runs with more samples over the memory
  store in the same test. HONEST SCOPE (measured): the claim is exactly-once
  RECORDED OUTCOMES, not exactly-once EFFECTS — a kill inside the
  execute-to-append window re-executes that effect on resume (2 vs the
  oracle's 1). LP6's crash points all fall after the step's fact is
  journaled. Closing that window needs an effector with its own idempotency
  (P4).
- **LP7 — Blind retry after recovery**: append an entry, hard-kill the
  sidecar, respawn on the same storeDir, `appendEntry` the byte-identical
  entry: `duplicate`, exactly one copy stored, and the chain continues at the
  next position. This is P2b's uncertain-outcome contract exercised for the
  first time through the TS boundary AND across file recovery (the respawned
  sidecar re-learns the tail, so the retry takes the CAS-refused ->
  digest-compare path, not the warm dedupe window).
- **LP8 — Concurrent executes**: two engine Layers over the SAME live store
  run the same executionId simultaneously, with activities returning
  different bytes per invocation; both return the SAME value, the journal
  holds exactly one fact per activityId, and a third fresh engine replays to
  that value. The multi-worker safety floor (fact-level arbitration by CAS),
  and the direct regression law for the engine's conflict-retry branch.
  Effect-level single-execution under contention is NOT claimed — that is
  P4's lease.
- **LP9 — Death without kill()**: with a request potentially in flight, the
  sidecar is terminated externally by pid; the outstanding request settles
  (never hangs) and subsequent requests fail `unavailable`. The gate's only
  probe of the "sidecar death is sidecar death" rule.

### Performance laws (`engine.perf.laws.test.ts`)

Operation-COUNT laws over an instrumented async-boundary memory store — no
wall clock, bit-reproducible (measured variance across 5 runs: zero). They
exist because the triplicate performance review measured the dispatched
engine at Θ(F³) entry-reads under fan-out (F=64: 45,762 reads to record 66
facts; 1.03s of wall for sync activities) and Θ(k·n) on warm resumes — and
proved both invisible to every example-based law (P3's EL7 runs over a
synchronous store where conflicts are exactly zero; the live laws pin
FANOUT=3).

- **PP1 — Bounded fan-out reads**: a plan -> F-fan-out -> commit run plus one
  cold resume, at F=8 and F=32: entry-reads scale at most 5x for 4x width
  (ideal 3.4x), at most 4 entry-reads per recorded fact, and at most 32
  conflicts at F=32 — a single-writer process must not fight itself for
  positions; CAS refusals exist for FOREIGN writers.
- **PP2 — Warm resume reads nothing**: k=8 further executes inside one
  engine over an n=32 journal read at most n + k entries total.
- **PP3 — Cold resume reads once**: a fresh engine over an n-entry journal
  reads each entry EXACTLY once, in ONE batched read, and rewrites nothing.
- **PP4 — Appends proportional to facts**: exactly one stored append per
  recorded fact; at most 2x attempts including retries.

A reference fix exists (measured green on all four while keeping every P3
law green): a per-execution serialization of `appendOutcome` plus
incremental catch-up in the conflict branch and the warm-resume path. The
NAIVE version of the same fix — incremental refresh WITHOUT serialization —
is a correctness bug (concurrent fibers double-apply entries to the shared
state; measured: dies "tampered at position 2"). This is exactly why the
bounds are laws: the cheap fix and the correct fix are different.

TRACKED, NOT GATED (recorded as baseline notes, deliberately excluded from
the gate as environment-bound or design-frozen): live append round-trip
latency; sidecar spawn cost; journal bytes per activity; the 4x SHA-256 per
entry per read across the two languages (deliberate trust cost); the
inherent Θ(N²) of progress under repeated cold restarts (the motivation for
a future snapshot/compaction rung, not a bug).

### Standards laws (`standards.laws.test.ts`)

The conformance scripts become exported, gate-run checks. Each of
`rfc8785-conformance.ts`, `cloudevents-conformance.ts`,
`asyncapi-conformance.ts` must export:

```ts
export interface ConformanceReport {
  readonly standard: string
  readonly checks: ReadonlyArray<{
    readonly name: string
    readonly pass: number
    readonly total: number
  }>
}
export const conformance: () => ConformanceReport
```

(keeping their current CLI printing under `if (import.meta.main)`; the
`conformance:*` scripts and the AsyncAPI CLI validation remain as scripts —
the gate runs the local checks). The refactor moves the existing top-level
assertions INSIDE `conformance()`; where a module uses top-level `await` for
file loading (asyncapi-conformance.ts does), replacing it with a synchronous
`readFileSync` + `JSON.parse` is in scope. Checks may not weaken: same
assertion counts or better, verified against the current script output.

- **SL1 — RFC 8785 holds in the gate**: every check has `total > 0` and
  `pass === total`; the report names at least the structured vectors, the
  Appendix B numbers, and the invalid-unicode rejections.
- **SL2 — CloudEvents holds in the gate**: same shape; must include the
  malformed-rejection checks (a validator that only accepts is not a
  validator).
- **SL3 — AsyncAPI local checks hold in the gate**: same shape (document
  structure checks; CLI validation stays out of the gate).
- **SL4 — Dependency direction**: no file under `packages/kernel/src` or
  `packages/kernel/test` imports from `packages/standards` (string-level
  check over the source tree). The kernel must never depend on edge formats.

## Verification

```
bun run typecheck && bun test
cd go && test -z "$(gofmt -l .)" && go vet ./canonical/... ./journal/... ./cmd/... && go test ./canonical/... ./journal/... ./cmd/...
```

(`bun test` — the WHOLE workspace: P0 + P1 + P3 + P3b + standards. The live
suite builds and spawns journald itself; tests must not bind TCP/UDP ports —
DontListen + stdio only, the tailtalk rule. `go/effector` is red by
construction until P4 climbs — it holds only its queued fitness function —
so the Go gate for THIS rung is pinned to the packages this rung touches.)

## Frozen for this climb

`docs/primitives/`, `packages/kernel/test/`, `packages/kernel/src/` EXCEPT
the new `store-live.ts` AND `engine.ts` (deliberately UNFROZEN — see below);
all of `go/` EXCEPT new files under `go/cmd/journald/`;
`packages/workflow-compat/` (parked); the three conformance modules may ONLY
be refactored to add the pinned export (their checks may not weaken — the
gate now pins minimum vector counts).

`engine.ts` is unfrozen FOR THIS CLIMB because the performance laws are RED
against it by measurement, and fixing it is part of the climb: the climber
must make PP1-PP4 green while keeping all ten P3 laws and every live law
green. The one prior coordinator amendment (the conflict branch retrying at
the rebuilt cursor) is load-bearing for LP3/LP4/LP8 — regressing it fails
those laws. P3's EL7 green predates that amendment and was partially an
artifact of store synchrony; the live and performance laws close that hole
together.

## References

- P2b spec — the wire, the CAS discipline, the embedded-server rule.
- P3 spec — the engine's replay/verify rulings, all unchanged here.
- RFC 8785 (JCS); CloudEvents 1.0.2 + NATS protocol binding; AsyncAPI 3.
- tailtalk — no listening ports in tests; byte-identical retry.
- The operator's consolidation directive, 2026-08-11: rigor and standards are
  one lane, not two; goals must model the real plane.
