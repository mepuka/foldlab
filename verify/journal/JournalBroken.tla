---------------------------- MODULE JournalBroken -----------------------------
(***************************************************************************)
(* The FAITHLESS variants: the negative controls.  The transition table     *)
(* lives in Journal.tla (stated once; each config flips exactly one law     *)
(* off), so the ratified and faithless models cannot drift apart.  TLC      *)
(* must REFUTE every configuration of this module — a checker that cannot   *)
(* find a planted violation proves nothing by finding none:                 *)
(*                                                                          *)
(*   JournalBroken.cas.cfg      NoCAS             -> WritersNeverFork...    *)
(*   JournalBroken.outcome.cfg  OptimisticOutcome -> AppendIsExactlyOnce... *)
(*   JournalBroken.read.cfg     TrustingRead      -> ReadIsTamperEvident     *)
(*   JournalBroken.adopt.cfg    UnverifiedAdopt   -> OnlyVerifiedHeads...    *)
(*   JournalBroken.restart.cfg  AmnesicRestart    -> RecoveryIsPureStorage   *)
(*                                                                          *)
(* Each counterexample trace is committed beside its config as              *)
(* JournalBroken.*.cex.txt.                                                 *)
(***************************************************************************)
EXTENDS Journal
================================================================================
