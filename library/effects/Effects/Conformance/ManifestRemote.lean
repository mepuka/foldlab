import Effects.Conformance.ManifestReplay
import Effects.Conformance.Instances.RMT002
import Effects.Conformance.Instances.RMT003

/-!
# The remote manifest families — schedule vectors

Scenario rows for the R1 remote obligations, executed from the client
machine. A row's input carries three fields, per the ratified shape and
its review corrections: `ops` — the identifier-tagged operations;
`schedule` — the scripted server events, each correlated to the
operation it answers; and `sequence` — the explicit interleaving, every
operation and schedule entry referenced exactly once, so schedule
accounting is complete by construction. Expectations — the
identifier-tagged command stream and decision trace, per-step results,
and the final state summary — are computed by running the machine;
outputs are never written by hand.

Keys are 32-byte addresses computed by a DECLARED TOY DIGEST over the
canonical admitted-node encodings produced by the ratified CAS codec —
real canonical bytes, honest toy oracle, both named in each family's
`oracle` field; the tie to the full CAS admission judgment is R2's
refinement obligation. The event encoder is total: batch results and
capability limits encode fully even though no R1 row emits them. State
summaries carry sizes only — never carrier iteration order — so
regeneration is byte-stable by construction.
-/

namespace Effects.Conformance.Manifest

open Effects.Remote Effects.Cas Json

instance : Hashable Addr32 := ⟨fun a => hash a.val⟩

abbrev RSt := MachineState Addr32 Bytes
abbrev RIn := MInput Addr32 Bytes
abbrev RStep := RSt → RIn → Effects.Remote.StepOut Addr32 Bytes

/-- The declared toy digest: a 32-lane byte fold over the input — not
cryptographic, deliberately, per the abstract-hash posture. -/
def toyAddr (bs : Bytes) : Addr32 :=
  ⟨(List.range 32).map fun i =>
      UInt8.ofNat ((bs.foldl (fun a b => a + b.toNat * (i + 3))
        (i + bs.length)) % 256),
    by simp⟩

/-- The vector environment: byte budget forty (the small canonical
encodings fit; the two-reference encoding cannot), sizes by length, and
verification recomputing the toy digest over received bytes. -/
def vecParams : Params Addr32 Bytes :=
  { budgets := ⟨40, 4⟩
    size := List.length
    verify := fun k b => decide (toyAddr b = k) }

/-! ## Canonical-byte fixtures (from the ratified CAS codec) -/

def smallBytes : Bytes := encodeAdmitted cas001PosNode
def goodBytes : Bytes := encodeAdmitted payloadNode
def bigBytes : Bytes := encodeAdmitted multiRefNode

def kGood : Addr32 := toyAddr goodBytes
def kSmall : Addr32 := toyAddr smallBytes
def kBig : Addr32 := toyAddr bigBytes

/-! ## Scenario carrier: operations, schedule, explicit interleaving -/

/-- A reference into a scenario's operations or schedule. -/
inductive SeqRef where
  | opRef (index : Nat)
  | eventRef (index : Nat)

/-- One scenario: identifier-tagged operations, correlated schedule
entries, and the explicit interleaving. -/
structure Scenario where
  ops : List (OpId × Op Addr32 Bytes)
  schedule : List (OpId × Event Addr32 Bytes)
  sequence : List SeqRef

/-- Derive the machine's input list from the explicit interleaving. -/
def Scenario.inputs (sc : Scenario) : List RIn :=
  sc.sequence.filterMap fun
    | .opRef i => sc.ops[i]?.map fun (id, op) => .request id op
    | .eventRef i => sc.schedule[i]?.map fun (id, e) => .fromWire id e

/-! ## Wire encodings -/

def addrJson32 (a : Addr32) : Value := bytesJson a.val

def keyStatusJson : KeyStatus Addr32 Bytes → Value
  | .found key bytes =>
      .obj [ ("_tag", .str "Found"), ("bytes", bytesJson bytes)
           , ("key", addrJson32 key) ]
  | .missing key => .obj [("_tag", .str "Missing"), ("key", addrJson32 key)]
  | .failed key => .obj [("_tag", .str "Failed"), ("key", addrJson32 key)]

def limitsJson (l : Limits) : Value :=
  .obj [ ("maxBatchKeys", .nat l.maxBatchKeys)
       , ("maxBlobBytes", .nat l.maxBlobBytes) ]

