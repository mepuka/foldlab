# Catalog R3 climb log

Run 2026-08-12/13 CDT. The claim, fixed domains, tool hashes, commands,
and final timings are in `README.md`. This file keeps the failed
candidates because their counterexamples explain the final invariant.

## Tool preflight: the candidate was not yet type-checkable

The prepared candidate first stopped in Snowcat before proof:

```text
[Catalog.tla:138:29-138:36]: Annotation required. Found 4 matching operator signatures
[Catalog.tla:138:16-138:19]: Cannot apply s to the argument i in s[i].
```

Cause: generic `Range(s)` was ambiguous among a sequence, function,
string, and record. Fix: annotate `Range`, `ValsOf`, `CommittedFacts`,
`CommittedIds`, `LocalFacts`, and `ResolvableIds`. These are type
comments only; the transition relation and ratified laws did not move.
The TLC cap2 canary then reproduced exactly: 119,145 generated, 18,295
distinct, depth 16, clean to closure.

## Candidate A: R2 invariants without CAS freshness — rejected

Candidate:

```tla
IndInvSansFreshness ==
  /\ TypeOK
  /\ Convergence
  /\ NoAdmissionOnFaith
  /\ ResolvableOnlyViaCommitted
  /\ LagIsAbsenceNeverWrongData
  /\ CatalogNaturallyBounded
```

Apalache verdict: `Error`, as required by the negative control
(6m34s). It found an arbitrary state satisfying every clause above:

```text
catalog[1] = << [val 2, id 2] >>
catalog[2] = << [val 1, id 1] >>
creator 1  = [busy TRUE, at 2, val 1, exp 1]
mirror[1][2] = << [val 1, id 1] >>
```

`CreateFinish(1)` sees `Len(catalog[2]) = exp = 1` and appends value 1
again. The post-state has two equal values at different positions in
daemon 2's authority journal, violating `Convergence`.

Why it was not inductive: nothing in Candidate A couples a pending
creator's remembered absence-check to the current own journal. A
reachable `CreateBegin` establishes that coupling, but an inductive
invariant must constrain every arbitrary state it admits.

## Candidate B: add CAS freshness — accepted

Strengthening:

```tla
\A c \in Creators :
  LET p == creators[c] IN
  (p.busy /\ Len(catalog[p.at]) = p.exp) =>
    p.val \notin ValsOf(catalog[p.at])
```

This is exactly the expected-sequence CAS lemma: if the remembered
position is still current, the own-journal absence-check made at Begin
is still current because authority journals never shrink. With this
clause, base, consecution, state safety, and action safety all returned
`NoError`. No further strengthening was needed.

## Sensitivity control: blind ingress — rejected

With `BlindIngress = TRUE`, Apalache returned `Error` on
`SafetySteps` (4m58s). The witness pre-state has:

```text
catalog[1] = << >>
mirror[1][1] = mirror[1][2] = << >>
catalog[2] = << [val 3, id 3], [val 1, id 1] >>
data[1] = << >>
```

The blind publish step appends digest 1 to `data[1]`, although daemon 1
does not resolve 1. This violates `AdmissionStep`; the negative control
therefore proves the action-safety harness can fail.

## Result (2026-08-13, first pass — superseded, see the repair below)

Candidate B is inductive for arbitrary trace length and unbounded data
journals at the configured 2-daemon, 3-value, 2-creator domains. R3 is
claimed at exactly that scope. R4 remains the model-to-binary bridge.

--------------------------------------------------------------------------

# The hypothesis-bound repair (2026-08-13, second pass)

An audit of the first pass found two defects that are not about the
invariant at all — they are about what the harness could express and
what it could still run. Both are recorded here because the next person
to move `IndInv` will meet them again.

## Preflight, again: the R3 obligations had stopped running entirely

`FINDING-R3-001`. The R4 commit `0701b8b` added the wire-bridge
accessors `ModelState`, `CatalogOf`, `MirrorOf`, `DataOf`, `CreatorsOf`,
`Become` to `Catalog.tla` and rewrote `CreateBegin`/`CreateFinish`
through them, without type annotations. Snowcat then refused the module:

```text
[Catalog.tla:142:18-142:21]: Cannot apply s to the argument 1 in s[1].
[Catalog.tla:142:1-142:21]: Error when computing the type of CatalogOf
```

Every R3 obligation — clean runs and negative controls alike — died at
the type checker before any proof ran (`EXITCODE: ERROR (120)`,
`_runlogs/base-01-baseline.log`). A gate that cannot run cannot fail,
which is the same defect class as a control that cannot be refuted. The
committed verdicts were real: obligation 1 reproduces `NoError` against
`Catalog.tla` as of the R3 claim commit `be3ebf8`
(`_runlogs/baseline-preR4-ob1-base.log`).

