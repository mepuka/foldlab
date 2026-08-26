/-
The PUT boundary (STORE-SHELL §5) and the verification-on-open scan (§4/SH5), as pure
functions.

Layer-2 discipline: every line below is a call into the gated core (`admissibleReport`,
`schemaAdmissionClause`, `valueAdmissionClause`, `stripPre`, `decodeSchema`,
`decodeValue`, `decAddr`, `preimageS`, `preimageE`, `canonS`, `canonV`, `refsS`, `refsV`,
`resolveSchema`, `StoreMap.find`) or a composition of such calls with `Shell.H`. No pure
logic is re-implemented here; in particular canonicity is decided by re-running the core's
own `preimageS`/`preimageE` and byte-comparing, never by an independent notion of
"canonical".

THE VERDICT IS THE MODEL'S, at both levels (C-3, ruling W3-3). A carrier's admission is
`E2.schemaAdmissionClause`/`E2.valueAdmissionClause`; a whole store's is
`E2.admissibleReport`, called ONCE in `checkReport`. The per-object passes below it are
the DIAGNOSTIC layer — they say which address failed which clause, in the cascade order
W3-13 ruled, and they decide nothing. Until this seat the shell decided all six
`E2.Admissible` clauses itself and `E2.admissibleReport` had no callers anywhere, so the
two surfaces agreed only by inspection.

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

/-! ## Carrier admission (boundary check 2, W3-12/W3-13) -/

