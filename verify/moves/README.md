# verify/moves — the E2 move calculus (Lean)

This is the model-level R5 twin of the E2 meaning scheduler
([study record](../../docs/research/2026-08-14-meaning-scheduler-e2.md),
[production dossier §6](../../docs/design/2026-08-14-meaning-primitives-production.md)).
It states the transition system once, quantifies over every admitted finite
interleaving, and checks with Lean 4.33.0 and core `Std` only. There is no
`sorry`, `admit`, user axiom, or compiled-evaluation axiom; `./run.sh`
mechanically restricts every headline theorem and control to the core-clean
footprint `{propext, Classical.choice, Quot.sound}`.

## Ratified model

Task 48's final D1–D3 shape is represented directly:

- `open | filled Value | disputed CandidateSet | decided Value` is meaning.
  In particular, `filled` has no holder field (D1).
- A candidate is `(Value × Holder)`, stored in an extensional finite pair-set
  (D2). Redelivery of the same pair collapses; the same value from distinct
  holders remains two candidates and is counted twice by plurality.
- There is no `revise` move and no prioritized self-revision (D3). A
  conflicting fill is refused and the repair path surfaces a holder-attributed
  dispute; correction requires a later fence decision.
- `EpistemicState.holes` is the meaning projection. Its separate `evidence`
  map is ghost journal provenance used only for `WF`, decision provenance,
  repair, and `no_loss`; it is not part of the meaning digest. This preserves
  holder attribution without putting a holder back into `filled`.
- `decide h v` is admitted only when `v` appears among the disputed pairs.
  Once admitted, `decided v` is an unrevisable, tombstone-like encoding of the
  non-monotone act of closing a hole.

`HoleId`, `Holder`, and `Value` remain opaque. The declared hole carrier is
finite. Values and candidate pairs have separate abstract, transitive,
equality-lawful total comparators: candidate order only canonicalizes storage;
canonical-min and plurality tie-breaking use the declared value comparator.

## Execution model and bounds

`Runs intents terminal` supplies an arbitrary permutation of the finite intent
bag and a complete admitted `runRepair` execution from the all-open state.
The claims therefore cover every finite interleaving, rather than a bounded
schedule sample. Primitive `stepTrace` refuses a whole trace after a refused
move; `runRepair` turns a conflicting fill into the canonical evidence-
preserving dispute before continuing.

The conflict theorem covers exactly two distinct fill values. Fence theorems
cover nonempty, dispute-only bags at one hole. The model is one journal over a
fixed finite hole carrier. It does not model crash recovery, CAS, retries,
leases, liveness, the Effect runtime, watch payloads, protocol writs beyond the
stated seat premise, or code/model correspondence.

## Machine-checked laws

| theorem | law discharged |
| --- | --- |
| `fill_comm` | Primitive fills on distinct holes form an `Option` diamond. |
| `fill_conflict_refused` | A distinct value cannot overwrite `filled`. |
| `conflict_surfaces` | Either order of two conflicting fills exposes a dispute containing both values (with `decided` allowed as the closed surface). |
| `dispute_merge_semilattice` | Pair-set union is commutative, associative, and idempotent. |
| `step_preserves_wf`, `repair_preserves_wf` | Every admitted primitive or repaired move preserves open/filled/disputed/decided evidence laws. |
| `no_loss` | Every fill intent in every complete repaired interleaving is represented by terminal meaning or the evidence retained behind a dispute/decision. |
| `put_put_same`, `put_current` | Same-hole replacement and current-state replacement laws used by the repair proof. |
| `repair_fill_comm` | Canonically repaired fills on distinct holes form a diamond. |
| `clash_repair_admissible` | A refused clash has an admitted repair containing old and new holder-attributed candidates. |
| `clash_repair_confluence` | Both orders of the same two-value clash reach the identical evidence-carrying dispute. |
| `fence_deterministic` | Any sound fixed function of the canonical pair-set is interleaving-independent. |
| `min_fence_deterministic` | Canonical-min is an instance of the general fence law. |
| `plurality_fence_deterministic` | Holder-counting plurality, with value-order tie-break, is another instance. |
| `decided_stable` | No later admitted move changes a decision within the session. |
| `single_seat_stable` | Every interleaving of value-consistent fills by one declared holder leaves the hole open or filled with that value. |
| `no_fair_resolute_fence` | A fence required to select a represented value cannot treat the two sides of a two-value conflict symmetrically. |

