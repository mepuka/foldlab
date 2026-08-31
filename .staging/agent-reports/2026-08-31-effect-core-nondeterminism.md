# `EC1-CE042` discharged — the denotation is not a function of the program alone

Lane: Effect Core v1 counterexample register, row `EC1-CE042`.
Date: 2026-08-31. Lean `leanprover/lean4:v4.33.1`, repo at `56a938fe` plus the
working tree.

Deliverable: `.staging/effect-core-v1/workshop/counterexamples/Nondeterminism.lean`
(641 lines, sha256 `784510a05eed110bdc213e456ce7f0ee6973d15d8d6d76acefe87903ddab54f8`).

Nothing under `library/` or `formal/` was read-modified. No packet `.md` was
edited. No name was promoted.

## 1. Stage and gate

Stage opened and followed: **`lean-algebraic-systems`**
(`.claude/skills/lean/workflows/lean-algebraic-systems/SKILL.md`), together with
its references `operations-laws-interpreters.md`, `proof-tool-routing.md` and
`state-history-concurrency.md`.

Routing decisions the stage forced, and where they land in the file:

| Stage instruction | What it decided |
| --- | --- |
| "Begin with operational shape, not with `Monad`." | No monad instance is defined. The carrier is the existing `Prog`, and the semantics is a judgment. |
| "Select the weakest sufficient composition" — reify when syntax must be interpreted several ways | `Prog CoreSig` is reified first-order syntax, interpreted twice (§2 executable, §3 relational). |
| "Separate the semantic artifacts" (1) signature/responses, (2) state + transition, (5) two interpreters, (7) laws | §1 signature and answers; state is the existing `Word` and the transition is `referenceHandler`'s own clause; §2 and §3 are the two interpreters; §4 relates them. |
| `proof-tool-routing`: "Equality is often too strong for nondeterminism … a refinement/simulation theorem should name what clients can observe." | The observation is `interpretRef`'s codomain verbatim, and the public statement is relational, not an equation. |
| `state-history-concurrency`: "model environment actions and nondeterminism in a transition relation instead of pretending the executor controls delivery" | The `ask` answer is supplied by the tape, never computed by the handler. |
| `state-history-concurrency`: "State safety and liveness separately; liveness requires named progress assumptions." | No liveness or fairness statement appears; the report records this as an omission, not a result. |

**Gate passed** — the stage's system-model record, item by item:

- *constructor/step equations and composition laws*: `runTape_pure`,
  `runTape_cas`, `runTape_ask_nil`, `runTape_ask_cons`, `casClause_ok`,
  `casClause_error`. All six are `rfl` or one rewrite.
- *interpreter preservation / homomorphism laws*: `runs_sound`,
  `runs_complete`, and their conjunction `runs_iff` — the relational judgment
  and the executable interpreter decide the same observations.
- *invariant preservation and reachable-state definition*: **not applicable and
  not claimed.** `Word.wf` preservation is already owned by
  `Cas/Lang/Interp.lean` (`run_preserves_wf`); this file adds no state
  invariant and asserts none.
- *trace/replay obligations*: `replay_is_a_function` — a fixed tape names a
  function of program and word; `denotes_unique_given` is the replay
  determinism statement.
- *refinement/adequacy theorem naming observable behavior*: `runs_iff`, whose
  observable is `Obs A := Except Refusal (A × Word)`, i.e. `interpretRef`'s
  codomain, with the refusal-side partial word deliberately outside the mask
  (existing ruling `EC1-CE010`).
- *explicit fairness, delivery, failure, external-effect, resource
  assumptions*: stated in the file header and in §7 of this report. There are
  none; `Tape` is one decision stream, not a policy.
- *positive scenarios and deliberately invalid programs/traces*: `runs_hit`
  (success), `runs_miss` (refusal), `empty_tape_is_a_frontier` and
  `empty_tape_denotes_nothing` (the decision frontier — a program with no
  observation at all, which is neither a value nor a refusal).

The stage's first standing rule is carried and repeated here: **a successful
elaboration proves the stated proposition only.** Twenty-nine propositions hold
below. Nothing more.

## 2. Commands rerun, and exit codes

```
cd /Users/pooks/Dev/foldlab/library/cas
lake env lean ../../.staging/effect-core-v1/workshop/counterexamples/Nondeterminism.lean
```

