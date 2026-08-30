# handlers-semantics — the algebra of handlers, interpretation, and the tower

Area slug: `handlers-semantics`. Files under review:
`library/cas/Cas/Lang/Handler.lean`, `library/cas/Cas/Lang/Interp.lean`,
`library/cas/Cas/Lang/Tower.lean`.

Status: REVIEW ARTIFACT, pre-grade. Operator-ordered algebraic model
review, 2026-08-30. Read against `library/cas/EFFECTS-BACKEND.md` as
ratified law (R1–R15), the obligation classes of
`.claude/skills/implement/CONTRACT.md:108-141`, and the falsifier shapes
of `.claude/skills/implement/BREAKER.md:37-229`.

Baseline: main `7dac14d8`, Lean `leanprover/lean4:v4.33.1`. Working-tree
dirt (`library/effects/src/cas/Programs.ts`,
`library/effects/test/Programs.test.ts`) is outside this area and was not
consulted. `Cas/Lang/Worded.lean` and `Cas/Lang/WordWire.lean` are on
`merge/cas-word` (`.staging/operational-structure/CORE-ABSTRACTIONS-PLAN.md:56-62`)
and are **pending, not reviewed**; where a finding below might be answered
by `WordSig`, it says so.

Evidence discipline. Every law in Part A carries one of four marks:

| Mark | Meaning |
|---|---|
| **PROVED** | a kernel-checked Lean theorem, named, at `file:line` |
| **GATED** | no theorem; a byte gate, word gate, or host test decides it |
| **ASSERTED** | stated in a docstring or in EFFECTS-BACKEND, carried by nothing |
| **FOLKLORE** | relied on by code or by prose, written nowhere at all |

No soundness word appears below without its judgment named (AGENTS.md:49-51,
C5). I did not re-run `mise run check:cas`; PROVED marks are reads of the
committed source, and every one of them is a theorem with a body, not an
`axiom` or a `sorry` (checked by grep over the three files and their
imports in `Cas/Lang/`).

The exhibits are kernel-checked. Every falsifier and every proposed
missing law in this report compiles against the committed build:
`.staging/algebraic-review/handlers-semantics-exhibits.lean`, zero errors,
zero `sorry`, zero `native_decide`, run by `lake env lean` from
`library/cas`. Section numbers below cite it as `exhibits §N`.

---

## Part A — IMPLEMENTER VIEW: the algebra that exists

### A.1 The signature

**Sorts** (all pre-existing; no sort in this area was minted for this review):

| Sort | Carrier | Site |
|---|---|---|
| `Sig` | `(Op : Type, Ans : Op → Type)` | `Cas/Lang/Sig.lean:13-15` |
| `Prog S A` | inductive: `pure a \| vis op k` | `Cas/Lang/Prog.lean:25-27` |
| `Handler S M` | one field, `handle : (op : S.Op) → M (S.Ans op)` | `Handler.lean:42-43` |
| `Status S A` | `done \| running \| refused` | `Interp.lean:42-45` |
| `Refusal` | six clause-named arms | `Interp.lean:28-34` |
| `Word` | `List Binding`, admission order | `Cas/IR/Word.lean:33` |
| `RefM` | `StateT Word (Except Refusal)` | `Handler.lean:74` |
| `ByteSig` | `⟨ByteE, ByteE.Ans⟩`, the byte-plane language | `Tower.lean:36-49` |

**Operations.** Types elided where the file states them; each row is the
declaration site.

| Operation | Type (abridged) | Site |
|---|---|---|
| `Sig.sum` (`⊕ₛ`) | `Sig → Sig → Sig` | `Sig.lean:20-25` |
| `Prog.bind` | `Prog S A → (A → Prog S B) → Prog S B` | `Prog.lean:31-33` |
| `Prog.op` | `(e : S.Op) → Prog S (S.Ans e)` | `Prog.lean:40` |
| `Prog.inl` / `Prog.inr` | `Prog S A → Prog (S ⊕ₛ T) A` | `Prog.lean:43-50` |
| `interpret` | `[Monad M] → Handler S M → Prog S A → M A` | `Handler.lean:47-49` |
| `Handler.sum` | `Handler S M → Handler T M → Handler (S ⊕ₛ T) M` | `Handler.lean:63-66` |
| `Handler.through` | `Handler S (Prog T) → Handler T M → Handler S M` | `Tower.lean:65-67` |
| `idHandler` | `Handler S (Prog S)` | `Representation.lean:63-64` |
| `referenceHandler` | `(Bytes → Addr32) → Handler CasSig RefM` | `Handler.lean:78-92` |
| `replayHandler` | `Handler CasSig (StateT Word (Except Refusal))` | `Handler.lean:279-292` |
| `casOverBytes` | `(Bytes → Addr32) → Handler CasSig (Prog ByteSig)` | `Tower.lean:111-133` |
| `interpretRef` | `Prog CasSig A → Word → Except Refusal (A × Word)` | `Handler.lean:96-98` |
| `step` | `Prog CasSig A → Word → Status CasSig A × Word` | `Interp.lean:70-85` |
| `run` | `Nat → Prog CasSig A → Word → Status CasSig A × Word` | `Interp.lean:146-153` |
| `Prog.handleLlm` | `(String → String) → Prog AgentSig A → Prog CasSig A` | `Interp.lean:184-187` |
| `runAgent` | fuel-run of a handled agent program | `Interp.lean:190-192` |
| `SemEq` / `ObsEq` | stratum-3 equalities | `Representation.lean:122-135` |

Universe note, stated because it bounds every law below: `Prog` is
`A : Type u`-polymorphic (`Prog.lean:25`) but `interpret` targets
`M : Type → Type v` (`Handler.lean:47`), so **every law in this area is a
law at answer-universe 0**. Nothing claims more, and nothing needs more
today; it is recorded so no later reader reads the laws as universe-general.

### A.2 The laws that hold

