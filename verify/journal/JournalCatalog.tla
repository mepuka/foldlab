---------------------------- MODULE JournalCatalog ----------------------------
(***************************************************************************)
(* The refinement into the catalog model: the catalog's abstract CAS IS    *)
(* this journal.  The catalog model states create as a resolve-check that  *)
(* snapshots an expected append position, then a CAS at that position;     *)
(* this module exhibits the mapping under which every journal step is a    *)
(* catalog step or a stutter, so the two proofs compose instead of         *)
(* overlapping and the catalog's safety is not re-proved here.             *)
(*                                                                         *)
(* Catalog.tla is READ, never copied: the gate puts verify/catalog on the  *)
(* module path so the one transition table stays stated once.              *)
(*                                                                         *)
(* The mapping, stated so it can be argued with:                           *)
(*   - one daemon.  The journal is a single authority journal; mirrors and *)
(*     ingress are the catalog's own layer and stay empty here, so the     *)
(*     catalog's replication and admission laws are neither used nor       *)
(*     re-proved by this refinement.                                       *)
(*   - the abstract catalog is what the journal WROTE, mapped payload for  *)
(*     value: a stored entry becomes the fact carrying its derived         *)
(*     identity.                                                           *)
(*   - a creator is busy exactly while its writer holds a pending entry    *)
(*     that has not yet landed, and its expected position is that entry's  *)
(*     declared position.  A writer whose append landed but whose          *)
(*     acknowledgement was lost maps to an IDLE creator: the abstract      *)
(*     create finished at the moment the bytes landed, and the writer's    *)
(*     byte-identical retry is a stutter.  That is what makes the          *)
(*     uncertain-retry branch refine rather than diverge.                  *)
(*                                                                         *)
(* What this refinement does NOT cover, stated rather than discovered:     *)
(*   - APPENDER CRASH.  A pending writer that dies maps to a creator that  *)
(*     goes idle without appending at a position still free, and the       *)
(*     catalog model has no such step: process failure is outside its      *)
(*     action alphabet.  The gate's refinement config therefore runs with  *)
(*     no crashes, and the journal's crash law is proved locally instead   *)
(*     of transferring through the mapping.  A catalog claim about         *)
(*     appender crashes is not available from this composition.            *)
(*   - AN UNTRUSTED STORE.  Tamper is invisible to the abstract catalog    *)
(*     and would leave a creator's expected position derived from bytes    *)
(*     the journal never wrote.  The refinement config therefore runs with *)
(*     a trusted store: tamper tolerance is the journal's own law, not one *)
(*     the catalog inherits.                                              *)
(*   - LIVENESS, crash recovery of the store itself, and code-model        *)
(*     correspondence at either layer.                                     *)
(*                                                                         *)
(* BlindBegin is the negative control: create without the resolve-check.   *)
(* The step it takes is not a catalog step, and TLC must refute the        *)
(* refinement — a bridge that cannot fail bridges nothing.                 *)
(***************************************************************************)
EXTENDS Journal

\* The catalog's derived identity is the value itself; a stored payload
\* becomes the fact carrying it.
CatalogFact(n) == [val |-> written[n].payload, id |-> written[n].payload]

AbstractCatalog == [d \in {1} |-> [n \in 1..Len(written) |-> CatalogFact(n)]]
AbstractMirror  == [d \in {1} |-> [o \in {1} |-> << >>]]
AbstractData    == [d \in {1} |-> << >>]

\* Has this writer's pending entry already landed durably?
Landed(w) ==
  LET e == writers[w].entry IN
  e.seq + 1 \in 1..Len(written) /\ written[e.seq + 1] = e

AbstractCreators ==
  [c \in Writers |->
     IF writers[c].phase = "pending" /\ ~Landed(c)
       THEN [busy |-> TRUE, at |-> 1,
             val |-> writers[c].entry.payload, exp |-> writers[c].entry.seq]
       ELSE [busy |-> FALSE, at |-> 0, val |-> 0, exp |-> 0]]

C == INSTANCE Catalog WITH
       catalog          <- AbstractCatalog,
       mirror           <- AbstractMirror,
       data             <- AbstractData,
       creators         <- AbstractCreators,
       NumDaemons       <- 1,
       NumCreators      <- NumWriters,
       NumVals          <- NumPayloads,
       DataCap          <- 0,
       BlindIngress     <- FALSE,
       ForgedMirror     <- FALSE,
       AssertedIdentity <- FALSE,
       ResettingMirror  <- FALSE

\* J6.  Every behaviour of the journal is, under the mapping above, a
\* behaviour of the catalog model.  Refuted by: BlindBegin.
CatalogRefinement == C!Spec

\* The catalog's own laws, evaluated on the mapped state.  They are not
\* re-proved here — they are the refinement's payoff, checked so a mapping
\* that satisfied the step relation while landing in an unlawful abstract
\* state could not pass quietly.
AbstractTypeOK      == C!TypeOK
AbstractConvergence == C!Convergence

================================================================================
