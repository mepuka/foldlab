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
  | _ =>
      (← IO.getStderr).putStrLn
        "usage: control (closure-clock-read|closure-absence-trigger|closure-unfenced-decide|closure-last-writer-wins|closure-unverified-read|closure-cross-sort-token|closure-minted-identifier|closure-ambient-query|closure-forward-reference|closure-secret-carrier|closure-absence-claim|closure-past-mutation|closure-off-writ-referent|closure-function-value|anchored-resolve|unfilled-hole|door-admits-lawful)"
      return 2
