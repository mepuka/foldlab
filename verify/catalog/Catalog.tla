------------------------------- MODULE Catalog --------------------------------
(***************************************************************************)
(* The catalog + ingress state machine (ticket 009, climb 1): laws W1-W5   *)
(* of proto/SPEC.md plus resolution monotonicity under replication lag,    *)
(* over the ownership model ratified in ticket 002 and ADR-0009.           *)
(*                                                                         *)
(* This module states the transition table ONCE.  Four Boolean constants   *)
(* select deliberately FAITHLESS variants (re-exported as module           *)
(* CatalogBroken), each dropping exactly one ratified law; TLC must        *)
(* refute each of them, one invariant per dropped law — a prover that      *)
(* cannot fail proves nothing.  All four constants FALSE is the ratified   *)
(* model.                                                                  *)
(*                                                                         *)
(* The laws, as modelled:                                                  *)
(*   - Evidence federates freely: a catalog is a per-daemon AUTHORITY      *)
(*     journal of type facts; the resolve index is a PURE FOLD of journals *)
(*     (here: a definition over the state, not a variable — an index that  *)
(*     could drift from its journal is not expressible, matching the       *)
(*     ratified "evidence is recomputable from bytes").                    *)
(*   - W1 no asserted identity: the daemon derives every digest it         *)
(*     commits.  Content-addressing means equal bytes <=> equal digest, so *)
(*     digests are modelled abstractly as the values themselves            *)
(*     (Digest(v) = v); the AssertedIdentity variant reintroduces          *)
(*     creator-chosen identity and must lose Convergence.                  *)
(*   - W3 create converges by content address: the create path is         *)
(*     derive -> resolve-check -> CAS-append at the expected seq           *)
(*     (go/journal/journal.go: append at expected position, conflict on    *)
(*     race).  A same-value create against a resolvable digest returns    *)
(*     the existing fact — an observable no-op, never a duplicate append   *)
(*     at that daemon.  Across daemons, duplicates under lag are harmless  *)
(*     evidence (same bytes -> same identity), which is why Convergence    *)
(*     is stated per journal, not per daemon-plus-mirrors.                 *)
(*   - ADR-0009: a REPLICA is a verified mirror holding a PREFIX of its    *)
(*     origin at origin sequence numbers — lag is absence, never wrong     *)
(*     data.  Mirrors grow nondeterministically (lag), never reorder,     *)
(*     never fabricate.  The ForgedMirror variant fabricates and must     *)
(*     lose the prefix property; the ResettingMirror variant drops a       *)
(*     mirror's prefix (the rejected "replica renumbers history"           *)
(*     alternative) and must lose resolution monotonicity.                 *)
(*   - Union resolution (ticket 002 #5): daemon d resolves digest i iff    *)
(*     i is in d's own committed journal or any mirrored prefix d holds.   *)
(*   - W4 create before publish: ingress admits a frame claiming digest i  *)
(*     only if i resolves at d AT ADMISSION TIME; otherwise the reply is   *)
(*     a typed refusal and the sender owns retry (refusal = observable     *)
(*     no-op, the ErrHeld pattern).  The BlindIngress variant admits       *)
(*     without the check and must lose NoAdmissionOnFaith.                 *)
(*                                                                         *)
(* Modelling decisions that diverge from or sharpen the prose (stated so   *)
(* they can be argued with):                                               *)
(*   - Create is SPLIT into Begin (resolve-check + expected-seq snapshot,  *)
(*     one atomic read at the daemon) and Finish (the CAS), so the         *)
(*     same-daemon create race is schedulable.  Finish does NOT re-run     *)
(*     the resolve-check: the CAS guards the own-journal position only,    *)
(*     exactly as journal.go does.  A mirror that delivers the same value  *)
(*     between Begin and Finish therefore yields a cross-daemon duplicate  *)
(*     — the model must prove that harmless rather than forbid it.         *)
(*   - Ingress is NOT split: its guard (presence) is monotone — a stale    *)
(*     positive resolve-check can never become wrong — so an atomic admit  *)
(*     loses no behaviour.  The create guard (absence) is anti-monotone,   *)
(*     which is WHY create needs the CAS and ingress does not.             *)
(*   - Publishers are memoryless: a publish attempt is one daemon-side    *)
(*     admission decision.  Frames are their claimed digest — payload      *)
(*     conformance is explicitly out of scope (SPEC: admission checks     *)
(*     identity resolution only).                                          *)
(*   - W2 (canonicalization) and W5 (read-your-admissions) collapse in     *)
(*     this abstraction: values ARE canonical, appends ARE durable reads.  *)
(*     They are not claimed.                                               *)
(***************************************************************************)
EXTENDS Integers, Sequences

CONSTANTS
  \* @type: Int;  number of daemons, 1-based ids
  NumDaemons,
  \* @type: Int;  number of creator processes (>= 2 to schedule the CAS race)
  NumCreators,
  \* @type: Int;  number of abstract structure values
  NumVals,
  \* @type: Int;  max admitted frames per data journal; 0 = unbounded
  \* (unbounded is for Apalache's inductive obligation, never for TLC)
  DataCap,
  \* @type: Bool; FAITHLESS: ingress admits without the resolve-check (W4
  \* dropped) — must lose NoAdmissionOnFaith
  BlindIngress,
  \* @type: Bool; FAITHLESS: a replica appends a fabricated fact (ADR-0009
  \* verified-mirror dropped) — must lose LagIsAbsenceNeverWrongData
  ForgedMirror,
  \* @type: Bool; FAITHLESS: the daemon commits a creator-asserted identity
  \* without deriving it (W1 dropped) — must lose Convergence
  AssertedIdentity,
  \* @type: Bool; FAITHLESS: a replica drops its mirrored prefix (the
  \* ADR-0009 rejected alternative: history renumbered/lost) — must lose
  \* ResolutionMonotonicity
  ResettingMirror

\* Filtered from literal ranges rather than 1..N: Apalache does not accept
\* integer ranges with symbolic bounds.  The filter is semantically
\* identical for TLC.
Daemons  == { d \in 1..4 : d <= NumDaemons }
Creators == { c \in 1..4 : c <= NumCreators }
Vals     == { v \in 1..4 : v <= NumVals }

(***************************************************************************)
(* Identity.  Content-addressing: equal bytes <=> equal digest, so the     *)
(* digest space is the value space and derivation is the identity          *)
(* function.  W1 is then: every committed fact's id field equals           *)
(* Digest(val) — the daemon computed it.  The faithless AssertedIdentity   *)
(* variant writes an arbitrary id instead.                                 *)
(***************************************************************************)
Digest(v) == v
Ids == Vals

\* @typeAlias: fact = { val: Int, id: Int };
\* @typeAlias: creator = { busy: Bool, at: Int, val: Int, exp: Int };
\* The `vars` tuple read as an explicit state value (see ModelState below).
\* @typeAlias: mstate = <<Int -> Seq($fact), Int -> (Int -> Seq($fact)), Int -> Seq(Int), Int -> $creator>>;
CatalogAliases == TRUE

\* A catalog fact: the canonical structure value and its identity.
Fact == [val : Vals, id : Ids]
\* @type: (Int) => $fact;
MkFact(v) == [val |-> v, id |-> Digest(v)]

\* @type: $creator;
IdleCreator == [busy |-> FALSE, at |-> 0, val |-> 0, exp |-> 0]

VARIABLES
  \* @type: Int -> Seq($fact);          per-daemon AUTHORITY catalog journal
  catalog,
  \* @type: Int -> (Int -> Seq($fact)); mirror[d][o]: d's replica of o's
  \*                                    catalog; mirror[d][d] pinned <<>>
  mirror,
  \* @type: Int -> Seq(Int);            per-daemon data journal of admitted
  \*                                    frames (a frame is its claimed digest)
  data,
  \* @type: Int -> $creator;            creator processes
  creators

\* @type: $mstate;
vars == <<catalog, mirror, data, creators>>

\* The existing vars tuple is also the explicit state value used by
\* CatalogWire.tla. Accessors let the bridge apply the proved split halves to
\* a bounded intermediate state without copying their transition table.
\* The type annotations below are TYPE COMMENTS ONLY, added 2026-08-13 so
\* that Apalache's Snowcat can type the accessors (FINDING-R3-001: without
\* them Catalog.tla does not type-check, and every R3 obligation dies before
\* any proof runs).  TLC ignores them; the cap2 closure canary
\* (119,145 / 18,295 / depth 16) is what certifies the transition relation
\* did not move.
\* @type: $mstate;
ModelState == vars
\* @type: ($mstate) => (Int -> Seq($fact));
CatalogOf(s)  == s[1]
\* @type: ($mstate) => (Int -> (Int -> Seq($fact)));
MirrorOf(s)   == s[2]
\* @type: ($mstate) => (Int -> Seq(Int));
DataOf(s)     == s[3]
\* @type: ($mstate) => (Int -> $creator);
CreatorsOf(s) == s[4]
\* @type: ($mstate) => Bool;
Become(s) ==
  /\ catalog' = CatalogOf(s)
  /\ mirror' = MirrorOf(s)
  /\ data' = DataOf(s)
  /\ creators' = CreatorsOf(s)

\* @type: (Seq($fact)) => Set($fact);
Range(s)  == { s[i] : i \in DOMAIN s }
\* @type: (Seq($fact)) => Set(Int);
ValsOf(s) == { s[i].val : i \in DOMAIN s }

\* Committed evidence: facts in some AUTHORITY journal.  Mirrors never
\* commit — they carry commitments made elsewhere.
\* @type: Set($fact);
CommittedFacts == UNION { Range(catalog[d]) : d \in Daemons }
\* @type: Set(Int);
CommittedIds   == { f.id : f \in CommittedFacts }

\* The resolve index as the ratified law states it: a pure fold of the
\* journals the daemon holds — its own, plus every mirrored prefix.
\* Union resolution, ticket 002 #5.
\* @type: ($mstate, Int) => Set($fact);
LocalFactsIn(s, d) ==
  Range(CatalogOf(s)[d]) \cup
    UNION { Range(MirrorOf(s)[d][o]) : o \in Daemons \ {d} }
\* @type: (Int) => Set($fact);
LocalFacts(d) == LocalFactsIn(ModelState, d)
\* @type: (Int) => Set(Int);
ResolvableIds(d) == { f.id : f \in LocalFacts(d) }
\* @type: ($mstate, Int) => Set(Int);
ResolvableIdsIn(s, d) == { f.id : f \in LocalFactsIn(s, d) }

Init ==
  /\ catalog  = [d \in Daemons |-> <<>>]
  /\ mirror   = [d \in Daemons |-> [o \in Daemons |-> <<>>]]
  /\ data     = [d \in Daemons |-> <<>>]
  /\ creators = [c \in Creators |-> IdleCreator]

(***************************************************************************)
(* create, first half: derive (implicit — Digest is a function of the      *)
(* submitted value) and resolve-check, snapshotting the expected append    *)
(* position.  A resolvable digest converges: created:false, the existing   *)
(* fact — an observable no-op (W3).                                        *)
(***************************************************************************)
\* @type: (Int, $mstate) => Bool;
CreateBeginEnabled(c, before) == ~CreatorsOf(before)[c].busy

\* @type: (Int, Int, Int, $mstate) => $mstate;
CreateBeginResult(c, d, v, before) ==
  IF Digest(v) \in ResolvableIdsIn(before, d)
    THEN before      \* W3 converge: existing fact, no append
    ELSE [before EXCEPT ![4][c] =
           [busy |-> TRUE, at |-> d, val |-> v,
            exp |-> Len(CatalogOf(before)[d])]]

CreateBegin(c, d, v) ==
  /\ CreateBeginEnabled(c, ModelState)
  /\ Become(CreateBeginResult(c, d, v, ModelState))

(***************************************************************************)
(* create, second half: the CAS-append.  Lands only if the journal is      *)
(* still at the expected position (journal.go: expected-seq publish);      *)
(* otherwise conflict, and retry is a fresh Begin (which re-runs the       *)
(* resolve-check — that recheck is what makes the same-value race          *)
(* converge instead of duplicating).  Journals never shrink, so           *)
(* Len = exp implies no append happened since Begin: the CAS is exactly    *)
(* the resolve-check's freshness on the OWN journal.  Mirror growth since  *)
(* Begin is deliberately not detected (see header).                        *)
(***************************************************************************)
\* @type: (Int, $mstate) => Bool;
CreateFinishEnabled(c, before) == CreatorsOf(before)[c].busy

\* @type: (Int, $mstate) => Set($mstate);
CreateFinishResults(c, before) ==
  LET d == CreatorsOf(before)[c].at
      v == CreatorsOf(before)[c].val IN
  IF Len(CatalogOf(before)[d]) = CreatorsOf(before)[c].exp
    THEN IF AssertedIdentity
           THEN { [before EXCEPT
                     ![1][d] = Append(@, [val |-> v, id |-> i]),
                     ![4][c] = IdleCreator] : i \in Ids }
           ELSE { [before EXCEPT
                    ![1][d] = Append(@, MkFact(v)),
                    ![4][c] = IdleCreator] }  \* W1: derived identity
    ELSE { [before EXCEPT ![4][c] = IdleCreator] }  \* conflict

CreateFinish(c) ==
  /\ CreateFinishEnabled(c, ModelState)
  /\ \E next \in CreateFinishResults(c, ModelState) : Become(next)

(***************************************************************************)
(* Replication: a mirror copies its origin's next fact, at the origin's    *)
(* position.  Scheduling is nondeterministic — that IS the lag model: a    *)
(* mirror may trail arbitrarily, and lag manifests only as absence.        *)
(* ForgedMirror appends an arbitrary fact at the position instead.         *)
(***************************************************************************)
MirrorAdvance(d, o) ==
  /\ d # o
  /\ Len(mirror[d][o]) < Len(catalog[o])
  /\ IF ForgedMirror
       THEN \E f \in Fact :
              mirror' = [mirror EXCEPT ![d][o] = Append(@, f)]
       ELSE mirror' = [mirror EXCEPT
              ![d][o] = Append(@, catalog[o][Len(mirror[d][o]) + 1])]
  /\ UNCHANGED <<catalog, data, creators>>

(***************************************************************************)
(* The rejected replica (ADR-0009): one that loses its verified prefix     *)
(* and re-syncs from scratch.  No fact is wrong at any moment — the        *)
(* prefix property survives — but evidence un-resolves, which is the       *)
(* violation this variant exists to witness.                               *)
(***************************************************************************)
MirrorReset(d, o) ==
  /\ ResettingMirror
  /\ d # o
  /\ mirror[d][o] # <<>>
  /\ mirror' = [mirror EXCEPT ![d][o] = <<>>]
  /\ UNCHANGED <<catalog, data, creators>>

(***************************************************************************)
(* Ingress (W4): a frame claiming digest i is admitted at d only if d      *)
(* resolves i at admission time; otherwise a typed refusal — an           *)
(* observable no-op; the sender owns retry.  Under lag this refuses        *)
(* valid-elsewhere frames until the fact arrives: lag is absence, applied  *)
(* consistently.  DataCap is a model bound, not a law (0 = unbounded,      *)
(* Apalache only).                                                         *)
(***************************************************************************)
Publish(d, i) ==
  /\ DataCap = 0 \/ Len(data[d]) < DataCap
  /\ IF BlindIngress \/ i \in ResolvableIds(d)
       THEN /\ data' = [data EXCEPT ![d] = Append(@, i)]
            /\ UNCHANGED <<catalog, mirror, creators>>
       ELSE UNCHANGED vars     \* refusal: unknown identity never enters

Next ==
  \/ \E c \in Creators, d \in Daemons, v \in Vals : CreateBegin(c, d, v)
  \/ \E c \in Creators : CreateFinish(c)
  \/ \E d \in Daemons, o \in Daemons : MirrorAdvance(d, o)
  \/ \E d \in Daemons, o \in Daemons : MirrorReset(d, o)
  \/ \E d \in Daemons, i \in Ids : Publish(d, i)

Spec == Init /\ [][Next]_vars

--------------------------------------------------------------------------------
(***************************************************************************)
(* Invariants and properties.  Admission-time facts are properties of a    *)
(* STEP, so they are stated as action properties; each has a state-level   *)
(* shadow.                                                                 *)
(***************************************************************************)

TypeOK ==
  /\ \A d \in Daemons :
       /\ \A k \in DOMAIN catalog[d] : catalog[d][k] \in Fact
       /\ \A k \in DOMAIN data[d] : data[d][k] \in Ids
       /\ (DataCap > 0 => Len(data[d]) <= DataCap)
       /\ mirror[d][d] = <<>>
       /\ \A o \in Daemons \ {d} :
            \A k \in DOMAIN mirror[d][o] : mirror[d][o][k] \in Fact
  /\ \A c \in Creators :
       LET p == creators[c] IN
       IF p.busy
         THEN /\ p.at \in Daemons
              /\ p.val \in Vals
              /\ p.exp >= 0
              /\ p.exp <= Len(catalog[p.at])   \* journals never shrink
         ELSE p = IdleCreator

\* W1 + W3: same bytes -> one fact per journal, one identity everywhere.
\* Clause 1: an AUTHORITY journal never carries two facts for one value
\* (the CAS-append recheck discipline).  Cross-daemon duplicates under lag
\* are deliberately legal — harmless evidence.
\* Clause 2: every fact anywhere carries the DERIVED identity, so all
\* facts for a value agree on it, any interleaving, any daemon.
Convergence ==
  /\ \A d \in Daemons :
       \A i, j \in DOMAIN catalog[d] :
         catalog[d][i].val = catalog[d][j].val => i = j
  /\ \A f \in CommittedFacts \cup
        UNION { Range(mirror[d][o]) : d \in Daemons, o \in Daemons } :
       f.id = Digest(f.val)

\* W4, state shadow: every admitted frame's claim is committed evidence.
\* CommittedIds is monotone (journals only append), so "committed now"
\* certifies "was committed at admission" — the causal half lives in the
\* action property AdmissionSeesResolution below.
NoAdmissionOnFaith ==
  \A d \in Daemons : \A k \in DOMAIN data[d] : data[d][k] \in CommittedIds

\* Resolution reaches only committed facts: own journal commits, and a
\* verified mirror carries only origin commitments.  This is the clause
\* that makes union resolution sound — admission via a mirror is still
\* admission on evidence.
ResolvableOnlyViaCommitted ==
  \A d \in Daemons : ResolvableIds(d) \subseteq CommittedIds

\* ADR-0009: a mirror is a PREFIX of its origin at origin positions —
\* lag is absence, never wrong data.
LagIsAbsenceNeverWrongData ==
  \A d \in Daemons : \A o \in Daemons \ {d} :
    /\ Len(mirror[d][o]) <= Len(catalog[o])
    /\ \A k \in DOMAIN mirror[d][o] : mirror[d][o][k] = catalog[o][k]

\* Convergence bounds every catalog by the value space — the state space
\* is finite with NO artificial catalog cap.  Checked, not assumed.
CatalogNaturallyBounded ==
  \A d \in Daemons : Len(catalog[d]) <= NumVals

\* W4, the admission-time half: an admitting step appends exactly one
\* frame, disturbs no prior frame, and its claim was resolvable at d in
\* the PRE-state — the state the daemon consulted.
AdmissionSeesResolution ==
  [][\A d \in Daemons :
       data'[d] # data[d] =>
         /\ Len(data'[d]) = Len(data[d]) + 1
         /\ SubSeq(data'[d], 1, Len(data[d])) = data[d]
         /\ data'[d][Len(data'[d])] \in ResolvableIds(d)]_vars

\* Evidence never un-resolves: a daemon's resolvable set only grows.
\* Lag may delay resolution; nothing revokes it.
ResolutionMonotonicity ==
  [][\A d \in Daemons :
       ResolvableIds(d) \subseteq (ResolvableIds(d))']_vars

================================================================================
