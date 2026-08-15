# Task 48 decisions

Repository-wide D-numbers D70–D79, assigned 2026-08-15 (post-merge
repair) per the numbering rule in `proto/DECISIONS.md`.

### D70. `filled` contains meaning only

Decided: `HoleState.filled` carries only `Value`; holder attribution lives in
ghost journal evidence. Alternatives: retain the original actor in `filled`;
erase attribution entirely. Why: Task 48 Addendum 3 ratified D1, and holder is
provenance rather than denotation. **Load-bearing? yes** — restoring holder to
the meaning constructor would contradict the final surface and its digest.

### D71. Candidates are a canonical holder-attributed pair-set

Decided: represent candidate multiplicity as
`Std.ExtTreeSet (Value × Holder) candidateCmp`. The same pair is idempotent;
distinct holders supporting the same value remain distinct. Candidate storage
and value-choice comparators are separate. Alternatives: value-only finite
sets; ordinary multisets that count redelivery; a fixed finite value universe.
Why: Task 48 Addendum 3 ratified D2; pair identity preserves semilattice merge
while making holder-counting plurality expressible. **Load-bearing? yes** —
redelivery idempotence, plurality, and the manipulation contrast depend on it.

### D72. No prioritized self-revision move

Decided: keep only `fill`, `dispute`, and `decide`; a conflicting fill refuses
and is repaired into a dispute. Alternatives: later commitment wins; add
`revise` as retract-then-fill; let one actor overwrite its prior value. Why:
Task 48 Addendum 3 ratified D3, matching Relative Success/screened admission
without adopting AGM Success. **Load-bearing? yes** — prioritized revision is
order-sensitive and would invalidate the fence discipline.

### D73. Retain journal provenance in a ghost evidence map

Decided: keep the observable `holes` projection exactly as ratified and retain
candidate pairs in `EpistemicState.evidence`. Alternatives: add candidates to
`decided`; add an actor back to `filled`; define provenance through an invented
predecessor; omit the invariant. Why: `WF`, repair, and `no_loss` need durable
provenance after the meaning constructors erase it. **Load-bearing? yes** — the
decision guard alone cannot state terminal preservation.

### D74. Refuse only an empty resulting dispute

Decided: a dispute whose existing-candidate union is empty returns `none`.
Alternatives: admit `disputed ∅`; weaken `WF`; put a nonempty proof inside the
public move. Why: exact admission and nonempty-dispute preservation otherwise
contradict each other on `open + ∅`; all E2 clash repairs remain admitted.
**Load-bearing? yes** — without it `step_preserves_wf` is false in one step.

### D75. Runs quantify over every permutation of a finite intent bag

Decided: `Runs intents terminal` carries an arbitrary permutation and its
complete repaired execution from the all-open state. Alternatives: fix one
schedule; enumerate only two-agent shuffles; model the Effect scheduler. Why:
this gives schedule-universal finite claims without making an interpreter a
claim-bearer. **Load-bearing? yes** — surfaced conflict, no-loss, fence, and
seat results all quantify through it.

### D76. The fence interface is any sound pair-set function

Decided: `FenceRule` is a fixed function of the canonical nonempty pair-set
that selects a represented value. Canonical-min and holder-counting plurality
are instances; plurality breaks ties using the value comparator. Alternatives:
hard-code min into the theorem; expose insertion order; permit an unrepresented
winner. Why: pair-set accumulation, not a particular policy, provides path
independence. **Load-bearing? yes** — it is the generalized Addendum 2 claim
and licenses future declared criteria without a new schedule proof.

### D77. Single-seat stability is value-consistent

Decided: every intent targeting the seat must equal the same idempotent
`fill h v actor`. Alternatives: require only holder equality; prove only a
singleton run. Why: one holder can submit different values or an explicit
dispute, so holder equality alone is a counterexample. **Load-bearing? yes** —
this is the ratified premise under which `filled` cannot un-happen.

### D78. IC4 impossibility includes candidate-selection resoluteness

Decided: `no_fair_resolute_fence` assumes the total rule returns a value
represented by the two-candidate conflict. Alternatives: state only the raw
biconditional; hard-code min. Why: without selection, a third value makes both
sides of the biconditional false and defeats the claimed impossibility.
**Load-bearing? yes** — the premise is what makes the theorem about a fence
rather than an arbitrary constant function.

### D79. Total runners retain an aligned observation for every move

Decided: `runK` and `runRepairK` return the terminal state together with an
input-order list of `(move, admitted?)` observations. Alternatives: return only
the terminal state; return an aggregate success bit; retain only an unlabelled
boolean list. Why: refusal-continuation must remain observable, and `no_lossK`
must identify admitted fills without assuming moves are unique. **Load-bearing?
yes** — dropping move/status alignment would make the vector generator invent
refusal provenance or make admitted-fill accounting ambiguous.

### D85/D86 pointer (2026-08-15, DEV-673)

The absorb semantics (fills total; `runK` and the `no_lossK` pair
retired in favor of the frozen-spec laws) and the empty-offer refusal
are recorded under the DEV-673 heading in `proto/DECISIONS.md`,
numbered at merge per the repo-wide rule. D79's `runK` mention is
historical; the surviving total runner is `runRepairK`, and its
prose-only alignment invariant is now the proved
`runRepairK_alignment` (`spec_alignment`).
