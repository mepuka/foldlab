/-
Canonical JSON for the emitter's deliberately narrowed grammar: ASCII strings,
non-negative integers, arrays, and objects. Object keys are sorted before
rendering. The integer path transliterates the promoted RQ-9 reference pattern
at `docs/research/reference/rq9-rfc8785-numbers/EsNumberToString.lean`:
strip decimal trailing zeroes, then take ES2019 step 6. This package has no
floating-point grammar and therefore does not claim the unimplemented RQ-9
shortest-round-trip step.
-/
import Fabric.ControlProofs

namespace Fabric.Canonical

structure Field where
  key : String
  value : String

def zeros (count : Nat) : String := String.ofList (List.replicate count '0')

def stripTrailingZeros (number : Nat) : Nat × Nat :=
  let rec go (significand exponent fuel : Nat) : Nat × Nat :=
    match fuel with
    | 0 => (significand, exponent)
    | fuel + 1 =>
        if significand != 0 && significand % 10 == 0 then
          go (significand / 10) (exponent + 1) fuel
        else (significand, exponent)
  go number 0 number

/-- RFC 8785 / ES2019 rendering on the corpus's non-negative integer leaf. -/
def nat (number : Nat) : String :=
  if number == 0 then "0"
  else
    let (significand, exponent) := stripTrailingZeros number
    toString significand ++ zeros exponent

def hexDigit (digit : Nat) : Char :=
  if digit < 10 then Char.ofNat ('0'.toNat + digit)
  else Char.ofNat ('a'.toNat + digit - 10)

def escapeChar (character : Char) : String :=
  if character == '"' then "\\\""
  else if character == '\\' then "\\\\"
  else if character == '\u0008' then "\\b"
  else if character == '\u000c' then "\\f"
  else if character == '\n' then "\\n"
  else if character == '\r' then "\\r"
  else if character == '\t' then "\\t"
  else if character.toNat < 0x20 then
    "\\u00" ++ String.singleton (hexDigit (character.toNat / 16)) ++
      String.singleton (hexDigit (character.toNat % 16))
  else String.singleton character

/-- RFC 8785 string escaping. The current corpus is safe ASCII, but the
    canonicalizer cannot emit invalid JSON if that domain later widens. -/
def string (value : String) : String :=
  "\"" ++ String.join (value.toList.map escapeChar) ++ "\""

def bool (value : Bool) : String := if value then "true" else "false"

def array (values : List String) : String :=
  "[" ++ String.intercalate "," values ++ "]"

def insertField (field : Field) : List Field -> List Field
  | [] => [field]
  | head :: tail =>
      match compare field.key head.key with
      | .lt => field :: head :: tail
      | .eq => field :: tail
      | .gt => head :: insertField field tail

def sortFields (fields : List Field) : List Field :=
  fields.foldr insertField []

def object (fields : List Field) : String :=
  let rendered := (sortFields fields).map fun field =>
    string field.key ++ ":" ++ field.value
  "{" ++ String.intercalate "," rendered ++ "}"

end Fabric.Canonical
