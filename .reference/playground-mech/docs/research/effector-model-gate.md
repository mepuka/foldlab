# The effector model gate

What this lane produces, in the vocabulary SPEC §10.1 insists on: **bounded
model checking**, **model-based integration testing**, and — since the TLA+
amendment (§10–§12 below) — a **mechanized inductive proof** of SPEC §6.2/§6.3
over unbounded fences and unbounded depth at fixed owner counts. The
distinction between these epistemic states is the whole point — conflating
them is how the refuted §6.3 survived three green gates, and a lane built to
prevent that recurrence may not commit the same sin in its own report.

Sections 1–9 are the original bounded lane, produced by `go/effector/model`
inside the existing scoped Go gate (`go test ./effector/...`) in about twelve
seconds, about eighteen under `-race`, with no change to the implementation
and no new dependency. Sections 10–12 are the TLA+ amendment: the same
transition table as a TLA+ specification checked by TLC (`bun run
modelcheck`), proven state-set-equal to the Go/TS models, and driven to an
inductive-invariant proof by Apalache (`bun run modelcheck:ind`).

## 1. Why this exists

The formal audit refuted the two-key effector protocol with a hand-rolled
breadth-first enumeration: it split commit into a read half and a write half,
let owners steal at every claim state, and searched for a successful commit
whose fence was below the maximum linearized generation. It found one, at a
14-transition search cost, with the trace `begin, steal, finish`
(`docs/research/kernel-formal-specification-primary-sources.md`, CEX-3 and
"Bounded transition-system check"). That refutation forced amendment A6 and the
single-key repair now in SPEC §6.1.

