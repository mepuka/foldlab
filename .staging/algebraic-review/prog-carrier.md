# prog-carrier — the program carrier and its monad algebra

Algebraic model review, operator-ordered 2026-08-30. Area: the program
carrier and its monad algebra —
`library/cas/Cas/Lang/Prog.lean`, `Sig.lean`, `Ops.lean`, `Lang.lean`,
reviewed against the law they claim to realize
(`library/cas/EFFECTS-BACKEND.md` R1, R2, R10, R14, R14a).

Reviewer role: both implementer (state the algebra that EXISTS) and
breaker (attack it). Read-only outside `.staging/algebraic-review/`.

**Files inside the area** (all reviewed at working-tree = HEAD; none is
dirty): `Prog.lean` (54 lines), `Sig.lean` (27), `Ops.lean` (69),
`Lang.lean` (46).

**Files read as evidence, outside the area** (their laws are cited, not
reviewed): `Handler.lean`, `Interp.lean`, `Representation.lean`,
`Tower.lean`, `Roots.lean`, `Fragments.lean`, `Defun.lean`,
`Auth.lean`.

**Out of scope, pending merge** (§0 of
`.staging/operational-structure/CORE-ABSTRACTIONS-PLAN.md`):
`Cas/Lang/Worded.lean` and `Cas/Lang/WordWire.lean` on
`merge/cas-word`, and the daemon files on `merge/daemon-spine`. They
are noted as pending and were not opened. `Worded.lean` adds a fourth
signature (`WordSig`) summed with `CasSig`; every sum-law hole below
(§2.1, §2.2) lands on it when it merges, so the owed statements should
be settled before that merge, not after.

**Register.** Per AGENTS.md C5, no soundness word appears below without
its judgment named. "PROVED" always carries a theorem name and a
`file:line`. Where a claim is carried by prose only, it says
ASSERTED; where it is carried by nothing written anywhere, FOLKLORE.

---

## 0. Verdict in one paragraph

