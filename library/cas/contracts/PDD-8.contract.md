# PDD-8 — the contract packet: interpretation's universal property, and the tower's monoid

Ticket: `.staging/wave-2/PDD-8.md`. Process: `.claude/skills/implement/`
(SKILL.md, CONTRACT.md, IMPLEMENTER.md). Owed-ledger item 5 of
`.staging/algebraic-review/THE-ALGEBRA.md` (§2.2, §2.4, §3.3). Authored
before `library/cas/Cas/Backend/Universal.lean` exists and committed
ahead of it, so the history carries the order.

```
CATEGORIES algebraic-laws, lemmas-proofs, abstraction-modules,
           proof-mechanics
```

CATALOG rows opened for those tags (`.claude/skills/implement/CATALOG.md`),
and what each contributed:

- **§6.2 Intrinsic versus Extrinsic Specifications** (`lemmas-proofs,
  algebraic-laws`) — "multi-call algebraic facts are proved
  extrinsically, by induction". Every law below is multi-call
  (uniqueness compares two handlers, existence compares a morphism to an
  interpretation, associativity compares two composites), so none is
  intrinsic to a definition and all of them are separate declarations
  proved by induction on `Prog`. It also supplies the SHAPE of the unit
  and associativity laws that §6 of the castle instantiates for
  `through`.
- **§9.5 Summary** (`abstraction-modules, algebraic-laws`) —
  "abstraction-operation commutation: for each concrete operation there
  is an abstract one with `Abs(opC(c,x)) = opA(Abs(c),x)". Here the
  abstraction function is `interpret` itself: it carries the syntactic
  operations of `Prog S` to the target monad's, and L13 IS that
  commutation square stated once. §9.5's other law —
  representation-independent client proof — is why the packet's
  claim-scope names what a client may NOT unfold: `interpret`'s
  recursion is not the client's business, the four laws are.
- **§9.2 Export Sets** and **§9.1 Module Imports** (`abstraction-modules`)
  — "close the surface over every name the exported material mentions",
  and "imports explicit and hierarchical, never cyclic". Both bite on the
  FILE frame: the castle imports `Cas.Lang.Representation` and nothing
  else, adds no name to any exported ledger, and the placement note in
  its docstring is §9.1's discipline applied to a Lake glob rather than
  to a Lean import.
- **§B.7 Universal Quantification** and **§B.8 Existential
  Quantification** (`proof-mechanics`) — "universals are proved for
  arbitrary; existentials are discharged by exhibiting the witness", and
  §B.7's warning about "an unused variable eliminated over an EMPTY type,
  turning `forall x :: true` into an incorrect claim". That warning is
  the source of falsifier F-ONETYPE below: read at a single answer type,
  L17's hypothesis can be vacuous, because `Prog S Empty` is uninhabited.
  L18 is the existential, and it is discharged by producing the handler,
  not by an argument that one exists.
- **§B.6 Free Variables and Substitution** (`proof-mechanics`) — the
  polymorphic `φ : {A : Type} → Prog S A → M A` is substituted at
  `A := S.Ans op` inside its own `bind_law`; the binder discipline is the
  whole reason the morphism predicate quantifies over types rather than
  fixing one.

## The degree claim

**I have shown algebraically that this can be implemented at the Lean
escalation tier.** Every law below is a Lean statement over the shipped
`Handler` / `interpret` / `Handler.through` / `idHandler` / `run`
declarations, proved to the kernel with no `sorry`, no `native_decide`,
and no new axiom; every falsifier is a formal counter-theorem whose
witness the kernel evaluates.

Axiom census, stated in advance and verifiable declaration by
declaration: `propext` and `Quot.sound` only — `Quot.sound` through
`funext` wherever `Handler.ext` is used, `propext` through `simp`. No
`Classical.choice`, no `sorryAx`. Four declarations depend on NO axiom at
all (`interpret_vis`, and the three falsifiers `uniqueness_needs_lawful`,
`single_type_agreement_is_not_enough`, `bind_law_is_load_bearing`) — the
falsifiers are computations, which is what makes them witnesses rather
than arguments.

**The escalation gate is named, and it is a NEGATIVE gate.** This slice
adds theorems only. Nothing it proves reaches the host as new bytes, so
`γ` is discharged by byte-identity of every generated surface under
`mise run check:cas` — the claim is "the model gained theorems and the
emitted TypeScript did not move", and a red `--check` refutes it. There
is no host battery because there is no host change; per CONTRACT.md
§Escalation this packet's floor is the Lean statement plus the byte gate,
and it is written down rather than implied.

## Prior art, and what was done with it

`.staging/algebraic-review/handlers-semantics-exhibits.lean` §3–§5 carries
the review's sketches for L16, L17, L18, L34 and L35, kernel-checked at
main `7dac14d8`. The ticket's instruction is "verify, use, cite", so they
were re-elaborated against this worktree's HEAD BEFORE this packet was
written — trusting an uncommitted, gitignored file would be exactly the
provenance failure C6 exists to prevent. Result: **every sketch survives
as written.** One strengthening was found and is taken into the laws
below — the existence sketch (§4) declares `[LawfulMonad M]` and never
uses it, so L18 is stated at a bare `Monad`. That is a strictly stronger
theorem, not a refutation, so it is recorded here and not in the break
ledger.

## The algebra

Carriers, all shipped, none new:

```
Sig                    Cas/Lang/Sig.lean:13      operations + answer types
Prog S A               Cas/Lang/Prog.lean:25     the free-monad carrier
Handler S M            Cas/Lang/Handler.lean:42  one field: handle
interpret h            Cas/Lang/Handler.lean:47  the induced map
idHandler              Representation.lean:63    every operation means itself
Handler.through        Cas/Lang/Tower.lean:65    the tower's composition
run H fuel             Cas/Lang/Interp.lean:146  the fueled small-step run
```

One piece of statement apparatus, proof stratum only, minting no sort,
kind, or registry row (PDD-2's licence, decision 2):

```
IsMonadMorphism S φ  for  φ : {A : Type} → Prog S A → M A
  pure_law  ∀ a,     φ (Prog.pure a) = pure a
  bind_law  ∀ p f,   φ (p.bind f)    = φ p >>= fun a => φ (f a)
