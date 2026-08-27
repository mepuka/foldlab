import Effects.Conformance.Markdown

/-!
# Conformance schema bundles

Scaffolding for the ratified conformance workflow (`CONFORMANCE-WORKFLOW.md`
sections 4, 5, and 10, with the M1 refinement recorded in its section 14):
each ratified schema family is a structure whose fields are the template's
holes, whose laws are proof fields, and whose anti-vacuity kit is also
fields. An obligation instance is a term of the family structure — a term
without its law or kit does not elaborate, so proved-without-kit is
unrepresentable for Lean-side artifacts.

Docstrings on each family carry the ratified sentence template; the
`sentence` field on each instance carries the filled plain-meaning sentence
in the minted domain vocabulary. The ledger emitter projects typed instances;
it never parses comments.

Instances arrive with the milestone slices (M2 for CODEC and
REJECTION-CLAUSE, M3 for the replay families). The registry below is
deliberately empty until then. Field shapes may be refined at Pass B through
the ordinary amendment path; a *new family* remains a stop condition.
-/

namespace Effects.Conformance

/-- One row of the conformance ledger, projected from a typed instance. -/
structure LedgerEntry where
  id : String
  family : String
  sentence : String
  deriving Repr

/-- Cross-cutting boolean-reflection form: one executable checker, one
judgment, one iff. Every family checker an instance declares should also be
packaged this way so both lanes share semantics through an executable
artifact. -/
structure Reflected (α : Type) where
  check : α → Bool
  prop : α → Prop
  reflects : ∀ a, check a = true ↔ prop a

/-- Generic two-case outcome envelope used by the HOMOMORPHISM family shape:
success of `A` or typed failure of `E`. A working label for the family
statement only — the M3 model carrier may refine it. -/
inductive Outcome (E A : Type) where
  | ok (a : A)
  | fail (e : E)

/-- SCHEMA WF-PRESERVE. Sentence template: "When <hypothesis>, one step from
a well-formed <state> yields a well-formed <state> — <domain gloss>."
Kit template: a well-formed positive case satisfying the hypothesis, and an
ill-formed raw state as the falsification witness. -/
structure WfPreserve (State Input : Type) where
  id : String
  sentence : String
  wf : State → Prop
  hyp : State → Input → Prop
  step : State → Input → State
  law : ∀ s i, wf s → hyp s i → wf (step s i)
  posState : State
  posInput : Input
  pos_wf : wf posState
  pos_hyp : hyp posState posInput
  negState : State
  neg_ill : ¬ wf negState

/-- SCHEMA TRACE-EXCLUDES. Sentence template: "In <guarded mode>, no step
ever emits <excluded decision> — <domain gloss>." Kit template: a positive
case inside the guarded mode, and a case outside the guarded mode where the
excluded decision does occur, proving the mode guard is not vacuous. -/
structure TraceExcludes (State Input Decision Mode : Type) where
  id : String
  sentence : String
  modeOf : State → Mode
  guarded : Mode
  decisions : State → Input → List Decision
  bad : Decision
  law : ∀ s i, modeOf s = guarded → bad ∉ decisions s i
  posState : State
  posInput : Input
  pos_mode : modeOf posState = guarded
  negState : State
  negInput : Input
  neg_mode : modeOf negState ≠ guarded
  neg_bad : bad ∈ decisions negState negInput

/-- SCHEMA EXACT-STEP. Sentence template: "When <hypothesis>, one reducer
step changes <measure> by exactly <delta> — <domain gloss>." Kit template: a
well-formed positive case satisfying the hypothesis, and a case where the
hypothesis fails, proving the hypothesis discriminates. -/
structure ExactStep (State Input : Type) where
  id : String
  sentence : String
  wf : State → Prop
  hyp : State → Input → Prop
  step : State → Input → State
  measure : State → Nat
  delta : Nat
  law : ∀ s i, wf s → hyp s i → measure (step s i) = measure s + delta
  posState : State
  posInput : Input
  pos_wf : wf posState
  pos_hyp : hyp posState posInput
  negState : State
  negInput : Input
  neg_hyp : ¬ hyp negState negInput

