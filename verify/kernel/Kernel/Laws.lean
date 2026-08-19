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

/-- Admission is monotone under explicit door growth: adding catalog
    or pinned-universe members cannot retract an admission or change
    the intrinsic act it translated to. -/
def KAdmitMonotone : Prop :=
  forall (smaller larger : Door), Door.Le smaller larger ->
    forall (candidate : CandidateAct) (act : Act),
      admit smaller candidate = .admitted act ->
      admit larger candidate = .admitted act

/-- A candidate-intrinsic fault refuses at every door. The theorem is
    deliberately about refused STATUS, not reason identity: another
    door-relative fault may be reported first, and growth that clears
    it can surface the intrinsic reason behind it. -/
def KIntrinsicFaultRefusedEverywhere : Prop :=
  forall (candidate : CandidateAct), IntrinsicFault candidate ->
    forall door : Door,
      exists refusal, admit door candidate = .refused refusal

/-- A surfaced door-relative refusal is repairable by finite growth
    when no candidate-intrinsic fault remains. The explicit premise is
    load-bearing: without it, growth may clear the current reason only
    to expose an intrinsic refusal, never an admission. -/
def KRelativeRefusalRepairableByGrowth : Prop :=
  forall (door : Door) (candidate : CandidateAct),
    DoorRelativeRefusal door candidate ->
    (¬ IntrinsicFault candidate) ->
    exists (larger : Door) (act : Act),
      Door.Le door larger /\ admit larger candidate = .admitted act

/-- A successful machine repair clears the refusal reason it answers.
    The repaired candidate may admit or may surface a different
    remaining reason at any door; the law excludes only the named
    fault. Fault-set construction, priority arbitration, composition,
    and termination are separate KM-21 obligations and are not
    claimed here. -/
def KMachineRepairClearsReason : Prop :=
  forall (sourceDoor : Door) (candidate : CandidateAct)
      (refusal : Refusal),
    admit sourceDoor candidate = .refused refusal ->
    forall repaired : CandidateAct,
      repair candidate refusal.reason = some repaired ->
      forall (door : Door) (next : Refusal),
        admit door repaired = .refused next ->
        next.reason ≠ refusal.reason

/-! ### The machine-repair remainders

What the repair slice left open: constructing the fault set behind one
surfaced refusal, arbitrating it by a declared order, composing repairs,
and knowing the composition stops. The run family below composes the
door over a program; this family composes repairs over one candidate,
and the two meet only at the door they share.

Bounds, stated with the family: one candidate at one door. Repair
chaining at RUN scale — re-offering a repaired node inside a walk — is
not claimed here, and neither is any runtime that would drive the
chain. -/

/-- The fault listing decomposes the door: the door's verdict is
    exactly the listing's head, so one refusal is surfaced and its
    support stands behind it, and an empty listing is an admission.
    This is the construction the arbitration and the repair chain are
    read against; it claims nothing the door does not already do. -/
def KFaultListingDecomposesDoor : Prop :=
  forall (door : Door) (candidate : CandidateAct),
    (faults door candidate).head? = admitReason (admit door candidate)

/-- Fault listings are a finite-set semilattice under union: read as
    support, a listing is its set of reasons, so the join is
    associative, commutative, and idempotent under that reading. The
    quotient is lawful HERE and unlawful at the door, where the head of
    the same list is the answer — which is the gap the arbitration law
    below has to name. -/
def KFaultListingSemilattice : Prop :=
  (forall left middle right : List RefusalReason,
    Fault.Equiv (Fault.join (Fault.join left middle) right)
      (Fault.join left (Fault.join middle right))) /\
  (forall left right : List RefusalReason,
    Fault.Equiv (Fault.join left right) (Fault.join right left)) /\
  (forall listing : List RefusalReason,
    Fault.Equiv (Fault.join listing listing) listing)

