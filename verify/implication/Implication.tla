------------------------------ MODULE Implication ------------------------------
(***************************************************************************)
(* The projection walls for relational refusals: W-COHERENCE and W-SCOPE,  *)
(* model-checked over every union submission at the bounds.               *)
(*                                                                         *)
(* Source of truth: docs/research/2026-08-14-implication-refusals-         *)
(* formalized.md §4-§5, modeling the union-member-uniqueness law and its   *)
(* refusal constructor (proto/go/protod/walk.go:165-177), which sorts a    *)
(* local copy of the members and reports the duplicate's SORTED index as   *)
(* a path into the SUBMITTED term. Refusal paths are defined over the      *)
(* submitted term (the walk runs before normalization, catalog.go:138).    *)
(*                                                                         *)
(* Abstractions, stated so they can be argued with:                        *)
(* - A union member is its canonical-byte RANK: byte-equal after           *)
(*   normalization iff equal rank. Rank 0 is {"k":"bool"}, rank 1 is       *)
(*   {"k":"string"} in the executed counterexample of the note (§5).       *)
(* - Members == {0,1}: two ranks suffice to exhibit the defect and to      *)
(*   exhaust the decision structure at the bounds; SortedCopy is the       *)
(*   two-value counting sort, valid exactly for this member set.           *)
(* - One certify step; no catalog, no journal. The laws checked here are   *)
(*   properties of one reply's report, not of the store.                   *)
(*                                                                         *)
(* The transition table is stated ONCE. The shipped (faithless) variant    *)
(* is reached by flipping the Rule constant in a config, never by a        *)
(* second module:                                                          *)
(*   Rule = "submitted"  the repaired projection (the coordinate law)      *)
(*   Rule = "sorted"     the constructor as shipped on main               *)
(*                                                                         *)
(* Expected verdicts (the run.sh gate):                                    *)
(*   Implication.cfg                    clean: TypeOK, WCoherence,         *)
(*                                      WScope, WDecision all hold         *)
(*   Implication.shipped-coherence.cfg  REFUTED on WCoherence              *)
(*   Implication.shipped-scope.cfg      REFUTED on WScope                  *)
(*   Implication.shipped-decision.cfg   PASSES WDecision: the defect is    *)
(*                                      report-only — both rules refuse    *)
(*                                      exactly the duplicate-bearing      *)
(*                                      submissions (checked at bounds;    *)
(*                                      the unbounded statement is the     *)
(*                                      one gap the Lean side leaves open) *)
(***************************************************************************)
EXTENDS Naturals, Sequences, FiniteSets

CONSTANTS MaxLen, Rule

ASSUME MaxLenIsUsable == MaxLen \in Nat /\ MaxLen >= 3
ASSUME RuleIsNamed == Rule \in {"submitted", "sorted"}

Members == {0, 1}

\* Sentinel: real reports have path >= 2 (a duplicate needs an earlier twin).
NoRef == [path |-> 0, got |-> 0]

Subs == UNION { [1..n -> Members] : n \in 0..MaxLen }

Min(S) == CHOOSE x \in S : \A y \in S : x <= y

(* The local sorted copy (walk.go:167-169) — counting sort, valid for
   Members = {0,1}. Validation only; the submitted sequence is never
   rewritten, which is exactly why an index into this copy is in the
   wrong coordinate system. *)
Count0(s) == Cardinality({i \in DOMAIN s : s[i] = 0})
SortedCopy(s) == [i \in DOMAIN s |-> IF i <= Count0(s) THEN 0 ELSE 1]

(* The shipped rule (walk.go:170-176): first adjacent duplicate in the
   sorted copy; report that index and that value. *)
AdjDupIdxs(s) == {k \in DOMAIN s : k >= 2 /\ s[k-1] = s[k]}
ShippedRefusal(s) ==
  LET sc == SortedCopy(s) IN
  IF AdjDupIdxs(sc) = {} THEN NoRef
  ELSE LET k == Min(AdjDupIdxs(sc)) IN [path |-> k, got |-> sc[k]]

(* The repaired rule: least SUBMITTED index having an equal earlier
   member; report it with the submitted member at that index. *)
ScopeIdxs(s) == {j \in DOMAIN s : \E i \in DOMAIN s : i < j /\ s[i] = s[j]}
FixedRefusal(s) ==
  IF ScopeIdxs(s) = {} THEN NoRef
  ELSE LET j == Min(ScopeIdxs(s)) IN [path |-> j, got |-> s[j]]

HasDup(s) == ScopeIdxs(s) # {}

Refusal(s) == IF Rule = "sorted" THEN ShippedRefusal(s) ELSE FixedRefusal(s)

--------------------------------------------------------------------------------

VARIABLES sub, refusal, phase
vars == <<sub, refusal, phase>>

Init == /\ sub \in Subs
        /\ refusal = NoRef
        /\ phase = "submitted"

Certify == /\ phase = "submitted"
           /\ phase' = "decided"
           /\ refusal' = Refusal(sub)
           /\ UNCHANGED sub

Done == /\ phase = "decided"
        /\ UNCHANGED vars

Next == Certify \/ Done

Spec == Init /\ [][Next]_vars

--------------------------------------------------------------------------------

TypeOK == /\ sub \in Subs
          /\ phase \in {"submitted", "decided"}
          /\ \/ refusal = NoRef
             \/ refusal \in [path : 1..MaxLen, got : Members]

Refused == phase = "decided" /\ refusal # NoRef

(* W-COHERENCE: the reported path addresses the submitted term and `got`
   is what arrived there (SPEC.md W7, made a machine-checked law). *)
WCoherence == Refused => /\ refusal.path \in DOMAIN sub
                         /\ sub[refusal.path] = refusal.got

(* W-SCOPE: the reported path is a member of the violation's scope, in
   submitted coordinates — the later element of a real duplicate pair. *)
WScope == Refused => refusal.path \in ScopeIdxs(sub)

(* W-DECISION: the accept/refuse decision is projection-independent —
   refusal emitted iff a duplicate exists. Holds under BOTH rules: the
   shipped defect corrupts the report, never the decision. *)
WDecision == phase = "decided" => ((refusal # NoRef) <=> HasDup(sub))

================================================================================
