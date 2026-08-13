# FINDING BRIDGE 001 — half of `AtomicRefinement` is asserted, not checked

Status: **OPEN — findings before fixes.** No ratified file was edited.
The disposition belongs to the operator. Found 2026-08-13 by the BREAKER
team, after the toolchain was provisioned exactly as `run.sh` does and
the cap2 cross-version canary was reproduced.

Severity: **proof mechanics.** This is not, on the evidence gathered, a
false statement about the system. It is a claimed check that cannot
fail, in a gate whose own stated doctrine is that *a prover that cannot
fail proves nothing*.

## Result

`CatalogWire.tla:47` states the bridge as a temporal action property:

```tla
AtomicRefinement == [][CreateAtomicRefinesSplit]_vars
```

`[A]_vars` abbreviates `A \/ UNCHANGED vars`. `CreateAtomic`'s resolving
branch (`CatalogWire.tla:26-27`) **is** `UNCHANGED vars`:

```tla
CreateAtomic(c, d, v) ==
  /\ ~creators[c].busy
  /\ IF Digest(v) \in ResolvableIds(d)
       THEN UNCHANGED vars          \* <-- this step
       ELSE ...
```

On such a step the `UNCHANGED vars` disjunct is true, so
`CreateAtomicRefinesSplit` is never consulted. The resolving-create half
of the bridge carries **zero verification load**.

Two committed claims are therefore stronger than the evidence:

- `CatalogWire.tla:9-11` — "a resolving create is the split model's
  stuttering `CreateBegin`; every creating step is an uninterrupted
  legal `CreateBegin;CreateFinish` pair."
- `README.md`, "How R4 attaches" — "an already-resolved atomic create
  must equal the split model's stuttering `CreateBegin`.
  **`AtomicRefinement` checks that relation directly.**"

The second half of the sentence is what the evidence does not support.
The creating case *is* checked directly. The resolving case is not
checked at all.

## Reproduce the red evidence

`probes/WireStutterProbe.tla` `EXTENDS CatalogWire` and edits nothing.
It isolates each branch of `CreateAtomic` and pairs it with a knowingly
**FALSE** consequent. An `X => FALSE` bridge is refutable exactly when
TLC actually evaluates the bridge on steps where `X` holds.

```bash
cd verify/catalog
bash probes/run-probe.sh W3-reach-stutter    probes/WireStutterProbe.tla 1
bash probes/run-probe.sh W2-creating-control probes/WireStutterProbe.tla 1
bash probes/run-probe.sh W1-stutter-exempt   probes/WireStutterProbe.tla 1
```

| Probe | Obligation put to TLC | Required if the branch is checked | Actual verdict |
|---|---|---|---|
| `W3-reach-stutter` | `ReachStutter`: "no reachable state enables the resolving branch" | violated | **violated, depth 2**, 2 generated / 2 distinct |
| `W2-creating-control` | `CreatingOnlyAtomic(c,d,v) => FALSE` | violated | **violated, depth 2**, 2 generated / 2 distinct |
| `W1-stutter-exempt` | `StutterOnlyAtomic(c,d,v) => FALSE` | violated | **CLEAN TO CLOSURE**, 9,133 generated / 863 distinct / depth 11 |

W1 is the finding. W3 proves the antecedent is satisfiable, so W1 is not
vacuous by emptiness. W2 proves the probe harness can fail, so W1's
clean verdict is not an artefact of the probe. A knowingly false
obligation about the resolving-create branch survives the entire
closure.

Logs: `probes/_runlogs/W1-stutter-exempt.txt`,
`probes/_runlogs/W2-creating-control.txt`,
`probes/_runlogs/W3-reach-stutter.txt`.

## Scope, stated honestly

The resolving-create case appears **true by inspection**:
`CreateAtomic`'s resolving branch and `SplitComposition`'s non-busy
branch both reduce to `~creators[c].busy /\ UNCHANGED vars`. This
finding is **not** evidence that the bridge is unsound, and it does not
by itself refute the R4 claim. What it refutes is the claim that TLC
checks that half of the bridge.

The same mechanism applies to `Publish`'s refusal branch
(`Catalog.tla:272`, also `UNCHANGED vars`): both `AdmissionSeesResolution`
and `ResolutionMonotonicity` are `[][...]_vars` and are therefore exempt
on every refusal step. Coverage on `Catalog.cap2.cfg` shows the refusal
branch is taken 5,668 times and contributes zero distinct states.

## Why this is not a TLC defect, and what the right shape is

The subscript is not a bug to work around. TLA+ formulas are *required*
to be stuttering-insensitive, and `[A]_vars` exists precisely to make
them so; there is no way to write a temporal action property that
constrains a step which changes nothing. Trying to force one — for
instance by adding a step counter to `vars` — would enlarge the ratified
state space to service the harness, which is the inversion this project
already rejected once in `R4-FINDING-001.md`.

The obligation that got lost is not really about a *step*. "A resolving
create is the split model's stuttering `CreateBegin`" is a claim about
**guard agreement** and about a **function of the state returning the
state**. Both are prime-free. Stated as a state invariant, TLC evaluates
it on every reachable state and no subscript can discharge it.

## Proposed reformulation (tested, with controls)

`probes/BridgeFix.tla` — again `EXTENDS CatalogWire`, edits nothing.

