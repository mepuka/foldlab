------------------------------- MODULE Journal --------------------------------
(***************************************************************************)
(* The hash-chained journal: CAS-append at an expected position,           *)
(* verify-on-read, one stored-entry verifier behind every head adoption,   *)
(* and crash-anywhere recovery from durable storage.  This is ticket 012's *)
(* model of go/journal/journal.go.                                         *)
(*                                                                         *)
(* This module states the transition table ONCE.  Five Boolean constants   *)
(* select deliberately FAITHLESS variants (re-exported as module           *)
(* JournalBroken), each dropping exactly one ratified law; TLC must refute *)
(* each of them, one law per dropped law — a prover that cannot fail       *)
(* proves nothing.  All five constants FALSE is the ratified model.        *)
(*                                                                         *)
(* The laws, as modelled:                                                  *)
(*   - JL1 the chain never forks at a sequence number.  Every stored       *)
(*     record sits at the position it claims and links to its              *)
(*     predecessor's digest.  The expected-position CAS is what enforces   *)
(*     this: a losing appender must not land anywhere.  NoCAS drops the    *)
(*     expected-position guard and must lose WritersNeverForkTheChain.     *)
(*   - JL2 an append linearizes exactly once or conflicts.  A finishing    *)
(*     appender either leaves its own digest at its expected position      *)
(*     (stored, or the idempotent duplicate its own retry meets) or        *)
(*     appends nothing and does not keep a head the journal never carried. *)
(*     OptimisticOutcome reports a lost append as stored and must lose     *)
(*     AppendIsExactlyOnceOrConflict.                                      *)
(*   - JL3 verify-on-read reproduces the stored head or reports tamper at  *)
(*     the first bad position, over ANY prefix.  TrustingRead drops the    *)
(*     prev-link check and must lose ReadIsTamperEvident.                  *)
(*   - JL4 (D60, the one-verifier law) every head a handle adopts was      *)
(*     licensed by the SAME stored-entry verifier — open, verified read,   *)
(*     and post-conflict resync share it, so the writer never inherits a   *)
(*     weaker tamper-evidence law than the reader.  UnverifiedAdopt takes  *)
(*     the broker's tail on faith and must lose                            *)
(*     OnlyVerifiedHeadsAreAdopted.                                        *)
(*   - JL5 recovery is a pure function of durable storage.  A reopened     *)
(*     handle's head is re-derived through the verifier, in-flight work    *)
(*     does not survive, and a crash alters no durable evidence.           *)
(*     AmnesicRestart keeps the pre-crash in-memory head and must lose     *)
(*     RecoveryIsPureStorage.                                              *)
(*                                                                         *)
(* Modelling decisions that diverge from or sharpen the prose (stated so   *)
(* they can be argued with):                                               *)
(*   - IDENTITY IS THE PREFIX IT COMMITS TO.  A digest is modelled as the  *)
(*     sequence of payloads it covers, so Dig(record) = prev \o payload.   *)
(*     That is the collision-free abstraction: equal digests iff equal     *)
(*     covered prefixes.  Collision resistance is ASSUMED, not proved --   *)
(*     this model says nothing about SHA-256.                              *)
(*   - CANONICAL BYTES COLLAPSE.  journal.go verifies a stored entry three *)
(*     ways: the position agrees with the claimed seq, the wire bytes are  *)
(*     canonical (digest of the bytes equals the digest of the decoded     *)
(*     entry), and the prev link matches the verified head.  Here records  *)
(*     ARE canonical values, so the byte-canonicality check is             *)
(*     inexpressible and is NOT claimed; what remains modelled is the      *)
(*     position agreement and the prev link.                               *)
(*   - APPEND IS ATOMIC AT THE BROKER.  A stored record is wholly present  *)
(*     or wholly absent; torn writes, partial fsync, and the pinned        *)
(*     server's failsafe sync window are OUT OF SCOPE (they are already    *)
(*     carried as residuals in VERIFICATION.md).  The crash points         *)
(*     modelled are: before the CAS (nothing landed), at the CAS with the  *)
(*     acknowledgement lost (LostAck: the record landed, the writer does   *)
(*     not know, and its retry meets its own bytes), and between any two   *)
(*     steps (Reopen).                                                     *)
(*   - CRASH AND RESTART ARE ONE STEP.  A dead handle takes no steps, and  *)
(*     the store is untouched while it is dead, so a separate dead state   *)
(*     adds no behaviour.                                                  *)
(*   - TAMPERING IS MINIMAL AND EXTERNAL.  An adversary rewrites ONE field *)
(*     of ONE stored record.  This models storage corruption for the       *)
(*     tamper-evidence law; it is not a claim about any NATS failure mode, *)
(*     and arbitrary record substitution is not modelled.                  *)
(*   - THE JOURNAL IS CONTENT-BLIND.  It has no resolve-check: appending   *)
(*     the same payload twice is lawful here.  Convergence is the catalog  *)
(*     daemon's law, enforced ABOVE the journal, and it is where the       *)
(*     refinement in JournalCatalog.tla puts it.                           *)
(*   - ONE STREAM, ONE AUTHORITY.  ADR-0009's replica role is not          *)
(*     modelled here; mirrors live in the catalog model.  The shape gate   *)
(*     (badShapeReason) is not modelled: it is an admission check on the   *)
(*     stream's configuration, not a step of the append/read machine.      *)
(*   - Apalache requires literal finite domains, so writer, payload, and   *)
(*     cap counts are explicitly limited to 1..4; a config outside that    *)
(*     domain is rejected instead of silently truncated.                   *)
(***************************************************************************)
EXTENDS FiniteSets, Integers, Sequences

CONSTANTS
  \* @type: Int;  number of concurrent appenders (>= 2 to schedule the CAS race)
  NumWriters,
  \* @type: Int;  number of abstract payload values
  NumPayloads,
  \* @type: Int;  journal length bound: positions 0 .. Cap-1
  Cap,
  \* @type: Int;  how many storage corruptions one behaviour may contain
  MaxTampers,
  \* @type: Int;  how many crash events one behaviour may contain
  MaxCrashes,
  \* @type: Bool; FAITHLESS: the append drops the expected-position guard
  \* (JL1 dropped) — must lose WritersNeverForkTheChain
  NoCAS,
  \* @type: Bool; FAITHLESS: a lost append is reported as stored, and the
  \* writer keeps the head it never landed (JL2 dropped) — must lose
  \* AppendIsExactlyOnceOrConflict
  OptimisticOutcome,
  \* @type: Bool; FAITHLESS: the read fold drops the prev-link check (JL3
  \* dropped) — must lose ReadIsTamperEvident
  TrustingRead,
  \* @type: Bool; FAITHLESS: a head is adopted from the broker's tail without
  \* the stored-entry verifier (D60/JL4 dropped) — must lose
  \* OnlyVerifiedHeadsAreAdopted
  UnverifiedAdopt,
  \* @type: Bool; FAITHLESS: a reopened handle keeps its pre-crash in-memory
  \* head instead of re-deriving it (JL5 dropped) — must lose
  \* RecoveryIsPureStorage
  AmnesicRestart

\* Apalache needs a literal finite range.  Keep its ceiling in one definition
\* so widening the executable domain does not require coordinated model edits.
LiteralDomain == 1..4

\* The configured domain sizes must stay within that expressible range.  Reject
\* a config that claims a wider model instead of silently checking the
\* four-element truncation.  MaxTampers and MaxCrashes are explicit budgets
\* (0 disables the corresponding actions), and the five switches are Boolean
\* choices in every config.
ASSUME NumWriters  \in LiteralDomain
ASSUME NumPayloads \in LiteralDomain
ASSUME Cap         \in LiteralDomain
ASSUME MaxTampers  \in Nat
ASSUME MaxCrashes  \in Nat
ASSUME NoCAS             \in BOOLEAN
ASSUME OptimisticOutcome \in BOOLEAN
ASSUME TrustingRead      \in BOOLEAN
ASSUME UnverifiedAdopt   \in BOOLEAN
ASSUME AmnesicRestart    \in BOOLEAN

\* Filtered from literal ranges rather than 1..N: Apalache does not accept
\* integer ranges with symbolic bounds.  The assumptions above make each
\* filter semantically identical to 1..NumX for both TLC and Apalache.
Writers  == { w \in LiteralDomain : w <= NumWriters }
Payloads == { p \in LiteralDomain : p <= NumPayloads }

\* Journal positions are 0-based, exactly as go/journal's cursor is: the
\* genesis cursor is position -1, the first entry lands at position 0.
Positions == 0 .. (Cap - 1)

(***************************************************************************)
(* Identity.  canonical.EntryDigest hashes the canonical bytes of ALL THREE *)
(* entry fields — payload, prev, seq — so a digest is modelled as the       *)
(* sequence of <<payload, position>> pairs it covers: the empty sequence is *)
(* genesis, and a record extends its prev by its own pair.  Injective by    *)
(* construction in every field, which is the collision-freeness a hash      *)
(* chain assumes.  Getting this wrong understates the machine: a digest     *)
(* that did not cover seq would let a renumbered entry pass the append      *)
(* path's own-bytes re-read (see DECISIONS.md, JD-2).                       *)
(***************************************************************************)
Genesis == << >>

\* The head a genuine prefix of payloads produces: each payload paired with
\* the position it occupies.
PayloadSeqs(n) == UNION { [1 .. k -> Payloads] : k \in 0 .. n }
HeadOfPayloads(ps) == [i \in DOMAIN ps |-> <<ps[i], i - 1>>]
GenuineHeads(n) == { HeadOfPayloads(ps) : ps \in PayloadSeqs(n) }

\* A digest no prefix of this journal produces — position Cap is outside
\* Positions, so no stored record digests to it.  It is the "unknown head"
\* half of the corruption model; the genuine heads above are the harder,
\* valid-other-journal half.
ForeignHead == << <<1, Cap>> >>

\* The heads an adversary may substitute for a record's prev: any head a
\* genuine prefix produces, plus the foreign one.  Genuine substitutions are
\* the harder half — an unknown digest can never match a running head, while a
\* valid-other-journal head is exactly the corruption class the runtime's read
\* controls already exercise.
PrevSpace == GenuineHeads(Cap - 1) \cup {ForeignHead}

MkRecord(p, h, n) == [pay |-> p, prev |-> h, seq |-> n]
Dig(r) == Append(r.prev, <<r.pay, r.seq>>)

\* Type shapes, stated structurally.  A head is a sequence of
\* <<payload, position>> pairs; corruption can put a long head at a low
\* position, so a head is bounded by 2*Cap rather than by Cap — TypeOK checks
\* that bound rather than assuming it.
WellTypedHead(h) == h \in Seq(Payloads \X (0 .. Cap)) /\ Len(h) <= 2 * Cap
WellTypedRecord(r) ==
  /\ DOMAIN r = {"pay", "prev", "seq"}
  /\ r.pay \in Payloads
  /\ r.seq \in Positions
  /\ WellTypedHead(r.prev)
WellTypedCursor(c) ==
  /\ DOMAIN c = {"seq", "head"}
  /\ c.seq \in -1 .. (Cap - 1)
  /\ WellTypedHead(c.head)

\* A handle cursor: the position it has verified and the head at it.
GenesisCursor == [seq |-> -1, head |-> Genesis]

\* An idle appender.  Its payload/position fields are out of domain on
\* purpose, exactly as Catalog.tla's IdleCreator is.
Idle == [busy |-> FALSE, pay |-> 0, exp |-> 0, prev |-> Genesis]

\* What an append reported to its caller.  go/journal returns Stored,
\* Duplicate, or ErrConflict; "none" is the state before any verdict.
Outcomes == {"none", "stored", "duplicate", "conflict"}

VARIABLES
  \* @type: Seq($record);        the durable stream; store[i] sits at position i-1
  store,
  \* @type: Int -> $pending;     each appender's in-flight entry
  pend,
  \* @type: Int -> $cursor;      each handle's verified head
  cur,
  \* @type: Int -> Str;          each appender's last reported outcome
  res,
  \* @type: Int;                 storage corruptions spent
  tampers,
  \* @type: Int;                 crash events spent
  crashes

vars == <<store, pend, cur, res, tampers, crashes>>

\* Payloads the journal already carries.  Not used by the journal itself —
\* the journal is content-blind — but it is the resolve-check the catalog
\* daemon runs above it (see JournalCatalog.tla).
StoredPayloads == { store[i].pay : i \in DOMAIN store }

(***************************************************************************)
(* The ONE stored-entry verifier (D60).  Every head adoption in            *)
(* go/journal — Open's tailCursor, the verified read fold, and the         *)
(* post-conflict resync — runs this and nothing else.  It licenses a       *)
(* cursor only when the record at the claimed position really claims that  *)
(* position; the byte-canonicality half of the real check collapses (see   *)
(* the header).                                                            *)
(***************************************************************************)
Verifies(c, s) ==
  \/ c = GenesisCursor
  \/ /\ c.seq + 1 \in DOMAIN s
     /\ s[c.seq + 1].seq = c.seq
     /\ Dig(s[c.seq + 1]) = c.head

\* tailCursor: adopt the tail only if the tail verifies.  An empty stream
\* yields the genesis cursor.  Note it verifies only the tail's own claim, not
\* that the tail chains from genesis — a canonical-but-forged tail still
\* passes, which is go/journal's recorded non-claim, faithfully reproduced.
VerifiedTail(s) ==
  IF Len(s) = 0
    THEN [ok |-> TRUE, cursor |-> GenesisCursor]
    ELSE LET i == Len(s)
             r == s[i] IN
         IF UnverifiedAdopt \/ r.seq = i - 1
           THEN [ok |-> TRUE, cursor |-> [seq |-> r.seq, head |-> Dig(r)]]
           ELSE [ok |-> FALSE, cursor |-> GenesisCursor]

(***************************************************************************)
(* The verify-on-read fold.  Start from a verified head and walk forward:   *)
(* each record must claim its own position and chain from the running head  *)
(* before its digest is adopted.  The first record that fails ends the read *)
(* with a tamper report naming that position — go/journal's ErrTampered.    *)
(***************************************************************************)
RECURSIVE FoldFrom(_, _, _)
FoldFrom(s, i, h) ==
  IF i > Len(s)
    THEN [ok |-> TRUE, head |-> h, at |-> i - 1]
    ELSE IF s[i].seq # i - 1 \/ (~TrustingRead /\ s[i].prev # h)
           THEN [ok |-> FALSE, head |-> h, at |-> i - 1]
           ELSE FoldFrom(s, i + 1, Dig(s[i]))

ReadFromGenesis(s) == FoldFrom(s, 1, Genesis)

\* The chain law, as a predicate on stored bytes alone: every record claims
\* its own position and links to its predecessor's digest.
BadAt(s, i) ==
  \/ s[i].seq # i - 1
  \/ s[i].prev # (IF i = 1 THEN Genesis ELSE Dig(s[i - 1]))
WellFormedChain(s) == \A i \in 1 .. Len(s) : ~BadAt(s, i)
FirstBadIndex(s) ==
  CHOOSE i \in 1 .. Len(s) : BadAt(s, i) /\ \A j \in 1 .. (i - 1) : ~BadAt(s, j)
TrueHead(s) == IF Len(s) = 0 THEN Genesis ELSE Dig(s[Len(s)])

Init ==
  /\ store   = << >>
  /\ pend    = [w \in Writers |-> Idle]
  /\ cur     = [w \in Writers |-> GenesisCursor]
  /\ res     = [w \in Writers |-> "none"]
  /\ tampers = 0
  /\ crashes = 0

(***************************************************************************)
(* Append, first half: form the entry from the handle's verified head and   *)
(* snapshot the expected position.  go/journal does this under the handle   *)
(* mutex (Append) or hands it to the caller (Head then AppendEntry); either *)
(* way the CAS position is decided here and proved here later.              *)
(***************************************************************************)
Begin(w, p) ==
  /\ ~pend[w].busy
  /\ cur[w].seq + 1 < Cap
  /\ pend' = [pend EXCEPT ![w] =
       [busy |-> TRUE, pay |-> p, exp |-> cur[w].seq + 1, prev |-> cur[w].head]]
  /\ res' = [res EXCEPT ![w] = "none"]
  /\ UNCHANGED <<store, cur, tampers, crashes>>

(***************************************************************************)
(* Append, second half: the CAS at the expected position                    *)
(* (WithExpectLastSequencePerSubject).  Three outcomes, exactly             *)
(* go/journal's:                                                            *)
(*   stored    — the position was still free; the entry lands there.        *)
(*   duplicate — the position is occupied by our OWN bytes (the retry after *)
(*               a lost acknowledgement); idempotent, adopt and move on.    *)
(*   conflict  — a rival holds the position; nothing lands, and the handle  *)
(*               heals only by adopting a VERIFIED tail (D60).              *)
(***************************************************************************)
Finish(w) ==
  /\ pend[w].busy
  /\ LET e == pend[w].exp
         r == MkRecord(pend[w].pay, pend[w].prev, e)
         d == Dig(r) IN
     IF NoCAS
       THEN \* faithless: no expected-position guard, the entry lands at the tail
         /\ Len(store) < Cap
         /\ store' = Append(store, r)
         /\ cur' = [cur EXCEPT ![w] = [seq |-> Len(store), head |-> d]]
         /\ pend' = [pend EXCEPT ![w] = Idle]
         /\ res' = [res EXCEPT ![w] = "stored"]
         /\ UNCHANGED <<tampers, crashes>>
       ELSE IF Len(store) = e
         THEN \* stored
           /\ store' = Append(store, r)
           /\ cur' = [cur EXCEPT ![w] = [seq |-> e, head |-> d]]
           /\ pend' = [pend EXCEPT ![w] = Idle]
           /\ res' = [res EXCEPT ![w] = "stored"]
           /\ UNCHANGED <<tampers, crashes>>
         ELSE IF e + 1 \in DOMAIN store /\ Dig(store[e + 1]) = d
           THEN \* duplicate: our own bytes already hold the position
             /\ cur' = [cur EXCEPT ![w] = [seq |-> e, head |-> d]]
             /\ pend' = [pend EXCEPT ![w] = Idle]
             /\ res' = [res EXCEPT ![w] = "duplicate"]
             /\ UNCHANGED <<store, tampers, crashes>>
           ELSE \* conflict: a rival holds the position.  The handle heals only
                \* by adopting a VERIFIED tail, and only forward (go/journal's
                \* resync advances the cursor, it never rewinds it).
             /\ cur' = [cur EXCEPT ![w] =
                  LET t == VerifiedTail(store) IN
                  IF t.ok /\ t.cursor.seq > cur[w].seq THEN t.cursor ELSE cur[w]]
             /\ pend' = [pend EXCEPT ![w] = Idle]
             /\ res' = [res EXCEPT ![w] =
                  IF OptimisticOutcome
                    THEN "stored"        \* faithless: a lost append reported won
                    ELSE "conflict"]
             /\ UNCHANGED <<store, tampers, crashes>>

(***************************************************************************)
(* The verified read path.  The fold advances the handle head only on a     *)
(* clean read: go/journal returns the tamper error before writing j.cursor, *)
(* so a read that hits corruption leaves the handle exactly where it was.   *)
(***************************************************************************)
ReadAll(w) ==
  /\ LET v == ReadFromGenesis(store) IN
       /\ v.ok
       /\ Len(store) - 1 > cur[w].seq
       /\ cur' = [cur EXCEPT ![w] = [seq |-> Len(store) - 1, head |-> v.head]]
  /\ UNCHANGED <<store, pend, res, tampers, crashes>>

(***************************************************************************)
(* Crash at the commit point: the CAS landed at the broker but the          *)
(* acknowledgement was lost, so the appender keeps its pending entry.  Its  *)
(* retry meets its own bytes at the position and takes the duplicate        *)
(* branch — which is why the append is idempotent under retry.              *)
(***************************************************************************)
LostAck(w) ==
  /\ crashes < MaxCrashes
  /\ pend[w].busy
  /\ ~NoCAS
  /\ Len(store) = pend[w].exp
  /\ Len(store) < Cap
  /\ store' = Append(store, MkRecord(pend[w].pay, pend[w].prev, pend[w].exp))
  /\ crashes' = crashes + 1
  /\ UNCHANGED <<pend, cur, res, tampers>>

(***************************************************************************)
(* Crash between any two steps, and reopen.  In-flight work does not        *)
(* survive; the reopened handle's head is re-derived from durable storage   *)
(* through the one verifier.  A tail that does not verify refuses the open  *)
(* instead of adopting a head a read would reject (go/journal: Open fails   *)
(* fast rather than adopting a head Read refuses).                          *)
(***************************************************************************)
Reopen(w) ==
  /\ crashes < MaxCrashes
  /\ VerifiedTail(store).ok
  /\ crashes' = crashes + 1
  /\ pend' = [pend EXCEPT ![w] = Idle]
  /\ cur' = [cur EXCEPT ![w] =
       IF AmnesicRestart THEN cur[w] ELSE VerifiedTail(store).cursor]
  /\ res' = [res EXCEPT ![w] = "none"]
  /\ UNCHANGED <<store, tampers>>

OpenRefused(w) ==
  /\ crashes < MaxCrashes
  /\ ~VerifiedTail(store).ok
  /\ crashes' = crashes + 1
  /\ pend' = [pend EXCEPT ![w] = Idle]
  /\ res' = [res EXCEPT ![w] = "none"]
  /\ UNCHANGED <<store, cur, tampers>>

(***************************************************************************)
(* Storage corruption: an adversary rewrites one field of one stored        *)
(* record.  The tamper-evidence laws exist to catch exactly this.           *)
(***************************************************************************)
TamperPayload(k) ==
  /\ tampers < MaxTampers
  /\ k \in DOMAIN store
  /\ \E p \in Payloads \ {store[k].pay} :
       store' = [store EXCEPT ![k].pay = p]
  /\ tampers' = tampers + 1
  /\ UNCHANGED <<pend, cur, res, crashes>>

TamperSeq(k) ==
  /\ tampers < MaxTampers
  /\ k \in DOMAIN store
  /\ \E n \in Positions \ {store[k].seq} :
       store' = [store EXCEPT ![k].seq = n]
  /\ tampers' = tampers + 1
  /\ UNCHANGED <<pend, cur, res, crashes>>

TamperPrev(k) ==
  /\ tampers < MaxTampers
  /\ k \in DOMAIN store
  /\ \E h \in PrevSpace \ {store[k].prev} :
       store' = [store EXCEPT ![k].prev = h]
  /\ tampers' = tampers + 1
  /\ UNCHANGED <<pend, cur, res, crashes>>

Next ==
  \/ \E w \in Writers, p \in Payloads : Begin(w, p)
  \/ \E w \in Writers : Finish(w)
  \/ \E w \in Writers : ReadAll(w)
  \/ \E w \in Writers : LostAck(w)
  \/ \E w \in Writers : Reopen(w)
  \/ \E w \in Writers : OpenRefused(w)
  \/ \E k \in 1 .. Cap : TamperPayload(k)
  \/ \E k \in 1 .. Cap : TamperSeq(k)
  \/ \E k \in 1 .. Cap : TamperPrev(k)

Spec == Init /\ [][Next]_vars

--------------------------------------------------------------------------------
(***************************************************************************)
(* Invariants and properties.  Facts about a STEP (what an append did, what *)
(* a head adoption was licensed by, what a reopen read) are stated as       *)
(* action properties; facts about stored bytes are state invariants.        *)
(***************************************************************************)

TypeOK ==
  /\ \A i \in DOMAIN store : WellTypedRecord(store[i])
  /\ Len(store) <= Cap
  /\ tampers \in 0 .. MaxTampers
  /\ crashes \in 0 .. MaxCrashes
  /\ \A w \in Writers :
       /\ WellTypedCursor(cur[w])
       /\ res[w] \in Outcomes
       /\ LET q == pend[w] IN
          IF q.busy
            THEN /\ q.pay \in Payloads
                 /\ q.exp \in Positions
                 /\ WellTypedHead(q.prev)
            ELSE q = Idle

\* JL1, stated over stored bytes: the durable store is ONE well-formed chain.
\* A fork at a sequence number is exactly a record whose claimed seq is not
\* its position, or whose prev is not its predecessor's digest.  Only
\* checkable where no adversary is corrupting storage, so the configs with
\* MaxTampers > 0 check the action property below instead.
ChainIsSingleAndWellFormed == WellFormedChain(store)

\* An appender's snapshot is LIVE when the head it chained from is still the
\* head storage carries at that position.  The expected-position CAS proves
\* the claimed position is free; it reads nothing at the predecessor's
\* position and so cannot see the predecessor's bytes change underneath it.
\* FINDING-001 carries the counterexample that made this hypothesis explicit.
SnapshotIsLive(w) ==
  pend[w].busy =>
    IF pend[w].exp = 0
      THEN pend[w].prev = Genesis
      ELSE /\ pend[w].exp \in DOMAIN store
           /\ pend[w].prev = Dig(store[pend[w].exp])

\* JL1, the step form that survives an adversary: no APPENDER step breaks the
\* chain, given that no appender is holding a snapshot storage has since
\* rewritten.  The expected-position CAS is the whole of that guarantee — drop
\* it and two appenders racing the same position both land.  In every
\* corruption-free configuration the hypothesis is trivially true, so the law
\* is unweakened exactly where the CAS is the whole story.
WritersNeverForkTheChain ==
  [][(/\ WellFormedChain(store)
      /\ tampers' = tampers
      /\ \A w \in Writers : SnapshotIsLive(w))
       => WellFormedChain(store')]_vars

\* JL2: an append linearizes exactly once, or it conflicts.  The verdict the
\* appender reports is the thing checked, against what durable storage
\* actually did in that step:
\*   stored    — the store grew by exactly this entry, at the expected
\*               position, which was the tail;
\*   duplicate — nothing was appended and the expected position already holds
\*               THIS appender's own digest (the idempotent retry);
\*   conflict  — nothing was appended and the expected position does not hold
\*               this appender's digest.
\* No append is lost (a reported stored really is in storage), none is
\* doubled (the store grows by at most one, and only by this entry), and a
\* lost append reported as stored is exactly the violation.
AppendIsExactlyOnceOrConflict ==
  [][\A w \in Writers :
       (/\ pend[w].busy
        /\ ~pend'[w].busy
        /\ res'[w] \in {"stored", "duplicate", "conflict"}) =>
         LET e == pend[w].exp
             r == MkRecord(pend[w].pay, pend[w].prev, e)
             d == Dig(r)
             mine == e + 1 \in DOMAIN store' /\ Dig(store'[e + 1]) = d IN
         /\ Len(store') <= Len(store) + 1
         /\ res'[w] = "stored" =>
              /\ Len(store) = e
              /\ store' = Append(store, r)
         /\ res'[w] = "duplicate" => (store' = store /\ mine)
         /\ res'[w] = "conflict"  => (store' = store /\ ~mine)]_vars

\* JL3: the verify-on-read fold over ANY prefix reproduces that prefix's
\* stored head when the prefix is a well-formed chain, and otherwise reports
\* tamper at the FIRST bad position — never later, never silently.
ReadIsTamperEvident ==
  \A n \in 0 .. Len(store) :
    LET s == SubSeq(store, 1, n)
        v == FoldFrom(s, 1, Genesis) IN
    IF WellFormedChain(s)
      THEN v.ok /\ v.head = TrueHead(s)
      ELSE ~v.ok /\ v.at = FirstBadIndex(s) - 1

\* JL4 (D60, the one-verifier law): a handle's head changes only to a head
\* the stored-entry verifier licensed against the store as it then is.  Open,
\* verified read, and post-conflict resync all pass through it, so the writer
\* never inherits a weaker tamper-evidence law than the reader.
OnlyVerifiedHeadsAreAdopted ==
  [][\A w \in Writers :
       cur'[w] # cur[w] => Verifies(cur'[w], store')]_vars

\* JL5: recovery is a pure function of durable storage.  A reopen alters no
\* durable evidence, re-derives the head through the verifier rather than
\* remembering it, and drops in-flight work.
ReopenAgreesWithStorage ==
  \A w \in Writers :
    Reopen(w) =>
      /\ store' = store
      /\ cur'[w] = VerifiedTail(store).cursor
      /\ ~pend'[w].busy
RecoveryIsPureStorage == [][ReopenAgreesWithStorage]_vars

\* The store is bounded by the configured cap, checked rather than assumed.
JournalNaturallyBounded == Len(store) <= Cap

================================================================================
