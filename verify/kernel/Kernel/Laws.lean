/- Law statements only. Proofs live in `Kernel/Proofs.lean`. One law is
   deliberately stated without a proof and says so in place. -/
import Kernel.Definitions

namespace Kernel

namespace Laws

/-- Sentence identity: the canonical framing of a kernel sentence is
    injective — one sentence, one name. This is the model half of
    content addressing at the sentence seam; the byte-level
    canonicalizer's injectivity is its own wall's obligation. -/
def KSentenceEncodingInjective : Prop :=
  forall left right : Act,
    encodeAct left = encodeAct right -> left = right

/-- The admission half of the estate-of-safety candidate: a candidate
    that spells any closure-row shape has no admitted translation —
    whatever the door admits, it is not that candidate. The intrinsic
    half (the unlawful act has no constructor) is carried by the
    grammar itself and by the committed must-not-compile controls. -/
def KAdmissionRefusesUnlawful : Prop :=
  forall (door : Door) (candidate : CandidateAct),
    Unlawful door candidate ->
      forall act, admit door candidate ≠ .admitted act

/-- Refusal parity: every refusal the door utters is a row of the
    taught table (law and repair attached by construction), and every
    row of the table teaches — no empty law, no empty repair. -/
def KRefusalParity : Prop :=
  (forall (door : Door) (candidate : CandidateAct) (refusal : Refusal),
    admit door candidate = .refused refusal ->
      refusal = taught refusal.reason) /\
  (forall reason : RefusalReason,
    (taught reason).law ≠ "" /\ (taught reason).repair ≠ "")

/-- The program pin order is well-founded: under node admission —
    every use names an already-admitted node, every name admits at
    most once — the consumption relation of an admitted program is
    well-founded, so the dependency graph is a DAG by construction.
    That a real digest cycle would need a hash preimage stays in the
    trusted base. -/
def KProgramPinWellFounded : Prop :=
  forall (nodes : List ProgramNode), ProgramAdmission nodes ->
    WellFounded (NodePins nodes)

/-- Disjoint fills commute: filling holes from two valuations with no
    hole in common lands the same program in either order — fill
    order is free, only the fill set matters. -/
def KFillCommutative : Prop :=
  forall (left right : Valuation), Valuation.Disjoint left right ->
    forall nodes : List ProgramNode,
      fillProgram right (fillProgram left nodes) =
        fillProgram left (fillProgram right nodes)

/-- Filling is a monoid action of valuations under left-biased union:
    fill twice is fill once at the union, and the empty valuation
    fills nothing. -/
def KFillMonoidAction : Prop :=
  (forall (left right : Valuation) (nodes : List ProgramNode),
    fillProgram right (fillProgram left nodes) =
      fillProgram (Valuation.union left right) nodes) /\
  (forall nodes : List ProgramNode,
    fillProgram Valuation.empty nodes = nodes)

/-- The provision environment reads newest-first: the value a
    provision chain builds at a hole is its newest event at that hole
    — the Effect pin's overlay-chain lookup (Context.ts:483-546 at
    effect@4.0.0-rc.108), folded. -/
def KProvisionNewestWins : Prop :=
  forall (events : List (Nat × Nat)) (hole : Nat),
    provisionFold events hole = firstProvision events hole

/-- Provision chains compose by valuation union: folding an appended
    chain is the left-biased union of the two folds, the newer half
    winning where they overlap — Effect's later-side-wins
    Context.merge (Context.ts:1123-1181) in the newest-first
    orientation. -/
def KProvisionAppendUnion : Prop :=
  forall (left right : List (Nat × Nat)),
    provisionFold (left ++ right) =
      Valuation.union (provisionFold left) (provisionFold right)

/-- Filling removes exactly the covered requirements: a filled
    program's requirement set is the unfilled remainder — the R
    channel's provide law (`RIn` joined with the consumer's
    requirements minus what the dependency provides, Layer.ts
    provide) read at data level. Requirements union across
    composition and shrink under provision; a program with no
    requirements is closed, the R-equals-never correspondence. -/
def KRequiresExclude : Prop :=
  forall (valuation : Valuation) (nodes : List ProgramNode),
    requiresOf (fillProgram valuation nodes) =
      (requiresOf nodes).filter
        (fun hole => (valuation hole).isNone)

/-- Every kernel sentence's meaning grows the world: under an
    associative, idempotent evidence merge, no interpretation shrinks
    any component — the kernel has no forgetting act. Instantiation
    obligation, stated not imported: the fabric's cell merge satisfies
    the two hypotheses (its ACI package), and the landed-set dedup is
    the register invariant package at its own wall. -/
def KInterpInflationary : Prop :=
  forall {Evidence : Type} (merge : Evidence -> Evidence -> Evidence)
      (contribution : Value -> Evidence),
    (forall a b c : Evidence, merge (merge a b) c = merge a (merge b c)) ->
    (forall a : Evidence, merge a a = a) ->
    forall (act : Act) (world : World Evidence),
      World.Le merge world (interp merge contribution act world)

/-- Candidate F13, bound-execution replay — STATED, deliberately
    unproven. For an admitted program, any two execution records
    reached through deterministic assembly, resumption, and landing
    hops agree at every node. Every conjunct is proven at its own
    rung elsewhere (assembly determinism, exact resumption, at most
    one landed outcome); the composition is the one new obligation,
    and the F-number mints only at ratification. Proving the abstract
    skeleton here would invite the claim that replay of bound
    programs holds before the law exists at the estate's real
    carriers, so this statement stays a statement. -/
def CandidateF13BoundExecutionReplay : Prop :=
  forall (assemble : List ProgramNode -> List Value -> Nat -> Value -> Prop)
      (resume : List Value -> Nat -> Value -> Prop)
      (land : Nat -> Value -> Value -> Value -> Prop),
    (forall nodes journal name left right,
      assemble nodes journal name left ->
        assemble nodes journal name right -> left = right) ->
    (forall journal name left right,
      resume journal name left -> resume journal name right ->
        left = right) ->
    (forall name context state left right,
      land name context state left -> land name context state right ->
        left = right) ->
    forall (nodes : List ProgramNode) (journal : List Value)
        (left right : Nat -> Option Value),
      ProgramAdmission nodes ->
      ComposedExecution assemble resume land nodes journal left ->
      ComposedExecution assemble resume land nodes journal right ->
      forall name, left name = right name

end Laws

end Kernel
