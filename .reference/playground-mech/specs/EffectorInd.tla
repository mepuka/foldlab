----------------------------- MODULE EffectorInd ------------------------------
(***************************************************************************)
(* The inductive-invariant proof of the single-key protocol's safety,      *)
(* checked by Apalache (tools/apalache, gitignored; version recorded in    *)
(* docs/research/effector-model-gate.md).                                  *)
(*                                                                         *)
(* TLC's runs are bounded (finite generation caps); this module upgrades   *)
(* SPEC 6.2/6.3 to an UNBOUNDED mechanized proof over arbitrary fences     *)
(* and arbitrary depth, at a fixed owner count, by the standard            *)
(* decomposition into four Apalache obligations:                           *)
(*                                                                         *)
(*   1. Init => IndInv                 (base;        --length=0)           *)
(*   2. IndInv /\ Next => IndInv'      (consecution; --init=IndInit,       *)
(*                                      --length=1)                        *)
(*   3. IndInv => TerminalFenceIsMaximal  (state safety; --length=0)       *)
(*   4. IndInv /\ Next => FencingSafetyStep /\ UniqueTerminalStep          *)
(*      /\ MonotoneStep                (action safety; --length=1)         *)
(*                                                                         *)
(* IndInit generates an ARBITRARY state of the right type (Apalache Gen)   *)
(* constrained only by IndInv, so obligation 2 quantifies over every       *)
(* IndInv state, reachable or not — that is what makes the result          *)
(* unbounded.                                                              *)
(*                                                                         *)
(* The invariant's load-bearing clauses, in protocol terms:                *)
(*   - claim-tracks-max: a live or lapsed claim's fence IS the greatest    *)
(*     generation ever linearized (steals go through the register, so the  *)
(*     register never lags);                                               *)
(*   - freshness: a pending commit whose begin-side snapshot is still      *)
(*     fresh sees the CURRENT register — `fresh` collapses the revision    *)
(*     CAS, so this clause is exactly "the CAS validates the snapshot";    *)
(*   - handle discipline: an active commit's fence handle is its owner's   *)
(*     claim handle (owners are sequential, so the handle cannot move      *)
(*     under an active commit; crash resets both together).               *)
(*                                                                         *)
(* Together: a Finish that writes went through fresh /\ snapFence =        *)
(* usedFence, freshness gives key1.fence = usedFence, claim-tracks-max     *)
(* gives key1.fence = maxFence — the write lands at the maximum            *)
(* generation, which is fencing safety.  This invariant holds ONLY for     *)
(* the single-key protocol: the two-key finish never consults `fresh`,     *)
(* which is precisely the refuted gap.                                     *)
(***************************************************************************)
EXTENDS Effector, Apalache

IndInv ==
  /\ TypeOK
  /\ key1.tag = "absent" => maxFence = 0
  /\ key1.tag = "claim" => key1.fence = maxFence   \* claim-tracks-max
  /\ key1.tag = "done"  => key1.fence = maxFence   \* the safety shadow
  /\ \A o \in Owners:
       LET p == procs[o] IN
       /\ p.hasClaim => p.fence >= 1 /\ p.fence <= maxFence
       /\ p.pend.active =>
            /\ p.hasClaim                          \* handle discipline
            /\ p.pend.usedFence = p.fence
            /\ p.pend.fresh =>                     \* freshness
                 /\ p.pend.snapTag = key1.tag
                 /\ p.pend.snapFence = key1.fence
                 /\ p.pend.snapResult = key1.result

(***************************************************************************)
(* An arbitrary typed state constrained by IndInv — the induction          *)
(* hypothesis, NOT the reachable set.                                      *)
(***************************************************************************)
IndInit ==
  /\ key1 = Gen(1)
  /\ key2 = Gen(1)
  /\ maxFence = Gen(1)
  /\ procs = Gen(4)
  /\ DOMAIN procs = Owners
  /\ IndInv

(***************************************************************************)
(* The safety obligations as step predicates (Apalache action invariants;  *)
(* the [][_]_vars closures of these are what TLC checks in Effector.tla).  *)
(***************************************************************************)
FencingSafetyStep ==
  (Term'.tag = "done" /\ Term.tag /= "done") => Term'.fence = maxFence'

UniqueTerminalStep == Term.tag = "done" => Term' = Term

MonotoneStep == maxFence' >= maxFence

SafetySteps == FencingSafetyStep /\ UniqueTerminalStep /\ MonotoneStep

--------------------------------------------------------------------------------
(***************************************************************************)
(* The identity-free strengthening: safety without ANY process-identity    *)
(* assumption.  IndInv's handle-discipline clause encodes "owners are      *)
(* sequential processes" — an assumption about node identity.  This        *)
(* invariant drops it (and every other coupling between a commit and the   *)
(* identity that started it): what remains is the register algebra plus    *)
(* the freshness lemma, nothing else.  It is checked under                 *)
(* SelfInterleave = TRUE (EffectorIndSelf.cfg): one identity running any   *)
(* number of concurrent workers, the regime where the audit's single-      *)
(* owner two-key counterexample lives.  Proved, it says: fencing safety    *)
(* and unique commitment owe nothing to "one id per node" — identity      *)
(* appears in the state only as payload (who holds, who committed), never  *)
(* as a premise.  Fencing is generations, not identity.                    *)
(***************************************************************************)
IndInvIdentityFree ==
  /\ TypeOK
  /\ key1.tag = "absent" => maxFence = 0
  /\ key1.tag = "claim" => key1.fence = maxFence
  /\ key1.tag = "done"  => key1.fence = maxFence
  /\ \A o \in Owners:
       LET pd == procs[o].pend IN
       pd.active /\ pd.fresh =>
         /\ pd.snapTag = key1.tag
         /\ pd.snapFence = key1.fence
         /\ pd.snapResult = key1.result

IndInitIdentityFree ==
  /\ key1 = Gen(1)
  /\ key2 = Gen(1)
  /\ maxFence = Gen(1)
  /\ procs = Gen(4)
  /\ DOMAIN procs = Owners
  /\ IndInvIdentityFree

--------------------------------------------------------------------------------
(***************************************************************************)
(* Negative controls: a prover that cannot fail proves nothing.            *)
(*                                                                         *)
(* SansFreshness drops the freshness clause and MUST break consecution     *)
(* (Apalache finds a state where a "fresh" commit whose snapshot lies      *)
(* writes Done below maxFence): the clause is load-bearing — it IS the     *)
(* revision CAS.  The second control runs SafetySteps under TwoKey = TRUE  *)
(* (EffectorIndTwoKey.cfg), where the finish never consults `fresh`, and   *)
(* MUST produce the stale-commit counterexample: the refuted protocol      *)
(* refuted again, at the induction level.                                  *)
(***************************************************************************)
IndInvSansFreshness ==
  /\ TypeOK
  /\ key1.tag = "absent" => maxFence = 0
  /\ key1.tag = "claim" => key1.fence = maxFence
  /\ key1.tag = "done"  => key1.fence = maxFence
  /\ \A o \in Owners:
       LET p == procs[o] IN
       /\ p.hasClaim => p.fence >= 1 /\ p.fence <= maxFence
       /\ p.pend.active =>
            /\ p.hasClaim
            /\ p.pend.usedFence = p.fence

IndInitSansFreshness ==
  /\ key1 = Gen(1)
  /\ key2 = Gen(1)
  /\ maxFence = Gen(1)
  /\ procs = Gen(4)
  /\ DOMAIN procs = Owners
  /\ IndInvSansFreshness

================================================================================
