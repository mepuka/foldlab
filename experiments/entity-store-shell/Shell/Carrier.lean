/-
Carrier literals: s-expression → `E2.SchemaCore` / `E2.Value` / `E2.Check`.

The syntax is exactly what `Shell/Render.lean` emits, so a `resolve` result re-reads as a
fixture. Addresses inside a literal are written either as 128-character lowercase hex or
as `@N`, the address produced by step N of the running script (1-based) — that is how a
fixture names an object it has just created without hard-coding a digest.

Everything here is a total pure function; failure is an `Except` value, never an
exception.
-/
import E2
import Shell.Hex
import Shell.Sexp

namespace Shell

open E2

/-- What a running script has produced so far, in step order: the address of each step
    (if it made one) and its exit code. Fixtures reference both — `@N` for an address,
    `(assert-code N c)` for a code. -/
structure AddrEnv where
  steps : List (Option Address)
  codes : List Nat

def AddrEnv.empty : AddrEnv := ⟨[], []⟩

def AddrEnv.push (env : AddrEnv) (a : Option Address) (code : Nat) : AddrEnv :=
  ⟨env.steps ++ [a], env.codes ++ [code]⟩

/-- The exit code of step `n` (1-based). -/
def AddrEnv.codeOf (env : AddrEnv) (n : Nat) : Except String Nat :=
  if n = 0 then .error "step references are 1-based"
  else match env.codes[n - 1]? with
    | none => .error s!"step {n} has not run"
    | some c => .ok c

/-- A step number written in a fixture: `N` (1-based) or `prev` (the step just run).
    `prev` exists because hand-counted step numbers are the one thing about these
    fixtures that silently rots when a line is inserted. -/
def AddrEnv.stepNumber (env : AddrEnv) (s : String) : Option Nat :=
  if s = "prev" then (if env.codes.isEmpty then none else some env.codes.length)
  else readNat s