The protocol argument follows the fencing pattern in
[Chubby §2.4](https://research.google.com/archive/chubby-osdi06.pdf): the
protected operation validates the sequencer, rather than trusting a lease.
The per-key histories below use linearizability in the sense of
[Herlihy and Wing §2.2](https://www.cs.columbia.edu/~wing/publications/HerlihyWing90.pdf).

It was also a one-off — a heroic afternoon that left no standing capability.
This lane makes it permanent, and adds the half the one-off never had: the
model is continuously checked against the real implementation.

## 2. The model

`go/effector/model/model.go` is an explicit-state transition system over ONE
work digest (the protocol is per-key; distinct digests share no state).

```
Authority  ::= Absent | Claim(fence, owner, live) | Done(fence, result)
Actions    ::= claim(o) | expire | begin(o) | finish(o) | crash(o)
```

Both protocols are modelled, sharing every action but `finish`:

- **SingleKey** — the ratified §6.1 protocol. One authority register; `finish`
  is a CAS at the revision `begin` observed, so fence validation and protected
  mutation are ONE linearization point.
- **TwoKey** — the withdrawn protocol. A claim register and a separate outcome
  register; `finish` validates the fence against the claim register and then
  creates the outcome register. Nothing binds the two.

### Modelling decisions, stated so they can be argued with

| Decision | Why |
|---|---|
| Commit is split into `begin` (read fence + revision) and `finish` (conditional write) | A schedulable client-side pause is what found CEX-3. Without the split the defect is unreachable. |
| Time is a boolean, lapsed by an explicit `expire` event | Expiry is a client-side comparison against a stored timestamp: it mutates no register and bumps no revision. Modelling it as an event keeps the checker wall-clock-free, which the determinism requirement demands. This preserves the separation between lease timing and safety described by [Gray and Cheriton](https://www.cs.cmu.edu/afs/cs.cmu.edu/academic/class/15712-s12/www/papers/gray89.pdf). |
| `claim` is atomic (its read and CAS are one step) | Only `commit` needed splitting. A lost steal race returns `ErrHeld`, which the atomic model also produces. |
| Owners are sequential crash-stop processes | A process blocked inside commit cannot simultaneously call claim. `SelfInterleave` relaxes this to reproduce the audit's same-owner trace, where one identity runs concurrent workers. |
| Revisions are not counted | The CAS only ever asks "is my snapshot still current?", and a snapshot once stale stays stale. The unbounded revision counter collapses exactly to one `Fresh` bit per pending commit. This is a collapse, not an abstraction — no behaviour is lost. |
| Steals are allowed against LIVE claims (`AdversarialSteal`) | Strictly stronger than the protocol, and deliberate: SPEC §6.3 claims safety mentions neither `now` nor `expiry`, so the checker must not be allowed to lean on the clock. Both variants are run. |

### Determinism

Required, and load-bearing: a counterexample nobody else can reproduce is an
anecdote. The checker never reads the wall clock, never lets Go map iteration
order reach an output, enumerates actions in a fixed order (by kind, then owner
index), and keys its visited set on a fixed-width **canonical encoding** rather
than a hash — so there is no collision to reason about. `normalize` zeroes every
field the protocol cannot read, so behaviourally identical states encode
identically and the state counts are honest rather than inflated by ghost
distinctions.

`TestCheckIsDeterministic` repeats each search nine times in one process. Go
randomizes map iteration order per range statement, so those repetitions are a
real test of map-order independence. All nine agree on state count, transition
count, state-set fingerprint and counterexample trace.
`TestCanonicalEncodingSeparatesStates` confirms all 172,214 encodings are
distinct.

## 3. Outcome 1 — the checker on the ratified protocol

Three owners, crash-stop everywhere, steals allowed against live claims.
Invariants checked on every TRANSITION (fencing safety is a property of a
write, and a state predicate cannot see a write once the state has moved on):

- **fencing safety (SPEC §6.3)** — no commit may land carrying a fence below
  the maximum linearized generation.
- **unique terminal outcome (SPEC §6.2)** — once an outcome exists, no
  transition changes it.
- **terminal fence is maximal** — a stored outcome always carries the greatest
  generation ever linearized.
- **generations are monotone**.

| Configuration | Bound | States | Transitions | Result |
|---|---|---:|---:|---|
| 3 owners, adversarial steal, crash-stop | depth 12 | 172,214 | 708,876 | clean |
| 3 owners, adversarial steal, no crash | depth 12 | 117,058 | 328,239 | clean |
| 3 owners, lease-gated steal, crash-stop | depth 12 | 13,133 | 55,542 | clean |
| 2 owners, adversarial steal, crash-stop | depth 12 | 4,612 | 15,170 | clean |
| 2 owners, adversarial steal, no crash | depth 12 | 3,097 | 7,506 | clean |
| 3 owners, ≤2 generations | **closure** | 584 | 2,436 | clean |
| 3 owners, ≤3 generations | **closure** | 2,312 | 11,610 | clean |
| 3 owners, ≤4 generations | **closure** | 6,848 | 37,332 | clean |

The closure rows are a different and stronger kind of bound. Capping the number
of claim GENERATIONS makes the transition system finite outright, so the search
runs to closure: every state reachable under at most N generations, at **any
trace length whatsoever**. The depth-bounded rows bound trace length instead.
Neither subsumes the other, so both are run.

The whole depth-12 three-owner search takes 0.20s.

### On comparing with the audit's recorded numbers

SPEC §6.3 records "3,919 states / 9,254 transitions" for the audit's own
enumeration. The closest configuration here (2 owners, adversarial steal, no
crash) gives 3,097 / 7,506. These are **not** the same transition system and the
figures are not expected to match: this model carries an explicit `expire`
event, per-process claim handles, and crash-stop, and it normalizes states the
audit's encoder may not have. Numerical proximity across different state spaces
is not semantic evidence; the two runs are independently reported, not treated
as reproductions of one another.

## 4. Outcome 2 — self-validation: the withdrawn protocol, refuted again

A checker that cannot find the known bug proves nothing by finding no bugs.
Pointed at the two-key model, the same search must fail — and does.

**Minimal counterexample** (BFS, so no shorter trace reaches this failure),
three owners, adversarial steal, found after exploring 265 states / 443
transitions:

```
  1. claim(A)  -> claimed@f1  | claim=Claim(f=1,o=1,live) done=Absent maxFence=1 A:holds(f=1)
  2. begin(A)  -> -           | ... A:holds(f=1)begun(used=1,saw=Claim@1)
  3. claim(B)  -> claimed@f2  | claim=Claim(f=2,o=2,live) done=Absent maxFence=2 A:holds(f=1) B:holds(f=2)
  4. finish(A) -> first@f1    | claim=Claim(f=2,o=2,live) done=Done(f=1,r=1) maxFence=2

  fencing safety (SPEC 6.3): A committed at fence 1 while generation 2 had
  already linearized
```

That is CEX-3 exactly: A's commit validates its fence against the claim
register, B supersedes it, and A's create on the *other* register lands anyway.

The audit's own recorded trace was `begin, steal, finish` with a SINGLE owner —
legal because a lapsed claim re-taken by its original owner still increments the
fence. That needs an owner able to act while its own commit is paused, which the
sequential-process model forbids. With `SelfInterleave` the audit's shape comes
back verbatim (found after 25 transitions):

```
  1. claim(A)  -> claimed@f1
  2. begin(A)  -> -
  3. claim(A)  -> claimed@f2      <- A steals its own lapsed claim
  4. finish(A) -> first@f1        <- commits under the superseded fence
```

The audit reported its own search cost as 14 transitions; this one costs 25 with
one owner and 443 with three. The costs differ because the enumerators differ in
ordering and initial state (the audit's began from a state that already held a
claim). The **shape** is identical, and the shape is what was recorded.

Three further self-validations, each guarding against a different way this
result could be hollow:

- **The defect survives the weaker model.** With lease-gated steals (no
  adversarial relaxation) the two-key protocol still fails, at a 5-transition
  counterexample `claim(A), expire, begin(A), claim(B), finish(A)`. The defect
  is not an artifact of allowing steals against live claims.
- **The two-key model is not a strawman.** Checked for unique terminal outcome
  ALONE, the two-key protocol is clean over 235,184 states / 968,562
  transitions. Unique commitment survived; fencing safety did not — precisely
  what the P4 ratification note records. A two-key model that failed everything
  would be evidence of a rigged model, not of a real defect.
- **The split is what does the work.** Comparing, at every reachable state with
  a paused commit, the split finish against an unsplit one:

  | Protocol | Paused commits compared | Observably different |
  |---|---:|---:|
  | single-key | 292,740 | **0** |
  | two-key | 365,910 | **38,766** |

  On the ratified protocol the client-side pause is observationally inert at the
  client boundary — which is *why* it is safe. On the withdrawn protocol the
  pause is decisive: it IS the bug. The witness is the counterexample state,
  where the split finish returns `first@f1` and the unsplit one returns
  `ErrFenced`.

## 5. Outcome 3 — model-based trace conformance against the real effector

The checker proves things about a model, which is worth exactly as much as the
model's faithfulness to the code. So every schedule enumerated by each stated
bounded sweep is replayed against the **real `go/effector` implementation** on
an embedded NATS server (`DontListen` + `nats.InProcessServer`, the P4 harness
pattern), in lockstep. The concrete surface is pinned to
[nats.go v1.53.1](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/kv.go)
and [nats-server v2.14.4](https://github.com/nats-io/nats-server/tree/v2.14.4);
the [official JetStream KV contract](https://docs.nats.io/nats-concepts/jetstream/key-value-store)
remains the external API boundary:

- at each step the implementation's outcome must equal the model's prediction —
  claim result and fence, commit `first`/`ErrFenced`/`ErrCommitted`/idempotent
  absorption;
- after **every** step (not just at the end) the implementation's `Lookup` must
  equal the model's — state, committing fence, and committed result;
- whenever the implementation reports `first=true`, its committing fence is
  asserted to equal the greatest generation the store has issued. That is
  fencing safety asserted **against the implementation**, not against the model.

### The seam, and how it was cut

SPEC §6.1's commit is split into a fence read and a protected write, and the
schedulable pause between them is exactly what refuted the two-key protocol. But
the real `Commit` is one opaque call at the public boundary — there is no public
pause hook. It is not claimed to be one atomic implementation step.

Modifying `effector.go` to add a test hook was rejected: it is the thing under
test. Instead the harness interposes on the `jetstream.KeyValue` interface the
effector was handed, and stalls the CALLER between its read and its write. The
implementation is unmodified and unaware; only its substrate is instrumented.
That is a genuine client-side pause, not a projection of one — so the
counterexample-shaped schedules are really driven, not argued away.

The same interposition gives crash-stop an unambiguous semantics: a killed
process's substrate REFUSES to issue the write, so the store provably never sees
it. Cancelling a context would have left "did the write land?" open, which is
the one ambiguity a crash model must not have.

### Coverage achieved — stated exactly, no silent caps

Owners are 3; steals are lease-gated (the real `Claim` refuses a live claim, so
the adversarial variant is not realizable and is not claimed). Enumeration emits
every schedule of exactly the stated depth; every shorter schedule is a prefix
of an emitted one, so nothing below the bound is missed.

**Standing gate** (runs on every `go test ./effector/...`):

| Sweep | Selection | Schedules | Driven steps | Lease retries | Divergences |
|---|---|---:|---:|---:|---:|
| `conform-d5` | exhaustive, depth 5 | 1,422 | 7,110 | 0 | 0 |
| `cex-d6` | all counterexample-shaped of 6,513 at depth 6 | 276 | 1,656 | 0 | 0 |
| `crash-d4` | exhaustive with crash-stop, depth 4 | 1,197 | 4,782 | 0 | 0 |

**Deep run** (`MODEL_GATE_DEEP=1`, one level deeper on every sweep; run for this
report, not on every gate — and the test announces which mode it is in):

| Sweep | Selection | Schedules | Driven steps | Lease retries | Divergences |
|---|---|---:|---:|---:|---:|
| `conform-d6` | exhaustive, depth 6 | 6,513 | 39,078 | 1 | 0 |
| `cex-d7` | all counterexample-shaped of 30,027 at depth 7 | 2,676 | 18,732 | 0 | 0 |
| `crash-d5` | exhaustive with crash-stop, depth 5 | 6,189 | 30,933 | 0 | 0 |
| **total** | | **15,378** | **88,743** | **1** | **0** |

"Counterexample-shaped" is the begin/steal/finish family made precise: a commit
that BEGAN under one generation and FINISHED after a strictly later generation
linearized. Those are the schedules the implementation must refuse every single
time, so they are enumerated exhaustively rather than sampled.

`Lease retries` is reported because it could hide things. Realizing `expire`
needs a real lease lapse, so claims the schedule will lapse get short leases
chosen by lookahead over the schedule, and the driver waits past the deadline
(`Sleep` never returns early on this platform, so the wait is one-sided safe).
If the wall clock lapses a lease the schedule still expects live, the schedule
is retried with longer leases and the retry is COUNTED — a sweep that quietly
retried its way to green would be worthless. One retry was needed across all
15,378 deep schedules (scheduler jitter across the worker pool, at a lease
budget already ten times the work it covers) and none at gate depth. A schedule
that exhausts its lease budget is recorded as a **failure**, not skipped.

### The harness can fail — demonstrated, not asserted

Zero divergences is a claim about the implementation only if the harness can
report a divergence at all. `TestConformanceHarnessDetectsDivergence` corrupts
the model's prediction in three specific ways and requires every corrupted
schedule to be caught:

| Mutation | Corrupted schedules | Caught |
|---|---:|---:|
| a refused commit predicted to land | 276 | 276 |
| a claim predicted at the wrong generation | 276 | 276 |
| an unclaimed state predicted committed | 276 | 276 |

## 6. Divergences found, and their resolution

Two, both in the harness, both found by the deep sweep and not by the gate-depth
one — which is the argument for running the deep sweep at all.

### 6.1 A crashed process that "completed its commit"

The deep crash-bearing sweep at depth 5 (schedule #5038) reported:

```
  1. claim(C)  -> claimed@f1
  2. begin(C)  -> -
  3. finish(C) -> first@f1          <- C commits Done(f=1, r=C)
  4. begin(C)  -> -                 <- C begins a SECOND commit; its read sees Done@1
  5. crash(C)  -> -
  step 5 crash(C): a crashed process completed its commit: first=false err=<nil>
```

Neither a model bug nor an implementation bug: a **harness** bug. The paused
commit's fence read had already observed the terminal outcome, so
`classifyCommitted` returns idempotent absorption *without ever attempting a
write*. The harness's crash assertion demanded that every paused commit be
stopped by the substrate — but a commit that was only ever going to read has no
write for a crash to stop, and completing it is indistinguishable from dying,
which is exactly what the model says.

Resolution: the crash assertion now asserts the property crash-stop actually
makes — **no write lands**. A paused commit that was about to write must be
stopped by its substrate; one that was only going to read may complete, and
must not report `first=true`. The subsequent `Lookup` check verifies the store
state either way. Fixed in the harness; the model and the implementation were
both right.

### 6.2 A timing artifact reported as an implementation divergence

The re-run after that fix reported a second one, in crash-d5 schedule #5486:

```
  1. crash(A)  -> -
  2. claim(B)  -> claimed@f1        <- short-leased, because step 3 lapses it
  3. expire    -> -
  step 2 claim(B): lookup says "unclaimed", model says "held"
```

Also a harness bug, and a sharper one. The lease-overrun classifier — the code
that decides whether a disagreement is the implementation's fault or the
harness's — was testing liveness against the state BEFORE the action. For a
claim that CREATES a short-leased generation, the state before is `Absent` and
the state after is the live claim, so the classifier found no live claim to
forgive and reported a pure timing artifact as an implementation divergence.

Resolution: the classifier now takes the state whose live-claim assumption the
failed assertion actually rests on — `Before` for an action's own outcome,
`After` for a lookup — and the lease budget was raised to roughly ten times the
work it covers. This was the more dangerous of the two bugs: it produced a FALSE
POSITIVE, and a conformance lane that cries wolf gets ignored exactly as fast as
one that never barks.

### 6.3 In the implementation: none

Across 88,743 driven steps the real effector agreed with the model at every
step, including all 2,676 schedules carrying the shape that refuted the two-key
protocol.

## 7. Stretch — bounded terminal reachability

`CheckProgress` explores the state space to closure under a generation cap and
asks, of every reachable state that still has an uncrashed process, whether a
terminal outcome is reachable at all.

| Generation cap | States | Interior states owing progress | Longest route to a terminal outcome | Stuck | Truncated by the cap |
|---:|---:|---:|---:|---:|---:|
| 2 | 584 | 73 | 3 | **0** | 90 |
| 3 | 2,312 | 355 | 4 | **0** | 330 |
| 4 | 6,848 | 1,357 | 4 | **0** | 870 |

"Truncated by the cap" is not swept under the rug. A state sitting exactly ON
the generation cap may have only one route out — a steal the cap forbids — so
its fate is undecided by that run and it is excluded from the verdict and
counted. Raising the cap moves each of them into the interior, which is why the
check runs at three caps: the 90 truncated at cap 2 become interior states with
routes at cap 3.

What this establishes: within each generation cap, every reported interior
state has at least one finite route to `Done` (the temporal property
`EF Done`). This is bounded non-trapping/reachability. It does **not** encode a
fairness relation, exclude fair or unfair cycles, or prove inevitable progress.
SPEC §6.4's conditional liveness still rests on partial synchrony and fair
retry; this check does not discharge either environmental assumption.

## 8. What this does and does not establish

**Establishes:**

- Fencing safety and unique terminal outcome hold for the abstract single-key
  protocol over every schedule of at most 12 actions with 3 crash-stop owners
  and steals permitted against live claims (172,214 states), and over every
  schedule of any length using at most 4 claim generations (6,848 states).
- The method finds the defect it is supposed to find: the withdrawn two-key
  protocol is refuted again from scratch, at a 4-transition minimal
  counterexample of exactly the recorded shape.
- The real `go/effector` implementation agrees with the model at every one of
  88,743 driven steps, over 15,378 schedules including every
  counterexample-shaped schedule to depth 7.
- The harness can detect divergence: 828 of 828 deliberately corrupted schedules
  were caught.

**Does not establish:**

- **The enumerative results are not a proof.** Both bounds are bounds: a
  defect first reachable at 13 actions or requiring a 5th generation is
  outside everything checked *in this section*. [AMENDED: the caveat this
  paragraph originally recorded — "the unbounded mechanized versions remain
  owed", blocked on a missing Java/Z3 toolchain — has since been discharged
  for §6.2/§6.3 by the Apalache inductive proof of §11, which covers
  arbitrary fences and arbitrary depth at 3 and 4 owners. The owner-count
  bound remains a bound; see §12 for the revised placement.]
- **Conformance is integration testing, not refinement.** Agreement over 15,378
  schedules is evidence the implementation refines the model on the schedules
  driven. It is not a refinement proof, and it says nothing about schedules
  outside the bound.
- **Only the inner `Commit` seam is scheduled.** Real `Claim` performs a
  `Get` followed by `Create` or revision-`Update`; the harness drives its public
  outcomes but does not pause inside those calls. Intra-`Claim` races, including
  stale-update conflict paths, therefore remain covered by the frozen P4 laws
  rather than this schedule-interposition claim.
- **The model is not the deployment.** It assumes K1–K3 hold of the store. SPEC
  §3.3 already states that generic JetStream KV refines 𝕂 only in a
  deletion-free, TTL-free configuration with leader-consistent reads (CEX-2), and
  nothing here checks that premise. Conformance runs against a standalone R1
  embedded server, which is the reference deployment, so the premise is *assumed*
  and not *tested*. Checking it needs a history checker against real cluster runs
  — Elle, per the briefing.
- **`Do` is not modelled.** The model covers §6.1's protocol —
  claim/commit/lookup. `Do` is the composed loop over them and stays covered by
  the frozen P4 law suite (EL2, EL4).
- **Nothing here says an effect physically ran.** CEX-4 is untouched and
  untouchable by this method.

Placed on SPEC §10.1's ladder, the enumerative lane of §1–§7 moves SPEC §6.2
and §6.3 from "law suites + hand enumeration" to **bounded model checking**
plus **model-based integration testing**, and adds a bounded
terminal-reachability result adjacent to §6.4 without upgrading its liveness
claim. On its own it moved nothing to "formal proof" — that upgrade is the
amendment's (§11), and §12 states exactly what it does and does not cover.

## 9. Running it

The checker and the conformance sweeps are ordinary Go tests in
`go/effector/model`, covered by the existing scoped gate:

```bash
cd go && go test ./effector/...
```

The deep sweeps, whose numbers are recorded in §5:

```bash
cd go && MODEL_GATE_DEEP=1 go test -v -run TestTraceConformance ./effector/model/
```

**Environment note.** This clone originally had `core.autocrlf=true`, which
checked eight pre-existing Go blobs out as CRLF and made `gofmt -l .` list them
despite their LF index contents. The final audit set this clone's local setting
to `false` and normalized only the working copies; all eight working-file hashes
equal their committed blobs and Git records no frozen-file diff. The literal
`test -z "$(gofmt -l .)"` gate now passes.

---

## 10. The TLA+ specification (the amendment's primary vehicle)

`specs/Effector.tla` states the §6.1 transition table in TLA+, once. The
register is written as the algebraic sum type it is —
`Absent | Claim(fence, owner, live) | Done(fence, result)` — encoded as a
tagged record whose constructors zero every field the variant cannot read
(the Go model's `normalize`, enforced by construction), so TLC's
distinct-state counts are comparable 1:1 with the Go/TS checkers'. A
`TwoKey` constant selects the withdrawn protocol from the SAME table
(`specs/EffectorTwoKey.tla` is a one-line `EXTENDS`), so the ratified and
refuted protocols cannot drift apart in the spec any more than they can in
the Go model. Toolchain: TLC 2.19 on Temurin 21 via mise
(`tools/README.md`); every run uses `-workers 1 -fp 1 -deadlock`, and two
runs differ only in timestamp/pid/seed header lines — the seed salts
fingerprints, never exploration order.

FencingSafety is stated as an **action property**
(`[][Term' done ∧ Term not done ⇒ Term'.fence = maxFence']_vars`), exactly
as the Go checker states it; `TerminalFenceIsMaximal` is its state-level
shadow, and both are checked along with `UniqueTerminalOutcome` and
`GenerationsAreMonotone`.

### TLC results (`bun run modelcheck`, gated by `modelcheck.gate.test.ts`)

| Run | Bound | Distinct states | States generated | Graph depth | Result |
|---|---|---:|---:|---:|---|
| single-key, 3 owners, adversarial, crash | closure, ≤2 generations | 584 | 2,437 | 8 | clean |
| single-key, same | closure, ≤3 generations | 2,312 | 11,611 | 9 | clean |
| single-key, same | closure, ≤4 generations | 6,848 | 37,333 | 10 | clean |
| single-key, **self-interleave**, 3 owners | closure, ≤3 generations | 2,750 | 15,190 | — | clean |
| two-key, same | closure, ≤3 generations | violation found after 178 distinct states | 298 | 5 | **fencing violated** |

The self-interleave row (one identity running concurrent workers — the
regime of the audit's single-owner counterexample) has no Go pin; its state
set is tied to the TS model directly by the dump parity test, exactly like
the capped rows.

Every single-key distinct-state count equals the pinned Go/TS closure count
exactly, and TLC's states-generated equals the pinned transition count plus
one (the initial state) — the transition tables agree not just in verdict
but in arithmetic. The two-key run rediscovers the CEX-3 shape at the
minimal 4 steps, run-to-run deterministic, committed verbatim as
`specs/EffectorTwoKey.cex.txt`:

```
claim(1)   Claim(f=1, o=1, live), maxFence=1
begin(1)   owner 1 snapshots Claim@1
claim(2)   owner 2 steals: Claim(f=2, o=2, live), maxFence=2
finish(1)  key2 := Done(f=1, r=1)  — a commit below maxFence=2
```

(TLC reports the violation via `TerminalFenceIsMaximal` — state invariants
are evaluated before action properties — on the same transition where
`FencingSafety`'s action form is violated; the Go checker, which orders its
invariants the other way, names `FencingSafety` on the identical trace.)

### The wall, extended: TLA+ ≡ TS ≡ Go

Transcriptions drift, so the equality is checked, not asserted.
`tlc.parity.test.ts` runs TLC with `-dump`, parses every dumped state with a
small recursive-descent parser for TLC's value syntax, canonicalizes each
through the TS model's own byte encoder, and asserts **exact set equality**
with the TS checker's BFS closure — at caps 2 and 3, 2,896 states
membership-checked one by one. `effector.wall.test.ts` already pins the TS
model byte-for-byte against the Go model (172,214-state fingerprint
`5cb6d2203cb19cce` among nine pins). The chain TLA+ ≡ TS ≡ Go is therefore
checked end to end, which is what entitles §5's conformance driver — whose
schedules are enumerated from the Go model — to say its schedules are
derived from the same pinned transition table as the TLA+ specification.
This satisfies the amendment's "state the table ONCE, or prove them equal"
clause by the second horn: three artifacts, one checked equivalence class.

## 11. The Apalache inductive proof (§6.2/§6.3 unbounded)

Toolchain: **Apalache 0.61.0** (build 831d473), sha256-verified release,
gitignored under `tools/apalache/` (`tools/README.md`). Spec:
`specs/EffectorInd.tla` with `FenceCap = 0` — fences UNBOUNDED, depth
unbounded by construction of the method.

The candidate invariant `IndInv`, in protocol terms:

- **claim-tracks-max** — a claim's fence IS the greatest generation ever
  linearized (steals go through the register, so the register never lags);
  `done-tracks-max` is the same fact frozen at commit;
- **freshness** — a pending commit whose begin-side snapshot is still
  `fresh` sees the CURRENT register (`fresh` collapses the revision CAS, so
  this clause is exactly "the CAS validates the snapshot");
- **handle discipline** — an active commit's fence handle is its owner's
  claim handle (owners are sequential; crash resets both together);
- plus `TypeOK` (normalization included) and absent-means-unstarted.

The proof is the standard four-obligation decomposition, with `IndInit`
generating an ARBITRARY typed state constrained only by `IndInv` (Apalache
`Gen`), so consecution quantifies over every `IndInv` state, reachable or
not:

| # | Obligation | Verdict |
|---|---|---|
| 1 | `Init ⇒ IndInv` | proved |
| 2 | `IndInv ∧ Next ⇒ IndInv′` | **proved** (first candidate, 5.7s) |
| 3 | `IndInv ⇒ TerminalFenceIsMaximal` | proved |
| 4 | `IndInv ∧ Next ⇒ FencingSafety ∧ UniqueTerminal ∧ Monotone` (action) | proved |
| 5 | CONTROL: consecution without the freshness clause | **refuted**, as required |
| 6 | CONTROL: obligation 4 under `TwoKey = TRUE` | **refuted**, as required |
| 7–10 | obligations 1–4 at `NumOwners = 4` | all proved |

The controls are first-class: a prover that cannot fail proves nothing.
Control 5 shows the freshness clause is load-bearing — without it Apalache
exhibits a "fresh" commit whose snapshot lies, writing `Done` below
`maxFence`; the clause is the revision CAS, not decoration. Control 6 is the
refuted protocol refuted a third way, now at the induction level: from an
`IndInv` state with `key1 = Claim(f=3)`, `maxFence = 3`, an owner holding a
fence-2 handle finishes and lands `key2 = Done(f=2, r=3)` — the two-key
finish never consults `fresh`, which is precisely the gap A6 records.

The proof argument, one sentence: a Finish that writes passed
`fresh ∧ snapFence = usedFence`; freshness gives `key1.fence = usedFence`;
claim-tracks-max gives `key1.fence = maxFence`; so every terminal write
lands at the maximum linearized generation — fencing safety — and the write
target was a claim, never a `Done`, so the terminal outcome is unique.
Apalache checked every step of that argument against every typed state; the
sentence is commentary, not the evidence.

### The identity-free strengthening: safety assumes nothing about node identity

`IndInv`'s handle-discipline clause encodes "owners are sequential
processes" — an assumption about identity. The question "does the protocol
need one id per node?" deserves a theorem, not an argument, so
`IndInvIdentityFree` drops that clause (and every other coupling between a
commit and the identity that started it), leaving ONLY the register algebra
plus the freshness lemma — and is checked under `SelfInterleave = TRUE`
(`EffectorIndSelf.cfg`): one identity running any number of concurrent
workers, a strict superset of the sequential behaviors and the regime where
the audit's single-owner two-key counterexample lives.

| # | Obligation (self-interleave, identity-free) | Verdict |
|---|---|---|
| 11 | `Init ⇒ IndInvIdentityFree` | proved |
| 12 | `IndInvIdentityFree ∧ Next ⇒ IndInvIdentityFree′` | proved |
| 13 | `IndInvIdentityFree ⇒ TerminalFenceIsMaximal` | proved |
| 14 | `IndInvIdentityFree ∧ Next ⇒ SafetySteps` | proved |

So the safety of §6.1 owes nothing to "one id per node", nor even to a
given id behaving as one sequential process. Identity appears in the state
only as *payload* — who holds a claim, who committed — never as a premise.
Fencing is generations, not identity: a client id may be duplicated across
nodes, a process may race itself, an owner may steal its own lapsed claim
(the fence increments anyway), and the two theorems stand. What the
protocol actually leans on is the SUBSTRATE, and only these register
properties (SPEC §3.3's 𝕂, which JetStream KV refines in the CEX-2
configuration): atomic create-if-absent (K1), atomic compare-and-swap at an
observed revision where every successful write moves the revision (K2),
linearizable (leader-consistent) reads, and no deletion/TTL/administrative
mutation of a terminal outcome. Lease expiry is a client-side comparison —
safety is clock-free (§6.3); identity-bearing leases matter to LIVENESS
(§6.4: who retries, and that lapsed work is re-claimable), not to safety.

## 12. Revised epistemic placement (SPEC §10.1)

- **Now mechanized proof, unbounded in fences and depth:** SPEC §6.2 (unique
  terminal outcome) and §6.3 (fencing safety) for the abstract single-key
  protocol at 3 and at 4 crash-stop owners, with steals permitted against
  live claims (strictly adversarial relative to the real protocol), by
  inductive invariant checked by Apalache — including the identity-free
  form under self-interleave, so neither theorem assumes one id per node or
  per-id sequentiality. The audit's caveat — "bounded enumeration only; the
  unbounded mechanized versions remain owed" — is discharged for these two
  theorems.
- **Still bounded:** the owner count (3 and 4 are checked; N is not),
  and every enumerative result of §3–§4 stands as stated. The abstraction
  step from the real substrate to the model (revisions collapsed to the
  `fresh` bit, atomic claim, boolean time) is argued in §2 and checked
  against the implementation only as far as §5 reaches.
- **Still sampled/integration-grade:** conformance (§5) is model-based
  integration testing over 15,378 schedules; refinement of the model by
  `go/effector` on an R1 embedded server is evidenced, not proved. K1–K3 of
  the store remain assumed (CEX-2), `Do` remains covered by the P4 laws,
  CEX-4 (physical execution) remains untouchable by this method, and §6.4
  liveness still rests on partial synchrony — the §7 reachability result is
  `EF Done` within a cap, nothing more.

One honest asymmetry to keep in view: TLC checks the committed
`specs/Effector.tla` under configurations with `FenceCap ∈ {2,3,4}` and the
parity tests tie THOSE state spaces to the Go/TS models; the Apalache proof
runs the same `Next` with `FenceCap = 0`. The cap guard is a single enabling
conjunct on `Claim`, plainly disabled at 0 — but the reader should know the
proved system and the set-equality-checked system differ by exactly that
conjunct.

## 13. Running the amendment

```bash
bun run modelcheck
```

TLC over both specs: three single-key pins green, two-key red with the
4-step trace — in one command, ~8s. The same contract runs inside `bun test`
(`modelcheck.gate.test.ts`, cheapest pin of each color) and the dump parity
runs in `tlc.parity.test.ts`.

```bash
bun run modelcheck:ind
```

All fourteen Apalache obligations (four proofs, two must-fail controls,
four proofs at 4 owners, four identity-free proofs under self-interleave),
~65s. Requires the gitignored `tools/apalache/` download; absent toolchain
is reported as SKIPPED, never as green.
