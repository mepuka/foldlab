------------------------------ MODULE CatalogInd ------------------------------
(***************************************************************************)
(* R3 CLAIMED 2026-08-13.  The inductive invariant for the catalog +       *)
(* ingress laws, structured after EffectorInd.tla                           *)
(* (.reference/playground-mech), was checked with Apalache                  *)
(* under DataCap = 0 (data journals UNBOUNDED; catalogs and mirrors are    *)
(* bounded by Convergence itself, not by a cap) via the standard           *)
(* decomposition:                                                          *)
(*                                                                         *)
(*   1. Init => IndInv                    (base;        --length=0)        *)
(*   2. IndInv /\ Next => IndInv'         (consecution; --init=IndInit,    *)
(*                                         --length=1)                     *)
(*   3. IndInv => <each state invariant>  (state safety; --length=0)       *)
(*   4. IndInv /\ Next => AdmissionStep /\ MonotonicityStep                *)
(*                                        (action safety; --length=1)      *)
(*   5. CONTROL: consecution without the CAS-freshness clause MUST fail    *)
(*      (the clause IS the expected-seq CAS; without it Apalache exhibits  *)
(*      a pending create whose absence-check lies, landing a duplicate     *)
(*      fact — Convergence's consecution breaks).                          *)
(*   6. CONTROL: obligation 4 under BlindIngress = TRUE MUST fail (the     *)
(*      refuted ingress refuted again at the induction level).             *)
(*                                                                         *)
(* All six obligations ran with Apalache 0.61.0: 1-4 NoError; 5-6 Error   *)
(* as required.  README.md and CLIMB.md record commands, bounds, timings,  *)
(* and the failed-candidate witnesses.                                      *)
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
(* hypothesis, NOT the reachable set (Apalache Gen).                       *)
(***************************************************************************)
IndInit ==
  /\ catalog = Gen(2)
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
  /\ catalog = Gen(2)
  /\ mirror = Gen(4)
  /\ data = Gen(2)
  /\ creators = Gen(4)
  /\ DOMAIN catalog = Daemons
  /\ DOMAIN mirror = Daemons
  /\ \A d \in Daemons : DOMAIN mirror[d] = Daemons
  /\ DOMAIN data = Daemons
  /\ DOMAIN creators = Creators
  /\ IndInvSansFreshness

================================================================================
