import Cas.Values.Digits
import Cas.Values.JsonInj

/-!
# The strict canonical-JSON parser

The reader for the canonical value encoding: `Cas.Json.parse` accepts
EXACTLY the image of the canonical rendering and nothing else. It is the
missing first step of the bytes-in loop, and — through `parse_render` —
it is what discharges `Json.RenderPlainInjective`, the value plane's one
named open obligation (ruling 11, survey blocker B7).

## The acceptance contract

`parse : String → Option Value`. STRING, not `ByteArray`, and the reason
is the composition already in the estate: `Ast.payloadBytes` is
`Ast.payload.toUTF8`, and `String.toByteArray_inj` is a toolchain fact
the schema plane already leans on (`payloadBytes_inj`). Parsing at the
character level therefore reaches the bytes for free, whereas a
`ByteArray` parser would owe a UTF-8 decoder correctness proof that
nothing in the estate needs.

Accepted, exactly (`parse_sound`, `parse_render`):

- `null`, `true`, `false` — those five spellings, nothing else;
- integers as `Nat.repr` spells them: a nonempty decimal run with no
  leading zero unless the spelling is `"0"`, optionally preceded by `-`,
  and `-0` is refused. No `+`, no fraction, no exponent;
- strings as `escapeCompact` spells them: the two mandatory escapes, the
  five short escapes, lowercase `\u00xx` for the rest of the control
  range, every other character literal. The escape reader is
  `unescapeOne` — the same one `Cas.Values.JsonInj` proves the round trip
  for — so there is ONE escape alphabet in the estate, not two;
- arrays and objects with NO whitespace anywhere: `[`, `]`, `{`, `}`,
  `,` and `:` are adjacent to their neighbours.

Refused: whitespace, `+1`, `01`, `-0`, `1.0`, `1e5`, `'single quotes'`,
trailing commas, trailing input after the value, unpaired escapes.

## Sorted keys are the GATE's question, not the parser's

`parse` does NOT require object keys to be sorted, and does not sort
them. It answers the value as spelled, in the order the bytes carry it,
and `Value.Canonical` is then checked (or imposed by `canonValue`)
downstream. This is the door's existing split, verbatim — "Shape is the
decoder's question; discipline is the gate's" (`Cas.Schema.Ingest`) —
and it is what makes `parse_sound` a clean biconditional on the image of
`renderPlain`: an unsorted object is a real value with a real rendering,
so refusing it here would make the parser NOT a left inverse.

Nothing is lost for canonicality: `Ast.ingestBytes` runs `canonValue`
exactly as `ingest` does, and `Value.Canonical` is decided at the gate.

## The measure

`parseValue` is structural on a fuel argument, and the fuel the entry
point supplies is the input's own length. No `partial`, no
well-founded recursion, no `native_decide`: every parser call is
answered by the kernel. `parseFuel` (the invariant `|input| ≤ fuel`) is
what the adequacy proof carries, and it closes at the top because
`parse` starts with exactly `cs.length`.

## The follow set, discharged

`renderPlain` is not prefix-free — `"1"` prefixes `"12"` — so a number
is only recoverable when what follows cannot extend it
(`Digits.NoDigitStart`). The grammar discharges that premise: every
position a value can occupy is followed by `,`, `]`, `}`, or end of
input, which is exactly what `itemsChars` and `fieldsChars` spell. That
is why the adequacy statement quantifies over an arbitrary tail with
`NoDigitStart` rather than over the whole document.
-/

namespace Cas.Json

/-! ## The rendering, at the character level

`renderPlain` is a `String` fold through `String.intercalate`;
`renderChars` is the same rendering spelled on `List Char`, in the shape
the parser consumes — an array's tail carries its own closing bracket,
an object's its own brace. `renderChars_eq` is the bridge, proved once,
and everything below works on lists. Same idiom as `escapeCodes` for
`escapeCompact` in `Cas.Values.JsonInj`. -/

/-- One object field's characters, given the field value's. -/
def fieldChars (k : String) (body : List Char) : List Char :=
  '"' :: (escapeCodes k.toList ++ '"' :: ':' :: body)

mutual

