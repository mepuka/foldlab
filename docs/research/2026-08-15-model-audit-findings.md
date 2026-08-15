# Adversarial audit of the two Lean models: verdicts and findings

2026-08-15, operator-commissioned. Two independent adversarial reviews,
read-only, each instructed to refute rather than summarize: one over
`verify/moves/` (the E2 move calculus), one over `verify/ir/` (the TyX
ground-truth model), run before the estate reorganized around them. The
question asked was the operator's, verbatim: is the basic approach
sound and based on solid verifiable math — no fluff.

Both gates ran on the recording machine the same day and passed:
`verify/moves/run.sh` (build + axiom footprint restricted to
`{propext, Classical.choice, Quot.sound}`) and `verify/ir/run.sh`.
The findings below are therefore not about proof failures. Every listed
theorem compiles, kernel-checks, and carries no user axioms. The
findings are about the distance between what the theorem statements
establish and what the surrounding prose claims they establish — which
is exactly where un-mathematical work hides inside mathematical work.

## Verdict: verify/moves — SOUND-WITH-EDGES

What held under attack: WF preservation, evidence monotonicity, the
two-fill clash confluence, dispute-only fence path independence, and
the ghost-evidence design. No hypothesis was found unsatisfiable in the
claims that matter; the per-step lemmas are state-general and usable as
simulation obligations.

### MOVES-1 (high, closed 2026-08-15 by DEV-671). "All finite interleavings" meant "all admitted runs"

At audit time, `Runs` (Model.lean:260) retained only schedules in which no move
was ever refused; `stepTrace` propagated `none`, killing the whole trace. A bag
of three distinct fills at one hole has ZERO admitted runs — the first
two clash into a dispute and the third fill is refused — so `no_loss`
held vacuously over that workload. The daemon refused a move and CONTINUED, so
without a total model a refinement map from daemon histories would be partial
exactly on the contention traces the calculus exists for. The README disclosed
the admitted-runs restriction; the ledger row's "all finite interleavings"
oversold it. The required disposition was a total refusal-aware runner plus a
conformance-vector wall containing refused moves.

Disposition: `stepK` and `repairK` now define refusal as an unchanged-state
`false`, with agreement lemmas tying both outcomes to the unchanged partial
semantics. `runK` and `runRepairK` consume every move and retain an aligned
observation list. `no_lossK` quantifies over arbitrary finite traces and
accounts for every fill as either explicitly refused or retained, while its
admitted case proves terminal preservation even when other moves refuse. The
`refusal_vacuity_exposed` control proves that the three-distinct-fill bag has
no partial `Runs` witness while its total execution records `true, true,
false` and retains both admitted values. This closes the model-totality defect;
the separate daemon↔model refinement map remains unproved, and the vector wall
must still exercise refusals.

### MOVES-2 (high). The IC4 impossibility is a pigeonhole triviality

`no_fair_resolute_fence` (Model.lean:1382) formalizes "fair" as
`f S = v ↔ f S = w`, which every resolute function over two distinct
candidates violates by bare equality reasoning. It cannot distinguish a
fair fence from a maximally biased one. Genuine IC4 neutrality is
invariance under value/holder permutation, which the model's opaque
`Value` cannot express (the README concedes this). Disposition needed:
reclassify from "law discharged" to "definition exercised" in the
ledger and README.

### MOVES-3 (medium-high). Confluence is a point instance, not the claimed strong local confluence

`clash_repair_confluence` (Model.lean:894) equates two specific 2-move
runs from the initial state. No same-hole commutation from arbitrary
reachable WF states; no dispute/dispute, fill/dispute, or decide
diamonds; no global terminal-agreement theorem over `Runs`. Path
independence is established inside three premise classes only: the
2-fill clash from initial, dispute-only single-hole bags, single-seat
value-consistent bags.

### MOVES-4 (medium-high). Dispute attribution is unauthenticated