**Group 1 — `Prog` is a lawful monad (the rewriting core).**

| Law | Status | Evidence |
|---|---|---|
| `p.bind pure = p` | PROVED | `Prog.bind_pure_right`, `Representation.lean:39-44` |
| `(p.bind f).bind g = p.bind (fun a => (f a).bind g)` | PROVED | `Prog.bind_assoc'`, `Representation.lean:46-52` |
| `LawfulMonad (Prog S)` | PROVED | instance, `Representation.lean:54-58` |

**Group 2 — interpretation is a monad morphism.**

| Law | Status | Evidence |
|---|---|---|
| `interpret h (.pure a) = pure a` | PROVED | `interpret_pure`, `Representation.lean:110-111` (`rfl`) |
| `interpret h (p.bind f) = interpret h p >>= (interpret h ∘ f)` | PROVED | `interpret_bind`, `Handler.lean:53-60`; needs `[LawfulMonad M]` |
| `interpret h (Prog.op e) = h.handle e` | PROVED | `interpret_op`, `Representation.lean:115-117` |
| the two halves are ONE statement ("`interpret h` is a monad morphism") | FOLKLORE | never packaged; the unit law and the bind law live in different files and no declaration names the conjunction |
| every monad morphism out of `Prog S` IS `interpret h` for a unique `h` | FOLKLORE | see B.1 — this is R3/R10's headline sentence and no declaration states it |

**Group 3 — initiality.**

| Law | Status | Evidence |
|---|---|---|
| `interpret idHandler p = p` | PROVED | `interpret_id`, `Representation.lean:68-74` |
| agreement under every lawful interpretation implies structural equality | PROVED | `eq_of_forall_interpret`, `Representation.lean:80-84` |

**Group 4 — the reference semantics and the small-step interpreter.**

| Law | Status | Evidence |
|---|---|---|
| `step` on a `vis` IS the reference handler's clause, reified into `Status` | PROVED | `step_handle`, `Handler.lean:131-144` |
| big-step vis unfolding | PROVED | `interpretRef_vis`, `Handler.lean:149-160` |
| load answers exactly the projected store (L6) | PROVED | `step_load_agrees`, `Interp.lean:88-93` (`rfl`) |
| fresh put continues at the judged address and the word projects to the successor store (L5) | PROVED | `step_put_fresh`, `Interp.lean:98-108` |
| the step refuses exactly when the judgment rejects (L5) | PROVED | `step_put_error`, `Interp.lean:112-116` |
| one step preserves `Word.wf` (L7) | PROVED | `step_preserves_wf`, `Interp.lean:119-142` |
| a run preserves `Word.wf` (L7) | PROVED | `run_preserves_wf`, `Interp.lean:163-177` |
| a continuing step spends exactly one fuel | PROVED | `run_step_running`, `Interp.lean:156-159` |

