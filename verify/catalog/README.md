# The catalog model gate

Climb 1 of the verification ladder (ticket 009): the catalog + ingress
state machine — laws W1, W3, W4 of `proto/SPEC.md` plus resolution
monotonicity under replication lag, over the ownership model ratified in
ticket 002 (evidence / decisions / absence; per-daemon authority
catalogs; union resolution; lag is absence) and ADR-0009 (a replica is a
verified mirror holding a prefix at origin positions). Style and
discipline follow the effector model gate
(`.reference/playground-mech/specs`, `docs/research/effector-model-gate.md`):
the transition table stated once, faithless variants selected by
constants, every refutation committed beside its config, and every claim
sized to its bounds — a bounded check certifies only its bounds
(ADR-0007's spirit).

## The model, in one paragraph

N daemons each own a catalog journal (a sequence of type facts); the
resolve index is a **definition** over the state — a pure fold of the
journals a daemon holds — so an index that drifts from its journal is not
expressible, which is what "evidence is recomputable from bytes" means
here. Content-addressing collapses the digest space onto the value space
(`Digest(v) = v`); W1 is then the statement that every committed fact's
`id` equals `Digest(val)` — derived by the daemon, never taken from the
creator. The create path is split Begin/Finish around the expected-seq
CAS of `go/journal/journal.go`, so the same-daemon create race is
schedulable; the CAS's `Len = exp` **is** the absence-check's freshness
on the own journal, because journals never shrink. Mirrors copy origin
facts at origin positions under nondeterministic scheduling — that is
the whole lag model. Ingress admits a frame iff its claimed digest
resolves at that daemon at admission time, else a typed refusal
(an observable no-op; the sender owns retry). Ingress is deliberately
NOT split: its guard (presence) is monotone, so an atomic admit loses no
behaviour — presence can't go stale the way absence can, which is why
create needs a CAS and ingress doesn't.

## Files

| File | What |
|---|---|
| `Catalog.tla` | the ratified laws; four Boolean constants select faithless variants |
| `Catalog.cfg` | gate bounds: 2 daemons, 3 values, 2 creators, data cap 2, closure |
| `Catalog.cap2.cfg` | cheap pin: 2 daemons, 2 values, 2 creators, data cap 1 |
| `CatalogBroken.tla` | one-line `EXTENDS Catalog` — the faithless re-export |
| `CatalogBroken*.cfg` | four negative controls, one dropped law each |
| `CatalogBroken*.cex.txt` | the four refutations, committed verbatim |
| `CatalogInd.tla`/`.cfg` | R3 inductive invariant and fixed proof domains |
| `CatalogInd.blind.cfg` | R3 negative control: W4 deliberately disabled |
| `CLIMB.md` | failed candidates, strengthening rationale, commands, verdicts |
| `run.sh` | the gate: 2 clean closures + 4 required refutations, or FAIL |

## What R2 claims, exactly

Within the stated caps — 2 daemons, 3 values (gate) / 2 values (cap2), 2
concurrent creators, data journals capped at 2 (gate) / 1 (cap2) frames,
full mirror mesh, explored to **closure** (every reachable state at any
trace length; catalogs and mirrors carry no artificial cap because
Convergence itself bounds them, certified by `CatalogNaturallyBounded`):

- **NoAdmissionOnFaith** — every admitted frame's digest is committed
  evidence in some authority catalog, and was resolvable at the admitting
  daemon in the very state the admission step read
  (`AdmissionSeesResolution`), with resolution reaching only committed
  facts (`ResolvableOnlyViaCommitted`). No quarantine, no faith.
- **Convergence** — an authority journal never carries two facts for one
  value, and every fact anywhere carries the derived identity: same
  bytes, one identity, any interleaving, any daemon. Cross-daemon
  duplicates under lag exist and are harmless evidence — the model
  proves them harmless rather than pretending them away.
- **ResolutionMonotonicity** — a daemon's resolvable set never shrinks:
  evidence never un-resolves.
- **LagIsAbsenceNeverWrongData** — every mirrored fact equals its
  origin's fact at that position; a mirror is always a prefix.

Nothing beyond these caps is claimed. A defect requiring 3 daemons, a
4th value, a 3rd concurrent creator, or a longer data journal is outside
everything checked here — that is what R3 exists to close. W2
(canonicalization) and W5 (read-your-admissions) collapse in this
abstraction (values are canonical, appends are durable) and are **not**
claimed.

## TLC results (RUN, 2026-08-12)

Toolchain: TLC 2.19 of 08 August 2024 (rev 5a47802), `tla2tools.jar`
sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`,
Temurin/OpenJDK 21.0.2 via `mise x java@21`, flags
`-workers 1 -fp 1 -deadlock` (heritage flags; the fixed fingerprint seed
makes runs comparable). The upstream `v1.8.0` release tag serves a
ROLLING asset — on 2026-08-12 it served TLC `2026.08.11.125311`, sha256
`ab323b79802aedc3203b3f9af37c6aca3ed43f4e0225b36f2aa77b26de46c05f` —
so `run.sh` pins by recording the version and sha it actually ran, and
the cap2 closure is the cross-version canary: **both** jars reproduce
119,145 / 18,295 / depth 16 exactly.

### Ratified model — clean to closure

| Config | Bound | States generated | Distinct | Depth | Result |
|---|---|---:|---:|---:|---|
| `Catalog.cap2.cfg` | closure | 119,145 | 18,295 | 16 | clean, 1s |
| `Catalog.cfg` | closure | 103,407,991 | 12,707,989 | 24 | clean, 11min 23s |

Gate-config tail, verbatim:

```
Model checking completed. No error has been found.
  Estimates of the probability that TLC did not check all reachable states
  because two distinct states had the same fingerprint:
  calculated (optimistic):  val = 6.2E-5
  based on the actual fingerprints:  val = 2.5E-5
103407991 states generated, 12707989 distinct states found, 0 states left on queue.
The depth of the complete state graph search is 24.
```

(That fingerprint-collision estimate is a property of TLC's hashed state
set at 12.7M states; the cap2 run's estimate is 2.6E-11. Stated because
"exhaustive" at this scale is exhaustive-modulo-fingerprinting.)

### Negative controls — all four refuted, each on its own law

| Config | Law dropped | Required violation | Found at | Trace |
|---|---|---|---|---|
| `CatalogBroken.cfg` | W4 resolve-check | `NoAdmissionOnFaith` | depth 2, 14 states | `CatalogBroken.cex.txt` |
| `CatalogBroken.assert.cfg` | W1 derived identity | `Convergence` | depth 3, 27 states | `CatalogBroken.assert.cex.txt` |
| `CatalogBroken.forge.cfg` | ADR-0009 verified mirror | `LagIsAbsenceNeverWrongData` | depth 4, 237 states | `CatalogBroken.forge.cex.txt` |
| `CatalogBroken.reset.cfg` | ADR-0009 durable prefix | `ResolutionMonotonicity` (action) | depth 5, 856 states | `CatalogBroken.reset.cex.txt` |

Each trace is the minimal witness of exactly its law: blind ingress
admits digest 1 into a data journal while every catalog is empty;
asserted identity commits `[val 1, id 2]`; the forged mirror holds
`[val 1, id 2]` where its origin committed `[val 1, id 1]`; the reset
mirror advances then empties, shrinking daemon 2's resolvable set from
`{1}` to `{}`. The reset control also keeps `LagIsAbsenceNeverWrongData`
in its checked set and does NOT violate it — losing a prefix and forging
one are different sins, and the model separates them.

## R3 inductive proof (CLAIMED, 2026-08-13)

`CatalogInd.tla` strengthens the five R2 state invariants with one
**CAS-freshness clause**: a pending create whose expected own-journal
position still holds still has a true absence-check on that journal.
This is the catalog analogue of the effector's
`fresh => snapshot current`; it is what makes a delayed `CreateFinish`
safe without re-reading.

Apalache checked arbitrary typed states satisfying `IndInv`, not the
reachable set. `DataCap = 0`, so trace length and data-journal depth are
unbounded. The proof fixes the configured cardinalities at 2 daemons,
3 values, and 2 creators; it does **not** claim arbitrary cardinality.
Catalog and mirror length need no artificial cap because
`Convergence` and `CatalogNaturallyBounded` bound them by the finite
value domain.

Toolchain: Apalache 0.61.0 (build 831d473), jar sha256
`33611081942d392646af60993c599907f1f41752fce4a62304dbf9e2cdad4346`,
on Temurin/OpenJDK 21.0.2 via `mise x java@21.0.2`. The commands below
use `APALACHE_JAR` for the verified release jar.

| # | Obligation | Init / invariant / length | Verdict | Time |
|---|---|---|---|---:|
| 1 | base: `Init => IndInv` | `Init` / `IndInv` / 0 | NoError | 4.164s |
| 2 | consecution: `IndInv /\ Next => IndInv'` | `IndInit` / `IndInv` / 1 | NoError | 26m35s |
| 3 | state safety | `IndInit` / `StateSafety` / 0 | NoError | 3m23s |
| 4 | action safety: admission + monotonicity | `IndInit` / `SafetySteps` / 1 | NoError | 6m52s |
| 5 | CONTROL: consecution without CAS freshness | `IndInitSansFreshness` / `IndInvSansFreshness` / 1 | **Error, required** | 6m34s |
| 6 | CONTROL: action safety with blind ingress | `IndInit` / `SafetySteps` / 1, blind config | **Error, required** | 4m58s |

The two controls fail on exactly their planted gap. Without freshness,
an arbitrary otherwise-safe state may contain value 1 once in daemon
2's authority journal while a pending creator for value 1 still carries
`exp = 1`; `CreateFinish` appends a duplicate and breaks Convergence.
Under blind ingress, daemon 1 appends digest 1 while its own catalog and
mirrors are empty, breaking `AdmissionStep`. `CLIMB.md` keeps the full
hill-climb account and compact witnesses.

Exact commands:

```bash
mise x java@21.0.2 -- java -jar "$APALACHE_JAR" check --config=CatalogInd.cfg --init=Init --inv=IndInv --length=0 CatalogInd.tla
mise x java@21.0.2 -- java -jar "$APALACHE_JAR" check --config=CatalogInd.cfg --init=IndInit --inv=IndInv --length=1 CatalogInd.tla
mise x java@21.0.2 -- java -jar "$APALACHE_JAR" check --config=CatalogInd.cfg --init=IndInit --inv=StateSafety --length=0 CatalogInd.tla
mise x java@21.0.2 -- java -jar "$APALACHE_JAR" check --config=CatalogInd.cfg --init=IndInit --inv=SafetySteps --length=1 CatalogInd.tla
mise x java@21.0.2 -- java -jar "$APALACHE_JAR" check --config=CatalogInd.cfg --init=IndInitSansFreshness --inv=IndInvSansFreshness --length=1 CatalogInd.tla
mise x java@21.0.2 -- java -jar "$APALACHE_JAR" check --config=CatalogInd.blind.cfg --init=IndInit --inv=SafetySteps --length=1 CatalogInd.tla
```

## How R4 attaches

R3 proves the transition table, not that the binary refines it. The
tracer daemon (proto/) implements the same create path
(canonicalize → derive → resolve-check → CAS-append) and the same
ingress refusal on the real journal substrate. R4 is lockstep trace
replay in the effector heritage's mold: enumerate schedules from this
transition table (Begin/Finish interleavings, mirror advances at chosen
lag points, publishes at chosen daemons), drive them against the real
daemon on embedded NATS, assert step-for-step agreement — admit/refuse
verdicts, `created:false` convergences, CAS conflicts — and prove the
harness can fail with corrupted-schedule controls (a schedule mutated to
predict admission of an uncataloged digest must be caught every time).
The interposition seam already exists: the daemon's journal is handed to
it, so the harness can stall a creator between resolve-check and append
without touching the code under test.

## Running it

```bash
bash verify/catalog/run.sh
```

Two clean closures plus four required refutations, or the gate fails —
including the case where a *broken* spec comes back green, because a
prover that cannot fail proves nothing. The gate config takes ~11
minutes; `Catalog.cap2.cfg` alone is ~1s. If TLC ever finds a real
counterexample in `Catalog.tla`, that is a FINDING about the ratified
laws, not a nuisance: commit the trace beside the spec like the
`*.cex.txt` files and lead with it.

The R3 commands above are a separate gate: four `NoError` verdicts and
two required `Error` verdicts. Any flipped verdict fails the claim.
