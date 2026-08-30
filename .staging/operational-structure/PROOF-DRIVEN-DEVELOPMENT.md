# PROOF-DRIVEN-DEVELOPMENT — the contract debt, adapted from *Program Proofs*

Status: PROPOSAL, pre-grade, uncommitted. Written by the Fable
coordinator 2026-08-29 from a full parse of the book (liteparse,
markdown projection, 23,033 lines). Nothing below is implemented;
nothing below is minted. Every adaptation is priced against decision 2
(no new abstractions) and staged so that Phase 0 touches only the
proof stratum and docs.

Source: K. Rustan M. Leino, *Program Proofs*, MIT Press.
Local artifact: `program_proofs.pdf` (repo root),
SHA-256 `a14a98037799512eb343bdfe8efa4ff2022b09b08446ba8205b5e995fcddf025`,
25,299,717 bytes. **Pin owed**: this file has no row in
`.reference/provenance/sources.lock.json`; under C6 its definitions
may not inform gated work until the row lands. Proposed as slice 0.

---

## 1. The claim

The estate already owns the SEMANTIC half of verified development:
programs as content (`Prog`, R1; `PProg` tables, Defun.lean), meaning
in a reference handler (R10), runs receipted as words (WordWire, on
merge/cas-word), frames proved sound (`runP_frame_sound`,
Defun.lean:1965), invariants as `Word.wf` (Cas/IR/Word.lean:150), and
the carrier tied to the model by byte gates and word-equality
conformance (R5).

What it does not own is the CONTRACT half: a specification object
stated BEFORE a unit of work exists, and a process that refuses the
work when the object is missing. The book is a 400-page discipline for
exactly that half, and its vocabulary maps onto the estate's carriers
almost one-to-one (§4). The proposal: adopt the vocabulary as copy,
define the debt object formally over existing carriers, and make its
discharge the definition of done for every dispatched slice.

The estate's proof-grill batch (CORE-ABSTRACTIONS-PLAN.md §3 —
statement, decomposition, falsifier) is this discipline applied
RETROACTIVELY, to work that already exists. This proposal is the same
format turned PROSPECTIVE: the statement precedes the implementation,
always.

---

## 2. The debt object — what is owed, stated algebraically

Terms first.

