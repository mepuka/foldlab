------------------------------ MODULE BridgeFix -----------------------------
(***************************************************************************)
(* BREAKER PROBE — the PROPOSED checkable reformulations for              *)
(* FINDING-BRIDGE-001, each shipped with a negative control that proves    *)
(* it has teeth where `[][...]_vars` had none.  EXTENDS the ratified       *)
(* CatalogWire; edits nothing.  Not part of any gate: this is evidence     *)
(* offered to whoever owns the disposition, not a repair.                  *)
(*                                                                         *)
(* WHY A STATE INVARIANT IS THE RIGHT SHAPE                                *)
(*                                                                         *)
(* The subscript in `[][A]_vars` is not a TLC defect — TLA+ formulas are   *)
(* required to be stuttering-insensitive, and `[A]_vars` abbreviates       *)
(* `A \/ UNCHANGED vars` for exactly that reason.  There is therefore no   *)
(* way to write a temporal action property that constrains a step which    *)
(* changes nothing.  The obligation being lost is not really about a step: *)
(* "a resolving create is the split model's stuttering CreateBegin" is a   *)
(* claim about GUARD AGREEMENT and about a FUNCTION OF THE STATE returning *)
(* the state.  Both are prime-free.  Stated as a state invariant, TLC      *)
(* evaluates it on every reachable state and it cannot be discharged by a  *)
(* subscript.                                                              *)
(***************************************************************************)
EXTENDS CatalogWire

(***************************************************************************)
(* PROPOSAL 1 — the resolving-create case of AtomicRefinement, restated    *)
(* as a state invariant.  Wherever CreateAtomic's resolving guard holds,   *)
(* CreateBegin is enabled for the same triple and its result IS the        *)
(* current state (i.e. it really does stutter).                            *)
(***************************************************************************)
ResolvingCreateAgrees ==
  \A c \in Creators, d \in Daemons, v \in Vals :
    (~creators[c].busy /\ Digest(v) \in ResolvableIds(d)) =>
      /\ CreateBeginEnabled(c, ModelState)
      /\ CreateBeginResult(c, d, v, ModelState) = ModelState

(***************************************************************************)
(* NEGATIVE CONTROL for proposal 1.  A CreateBeginResult that does NOT     *)
(* stutter on a resolvable digest — precisely the defect the `_vars`       *)
(* subscript hides.  This MUST be refuted; if it is not, the proposed      *)
(* invariant is no better than what it replaces.                          *)
(***************************************************************************)
FaithlessBeginResult(c, d, v, before) ==
  IF Digest(v) \in ResolvableIdsIn(before, d)
    THEN [before EXCEPT ![4][c] =
           [busy |-> TRUE, at |-> d, val |-> v,
            exp |-> Len(CatalogOf(before)[d])]]
    ELSE before

ResolvingCreateAgreesBroken ==
  \A c \in Creators, d \in Daemons, v \in Vals :
    (~creators[c].busy /\ Digest(v) \in ResolvableIds(d)) =>
      FaithlessBeginResult(c, d, v, ModelState) = ModelState

(***************************************************************************)
(* PROPOSAL 2 — the ingress-refusal case, restated as a state invariant.   *)
(* `Publish`'s refusal branch is also `UNCHANGED vars` and therefore also  *)
(* exempt from both action properties.  The checkable content of "an       *)
(* unknown identity never enters" is that every frame sitting in a data    *)
(* journal is resolvable AT THAT DAEMON — not merely, as                   *)
(* NoAdmissionOnFaith says, committed somewhere in the mesh.               *)
(*                                                                         *)
(* This is strictly stronger than NoAdmissionOnFaith, and the strictness   *)
(* is demonstrable: under ResettingMirror both are exposed to the same     *)
(* behaviours, NoAdmissionOnFaith survives (committed evidence is          *)
(* monotone) and this one fails (a daemon's resolvable set is not).        *)
(***************************************************************************)
AdmittedStaysResolvableAtD ==
  \A d \in Daemons : \A k \in DOMAIN data[d] :
    data[d][k] \in ResolvableIds(d)

=============================================================================
