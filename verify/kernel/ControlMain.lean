/- The kernel door controls. Every control refutes a named wrong door:
   each closure row refutes the door that would admit that row's
   planted unlawful program, and the lawful row refutes the door that
   refuses everything. A door that cannot refuse proves nothing; a door
   that refuses everything proves nothing either. -/
import Kernel

open Kernel

def renderRefusal : Refusal -> String
  | { reason, law, repair } =>
      s!"reason:{reason.wire}|law:{law}|repair:{repair}"

def renderResult : AdmitResult -> String
  | .admitted act => s!"admitted:{(encodeAct act).toString}"
  | .refused refusal => renderRefusal refusal

/-- A refusal control line: refuted when the door refuses the planted
    candidate with exactly the expected reason. -/
def showRefusalControl (name vector : String)
    (candidate : CandidateAct) (expected : RefusalReason) : IO UInt32 := do
  let result := admit Planted.door candidate
  let refuted :=
    match result with
    | .refused refusal => refusal.reason == expected
    | .admitted _ => false
  IO.println
    s!"control={name};candidate={vector};{renderResult result};verdict={if refuted then "refuted" else "survived"}"
  return if refuted then 0 else 1

/-- The admit control line: refuted when the door admits the lawful
    twin to exactly its intrinsic sentence. -/
def showAdmitControl (name vector : String)
    (candidate : CandidateAct) (expected : Act) : IO UInt32 := do
  let result := admit Planted.door candidate
  let refuted :=
    match result with
    | .admitted act => encodeAct act == encodeAct expected
    | .refused _ => false
  IO.println
    s!"control={name};candidate={vector};{renderResult result};verdict={if refuted then "refuted" else "survived"}"
  return if refuted then 0 else 1

/-- Render a built provision environment at the sample holes. -/
def renderValuation (valuation : Valuation) : String :=
  String.intercalate "|" ([1, 2].map fun hole =>
    match valuation hole with
    | some value => s!"{hole}:{value}"
    | none => s!"{hole}:_")

/-- Drift control line: refuted when the premise-violating side moves
    across two arrival orders while the lawful side holds. A lawful
    drift would mean the rows fail to isolate the premise, so the
    verdict then reads survived. -/
def showDriftControl (name vector : String)
    (lawfulLeft lawfulRight mutantLeft mutantRight : String) :
    IO UInt32 := do
  let refuted := lawfulLeft == lawfulRight && mutantLeft != mutantRight
  IO.println
    s!"control={name};vector={vector};lawful-left={lawfulLeft};lawful-right={lawfulRight};mutant-left={mutantLeft};mutant-right={mutantRight};verdict={if refuted then "refuted" else "survived"}"
  return if refuted then 0 else 1

def isAdmitted : AdmitResult -> Bool
  | .admitted _ => true
  | .refused _ => false

def isRefused : AdmitResult -> Bool
  | .admitted _ => false
  | .refused _ => true

/-- Whether a verdict surfaces one particular refusal reason. -/
def isRefusedFor (reason : RefusalReason) : AdmitResult -> Bool
  | .admitted _ => false
  | .refused refusal => refusal.reason == reason

/-- Render the option-valued repair application without hiding an absent
    rewrite behind an admission verdict. -/
def renderOptionalResult : Option AdmitResult -> String
  | none => "none"
  | some result => renderResult result

/-- Render a fault listing in its own order — the order is the claim
    these rows are about, so nothing here sorts it. -/
def renderReasons (listing : List RefusalReason) : String :=
  "[" ++ String.intercalate "," (listing.map RefusalReason.wire) ++ "]"

/-- Render an arbitrated or surfaced reason. -/
def renderReason : Option RefusalReason -> String
  | none => "none"
  | some reason => reason.wire

/-- Render whether a chain still has a move to make. -/
def renderMove : Option CandidateAct -> String
  | none => "fixpoint"
  | some _ => "moves"

namespace StabilityControls

def monotoneGrownDoor : Door where
  catalog := (DeclKind.schema, 900) :: Planted.door.catalog
  pinned := (DeclKind.schema, 900) :: Planted.door.pinned

def droppedPinnedDoor : Door where
  catalog := monotoneGrownDoor.catalog
  pinned := []

def emptyDoor : Door where
  catalog := []
  pinned := []

def multiFault : CandidateAct :=
  .emit 901 [.digestRef .schema 902, .clockNow]

