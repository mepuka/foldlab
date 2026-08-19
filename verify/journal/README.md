# The journal model gate

The hash-chained journal is the estate's second concurrency kernel and was
the only one without a model of its own: the catalog model embedded its CAS
abstractly and the crash evidence was empirical. This gate gives it one, and
composes it into the catalog model as a **refinement** so the two proofs
compose instead of overlapping.

The modelled subject is `go/journal/journal.go`: an expected-position
CAS-append against a JetStream stream, a verify-on-read fold that refuses at
the first bad position, one stored-entry verifier behind every head adoption,
and reopen-from-storage after a crash.

Read [`../AGENTS.md`](../AGENTS.md) for the scoped gate laws before changing
anything here. `run.sh` is the gate, not a convenience: it fails unless every
clean config closes AND every control is refuted on its own named law.

## The model, in one paragraph

A journal is a sequence of records, each carrying a payload, the head it
chains from, and the position it claims; the record at index `i` sits at
position `i-1`, exactly as `go/journal` maps a JetStream sequence to a
cursor. A digest is modelled as the sequence of `<<payload, position>>` pairs
it covers, because `canonical.EntryDigest` hashes all three entry fields —
payload, prev, and seq — so identity binds the position too. Appenders work
in two halves: **Begin** forms the entry from the handle's verified head and
snapshots the expected position; **Finish** is the CAS, whose three outcomes
are the runtime's three — *stored* when the position was still free,
*duplicate* when the position already holds this appender's own bytes (the
retry after a lost acknowledgement), *conflict* when a rival holds it. A
reader folds forward through the one verifier. An adversary may rewrite one
field of one stored record. A crash may land the append and lose the
acknowledgement, or drop the handle entirely, after which reopening
re-derives the head from durable storage.

## The five laws

| | Law | Form | Control that refutes it |
| --- | --- | --- | --- |
| JL1 | the chain never forks at a sequence number | `WritersNeverForkTheChain` (step), `ChainIsSingleAndWellFormed` (state, corruption-free configs) | `NoCAS` |
| JL2 | an append linearizes exactly once or conflicts | `AppendIsExactlyOnceOrConflict` (step) | `OptimisticOutcome` |
| JL3 | verify-on-read reproduces the stored head over any prefix, or reports tamper at the first bad position | `ReadIsTamperEvident` (state) | `TrustingRead` |
| JL4 | one verifier licenses every head adoption (D60) | `OnlyVerifiedHeadsAreAdopted` (step) | `UnverifiedAdopt` |
| JL5 | recovery is a pure function of durable storage | `RecoveryIsPureStorage` (step) | `AmnesicRestart` |

JL1 is stated with the hypothesis the CAS actually discharges — see
[`FINDING-001.md`](FINDING-001.md), which is the counterexample that put it
there and the reason JL1 and JL3 are visibly independent rather than one law
doing the other's work.

## The refinement, and the obligations it discharges

[`JournalCatalog.tla`](JournalCatalog.tla) instantiates the catalog model
over an abstraction of this journal: the daemon's authority catalog journal
IS this journal, a fact is the payload stored at a position carrying the
derived identity, and the creators are the appenders with the handle cursor
and the reported outcome hidden. The refinement is claimed against the
RESTRICTED create-path spec — resolve-check, then the journal's snapshot,
then the CAS — because the journal itself is content-blind and convergence is
the daemon's law, enforced above it.

Two halves are checked, the shape the catalog's own wire bridge uses:
`CatalogRefinement` (every moving create-path step IS the catalog step it
claims to be) as an action property, and `ConvergingCreateAgrees` (a
converging create really does stutter) as a state invariant, because
`[][_]_vars` exempts stutter steps and no subscript can exempt an invariant.
The catalog's own ratified invariants — `TypeOK`, `Convergence`,
`CatalogNaturallyBounded`, `LagIsAbsenceNeverWrongData`,
`ResolvableOnlyViaCommitted`, `NoAdmissionOnFaith`,
`ResolutionMonotonicity`, `AdmissionSeesResolution` — are checked over the
abstraction as well, so the catalog's safety transfers instead of being
re-proved here.