**Group 5 — the bridge (R10's named F3 obligation).**

| Law | Status | Evidence |
|---|---|---|
| a halted `done` run reports the reference value AND word, at any fuel | PROVED | `interpretRef_of_run_done`, `Handler.lean:165-184` |
| a `refused` run reports the reference's refusal (and nothing about the word) | PROVED | `interpretRef_of_run_refused`, `Handler.lean:189-207` |
| a sufficient fuel EXISTS and is produced by the proof | PROVED | `run_of_interpretRef`, `Handler.lean:214-245` |
| the two semantics are one, past the produced fuel | PROVED | `run_interpretRef_agree`, `Handler.lean:255-272` |
| the defunctionalized fragment's exact-fuel special case | PROVED | `runP_embed_agree`, `Defun.lean:362-364` (fuel `p.length + 1`) |
| past the produced fuel, the run has HALTED | FOLKLORE for `Prog`; PROVED for tables | `runP_halts`, `Defun.lean:403-404` exists; there is no `run_halts`. See B.6 |

The obligation ledger sees this: `surface/cas-obligations.json` carries the
`Cas.Lang.run_interpretRef_agree` row at state `discharged`, and the module
docstring rows at `Cas.Lang.Handler` likewise — so the bridge's discharge is
mechanically tracked, not just claimed in prose.

**Group 6 — the tower.**

| Law | Status | Evidence |
|---|---|---|
| `interpret h (interpret t p) = interpret (t.through h) p` | PROVED | `interpret_through`, `Tower.lean:71-85` |
| `through` is associative | FOLKLORE | see B.4; provable in one line from the above (exhibits §5, `through_assoc`) |
| `idHandler` is a two-sided unit for `through` | FOLKLORE | exhibits §5, `through_id_left` / `through_id_right` |
| `casOverBytes` refines `referenceHandler` | ASSERTED, owed | `Tower.lean:26-29` "Named obligation (not claimed here)"; EFFECTS-BACKEND.md:216-222. Ledger row present (state `obligation`) |
| `ByteSig` has a handler at all | — | **NONE EXISTS.** See B.5 |

**Group 7 — stratum-3 equalities.**

| Law | Status | Evidence |
|---|---|---|
| structural equality implies `SemEq` / `ObsEq` | PROVED | `SemEq.of_eq`, `Representation.lean:127-128`; `ObsEq.of_eq`, `:137-138` |
| halted agreeing runs at every word imply `ObsEq` | PROVED | `ObsEq.of_run`, `Representation.lean:162-178` |
| `ObsEq` transfers a `done` outcome with its word | PROVED | `ObsEq.run_done`, `Representation.lean:182-192` |
| `ObsEq` transfers a refusal WITHOUT its word | PROVED | `ObsEq.run_refused`, `Representation.lean:198-208` |
| the cross-host run gate decides the reference semantics | GATED, and the gate compares against a FIXTURE word, not against `interpretRef` | `tools/EmitPrograms.lean:12-16, 149-150`; `Representation.lean:141-143` concedes "nothing in the estate executes `interpretRef`". See B.7 |

**Group 8 — sums, lifts, and the LLM extension.**

| Law | Status | Evidence |
|---|---|---|
| `interpret (h.sum g) p.inl = interpret h p` | FOLKLORE | nothing anywhere; provable (exhibits §1) |
| `interpret (h.sum g) p.inr = interpret g p` | FOLKLORE | same |
| `Prog.inl` / `Prog.inr` are monad morphisms (bind law) | FOLKLORE | no declaration; `liftCas` (`Ops.lean:63`) is `Prog.inl` and has no law |
| `handleLlm oracle (liftCas p) = p` | FOLKLORE | exhibits §6 proves it in three lines |
| `handleLlm` respects bind ("interprets by monad morphism", `Interp.lean:181`) | ASSERTED | the docstring says "monad morphism"; no morphism law is stated. C5 finding, see B.2 |
| `replayHandler` is the co-direction of recording | ASSERTED **and false as written** | EFFECTS-BACKEND.md:180-183; Handler.lean:20-21. See B.3 — two kernel-checked counterexamples |

### A.3 What the area gets right, said plainly

Three things are load-bearing and in good order, and a consolidation must
not lose them.

1. **`step_handle` (`Handler.lean:131-144`) is the real carrier of "meaning
   lives in one place."** The put clause is spelled twice — `Interp.lean:74-79`
   and `Handler.lean:81-87` — and the theorem reconciles them clause for
   clause. `Defun.lean` then takes the right lesson: `putWord`
   (`Defun.lean:244-245`) is *defined as* `(referenceHandler H).handle (.put n)`
   rather than spelled a third time, and `step_put_putWord` (`:251`) is a
   corollary. The tower of agreement is real.
2. **The bridge's triage is honest.** `Handler.lean:100-124` states, before
   the theorems, exactly what cannot be proved — the refusal word has no
   slot in `Except Refusal (A × Word)` — and the asymmetry propagates into
   `ObsEq.run_refused` (`Representation.lean:198-208`) instead of being
   quietly dropped. `Defun.lean:411-425` names the shortfall a third time.
   This is the anti-"technically" behavior the operator is asking for; it is
   already the house standard in this one place.
3. **The fuel is produced, not assumed** (`run_of_interpretRef`,
   `Handler.lean:214-245`). Existential fuel closed upward is the right
   shape for a carrier whose continuations are host functions, and the
   docstring says why (`Handler.lean:115-124`).

---

## Part B — BREAKER VIEW: the attack

Nine findings. Each is stated as CLAIM (what the estate says) / GAP /
WITNESS (exhibit form) / CLASS (CONTRACT.md:108-141).

### B.1 — "A semantics IS a handler" is the headline claim and is unstated

**CLAIM.** R3: "A handler is a monad morphism into a target that can
iterate" (EFFECTS-BACKEND.md:53-59). R10: "a semantics is a `Handler S M`
— one meaning per operation in a target monad — and `interpret` is the
induced monad morphism (`interpret_bind` proved once, for every handler)"
(EFFECTS-BACKEND.md:152-156). `Handler.lean:32-33` repeats it.

**GAP.** What is proved is that `interpret h` *is* a monad morphism
(`interpret_pure` + `interpret_bind`) — the easy direction. The word "IS"
in "a semantics IS a handler" is the *other* direction: that nothing which
behaves like a semantics escapes the `Handler` algebra. Nothing states it.
Two sub-statements are both missing:

- **injectivity** — two handlers inducing the same interpretation are equal;
- **surjectivity** — every monad morphism `Prog S ⇒ M` is `interpret h` for
  some `h`.

Without surjectivity, R10's "every interface the estate has built is an
instance" (`Handler.lean:11`) is an inventory claim about today's code, not
a theorem — and the estate *already contains* an interface that is a
semantics and is not a handler (B.2). That is what makes this the top hole
rather than a pedantic one.

**WITNESS.** Not a counterexample — the theorem is true, and its absence is
the defect. Exhibits §4 `interpret_of_morphism` proves surjectivity in nine
lines; §3 `handler_eq_of_interpret_eq` proves injectivity in four, over a
`handler_ext` that the estate also lacks. The load-bearing intermediate,
`(Prog.op op).bind k = .vis op k` (exhibits §2, `rfl`), is likewise unstated.

**CLASS.** claim-scope, adequacy.

### B.2 — `Prog.handleLlm` is a semantics outside the handler algebra, and its docstring claims a morphism it does not have

**CLAIM.** `Interp.lean:181-183`: "Interpret the LLM extension by monad
morphism: fold the oracle's answers in, leaving a pure store program."
Module docstring `Interp.lean:20-22` repeats it. R15 makes this the estate's
worked example of an agent as a handled operation
(EFFECTS-BACKEND.md:283-295); three staging documents call it the rebuilder
pattern (`.staging/operational-structure/BUILD-MODELING-AUDIT.md:26,31`).

**GAP.** `Prog.handleLlm` (`Interp.lean:184-187`) is a hand-rolled structural
recursion, not `interpret` of any handler, and **no morphism law is stated
for it** — neither `handleLlm oracle (p.bind f) = (handleLlm oracle p).bind (handleLlm oracle ∘ f)`
nor the lift identity `handleLlm oracle (liftCas p) = p`. "Monad morphism"
is used as a soundness word with no judgment named behind it (AGENTS.md:49-51,
C5). It is expressible inside the algebra —
`Handler.sum idHandler ⟨fun (.infer q) => .pure (oracle q)⟩` interpreted into
`Prog CasSig` — and it is not so expressed.

**WITNESS.** Exhibits §6 proves both missing laws (`handleLlm_liftCas`,
`handleLlm_bind`), which is the point: they hold, so the docstring is not
lying about the mathematics, only about what the file carries. The
adversarial half: replace `Interp.lean:186` with
`| .vis (Sum.inl e) k => .vis e (fun _ => (k <arbitrary>).handleLlm oracle)`
— an implementation that discards the store answer. Every theorem in
`library/cas` still holds, because no theorem mentions `handleLlm`;
`runAgent` (`Interp.lean:190-192`) is definitional and constrains nothing.
The only tripwire in the estate is `Defun.lean:2191-2199`, an `example`
whose conclusion is an *inequality* of two oracle runs — it would survive the
sabotage.

**CLASS.** claim-scope, adequacy, contract.

### B.3 — `replayHandler` is asserted to be the co-direction of recording; two kernel-checked witnesses say it is not

**CLAIM.** R10: "Replay and record are handlers too: replay answers from the
recorded word (the oracle-from-content direction), record is the writer
direction — the record/replay plane is two instances of one notion, not
separate machinery" (EFFECTS-BACKEND.md:180-183). `Handler.lean:20-21` and
`:276-278` repeat it. `.staging/libfree/dsl-proposal.md:1406` builds on it.

**GAP.** No theorem relates `replayHandler` to `referenceHandler` in either
direction. The definition (`Handler.lean:279-292`) consumes the word as a
QUEUE at `put` (pops the head, `Handler.lean:283-287`) but resolves `load`
by `Word.find` over the REMAINING suffix (`:288-291`). The reference
resolves `load` over the ACCUMULATED word (`Handler.lean:88-91`) and does
not extend the word on a duplicate put (`Handler.lean:86`, via
`Cas/Core/Admission.lean:184`). The two disagree on the two commonest
program shapes in the estate's own vector corpus — `tools/EmitPrograms.lean:54-56`
registers `sharedChunk`, "the duplicate put replays as a dedup", by name.

**WITNESS A — duplicate starves replay** (exhibits §7,
`replay_starves_on_duplicate`, kernel-checked):

```
LAW        replay against a recorded word reproduces the recorded run
FALSIFIER  exhibit n, a with
             interpret replayHandler
               (vis (put n) fun _ => vis (put n) fun _ => pure ())
               [⟨a, n⟩]
             = .error (.failed "replay: word exhausted")
           while the reference admits the same program (second put is
           .duplicate, Admission.lean:184 — the word stays one binding long)
EXHIBIT    handlers-semantics-exhibits.lean:137
```

**WITNESS B — replay refuses a load the reference admits** (the sharper
one; both halves kernel-checked):

```
LAW        replay and the reference agree on outcome
FALSIFIER  exhibit n (with n.refs = []), a with
             interpret replayHandler
               (vis (put n) fun ans => vis (load ans) fun _ => pure ())
               [⟨a, n⟩]
             = .error (.noObject a)
           and, at the same program,
             interpretRef H (that program) []
             = .ok ((), [⟨addr H ⟨n,hwf⟩, n⟩])
EXHIBIT    handlers-semantics-exhibits.lean:155 and :171
```

Every straight-line program that loads back what it just put — the shape
`TreeProg`/`Defun` traffic in — is refused by replay and admitted by the
reference. Whatever `replayHandler`'s intended contract is, it is not the
one R10 states, and no line of Lean, prose, or gate anywhere fixes the
intended one. `.staging/operational-structure/DESIGN.md:45-56` already ruled
that `replayHandler` "is not a verifier"; nobody has yet ruled what it *is*.

**CLASS.** adequacy (the spec is the bug), contract.

### B.4 — the tower's category laws are unstated, so "strata are free" is folklore

**CLAIM.** R12: "`Handler.through` + `interpret_through` (proved) collapse
the tower … strata are free, and interpretation composes all the way down"
(EFFECTS-BACKEND.md:213-216). `Tower.lean:18-21`.

**GAP.** `interpret_through` (`Tower.lean:71-85`) is a *one-level* collapse.
"Strata are free" is a claim about arbitrarily many levels, and that is
associativity of `Handler.through` plus `idHandler` as its unit — the
category laws. None of the three is stated. Nor is `Handler` extensionality,
without which none of them can even be phrased.

**WITNESS.** Exhibits §5 proves all three (`through_assoc`,
`through_id_left`, `through_id_right`), each in one to three lines from
`interpret_through` and `interpret_id`. Adversarial reading of the gap: a
three-stratum stack `S → T → U → M` has two bracketings and the estate has
no theorem saying they agree; a reader who assumes they do is relying on
nothing.

**Claim-scope rider.** `interpret_through` requires the middle handler to
land in `Prog T` exactly (`Tower.lean:72`). "Composes all the way down"
therefore holds *for `Prog`-valued intermediate strata only*. That is the
right discipline — the free monad as the tower's connective tissue — but the
prose does not say it, and a reader who tries to compose two `RefM`-valued
handlers finds no theorem and no explanation of why.

**CLASS.** claim-scope, abstraction.

### B.5 — `ByteSig` has no handler, so the entire lower stratum is unexecuted, and one of its operations has no consumer at all

**CLAIM.** R12: `CasStore` "is itself IMPLEMENTED as a program over the
byte-plane signature (`ByteSig`, mirroring the TypeScript
`ByteReader`/`ByteWriter` seam)" and "interpretation composes all the way
down to the admitted seams (digest, filesystem, network), which are the
only places the tower touches trust" (EFFECTS-BACKEND.md:205-216).

**GAP.** Grep over `library/cas` for `ByteSig` returns nine hits, all inside
`Tower.lean` itself (`:11, :49, :51, :54, :57, :60, :93, :104, :111`).
**There is no `Handler ByteSig M` in the estate, for any `M`.** Consequently
`casOverBytes` has never been interpreted, `interpret_through` has never been
instantiated at a real pair, and the tower has no bottom: the sentence "down
to the admitted seams" describes a descent that stops one level above the
seams. The refinement theorem is honestly marked owed (`Tower.lean:26-29`,
ledger state `obligation`) — but a refinement theorem cannot even be *stated*
until a byte-plane handler exists, which is a fact the owed-note does not
record.

**Second gap, sharper because it is a direct drift from ratified law.** R2:
"Extension stays consumer-gated (grammar-grill ruling 5): a signature enters
only with a real consumer" (EFFECTS-BACKEND.md:49-51). `ByteE.presence`
(`Tower.lean:38`, `:44`) and its smart constructor `bytePresence`
(`Tower.lean:54-55`) have **zero consumers**: `casOverBytes` uses `byteLoad`
for presence testing (`Tower.lean:118`, `:127`), and grep finds no other
use. An operation of a ratified signature, gated on having a consumer,
without one.

**WITNESS.**

```
LAW        R2 — a signature's operation enters only with a real consumer
FALSIFIER  exhibit an operation of a landed signature with no consumer:
             ByteE.presence — grep over library/cas finds it at four
             sites, all its own definition: the constructor
             (Tower.lean:38), its answer-type row (:44), and its smart
             constructor bytePresence (:54-55). No caller anywhere
CLASS      the ruling is decidable by grep; this is a red gate the estate
           does not run
```

**CLASS.** conformance, claim-scope.

### B.6 — `ObsEq.of_run` demands a halting hypothesis nothing can supply for a general program

**CLAIM.** `Representation.lean:159-161`: "The run gate decides `ObsEq` …
This is the direction the gate uses."

**GAP.** `ObsEq.of_run` (`Representation.lean:162-165`) takes
`(run H fp p w).1.isRunning = false` as a HYPOTHESIS. For the
defunctionalized fragment the estate discharges it — `runP_halts`
(`Defun.lean:403-404`) — and `ObsEq_embed_of_runP` (`Defun.lean:419-425`)
uses exactly that. For a general `Prog CasSig A` there is **no `run_halts`**
(grep for `isRunning` in `Cas/`: five hits in `Defun.lean`, two in
`Representation.lean`, the definition in `Interp.lean:58`). The corollary is
immediate from `run_of_interpretRef` (`Handler.lean:214-245`) and is not
drawn.

**WITNESS.** The missing statement is
`∀ p w, ∃ fuel, ∀ f ≥ fuel, (run H f p w).1.isRunning = false`. Until it
exists, a client who wants `ObsEq` for a program outside the `PProg`
fragment must prove halting by hand, and the phrase "the run gate decides
`ObsEq`" is scoped to the fragment without saying so.

**CLASS.** claim-scope, termination.

### B.7 — the observation the gate performs is not the observation the law names

**CLAIM.** R10: a realization "is CLAIMED against the reference by
observational agreement, and the observation is the WORD"
(EFFECTS-BACKEND.md:165-170). R5: "one program, the Lean interpreter and the
generated Effect runtime, identical words or red"
(EFFECTS-BACKEND.md:91-94).

**GAP.** `Representation.lean:141-143` already concedes half of it: "`ObsEq`
is stated over `interpretRef`, but nothing in the estate executes
`interpretRef`: the gates run `run` (and … `runP`)." The bridge closes that
half. The half nobody has written down: the program gate does not execute
`run` either. `tools/EmitPrograms.lean:12-16` states what it does — "the
VectorPrograms suite runs each program and asserts its answered addresses
equal *the vector fixture's word*, binding for binding" — and the fixture
word comes from the grammar's `flatten` (`tools/Vectors.lean:35`), not from
any interpreter. So the chain the law asserts is

```
  TS host run  =gate=  fixture word  =???=  runP/run  =bridge=  interpretRef
                                     ^^^^^
```

and the marked link is carried by `Cas/Lang/TreeProg.lean`'s `putTree_correct`
(named at `Cas/Lang/Lang.lean:26-29` as proving "the run computes exactly
the elaboration's address and store") — which is a real theorem, but it is
nowhere named as the link that makes R5's sentence true. The word "the
observation is the WORD" is a three-link chain presented as one.

**CLASS.** claim-scope, conformance.

### B.8 — `H` is unconstrained here and hypothesised elsewhere; three treatments, no ruling

**GAP.** `referenceHandler` (`Handler.lean:70`), `step`, `run`
(`Interp.lean:64`) and `casOverBytes` (`Tower.lean:89`) all take
`H : Bytes → Addr32` with **no hypothesis whatsoever**. Elsewhere in the
estate the same `H` gets two other treatments: `Tree.flatten_wf`
(`Cas/Grammar/Tree.lean:463`) takes `hInj : Function.Injective H`, and
`Cas/Core/Address.lean:59-62` deliberately *produces* a collision pair
rather than excluding one. Three postures toward one parameter, in one
library, with no document saying which is authoritative for "the meaning."

**WITNESS** (exhibits §8):

```
LAW        R10 — "Meaning lives in exactly one place: the reference handler"
FALSIFIER  exhibit H with every law in Handler.lean / Interp.lean /
           Tower.lean still holding while the semantics is degenerate:
             degenerateH := fun _ => ⟨List.replicate 32 0, _⟩
           Under it every distinct node collides at address 0, so the
           second distinct put refuses (.collision) and every load answers
           the first node. Every theorem in the three files is parametric
           in H and survives unchanged.
EXHIBIT    handlers-semantics-exhibits.lean:198
```

This is not a bug — the collision-as-explicit-refusal design is deliberate
and correct, and it is *why* no injectivity hypothesis is needed. It is a
claim-scope defect: "meaning lives in exactly one place" names a FAMILY of
meanings indexed by `H`, and `ObsEq` is correctly `H`-indexed
(`Representation.lean:134`) while the prose is not. One sentence fixes it.

**CLASS.** adequacy, claim-scope.

### B.9 — cross-carrier: three consumers of signature sums, none using `Handler.sum`

**CLAIM.** R10: "Seam effects get signatures. Transport failure,
cancellation, backpressure, progress are operations of their own signature
summed in (`⊕ₛ`, `Handler.sum`), never smuggled through request/reply"
(EFFECTS-BACKEND.md:176-179).

**GAP.** `Handler.sum` (`Handler.lean:63-66`) has **no law and no use**.
Grep over the repo finds it in staging prose only. Meanwhile the estate has
two live sum-consumers and both bypass it:

- `Prog.handleLlm` (`Interp.lean:184-187`) hand-rolls the `AgentSig` split;
- `stepRooted` (`Cas/Lang/Roots.lean:69-81`) hand-rolls the `StoreSig` split,
  delegating the `inl` arm to `step` and re-injecting with `rest.inl.bind k`
  (`Roots.lean:74`).

So the single ratified mechanism for the seam-effects clause has zero uses
and zero laws, while both actual uses of `⊕ₛ` are open-coded. The
`Prog.inl`/`Prog.inr` side is equally bare: no bind law, no relation to
`Handler.sum`, and `liftCas` (`Ops.lean:63`) and `liftRootedCas`
(`Roots.lean:45`) inherit that emptiness.

**WITNESS.** Adequacy: because `interpret (h.sum g) p.inl = interpret h p`
is stated nowhere, an implementation of `Handler.sum` that swaps the arms
when `S = T` satisfies every law about it (there are none). Exhibits §1
proves both injection laws in five lines each. Second-order witness: the
`.done` arm of `stepRooted`'s Cas delegation (`Roots.lean:75`) is dead —
`step` on a `.vis` never reports `done` (`Interp.lean:72-85`) — which is the
kind of thing an open-coded sum accumulates and a proved `Handler.sum` does
not.

**Pending note.** `merge/cas-word` adds `WordSig` and `stepWorded`
(CORE-ABSTRACTIONS-PLAN.md:56-60), i.e. a *third* hand-rolled sum consumer.
This finding gets worse on merge, not better; that is an argument for
ruling it before the merge rather than after.

**CLASS.** adequacy, abstraction, conformance.

### B.10 — R14a P2 at the leaves: three drifts, one with a proof cost

The brief asks specifically about the pure discipline
(EFFECTS-BACKEND.md:276-281; restated `Representation.lean:86-106`).

**Compliant.** Every smart constructor in the area ends its continuation in
`.pure`: `put`/`load` (`Ops.lean:49-52`), `byteLoad`/`bytePresence`/`bytePut`
(`Tower.lean:51-58`), `Prog.op` (`Prog.lean:40`), `idHandler`
(`Representation.lean:63-64`). The two `Empty`-answering leaves —
`failWith` (`Ops.lean:55-56`) and `byteFail` (`Tower.lean:60-61`) — use
`Empty.elim`, which is P2-compliant vacuously (no continuation exists, by
type, as `Ops.lean:8-9` says). `casOverBytes` (`Tower.lean:111-133`)
composes by `>>=` over smart constructors and ends in `.pure a`: P2 clean.

**Drift 1 — `checkRefs` hand-rolls a fold.** `Tower.lean:104-106` recurses
structurally over `List Ref` where `Prog.lean:18` states the house form:
"Programs form a monad, so folding with an opaque function is
`List.foldlM` — reduction arrives for free." The cost is not stylistic: the
owed refinement theorem (B.5) will need
`checkRefs (xs ++ ys) = checkRefs xs >>= fun _ => checkRefs ys`, which
`foldlM`'s library lemmas would supply and a hand-rolled recursion will not.
MISSING LAW: `checkRefs_append`.

**Drift 2 — `Prog.handleLlm`, `Prog.inl`, `Prog.inr` rebuild `vis` nodes by
hand** (`Interp.lean:186`, `Prog.lean:45`, `:50`) where each is an
`interpret` of a handler. That is the B.2/B.9 finding seen from the P2 side:
P2's promise is that "the proved monad laws normalize any program"
(`Representation.lean:97-102`), and a hand-rolled rebuild is precisely a
program the monad laws do not normalize because no law connects it to
`bind`.

**Drift 3 — none found at the reference leaves.** `referenceHandler` and
`replayHandler` land in `RefM`, not in `Prog`, so P2 does not apply; their
clauses are total state functions and P1-clean.

**CLASS.** invariant (of the discipline), abstraction.

### B.11 — verified NOT broken (recorded so the synthesizer does not re-open them)

- **The address `casOverBytes` computes matches the reference's.**
  `Tower.lean:117` computes `H (encodeNode n)`; the reference's `addr`
  (`Cas/Core/Address.lean:36`) is `H (encodeAdmitted n)` and
  `encodeAdmitted n = encodeNode n.val` (`Cas/Codec/NodeCodec.lean:282`).
  Identical. A plausible falsifier, checked, does not fire.
- **`casOverBytes` orders its clauses like the reference.** Well-formedness
  first (`Tower.lean:113` vs `Handler.lean:81`), then refs
  (`Tower.lean:115` vs `Admission.lean:178`), then the address probe. No
  reordering defect.
- **`casOverBytes` does not write on a duplicate** (`Tower.lean:121`
  answers `.pure a` with no `bytePut`), matching the reference's
  duplicate-does-not-extend-the-word clause (`Handler.lean:86`).
- **`step`'s `pure` clause is pinned**, though only through the bridge: a
  variant returning `(.done a, [])` would falsify
  `interpretRef_of_run_done` (`Handler.lean:168-174`). The bridge is doing
  real adequacy work, not only stating an agreement.

### B.12 — claim-scope inventory (the "well, technically" list)

For each PROVED theorem, what its prose implies minus what it says.

| Theorem | Prose implies | Actually says |
|---|---|---|
| `interpret_bind` (`Handler.lean:53`) | "the monad-morphism law" (`Handler.lean:32`) | the *bind* half only; the unit half is `interpret_pure` in another file, and the two are never conjoined |
| `run_interpretRef_agree` (`Handler.lean:255`) | "the fueled small-step `run` and the big-step reference interpretation are ONE semantics" (`:247-249`) | one semantics **for `Prog CasSig`, at answer-universe 0, past a produced fuel, with the refusal word existential**. All four riders are real; the file states the fourth (`:100-124`) and none of the other three |
| `interpret_through` (`Tower.lean:71`) | "strata are free … composes all the way down to the admitted seams" (EFFECTS-BACKEND.md:213-216) | one level, `Prog`-valued middle, and there is no bottom handler for the only lower signature that exists (B.5) |
| `eq_of_forall_interpret` (`Representation.lean:80`) | "no finer program equality exists" (`:78-79`) | quantifies over `M : Type → Type` — universe 0 targets only |
| `ObsEq.of_run` (`Representation.lean:162`) | "the run gate decides `ObsEq`" (`:159`) | decides it *given* halting, which only `PProg` can supply (B.6) |
| `step_handle` (`Handler.lean:131`) | "Every clause … by the same equation" (`:129-130`) | correct and complete for the three `vis` clauses; the `pure` clause is outside it |

---

## Part C — THE CLEAN ALGEBRA

Decision 2 binds: consolidation only, no new sorts, no new carriers.
**Every item below is a statement over existing carriers**; the two places
where something structural would be needed are raised as ruling questions,
not proposed. Marks: KEEP (as is) · STRENGTHEN (existing statement, wider
or sharper) · STATE-NEW (new theorem, existing carriers) · PROVE-OWED
(named obligation, no statement yet possible or written).

### C.1 The signature — unchanged

No sort is added, removed, or altered. Two consolidations remove
duplication rather than adding anything:

- **`step` should be defined FROM `referenceHandler`**, making `step_handle`
  (`Handler.lean:131-144`) an `rfl` and deleting the second spelling of the
  admission clauses (`Interp.lean:74-79`). `Defun.lean:244-245` already
  demonstrates the pattern with `putWord`. Cost: `Refusal` (`Interp.lean:28-34`)
  and `referenceHandler` must sit below `step`, which is a file re-layout
  inside `Cas/Lang/` — a move, not a mint. Benefit: R10's "meaning lives in
  exactly one place" becomes literally true of the source instead of true
  modulo a theorem.
- **`interpretRef_vis` (`Handler.lean:149-160`) should be the instance of
  `interpret_vis_state` (`Auth.lean:387-399`), not its twin.** `Auth.lean:383-386`
  says so itself — "The generic form of `interpretRef_vis` (`Handler.lean`)"
  — and the dependency runs backwards: the general lemma lives downstream of
  the special one. Move the general statement into `Handler.lean`; derive
  the special one.

### C.2 The law list, as it should read

**§1 — `Prog` is the free monad over `S`.**

| # | Law | Mark |
|---|---|---|
| 1.1 | `LawfulMonad (Prog S)` | KEEP (`Representation.lean:54-58`) |
| 1.2 | `(Prog.op op).bind k = .vis op k` | STATE-NEW (exhibits §2, `rfl`) |

**§2 — `interpret` is the free monad's universal property.**

| # | Law | Mark |
|---|---|---|
| 2.1 | `interpret h (.pure a) = pure a` | KEEP (`Representation.lean:110`) |
| 2.2 | `interpret h (p.bind f) = interpret h p >>= (interpret h ∘ f)` | KEEP (`Handler.lean:53`) |
| 2.3 | `interpret h (Prog.op e) = h.handle e` | KEEP (`Representation.lean:115`) |
| 2.4 | `Handler.ext`: handlers agreeing per operation are equal | STATE-NEW (exhibits §3) |
| 2.5 | **uniqueness**: `(∀ op, interpret h (op) = interpret g (op)) → h = g` | STATE-NEW (exhibits §3) |
| 2.6 | **existence**: every monad morphism out of `Prog S` is `interpret h` for the handler `fun op => φ (Prog.op op)` | STATE-NEW (exhibits §4) — **this is R3/R10's sentence, and 2.4–2.6 together are what licenses the word "IS"** |
| 2.7 | `interpret idHandler p = p` | KEEP (`Representation.lean:68`) |
| 2.8 | `eq_of_forall_interpret` | KEEP (`Representation.lean:80`) with a universe rider in the docstring |

**§3 — sums.**

| # | Law | Mark |
|---|---|---|
| 3.1 | `interpret (h.sum g) p.inl = interpret h p` | STATE-NEW (exhibits §1) |
| 3.2 | `interpret (h.sum g) p.inr = interpret g p` | STATE-NEW (exhibits §1) |
| 3.3 | `Prog.inl` / `Prog.inr` are `interpret` of the injection handlers | STATE-NEW — makes 3.1/3.2 corollaries of 2.2 and kills the hand-rolled recursions (`Prog.lean:43-50`) |
| 3.4 | `Prog.handleLlm oracle = interpret (idHandler.sum ⟨fun (.infer q) => .pure (oracle q)⟩)` | STATE-NEW, or **delete `handleLlm` and define it this way** (consolidation, `Interp.lean:184-187`) |
| 3.5 | `handleLlm oracle (liftCas p) = p` | STATE-NEW (exhibits §6) — the law every `runAgent` client assumes |
| 3.6 | `handleLlm` respects `bind` | STATE-NEW (exhibits §6), or free from 3.4 + 2.2 |

**§4 — the tower is a category.**

| # | Law | Mark |
|---|---|---|
| 4.1 | `interpret h (interpret t p) = interpret (t.through h) p` | KEEP (`Tower.lean:71`) |
| 4.2 | `through` is associative | STATE-NEW (exhibits §5) |
| 4.3 | `idHandler` is a left and right unit for `through` | STATE-NEW (exhibits §5) |
| 4.4 | the `Prog`-valued-middle restriction, stated in prose beside 4.1 | STRENGTHEN (docstring; B.4's rider) |
| 4.5 | `checkRefs (xs ++ ys) = checkRefs xs >>= fun _ => checkRefs ys` | STATE-NEW, or obtain it by rewriting `checkRefs` as `List.forM` per `Prog.lean:18` |
| 4.6 | a `Handler ByteSig M` exists | **PROVE-OWED — and today it cannot be stated, because no such handler exists (B.5)** |
| 4.7 | `casOverBytes` over a faithful byte-plane handler agrees with `referenceHandler` | PROVE-OWED (`Tower.lean:26-29`), **blocked on 4.6**, and its statement must say whether refusal SORTS are in scope (see ruling question 3) |

**§5 — the reference semantics and its two interpreters.**

| # | Law | Mark |
|---|---|---|
| 5.1 | `step_handle`, `step_load_agrees`, `step_put_fresh`, `step_put_error` | KEEP (`Handler.lean:131`, `Interp.lean:88`, `:98`, `:112`); 5.1a: after C.1's consolidation, `step_handle` becomes `rfl` |
| 5.2 | `step_preserves_wf`, `run_preserves_wf` (L7) | KEEP (`Interp.lean:119`, `:163`) |
| 5.3 | the bridge `run_interpretRef_agree` | KEEP (`Handler.lean:255`) |
| 5.4 | `run_halts`: `∀ p w, ∃ fuel, ∀ f ≥ fuel, (run H f p w).1.isRunning = false` | STATE-NEW — immediate from `run_of_interpretRef`; unblocks `ObsEq.of_run` outside the `PProg` fragment (B.6) |
| 5.5 | word monotonicity: `∃ suffix, (run H f p w).2 = w ++ suffix` | STATE-NEW — the fragment has it (`runP_frame_sound`, `Defun.lean:1965`); general `run` does not, and `Word.resolvesIn_mono` (`Cas/IR/Word.lean:135`) exists to carry it |
| 5.6 | the bridge's four riders, stated in its docstring | STRENGTHEN (B.12) |

**§6 — stratum-3 equalities.**

| # | Law | Mark |
|---|---|---|
| 6.1 | `SemEq.of_eq`, `ObsEq.of_eq`, `ObsEq.of_run`, `ObsEq.run_done`, `ObsEq.run_refused` | KEEP (`Representation.lean:127`–`:208`) |
| 6.2 | the gate chain `TS run = fixture word = run = interpretRef`, with each link named | STRENGTHEN — the middle link exists (`putTree_correct`, `Cas/Lang/Lang.lean:26-29`) and is never named as the link R5 depends on (B.7) |
| 6.3 | `replayHandler`'s contract, whatever it is | **PROVE-OWED, and the current prose must be withdrawn first** (B.3) |

**§7 — `H`.**

| # | Law | Mark |
|---|---|---|
| 7.1 | `ObsEq` is `H`-indexed | KEEP (`Representation.lean:134`) |
| 7.2 | R10's "meaning lives in exactly one place" reworded to "one place, per address function `H`" | STRENGTHEN (one sentence, EFFECTS-BACKEND.md:157-162) |

### C.3 Consolidation, counted

Nineteen statements, of which **fourteen are STATE-NEW over existing
carriers and all fourteen are already proved in
`.staging/algebraic-review/handlers-semantics-exhibits.lean`** (§1–§6 of
that file). Two are PROVE-OWED and blocked (4.6, 4.7). One (6.3) is blocked
on a ruling. Nothing on this list requires a new sort, a new carrier, or a
new abstraction; three of the items (C.1's two moves, 3.3/3.4) *delete*
machinery.

---

## Ruling questions (not decided here)

1. **What is `replayHandler` for?** B.3 shows it is not the co-direction of
   recording as R10 states. Three exits: (a) fix the definition (make `load`
   resolve against the consumed prefix and `put` tolerate duplicates) and
   prove the round-trip against `referenceHandler`; (b) narrow the claim to
   put-only programs and state that domain; (c) withdraw `replayHandler`
   until the record/replay plane has a consumer. The estate has already
   ruled what it is *not* (`.staging/operational-structure/DESIGN.md:45-56`);
   it has never ruled what it is. **Nothing should be built on R10's
   replay/record sentence until this is answered.**

2. **Does the tower get a bottom, or does `casOverBytes` get withdrawn?**
   B.5: `ByteSig` has no handler, so R12's "composes all the way down to the
   admitted seams" describes a descent with no last step, and the owed
   refinement theorem (`Tower.lean:26-29`) is not merely unproved but
   currently unstatable. A byte-plane handler would be a new *instance*, not
   a new sort — but it is new code, so it is a ruling, not a consolidation.
   Separately and cheaply: `ByteE.presence` has no consumer and R2 says a
   signature's operations are consumer-gated (EFFECTS-BACKEND.md:49-51) —
   remove the arm, or name its consumer.

3. **Does "agrees word for word" (EFFECTS-BACKEND.md:219-222) include
   refusal SORTS?** `casOverBytes` refuses only through `byteFail : String`
   (`Tower.lean:124`, `:122`, `:101-102`), so it cannot produce
   `Refusal.dangling`/`.wrongKind`/`.collision`. As worded, the owed theorem
   can be discharged while a client branching on the `Refusal` constructors
   sees different answers from the two strata. This must be settled *in the
   statement*, before the proof is attempted.

4. **`Handler.sum` — law it or lose it.** B.9: zero uses, zero laws, while
   both live sum-consumers open-code the split and `merge/cas-word` adds a
   third. Either 3.1–3.3 land and the open-coded consumers are rewritten
   through it, or R10's seam-effects clause names a mechanism the estate does
   not use.

5. **The C.1 file re-layout** (define `step` from `referenceHandler`) touches
   `Cas/Lang/Interp.lean` and `Cas/Lang/Handler.lean`, which the merge-floor
   rule (`CORE-ABSTRACTIONS-PLAN.md:78-81`) puts after the `merge/cas-word`
   landing. Sequencing, not substance — flagged so it is not started early.