```

It exists because the estate has the two halves in two files
(`interpret_pure`, `Representation.lean:110`; `interpret_bind`,
`Handler.lean:53`) and no declaration naming their conjunction — which is
THE-ALGEBRA L13's complaint — and because it is also the HYPOTHESIS class
L18 needs. One definition, both jobs.

The polymorphism is not decoration: `bind_law` is instantiated at
`A := S.Ans op` inside the induction, so a predicate fixing one `A` would
not prove L18.

```
REQUIRES   `Monad M` for every statement (interpretation needs it to
           exist). `LawfulMonad M` for exactly three: L13, L17 and
           `through_id_left` — and where it is required it is LOAD-
           BEARING, which is falsifier F-LAWFUL, not a remark. Nothing
           requires anything of `H`: the one statement that mentions an
           address function (BOUND) is universally quantified over it,
           per this lane's CAS-003 discipline.

           There is no starting-word precondition and no run-relative
           reading to preserve: nothing in this slice runs anything
           except the two closed computations of BOUND, whose starting
           word is written into the statement.

ENSURES    Every declaration under contract is a pure function of its
           arguments or a proposition about them. There is no second
           state and `old` is vacuous.

DECREASES  Structural recursion on `Prog S A`, whose `vis` child is the
           continuation applied to an answer (CATALOG §4.3: recurse on
           structurally included children and the decrease is free). No
           new recursion is introduced beyond `phiDrifts`, the F-BIND
           witness, which is structural on the same carrier. No fuel is
           quantified over anywhere: BOUND names its two fuels as
           literals.

