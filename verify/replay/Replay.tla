-------------------------------- MODULE Replay --------------------------------
(***************************************************************************)
(* The register protocol executing a workflow DAG — the bounded protocol   *)
(* half of replay soundness (ground-truth increment 3).                    *)
(*                                                                         *)
(* The Lean development (lean/Replay/Core.lean) proves: IF commits are     *)
(* first-wins, ready-guarded, and deterministic in committed inputs, THEN  *)
(* every schedule commits the same values and replay reproduces them.     *)
(* This spec checks, at bounds, that the effector's protocol — claim /     *)
(* lease-expiry steal with fence bump / fence-checked commit — actually    *)
(* implements those step axioms under worker crashes and races: SpecEval   *)
(* (every committed value is the denotation) holds through every           *)
(* interleaving of two workers over the DAG  1 → 3 ← 2.                   *)
(*                                                                         *)
(* Abstractions, stated:                                                   *)
(* - The register per node mirrors the effector: Absent / Claim(owner,    *)
(*   fence) / Done(val, fence). A steal models lease expiry: it bumps the *)
(*   fence and changes owner; the stale owner's commit is then disabled — *)
(*   the fence-only Commit check (effector.go:287), with owner standing   *)
(*   in for fence-holding. Done is terminal (no action leaves it), which  *)
(*   is the proven unique-terminal-outcome law. A worker crash is         *)
(*   invisible: its claim simply becomes stealable — exactly the lease    *)
(*   semantics.                                                            *)
(* - Bodies are fixed constants (node 1 ↦ 1, node 2 ↦ 2,                  *)
(*   node 3 ↦ in1 + 2·in2): deterministic by construction, matching the   *)
(*   Lean hypothesis. Eval(3) = 5.                                        *)
(* - Fences are capped at MaxFence to bound the steal chain (stated cap). *)
(*                                                                         *)
(* The Guard constant flips the faithless variant (transition table       *)
(* stated once):                                                           *)
(*   Guard = "ready"     workers claim only nodes whose preds are Done    *)
(*   Guard = "faithless" workers may claim/commit early; absent inputs    *)
(*                       read a default — the engine shape the Lean       *)
(*                       counterexample (Faithless.lean) kills            *)
(*                                                                         *)
(* Expected verdicts (run.sh):                                             *)
(*   Replay.cfg            clean — TypeOK, SpecEval                       *)
(*   Replay.faithless.cfg  REFUTED on SpecEval — trace committed          *)
(***************************************************************************)
EXTENDS Naturals, FiniteSets

CONSTANTS Guard, MaxFence
ASSUME GuardIsNamed == Guard \in {"ready", "faithless"}
ASSUME FenceCapIsUsable == MaxFence \in Nat /\ MaxFence >= 2

Nodes == 1..3
Workers == {"w1", "w2"}
Preds(n) == IF n = 3 THEN {1, 2} ELSE {}

VARIABLE reg
vars == <<reg>>

Absent == [st |-> "absent"]

Init == reg = [n \in Nodes |-> Absent]

DoneN(n)  == reg[n].st = "done"
ReadyN(n) == \A m \in Preds(n) : DoneN(m)

\* Committed input, defaulting when absent — reachable only when faithless.
InVal(m) == IF DoneN(m) THEN reg[m].val ELSE 0

Body(n) == IF n = 3 THEN InVal(1) + 2 * InVal(2) ELSE n

\* The denotation (the Lean eval, precomputed for this DAG).
Eval(n) == IF n = 3 THEN 5 ELSE n

Claim(w, n) ==
  /\ reg[n].st = "absent"
  /\ (Guard = "ready") => ReadyN(n)
  /\ reg' = [reg EXCEPT ![n] = [st |-> "claim", owner |-> w, fence |-> 1]]

\* Lease expiry: another worker steals, bumping the fence. The previous
\* owner (crashed or slow) is thereby fenced out of committing.
Steal(w, n) ==
  /\ reg[n].st = "claim"
  /\ reg[n].owner # w
  /\ reg[n].fence < MaxFence
  /\ reg' = [reg EXCEPT ![n] =
       [st |-> "claim", owner |-> w, fence |-> reg[n].fence + 1]]

\* Fence-checked commit: only the current fence-holder lands a Done.
Commit(w, n) ==
  /\ reg[n].st = "claim"
  /\ reg[n].owner = w
  /\ reg' = [reg EXCEPT ![n] =
       [st |-> "done", val |-> Body(n), fence |-> reg[n].fence]]

AllDone == \A n \in Nodes : DoneN(n)
Terminating == AllDone /\ UNCHANGED vars

Next == Terminating \/ \E w \in Workers, n \in Nodes :
          Claim(w, n) \/ Steal(w, n) \/ Commit(w, n)

Spec == Init /\ [][Next]_vars

--------------------------------------------------------------------------------

TypeOK ==
  \A n \in Nodes :
    \/ reg[n] = Absent
    \/ /\ reg[n].st \in {"claim"}
       /\ reg[n].owner \in Workers
       /\ reg[n].fence \in 1..MaxFence
    \/ /\ reg[n].st \in {"done"}
       /\ reg[n].val \in Nat
       /\ reg[n].fence \in 1..MaxFence

(* Every committed value is the denotation — the protocol implements the
   Lean step axioms. Refuted when Guard = "faithless". *)
SpecEval == \A n \in Nodes : DoneN(n) => reg[n].val = Eval(n)

================================================================================
