/-
Estate canonical JSON: the byte form the kernel conformance interchange
is written in, and the reader that proves the committed bytes are in it.

The reference is RFC 8785 (JSON Canonicalization Scheme) for member
ordering, string escaping, and structure serialization, with one
documented deviation for numbers:

  * objects render their members sorted by key, comparing code units,
    with no whitespace anywhere;
  * strings escape exactly the backslash, the double quote, and the
    five two-character controls (backspace, form feed, line feed,
    carriage return, tab), and render every other control character as
    a lowercase four-digit unicode escape. Nothing else is escaped, so
    a solidus stays a solidus;
  * every number is an unbounded non-negative integer at its minimal
    decimal spelling. No fraction, no exponent, no minus, no leading
    zero. JCS serializes numbers as doubles; the interchange carries
    encoding vectors whose naturals can exceed two to the fifty-third,
    so the double path is refused rather than approximated.

Lean's own `Json.compress` was measured against this form before this
writer was kept. It sorts members correctly and renders naturals
exactly, but it writes the tab, the backspace and the form feed as
four-digit unicode escapes where JCS demands the two-character forms.
That is a byte difference on any string carrying a tab, so the
interchange keeps the writer below and does not delegate.

The reader is here for one purpose: the both-ways law. Reading a
canonical document and writing the result back must return the
original bytes. The reader is therefore deliberately more permissive
than the writer — it accepts whitespace between tokens, members in any
order, and every JSON escape — because a reader that only accepted
canonical input could not tell canonical bytes from any other bytes.
What it does refuse is what the interchange has ruled out of the
grammar: a minus sign, a fraction, an exponent, a leading zero, a
duplicate member key, and a lone surrogate.
-/

namespace Unity.Canon

/-! ## The value grammar -/

/-- A JSON value at the interchange's grammar. Numbers are naturals by
    construction, which is the number deviation made structural: no
    term of this type carries a fraction, an exponent, or a sign. -/
inductive Value where
  | null
  | bool (value : Bool)
  | num (value : Nat)
  | str (value : String)
  | arr (items : List Value)
  | obj (members : List (String × Value))
deriving Repr, Inhabited

/-! ## Member ordering

Keys sort by code unit. Every key in the interchange is ASCII, so code
unit order is byte order; the comparison is spelled out rather than
delegated so that the ordering rule is readable beside the law it
serves. -/

/-- Code-unit-lexicographic strictly-less on character lists. -/
def codeLt : List Char -> List Char -> Bool
  | [], [] => false
  | [], _ :: _ => true
  | _ :: _, [] => false
  | left :: lefts, right :: rights =>
      if left.toNat < right.toNat then true
      else if right.toNat < left.toNat then false
      else codeLt lefts rights

/-- Code-unit-lexicographic strictly-less on keys. -/
def keyLt (left right : String) : Bool := codeLt left.toList right.toList

/-- Insert one member into a key-sorted member list. -/
def insertMember (member : String × Value) :
    List (String × Value) -> List (String × Value)
  | [] => [member]
  | head :: rest =>
      if keyLt member.1 head.1 then member :: head :: rest
      else head :: insertMember member rest

/-- Sort a member list by key. Insertion sort keeps the ordering rule in
    one place and stays total without a comparator side condition. -/
def sortMembers : List (String × Value) -> List (String × Value)
  | [] => []
  | member :: rest => insertMember member (sortMembers rest)

/-! ## Canonicalization

Sorting is a separate pass from writing, so the writer stays a plain
structural recursion and the normal form is itself a value: an
implementation can canonicalize, compare values, and only then write. -/

mutual

/-- Sort every object inside a value, bottom up. -/
def canonicalize : Value -> Value
  | .null => .null
  | .bool value => .bool value
  | .num value => .num value
  | .str value => .str value
  | .arr items => .arr (canonicalizeItems items)
  | .obj members => .obj (sortMembers (canonicalizeMembers members))

/-- Canonicalize the elements of an array. -/
def canonicalizeItems : List Value -> List Value
  | [] => []
  | item :: rest => canonicalize item :: canonicalizeItems rest

