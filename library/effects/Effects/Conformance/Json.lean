/-!
# The canonical JSON printer

Manifests render through this printer and nothing else (WGR-4 rule 1):
object keys are sorted at render time, the only numbers are nonnegative
integers printed in decimal (the declared number handling — nothing in a
manifest is fractional or negative), strings escape quotes, backslashes,
and control characters deterministically, and layout is fixed — objects
and mixed arrays break across lines, scalar arrays stay inline so byte
vectors read as vectors. Rendering is a projection: byte-identical
regeneration under an unchanged model version is the gate's ratchet.
-/

namespace Effects.Conformance.Json

inductive Value where
  | null
  | bool (b : Bool)
  | nat (n : Nat)
  | str (s : String)
  | arr (xs : List Value)
  | obj (fields : List (String × Value))

def escapeChar (c : Char) : String :=
  if c = '"' then "\\\""
  else if c = '\\' then "\\\\"
  else if c.toNat ≥ 32 then String.singleton c
  else
    let hex := Nat.toDigits 16 c.toNat
    "\\u" ++ String.ofList (List.replicate (4 - hex.length) '0' ++ hex)

def escape (s : String) : String :=
  s.foldl (fun acc c => acc ++ escapeChar c) ""

def Value.isScalar : Value → Bool
  | .null | .bool _ | .nat _ | .str _ => true
  | .arr _ | .obj _ => false

/-- Render with sorted object keys and fixed layout. `indent` is the
current indentation depth in two-space units. -/
partial def render (v : Value) (indent : Nat := 0) : String :=
  let pad := String.ofList (List.replicate (indent * 2) ' ')
  let padIn := String.ofList (List.replicate ((indent + 1) * 2) ' ')
  match v with
  | .null => "null"
  | .bool b => if b then "true" else "false"
  | .nat n => toString n
  | .str s => "\"" ++ escape s ++ "\""
  | .arr xs =>
    if xs.isEmpty then "[]"
    else if xs.all (·.isScalar) then
      "[" ++ String.intercalate ", " (xs.map (render · 0)) ++ "]"
    else
      "[\n" ++
        String.intercalate ",\n" (xs.map fun x => padIn ++ render x (indent + 1)) ++
        "\n" ++ pad ++ "]"
  | .obj fields =>
    if fields.isEmpty then "{}"
    else
      let sorted := fields.mergeSort fun a b => decide (a.1 ≤ b.1)
      "{\n" ++
        String.intercalate ",\n" (sorted.map fun (k, x) =>
          padIn ++ "\"" ++ escape k ++ "\": " ++ render x (indent + 1)) ++
        "\n" ++ pad ++ "}"

/-- A rendered manifest document: the value plus the trailing newline. -/
def document (v : Value) : String := render v ++ "\n"

end Effects.Conformance.Json
