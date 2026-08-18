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
  | ["drop-provision-disjointness"] =>
      showDriftControl "drop-provision-disjointness" "two-arrival-orders"
        (renderValuation (provisionFold Provision.disjointOrderOne))
        (renderValuation (provisionFold Provision.disjointOrderTwo))
        (renderValuation (provisionFold Provision.overlapOrderOne))
        (renderValuation (provisionFold Provision.overlapOrderTwo))
  | _ =>
      (← IO.getStderr).putStrLn
        "usage: control (closure-clock-read|closure-absence-trigger|closure-unfenced-decide|closure-last-writer-wins|closure-unverified-read|closure-cross-sort-token|closure-minted-identifier|closure-ambient-query|closure-forward-reference|closure-secret-carrier|closure-absence-claim|closure-past-mutation|closure-off-writ-referent|closure-function-value|anchored-resolve|unfilled-hole|door-admits-lawful|drop-admit-monotonicity|drop-intrinsic-refusal|drop-relative-repair-growth|machine-repair-anchored-resolve|machine-repair-unverified-read|machine-repair-past-mutation|machine-repair-last-writer-wins|drop-provision-disjointness)"
      return 2