def eventJson : Event Addr32 Bytes → Value
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
  | .batchResult results =>
      .obj [ ("_tag", .str "BatchResult")
           , ("results", .arr (results.map keyStatusJson)) ]
  | .capabilities limits =>
      .obj [("_tag", .str "Capabilities"), ("limits", limitsJson limits)]
  | .interrupted => .obj [("_tag", .str "Interrupted")]

def opJson : Op Addr32 Bytes → Value
  | .load key => .obj [("_tag", .str "Load"), ("key", addrJson32 key)]
  | .upload key bytes =>
      .obj [ ("_tag", .str "Upload"), ("bytes", bytesJson bytes)
           , ("key", addrJson32 key) ]

def commandJson : Command Addr32 Bytes → Value
  | .probeCapabilities => .obj [("_tag", .str "ProbeCapabilities")]
  | .load key => .obj [("_tag", .str "Load"), ("key", addrJson32 key)]
  | .findMissing keys =>
      .obj [ ("_tag", .str "FindMissing")
           , ("keys", .arr (keys.map addrJson32)) ]
  | .upload key bytes =>
      .obj [ ("_tag", .str "Upload"), ("bytes", bytesJson bytes)
           , ("key", addrJson32 key) ]
  | .queryCommitted key =>
      .obj [("_tag", .str "QueryCommitted"), ("key", addrJson32 key)]
  | .publishRoot key =>
      .obj [("_tag", .str "PublishRoot"), ("key", addrJson32 key)]

def rDecisionJson : RDecision Addr32 Bytes → Value
  | .issued command =>
      .obj [("_tag", .str "Issued"), ("command", commandJson command)]
  | .verified key => .obj [("_tag", .str "Verified"), ("key", addrJson32 key)]
  | .cached key => .obj [("_tag", .str "Cached"), ("key", addrJson32 key)]
  | .returned key => .obj [("_tag", .str "Returned"), ("key", addrJson32 key)]
  | .budgetRejected key =>
      .obj [("_tag", .str "BudgetRejected"), ("key", addrJson32 key)]
  | .integrityRejected key =>
      .obj [("_tag", .str "IntegrityRejected"), ("key", addrJson32 key)]
  | .repeatRefused key =>
      .obj [("_tag", .str "RepeatRefused"), ("key", addrJson32 key)]
  | .gaveUp key => .obj [("_tag", .str "GaveUp"), ("key", addrJson32 key)]

def taggedDecisionJson (d : OpId × RDecision Addr32 Bytes) : Value :=
  .obj [("decision", rDecisionJson d.2), ("op", .nat d.1)]

def taggedCommandJson (c : OpId × Command Addr32 Bytes) : Value :=
  .obj [("command", commandJson c.2), ("op", .nat c.1)]

def rResultJson : MResult Addr32 Bytes → Value
  | .commanded => .obj [("_tag", .str "Commanded")]
  | .delivered key bytes =>
      .obj [ ("_tag", .str "Delivered"), ("bytes", bytesJson bytes)
           , ("key", addrJson32 key) ]
  | .uploaded key => .obj [("_tag", .str "Uploaded"), ("key", addrJson32 key)]
  | .notFound key => .obj [("_tag", .str "NotFound"), ("key", addrJson32 key)]
  | .budgetRejected key =>
      .obj [("_tag", .str "BudgetRejected"), ("key", addrJson32 key)]
  | .integrityRejected key =>
      .obj [("_tag", .str "IntegrityRejected"), ("key", addrJson32 key)]
  | .repeatRefused key =>
      .obj [("_tag", .str "RepeatRefused"), ("key", addrJson32 key)]
  | .transportFailed key =>
      .obj [("_tag", .str "TransportFailed"), ("key", addrJson32 key)]
  | .authFailed key =>
      .obj [("_tag", .str "AuthFailed"), ("key", addrJson32 key)]
  | .duplicateId => .obj [("_tag", .str "DuplicateId")]
  | .absorbed => .obj [("_tag", .str "Absorbed")]

def seqRefJson : SeqRef → Value
  | .opRef index => .obj [("_tag", .str "OpRef"), ("index", .nat index)]
  | .eventRef index =>
      .obj [("_tag", .str "EventRef"), ("index", .nat index)]

def taggedOpJson (o : OpId × Op Addr32 Bytes) : Value :=
  .obj [("id", .nat o.1), ("op", opJson o.2)]

def taggedEventJson (e : OpId × Event Addr32 Bytes) : Value :=
  .obj [("answers", .nat e.1), ("event", eventJson e.2)]

/-! ## Family rows, parameterized by the step under test -/

