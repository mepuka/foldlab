import Effects.Conformance.ManifestReplay
import Effects.Conformance.Instances.RMT002
import Effects.Conformance.Instances.RMT003

/-!
# The remote manifest families — schedule vectors

Scenario rows for the R1 remote obligations, executed from the client
machine. A row's input is one ordered list interleaving caller requests
with scripted server events — the realized form of the ratified
operations-plus-schedule shape, since the machine consumes them in one
order (flagged for the R1 ratification point). Expectations — the
command stream, the decision trace, per-step results, and the final
state summary — are computed by running the machine; outputs are never
written by hand. Row generation is parameterized by the step function
so the mutation task can regenerate rows under a declared mutant and
assert the vectors move.

The families land additively under the declared model version, per the
ratified additive precedent. State summaries carry sizes and the phase
only — never carrier iteration order — so regeneration is byte-stable
by construction.
-/

namespace Effects.Conformance.Manifest

open Effects.Remote Json

abbrev RSt := MachineState Nat (List UInt8)
abbrev RIn := MInput Nat (List UInt8)
abbrev RStep := RSt → RIn → Effects.Remote.StepOut Nat (List UInt8)

/-- Run the machine over an input list, collecting per-step results, the
decision trace, and the command stream. -/
def runRemote (stepF : RStep) : RSt → List RIn →
    RSt × List (MResult Nat (List UInt8)) ×
      List (RDecision Nat (List UInt8)) × List (Command Nat (List UInt8))
  | s, [] => (s, [], [], [])
  | s, i :: is =>
    let o := stepF s i
    let rest := runRemote stepF o.state is
    (rest.1, o.result :: rest.2.1, o.decisions ++ rest.2.2.1,
      o.commands ++ rest.2.2.2)

/-! ## Wire encodings -/

def keyJson (k : Nat) : Value := .nat k

def eventJson : Event Nat (List UInt8) → Value
  | .ok declared bytes =>
      .obj [ ("_tag", .str "Ok"), ("bytes", bytesJson bytes)
           , ("declared", .nat declared) ]
  | .absent => .obj [("_tag", .str "Absent")]
  | .truncated => .obj [("_tag", .str "Truncated")]
  | .reset => .obj [("_tag", .str "Reset")]
  | .silence => .obj [("_tag", .str "Silence")]
  | .unauthenticated => .obj [("_tag", .str "Unauthenticated")]
  | .denied => .obj [("_tag", .str "Denied")]
  | .rateLimited retryAfter =>
      .obj [("_tag", .str "RateLimited"), ("retryAfter", .nat retryAfter)]
  | .capacity => .obj [("_tag", .str "Capacity")]
  | .redirected => .obj [("_tag", .str "Redirected")]
  | .integrityMismatch => .obj [("_tag", .str "IntegrityMismatch")]
  | .batchResult _ => .obj [("_tag", .str "BatchResult")]
  | .capabilities _ => .obj [("_tag", .str "Capabilities")]
  | .interrupted => .obj [("_tag", .str "Interrupted")]

def opJson : Op Nat (List UInt8) → Value
  | .load key => .obj [("_tag", .str "Load"), ("key", keyJson key)]
  | .upload key bytes =>
      .obj [ ("_tag", .str "Upload"), ("bytes", bytesJson bytes)
           , ("key", keyJson key) ]

def rInputJson : RIn → Value
  | .request op => .obj [("_tag", .str "Request"), ("op", opJson op)]
  | .fromWire event =>
      .obj [("_tag", .str "FromWire"), ("event", eventJson event)]

def commandJson : Command Nat (List UInt8) → Value
  | .probeCapabilities => .obj [("_tag", .str "ProbeCapabilities")]
  | .load key => .obj [("_tag", .str "Load"), ("key", keyJson key)]
  | .findMissing keys =>
      .obj [("_tag", .str "FindMissing"), ("keys", .arr (keys.map keyJson))]
  | .upload key bytes =>
      .obj [ ("_tag", .str "Upload"), ("bytes", bytesJson bytes)
           , ("key", keyJson key) ]
  | .queryCommitted key =>
      .obj [("_tag", .str "QueryCommitted"), ("key", keyJson key)]
  | .publishRoot key =>
      .obj [("_tag", .str "PublishRoot"), ("key", keyJson key)]

def rDecisionJson : RDecision Nat (List UInt8) → Value
  | .issued command =>
      .obj [("_tag", .str "Issued"), ("command", commandJson command)]
  | .verified key => .obj [("_tag", .str "Verified"), ("key", keyJson key)]
  | .cached key => .obj [("_tag", .str "Cached"), ("key", keyJson key)]
  | .budgetRejected key =>
      .obj [("_tag", .str "BudgetRejected"), ("key", keyJson key)]
  | .integrityRejected key =>
      .obj [("_tag", .str "IntegrityRejected"), ("key", keyJson key)]
  | .repeatRefused key =>
      .obj [("_tag", .str "RepeatRefused"), ("key", keyJson key)]
  | .gaveUp key => .obj [("_tag", .str "GaveUp"), ("key", keyJson key)]

