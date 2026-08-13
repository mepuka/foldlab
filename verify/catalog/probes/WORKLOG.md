# BREAKER worklog — verify/catalog adversarial audit

Red team against the R2/R3/R4 catalog claims. Everything in this
directory is a PROBE: nothing here is ratified, nothing here is part of
`run.sh` / `run-wire.sh` / `run-r4.sh`, and no ratified file was edited.
Verbatim TLC output for every line below is in `_runlogs/`.

## Toolchain (provisioned exactly as `run.sh` does)

| Item | Value |
|---|---|
| Java | Temurin/OpenJDK 21.0.2 via `mise x java@21` (provisioned on first use) |
| Jar source | `https://github.com/tlaplus/tlaplus/releases/download/v1.8.0/tla2tools.jar` |
| Jar sha256 | `ab323b79802aedc3203b3f9af37c6aca3ed43f4e0225b36f2aa77b26de46c05f` |
| TLC version | `2026.08.11.125311` |

The jar sha256 matches the rolling-asset sha that `README.md` and
`run.sh` recorded on 2026-08-12. It does **not** match the
`936a262...` jar (TLC 2.19) that produced the originally committed
results — as `run.sh` itself states. The cap2 cross-version canary is
therefore the comparability check, and it **reproduced exactly**
(below). That much of the evidence chain audits clean.

---

## FINDINGS

### F-01 — the constant bounds silently truncate at 4, and `CatalogNaturallyBounded` does not notice

Severity: **proof mechanics / audit hazard.** Not a violation of any law
at the ratified bounds.

`Catalog.tla:98-100` builds every domain by filtering a literal range:

```tla
Daemons  == { d \in 1..4 : d <= NumDaemons }
Creators == { c \in 1..4 : c <= NumCreators }
Vals     == { v \in 1..4 : v <= NumVals }
```

Any configured value above 4 silently yields 4. TLC issues no warning.

`CatalogNaturallyBounded == \A d \in Daemons : Len(catalog[d]) <= NumVals`
is stated against the **constant**, not against `Cardinality(Vals)`. So
raising `NumVals` past 4 both fails to widen the model *and* loosens the
one invariant that would have detected it.

Evidence — two configs differing only in `NumVals` (4 vs 9), single
daemon / single creator so the closure is decisive on counts alone:

| Probe | `NumVals` | Generated | Distinct | Depth | Verdict |
|---|---:|---:|---:|---:|---|
| `T1-vals4.cfg` | 4 | 1757 | 457 | 10 | clean |
| `T2-vals9.cfg` | 9 | 1757 | 457 | 10 | clean |

Byte-identical closures. The 9-value model is a 4-value model, and its
`CatalogNaturallyBounded` check (`Len <= 9`) was discharged by catalogs
that cannot exceed 4.

Logs: `_runlogs/T1-vals4.txt`, `_runlogs/T2-vals9.txt`.

Why it matters for the gate: this is exactly the shape of a silent
weakening. A future config claiming "now checked at 6 values / 5
daemons" would come back green in seconds while covering nothing new,
and the invariant designed to certify the natural bound would rubber
stamp it. Any bound-raise past 4 requires editing `Catalog.tla:98-100`,
and `CatalogNaturallyBounded` should read `Cardinality(Vals)`.

### F-02 — `AtomicRefinement` does not check the resolving-create case; the `[_]_vars` subscript discharges it

Severity: **proof mechanics.** The claim it invalidates is a
documentation claim, not (as far as this probe shows) a false statement
about the system.

`CatalogWire.tla:47` — `AtomicRefinement == [][CreateAtomicRefinesSplit]_vars`.
`[P]_vars` abbreviates `P \/ UNCHANGED vars`. `CreateAtomic`'s resolving
branch (`CatalogWire.tla:26-27`) **is** `UNCHANGED vars`. On such a step
the second disjunct is true and `CreateAtomicRefinesSplit` is never
consulted.