/-- One schedule row: the scenario and its executed expectation, run
under the step function so the mutation task can regenerate rows. -/
def remoteRowWith (stepF : RStep) (caseId : String) (sc : Scenario) :
    String × Value :=
  let inputs := sc.inputs
  let (final, results, decisions, commands) :=
    (inputs.foldl
      (fun (acc : RSt × List (MResult Addr32 Bytes) ×
          List (OpId × RDecision Addr32 Bytes) ×
          List (OpId × Command Addr32 Bytes)) i =>
        let o := stepF acc.1 i
        (o.state, acc.2.1 ++ [o.result], acc.2.2.1 ++ o.decisions,
          acc.2.2.2 ++ o.commands))
      ({ inFlight := ∅, cache := ∅, rejected := ∅ }, [], [], []))
  ( caseId
  , .obj [ ("case", .str caseId)
         , ("expect", .obj
             [ ("commands", .arr (commands.map taggedCommandJson))
             , ("decisions", .arr (decisions.map taggedDecisionJson))
             , ("results", .arr (results.map rResultJson))
             , ("state", .obj
                 [ ("cacheSize", .nat final.cache.size)
                 , ("inFlightSize", .nat final.inFlight.size)
                 , ("rejectedSize", .nat final.rejected.size) ]) ])
         , ("input", .obj
             [ ("ops", .arr (sc.ops.map taggedOpJson))
             , ("schedule", .arr (sc.schedule.map taggedEventJson))
             , ("sequence", .arr (sc.sequence.map seqRefJson)) ]) ] )

def rmt001Rows (stepF : RStep) : List (String × Value) :=
  [ remoteRowWith stepF "load-verified-cached-000"
      { ops := [(1, .load kGood)]
        schedule := [(1, .ok goodBytes.length goodBytes)]
        sequence := [.opRef 0, .eventRef 0] }
  , remoteRowWith stepF "load-wrong-bytes-rejected-001"
      { ops := [(1, .load kGood)]
        schedule := [(1, .ok smallBytes.length smallBytes)]
        sequence := [.opRef 0, .eventRef 0] }
  , remoteRowWith stepF "load-absent-002"
      { ops := [(1, .load kGood)]
        schedule := [(1, .absent)]
        sequence := [.opRef 0, .eventRef 0] } ]

def rmt002Rows (stepF : RStep) : List (String × Value) :=
  [ remoteRowWith stepF "upload-over-budget-000"
      { ops := [(1, .upload kBig bigBytes)]
        schedule := []
        sequence := [.opRef 0] }
  , remoteRowWith stepF "load-declared-over-budget-001"
      { ops := [(1, .load kGood)]
        schedule := [(1, .ok 41 goodBytes)]
        sequence := [.opRef 0, .eventRef 0] }
  , remoteRowWith stepF "upload-within-budget-002"
      { ops := [(1, .upload kGood goodBytes)]
        schedule := [(1, .ok 0 [])]
        sequence := [.opRef 0, .eventRef 0] } ]

def rmt003Rows (stepF : RStep) : List (String × Value) :=
  [ remoteRowWith stepF "upload-rejected-then-repeat-000"
      { ops := [(1, .upload kSmall goodBytes), (2, .upload kSmall goodBytes)]
        schedule := []
        sequence := [.opRef 0, .opRef 1] }
  , remoteRowWith stepF "upload-server-mismatch-then-repeat-001"
      { ops := [(1, .upload kGood goodBytes), (2, .upload kGood goodBytes)]
        schedule := [(1, .integrityMismatch)]
        sequence := [.opRef 0, .eventRef 0, .opRef 1] } ]

/-- The declared oracle, named in every remote family document. -/
def remoteOracle : String :=
  "Keys are 32-byte addresses computed by a declared toy digest (a 32-lane byte fold, not cryptographic) over canonical admitted-node encodings from the ratified CAS codec; verification recomputes the digest over received bytes. The full pre-image discipline and the tie to CAS admission arrive with the R2 semantic adapter."

def remoteFamilyManifestAt (version family meaning : String)
    (rows : List (String × Value)) : Value :=
  .obj [ ("family", .str family)
       , ("meaning", .str meaning)
       , ("model", .str version)
       , ("oracle", .str remoteOracle)
       , ("rows", .arr ((rows.mergeSort fun a b => decide (a.1 ≤ b.1)).map (·.2))) ]

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
  (remoteFamilies (Effects.Remote.step vecParams)).map
    fun (family, meaning, rows) =>
      (family ++ ".json", Json.document
        (remoteFamilyManifestAt modelVersion family meaning rows))

end Effects.Conformance.Manifest