/-- Canonicalize the values of a member list; the keys are untouched. -/
def canonicalizeMembers :
    List (String × Value) -> List (String × Value)
  | [] => []
  | member :: rest =>
      (member.1, canonicalize member.2) :: canonicalizeMembers rest

end

/-! ## The writer -/

/-- One hexadecimal digit, lowercase. -/
def hexDigit (digit : Nat) : Char :=
  if digit < 10 then Char.ofNat ('0'.toNat + digit)
  else Char.ofNat ('a'.toNat + digit - 10)

/-- JCS escaping for one character: the two mandatory escapes, the five
    two-character controls, a lowercase unicode escape for every other
    control, and the character itself otherwise. A character above the
    printable range is written as itself; the interchange's ASCII rule
    is checked where documents are assembled, never smuggled into the
    escaper. -/
def escapeChar (character : Char) : String :=
  let point := character.toNat
  if point == 0x22 then "\\\""
  else if point == 0x5c then "\\\\"
  else if point == 0x08 then "\\b"
  else if point == 0x0c then "\\f"
  else if point == 0x0a then "\\n"
  else if point == 0x0d then "\\r"
  else if point == 0x09 then "\\t"
  else if point < 0x20 then
    "\\u00" ++ String.singleton (hexDigit (point / 16)) ++
      String.singleton (hexDigit (point % 16))
  else String.singleton character

/-- A JSON string literal at the canonical escaping. -/
def writeString (value : String) : String :=
  "\"" ++ String.join (value.toList.map escapeChar) ++ "\""

mutual

/-- Write a value whose objects are already key-sorted. -/
def write : Value -> String
  | .null => "null"
  | .bool true => "true"
  | .bool false => "false"
  | .num value => toString value
  | .str value => writeString value
  | .arr items => "[" ++ writeItems items ++ "]"
  | .obj members => "{" ++ writeMembers members ++ "}"

/-- Write array elements, comma separated. -/
def writeItems : List Value -> String
  | [] => ""
  | [item] => write item
  | item :: rest => write item ++ "," ++ writeItems rest

/-- Write object members, comma separated. -/
def writeMembers : List (String × Value) -> String
  | [] => ""
  | [member] => writeString member.1 ++ ":" ++ write member.2
  | member :: rest =>
      writeString member.1 ++ ":" ++ write member.2 ++ ","
        ++ writeMembers rest

end

/-- The canonical serialization of a value: canonicalize, then write. -/
def render (value : Value) : String := write (canonicalize value)

/-! ## The reader -/

/-- Whether a character is JSON insignificant whitespace. -/
def isSpace (character : Char) : Bool :=
  let point := character.toNat
  point == 0x20 || point == 0x09 || point == 0x0a || point == 0x0d

/-- Drop leading whitespace. -/
def skipSpace : List Char -> List Char
  | character :: rest =>
      if isSpace character then skipSpace rest else character :: rest
  | [] => []

/-- The value of one hexadecimal digit. -/
def hexValue (character : Char) : Option Nat :=
  let point := character.toNat
  if point >= 0x30 && point <= 0x39 then some (point - 0x30)
  else if point >= 0x61 && point <= 0x66 then some (point - 0x61 + 10)
  else if point >= 0x41 && point <= 0x46 then some (point - 0x41 + 10)
  else none

/-- Whether a character is a decimal digit. -/
def isDigit (character : Char) : Bool :=
  character.toNat >= 0x30 && character.toNat <= 0x39

/-- Accumulate a decimal digit run into a natural. Unbounded by
    construction: `Nat` is arbitrary precision, which is what lets the
    encoding vectors carry values past the double-safe range. -/
def digitsToNat (accumulated : Nat) : List Char -> Nat
  | [] => accumulated
  | digit :: rest => digitsToNat (accumulated * 10 + (digit.toNat - 0x30)) rest

/-- Collect a leading digit run. -/
def takeDigits : List Char -> List Char × List Char
  | character :: rest =>
      if isDigit character then
        let (digits, remainder) := takeDigits rest
        (character :: digits, remainder)
      else ([], character :: rest)
  | [] => ([], [])

/-- Read one natural. Every rejection is named, because a reader that
    silently normalized would defeat the both-ways law it exists to
    serve. -/