**The split-CAS conformance obligation** (received from
[`../catalog/R4-FINDING-001.md`](../catalog/R4-FINDING-001.md),
operator-ratified 2026-08-13) is discharged by
`JournalCatalogBroken.cas.cfg`. Catalog R4 was re-claimed against a coarsened
wire map in which create is one atomic action, because protod serializes
create and no wire seam can pause it; the split branch's conformance moved
here, where begin and finish are real separate operations. The control drops
the expected-position guard and the refinement dies on exactly the schedule
the finding recorded:

```text
CreateBegin(w=1, v=1)   # snapshot: expected position 0
CreateBegin(w=2, v=1)   # snapshot: expected position 0
Finish(1)               # stored at position 0
Finish(2)               # catalog model: stale-CAS conflict
                        # NoCAS: stored anyway — the refinement is violated
```

That is the mechanical statement that the catalog's stale-CAS conflict IS
this journal's expected-position CAS and nothing else. The clean refinement
run drives all three CAS outcomes: 40 stored, 16 duplicate, 12 conflict.

**The D60 one-verifier law** ("every stored journal head is verified before
cursor adoption"; `proto/DECISIONS.md`, load-bearing) is JL4. Open, the
verified read, and post-conflict resync all route through `VerifiedTail` /
`Verifies`, and `UnverifiedAdopt` — the variant that takes the broker's tail
on faith — is refuted on that property alone. The law is discharged at the
model level; the runtime's *code-level* single-verifier property (that
`verifyStoredEntry` is the only such path in `journal.go`) is a source fact
this model does not check.

## Files

| File | What it is |
| --- | --- |
| `Journal.tla` | the transition table, stated ONCE; five Boolean constants select the faithless variants |
| `Journal.cfg` | the RACE config — two appenders, three positions, no adversary, no crash |
| `Journal.tamper.cfg` | the ADVERSARY config — one storage corruption available |
| `Journal.crash.cfg` | the CRASH config — one crash event available |
| `Journal.overrun-*.cfg` | bound guards; each must be rejected by its own `ASSUME` |
| `JournalBroken.tla` | one-line `EXTENDS`; the five faithless configs live beside it |
| `JournalBroken.*.cex.txt` | the committed refutation traces |
| `JournalCatalog.tla` | the refinement into the catalog model |
| `JournalCatalogBroken.tla` | one-line `EXTENDS`; two faithless bridges |
| `FINDING-001.md` | the CAS-versus-corruption counterexample and the law it restated |
| `Journal.tamper.finding-001.cex.txt` | that counterexample's trace |
| `run.sh` | the gate |

## What R2 claims, exactly

At the configured caps and nowhere else. A bounded check certifies only its
bounds.

- **Race config**: 2 appenders, 2 payloads, journal positions 0–2, no
  storage corruption, no crash. All five laws hold to closure.
- **Adversary config**: 2 appenders, 2 payloads, positions 0–2, ONE
  single-field corruption of one stored record per behaviour. JL2–JL5 hold to
  closure; JL1 holds in its step form under its stated hypothesis.
- **Crash config**: 2 appenders, 2 payloads, positions 0–1, ONE crash event
  per behaviour (a lost acknowledgement at the commit point, or a reopen).
  All five laws hold to closure.
- **Refinement config**: 2 creators, 2 values, positions 0–2. Every
  create-path step refines a catalog step, converging creates really stutter,
  and the catalog's eight ratified laws hold over the abstraction.

### Stated abstractions — where this model diverges from or sharpens the code

These are in the spec header too, so they can be argued with there.

- **Canonical bytes collapse.** `verifyStoredEntry` checks three things: the
  position agrees with the claimed seq, the wire bytes are canonical, and the
  prev link matches the verified head. Records here ARE canonical values, so
  the byte-canonicality check is inexpressible and is NOT claimed.
- **Collision resistance is assumed.** Digests are modelled as the content
  they cover. Nothing here is a claim about SHA-256.
- **Append is atomic at the broker.** A record is wholly present or wholly
  absent. Torn writes, partial fsync, and the pinned server's failsafe sync
  window are out of scope — they remain the `crash-durable` residuals already
  recorded in `VERIFICATION.md`.
- **Crash and restart are one step.** A dead handle takes no steps and the
  store is untouched while it is dead, so a separate dead state adds no
  behaviour.
- **Tampering is minimal and external.** One field of one record, substituted
  with a genuine head of another prefix or with a foreign digest. It is not a
  claim about any NATS failure mode, and arbitrary record substitution is not
  modelled.
