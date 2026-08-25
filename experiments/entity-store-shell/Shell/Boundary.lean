/-
The PUT boundary (STORE-SHELL §5) and the verification-on-open scan (§4/SH5), as pure
functions.

Layer-2 discipline: every line below is a call into the gated core (`stripPre`,
`decodeSchema`, `decodeValue`, `decAddr`, `preimageS`, `preimageE`, `canonS`, `canonV`,
`refsS`, `refsV`, `resolveSchema`, `StoreMap.find`) or a composition of such calls with
`Shell.H`. No pure logic is re-implemented here; in particular canonicity is decided by
re-running the core's own `preimageS`/`preimageE` and byte-comparing, never by an
independent notion of "canonical".

Both the in-process model and the disk store run THIS code. The differential harness
therefore compares plumbing, not semantics — which is the point of rung 0.
-/
import E2
import Shell.Hash
import Shell.Render

namespace Shell

open E2

/-! ## Kinds -/

inductive Kind
  | schema
  | entity
deriving DecidableEq

def Kind.tag : Kind → UInt8
  | .schema => kindSchema
  | .entity => kindEntity

def Kind.name : Kind → String
  | .schema => "schema"
  | .entity => "entity"

/-! ## Parsing a pre-image (boundary check 1) -/

/-- A byte string that parses as a well-formed pre-image of a known kind. -/
inductive Parsed
  | schema (s : SchemaCore)
  | entity (sAddr : Address) (v : Value)

def Parsed.kind : Parsed → Kind
  | .schema _ => .schema
  | .entity _ _ => .entity

/-- The canonical pre-image of what was parsed — the core's own assembly, re-run.
    Byte-comparing this against the input IS boundary check 2 (Q5 canonical-image
    strictness). -/
def Parsed.canonicalPreimage : Parsed → Bytes
  | .schema s => preimageS s
  | .entity sAddr v => preimageE sAddr v

/-- The references the object carries (joint B, carrier side). An entity's schema
    address heads the list, matching `E2.refsOfPreimage`. -/
def Parsed.refs : Parsed → List Address
  | .schema s => refsS s
  | .entity sAddr v => sAddr :: refsV v

/-- Boundary check 1: do these bytes parse as a well-formed pre-image of a known kind?
    `stripPre` checks the version byte and the kind tag; the decoders demand that the
    body be consumed exactly. -/
def classify (b : Bytes) : Option Parsed :=
  match stripPre kindSchema b with
  | some body => (decodeSchema body).map .schema
  | none =>
    match stripPre kindEntity b with
    | some body =>
      match decAddr body with
      | some (sAddr, rest) => (decodeValue rest).map (.entity sAddr)
      | none => none
    | none => none

/-! ## Rejections -/

inductive Rejection
  | notPreimage
  | wrongKind (expected got : Kind)
  | nonCanonical
  | schemaAddrMismatch (declared embedded : Address)
  | danglingRef (missing : Address)
  | schemaUnresolved (sAddr : Address)
  | notFound (a : Address)
  | nameUnbound (n : String)
  | badName (n : String)

def Rejection.render : Rejection → String
  | .notPreimage => "not-a-preimage"
  | .wrongKind e g => s!"wrong-kind expected={e.name} got={g.name}"
  | .nonCanonical => "non-canonical"
  | .schemaAddrMismatch d e =>
      s!"schema-addr-mismatch declared={hexOfAddr d} embedded={hexOfAddr e}"
  | .danglingRef m => s!"dangling-ref {hexOfAddr m}"
  | .schemaUnresolved a => s!"schema-unresolved {hexOfAddr a}"
  | .notFound a => s!"not-found {hexOfAddr a}"
  | .nameUnbound n => s!"name-unbound {renderStr n}"
  | .badName n => s!"bad-name {renderStr n}"

/-! ## The PUT boundary

STORE-SHELL §5 enforces, in this order:

1. the bytes parse as a well-formed pre-image of a known kind (and of the kind the verb
   was asked for);
1a. for entities, the schema address the verb was given matches the one embedded in the
   pre-image — an argument-consistency check, not a model condition;
2. canonicity: re-canonicalize and byte-compare (Q5 strictness — non-canonical bytes are
   REJECTED, never silently repaired);