Fix: annotations only, exactly as in the first preflight above. The
certificate that nothing but types moved is the TLC cap2 closure, which
must reproduce bit-for-bit: **119,145 generated / 18,295 distinct /
depth 16** (`_runlogs/annot-canary-cap2.log`). It did.

A trap worth its own line: prose inside a `.tla` comment must not
contain the literal annotation token, or Snowcat counts the sentence as
a second annotation on the declaration that follows
(`Found 2 @type annotations in front of some declaration`).

## The induction hypothesis could not express a full catalog

The first pass built the hypothesis with `catalog = Gen(2)` while
`NumVals = 3`. `Gen(k)` bounds what the hypothesis can EXPRESS —
sequences of length <= k, functions of <= k entries, the bound recursing
unchanged into nested structures (upstream `ValueGenerator.scala`:
`genSeq` asserts `len <= bound`, `genFun` recurses with the same bound).
`CatalogNaturallyBounded` — itself a conjunct of `IndInv` — permits
`Len(catalog[d]) = 3`, and a length-3 catalog is reachable.

So a state satisfying every conjunct of `IndInv` was unrepresentable in
`IndInit`, and consecution and action safety were discharged over a
strict subset of the invariant. Uncovered: every transition OUT of a
full catalog. Nothing was wrong with Candidate B; the harness simply
never asked it the last question.

This is the failure mode that makes `Gen` dangerous: it does not warn,
it does not narrow the printed claim, and the run comes back green. The
only defence is to derive each variable's natural maximum from the
invariants and compare. At these domains:

| Variable | Natural maximum | Bound | Verdict |
|---|---|---|---|
| `catalog` | 3 (`CatalogNaturallyBounded`, `NumVals = 3`) | `Gen(3)` | exact — was `Gen(2)`, the defect |
| `mirror` | 3 (prefix of `catalog[o]` by `LagIsAbsenceNeverWrongData`) | `Gen(4)` | above maximum |
| `creators` | 2 (`|Creators|`) | `Gen(4)` | above maximum |
| `data` | unbounded (`DataCap = 0`) | `Gen(2)` | CUTOFF — argued, see below |

## The one bound no `Gen(k)` can cover: `data`

Data journals are unbounded in the R3 domains, so the `data` bound is a
cutoff and needs an argument, not a number. The argument is written out
in `CatalogInd.tla`'s header and in `R3-DECISIONS.md` D3; in one line:
`data` is read by no guard, occurs only pointwise in `TypeOK` and
`NoAdmissionOnFaith`, and `CommittedIds` is monotone — so truncating
every journal to `<<>>` preserves `IndInv`, disables no action, and
preserves every violation, because only the newly appended entry can
newly violate anything. Pre-state depth 0 suffices; `Gen(2)` covers it
with one to spare.

The argument stands on a premise worth naming here too, because it is
the part a future edit breaks silently: **`data` is append-only**.
`data'` is written in exactly one place — `Publish`'s `Append` — and no
action rewrites, reorders, removes, or compacts an existing entry. That
is what makes `AdmissionStep`'s `Len` and `SubSeq` conjuncts
structurally true rather than something the cutoff has to survive: they
constrain the earlier entries, and they are satisfied by every step the
relation admits. Add a compaction, reindex, or replay-truncation action
and the cutoff becomes unsound while every other line of the argument
still reads as valid.

`IndInitDataDeep` re-runs consecution at `data = Gen(3)` as the
insensitivity control. It corroborates the argument; the argument is
what licenses the bound.

## Result (repaired, and re-proved 2026-08-19)

The verdicts at the repaired bounds, the timings, and the run record are
in `README.md`; the chronological log with every command is
`WORKLOG.md`. R3's scope is unchanged in substance — 2 daemons, 3
values, 2 creators, unbounded data journals, arbitrary trace length —
but it is now discharged over a hypothesis that can express every state
`IndInv` admits at those domains, which is what the first pass did not
do.

The re-proof ran and passed: all nine verdicts as required, obligation 2
returning `NoError` at catalog `Gen(3)` exactly as it had at `Gen(2)`.
That is the outcome the repair predicted and it is worth naming plainly,
because it is the one an under-covered hypothesis cannot distinguish
from success. Candidate B was inductive all along; what was defective
was the harness's ability to ask it the last question. The lesson the
next person needs is therefore not about this invariant but about `Gen`:
a green run over a bound below the natural maximum looks identical to a
green run over the whole invariant, and only deriving each variable's
natural maximum and comparing tells them apart.