- **The shape gate is not modelled.** `badShapeReason` and the standing
  stream-update advisory are an admission check on the stream's
  *configuration*, not a step of the append/read machine. This model assumes
  a conformant stream throughout; the substrate assumption gate (ticket 011)
  is where that lives.
- **One stream, one authority.** ADR-0009's replica role is not modelled
  here; mirrors live in the catalog model.
- **The fresh-handle restriction** on the refinement's create path: the
  catalog's `CreateBegin` snapshots the CURRENT journal length, so the
  restricted spec requires the handle head to be the verified tail before a
  begin. Two creators still race the same free position — that is the point.
  What is excluded is a handle appending from a head it has not re-verified
  since another writer moved the tail; that behaviour IS expressible in
  `Journal.tla` and is simply outside the catalog's alphabet.

### What this model does NOT cover

- Crash recovery *specifics*: fsync semantics, torn writes, partially durable
  acknowledgements, the broker's internal-queue overflow.
- The Effect runtime, the TypeScript reader, and the MCP surface.
- **Code/model correspondence.** No refinement map exists between this model
  and `go/journal`. R4 for this kernel — driving these schedules against the
  running journal API — is not claimed and is not attempted here.
- A cursor a handle holds may cease to match storage if storage is corrupted
  in place after the adoption. JL4 licenses the adoption at adoption time and
  no more; the read path refuses such a cursor, which is where the guarantee
  lives.
- Only the tail record's payload can be corrupted without breaking chain
  well-formedness, because nothing links to it. This model reproduces
  `go/journal`'s recorded non-claim exactly: a canonical-but-forged tail
  passes `tailCursor`, and detecting it requires an external head witness.
- Liveness. Every property here is safety; no fairness is assumed and none is
  claimed.

## TLC results (RUN, 2026-08-19)

Run record, by recording rather than by asserting.

- Tool: TLC, `tlc2.TLC` from `tla2tools.jar`.
- Version: `2026.08.11.125311` (rev `0894c34`).
- Jar sha256:
  `ab323b79802aedc3203b3f9af37c6aca3ed43f4e0225b36f2aa77b26de46c05f`.
  The upstream `v1.8.0` release tag serves a ROLLING asset, so the version and
  sha above are of the jar actually run, and the race-config closure is the
  cross-version canary the gate asserts exactly.
- JVM: OpenJDK 21.0.2 (Temurin, provisioned by `mise x java@21`), Windows 11
  amd64, 16 cores, 3556 MB heap.
- Flags: `-workers 1 -fp 1 -deadlock`. One worker and a fixed fingerprint seed
  make the counts reproducible; deadlock checking is off because quiescence is
  legal here — a full journal with idle appenders is a legal terminal state,
  not a defect.
- Module path: the jar plus `../catalog`, so the refinement modules read
  `Catalog.tla` in place. Nothing is copied; the catalog's transition table is
  still stated exactly once.
- Whole-gate wall clock: 23 s.

### Ratified model — clean to closure

| Config | Generated | Distinct | Depth | Wall clock |
| --- | --- | --- | --- | --- |
| `Journal.cfg` (race) | 2,845 | 1,077 | 10 | < 1 s |
| `Journal.tamper.cfg` (adversary) | 86,729 | 32,225 | 14 | 2 s |
| `Journal.crash.cfg` (crash) | 3,559 | 1,146 | 9 | < 1 s |
| `JournalCatalog.cfg` (refinement) | 249 | 91 | 9 | < 1 s |

`2,845 / 1,077 / 10` is the canary the gate asserts exactly. A jar that does
not reproduce it is a finding, not a nuisance.

### Bound controls — all three rejected before state generation

`Journal.overrun-writers.cfg`, `Journal.overrun-payloads.cfg`, and
`Journal.overrun-cap.cfg` each push exactly one dimension past the literal
domain ceiling; TLC rejects each on `Error: Assumption ... is false.` with no
states generated, so no config can silently check a truncated domain.

### Negative controls — all seven refuted, each on its own law

| Config | Violation TLC reported | Depth |
| --- | --- | --- |
| `JournalBroken.cas.cfg` | `Action property WritersNeverForkTheChain is violated` | 5 |
| `JournalBroken.outcome.cfg` | `Action property AppendIsExactlyOnceOrConflict is violated` | 5 |
| `JournalBroken.read.cfg` | `Invariant ReadIsTamperEvident is violated` | 4 |
| `JournalBroken.adopt.cfg` | `Action property OnlyVerifiedHeadsAreAdopted is violated` | 6 |
| `JournalBroken.restart.cfg` | `Action property RecoveryIsPureStorage is violated` | 4 |
| `JournalCatalogBroken.cas.cfg` | `Action property CatalogRefinement is violated` | 5 |
| `JournalCatalogBroken.converge.cfg` | `Invariant CatalogConvergence is violated` | 5 |