def multiFaultGrownDoor : Door where
  catalog := [(DeclKind.schema, 902), (DeclKind.lane, 901)]
  pinned := []

def multiFaultDroppedIntrinsic : CandidateAct :=
  .emit 901 [.digestRef .schema 902, .literal 0]

def relativeOnly : CandidateAct :=
  .emit 903 [.digestRef .schema 904]

def incompleteRepairDoor : Door where
  catalog := [(DeclKind.lane, 903)]
  pinned := []

end StabilityControls

namespace RepairControls

/-- A multi-fault row: the last-writer strategy wins first, while the
    clock atom remains to surface after that strategy is repaired. -/
def lastWriterWithClock : CandidateAct :=
  .join 6 [.clockNow] (.lastWriterWins 7)

/-- The planted mutant for every repair row: recognize the same domain
    as the lawful function but return the refused candidate unchanged. -/
def unchanged (candidate : CandidateAct) (reason : RefusalReason) :
    Option CandidateAct :=
  match repair candidate reason with
  | some _ => some candidate
  | none => none

end RepairControls

namespace ChainControls

/-- The mutant rewrite that never leaves its own domain: it answers the
    anchored-resolve row by MOVING the anchor instead of dropping it, so
    the repaired candidate is anchored again and the chain never ends.
    Every other row is the lawful rewrite, so the only law dropped is the
    image-outside-the-domain one that termination rests on. -/
def anchorShifting : CandidateAct -> RefusalReason -> Option CandidateAct
  | .resolveDigest kind target (some anchor), .anchoredResolve =>
      some (.resolveDigest kind target (some (anchor + 1)))
  | candidate, reason => repair candidate reason

/-- The mutant rewrite that resurrects a cleared reason: it clears the
    last-writer strategy exactly as the lawful one does, and then, offered
    the repaired candidate under the reason that surfaces next, puts the
    unlawful strategy back. Every other row is the lawful rewrite. -/
def resurrecting : CandidateAct -> RefusalReason -> Option CandidateAct
  | .join cell contribution (.declaredAlgebra algebra), .clockRead =>
      some (.join cell contribution (.lastWriterWins algebra))
  | candidate, reason => repair candidate reason

/-- One chain step under an arbitrary rewrite. -/
def stepWith (rewrite : CandidateAct -> RefusalReason -> Option CandidateAct)
    (door : Door) (candidate : CandidateAct) : Option CandidateAct :=
  match admit door candidate with
  | .admitted _ => none
  | .refused refusal => rewrite candidate refusal.reason

/-- The chain under an arbitrary rewrite. -/
def chainWith (rewrite : CandidateAct -> RefusalReason -> Option CandidateAct) :
    Nat -> Door -> CandidateAct -> CandidateAct
  | 0, _, candidate => candidate
  | fuel + 1, door, candidate =>
      match stepWith rewrite door candidate with
      | none => candidate
      | some repaired => chainWith rewrite fuel door repaired

/-- The reasons a chain surfaces, oldest first: one entry per door pass,
    the last being the reason standing when the chain stops. -/
def reasonTrail
    (rewrite : CandidateAct -> RefusalReason -> Option CandidateAct) :
    Nat -> Door -> CandidateAct -> List RefusalReason
  | 0, _, _ => []
  | fuel + 1, door, candidate =>
      match admit door candidate with
      | .admitted _ => []
      | .refused refusal =>
          refusal.reason ::
            (match rewrite candidate refusal.reason with
             | none => []
             | some repaired => reasonTrail rewrite fuel door repaired)

/-- Whether a trail utters one reason twice — a cleared reason back at
    the door. -/
def repeatsReason : List RefusalReason -> Bool
  | [] => false
  | reason :: rest => rest.contains reason || repeatsReason rest

end ChainControls

namespace RunControls

/-- The mutant that judges on past a refusal: it drops the halt and
    keeps walking, so its answer depends on nodes the lawful walk never
    reaches. Everything else — the door, the completion, the carriage
    growth — is the lawful walk's. -/
def continuing (complete : Completion) (carry : Carry) :
    Door -> List RunStep -> List ProgramNode -> RunOutcome
  | context, steps, [] => .landed context steps
  | context, steps, node :: rest =>
      match complete steps node with
      | none => .unspeakable node.name steps
      | some candidate =>
          match admit context candidate with
          | .refused _ => continuing complete carry context steps rest
          | .admitted act =>
              continuing complete carry (carry context act)
                (steps ++ [runStepOf context node candidate act]) rest

