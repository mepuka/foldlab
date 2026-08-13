---------------------------- MODULE WireStutterProbe ------------------------
(***************************************************************************)
(* BREAKER PROBE — proof mechanics, not the system.  Never part of the     *)
(* gate.  EXTENDS the ratified CatalogWire; edits nothing.                 *)
(*                                                                         *)
(* WHAT THIS PROBES                                                        *)
(*                                                                         *)
(* CatalogWire.tla's header claims:                                        *)
(*   "a resolving create is the split model's stuttering CreateBegin"      *)
(* and README.md claims "AtomicRefinement checks that relation directly."  *)
(*                                                                         *)
(* But AtomicRefinement == [][CreateAtomicRefinesSplit]_vars, and          *)
(* [P]_vars == P \/ UNCHANGED vars.  On a step where vars is UNCHANGED,    *)
(* the second disjunct is true and P is never consulted.  The resolving    *)
(* branch of CreateAtomic IS exactly `UNCHANGED vars`.  So the claimed     *)
(* obligation for that branch may be discharged by the subscript rather    *)
(* than by any check on the branch.                                        *)
(*                                                                         *)
(* METHOD.  Isolate each branch of CreateAtomic and pair it with a         *)
(* deliberately FALSE consequent.  A `X => FALSE` bridge is refutable      *)
(* exactly when TLC actually evaluates the bridge on steps where X holds.  *)
(*                                                                         *)
(*   StutterExemptProbe  — false bridge on the RESOLVING branch.           *)
(*     Expected if the subscript exempts the branch: NO VIOLATION.         *)
(*     A clean verdict here means a knowingly-false obligation passed,     *)
(*     i.e. that branch of AtomicRefinement carries no verification load.  *)
(*                                                                         *)
(*   CreatingProbe       — POSITIVE CONTROL: the same false bridge on the  *)
(*     CREATING branch, which is not a stuttering step.                    *)
(*     Expected: VIOLATED.  If this were also clean, the probe harness     *)
(*     itself cannot fail and StutterExemptProbe's clean verdict would     *)
(*     mean nothing.                                                       *)
(*                                                                         *)
(*   ReachStutter        — state invariant used as a REACHABILITY witness: *)
(*     asserts that no reachable state has a value resolvable at a daemon  *)
(*     with an idle creator.  It must be VIOLATED, proving the resolving   *)
(*     branch of CreateAtomic is in fact enabled somewhere reachable — so  *)
(*     StutterExemptProbe's antecedent is satisfiable, not empty.          *)
(***************************************************************************)
EXTENDS CatalogWire

\* The RESOLVING branch of CreateAtomic, isolated verbatim from
\* CatalogWire.tla lines 25-27.
StutterOnlyAtomic(c, d, v) ==
  /\ ~creators[c].busy
  /\ Digest(v) \in ResolvableIds(d)
  /\ UNCHANGED vars

\* The CREATING branch (honest, BrokenAtomicBridge = FALSE), isolated
\* verbatim from CatalogWire.tla lines 25-26, 32-33.
CreatingOnlyAtomic(c, d, v) ==
  /\ ~creators[c].busy
  /\ Digest(v) \notin ResolvableIds(d)
  /\ catalog' = [catalog EXCEPT ![d] = Append(@, MkFact(v))]
  /\ UNCHANGED <<mirror, data, creators>>

FalseBridgeForStutter ==
  \A c \in Creators, d \in Daemons, v \in Vals :
    StutterOnlyAtomic(c, d, v) => FALSE

FalseBridgeForCreating ==
  \A c \in Creators, d \in Daemons, v \in Vals :
    CreatingOnlyAtomic(c, d, v) => FALSE

StutterExemptProbe == [][FalseBridgeForStutter]_vars
CreatingProbe      == [][FalseBridgeForCreating]_vars

\* Reachability witness (must be VIOLATED).
ReachStutter ==
  ~ \E c \in Creators, d \in Daemons, v \in Vals :
      /\ ~creators[c].busy
      /\ Digest(v) \in ResolvableIds(d)

=============================================================================