Exit code **0**. Output is exactly 29 lines — the 29 `#print axioms` receipts,
nothing else. No errors, no warnings, no `#guard` and no `#eval`.

The file lives outside every lake target, like `FixedFuel.lean`,
`LocalAnchors.lean`, `../exhibits.lean` and `../../breaker-exhibits.lean`.

**One packaging note for the packet author.** `.gitignore:11` (`.staging/*/*/*`)
ignores this path; `FixedFuel.lean` and `LocalAnchors.lean` are in the index
only because they were force-added. `Nondeterminism.lean` will need
`git add -f .staging/effect-core-v1/workshop/counterexamples/Nondeterminism.lean`
or the witness is not in the tree that `EC1-CE042` cites. I did not stage or
commit anything.

## 3. What the row now defeats — the exact quantifier

Before: the register recorded the attacked statement in prose and marked it
`OWED`. `EXHIBITS-REVIEW.md` §3 X1 carried the reasoning as an *argument* —
the graph language "contains no handler-answer choice, external request,
scheduler choice, clock/random choice, fork, race, or competing finalization".

After: two kernel-checked refutations, both universally quantified over the
address function `H`.

**Form 1 — the negation of `denotes_unique`'s own shape.**

```lean
theorem denotes_is_not_unique (H : Bytes → Addr32) :
    ¬ ∀ (p : Prog CoreSig Node) (w : Word) (o₁ o₂ : Obs Node),
        Denotes H p w o₁ → Denotes H p w o₂ → o₁ = o₂
```

where `Denotes H p w o := ∃ d : Tape, Runs H p w d o`. Compare
`workshop/exhibits.lean`'s `denotes_unique` and `breaker-exhibits.lean`'s
re-proof: same predicate shape, same conclusion `o₁ = o₂` (the exhibit splits it
as `a₁ = a₂ ∧ w₁ = w₂`; `Obs` packs the pair), negated.

**Form 2 — the load-bearing "no such function" theorem.**

```lean
theorem no_choice_free_denotation (H : Bytes → Addr32) :
    ¬ ∃ f : Prog CoreSig Node → Word → Obs Node,
        ∀ (p : Prog CoreSig Node) (w : Word) (d : Tape) (o : Obs Node),
          Runs H p w d o → o = f p w
```

The quantifier order is the content. `f` is chosen first; it may depend on `H`,
it may be non-computable, and it may inspect the entire program. No such `f`
exists. Consequently `denotes : Prog → Word → Obs` cannot be *defined* for this
language, not merely "is not proved unique" — which is exactly the strength the
packet's design decision needs. The idiom is the estate's own, taken from
`Cas/Backend/Universal.lean`'s `run_has_no_composition_law`.

A third, weaker-hypothesis form is also proved:
`no_partial_choice_free_denotation` refutes even a PARTIAL candidate `f : Prog →
Word → Option Obs` that is allowed to decline, as long as it answers for the
witness program.

`EC1_CE042` bundles the register row's five required parts plus the positive
companion into one proposition, so a future reader can `#check` a single name.

## 4. The witness

One admitted program, one fixed initial configuration, two typed decision
streams, two permitted observations.

```lean
def hit : Addr32 := Falsifier.zeroAddr           -- the estate's existing constant
def miss : Addr32 := ⟨List.replicate 32 1, by simp⟩
def nA : Node := ⟨0, 0, [], []⟩
def initial : Word := [Binding.mk hit nA]        -- one binding, at `hit`

def branch : Prog CoreSig Node :=
  .vis (Sum.inr .ask) fun (b : Bool) =>
    .vis (Sum.inl (CasE.load (cond b hit miss))) .pure

def tapeHit  : Tape := [true]
def tapeMiss : Tape := [false]
```

- `tapes_differ : tapeHit ≠ tapeMiss`
- `runs_hit  : Runs H branch initial tapeHit  (.ok (nA, initial))`
- `runs_miss : Runs H branch initial tapeMiss (.error (.noObject miss))`
- `observations_differ` — the two are distinct **in kind**: one halts with a
  value and a word, the other refuses. No coarsening or refinement of the
  observation mask can identify them, so the counterexample does not depend on
  the choice of mask.