/-- SCHEMA FAIL-CLOSED. Sentence template: "When <hypothesis> fails, the
step rejects with a typed result and <measure> is unchanged — <domain
gloss>." Kit template: a well-formed case where the hypothesis fails and
rejection fires, and a case where the hypothesis holds, proving rejection is
not universal. -/
structure FailClosed (State Input Result : Type) where
  id : String
  sentence : String
  wf : State → Prop
  hyp : State → Input → Prop
  step : State → Input → Result × State
  isRejection : Result → Bool
  measure : State → Nat
  law_reject : ∀ s i, wf s → ¬ hyp s i → isRejection (step s i).1 = true
  law_frozen : ∀ s i, wf s → ¬ hyp s i → measure (step s i).2 = measure s
  posState : State
  posInput : Input
  pos_wf : wf posState
  pos_nohyp : ¬ hyp posState posInput
  negState : State
  negInput : Input
  neg_hyp : hyp negState negInput

/-- SCHEMA DISTINCTNESS. Sentence template: "Two occurrences with identical
<content> remain distinct <identities> — <domain gloss>." Kit template:
positive-only by shape — an exhibited content-equal pair; denying the law
itself would be the only falsification, so no negative witness field
exists. -/
structure Distinctness (State Input OccId Content : Type) where
  id : String
  sentence : String
  contentOf : Input → Content
  emit : State → Input → OccId × State
  law : ∀ s i i', contentOf i = contentOf i' →
    (emit s i).1 ≠ (emit (emit s i).2 i').1
  posState : State
  posInput : Input
  posInput' : Input
  pos_content : contentOf posInput = contentOf posInput'

/-- SCHEMA HOMOMORPHISM. Sentence template: "Interpretation respects return
and sequential bind across both outcome cases — <domain gloss>." Kit
template: one program interpreting to success and one to typed failure, so
both outcome cases are inhabited and the bind law is not vacuous on either
branch. -/
structure Homomorphism (Prog : Type → Type) (State E : Type) where
  id : String
  sentence : String
  pureP : ∀ {α : Type}, α → Prog α
  bindP : ∀ {α β : Type}, Prog α → (α → Prog β) → Prog β
  interp : ∀ {α : Type}, Prog α → State → Outcome E α × State
  law_pure : ∀ {α : Type} (a : α) (s : State), interp (pureP a) s = (Outcome.ok a, s)
  law_bind : ∀ {α β : Type} (p : Prog α) (k : α → Prog β) (s : State),
    interp (bindP p k) s =
      match interp p s with
      | (Outcome.ok a, s') => interp (k a) s'
      | (Outcome.fail e, s') => (Outcome.fail e, s')
  posState : State
  posOk : Prog Unit
  pos_ok : ∃ s', interp posOk posState = (Outcome.ok (), s')
  posFail : Prog Unit
  pos_fail : ∃ e s', interp posFail posState = (Outcome.fail e, s')

/-- SCHEMA CODEC. Sentence template: "Canonicalization is idempotent,
canonical values round-trip, and the encoding is injective on canonical
forms — <domain gloss>." Kit template: a value exercising the round trip,
and bytes the decoder rejects, proving the decoder is not constantly
accepting. -/
structure Codec (α Bytes : Type) where
  id : String
  sentence : String
  canon : α → α
  encode : α → Bytes
  decode : Bytes → Option α
  law_canon_idem : ∀ x, canon (canon x) = canon x
  law_roundtrip : ∀ x, decode (encode (canon x)) = some (canon x)
  law_inj : ∀ x y, canon x = x → canon y = y → encode x = encode y → x = y
  posVal : α
  negBytes : Bytes
  neg_rejects : decode negBytes = none

