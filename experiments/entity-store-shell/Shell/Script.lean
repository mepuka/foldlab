/-
The harness script language (STORE-SHELL §6).

A script is a committed fixture: a deterministic sequence of operations with inline
carrier literals. Both sides of the differential run the SAME script text; each threads
its own address environment, so a divergence in any step's address propagates into every
later step rather than being masked.

Carrier fixtures, not byte fixtures, are the default form: `(schema-put <schema>)` sends
the carrier through the core's own `preimageS` — which canonicalizes — so the
field-reorder dedup scripts exercise M12/M12E exactly as the model states them. The
`-raw` forms skip canonicalization deliberately, to exercise the boundary's canonicity
REJECTION (Q5 strictness); the `-bytes` forms take hex, for hostile input.
-/
import Shell.Carrier
import Shell.Verbs

namespace Shell

open E2

/-! ## Re-rendering, for the transcript -/

mutual
def renderSexp : Sexp → String
  | .atom a => a
  | .str s => renderStr s
  | .list xs => "(" ++ renderSexpItems xs ++ ")"
  termination_by structural x => x

def renderSexpItems : SexpList → String
  | .nil => ""
  | .cons hd .nil => renderSexp hd
  | .cons hd tl => renderSexp hd ++ " " ++ renderSexpItems tl
  termination_by structural x => x
end

/-! ## Steps

A step is either a verb (which touches the store) or an assertion (which does not).
Assertions are what make a fixture self-checking rather than merely self-documenting:
`(assert-same @1 @2)` is how the dedup scripts state R-10/Q11 as a claim the harness can
fail on, instead of a hex string a reader has to compare by eye. They run identically on
both sides, so they never weaken the differential. -/

inductive Step
  | verb (v : Verb)
  | assertSame (x y : Address)
  | assertDiffer (x y : Address)
  | assertCode (n : Nat) (code : Nat)

private def readByteHex (s : String) : Option UInt8 :=
  match bytesOfHex s with
  | some [b] => some b
  | _ => none

private def readPlane : String → Option Plane
  | "objects" => some .objects
  | "names" => some .names
  | "obligations" => some .obligations
  | _ => none