`CatalogWire.tla:9-11` claims "a resolving create is the split model's
stuttering `CreateBegin`", and `README.md` ("How R4 attaches") claims
"`AtomicRefinement` checks that relation directly." TLC cannot check it
as written.

Demonstrated by substituting a knowingly **FALSE** consequent for each
branch of `CreateAtomic` in isolation (`WireStutterProbe.tla`, which
`EXTENDS CatalogWire` and edits nothing), at cap2 bounds:

| Probe | Bridge | Expected if the branch is checked | Actual |
|---|---|---|---|
| `W3-reach-stutter.cfg` | reachability witness: "no reachable state enables the resolving branch" | violated | **violated, depth 2** — antecedent is satisfiable |
| `W2-creating-control.cfg` | `CreatingOnlyAtomic(c,d,v) => FALSE` | violated | **violated, depth 2** — the harness can fail |
| `W1-stutter-exempt.cfg` | `StutterOnlyAtomic(c,d,v) => FALSE` | violated | **CLEAN to closure, 9133 generated / 863 distinct / depth 11** |

W1 is the finding: a deliberately false obligation about the
resolving-create branch passes model checking over the entire closure,
with the positive control (W2) and the reachability witness (W3)
proving the probe is neither broken nor vacuous.

Logs: `_runlogs/W1-stutter-exempt.txt`, `_runlogs/W2-creating-control.txt`,
`_runlogs/W3-reach-stutter.txt`.

Scope, stated honestly: the resolving-create case appears **true by
inspection** — both `CreateAtomic`'s resolving branch and
`SplitComposition`'s non-busy branch reduce to `~creators[c].busy /\
UNCHANGED vars`. So this is not (yet) evidence of an unsound bridge. It
is evidence that half of the bridge is *asserted rather than checked*,
in a gate whose own stated doctrine is that a prover which cannot fail
proves nothing. A check with teeth would compare the states directly
rather than hide behind the subscript — e.g. an action invariant
`CreateAtomicRefinesSplit` checked without the `[_]_vars` wrapper, or a
state-level formulation of the resolving case.

Corollary (same mechanism, `Catalog.tla`): `Publish`'s refusal branch
(`Catalog.tla:272`) is `UNCHANGED vars`, so both `AdmissionSeesResolution`
and `ResolutionMonotonicity` — also `[][...]_vars` — are exempted on
every refusal step. Coverage confirms the branch is taken 5,668 times at
cap2 and contributes zero distinct states. The refusal law is verified
only as the *absence* of a data append (which `NoAdmissionOnFaith` does
carry); no property distinguishes "refused" from "never attempted".

---

## CLEAN SO FAR (bounded; never proof)

### Cap2 canary reproduced

`Catalog.cap2.cfg` with `-workers 1 -fp 1 -deadlock -coverage 1` on the
rolling jar above: **119,145 generated / 18,295 distinct / depth 16**,
clean — exactly the counts `README.md` records for both jars. The
cross-version canary claim audits TRUE.
Log: `_runlogs/01-cap2-coverage.txt`.

### Vacuity audit — `Catalog.cap2.cfg` (18,295 distinct states)

Action disjuncts (`distinct:generated`):

| Disjunct | Coverage | Note |
|---|---:|---|
| `CreateBegin` | 374:47544 | both branches fire — W3-converge no-op 42,784; busy-setup 4,760 |
| `CreateFinish` | 262:24704 | **both** CAS branches fire — append 9,968; stale-CAS conflict 14,736 |
| `MirrorAdvance` | 2116:18724 | honest copy 18,724; `ForgedMirror` branch **0** (variant off) |
| `MirrorReset` | **0:0** | entire action dead at the gate (`ResettingMirror = FALSE`) |
| `Publish` | 15542:28172 | admit 22,504; refusal 5,668 (see F-02 corollary) |