/-- Declared-priority arbitration agrees with the door exactly where
    the fault listing already leads with its priority-least member.

    The premise is load-bearing and the unbounded law is FALSE, not
    merely unproven: the door arbitrates by position inside a payload
    sweep, so two candidates carrying the same fault support in
    different payload order earn different answers. No total order on
    reasons reproduces that, whatever order is declared, and the
    executed control exhibits the pair. Making the door arbitrate is a
    change to the door, not a theorem about this one. -/
def KDoorArbitratesLeastFault : Prop :=
  forall (door : Door) (candidate : CandidateAct),
    PriorityLeastFirst (faults door candidate) ->
      arbitrate (faults door candidate) = admitReason (admit door candidate)

/-- Repair composition: the four rewrites land OUTSIDE their own
    domain, so a repaired candidate offers no second machine move, and
    from one step on the chain is its own fixpoint — fuel past the
    first step changes nothing. The composition is therefore one move
    long, and the priority order the arbitration declares has no second
    step to order. -/
def KRepairComposesToFixpoint : Prop :=
  (forall (candidate repaired : CandidateAct) (reason : RefusalReason),
    repair candidate reason = some repaired -> RepairInert repaired) /\
  (forall (fuel extra : Nat) (door : Door) (candidate : CandidateAct),
    repairChain (fuel + 1 + extra) door candidate
      = repairChain (fuel + 1) door candidate)

/-- Termination, and what standing at the fixpoint means: one step of
    the chain reaches a candidate at which the door offers no further
    machine move, and every refusal that candidate earns AT ANY DOOR is
    advisory — it needs information the candidate does not carry. That
    pair is the licence to follow machine-applicable taught moves
    without review per step: the walk is one move long, and what remains
    is exactly what an operator must answer.

    Stated because the recorded argument differs: termination does NOT
    rest on the fault set shrinking. The past-mutation rewrite can add a
    door-relative fault its input never carried, and the executed
    control exhibits that candidate. Termination rests on the image
    lying outside the domain instead. -/
def KRepairChainTerminates : Prop :=
  (forall (fuel : Nat) (door : Door) (candidate : CandidateAct),
    repairStep door (repairChain (fuel + 1) door candidate) = none) /\
  (forall (candidate repaired : CandidateAct) (reason : RefusalReason),
    repair candidate reason = some repaired ->
      forall (door : Door) (refusal : Refusal),
        admit door repaired = .refused refusal ->
          refusal.reason.applicability = .advisory)

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

