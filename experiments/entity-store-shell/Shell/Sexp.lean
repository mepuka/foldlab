/-
S-expression reader for the harness script language and for parsing carrier literals.

No `partial` anywhere in the shell (the `partial`→opaque trap is a standing estate
concern, and `Shell/Gate.lean` scans for it): the tokenizer and the parser take explicit
fuel derived from the input length, and the fuel never appears in an observable.

`Sexp` is mutual-monomorphic, mirroring the E2 carriers, so every interpreter over it is
structurally recursive.
-/

namespace Shell

mutual
inductive Sexp
  | atom (s : String)
  | str (s : String)
  | list (xs : SexpList)
inductive SexpList
  | nil
  | cons (hd : Sexp) (tl : SexpList)
end

def SexpList.length : SexpList → Nat
  | .nil => 0
  | .cons _ tl => tl.length + 1

/-! ## Tokenizer -/

inductive Token
  | lpar | rpar | atom (s : String) | str (s : String)

private def isSpace (c : Char) : Bool :=
  c = ' ' || c = '\n' || c = '\t' || c = '\r'

private def isDelim (c : Char) : Bool :=
  isSpace c || c = '(' || c = ')' || c = '"' || c = ';'

/-- Drop to the end of the current line (comment). -/
private def dropLine : List Char → List Char
  | [] => []
  | c :: rest => if c = '\n' then rest else dropLine rest

/-- Scan the body of a double-quoted literal; returns the content and the rest. -/
private def scanStr : List Char → Except String (List Char × List Char)
  | [] => .error "unterminated string literal"
  | '"' :: rest => .ok ([], rest)
  | '\\' :: e :: rest => do
      let c ←
        if e = 'n' then .ok '\n'
        else if e = 't' then .ok '\t'
        else if e = 'r' then .ok '\r'
        else if e = '\\' then .ok '\\'
        else if e = '"' then .ok '"'
        else .error s!"unknown escape \\{e}"
      let (cs, r) ← scanStr rest
      .ok (c :: cs, r)
  | ['\\'] => .error "unterminated string literal"
  | c :: rest => do
      let (cs, r) ← scanStr rest
      .ok (c :: cs, r)

/-- Scan a bare atom: everything up to the next delimiter. -/
private def scanAtom : List Char → List Char × List Char
  | [] => ([], [])
  | c :: rest =>
      if isDelim c then ([], c :: rest)
      else let (cs, r) := scanAtom rest; (c :: cs, r)

private def tokenizeAux : Nat → List Char → Except String (List Token)
  | 0, _ => .error "tokenizer: fuel exhausted"
  | _, [] => .ok []
  | f + 1, c :: rest =>
      if isSpace c then tokenizeAux f rest
      else if c = ';' then tokenizeAux f (dropLine rest)
      else if c = '(' then do let ts ← tokenizeAux f rest; .ok (.lpar :: ts)
      else if c = ')' then do let ts ← tokenizeAux f rest; .ok (.rpar :: ts)
      else if c = '"' then do
        let (cs, r) ← scanStr rest
        let ts ← tokenizeAux f r
        .ok (.str (String.ofList cs) :: ts)
      else
        let (cs, r) := scanAtom (c :: rest)
        match cs with
        | [] => .error s!"tokenizer: stuck at '{c}'"
        | _ => do
            let ts ← tokenizeAux f r
            .ok (.atom (String.ofList cs) :: ts)

/-- Tokenize a source string. Fuel is the character count: every step consumes at least
    one character, so the fuel is never the reason a well-formed input fails. -/
def tokenize (src : String) : Except String (List Token) :=
  let cs := src.toList
  tokenizeAux (cs.length + 1) cs

/-! ## Parser -/

/-- Parse a sequence of s-expressions, stopping at an unconsumed `)` or end of input. -/
private def parseSeq : Nat → List Token → Except String (SexpList × List Token)
  | 0, _ => .error "parser: fuel exhausted"
  | _, [] => .ok (.nil, [])
  | _, .rpar :: rest => .ok (.nil, .rpar :: rest)
  | f + 1, .atom a :: rest => do
      let (tl, r) ← parseSeq f rest
      .ok (.cons (.atom a) tl, r)
  | f + 1, .str s :: rest => do
      let (tl, r) ← parseSeq f rest
      .ok (.cons (.str s) tl, r)
  | f + 1, .lpar :: rest => do
      let (inner, r₁) ← parseSeq f rest
      match r₁ with
      | .rpar :: r₂ => do
          let (tl, r₃) ← parseSeq f r₂
          .ok (.cons (.list inner) tl, r₃)
      | _ => .error "unclosed '('"

/-- Read a source string as a sequence of top-level s-expressions. -/
def readSexps (src : String) : Except String SexpList := do
  let toks ← tokenize src
  let (xs, rest) ← parseSeq (2 * toks.length + 2) toks
  match rest with
  | [] => .ok xs
  | _ => .error "unexpected ')'"

/-! ## Small readers used by the interpreters -/

/-- Decimal `Nat`, strict: at least one digit, digits only. -/
def readNat (s : String) : Option Nat :=
  let cs := s.toList
  if cs.isEmpty then none
  else cs.foldl (fun acc c =>
    match acc with
    | none => none
    | some n => if '0' ≤ c && c ≤ '9' then some (n * 10 + (c.toNat - '0'.toNat)) else none)
    (some 0)

/-- Decimal `Int`, strict: an optional leading `-`, then at least one digit. -/
def readInt (s : String) : Option Int :=
  match s.toList with
  | '-' :: rest => (readNat (String.ofList rest)).map (fun n => -(Int.ofNat n))
  | _ => (readNat s).map Int.ofNat

def readBool (s : String) : Option Bool :=
  if s = "true" then some true else if s = "false" then some false else none

end Shell