FRAME      Reads: the declarations listed under "the algebra". Writes:
           nothing — no state, no store, no address, no byte.

           The FILE frame is the load-bearing half. This slice adds ONE
           new module and edits NO existing file: not `Handler.lean`,
           not `Interp.lean`, not `Tower.lean`, not `Representation.lean`,
           not `lakefile.toml`, not any generated surface. It also adds
           no `Cas.Backend.*` row to `Walk.libraryImports`
           (`tools/Walk.lean:45-55`), so the surface, obligation and law
           ledgers do not move either. That is what makes the negative
           byte gate a real gate rather than a formality.
```

## The file frame's one honest cost — where the module lives

The statements are about `Cas/Lang/`. The module is at
`library/cas/Cas/Backend/Universal.lean`, and that is a MECHANICAL
consequence of the fence, disclosed here because a reader who finds a
Lang theorem under `Backend/` deserves to be told why:

- `lake --wfail build` builds a module only if some `[[lean_lib]]` glob
  matches it. The `Cas` library's glob is its root module alone, so a new
  `Cas/Lang/*.lean` that nothing imports is NOT kernel-checked — verified
  empirically, by planting a `sorry` under `Cas/Lang/` and watching
  `--wfail` stay green.
- `Cas.Backend.+` is the only glob in `lakefile.toml` that picks up a new
  module without editing the lakefile, and the ticket's fence forbids
  editing it. The same `sorry` planted under `Cas/Backend/` turns
  `--wfail` red, so the placement buys a real gate.
- `Cas.Backend.*` leaves are named ONE BY ONE in `Walk.libraryImports`,
  and this one is not named, so the module is outside the ledgers'
  environment and moves no byte.

This is the device `Cas/Backend/Canon.lean` (PDD-1) and the `CasWp`
library (PDD-2) already use, taken for the same reason. Promoting the
module into `Cas/Lang/` and into the walk is a promotion, and a promotion
is a ruling — not a side effect of this slice.

## The laws, each with its falsifier

```
LAW  L12  THE UNFOLDING LAW, stated once and generally.
          interpret h (.vis op k)
            = h.handle op >>= fun a => interpret h (k a)
FALS L12  exhibit h, op, k where the two sides differ.
BATT L12  Universal.lean — `interpret_vis`. It is `rfl`; the content of
          the law is that it has a NAME, because today the estate
          restates it locally at each use and generally nowhere
          (THE-ALGEBRA §3.21).

LAW  L13  INTERPRETATION IS A MONAD MORPHISM, as ONE statement.
          IsMonadMorphism S (fun p => interpret h p),
          for every handler into every lawful target.
FALS L13  exhibit h, p, f with
          interpret h (p.bind f) ≠ interpret h p >>= (interpret h ∘ f),
          or h, a with interpret h (.pure a) ≠ pure a.
BATT L13  Universal.lean — `interpret_isMonadMorphism`. The two halves
          are the estate's own `interpret_pure` and `interpret_bind`;
          the declaration is the conjunction those two files do not
          have.

LAW  L16  HANDLER EXTENSIONALITY.
          (∀ op, h.handle op = g.handle op) → h = g
FALS L16  exhibit h ≠ g agreeing on every operation.
BATT L16  Universal.lean — `Handler.ext`.

LAW  L17  UNIQUENESS. interpret h = interpret g → h = g, in two forms:
          SHARP  (∀ op, interpret h (Prog.op op)
                          = interpret g (Prog.op op)) → h = g
          FULL   (∀ A p, interpret h p = interpret g p) → h = g
FALS L17  exhibit h ≠ g whose interpretations agree everywhere.
BATT L17  Universal.lean — `handler_eq_of_interpret_op_eq`,
          `handler_eq_of_interpret_eq`.
NOTE L17  The FULL form is spelled at every answer type on purpose:
          `interpret h` is not one function (`A` is implicit), so
          "the interpretations are equal" has no weaker honest reading
          — see F-ONETYPE.

LAW  L18  EXISTENCE. Every monad morphism out of `Prog S` IS an
          interpretation, and the handler is recovered from the
          morphism's own action on single operations:
          IsMonadMorphism S φ →
            ∀ p, φ p = interpret ⟨fun op => φ (Prog.op op)⟩ p
          and hence ∃ h, ∀ A p, φ p = interpret h p.
FALS L18  exhibit φ satisfying both morphism laws and a program p with
          φ p ≠ interpret h p for EVERY handler h — equivalently, for
          the one handler L18 names, since L17 says there is no other
          candidate.
BATT L18  Universal.lean — `interpret_of_isMonadMorphism`,
          `exists_handler_of_isMonadMorphism`.
NOTE L18  Stated at a bare `Monad M`. The review's §4 sketch declares
          `[LawfulMonad M]` and does not use it; verification found
          that and the hypothesis is dropped.

LAW  UP   THE UNIVERSAL PROPERTY — L16 + L17 + L18 together.
          Every monad morphism out of `Prog S` is induced by EXACTLY
          ONE handler.
FALS UP   exhibit a morphism induced by two different handlers, or by
          none.
BATT UP   Universal.lean — `existsUnique_handler`. This is the theorem
          `EFFECTS-BACKEND.md:263`'s "INITIAL" and `Lang.lean:21`'s
          "free monad" were naming, and until it lands both are pending
          words per C5 (THE-ALGEBRA §3.3). It is NOT
          `eq_of_forall_interpret`, which is `interpret_id` plus a
          specialization at the syntactic monad.

LAW  PIN  ADEQUACY — the property pins `interpret`, it does not merely
          admit it. Any operator I : Handler S M → ∀ {A}, Prog S A → M A
          such that (a) every `I h` is a monad morphism and (b)
          I h (Prog.op op) = h.handle op, satisfies I h p = interpret h p
          at every h, A and p.
FALS PIN  exhibit a wrong-but-passing interpreter: an I satisfying (a)
          and (b) that disagrees with `interpret` somewhere.
BATT PIN  Universal.lean — `interpret_pinned`. This is the obligation
          class the whole process turns on ("is Q strong enough that no
          wrong implementation passes?"), and it is discharged rather
          than argued: there is NO wrong-but-passing interpreter.

LAW  L34  `through` IS ASSOCIATIVE.
          (t.through u).through h = t.through (u.through h)
FALS L34  exhibit t, u, h and an operation where the two composites
          disagree.
BATT L34  Universal.lean — `through_assoc`. One line from L33
          (`interpret_through`, `Tower.lean:71`), which is used and not
          restated.

LAW  L35  `idHandler` IS A TWO-SIDED UNIT for `through`.
          t.through idHandler = t   and   idHandler.through h = h
FALS L35  exhibit t (or h) and an operation where either unit law
          fails.
BATT L35  Universal.lean — `through_id_right`, `through_id_left`.

LAW  MON  THE TOWER IS A MONOID, at the carrier where it is one:
          `Handler S (Prog S)` under `through`, with `idHandler` as
          unit — associativity and both unit laws at that one carrier.
FALS MON  exhibit three endo-handlers whose two bracketings differ, or
          one for which a unit law fails.
BATT MON  Universal.lean — `through_monoid`.
NOTE MON  The honest scope, stated here and not discovered later:
          `through` is a binary operation only on the ENDOMORPHISMS at
          one signature. Across signatures the same three facts are a
          CATEGORY (objects: signatures), and `through_assoc` is stated
          in that generality. Neither gives the tower a bottom — L37
          (`Handler ByteSig M`) is still owed, so "interpretation
          composes all the way down" stays a pending word.

LAW  BOUND  THE BOUNDARY — the fueled run is NOT a monad morphism, so
            the universal property does not reach it. At the fuel that
            DONE-halts each half of a composite, the composite is still
            RUNNING; the fuel is spent once on the left of a bind and
            twice on the right.
FALS BOUND  exhibit a composition law making `run H f` a monad morphism
            — i.e. show `run H f (p.bind g)` IS determined by
            `run H f p` and `run H f ∘ g`.
BATT BOUND  Universal.lean — `run_fixed_fuel_is_not_compositional`,
            universally quantified over `H`, over the address and over
            the node.
```

### The falsifiers this packet keeps as live theorems

Three hypotheses could be read as decoration. Each is refuted by a
witness the kernel computes, and each witness stays in the tree so the
hypothesis cannot be quietly relaxed later.

```
F-LAWFUL   L17's `LawfulMonad M` is load-bearing.
WITNESS    M := fun _ => Bool with the degenerate, deliberately
           UNLAWFUL structure `pure _ := true`, `bind _ _ := true`.
           Every program interprets to `true` under every handler, so
           ⟨fun _ => true⟩ and ⟨fun _ => false⟩ over the one-operation
           signature have equal interpretations at every type and are
           visibly different handlers.
BATTERY    Universal.lean — `uniqueness_needs_lawful`.

F-ONETYPE  L17 read at ONE answer type proves nothing.
WITNESS    `Prog S Empty` is UNINHABITED when every operation's answer
           type is inhabited — a program must eventually `pure`, and
           there is nothing to `pure`. So "∀ p : Prog S Empty, …" is
           vacuously true of any two handlers. CATALOG §B.7's empty-type
           warning, instantiated in the estate's own carrier.
BATTERY    Universal.lean — `single_type_agreement_is_not_enough`.

F-BIND     L18's `bind_law` is load-bearing; `pure_law` alone is not
           enough.
WITNESS    `phiDrifts h g` — handle the FIRST operation with `g` and
           everything after it with `h`. It satisfies `pure_law`, it
           agrees with `interpret g` on every SINGLE operation (so L18
           would read off the SAME handler), and at a two-operation
           program over `StateT Nat Id` it answers `((), 1)` where
           `interpret hNop` answers `((), 0)`. Two maps, one induced
           handler, different values: the conclusion cannot hold for
           both. This is a realistic wrong implementation — an
           interpreter that installs one semantics for the head
           operation and another for the tail — not a pathology.
BATTERY    Universal.lean — `bind_law_is_load_bearing`.
```

## Claim-scope — what these theorems do NOT say

The anti-overclaim class, written before the proofs so it cannot be
written to fit them.

**The boundary the ticket names: the semantics THE-ALGEBRA §3.4 found
outside the handler algebra.** R10 rules that a semantics IS a handler.
This packet proves the form of that claim and, for each of the three
semantics the review found outside it, says exactly what the proof does
and does not reach:

- **`Prog.handleLlm`** (`Interp.lean:184-187`) is a map
  `Prog AgentSig A → Prog CasSig A`, so it is of the right SHAPE and L18
  reaches it — **conditionally**. The condition is `bind_law`, which is
  precisely the judgment `Interp.lean:19, 181-183` asserts ("interpret …
  by monad morphism") and nothing on main proves. So the honest reading
  of L18 here is "IF `handleLlm` respects `bind`, THEN some handler
  induces it" — and L18 promises a handler, it does not COMPUTE the
  estate's intended one. Discharging the hypothesis (L32) and exhibiting
  `idHandler.sum ⟨fun (.infer q) => .pure (oracle q)⟩` as the handler
  (L30) are PDD-7's, and this packet claims neither.
- **`stepRooted`** (`Roots.lean:69-81`), and with it `step`, `run` and
  `runRooted`, are outside and not conditionally: they are not maps
  `Prog S A → M A` at all. A small step returns the REST of the program
  — the continuation escapes into the codomain — and a fueled run
  reports `.running`. LAW BOUND exhibits the failure concretely rather
  than asserting it. What relates these to the denotational side is the
  bridge already on main (`run_interpretRef_agree`, `Handler.lean:255`),
  whose fuel is EXISTENTIAL for exactly this reason; nothing here
  supplants it, and `runRooted`'s zero laws (THE-ALGEBRA §3.4b) stay
  zero.
- **`replayHandler`** (`Handler.lean:279-292`) IS a handler, hence a
  semantics by this file's theorem — and it is still the wrong one. The
  universal property constrains FORM, not CONTENT: being an
  interpretation says nothing about being the INTENDED interpretation.
  The review's two kernel-checked witnesses (THE-ALGEBRA §3.4c: replay
  starves on a duplicate, and refuses a load the reference admits) are
  untouched by anything here, and ruling Q4 stays owed. A reader who
  takes "a semantics IS a handler" as reassurance about `replayHandler`
  has read this packet backwards.

The rest of the boundary:

- **Not claimed: anything about the sum algebra.** `Handler.sum`,
  `Prog.inl`/`inr` and L21–L31 are PDD-7's. Nothing here is stated over
  a signature sum, and the one-operation signatures used by the
  falsifiers are not sums.
- **Not claimed: a bottom for the tower.** MON is a monoid at one
  signature; `Handler ByteSig M` does not exist (THE-ALGEBRA L37), so
  `EFFECTS-BACKEND.md:213-216`'s "interpretation composes all the way
  down to the admitted seams" remains the pending word §3.6 named it.
- **Not claimed: that `ObsEq` is `=`.** UP is about morphisms out of
  `Prog S`, not about program equality. THE-ALGEBRA §3.3's refutation
  stands: `ObsEq` is strictly COARSER than structural equality, its
  witness is `put n` against `put n >>= fun a => put n >>= fun _ =>
  pure a`, and nothing here narrows it.
- **Not claimed: anything about host code.** No TypeScript is a proof
  subject; nothing moves a generated byte or adds a word-equality
  vector. No soundness word attaches to any host seam (estate C5,
  R14 strata 3–4).
- **Not claimed: that `IsMonadMorphism` is estate vocabulary.** It is
  statement apparatus in the proof stratum of one leaf module, minting
  no sort, kind, or registry row. Promoting it — into `Cas/Lang/`, into
  `Walk.libraryImports`, into CONTEXT.md — is a ruling.
- **Not claimed: that this module is in the library's ledgers.** It is
  outside `Cas`'s import closure and outside `Walk.libraryImports`, so
  it is invisible to the surface, obligation and law ledgers. That is
  exactly why the "moves no bytes" gate holds, and it is written here
  rather than left in the lakefile (PDD-2's NOTE-2, adopted in advance).
- **Not claimed: universe generality.** Every statement is at
  `A : Type` — the universe `Handler`'s `M : Type → Type v` forces. The
  `Prog S A` carrier is polymorphic in `A : Type u`; nothing here says
  anything about `u > 0`.

## Obligation classes in play

`algebraic-laws`/`abstraction` (L13 is the commutation square over
`interpret` as the abstraction function; L34/L35/MON are the unit and
associativity axes), `adequacy` (LAW PIN, discharged outright — there is
no wrong-but-passing interpreter — plus the three live falsifiers
F-LAWFUL, F-ONETYPE, F-BIND), `claim-scope` (the section above, and LAW
BOUND, which is a claim-scope obligation promoted to a theorem),
`termination` (structural recursion on `Prog`; no fuel is quantified
over), `conformance` (the negative byte gate).

The `domain`, `contract`, `frame`, `invariant` and `loops` classes
generate nothing and are therefore not written: there is no partial
operation, no two-state postcondition, no mutable state, no represented
structure with an invariant, and no loop.

## Gates

```
lake --wfail build              (from library/cas) — green, no sorry
mise run check:cas              — every byte-identity gate unchanged
git status --short              — empty
```

## Breaks

```
EMPTY at the time of writing.

A packet with an empty ledger and a green battery says the laws were
never seriously attacked. This one is committed empty because nothing
has yet been attacked: the three hypothesis-falsifiers above are not
break rows — they refute READINGS the laws never made, and they were
written into the packet before the castle, not discovered against it.
The independent breaker's pass fills this section or leaves it empty on
the record.

One finding that is NOT a break, recorded so it is not mistaken for one
later: the review's existence sketch
(`handlers-semantics-exhibits.lean` §4, `interpret_of_morphism`) carries
a `[LawfulMonad M]` hypothesis its proof never uses. The sketch is TRUE
as written; it is merely weaker than the theorem it proves. L18 is
stated here without the hypothesis and the exhibit is cited as the prior
art it is.
```