- **State space.** `W` — the store word (a run's world). Predicates
  over states form the complete lattice `Pred(X) = X → Prop`, ordered
  pointwise (`P ≤ Q` iff every state satisfying `P` satisfies `Q`).
- **Program carrier.** `T` — the estate's `Prog` monad over an effect
  signature; semantics is a monad morphism `h : T → M` into a target
  that can loop (R3). A unit of work is a morphism `c : A → T B`.
- **Predicate transformer.** A monotone map
  `Pred(B × W) → Pred(A × W)`. Define `wp` by recursion on the
  carrier: `wp (pure a) Q = Q a`, `wp (bind m k) Q = wp m (λ a ⇒ wp
  (k a) Q)`, `wp (op e κ) Q = pre(e) ∧ ∀ r, wp (κ r) Q`. The bind law
  says `wp` sends sequential composition to transformer composition —
  this is the entire algebra of *Program Proofs* ch. 2 (§2.3 WP,
  §2.6 sequential composition) in one equation.
- **Refinement order.** `S ⊑ T` iff `∀ R, wp S R ≤ wp T R`. The
  **specification statement** `⌈P, Q⌉` is the most abstract program
  with precondition `P` and postcondition `Q` (Morgan's refinement
  calculus; the book's method-is-opaque rule, §1.4/§2.7, is the same
  idea: callers see only `⌈P, Q⌉`, never the body).
- **Variant.** `d : A × W → V` into a well-founded order `(V, ≺)`
  (book ch. 3). Estate form: fuel, with the existential-fuel
  discipline — "enough fuel is a conclusion, not a hypothesis"
  (Cas/Lang/Handler.lean:115-123).
- **Frame.** `F` — the address footprint a run may write (book
  ch. 14 `modifies`, ch. 16 `Repr`). Estate form: the addresses in
  the run's word; already theorem-ized on main
  (`runPFrom_frame_sound`, Defun.lean:1944).
- **Abstraction function.** `α : {r // V r} → Abs` from valid
  representations to the abstract value (book §9.3.1, §10.0.0).
  Estate form: the denotation relative to the reference handler.

**The debt.** On each new unit of work `c` against contract
`(P, Q, d, F)`, the formally-driven engineer owes not `c`, and not
the truth of the spec, but a **checked witness bundle**:

```
owed(c) = ⟨ σ , π , τ , ι , φ , γ ⟩
```

- `σ` (**statement**): the contract `(P, Q, d, F)` itself, stated in
  the proof language, dated BEFORE the body exists. Cheap, and the
  entire cadence hangs on its priority.
- `π` (**refinement**): a kernel-checked proof term
  `π : ∀ a, P a ≤ wp (c a) (Q a)` — equivalently `⌈P, Q⌉ ⊑ c`.
- `τ` (**termination**): `c` defined by well-founded recursion on
  `d`; every recursive edge strictly `≺`-decreases it.
- `ι` (**invariant preservation**): if `c` operates on a represented
  structure with invariant `V` and abstraction `α`, then per
  operation the homomorphism square commutes:
  `α (op_rep r) = op_abs (α r)`, and `V` is preserved. (This is the
  book's ch. 10 `Valid()` idiom and the estate's
  `wf`-preservation shape, e.g. `stepWorded_preserves_wf` on
  merge/cas-word.)
- `φ` (**frame**): for every predicate `R` whose free addresses miss
  `F`: `R` is invariant under `c`. Owed as a theorem about the
  model; DECIDABLE about any actual run, because the receipt
  (`LogEntry`: seq/at/address/tag/size) exhibits the footprint.
- `γ` (**conformance** — the debt the book does not have, because
  Dafny compiles its proof subject and we do not): the shipped
  carrier `c̃` (TypeScript) is tied to `c` by a decidable gate —
  byte equality of the generated surface, or word equality
  `word(h(c), v) = word(c̃, v)` on every admitted vector `v` (R5).

Equivalently, in one sentence: **the unit of work is an element of
the dependent pair `Σ c : T, ⌈P,Q⌉ ⊑ c` — code bundled with its
checked refinement witness — plus the gate that transports the
witness from the model to the carrier.** Development is then a chain
in the refinement order,

```
⌈P, Q⌉  ⊑  c₁  ⊑  …  ⊑  c   —(byte/word gate)→   c̃   —(word check)→  every recorded run
```

and "done" means every arrow in the chain is a checked object, none
a narrative.

The gap the operator named — "you can prove the theorem about the
function, but then you implement it in JavaScript" — is exactly the
`γ` component, and the estate already holds the machinery for it. The
new leverage is the LAST arrow: a contract whose decidable fragment
is stated over WORDS can be re-checked against every production run's
receipt, so the same object the theorem proves once is enforced at
runtime forever.

---

## 3. The process — five gates, contract first

The cadence the book teaches (its "summary of the development"
sections, §13.3.2, §13.4.7) made estate law:

1. **STATE.** The dispatch brief carries the contract as a Lean
   statement (holes allowed, falsifier named) before any
   implementation is authorized. A lane without `σ` is refused
   dispatch — refusal at the A bar, in the everyday register.
2. **PROVE.** `π, τ, ι, φ` discharged in the proof stratum, or
   explicitly staged with falsifiers (the §3 grill format,
   prospective).
3. **MATERIALIZE.** Surface generated, byte-gated (existing law,
   unchanged).
4. **CONFORM.** Vectors executed in the model, replayed on the
   carrier, word equality (existing R5 gate, unchanged).
5. **ENFORCE.** The decidable fragment of `Q` and all of `φ` checked
   against recorded words in the verify/test gates (new arm on an
   existing gate; ruling owed, §5 A3).

Brief template — five headings on every dispatched slice:

```
REQUIRES   — precondition over the starting word (run-relative, see §6.2)
ENSURES    — two-state postcondition (old = the starting word)
DECREASES  — the variant and its well-founded order (or: fuel, existential)
FRAME      — the address footprint (reads and writes)
FALSIFIER  — the run or counterexample that would refute it
```

"We would have caught the dumb stuff" is the STATE gate working:
writing `ENSURES` forces naming the data structure's invariant before
the body exists, which is where the dumb stuff lives.

---

## 4. The vocabulary — book term → estate referent (copy layer)

Adopted as brief-and-ruling copy. Meaning stays where it already
lives; the book supplies the words and the teaching register. Each
row cites the book section (parse: scratchpad projection) and the
estate carrier.

| Book term (§) | Estate referent |
|---|---|
| method contract, `requires`/`ensures` (§1.4) | the contract `σ` on a program (§5 A1) |
| Hoare triple `{P} S {Q}` (§2.2) | validity of a fueled run: from any word in `P`, the run halts and lands in `Q` |
| weakest precondition (§2.3) | `wp` by recursion on `Prog` (§5 A2) |
| strongest postcondition (§2.3) | the recorded word — a run's receipt IS its strongest-postcondition witness |
| `ghost` vs compiled (§1.6) | proof stratum vs materialized surface (R14, strata 2 vs 3–4) |
| `decreases`, well-founded relation (§3.1–3.2) | fuel; existential-fuel discipline (Handler.lean:115) |
| lemma, `calc` proof (§5.0, §5.4) | Lean theorem and `calc` — native, no adaptation |
| intrinsic vs extrinsic spec (§6.2) | gate (checked at every use) vs theorem batch (applied on demand); the book's default-extrinsic advice is directly a ruling rule for when a law becomes a door guard vs a grill lemma (§10.3.1's spectrum likewise) |
| abstraction function (§9.3.1) | denotation relative to the reference handler (R10) |
| export set (§9.2) | the admitted public surface — strata 1–2 (R14 stable API) |
| data-structure invariant, `Valid()` (§10.2.0) | `Word.wf` (Word.lean:150) and wf-preservation theorems |
| loop invariant, the loop rule (§11.0, §11.3) | invariant on the fueled step relation (`runWorded_preserves_wf` shape, merge/cas-word) |
| `modifies`/`reads`/`old`, frames (§14.0) | address footprint; frame soundness (Defun.lean:1944–1965); receipts make footprints decidable |
| `Repr`, dynamic frames (§16.2–16.3) | roots and reachability (Cas/Lang/Roots.lean; `cas verify` audits reachability today, commands.ts:1119) |

