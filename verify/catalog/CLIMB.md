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

## Result

Candidate B is inductive for arbitrary trace length and unbounded data
journals at the configured 2-daemon, 3-value, 2-creator domains. R3 is
claimed at exactly that scope. R4 remains the model-to-binary bridge.