The monad half of the claimed algebra is real and carried by theorems:
`LawfulMonad (Prog S)` is proved from two induction lemmas
(`Representation.lean:39-58`), `interpret` is proved to respect `bind`
for every handler into every lawful target (`interpret_bind`,
`Handler.lean:53-60`), and the small-step/big-step bridge R10 named as
owed is discharged (`run_interpretRef_agree`, `Handler.lean:255-272`).
The **sum half is not there at all**. `Sig.sum` (`Sig.lean:20-22`),
`Prog.inl`/`Prog.inr` (`Prog.lean:43-50`) and `Handler.sum`
(`Handler.lean:63-66`) carry **zero theorems** between them;
`Prog.inr` and `Handler.sum` have zero call sites in the whole library;
and the two places the estate actually interprets a summed signature —
`Prog.handleLlm` (`Interp.lean:184-187`) and `stepRooted`
(`Roots.lean:69-81`) — are bespoke recursions that go through neither
`Handler.sum` nor `interpret`, and are tied to them by no theorem. So
R2 ("signatures … compose by sum … our `⊕ₛ` and `Prog.inl`/`inr` are
the same algebra", EFFECTS-BACKEND.md:46-52) is at present a claim
about two definitions and an unproved analogy. Separately, the word
INITIAL (EFFECTS-BACKEND.md:263) and the word "free monad"
(`Lang.lean:21`) both name a universal property — uniqueness of the
extension of a handler to a monad morphism — that **no theorem in the
estate states**; the theorem cited for it, `eq_of_forall_interpret`
(`Representation.lean:80-84`), is a strictly weaker corollary proved by
instantiating its own hypothesis at the syntactic monad.

---

## 1. IMPLEMENTER VIEW — the algebra that exists

### 1.1 The signature

**Sorts** (Lean types; `Type` means `Type 0` throughout — the universe
restriction is load-bearing, see §2.1 hole H-1).

| Sort | Declaration | Note |
|---|---|---|
| `Sig` | `Sig.lean:13-15` — `structure Sig where Op : Type; Ans : Op → Type` | a language, as data |
| `Prog S A` | `Prog.lean:25-27` — `inductive Prog (S : Sig) (A : Type u)` | the carrier; `A` is universe-polymorphic, everything that gives it meaning is not |
| `Handler S M` | `Handler.lean:42-43` — `structure Handler (S : Sig) (M : Type → Type v)` | a semantics |
| `Status S A` | `Interp.lean:42-45` — `done`/`running`/`refused` | small-step result, `A : Type` only |
| `Refusal` | `Interp.lean:28-34` | six clauses |

**Operations of the carrier.**

| Operation | Type | Site |
|---|---|---|
| `Prog.pure` | `A → Prog S A` | `Prog.lean:26` |
| `Prog.vis` | `(op : S.Op) → (S.Ans op → Prog S A) → Prog S A` | `Prog.lean:27` |
| `Prog.bind` | `Prog S A → (A → Prog S B) → Prog S B` | `Prog.lean:31-33` |
| `Prog.op` | `(e : S.Op) → Prog S (S.Ans e)` | `Prog.lean:40` — **0 call sites outside its own theorem** |
| `Prog.inl` | `Prog S A → Prog (S ⊕ₛ T) A` | `Prog.lean:43-45` |
| `Prog.inr` | `Prog T A → Prog (S ⊕ₛ T) A` | `Prog.lean:48-50` — **0 call sites** |
| `Sig.sum` (`⊕ₛ`) | `Sig → Sig → Sig` | `Sig.lean:20-25` |
| `interpret` | `Handler S M → Prog S A → M A` (`[Monad M]`) | `Handler.lean:47-49` |
| `Handler.sum` | `Handler S M → Handler T M → Handler (S ⊕ₛ T) M` | `Handler.lean:63-66` — **0 call sites** |
| `Handler.through` | `Handler S (Prog T) → Handler T M → Handler S M` | `Tower.lean:65-67` |

**Signatures in the estate** (four; all `Sig` values, none carrying a
`DecidableEq` — see hole H-3):

| Signature | Operations → answers | Site |
|---|---|---|
| `CasSig` | `put (n : Node) → Addr32`; `load (a : Addr32) → Node`; `fail (r : String) → Empty` | `Ops.lean:21-33` |
| `LlmSig` | `infer (prompt : String) → String` | `Ops.lean:36-43` |
| `RootSig` | `publish (a : Addr32) → Unit`; `listRoots → List Addr32` | `Roots.lean:29-39` |
| `ByteSig` | `loadBytes → Option Bytes`; `presence → Bool`; `putBytes → Unit`; `fail → Empty` | `Tower.lean:36-49` |
| `AgentSig` | `CasSig ⊕ₛ LlmSig` | `Ops.lean:46` |
| `StoreSig` | `CasSig ⊕ₛ RootSig` | `Roots.lean:42` |

**Smart constructors over `CasSig`** — `put` (`Ops.lean:49`), `load`
(`:52`), `failWith` (`:55-56`), `require` (`:59-60`), `liftCas`
(`:63`), `infer` (`:66-67`).

### 1.2 The laws, with status and evidence

Status vocabulary as ordered: **PROVED** (theorem name + `file:line`),
**GATED** (a byte/word/test gate carries it), **ASSERTED** (stated in
docs or comments, carried by nothing), **FOLKLORE** (relied on,
written nowhere).

#### Monad laws — the part that holds

| # | Law | Status | Evidence |
|---|---|---|---|
| M1 | `p.bind .pure = p` | PROVED | `Prog.bind_pure_right`, `Representation.lean:39-44` |
| M2 | `(p.bind f).bind g = p.bind (fun a => (f a).bind g)` | PROVED | `Prog.bind_assoc'`, `Representation.lean:46-52` |
| M3 | `(Prog.pure a).bind f = f a` | PROVED | `rfl`, discharged inline at `Representation.lean:57` |
| M4 | `LawfulMonad (Prog S)` | PROVED | instance, `Representation.lean:54-58`, via `LawfulMonad.mk'` on M1–M3 |
| M5 | `interpret h (.pure a) = pure a` | PROVED | `interpret_pure`, `Representation.lean:110-111` (`rfl`) |
| M6 | `interpret h (p.bind f) = interpret h p >>= (interpret h ∘ f)` | PROVED | `interpret_bind`, `Handler.lean:53-60` |
| M7 | `interpret h (Prog.op e) = h.handle e` | PROVED | `interpret_op`, `Representation.lean:115-117` — **but see gap C-3: its subject `Prog.op` is used nowhere** |
| M8 | `interpret idHandler p = p` | PROVED | `interpret_id`, `Representation.lean:68-74` |
| M9 | `interpret h (interpret t p) = interpret (t.through h) p` | PROVED | `interpret_through`, `Tower.lean:71-85` |

#### Initiality

| # | Law | Status | Evidence |
|---|---|---|---|
| I1 | agreement under every handler into every `M : Type → Type` implies `p = q` | PROVED | `eq_of_forall_interpret`, `Representation.lean:80-84` |
| I2 | **uniqueness**: any monad morphism `φ` with `φ ∘ Prog.op = h.handle` equals `interpret h` | **ASSERTED** | the words INITIAL (EFFECTS-BACKEND.md:263) and "free monad" (`Lang.lean:21`) name it; no theorem states it (grep: no `uniq` anywhere in `Cas/Lang/`) |
| I3 | `Prog S` is the free monad on `X ↦ Σ op, (S.Ans op → X)` | **ASSERTED** | `Lang.lean:21`; carried by nothing |

#### Signature sum — R2

| # | Law | Status | Evidence |
|---|---|---|---|
| S1 | `(h.sum g).handle (.inl op) = h.handle op` | **FOLKLORE** | true by `rfl`; nowhere stated |
| S2 | `(h.sum g).handle (.inr op) = g.handle op` | **FOLKLORE** | as S1 |
| S3 | `interpret (h.sum g) p.inl = interpret h p` | **FOLKLORE** | the law every consumer of `liftCas`/`liftRootedCas` assumes; nowhere stated |
| S4 | `interpret (h.sum g) q.inr = interpret g q` | **FOLKLORE** | as S3 |
| S5 | `Prog.inl` is a monad morphism (`(p.bind f).inl = p.inl.bind (·.inl ∘ f)`) | **FOLKLORE** | nowhere stated |
| S6 | `Prog.inl` injective | **FOLKLORE** | nowhere stated |
| S7 | `⊕ₛ` has a unit | — | **not stateable**: no `Sig.empty` exists (ruling question RQ-1) |
| S8 | `⊕ₛ` associative | — | **false as an equation** (`(A ⊕ B) ⊕ C ≠ A ⊕ (B ⊕ C)` in Lean); only an iso, needing a signature-morphism notion the estate does not have (RQ-2) |
| S9 | `⊕ₛ` commutative | — | as S8 (RQ-2) |
| S10 | R2's "`⊕ₛ` and `Prog.inl`/`inr` are the same algebra" as ITrees' `E +' F` with `Subevent` | **ASSERTED** | EFFECTS-BACKEND.md:46-52; ITrees' `Subevent` is a resolution class closed under nesting, ours is two hand-applied functions — see gap C-4 |

#### Fuel and the small-step presentation — R1

| # | Law | Status | Evidence |
|---|---|---|---|
| F1 | the carrier is finite (no coinduction) | PROVED by construction | `inductive Prog`, `Prog.lean:25-27`; `interpret` is total by structural recursion (`Handler.lean:47-49`), and its totality is what Lean's termination checker accepts at elaboration |
| F2 | `run` reports `.running` only on fuel exhaustion | PROVED by construction | `run`, `Interp.lean:146-153` — `.running` is returned only in the `fuel = 0` arm |
| F3 | a halted run agrees with the reference meaning (value **and** word) | PROVED | `interpretRef_of_run_done`, `Handler.lean:165-184` |
| F4 | a refused run agrees with the reference refusal (and on nothing else) | PROVED | `interpretRef_of_run_refused`, `Handler.lean:189-207` |
| F5 | enough fuel exists and is produced, not assumed | PROVED | `run_of_interpretRef`, `Handler.lean:214-245` |
| F6 | the bridge: fueled `run` and big-step `interpretRef` are one semantics | PROVED | `run_interpretRef_agree`, `Handler.lean:255-272` |
| F7 | **every `Prog CasSig` halts at some fuel** | **ASSERTED** (derivable in one line from F5, not named) | contrast `runP_halts` for the L-A table, `Defun.lean:403-404` |
| F8 | `run` is monotone in fuel past a halt | **FOLKLORE** | true; derivable from F3/F4/F5; nowhere stated |
| F9 | exact fuel for the defunctionalized fragment | PROVED | `runP_embed_agree` at fuel `p.length + 1`, `Defun.lean:362-364` |
| F10 | word admission preserved by every step and every run | PROVED | `step_preserves_wf` `Interp.lean:119-142`; `run_preserves_wf` `Interp.lean:163-177` |

#### The pure discipline — R14a

| # | Rule | Status | Evidence |
|---|---|---|---|
| P1 | effect-free work stays outside `Prog` | ASSERTED, and held in practice | EFFECTS-BACKEND.md:276-278; `resolveRefs`/`PIn.resolve` (`Defun.lean:199-207`) are plain definitions, not lifted — the rule is followed, nothing enforces it |
| P2 | "continuations end in `.pure`; programs compose by smart constructors + `bind`" | **ASSERTED and FALSIFIED in the estate's own code** | exhibit B-6 |
| P3 | "constructor form in statements, typeclass form in program text" | **ASSERTED and inverted in practice** | exhibit B-7 |

#### Conformance (γ) for this area

`Prog` is L-P and has **no host mirror by ruling** — R7 and
`Fragments.lean:176-179` ("Store encoding: NO — this is R7's
boundary"). The TypeScript mirror `library/effects/src/cas/Programs.ts`
mirrors `PProg`/`encodeProg`, not `Prog` (its own header,
`Programs.ts:2-3, 13`). So the conformance obligation class is
**empty for this area by design**, and that is consistent. The gates
that exist (`mise run check:cas`, mise.toml:429-445) carry the L-A
table's byte and word identity, not the `Prog` algebra.

#### Ruling-to-code binding

The estate has a mechanism for binding a ratified ruling to a
declaration the build reads — the `LAW <id>: <clause>` docstring
convention and the `laws` ledger executable
(`library/cas/tools/Laws.lean:1-70`, gated by `check:cas:laws`,
mise.toml:444). It is wired for `SM-` rulings only. **No `LAW` line
exists anywhere in `library/cas/Cas/Lang/`** (grep). So R1, R2, R10,
R14 and R14a are bound to nothing the build reads — precisely the
defect `Laws.lean:8-11` names in its own opening ("rewrite the comment
and the law is gone, silently, with every gate still green").

---

## 2. BREAKER VIEW

### 2.1 Underspecification holes — a wrong implementation passes

#### H-1 — `Prog`'s universe exceeds every semantics it has

`Prog` is declared at `A : Type u` (`Prog.lean:25`). Everything that
gives a program meaning is `Type 0`-only: `Handler` takes
`M : Type → Type v` (`Handler.lean:42`), so `interpret`'s `A` is
`Type 0` (`Handler.lean:47`); `Status` is declared `(A : Type)`
(`Interp.lean:42`), so `step` and `run` are `Type 0`-only.

```
EXHIBIT B-1
WITNESS    (Prog.pure Nat : Prog CasSig Type)      -- A := Type : Type 1
           typechecks: Prog.lean:25 admits it.
CONSEQUENCE  A legal, well-typed program of the carrier for which
           interpret, interpretRef, step and run do not typecheck.
           R1 (EFFECTS-BACKEND.md:32-45) says "Prog S A is a finite
           interaction tree"; R10 (:150-152) says "one syntax, every
           semantics a handler". This program has syntax and no
           semantics, in any handler, at any target.
KILLED BY  declaring `inductive Prog (S : Sig) (A : Type)` — the
           whole estate uses it only at Type 0 (grep: no Prog at a
           higher universe anywhere in library/ or examples/).
CLASS      claim-scope / domain
```

#### H-2 — `Handler.sum` admits a handler that ignores one summand

Nothing states S1–S4 (§1.2). The types alone do not pin `Handler.sum`
whenever the answer type is inhabited.

```
EXHIBIT B-2
LAW CLAIMED  R10, EFFECTS-BACKEND.md:177-179 — "Seam effects get
             signatures … summed in (⊕ₛ, Handler.sum), never smuggled
             through request/reply."
LAW STATED   none. Handler.sum (Handler.lean:63-66) carries no theorem.
ADVERSARY    def badSum (h : Handler CasSig (RefM)) (g : Handler LlmSig (RefM))
                 : Handler AgentSig (RefM) where
               handle
                 | .inl op          => h.handle op
                 | .inr (.infer _)  => fun w => .ok ("", w)
             -- typechecks; g is discarded; no stated law is violated.
WITNESS      any AgentSig program whose only LlmSig operation is an
             `infer`: e.g. examples/CasExamples/AgentStep.lean:42-55,
             whose model answer becomes "" and whose value node is
             therefore the empty payload.
BLIND GATE   the estate's chosen observation is the word (R5). Every
             CasSig-only program is word-identical under badSum, so
             no run gate distinguishes it.
KILLED BY    interpret_inr : interpret (h.sum g) (Prog.inr q) = interpret g q
CLASS        adequacy
```

#### H-3 — `Prog.inl` admits a duplicating lift the word gate cannot see

```
EXHIBIT B-3
LAW CLAIMED  Ops.lean:62 — liftCas is "A store program, spoken inside
             the agent language"; Roots.lean:44 the same for
             liftRootedCas. Both are Prog.inl (Prog.lean:43-45).
LAW STATED   none.
ADVERSARY    def inl' : Prog S A → Prog (S ⊕ₛ T) A
               | .pure a  => .pure a
               | .vis e k => .vis (Sum.inl e) fun r =>
                               .vis (Sum.inl e) fun _ => (k r).inl'
             -- performs every operation TWICE, keeps the first answer.
WHY IT PASSES  On CasSig the doubling is invisible at the word: a
             second `put` of the same node is Cas.put's `duplicate`
             outcome, which leaves the word unchanged
             (referenceHandler, Handler.lean:85); a second `load` of a
             present address is Word.find again (:88-90); `fail`
             answers Empty so the doubled node is unreachable. Hence
             ObsEq H (liftCas p) (inl' p) holds for every store
             program, and the R5 word gate is blind by construction.
WHAT MOVES   the operation count — so fuel doubles (run, Interp.lean:146),
             and on the LlmSig summand the oracle is called twice.
KILLED BY    S3 (interpret_inl) together with S5 (inl is a monad
             morphism); nothing weaker separates them.
CLASS        adequacy
```

This is the sharpest hole in the area: the estate's *only* mechanical
check on program meaning cannot in principle see the defect, so the
statement is the whole of the protection.

#### H-4 — `Sig` does not enforce the first-order discipline it is credited with

```
EXHIBIT B-4
LAW CLAIMED  R2, EFFECTS-BACKEND.md:46-52 — signatures are ITrees'
             event-signature discipline; EFFECTS-BACKEND.md:365-366
             names GITrees as the study source "when modular
             higher-order effects pressure R2's first-order signature
             discipline", i.e. the discipline is taken as currently in
             force.
LAW STATED   none. Sig (Sig.lean:13-15) is `Op : Type` plus
             `Ans : Op → Type`, with no side condition.
WITNESS      def higherOrderSig : Sig := ⟨Unit, fun _ => Prog CasSig Nat⟩
             -- typechecks (Prog CasSig Nat : Type). An operation whose
             ANSWER is a program: the exact shape R2 excludes in prose.
             Everything downstream still applies — Prog, interpret,
             Handler.sum — and nothing refuses it.
CLASS        adequacy / claim-scope
NOTE         The estate does have a named boundary of this kind, but
             one rung down and for a different carrier:
             PLine.HashDetermined (Defun.lean:1480) with its discharge
             PLine.hashDetermined (:1496) and its counter-witness
             (:2190-2199). There is no analogue at Sig.
```

#### H-5 — stratum 1's decidability claim has no instance for any signature

R14 (EFFECTS-BACKEND.md:257-260) puts "operations" in stratum 1 and
says its equality "is `DecidableEq` — structural, hashable,
addressable".

```
EXHIBIT B-5
WITNESS    example : DecidableEq CasE := inferInstance     -- fails
           CasE (Ops.lean:21-24) has no `deriving` clause, and neither
           do LlmE (:36-37), RootE (Roots.lean:29-31), ByteE
           (Tower.lean:36-40), Refusal (Interp.lean:28-34) or Status
           (:42-45). The only `deriving DecidableEq` in Cas/Lang/ are
           on PIn, PLine, PKind, PutShape, Envelope (Defun.lean:170,
           183, 1137, 1160, 1202).
CONSEQUENCE  Nothing in the estate can decide equality of two
           operations, hash one, or address one. What is decidable and
           addressable is PLine — a DIFFERENT type with a different
           operation vocabulary (put/load only; no `fail` line). So
           R14's "operations" row is discharged by PLine, not by any
           Sig's Op, and the two are not in bijection.
CLASS      claim-scope
```

### 2.2 Missing laws — equations any client assumes that nothing states

| Missing law | Statement | Who assumes it | Provable today? |
|---|---|---|---|
| **L-1** failure absorbs the continuation | `(failWith r : Prog CasSig A).bind f = (failWith r : Prog CasSig B)` | every user of `require` (`Ops.lean:59-60`), e.g. `AgentStep.lean:44`; every proof that a refusing program does no further work | yes — `Prog.vis` at an uninhabited answer type is determined by `op` alone (`funext` on `Empty`) |
| **L-2** `require` computes | `require true r = pure ()`, `require false r = failWith r` | as L-1 | yes, `rfl` both |
| **L-3** the sum laws | S1–S6 of §1.2 | `liftCas`, `liftRootedCas`, `handleLlm`, and the planned build/venue seams (`.staging/operational-structure/BUILD-MODELING-AUDIT.md:85,118`; `BUILD-SEMANTICS.md:195`) | yes, all six; S3/S4/S5 by induction on `Prog` |
| **L-4** `handleLlm` is a monad morphism | `(p.bind f).handleLlm o = (p.handleLlm o).bind (fun a => (f a).handleLlm o)` | `Interp.lean:19` calls it "interpret by monad morphism" — the claim is in the module docstring and carried by nothing | yes, and free once L-6 lands |
| **L-5** the lift is a section | `(liftCas p).handleLlm o = p` | anyone reading `liftCas` as "the same program" (`Ops.lean:62`) | yes, from S3 + `interpret_id` |
| **L-6** `handleLlm` is an `interpret` | `p.handleLlm o = interpret (idHandler.sum ⟨fun (.infer s) => .pure (o s)⟩) p` | R10's "every semantics is a handler" (EFFECTS-BACKEND.md:150-152) | yes, by induction; needs no new type — the right-hand side is a value of the existing `Handler` |
| **L-7** general halting | `∀ p w, ∃ fuel, (run H fuel p w).1.isRunning = false` | every host that must choose a fuel; R1's "divergence is fuel exhaustion" | yes, one line from `run_of_interpretRef` (`Handler.lean:214`) |
| **L-8** fuel monotonicity | halted at `f` implies the same result at every `f' ≥ f` | every consumer comparing two runs at different fuels — including `ObsEq.of_run`'s hypothesis shape (`Representation.lean:162-165`) | yes, from F3/F4/F5 |
| **L-9** interpretation uniqueness (I2) | `φ` a monad morphism agreeing with `h` on operations ⟹ `φ = interpret h` | the words INITIAL (EFFECTS-BACKEND.md:263) and "free monad" (`Lang.lean:21`) | yes, by induction, with `φ` and its two morphism hypotheses as explicit parameters — no new type |
| **L-10** the rooted run's preservation and halting | `runRooted_preserves_wf`, `runRooted_halts` | anyone running a `StoreSig` program; only the one-step `stepRooted_preserves_wf` exists (`Roots.lean:94-107`) | yes, by the same induction as `run_preserves_wf` |
| **L-11** general `interpret` at a `vis` node | `interpret h (.vis op k) = h.handle op >>= fun a => interpret h (k a)` | every proof over `interpret`; today it is `rfl` but restated twice locally — `interpretRef_vis` (`Handler.lean:149-160`) and `interpret_vis_state` (`Auth.lean:387-399`, whose own docstring calls itself "the generic form of `interpretRef_vis`") | yes, `rfl` |

### 2.3 Claim-scope gaps — the "well, technically" class

#### C-1 — INITIAL / free monad name a property no theorem states

EFFECTS-BACKEND.md:262-265 reads: `Prog` is "a proved `LawfulMonad`
(every normalizer rewrite licensed) and INITIAL
(`eq_of_forall_interpret`: agreement under every lawful interpretation
IS structural equality — no finer program equality exists)".
`Lang.lean:21` says `Prog` "is the free monad of continuations over a
signature".

What `eq_of_forall_interpret` (`Representation.lean:80-84`) actually
says: if `p` and `q` agree under *every* handler into *every*
`M : Type → Type`, then `p = q`. Its proof
(`Representation.lean:83-84`) instantiates that hypothesis at exactly
one point — `M := Prog S`, `hd := idHandler` — and closes with
`interpret_id`. So the theorem is `interpret_id` plus a
specialization.

What it does not say, and what the words INITIAL and FREE do say: that
`interpret h` is the *unique* monad morphism extending `h`. That is
L-9, and it is unstated. The universal property is the thing that
licenses "a semantics IS a handler" (R10); without it, `interpret` is
merely *a* way to give a handler meaning.

The reading the prose invites, and its refutation:

```
EXHIBIT B-6  ("no finer program equality exists")
CLAIM READ AS  two programs that behave alike in the estate's semantics
               are equal.
FALSE. WITNESS
  let n be any well-formed node with NO references (n.refs = [] makes
  Cas.put's checkRefs trivially ok on any store, Admission.lean:178-180)
  p := put n
  q := put n >>= fun a => put n >>= fun _ => pure a
  Under referenceHandler (Handler.lean:78-92): whatever the first put
  does — refuse, or answer a — the second put of the SAME node runs
  against a store that already holds n at addr H n, so
  σ (addr H n) = some n and m = n.val, giving Cas.put's `duplicate`
  outcome (Admission.lean:183-184), which answers the same address and
  leaves the word unchanged (Handler.lean:85). So for every H and
  every starting word, interpretRef H p w = interpretRef H q w, i.e.
  ObsEq H p q (Representation.lean:134-135).
  And p ≠ q: p is .vis (.put n) .pure, q is
  .vis (.put n) (fun a => .vis (.put n) (fun _ => .pure a)).
CONCLUSION  ObsEq is strictly coarser than =. The sentence "no finer
            program equality exists" is true (nothing is finer than
            equality, for any type) and carries no information; the
            load-bearing direction — that = is not too fine for the
            estate's purposes — is false and is what R5's certificate
            discipline exists to handle. The prose should say which.
CLASS       claim-scope
```

#### C-2 — R1's "divergence is fuel exhaustion" is a statement about one presentation, not about the carrier

R1 (EFFECTS-BACKEND.md:43-45): "Divergence enters, when it must, as
fuel exhaustion (`Status.running`), never as a coinductive citizen."

Precisely: `Prog` is inductive, so **no `Prog` diverges**. The fuel is
not forced by the carrier — `interpretRef` (`Handler.lean:96-98`) is
the fuel-free total interpretation of exactly the same programs, by
structural recursion on `p`. Fuel exists because `run`
(`Interp.lean:146-153`) is the *small-step* presentation the
TypeScript host executes; `Status.running` today means only "the fuel
was too small", never "this will not finish", and **no theorem says
so** (L-7 unstated). The glossary already gets this right — "fuel
belongs to the small-step presentation, never to the API"
(`docs/effect-replay/CONTEXT.md:743-744`) — and R1's wording reads as
a carrier property. Note the drift, or state L-7 so the reading is
harmless.

#### C-3 — `interpret_op` is stated over a constructor nothing uses

R14a-P2 (EFFECTS-BACKEND.md:279-282): "the leaf/operation cases of
every proof close by `interpret_pure` (rfl) and `interpret_op`".

`interpret_op` (`Representation.lean:115-117`) is stated over
`Prog.op` (`Prog.lean:40`). `Prog.op` occurs in exactly two places in
the library, both inside that theorem (grep). Every smart constructor
spells the constructor instead: `put` (`Ops.lean:49`), `load` (`:52`),
`infer` (`:66-67`), `publish` (`Roots.lean:48-49`), `listRoots`
(`:52-53`), `byteLoad` (`Tower.lean:51-52`), `bytePresence` (`:54-55`),
`bytePut` (`:57-58`). They are definitionally equal, so `exact
interpret_op …` still closes such a goal — but `rw [interpret_op]` and
`simp [interpret_op]`, the stated mechanism, fire on nothing.
Consistently: `interpret_op` has **zero** consumers, and so do
`eq_of_forall_interpret`, `interpret_through`, `SemEq` and
`SemEq.of_eq` (grep counts: 2, 3, 3, 4 occurrences respectively, all
of them the declaration itself, its own docstring, or a prose mention
in `Fragments.lean`).

#### C-4 — R2's ITrees analogy overstates what `⊕ₛ` provides

R2 (EFFECTS-BACKEND.md:46-52) equates our `⊕ₛ` + `Prog.inl`/`inr` with
ITrees' `E +' F` **with `Subevent` injection**. `Subevent` is a
typeclass whose whole point is that a program over `E` lifts into any
sum containing `E` at any nesting depth, resolved by instance search.
Ours is two hand-applied functions with no class, no laws, and
`Prog.inr` never applied. Concretely: lifting a `Prog CasSig A` into
`Prog ((CasSig ⊕ₛ LlmSig) ⊕ₛ RootSig) A` requires writing
`Prog.inl ∘ Prog.inl` by hand at every site, and there is no theorem
that the two spellings of a triple sum relate at all (S8). "The same
algebra" is the overstatement; "the binary case of the same shape,
without the resolution class" is the accurate sentence.

#### C-5 — R14a P2 and P3 are falsified by the code they describe

```
EXHIBIT B-7  (P2 — "continuations end in .pure")
WITNESSES  failWith  (Ops.lean:55-56)   : .vis (.fail reason) (fun e => e.elim)
           byteFail  (Tower.lean:60-61) : .vis (.fail reason) (fun e => e.elim)
           embedFrom (Defun.lean:215-228): writes .vis directly; the
             continuation is a recursive call to embedFrom, which ends
             in .pure OR in failWith.
           stepRooted (Roots.lean:74)   : rebinds `rest.inl.bind k`.
CONSEQUENCE  P2's stated consequence — "the leaf/operation cases of
           every proof close by interpret_pure (rfl) and interpret_op" —
           does not hold for the fail node: Prog.op (.fail r) has type
           Prog CasSig Empty, which is NOT failWith r : Prog CasSig A,
           and no lemma relates them. L-1 is the missing statement.
```

```
EXHIBIT B-8  (P3 — "typeclass form in program text")
The typeclass spelling `pure` appears in program text at exactly two
sites in Cas/Lang/: Prog.lean:36 (the instance itself) and
Handler.lean:48 (inside interpret). Every smart constructor, every
handler body (referenceHandler Handler.lean:78-92, replayHandler
:279-292, casOverBytes Tower.lean:111-133) and every program-building
definition uses the CONSTRUCTOR spelling `.pure` / `.vis`. The one
P3-compliant program text in the estate is
examples/CasExamples/AgentStep.lean:42-55, which is do-notation.
So P3 as written describes the inverse of the estate's practice.
Either the rule or the code is the defect; the review's job is to say
they disagree, and the ruling is owed.
```

### 2.4 Cross-carrier inconsistencies

**X-1 — two incompatible accounts of interpreting a summed signature.**
R10 (EFFECTS-BACKEND.md:150-152) rules that a semantics is a
`Handler` and `interpret` is the induced morphism. The estate
interprets a summed signature in two places, and neither is a
`Handler`:

- `Prog.handleLlm` (`Interp.lean:184-187`) — a bespoke recursion
  handling `LlmSig` away into `Prog CasSig`. Its docstring claims
  monad-morphism status (`Interp.lean:19, 181-183`); L-4 and L-6 are
  the theorems that would carry it, and neither exists.
- `stepRooted` (`Roots.lean:69-81`) — a bespoke small-step for
  `StoreSig` that delegates the `CasSig` half to `step`. It has three
  laws (`stepRooted_cas_agrees` `:85-90`, `stepRooted_preserves_wf`
  `:94-107`, `publish_mem` `:111-119`) against `CasSig`'s ten
  (§1.2 F-block). `runRooted` (`:122-129`) has **none**: no
  preservation, no halting, no reference handler, no big-step, no
  bridge, no `ObsEq`. `Handler.sum` is not used and no theorem ties
  `stepRooted` to any handler.

Consequence: `StoreSig` is a second-class language. A reader who
follows R10 to `Roots.lean` finds a semantics that R10 does not
describe. `Roots.lean:81` also carries a dead branch — `step` on a
`.vis` node never returns `.done`, so `Roots.lean:75` is unreachable —
which is a small symptom of the same thing: the delegation is written
by hand rather than derived.

**X-2 — the `interpret`-at-a-`vis`-node lemma is stated twice, locally,
and never generally.** `interpretRef_vis` (`Handler.lean:149-160`) is
`CasSig`-specific; `interpret_vis_state` (`Auth.lean:387-399`) is
`StateT σ (Except Refusal)`-specific and its own docstring
(`Auth.lean:383-386`) says it is "the generic form of
`interpretRef_vis`". Neither is the actual general form, which is
`rfl` (L-11). Two carriers, two restatements, one missing one-liner.

**X-3 — `PLine`'s operation vocabulary is not `CasE`'s.** `PLine`
(`Defun.lean:180-183`) has `put` and `load`; `CasE` (`Ops.lean:21-24`)
has `put`, `load` and `fail`. `embedFrom` (`Defun.lean:215-228`) uses
`failWith` for its own two error cases, so the embedding's image is
outside the put/load fragment even though the table cannot name
`fail`. `Fragments.lean:32-104` states the ladder `L-A ⊂ L-S ⊂ L-P`
and this is consistent with it — but R14's stratum-1 row
(EFFECTS-BACKEND.md:257-260) says "operations … `DecidableEq`,
hashable, addressable", and the only addressable thing is `PLine`,
which is not the operations of any `Sig`. See H-5.

**X-4 — the ratified rulings are bound to no build artifact.** §1.2,
last block. `Laws.lean` exists, is gated, and covers `SM-` only.

---

## 3. THE CLEAN ALGEBRA

Decision 2 binds: no new sorts, no new carriers. Everything below is
either a theorem over existing types or a *value* of an existing type.
The two places that would need a genuinely new notion are flagged as
ruling questions and proposed nowhere else.

### 3.1 The signature as it should read

Unchanged in every sort and every operation, with two edits:

```
sorts
  Sig                                    Sig.lean:13-15      KEEP
  Prog  : Sig → Type → Type              Prog.lean:25        STRENGTHEN
                                         -- A : Type, not Type u  (H-1)
  Handler : Sig → (Type → Type v) → Type Handler.lean:42-43  KEEP
  Status : Sig → Type → Type             Interp.lean:42-45   KEEP
  Refusal                                Interp.lean:28-34   KEEP

operations on Prog
  pure  : A → Prog S A                                       KEEP
  vis   : (op : S.Op) → (S.Ans op → Prog S A) → Prog S A     KEEP
  bind  : Prog S A → (A → Prog S B) → Prog S B               KEEP
  op    : (e : S.Op) → Prog S (S.Ans e)                      KEEP + ADOPT
          -- every smart constructor respelled through it (C-3)
  inl   : Prog S A → Prog (S ⊕ₛ T) A                         KEEP
  inr   : Prog T A → Prog (S ⊕ₛ T) A                         KEEP
          -- gains its first call site when `infer` is respelled

operations on Sig
  sum (⊕ₛ) : Sig → Sig → Sig                                 KEEP

operations on Handler
  sum     : Handler S M → Handler T M → Handler (S ⊕ₛ T) M   KEEP
  through : Handler S (Prog T) → Handler T M → Handler S M   KEEP
  interpret : Handler S M → Prog S A → M A                   KEEP

derived, over CasSig
  put, load, failWith, require, liftCas                      RESPELL
          -- put n      := Prog.op (.put n)
          -- load a     := Prog.op (.load a)
          -- failWith r := (Prog.op (.fail r)).bind Empty.elim
          --   (this is a definitional identity, checked: bind on a
          --    pure-continued vis node is fun e => f e)
          -- infer p    := Prog.inr (Prog.op (.infer p))
```

No new sort, no new carrier, no new field. `Prog.op` and `Prog.inr`
stop being dead; `interpret_op` acquires subjects; P2/P3 become
statements about code that obeys them.

### 3.2 The law list as it should read

Marked keep / strengthen / state-new / prove-owed. "prove-owed" means
the statement is settled and the proof is the work; "state-new" means
the statement itself has to be written for the first time and is
expected to be short.

**Monad core** — all KEEP, unchanged:
M1 `bind_pure_right`, M2 `bind_assoc'`, M3 `pure_bind`,
M4 `LawfulMonad (Prog S)`, M5 `interpret_pure`, M6 `interpret_bind`,
M7 `interpret_op`, M8 `interpret_id`, M9 `interpret_through`.

**New, one-liners** (state-new; each is `rfl` or one induction):

| id | statement | mark |
|---|---|---|
| N1 | `interpret h (.vis op k) = h.handle op >>= fun a => interpret h (k a)` | state-new (`rfl`; retires the two local restatements, X-2) |
| N2 | `Prog.vis op k = Prog.vis op k'` when `S.Ans op → Empty` | state-new |
| N3 | `(failWith r : Prog CasSig A).bind f = failWith r` (L-1) | state-new, from N2 |
| N4 | `require true r = pure ()`; `require false r = failWith r` (L-2) | state-new (`rfl`) |
| N5 | `∀ p w, ∃ fuel, (run H fuel p w).1.isRunning = false` (L-7) | state-new, one line from `run_of_interpretRef` |
| N6 | `run` monotone past a halt (L-8) | state-new |

**Sum algebra** (the block that does not exist; all state-new +
prove-owed):

| id | statement | mark |
|---|---|---|
| S1 | `(h.sum g).handle (.inl op) = h.handle op` | state-new (`rfl`) |
| S2 | `(h.sum g).handle (.inr op) = g.handle op` | state-new (`rfl`) |
| S3 | `interpret (h.sum g) p.inl = interpret h p` | state-new, prove-owed (induction) — **kills B-2 and half of B-3** |
| S4 | `interpret (h.sum g) q.inr = interpret g q` | state-new, prove-owed |
| S5 | `(p.bind f).inl = p.inl.bind (fun a => (f a).inl)` and the `.pure`/`.op` cases | state-new, prove-owed — **kills the rest of B-3** |
| S6 | `Function.Injective (Prog.inl : Prog S A → Prog (S ⊕ₛ T) A)` | state-new, prove-owed |
| S7 | `p.handleLlm o = interpret (idHandler.sum (llmOracle o)) p`, where `llmOracle o : Handler LlmSig (Prog CasSig) := ⟨fun (.infer s) => .pure (o s)⟩` (L-6) | state-new, prove-owed — a `Handler` *value*, not a new type |
| S8 | `(p.bind f).handleLlm o = (p.handleLlm o).bind (fun a => (f a).handleLlm o)` (L-4) | derived from S7 + M6 |
| S9 | `(liftCas p).handleLlm o = p` (L-5) | derived from S7 + S3 + M8 |

**Initiality** (strengthen):

| id | statement | mark |
|---|---|---|
| I1 | `eq_of_forall_interpret` | keep, and **restate the docstring**: it is a specialization at the syntactic monad, not the universal property |
| I2 | uniqueness: for `φ : ∀ {A}, Prog S A → M A` with `φ (.pure a) = pure a`, `φ (p.bind f) = φ p >>= (φ ∘ f)`, and `φ (Prog.op e) = h.handle e` — then `φ p = interpret h p` (L-9) | state-new, prove-owed. **This is what licenses the words INITIAL and "free monad"**; until it lands, both words are pending per C5 and the two sites (EFFECTS-BACKEND.md:263, `Lang.lean:21`) should say so |

**Fuel and the small-step presentation** — F1–F6, F9, F10 all KEEP.
F7 becomes N5, F8 becomes N6. R1's sentence at
EFFECTS-BACKEND.md:43-45 STRENGTHEN: say that the current carrier
admits no divergence at all and that fuel is the small-step
presentation's, matching the glossary at
`docs/effect-replay/CONTEXT.md:743-744`.

**Rooted language** (prove-owed, closing X-1):

| id | statement | mark |
|---|---|---|
| R-1 | `rootedHandler H : Handler StoreSig (StateT RootedState (Except Refusal))` as a direct structure literal, with `stepRooted_handle` in `step_handle`'s exact shape (`Handler.lean:131-144`) | state-new — a `Handler` value, no new type |
| R-2 | `runRooted_preserves_wf`, `runRooted_halts` (L-10) | state-new, prove-owed |
| R-3 | the rooted bridge, in `run_interpretRef_agree`'s shape | prove-owed |
| R-4 | delete the unreachable `.done` branch at `Roots.lean:75` | keep-as-cleanup |

**Discipline, made checkable**:

| id | statement | mark |
|---|---|---|
| D-1 | `LAW R1:` … `LAW R14a:` head-of-docstring lines on the enforcing declarations in `Cas/Lang/`, registered in `Law.registry` beside the `SM-` rows (`tools/Laws.lean`), so `check:cas:laws` reads them | state-new — reuses the existing mechanism, mints nothing |
| D-2 | P2 and P3 restated to match §3.1's respelling, or the code changed to match them — the review does not choose | ruling owed |

### 3.3 Ruling questions (Decision 2 boundary)

- **RQ-1 — a unit for `⊕ₛ`.** Stating S7 of §1.2 needs
  `Sig.empty : Sig := ⟨Empty, Empty.elim⟩`. That is a *value* of an
  existing type, mints no sort and no carrier — but it is a new
  vocabulary item in a signature-level algebra Decision 2 froze.
  Question: admit it, or rule that `⊕ₛ` has no unit law and say so in
  R2?
- **RQ-2 — associativity and commutativity of `⊕ₛ`.** These are
  **false as equations** in Lean (`(A ⊕ B) ⊕ C` and `A ⊕ (B ⊕ C)` are
  distinct types), so stating them at all requires a signature-morphism
  or signature-isomorphism notion — a genuinely new abstraction.
  Question: (a) rule that `⊕ₛ` is a binary combinator with no monoid
  laws, amend R2's ITrees analogy accordingly (C-4), and require
  nested sums to be spelled explicitly; or (b) open a ruling for
  `SigHom`. The review recommends (a) on Decision 2 grounds and notes
  that `Worded.lean`'s incoming `WordSig` (pending merge) makes the
  three-way sum concrete, so the question is live now rather than
  hypothetical.
- **RQ-3 — `Prog`'s universe.** Narrowing `A : Type u` to `A : Type`
  (H-1) is a restriction, not a new abstraction, and nothing in the
  estate uses the wider form. Confirm before it is done, since it is a
  breaking signature edit.

---

## 4. Falsifier index

Every exhibit above in one place, with the law that kills it.

| # | Target | Adversary / witness | Killed by |
|---|---|---|---|
| B-1 | `Prog`'s universe (H-1) | `(Prog.pure Nat : Prog CasSig Type)` — syntax with no semantics | RQ-3: `A : Type` |
| B-2 | `Handler.sum` (H-2) | `badSum` discards `g`, answers `""` for every `infer` | S3/S4 |
| B-3 | `Prog.inl` (H-3) | `inl'` performs every operation twice; **word-invisible**, so no gate sees it | S3 + S5 |
| B-4 | `Sig`'s first-order discipline (H-4) | `⟨Unit, fun _ => Prog CasSig Nat⟩` — an operation answering a program | a `Sig`-level side condition, or R2 amended |
| B-5 | stratum 1 (H-5) | `DecidableEq CasE` does not exist | `deriving DecidableEq` on the four operation types, or R14's row amended to name `PLine` |
| B-6 | "no finer program equality exists" (C-1) | `put n` vs `put n >>= fun a => put n >>= fun _ => pure a` — `ObsEq`-equal, structurally distinct | rewrite the sentence; add I2 |
| B-7 | R14a P2 (C-5) | `failWith`, `byteFail`, `embedFrom`, `stepRooted` | N3 + the §3.1 respelling |
| B-8 | R14a P3 (C-5) | two typeclass-form sites in all of `Cas/Lang/` | D-2 ruling |

---

## 5. What this area gets right, on the record

Stated so the synthesizer can weigh the holes against the base.

- The monad laws are proved from first principles, not assumed, and
  the `LawfulMonad` instance is built from them rather than
  `sorry`-carried (`Representation.lean:39-58`).
- `interpret_bind` is proved once for every handler into every lawful
  target (`Handler.lean:53-60`) — the single strongest statement in
  the area, and the one that makes R10's "every semantics is a
  handler" worth saying.
- The R10 obligation the document itself named as owed for F3 — the
  agreement of the fueled small-step run with the big-step reference —
  is discharged (`run_interpretRef_agree`, `Handler.lean:255-272`),
  and the two places the statement could not be made symmetric (the
  refusal word, the existential fuel) are stated in the file as
  findings rather than papered over (`Handler.lean:100-124`).
- `ObsEq.run_refused` (`Representation.lean:198-208`) and the note
  above it state exactly what the estate's chosen observation does NOT
  see. That is claim-scope discipline done right, and it is the model
  the sum block should be written to.
- `Fragments.lean` already answers, for an outside consumer, the
  question this review asks of `Prog`: what may be assumed at each
  rung (`Fragments.lean:187-255`), including "assume nothing
  statically" for `Prog` itself (`:250-255`). The sum algebra has no
  equivalent page.
