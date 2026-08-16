/-
Two modes from one binary:
  emit N   -- offline: N NDJSON corpus records on stdout (deterministic in N)
  serve    -- online: one NDJSON request per line in, one verdict line out
-/
import Oracle.Codec
import Oracle.Gen

open Oracle Moves Lean

/-- Run a trace under both the primitive and the repairing semantics. -/
def verdict (ms : List Mv) : Json :=
  let prim := Moves.stepTrace (Moves.initial : St) ms
  let rep  := Moves.runRepair (Moves.initial : St) ms
  Json.mkObj
    [ ("moves", Json.arr (ms.map moveJson).toArray)
    , ("step",   match prim with | none => Json.null | some s => stateJson s)
    , ("repair", match rep  with | none => Json.null | some s => stateJson s) ]

def emit (n : Nat) : IO Unit := do
  let out ← IO.getStdout
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