`MirrorReset` never firing and the `ForgedMirror` / `AssertedIdentity`
branches never being evaluated are **by design** — they are the variant
switches, exercised by the four `CatalogBroken*` negative controls. Not
findings. Recorded so the gate's honest coverage number is 4/5 Next
disjuncts on the ratified config.

Invariant non-vacuity (all counts from the same run):

| Invariant | Evidence it is not vacuous |
|---|---|
| `Convergence` cl.1 | 90,852 `(i,j)` pairs evaluated vs 52,836 with equal vals; solving gives **19,008 of 36,590 daemon-states carry a length-2 catalog** — the off-diagonal case is exercised, and `CatalogNaturallyBounded` is *tight* at cap2 (Len reaches NumVals) |
| `Convergence` cl.2 | 34,716 fact-level `f.id = Digest(f.val)` evaluations |
| `NoAdmissionOnFaith` | inner body evaluated 22,504 times, i.e. 61.5% of daemon-states have a non-empty data journal — not quantifying over empty |
| `LagIsAbsenceNeverWrongData` | inner position-equality evaluated 28,676 times — mirrors are non-empty |
| `TypeOK` | creator busy branch 24,704 / idle branch 11,886 — both fire |
| `ResolvableOnlyViaCommitted` | 36,590 daemon-instances |

No invariant clause was found quantifying over an empty set at cap2.

---

## RUN LEDGER

| UTC | Probe | Command | Verdict | Wall | Log |
|---|---|---|---|---|---|
| 2026-08-13T09:54Z | cap2 coverage | `-workers 1 -fp 1 -deadlock -coverage 1 -config Catalog.cap2.cfg Catalog.tla` | clean, canary reproduced | 6s | `_runlogs/01-cap2-coverage.txt` |
| 2026-08-13T09:55Z | gate coverage | `-workers 1 -fp 1 -deadlock -coverage 60 -config Catalog.cfg Catalog.tla` | IN FLIGHT | — | `_runlogs/02-gate-coverage.txt` |
| 2026-08-13T09:59Z | `T1-vals4` | `run-probe.sh T1-vals4 Catalog.tla 1` | clean; 1757/457/10 | 3s | `_runlogs/T1-vals4.txt` |
| 2026-08-13T09:59Z | `T2-vals9` | `run-probe.sh T2-vals9 Catalog.tla 1` | clean; 1757/457/10 — **F-01** | 2s | `_runlogs/T2-vals9.txt` |
| 2026-08-13T10:00Z | `T4-daemons4` | `run-probe.sh T4-daemons4 Catalog.tla 1` | IN FLIGHT | — | `_runlogs/T4-daemons4.txt` |
| 2026-08-13T10:00Z | `W3-reach-stutter` | `run-probe.sh W3-reach-stutter probes/WireStutterProbe.tla 1` | `ReachStutter` violated, depth 2 (required) | 3s | `_runlogs/W3-reach-stutter.txt` |
| 2026-08-13T10:00Z | `W2-creating-control` | `run-probe.sh W2-creating-control probes/WireStutterProbe.tla 1` | `CreatingProbe` violated, depth 2 (required) | 3s | `_runlogs/W2-creating-control.txt` |
| 2026-08-13T10:00Z | `W1-stutter-exempt` | `run-probe.sh W1-stutter-exempt probes/WireStutterProbe.tla 1` | **CLEAN — F-02** | 4s | `_runlogs/W1-stutter-exempt.txt` |

## Findings written up

- `FINDING-BRIDGE-001.md` (F-02), with the W1/W2/W3 table, the tested
  reformulation (`BridgeFix.tla`, probes X1-X5), and the R4 Go oracle
  assessment.
- `FINDING-BOUNDS-001.md` (F-01), with the T1/T2/T3/T4 table and the
  `Cardinality(Vals)` + `ASSUME` remedy. Passed to HARDENER as rationale.

### Additional evidence gathered after the first burst

