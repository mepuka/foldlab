/-
The conformance-vector emitter: two modes from one binary.
  emit N   -- offline: one provenance header line, then N NDJSON verdict
              records on stdout (deterministic in N; byte-identical across
              regenerations by construction)
  serve    -- online: one NDJSON request per line in, one verdict line out

Every verdict is computed by executing the canonical model: `stepTrace`
(primitive, refusal aborts), `runRepair` (absorb, partial), `runRepairK`
(the total runner, receipts aligned to the input), the same bag reversed
(wire confluence made observable), and the model's own fence choices at
every disputed terminal hole.
-/
import Oracle.Codec
import Oracle.Gen

open Oracle Moves Lean

def fenceJson (cs : Oracle.CSet) : Json :=
  if hne : cs = ∅ then Json.null
  else
    Json.mkObj
      [ ("min", toJson ((minCandidate (valueCmp := valCmp) cs hne).1 : Val))
      , ("plurality", toJson ((pluralityCandidate (valueCmp := valCmp) cs hne).1 : Val)) ]

def holeFenceJson (s : St) (h : Hole) : Json :=
  match s.holes h with
  | .disputed cs => fenceJson cs
  | _ => Json.null

def fencesJson (s : St) : Json :=
  Json.mkObj (holes.map fun h => (h.name, holeFenceJson s h))

def runJson (r : St × List (Mv × Bool)) : Json :=
  Json.mkObj
    [ ("state", stateJson r.1)
    , ("receipts", Json.arr (r.2.map (fun x => toJson x.2)).toArray) ]

/-- Run one trace under every exported semantics. -/
def verdict (ms : List Mv) : Json :=
  let total := Moves.runRepairK (Moves.initial : St) ms
  Json.mkObj
    [ ("moves", Json.arr (ms.map moveJson).toArray)
    , ("step", match Moves.stepTrace (Moves.initial : St) ms with
        | none => Json.null
        | some s => stateJson s)
    , ("runRepair", match Moves.runRepair (Moves.initial : St) ms with
        | none => Json.null
        | some s => stateJson s)
    , ("repairK", runJson total)
    , ("reverseRepairK", runJson (Moves.runRepairK (Moves.initial : St) ms.reverse))
    , ("fences", fencesJson total.1) ]

def header (n : Nat) : Json :=
  Json.mkObj
    [ ("generator", "verify/moves oracle")
    , ("command", s!"lake exe oracle emit {n}")
    , ("format", (1 : Nat)) ]

def emit (n : Nat) : IO Unit := do
  let out ← IO.getStdout
  out.putStr (header n).compress
  out.putStr "\n"
  for i in [0:n] do
    out.putStr ((verdict (caseOf i)).compress)
    out.putStr "\n"

partial def serve : IO Unit := do
  let stdin ← IO.getStdin
  let out ← IO.getStdout
  let rec loop : IO Unit := do
    let line ← stdin.getLine
    if line.isEmpty then return
    let trimmed := line.trimAscii.toString
    if trimmed.isEmpty then loop else
    match Json.parse trimmed with
    | .error e => out.putStrLn (Json.mkObj [("error", toJson e)]).compress; out.flush; loop
    | .ok j =>
      match (do (← (← j.getObjVal? "moves").getArr?).toList.mapM moveOfJson?) with
      | .error e => out.putStrLn (Json.mkObj [("error", toJson e)]).compress; out.flush; loop
      | .ok ms => out.putStrLn (verdict ms).compress; out.flush; loop
  loop

def main (args : List String) : IO UInt32 := do
  match args with
  | ["emit", n] => emit (n.toNat!); return 0
  | ["serve"]   => serve; return 0
  | _ => (← IO.getStderr).putStrLn "usage: oracle (emit N | serve)"; return 2