/-- The mutant that discards the prefix at a refusal: the admissions
    that already stood are thrown away with the refusal. -/
def forgetting (complete : Completion) (carry : Carry) :
    Door -> List RunStep -> List ProgramNode -> RunOutcome
  | context, steps, [] => .landed context steps
  | context, steps, node :: rest =>
      match complete steps node with
      | none => .unspeakable node.name steps
      | some candidate =>
          match admit context candidate with
          | .refused refusal => .refused node.name refusal []
          | .admitted act =>
              forgetting complete carry (carry context act)
                (steps ++ [runStepOf context node candidate act]) rest

/-- The mutant that discards the prefix at an UNSPEAKABLE node: the
    admissions that already stood are thrown away with the node the
    completion could not answer for. Everything else — the door, the
    completion, the carriage growth, the refusal arm's own prefix
    discipline — is the lawful walk's, so the only thing this walk
    drops is the ruled prefix-keeping semantics of the third arm. -/
def erasing (complete : Completion) (carry : Carry) :
    Door -> List RunStep -> List ProgramNode -> RunOutcome
  | context, steps, [] => .landed context steps
  | context, steps, node :: rest =>
      match complete steps node with
      | none => .unspeakable node.name []
      | some candidate =>
          match admit context candidate with
          | .refused refusal => .refused node.name refusal steps
          | .admitted act =>
              erasing complete carry (carry context act)
                (steps ++ [runStepOf context node candidate act]) rest

/-- The lawful run of a planted program at the planted door. -/
def lawful (nodes : List ProgramNode) : RunOutcome :=
  runProgram Planted.runCandidate Planted.runCarry Planted.door nodes

/-- The tail-judging mutant over the same program. -/
def continuingRun (nodes : List ProgramNode) : RunOutcome :=
  continuing Planted.runCandidate Planted.runCarry Planted.door []
    nodes.reverse

/-- The prefix-forgetting mutant over the same program. -/
def forgettingRun (nodes : List ProgramNode) : RunOutcome :=
  forgetting Planted.runCandidate Planted.runCarry Planted.door []
    nodes.reverse

/-- The lawful run of a planted program under the SILENT completion —
    the one that cannot speak the tail node. -/
def silentRun (nodes : List ProgramNode) : RunOutcome :=
  runProgram Planted.runCandidateSilent Planted.runCarry Planted.door nodes

/-- The prefix-erasing mutant under the same silent completion. -/
def erasingRun (nodes : List ProgramNode) : RunOutcome :=
  erasing Planted.runCandidateSilent Planted.runCarry Planted.door []
    nodes.reverse

end RunControls

/-- Whether an outcome refuses at one node with one reason. -/
def refusesAt (node : Nat) (reason : RefusalReason) : RunOutcome -> Bool
  | .refused name refusal _ => name == node && refusal.reason == reason
  | .landed _ _ => false
  | .unspeakable _ _ => false

/-- Whether an outcome is unspeakable at one node. -/
def unspeakableAt (node : Nat) : RunOutcome -> Bool
  | .unspeakable name _ => name == node
  | .landed _ _ => false
  | .refused _ _ _ => false

/-- The node names an outcome reports as standing steps. -/
def standingNames : RunOutcome -> List Nat
  | .landed _ steps => steps.map RunStep.node
  | .refused _ _ steps => steps.map RunStep.node
  | .unspeakable _ steps => steps.map RunStep.node

/-- Render one run outcome at its observable seam: the verdict, the
    refusing or unspeakable node and the reason when there is one, and
    the standing steps by node name. -/
def renderOutcome : RunOutcome -> String
  | .landed _ steps => s!"landed;steps={(steps.map RunStep.node).toString}"
  | .refused node refusal steps =>
      s!"refused@{node};reason={refusal.reason.wire};steps={(steps.map RunStep.node).toString}"
  | .unspeakable node steps =>
      s!"unspeakable@{node};steps={(steps.map RunStep.node).toString}"

/-- Kill a growth implementation that replaces the pinned universe
    instead of extending it. -/