3. every reference resolves in the store (WF2 precondition);
4. for entities, the schema address resolves AS A SCHEMA (the typing precondition's
   decidable half; check 3 only established presence).

Check 5, `Conforms`, is not enforceable until the M18 seat lands. Ruled (SH6): v0 records
it as an explicitly accepted obligation per entity PUT — see `Shell/Store.lean` for the
record and `checkReport` below for its appearance in `check` output. -/

/-- The result of a successful admission: the address the bytes take, and what they are. -/
structure Admission where
  addr : Address
  bytes : Bytes
  parsed : Parsed

def admit (σ : StoreMap) (expect : Kind) (declaredSchema : Option Address) (b : Bytes) :
    Except Rejection Admission := do
  -- 1: well-formed pre-image of a known kind
  let p ← match classify b with
    | none => .error .notPreimage
    | some p => .ok p
  if p.kind ≠ expect then .error (.wrongKind expect p.kind) else
  -- 1a: the declared schema address agrees with the embedded one
  match p, declaredSchema with
  | .entity embedded _, some declared =>
      if declared ≠ embedded then .error (.schemaAddrMismatch declared embedded) else pure ()
  | _, _ => pure ()
  -- 2: canonical-image strictness
  if p.canonicalPreimage ≠ b then .error .nonCanonical else
  -- 3: reference closure
  match p.refs.find? (fun r => (σ.find r).isNone) with
  | some missing => .error (.danglingRef missing)
  | none =>
    -- 4: for entities, the schema resolves as a schema
    match p with
    | .entity sAddr _ =>
        if (resolveSchema H σ sAddr).isNone then .error (.schemaUnresolved sAddr)
        else .ok ⟨H b, b, p⟩
    | .schema _ => .ok ⟨H b, b, p⟩

/-! ## Verification-on-open (STORE-SHELL §4, SH5)

Opening a directory as a store ESTABLISHES reachability (STORE-MODEL joint A): v0 runs
the full scan — every object re-hashed (WF1), parsed, canonicity-checked, references
resolved (WF2), and each entity's schema resolved as a schema (the decidable half of the
typing precondition). What is NOT decidable today — `Conforms` — is exactly what the
obligation records carry, and the scan cross-checks that every stored entity has one.

The same scan runs over the in-process `StoreMap` and over the disk, so a corrupted store
is a differential observable, not a disk-only anecdote. -/

/-- What the scan reads. Both the model and the disk materialize one of these; the two
    stray-file lists are always empty on the model side, since a `StoreMap` key is an
    `Address` and a `NameMap` value is an `Address` — neither can be malformed. -/
structure StoreView where
  objects : List (Address × Bytes)
  obligations : List Address
  names : List (String × Address)
  strayObjectFiles : List String := []
  strayNameFiles : List String := []

inductive Violation
  | strayObject (fname : String)
  | strayName (fname : String)
  | wf1 (claimed actual : Address)
  | parseFail (a : Address)
  | nonCanonical (a : Address)
  | wf2 (a : Address) (missing : Address)
  | typing (a : Address) (sAddr : Address)
  | obligationMissing (a : Address)
  | obligationOrphan (a : Address)

def Violation.render : Violation → String
  | .strayObject f => s!"violation stray-object file={renderStr f}"
  | .strayName f => s!"violation stray-name file={renderStr f}"
  | .wf1 c a => s!"violation wf1 addr={hexOfAddr c} actual={hexOfAddr a}"
  | .parseFail a => s!"violation parse addr={hexOfAddr a}"
  | .nonCanonical a => s!"violation non-canonical addr={hexOfAddr a}"
  | .wf2 a m => s!"violation wf2 addr={hexOfAddr a} missing={hexOfAddr m}"
  | .typing a s => s!"violation typing addr={hexOfAddr a} schema={hexOfAddr s}"
  | .obligationMissing a => s!"violation obligation-missing entity={hexOfAddr a}"
  | .obligationOrphan a => s!"violation obligation-orphan record={hexOfAddr a}"

private def leHex (a b : String) : Bool := (compare a b) != Ordering.gt

