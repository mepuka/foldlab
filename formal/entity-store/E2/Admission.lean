/-
`Admissible` — the whole-store judgment, and the module that OWNS it (ruling W3-3:
`E2/Admission` owns the judgment, `admissibleReport`, the carrier-level verdicts, and
`ObligationM19_transport`). Structure transcribed from `R3-transport-admission.md` §6,
with the per-object clause updated to window B's strengthened `WFS`.

WHAT THIS MODULE IS FOR. `Reachable` is the LEGALITY CONSTRUCTION — how a store can be
built. `Admissible` is WHAT VERIFICATION ESTABLISHES — what an opened candidate can be
checked to satisfy. They are different judgments and the bridge between them is M19,
stated and unproved (W3-2). A scan NEVER "establishes reachability"; it establishes
`Admissible` (F-33's lesson, and the avoid-list entry in the CONTEXT glossary).

THE `Conforms` CLAUSE IS DELIBERATELY EXCLUDED. `Admissible` is the conjunction of every
DECIDABLE legality clause. Conformance is not decidable today —
`ObligationM18_conforms_decidable` is an obligation record, not a theorem — so folding a
`Conforms` clause in here would make `Admissible` undecidable while its name and its
`admissibleReport` both promise otherwise. The CONTEXT glossary states the rule directly:
never treat `Admissible` as containing `Conforms` while M18 is an obligation record.

What survives of R3 §1.5's refutation is the DECIDABLE half — the kind-aware clause
`schemaTyped`, which is R3 §1.4's `C_obstruction`: the address an entity names must hold
a SCHEMA pre-image, and "present as bytes" is strictly weaker than "present as a schema".
The undecidable half — R3 §1.5's `D_no_conformance`, `¬ Conforms env (.prim .int)
(.vstr n)` — is REAL and M19 cannot drop it. It therefore rides on M19's own premise
list, outside `Admissible`. See `ObligationM19_transport` below.

TWO SIGNATURE NOTES, reported to the coordinator rather than improvised silently:

1. `Admissible` takes `H` but NOT `env`. The CONTEXT glossary writes the judgment form
   as `StoreMap → Prop`; WF1 (`hashed`) is meaningless without an `H`, so `H` stays.
   `env` was R3 §6's parameter only because its `typed` clause carried `Conforms`; with
   that clause excluded, nothing here mentions an environment, and keeping an unused
   parameter would suggest a dependency the judgment does not have.
2. M17 and M17′ are stated HERE, not in `E2/Model.lean` where the rest of window B's
   statements land. Both quantify over `resolveSchema` / `resolveEntity`, which live in
   `E2/Resolve.lean` — downstream of `E2/Model.lean`, and frozen. This module is the
   first point in the import DAG where their vocabulary exists.
-/
import E2.Model
import E2.Graph

namespace E2

/-! ## Carrier-level verdicts (W3-3). The predicates themselves are DEFINED in
    `E2/Model.lean` because they are `WFS` conjuncts and `WFS` is `Reachable.putS`'s
    premise — the import DAG forces it, and the topology note in that module records
    why. Ownership is unchanged: the public surface is this module's, and W3-3's rule
    stands — the shell calls `admissibleReport`, never these directly. -/

/-- The decision procedure for `WFS`, in the gated core so the boundary CALLS it rather
    than re-implementing the conjunction. A single named core call with an iff-theorem
    to the model's premise is what makes the boundary check PROVABLY the model's
    premise rather than incidentally equal to it (R-C §1.2).

    Five clauses as of window B: closed, guarded, duplicate-free, canonically spelled
    (W3-17), literal-narrowed (W3-18). -/
def wfsB (s : SchemaCore) : Bool :=
  closedB 0 s && guardedB s && dupFreeS s && canonicalSpellingB s && litNarrowB s

theorem wfsB_iff (s : SchemaCore) : wfsB s = true ↔ WFS s := by
  simp [wfsB, WFS, Bool.and_eq_true, and_assoc]

/-- The value plane's admission, named so the boundary's call is auditable rather than
    an anonymous `dupFreeV` at a call site. A-3 delegated this to a boundary check that
    F-33 showed does not exist; W3-9 moved the entity-value route into `Reachable.putE`
    and this is the same clause on the candidate side. -/
def wfvB : Value → Bool := dupFreeV

/-- Carrier-level admission verdict, schema plane: the first failing `WFS` clause by
    name, or `none` when admissible. The shell's PUT rejection consumes THIS — the
    boundary calls Admission's surface and never the clause predicates (CONTEXT
    avoid-list; W3-12). The clause names are the rejection vocabulary. -/
def schemaAdmissionClause (s : SchemaCore) : Option String :=
  if !closedB 0 s then some "closed"
  else if !guardedB s then some "guarded"
  else if !dupFreeS s then some "dup-key"
  else if !canonicalSpellingB s then some "spelling"
  else if !litNarrowB s then some "lit-narrow"
  else none

theorem schemaAdmissionClause_none_iff (s : SchemaCore) :
    schemaAdmissionClause s = none ↔ wfsB s = true := by
  cases h1 : closedB 0 s <;> cases h2 : guardedB s <;> cases h3 : dupFreeS s <;>
    cases h4 : canonicalSpellingB s <;> cases h5 : litNarrowB s <;>
    simp [schemaAdmissionClause, wfsB, h1, h2, h3, h4, h5]

/-- Carrier-level admission verdict, value plane. -/
def valueAdmissionClause (v : Value) : Option String :=
  if !wfvB v then some "dup-key-value" else none

theorem valueAdmissionClause_none_iff (v : Value) :
    valueAdmissionClause v = none ↔ wfvB v = true := by
  cases h : wfvB v <;> simp [valueAdmissionClause, h]

/-! ## The judgment. -/

/-- What a delivered directory presents, once opened. Every clause is decidable, and
    every clause is (or should be) a verification-on-open check.

    ANTI-CLAIM. `Admissible` is not `Reachable` and does not imply it without M19; M19
    in turn is unproved and carries a conformance premise this structure does not
    supply. SH5 narrows to **`Admissible`, never `Reachable`** (W3-12). -/
structure Admissible (H : Bytes → Address) (σ : StoreMap) : Prop where
  /-- Key-functional: one byte string per address. A directory gives this for free
      (one file per name); `reachable_keys_nodup` is the converse. -/
  functional : (Keys σ).Nodup
  /-- WF1 — check 0 of the scan. -/
  hashed : ∀ d b, σ.find d = some b → H b = d
  /-- Checks 1 + 2 AND the admission clause the shell does not yet run: the bytes are
      the pre-image of a WELL-FORMED carrier that is ALREADY CANONICAL. Canonicity is
      what makes `refsS s = refsS (canonS s)`, which the reconstruction step needs and
      which `mem_refsS_canon` alone — one-directional — does not give (R3 §1.8).

      The entity branch carries `dupFreeV` (W3-9): with `canonV v = v` it is literally
      `Reachable.putE`'s new premise `dupFreeV (canonV v) = true`, so no value-plane
      B3 twin is needed to cross this particular bridge. -/
  admitted : ∀ d b, σ.find d = some b →
      (∃ s, WFS s ∧ canonS s = s ∧ b = preimageS s)
    ∨ (∃ sa v, canonV v = v ∧ dupFreeV v = true ∧ b = preimageE sa v)
  /-- WF2 — check 3, over STORED BYTES, never over a carrier in hand. -/
  closed : ∀ d b, σ.find d = some b →
      ∃ rs, refsOfPreimage b = some rs ∧ AllResolve σ rs
  /-- Check 4 — the KIND-AWARE half of the typing precondition. Naive ref-closure does
      not give it: R3's pathology C is ref-closed, finite, and acyclic, yet its third
      element is uninsertable because the address it names holds an ENTITY pre-image
      (`C_obstruction`, `entity_is_never_a_schema`, both by `kind_separation`). -/
  schemaTyped : ∀ d sa v, σ.find d = some (preimageE sa v) →
      ∃ s, σ.find sa = some (preimageS s)
  /-- WF3 as a HYPOTHESIS. It is NOT implied by the clauses above
      (`HEADLINE_wf1_wf2_insufficient`: WF1 + WF2 admit a cyclic candidate), and it is
      the clause verification-on-open does not currently compute (F-32). -/
  acyclic : Acyclic σ

/-! ## The decision procedure (W3-3: the shell consumes THIS, never the clauses). -/

def addrListNodupB : List Address → Bool
  | [] => true
  | a :: rest => !addrMem a rest && addrListNodupB rest

/-- WF1, decided. Checked over every entry rather than only over `find`-reachable ones;
    under `functional` the two coincide, and outside it the stronger reading is the
    safe one. -/
def hashedB (H : Bytes → Address) (σ : StoreMap) : Bool :=
  σ.all (fun p => decide (H p.2 = p.1))

/-- The per-object admission verdict: well-formed, already canonical, and byte-identical
    to its own re-encoding. The re-encode-and-compare is what turns "decodes to `s`"
    into "IS `preimageS s`". Per W3-13 the well-formedness test precedes the canonicity
    byte-compare, because `ObligationCanonIdempotent` is conditional on `dupFreeS` and
    the byte-compare's verdict is meaningless outside that hypothesis (F-40/F-41).

    W3-19/F-48 (2026-08-25) RETIRES THAT BASIS AND STRENGTHENS THE ORDER. S1 is now
    unconditional, so the byte-compare's verdict is meaningful everywhere — but the
    ordering matters MORE, not less. A stable sort makes EVERY duplicate-key carrier a
    canonicity fixed point, not merely the palindromic ones F-40 found, so the
    byte-compare no longer catches any of them. The `dupFreeS` conjunct of `wfsB` is now
    the sole instrument that does, and `&&` short-circuits left to right: `wfsB` runs
    first and rejects the whole duplicate-key family before canonicity is consulted.
    This is exactly the precondition W3-19 sequenced the flip behind (merge af13824).
    Reordering these conjuncts, or dropping `dupFreeS` from `wfsB` on the grounds that
    the sort now "handles" duplicates, would re-open F-40 in its general form — and
    would be a boundary-check weakening, which W3-16 permits only by ruled amendment
    citing an F-number. -/
def admittedB (b : Bytes) : Bool :=
  match b with
  | v :: k :: body =>
      if v == versionByte && k == kindSchema then
        match decodeSchema body with
        | some s => wfsB s && decide (canonS s = s) && decide (encSchema s = body)
        | none => false
      else if v == versionByte && k == kindEntity then
        match decAddr body with
        | some (sa, rest) =>
          match decodeValue rest with
          | some w =>
              wfvB w && decide (canonV w = w)
                && decide (encAddress sa ++ encValue w = body)
          | none => false
        | none => false
      else false
  | _ => false

/-- WF2, decided over stored bytes. -/
def refClosedB (σ : StoreMap) : Bool :=
  σ.all (fun p =>
    match refsOfPreimage p.2 with
    | some rs => rs.all (fun a => (σ.find a).isSome)
    | none => false)

/-- Is this byte string a schema pre-image? Kind byte only — the cheapest form of
    `kind_separation`, and the whole content of check 4. -/
def isSchemaPreimageB : Bytes → Bool
  | v :: k :: _ => v == versionByte && k == kindSchema
  | _ => false

/-- Check 4, decided: every stored entity's declared schema address holds a SCHEMA. -/
def schemaTypedB (σ : StoreMap) : Bool :=
  σ.all (fun p =>
    match p.2 with
    | v :: k :: body =>
        if v == versionByte && k == kindEntity then
          match decAddr body with
          | some (sa, _) =>
            match σ.find sa with
            | some sb => isSchemaPreimageB sb
            | none => false
          | none => false
        else true
    | _ => true)

/-- One `Bool` per `Admissible` clause. The shell's named rejections and its `check`
    verdict lines are derived from these fields — naming the failing clause is not
    decoration: a single `not-admissible` verdict would leave the differential harness
    unable to tell a `closedB` fix from a `guardedB` fix (R-C §1.2). -/
structure AdmissionReport where
  functional : Bool
  hashed : Bool
  admitted : Bool
  closed : Bool
  schemaTyped : Bool
  acyclic : Bool

/-- Clean exactly when every clause passed. Exit 0 is this being `true`; exit 1 is this
    being `false`; a store that could not be READ has no verdict at all and exits 2
    (the `StoreFault` class — never folded into class 1, F-42's collapse). -/
def AdmissionReport.clean (r : AdmissionReport) : Bool :=
  r.functional && r.hashed && r.admitted && r.closed && r.schemaTyped && r.acyclic

def admissibleReport (H : Bytes → Address) (σ : StoreMap) : AdmissionReport where
  functional := addrListNodupB (Keys σ)
  hashed := hashedB H σ
  admitted := σ.all (fun p => admittedB p.2)
  closed := refClosedB σ
  schemaTyped := schemaTypedB σ
  acyclic := (topoOrder σ).isSome

/-- The decidability bridge: the report decides the judgment. STATED, UNPROVED (W3-3
    permits this). Its acyclicity leg is exactly `ObligationTopoComplete`, which is why
    W3-12 lands Kahn's and this judgment in the same package. -/
def ObligationAdmissibleReportDecides : Prop :=
  ∀ (H : Bytes → Address) (σ : StoreMap),
    (admissibleReport H σ).clean = true ↔ Admissible H σ

/-! ## The bridge, and the typing-plane statements. -/

/-- M19 — transport adequacy (G8), in R3 §6's form CORRECTED for the exclusion of the
    `Conforms` clause from `Admissible`. Any admissible candidate whose stored entities
    additionally conform is reachable: there is an insertion order that builds exactly
    it, and `topoOrder` computes one.

    WHY THE SECOND PREMISE IS SEPARATE, and why it cannot simply be dropped. R3 §1.5
    refuted the conformance-free reading with a kernel witness: the candidate
    `{preimageS (.prim .int), preimageE a (.vstr "x")}` is key-functional, hashed,
    ref-closed, kind-correct and acyclic — every clause of `Admissible` — and is still
    uninsertable, because `¬ Conforms env (.prim .int) (.vstr n)` for EVERY environment.
    So M19 needs conformance. But conformance is undecidable pending M18, and
    `Admissible` is the decidable judgment. The clause therefore sits on M19's premise
    list, where it is visibly the thing verification does NOT establish, rather than
    inside a judgment whose name promises decidability.

    Stated in the (i-a) idiom: `Admissible.admitted` supplies `canonS s = s` and
    `canonV v = v`, so this premise is `Reachable.putE`'s premise on the nose.

    ANTI-CLAIMS. Says nothing about the delivery mechanism — only about the opened
    candidate. Says nothing about `H`'s collision behaviour: the candidate IS a map, so
    a colliding `H` shows up as pre-images ABSENT from the directory, an availability
    question, never an unreachable target. Says nothing about UNIQUENESS of the order —
    that is M11's commutation half.

    STATED, UNPROVED. -/
def ObligationM19_transport : Prop :=
  ∀ (H : Bytes → Address) (env : ConformsEnv) (σ : StoreMap),
    Admissible H σ →
    (∀ d sa v, σ.find d = some (preimageE sa v) →
        ∃ s, σ.find sa = some (preimageS s) ∧ Conforms env (canonS s) (canonV v)) →
    Reachable H env σ

/-- M17 — typed reachability as a post-hoc invariant, restated over window B's premises.
    On a reachable store, every stored entity's schema resolves and its value conforms.

    NO `H`-INJECTIVITY HYPOTHESIS. The probe's form carried one
    (`R1-p4_m17.lean:128-135`); under route (i-a) it is not needed, and the reason is
    structural: the inserted-schema case is closed by BYTE-LEVEL kind separation
    (`resolveEntity` fails at `stripPre kindEntity`), and the inserted-entity case is
    closed because `Reachable.putE`'s premise IS the goal. Old-binding cases go through
    `M13_frame`. (R-D §3.1's skeleton; UNVERIFIED — no seat has run.)

    ANTI-CLAIM (W3-11, posture (a)). M17 certifies conformance AS THIS MODEL DEFINES
    `Conforms`, and `Conforms` does not observe the union `mode` byte (ruling Q12).
    Under `mode = oneOf` a value matching more than one member still conforms here.
    Typed reachability is therefore certified UP TO UNION-MODE BLINDNESS. The price is
    named rather than paid: posture (b) was rejected on strict positivity, and
    `anyOfOnly` was rejected because it would REJECT-v1 a construct MAPPING row 26
    admits (F-36).

    ANTI-CLAIM (env-relativity). `.ref` nodes inside the stored schema are typed through
    `env.res`, which nothing ties to the store. M17 certifies conformance IN THE AMBIENT
    ENVIRONMENT, not IN THE STORE. The store-coherent statement is M17′, below; under
    (i-a) it is the only remaining hole in STORE-MODEL §5's sentence.

    STATED, UNPROVED. -/
def ObligationM17_typed_reachability : Prop :=
  ∀ (H : Bytes → Address) (env : ConformsEnv) (σ : StoreMap), Reachable H env σ →
    ∀ (d sAddr : Address) (w : Value) (s : SchemaCore),
      resolveEntity H σ d = some (sAddr, w) →
      resolveSchema H σ sAddr = some s →
      Conforms env s w

/-- The environment whose `.ref` resolver IS the store's own schema resolution. The
    check semantics stay a parameter — the R-4 allowlist is still open, and pinning it
    here would smuggle a ruling. -/
def storeEnv (H : Bytes → Address) (σ : StoreMap)
    (checkSem : Check → Value → Prop) : ConformsEnv where
  checkSem := checkSem
  res := resolveSchema H σ

/-- M17′ — resolver coherence: M17 over the store's own environment. This is M17 with
    the ambient-environment hole closed, and it has never been stated anywhere until
    now (`Model.lean`'s OWED block and `Bridge.lean`'s header both recorded it as owed).

    Note the shape: `Reachable` is taken over `storeEnv H σ checkSem`, so the store's
    own resolution is the yardstick on both sides of the implication.

    STATED, UNPROVED. -/
def ObligationM17'_store_env : Prop :=
  ∀ (H : Bytes → Address) (checkSem : Check → Value → Prop) (σ : StoreMap),
    Reachable H (storeEnv H σ checkSem) σ →
    ∀ (d sAddr : Address) (w : Value) (s : SchemaCore),
      resolveEntity H σ d = some (sAddr, w) →
      resolveSchema H σ sAddr = some s →
      Conforms (storeEnv H σ checkSem) s w

end E2
