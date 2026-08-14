------------------------------- MODULE Pipeline -------------------------------
(***************************************************************************)
(* The create pipeline and the snapshot law.                               *)
(*                                                                         *)
(* Source of truth: docs/research/2026-08-14-architecture-audit.md §2.2    *)
(* and the Go lane report §5. A type.create commits TWO catalog entries — *)
(* the fact, then the scheme bridge (catalog.go:226-232) — under the      *)
(* catalog mutex, and then builds its reply. On main the reply's head is  *)
(* read OUTSIDE the lock, after both appends (dispatch.go:109), so a      *)
(* concurrent create can advance the head between commit and reply, and   *)
(* even without interleaving the head names the bridge while the seq      *)
(* names the fact.                                                        *)
(*                                                                         *)
(* THE SNAPSHOT LAW (pre-registered by the audit): every reply that names *)
(* a head names the head its facts were read under — concretely, a create *)
(* reply's (seq, head) satisfies: seq addresses this op's fact, head =    *)
(* seq + 1, and head addresses this op's bridge. The repaired rule        *)
(* captures the reply inside the critical section (the frontierSnapshot   *)
(* pattern, catalog.go:111-126); the shipped rule reads the head later.   *)
(*                                                                         *)
(* Abstractions, stated:                                                   *)
(* - A head is abstracted to a journal position: entries are unique, so   *)
(*   head equality ⇔ prefix equality, and "the head the reply claims"     *)
(*   is faithfully modeled by the length of the prefix it commits to.     *)
(* - Certification always succeeds (grammar/refusal branches are the      *)
(*   walk's lane, not this spec's); convergence (duplicate create) is out *)
(*   of scope at these bounds.                                            *)
(* - The catalog mutex is modeled as a lock: no other op appends between  *)
(*   an op's fact and bridge. A CRASH between the two appends remains     *)
(*   possible — the lock gives mutual exclusion, not crash-atomicity —    *)
(*   which is exactly the audit's §5.3 orphan-fact residual.              *)
(*                                                                         *)
(* The transition table is stated ONCE; the shipped behavior is the Rule  *)
(* constant flipped in a config:                                           *)
(*   Rule = "snapshot"  reply captured atomically at the bridge append    *)
(*   Rule = "shipped"   head read after the lock is released              *)
(*                                                                         *)
(* Expected verdicts (the run.sh gate):                                    *)
(*   Pipeline.cfg              clean — TypeOK, SeqHeadCoherent,           *)
(*                             RepliedImpliesBridged (crashes enabled)    *)
(*   Pipeline.shipped.cfg      REFUTED on SeqHeadCoherent                 *)
(*   Pipeline.orphan.cfg       REFUTED on NoOrphanFact — the committed    *)
(*                             trace IS the §5.3 finding: a crash between *)
(*                             fact and bridge leaves a durable fact with *)
(*                             no bridge and no reply                     *)
(*   Pipeline.shipped-bridged.cfg  PASSES RepliedImpliesBridged — even    *)
(*                             the shipped rule never replies unbridged;  *)
(*                             the defect is head provenance only         *)
(***************************************************************************)
EXTENDS Naturals, Sequences, FiniteSets

CONSTANT Rule
ASSUME RuleIsNamed == Rule \in {"snapshot", "shipped"}

Ops == {"o1", "o2"}

NoReply == [seq |-> 0, head |-> 0]

VARIABLES journal, phase, reply, lock
vars == <<journal, phase, reply, lock>>

Init == /\ journal = <<>>
        /\ phase = [o \in Ops |-> "start"]
        /\ reply = [o \in Ops |-> NoReply]
        /\ lock = "none"

Certify(o) == /\ phase[o] = "start"
              /\ phase' = [phase EXCEPT ![o] = "certified"]
              /\ UNCHANGED <<journal, reply, lock>>

(* Enter the critical section and append the fact. *)
AcquireAndFact(o) ==
  /\ phase[o] = "certified"
  /\ lock = "none"
  /\ lock' = o
  /\ journal' = Append(journal, [op |-> o, kind |-> "fact"])
  /\ phase' = [phase EXCEPT ![o] = "facted"]
  /\ UNCHANGED reply

FactPos(o) ==
  CHOOSE i \in DOMAIN journal : journal[i].op = o /\ journal[i].kind = "fact"

(* Append the bridge and leave the critical section. Under the snapshot
   rule the reply is captured here, atomically with the commit; under the
   shipped rule the head read happens later, unlocked. *)
BridgeAndRelease(o) ==
  /\ phase[o] = "facted"
  /\ lock = o
  /\ lock' = "none"
  /\ journal' = Append(journal, [op |-> o, kind |-> "bridge"])
  /\ IF Rule = "snapshot"
     THEN /\ reply' = [reply EXCEPT ![o] =
                        [seq |-> FactPos(o), head |-> Len(journal')]]
          /\ phase' = [phase EXCEPT ![o] = "replied"]
     ELSE /\ phase' = [phase EXCEPT ![o] = "bridged"]
          /\ UNCHANGED reply

(* The shipped reply: head is whatever the journal length is NOW —
   dispatch.go:109, outside the lock, after the bridge. *)
ReplyShipped(o) ==
  /\ Rule = "shipped"
  /\ phase[o] = "bridged"
  /\ reply' = [reply EXCEPT ![o] = [seq |-> FactPos(o), head |-> Len(journal)]]
  /\ phase' = [phase EXCEPT ![o] = "replied"]
  /\ UNCHANGED <<journal, lock>>

(* Substrate failure between the two appends: the fact is durable, the
   bridge never lands, the reply is dropped (catalog.go:232-236). *)
CrashInLock(o) ==
  /\ phase[o] = "facted"
  /\ lock = o
  /\ lock' = "none"
  /\ phase' = [phase EXCEPT ![o] = "crashed"]
  /\ UNCHANGED <<journal, reply>>

Done == /\ \A o \in Ops : phase[o] \in {"replied", "crashed"}
        /\ UNCHANGED vars

Next == Done \/ \E o \in Ops :
          Certify(o) \/ AcquireAndFact(o) \/ BridgeAndRelease(o)
          \/ ReplyShipped(o) \/ CrashInLock(o)

Spec == Init /\ [][Next]_vars

--------------------------------------------------------------------------------

Entry == [op : Ops, kind : {"fact", "bridge"}]

TypeOK == /\ journal \in Seq(Entry)
          /\ phase \in [Ops -> {"start", "certified", "facted", "bridged",
                                "replied", "crashed"}]
          /\ lock \in Ops \cup {"none"}
          /\ \A o \in Ops :
               reply[o] = NoReply \/ reply[o] \in [seq : 1..4, head : 1..4]

Replied(o) == phase[o] = "replied"

(* THE SNAPSHOT LAW: the reply's seq addresses this op's fact, and the
   reply's head is this op's own commit point — the bridge at seq + 1 —
   never a later state of the journal. *)
SeqHeadCoherent ==
  \A o \in Ops : Replied(o) =>
    /\ reply[o].seq \in DOMAIN journal
    /\ journal[reply[o].seq] = [op |-> o, kind |-> "fact"]
    /\ reply[o].head = reply[o].seq + 1
    /\ reply[o].head \in DOMAIN journal
    /\ journal[reply[o].head] = [op |-> o, kind |-> "bridge"]

(* No reply without a durable bridge — holds under BOTH rules. *)
RepliedImpliesBridged ==
  \A o \in Ops : Replied(o) =>
    \E i \in DOMAIN journal : journal[i].op = o /\ journal[i].kind = "bridge"

(* Every durable fact of a QUIESCENT op has its bridge. The quiescence
   guard (phase terminal: replied or crashed) is load-bearing — without it
   the invariant fires on the benign in-lock transient between the fact
   append and the bridge append on the happy path, which is not the
   finding. Guarded this way it is REFUTED only by CrashInLock reaching a
   "crashed" op whose fact is durable and whose bridge never landed — the
   audit's §5.3 orphan-fact residual. Deleting CrashInLock makes this
   control PASS (and the gate FAIL), which is what proves CrashInLock is
   the sole cause. *)
NoOrphanFact ==
  \A i \in DOMAIN journal :
    (journal[i].kind = "fact" /\ phase[journal[i].op] \in {"replied", "crashed"}) =>
      \E b \in DOMAIN journal :
        journal[b].op = journal[i].op /\ journal[b].kind = "bridge"

================================================================================
