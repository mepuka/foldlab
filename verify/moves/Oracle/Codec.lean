/-
Wire codec. The corpus grammar is deliberately narrow: objects with fixed
ASCII keys, non-negative integers below 2^53, and ASCII-identifier strings.
Inside that grammar Lean's own printer already agrees with RFC 8785, so no
separate canonicaliser is needed on the Lean side (spike report,
docs/research/2026-08-15-lean-oracle-spike.md).

Unlike the daemon wire image, this codec serializes the ghost `evidence`
journal beside the meaning fold: the differential target is the model
itself, and journal provenance is part of what the TS kernel must replay.
-/
import Oracle.Instance
import Lean.Data.Json

namespace Oracle
open Moves Lean

/-! ## Encode -/

def candJson (c : Candidate Val Actor) : Json :=
  Json.mkObj [("value", toJson c.1), ("holder", toJson c.2)]

def csetJson (cs : CSet) : Json :=
  -- `toList` is ascending in `candCmp`: canonical, order-independent of insertion.
  Json.arr (cs.toList.map candJson).toArray

def hstateJson : HoleState Actor Val candCmp → Json
  | .open       => Json.mkObj [("tag", "open")]
  | .filled v   => Json.mkObj [("tag", "filled"), ("value", toJson v)]
  | .disputed c => Json.mkObj [("tag", "disputed"), ("candidates", csetJson c)]
  | .decided v  => Json.mkObj [("tag", "decided"), ("value", toJson v)]

def holeJson (s : St) (h : Hole) : Json :=
  Json.mkObj [("meaning", hstateJson (s.holes h)), ("evidence", csetJson (s.evidence h))]

/-- Meaning fold plus journal evidence, per declared hole. -/
def stateJson (s : St) : Json :=
  Json.mkObj (holes.map fun h => (h.name, holeJson s h))

def moveJson : Mv → Json
  | .fill h v a    => Json.mkObj [("op","fill"), ("hole", toJson h.name),
                                  ("value", toJson v), ("holder", toJson a)]
  | .dispute h c a => Json.mkObj [("op","dispute"), ("hole", toJson h.name),
                                  ("candidates", csetJson c), ("holder", toJson a)]
  | .decide h v    => Json.mkObj [("op","decide"), ("hole", toJson h.name),
                                  ("value", toJson v)]

/-! ## Decode -/

def moveOfJson? (j : Json) : Except String Mv := do
  let op ← j.getObjValAs? String "op"
  let holeName ← j.getObjValAs? String "hole"
  let some h := Hole.ofName? holeName | throw s!"unknown hole {holeName}"
  match op with
  | "fill" => return .fill h (← j.getObjValAs? Nat "value") (← j.getObjValAs? String "holder")
  | "decide" => return .decide h (← j.getObjValAs? Nat "value")
  | "dispute" =>
      let arr ← (← j.getObjVal? "candidates").getArr?
      let cs ← arr.toList.mapM fun c => do
        pure ((← c.getObjValAs? Nat "value"), (← c.getObjValAs? String "holder"))
      return .dispute h (Std.ExtTreeSet.ofList cs candCmp) (← j.getObjValAs? String "holder")
  | other => throw s!"unknown op {other}"

end Oracle
