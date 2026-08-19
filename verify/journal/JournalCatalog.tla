---------------------------- MODULE JournalCatalog ----------------------------
(***************************************************************************)
(* THE REFINEMENT.  The catalog model embeds an abstract CAS: CreateBegin   *)
(* snapshots the authority journal's length, CreateFinish appends only if   *)
(* the length is still what was snapshotted, and otherwise conflicts.  This *)
(* module says what that abstract CAS IS — the expected-position append of  *)
(* Journal.tla — and TLC checks the claim instead of leaving the two        *)
(* proofs to overlap.                                                       *)
(*                                                                          *)
(* THE RECEIVED OBLIGATION (R4-FINDING-001, operator-ratified 2026-08-13).  *)
(* Wire conformance for the catalog was re-claimed against a COARSENED map  *)
(* in which create is one atomic action, because protod serializes create   *)
(* and no wire seam can pause it between the resolve-check and the append.  *)
(* The split-CAS branch's conformance obligation moved here, where          *)
(* begin/finish are real separate operations.  It is discharged by the      *)
(* negative control JournalCatalogBroken.cas.cfg: drop the expected-position*)
(* guard and the refinement dies, which is the mechanical statement that    *)
(* the catalog's stale-CAS conflict IS this journal's CAS and nothing else. *)
(*                                                                          *)
(* WHAT IS MAPPED, AND WHAT IS DELIBERATELY NOT.  The catalog daemon is     *)
(* resolve-check ∘ journal.  The journal itself is content-blind: appending *)
(* the same payload twice is lawful there, and convergence (W1/W3) is the   *)
(* daemon's law, enforced above it.  The refinement is therefore claimed    *)
(* against the RESTRICTED create-path spec below — the daemon's discipline  *)
(* over the journal — and not against Journal.tla's whole alphabet.  The    *)
(* journal's extra generality is recorded as an asset, exactly as the       *)
(* catalog's extra generality was: it covers a content-blind append log,    *)
(* storage corruption, and crash recovery, none of which the catalog model  *)
(* can express.                                                             *)
(*                                                                          *)
(* THE FRESH-HANDLE RESTRICTION, stated so it can be argued with.  The      *)
(* catalog's CreateBegin snapshots Len(catalog[d]) — the CURRENT length.    *)
(* The create path here requires the handle head to be the verified tail    *)
(* before a begin, which is what go/journal gives a caller: Append reads    *)
(* j.cursor under the handle mutex, and the cursor is carried to the tail   *)
(* by the append and resync paths.  Two creators still race — both may      *)
(* snapshot the same free position and only one may land — which is the     *)
(* whole point.  What the restriction excludes is a handle appending from a *)
(* head it has not re-verified since another writer moved the tail; that is *)
(* expressible in Journal.tla and is outside the catalog's alphabet.        *)
(*                                                                          *)
(* THE STUTTER HALF.  A converging create (the resolve-check finds the      *)
(* value already committed) changes nothing, and [][_]_vars exempts stutter *)
(* steps — so an action property alone would never check it.  It is checked *)
(* as the STATE invariant ConvergingCreateAgrees, which TLC evaluates on    *)
(* every reachable state and no subscript can exempt.  This is the same     *)
(* two-halves shape the catalog's own wire bridge uses.                     *)
(***************************************************************************)
EXTENDS Journal

CONSTANT BrokenCatalogBridge

ASSUME BrokenCatalogBridge \in BOOLEAN

\* The catalog model's ownership is per daemon; a journal is one authority's.
TheDaemon == 1

(***************************************************************************)
(* The abstraction mapping.  The daemon's AUTHORITY catalog journal IS this *)
(* journal: the fact at a position is the payload stored there, carrying    *)
(* the DERIVED identity (Catalog's Digest is the identity function on       *)
(* values, so a fact is [val |-> p, id |-> p]).  The creators are the       *)
(* appenders, with the handle cursor and the reported outcome hidden — the  *)
(* catalog cannot see them, which is why a post-conflict resync is a        *)
(* catalog stutter.  Mirrors and admitted frames are empty: replication and *)
(* ingress live entirely in the catalog model and have no journal image.    *)
(***************************************************************************)
AbsCatalog ==
  [d \in {TheDaemon} |->
     [i \in 1 .. Len(store) |-> [val |-> store[i].pay, id |-> store[i].pay]]]
AbsMirror   == [d \in {TheDaemon} |-> [o \in {TheDaemon} |-> << >>]]
AbsData     == [d \in {TheDaemon} |-> << >>]
AbsCreators ==
  [w \in Writers |->
     IF pend[w].busy
       THEN [busy |-> TRUE, at |-> TheDaemon,
             val |-> pend[w].pay, exp |-> pend[w].exp]
       ELSE [busy |-> FALSE, at |-> 0, val |-> 0, exp |-> 0]]

C == INSTANCE Catalog WITH
       NumDaemons       <- 1,
       NumCreators      <- NumWriters,
       NumVals          <- NumPayloads,
       DataCap          <- 0,
       BlindIngress     <- FALSE,
       ForgedMirror     <- FALSE,
       AssertedIdentity <- FALSE,
       ResettingMirror  <- FALSE,
       catalog          <- AbsCatalog,
       mirror           <- AbsMirror,
       data             <- AbsData,
       creators         <- AbsCreators

(***************************************************************************)
(* The create path a catalog daemon runs OVER this journal: the             *)
(* resolve-check first (content-addressed convergence — a same-value create *)
(* against a resolvable digest is an observable no-op), then the journal's  *)
(* expected-position snapshot, then the CAS.                                *)
(*                                                                          *)
(* BrokenCatalogBridge is the convergence control: it drops the             *)
(* resolve-check, so the daemon appends a value the catalog already carries *)
(* and the abstraction stops satisfying the catalog's own W1/W3.            *)
(***************************************************************************)
FreshHandle(w) == cur[w] = VerifiedTail(store).cursor

CreateBegin(w, p) ==
  /\ ~pend[w].busy
  /\ FreshHandle(w)
  /\ IF p \in StoredPayloads /\ ~BrokenCatalogBridge
       THEN UNCHANGED vars      \* W3 converge: the existing fact, no append
       ELSE Begin(w, p)

CreateNext ==
  \/ \E w \in Writers, p \in Payloads : CreateBegin(w, p)
  \/ \E w \in Writers : Finish(w)

CreateSpec == Init /\ [][CreateNext]_vars

--------------------------------------------------------------------------------
(***************************************************************************)
(* The refinement, in two checked halves.                                   *)
(***************************************************************************)

\* Half one, the moving steps: every create-path step of the journal IS the
\* catalog step it claims to be, under the mapping above.  CreateBegin
\* refines the catalog's split Begin (the expected-position snapshot), and
\* the journal's CAS — stored, duplicate, and conflict alike — refines the
\* catalog's split Finish.  This is where the split-CAS obligation is
\* discharged: the catalog's stale-CAS conflict has a real implementation
\* here and TLC checks the correspondence step for step.
CreateStepRefinesCatalog ==
  /\ \A w \in Writers, p \in Payloads :
       CreateBegin(w, p) => C!CreateBegin(w, TheDaemon, p)
  /\ \A w \in Writers : Finish(w) => C!CreateFinish(w)

CatalogRefinement == [][CreateStepRefinesCatalog]_vars

\* Half two, the stuttering step: wherever the create path's resolve-check
\* converges, the catalog's CreateBegin is enabled for the same triple and
\* its result IS the current state — it really does stutter, so the
\* subscripted property above loses nothing by exempting it.
ConvergingCreateAgrees ==
  \A w \in Writers, p \in Payloads :
    (~pend[w].busy /\ FreshHandle(w) /\ p \in StoredPayloads) =>
      /\ C!CreateBeginEnabled(w, C!ModelState)
      /\ C!CreateBeginResult(w, TheDaemon, p, C!ModelState) = C!ModelState

\* The initial states agree: an empty journal with idle appenders IS the
\* catalog's initial state under the mapping.
CatalogInitAgrees ==
  (store = << >> /\ \A w \in Writers : ~pend[w].busy) => C!Init

(***************************************************************************)
(* The catalog's OWN laws, checked over the abstraction.  Refinement of the *)
(* step alphabet is one thing; that the catalog's ratified invariants hold  *)
(* of this journal's image is the payoff — the catalog's safety transfers   *)
(* instead of being re-proved here.                                         *)
(***************************************************************************)
CatalogTypeOK                     == C!TypeOK
CatalogConvergence                == C!Convergence
CatalogNaturallyBounded           == C!CatalogNaturallyBounded
CatalogLagIsAbsenceNeverWrongData == C!LagIsAbsenceNeverWrongData
CatalogResolvableOnlyViaCommitted == C!ResolvableOnlyViaCommitted
CatalogNoAdmissionOnFaith         == C!NoAdmissionOnFaith
CatalogResolutionMonotonicity     == C!ResolutionMonotonicity
CatalogAdmissionSeesResolution    == C!AdmissionSeesResolution

================================================================================
