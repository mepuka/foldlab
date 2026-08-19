# verify/journal — the hash-chained journal model gate (R2)

The durable substrate under the plait package gets its own model. The
catalog gate embeds a journal abstractly — an append at a remembered
position — and everything durable in the estate stands on the concrete
thing underneath it. This directory models that concrete thing: chained
CAS-append, verify-on-read, appender crash, and a store nobody trusts.

Run it:

```bash
bash verify/journal/run.sh
```

## Who this is for

The named consumers are in `packages/plait/`, not in the archaeology of
older lanes:

- **the content-addressed daemon shape** — its four operations are this
  model's alphabet. `publish` is the chained append, `resolve` is the
  identity re-derivation on read, `readAt` is the anchored read, and
  `land` is the CAS against a register.
- **the fabric client's anchor seam** — commit-at-expected-revision is
  the expected-position CAS modelled here, and the `lost-anchor-cas`
  refusal is the conflict branch this gate proves reachable and proves
  harmless. The refusal's own note — that a transport failure leaves the
  outcome unknown, that a retried CAS which already landed refuses by
  design — is the uncertain-retry branch, witnessed with a trace.
- **the engine's run resumption**, which is not built. An anchor is what
  a resumption reads back, and the read law below is stated relative to
  exactly that anchor. This gate is the proof substrate that tier needs,
  and it is also the reason the tier's design has a bound to respect:
  resumption from a kept anchor is covered, re-reading the world from
  genesis is not.

The kernel corpus already states two of these as laws in its own
vocabulary — that a decode re-derives the digest of what it fetched, and
that journals are append-only. This gate is where those two stop being
declarations and start being checked.

`go/journal/journal.go` is the reference implementation modelled.
**Code-model correspondence is not claimed.** The model's laws are the
model's; a defect the reference has and the model does not is exactly the
gap an R4 harness would close, and that harness is not this ticket.

## The laws

Six, each with the faithless variant that must lose it. Every control
config names only its own invariant, so a refutation cannot be credited
to a law the control never touched.

| | Law | Refuted by | Trace |
| --- | --- | --- | --- |
| J1 | `ChainIntegrity` — over a trusted store, what the journal wrote is a chain from genesis: every entry's declared position is the position it occupies, and every entry's declared predecessor is the derived head of the prefix before it. | `BlindAppend` | `JournalBroken.blind.cex.txt` |
| J2 | `AppendOnly` — a durable entry is never rewritten and never lost; the journal grows by extension only. | `LossyCrash` | `JournalBroken.durability.cex.txt` |
| J3 | `AdoptionIsVerified` — every cursor any path adopts, open or verified read or post-conflict resync, was produced by the one stored-entry verifier against the bytes then stored. | `UnverifiedResync` | `JournalBroken.resync.cex.txt` |
| J4 | `AnchoredReadIsGenuine` — if what the journal wrote is a chain, then a read standing on an anchor the journal derived from what it wrote, coming back clean, returns at every position below the tail exactly the entry the journal wrote. | `ForgivingRead` | `JournalBroken.read.cex.txt` |
| J5 | `NoDuplicatePayload` — over a trusted store, two appenders that both found a payload absent cannot both land it: the loser's CAS fails at the position it snapshotted. | `StaleCasWins` | `JournalBroken.stalecas.cex.txt` |
| J6 | `CatalogRefinement` — every behaviour of the journal is, under the stated mapping, a behaviour of the catalog model. | `BlindBegin` | `JournalCatalogBroken.cex.txt` |

J1's control is the one worth pausing on. Dropping the
expected-position CAS does not merely lose a race — it breaks the hash
chain, because an entry that lands anywhere but the position it declares
carries a prev that no longer names its predecessor. **The CAS is what
makes the link correct**, and the race guard is the side effect rather
than the point.

## The two obligations this ticket carried

### The split-CAS conformance obligation

The catalog gate's R4 work found that its split create — snapshot
absence, then CAS at the remembered position — has no wire seam: the
daemon serializes create into one request, so the stale-CAS branch could
not be driven and the obligation moved down to the journal, where begin
and finish are real separate operations.