| UTC | Probe | Verdict | Log |
|---|---|---|---|
| 10:07Z | `T3-daemons9` | clean; 1,436,629/141,957/25 — **identical to T4 (4 daemons)**, daemon truncation confirmed | `_runlogs/T3-daemons9.txt` |
| 10:07Z | `X1-resolving-agrees` | clean; 9,133/863/11 — proposal 1 holds | `_runlogs/X1-resolving-agrees.txt` |
| 10:07Z | `X2-resolving-control` | **violated, depth 2** — proposal 1 catches what W1 could not | `_runlogs/X2-resolving-control.txt` |
| 10:08Z | `X3-admitted-resolvable` | clean; 119,145/18,295/16 — proposal 2 holds | `_runlogs/X3-admitted-resolvable.txt` |
| 10:08Z | `X4-admitted-reset-control` | **violated, depth 6** | `_runlogs/X4-admitted-reset-control.txt` |
| 10:08Z | `X5-noadmission-reset` | clean; 163,101/21,977/16 — proposal 2 strictly stronger than `NoAdmissionOnFaith` | `_runlogs/X5-noadmission-reset.txt` |

---

## AUDIT DUTY

### PROVER (`agent-a832c002de4e1234c`) — everything checked audits TRUE

| Claim | How checked | Verdict |
|---|---|---|
| `Catalog.tla` edits are `@type`-only | `diff -u` against ratified, then filtered for changed lines that are not `\*` comments | **TRUE — zero non-comment changed lines** |
| cap2 canary exact after the edits | re-ran their `Catalog.cap2.cfg` on **their** `Catalog.tla` with **my** independently downloaded jar | **TRUE — 119,145 / 18,295 / depth 16** |
| Apalache jar sha256 `33611081…d4346` | `shasum -a 256` on their `tools/apalache-0.61.0/lib/apalache.jar` | **matches** |
| Apalache tgz sha256 `68fb56dd…432b8` | `shasum -a 256` on their `tools/apalache-0.61.0.tgz` | **matches** |
| canary obligation (blind ingress refuted from concrete `Init`, ~15s) | re-ran their exact recorded command | **TRUE — exit 12, "The outcome is: Error", "action invariant 0 violated", 11s** |

#### Grilling D3 (`data = Gen(2)` is a licensed cutoff)

The argument's structural premises were checked mechanically against
their `Catalog.tla`, and they hold:

