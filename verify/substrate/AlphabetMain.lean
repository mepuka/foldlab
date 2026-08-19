/- The alphabet-equality arm. The lifecycle machine's alphabet is the
   transcribed status-events vocabulary, and this executable is how the
   model CONSUMES that vocabulary instead of re-spelling it: it reads the
   transcription's own canonical rendering, renders its status-events
   group as roster lines, and holds the model's roster against it, line
   for line and in order.

   A drift between the model and the table reddens the gate here. There
   is no second place for a status event to be spelled. -/
import Lean.Data.Json
import Substrate

open Substrate

/-- One roster line: the event's wire type and its placement column. -/
def rosterLineOf (row : Lean.Json) : Except String String := do
  let wire <- row.getObjValAs? String "type"
  let placement <- row.getObjValAs? String "placement"
  return wire ++ "|" ++ placement

/-- The status-events group of the transcribed vocabulary, rendered as
    roster lines in the table's own row order. -/
def rosterOfTable (document : Lean.Json) : Except String (List String) := do
  let groups <- document.getObjVal? "groups"
  let groupArray <- groups.getArr?
  let mut chosen : Option Lean.Json := none
  for group in groupArray do
    let name <- group.getObjValAs? String "group"
    if name == "status-events" then
      chosen := some group
  match chosen with
  | none => throw "the transcribed vocabulary carries no status-events group"
  | some group => do
      let rows <- group.getObjVal? "rows"
      let rowArray <- rows.getArr?
      let mut lines : Array String := #[]
      for row in rowArray do
        lines := lines.push (<- rosterLineOf row)
      return lines.toList

/-- A roster rendered for the record. -/
def renderRoster (roster : List String) : String :=
  "[" ++ String.intercalate "," roster ++ "]"

/-- Report a drift the arm could not even read the table for. -/
def reportUnreadable (detail : String) : IO UInt32 := do
  IO.println ("arm=alphabet-equality;table=unreadable;detail=" ++ detail ++
    ";verdict=drifted")
  return 1

def main (args : List String) : IO UInt32 := do
  match args with
  | [source] => do
      let text <- IO.FS.readFile source
      match Lean.Json.parse text with
      | .error detail => reportUnreadable detail
      | .ok document =>
          match rosterOfTable document with
          | .error detail => reportUnreadable detail
          | .ok tableRoster => do
              let modelRoster := Substrate.alphabetRoster
              let aligned := tableRoster == modelRoster
              IO.println
                ("arm=alphabet-equality;table=" ++ renderRoster tableRoster ++
                  ";model=" ++ renderRoster modelRoster ++
                  ";transitions=" ++
                    toString (tableRoster.filter fun line =>
                      line.endsWith "|transition").length ++
                  ";readings=" ++
                    toString (tableRoster.filter fun line =>
                      line.endsWith "|observation").length ++
                  ";verdict=" ++ (if aligned then "aligned" else "drifted"))
              return if aligned then 0 else 1
  | _ => do
      (← IO.getStderr).putStrLn
        "usage: alphabet <canonical vocabulary rendering>"
      return 2