def rResultJson : MResult Nat (List UInt8) → Value
  | .commanded => .obj [("_tag", .str "Commanded")]
  | .delivered key bytes =>
      .obj [ ("_tag", .str "Delivered"), ("bytes", bytesJson bytes)
           , ("key", keyJson key) ]
  | .uploaded key => .obj [("_tag", .str "Uploaded"), ("key", keyJson key)]
  | .notFound key => .obj [("_tag", .str "NotFound"), ("key", keyJson key)]
  | .budgetRejected key =>
      .obj [("_tag", .str "BudgetRejected"), ("key", keyJson key)]
  | .integrityRejected key =>
      .obj [("_tag", .str "IntegrityRejected"), ("key", keyJson key)]
  | .repeatRefused key =>
      .obj [("_tag", .str "RepeatRefused"), ("key", keyJson key)]
  | .transportFailed key =>
      .obj [("_tag", .str "TransportFailed"), ("key", keyJson key)]
  | .authFailed key =>
      .obj [("_tag", .str "AuthFailed"), ("key", keyJson key)]
  | .busy => .obj [("_tag", .str "Busy")]
  | .absorbed => .obj [("_tag", .str "Absorbed")]

def phaseJson : Phase Nat (List UInt8) → Value
  | .idle => .obj [("_tag", .str "Idle")]
  | .loading key => .obj [("_tag", .str "Loading"), ("key", keyJson key)]
  | .uploading key bytes =>
      .obj [ ("_tag", .str "Uploading"), ("bytes", bytesJson bytes)
           , ("key", keyJson key) ]

/-- One schedule row: the interleaved inputs and the executed
expectation. -/
def remoteRow (stepF : RStep) (caseId : String) (inputs : List RIn) :
    String × Value :=
  let (final, results, decisions, commands) :=
    runRemote stepF rmtEmpty inputs
  ( caseId
  , .obj [ ("case", .str caseId)
         , ("expect", .obj
             [ ("commands", .arr (commands.map commandJson))
             , ("decisions", .arr (decisions.map rDecisionJson))
             , ("results", .arr (results.map rResultJson))
             , ("state", .obj
                 [ ("cacheSize", .nat final.cache.size)
                 , ("phase", phaseJson final.phase)
                 , ("rejectedSize", .nat final.rejected.size) ]) ])
         , ("input", .obj [("inputs", .arr (inputs.map rInputJson))]) ] )

/-! ## Family rows, parameterized by the step under test -/

def rmt001Rows (stepF : RStep) : List (String × Value) :=
  [ remoteRow stepF "load-verified-cached-000"
      [.request (.load 2), .fromWire (.ok 2 [7, 9])]
  , remoteRow stepF "load-integrity-rejected-001"
      [.request (.load 2), .fromWire (.ok 2 [7])]
  , remoteRow stepF "load-absent-002"
      [.request (.load 2), .fromWire .absent] ]

def rmt002Rows (stepF : RStep) : List (String × Value) :=
  [ remoteRow stepF "upload-over-budget-000"
      [.request (.upload 9 (List.replicate 9 0))]
  , remoteRow stepF "load-declared-over-budget-001"
      [.request (.load 2), .fromWire (.ok 9 [7, 9])]
  , remoteRow stepF "upload-within-budget-002"
      [.request (.upload 2 [7, 9]), .fromWire (.ok 0 [])] ]

def rmt003Rows (stepF : RStep) : List (String × Value) :=
  [ remoteRow stepF "upload-rejected-then-repeat-000"
      [.request (.upload 3 [1, 2]), .request (.upload 3 [1, 2])]
  , remoteRow stepF "upload-server-mismatch-then-repeat-001"
      [ .request (.upload 2 [7, 9]), .fromWire .integrityMismatch
      , .request (.upload 2 [7, 9]) ] ]

/-- The remote families with their instance-projected sentences. -/
def remoteFamilies (stepF : RStep) :
    List (String × String × List (String × Value)) :=
  [ ("RMT-001", rmt001.sentence, rmt001Rows stepF)
  , ("RMT-002", rmt002.sentence, rmt002Rows stepF)
  , ("RMT-003", rmt003.sentence, rmt003Rows stepF) ]

/-- Rendered rows of one remote family under a step function — the
mutation task's comparison unit. -/
def remoteFamilyRowsRendered (stepF : RStep) (family : String) : String :=
  match (remoteFamilies stepF).find? (·.1 == family) with
  | some (_, _, rows) =>
      Json.document (.arr ((rows.mergeSort fun a b => decide (a.1 ≤ b.1)).map (·.2)))
  | none => ""

/-- The committed remote manifest files, additive at the declared model
version. -/
def remoteFiles : List (String × String) :=
  (remoteFamilies (Effects.Remote.step rmtParams)).map
    fun (family, meaning, rows) =>
      (family ++ ".json", Json.document
        (familyManifestAt modelVersion family meaning rows))

end Effects.Conformance.Manifest