/-- The verb forms. -/
def sexpToVerbAux (env : AddrEnv) : Sexp → Except String Verb
  | .list (.cons (.atom "check") .nil) => .ok .check
  | .list (.cons (.atom "order") .nil) => .ok .order
  -- The `(place …)` family (W3-20): the below-the-boundary writers. The filename is
  -- taken VERBATIM, never resolved through `@N` — the point of the primitive is to write
  -- an entry the boundary would never have produced, including one whose name is not an
  -- address at all.
  | .list (.cons (.atom "place") (.cons (.atom pl) (.cons (.atom fn) (.cons (.atom h) .nil)))) => do
      let plane ← match readPlane pl with
        | some p => .ok p
        | none => .error s!"unknown plane '{pl}' (objects | names | obligations)"
      match bytesOfHex h with
      | some b => .ok (.place plane fn (.file b))
      | none => .error s!"bad hex '{h}'"
  | .list (.cons (.atom "place-dir") (.cons (.atom pl) (.cons (.atom fn) .nil))) => do
      let plane ← match readPlane pl with
        | some p => .ok p
        | none => .error s!"unknown plane '{pl}' (objects | names | obligations)"
      .ok (.place plane fn .dir)
  | .list (.cons (.atom "schema-put") (.cons s .nil)) =>
      (sexpToSchema env s).map (fun s' => .putSchema (schemaBytes s'))
  | .list (.cons (.atom "schema-put-raw") (.cons s .nil)) =>
      (sexpToSchema env s).map (fun s' => .putSchema (schemaBytesRaw s'))
  | .list (.cons (.atom "schema-put-bytes") (.cons (.atom h) .nil)) =>
      match bytesOfHex h with
      | some b => .ok (.putSchema b)
      | none => .error s!"bad hex '{h}'"
  | .list (.cons (.atom "entity-put") (.cons (.atom a) (.cons v .nil))) => do
      let sAddr ← env.resolveAtom a
      let v' ← sexpToValue env v
      .ok (.putEntity sAddr (entityBytes sAddr v'))
  | .list (.cons (.atom "entity-put-raw") (.cons (.atom a) (.cons v .nil))) => do
      let sAddr ← env.resolveAtom a
      let v' ← sexpToValue env v
      .ok (.putEntity sAddr (entityBytesRaw sAddr v'))
  | .list (.cons (.atom "entity-put-bytes") (.cons (.atom a) (.cons (.atom h) .nil))) => do
      let sAddr ← env.resolveAtom a
      match bytesOfHex h with
      | some b => .ok (.putEntity sAddr b)
      | none => .error s!"bad hex '{h}'"
  | .list (.cons (.atom "get") (.cons (.atom a) .nil)) => (env.resolveAtom a).map .get
  | .list (.cons (.atom "resolve") (.cons (.atom a) .nil)) => (env.resolveAtom a).map .resolve
  | .list (.cons (.atom "refs") (.cons (.atom a) .nil)) => (env.resolveAtom a).map .refs
  | .list (.cons (.atom "name-set") (.cons (.str n) (.cons (.atom a) .nil))) =>
      (env.resolveAtom a).map (.nameSet n)
  | .list (.cons (.atom "name-get") (.cons (.str n) .nil)) => .ok (.nameGet n)
  | .list (.cons (.atom "corrupt") (.cons (.atom a) (.cons (.atom i) (.cons (.atom m) .nil)))) => do
      let addr ← env.resolveAtom a
      let idx ← match readNat i with
        | some n => .ok n
        | none => .error s!"bad byte index '{i}'"
      let mask ← match readByteHex m with
        | some b => .ok b
        | none => .error s!"bad mask '{m}' (expected two hex digits)"
      .ok (.corrupt addr idx mask)
  | x => .error s!"unknown step: {renderSexp x}"


private def asVerb (e : Except String Verb) : Except String Step := e.map Step.verb

/-- Interpret one script step against what the script has produced so far. -/
def sexpToStep (env : AddrEnv) : Sexp → Except String Step
  | .list (.cons (.atom "assert-same") (.cons (.atom x) (.cons (.atom y) .nil))) => do
      let a ← env.resolveAtom x
      let b ← env.resolveAtom y
      .ok (.assertSame a b)
  | .list (.cons (.atom "assert-differ") (.cons (.atom x) (.cons (.atom y) .nil))) => do
      let a ← env.resolveAtom x
      let b ← env.resolveAtom y
      .ok (.assertDiffer a b)
  | .list (.cons (.atom "assert-code") (.cons (.atom n) (.cons (.atom c) .nil))) => do
      let n' ← match env.stepNumber n with
        | some k => .ok k
        | none => .error s!"bad step number '{n}'"
      let c' ← match readNat c with
        | some k => .ok k
        | none => .error s!"bad exit code '{c}'"
      -- Fail at interpretation time, so a fixture cannot silently assert about a step
      -- that never ran.
      let actual ← env.codeOf n'
      if actual = c' then .ok (.assertCode n' c')
      else .error s!"assert-code: step {n'} exited {actual}, expected {c'}"
  | x => asVerb (sexpToVerbAux env x)

/-- The address a step contributes to the environment. Computed from the verb, never
    parsed back out of the observable: a put's address is `H` of the bytes it offered,
    and only if admission accepted them. -/
def stepAddr (v : Verb) (out : Outcome) : Option Address :=
  if out.code != 0 then none
  else match v with
    | .putSchema b => some (H b)
    | .putEntity _ b => some (H b)
    | _ => none

/-- Decide an assertion. Assertions never touch the store. -/
def runAssertion : Step → Option Outcome
  | .verb _ => none
  | .assertSame x y =>
      some (if x == y then ⟨0, [s!"ok same {hexOfAddr x}"]⟩
            else ⟨1, [s!"FAILED assert-same {hexOfAddr x} {hexOfAddr y}"]⟩)
  | .assertDiffer x y =>
      some (if x != y then ⟨0, [s!"ok differ"]⟩
            else ⟨1, [s!"FAILED assert-differ {hexOfAddr x}"]⟩)
  | .assertCode n c => some ⟨0, [s!"ok code step={n} code={c}"]⟩

/-- One line of a transcript, per step, plus one per output line. The index makes a
    divergence locatable without diffing whole files by eye. -/
def transcriptLines (idx : Nat) (src : String) (out : Outcome) : List String :=
  s!"{idx} {src} => code={out.code}" :: out.lines.map (fun l => s!"{idx} | {l}")

def scriptSteps (src : String) : Except String (List Sexp) :=
  let rec go : SexpList → List Sexp
    | .nil => []
    | .cons hd tl => hd :: go tl
  (readSexps src).map go

end Shell