/-- The canonical rendering as characters. -/
def renderChars : Value → List Char
  | .null => ['n', 'u', 'l', 'l']
  | .bool b => if b then ['t', 'r', 'u', 'e'] else ['f', 'a', 'l', 's', 'e']
  | .nat n => Nat.toDigits 10 n
  | .int i =>
    if 0 ≤ i then Nat.toDigits 10 i.toNat else '-' :: Nat.toDigits 10 (-i).toNat
  | .str s => '"' :: (escapeCodes s.toList ++ ['"'])
  | .arr [] => ['[', ']']
  | .arr (x :: xs) => '[' :: (renderChars x ++ itemsChars xs)
  | .obj [] => ['{', '}']
  | .obj ((k, v) :: fs) => '{' :: (fieldChars k (renderChars v) ++ fieldsChars fs)

/-- An array's tail: the remaining elements, each behind its comma, and
the closing bracket. -/
def itemsChars : List Value → List Char
  | [] => [']']
  | x :: xs => ',' :: (renderChars x ++ itemsChars xs)

/-- An object's tail: the remaining fields, each behind its comma, and
the closing brace. -/
def fieldsChars : List (String × Value) → List Char
  | [] => ['}']
  | (k, v) :: fs => ',' :: (fieldChars k (renderChars v) ++ fieldsChars fs)

end

/-! The punctuation literals the printer appends, as character lists —
so the bridge below rewrites without a `String`/`List` normalization
step at every joint. -/

private theorem toList_lbracket : ("[" : String).toList = ['['] := rfl
private theorem toList_rbracket : ("]" : String).toList = [']'] := rfl
private theorem toList_lbrace : ("{" : String).toList = ['{'] := rfl
private theorem toList_rbrace : ("}" : String).toList = ['}'] := rfl
private theorem toList_comma : ("," : String).toList = [','] := rfl
private theorem toList_quote : ("\"" : String).toList = ['"'] := rfl
private theorem toList_quotecolon : ("\":" : String).toList = ['"', ':'] := rfl

mutual

/-- THE BRIDGE: the character rendering is the canonical rendering. -/
theorem renderChars_eq : ∀ (v : Value), renderChars v = (renderPlain v).toList
  | .null => rfl
  | .bool b => by cases b <;> rfl
  | .nat n => by simp [renderChars, renderPlain]
  | .int i => by
    simp only [renderChars, renderPlain, Int.toString_eq_repr, Int.repr_eq_if]
    split
    · simp
    · simp [String.toList_append]
  | .str s => by
    simp only [renderChars, renderPlain, String.toList_append, escapeCompact_toList]
    rfl
  | .arr [] => by simp [renderChars, renderPlain, renderPlainItems]
  | .arr (x :: xs) => by
    simp only [renderChars, renderPlain, renderPlainItems, String.toList_append,
      toList_lbracket, toList_rbracket, List.append_assoc,
      itemsChars_eq xs (renderPlain x), ← renderChars_eq x]
    rfl
  | .obj [] => by simp [renderChars, renderPlain, renderPlainFields]
  | .obj ((k, v) :: fs) => by
    simp only [renderChars, renderPlain, renderPlainFields, String.toList_append,
      toList_lbrace, toList_rbrace, List.append_assoc,
      fieldsChars_eq fs ("\"" ++ escapeCompact k ++ "\":" ++ renderPlain v),
      ← renderChars_eq v, toList_quote, toList_quotecolon, escapeCompact_toList]
    simp [fieldChars]

/-- The array tail, against the printer's `intercalate`. The `pre`
parameter is the already-rendered head, which is what makes the
recursion structural in the list alone. -/
theorem itemsChars_eq : ∀ (xs : List Value) (pre : String),
    (String.intercalate "," (pre :: renderPlainItems xs)).toList ++ [']']
      = pre.toList ++ itemsChars xs
  | [], pre => by simp [itemsChars, renderPlainItems]
  | y :: ys, pre => by
    simp only [renderPlainItems, String.intercalate_cons_cons, String.toList_append,
      toList_comma, List.append_assoc, itemsChars_eq ys (renderPlain y),
      ← renderChars_eq y, itemsChars]
    simp

/-- The object tail, against the printer's `intercalate`. -/
theorem fieldsChars_eq : ∀ (fs : List (String × Value)) (pre : String),
    (String.intercalate "," (pre :: renderPlainFields fs)).toList ++ ['}']
      = pre.toList ++ fieldsChars fs
  | [], pre => by simp [fieldsChars, renderPlainFields]
  | (k, v) :: fs, pre => by
    simp only [renderPlainFields, String.intercalate_cons_cons, String.toList_append,
      toList_comma, List.append_assoc,
      fieldsChars_eq fs ("\"" ++ escapeCompact k ++ "\":" ++ renderPlain v),
      ← renderChars_eq v, fieldsChars, fieldChars, toList_quote, toList_quotecolon,
      escapeCompact_toList]
    simp