The generalized fence result is the local form of Plott path independence:
the pair-set accumulator forgets arrival order before a fixed choice function
runs. It is deliberately stronger than a canonical-min result; future sound
rules inherit interleaving independence without a new schedule proof.

## Negative controls

| control | defect exposed |
| --- | --- |
| `clobber_step`, `clobber_diverges` | Overwrite-on-conflict makes the two explicit opposite-order traces terminate at different fills. |
| `lww_step`, `lww_converges`, `lww_loses` | Deterministic LWW converges for every permutation of the standard conflicting pair, yet erases the losing fill; convergence alone is weaker than `no_loss`. |
| `filled_unstable` | The explicit lawful trace `filled 10 → disputed {10,20}` refutes the naive claim that every fill is stable. |
| `fence_manipulable` | Holder X injects only `(0,X)` through `dispute`; canonical-min changes its winner to 0, while plurality still selects value 10 because A and B support it independently. |

The witnesses are transparent traces in `Moves/Violations.lean`. The two
concrete choice calculations inside `fence_manipulable` are ordinary
kernel-checked proofs: canonical-min tracks the injected zero through the
fold, while plurality derives support counts from the extensional candidate
list and tracks the doubly supported value. No `native_decide` trust enters the
theorem.

## Literature boundary and named defects

The imported stability law is not novel: it matches Threshold Consistency in
*Joining Forces* Definition 6 and the monotone-query condition of Laddad et
al. Foldlab's claim is narrower and specific: stability is declared by the
protocol and proved for `decided`, plus value-consistent single-seat fills.
`decided` is the familiar monotone-metadata/tombstone technique for encoding a
non-monotone act, but here it also makes a deliberate maximal-entrenchment
commitment: a decision is unrevisable within this session.

The refusal/repair discipline is compatible with Relative Success
(Hansson–Fermé–Cantwell–Falappa, 2001) and is closest to Makinson's screened
revision (1997): admission is screened before revision. It does **not** claim
AGM Success, because prioritized acceptance would reintroduce order-sensitive
self-revision and violate D3.

A resolute atomic fence cannot satisfy IC4 symmetry while selecting one of two
represented alternatives. `no_fair_resolute_fence` mechanizes that unavoidable
defect; Konieczny and Pino Pérez supply the IC4 setting, while Moulin's
anonymity/neutrality/resoluteness trilemma explains which property a fixed
tie-break must sacrifice. Canonical-min keeps arrival-order independence but
is manipulable and non-neutral. Plurality defeats the proved one-holder
injection because D2 retains multiplicity by holder.

Canonical byte order also has the separate SIN-M defect identified by Marquis
and Schwind: a symbol re-encoding can change the winner. The model cannot
express that witness honestly because `Value` is opaque and has no encoding or
renaming action. Accordingly it proves comparator-relative determinism, not
language independence.

The research lineage and citations are recorded in
[monotone determinism](../../docs/research/2026-08-14-lit-monotone-determinism.md),
[belief revision and merging](../../docs/research/2026-08-14-lit-belief-revision-merging.md),
and the [literature synthesis](../../docs/research/2026-08-14-lit-synthesis.md).

## Explicit divergences and exclusions

1. **Decision membership guard.** The TypeScript toy accepts any decision on
   a dispute. The model requires the value to appear in the candidate pairs so
   decision provenance and `no_loss` are meaningful.
2. **Empty disputes are refused.** Admitting `open + ∅ → disputed ∅` conflicts
   with the required nonempty-dispute `WF`; all canonical clash repairs are
   nonempty and unaffected.
3. **Ghost evidence is proof state, not meaning.** `decided Value` erases the
   candidate set required to state provenance, while D1 erases the fill actor.
   The journal projection retains only what those proofs need.
4. **Single-seat means value-consistent moves.** Holder equality alone permits
   one holder to submit different values or an explicit dispute. The ratified
   premise requires every targeted intent to be the same `fill h v actor`.
5. **The IC4 theorem includes resoluteness as candidate selection.** The raw
   biconditional alone is satisfiable by returning a third value; requiring the
   result to be represented states the intended impossibility.

This model has no attack relation, reasons, grounded semantics, `UNDECIDED`
outcome, dialogue protocol, conservativity law, cross-hole constraints, trust
or expertise weights, or general belief-revision operator. Those are future
protocol choices, not claims smuggled into Task 48.