Ownership: program-contract terms → Effect Replay context
(docs/effect-replay/CONTEXT.md, which owns the store language);
process terms (the five gates, the brief headings) → Lab Core.
Minting is C4-gated; this table is the proposal, not the mint.

---

## 5. Data-structure adaptations — arms, not carriers

Decision 2 is the fence: no new sorts, no registry motion, kinds grow
by arms. Everything below respects it; A4 is the one item that would
touch the schema plane, and it is deliberately last and separately
ruled.

- **A1 — `Cas/Lang/Contract.lean` (Phase 0).** A Prop-level
  structure over existing types: `pre : Word → Prop`,
  `post : Word → Answers → Word → Prop` (two-state; the first
  argument is `old`), variant/fuel, `frame` as an address set; plus
  `Triple H p c : Prop` defined by the fueled run. This mints no
  sort — it is statement apparatus in the proof stratum, the same
  license under which the grill batch's statements already live.
- **A2 — `wp` on the program carrier (Phase 1).** Defined by
  recursion (on `PProg` tables it is a fold); the ch. 2 rules become
  the algebra lemmas (pure, bind, op); the equivalence
  `Triple ⟺ P ≤ wp c Q` is the anchor theorem. For straight-line
  tables with decidable predicates, `wp` is COMPUTABLE — mechanical
  verification-condition generation for free.
- **A3 — the decidable word fragment (Phase 2).** A closed MENU of
  checkable predicates over words and receipts — footprint ⊆ frame,
  tag counts, wf, and (once cas-word lands) `since`-suffix relations.
  A menu, not a logic: growth only by ruling, to kill
  predicate-language creep before it starts. Enforcement arm: extend
  the verify/test gates to check every recorded run against its
  program's declared contract. Candidate surface: an arm on
  `cas verify`; verb naming is CLI-lane business and owed a ruling —
  named here, not claimed.