end

/-! ## The first character of a rendering

The one place the grammar is not decided by a literal: an array's
opening bracket is followed either by `]` (the empty array) or by a
value, and the two are told apart by the fact that NO value renders
starting with `]`. Every other branch of the parser dispatches on a
character the rendering supplies literally. -/

private theorem toDigits_head (n : Nat) :
    ∃ c t, Nat.toDigits 10 n = c :: t ∧ digitValue c ≠ none := by
  match hd : Nat.toDigits 10 n with
  | [] => exact absurd hd Nat.toDigits_ne_nil
  | c :: t =>
    refine ⟨c, t, rfl, ?_⟩
    have := digitValue_mem_toDigits n c (by rw [hd]; simp)
    intro h
    rw [h] at this
    exact absurd this (by simp)

/-- No value's rendering begins with a closing bracket. -/
theorem renderChars_head : ∀ (v : Value), ∃ c t, renderChars v = c :: t ∧ c ≠ ']'
  | .null => ⟨'n', ['u', 'l', 'l'], rfl, by decide⟩
  | .bool true => ⟨'t', ['r', 'u', 'e'], rfl, by decide⟩
  | .bool false => ⟨'f', ['a', 'l', 's', 'e'], rfl, by decide⟩
  | .str _ => ⟨'"', _, rfl, by decide⟩
  | .arr [] => ⟨'[', [']'], rfl, by decide⟩
  | .arr (_ :: _) => ⟨'[', _, rfl, by decide⟩
  | .obj [] => ⟨'{', ['}'], rfl, by decide⟩
  | .obj ((_, _) :: _) => ⟨'{', _, rfl, by decide⟩
  | .nat n => by
    obtain ⟨c, t, hct, hdv⟩ := toDigits_head n
    exact ⟨c, t, hct, fun h => hdv (by rw [h]; rfl)⟩
  | .int i => by
    simp only [renderChars]
    split
    · obtain ⟨c, t, hct, hdv⟩ := toDigits_head i.toNat
      exact ⟨c, t, hct, fun h => hdv (by rw [h]; rfl)⟩
    · exact ⟨'-', _, rfl, by decide⟩

/-! ## The parser

Structural on fuel throughout — no `partial`, no well-founded
recursion. The dispatch is by `if` on the leading character rather than
by deep literal patterns, because that is what the adequacy proof can
drive: at a number the leading character is `Nat.digitChar k` for an
unknown `k`, and only an `if` chain lets the proof discharge the
branches it does not take. -/

/-- Match a fixed literal off the front, or refuse. -/
def matchLit : List Char → List Char → Option (List Char)
  | [], cs => some cs
  | _ :: _, [] => none
  | c :: l, d :: cs => if c = d then matchLit l cs else none

/-- Read a canonical string body up to its closing quote, one escape
code at a time through `unescapeOne` — the SAME reader
`Cas.Values.JsonInj` proves the escape round trip for. The closing quote
is tested first, which is what makes the reader stop: `escapeCharCompact`
never emits a bare `"`. -/
def parseStrChars : Nat → List Char → Option (List Char × List Char)
  | 0, _ => none
  | _ + 1, [] => none
  | f + 1, c :: cs =>
    if c = '"' then some ([], cs)
    else
      match unescapeOne (c :: cs) with
      | some (ch, rest) => (parseStrChars f rest).map fun p => (ch :: p.1, p.2)
      | none => none

mutual

