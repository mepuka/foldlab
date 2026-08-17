/- Corpus assembly. Executable definitions only: each row constructor from
`Fabric/Corpus.lean` is applied to the bridge theorem its row names, so the
emitted verdict bits are computed under proofs of the claims they report. A
row whose verdict drifted from its theorem would fail to elaborate here. -/
import Fabric.BridgeProofs

namespace Fabric.Corpus

/-- Every emitted vector, each verdict licensed by its witness theorem. -/
def vectors : List Vector :=
  [ f1Vector (emitter_f1_cell_merge_aci.1 (cellOf f1LeftEvidence)
      (cellOf f1RightEvidence))
  , f2DuplicateVector emitter_f2_duplication
  , f2PermutationVector emitter_f2_permutation
  , f2bStaleVector emitter_f2b_stale_replay
  , f2bDuplicateVector emitter_f2b_duplication
  , f2bReorderedVector emitter_f2b_reordering
  , f3Vector emitter_f3_resume
  , f4Vector emitter_f4_partition
  , intruderVector emitter_intruder_refused.1 emitter_intruder_refused.2
  , f9ClampVector emitter_f9_clamp.1 emitter_f9_request_escalates
  , f9TreeVector emitter_f9_tree.2.1
  , resumeThenRedeliverVector emitter_resume_then_redeliver
  , f2bAheadOfCeilingVector emitter_ahead_of_ceiling
  , f2bMultiGapVector emitter_multi_gap_window
  , f2bRedeliverTwiceVector emitter_redeliver_twice_shuffled
  ]

open Fabric.Canonical in
def header : String :=
  object
    [ { key := "command", value := string "cd verify/fabric && lake exe emitter > ../../packages/plait/fixtures/fabric-conformance.ndjson" }
    , { key := "counts", value := (object
        [ { key := "F1", value := nat 1 }
        , { key := "F2", value := nat 2 }
        , { key := "F2b", value := nat 6 }
        , { key := "F3", value := nat 1 }
        , { key := "F3-F2b", value := nat 1 }
        , { key := "F4", value := nat 1 }
        , { key := "F9", value := nat 2 }
        , { key := "alphabet-refusal", value := nat 1 }
        ]) }
    , { key := "format", value := nat 1 }
    , { key := "generator", value := string "verify/fabric emitter" }
    , { key := "vectors", value := nat vectors.length }
    ]

end Fabric.Corpus
