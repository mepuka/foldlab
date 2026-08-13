------------------------------- MODULE CTIProbe -----------------------------
(***************************************************************************)
(* BREAKER PROBE — counterexample-to-induction hunt against the R3          *)
(* inductive invariant, run under TLC as an INDEPENDENT replication of the  *)
(* Apalache obligations.  EXTENDS the ratified Catalog; edits nothing.      *)
(*                                                                         *)
(* WHY THIS EXISTS.  R3's consecution and action-safety obligations were    *)
(* discharged by Apalache over symbolic `Gen` states.  This probe           *)
(* re-derives the same obligations by explicit enumeration under TLC, at    *)
(* smaller but fully stated bounds, over a hypothesis set built from the    *)
(* TYPE structure rather than from reachability.  Agreement is              *)
(* corroboration by an independent tool; disagreement would be a finding    *)
(* against whichever tool is wrong.                                        *)
(*                                                                         *)
(* THE STEP COUNTER.  `probeStep` bounds exploration to exactly one         *)
(* transition, which is what consecution means.  It has a second, deliberate*)
(* effect: because `probeStep` changes on every step, NO step of this probe *)
(* stutters, so `[][A]_pvars` has no stuttering exemption to hide in.  The  *)
(* action obligations are therefore checked with teeth on every step,       *)
(* including steps that leave `vars` unchanged — the exact blind spot       *)
(* recorded in FINDING-BRIDGE-001.                                          *)
(***************************************************************************)
EXTENDS Catalog

VARIABLE probeStep
pvars == <<catalog, mirror, data, creators, probeStep>>

(***************************************************************************)
(* IndInv, copied VERBATIM from CatalogInd.tla lines 29-47.  Copied rather  *)
(* than imported because CatalogInd EXTENDS the Apalache standard module,   *)
(* which TLC does not have.  Any drift between this copy and the ratified   *)
(* definition would invalidate the probe — it is reproduced exactly.        *)
(***************************************************************************)
IndInv ==
  /\ TypeOK
  /\ Convergence
  /\ NoAdmissionOnFaith
  /\ ResolvableOnlyViaCommitted
  /\ LagIsAbsenceNeverWrongData
  /\ CatalogNaturallyBounded
  /\ \A c \in Creators :
       LET p == creators[c] IN
       (p.busy /\ Len(catalog[p.at]) = p.exp) =>
         p.val \notin ValsOf(catalog[p.at])

\* CatalogInd.tla lines 69-79, verbatim.
AdmissionStep ==
  \A d \in Daemons :
    data'[d] # data[d] =>
      /\ Len(data'[d]) = Len(data[d]) + 1
      /\ SubSeq(data'[d], 1, Len(data[d])) = data[d]
      /\ data'[d][Len(data'[d])] \in ResolvableIds(d)

MonotonicityStep ==
  \A d \in Daemons : ResolvableIds(d) \subseteq (ResolvableIds(d))'

(***************************************************************************)
(* The hypothesis generator: arbitrary TYPED states, not reachable ones.   *)
(***************************************************************************)
SeqUpTo(S, n) == UNION { [1..k -> S] : k \in 0..n }

\* Creator records are generated only in the shapes TypeOK admits (idle, or
\* busy at a real daemon with a real value and a non-negative expected
\* position).  This narrows nothing: IndInv conjoins TypeOK, so any other
\* shape would be filtered out immediately.  Facts, by contrast, are
\* generated over the FULL Fact record set — id is NOT forced to equal
\* Digest(val) — so Convergence's identity clause is genuinely exercised
\* by the filter rather than assumed by the generator.
BusyOrIdle == {IdleCreator} \cup
  [busy : {TRUE}, at : Daemons, val : Vals, exp : 0..NumVals]

CatalogSpace  == [Daemons -> SeqUpTo(Fact, NumVals)]
MirrorSpace   == [Daemons -> [Daemons -> SeqUpTo(Fact, 1)]]
DataSpace     == [Daemons -> SeqUpTo(Ids, 1)]
CreatorSpace  == [Creators -> BusyOrIdle]

TypedState ==
  /\ probeStep = 0
  /\ catalog  \in CatalogSpace
  /\ mirror   \in MirrorSpace
  /\ data     \in DataSpace
  /\ creators \in CreatorSpace
  /\ \A d \in Daemons : mirror[d][d] = <<>>

(***************************************************************************)
(* OBLIGATION: consecution and action safety, one step from an arbitrary   *)
(* typed state satisfying IndInv.                                          *)
(***************************************************************************)
CTIInit == TypedState /\ IndInv

CTINext ==
  /\ probeStep = 0
  /\ probeStep' = 1
  /\ Next

CTISpec == CTIInit /\ [][CTINext]_pvars

\* Checked as INVARIANTS: IndInv (consecution).
\* Checked as PROPERTIES: the two below (action safety), with no stuttering
\* exemption because probeStep always changes.
AdmissionSafety     == [][AdmissionStep]_pvars
MonotonicitySafety  == [][MonotonicityStep]_pvars

(***************************************************************************)
(* TARGETED FAMILIES.  Each is checked with INVARIANT ~IndInv: a CLEAN     *)
(* verdict means every state in the family falsifies IndInv, i.e. IndInv   *)
(* excludes the family outright and no CTI can live there.                 *)
(***************************************************************************)
NoStep == UNCHANGED pvars

\* The family probes check this as their invariant. Clean => IndInv is
\* false everywhere in the family, i.e. the family is excluded.
NotIndInv == ~IndInv

\* FAMILY A — a mirror slot holds a fact its origin's catalog lacks at that
\* position: either the mirror runs past its origin, or it disagrees with
\* the origin at a position both have.
FamilyA ==
  /\ TypedState
  /\ \E d \in Daemons : \E o \in Daemons \ {d} :
       \/ Len(mirror[d][o]) > Len(catalog[o])
       \/ \E k \in DOMAIN mirror[d][o] :
            /\ k <= Len(catalog[o])
            /\ mirror[d][o][k] # catalog[o][k]

\* FAMILY B — a busy creator whose remembered expected position runs past
\* its own daemon's journal.
FamilyB ==
  /\ TypedState
  /\ \E c \in Creators :
       /\ creators[c].busy
       /\ creators[c].exp > Len(catalog[creators[c].at])

\* POSITIVE CONTROL — the same typed space with no family restriction.
\* ~IndInv MUST be violated here, proving the family runs above could have
\* failed and that the typed space is not empty.
FamilyControl == TypedState

=============================================================================