def showAdmitMonotonicityControl : IO UInt32 := do
  let smaller := admit Planted.door Planted.lawfulDeclare
  let larger := admit StabilityControls.monotoneGrownDoor Planted.lawfulDeclare
  let mutant := admit StabilityControls.droppedPinnedDoor Planted.lawfulDeclare
  let refuted :=
    renderResult smaller == renderResult larger &&
      renderResult smaller != renderResult mutant
  IO.println
    s!"control=drop-admit-monotonicity;candidate=declare-pinned-references;smaller={renderResult smaller};larger={renderResult larger};mutant={renderResult mutant};verdict={if refuted then "refuted" else "survived"}"
  return if refuted then 0 else 1

/-- Exercise the multi-fault caveat: growth changes the surfaced reason
    while refused status persists; only candidate rewriting admits. -/
def showIntrinsicRefusalControl : IO UInt32 := do
  let smaller :=
    admit StabilityControls.emptyDoor StabilityControls.multiFault
  let larger :=
    admit StabilityControls.multiFaultGrownDoor StabilityControls.multiFault
  let mutant :=
    admit StabilityControls.multiFaultGrownDoor
      StabilityControls.multiFaultDroppedIntrinsic
  let refuted :=
    isRefused smaller && isRefused larger &&
      renderResult smaller != renderResult larger && isAdmitted mutant
  IO.println
    s!"control=drop-intrinsic-refusal;candidate=relative-before-clock;smaller={renderResult smaller};larger={renderResult larger};mutant={renderResult mutant};verdict={if refuted then "refuted" else "survived"}"
  return if refuted then 0 else 1

/-- Kill a repair implementation that grows the door with only part of
    the candidate's finite reference support. -/
def showRelativeRepairControl : IO UInt32 := do
  let smaller :=
    admit StabilityControls.emptyDoor StabilityControls.relativeOnly
  let repaired :=
    admit
      (repairingDoor StabilityControls.emptyDoor StabilityControls.relativeOnly)
      StabilityControls.relativeOnly
  let mutant :=
    admit StabilityControls.incompleteRepairDoor StabilityControls.relativeOnly
  let refuted := isRefused smaller && isAdmitted repaired && isRefused mutant
  IO.println
    s!"control=drop-relative-repair-growth;candidate=lane-and-schema-support;smaller={renderResult smaller};repaired={renderResult repaired};mutant={renderResult mutant};verdict={if refuted then "refuted" else "survived"}"
  return if refuted then 0 else 1

/-- Kill the unchanged-candidate mutant for one machine-applicable
    repair. The lawful result may admit or surface a different reason;
    only recurrence of the named reason is forbidden. -/
def showMachineRepairControl (name : String) (candidate : CandidateAct)
    (reason : RefusalReason) : IO UInt32 := do
  let before := admit Planted.door candidate
  let repaired := (repair candidate reason).map (admit Planted.door)
  let mutant :=
    (RepairControls.unchanged candidate reason).map (admit Planted.door)
  let repairedClears :=
    match repaired with
    | some result => !isRefusedFor reason result
    | none => false
  let mutantFails :=
    match mutant with
    | some result => isRefusedFor reason result
    | none => false
  let refuted :=
    isRefusedFor reason before && repairedClears && mutantFails
  IO.println
    s!"control={name};reason={reason.wire};before={renderResult before};repaired={renderOptionalResult repaired};mutant={renderOptionalResult mutant};verdict={if refuted then "refuted" else "survived"}"
  return if refuted then 0 else 1

/-- Kill the claim that the door arbitrates by declared reason priority.
    The two rows carry the SAME fault support in different payload order:
    the door's answer moves with the order while the arbitrated answer
    does not, so no total order on reasons reproduces this door, whatever
    order is declared. What survives is the bounded law, and these rows
    are exactly the candidates its premise excludes. -/
def showFaultListingOrderControl : IO UInt32 := do
  let leftFaults := faults Planted.door Planted.clockThenSecretEmit
  let rightFaults := faults Planted.door Planted.secretThenClockEmit
  let leftDoor := admitReason (admit Planted.door Planted.clockThenSecretEmit)
  let rightDoor := admitReason (admit Planted.door Planted.secretThenClockEmit)
  let leftArbitrated := arbitrate leftFaults
  let rightArbitrated := arbitrate rightFaults
  let sameSupport :=
    leftFaults.all (fun reason => rightFaults.contains reason) &&
      rightFaults.all (fun reason => leftFaults.contains reason)
  let refuted :=
    sameSupport && leftFaults != rightFaults && leftDoor != rightDoor &&
      leftArbitrated == rightArbitrated
  IO.println
    s!"control=drop-fault-listing-order;rows=two-atom-faults-in-both-orders;left-faults={renderReasons leftFaults};right-faults={renderReasons rightFaults};left-door={renderReason leftDoor};right-door={renderReason rightDoor};left-arbitrated={renderReason leftArbitrated};right-arbitrated={renderReason rightArbitrated};verdict={if refuted then "refuted" else "survived"}"
  return if refuted then 0 else 1