### Proposal 1 — the resolving-create case

```tla
ResolvingCreateAgrees ==
  \A c \in Creators, d \in Daemons, v \in Vals :
    (~creators[c].busy /\ Digest(v) \in ResolvableIds(d)) =>
      /\ CreateBeginEnabled(c, ModelState)
      /\ CreateBeginResult(c, d, v, ModelState) = ModelState
```

Add to `CatalogWire.cfg`'s `INVARIANTS`. It says: wherever
`CreateAtomic` takes its resolving branch, `CreateBegin` is enabled for
the same triple and its result *is* the current state — i.e. it really
does stutter.

### Proposal 2 — the ingress-refusal case

```tla
AdmittedStaysResolvableAtD ==
  \A d \in Daemons : \A k \in DOMAIN data[d] :
    data[d][k] \in ResolvableIds(d)
```

The checkable content of "an unknown identity never enters" is that
every frame sitting in a data journal is resolvable **at that daemon** —
not merely, as `NoAdmissionOnFaith` says, committed somewhere in the
mesh.

### Verdicts

```bash
bash probes/run-probe.sh X1-resolving-agrees      probes/BridgeFix.tla 1
bash probes/run-probe.sh X2-resolving-control     probes/BridgeFix.tla 1
bash probes/run-probe.sh X3-admitted-resolvable   probes/BridgeFix.tla 1
bash probes/run-probe.sh X4-admitted-reset-control probes/BridgeFix.tla 1
bash probes/run-probe.sh X5-noadmission-reset     probes/BridgeFix.tla 1
```

| Probe | What | Required | Actual |
|---|---|---|---|
| `X1` | `ResolvingCreateAgrees`, honest wire model | clean | **clean**, 9,133 / 863 / depth 11 |
| `X2` | control: a `CreateBeginResult` that fails to stutter on a resolvable digest — the exact defect class W1 could not see | violated | **violated, depth 2** |
| `X3` | `AdmittedStaysResolvableAtD`, ratified model | clean | **clean**, 119,145 / 18,295 / depth 16 |
| `X4` | control: same, under `ResettingMirror` | violated | **violated, depth 6** |
| `X5` | ratified `NoAdmissionOnFaith` over the *same* behaviours | clean | **clean**, 163,101 / 21,977 / depth 16 |

X1 with X2 is the point: the state-invariant form catches at depth 2 the
defect class that `[][...]_vars` left undetected across an entire
closure.

X4 with X5 is a second, independent result: `AdmittedStaysResolvableAtD`
is **strictly stronger** than `NoAdmissionOnFaith`, not a restatement of
it. The X4 witness is a 6-state trace — daemon 1 creates value 1;
daemon 2 mirrors it; daemon 2 admits digest 1 on the strength of that
mirrored fact; daemon 2's mirror then resets. The frame in `data[2]` is
no longer resolvable at daemon 2, while remaining committed at daemon 1.
`NoAdmissionOnFaith` cannot see this, and `CatalogBroken.reset.cfg` does
not check `NoAdmissionOnFaith`, so nothing in the ratified gate covers
it today.

Logs: `probes/_runlogs/X1-…` through `probes/_runlogs/X5-…`.

## Does the R4 Go oracle share the blind spot?

**No — verified by reading `proto/go/catalogr4/driver.go`.** Stated
precisely, because it was not executed (see limitation below):

1. `driver.go:233-238` — for `CreateAtomic` the driver reads the real
   daemon's `created` flag and requires it to equal
   `wantCreated := step.Outcome.Branch == "CreateAtomic.created"`. On
   the converged branch this is a **positive** assertion that the daemon
   returned `created:false`.
2. `driver.go:197-211` — after **every** step, including converged and
   refused ones, the driver extracts the full observation (catalog,
   data, resolvable set, mirror) and compares it field-by-field via
   `compareObservations`. A model step that stutters is compared as
   "state must be unchanged", not skipped.
3. `driver.go:313-322` — for `Publish`, the non-admitted branch
   positively asserts `refusalKind(reply) == "unknown-identity"`.

The lockstep oracle compares **absolute states**, so it has no
stuttering exemption to hide in. The blind spot is specific to the TLA
formulation.

**Limitation:** this was established by reading the source, not by
running it. The Go suite could not be executed in this worktree —
`proto/go/go.mod` requires go >= 1.26, the local toolchain is go 1.25.6,
and `GOTOOLCHAIN=local` forbids fetching another. No claim is made about
what the oracle does at runtime; `model_test.go:37-42` asserts the
corpus covers `CreateAtomic.converged` and `Publish.refused`, and that
assertion was **not** re-run here.

## Disposition needed

Not attempted by this team, per the findings-before-fixes rule. The
options as they appear from here:

1. Adopt proposals 1 and 2 as invariants in `CatalogWire.cfg` /
   `Catalog.cfg`, and pair each with the negative control that proves it
   can fail (`X2`, `X4` are ready to be turned into ratified controls in
   the `CatalogBroken*` style).
2. Or downgrade the two prose claims to match what is actually checked:
   say that the resolving case is discharged by inspection, and that
   `AtomicRefinement` checks the creating case only.

What should **not** happen is leaving the prose as it stands. The gate's
credibility rests on the negative controls, and this is a place where
the check silently cannot fail.