/-- The order-carrying provision fold is the positioned derived read,
    collapsed: folding a chain equals reading the greatest-position
    binding over its positioned fact set. This is the CALM
    decomposition of environments — facts accumulate as a set (union,
    arrival-order-free), the environment is a function of the facts
    (the directory's greatest-token shape at the valuation carrier),
    and the shadowing order lives inside the data as positions, never
    in the schedule. -/
def KProvisionPositionedCorrespondence : Prop :=
  forall (events : List (Nat × Nat)) (hole : Nat),
    provisionFold events hole =
      (greatestAt (positionedOf events) hole).map (fun best => best.2)

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

/-! ### The program run — the two doors composed

Program admission checks the DAG discipline and the single-act door
judges one sentence; the run is their composition. Five statements say
what that composition is: it associates over concatenation, a landed
run is exactly a sequence of admitted acts, every refusal decomposes
into a standing prefix and a genuinely refusing node, the tail after a
refusal is unjudged, and the context a run reaches extends the one it
started at when carriage growth only grows. The sixth ties the run to
filling: only closed programs run.

Bounds, stated with the family: one pass by one walker. No concurrency
beyond the monotone-context benignity the growth premise names, no
liveness, no retries, no scheduler. -/

/-- The run composes over concatenation: walking `before ++ after` is
    walking `before`, then walking `after` from the context and steps
    the prefix reached — and a refusal inside the prefix IS the whole
    answer, the suffix never consulted. Per-node door judgments compose;
    a run is their sequence and nothing besides. -/
def KRunComposition : Prop :=
  forall (complete : Completion) (carry : Carry) (context : Door)
      (steps : List RunStep) (before after : List ProgramNode),
    runWalk complete carry context steps (before ++ after) =
      match runWalk complete carry context steps before with
      | .landed reached prefixSteps =>
          runWalk complete carry reached prefixSteps after
      | .refused node refusal prefixSteps =>
          .refused node refusal prefixSteps

/-- An admitted run is exactly a sequence of admitted acts: every step
    a landed run reports records the one door admitting that step's
    candidate to that step's sentence at that step's own context, and
    the steps name the program's nodes in admission order — one step
    per node, none skipped, none invented. -/
def KRunAdmittedSequence : Prop :=
  forall (complete : Completion) (carry : Carry) (context : Door)
      (nodes : List ProgramNode) (reached : Door) (steps : List RunStep),
    runProgram complete carry context nodes = .landed reached steps ->
      (forall step, step ∈ steps -> step.Admitted) /\
      steps.map RunStep.node = nodes.reverse.map ProgramNode.name

/-- Every refusal decomposes: a refused run splits the walked nodes at
    the refusing one, the prefix lands with exactly the steps the
    outcome reports — the prefix's admissions stand — and the refusing
    node's candidate genuinely refuses at the context that prefix
    reached, with the taught row the outcome carries. -/
def KRunRefusalDecomposition : Prop :=
  forall (complete : Completion) (carry : Carry) (context : Door)
      (steps : List RunStep) (walked : List ProgramNode) (name : Nat)
      (refusal : Refusal) (standing : List RunStep),
    runWalk complete carry context steps walked
        = .refused name refusal standing ->
      exists (before : List ProgramNode) (node : ProgramNode)
        (after : List ProgramNode) (reached : Door),
        walked = before ++ node :: after /\ node.name = name /\
        runWalk complete carry context steps before
          = .landed reached standing /\
        admit reached (complete standing node) = .refused refusal

/-- The tail after a refusal is unjudged: once the prefix has landed
    and the next node's candidate refuses, the outcome is that refusal
    with the prefix's steps standing, for EVERY tail. A walk whose
    answer depends on what follows the refusing node is a different
    walk from this one. -/
def KRunTailUnjudged : Prop :=
  forall (complete : Completion) (carry : Carry) (context : Door)
      (steps : List RunStep) (before : List ProgramNode)
      (node : ProgramNode) (reached : Door) (standing : List RunStep)
      (refusal : Refusal),
    runWalk complete carry context steps before
        = .landed reached standing ->
    admit reached (complete standing node) = .refused refusal ->
    forall after : List ProgramNode,
      runWalk complete carry context steps (before ++ node :: after)
        = .refused node.name refusal standing

/-- Monotone-context benignity, and no more: when carriage growth only
    grows, the context a landed run reaches extends the context it
    started at, so every judgment the run made stands at the end it
    reached. Concurrency beyond this premise, liveness, retries, and
    scheduling are outside the claim. -/
def KRunContextGrows : Prop :=
  forall (complete : Completion) (carry : Carry), Carry.Monotone carry ->
    forall (context : Door) (steps : List RunStep)
        (walked : List ProgramNode) (reached : Door)
        (standing : List RunStep),
      runWalk complete carry context steps walked
          = .landed reached standing ->
        Door.Le context reached

/-- Only closed programs run: under a completion that fills no hole, a
    landed run is evidence that the program it walked required nothing
    — every hole was filled by the valuation before the walk began. The
    converse is deliberately absent: closure is necessary for landing,
    never sufficient. -/
def KRunLandedClosed : Prop :=
  forall (complete : Completion), Completion.HolePreserving complete ->
    forall (carry : Carry) (context : Door) (nodes : List ProgramNode)
        (reached : Door) (steps : List RunStep),
      runProgram complete carry context nodes = .landed reached steps ->
        requiresOf nodes = []

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