/-- Kill a repair chain that resurrects a reason it already cleared. The
    two chains share their first move; the lawful one stops when the
    surfaced reason has no machine rewrite, while the mutant answers that
    reason by restoring the shape it just repaired, and its trail utters
    the cleared reason again. -/
def showRepairCompositionControl : IO UInt32 := do
  let lawful :=
    ChainControls.reasonTrail repair 4 Planted.door
      RepairControls.lastWriterWithClock
  let mutant :=
    ChainControls.reasonTrail ChainControls.resurrecting 4 Planted.door
      RepairControls.lastWriterWithClock
  let refuted :=
    lawful.head? == mutant.head? && !ChainControls.repeatsReason lawful &&
      ChainControls.repeatsReason mutant
  IO.println
    s!"control=drop-repair-composition;candidate=lww-join-carrying-a-clock;lawful-trail={renderReasons lawful};mutant-trail={renderReasons mutant};verdict={if refuted then "refuted" else "survived"}"
  return if refuted then 0 else 1

/-- Kill a repair chain that never terminates. The lawful chain is at its
    fixpoint after one move and stays there under more fuel; the mutant
    rewrite lands back inside its own domain, so at any fuel it still has
    a move to make and still surfaces the reason it was answering. -/
def showRepairTerminationControl : IO UInt32 := do
  let lawfulOnce := repairChain 1 Planted.door Planted.anchoredResolve
  let lawfulMany := repairChain 8 Planted.door Planted.anchoredResolve
  let mutantMany :=
    ChainControls.chainWith ChainControls.anchorShifting 8 Planted.door
      Planted.anchoredResolve
  let lawfulMove := repairStep Planted.door lawfulOnce
  let mutantMove :=
    ChainControls.stepWith ChainControls.anchorShifting Planted.door mutantMany
  let refuted :=
    renderResult (admit Planted.door lawfulOnce) ==
        renderResult (admit Planted.door lawfulMany) &&
      isAdmitted (admit Planted.door lawfulOnce) && lawfulMove.isNone &&
      mutantMove.isSome &&
      isRefusedFor .anchoredResolve (admit Planted.door mutantMany)
  IO.println
    s!"control=drop-repair-termination;candidate=anchor-on-identity-read;lawful-at-1={renderResult (admit Planted.door lawfulOnce)};lawful-at-8={renderResult (admit Planted.door lawfulMany)};lawful-move={renderMove lawfulMove};mutant-at-8={renderResult (admit Planted.door mutantMany)};mutant-move={renderMove mutantMove};verdict={if refuted then "refuted" else "survived"}"
  return if refuted then 0 else 1

/-- Kill the argument that termination follows from the fault set
    shrinking. The past-mutation rewrite builds a successor declaration
    pinning its predecessor, and where the acting writ's universe does not
    hold that predecessor the repaired candidate's listing carries a
    door-relative reason its input never had. The chain still stops — on
    the image-outside-the-domain argument, which is what the shipped law
    rests on. -/
def showRepairFaultShrinkageControl : IO UInt32 := do
  let before := faults Planted.door Planted.offWritMutation
  let move := repairStep Planted.door Planted.offWritMutation
  let repaired := move.getD Planted.offWritMutation
  let after := faults Planted.door repaired
  let grew := after.any (fun reason => !before.contains reason)
  let stops := (repairStep Planted.door repaired).isNone
  let refuted := move.isSome && grew && stops
  IO.println
    s!"control=drop-repair-fault-shrinkage;candidate=off-writ-in-place-update;before-faults={renderReasons before};after-faults={renderReasons after};grew={grew};stops={stops};verdict={if refuted then "refuted" else "survived"}"
  return if refuted then 0 else 1

/-- Kill a run implementation that judges the tail after a refusal. The
    two programs share their prefix and differ only after the refusing
    node: the lawful walk answers identically for both, because it never
    reaches the tail, while the mutant's answer moves with the tail. The
    lawful side must also actually refuse, or agreement would be the
    agreement of a walk that judges nothing. -/