- **A4 — contract as content (Phase 3, gated, priced separately).**
  Only if the process proves out: contracts become documents in the
  schema plane, so a published program's address travels WITH its
  contract's address and any host can audit a run against it. Grown
  the way Lane A grows references — an admitted-subset extension
  under its own ruling. Not before Phases 0–2 hold.

API for agents, net: the five-heading brief (STATE), the statement
file per lane (PROVE), and the contract check in the gates (ENFORCE).
No new CLI verb, no new MCP tool, no schema motion until A4's ruling.

---

## 6. Hard parts — where this must stay honest

1. **Host code is not the proof subject.** The book verifies the
   program it compiles; the estate's TypeScript is stratum 3–4 —
   theorems never reach it, only gates do (R14). Contracts BIND
   programs and generated surfaces; host seams (CLI plumbing, the
   daemon) get the word check and trust statements, never a
   soundness word. Any copy that suggests "the TS is verified" is a
   defect at the claim gate.
2. **Run-relativity.** A run's meaning is relative to its starting
   word (Programs.ts header, "A run's meaning is relative to its
   starting word"). `REQUIRES` must speak about the starting word
   explicitly; contracts quantified over all words are stronger and
   often wrong.
3. **Termination across the tower.** `interpret_through` collapses
   strata (R12); fuel composes but the composition lemma is owed
   before `τ` can be claimed for towered programs.
4. **Menu discipline.** A3 is the mint-pressure point — a predicate
   language wants to grow. The fence: fixed menu, growth by ruling,
   every addition priced against decision 2.
5. **Sequencing.** This lands on top of a full docket and two pending
   merges. Nothing here touches the merge floor: Phase 0 is one Lean
   file in the proof stratum plus docs. Recommended: ride as its own
   lane AFTER the current plan's first slice, or into the next
   docket; the STATE gate can be adopted for NEW briefs immediately
   at zero code cost.

---

## 7. Slices, in order

0. Pin the book (`sources.lock.json` row; identity in the header).
1. Vocabulary rows into the owning CONTEXT.md files (C4 grilling
   first; the §4 table is the draft).
2. Brief template + STATE-gate refusal into the dispatch discipline
   (docs only; effective for all new lanes).
3. A1 `Contract.lean` + the anchor statements, falsifiers named.
4. A2 `wp` + algebra lemmas + equivalence theorem.
5. A3 menu + enforcement arm on the gates (ruling for the verb).
6. Evaluate; only then price A4.

Slice 2 is the operator's lever: from that point, development is
forced through the contract, and everything after it merely deepens
what the contract can say and where it is checked.

---

## Addendum 2026-08-30 — ruled and partially landed

The operator ruled on presentation, with two amendments that now
govern this document:

1. **Host honesty is the true subject.** The discipline exists to
   generate better TypeScript — more expressive, more confident. A
   law that cannot reach the host through a gate or an executable
   falsifier is out of scope for the floor. §6.1 is thereby not a
   caveat but the point.
2. **Calibration, not ceremony.** The full proof `π` is not owed on
   every piece of work. The floor owed ALWAYS: the tightest
   algebraic description that would catch the correctness issues,
   the falsification equation for every law ("if you prove this,
   I'll admit I'm wrong"), and the red test battery derived from
   the falsifiers before implementation. Lean statements and gates
   are the escalation tier (strata 1–2 surfaces).
3. **Two roles, never one.** The one who writes the contract and
   battery is not the one who implements — two different processes
   completely. Only the packet crosses between them.

Slice 2 is LANDED as the project-level `implement` skill
(`.claude/skills/implement/`): SKILL.md the process (two roles —
breaker and implementer — one packet between them), CONTRACT.md the
debt object + the degree rule + the named obligation classes (no
tier ladders, by ruling), API.md what developing an API means,
BREAKER.md / IMPLEMENTER.md the two role projections of one shared
catalog, CATALOG.md + book-tags.json the catalog itself — 120 book
sections tagged with error states, laws, and falsifier shapes by a
10-agent codex wave (gpt-5.6-sol/luna, xhigh, 2026-08-30; codex
admission row in TOOLS.md still owed). The skill overrides the
generic user-level `implement` inside this repo and is invoked on
every piece of development. Slices 0–1 and 3–6 remain owed as
written.