def readNat (characters : List Char) : Except String (Nat × List Char) :=
  let (digits, remainder) := takeDigits characters
  match digits with
  | [] => .error "canon: a number carries no digit"
  | first :: more =>
      if first == '0' && !more.isEmpty then
        .error "canon: a number carries a leading zero"
      else
        match remainder with
        | next :: _ =>
            if next == '.' || next == 'e' || next == 'E' then
              .error "canon: a number carries a fraction or an exponent"
            else .ok (digitsToNat 0 digits, remainder)
        | [] => .ok (digitsToNat 0 digits, remainder)

/-- The character one two-character escape denotes. -/
def escapeOf (escape : Char) : Option Char :=
  if escape == '"' then some '"'
  else if escape == '\\' then some '\\'
  else if escape == '/' then some '/'
  else if escape == 'b' then some (Char.ofNat 0x08)
  else if escape == 'f' then some (Char.ofNat 0x0c)
  else if escape == 'n' then some (Char.ofNat 0x0a)
  else if escape == 'r' then some (Char.ofNat 0x0d)
  else if escape == 't' then some (Char.ofNat 0x09)
  else none

/-- Read a string body, the opening quote already consumed. -/
def readString : Nat -> List Char -> List Char ->
    Except String (String × List Char)
  | 0, _, _ => .error "canon: the reader ran out of fuel inside a string"
  | _ + 1, accumulated, [] =>
      .error s!"canon: a string literal is unterminated: {String.ofList accumulated}"
  | step + 1, accumulated, character :: rest =>
      if character == '"' then .ok (String.ofList accumulated, rest)
      else if character == '\\' then
        match rest with
        | [] => .error "canon: a string literal ends inside an escape"
        | 'u' :: first :: second :: third :: fourth :: afterHex =>
            match hexValue first, hexValue second, hexValue third,
                hexValue fourth with
            | some a, some b, some c, some d =>
                let point := ((a * 16 + b) * 16 + c) * 16 + d
                if point >= 0xd800 && point <= 0xdfff then
                  .error "canon: a string literal carries a lone surrogate"
                else
                  readString step (accumulated ++ [Char.ofNat point]) afterHex
            | _, _, _, _ =>
                .error "canon: a unicode escape is not four hexadecimal digits"
        | 'u' :: _ => .error "canon: a unicode escape is truncated"
        | escape :: afterEscape =>
            match escapeOf escape with
            | some decoded => readString step (accumulated ++ [decoded]) afterEscape
            | none => .error "canon: a string literal carries an unknown escape"
      else if character.toNat < 0x20 then
        .error "canon: a string literal carries an unescaped control character"
      else readString step (accumulated ++ [character]) rest

/-- Whether a member list already binds a key. -/
def bindsKey (key : String) (members : List (String × Value)) : Bool :=
  members.any fun member => member.1 == key

mutual

/-- Read one JSON value. Fuel bounds the nesting; every step consumes at
    least one character, so a fuel of the input length is out of reach
    for well-formed input, and an exhausted fuel is reported rather
    than silently truncating. -/
def readValue : Nat -> List Char -> Except String (Value × List Char)
  | 0, _ => .error "canon: the reader ran out of fuel"
  | step + 1, characters =>
      match skipSpace characters with
      | [] => .error "canon: the document ends where a value belongs"
      | '"' :: rest =>
          match readString (step + 1) [] rest with
          | .error reason => .error reason
          | .ok (text, afterText) => .ok (.str text, afterText)
      | '[' :: rest =>
          match skipSpace rest with
          | ']' :: afterArray => .ok (.arr [], afterArray)
          | pending => readItems step [] pending
      | '{' :: rest =>
          match skipSpace rest with
          | '}' :: afterObject => .ok (.obj [], afterObject)
          | pending => readMembers step [] pending
      | 't' :: 'r' :: 'u' :: 'e' :: rest => .ok (.bool true, rest)
      | 'f' :: 'a' :: 'l' :: 's' :: 'e' :: rest => .ok (.bool false, rest)
      | 'n' :: 'u' :: 'l' :: 'l' :: rest => .ok (.null, rest)
      | '-' :: _ => .error "canon: a number carries a minus sign"
      | pending =>
          match readNat pending with
          | .error reason => .error reason
          | .ok (value, afterNumber) => .ok (.num value, afterNumber)

