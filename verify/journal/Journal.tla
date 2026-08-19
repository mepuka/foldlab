------------------------------- MODULE Journal --------------------------------
(***************************************************************************)
(* The hash-chained journal: chained CAS-append, verify-on-read, appender  *)
(* crash, and an untrusted store.  This is the durable substrate the       *)
(* plait package stands on — the daemon shape's publish / resolve /        *)
(* readAt / land operations, the anchor commit-at-expected-revision seam   *)
(* the fabric client drives, and the run-resumption tier the engine has    *)
(* not built yet.  go/journal/journal.go is the reference implementation   *)
(* modelled; the laws below are the model's own, and code-model            *)
(* correspondence is NOT claimed here.                                     *)
(*                                                                         *)
(* This module states the transition table ONCE.  Six Boolean constants    *)
(* select deliberately FAITHLESS variants (re-exported as module           *)
(* JournalBroken and JournalCatalogBroken), each dropping exactly one      *)
(* ratified law; TLC must refute each of them on that law's own invariant  *)
(* — a prover that cannot fail proves nothing.  All six FALSE is the       *)
(* ratified model.                                                         *)
(*                                                                         *)
(* The laws, as modelled:                                                  *)
(*   - J1 chain integrity: what the journal wrote is a chain from genesis  *)
(*     — every entry's declared position is its actual position and every  *)
(*     entry's prev is the derived head of the prefix before it.  The      *)
(*     expected-position CAS is what makes the link correct: an append     *)
(*     that lands anywhere other than the position its writer snapshotted  *)
(*     carries a prev that no longer names its predecessor.  BlindAppend   *)
(*     drops the CAS and must lose ChainIntegrity.                         *)
(*   - J2 append-only: a durable entry is never rewritten and never lost.  *)
(*     LossyCrash makes an appender's crash drop the tail it had already   *)
(*     stored (the non-durable-write design) and must lose AppendOnly.     *)
(*   - J3 one verifier: every cursor any path adopts — open, verified      *)
(*     read, post-conflict resync — is produced by the single stored-entry *)
(*     verifier, so the writer never inherits a weaker tamper-evidence law *)
(*     than the reader.  UnverifiedResync trusts the stored record's own   *)
(*     declared position instead of re-deriving it and must lose           *)
(*     AdoptionIsVerified.                                                 *)
(*   - J4 verify-on-read: a read standing on an anchor the journal itself  *)
(*     derived from what it wrote returns, below the tail, exactly the     *)
(*     entries the journal wrote — or refuses.  ForgivingRead drops the    *)
(*     prev-link check and must lose AnchoredReadIsGenuine.  The anchor is *)
(*     load-bearing and genesis is not one: what a genesis read does NOT   *)
(*     certify is RESIDUAL-001, witnessed by its own committed trace.      *)
(*   - J5 the absence snapshot survives the race: the split of create into *)
(*     a resolve-check (absence, snapshotted with the expected position)   *)
(*     and a CAS-append is what keeps two racing appenders from both       *)
(*     landing the same value.  StaleCasWins makes the losing appender     *)
(*     resync and append anyway — the naive retry — and must lose          *)
(*     NoDuplicatePayload.  This is the split-CAS branch the catalog gate  *)
(*     could not drive at its wire; here begin and finish are real         *)
(*     separate operations and the branch is reachable, witnessed.         *)
(*   - J6 the refinement into the catalog model lives in JournalCatalog;   *)
(*     BlindBegin drops the resolve-check and must lose it.                *)
(*                                                                         *)
(* Modelling decisions that diverge from or sharpen the reference          *)
(* implementation (stated so they can be argued with):                     *)
(*   - Content addressing is the identity function, exactly as the catalog *)
(*     model takes it: an entry IS its canonical bytes, and the digest of  *)
(*     an entry is its declared history extended by its own payload and    *)
(*     position.  Hash collisions and non-canonical encodings are          *)
(*     therefore outside everything checked; the reference's "wire bytes   *)
(*     are not canonical" refusal is vacuous in this abstraction and is    *)
(*     not claimed.                                                        *)
(*   - The stored-entry verifier checks the declared position against the  *)
(*     actual one and re-derives the head from the bytes.  It does NOT     *)
(*     walk back to genesis, matching the reference exactly: a canonical   *)
(*     but forged tail passes.  That gap is modelled, not papered over.    *)
(*   - Crash is modelled as an appender losing its in-memory cursor and    *)
(*     pending entry.  The store survives, because an acknowledged append  *)
(*     to file storage is durable by assumption; LossyCrash is the control *)
(*     that shows what the assumption buys.  Broker failure, partition,    *)
(*     and restart of the store itself are NOT modelled.                   *)
(*   - An append whose acknowledgement is lost is modelled as a landing    *)
(*     append after which the writer remains pending.  Its retry is the    *)
(*     byte-identical retry the reference performs, and the duplicate      *)
(*     outcome is the reference's confirmatory re-read.  The reference's   *)
(*     broker-side duplicate window is NOT modelled: the duplicate verdict *)
(*     here comes only from the re-read.                                   *)
(*   - Tamper is a fixed alphabet of three mutations of the stored bytes — *)
(*     rewrite a payload, rewrite a declared position, drop the tail.  An  *)
(*     adversary outside that alphabet is not modelled.  Tamper never      *)
(*     touches what the journal wrote, which is what makes soundness       *)
(*     statable at all.  Erasure is separated behind its own bound         *)
(*     selector because it is a different kind of threat: mutation is what *)
(*     the chain exists to detect, erasure is what it cannot.              *)
(*   - Which laws survive an untrusted store is itself a result, not an    *)
(*     assumption.  J1, J2, and J5 are laws of the trusted-store configs:  *)
(*     a forged tail poisons the next link, and an erasure un-appends.     *)
(*     What survives tamper is J3 and J4 — the one verifier and the read   *)
(*     fold — and the two residuals name precisely what those two miss.    *)
(*   - Writers are memoryless between attempts: a writer holds at most one *)
(*     pending entry, and a retry is a fresh open-begin-finish.  Consumer  *)
(*     groups, leases, and multi-partition folds are NOT modelled.         *)
(*   - Liveness is not modelled.  Every law here is safety; a writer that  *)
(*     never finishes is a legal behaviour.                                *)
(*   - Domains are literal finite ranges so a config outside them is       *)
(*     rejected instead of silently truncated.                             *)
(***************************************************************************)
EXTENDS FiniteSets, Integers, Sequences

CONSTANTS
  \* number of appender processes (>= 2 to schedule the CAS race)
  NumWriters,
  \* number of abstract payloads; a payload is also the catalog value it
  \* carries, which is what makes the refinement into the catalog statable
  NumPayloads,
  \* maximum journal length; a model bound, never a law
  Cap,
  \* how many substrate-tamper steps a behaviour may take (0 = trusted store)
  TamperBudget,
  \* whether the tamper alphabet includes ERASURE of the tail.  A bound
  \* selector, not a law: erasure is a threat the journal can neither
  \* prevent nor detect, so it is separated from mutation to keep the two
  \* residuals distinguishable
  AllowErasure,
  \* how many appender crashes a behaviour may take (0 = no process failure)
  CrashBudget,
  \* FAITHLESS: the append lands without the expected-position CAS (J1
  \* dropped) — must lose ChainIntegrity
  BlindAppend,
  \* FAITHLESS: an appender's crash drops the tail it already stored (J2
  \* dropped) — must lose AppendOnly
  LossyCrash,
  \* FAITHLESS: cursor adoption trusts the stored record's declared
  \* position instead of re-deriving it (J3 dropped) — must lose
  \* AdoptionIsVerified
  UnverifiedResync,
  \* FAITHLESS: the read fold skips the prev-link check (J4 dropped) —
  \* must lose CleanGenesisReadIsGenuineBelowTheTail
  ForgivingRead,
  \* FAITHLESS: the losing appender resyncs and appends anyway, the naive
  \* retry (J5 dropped) — must lose NoDuplicatePayload
  StaleCasWins,
  \* FAITHLESS: create begins without the resolve-check (J6 dropped) —
  \* must lose the catalog refinement, checked in JournalCatalog
  BlindBegin

\* Keep the expressible ceiling in one definition so widening the
\* executable domain does not require coordinated model edits.
LiteralDomain == 1..4

\* The configured domain sizes must stay within that expressible range.
\* Reject a config that claims a wider model instead of silently checking
\* the four-element truncation.
ASSUME NumWriters   \in LiteralDomain
ASSUME NumPayloads  \in LiteralDomain
ASSUME Cap          \in LiteralDomain
ASSUME TamperBudget \in 0..2
ASSUME CrashBudget  \in 0..2
ASSUME AllowErasure     \in BOOLEAN
ASSUME BlindAppend      \in BOOLEAN
ASSUME LossyCrash       \in BOOLEAN
ASSUME UnverifiedResync \in BOOLEAN
ASSUME ForgivingRead    \in BOOLEAN
ASSUME StaleCasWins     \in BOOLEAN
ASSUME BlindBegin       \in BOOLEAN

Writers  == { w \in LiteralDomain : w <= NumWriters }
Payloads == { p \in LiteralDomain : p <= NumPayloads }
SeqNums  == 0 .. Cap

(***************************************************************************)
(* Identity.  Content addressing: equal bytes <=> equal digest, so the     *)
(* digest space is the value space and derivation is the identity          *)
(* function.  The digest of an entry is its declared history extended by   *)
(* its own payload and declared position — injective by construction,      *)
(* which is exactly the collision-freedom assumption stated as a model.    *)
(* Genesis is the empty history.                                           *)
(***************************************************************************)
Genesis   == << >>
HeadSpace == UNION { [1..k -> (Payloads \X SeqNums)] : k \in 0..Cap }

\* A journal entry: the payload, the position it declares, and the head it
\* declares as its predecessor.  A stored entry is its own canonical bytes.
Entry     == [payload : Payloads, seq : SeqNums, prev : HeadSpace]
DigestOf(e) == Append(e.prev, <<e.payload, e.seq>>)

\* The placeholder an idle writer carries; never stored.
NullEntry == [payload |-> 1, seq |-> 0, prev |-> Genesis]

\* A cursor: the position of the entry it names and that entry's head.
GenesisCursor == [seq |-> -1, head |-> Genesis]
CursorSpace   == [seq : -1..Cap, head : HeadSpace]

VARIABLES
  \* the bytes the store holds; an untrusted surface, mutable by tamper
  store,
  \* what the journal itself durably appended; tamper never touches it.
  \* A history variable: it is what "the entry was written" means, and
  \* without it soundness cannot be stated at all.
  written,
  \* the appender processes: phase, held cursor, pending entry
  writers,
  \* remaining tamper steps
  tamperLeft,
  \* remaining appender crashes
  crashLeft

vars == <<store, written, writers, tamperLeft, crashLeft>>

(***************************************************************************)
(* The chain, as a fold over stored bytes.  HeadAt is a definition over    *)
(* the state, not a variable: a head that could drift from the bytes it    *)
(* summarises is not expressible here.                                     *)
(***************************************************************************)
HeadAt(s, n) == IF n = 0 THEN Genesis ELSE DigestOf(s[n])
CursorAt(s, n) == [seq |-> n - 1, head |-> DigestOf(s[n])]

(***************************************************************************)
(* The ONE stored-entry verifier (the reference's verifyStoredEntry).  It  *)
(* checks that the record's declared position is the position it occupies  *)
(* and re-derives the head from the bytes.  Open, verified read, and       *)
(* post-conflict resync all go through it — that single path is J3.        *)
(***************************************************************************)
StoredEntryVerifies(s, n) == n \in 1..Len(s) /\ s[n].seq = n - 1

\* Tail adoption (the reference's tailCursor).  Note what it does not do:
\* it verifies the tail record alone, never that the tail chains back to
\* genesis, so a canonical but forged tail is adopted.  RESIDUAL-001.
TailAdoptable(s) == \/ s = << >>
                    \/ UnverifiedResync
                    \/ StoredEntryVerifies(s, Len(s))

TailCursorOf(s) ==
  IF s = << >> THEN GenesisCursor
  ELSE IF UnverifiedResync
         THEN [seq |-> s[Len(s)].seq, head |-> DigestOf(s[Len(s)])]
         ELSE CursorAt(s, Len(s))

(***************************************************************************)
(* Verify-on-read: the fold a reader runs from its anchor forward, stopping *)
(* at the first position whose record fails the verifier or whose declared *)
(* predecessor is not the head the walk has reached.                       *)
(***************************************************************************)
ExpectedPrev(s, cur, n) == IF n = cur.seq + 2 THEN cur.head ELSE DigestOf(s[n - 1])

EntryReadOk(s, cur, n) ==
  /\ s[n].seq = n - 1
  /\ (ForgivingRead \/ s[n].prev = ExpectedPrev(s, cur, n))

BadPositions(s, cur) == { n \in (cur.seq + 2)..Len(s) : ~EntryReadOk(s, cur, n) }

ReadClean(s, cur) == BadPositions(s, cur) = {}

\* How far a read gets before it refuses: everything strictly below the
\* first bad position, which is what "reports tamper at the first bad
\* position" means as a definition rather than as a claim.
FirstBadPosition(s, cur) ==
  CHOOSE n \in BadPositions(s, cur) : \A m \in BadPositions(s, cur) : n <= m

ReadPrefixLen(s, cur) ==
  IF BadPositions(s, cur) = {} THEN Len(s) ELSE FirstBadPosition(s, cur) - 1

\* The anchor a resumed read stands on must itself verify (the reference's
\* verifyReadCursor).  The genesis anchor is the empty history.
AnchorOk(s, cur) ==
  IF cur.seq = -1
    THEN cur.head = Genesis
    ELSE StoredEntryVerifies(s, cur.seq + 1) /\ CursorAt(s, cur.seq + 1) = cur

\* The resolve fold the create path runs before it appends: the payloads a
\* verified read from genesis reaches.  The catalog's resolve index is the
\* same fold one layer up.
ResolvableFrom(s) == { s[n].payload : n \in 1..ReadPrefixLen(s, GenesisCursor) }

Init ==
  /\ store   = << >>
  /\ written = << >>
  /\ writers = [w \in Writers |->
                  [phase |-> "closed", cursor |-> GenesisCursor, entry |-> NullEntry]]
  /\ tamperLeft = TamperBudget
  /\ crashLeft  = CrashBudget

(***************************************************************************)
(* Open: adopt the verified tail.  A tail that does not verify is refused  *)
(* and the writer stays closed — the reference fails Open rather than      *)
(* adopting a head a read would reject.                                    *)
(***************************************************************************)
Open(w) ==
  /\ writers[w].phase = "closed"
  /\ TailAdoptable(store)
  /\ writers' = [writers EXCEPT ![w] =
        [phase |-> "open", cursor |-> TailCursorOf(store), entry |-> NullEntry]]
  /\ UNCHANGED <<store, written, tamperLeft, crashLeft>>

(***************************************************************************)
(* Begin: the create path's first half — a verified read from genesis      *)
(* whose fold is the resolve-check, and the cursor snapshot that fixes the *)
(* expected append position.  A payload the read already reaches converges *)
(* to the existing entry: no append, an observable no-op.  A read that     *)
(* refuses blocks the begin; the absence snapshot is only as sound as the  *)
(* bytes it was taken from, which is why NoDuplicatePayload is a law of    *)
(* the trusted-store configs alone.                                        *)
(***************************************************************************)
Begin(w, v) ==
  /\ writers[w].phase = "open"
  /\ AnchorOk(store, writers[w].cursor)
  /\ ReadClean(store, GenesisCursor)
  /\ LET tail == TailCursorOf(store) IN
     IF v \in ResolvableFrom(store) /\ ~BlindBegin
       THEN writers' = [writers EXCEPT ![w].cursor = tail]
       ELSE /\ tail.seq + 1 < Cap
            /\ writers' = [writers EXCEPT ![w] =
                  [phase  |-> "pending",
                   cursor |-> tail,
                   entry  |-> [payload |-> v,
                               seq     |-> tail.seq + 1,
                               prev    |-> tail.head]]]
  /\ UNCHANGED <<store, written, tamperLeft, crashLeft>>

(***************************************************************************)
(* Finish: the create path's second half — the CAS-append at the expected  *)
(* position.  It lands only if the store is still exactly that long, which *)
(* is the reference's expected-last-sequence publish.  Finish does NOT     *)
(* re-run the resolve-check: the CAS guards the position, and the recheck  *)
(* on a fresh Begin is what makes the same-payload race converge.          *)
(***************************************************************************)
\* A writer is attempting while it holds an entry it has not yet resolved:
\* pending (outcome unknown to us and to it) or landed (its bytes are in,
\* its acknowledgement was lost, and it will retry them byte for byte).
Attempting(w) == writers[w].phase \in {"pending", "landed"}

CasWins(w) == Len(store) = writers[w].entry.seq

OccupantIsOurs(w) ==
  LET e == writers[w].entry IN
  e.seq + 1 \in 1..Len(store) /\ store[e.seq + 1] = e

\* The CAS lands.  The writer either learns its new cursor, or loses the
\* acknowledgement and holds its entry for a byte-identical retry.  The
\* "landed" phase is a HISTORY variable: no participant can tell whether
\* its own append or a rival's identical bytes occupy the position, and
\* nothing in the transition relation branches on it.  The model knows,
\* because the refinement into the catalog model has to distinguish the
\* appender from a rival who wrote the same bytes, and the two are
\* observationally identical from inside.
FinishAppend(w) ==
  /\ writers[w].phase = "pending"
  /\ (CasWins(w) \/ BlindAppend)
  /\ Len(store) < Cap
  /\ store'   = Append(store, writers[w].entry)
  /\ written' = Append(written, writers[w].entry)
  /\ \/ writers' = [writers EXCEPT ![w] =
           [phase |-> "open", cursor |-> CursorAt(store', Len(store')), entry |-> NullEntry]]
     \/ writers' = [writers EXCEPT ![w].phase = "landed"]
  /\ UNCHANGED <<tamperLeft, crashLeft>>

\* The position is occupied by our own bytes: the earlier append landed and
\* its acknowledgement was lost.  The retry is idempotent, and the cursor
\* the writer adopts is the one it derived itself from those same bytes.
FinishDuplicate(w) ==
  /\ Attempting(w)
  /\ ~(CasWins(w) \/ BlindAppend)
  /\ OccupantIsOurs(w)
  /\ writers' = [writers EXCEPT ![w] =
        [phase  |-> "open",
         cursor |-> [seq |-> writers[w].entry.seq, head |-> DigestOf(writers[w].entry)],
         entry  |-> NullEntry]]
  /\ UNCHANGED <<store, written, tamperLeft, crashLeft>>

\* A rival holds the position.  The append is refused, the writer resyncs
\* through the one verifier, and retry is the caller's — the observable
\* no-op the catalog model sees as a conflict.  A resync whose tail does
\* not verify leaves the cursor untouched: the reference heals only through
\* a head a read would accept.
FinishConflict(w) ==
  /\ Attempting(w)
  /\ ~(CasWins(w) \/ BlindAppend)
  /\ ~OccupantIsOurs(w)
  /\ IF StaleCasWins
       THEN /\ Len(store) < Cap
            /\ LET tail == TailCursorOf(store)
                   fresh == [payload |-> writers[w].entry.payload,
                             seq     |-> tail.seq + 1,
                             prev    |-> tail.head] IN
               /\ store'   = Append(store, fresh)
               /\ written' = Append(written, fresh)
               /\ writers' = [writers EXCEPT ![w] =
                     [phase |-> "open", cursor |-> CursorAt(store', Len(store')),
                      entry |-> NullEntry]]
       ELSE /\ UNCHANGED <<store, written>>
            /\ writers' = [writers EXCEPT ![w] =
                  [phase  |-> "open",
                   cursor |-> IF TailAdoptable(store)
                                THEN TailCursorOf(store)
                                ELSE writers[w].cursor,
                   entry  |-> NullEntry]]
  /\ UNCHANGED <<tamperLeft, crashLeft>>

(***************************************************************************)
(* Crash: the appender loses its cursor and its pending entry.  What it    *)
(* had already stored survives, because an acknowledged append to file     *)
(* storage is durable by assumption.  LossyCrash is that assumption        *)
(* dropped.                                                                *)
(***************************************************************************)
Crash(w) ==
  /\ crashLeft > 0
  /\ writers[w].phase # "closed"
  /\ crashLeft' = crashLeft - 1
  /\ writers' = [writers EXCEPT ![w] =
        [phase |-> "closed", cursor |-> GenesisCursor, entry |-> NullEntry]]
  /\ IF LossyCrash /\ store # << >> /\ written # << >>
       THEN /\ store'   = SubSeq(store, 1, Len(store) - 1)
            /\ written' = SubSeq(written, 1, Len(written) - 1)
       ELSE UNCHANGED <<store, written>>
  /\ UNCHANGED tamperLeft

(***************************************************************************)
(* Tamper: the store is not trusted.  Three mutations of the stored bytes  *)
(* — rewrite a payload, rewrite a declared position, drop the tail.  What  *)
(* the journal wrote is never touched, which is what makes verify-on-read  *)
(* soundness a statable claim rather than a tautology.                     *)
(***************************************************************************)
TamperPayload(n, p) ==
  /\ tamperLeft > 0
  /\ n \in 1..Len(store)
  /\ p # store[n].payload
  /\ store' = [store EXCEPT ![n].payload = p]
  /\ tamperLeft' = tamperLeft - 1
  /\ UNCHANGED <<written, writers, crashLeft>>

TamperSeq(n, k) ==
  /\ tamperLeft > 0
  /\ n \in 1..Len(store)
  /\ k # store[n].seq
  /\ store' = [store EXCEPT ![n].seq = k]
  /\ tamperLeft' = tamperLeft - 1
  /\ UNCHANGED <<written, writers, crashLeft>>

TamperTruncate ==
  /\ AllowErasure
  /\ tamperLeft > 0
  /\ store # << >>
  /\ store' = SubSeq(store, 1, Len(store) - 1)
  /\ tamperLeft' = tamperLeft - 1
  /\ UNCHANGED <<written, writers, crashLeft>>

Next ==
  \/ \E w \in Writers : Open(w)
  \/ \E w \in Writers, v \in Payloads : Begin(w, v)
  \/ \E w \in Writers : FinishAppend(w)
  \/ \E w \in Writers : FinishDuplicate(w)
  \/ \E w \in Writers : FinishConflict(w)
  \/ \E w \in Writers : Crash(w)
  \/ \E n \in 1..Cap, p \in Payloads : TamperPayload(n, p)
  \/ \E n \in 1..Cap, k \in SeqNums : TamperSeq(n, k)
  \/ TamperTruncate

Spec == Init /\ [][Next]_vars

--------------------------------------------------------------------------------
(***************************************************************************)
(* Laws.  Facts about a STEP are stated as action properties; facts about  *)
(* a state are invariants.  Each law names the faithless constant that     *)
(* must refute it.                                                         *)
(***************************************************************************)

TypeOK ==
  /\ Len(store)   <= Cap
  /\ Len(written) <= Cap
  /\ \A n \in 1..Len(store)   : store[n]   \in Entry
  /\ \A n \in 1..Len(written) : written[n] \in Entry
  /\ tamperLeft \in 0..TamperBudget
  /\ crashLeft  \in 0..CrashBudget
  /\ \A w \in Writers :
       /\ writers[w].phase \in {"closed", "open", "pending", "landed"}
       /\ writers[w].cursor \in CursorSpace
       /\ writers[w].entry \in Entry
       /\ (writers[w].phase = "closed" => writers[w].cursor = GenesisCursor)

\* J1.  Over a trusted store: what the journal wrote is a chain from
\* genesis — every entry's declared position is the position it occupies,
\* and every entry's declared predecessor is the derived head of the
\* prefix before it.  A law of the trusted-store configs: an appender that
\* adopts a FORGED TAIL chains its next entry to bytes the journal never
\* wrote, and no check the reference performs can see that (RESIDUAL-001).
\* Refuted by: BlindAppend.
ChainIntegrity ==
  \A n \in 1..Len(written) :
    /\ written[n].seq = n - 1
    /\ written[n].prev = HeadAt(written, n - 1)

\* J2.  A durable entry is never rewritten and never lost: the journal
\* grows by extension only.  Conditional on a substrate that does not
\* erase — an administrative purge is outside anything the journal can
\* prevent or detect, which is RESIDUAL-002 and its own committed trace.
\* Refuted by: LossyCrash.
AppendOnly ==
  [][ /\ Len(written') >= Len(written)
      /\ \A n \in 1..Len(written) : written'[n] = written[n] ]_vars

\* The predicate the one verifier certifies: the cursor names a stored
\* record whose declared position is the position it occupies, and the
\* cursor's head is that record's derived digest.
CursorIsVerifiedAgainst(s, cur) ==
  \/ cur = GenesisCursor
  \/ /\ cur.seq + 1 \in 1..Len(s)
     /\ s[cur.seq + 1].seq = cur.seq
     /\ cur.head = DigestOf(s[cur.seq + 1])

\* J3.  Every cursor any path adopts — open, verified read, post-conflict
\* resync — was produced by that one verifier against the bytes then
\* stored.  The writer never inherits a weaker tamper-evidence law than
\* the reader.  Refuted by: UnverifiedResync.
AdoptionIsVerified ==
  [][ \A w \in Writers :
        (writers'[w].cursor # writers[w].cursor)
          => CursorIsVerifiedAgainst(store', writers'[w].cursor) ]_vars

\* An anchor the journal itself derived over bytes it wrote.  Genesis is
\* deliberately NOT one: the empty history pins no content, so a read from
\* genesis certifies the shape of a chain and nothing about whose chain it
\* is.  This is the resumption coordinate a consumer keeps.
TrustedAnchor(cur) ==
  /\ cur.seq >= 0
  /\ cur.seq + 1 \in 1..Len(written)
  /\ written[cur.seq + 1].seq = cur.seq
  /\ cur.head = DigestOf(written[cur.seq + 1])

\* J4.  Verify-on-read is sound below the tail, RELATIVE TO A TRUSTED
\* ANCHOR, SO LONG AS what the journal wrote is still a chain: a read that
\* stands on an anchor the journal derived from what it wrote, and comes
\* back clean, returns at every position below the tail exactly the entry
\* the journal wrote.  A mutation anywhere but the tail breaks the link
\* its successor declares; the tail has no successor.
\*
\* The chain hypothesis is not decoration, and dropping it was the first
\* thing this model refuted.  An appender that adopts a forged tail writes
\* its next entry ONTO the forgery, and from that step on the journal's own
\* writes are not a chain and no reader can separate them from the bytes
\* the journal wrote.  That is RESIDUAL-001, with its trace.  J1 and J4
\* compose here rather than each standing alone, which is the honest shape
\* of the guarantee a resuming consumer actually gets.
\* Refuted by: ForgivingRead.
AnchoredReadIsGenuine ==
  ChainIntegrity =>
    \A w \in Writers :
      LET cur == writers[w].cursor IN
      (  /\ writers[w].phase # "closed"
         /\ TrustedAnchor(cur)
         /\ AnchorOk(store, cur)
         /\ ReadClean(store, cur) )
        => \A n \in (cur.seq + 2)..(Len(store) - 1) :
             /\ n <= Len(written)
             /\ store[n] = written[n]

\* J5.  The absence snapshot survives the race: two appenders that both
\* found a payload absent cannot both land it, because the loser's CAS
\* fails at the position it snapshotted.  A law of the trusted-store
\* configs: an absence read from tampered bytes is absence of evidence.
\* Refuted by: StaleCasWins.
NoDuplicatePayload ==
  \A m, n \in 1..Len(written) :
    written[m].payload = written[n].payload => m = n

\* RESIDUAL-001.  NOT a claim — the statement verify-on-read does not
\* support, kept here so the gap is checked rather than assumed.  A reader
\* who anchors at GENESIS, holding no prior head, accepts a mutated tail:
\* it is canonical and it chains from its predecessor, and the reference
\* has the same gap, stated where it adopts a tail.  The trace goes
\* further than the reference's note does, and that is the finding worth
\* leading with: once an honest appender chains ONTO a forged tail, the
\* forgery is laundered into the chain's interior and no later read from
\* genesis can ever detect it.  Tail forgery is not confined to the tail.
\* The config expects a VIOLATION and commits the trace.
CleanGenesisReadIsGenuineBelowTheTail ==
  ReadClean(store, GenesisCursor) =>
    \A n \in 1..(Len(store) - 1) :
      /\ n <= Len(written)
      /\ store[n] = written[n]

\* RESIDUAL-002.  Also NOT a claim.  With erasure in the tamper alphabet a
\* durable entry simply leaves, and what remains is a perfectly valid
\* shorter chain: a fold from genesis comes back clean, and nothing in the
\* bytes says an entry is missing.  The journal gets no vote on an
\* administrative purge, and the chain is not the mechanism that would
\* notice one — only a reader still holding an anchor past the new tail
\* can tell, and a fresh reader never can.  The config expects a
\* VIOLATION and commits the trace.
NothingWrittenIsMissing == Len(store) >= Len(written)

\* Anti-vacuity witnesses.  Each MUST be violated: a law about a branch no
\* behaviour reaches is a law about nothing.  The first is the split-CAS
\* conflict the catalog gate could not drive at its wire.
NoStaleCasConflict ==
  \A w \in Writers : ~(Attempting(w) /\ ~CasWins(w) /\ ~OccupantIsOurs(w))

NoUncertainRetryDuplicate ==
  \A w \in Writers : ~(writers[w].phase = "landed" /\ ~CasWins(w) /\ OccupantIsOurs(w))

\* A trusted store is one nothing tampered with.  Pinned in the configs
\* that assume it, so an accidental tamper step cannot hide inside them.
StoreEqualsWritten == store = written

================================================================================