/-- THE value parser: one value off the front of the input, with the
remainder. -/
def parseValue : Nat → List Char → Option (Value × List Char)
  | 0, _ => none
  | _ + 1, [] => none
  | f + 1, c :: cs =>
    if c = 'n' then (matchLit ['u', 'l', 'l'] cs).map fun r => (Value.null, r)
    else if c = 't' then (matchLit ['r', 'u', 'e'] cs).map fun r => (Value.bool true, r)
    else if c = 'f' then
      (matchLit ['a', 'l', 's', 'e'] cs).map fun r => (Value.bool false, r)
    else if c = '"' then
      (parseStrChars f cs).map fun p => (Value.str (String.ofList p.1), p.2)
    else if c = '-' then
      match parseNat cs with
      | some (n, r) => if n = 0 then none else some (Value.int (-(Int.ofNat n)), r)
      | none => none
    else if c = '[' then
      match cs with
      | [] => none
      | d :: cs' =>
        if d = ']' then some (Value.arr [], cs')
        else
          match parseValue f (d :: cs') with
          | some (x, r) => (parseItems f r).map fun p => (Value.arr (x :: p.1), p.2)
          | none => none
    else if c = '{' then
      match cs with
      | [] => none
      | d :: cs' =>
        if d = '}' then some (Value.obj [], cs')
        else
          match parseField f (d :: cs') with
          | some (kv, r) => (parseFields f r).map fun p => (Value.obj (kv :: p.1), p.2)
          | none => none
    else (parseNat (c :: cs)).map fun p => (Value.nat p.1, p.2)

/-- An array's tail: `]`, or `,` and another element. -/
def parseItems : Nat → List Char → Option (List Value × List Char)
  | 0, _ => none
  | _ + 1, [] => none
  | f + 1, c :: cs =>
    if c = ']' then some ([], cs)
    else if c = ',' then
      match parseValue f cs with
      | some (x, r) => (parseItems f r).map fun p => (x :: p.1, p.2)
      | none => none
    else none

/-- One object field: `"key":value`, no space around the colon. -/
def parseField : Nat → List Char → Option ((String × Value) × List Char)
  | 0, _ => none
  | _ + 1, [] => none
  | f + 1, c :: cs =>
    if c = '"' then
      match parseStrChars f cs with
      | some (k, ':' :: r) =>
        match parseValue f r with
        | some (v, r') => some ((String.ofList k, v), r')
        | none => none
      | _ => none
    else none

/-- An object's tail: `}`, or `,` and another field. -/
def parseFields : Nat → List Char → Option (List (String × Value) × List Char)
  | 0, _ => none
  | _ + 1, [] => none
  | f + 1, c :: cs =>
    if c = '}' then some ([], cs)
    else if c = ',' then
      match parseField f cs with
      | some (kv, r) => (parseFields f r).map fun p => (kv :: p.1, p.2)
      | none => none
    else none

end

/-- The entry point on characters: one value, and NOTHING after it. The
fuel is the input's own length, which the adequacy proof shows is always
enough. -/
def parseChars (cs : List Char) : Option Value :=
  match parseValue cs.length cs with
  | some (v, []) => some v
  | _ => none

/-- THE STRICT PARSER: the canonical rendering, read back. Total, and
refuses everything the canonical rendering does not emit. -/
def parse (s : String) : Option Value := parseChars s.toList

/-! ## The acceptance contract, worked at elaboration

`Value` carries no `BEq`, so the answers are compared through the
rendering — which is exactly the identity that matters here. The
refusals are the point: every one of them is a spelling a tolerant JSON
reader would accept and the canonical encoding never emits. -/

private def reshow : Option Value → Option String
  | some v => some (renderPlain v)
  | none => none

-- ACCEPTED: the canonical spellings, round-tripping on the nose.
#guard reshow (parse "null") == some "null"
#guard reshow (parse "true") == some "true"
#guard reshow (parse "false") == some "false"
#guard reshow (parse "0") == some "0"
#guard reshow (parse "-3") == some "-3"
#guard reshow (parse "[]") == some "[]"
#guard reshow (parse "{}") == some "{}"
#guard reshow (parse "{\"a\":[0,12,-3,\"hi\\n\\\"x\\\\\",true,null],\"b\":{}}")
  == some "{\"a\":[0,12,-3,\"hi\\n\\\"x\\\\\",true,null],\"b\":{}}"
#guard reshow (parse "\"\\u0001\\u001f\"") == some "\"\\u0001\\u001f\""

-- SORTED KEYS ARE THE GATE'S QUESTION: an unsorted object is a value
-- with a rendering, so the parser answers it as spelled.
#guard reshow (parse "{\"b\":1,\"a\":2}") == some "{\"b\":1,\"a\":2}"

-- REFUSED: whitespace anywhere, alternate number spellings, alternate
-- string spellings, trailing input, trailing commas, truncation.
#guard reshow (parse "  1") == none
#guard reshow (parse "1 ") == none
#guard reshow (parse "[1, 2]") == none
#guard reshow (parse "{\"a\": 1}") == none
#guard reshow (parse "01") == none
#guard reshow (parse "-0") == none
#guard reshow (parse "+1") == none
#guard reshow (parse "1.0") == none
#guard reshow (parse "1e5") == none
#guard reshow (parse "'x'") == none
#guard reshow (parse "\"\\x\"") == none
#guard reshow (parse "[1,2,]") == none
#guard reshow (parse "nul") == none
#guard reshow (parse "truex") == none
#guard reshow (parse "") == none
#guard reshow (parse "[1") == none

end Cas.Json