def sortByAddr {α : Type} (key : α → Address) (xs : List α) : List α :=
  xs.mergeSort (fun x y => leHex (hexOfAddr (key x)) (hexOfAddr (key y)))

def sortStrings (xs : List String) : List String := xs.mergeSort leHex

/-- Canonical ordering, so the model view and the disk view are the same list. A disk
    directory listing has no defined order; the store's observables must not inherit one. -/
def StoreView.normalize (v : StoreView) : StoreView :=
  { objects := sortByAddr Prod.fst v.objects
    obligations := sortByAddr id v.obligations
    names := v.names.mergeSort (fun x y => leHex x.fst y.fst)
    strayObjectFiles := sortStrings v.strayObjectFiles
    strayNameFiles := sortStrings v.strayNameFiles }

def StoreView.toMap (v : StoreView) : StoreMap := v.objects

/-- The structural checks, in order, for one object. A structural failure (wf1, parse,
    canonicity) short-circuits: those faults cascade, and one line per faulty object
    naming the first check it fails is the readable report. Reference misses do not
    cascade, so every missing reference is reported. -/
def scanObject (σ : StoreMap) (a : Address) (b : Bytes) : List Violation :=
  if H b ≠ a then [.wf1 a (H b)]
  else match classify b with
    | none => [.parseFail a]
    | some p =>
      if p.canonicalPreimage ≠ b then [.nonCanonical a]
      else
        let wf2s := (p.refs.filter (fun r => (σ.find r).isNone)).map (Violation.wf2 a)
        let typ := match p with
          | .entity sAddr _ =>
              if (resolveSchema H σ sAddr).isNone then [Violation.typing a sAddr] else []
          | .schema _ => []
        wf2s ++ typ

/-- The verdict of opening a directory as a store. -/
structure CheckReport where
  obligations : List (Address × Address)
  violations : List Violation
  objectCount : Nat
  schemaCount : Nat
  entityCount : Nat
  nameCount : Nat

/-- The full WF1+WF2 scan. Pure: the disk side supplies the view, this decides. -/
def checkReport (view₀ : StoreView) : CheckReport :=
  let view := view₀.normalize
  let σ := view.toMap
  let perObject := view.objects.map (fun p => (p.fst, scanObject σ p.fst p.snd))
  let faulted := (perObject.filter (fun p => !p.snd.isEmpty)).map Prod.fst
  let isFaulted := fun (a : Address) => faulted.contains a
  -- Objects that survived the scan, by kind.
  let sound := view.objects.filter (fun p => !isFaulted p.fst)
  let entities := sound.filterMap (fun p =>
    match classify p.snd with
    | some (.entity sAddr _) => some (p.fst, sAddr)
    | _ => none)
  let schemas := sound.filterMap (fun p =>
    match classify p.snd with
    | some (.schema _) => some p.fst
    | _ => none)
  let entityAddrs := entities.map Prod.fst
  let missing := (entities.filter (fun e => !view.obligations.contains e.fst)).map
    (fun e => Violation.obligationMissing e.fst)
  let orphan := (view.obligations.filter (fun o =>
      !entityAddrs.contains o && !isFaulted o)).map Violation.obligationOrphan
  { obligations := entities
    violations :=
      view.strayObjectFiles.map Violation.strayObject
        ++ perObject.flatMap Prod.snd
        ++ missing ++ orphan
        ++ view.strayNameFiles.map Violation.strayName
    objectCount := view.objects.length
    schemaCount := schemas.length
    entityCount := entities.length
    nameCount := view.names.length }

/-- `check` output: the accepted `Conforms` obligations (SH6), then one line per
    violation, then a one-line verdict. Deterministic in every position. -/
def CheckReport.render (r : CheckReport) : List String :=
  r.obligations.map (fun p =>
      s!"obligation conforms-unverified entity={hexOfAddr p.fst} schema={hexOfAddr p.snd}")
    ++ r.violations.map Violation.render
    ++ [ (if r.violations.isEmpty then "check clean" else s!"check violations={r.violations.length}")
          ++ s!" objects={r.objectCount} schemas={r.schemaCount}"
          ++ s!" entities={r.entityCount} names={r.nameCount}" ]

def CheckReport.ok (r : CheckReport) : Bool := r.violations.isEmpty

end Shell
