# Catalog R3 repair decisions

Run 2026-08-13 CDT. The decisions-encountered log for the repair of the
R3 induction hypothesis after the Gen-bound audit finding. Every verdict
cited here names its verbatim log under `_runlogs/`; `WORKLOG.md` is the
chronological record and `README.md` carries the run record.

## D1. `catalog = Gen(3)`, because 3 is the natural maximum, not because 3 passed

Decided: raise the hypothesis bound on `catalog` from `Gen(2)` to
`Gen(3)`.

Apalache's `Gen(k)` bounds what a hypothesis can EXPRESS — a generated
sequence has length <= k, a generated function has <= k entries, and the
bound recurses unchanged into nested structures (upstream
`ValueGenerator.scala`: `genSeq` asserts `len <= bound`; `genFun`
recurses with the same bound). `NumVals = 3`, and
`CatalogNaturallyBounded` — itself a conjunct of `IndInv` — permits
`Len(catalog[d]) = 3`. A length-3 catalog therefore satisfies every
`IndInv` conjunct and is reachable, but was unrepresentable under
`Gen(2)`: consecution and action safety had been discharged over a
strict subset of `IndInv`, and every transition OUT of a full catalog
was unchecked.

`Gen(3)` is exactly the natural maximum, so the repaired hypothesis is
complete in `catalog` rather than merely larger. Alternatives: `Gen(4)`
(above the maximum — costs SMT time to express states `IndInv` already
excludes); leave `Gen(2)` and narrow the claim sentence to
"catalogs of length <= 2" (rejected: `CatalogNaturallyBounded` is one of
the invariants being proved, so a hypothesis that cannot express the
states it permits is not an induction over it).
**Load-bearing? yes** — this is the audit finding itself.

## D2. `mirror = Gen(4)` and `creators = Gen(4)` are STATED, not raised

Decided: leave both at `Gen(4)` and record why each is already at or
above its natural maximum.

- `mirror`: `LagIsAbsenceNeverWrongData` (an `IndInv` conjunct) forces
  `mirror[d][o]` to be a prefix of `catalog[o]`, whose length is <= 3;
  both function levels need only `|Daemons| = 2` entries. Natural
  maximum 3 < 4.
- `creators`: a function of `|Creators| = 2` entries onto records of
  scalars; the record fields are generated as unconstrained integers and
  are pinned by `TypeOK`, not by the bound. Natural maximum 2 < 4.

Alternative: raise both to match `catalog`'s style. Rejected — a bound
above the natural maximum buys nothing and costs SMT time; what the
audit demanded is that the relation between bound and maximum be
CHECKED and WRITTEN, which is what this entry is.
**Load-bearing? yes** — if either natural maximum were mis-derived, the
same silent-subset defect would remain, one variable over.

## D3. `data = Gen(2)` is a CUTOFF, licensed by an argument, corroborated by a run

Decided: keep `data = Gen(2)` and license it with an explicit cutoff
argument written into `CatalogInd.tla`'s header, `README.md`, and here —
route (i) of the two the task allowed.

Data journals are unbounded in the R3 domains (`DataCap = 0`), so no
`Gen(k)` expresses every `IndInv` state and the choice is unavoidable.
The argument:

> `data` occurs in exactly three places in the whole obligation set:
> `TypeOK`'s pointwise entry typing, `NoAdmissionOnFaith`'s pointwise
> `\A k`, and `AdmissionStep`. No guard reads it — `Publish`'s
> `Len(data[d]) < DataCap` is dead at `DataCap = 0`, and no other action
> mentions `data` at all. Let `sigma` satisfy `IndInv` and let
> `trunc(sigma)` replace every `data[d]` by `<<>>`. Then (a)
> `IndInv(trunc(sigma))` holds, because the only `data` conjuncts are
> pointwise `\A` over `DOMAIN data[d]`, vacuous on `<<>>`, and no other
> conjunct mentions `data`; (b) `trunc` disables no action, every guard
> being data-free here; (c) `trunc` preserves every violation — a
> violation of a conjunct that does not mention `data` is untouched, and
> a violation of `NoAdmissionOnFaith'` at an index `k <= Len(data[d])`
> is impossible because `IndInv(sigma)` already put that entry in
> `CommittedIds` and `CommittedIds` is monotone (every action only
> appends to `catalog`). A new violation can therefore only be at the
> appended entry — index 1 of a journal truncated to `<<>>`; likewise
> `TypeOK'` and `AdmissionStep` constrain only the appended entry and
> the pre-state `catalog`/`mirror`, never the earlier entries.