/-- SCHEMA REJECTION-CLAUSE. Sentence template: "Admission rejects exactly
the raw values a named clause condemns, and every rejection names its
clause — <domain gloss>." Kit template: a raw value that admits, and a raw
value rejected with its named clause. -/
structure RejectionClause (Raw Admitted Clause : Type) where
  id : String
  sentence : String
  admit : Raw → Except Clause Admitted
  clauseProp : Clause → Raw → Prop
  law_sound : ∀ r c, admit r = Except.error c → clauseProp c r
  law_complete : ∀ r, (∃ c, clauseProp c r) → ∃ c', admit r = Except.error c'
  posRaw : Raw
  pos_admits : ∃ a, admit posRaw = Except.ok a
  negRaw : Raw
  negClause : Clause
  neg_rejects : admit negRaw = Except.error negClause

/-- A declared mutant: never proof-bearing, never imported by the model,
existing only to be executed by the mutation tasks. `represents` is the
plain-meaning statement of what killing this mutant demonstrates. -/
structure Mutant (F : Type) where
  id : String
  attacks : String
  represents : String
  mutant : F

/-! ## Ledger projections -/

def WfPreserve.entry {State Input : Type} (b : WfPreserve State Input) : LedgerEntry :=
  { id := b.id, family := "WF-PRESERVE", sentence := b.sentence }

def TraceExcludes.entry {State Input Decision Mode : Type}
    (b : TraceExcludes State Input Decision Mode) : LedgerEntry :=
  { id := b.id, family := "TRACE-EXCLUDES", sentence := b.sentence }

def ExactStep.entry {State Input : Type} (b : ExactStep State Input) : LedgerEntry :=
  { id := b.id, family := "EXACT-STEP", sentence := b.sentence }

def FailClosed.entry {State Input Result : Type}
    (b : FailClosed State Input Result) : LedgerEntry :=
  { id := b.id, family := "FAIL-CLOSED", sentence := b.sentence }

def Distinctness.entry {State Input OccId Content : Type}
    (b : Distinctness State Input OccId Content) : LedgerEntry :=
  { id := b.id, family := "DISTINCTNESS", sentence := b.sentence }

def Homomorphism.entry {Prog : Type → Type} {State E : Type}
    (b : Homomorphism Prog State E) : LedgerEntry :=
  { id := b.id, family := "HOMOMORPHISM", sentence := b.sentence }

def Codec.entry {α Bytes : Type} (b : Codec α Bytes) : LedgerEntry :=
  { id := b.id, family := "CODEC", sentence := b.sentence }

def RejectionClause.entry {Raw Admitted Clause : Type}
    (b : RejectionClause Raw Admitted Clause) : LedgerEntry :=
  { id := b.id, family := "REJECTION-CLAUSE", sentence := b.sentence }

/-! ## Registry and emitter

The registry lists every instantiated (therefore proved-with-kit) obligation.
Pending obligations are exactly those in the plan's obligation ledger that
are absent here; the phase-1 ledger generator merges the two with the
TypeScript suite and mutation results. Empty until the M2/M3 slices land
their instances. -/

def registry : List LedgerEntry := []

/-- Lean-side ledger projection: the instantiated-obligation table plus one
sentence section per obligation, rendered through the typed emitter — never
by ad-hoc string concatenation. The phase-1 generator merges this projection
with the plan's obligation inventory and the TypeScript/mutation results. -/
def ledgerBlocks (rows : List LedgerEntry) : List Markdown.Block :=
  let title := Markdown.Block.h1 "Conformance ledger — Lean-side projection"
  if rows.isEmpty then
    [title, .p [.text "No instantiated obligations yet."]]
  else
    let table := Markdown.Block.table {
      headers := ⟨#["ID", "Family"], rfl⟩
      rows := rows.map fun r => ⟨#[⟨[.text r.id]⟩, ⟨[.text r.family]⟩], rfl⟩
    }
    let sections := rows.flatMap fun r =>
      [Markdown.Block.h2 r.id, .p [.text r.sentence]]
    title :: table :: sections

def emitLedger (rows : List LedgerEntry) : String :=
  Markdown.render (ledgerBlocks rows)

#guard emitLedger registry ==
  "# Conformance ledger — Lean-side projection\n\nNo instantiated obligations yet.\n"

instance : Markdown.ToMarkdown (List LedgerEntry) where
  blocks := ledgerBlocks

end Effects.Conformance
