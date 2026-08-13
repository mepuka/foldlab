------------------------------ MODULE CatalogInd ------------------------------
(***************************************************************************)
(* R3 for the catalog + ingress laws, structured after EffectorInd.tla     *)
(* (.reference/playground-mech), checked with Apalache 0.61.0 under        *)
(* DataCap = 0 (no cap on data-journal length in the transition relation)  *)
(* via the standard decomposition:                                         *)
(*                                                                         *)
(*   1. Init => IndInv                    (base;        --length=0)        *)
(*   2. IndInv /\ Next => IndInv'         (consecution; --init=IndInit,    *)
(*                                         --length=1)                     *)
(*   3. IndInv => StateSafety             (TRIPWIRE, not an obligation —   *)
(*      see below;                         --length=0)                     *)
(*   4. IndInv /\ Next => AdmissionStep /\ MonotonicityStep                *)
(*                                        (action safety; --length=1)      *)
(*   5. CONTROL: consecution without the CAS-freshness clause MUST fail    *)
(*      (the clause IS the expected-seq CAS; without it Apalache exhibits  *)
(*      a pending create whose absence-check lies, landing a duplicate     *)
(*      fact — Convergence's consecution breaks).                          *)
(*   6. CONTROL: obligation 4 under BlindIngress = TRUE MUST fail (the     *)
(*      refuted ingress refuted again at the induction level).             *)
(*                                                                         *)
(* ------------------------------------------------------------------------*)
(* THE HYPOTHESIS BOUNDS ARE PART OF THE CLAIM (audit repair 2026-08-13).  *)
(* ------------------------------------------------------------------------*)
(* Apalache's `Gen(k)` bounds what the hypothesis can EXPRESS: a generated *)
(* sequence has length <= k, a generated function has <= k entries, and    *)
(* the bound recurses unchanged into nested structures                     *)
(* (upstream ValueGenerator.scala: genSeq asserts len <= bound; genFun     *)
(* recurses with the same bound).  A Gen bound below a variable's natural  *)
(* maximum therefore discharges the obligation over a STRICT SUBSET of     *)
(* IndInv — silently.  The bounds below are each justified against the     *)
(* natural maximum at these domains:                                       *)
(*                                                                         *)
(*   catalog  = Gen(3)  NumVals = 3, and CatalogNaturallyBounded (a        *)
(*                      conjunct of IndInv) permits Len(catalog[d]) = 3.   *)
(*                      3 is EXACTLY the natural maximum; the domain needs *)
(*                      only |Daemons| = 2 entries.  (Gen(2) — the bound   *)
(*                      used before this repair — could not express a      *)
(*                      length-3 catalog, which is both IndInv-satisfying  *)
(*                      and reachable, so every transition OUT of a full   *)
(*                      catalog went unchecked.)                           *)
(*   mirror   = Gen(4)  LagIsAbsenceNeverWrongData forces mirror[d][o] to  *)
(*                      be a prefix of catalog[o], so its length is <= 3;  *)
(*                      both function levels need only 2 entries.  4 is    *)
(*                      above the natural maximum: stated, not raised.     *)
(*   creators = Gen(4)  a function of |Creators| = 2 entries onto records  *)
(*                      of scalars.  4 is above the natural maximum:       *)
(*                      stated, not raised.                                *)
(*   data     = Gen(2)  data journals are UNBOUNDED in the transition      *)
(*                      relation (DataCap = 0), so NO Gen(k) expresses     *)
(*                      every IndInv state.  This bound is a CUTOFF, and   *)
(*                      the cutoff argument is:                            *)
(*                                                                         *)
(*     `data` occurs in exactly three places in the whole obligation set:  *)
(*     TypeOK's pointwise entry typing, NoAdmissionOnFaith's pointwise     *)
(*     \A k, and AdmissionStep.  No guard reads it — Publish's             *)
(*     `Len(data[d]) < DataCap` is dead at DataCap = 0, and no other       *)
(*     action mentions data at all.  Let sigma satisfy IndInv and let      *)
(*     trunc(sigma) replace every data[d] by <<>>.  Then                   *)
(*       (a) IndInv(trunc(sigma)) holds — the only data conjuncts are      *)
(*           pointwise \A over DOMAIN data[d], vacuous on <<>>, and no     *)
(*           other conjunct mentions data;                                 *)
(*       (b) trunc disables no action — every guard is data-free here;     *)
(*       (c) trunc preserves every violation.  A violation of a conjunct   *)
(*           that does not mention data is untouched.  A violation of      *)
(*           NoAdmissionOnFaith' at index k <= Len(data[d]) is impossible: *)
(*           IndInv(sigma) already put that entry in CommittedIds, and     *)
(*           CommittedIds is monotone (every action only appends to        *)
(*           catalog).  So a NEW violation can only be at the appended     *)
(*           entry, i.e. index 1 of a journal truncated to <<>>; likewise  *)
(*           TypeOK' and AdmissionStep constrain only the appended entry   *)
(*           and the pre-state catalog/mirror, never the earlier entries.  *)
(*     Hence a pre-state data depth of 0 (post-state 1) exhibits every     *)
(*     violation that any depth exhibits: Gen(2) covers the cutoff with    *)
(*     one to spare.  Corroborated empirically by IndInitDataDeep below,   *)
(*     which re-runs consecution at data = Gen(3) — the verdict must not   *)
(*     move.  The argument, not the run, is what licenses the bound.       *)
(*                                                                         *)
(* ------------------------------------------------------------------------*)
(* OBLIGATION 3 IS A TRIPWIRE, NOT AN OBLIGATION.                          *)
(* ------------------------------------------------------------------------*)
(* StateSafety's conjuncts are verbatim a subset of IndInv's, and IndInit  *)
(* conjoins IndInv, so `IndInit => StateSafety` is a propositional         *)
(* tautology: it CANNOT fail, and counting it among the proof obligations  *)
(* overstates the evidence.  It is retained only as a drift tripwire       *)
(* against a FUTURE edit that drops a StateSafety conjunct out of IndInv   *)
(* (or weakens one), which would silently unhook the state invariants      *)
(* from the induction.  It is labelled that way everywhere and is not      *)
(* counted.  The live obligations are 1, 2 and 4; the live controls are    *)
(* 5 and 6.  R3-DECISIONS.md records the choice and the alternative.       *)
(***************************************************************************)
EXTENDS Catalog, Apalache

IndInv ==
  /\ TypeOK
  /\ Convergence
  /\ NoAdmissionOnFaith
  /\ ResolvableOnlyViaCommitted
  /\ LagIsAbsenceNeverWrongData
  /\ CatalogNaturallyBounded
  (*************************************************************************)
  (* CAS-freshness: a pending create whose expected position still holds   *)
  (* has a still-true absence-check on its OWN journal — journals never    *)
  (* shrink, so Len = exp means no append landed since Begin.  This is     *)
  (* the catalog analogue of the effector's `fresh => snapshot current`:   *)
  (* it is what lets CreateFinish append without re-reading, and it is     *)
  (* the clause consecution of Convergence stands on.                      *)
  (*************************************************************************)
  /\ \A c \in Creators :
       LET p == creators[c] IN
       (p.busy /\ Len(catalog[p.at]) = p.exp) =>
         p.val \notin ValsOf(catalog[p.at])

(***************************************************************************)
(* An arbitrary typed state constrained by IndInv — the induction          *)
(* hypothesis, NOT the reachable set (Apalache Gen).  Bounds justified in  *)
(* the header: catalog at its exact natural maximum, mirror and creators   *)
(* above theirs, data at the argued cutoff.                                *)
(***************************************************************************)
IndInit ==
  /\ catalog = Gen(3)
  /\ mirror = Gen(4)
  /\ data = Gen(2)
  /\ creators = Gen(4)
  /\ DOMAIN catalog = Daemons
  /\ DOMAIN mirror = Daemons
  /\ \A d \in Daemons : DOMAIN mirror[d] = Daemons
  /\ DOMAIN data = Daemons
  /\ DOMAIN creators = Creators
  /\ IndInv

(***************************************************************************)
(* The action obligations as step predicates (Apalache action invariants;  *)
(* the [][_]_vars closures are what TLC checks in Catalog.tla).            *)
(***************************************************************************)
AdmissionStep ==
  \A d \in Daemons :
    data'[d] # data[d] =>
      /\ Len(data'[d]) = Len(data[d]) + 1
      /\ SubSeq(data'[d], 1, Len(data[d])) = data[d]
      /\ data'[d][Len(data'[d])] \in ResolvableIds(d)

MonotonicityStep ==
  \A d \in Daemons : ResolvableIds(d) \subseteq (ResolvableIds(d))'

SafetySteps == AdmissionStep /\ MonotonicityStep

StateSafety ==
  /\ Convergence
  /\ NoAdmissionOnFaith
  /\ ResolvableOnlyViaCommitted
  /\ LagIsAbsenceNeverWrongData
  /\ CatalogNaturallyBounded

(***************************************************************************)
(* Negative-control candidate for obligation 5: IndInv minus the          *)
(* CAS-freshness clause.  Consecution from THIS invariant must be          *)
(* refutable, proving the clause load-bearing.                             *)
(***************************************************************************)
IndInvSansFreshness ==
  /\ TypeOK
  /\ Convergence
  /\ NoAdmissionOnFaith
  /\ ResolvableOnlyViaCommitted
  /\ LagIsAbsenceNeverWrongData
  /\ CatalogNaturallyBounded

IndInitSansFreshness ==
  /\ catalog = Gen(3)
  /\ mirror = Gen(4)
  /\ data = Gen(2)
  /\ creators = Gen(4)
  /\ DOMAIN catalog = Daemons
  /\ DOMAIN mirror = Daemons
  /\ \A d \in Daemons : DOMAIN mirror[d] = Daemons
  /\ DOMAIN data = Daemons
  /\ DOMAIN creators = Creators
  /\ IndInvSansFreshness

(***************************************************************************)
(* Data-cutoff insensitivity control.  Identical to IndInit except that    *)
(* the data journals are generated one entry deeper.  The header's cutoff  *)
(* argument says the consecution verdict cannot depend on data depth; this *)
(* is the empirical corroboration of that argument, not its proof.  A      *)
(* verdict that MOVES between IndInit and IndInitDataDeep would refute the *)
(* argument and is a finding, not a nuisance.                              *)
(***************************************************************************)
IndInitDataDeep ==
  /\ catalog = Gen(3)
  /\ mirror = Gen(4)
  /\ data = Gen(3)
  /\ creators = Gen(4)
  /\ DOMAIN catalog = Daemons
  /\ DOMAIN mirror = Daemons
  /\ \A d \in Daemons : DOMAIN mirror[d] = Daemons
  /\ DOMAIN data = Daemons
  /\ DOMAIN creators = Creators
  /\ IndInv

================================================================================
