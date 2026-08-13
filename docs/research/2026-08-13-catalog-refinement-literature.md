# Catalog refinement literature: new obligations at the R3/R4 seam

Date: 2026-08-13

Status: research dossier, not a claims-ledger entry

Scope: `verify/catalog/{Catalog,CatalogInd,CatalogWire}.tla`, the R3/R4
evidence recorded in `verify/catalog/README.md`, and the sampled binary bridge
in `proto/go/catalogr4/`

## Executive result

The literature supports the existing, deliberately narrow safety story, but it
also exposes three high-priority obligations that the current bridge does not
state explicitly:

1. `CreateAtomicRefinesSplit` is a **macro-step simulation**: one wire step is
   matched by the two-step move `CreateBegin; CreateFinish`. Calling this
   refinement "up to stuttering" requires a named observation map and a checked
   fact that the intermediate `CreateBegin` state is invisible at that map.
2. `CatalogWire.tla` relates states but does not model operation responses. A
   wire implementation that returns the wrong `created` or refusal result while
   making the right state change can satisfy `AtomicRefinement`. The existing Go
   harness checks some replies, but the formal bridge does not prove a
   response-observing trace refinement, and the R4 corpus contains no
   overlapping client invocation/response histories from which to establish
   linearizability.
3. The binary replay derives its schedules and expected states from a manual Go
   restatement of the TLA transition table. Current corruptions validate the
   observation comparator, not that this restatement still denotes the checked
   TLA relation. Translation validation suggests carrying a transition witness
   tied to the authoritative spec, or checking each sampled step independently.

None of these points decides the separately disputed R3 claim described below.
All three are precise ways to size the R4 statement and to define the next
gates.

This note does not repeat the broad CALM/CRDT/provenance survey in
`docs/research/2026-08-13-literature-resonances.md`. It extracts narrower proof
obligations from primary sources. Each section separates:

- **Source fact** — what the cited paper or specification actually establishes;
- **Foldlab inference** — the proposed application to the present catalog;
- **Proposed test** — an exact predicate, config, or engineering test that can
  fail.

## Current evidence baseline

The baseline below is repository fact, not a literature-derived conclusion.

- The checked-in `origin/main` ledger records a **historical R3 claim** from
  base, one-step consecution, state-safety, and action-safety runs at fixed
  domains of 2 daemons, 3 values, and 2 creators. Later main review found that
  the old `Gen(2)` induction hypothesis under-covered `IndInv`, and current
  HEAD fails Snowcat after R4. Repaired evidence exists only on the in-flight
  exact ref `d76e3948`, not in merged `main`. This dossier therefore treats R3
  as a stale ledger claim awaiting re-certification, not as a present proof.
  The intended scope of that rung was unbounded trace/data-journal depth at
  those fixed cardinalities, never arbitrary cardinalities.
- R4's formal bridge checks `CreateAtomic => SplitComposition` at the R2
  domains. The creating branch composes `CreateBeginResult` with
  `CreateFinishResults`; the resolving branch is the split model's no-op begin.
- `MirrorAdvance` and `Publish` are reused directly in `WireNext` rather than
  independently related.
- The binary corpus contains 131 model-action schedules / 3,079 steps. At the
  client-history level, the driver completes one NATS request before issuing
  the next scheduled action, so the corpus has no overlapping invocations and
  responses. This does not assert that the daemon performs no internal
  concurrent work; that scheduling is simply not observed by this corpus.
- `CatalogWire.tla` has no response variable or external-action label. The Go
  harness observes `created`, catalog/data journals, resolve verdicts, and
  journal heads, but its executable oracle is a second statement of the TLA
  transition table.
- The current reply checks are branch-asymmetric. On a converged atomic create,
  a missing or non-Boolean `created` field is decoded as `false` and accepted.
  On a refused publish, only `refusal.kind == "unknown-identity"` is required;
  top-level `ok`, `admitted`, and the rest of the refusal metadata are ignored.
  These are concrete response-only mutants that leave the state comparator
  green.

## Prioritized testable hypotheses

Passing a row licenses only the statement in the last column. A failed row is a
finding and should retain its minimized witness under the repository's normal
stop rule.

