------------------------------- MODULE Effector -------------------------------
(***************************************************************************)
(* The effector's abstract commitment protocol (SPEC section 6.1), as a    *)
(* TLA+ specification.  This module states the transition table ONCE; the  *)
(* constant TwoKey selects between the ratified single-key protocol        *)
(* (TwoKey = FALSE) and the WITHDRAWN two-key protocol (TwoKey = TRUE,     *)
(* re-exported as module EffectorTwoKey), whose fencing violation the      *)
(* checker must rediscover.                                                *)
(*                                                                         *)
(* Provenance and the equality obligation.  This table is a transcription  *)
(* of go/effector/model/model.go (itself transcribed to                    *)
(* packages/mech/src/effector.ts with byte-identical canonical encoding).  *)
(* Transcriptions drift, so the equality is CHECKED, not asserted: the     *)
(* TLC-reachable state set of this module is compared for exact set        *)
(* equality against the TS model's BFS closure (packages/mech/test/        *)
(* tlc.parity.test.ts, via TLC -dump), and the TS model is pinned          *)
(* byte-for-byte against the Go model (effector.wall.test.ts).  The chain  *)
(* TLA+ = TS = Go is what entitles the Go conformance driver to call its   *)
(* schedules "derived from the same pinned transition table as the specs". *)
(*                                                                         *)
(* Modelling decisions (same as the Go model, stated so they can be        *)
(* argued with):                                                           *)
(*   - ONE work digest: the protocol is per-key, so one key is the whole   *)
(*     protocol.                                                           *)
(*   - Time is a boolean: a claim is live until an explicit Expire event   *)
(*     lapses it.  Expiry is a client-side comparison, so it mutates no    *)
(*     register and bumps no revision (freshness survives Expire).         *)
(*   - Commit is SPLIT into Begin (read fence + revision) and Finish (the  *)
(*     conditional write), so a client-side pause between them is          *)
(*     schedulable.  This split is what found CEX-3.                       *)
(*   - Claim is atomic: its read and CAS are one step.                     *)
(*   - Owners are sequential crash-stop processes unless SelfInterleave.   *)
(*   - Revisions are not counted: a snapshot once stale stays stale, so    *)
(*     the revision collapses to one `fresh` bit per pending commit.       *)
(*     This is exact, not an abstraction.                                  *)
(*                                                                         *)
(* The register is an algebraic sum type                                   *)
(*     Register = Absent | Claim(fence, owner, live) | Done(fence, result) *)
(* encoded as a tagged record whose unused fields are zeroed by the        *)
(* constructors (the Go model's `normalize`): two states that behave       *)
(* identically are EQUAL, so TLC's distinct-state count is comparable      *)
(* 1:1 with the Go/TS checkers' counts.                                    *)
(***************************************************************************)
EXTENDS Integers

CONSTANTS
  \* @type: Int;  number of owners (crash-stop processes), 1-based ids
  NumOwners,
  \* @type: Bool; FALSE = ratified single-key, TRUE = withdrawn two-key
  TwoKey,
  \* @type: Bool; allow stealing a LIVE claim (strictly stronger than the
  \* real protocol, which waits for the lease to lapse; safety must not
  \* depend on the clock, SPEC 6.3)
  AdversarialSteal,
  \* @type: Bool; let an owner act while its own commit is paused
  SelfInterleave,
  \* @type: Bool; enable crash-stop at every point
  AllowCrash,
  \* @type: Int;  generation bound making the system finite; 0 = unbounded
  \* (unbounded is for Apalache's inductive proof, never for TLC)
  FenceCap

\* Filtered from a literal range rather than 1..NumOwners: Apalache does not
\* accept integer ranges with symbolic bounds (known issue).  4 mirrors the
\* Go model's MaxOwners; the filter is semantically identical for TLC.
Owners == { o \in 1..4 : o <= NumOwners }

(***************************************************************************)
(* Type aliases (Apalache Snowcat; comments to TLC).  The register is the  *)
(* ADT  Absent | Claim(fence, owner, live) | Done(fence, result)  encoded  *)
(* as a tagged record.                                                     *)
(***************************************************************************)
\* @typeAlias: register = { tag: Str, fence: Int, owner: Int, live: Bool, result: Int };
\* @typeAlias: pend = { active: Bool, usedFence: Int, snapTag: Str, snapFence: Int, snapResult: Int, fresh: Bool };
\* @typeAlias: proc = { crashed: Bool, hasClaim: Bool, fence: Int, pend: $pend };
\* @typeAlias: procMap = Int -> $proc;
EffectorAliases == TRUE

(***************************************************************************)
(* The Register ADT.  Constructors zero every field the variant cannot     *)
(* read; all state construction goes through them.                         *)
(***************************************************************************)
\* @type: $register;
AbsentReg ==
  [tag |-> "absent", fence |-> 0, owner |-> 0, live |-> FALSE, result |-> 0]
\* @type: (Int, Int, Bool) => $register;
ClaimReg(f, o, l) ==
  [tag |-> "claim", fence |-> f, owner |-> o, live |-> l, result |-> 0]
\* @type: (Int, Int) => $register;
DoneReg(f, r) ==
  [tag |-> "done", fence |-> f, owner |-> 0, live |-> FALSE, result |-> r]

(***************************************************************************)
(* A pending commit: begun (the register read) but not finished (the       *)
(* write).  `fresh` is the collapsed revision: TRUE iff no write to the    *)
(* authority register has landed since this commit's Begin.  The two-key   *)
(* finish never consults a revision, so TwoKey pins fresh to FALSE (the    *)
(* Go model's normalize does the same; it keeps the state spaces           *)
(* comparable and is itself the heart of the two-key bug).                 *)
(***************************************************************************)
\* @type: $pend;
NoPend ==
  [active |-> FALSE, usedFence |-> 0, snapTag |-> "absent",
   snapFence |-> 0, snapResult |-> 0, fresh |-> FALSE]

\* @type: $proc;
IdleProc ==
  [crashed |-> FALSE, hasClaim |-> FALSE, fence |-> 0, pend |-> NoPend]
\* @type: $proc;
CrashedProc ==
  [crashed |-> TRUE, hasClaim |-> FALSE, fence |-> 0, pend |-> NoPend]

VARIABLES
  \* @type: $register;
  key1,      \* authority register (single-key) / claim register (two-key)
  \* @type: $register;
  key2,      \* outcome register (two-key only; pinned Absent in single-key)
  \* @type: Int;
  maxFence,  \* the greatest claim generation ever linearized
  \* @type: $procMap;
  procs

vars == <<key1, key2, maxFence, procs>>

\* The register that carries the terminal outcome, if any.
Term == IF TwoKey THEN key2 ELSE key1

Max(a, b) == IF a > b THEN a ELSE b

(***************************************************************************)
(* Every write to the authority register moves its revision: all           *)
(* outstanding begin-side snapshots of it are stale, forever.              *)
(***************************************************************************)
\* @type: ($procMap) => $procMap;
MarkKey1Written(ps) ==
  [o \in Owners |->
    IF ps[o].pend.active THEN [ps[o] EXCEPT !.pend.fresh = FALSE] ELSE ps[o]]

Init ==
  /\ key1 = AbsentReg
  /\ key2 = AbsentReg
  /\ maxFence = 0
  /\ procs = [o \in Owners |-> IdleProc]

(***************************************************************************)
(* The environment: a live lease lapses.  A client-side comparison, so no  *)
(* register write and no revision bump — freshness survives.               *)
(***************************************************************************)
Expire ==
  /\ key1.tag = "claim"
  /\ key1.live
  /\ key1' = [key1 EXCEPT !.live = FALSE]
  /\ UNCHANGED <<key2, maxFence, procs>>

Crash(o) ==
  /\ AllowCrash
  /\ ~procs[o].crashed
  /\ procs' = [procs EXCEPT ![o] = CrashedProc]
  /\ UNCHANGED <<key1, key2, maxFence>>

(***************************************************************************)
(* claim(d, o, lease): create, or steal a claim.  The read and CAS are one *)
(* step.  A steal past the generation cap is not modelled — the bound is   *)
(* the bound, and silently wrapping a fence would be a lie — but a claim   *)
(* that would NOT steal (live claim, terminal outcome) stays enabled: its  *)
(* refusal (ErrHeld / ErrCommitted) is an observable no-op.                *)
(***************************************************************************)
TakeClaim(o, f) ==
  /\ key1' = ClaimReg(f, o, TRUE)
  /\ maxFence' = Max(maxFence, f)
  /\ procs' = [MarkKey1Written(procs) EXCEPT ![o].hasClaim = TRUE,
                                             ![o].fence = f]
  /\ UNCHANGED key2

WouldSteal == key1.tag = "claim" /\ (~key1.live \/ AdversarialSteal)

Claim(o) ==
  /\ ~procs[o].crashed
  /\ ~(procs[o].pend.active /\ ~SelfInterleave)
  /\ ~(WouldSteal /\ Term.tag /= "done"
        /\ FenceCap > 0 /\ key1.fence >= FenceCap)
  /\ IF Term.tag = "done"
       THEN UNCHANGED vars                    \* ErrCommitted
     ELSE IF key1.tag = "absent"
       THEN TakeClaim(o, 1)                   \* create (K1)
     ELSE IF key1.live /\ ~AdversarialSteal
       THEN UNCHANGED vars                    \* ErrHeld
       ELSE TakeClaim(o, key1.fence + 1)      \* steal with fence+1 (K2);
            \* no owner exception: fencing is generations, not identity

(***************************************************************************)
(* commit, first half: read the fence and the revision.  The snapshot      *)
(* copies the register (whose constructors already zeroed unreadable       *)
(* fields, so the snapshot is normalized by construction).                 *)
(***************************************************************************)
Begin(o) ==
  /\ ~procs[o].crashed
  /\ procs[o].hasClaim
  /\ ~procs[o].pend.active
  /\ procs' = [procs EXCEPT ![o].pend =
       [active |-> TRUE, usedFence |-> procs[o].fence,
        snapTag |-> key1.tag, snapFence |-> key1.fence,
        snapResult |-> key1.result, fresh |-> ~TwoKey]]
  /\ UNCHANGED <<key1, key2, maxFence>>

(***************************************************************************)
(* commit, second half.  Single-key: the fence observed at Begin must be   *)
(* the caller's, and the write is a CAS at the revision observed at Begin  *)
(* — validation and mutation are ONE linearization point.  Two-key         *)
(* (WITHDRAWN): the fence is validated on the claim register and the       *)
(* outcome is then CREATED on a different register; nothing binds the      *)
(* create to the validation — that gap is CEX-3.                           *)
(***************************************************************************)
\* @type: ($procMap, Int) => $procMap;
ClearPend(ps, o) == [ps EXCEPT ![o].pend = NoPend]

FinishNoWrite(o) ==   \* Fenced / ErrCommitted / idempotent: client-only outcome
  /\ procs' = ClearPend(procs, o)
  /\ UNCHANGED <<key1, key2, maxFence>>

FinishSingleKey(o) ==
  LET pd == procs[o].pend IN
  IF pd.snapTag = "claim" /\ pd.snapFence = pd.usedFence /\ pd.fresh
    THEN /\ key1' = DoneReg(pd.usedFence, o)   \* the ONLY terminal write
         /\ procs' = ClearPend(MarkKey1Written(procs), o)
         /\ UNCHANGED <<key2, maxFence>>
    ELSE FinishNoWrite(o)
    \* snapTag "absent" (no claim to commit under), snapTag "done"
    \* (classify: fenced/idempotent/conflict), fence mismatch, and the
    \* stale-CAS re-read all resolve client-side without a write.

FinishTwoKey(o) ==
  LET pd == procs[o].pend IN
  IF pd.snapTag = "claim" /\ pd.snapFence = pd.usedFence
       /\ key2.tag = "absent"
    THEN /\ key2' = DoneReg(pd.usedFence, o)   \* unfenced create: the bug
         /\ procs' = ClearPend(procs, o)       \* key1's revision untouched
         /\ UNCHANGED <<key1, maxFence>>
    ELSE FinishNoWrite(o)

Finish(o) ==
  /\ ~procs[o].crashed
  /\ procs[o].pend.active
  /\ IF TwoKey THEN FinishTwoKey(o) ELSE FinishSingleKey(o)

Next ==
  \/ Expire
  \/ \E o \in Owners: Claim(o) \/ Begin(o) \/ Finish(o) \/ Crash(o)

Spec == Init /\ [][Next]_vars

--------------------------------------------------------------------------------
(***************************************************************************)
(* Invariants and properties.  FencingSafety is a property of a WRITE, so  *)
(* it is stated as an action property, exactly as the Go checker states    *)
(* it; TerminalFenceIsMaximal is its state-level shadow.                   *)
(***************************************************************************)

RegisterType(r) ==
  /\ r.tag \in {"absent", "claim", "done"}
  /\ r.fence >= 0
  /\ r.owner \in Owners \cup {0}
  /\ r.result \in Owners \cup {0}
  /\ r.tag = "absent" => r = AbsentReg
  /\ r.tag = "claim"  => r.fence >= 1 /\ r.owner \in Owners /\ r.result = 0
  /\ r.tag = "done"   => r.fence >= 1 /\ r.owner = 0 /\ ~r.live
                           /\ r.result \in Owners

TypeOK ==
  /\ RegisterType(key1)
  /\ RegisterType(key2)
  /\ TwoKey => key1.tag /= "done"
  /\ ~TwoKey => key2 = AbsentReg
  /\ maxFence >= 0
  /\ \A o \in Owners:
       LET p == procs[o] IN
       /\ p.crashed => p = CrashedProc
       /\ ~p.hasClaim => p.fence = 0
       /\ ~p.pend.active => p.pend = NoPend
       /\ p.pend.active =>
            /\ p.pend.snapTag \in {"absent", "claim", "done"}
            /\ p.pend.snapTag = "absent" =>
                 p.pend.snapFence = 0 /\ p.pend.snapResult = 0
            /\ p.pend.snapTag = "claim" => p.pend.snapResult = 0
            /\ TwoKey => ~p.pend.fresh

\* SPEC 6.3 as the audit searched for it: no successful commit may carry a
\* fence below the maximum linearized generation.  The terminal write is
\* the only transition that makes Term become "done".
FencingSafety ==
  [][(Term'.tag = "done" /\ Term.tag /= "done")
       => Term'.fence = maxFence']_vars

\* SPEC 6.2: Done is terminal — once a terminal outcome exists, no
\* transition may change it.
UniqueTerminalOutcome == [][Term.tag = "done" => Term' = Term]_vars

\* State-level shadow of fencing safety: a stored outcome always carries
\* the greatest generation ever linearized.
TerminalFenceIsMaximal == Term.tag = "done" => Term.fence = maxFence

\* Fences never go backwards.
GenerationsAreMonotone == [][maxFence' >= maxFence]_vars

================================================================================
