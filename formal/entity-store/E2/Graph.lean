/-
The reference graph of a store — ANALYSIS ONLY (ruling W3-3: `E2/Graph` exposes graph
analysis and its theorems, and nothing else; the whole-store judgment is
`E2/Admission`'s). Vocabulary transcribed from `R3-transport-admission.md` §6 with the
decidable half added per `R-C-boundary-open.md` §2.3.

NODES ARE ADDRESSES, never pre-images. `σ` is a map, so each bound address carries
exactly one byte string and every definition here is well defined for EVERY `H`,
colliding or not. Under a colliding `H` a dropped pre-image has no node at all — an
availability question, never an unreachable target (R3 §1.7).

Nothing here mentions `Reachable`, `WFS`, or `Conforms`: this module computes and states,
it does not judge. In particular `topoOrder` returning `some` establishes ACYCLICITY of
the candidate, not admissibility and certainly not reachability — the F-33 lesson, and
the reason W3-3 splits this module off from the judgment that consumes it.
-/
import E2.Resolve

namespace E2

/-! ## Nodes and edges. -/

/-- The keys of a store, in list order (newest first — `putPre` conses). -/
def Keys (σ : StoreMap) : List Address := σ.map Prod.fst

/-- Address membership, decided through the carrier's own `DecidableEq` rather than any
    host relation (rule `host-relation-neutrality`: `Address` is a byte list, and this is
    equality on those bytes, not on a rendering of them). -/
def addrMem (a : Address) : List Address → Bool
  | [] => false
  | x :: xs => decide (a = x) || addrMem a xs

/-- Position of an address in a list; `l.length` when absent, so a missing node never
    silently compares less than a present one at index 0. -/
def idxOf : List Address → Address → Nat
  | [], _ => 0
  | x :: xs, a => if a = x then 0 else idxOf xs a + 1

/-- The references the object AT AN ADDRESS carries, read off the STORED BYTES —
    never off a carrier the caller happens to be holding. `[]` when the address is
    unbound or the bytes are not a well-formed pre-image of either kind; M9 rules the
    latter out on reachable stores, and `Admissible.closed` rules it out on candidates. -/
def refsAt (σ : StoreMap) (a : Address) : List Address :=
  match σ.find a with
  | some b => (refsOfPreimage b).getD []
  | none => []

/-- One edge of the reference graph: `a` is bound, and `b` is among the references its
    stored bytes carry. For an entity the schema address heads that list, so the
    schema-typing edge is an edge like any other. -/
def Edge (σ : StoreMap) (a b : Address) : Prop :=
  (σ.find a).isSome ∧ b ∈ refsAt σ a

inductive Path (σ : StoreMap) : Address → Address → Prop
  | one {a b} : Edge σ a b → Path σ a b
  | cons {a b c} : Edge σ a b → Path σ b c → Path σ a c

/-- WF3's subject. Note this is a property of the CANDIDATE map, not of `H`: a colliding
    `H` does not weaken it (R3 §1.3's honest scope — at the model layer acyclicity is a
    hypothesis, and `HEADLINE_wf1_wf2_insufficient` shows WF1 + WF2 do not imply it). -/
def Acyclic (σ : StoreMap) : Prop := ∀ a, ¬ Path σ a a

/-! ## Kahn's algorithm — the decidable half.

    Sinks first: an address is emitted once every reference it carries has left the
    remaining set. That order is exactly a legal insertion sequence, which is why the
    same pass triples as the acyclicity decision, the cycle witness, and M19's
    reconstruction order (R-C §2.2). -/

/-- An address is ready when none of its references is still waiting. A self-loop is
    never ready — `a` is in its own remaining set — which is how the one-node cycle is
    caught. -/
def kahnReady (σ : StoreMap) (remaining : List Address) (a : Address) : Bool :=
  (refsAt σ a).all (fun b => !addrMem b remaining)

/-- One round: the ready addresses, and the leftovers, in the input's order (so the
    output is a function of the store's list order alone — deterministic on both
    runners, no host comparator anywhere). -/
def kahnSplit (σ : StoreMap) (remaining : List Address) :
    List Address × List Address :=
  remaining.partition (kahnReady σ remaining)

/-- The rounds, with the remaining-list length as the structural fuel: every round with
    a non-empty batch removes at least one address, so `(Keys σ).length` rounds suffice
    and the `0`-fuel case is unreachable on a non-empty leftover. A round that emits
    NOTHING while addresses remain is precisely a cycle. -/
def kahnLoop (σ : StoreMap) : Nat → List Address → Option (List Address)
  | 0, remaining =>
      match remaining with
      | [] => some []
      | _ :: _ => none
  | fuel + 1, remaining =>
      match remaining with
      | [] => some []
      | _ :: _ =>
        match kahnSplit σ remaining with
        | ([], _) => none
        | (batch, rest) => (kahnLoop σ fuel rest).map (fun tl => batch ++ tl)

/-- Kahn's. `none` iff the reference graph has a cycle; otherwise the topological order,
    sinks first — i.e. a legal insertion sequence. -/
def topoOrder (σ : StoreMap) : Option (List Address) :=
  kahnLoop σ (Keys σ).length (Keys σ)

/-! ## The two obligations. The content is the standard finite-DAG root-existence
    argument, which is also the only piece of M19's proof with real content, and W3-3
    lands them together for exactly that reason.

    STATUS (C-3 seat, 2026-08-25). `ObligationTopoComplete` is PROVED — `E2.topoComplete`
    in `E2/AdmissionDecides.lean`, both directions — because it is the acyclicity leg of
    `ObligationAdmissibleReportDecides` and that seat could not close without it.
    `ObligationTopoSound` remains unproved, and the seat REPORTED it as refutable as
    pinned: it quantifies over every `Edge`, and `Edge` does not require its target to be
    bound, so a dangling reference is an edge whose target has no position in the emitted
    order. The note at the foot of `E2/AdmissionDecides.lean` carries the one-object
    witness and is explicit that it was checked by compiled evaluation rather than landed
    as a theorem. Restating the pin is a ruling, not a seat's business — the two
    statements below are untouched. -/

/-- The emitted order respects every edge: a referenced object precedes its referrer,
    so replaying the order is a legal insertion sequence. -/
def ObligationTopoSound : Prop :=
  ∀ (σ : StoreMap) (o : List Address), topoOrder σ = some o →
    ∀ a b, Edge σ a b → idxOf o b < idxOf o a

/-- An order exists exactly when the graph is acyclic — the decision procedure for
    `Acyclic`, which is the clause verification-on-open does not currently compute
    (F-32). -/
def ObligationTopoComplete : Prop :=
  ∀ σ : StoreMap, (topoOrder σ).isSome ↔ Acyclic σ

end E2