| Priority | ID | Testable hypothesis | Exact refuter | What a pass would license |
|---|---|---|---|---|
| P0 | H1 | `CreateBegin` is a stuttering step under an explicit public observation map, and every `CreateAtomic` step has a split move with the same completed-operation label/result. | `BeginVisibleStutter` is false, or a reply-flip control leaves the present bridge green. | Bounded macro-step trace refinement for completed-operation labels; not separate invocation/response-history refinement. |
| P0 | H2 | Concurrent `type.create` and ingress histories are linearizable to a sequential catalog+ingress object. | A completed history has no legal sequentialization preserving real-time precedence and returned results. | Linearizability only for the tested operation set, concurrency bound, and failure envelope. |
| P0 | H3 | Every semantic R4 branch is independently killable, including no-op/refusal replies. | Any branch-specific mutant survives its directed witness, or the witness never reaches its target branch. | Branch sensitivity for the checked operation/result alphabet and bounds; not completeness or broader schedule coverage. |
| P1 | H4 | Any repaired R3 proof depends on every claimed law, not only CAS freshness and non-blind ingress. | An asserted-identity, forged-mirror, or reset-mirror R3 control returns `NoError` for the obligation it is meant to break. | A complete dependency matrix for the next R3 candidate's invariant clauses/actions. |
| P1 | H5 | The sequence model refines a grow-only join-semilattice of locally known facts; every honest action is inflationary or a stutter at that projection. | `LocalFacts(d) \not\subseteq LocalFacts'(d)` for an honest step, or a reset control does not violate fact-level monotonicity. | A safety corollary about monotone evidence. SEC still requires eventual delivery and termination. |
| P1 | H6 | Catalog safety uses digest collision-freedom only through an explicit injectivity assumption. | A two-value colliding `Digest` does not refute `DigestUnambiguous`, or honest proofs need stronger facts than determinism plus injectivity. | An assumption-parametric content-addressing theorem rather than `Digest(v)=v` by fiat. |
| P2 | H7 | Daemon, creator, and honest-value permutations are automorphisms of the safety model and checked properties. | An explicit swap fails to preserve `Init`, `Next`, or a checked property; a symmetry-reduced run disagrees with the unreduced canary. | Safe TLC symmetry reduction for the exact safety config and proven symmetry sets. |
| P2 | H8 | Violations of each named safety property have a small, property-specific support cutoff after CAS length is preserved by an abstraction. | A larger-bound counterexample cannot be projected to the proposed support, or projection changes a CAS verdict. | Only the proved per-property cutoff; never a global arbitrary-cardinality claim. |
| P0 | H9 | R4 schedules can carry small independently checkable transition certificates tied to the authoritative TLA relation. | A Go-oracle/TLA transition mismatch or a corrupted action, result, intermediate state, observation, or head is accepted by the checker. | Portable transition/observation-consistency evidence. Actual execution provenance additionally requires authenticated capture/attestation or an auditor re-run. |
| P2 | H10 | Under named collision- and second-preimage-resistance assumptions, a companion RFC 9162-style Merkle commitment can prove catalog inclusion and prefix consistency without changing chain identity. | Batch/incremental roots differ, or—under those assumptions and RFC 9162 domain separation—a corrupt proof verifies or a non-prefix history passes consistency verification. | Logarithmic inclusion/prefix evidence for the companion root at tested domains and stated cryptographic assumptions. |

## 1. Refinement mappings, finite abstract moves, and stuttering

### Source facts

