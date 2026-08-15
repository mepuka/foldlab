# Task 48 — verify/moves: the move calculus in Lean, invariants AND violations

Authority: the E2 record + addendum
(docs/research/2026-08-14-meaning-scheduler-e2.md), the production
dossier §6 (docs/design/2026-08-14-meaning-primitives-production.md),
operator ratification 2026-08-14 ("get this modeled in lean so that we
can make sure we truly encode the invariants and the violations").
Base: main. Own worktree, branch codex/moves-model. Scope: NEW directory
verify/moves/ only — clone the verify/ir project shape (lakefile.toml,
lean-toolchain pinned to the SAME version as verify/ir, run.sh gate with
the sorry/axiom grep, README.md). Do not touch verify/ir or scratch/.

## The reference implementation

The model is the machine-checked twin of
`scratch/meaning-scheduler/journal.ts` `step` (the TS file is
scratch-local; its semantics are restated fully below so this spec is
self-contained). If your formalization forces a divergence from the
stated semantics, RECORD it in the README exactly as the estate recorded
the Lean `fixed` rule vs the shipped Go rule — both may satisfy the
walls; only the model rule is proved.

## The model (decisions fixed here; representation is yours)

- `HoleId`, `Holder`, `Value`: opaque types with decidable equality.
  Values carry a total order (standing in for canonical-byte digest
  order); all "smallest candidate" statements use it.
- `HoleState ::= open | filled (v : Value) (by : Holder)
  | disputed (cs : Finset Value) | decided (v : Value)`.
  Candidates are a **Finset** — order-freedom is load-bearing for
  theorem 4, not a convenience.
- `EpistemicState`: a finite map from a fixed hole set to HoleState
  (function over a Fintype or an assoc structure — your choice;
  equality must be extensional over the hole set).
- `Move ::= fill h v by | dispute h (cs : Finset Value) by
  | decide h v`.
- `step : EpistemicState → Move → Option EpistemicState` (none =
  refusal), with EXACTLY these semantics:
  - fill on open → filled; fill on filled with the SAME value →
    some (unchanged, idempotent); fill on filled with a DIFFERENT
    value → none (the conflict refusal); fill on disputed/decided →
    none.
  - dispute on open/filled/disputed → disputed with candidates =
    existing candidates (filled contributes its value; open
    contributes ∅) ∪ cs; dispute on decided → none.
  - decide on disputed with v ∈ cs → decided v; decide on anything
    else, or with v ∉ cs → none. (The v ∈ cs guard is a STRENGTHENING
    over the TS toy, which does not check membership — record this
    divergence in the README as a model-found repair candidate.)
- Traces: `List Move` folded through step (a refused move refuses the
  whole trace for reachability purposes; separately define the E2
  REPAIR semantics below).
- The repair discipline (models the E2 agent loop): an agent intending
  `fill h v` that meets the conflict refusal in a state where
  h = filled w emits `dispute h {w, v}` instead. Model an
  interleaving of agent intent lists under this discipline as a small
  inductive relation `Runs : List Intent → EpistemicState → Prop`
  quantified over ALL interleavings.

## The theorems (all five; names are binding)

1. `fill_comm` (the diamond): for h₁ ≠ h₂, stepping fill h₁ then
   fill h₂ equals stepping fill h₂ then fill h₁ (both defined ↔ both
   defined, and results equal). E2 claim 1's kernel, for ALL states.
2. `conflict_surfaces` (no silent clobber): for every interleaving (via
   `Runs`) of two agents with conflicting fill intents on h (v ≠ w),
   every terminal state has `h ∈ {disputed cs (with {v,w} ⊆ cs)} ∪
   {decided _}` — never `filled v` AND (in another interleaving)
   `filled w` as terminals. Also the local lemma
   `fill_conflict_refused`: step (filled w) (fill h v) = none for
   v ≠ w.
3. `step_preserves_wf`: define `WF` (holes stay in the declared set;
   disputed candidate sets nonempty; decided value was a candidate —
   this last conjunct is why the decide guard exists) and prove every
   step preserves it.
4. `fence_deterministic`: (a) dispute-merge is a semilattice action —
   candidates accumulate commutatively/associatively/idempotently, so
   the terminal candidate set on h is interleaving-independent (state
   and prove via `Runs`); (b) with the decision rule
   `decide h (cs.min ...)`, the decided value is therefore
   interleaving-independent. Together: arrival order cannot leak
   through the fence.
5. `stability` (the addendum's law):
   - `decided_stable`: if s.h = decided v and step s m = some s',
     then s'.h = decided v (for every admissible m).
   - `single_seat_stable`: if s.h = filled v by a, and m is any move
     on h with holder ≠ a... is refused or preserves filled v by a —
     FALSE as stated (dispute by another holder succeeds). State the
     TRUE version: filled is stable iff no other holder moves on h;
     formally, under `Runs` where all moves on h have holder a,
     terminal h ∈ {open, filled _ a}.

## The violations (machine-checked negative controls — required)

- `clobber_step`: the lawless variant (fill on conflicting filled →
  some (filled v), overwrite). Prove `clobber_diverges`: exhibit two
  interleavings of the same conflicting intents with DIFFERENT terminal
  states (constructive witnesses; this is E2 Control A upgraded to a
  theorem).
- `filled_unstable`: exhibit a lawful trace where h passes filled v →
  disputed — the constructive twin of the consumer refutation, proving
  the naive hook's premise false in the model.
- Both witnesses must be `example`/`theorem` with explicit trace terms,
  not `decide`-only opacity, so a reader can see the trace.

## Gate and ledger

- run.sh: copy verify/ir/run.sh verbatim modulo paths (sorry/admit/axiom
  grep BEFORE lake build; that grep is load-bearing — the review found
  a sorry is a warning, not a build error).
- README.md: claim scoping — model scale, single journal, no crash
  model, no CAS/liveness (those are the TLC follow-on, out of scope
  here); the two recorded divergences (decide guard; anything else
  found); the stability law's provenance (E2 addendum).
- VERIFICATION.md: add one row in the models table, honest bounds, after
  the gate passes. Follow the existing row format exactly.
- Root gates untouched and green (`bun run typecheck && bun test`).

## Out of scope

The Effect runtime (interpreter, not claim-bearer). The CAS journal
mechanics and crash/retry (TLC-shaped, later, behind its own gate).
Protocol values and writs beyond the single-seat hypothesis of
theorem 5. Any edit outside verify/moves/ except the single
VERIFICATION.md row.

---

# Addendum 1 (2026-08-14, same day): literature-driven amendments

Authority: the two persisted survey lanes
(docs/research/2026-08-14-lit-monotone-determinism.md,
docs/research/2026-08-14-lit-disputes-argumentation.md) and the
confirmed by-field refutation (E2 record, Addendum 2). Your
value-consistency strengthening of `single_seat_stable` is ACCEPTED —
proceed with that form. These amendments extend the task; nothing
already proved is wasted.

## A. The by-field ruling (coordinator recommendation; operator ratification pending)

CONFIRMED defect: `filled(v, by)` makes semantically idempotent fills
schedule-dependent (probe: 2 digests / 12 schedules). Ruling to
implement: **drop `by` from the filled MEANING state** —
`filled (v : Value)` only. Who filled is provenance; provenance lives in
journal entries, never in the fold state (the two-fold separation
applied one level down). Consequences: fill on filled with the same
value is now truly idempotent (state unchanged, no holder comparison);
`single_seat_stable`'s hypothesis is expressed over the MOVES in the
trace (all fills on h by one holder, value-consistent), not over a
holder recorded in state. If the operator overturns toward attester
sets, the fallback is `filled (vs : Value) (attesters : Finset Holder)`
with join on attesters — do NOT build this speculatively.

## B. New theorem: `no_loss` (claim 2's real teeth)

SEC/convergence does not imply no-loss: a deterministic-LWW clobber
converges on one digest and still silently loses writes. Prove:
**every admissible fill in the trace either (a) has its value in the
terminal state at its hole (filled or decided), or (b) has its value in
the candidate set of a dispute on that hole that a decide resolved (or
that remains disputed at termination).** This is the specification
property `conflict_surfaces` was gesturing at; keep both.

## C. New negative control: deterministic-LWW

Add `lww_step`: fill on conflicting filled → overwrite, winner =
min-by-canonical-order of {old, new} (deterministic!). Prove BOTH:
(1) `lww_converges` — lww runs of the standard conflicting-intents
scenario reach the SAME terminal state under all interleavings
(convergence holds!); (2) `lww_loses` — lww violates `no_loss`
(constructive witness: the losing value appears in no terminal hole and
no candidate set). Together these prove the convergence check alone
cannot defend claim 2 — the control with teeth. Keep the existing
clobber control as well (it fails convergence; lww fails only no_loss).

## D. New theorem: `clash_repair_confluence`

The literature has no theorem for a repairable clash (LVars' error is
terminal). Prove: if `step s (fill h v) = none` because s.h = filled w
(v ≠ w), then the canonical repair `dispute h {w, v}` is admissible in
s, and the repair preserves confluence — i.e., the diamond property
extends to the repaired system (state the composite
"fill-else-dispute" step and prove IT commutes for distinct holes and
converges for same-hole conflicts). This is the run-level content of
`conflict_surfaces`.

## E. Proof-engineering notes (import, do not re-derive)

- Follow the LVars chain shape: independence/frame lemma → diamond →
  STRONG local confluence (one-step joins) → confluence — strong local
  confluence needs no termination hypothesis (no Newman's lemma).
- No renaming metatheory: holes are names, so conclusions are syntactic
  equality of states, strictly stronger than LVars' up-to-permutation.
- README addition: state that `decided` is a monotone encoding of a
  non-monotone act (the tombstone trick), and cite Threshold
  Consistency (Joining Forces Def. 6) + Laddad et al. monotone queries
  as the stability law's prior art; our claim is protocol-declared
  stability, nothing more.

## F. Still OUT of scope for task 48

Attack relations, grounded semantics, UNDECIDED outcomes, dialogue
locutions, conservativity — all real, all queued for the protocol-value
grill, none of it in the move calculus. Task 48 remains: the five
original theorems (with A's ruling applied), plus B, C, D.

---

# Addendum 2 (2026-08-14, same day): merging-lane amendments

Authority: docs/research/2026-08-14-lit-belief-revision-merging.md.
Scope unchanged (verify/moves only). Three new items, one restatement,
one README obligation. The holder-keyed-multiset and `revise` questions
are NOT in this task — they are operator-ratification items; do not
implement speculatively.

## G. Restate `fence_deterministic` as path independence (generalize)

Replace the min-specific statement of theorem 4(b) with the class
theorem: **for ANY fence rule rationalized by a fixed total preorder on
Value (rule = choose the ≤-least candidate for a fixed total preorder
≤), the decided value is interleaving-independent.** min-by-canonical-
order is the instance. Cite Plott path independence in the README.
Every future fence rule inherits order-independence free — the
universal-properties-to-DX move. 4(a) (semilattice candidate
accumulation) is unchanged.

## H. New negative control: `fence_manipulable`

Constructive witness: a trace where agent X, holding NO fill intent
that wins, injects via `dispute h {v_low}` a value with ≺-least order
that no fill ever proposed, and the decide rule selects it. The
`v ∈ cs` guard passes (X put it there). Explicit trace terms, as with
the other controls. This documents that the model's fence trusts the
candidate set's provenance, which the candidate set does not carry.
(If you already require dispute candidates ⊆ previously-filled values,
then prove THAT lemma instead and note the manipulation is thereby
closed at the move-admission layer — either outcome is a result.)

## I. New impossibility lemma: `no_fair_resolute_fence` (IC4)

One-liner class result: there is no total function
f : Finset Value → Value with (∀ v w, v ≠ w →
f {v,w} "agrees with both sides symmetrically") — formalize the
symmetry condition as: no f satisfies
∀ v w, v ≠ w → (f {v,w} = v ↔ f {v,w} = w). State it in the cleanest
form you can prove in a few lines; its role is to upgrade "min is a
placeholder" to "resolute fences necessarily break fairness; min is
forced up to the choice of order." Cite IC4 (Konieczny & Pino Pérez)
and Moulin's trilemma in the README.

## J. README obligations added

- Name Relative Success (Hansson-Fermé-Cantwell-Falappa 2001) as the
  postulate the refusal discipline satisfies; name screened revision
  (Makinson 1997) as the repair discipline's lineage.
- Name the two fence defects precisely: IC4 (violated by necessity —
  no resolute fence avoids it) and SIN-M language-dependence (violated
  by the choice of byte order; the SIN-M witness is NOT required in
  this task — Value is opaque with an abstract total order here, so
  encoding-dependence is not expressible in the model; note this
  scoping honestly).
- Name `decided` as a deliberate maximal-entrenchment commitment
  (decided values are treated as unrevisable within a session).

## K. Explicitly deferred to operator ratification (do not build)

- Holder-keyed multiset candidates (unlocks plurality, the unique
  language-independent operator) vs current Finset (redelivery-
  idempotent, forecloses majority). Interacts with Addendum 1.A.
- The `revise` move class and its postulate fork (Success vs Relative
  Success vs merging-as-now); Success would break fence_deterministic.

---

# Addendum 3 (2026-08-14): D1-D3 ratified — final model shape

The operator ratified the decision sheet (lit-synthesis §4 +
ratification record). Consequences for this task:

1. **D1 CONFIRMED (no longer pending):** `filled (v : Value)` — no
   holder in the meaning state. Addendum 1.A's recommended form is now
   the ratified form; delete any fallback scaffolding.
2. **D2 RATIFIED — candidates carry holders:** dispute candidates
   become `cs : Finset (Value × Holder)` (equivalently a Holder-keyed
   map; pick the Lean-ergonomic encoding). Union is still a
   join-semilattice at the pair level: redelivery (same holder, same
   value) collapses; distinct holders proposing the same value count
   as distinct pairs. Theorem 4(a) (terminal candidate set
   interleaving-independent) restates over the pair-set unchanged.
   Restate theorem 4(b)/G in the cleaner general form this enables:
   **fence_deterministic = 4(a) + (rule is ANY function of the
   canonical pair-set) ⟹ decision interleaving-independent** — this now
   covers plurality (argmax over value of holder-count, ties by the
   declared order) as well as min-by-order. Prove the general form;
   instantiate both rules as corollaries. The `decide` guard becomes
   v ∈ values(cs). `no_loss` restates over values(cs).
3. **D3 RATIFIED:** no revise move in this model; the refusal + dispute
   repair discipline is the committed semantics. README states it:
   "no prioritized self-revision; correction goes through the fence
   (Relative Success — Hansson et al. 2001)."
4. `fence_manipulable` (Addendum 2.H) note: under D2, the control's
   framing sharpens — the injected low-digest candidate now visibly
   carries its injector's holder, so ALSO show the plurality rule is
   immune to this particular attack (one holder = count one) while
   min-by-order is not. Two rules, one attack, different verdicts —
   that contrast is the result.

---

# Acceptance review (2026-08-14, coordinator) — one finding, otherwise ACCEPT

Reviewed at the uncommitted worktree state (foldlab-moves-model). The
development is strong: all twelve theorem obligations plus five
violation controls present; D1-D3 faithfully implemented (ghost
evidence making the two-fold separation explicit in the model is an
elegant touch); Runs honestly quantifies all permutations; the
generalized FenceRule with min + plurality corollaries matches
Addendum 3; the fence_manipulable contrast (min picks injected 0,
plurality picks doubly-supported 10) is exactly the requested result;
README scoping and the VERIFICATION.md row are exemplary — every
coverage limit named; DECISIONS.md records the load-bearing choices
including the empty-dispute refusal and the decide membership guard.
Gate passes.

## FINDING-48-AXIOMS (must fix before merge)

`#print axioms` on the eleven headline theorems: ten are core-clean
(propext, Classical.choice, Quot.sound). `fence_manipulable` carries
two additional `native_decide` axioms (compiled-evaluation trust) from
Violations.lean:157-158 — the two concrete fence-choice calculations.
This breaks the estate's clean-axioms standard, and the run.sh grep
CANNOT see it (native_decide is not an `axiom` declaration — the same
shape as the "a sorry is a warning" gate hole the adversarial review
closed).

Kernel `decide` does not close it: the Decidable instances do not
reduce (ExtTreeSet fold internals). Fix in preference order:
1. Prove the two equalities with lemmas: a `minFold`-is-least lemma
   (if c ∈ cs and no d ∈ cs compares less, minCandidate cs = c) and a
   support-count evaluation for the three-element witness set; or
   restructure the witness set so the existing `*_mem` lemmas plus
   uniqueness close it.
2. If (1) resists: keep native_decide, but then (a) README and the
   VERIFICATION.md row must name the two native axioms explicitly on
   the fence_manipulable line, and (b) run.sh must gain a mechanical
   axiom-footprint check regardless (see below), so the disclosure is
   enforced, not remembered.

## Gate hardening (required either way)

Add to run.sh after `lake build`: generate a temp AxiomCheck.lean with
`#print axioms` for the eleven headline theorems, run
`lake env lean` on it, and fail if the output contains any axiom
outside {propext, Classical.choice, Quot.sound} — with an explicit
allowlist exception only if option (2) is taken. This closes the gap
mechanically for every future edit of this development.

Everything else: ACCEPT as-is. After the fix + gate hardening, commit
on codex/moves-model with the standard gate evidence and report; merge
follows coordinator confirmation of the re-run axiom check.