- `data'` is written in exactly two places — line 291 (`Publish`'s
  `Append`) and line 164 (`Become`'s `data' = DataOf(s)`). Every caller
  of `Become` passes a state built by `EXCEPT ![1]…` / `![4]…` only,
  never `![3]`, so `Become` provably preserves `data`. **`Publish` is
  the only data-writing action, and it only appends.**
- The only guard mentioning `data` is line 289,
  `DataCap = 0 \/ Len(data[d]) < DataCap`, dead at `DataCap = 0`.
- `data` appears in invariants only at 314 (pointwise entry typing),
  315 (vacuous at `DataCap = 0`), 347 (`NoAdmissionOnFaith`, pointwise),
  373-376 (`AdmissionStep`).

No counterexample to the cutoff was found, and on this structure none
should exist: with no guard reading `data` and no action rewriting an
existing entry, truncation preserves `IndInv` and preserves violations.

**One imprecision worth correcting, not a refutation.** Clause (c) says
"`TypeOK'` and `AdmissionStep` constrain only the appended entry and the
pre-state `catalog`/`mirror`, never the earlier entries." That is not
quite right: `AdmissionStep`'s
`SubSeq(data'[d], 1, Len(data[d])) = data[d]` (line 375) constrains
precisely the earlier entries — it asserts the prefix is preserved. The
conclusion still holds, but for a different reason than the one written:
the clause cannot be *violated* because no action rewrites an existing
data entry. That premise is used and not named. It matters because it is
exactly what a future data-journal compaction, GC, or reindex action
would break — and the cutoff argument would then read as valid while
being wrong. Recommend naming it: *"`Publish` is the only writer of
`data` and it only appends; therefore the prefix clause of
`AdmissionStep` is unfalsifiable at any depth."*

Note also that at pre-state depth 0 — the depth the argument reduces to
— the prefix clause is vacuously true. The run at `Gen(2)` does exercise
it; a future "optimisation" to `Gen(0)` citing this argument would not.

### HARDENER (`agent-a0f6f6a10c577aa55`) — no silent weakening; spec edits not yet landed

Only `run.sh` (plus their own `WORKLOG.md`) differs from ratified. The
`run.sh` diff is exactly the portable-sha256 helper they described:
`sha256_of()` trying `sha256sum`, then `shasum -a 256`, then failing
loudly. **No bound lowered, no invariant removed from any checked set,
no control unwired** — the `expect_clean` / `expect_violation` call list
is untouched.

Precision on the motivation: `sha256sum` *is* present on this machine
(via Homebrew coreutils at `/opt/homebrew/bin/sha256sum`), so the
ratified script would not have failed here. Their fix is correct for
stock macOS, but this audit did not observe the ratified script failing.

Hygiene note, minor: `CatalogWireBroken_TTrace_1786615907.tla` / `.bin`
are TLC trace-exploration artefacts sitting in the **ratified**
directory. They should be gitignored or moved; they are generated
output, not evidence.

The planned `ASSUME` guards and `OverrunMirror` control are not in the
worktree yet, so nothing to diff on those. `FINDING-BOUNDS-001.md`
supplies the byte-identical-closure evidence for the `ASSUME`s.

---

## BOUND PROBES (clean at these bounds, to closure — never proof)

| Probe | Bounds (D/C/V/cap) | Beyond baseline | Generated | Distinct | Depth | Verdict |
|---|---|---|---:|---:|---:|---|
| ratified cap2 | 2/2/2/1 | — (baseline) | 119,145 | 18,295 | 16 | clean |
| `C2-cap2-creators3` | 2/**3**/2/1 | a **third concurrent CAS racer** | 1,267,549 | 161,231 | 17 | **clean** |
| `T4-daemons4` | **4**/1/1/1 | — | 1,436,629 | 141,957 | 25 | clean |

`C2` is the one that matters most: `NumCreators = 3` is the dimension
that schedules a third creator racing the same authority journal, the
most direct attack available on `Convergence` clause 1 and on the R3
CAS-freshness clause. No violation at those bounds, to closure.

B1-B4 (one dimension beyond the **gate**, not cap2) remain queued behind
the gate-coverage run; they are expected to exceed the wall-clock budget
and will be reported as depth-bounded prefixes, not closures.

---

## CTI HUNT against `IndInv`

`probes/CTIProbe.tla` `EXTENDS Catalog` and reproduces `IndInv`,
`AdmissionStep` and `MonotonicityStep` **verbatim** from
`CatalogInd.tla` (copied rather than imported because `CatalogInd`
EXTENDS the Apalache standard module, which TLC does not ship).

It adds one variable, `probeStep`, which bounds exploration to exactly
one transition — the definition of consecution — and has a second,
deliberate effect: **because `probeStep` changes on every step, no step
of this probe stutters**, so `[][A]_pvars` has no stuttering exemption.
The action obligations are checked with teeth on every step, including
steps that leave `vars` unchanged. That is the FINDING-BRIDGE-001 blind
spot, closed inside the probe.

### The two targeted families — both excluded by `IndInv`

Method: `INIT` = the family, `INVARIANT` = `~IndInv`. A **clean** verdict
means every state in the family falsifies `IndInv`, i.e. the family is
excluded outright and no counterexample-to-induction can live in it.

| Probe | Family | States enumerated | Verdict |
|---|---|---:|---|
| `Y1-family-a` | a mirror slot runs past its origin, or disagrees with it at a shared position | 1,093,248 | **clean — excluded** |
| `Y2-family-b` | a busy creator with `exp > Len(catalog[at])` | 113,400 | **clean — excluded** |
| `Y3-family-control` | same typed space, no family restriction | — | **violated (required)** — the typed space does contain `IndInv` states, so Y1/Y2 are not vacuous |

Which conjunct does the excluding, stated precisely: family (a) is
definitionally the negation of `LagIsAbsenceNeverWrongData`
(`Catalog.tla:337-340`), and family (b) is definitionally the negation
of `TypeOK`'s `p.exp <= Len(catalog[p.at])` (`Catalog.tla:304`). Both
are conjuncts of `IndInv`, so the exclusion is **structural, not
accidental**. The runs confirm the definitions were read correctly and
that no interaction between conjuncts lets such a state slip through.

Logs: `_runlogs/Y1-family-a.txt`, `Y2-family-b.txt`,
`Y3-family-control.txt`.

### `Y4` / `Y5` — independent TLC replication of consecution + action safety

Both **CLEAN — no counterexample to induction.** `INIT` = every
arbitrary **typed** state satisfying `IndInv`; facts range over the full
`Fact` record set, so `id` is **not** forced to equal `Digest(val)` and
`Convergence`'s identity clause is exercised by the filter rather than
assumed by the generator. One step, then `IndInv` (consecution) plus
both action obligations, with no stuttering exemption.

| Probe | Creators | IndInv-satisfying init states | Generated | Distinct | Verdict |
|---|---:|---:|---:|---:|---|
| `Y4-consecution` | 1 | 5,029 | 26,353 | 12,638 | **clean** |
| `Y5-consecution-2creators` | **2** | **39,897** | 265,117 | 101,734 | **clean** (14m36s) |

`Y5` is the decisive one: at 2 creators the freshness clause is a
non-trivial `\A` over creators, so a step by creator 1 must preserve
creator 2's remembered absence-check — the exact shape that refuted
PROVER's candidate A. 39,897 hand-typed `IndInv` states, one step each,
no CTI.

This re-derives Apalache obligations 2 and 4 by explicit enumeration
under a **different tool**. Stated honestly: at **strictly smaller
bounds** than Apalache's (2 values not 3, mirrors capped at length 1 vs
`Gen(4)`), so it is corroboration, not replication. Disagreement would
have been a finding against whichever tool was wrong; there was none.