Hence pre-state data depth 0 (post-state 1) exhibits every violation any
depth exhibits, and `Gen(2)` covers the cutoff with one to spare.

The argument is what licenses the bound. `IndInitDataDeep` re-runs
consecution at `data = Gen(3)` as an insensitivity CONTROL: a verdict
that moved between the two depths would refute the argument and would be
a finding, not a nuisance. It corroborates; it does not prove.

Alternative: route (ii) — keep the bound and narrow the claim sentence
to "data journals of depth <= 2". Rejected as strictly weaker: the
sentence would understate what the argument establishes, and the R3
claim's whole value is that it holds for arbitrary trace length.
**Load-bearing? yes** — without the argument the claim's words
("unbounded data-journal depth") do not follow from what ran.

## D4. Obligation 3 is relabelled a TRIPWIRE and removed from the count

Decided: keep the `IndInit => StateSafety` run in the gate, label it a
drift tripwire everywhere it appears, and stop counting it among the
proof obligations. The R3 gate is now **three obligations and three
controls**, not six obligations.

`StateSafety`'s conjuncts are verbatim a subset of `IndInv`'s and
`IndInit` conjoins `IndInv`, so `IndInit => StateSafety` is a
propositional tautology. It cannot fail today. Calling it an obligation
inflated the evidence: a prover that cannot fail proves nothing, and the
same law applies to an individual obligation, not only to a gate.

It is still worth running, for exactly one reason, stated precisely: it
is live against a FUTURE edit that drops a `StateSafety` conjunct out of
`IndInv` or weakens one, which would silently unhook the state
invariants from the induction and would otherwise be caught by nothing.

Alternative considered: restructure to make the implication
non-vacuous — e.g. define `StateSafety` over a hypothesis that does NOT
already contain it, such as `TypeOK` plus the CAS clause alone. Rejected:
that checks a different and weaker proposition (it would ask whether the
remaining conjuncts entail the dropped ones, which they do not and are
not claimed to), and it would delete the tripwire's actual value. The
honest move is to keep the check and stop miscounting it.
**Load-bearing? yes** — the obligation count is part of the claim.

## D5. The type annotations that restored re-checkability are not a spec change

Decided: add `@type` annotations to the six wire-bridge accessors and
the four state-parameterised create helpers in `Catalog.tla` (see
FINDING-R3-001 in `WORKLOG.md`), and prove the edit inert rather than
assert it.

Two independent certifications, both recorded:

- TLC ignores type comments, so the cap2 closure must be bit-identical:
  `_runlogs/annot-canary-cap2.log` reproduces **119,145 generated /
  18,295 distinct / depth 16** exactly.
- Apalache obligation 1 at HEAD returns `NoError`
  (`_runlogs/repaired-annot-ob1-base.log`), matching the pre-R4 verdict
  reproduced in `_runlogs/baseline-preR4-ob1-base.log`.

Alternative: revert the R4 accessor refactor. Rejected — it is load
bearing for `CatalogWire.tla`, and annotations are the fix CLIMB.md
already documents for this same spec ("These are type comments only;
the transition relation and ratified laws did not move").
**Load-bearing? no** — any equally inert route to a type-checkable
`Catalog.tla` would serve; the canary is what makes the route safe.

## D6. The gate runs the whole set and fails on any flipped verdict

Decided: `run-ind.sh` is the R3 gate, mirroring `run.sh`'s contract —
required `NoError` verdicts, required `Error` verdicts grepped for the
exact named violation, portable sha256 (`sha256sum` with a
`shasum -a 256` fallback for macOS), and FAIL on any flip in either
direction, including a control that comes back green.

Alternative: check exit codes only. Rejected — an `Error` verdict on the
wrong invariant is a broken control that an exit-code check would pass.
**Load-bearing? yes** — a control that fails for the wrong reason is not
a control.