Lamport defines a TLA action as a formula over an old and new state. In
*Specifying Systems* §2.2 (printed pp. 16-18), `[A]_v` abbreviates
`A \/ (v' = v)`: a stuttering step is equality of the chosen state expression
`v`, not merely a step an engineer informally regards as internal. Section 8.1
(printed p. 91) states that `[][A]_v` is invariant under inserting or deleting
such stuttering steps.
([official book PDF](https://lamport.azurewebsites.net/tla/book-01-11-10.pdf)).

Abadi and Lamport define a refinement mapping as a state function. Their local
step condition R3 requires every lower-level transition to map to one allowed
higher-level transition **or to equality of the mapped states**; §2.4,
conditions R1-R4 and Proposition 1 then make such a mapping sufficient for
implementation. Their completeness result explains why history or prophecy
variables may be required when a plain state function is insufficient.
([paper DOI](https://doi.org/10.1016/0304-3975%2891%2990224-P),
[official publication page](https://www.microsoft.com/en-us/research/publication/the-existence-of-refinement-mappings/)).

Lynch and Vaandrager use a trace-oriented automaton refinement that is a closer
fit for a coarse action. In §3.1, a concrete step may correspond to a finite
**move** of the abstract automaton with the same external-action trace;
Theorem 3.4 proves that such a refinement implies trace inclusion. Their
forward simulation generalizes the state function to a relation (§3.2,
Theorem 3.10), while the backward form runs the matching condition from a
related target state (§3.3). Ordinary backward simulation yields finite-trace
inclusion; Theorem 3.17 requires the image-finite form for full trace inclusion.
History and prophecy relations are the respective auxiliary constructions in
§5.
([DOI](https://doi.org/10.1006/inco.1995.1134),
[authors' final PDF](https://ir.cwi.nl/pub/1393/1393D.pdf)).

### Foldlab inference

`CreateAtomicRefinesSplit` is not literally Abadi-Lamport R3 over the full
`ModelState`: the absent branch matches two split transitions, and the
intermediate state changes `creators[c]` from idle to busy. It is naturally a
Lynch-Vaandrager finite-move refinement if:

1. the public observation excludes the split creator bookkeeping;
2. unresolved `CreateBegin` is a visible-state stutter with an empty / tau
   external label, followed by `CreateFinish` carrying `Created(fact)`;
3. resolved `CreateBegin` is a visible-state stutter but carries the
   `Existing(fact)` external label itself, because no `CreateFinish` follows;
   and
4. initial states and the unchanged `MirrorAdvance`/`Publish` actions respect
   the same observation and action labeling.

The visible-state part of items 1-3 is true by inspection for a projection such as
`<<catalog, mirror, data>>`, but that projection is not named or checked in
`CatalogWire.tla`. The label/result parts cannot currently be stated because
results are absent
from the TLA state/action alphabet. Thus the existing check is sufficient for
transfer of the named state-safety invariant through the composed action, but
the stronger prose phrase "every wire-model behavior is a split-model behavior
up to stuttering" is under-specified until the external observation is named.

This distinction also tells us when forward simulation is enough. The current
atomic create has a deterministic intermediate split state, so no prophecy is
needed. If a future implementation chooses a linearization outcome based on a
later race and the pre-state does not determine the matching abstract state, a
relational forward/backward simulation or an auxiliary prophecy variable may
be necessary. It should not be introduced preemptively.

### Proposed test: observation-qualified macro refinement

Add a separate experimental module/config, leaving the ratified spec untouched,
with predicates equivalent to:

```tla
Visible(s) == <<CatalogOf(s), MirrorOf(s), DataOf(s)>>

BeginVisibleStutter ==
  \A c \in Creators, d \in Daemons, v \in Vals :
    CreateBeginEnabled(c, ModelState) =>
      LET middle == CreateBeginResult(c, d, v, ModelState) IN
        Visible(middle) = Visible(ModelState)

WireInitMaps == Visible(ModelState) = Visible(InitialSplitState)
```

Retain the existing `CreateAtomic => SplitComposition`, but label actions and
model results:

```text
Create(c,d,v) -> Created(fact) | Existing(fact)
Publish(d,id) -> Admitted(position) | UnknownIdentity(id)
MirrorAdvance(d,o) -> Advanced(position)
```

For the split move, label unresolved `CreateBegin` with tau and its
`CreateFinish` with `Created(fact)`; label the terminal resolved `CreateBegin`
itself with `Existing(fact)`.

Then check, at the stated finite domains, that the abstract move and wire step
have equal completed-operation labels/results and equal final `Visible` state.
This licenses a bounded macro-step trace-refinement statement for that
sequential operation alphabet, not a separate invocation/response-history
refinement. Required controls:

- make absent `CreateBegin` change a visible ghost field: only
  `BeginVisibleStutter` must fail;
- flip `Existing` to `Created` while leaving state unchanged: result refinement
  must fail even though the old `AtomicRefinement` remains green;
- flip unknown publish refusal to an "admitted" response without appending:
  result refinement must fail;
- change the intermediate state supplied to `SplitComposition`: move validation
  must fail.

The first control distinguishes a genuine stuttering argument from mere
agreement on the macro post-state. The two reply controls demonstrate why a
state-only safety refinement is not wire-contract refinement.

## 2. Linearizability is a history property, not a sequential lockstep result

### Source facts

Herlihy and Wing define a history using invocation and response events. In
§2.2 (journal pp. 469-470), a history is linearizable when it can be completed
and made equivalent to a legal sequential history while preserving the
real-time order of non-overlapping operations. Theorem 1 (p. 471) proves
locality: a history is linearizable iff each object projection is linearizable.
([DOI](https://doi.org/10.1145/78969.78972),
[authors' PDF](https://www.cs.cmu.edu/~wing/publications/HerlihyWing90.pdf)).

The definition observes returned values, not only final object state. Pending
invocations may be completed or discarded according to the paper's completion
construction, but every completed operation's response constrains the legal
sequentialization.

### Foldlab inference

At the client-history level, the R4 driver submits one wire operation, awaits
its result/state, and then advances to the next scheduled model action. Its
zero-divergence count therefore validates a sample of non-overlapping client
histories. It does not test two overlapping NATS requests and does not locate or
validate a linearization point between invocation and response. The daemon may
still execute internal work concurrently while serving an individual request;
the corpus neither rules that out nor turns it into a concurrent history test.

The right abstract object is initially the combined catalog+ingress service,
not automatically one object per journal. `Publish` legality depends on catalog
resolution, so Herlihy-Wing locality cannot split catalog and data journals
until a composition theorem accounts for that cross-object guard.

### Proposed engineering test: bounded concurrent history checker

Drive fresh daemons with independent NATS clients and record a monotonic event
sequence of `(client, invocation, response)`. Check each completed history
against a sequential specification containing both state and results. The
checker must search only orders that preserve `response(op1) < invocation(op2)`.

Directed histories should include:

1. two overlapping creates for the same value at one daemon — exactly one
   `Created`, the other `Existing`;
2. two overlapping creates for different values — both `Created`, with journal
   order matching one legal sequentialization;
3. at one daemon whose digest is initially unresolved, create overlapping
   publish of that digest — `Admitted` is legal only in an order where create
   precedes publish; a refusal is legal only in the opposite order;
4. a completed create followed in real time by publish at the same daemon, or
   at a daemon that has already mirrored the fact — refusal is illegal;
5. a pending create at trace cutoff — exercise both allowed completion choices;
6. restart/failure variants only after their invocation/response semantics are
   specified; do not silently treat transport timeout as an operation result.

Exact refuter: emit the smallest history for which no legal total order exists.
Required checker control: alter one returned `Created`/`Existing` or
`Admitted`/refusal value while preserving every observed journal state; the
checker must reject it. This is the response bug that state lockstep cannot see.

A bounded pass licenses only linearizability for the exercised operation set,
client bound, history length, and failure envelope. It is neither liveness nor
an unbounded implementation proof.

## 3. Inductive invariants, bounded symbolic checks, and controls per branch

### Source facts

Konnov, Kukovec, and Tran distinguish two Apalache uses in §12. An inductive
invariant satisfies `Init => Inv` and `Inv /\ Next => Inv'`; the tool checks
consecution transition-disjunct by transition-disjunct. Bounded model checking
instead asks whether a safety violation occurs on a computation of length at
most `k`. The Introduction states that specification parameters are fixed and
states are finite structures.
([DOI](https://doi.org/10.1145/3360549),
[paper PDF](https://ilyasergey.net/CS6213/_static/06-tla/symbolic-tla.pdf),
Introduction, journal p. 123:2; §12, journal pp. 123:20-21).

### Foldlab inference

The historical R3 ledger intended the right *kind* of scope distinction:
consecution removes the trace-length bound but does not quantify over arbitrary
daemon/value/creator cardinalities. It is not current proof evidence, however:
the old `Gen(2)` induction hypothesis was later found to under-cover `IndInv`,
current HEAD fails Snowcat after R4, and the repair at exact ref `d76e3948` is
still in flight. The obligations below target the next merged R3 candidate; a
new claim requires the repaired hypothesis, a clean current-HEAD run, and
freshly recorded controls.

The more useful import is branch-sensitive proof calibration. `Next` is a
disjunction; a proof that never depends on one disjunct or one invariant clause
may stay green after a relevant law is broken. The historical R3 bundle had
controls for CAS freshness and blind ingress. R2 separately refutes asserted
identity, forged mirror, and mirror reset, but there is no corresponding R3
control matrix showing the repaired symbolic consecution/action checks are
sensitive to those branches.

There is also a small corollary candidate: `CatalogNaturallyBounded` should
follow mathematically from per-journal uniqueness in `Convergence` and the
finite `Vals` domain. If the solver needs it as a strengthening lemma, it should
be labeled derived rather than an independent law.

### Proposed tests

Create experimental R3 configs selecting one mutation at a time:

| Config | Mutant | Obligation required to fail |
|---|---|---|
| `CatalogInd.assert.cfg` | `AssertedIdentity = TRUE` | `IndInv` consecution or `StateSafety` through `Convergence` |
| `CatalogInd.forge.cfg` | `ForgedMirror = TRUE` | `IndInv` consecution or `StateSafety` through `LagIsAbsenceNeverWrongData` / `ResolvableOnlyViaCommitted` |
| `CatalogInd.reset.cfg` | `ResettingMirror = TRUE` | `SafetySteps` through `MonotonicityStep` |
| existing blind config | `BlindIngress = TRUE` | `SafetySteps` through `AdmissionStep` |
| existing no-freshness init | remove CAS freshness | `IndInv` consecution through `Convergence` |

Each control must fail on its named clause/action. A different failure is useful
diagnostic evidence but does not complete that matrix cell.

Check the derived lemma separately:

```tla
ConvergenceImpliesNaturalBound ==
  TypeOK /\ Convergence => CatalogNaturallyBounded
```

If it is proved, test whether `CatalogNaturallyBounded` can be removed from the
assumed `IndInv` while remaining in `StateSafety`. If not, record it as an SMT
strengthening rather than a logically independent catalog law.

Finally, run a cheap finite cardinality sweep as refutation search, for example
`D in 1..3`, `V in 1..4`, `C in 1..3`, at a reduced `DataCap`. Any first failure
outside the current point is a finding. A green sweep remains bounded evidence;
it does not upgrade R3 to arbitrary cardinality.

## 4. Data independence, symmetry, and property-specific cutoffs

### Source facts

Ip and Dill's journal abstract states that scalarset operations are restricted
so states have the same future behavior up to permutation, and that the paper's
reduction algorithm is proved sound from a formal semantics of the scalarset
language.
([DOI](https://doi.org/10.1007/BF00625968), abstract; journal pp. 41-75).

The official TLC model-value documentation is more operationally pointed: TLC
does **not** verify a declared symmetry set, and a false declaration can hide an
error. Both the specification and every checked property must be symmetric; the
documentation also warns against using this reduction for liveness checks.
([TLC model values and symmetry](https://tla.msr-inria.inria.fr/tlatoolbox/doc/model/model-values.html)).

Lazić, Newcomb, and Roscoe define data independence as using values of a type
only for storage, input/output, and equality tests (§1 and the formal language
in §3). Their Theorem 5.5 (pp. 32-33) derives parameterized results only for
specified universal fragments of the modal µ-calculus and under their
array-without-reset model; one direction can yield false negatives.
([journal DOI](https://doi.org/10.1017/S1471068404002054),
[paper](https://arxiv.org/abs/cs/0405103), Theorem 5.5).

### Foldlab inference: symmetry is plausible; a cutoff is not automatic

The honest catalog treats daemon, creator, and value identities uniformly:
they are stored, used as function indices, and compared for equality/inequality.
This suggests permutation equivariance. The present numeric encodings and idle
sentinel `0` obscure that structure but do not intentionally use identity
arithmetic.

There are important exceptions:

- `BadId(v) == IF v = 1 THEN 2 ELSE 1` distinguishes values in the bridge
  negative control;
- a config that names one distinguished value is not symmetric in that value
  set;
- reducing the number of values is not justified merely by permutation. CAS
  observes `Len(catalog[d])`, so deleting "irrelevant" values can change an
  expected-position verdict even when their identities are not inspected.

Thus symmetry is an available R2 optimization after an equivariance gate;
cutoffs require an additional projection or counter abstraction that preserves
journal length.

### Proposed test: explicit equivariance before `SYMMETRY`

First replace numeric identities in an experimental module with typed model
values and a distinct `None` sentinel. At the exact configuration to be reduced,
or by a parametric proof covering it, check every transposition `piD`, `piV`,
and `piC`:

```text
Init(s)                  => Init(pi(s))
Next(s,s')               => Next(pi(s),pi(s'))
P(s)                     <=> P(pi(s))
ActionSafety(s,s')       <=> ActionSafety(pi(s),pi(s'))
```

for every checked state/action property `P`. Required control: the value swap
that exchanges `1` with a non-special value must refute equivariance of the
existing `BadId` variant. Only then add property-specific TLC symmetry sets to
honest safety configs. A smaller reduced/unreduced closure is a useful canary,
not authority for a larger configuration; at each actual reduced configuration,
require agreement on verdict and reachable orbit representatives unless the
parametric proof already covers it.

Do not enable value symmetry in a negative-control config that names a
distinguished bad value. Do not carry this optimization into a future liveness
config without a separate soundness argument.

### Candidate support cutoffs to investigate, not assume

The table gives the smallest obvious witness vocabulary, not a theorem.

| Property/control | Candidate support `(daemons, values, creators/clients)` | Main projection obstacle |
|---|---:|---|
| blind ingress / `NoAdmissionOnFaith` | `(1,1,1)` | none beyond preserving the admitted frame |
| asserted identity / `Convergence` | `(1,2,1)` | a wrong id needs a distinct id/value in the present collapsed domain |
| forged mirror / prefix integrity | `(2,2,1)` | preserve origin position and the distinct forged fact |
| mirror reset / resolution monotonicity | `(2,1,1)` | preserve the fact's only resolving path |
| atomic bridge wrong identity | `(1,2,1)` | preserve `BadId`'s distinguished values |
| same-value create linearizability | `(1,1,2)` | preserve invocation/response overlap, not merely two creator states |
| create-vs-publish linearizability | `(1,1,2)` | preserve real-time order and result labels |

A cutoff proof should show: from any counterexample, select the witness
participants/values, map all other values to an `Other` class plus an
`OtherCount` sufficient to preserve sequence length, and obtain a valid smaller
trace that violates the same property. Check the abstraction as a forward
simulation at bounds one larger than each candidate. Exact refuter: a larger
counterexample whose CAS success/conflict result changes under every proposed
projection. Until this projection theorem exists, larger green configurations
are useful search, not parameterized proof.

## 5. The catalog's evidence projection is a semilattice; the journals are not

### Source facts

Shapiro, Preguiça, Baquero, and Zawirski define a join-semilattice and derive
commutativity, idempotence, and associativity of join in §2.3. Definition 4
requires the payload to form a semilattice, merge to compute the least upper
bound, and updates to be inflationary. Theorem 1 states that, **assuming eventual
delivery and termination**, a state-based object satisfying those conditions is
strongly eventually consistent.
([DOI](https://doi.org/10.1007/978-3-642-24550-3_29),
[authors' PDF](https://pages.lip6.fr/Marek.Zawirski/papers/CRDTs-SSS2011.pdf),
§§2.2-2.3, pp. 3-4).

### Foldlab inference

An authority catalog is an ordered sequence and its identity commits that
order. It is not usefully a CRDT under set union. The derived evidence view is:

```text
E_d(s) = Range(catalog[d]) union
         union_o Range(mirror[d][o])
```

Under subset order, these sets form a powerset join-semilattice with union as
join. Honest `CreateFinish` and `MirrorAdvance` are inflationary at `E_d`; a
refusal or resolved create stutters. This is the precise CRDT-shaped corollary.

The existing `ResolutionMonotonicity` tracks only `ResolvableIds(d)`. A
fact-level monotonicity property is strictly sharper if digest collisions are
modeled: removing one of two distinct facts with the same id may leave the id
set unchanged. This connects the semilattice obligation to the digest-assumption
test in the next section.

The theorem does not license SEC for foldlab today. `Catalog.tla` deliberately
has no fairness or eventual-delivery property, and `VERIFICATION.md` explicitly
makes no liveness claim.

### Proposed test: sequence-to-evidence refinement

Add the action property:

```tla
EvidenceMonotonicity ==
  [][\A d \in Daemons : LocalFacts(d) \subseteq (LocalFacts(d))']_vars
```

and an abstract set machine whose state is `evidence[d]`, whose merge is union,
and whose honest updates add facts or stutter. Check that the sequence model
refines the set model through `E_d`. Required controls:

- `ResettingMirror = TRUE` must violate fact-level monotonicity on a directed
  trace where that mirror is the only local copy;
- `ForgedMirror = TRUE` may remain inflationary but must violate
  `ResolvableOnlyViaCommitted` / the refinement's source-evidence condition;
- an overwrite-style merge must violate inflationarity;
- duplicate delivery must be an idempotent stutter at `E_d` even though no
  duplicate authority append is legal.

A pass licenses "local known-evidence state is a grow-only join-semilattice."
Add fairness plus an eventual-delivery action only if an SEC claim is wanted;
then test the liveness assumptions separately.

## 6. Content addressing: expose injectivity, then add optional Merkle evidence

### Source facts

RFC 6920 standardizes hash-based names. Section 2 says name equality includes
the digest algorithm, digest length, and digest bytes. Section 10 limits the
result to a name-data integrity binding and makes the security depend on the
hash strength; it explicitly discusses collisions and second preimages.
([RFC 6920](https://www.rfc-editor.org/rfc/rfc6920.html), §§2 and 10).

RFC 9162 defines a domain-separated binary Merkle tree in §2.1.1. Section 2.1.3
defines inclusion proofs and their verifier; §2.1.4 defines consistency proofs
for the append-only relation between an older prefix and a newer tree, with a
proof-length upper bound of `ceil(log2(n)) + 1` in §2.1.4.1. Its security
analysis requires a hash without known preimage or collision attacks, and the
leaf/internal-node domain separation is load-bearing for second-preimage
resistance.
([RFC 9162](https://www.rfc-editor.org/rfc/rfc9162.html), §§2.1.1,
2.1.3-2.1.4, and 10.2.1).

### Foldlab inference: the current abstraction hides the collision assumption

`Digest(v) == v` and `Ids == Vals` encode determinism and injectivity together.
Production SHA-256 is assumed collision resistant, not mathematically
injective. The current `Convergence` predicate checks `f.id = Digest(f.val)` but
does not state that two committed facts sharing an id have equal values. If the
model admitted a colliding `Digest`, union resolution could alias two values
without violating the current two clauses.

This is not a request to model cryptanalysis. It is a request to expose the
exact assumption on which content-addressed resolution depends and to ship a
negative control showing it is load-bearing.

### Proposed test: assumption-parametric digest model

In an experimental model, separate `Vals` and `Ids` and make `Digest` a constant
function. State:

```tla
DigestInjective ==
  \A x, y \in Vals : Digest(x) = Digest(y) => x = y

DigestUnambiguous ==
  \A f, g \in CommittedFacts : f.id = g.id => f.val = g.val
```

Run the honest R2/R3 obligations under `DigestInjective`. Then use two daemons
and two values with `v1 # v2 /\ Digest(v1) = Digest(v2)`: independently commit
one value at each daemon before either mirror is delivered. (At one daemon, the
second create would resolve the existing digest and not commit a second fact.)
The required result is a minimal violation of `DigestUnambiguous` after both
facts commit. If some catalog theorem survives without injectivity, record that
smaller dependency instead of assuming all laws need collision resistance.

### Proposed optimization: companion Merkle root, never a silent chain rewrite

For an authority journal with canonical fact bytes `D_n`, derive the RFC 9162
tree head `(n, MTH(D_n))` as a companion index. The existing chain head remains
the catalog identity. Required property tests/walls:

1. batch root equals incremental root for every prefix;
2. every generated inclusion proof verifies for its exact `(n, root, index,
   canonical bytes)` tuple;
3. every old/new prefix pair has a valid consistency proof;
4. a non-prefix history with a shared initial entry fails consistency;
5. bit flips in leaf, sibling, index, tree size, old root, and new root are each
   rejected;
6. the implementation uses RFC 9162's leaf/internal-node domain separation;
7. Go and TypeScript verifiers reproduce RFC-defined vectors or a committed
   independently generated corpus.

Under the stated collision- and second-preimage-resistance assumptions, this
buys logarithmic inclusion and prefix evidence. It does not prove that two
clients were shown the same tree head; split-view detection still needs an
external witness/gossip mechanism.

## 7. Translation validation and proof-carrying R4 traces

### Source facts

Pnueli, Siegel, and Singerman define translation validation as validating each
individual translator run rather than proving the translator correct for all
inputs. Their setup requires a common semantic framework, a refinement notion,
and an automatically checked simulation between produced target and source.
([DOI](https://doi.org/10.1007/BFB0054170), pp. 151-166;
[authors' institutional record](https://weizmann.elsevierpure.com/en/publications/translation-validation-2/)).

Necula's proof-carrying code moves proof construction to an untrusted producer
and leaves the consumer with a small proof validator tied to a stated safety
policy. The receiver need not trust how the proof was generated, but the policy,
semantics/verification-condition connection, and checker remain trusted.
([POPL paper DOI](https://doi.org/10.1145/263699.263712), §2, pp. 106-119;
[author's PCC overview](https://people.eecs.berkeley.edu/~necula/pcc.html),
especially “Advantages” and “Implementation”).

### Foldlab inference

The sampled R4 run already has the shape of translation validation: for each
generated model schedule, it validates one execution of the binary. It should
not be described as binary verification beyond those executions.

The current Go oracle both predicts model states and judges the binary. That is
reviewable, and its corrupted-state controls are valuable, but each schedule's
evidence is not a persistent proof object and a later auditor must trust/re-run
the whole harness. More importantly, those controls mutate the expected
observation *after* the Go transition; they establish comparator sensitivity but
do not compare the hand-written Go `Step` relation with `CatalogWire.tla`.
`R4-DECISIONS.md` already marks drift at this seam as load-bearing. The finite
split witness has a compact certificate shape:

```text
before, action, optional middle, after, result,
observed canonical journal entries, recomputed heads
```

For unresolved `CreateAtomic`, `middle` witnesses the tau-labeled
`CreateBegin` and `after` witnesses the `Created`-labeled `CreateFinish`. For
resolved `CreateAtomic`, omit `middle`; `after` witnesses the terminal
`Existing`-labeled `CreateBegin`. Direct `Publish`/`MirrorAdvance` also have no
middle. A small checker can validate that the supplied transcript satisfies the
relation and observation without trusting the schedule generator. It cannot
prove that an untrusted producer obtained that transcript from a real daemon;
execution provenance additionally requires authenticated capture/attestation
or an auditor re-run.

### Proposed test: proof-carrying trace certificate

Specify a canonical certificate grammar and a standalone validator with one
entry point:

```text
validateCatalogTrace(specDigest, initialState, steps)
  -> Valid(finalState, coverage) | Refusal(path, law)
```

The validator must check:

- the exact spec/version digest and domain bounds;
- initial-state well-formedness;
- action enabledness;
- the macro intermediate for atomic create;
- response/action-label equality;
- final visible state after every step;
- canonical journal bytes and every returned chain head;
- coverage tags derived from validated branches, never asserted by the
  producer.

Prefer validating the certificate against the authoritative TLA transition
operators (for example, a constrained per-trace Apalache/TLC check) or a very
small separately reviewed checker. Generating the checker and producer from the
same unreviewed transition code would only prove self-consistency.

Required corruptions, each applied to a directed witness of the affected
branch: action parameter, pre-state, intermediate state, post-state, result,
journal entry, head, step order, and coverage tag. Every corruption must be
rejected on its intended law. In particular, corrupt the reply of a no-op
resolved create and an unknown publish while leaving all states untouched.

A pass makes the 131 carried transition/observation transcripts portable and
independently checkable for model consistency. It does not by itself authenticate
their execution provenance, and proves neither unsampled histories nor
concurrent linearizability.

## Do not claim yet

1. **Do not call `AtomicRefinement` an Abadi-Lamport state refinement mapping
   over full `ModelState`.** It is currently a checked two-step macro
   composition. A trace-refinement statement needs the public observation and
   external-action/result map.
2. **Do not claim wire-response refinement from `CatalogWire.tla`.** Replies are
   absent from that model; a response-only mutant is the decisive control.
3. **Do not claim linearizability from the 131 model-action schedules.** The
   client histories contain no overlapping invocations/responses, so the
   defining real-time history obligation has not been tested. This says nothing
   about whether one request uses internal daemon concurrency.
4. **Do not repeat the historical R3 ledger entry as a current proof.** The old
   `Gen(2)` hypothesis under-covered `IndInv`, current HEAD fails Snowcat after
   R4, and the repair at exact ref `d76e3948` is not merged. Re-certification on
   merged HEAD is required.
5. **After repair, do not infer arbitrary daemon/value/creator cardinalities
   from R3.** One-step consecution can remove the trace-length bound while the
   model parameters remain fixed finite domains.
6. **Do not claim a cutoff from a small-scope sweep or from symmetry.** Symmetry
   quotients equal-sized permuted states. A cutoff relates different
   cardinalities and needs a projection theorem that preserves CAS length.
7. **Do not call the ordered authority journals CRDTs.** Only their derived set
   of locally known evidence has the join-semilattice shape.
8. **Do not claim strong eventual consistency without eventual delivery,
   termination, and the needed fairness assumptions.** The current catalog
   claim is safety-only by design.
9. **Do not claim SHA-256 injectivity.** State collision resistance as an
   assumption and show, with a finite collision control, which theorem depends
   on it.
10. **Do not claim a Merkle root proves a globally unique view.** Inclusion and
   consistency proofs are relative to supplied tree heads; equivocation needs
   witnesses or gossip.
11. **Do not call proof-carrying sampled traces a proof of the binary.** Without
    authenticated capture/attestation or a re-run, they validate the carried
    transcript's transition/observation consistency, not execution provenance.
12. **Do not call the current Go model an independent oracle for the TLA
    relation.** It is a reviewable restatement. The present corruptions test the
    comparator; they do not detect coordinated drift between schedule generation
    and expected-state production inside that restatement.

## Recommended order of attack

1. H1 and H9: name `Visible`, add results/action labels, and make sampled
   transitions independently checkable against the authoritative relation.
   Ship visible-stutter, reply-flip, and Go-oracle/TLA drift controls.
2. H2-H3: add concurrent invocation/response histories and one directed mutant
   per semantic branch. These probe the largest current observational gap.
3. H4 and H6: complete the control matrix for the repaired R3 candidate and
   expose digest injectivity. Both strengthen claim calibration without adding
   machinery.
4. H5: prove the fact-set semilattice projection; keep eventual convergence out
   until replica transport and fairness exist.
5. H7-H8: prove equivariance before taking the symmetry optimization, then
   investigate property-specific cutoffs with a CAS-length-preserving
   abstraction.
6. H10: add logarithmic audit proofs only when an actual consumer needs them.