/-- The carrier-level admission verdict, taken from the MODEL's own surface (W3-12).

    `E2.schemaAdmissionClause` IS `Reachable.putS`'s `WFS` premise, decided and named:
    `schemaAdmissionClause_none_iff` bridges it to `wfsB`, and `wfsB_iff` bridges that to
    `WFS`. `E2.valueAdmissionClause` is the value plane's twin (`wfvB` = `dupFreeV`,
    which is `Reachable.putE`'s premise under W3-9).

    The two verdict functions are the ONLY door: the shell never calls `closedB`,
    `guardedB`, `dupFreeS`, `canonicalSpellingB`, `litNarrowB` or `dupFreeV` directly
    (the CONTEXT avoid-list — "never bypass `admissibleReport` to call its internal
    predicates from the shell", W3-3). Going through the named verdicts is what makes the
    boundary check PROVABLY the model's premise rather than incidentally equal to it. -/
def Parsed.admissionClause : Parsed → Option String
  | .schema s => E2.schemaAdmissionClause s
  | .entity _ v => E2.valueAdmissionClause v

/-! ## Rejections -/

inductive Rejection
  | notPreimage
  | wrongKind (expected got : Kind)
  /-- The carrier is outside the model's admission: the FIRST failing clause, by name.
      A single `not-well-formed` verdict would leave the differential harness unable to
      tell a `closed` fix from a `guarded` one (R-C §1.2). Clause vocabulary is the
      model's, not the shell's: `closed | guarded | dup-key | spelling | lit-narrow` on
      the schema plane, `dup-key-value` on the value plane. -/
  | notWellFormed (clause : String)
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
  | .notWellFormed c => s!"not-well-formed {c}"
  | .nonCanonical => "non-canonical"
  | .schemaAddrMismatch d e =>
      s!"schema-addr-mismatch declared={hexOfAddr d} embedded={hexOfAddr e}"
  | .danglingRef m => s!"dangling-ref {hexOfAddr m}"
  | .schemaUnresolved a => s!"schema-unresolved {hexOfAddr a}"
  | .notFound a => s!"not-found {hexOfAddr a}"
  | .nameUnbound n => s!"name-unbound {renderStr n}"
  | .badName n => s!"bad-name {renderStr n}"

/-! ## The PUT boundary

STORE-SHELL §5, as amended by W3-12/W3-13, enforces `Reachable`'s insert premises with
exactly what is decidable today, in this order:

1. the bytes parse as a well-formed pre-image of a known kind (and of the kind the verb
   was asked for);
1a. for entities, the schema address the verb was given matches the one embedded in the
   pre-image — an argument-consistency check, not a model condition;
2. WELL-FORMEDNESS (W3-12): the decoded carrier satisfies the model's admission —
   `E2.schemaAdmissionClause` on the schema plane (which IS `Reachable.putS`'s `WFS`
   premise), `E2.valueAdmissionClause` on the value plane (`Reachable.putE`'s `dupFreeV`
   premise, W3-9). The rejection names the failing clause;
3. canonicity: re-canonicalize and byte-compare (Q5 strictness — non-canonical bytes are
   REJECTED, never silently repaired);
4. every reference resolves in the store (WF2 precondition);
5. for entities, the schema address resolves AS A SCHEMA (the typing precondition's
   decidable half; check 4 only established presence).

ORDERING NOTE (W3-13, from F-40/F-41). Well-formedness precedes canonicity because
`ObligationCanonIdempotent` is conditional on `dupFreeS`: on a duplicate-key carrier
`canonS` is an involution, not idempotent, so the byte-compare's verdict is not a
statement about canonicity at all. Run the other way round it produced `non-canonical`
on bytes the shell had itself assembled from a carrier literal — the boundary rejecting
its own output. With check 2 ahead of it, a `non-canonical` verdict means what §5 says it
means.

WHY CHECK 2 SUBJECTS THE DECODED CARRIER, not the source carrier: checks 2 and 3 together
establish `Admissible.admitted` with the decoded `p` as the witness. Check 3 gives
`preimageS p = b`; `b` decoded to `p`, and `M4a_schema` gives
`decodeSchema (encSchema (canonS p)) = some (canonS p)`, hence `canonS p = p`. So
`Reachable.putS` fires with `s := p`: its stored bytes are `preimageS p = b` and its
premise is `WFS p`, which is exactly what check 2 decided (R-C §1.3).

Check 6, `Conforms`, is not enforceable until the M18 seat lands. Ruled (SH6): v0 records
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
  -- 2: well-formedness — the model's own admission verdict, BEFORE canonicity (W3-13)
  match p.admissionClause with
  | some clause => .error (.notWellFormed clause)
  | none => pure ()
  -- 3: canonical-image strictness
  if p.canonicalPreimage ≠ b then .error .nonCanonical else
  -- 4: reference closure
  match p.refs.find? (fun r => (σ.find r).isNone) with
  | some missing => .error (.danglingRef missing)
  | none =>
    -- 5: for entities, the schema resolves as a schema
    match p with
    | .entity sAddr _ =>
        if (resolveSchema H σ sAddr).isNone then .error (.schemaUnresolved sAddr)
        else .ok ⟨H b, b, p⟩
    | .schema _ => .ok ⟨H b, b, p⟩

/-! ## Verification-on-open (STORE-SHELL §4, SH5)

Opening a directory as a store establishes EVERY CLAUSE OF REACHABILITY THAT IS DECIDABLE
TODAY, AND NO MORE (SH5 as narrowed by W3-12). v0 runs the full scan — every object
re-hashed (WF1), parsed, checked well-formed against the model's admission verdicts,
canonicity byte-compared, references resolved (WF2), each entity's schema resolved as a
schema (the decidable half of the typing precondition), and the reference graph decided
acyclic by Kahn's (WF3). What is NOT decidable today — `Conforms` — is exactly what the
obligation records carry, and the scan cross-checks that every stored entity has one.

ANTI-CLAIM (F-33's lesson, and the CONTEXT avoid-list). The scan establishes
`E2.Admissible`, NEVER `Reachable`. It establishes it in the literal sense now that
`E2.admissibleReportDecides` is proved and `checkReport` takes its verdict from the
report — which sharpens the anti-claim rather than softening it: what a clean `check`
means is exactly `E2.Admissible`, and the bridge to `Reachable` is
`E2.ObligationM19_transport`, which is stated and unproved and which additionally carries
a conformance premise this scan does not supply. Kahn's pass is the COMPUTATIONAL half of
that bridge — it produces the insertion order M19 asserts exists; the theorem half is a
seat.

The same scan runs over the in-process `StoreMap` and over the disk, so a corrupted store
is a differential observable, not a disk-only anecdote. -/

/-- What the scan reads. Both the model and the disk materialize one of these.

    The three file-shape lists WERE hard-wired empty on the model side, on the reasoning
    that a `StoreMap` key is an `Address` and a `NameMap` value is an `Address` — neither
    can be malformed, neither can be a directory. True of anything the PUT boundary
    admits, and false of anything written BELOW it, which is precisely the surface the
    differential harness exists to cover. W3-20's `(place …)` family writes below the
    boundary on both sides, so the model now carries real lists and the two sides diverge
    only where they should. -/
structure StoreView where
  objects : List (Address × Bytes)
  obligations : List Address
  names : List (String × Address)
  strayObjectFiles : List String := []
  strayNameFiles : List String := []
  /-- Entries the layout names correctly but which are not regular files — a directory,
      a symlink, a FIFO. Reported, never opened (F-42, ruling W3-15). -/
  notRegularFiles : List String := []

inductive Violation
  | strayObject (fname : String)
  | strayName (fname : String)
  /-- A correctly named entry that is not a regular file. Distinct from a stray, which is
      a MISNAMED file: this one is named exactly as the layout demands and is a directory,
      a symlink, or a device. "your objects/ contains a symlink" is the diagnosis a
      transported store needs; "stray" is not (F-42). -/
  | notARegularFile (file : String)
  | wf1 (claimed actual : Address)
  | parseFail (a : Address)
  /-- The stored carrier is outside the model's admission, first failing clause named.
      Same vocabulary as the PUT rejection, and — per W3-13 — decided in the same place
      in the order: before canonicity, on both sides. -/
  | notWellFormed (a : Address) (clause : String)
  | nonCanonical (a : Address)
  | wf2 (a : Address) (missing : Address)
  /-- WF3 (F-32, ruling W3-12): the reference graph has a cycle, and this address is one
      Kahn's algorithm could not emit. A cycle is a GLOBAL property, so it does not fit
      the one-line-per-object shape; one line per unemitted node is the useful shape and
      stays deterministic, because the objects list is already `normalize`d by address
      before Kahn's runs. -/
  | cycle (a : Address)
  | typing (a : Address) (sAddr : Address)
  | obligationMissing (a : Address)
  | obligationOrphan (a : Address)

def Violation.render : Violation → String
  | .strayObject f => s!"violation stray-object file={renderStr f}"
  | .strayName f => s!"violation stray-name file={renderStr f}"
  | .notARegularFile f => s!"violation not-a-regular-file file={renderStr f}"
  | .wf1 c a => s!"violation wf1 addr={hexOfAddr c} actual={hexOfAddr a}"
  | .parseFail a => s!"violation parse addr={hexOfAddr a}"
  | .notWellFormed a c => s!"violation not-well-formed addr={hexOfAddr a} clause={c}"
  | .nonCanonical a => s!"violation non-canonical addr={hexOfAddr a}"
  | .wf2 a m => s!"violation wf2 addr={hexOfAddr a} missing={hexOfAddr m}"
  | .cycle a => s!"violation cycle addr={hexOfAddr a}"
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
    strayNameFiles := sortStrings v.strayNameFiles
    notRegularFiles := sortStrings v.notRegularFiles }

def StoreView.toMap (v : StoreView) : StoreMap := v.objects

/-- The structural checks, in order, for one object. A structural failure (wf1, parse,
    well-formedness, canonicity) short-circuits: those faults cascade, and one line per
    faulty object naming the first check it fails is the readable report. Reference misses
    do not cascade, so every missing reference is reported.

    ORDER (W3-13). The scan runs the SAME order as the PUT boundary: well-formedness
    before canonicity. R-C §3.3 offered the opposite order here — on the scan side
    canonicity is a statement about bytes already on disk and is the more primitive fault
    — and flagged that an operator might reasonably rule the two must agree. W3-13 so
    ruled, and the PUT order won, because it is the one with the model-premise argument
    behind it: outside `dupFreeS` the byte-compare's verdict is meaningless on either
    side of the boundary. -/
def scanObject (σ : StoreMap) (a : Address) (b : Bytes) : List Violation :=
  if H b ≠ a then [.wf1 a (H b)]
  else match classify b with
    | none => [.parseFail a]
    | some p =>
      match p.admissionClause with
      | some clause => [.notWellFormed a clause]
      | none =>
        if p.canonicalPreimage ≠ b then [.nonCanonical a]
        else
          let wf2s := (p.refs.filter (fun r => (σ.find r).isNone)).map (Violation.wf2 a)
          let typ := match p with
            | .entity sAddr _ =>
                if (resolveSchema H σ sAddr).isNone then [Violation.typing a sAddr] else []
            | .schema _ => []
          wf2s ++ typ

/-! ## Acyclicity (WF3), decided — F-32, ruling W3-12

`E2.topoOrder` is Kahn's algorithm over the reference graph: `none` exactly when the
graph has a cycle, otherwise the topological order sinks-first — which is also a legal
insertion sequence, which is why the same pass triples as the acyclicity decision, the
cycle witness, and M19's reconstruction order. `Admissible.acyclic` is the clause it
decides and `E2.topoComplete` is the theorem that says so — PROVED, both directions
(`E2/AdmissionDecides.lean`), which is what turns the `acyclic` field of the report from
a computation into the clause. -/

/-- The addresses Kahn's algorithm could not emit — empty exactly when `E2.topoOrder`
    succeeds, and otherwise the cyclic core together with everything that depends on it.

    `topoOrder` is all-or-nothing, so the per-node witness W3-12 asks for is not readable
    off its result. This drives the CORE's own round function (`E2.kahnSplit`) and keeps
    only the leftovers; the shell supplies the fuel and the accumulator and never a second
    notion of "ready" — the Layer-2 discipline at the head of this file, applied to a
    graph pass rather than to a codec.

    DETERMINISTIC: `checkReport` normalizes the view by address before building `σ`, and
    `List.partition` preserves input order, so the leftovers come out in address order on
    both runners. -/
def cycleNodes (σ : StoreMap) : List Address :=
  let rec go : Nat → List Address → List Address
    | 0, remaining => remaining
    | fuel + 1, remaining =>
      match remaining with
      | [] => []
      | _ :: _ =>
        match kahnSplit σ remaining with
        | ([], _) => remaining
        | (_, rest) => go fuel rest
  go (Keys σ).length (Keys σ)

/-- The verdict of opening a directory as a store, and the diagnosis that accompanies it.

    THE TWO ARE DIFFERENT THINGS and this structure keeps them apart (C-3). `admissible`
    is the MODEL's judgment, taken whole from `E2.admissibleReport`; `planesClean` covers
    the planes `E2.Admissible` does not speak about; `violations` is the operator's
    reading of what went wrong and decides nothing. -/
structure CheckReport where
  obligations : List (Address × Address)
  /-- DIAGNOSIS, not verdict: one line per fault, in the order §4 lays the planes out.
      Nothing reads `isEmpty` off this list to decide anything — see `CheckReport.ok`. -/
  violations : List Violation
  /-- THE VERDICT's `Admissible` half: `(E2.admissibleReport H σ).clean`, one call into
      the model's single decision surface (W3-3). `E2.admissibleReportDecides` is the
      theorem that this `Bool` IS `E2.Admissible H σ`, which is what makes the scan a
      DECIDER of the judgment rather than a second opinion that happens to agree. -/
  admissible : Bool
  /-- THE VERDICT's other half: the planes outside `E2.Admissible` — file shape (strays,
      non-regular entries, F-42/W3-15) and the SH6 obligation set. `Admissible` is a
      judgment about a `StoreMap`; a directory carries entries a `StoreMap` cannot
      represent, and refusing to fold them into the model's clause list is the same
      discipline that keeps `Conforms` out of `Admissible`. -/
  planesClean : Bool
  objectCount : Nat
  schemaCount : Nat
  entityCount : Nat
  nameCount : Nat

