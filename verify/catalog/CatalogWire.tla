---------------------------- MODULE CatalogWire -----------------------------
(***************************************************************************)
(* The WIRE refinement of Catalog.tla. protod exposes type.create as one   *)
(* request, so the executable action alphabet coarsens split CreateBegin / *)
(* CreateFinish into CreateAtomic. The split actions remain untouched in   *)
(* Catalog.tla: they cover the future multi-handler authority and their    *)
(* stale-CAS branch belongs to ticket 012's journal-kernel conformance.    *)
(*                                                                         *)
(* The bridge, in two checked halves (FINDING-BRIDGE-001 disposition,      *)
(* operator-ratified 2026-08-13): every CREATING step is an uninterrupted  *)
(* legal CreateBegin;CreateFinish pair — checked DIRECTLY by the action    *)
(* property AtomicRefinement.  A RESOLVING create is the split model's     *)
(* stuttering CreateBegin — [][_]_vars discharges stutters, so that half   *)
(* is checked as the STATE invariant ResolvingCreateAgrees, which TLC      *)
(* evaluates on every reachable state and no subscript can exempt.         *)
(* Together every wire behavior is a split behavior up to stuttering and   *)
(* CatalogInd's R3 safety transfers.                                       *)
(*                                                                         *)
(* BrokenAtomicBridge is a TLC sensitivity control. It makes the direct    *)
(* atomic action append a creator-chosen wrong id while SplitComposition   *)
(* continues to use Catalog.tla's real halves. TLC must refute the bridge. *)
(***************************************************************************)
EXTENDS Catalog

CONSTANT BrokenAtomicBridge

BadId(v) == IF v = 1 THEN 2 ELSE 1

CreateAtomic(c, d, v) ==
  /\ ~creators[c].busy
  /\ IF Digest(v) \in ResolvableIds(d)
       THEN UNCHANGED vars
       ELSE IF BrokenAtomicBridge
              THEN /\ catalog' = [catalog EXCEPT ![d] =
                         Append(@, [val |-> v, id |-> BadId(v)])]
                   /\ UNCHANGED <<mirror, data, creators>>
              ELSE /\ catalog' = [catalog EXCEPT ![d] = Append(@, MkFact(v))]
                   /\ UNCHANGED <<mirror, data, creators>>

SplitComposition(c, d, v) ==
  /\ CreateBeginEnabled(c, ModelState)
  /\ LET middle == CreateBeginResult(c, d, v, ModelState) IN
       IF CreatorsOf(middle)[c].busy
         THEN /\ CreateFinishEnabled(c, middle)
              /\ \E next \in CreateFinishResults(c, middle) : Become(next)
         ELSE Become(middle)

CreateAtomicRefinesSplit ==
  \A c \in Creators, d \in Daemons, v \in Vals :
    CreateAtomic(c, d, v) => SplitComposition(c, d, v)

AtomicRefinement == [][CreateAtomicRefinesSplit]_vars

WireNext ==
  \/ \E c \in Creators, d \in Daemons, v \in Vals : CreateAtomic(c, d, v)
  \/ \E d \in Daemons, o \in Daemons : MirrorAdvance(d, o)
  \/ \E d \in Daemons, i \in Ids : Publish(d, i)

WireSpec == Init /\ [][WireNext]_vars

(***************************************************************************)
(* The resolving-create half of the bridge, as a state invariant (probe-   *)
(* tested text from BridgeFix.tla X1/X2: clean on the honest model; a      *)
(* stutter-faking CreateBeginResult is caught at depth 2).  Wherever       *)
(* CreateAtomic's resolving branch is enabled, CreateBegin is enabled for  *)
(* the same triple and its result IS the current state — it really does    *)
(* stutter.                                                                *)
(***************************************************************************)
ResolvingCreateAgrees ==
  \A c \in Creators, d \in Daemons, v \in Vals :
    (~creators[c].busy /\ Digest(v) \in ResolvableIds(d)) =>
      /\ CreateBeginEnabled(c, ModelState)
      /\ CreateBeginResult(c, d, v, ModelState) = ModelState

=============================================================================