def showRunTailControl : IO UInt32 := do
  let lawfulLeft := RunControls.lawful Planted.runNodes
  let lawfulRight := RunControls.lawful Planted.runNodesOtherTail
  let mutantLeft := RunControls.continuingRun Planted.runNodes
  let mutantRight := RunControls.continuingRun Planted.runNodesOtherTail
  let refuted :=
    refusesAt 1 .clockRead lawfulLeft &&
      renderOutcome lawfulLeft == renderOutcome lawfulRight &&
      renderOutcome mutantLeft != renderOutcome mutantRight
  IO.println
    s!"control=drop-run-tail-halt;program=admit-then-clock-then-tail;lawful-left={renderOutcome lawfulLeft};lawful-right={renderOutcome lawfulRight};mutant-left={renderOutcome mutantLeft};mutant-right={renderOutcome mutantRight};verdict={if refuted then "refuted" else "survived"}"
  return if refuted then 0 else 1

/-- Kill a run implementation that discards the prefix's admissions when
    a later node refuses. The landing row is carried beside the refusing
    one so a walk that reported no steps at all — the walk that admits
    nothing — cannot pass as the lawful side. -/
def showRunPrefixControl : IO UInt32 := do
  let landing := RunControls.lawful Planted.runNodesLanding
  let lawful := RunControls.lawful Planted.runNodes
  let mutant := RunControls.forgettingRun Planted.runNodes
  let refuted :=
    standingNames landing == [0, 2] &&
      refusesAt 1 .clockRead lawful && refusesAt 1 .clockRead mutant &&
      standingNames lawful == [0] && standingNames mutant == []
  IO.println
    s!"control=drop-run-prefix-standing;program=admit-then-clock;landing={renderOutcome landing};lawful={renderOutcome lawful};mutant={renderOutcome mutant};verdict={if refuted then "refuted" else "survived"}"
  return if refuted then 0 else 1

/-- Kill a run implementation that discards the prefix's admissions when
    a later node cannot be COMPLETED. The completion here answers at
    the first node and is silent at the second — so the lawful
    walk stops unspeakable at the tail with the first node's admission
    standing, and the mutant reports the same arm at the same node with
    nothing standing. The total-completion landing row is carried beside
    them so a walk that admitted nothing at all cannot pass as the
    lawful side. -/
def showRunUnspeakableControl : IO UInt32 := do
  let landing := RunControls.lawful Planted.runNodesLanding
  let lawful := RunControls.silentRun Planted.runNodesLanding
  let mutant := RunControls.erasingRun Planted.runNodesLanding
  let refuted :=
    standingNames landing == [0, 2] &&
      unspeakableAt 2 lawful && unspeakableAt 2 mutant &&
      standingNames lawful == [0] && standingNames mutant == []
  IO.println
    s!"control=drop-run-unspeakable-prefix-standing;program=admit-then-unspeakable;landing={renderOutcome landing};lawful={renderOutcome lawful};mutant={renderOutcome mutant};verdict={if refuted then "refuted" else "survived"}"
  return if refuted then 0 else 1