/-- Resolve an address atom: `@N` (step N's address), `@prev` (the step just run),
    `@last` (the most recent step that produced an address at all — assertions and
    `check` produce none, so this is what a fixture usually means), or a literal digest
    hex. -/
def AddrEnv.resolveAtom (env : AddrEnv) (s : String) : Except String Address :=
  if s = "@last" then
    match env.steps.reverse.findSome? id with
    | some a => .ok a
    | none => .error "no step has produced an address yet"
  else
  match s.toList with
  | '@' :: rest =>
      match env.stepNumber (String.ofList rest) with
      | none => .error s!"bad step reference '{s}'"
      | some 0 => .error "step references are 1-based"
      | some n =>
        match env.steps[n - 1]? with
        | none => .error s!"step {n} has not run"
        | some none => .error s!"step {n} produced no address"
        | some (some a) => .ok a
  | _ =>
      match addrOfHex s with
      | some a => .ok a
      | none => .error s!"bad address '{s}' (expected {digestHexChars} lowercase hex characters or @N)"

private def sexpAddr (env : AddrEnv) : Sexp → Except String Address
  | .atom a => env.resolveAtom a
  | _ => .error "expected an address atom"

/-! ## Values -/

mutual
def sexpToValue (env : AddrEnv) : Sexp → Except String Value
  | .atom "null"  => .ok .vnull
  | .atom "true"  => .ok (.vbool true)
  | .atom "false" => .ok (.vbool false)
  | .atom a => .error s!"unknown value atom '{a}'"
  | .str _ => .error "a bare string is not a value; write (s \"...\")"
  | .list (.cons (.atom "i") (.cons (.atom n) .nil)) =>
      match readInt n with
      | some k => .ok (.vint k)
      | none => .error s!"bad integer '{n}'"
  | .list (.cons (.atom "s") (.cons (.str s) .nil)) => .ok (.vstr s)
  | .list (.cons (.atom "vaddr") (.cons (.atom h) .nil)) =>
      (env.resolveAtom h).map .vaddr
  | .list (.cons (.atom "arr") rest) => (sexpToValueList env rest).map .varr
  | .list (.cons (.atom "obj") rest) => (sexpToValueFields env rest).map .vobj
  | .list _ => .error "unknown value form"
  termination_by structural x => x

def sexpToValueList (env : AddrEnv) : SexpList → Except String ValueList
  | .nil => .ok .nil
  | .cons hd tl => do
      let v ← sexpToValue env hd
      let vs ← sexpToValueList env tl
      .ok (.cons v vs)
  termination_by structural x => x

def sexpToValueFields (env : AddrEnv) : SexpList → Except String ValueFields
  | .nil => .ok .nil
  | .cons (.list (.cons (.str k) (.cons v .nil))) tl => do
      let v' ← sexpToValue env v
      let rest ← sexpToValueFields env tl
      .ok (.cons k v' rest)
  | .cons _ _ => .error "an obj field must be (\"key\" <value>)"
  termination_by structural x => x
end

/-! ## Checks -/

mutual
def sexpToCheck (env : AddrEnv) : Sexp → Except String Check
  | .list (.cons (.atom "filter") (.cons (.str id) (.cons p (.cons (.atom ab) .nil)))) => do
      let v ← sexpToValue env p
      match readBool ab with
      | some b => .ok (.filter id v b)
      | none => .error s!"bad boolean '{ab}'"
  | .list (.cons (.atom "group") rest) => (sexpToCheckList env rest).map .filterGroup
  | _ => .error "unknown check form"
  termination_by structural x => x

def sexpToCheckList (env : AddrEnv) : SexpList → Except String CheckList
  | .nil => .ok .nil
  | .cons hd tl => do
      let c ← sexpToCheck env hd
      let cs ← sexpToCheckList env tl
      .ok (.cons c cs)
  termination_by structural x => x
end

/-! ## Schemas -/

private def readPrim (s : String) : Option Prim :=
  if s = "null" then some .null
  else if s = "bool" then some .bool
  else if s = "int" then some .int
  else if s = "str" then some .str
  else none

private def readUMode (s : String) : Option UMode :=
  if s = "anyOf" then some .anyOf else if s = "oneOf" then some .oneOf else none

mutual
def sexpToSchema (env : AddrEnv) : Sexp → Except String SchemaCore
  | .atom "address" => .ok .address
  | .atom a => .error s!"unknown schema atom '{a}'"
  | .str _ => .error "a bare string is not a schema"
  | .list (.cons (.atom "prim") (.cons (.atom p) .nil)) =>
      match readPrim p with
      | some p' => .ok (.prim p')
      | none => .error s!"unknown primitive '{p}'"
  | .list (.cons (.atom "lit") (.cons v .nil)) => (sexpToValue env v).map .lit
  | .list (.cons (.atom "array") (.cons e .nil)) => (sexpToSchema env e).map .array
  | .list (.cons (.atom "ref") (.cons (.atom h) .nil)) => (env.resolveAtom h).map .ref
  | .list (.cons (.atom "var") (.cons (.atom i) .nil)) =>
      match readNat i with
      | some n => .ok (.var n)
      | none => .error s!"bad de Bruijn index '{i}'"
  | .list (.cons (.atom "mu") (.cons (.str d) (.cons b .nil))) =>
      (sexpToSchema env b).map (.mu d)
  | .list (.cons (.atom "refine") (.cons s (.cons c .nil))) => do
      let s' ← sexpToSchema env s
      let c' ← sexpToCheck env c
      .ok (.refine s' c')
  | .list (.cons (.atom "object") rest) => (sexpToFieldList env rest).map .object
  | .list (.cons (.atom "tuple") rest) => (sexpToSchemaList env rest).map .tuple
  | .list (.cons (.atom "union") (.cons (.atom m) rest)) =>
      match readUMode m with
      | some m' => (sexpToSchemaList env rest).map (.union m')
      | none => .error s!"unknown union mode '{m}'"
  | .list (.cons (.atom "record") (.cons c .nil)) => (sexpToSchema env c).map .record
  | .list (.cons (.atom "tuple-rest") (.cons r rest)) => do
      let r' ← sexpToSchema env r
      let es ← sexpToSchemaList env rest
      .ok (.tupleRest es r')
  | .list _ => .error "unknown schema form"
  termination_by structural x => x

def sexpToFieldList (env : AddrEnv) : SexpList → Except String FieldList
  | .nil => .ok .nil
  | .cons (.list (.cons (.atom "f") (.cons (.str k) (.cons (.atom opt) (.cons s .nil))))) tl => do
      let s' ← sexpToSchema env s
      let rest ← sexpToFieldList env tl
      if opt = "req" then .ok (.cons k s' false rest)
      else if opt = "opt" then .ok (.cons k s' true rest)
      else .error s!"field optionality must be req or opt, got '{opt}'"
  | .cons _ _ => .error "an object field must be (f \"key\" req|opt <schema>)"
  termination_by structural x => x

def sexpToSchemaList (env : AddrEnv) : SexpList → Except String SchemaList
  | .nil => .ok .nil
  | .cons hd tl => do
      let s ← sexpToSchema env hd
      let ss ← sexpToSchemaList env tl
      .ok (.cons s ss)
  termination_by structural x => x
end

/-- Read a schema from source text (used by the CLI's `--expr` inputs and by fixtures). -/
def parseSchema (env : AddrEnv) (src : String) : Except String SchemaCore := do
  match ← readSexps src with
  | .cons x .nil => sexpToSchema env x
  | _ => .error "expected exactly one schema expression"

/-- Read a value from source text. -/
def parseValue (env : AddrEnv) (src : String) : Except String Value := do
  match ← readSexps src with
  | .cons x .nil => sexpToValue env x
  | _ => .error "expected exactly one value expression"

end Shell