Traces are committed beside their configs as `*.cex.txt`.

### The gate's own failure path, exercised

A gate that cannot fail is worth as much as a prover that cannot fail.
Shrinking the race config's cap from 3 to 2 makes the canary drift, and
`run.sh` exits 1 with

```text
GATE FAILURE: race canary drifted: generated=621 distinct=269 depth=8;
want 2845 / 1077 / 10
R2 GATE: FAIL
```

The config was restored and the gate re-run green before anything was
committed.

## Running it

```bash
bash verify/journal/run.sh
```

It needs a JRE >= 11 and `tla2tools.jar`. Java resolution order is `$TLC_JAVA`,
then `mise x java@21 -- java`, then `java` on PATH. Jar resolution order is
`$TLA_TOOLS_JAR`, then `./tools/tla2tools.jar`, then
`../catalog/tools/tla2tools.jar`, then a download into `./tools/`
(gitignored).

## Outcomes against the pre-registered predictions

The ticket registered four predictions in 2026-08-13 and asked for outcomes
written against them whatever they turned out to be. Here they are.

**1. Prophecy variables — location right, mechanism wrong.** The prediction
was that the catalog's abstract CAS resolves nondeterminism the concrete
journal determines later, so the refinement mapping would need prophecy
variables, one per non-monotone check. **No prophecy variable was needed.**
The catalog's create is already SPLIT at the same granularity the journal is —
Begin snapshots the expected position, Finish CASes at it — so the abstract
model resolves nothing earlier than the concrete one and the mapping is an
ordinary state function. What the anti-monotone create guard did demand was a
restriction on the CONCRETE side: the handle head must be the verified tail at
begin, or the journal exhibits stale-snapshot begins the catalog's alphabet
cannot name. So the monotone/anti-monotone split did appear in the proof's own
anatomy, and it appeared exactly where the theorem predicted — at the
absence-guard, never at the presence-guard — but it bought a restriction, not
a prophecy. Recorded as a partial confirmation and a finding about the
theorem's mechanism half.

**2. The EPR test — NOT ATTEMPTED.** This gate is TLC, not an EPR decision
procedure, and the journal's interface as the catalog sees it is stated over
sequences and position arithmetic, which are generative. A faithful EPR
encoding is a separate modelling pass. Neither passed nor failed: not run.

**3. The Lamport meter — composition won at R2, but the measurement is not
controlled.** The refinement config closes in 91 distinct states, and the
three journal configs together in 34,448, against the catalog's own
12,707,989-state R2 closure. Extending the monolithic model instead would have
multiplied that closure by the per-entry record, cursor, corruption, and crash
factors. But this compares a built bounded model against an ESTIMATE of an
un-built monolith, and the composed claim is narrower (the restricted create
path) — which is part of why it is cheap. The honest record is therefore the
one the ticket pre-authorised: **composed for modularity of claim**, with a
large but uncontrolled proof-economy saving alongside it. The
counterexample-to-induction half of the meter cannot be read until R3 exists.

**4. The GoJournal theorem shape — true here by construction, not proved.**
"Every crash state equals the abstract log at some prefix" holds in this model
because append is atomic at the broker, which is a STATED ABSTRACTION rather
than a result: crash states just are the reachable stores. What is actually
proved is the operational form the runtime enforces — JL5, that a reopened
handle's head is re-derived from durable storage, and JL3, that a read
reproduces the stored head or refuses at the first bad position. The strong
form, over torn and partially durable writes, needs the durability model this
gate explicitly excludes and is NOT established.

## What is owed

- **R3** — an inductive invariant, so the laws hold at unbounded journal
  length rather than to the configured cap.
- **R4** — lockstep conformance against the running `go/journal` API, driving
  the split `Head` / `AppendEntry` race directly. This is the half of the
  received obligation the model cannot discharge on its own: this gate proves
  the split-CAS branch has a correct implementation *in the model*, and R4 is
  what would prove the binary is that implementation.
- The resumption work that cites this gate is a separate build ticket and
  does not ride along with it.