def main (args : List String) : IO UInt32 := do
  match args with
  | ["closure-clock-read"] =>
      showRefusalControl "closure-clock-read" "fold-carrying-wall-clock"
        Planted.clockFold .clockRead
  | ["closure-absence-trigger"] =>
      showRefusalControl "closure-absence-trigger" "on-absence-production"
        Planted.absenceTrigger .absenceTrigger
  | ["closure-unfenced-decide"] =>
      showRefusalControl "closure-unfenced-decide" "tokenless-commit"
        Planted.unfencedDecide .unfencedDecide
  | ["closure-last-writer-wins"] =>
      showRefusalControl "closure-last-writer-wins" "lww-join-strategy"
        Planted.lastWriterJoin .lastWriterWins
  | ["closure-unverified-read"] =>
      showRefusalControl "closure-unverified-read" "trusted-asserted-bytes"
        Planted.trustingRead .unverifiedRead
  | ["closure-cross-sort-token"] =>
      showRefusalControl "closure-cross-sort-token" "token-from-another-register"
        Planted.crossRegisterDecide .crossSortIdentifier
  | ["closure-minted-identifier"] =>
      showRefusalControl "closure-minted-identifier" "uuid-shaped-referent"
        Planted.mintedDeclare .mintedIdentifier
  | ["closure-ambient-query"] =>
      showRefusalControl "closure-ambient-query" "unanchored-latest-read"
        Planted.latestRead .ambientQueryInput
  | ["closure-forward-reference"] =>
      showRefusalControl "closure-forward-reference" "never-admitted-referent"
        Planted.forwardDeclare .forwardReference
  | ["closure-secret-carrier"] =>
      showRefusalControl "closure-secret-carrier" "secret-in-evidence-body"
        Planted.secretEmit .secretCarrier
  | ["closure-absence-claim"] =>
      showRefusalControl "closure-absence-claim" "not-present-anywhere-claim"
        Planted.absenceClaimTrigger .absenceClaim
  | ["closure-past-mutation"] =>
      showRefusalControl "closure-past-mutation" "update-in-place"
        Planted.pastMutation .pastMutation
  | ["closure-off-writ-referent"] =>
      showRefusalControl "closure-off-writ-referent" "referent-outside-pinned-universe"
        Planted.offWritDeclare .offWritReferent
  | ["closure-function-value"] =>
      showRefusalControl "closure-function-value" "closure-bytes-as-data"
        Planted.functionDeclare .closureIntrospection
  | ["anchored-resolve"] =>
      showRefusalControl "anchored-resolve" "anchor-on-identity-read"
        Planted.anchoredResolve .anchoredResolve
  | ["unfilled-hole"] =>
      showRefusalControl "unfilled-hole" "hole-in-single-sentence"
        Planted.holeyEmit .unfilledHole
  | ["door-admits-lawful"] =>
      showAdmitControl "door-admits-lawful" "declare-pinned-references"
        Planted.lawfulDeclare Planted.lawfulDeclareAct
  | ["drop-admit-monotonicity"] => showAdmitMonotonicityControl
  | ["drop-intrinsic-refusal"] => showIntrinsicRefusalControl
  | ["drop-relative-repair-growth"] => showRelativeRepairControl
  | ["machine-repair-anchored-resolve"] =>
      showMachineRepairControl "machine-repair-anchored-resolve"
        Planted.anchoredResolve .anchoredResolve
  | ["machine-repair-unverified-read"] =>
      showMachineRepairControl "machine-repair-unverified-read"
        Planted.trustingRead .unverifiedRead
  | ["machine-repair-past-mutation"] =>
      showMachineRepairControl "machine-repair-past-mutation"
        Planted.pastMutation .pastMutation
  | ["machine-repair-last-writer-wins"] =>
      showMachineRepairControl "machine-repair-last-writer-wins"
        RepairControls.lastWriterWithClock .lastWriterWins
  | ["drop-fault-listing-order"] => showFaultListingOrderControl
  | ["drop-repair-composition"] => showRepairCompositionControl
  | ["drop-repair-termination"] => showRepairTerminationControl
  | ["drop-repair-fault-shrinkage"] => showRepairFaultShrinkageControl
  | ["drop-run-tail-halt"] => showRunTailControl
  | ["drop-run-prefix-standing"] => showRunPrefixControl
  | ["drop-run-unspeakable-prefix-standing"] => showRunUnspeakableControl
  | ["drop-provision-disjointness"] =>
      showDriftControl "drop-provision-disjointness" "two-arrival-orders"
        (renderValuation (provisionFold Provision.disjointOrderOne))
        (renderValuation (provisionFold Provision.disjointOrderTwo))
        (renderValuation (provisionFold Provision.overlapOrderOne))
        (renderValuation (provisionFold Provision.overlapOrderTwo))
  | _ =>
      (← IO.getStderr).putStrLn
        "usage: control (closure-clock-read|closure-absence-trigger|closure-unfenced-decide|closure-last-writer-wins|closure-unverified-read|closure-cross-sort-token|closure-minted-identifier|closure-ambient-query|closure-forward-reference|closure-secret-carrier|closure-absence-claim|closure-past-mutation|closure-off-writ-referent|closure-function-value|anchored-resolve|unfilled-hole|door-admits-lawful|drop-admit-monotonicity|drop-intrinsic-refusal|drop-relative-repair-growth|machine-repair-anchored-resolve|machine-repair-unverified-read|machine-repair-past-mutation|machine-repair-last-writer-wins|drop-fault-listing-order|drop-repair-composition|drop-repair-termination|drop-repair-fault-shrinkage|drop-run-tail-halt|drop-run-prefix-standing|drop-run-unspeakable-prefix-standing|drop-provision-disjointness)"
      return 2