**Discharged at the model level, bounded at the code level.**

- The split is real here: `Begin` runs the verified read whose fold is
  the resolve-check and snapshots the expected position; `Finish` is the
  CAS. Nothing re-runs the resolve-check at finish, exactly as the
  reference does not.
- The stale-CAS conflict branch is **reachable**, and that is checked
  rather than asserted: `Journal.witness-conflict.cfg` requires TLC to
  violate `NoStaleCasConflict`, and the committed trace is the schedule —
  two appenders snapshot absence at the same position, one lands, the
  other's CAS fails. That is the same schedule the catalog's R4 finding
  minimized, now drivable.
- What the branch buys is J5, with `StaleCasWins` as the control: an
  appender that resyncs and appends anyway lands a duplicate, and the
  absence snapshot each appender took has bought nothing.
- **Not covered**: conformance of the reference implementation against
  this model. Driving the real journal API through these schedules is an
  R4 harness; this is R2. The obligation moves from "no seam exists" to
  "the seam is modelled and the harness is unbuilt", which is a different
  and smaller debt.

### The one-verifier law

The estate's decision record fixes it: open, verified read, and conflict
recovery use one stored-entry verification path before any cursor
changes, because the writer must not inherit a weaker tamper-evidence law
than the reader.

**Discharged, at the stated bounds.** J3 is that law as an action
property over every cursor adoption, and `UnverifiedResync` is the
control — a resync that trusts the stored record's own declared position
instead of re-deriving it against the position it occupies. The control
runs with tamper in force, because a trusted store is the one
circumstance in which the two paths cannot disagree, and a law that only
holds where it cannot be tested is a law about nothing.

What the verifier does **not** do is walk back to genesis, and the model
does not pretend otherwise: it checks the record at the position and
re-derives the head from the bytes, which is exactly what the reference
does. The residuals below are what that costs.

## The refinement into the catalog model

`JournalCatalog.tla` exhibits the mapping under which every journal step
is a catalog step or a stutter, so the catalog's safety is not re-proved
here and the two gates compose instead of overlapping. The catalog spec
is READ IN PLACE through the module path; it is not copied, so the one
transition table cannot drift into two.

The mapping: one daemon; the abstract catalog is what the journal wrote,
payload for value; a creator is busy exactly while its writer holds a
pending entry that has not yet landed, and its expected position is that
entry's declared position.

One piece of the mapping was found by being wrong first, and is worth
stating because it is the kind of thing a reviewer should be able to
attack. Content addressing makes two creators of one value
byte-identical, so a mapping that decided "my entry is at my position" by
reading the journal idles BOTH creators on a single append, and one
journal step becomes two catalog steps. The model therefore remembers
which writer actually appended — a history variable, in a phase nothing
in the transition relation branches on. The rival's own finish is then a
duplicate outcome at the journal and the catalog's conflict branch at the
abstraction, which is the right answer and is only reachable because the
model remembers something no participant can observe.

**What the refinement does not cover**, stated rather than discovered:

- **Appender crash.** A pending writer that dies maps to a creator going
  idle without appending at a position still free, and the catalog model
  has no such step: process failure is outside its action alphabet. The
  refinement config therefore runs with no crashes, and the journal's
  crash behaviour is checked locally in `Journal.cfg` instead. **A
  catalog claim about appender crashes is not available from this
  composition.**
- **An untrusted store.** Tamper is invisible to the abstract catalog and
  would leave a creator's expected position derived from bytes the
  journal never wrote. Tamper tolerance is the journal's own law, not one
  the catalog inherits.
- **Ingress, replication, and mirrors.** The journal is a single
  authority journal; the catalog's mirror and data journals stay empty
  under the mapping, so the catalog's replication and admission laws are
  neither used nor re-proved by this refinement.
- **Liveness**, crash recovery of the store itself, the Effect runtime,
  and code-model correspondence at either layer.

## Residuals — stated non-claims, checked rather than assumed

Three configs require TLC to report a violation. The violation is the
evidence: it proves the gap is real instead of leaving it as a note
someone might disagree with.