`step` for `dispute` (Model.lean:142) ignores the actor: any actor may
inject candidates attributed to any holder. The "plurality defeats the
proved injection" story holds for the one scripted attack in
`fence_manipulable`, not as a law — a forger injecting two attributed
pairs manipulates plurality exactly as min was manipulated. The
refinement map owes an attribution-authentication invariant the model
does not have.

### MOVES-5 (medium). Same-value refill discards holder attribution

A second holder confirming the same value leaves `evidence` untouched
(Model.lean:140), so plurality later undercounts support — and the
README's "counted twice by plurality" is true for dispute pair-sets,
false for fills. `no_loss` cannot notice: `TerminalCarries` is
value-level.

### MOVES-6..12 (lower). Recorded for the map's spec

Fence path independence excludes all non-dispute traffic and the
clash→repair→fence pipeline is never composed end to end; the fence
rule is nearly inert in the proof (the content is set accumulation
forgetting order); `decided_stable` is single-step
stability-by-refusal; a dead disjunct in `conflict_surfaces`;
`FiniteCarrier` is an unused hypothesis; `no_loss` vs convergence
docstring is loose; and of the four "negative controls," two
(`clobber_diverges`, `lww_loses`) are genuine dropped-law
falsifications while two (`filled_unstable`, `fence_manipulable`) are
demonstrations against the intact model. Close atomicity — the
daemon's seal + fence + record in one step — is absent from the
model's exclusion list and is a real linearization obligation for the
map.

## Verdict: verify/ir — theorems sound; NOT-A-REFEREE-YET

What held under attack: none of the eight laws is vacuous;
`resolver_mono` is genuine catalog monotonicity, not fuel bookkeeping;
`union_extensional` is genuine set extensionality; the 13-kind skeleton
matches the daemon's grammar exactly; hole-as-type-parameter makes "a
hole never bears identity" structural; every probed abstraction is
disclosed in file headers or the ledger. The model deserves its
"model-level R5, correspondence unproved" row.

What does not yet exist is the referee. Of the three golden-vector
families the ratified plan names — normalization, parse, conformance —
zero can be emitted today:

- **IR-1.** `normalize` does not exist in Lean: no recursive normalize,
  no canonical-byte serializer, no UTF-16 code-unit comparator, no
  idempotence theorem, no congruence lemma lifting
  `sort_preserves_meaning` beyond one node.
- **IR-2.** `parse` does not exist: no Json→Ty walk, no Refusal model
  with kind/law/path coordinates, no WF boundary (the model represents
  terms the walk refuses).
- **IR-3.** The one computable piece (`conforms`, a real Bool function)
  cannot print its inputs (no `Repr`/`DecidableEq` on the mutual
  types), and its fuel makes exhaustion indistinguishable from a
  genuine false verdict — fuel monotonicity and a computable
  sufficient bound are both unstated. `Resolver` as a bare function
  blocks computing any bound; the executable side needs a concrete
  finite catalog plus an acyclicity predicate.
- **IR-4.** `check.args` is dropped from the syntax though args bear
  identity — enter canonical bytes, digests, union sort order. A
  referee without args cannot compute a correct normal form for any
  term containing a check. Literal numerics are `Int`-only; the
  number-normalization fixture rows are out of model.
- **IR-5.** Two decisions block the build and need operator
  ratification first: (a) `check.args` as a canonicalizable payload,
  and the numerics scope; (b) which semantics golden conformance
  verdicts use — the identity semantics (checks invisible, int=float)
  or per-target refinement semantics, which today disagree by
  documented design.

The full work-item list (ten items, ordered, from concrete catalog type
through emission harness) is carried into the dispatch draft
`scratch/dispatch/06-tyx-referee-engine.md`.

## What this means for the ratified focus

The foundation is real mathematics with honestly disclosed bounds —
the audits confirmed the proofs and refuted none of them. The fluff
risk is confined to two places, both now named: prose that claims more
than the statements (MOVES-1 closed by DEV-671; MOVES-2/3 remain
pending disposition), and machinery that is assumed executable but unbuilt
(the referee engine). Neither is a reason to change the lane; both are
the lane's first work items.