/-- Read the remaining elements of a non-empty array. -/
def readItems : Nat -> List Value -> List Char ->
    Except String (Value × List Char)
  | 0, _, _ => .error "canon: the reader ran out of fuel inside an array"
  | step + 1, accumulated, characters =>
      match readValue step characters with
      | .error reason => .error reason
      | .ok (item, afterItem) =>
          match skipSpace afterItem with
          | ',' :: rest => readItems step (accumulated ++ [item]) rest
          | ']' :: rest => .ok (.arr (accumulated ++ [item]), rest)
          | _ => .error "canon: an array element is followed by neither a comma nor a close"

/-- Read the remaining members of a non-empty object. -/
def readMembers : Nat -> List (String × Value) -> List Char ->
    Except String (Value × List Char)
  | 0, _, _ => .error "canon: the reader ran out of fuel inside an object"
  | step + 1, accumulated, characters =>
      match skipSpace characters with
      | '"' :: rest =>
          match readString (step + 1) [] rest with
          | .error reason => .error reason
          | .ok (key, afterKey) =>
              match skipSpace afterKey with
              | ':' :: afterColon =>
                  match readValue step afterColon with
                  | .error reason => .error reason
                  | .ok (value, afterValue) =>
                      if bindsKey key accumulated then
                        .error s!"canon: an object binds the key {key} twice"
                      else
                        match skipSpace afterValue with
                        | ',' :: rest =>
                            readMembers step (accumulated ++ [(key, value)]) rest
                        | '}' :: rest =>
                            .ok (.obj (accumulated ++ [(key, value)]), rest)
                        | _ =>
                            .error "canon: a member is followed by neither a comma nor a close"
              | _ => .error "canon: a member key is not followed by a colon"
      | _ => .error "canon: a member key is not a string"

end

/-- Read one whole document: a single value, optional surrounding
    whitespace, and nothing else. -/
def parse (text : String) : Except String Value :=
  let characters := text.toList
  match readValue (characters.length + 1) characters with
  | .error reason => .error reason
  | .ok (value, rest) =>
      match skipSpace rest with
      | [] => .ok value
      | _ => .error "canon: the document carries text after its value"

/-! ## Reading a parsed value

The accessors a consumer of a parsed document needs. Every one is total
and answers with an option: a record that is not the shape a check
expects is a finding to report, never a crash. -/

/-- The value bound to a key, if the value is an object that binds it. -/
def member (value : Value) (key : String) : Option Value :=
  match value with
  | .obj members => (members.find? fun binding => binding.1 == key).map (·.2)
  | _ => none

/-- The text of a string value. -/
def asString : Value -> Option String
  | .str text => some text
  | _ => none

/-- The natural of a number value. -/
def asNat : Value -> Option Nat
  | .num value => some value
  | _ => none

/-- The elements of an array value. -/
def asItems : Value -> Option (List Value)
  | .arr items => some items
  | _ => none

/-- The keys an object binds, in the order it binds them. -/
def keysOf : Value -> Option (List String)
  | .obj members => some (members.map (·.1))
  | _ => none

/-- The text bound to a key. -/
def stringAt (value : Value) (key : String) : Option String :=
  (member value key).bind asString

/-- The natural bound to a key. -/
def natAt (value : Value) (key : String) : Option Nat :=
  (member value key).bind asNat

/-! ## The both-ways law

Every implementation of this interchange owes the same law: reading a
line and writing the result back returns the original bytes. It is
checked here at emit time and again over the committed file, so a
corpus that drifted out of canonical form fails before anything
downstream reads it. -/

/-- Whether one line reads and writes back to itself, and the reason it
    did not. -/
def bothWays (line : String) : Except String Unit :=
  match parse line with
  | .error reason => .error reason
  | .ok value =>
      let rendered := render value
      if rendered == line then .ok ()
      else
        .error s!"canon: a line does not survive read and write\n  read:    {line}\n  written: {rendered}"

/-- The reasons a document fails the both-ways law, line by line. -/
def bothWaysFailures (lines : List String) : List String :=
  lines.filterMap fun line =>
    match bothWays line with
    | .ok _ => none
    | .error reason => some reason

end Unity.Canon