**RESIDUAL-001 — a tail forgery does not stay at the tail.** A reader
holding no prior head accepts a mutated tail record: it is canonical, and
it still chains from its predecessor. The reference implementation has
the same gap and says so where it adopts a tail. What the traces add is
the half that note does not reach: an honest appender then adopts the
forged tail as its cursor and writes its next entry **onto** the forgery.
From that step, what the journal wrote is no longer a chain
(`Journal.residual-tail-forgery.cex.txt`), and a fold from genesis over
the whole journal comes back clean while handing the caller a record the
journal never wrote, at a position that is no longer the tail
(`Journal.residual-laundered-read.cex.txt`).

This is why J4 carries the chain law as a hypothesis rather than standing
alone, and it is the bound a resuming consumer has to respect: **keep
your anchor.** A consumer that re-reads the world from genesis is not
covered by anything here.

**RESIDUAL-002 — erasure leaves no evidence.** With erasure in the tamper
alphabet, a durable entry simply leaves and what remains is a perfectly
valid shorter chain; a fold from genesis comes back clean and nothing in
the bytes says an entry is missing
(`Journal.residual-erasure.cex.txt`). The chain is not the mechanism that
would notice a purge. The reference implementation spends most of its
stream-shape refusals buying the assumption instead — deny delete, deny
purge, no eviction limit, no per-message expiry, no rollup. Those
refusals are the assumption's price, and this trace is what the
assumption is worth.

## Anti-vacuity witnesses

Two more required violations, for a different reason: a law about a
branch no behaviour reaches is a law about nothing.

- `Journal.witness-conflict.cfg` — the stale-CAS conflict branch is
  reachable (the split-CAS schedule above).
- `Journal.witness-duplicate.cfg` — the uncertain-retry duplicate branch
  is reachable: an append lands, its acknowledgement is lost, and the
  byte-identical retry finds its own bytes at the position.

## Bounds, and what a bounded check certifies

A bounded check certifies only its bounds. Each capped dimension has a
guard config that TLC must REJECT on the assumption rather than silently
checking a truncation of a wider claim: `Journal.overrun-writers.cfg`,
`Journal.overrun-payloads.cfg`, `Journal.overrun-cap.cfg`.

| Config | Appenders | Payloads | Journal cap | Tamper | Erasure | Crash |
| --- | --- | --- | --- | --- | --- | --- |
| `Journal.cap2` | 2 | 2 | 2 | 0 | no | 0 |
| `Journal` | 3 | 3 | 3 | 0 | no | 1 |
| `Journal.tamper` | 3 | 2 | 3 | 1 | no | 0 |
| `JournalCatalog` | 3 | 3 | 3 | 0 | no | 0 |

A defect needing a fourth appender, a fourth payload, a longer journal, a
second tamper step, or a second crash is outside everything checked here.

Three laws are checked only in the trusted-store configs, and the
omission is the claim's shape rather than an oversight. J1, J2, and J5
all fail under tamper, each for a reason the residuals name: a forged
tail poisons the next link, an erasure un-appends, and an absence read
from mutated bytes is absence of evidence. What survives an untrusted
store is J3 and J4 — the one verifier, and the read fold relative to a
trusted anchor.

## Modelling decisions that diverge from the reference

Stated in the spec header so they can be argued with, and repeated here
because stated abstractions are exactly where drift hides.

- Content addressing is the identity function: an entry IS its canonical
  bytes, and an entry's digest is its declared history extended by its
  own payload and position. Hash collisions and non-canonical encodings
  are outside everything checked, and the reference's "wire bytes are not
  canonical" refusal is vacuous here and is not claimed.
- Crash is an appender losing its cursor and pending entry. The store
  survives, because an acknowledged append to file storage is durable by
  assumption; `LossyCrash` is the control that prices the assumption.
  Broker failure, partition, and restart of the store itself are not
  modelled.
- The broker-side duplicate window is not modelled: the duplicate verdict
  here comes only from the confirmatory re-read.