Both derivations are produced by `runs_complete` from a `rfl` computation of
`runTape`, so the kernel actually executed the two runs; nothing here is a
vacuous inhabitant of a relation.

Every fact holds for **every** `H`, because `load` never consults the address
function — the same `H`-independence the breaker's §2 witnesses use.

## 5. The positive companions — why the row does not prove too much

Two of them, matching `EXHIBITS-REVIEW.md` §4.3 exactly ("the admissible
theorems are `denotes_unique_given` under fixed decisions and the stronger
deterministic CAS specialization").

**`denotes_unique_given`** — fixing the tape restores determinism:

```lean
theorem denotes_unique_given (H) {p : Prog CoreSig A} {w : Word} {d : Tape}
    {o₁ o₂ : Obs A} (h₁ : Runs H p w d o₁) (h₂ : Runs H p w d o₂) : o₁ = o₂
```

This is not trivially true by construction: `Runs` is an inductive judgment,
not a function graph. It is derived from `runs_sound`, i.e. from adequacy. The
replay theorem the packet needs therefore survives the row —
`replay_is_a_function` states it in the `∃ f` form:

```lean
theorem replay_is_a_function (H) (d : Tape) :
    ∃ f : Prog CoreSig A → Word → Option (Obs A),
      ∀ p w o, Runs H p w d o ↔ f p w = some o
```

**`denotes_unique_on_the_askFree_fragment`** — the stronger specialization. An
inductive predicate `AskFree` carves out the programs that never ask, and on
that fragment the observation is unique across **all** tapes, with nothing
fixed:

```lean
theorem denotes_unique_on_the_askFree_fragment (H) {p} (hp : AskFree p)
    {w d₁ d₂ o₁ o₂} (h₁ : Runs H p w d₁ o₁) (h₂ : Runs H p w d₂ o₂) : o₁ = o₂
```

That is where `workshop/exhibits.lean`'s `denotes_unique` lives, recovered
inside the nondeterministic language. `both_continuations_are_deterministic`
then locates the phenomenon precisely: each of `branch`'s two continuations is
ask-free, hence individually deterministic. The CAS layer contributes nothing
to the counterexample; the single `ask` is the whole of it.

## 6. Decision sources — modelled and NOT modelled

`EXHIBITS-REVIEW.md` §4.1 enumerates eight. I modelled **one**.

| Source (§4.1 row) | Modelled? |
| --- | --- |
| pure input/guard | n/a — the row itself says "no decision token" |
| **direct-handler answer** | **YES** — `DecE.ask`, answer type `Bool`, taken from the tape rather than from `referenceHandler` |
| registered foreign reply | NO as a symbolic request frontier. §8 of the Lean file does exhibit the same *phenomenon* at the shipped `LlmE.infer` / `Prog.handleLlm`, but as a second instance of the direct-answer pattern, not as a frontier model |
| scheduler | NO |
| race tie | NO |
| clock/random | NO |
| interruption arrival | NO |
| replay | NO — only the positive direction (a fixed tape replays deterministically) is proved; no recorded-branch selection is modelled |

One source is all a universal claim needs. But the row's replacement text must
not be read as evidence about the other seven, and §7 below says so.

## 7. Checks OMITTED

Named explicitly, because a report that lists only what was checked is a report
that overstates.

1. **No fairness, no liveness, no schedule.** `Tape` is one decision stream,
   not a policy. `EC1-CE044` (the fairness row) is untouched and remains `OWED`.
2. **No scheduler, race-tie, clock/random, or interruption model.** Any claim
   that Effect Core's *scheduler* is nondeterministic is not supported by this
   file.
3. **No symbolic request frontier.** `runTape` returns `none` when the tape is
   short; that is a decision frontier leaf, not the `FinApprox` tree of
   `EXHIBITS-REVIEW.md` §4.2. No finite-approximation branching-preservation
   claim is made.
4. **No may/must theorems.** `may` and `must` (§4.3) are not defined here.
5. **No loops, forks, resources, finalizers, or cause provenance.** `runTape`
   is total only because `Prog` is finite; nothing here shows a decision-indexed
   denotation exists for Effect Core generally.
6. **No general tape/oracle adequacy for `Prog.handleLlm`.** §8's two facts are
   concrete `rfl` computations at the witness program under two constant
   oracles. A theorem relating an arbitrary tape to an arbitrary oracle across
   arbitrary programs was NOT attempted.
7. **No `AgentSig` admission claim.** `EXISTING-TYPES.md` `EC1-XT012` leaves
   that an explicit versioned decision, so §8 is conditional on it. §1–§7 of the
   Lean file are not.
8. **No `Word.wf` invariant statement.** Preservation is already owned by
   `Cas/Lang/Interp.lean`; this file neither restates nor extends it.
9. **No claim that `Runs` is Effect Core's semantics.** It is the smallest
   judgment that carries the counterexample.
10. **`byte`/gate planes untouched.** No emitter, no fixture, no ledger row, no
    TypeScript.

## 8. Axiom receipts — verbatim

The full stdout of the command in §2, unedited:

```
'EffectCoreNondet.casClause_ok' does not depend on any axioms
'EffectCoreNondet.casClause_error' does not depend on any axioms
'EffectCoreNondet.runTape_pure' does not depend on any axioms
'EffectCoreNondet.runTape_cas' does not depend on any axioms
'EffectCoreNondet.runTape_ask_nil' does not depend on any axioms
'EffectCoreNondet.runTape_ask_cons' does not depend on any axioms
'EffectCoreNondet.runs_sound' does not depend on any axioms
'EffectCoreNondet.runs_complete' depends on axioms: [propext]
'EffectCoreNondet.runs_iff' depends on axioms: [propext]
'EffectCoreNondet.denotes_unique_given' does not depend on any axioms
'EffectCoreNondet.replay_is_a_function' depends on axioms: [propext]
'EffectCoreNondet.askFree_tape_irrelevant' does not depend on any axioms
'EffectCoreNondet.denotes_unique_on_the_askFree_fragment' does not depend on any axioms
'EffectCoreNondet.tapes_differ' does not depend on any axioms
'EffectCoreNondet.runs_hit' depends on axioms: [propext]
'EffectCoreNondet.runs_miss' depends on axioms: [propext]
'EffectCoreNondet.observations_differ' depends on axioms: [propext]
'EffectCoreNondet.both_continuations_are_deterministic' depends on axioms: [propext]
'EffectCoreNondet.both_denote' depends on axioms: [propext]
'EffectCoreNondet.empty_tape_is_a_frontier' depends on axioms: [propext]
'EffectCoreNondet.empty_tape_denotes_nothing' depends on axioms: [propext]
'EffectCoreNondet.denotes_is_not_unique' depends on axioms: [propext]
'EffectCoreNondet.no_choice_free_denotation' depends on axioms: [propext]
'EffectCoreNondet.no_partial_choice_free_denotation' depends on axioms: [propext]
'EffectCoreNondet.EC1_CE042' depends on axioms: [propext]
'EffectCoreNondet.agent_hit' depends on axioms: [propext]
'EffectCoreNondet.agent_miss' depends on axioms: [propext]
'EffectCoreNondet.shipped_agent_has_no_oracle_free_denotation' depends on axioms: [propext]
'EffectCoreNondet.shipped_agent_unique_given_oracle' does not depend on any axioms
```

Ceiling: **`propext`**. Of the 29 receipted theorems, 12 depend on no axiom
at all and the remaining 17 report exactly `[propext]`. No
`Quot.sound` is even reached. **No `Classical.choice`** — the brief allowed it
with justification; it was not needed, so none is claimed. No `sorryAx`, no
`sorry`, no `axiom`, no `native_decide`, no `#eval`, no `#guard`.

Where `propext` enters: the `by simp`/`by decide` steps and the width proofs in
the two `Addr32` literals, not in any semantic argument.

## 9. What surprised me

**The estate already ships a program with no choice-free denotation.** §8 of the
Lean file proves it at declarations that are all in `library/`:

```lean
theorem shipped_agent_has_no_oracle_free_denotation (H : Bytes → Addr32) :
    ¬ ∃ f : Prog AgentSig Node → Word → Except Refusal (Node × Word),
        ∀ (oracle : String → String) (p : Prog AgentSig Node) (w : Word),
          interpretRef H (p.handleLlm oracle) w = f p w
```

`Prog.handleLlm`'s `oracle` parameter *is* the decision tape in function form,
and `Cas/Lang/Interp.lean`'s own docstring says as much: "The oracle's
nondeterminism enters only as the recorded answer." So the packet's central
design decision — relational public semantics — is not a hedge against a future
Effect Core feature; it is already forced by the agent language on main, the
moment `AgentSig` is admitted. Both facts (`agent_hit`, `agent_miss`) are `rfl`.

Two smaller notes:

- The `Sig.sum` route caused one real elaboration obstruction: because
  `Sig.sum` is a plain `def`, `CoreSig.Op` does not reduce to
  `CasSig.Op ⊕ DecSig.Op` at `rw`'s transparency, so tactic rewriting inside the
  induction on `Prog` fails with a keyed-matching error. The fix was to route
  through explicit `Eq.trans` on the equation lemmas rather than `rw`. Worth
  knowing before the packet builds larger proofs over summed signatures; it is
  not an argument for minting a flat signature.
- Nothing had to be weakened. The theorem I set out to prove is the theorem
  that is proved, in the strong `¬ ∃ f` form.

## 10. Proposed replacement row for `COUNTEREXAMPLES.md`

I did not edit the register. The packet author owns it. Proposed edits:

**(a) Move `EC1-CE042` out of §7 (Owed attacks) and into §3 (Verified semantic
counterexamples), as the last row.** §3's table has columns
`ID | Exact statement defeated | Minimal witness | Evidence owner and command |
State / consequence`:

| `EC1-CE042` | Full Effect Core has a globally unique denotation without fixing choices. | One admitted program `branch` — one undetermined answer, then one `load` the answer selects — at one initial word, with tapes `[true]` and `[false]`: the first halts `.ok (nA, initial)`, the second refuses `.noObject miss`, for every address function. | `workshop/counterexamples/Nondeterminism.lean`: `denotes_is_not_unique`, `no_choice_free_denotation`, `EC1_CE042`, with the positive companions `denotes_unique_given` and `denotes_unique_on_the_askFree_fragment`; run `cd library/cas && lake env lean ../../.staging/effect-core-v1/workshop/counterexamples/Nondeterminism.lean`. | `VERIFIED-KERNEL`; ceiling `[propext]`, no `Quot.sound`, no `Classical.choice`, no `sorryAx`. The public semantics is `Runs p initial decisions observation : Prop`. There is no global `denotes_unique` and none can exist: `no_choice_free_denotation` refutes the existence of ANY function of program and configuration. Admissible uniqueness is `denotes_unique_given` under a fixed tape, plus the ask-free (deterministic-CAS) specialization. Modelled source: direct-handler answer ONLY; scheduler, race tie, clock/random, interruption, symbolic request frontier and replay selection are NOT modelled and this row is not evidence about them. |

**(b) In §7, replace the `EC1-CE042` row with a pointer** so the ID stays
discoverable from where it was owed:

| `EC1-CE042` | *(discharged)* | Moved to §3, `VERIFIED-KERNEL`, 2026-08-31. | — |

**(c) Add to §3's closing paragraph**, after the existing "Reproduced axiom
ceiling for the classification file" sentence:

> The nondeterminism witness (`EC1-CE042`) reports `[propext]` on every
> theorem; 12 of its 29 receipted theorems depend on no axiom at all.

**(d) `EC1-CE043` and `EC1-CE044` stay `OWED`.** Neither is touched. In
particular `EC1-CE044` (fairness) is NOT weakened or partially discharged by
this file — see §7.1 above.

**(e) Optional, if the packet wants the conditional strengthening recorded.**
A separate row rather than a widening of `EC1-CE042`, because it is conditional
on `EC1-XT012` admitting `AgentSig`:

| `EC1-CE04x` | The estate's *shipped* agent language has a denotation independent of its oracle. | Two constant oracles over one `infer`-then-`load` program give `.ok` and `.error` at the same word. | Same file, §8: `agent_hit`, `agent_miss`, `shipped_agent_has_no_oracle_free_denotation`; same command. | `VERIFIED-KERNEL`, CONDITIONAL on `EC1-XT012` admitting `AgentSig`. Every declaration in the statement is shipped (`Prog.handleLlm`, `interpretRef`, `AgentSig`). It shows the relational decision is forced by code already on main, not only by a planned feature. |