/-- The full scan. Pure: the disk side supplies the view, this decides.

    ONE DECISION SURFACE (C-3, W3-3). The verdict is `E2.admissibleReport`'s, called once
    on the view's own `StoreMap`; the per-object passes below it produce VIOLATION LINES
    and nothing else. Before this the shell decided all six `Admissible` clauses itself
    and `admissibleReport` had no callers at all, so the theorem that would have made
    either of them mean `Admissible` would have been a statement about the wrong one.

    The two layers are not redundant, they are different jobs. A `Bool` per clause is what
    a proof consumes; a `Violation` list is what an operator reads, and it carries what
    the report's fields deliberately cannot — the ADDRESS at fault, the missing reference,
    the per-node cycle witness, and the cascade order W3-13 ruled. -/
def checkReport (view₀ : StoreView) : CheckReport :=
  let view := view₀.normalize
  let σ := view.toMap
  let report := E2.admissibleReport H σ
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
  -- WF3 (W3-12): the whole-graph clause. The GUARD is the model's own `acyclic` field —
  -- definitionally `(topoOrder σ).isSome`, but read off the report so the witness list
  -- cannot be produced against a different answer than the verdict was taken from.
  -- `cycleNodes` then supplies the per-node witness the report's `Bool` cannot carry.
  let cycles := (if report.acyclic then [] else cycleNodes σ).map Violation.cycle
  -- File-shape observations first, in the order the planes are laid out: what the scan
  -- could not even open comes before what it opened and found wrong. Then the per-object
  -- faults, then the whole-graph fault, then the obligation plane, then names. Each list
  -- is sorted by name or address in `normalize`, so the whole block is deterministic.
  let strayObjects := view.strayObjectFiles.map Violation.strayObject
  let notRegular := view.notRegularFiles.map Violation.notARegularFile
  let strayNames := view.strayNameFiles.map Violation.strayName
  { obligations := entities
    violations :=
      strayObjects ++ notRegular
        ++ perObject.flatMap Prod.snd
        ++ cycles
        ++ missing ++ orphan
        ++ strayNames
    admissible := report.clean
    planesClean :=
      strayObjects.isEmpty && notRegular.isEmpty && missing.isEmpty && orphan.isEmpty
        && strayNames.isEmpty
    objectCount := view.objects.length
    schemaCount := schemas.length
    entityCount := entities.length
    nameCount := view.names.length }