- Tamper is a fixed alphabet of three mutations — rewrite a payload,
  rewrite a declared position, drop the tail. An adversary outside that
  alphabet is not modelled.
- Writers are memoryless between attempts; consumer groups, leases, and
  multi-partition folds are not modelled.
- Liveness is not modelled. A writer that never finishes is a legal
  behaviour, which is why the gate runs with deadlock checking off.

## Run record

Pinned by RECORDING what actually ran, because the upstream release asset
rolls and a recorded digest does not.

- Tool: TLC, version 2026.08.11.125311.
- Jar: `tla2tools.jar`, sha256
  `ab323b79802aedc3203b3f9af37c6aca3ed43f4e0225b36f2aa77b26de46c05f`,
  served by the tlaplus `v1.8.0` release tag (a rolling asset).
- JVM: Temurin 21, provisioned by `mise x java@21`. Any JRE 11 or later
  works; the gate resolves `TLC_JAVA`, then mise, then `java` on PATH.
- Flags: `-workers 1 -fp 1` so counts are reproducible run to run;
  `-deadlock` because quiescence is legal here (liveness is not
  modelled); `-DTLA-Library=../catalog` so the refinement reads the
  catalog spec in place rather than a copy; `-XX:+UseParallelGC` for the
  heap profile these small closures want.
- Date of the recorded runs: 2026-08-19.

Clean closures, all with an empty queue:

| Config | States generated | Distinct | Depth | Wall clock |
| --- | --- | --- | --- | --- |
| `Journal.cap2` | 429 | 142 | 8 | under 1s |
| `Journal` | 190,810 | 30,577 | 14 | 2s |
| `Journal.tamper` | 50,421 | 15,144 | 14 | 1s |
| `JournalCatalog` | 68,980 | 13,382 | 12 | 3s |

`Journal.cap2` is the cross-version canary: 429 generated / 142 distinct
/ depth 8, asserted exactly by `run.sh`. A jar that does not reproduce it
is a finding, not a nuisance.

Required refutations, with the states explored before TLC stopped:

| Config | Verdict | States |
| --- | --- | --- |
| `JournalBroken.blind` | `ChainIntegrity` violated | 168 / 80 distinct |
| `JournalBroken.durability` | `AppendOnly` violated | 69 / 42 distinct |
| `JournalBroken.resync` | `AdoptionIsVerified` violated | 186 / 128 distinct |
| `JournalBroken.read` | `AnchoredReadIsGenuine` violated | 13,377 / 7,108 distinct |
| `JournalBroken.stalecas` | `NoDuplicatePayload` violated | 382 / 143 distinct |
| `JournalCatalogBroken` | the catalog's own step relation violated | 160 / 107 distinct |
| `Journal.witness-conflict` | `NoStaleCasConflict` violated | 66 / 47 distinct |
| `Journal.witness-duplicate` | `NoUncertainRetryDuplicate` violated | 16 / 14 distinct |
| `Journal.residual-tail-forgery` | `ChainIntegrity` violated | 691 / 439 distinct |
| `Journal.residual-laundered-read` | `CleanGenesisReadIsGenuineBelowTheTail` violated | 691 / 439 distinct |
| `Journal.residual-erasure` | `NothingWrittenIsMissing` violated | 14 / 13 distinct |

Regenerate every trace with `bash verify/journal/capture-cex.sh`.

## Not wired into the battery

This is a model gate. It is not part of `bun run gates`, matching the
standing arrangement for `verify/{catalog,ir,implication,pipeline}`. Run
it directly when this model changes.

## What is owed next

- **R4**: drive the reference journal API through the schedules this
  model generates, starting with the stale-CAS conflict the catalog gate
  could not reach. That closes the split-CAS obligation's code half.
- **R3**: an inductive invariant, which would lift the claim off the
  caps. The catalog gate's climb log is the shape that work takes.
- The reference's own residual — a canonical but forged tail — is now
  modelled with traces. Whether the estate wants to close it (an anchor
  the reader already trusts, or a walk to genesis on open) or accept it
  is a decision this gate informs and does not make.
