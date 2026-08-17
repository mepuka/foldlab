# Determination — the proof-support briefing, investigated and applied

Status: coordinator investigation of
`docs/research/2026-08-16-proof-support-briefing.md` (the parallel
session's briefing for the REF-1/REF-2a executors), ordered by the
operator 2026-08-17 prior to implementation. Verdict, verification,
then the direct-application map. Rulings extracted at the end were
put to the operator; their outcomes are recorded in the grill record.

## Verdict

The briefing is **sound and adoptable**. Every estate-side citation
was mechanically re-verified on merged main this session (table
below); the external claims carry the briefing's own tiered evidence
with an access-failure ledger whose discipline matches the estate's
RQ standard — including catching and discarding a summarizer-
fabricated definition. Its central identification gives the move
calculus exactly what the operator asked for: a fully specified,
academically supported statement of what the model *is*, with every
inflation refused by the primary sources themselves. Nothing in it
contradicts a ratified decision; three of its findings strengthen
ratified decisions with independent evidence.

**The citable identification, adopted as the model's academic name:**

> The move calculus is a join-semilattice of holder-attributed
> observations — a convergent replicated data type (Shapiro et al.
> 2011) — carried over an op-shaped wire, with arbitration
> (Burckhardt et al., POPL 2014) declared as a constant of the
> protocol value rather than derived from the execution, and with
> the one non-monotone act (close) placed at a declared coordination
> point, exactly where CALM (Ameloot et al., JACM 2013) proves a
> coordination point must exist.

Each clause is licensed by a verified mapping: evidence bags are a
G-Set instance (`runRepairK_perm` is the convergence theorem's
degenerate best case — `repairK_comm` commutes ALL pairs, making the
causal-delivery hypothesis vacuous); the fence is Burckhardt's `ar`
with declared rather than timestamp-derived provenance
(`fence_deterministic` proves schedule-freedom over a fixed bag);
disputes-as-data is the MV-register's read behavior promoted to
holder-attributed state; the revision modes have NO analogue in the
CRDT corpus (absence recorded, not padded).

## Investigation — citation verification

Estate-side (all re-verified on main at d79e3607e, 2026-08-17):

| Briefing claim | Check | Result |
| --- | --- | --- |
| `runRepairK_perm` Model.lean:1808-1810, quoted signature | read in place | **exact** |
| `repairK_comm` :1789-1791 commutes all `WireMove` pairs | read in place | **exact** |
| `fence_deterministic` :1342-1351 | read in place | **exact** |
| `decided_stable` :1460-1462; `single_seat_stable` :1546-1549 | read in place | **exact** |
| `fence_manipulable` Violations.lean:338-349 covers min/plurality only | read in place | **exact** — shipped seat-priority rule analysed nowhere, confirming the gap |
| SpecL1 strong no-loss Spec.lean:39-42 | read in place | **exact** |
| VERIFICATION.md "order-sensitive by design" E2 prose | grep | **present** (line 44) |
| TS merge = `replay(left ++ right)` kernel.ts:413-414 | read in place | **exact** |
| `fenceChoice` iterates declared order, protocol_step.go:349 | read in place | **exact** |
| Estate already disclaims CRDT novelty (learning-by-refutation:432) | read in place | **exact** |
| No `Wire.lean`; five model files | ls + wc | **confirmed** (2,688 lines incl. Moves.lean vs briefing's 2,685 — count-method delta, immaterial) |

External-side: accepted at the briefing's stated tiers. Its own two
caveats are adopted as preconditions here: (1) any Burckhardt quote
entering a RATIFIED document is eye-checked against the PDF first
(ligature extraction); (2) the ephemeral lane experiments (**ran-it**
in session scratch) are re-run before any number from them is
load-bearing — the one consequential example is the absorb-wedge
defect, dispositioned below as a board issue whose first act is
reproduction.

## The determination — direct application

**D-1. Into spec 24 (REF-1, `Moves.Wire`) — an "academic grounding"
section, amending the spec before dispatch:**

1. The model states its identification (the sentence above) with the
   instance relationships: `Moves.Wire` extends a CvRDT whose
   convergence is already proved as `runRepairK_perm`.
2. **The no-network license** (briefing §4.5, verbatim table): all
   four Gomes-et-al. network axioms (`delivery_has_a_cause`,
   `msg_id_unique`, `deliver_locally`, `causal_delivery`) plus
   `histories_distinct` are discharged BY CONSTRUCTION by the
   single-writer CAS journal and content addressing — so `Moves.Wire`
   models no network, stated as a licensed decision with the Isabelle
   axioms as the foil, not as an omission. The table joins the
   spec-mandated closing tour (briefing rec 5.2).
3. **The layer partition is field-precedented**: Gomes et al.'s
   locale layering (abstract convergence / network / instantiation,
   "more than half of our proof… independent of any particular
   replication algorithm") is the same discipline as the spec's
   gated definitions/laws/proofs partition; cite it in the partition
   clause.
4. **Total function, not simulation — now with the field's foil**:
   the equation form is licensed by daemon totalization
   (DEV-671/674/675); Burckhardt's replication-aware simulation and
   seL4's forward simulation are what nondeterministic/stateful
   implementations pay; Gomes's partial `interp ⇀` forces a
   no-failure side thread. Refusal stays a value; `Option` at the
   step seam is a spec smell to report. (Also pre-answers the
   reviewer question "why not simulation?")
5. **Status is a state field** (already ruled via the footprint);
   the REF-4 bridging lemma is now NAMED in the spec so the executor
   leaves its seam without half-building it:
   `statusOfJournal j = s.status` as an invariant of lawful runs —
   the Gomes fold-then-reason-state-locally pattern in miniature.
6. **Recursion discipline: structural, no fuel.** Fuel-indexed
   recursion has no consumer (recursion ban + digest preimage
   infeasibility); any `termination_by` exotica appearing in the
   build is a spec smell to report.
7. **Room, not commitment, for a gated run**: the file layout may
   reserve a seam for a future child-closure gate; stating any
   gated-run theorem is barred until the liveness kind-change is
   ratified (D-5).

**D-2. Into spec 23 (REF-2a) — two corroborations, one already-held
clause confirmed:** DAG-CBOR's independent prohibition of
NaN/infinities joins the spec as a second standards lineage
converging on the float drop; the measured JCS-vs-DAG-CBOR key-order
divergence (length-first vs UTF-16) is recorded as the standing
reason the spec pins "RFC 8785" by name. The opaque-as-definitional
clause the spec already carries is confirmed by the briefing
independently.

**D-3. Into VERIFICATION.md (ratified surface — operator ruling A):**
the E2 bounds prose gains (a) the declared-arbitration sentence with
the Burckhardt citation and the CALM-shaped caveat that declared
close authority (D104) is the retained coordination point — the
false stronger sentence ("the fence removes coordination") is easy
to write and now impossible to write innocently; (b) the
self-supersession bound: with no causal metadata, a holder's
correction of its own fill is indistinguishable from a two-party
disagreement — the trade is better on provenance, worse on
supersession (the MV-register pays version vectors for the
opposite). Precondition: eye-check the Burckhardt quotes.

**D-4. The seat-priority fence profile (operator ruling B):** the
shipped fence has no mechanized profile while the two unshipped
rules do. Theorem-pair sizing per the briefing:
`seatPriorityFenceRule : FenceRule` instance + injection-immunity +
dictatorship lemmas, `Violations.lean`-shaped, existing machinery
only, `fence_deterministic` already covering schedule-freedom. This
is the estate-of-safety through-line applied to the one rule that
actually ships.

**D-5. Pre-registrations and records (operator ruling C, bundled):**
(a) the monotone-gate kind change — any child-closure gate moves the
confluence family from safety to liveness (fair-retry premise),
exceeding VERIFICATION.md's stated bounds; pre-registered in the
grill record before anyone states the theorem. (b) The MPST refusal
page in `docs/design/` — why ordered-interaction metatheory is
refused (nothing blocks; fills total; refusals are data;
Zooid/Demangeon-Honda guarantees rest on ordering and linear
channels the calculus does not have), with the one reusable IOU: a
projection-style theorem relating any future per-seat frontier to
the protocol value. (c) The declinations recorded: Sal (admits SMT
via `MVarId.admit` — the exact channel the hygiene gates refuse;
its existence is external confirmation of brief 22, not a reuse
opportunity), Veil, CSLib, Mathlib-for-REF-1/2a; the
`Multiset`-as-List-mod-Perm seed recorded for a REF-9-class future.
(d) The absorb-wedge defect (single seat + `absorb` + self-differing
value wedges a session permanently open, ran-it in the gap lane)
filed as its own board issue: reproduce first, then disposition —
fix the daemon or ratify the behavior — per the REF-5 pattern; and
REF-1 will make the wedge statable, so the disposition should
precede or ride REF-1.

**D-6. What is NOT adopted, with reasons:** no network locale, no
simulation relation, no fuel, no external Lean frameworks, no
Mathlib for the live slices, no MPST metatheory. Every refusal above
is the briefing's own, checked and endorsed; the zero-dependency
posture stays load-bearing for extraction and the footprint gate.

## Coupling noted, not expanded

The briefing repeatedly cites the same session's
`2026-08-16-orchestration-analysis-synthesis.md` (transport→TLA+
routing, the fence-profile standing question, frontier items). This
determination takes only what the briefing itself carries; the
synthesis document remains uninvestigated and its items unratified —
a separate investigation if the operator wants it.

## Sources

The briefing (read in full); its §8 source roster (external tiers
accepted as stated); `verify/moves/Moves/{Model,Spec,Violations}.lean`,
`VERIFICATION.md`, `packages/moves/src/kernel.ts`,
`proto/go/protod/protocol_step.go`,
`docs/design/2026-08-14-learning-by-refutation.md` — all read in
place on main at d79e3607e, 2026-08-17.
