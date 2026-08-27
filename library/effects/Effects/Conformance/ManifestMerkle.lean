import Effects.Conformance.ManifestRemote
import Effects.Conformance.Instances.MRK001
import Effects.Conformance.Instances.MRK002
import Effects.Conformance.Instances.MRK003
import Effects.Conformance.Instances.MRK005
import Effects.Conformance.Instances.MRK006
import Effects.Conformance.Instances.MRK007
import Effects.Conformance.Instances.MRK011
import Effects.Conformance.Instances.MRK012
import Effects.Conformance.Instances.MRK018

/-!
# The Merkle manifest families

Model-executed vectors for the MRK-1 obligations: chunking rows
(bytes in, chunks and root out), decoder runs (declared geometry,
expected root, a parsed input stream in; the decision list and final
status out — including hostile mutations: tampered chunks, forged
parents, truncation, and a length tamper whose geometry the tree
refutes), slice runs (the range extractor's stream with skip tokens),
and inclusion openings (accept and reject). Addresses are the declared
toy digest over STRUCTURAL pre-image encodings, so domain separation
and position binding live in the pre-image, mirroring the model.
Outputs are computed by running the model — never written by hand —
and each family is parameterized by the function under test so the
mutation task can regenerate rows under a declared mutant.
-/

namespace Effects.Conformance.Manifest

open Effects.Merkle Effects.Cas Json

/-! ## The Merkle vector environment -/

/-- The structural pre-image encoding: a tag byte, then the leaf's
absolute index and bytes or the parent's two child addresses. -/
def encPre32 : Pre Addr32 → Bytes
  | .leaf i b => 0 :: (Effects.Wire.nat32 i ++ b)
  | .parent l r => 1 :: (l.val ++ r.val)

/-- The Merkle vector address function: the declared toy digest over
structural pre-image encodings. -/
def merkleH : HP Addr32 := ⟨fun p => toyAddr (encPre32 p)⟩

def mrkChunks2 : List Bytes := [[1], [2]]
def mrkChunks3 : List Bytes := [[1], [2], [3]]
def mrkChunks5 : List Bytes := [[1], [2], [3], [4], [5]]

/-! ## Function-under-test carriers (the mutation comparison units) -/

abbrev ChunkFn := Bytes → List Bytes
abbrev MStep :=
  DParams Addr32 → DState Addr32 → DInput Addr32 → DStep Addr32
abbrev VerifyFn := Nat → Nat → Bytes → List Addr32 → Addr32 → Bool
abbrev ConsFn := Nat → Nat → Addr32 → Addr32 → List Addr32 → Bool
abbrev OpeningDecodeFn := List UInt8 → Option OpeningDoc
abbrev StreamDecodeFn :=
  List UInt8 → Option (StreamHeader × List (DInput Addr32))
abbrev ManifestDecodeFn := List UInt8 → Option ManifestContent

def realChunk : ChunkFn := mrkRecipe.chunk
def realMStep : MStep := fun D s i => dstep D s i
def realVerify : VerifyFn := fun m n b s r => verifyInclusion merkleH m n b s r
def realConsVerify : ConsFn :=
  fun m n o nw p => verifyConsistency merkleH m n o nw p
def realOpeningDecode : OpeningDecodeFn := decodeOpening?
def realStreamDecode : StreamDecodeFn := decodeStream?
def realManifestDecode : ManifestDecodeFn := decodeManifest?

/-! ## Wire encodings -/

def dInputJson : DInput Addr32 → Value
  | .parentNode l r =>
      .obj [ ("_tag", .str "ParentNode"), ("left", addrJson32 l)
           , ("right", addrJson32 r) ]
  | .chunkNode b => .obj [("_tag", .str "ChunkNode"), ("bytes", bytesJson b)]
  | .skipNode => .obj [("_tag", .str "SkipNode")]

def dDecisionJson : DDecision Addr32 → Value
  | .emitted i b =>
      .obj [ ("_tag", .str "Emitted"), ("bytes", bytesJson b)
           , ("index", .nat i) ]
  | .lengthValidated => .obj [("_tag", .str "LengthValidated")]
  | .rejectedNode => .obj [("_tag", .str "RejectedNode")]

def dStatusJson : DStatus → Value
  | .active => .str "active"
  | .rejected => .str "rejected"
  | .done => .str "done"

/-! ## Rows -/

def chunkRow (chunkF : ChunkFn) (caseId : String) (bytes : Bytes) :
    String × Value :=
  let chunks := chunkF bytes
  ( caseId
  , .obj [ ("case", .str caseId)
         , ("expect", .obj
             [ ("chunks", .arr (chunks.map bytesJson))
             , ("root", addrJson32 (root merkleH 0 chunks)) ])
         , ("input", .obj
             [ ("bytes", bytesJson bytes)
             , ("chunkSize", .nat mrkRecipe.chunkSize) ]) ] )

def mrk001Rows (chunkF : ChunkFn) : List (String × Value) :=
  [ chunkRow chunkF "empty-input-one-empty-chunk-000" []
  , chunkRow chunkF "exact-multiple-001" [1, 2, 3, 4, 5, 6, 7, 8]
  , chunkRow chunkF "ragged-tail-002" [1, 2, 3, 4, 5, 6, 7, 8, 9] ]

def decoderRow (stepF : MStep) (caseId : String)
    (total lo hi : Nat) (chunks : List Bytes)
    (inputs : List (DInput Addr32)) : String × Value :=
  let D : DParams Addr32 := ⟨merkleH, total, root merkleH 0 chunks, lo, hi⟩
  let out := inputs.foldl
    (fun (acc : DState Addr32 × List (DDecision Addr32)) i =>
      let o := stepF D acc.1 i
      (o.state, acc.2 ++ o.decisions))
    (initState D, [])
  ( caseId
  , .obj [ ("case", .str caseId)
         , ("expect", .obj
             [ ("decisions", .arr (out.2.map dDecisionJson))
             , ("status", dStatusJson out.1.status) ])
         , ("input", .obj
             [ ("hi", .nat hi)
             , ("inputs", .arr (inputs.map dInputJson))
             , ("lo", .nat lo)
             , ("root", addrJson32 (root merkleH 0 chunks))
             , ("total", .nat total) ]) ] )

def mrk002Rows (stepF : MStep) : List (String × Value) :=
  [ decoderRow stepF "whole-decode-verified-000" 2 0 2 mrkChunks2
      (genStream merkleH 0 2 0 mrkChunks2)
  , decoderRow stepF "tampered-chunk-rejected-001" 2 0 2 mrkChunks2
      ((genStream merkleH 0 2 0 mrkChunks2).set 2 (.chunkNode [9]))
  , decoderRow stepF "forged-parent-rejected-002" 2 0 2 mrkChunks2
      ((genStream merkleH 0 2 0 mrkChunks2).set 0
        (.parentNode (merkleH.H (.leaf 0 [9])) (merkleH.H (.leaf 1 [2])))) ]

def mrk003Rows (stepF : MStep) : List (String × Value) :=
  [ decoderRow stepF "truncated-run-exposes-no-length-000" 2 0 2 mrkChunks2
      ((genStream merkleH 0 2 0 mrkChunks2).take 2)
  , decoderRow stepF "length-tamper-refuted-by-geometry-001" 3 0 3 mrkChunks2
      (genStream merkleH 0 2 0 mrkChunks2)
  , decoderRow stepF "final-chunk-validates-length-002" 2 0 2 mrkChunks2
      (genStream merkleH 0 2 0 mrkChunks2) ]

def mrk005Rows (stepF : MStep) : List (String × Value) :=
  [ decoderRow stepF "slice-middle-chunk-000" 3 1 2 mrkChunks3
      (genStream merkleH 1 2 0 mrkChunks3)
  , decoderRow stepF "slice-suffix-001" 3 1 3 mrkChunks3
      (genStream merkleH 1 3 0 mrkChunks3)
  , decoderRow stepF "whole-as-full-range-002" 3 0 3 mrkChunks3
      (genStream merkleH 0 3 0 mrkChunks3) ]

def verifyRow (vF : VerifyFn) (caseId : String) (m n : Nat) (bytes : Bytes)
    (sibs : List Addr32) (r : Addr32) : String × Value :=
  ( caseId
  , .obj [ ("case", .str caseId)
         , ("expect", .obj [("accepted", .bool (vF m n bytes sibs r))])
         , ("input", .obj
             [ ("bytes", bytesJson bytes)
             , ("count", .nat n)
             , ("index", .nat m)
             , ("root", addrJson32 r)
             , ("siblings", .arr (sibs.map addrJson32)) ]) ] )

def mrk006Rows (vF : VerifyFn) : List (String × Value) :=
  [ verifyRow vF "honest-opening-accepted-000" 1 3 [2]
      (genPath merkleH 0 1 mrkChunks3) (root merkleH 0 mrkChunks3)
  , verifyRow vF "wrong-root-rejected-001" 1 3 [2]
      (genPath merkleH 0 1 mrkChunks3) (root merkleH 0 mrkChunks2)
  , verifyRow vF "short-path-rejected-002" 1 3 [2] []
      (root merkleH 0 mrkChunks3) ]

def consRow (vF : ConsFn) (caseId : String) (m n : Nat)
    (oldRoot newRoot : Addr32) (proof : List Addr32) : String × Value :=
  ( caseId
  , .obj [ ("case", .str caseId)
         , ("expect", .obj
             [("accepted", .bool (vF m n oldRoot newRoot proof))])
         , ("input", .obj
             [ ("newRoot", addrJson32 newRoot)
             , ("newSize", .nat n)
             , ("oldRoot", addrJson32 oldRoot)
             , ("oldSize", .nat m)
             , ("proof", .arr (proof.map addrJson32)) ]) ] )

def mrk007Rows (vF : ConsFn) : List (String × Value) :=
  [ consRow vF "honest-2-of-3-accepted-000" 2 3
      (root merkleH 0 (mrkChunks3.take 2)) (root merkleH 0 mrkChunks3)
      (genConsProof merkleH 0 2 mrkChunks3 true)
  , consRow vF "honest-3-of-5-accepted-001" 3 5
      (root merkleH 0 (mrkChunks5.take 3)) (root merkleH 0 mrkChunks5)
      (genConsProof merkleH 0 3 mrkChunks5 true)
  , consRow vF "tampered-proof-rejected-002" 2 3
      (root merkleH 0 (mrkChunks3.take 2)) (root merkleH 0 mrkChunks3)
      ((genConsProof merkleH 0 2 mrkChunks3 true).set 0 (toyAddr [9]))
  , consRow vF "wrong-old-root-rejected-003" 2 3
      (root merkleH 0 (mrkChunks3.take 1)) (root merkleH 0 mrkChunks3)
      (genConsProof merkleH 0 2 mrkChunks3 true)
  , consRow vF "trailing-element-rejected-004" 2 3
      (root merkleH 0 (mrkChunks3.take 2)) (root merkleH 0 mrkChunks3)
      (genConsProof merkleH 0 2 mrkChunks3 true ++ [toyAddr [7]])
  , consRow vF "same-roots-not-shortcut-005" 1 2
      (root merkleH 0 mrkChunks2) (root merkleH 0 mrkChunks2) [] ]

def openingRow (dF : OpeningDecodeFn) (caseId : String)
    (bytes : List UInt8) : String × Value :=
  ( caseId
  , .obj [ ("case", .str caseId)
         , ("expect", match dF bytes with
             | some d =>
                 .obj [ ("_tag", .str "Decoded")
                      , ("doc", .obj
                          [ ("index", .nat d.index)
                          , ("leaf", bytesJson d.leaf)
                          , ("siblings", .arr (d.sibs.map addrJson32))
                          , ("total", .nat d.total) ]) ]
             | none => .obj [("_tag", .str "Rejected")])
         , ("input", .obj [("bytes", bytesJson bytes)]) ] )

def openingDocKit : OpeningDoc :=
  ⟨1, 3, [2], genPath merkleH 0 1 mrkChunks3⟩

def mrk011Rows (dF : OpeningDecodeFn) : List (String × Value) :=
  [ openingRow dF "canonical-opening-decodes-000"
      (encodeOpening openingDocKit)
  , openingRow dF "truncated-inside-sibling-rejected-001"
      ((encodeOpening openingDocKit).take 14)
  , openingRow dF "trailing-rejected-002"
      (encodeOpening openingDocKit ++ [0])
  , openingRow dF "empty-rejected-003" []
  , openingRow dF "truncated-to-boundary-reads-shorter-doc-004"
      ((encodeOpening openingDocKit).take 13) ]

def streamRow (dF : StreamDecodeFn) (caseId : String)
    (bytes : List UInt8) : String × Value :=
  ( caseId
  , .obj [ ("case", .str caseId)
         , ("expect", match dF bytes with
             | some (h, items) =>
                 .obj [ ("_tag", .str "Decoded")
                      , ("header", .obj
                          [ ("hi", .nat h.hi), ("lo", .nat h.lo)
                          , ("total", .nat h.total) ])
                      , ("items", .arr (items.map dInputJson)) ]
             | none => .obj [("_tag", .str "Rejected")])
         , ("input", .obj [("bytes", bytesJson bytes)]) ] )

def streamKit : List UInt8 :=
  encodeStream ⟨3, 1, 2⟩ (genStream merkleH 1 2 0 mrkChunks3)

def mrk012Rows (dF : StreamDecodeFn) : List (String × Value) :=
  [ streamRow dF "canonical-stream-decodes-000" streamKit
  , streamRow dF "truncated-header-rejected-001" (streamKit.take 8)
  , streamRow dF "unknown-tag-rejected-002"
      (encodeStream ⟨1, 0, 1⟩ [] ++ [3])
  , streamRow dF "truncated-chunk-item-rejected-003"
      (encodeStream ⟨1, 0, 1⟩ [] ++ [1, 0, 0, 0, 5, 9])
  , streamRow dF "trailing-skip-extends-items-004" (streamKit ++ [0]) ]

def manifestRow (dF : ManifestDecodeFn) (caseId : String)
    (bytes : List UInt8) : String × Value :=
  ( caseId
  , .obj [ ("case", .str caseId)
         , ("expect", match dF bytes with
             | some m =>
                 .obj [ ("_tag", .str "Decoded")
                      , ("manifest", .obj
                          [ ("leafCount", .nat m.leafCount)
                          , ("recipeId", .nat m.recipeId)
                          , ("totalBytes", .nat m.totalBytes) ]) ]
             | none => .obj [("_tag", .str "Rejected")])
         , ("input", .obj [("bytes", bytesJson bytes)]) ] )

def mrk018Rows (dF : ManifestDecodeFn) : List (String × Value) :=
  [ manifestRow dF "canonical-manifest-decodes-000"
      (encodeManifest ⟨recipeReferencedChunk, 5, 3⟩)
  , manifestRow dF "inline-recipe-decodes-001"
      (encodeManifest ⟨recipeInlineLeaf, 2, 1⟩)
  , manifestRow dF "unknown-recipe-rejected-002"
      (encodeManifest ⟨9, 5, 3⟩)
  , manifestRow dF "truncated-rejected-003"
      ((encodeManifest ⟨recipeReferencedChunk, 5, 3⟩).take 10)
  , manifestRow dF "trailing-rejected-004"
      (encodeManifest ⟨recipeReferencedChunk, 5, 3⟩ ++ [0]) ]

/-- The declared oracle, named in every Merkle family document. -/
def merkleOracle : String :=
  "Addresses are 32-byte toy digests (the declared 32-lane byte fold, not cryptographic) over structural pre-image encodings — a tag byte for leaf or parent, the leaf's absolute index and bytes, the parent's two child addresses — so domain separation and position binding live in the pre-image exactly as the model states them; the tie to a production hash arrives with the implementation slice."

def merkleFamilyManifestAt (version family meaning : String)
    (rows : List (String × Value)) : Value :=
  .obj [ ("family", .str family)
       , ("meaning", .str meaning)
       , ("model", .str version)
       , ("oracle", .str merkleOracle)
       , ("rows", .arr ((rows.mergeSort fun a b => decide (a.1 ≤ b.1)).map (·.2))) ]

/-- The Merkle families with their instance-projected sentences, each
paired with its rendered-rows function for the mutation task. -/
def merkleFamilies : List (String × String × List (String × Value)) :=
  [ ("MRK-001", mrk001.sentence, mrk001Rows realChunk)
  , ("MRK-002", mrk002.sentence, mrk002Rows realMStep)
  , ("MRK-003", mrk003.sentence, mrk003Rows realMStep)
  , ("MRK-005", mrk005.sentence, mrk005Rows realMStep)
  , ("MRK-006", mrk006.sentence, mrk006Rows realVerify)
  , ("MRK-007", mrk007.sentence, mrk007Rows realConsVerify)
  , ("MRK-011", mrk011.sentence, mrk011Rows realOpeningDecode)
  , ("MRK-012", mrk012.sentence, mrk012Rows realStreamDecode)
  , ("MRK-018", mrk018.sentence, mrk018Rows realManifestDecode) ]

private def renderRows (rows : List (String × Value)) : String :=
  Json.document (.arr ((rows.mergeSort fun a b => decide (a.1 ≤ b.1)).map (·.2)))

/-- Rendered rows of the chunk family under a chunk function. -/
def merkleChunkRowsRendered (chunkF : ChunkFn) : String :=
  renderRows (mrk001Rows chunkF)

/-- Rendered rows of a decoder family under a step function. -/
def merkleDecoderRowsRendered (stepF : MStep) (family : String) : String :=
  if family == "MRK-002" then renderRows (mrk002Rows stepF)
  else if family == "MRK-003" then renderRows (mrk003Rows stepF)
  else if family == "MRK-005" then renderRows (mrk005Rows stepF)
  else ""

/-- Rendered rows of the inclusion family under a verifier. -/
def merkleVerifyRowsRendered (vF : VerifyFn) : String :=
  renderRows (mrk006Rows vF)

/-- Rendered rows of the consistency family under a verifier. -/
def merkleConsRowsRendered (vF : ConsFn) : String :=
  renderRows (mrk007Rows vF)

/-- Rendered rows of the opening-codec family under a decoder. -/
def merkleOpeningRowsRendered (dF : OpeningDecodeFn) : String :=
  renderRows (mrk011Rows dF)

/-- Rendered rows of the stream-codec family under a decoder. -/
def merkleStreamRowsRendered (dF : StreamDecodeFn) : String :=
  renderRows (mrk012Rows dF)

/-- Rendered rows of the manifest-codec family under a decoder. -/
def merkleManifestRowsRendered (dF : ManifestDecodeFn) : String :=
  renderRows (mrk018Rows dF)

/-- The committed Merkle manifest files, additive at the declared model
version. -/
def merkleFiles : List (String × String) :=
  merkleFamilies.map fun (family, meaning, rows) =>
    (family ++ ".json", Json.document
      (merkleFamilyManifestAt modelVersion family meaning rows))

end Effects.Conformance.Manifest