/-- The verdict, and the ONLY thing any caller may gate on: the model's judgment on the
    store map, and the planes that judgment does not cover. `E2.admissibleReportDecides`
    reads the first conjunct as `E2.Admissible H view.toMap` — which is exactly what SH5
    as narrowed claims verification-on-open establishes, and no more (never `Reachable`:
    that bridge is `E2.ObligationM19_transport`, unproved, and it carries a conformance
    premise this scan does not supply). -/
def CheckReport.ok (r : CheckReport) : Bool := r.admissible && r.planesClean

/-- WHAT A CLEAN `check` MEANS, checked rather than asserted. This is the one theorem in
    the shell that is about the shell's own verdict, and it exists because the sentence it
    proves used to be a comment: "the scan establishes `Admissible`". It is a THEOREM only
    because `checkReport` takes the verdict from `E2.admissibleReport` — restore the
    independent six-clause scan and this statement stops being provable, which is the
    property C-3 was opened to buy.

    Read the two conjuncts as SH5 as narrowed reads them: the model's judgment on the
    store map, and the directory-shape planes `E2.Admissible` has no vocabulary for. -/
theorem CheckReport.ok_iff (view : StoreView) :
    (checkReport view).ok = true ↔
      (E2.Admissible H view.normalize.toMap ∧ (checkReport view).planesClean = true) := by
  have hd := E2.admissibleReportDecides H view.normalize.toMap
  constructor
  · intro h
    rw [CheckReport.ok, Bool.and_eq_true] at h
    exact ⟨hd.1 h.1, h.2⟩
  · intro h
    rw [CheckReport.ok, Bool.and_eq_true]
    exact ⟨hd.2 h.1, h.2⟩

/-- `check` output: the accepted `Conforms` obligations (SH6), then one line per
    violation, then a one-line verdict. Deterministic in every position.

    The COUNT is the diagnosis's length — how many lines the operator is looking at — and
    the WORD is the verdict. They are read from different places on purpose. -/
def CheckReport.render (r : CheckReport) : List String :=
  r.obligations.map (fun p =>
      s!"obligation conforms-unverified entity={hexOfAddr p.fst} schema={hexOfAddr p.snd}")
    ++ r.violations.map Violation.render
    ++ [ (if r.ok then "check clean" else s!"check violations={r.violations.length}")
          ++ s!" objects={r.objectCount} schemas={r.schemaCount}"
          ++ s!" entities={r.entityCount} names={r.nameCount}" ]

end Shell