---

## BOUND PROBES BEYOND THE GATE (depth-bounded prefixes, never closure)

Per coordinator guidance, these were run as time-boxed BFS prefixes, not
chased to closure. A clean prefix says only "no violation in the states
reached at this depth in this wall-clock".

| Probe | Bounds (D/C/V/cap) | Beyond gate | Prefix reached | Verdict |
|---|---|---|---|---|
| `B1-gate-daemons3` | **3**/2/3/2 | +1 daemon (mirror mesh 2->6) | depth 11, 595,617 distinct | clean prefix |
| `B2-gate-creators3` | 2/**3**/3/2 | +1 CAS racer | depth 11, 840,151 distinct | clean prefix |
| `B3-gate-datacap3` | 2/2/3/**3** | deeper data journals | depth 15, 3,261,868 distinct | clean prefix |
| `B4-gate-vals4` | 2/2/**4**/2 | exhausts the value dim (F-01: 4 is the max expressible) | depth 14, 3,634,647 distinct | clean prefix |

None reaches closure in budget, and none is presented as more than a
prefix. `B3` is the one the R3 induction claims to cover unboundedly (it
ran `DataCap = 0`); a clean deep prefix here is consistent with that
claim, not a substitute for it.

## NOT ATTEMPTED (out of budget / scope)

- B1-B4 to closure — deliberately not chased.
- Re-running the R4 Go branch-coverage assertion (needs
  `mise x go@1.26.5`; not blocking; the read-only scope note in
  `FINDING-BRIDGE-001.md` stands).
- The gate-config coverage run was started but **killed before closure**
  to free cores for `Y5`; the cap2 coverage already delivered the
  vacuity verdict, so no coverage conclusion depended on it.
