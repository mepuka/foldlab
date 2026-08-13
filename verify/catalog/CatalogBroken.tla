---------------------------- MODULE CatalogBroken -----------------------------
(***************************************************************************)
(* The FAITHLESS variants: the negative control.  The transition table     *)
(* lives in Catalog.tla (stated once; each config flips exactly one law    *)
(* off), so the ratified and faithless models cannot drift apart.  TLC     *)
(* must REFUTE every configuration of this module — a checker that cannot  *)
(* find a planted violation proves nothing by finding none:                *)
(*                                                                         *)
(*   CatalogBroken.cfg         BlindIngress      -> NoAdmissionOnFaith     *)
(*   CatalogBroken.forge.cfg   ForgedMirror      -> LagIsAbsence...        *)
(*   CatalogBroken.assert.cfg  AssertedIdentity  -> Convergence            *)
(*   CatalogBroken.reset.cfg   ResettingMirror   -> ResolutionMonotonicity *)
(*                                                                         *)
(* Each counterexample trace is committed beside its config as             *)
(* CatalogBroken*.cex.txt.                                                 *)
(***************************************************************************)
EXTENDS Catalog
================================================================================
