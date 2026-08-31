# Effect Core v1 — `EC1-CE045`, the positive half

Lane report, 2026-08-31. Deliverable:
`.staging/effect-core-v1/workshop/counterexamples/EnsuringRepair.lean`
(973 lines, 46786 bytes, sha256 `c56f1a767627a795b184b6bbf6ba96ca3d01a9ecd054a930c30929c5afe51ae8`).

## Stage and gate

Stage: `lean-algebraic-systems`
(`.claude/skills/lean/workflows/lean-algebraic-systems/SKILL.md`), with its
routed references `operations-laws-interpreters.md`, `proof-tool-routing.md`
and `state-history-concurrency.md` read before any Lean was written.

The stage's gate — "complete the system-model record" — is satisfied as
follows. Every row names declarations in the delivered file unless marked
otherwise.

| Gate bullet | Discharged by |
| --- | --- |
| constructor/step equations, composition laws | `handleW_eq`, `interpretRefW_pure`, `interpretRefW_vis`, `interpretRefW_bind`, `ensuringT_word`, `scopeHandlerW_ensuring`, `scopeHandlerW_catchW` |
| interpreter preservation / homomorphism laws | `interpretRefW_bind` (the monad-morphism law, inherited from the estate's `interpret_bind` — no new proof), `interpretRef_forget`, `scopeHandlerW_catch_agrees` |
| invariant preservation, reachable state | `interpretRefW_preserves_wf`, `ensuring_preserves_wf` — transported from the estate's `run_preserves_wf` (ledger L7) rather than re-proved. Reachable words are exactly `Word.wf`-admitted words, on the refusal branch too |
| trace/replay, idempotence, ordering, merge | `run_interpretRefW` (trace agreement with the small-step run, word included), `lifo_order_is_observable` (ordering), `store_finalizer_is_word_idempotent` (idempotence, concretely). Merge: not applicable — single writer, §5 |
| refinement/adequacy theorem naming observable behavior | `interpretRef_forget` (against `interpretRef`, the estate's big-step face) and `run_interpretRefW` (against `run`, status AND word) |
| explicit fairness, delivery, failure, external-effect, resource assumptions | §5 of the file, in prose: failure is terminal `Refusal`; no external effects; no concurrency, delivery or fairness; the two distinct fuels are named apart; `H` is Level 0 throughout; nesting is one level by the carrier |
| positive scenarios and deliberately invalid programs | positive: `ensuring_runs_on_success`, `ensuring_is_not_catch`, `lifo_finalizers_succeed`. Invalid: the refusing body of `ensGraph`/`lifoGraph`, `scopeHandlerR_ensuring_witness`, `reraise_blindness_is_not_vacuous` |

The stage's weakest-sufficient-composition rule was applied and produced the
central finding: the composition needed for `ensuring` is not a stronger
handler but a *reordered* target. That is `state-history-concurrency.md`'s first
line — "`StateT σ (Except ε)` and `ExceptT ε (State σ)` differ in whether state
is observable on failure" — landing exactly on the open row.

**Standing rule, restated because it binds this report:** a successful
elaboration proves the stated proposition only. It is not model, implementation
or deployment assurance. Nothing below claims a runtime finalizer is correct
under interruption, cancellation, or concurrency; no such model exists in this
file.

## Commands rerun, with exit codes

Both from `/Users/pooks/Dev/foldlab/library/cas`. Toolchain
`Lean (version 4.33.1, arm64-apple-darwin24.6.0, commit 819816b2)`.

```text
lake env lean ../../.staging/effect-core-v1/workshop/counterexamples/EnsuringRepair.lean
EXIT=0     # prints the 44 receipts below, no errors, no warnings
```

```text
lake env lean ../../.staging/effect-core-v1/breaker-exhibits.lean
EXIT=0     # the file this one extends, rerun unmodified as a control
```

## The result, in three moves

### 1. The catch-adequate target does NOT repair `ensuring` (§1, NEW)

`EC1-CE041`'s repair — `scopeHandlerR` into
`ReaderT EnvR (StateT Word (Except Refusal))` — recovers `catchE`. It does not
recover `ensuring`, and the failure is not a clause oversight.

- `scopeHandlerR_ensuring_still_skips_the_finalizer`: the shipped clause carries
  the §4.3b defect forward verbatim. Whenever the body refuses, the refusal is
  reported and the finalizer block is never consulted — for every graph, fuel,
  address function and finalizer.
- `reraise_is_finalizer_blind`: **no** clause into that target can do better.
  State only the half of the `ensuring` law that is not in dispute — a finalizer
  must not swallow or replace the body's refusal (`ReRaises`) — and any clause
  satisfying it returns `Except.error r`, which has no word component. Its
  observable output on the refusal path is therefore a function of `r` alone,
  and two different finalizers are identified. The proof is one rewrite; the
  triviality is the content.
- `reraise_blindness_is_not_vacuous`: at `ensGraph` under `constH` the two
  finalizer blocks demonstrably leave different words, so a real difference is
  being erased.

This is a genuine negative result about the packet's *current* repair, not a
restatement of `EC1-CE045`'s existing negative half.

### 2. The forced repair is the transformer ORDER (§2, NEW)

`RefW := ExceptT Refusal (StateM Word)` — the same two layers, reordered, so a
refusal still carries a word. `referenceHandlerW` is an ORDINARY `Handler`,
defined *from* `referenceHandler` clause by clause, so it cannot drift; its
refusal triage `(.error r, w)` is exactly `step`'s.

Two adequacy theorems keep this from being a second semantics:

- `interpretRef_forget`: `interpretRef H p w = forget (interpretRefW H p w)`.
  The estate's reference meaning is the new one with the refusal word thrown
  away.
- `run_interpretRefW`: past a fuel the theorem produces,
  `run H f p w = statusOfW (interpretRefW H p w)` — **an equation, word
  included, on both the done and the refused branch.** `Cas/Lang/Handler.lean`'s
  `run_interpretRef_agree` had to leave the refusal word existential because
  `Except Refusal (A × Word)` "has nowhere to hold" it. In this order it does.
  The word `interpretRefW` reports on a refusal is the estate's own partial
  word, not an invention.

`interpretRefW_bind` (the monad-morphism law) is inherited from the estate's
`interpret_bind` because `RefW` is a lawful stdlib stack — no new carrier, no
new proof obligation.

### 3. The four laws (§3, NEW)

All four closed. `ensuringT` is a combinator on the target monad's VALUES;
`Handler` and `ScopeSig` are unchanged and scoped children remain `BlockId`.
No `HHandler`, no higher-order handler carrier, no new type minted.

| Law | Theorem | Status |
| --- | --- | --- |
| 1. runs on success, body's result preserved | `ensuring_runs_on_success` (clause), `ensuringT_ok` (combinator) | **CLOSED** |
| 2. runs on refusal, refusal re-raised unchanged | `ensuring_runs_on_refusal`, `ensuring_runs_on_refusal_of_any_finalizer` (no premise on the finalizer's outcome), `ensuringT_error`, `ensuring_never_replaces_the_refusal` | **CLOSED** |
| 3. LIFO / nesting order | `ensuring_LIFO`, `ensuring_LIFO_reraises`, `ensuring_LIFO_witness`, `lifo_order_is_observable` | **CLOSED**, with a scope limit (below) |
| 4. exactly once | `ensuring_reads_the_finalizer_once` (at most), `ensuring_reads_the_finalizer_at_least_once` (at least), `double_run_would_be_observable` (not twice) | **CLOSED**, in the dependence formulation (below) |

Two further results close the loop back to §1 and to `EC1-CE041`:

- `ensuring_separates_the_finalizers` — on the very witness where every clause
  into the catch-adequate target was forced to identify the two finalizers, the
  word-carrying clause SEPARATES them: same refusal, different words. §1's
  obstruction, closed.
- `scopeHandlerW_catch_agrees` — the further move is CONSERVATIVE for `catchE`.
  Forget the retained word and `scopeHandlerW` is `scopeHandlerR`, which already
  satisfies the catch law. Nothing that worked at the previous order was traded
  away.

`ensuring_is_not_catch` states the separation the row is really about: on one
witness `catchE` replaces the refusal with the handler block's answer while
`ensuring` keeps it.

## Do exactly-once and LIFO hold in this target? Yes — with two stated limits

**LIFO holds, and it is observable.** `ensuring_LIFO` says the word threads
body → inner finalizer → outer finalizer. `lifo_order_is_observable` shows the
two finalizers' word effects do not commute (two puts at different `Hlen`
addresses; the word is a list, earliest binding first), so the order the law
names is a claim with content. `ensuring_LIFO_witness` runs it end to end with
a refusing body: both finalizers run, in inner-then-outer order, and the body's
refusal still comes out.

*Limit.* Two syntactically nested `ensuring` OPERATIONS are INEXPRESSIBLE in
this carrier, and no theorem here pretends otherwise. `breaker-exhibits.lean`
§4.1 already records why: a scoped child is a `BlockId`, a block body is a
`PProg`, and no `PProg` line performs a scoped operation. `ensuring_LIFO` is
therefore about the composite of the CLAUSE with itself in the target, which is
what a nesting rule has to be about anyway. Syntactic nesting needs a carrier
change that is out of this row's scope.

**Exactly-once holds, stated as dependence rather than as a count — and that
reformulation is forced, not stylistic.** Content addressing makes store
word-effects idempotent: `Cas.put`'s `duplicate` outcome is the identity on the
word, so re-running a store finalizer changes nothing.
`store_finalizer_is_word_idempotent` shows it by `rfl` on the §1 witness.
Counting bindings would therefore be vacuous. So the law is stated as
dependence:

- `ensuring_reads_the_finalizer_once` — the composite depends on the finalizer
  ONLY through its value at the single word the body left. A clause that ran the
  finalizer twice would also depend on it at the finalizer's own output, and
  this equation would be false. That is the "not twice" arm.
- `ensuring_reads_the_finalizer_at_least_once` — the dependence at that word is
  real: two finalizers agreeing at every OTHER word but differing there give
  different composites. That is the "not zero times" arm.
- `double_run_would_be_observable` — exhibits a finalizer whose second
  application at its own output is observable, so the first arm is a real
  constraint and not a triviality.

*Limit.* The "not twice" witness is a target-level computation, not a store
program, because of the idempotence just described. Whether EVERY successful
store program is word-idempotent is a plausible general theorem that this file
does NOT prove; see checks omitted.

## Semantic choices made, not smuggled

1. **Refusal path:** the body's refusal is re-raised UNCHANGED even when the
   finalizer itself refuses. `ensuring_never_replaces_the_refusal` states this
   with no premise on `fin`. This is what distinguishes `ensuring` from
   `catchE`.
2. **Success path:** a refusing finalizer DOES replace the body's success with
   its own refusal. The finalizer failed and nobody has been told; nothing else
   is honest. This is the one asymmetry and it is documented in the file.
3. **`catchE` rollback:** `scopeHandlerW`'s catch clause restarts the handler at
   the ORIGINAL word, discarding the body's partial word — the same choice
   `scopeHandlerR` made, so the conservativity theorem holds. In the previous
   target that choice was FORCED (the partial word did not exist); here it is a
   choice, and a no-rollback `catchE` is now expressible and is NOT proved here.

## Definitions copied from `breaker-exhibits.lean`, and why

The two files are outside every lake target, so neither can import the other.
Copying the minimum carrier is the only way to state the extension against the
same objects. Copied and machine-diffed byte-identical:

`BlockId`, `GTerm`, `GBlock`, `GProg`, `blockBody`, `runBlocks`, `zeroAddr`,
`nA`, `nB`, `constH`, `wZ`, `probe`, `hndB`, `catchGraph`, `ScopeE`,
`ScopeE.Ans`, `ScopeSig`, `EnvR`, `ScopeR`, `scopeHandlerR`,
`scopeHandlerR_catches`.

ONE copied declaration differs, in its binder only: `interpretRef_bind` takes
`(H : Bytes → Addr32)` explicitly here, because the breaker file carries `H` as
a `section variable` and this file has no such section. Statement and proof
script are otherwise identical. The diff was produced mechanically, not by eye.

`nA_ne_nB` is copied; `oneAddr`, `zero_ne_one` and `ok_ne_error` were not
needed and were not copied.

## Receipts, verbatim

44 receipts. Ceiling: `propext` and `Quot.sound`. No `sorryAx`, no
`Classical.choice`, no `native_decide`, no `axiom`.

```text
'EnsuringRepair.nA_ne_nB' does not depend on any axioms
'EnsuringRepair.interpretRef_bind' depends on axioms: [propext, Quot.sound]
'EnsuringRepair.scopeHandlerR_catches' depends on axioms: [propext]
'EnsuringRepair.ensGraph_body' depends on axioms: [propext]
'EnsuringRepair.ensGraph_finA' depends on axioms: [propext]
'EnsuringRepair.ensGraph_body_refuses' depends on axioms: [propext]
'EnsuringRepair.ensGraph_finalizers_differ' depends on axioms: [propext]
'EnsuringRepair.scopeHandlerR_ensuring_still_skips_the_finalizer' depends on axioms: [propext]
'EnsuringRepair.scopeHandlerR_ensuring_witness' depends on axioms: [propext]
'EnsuringRepair.reraise_is_finalizer_blind' depends on axioms: [propext]
'EnsuringRepair.reraise_blindness_is_not_vacuous' depends on axioms: [propext]
'EnsuringRepair.handleW_eq' does not depend on any axioms
'EnsuringRepair.interpretRefW_pure' does not depend on any axioms
'EnsuringRepair.interpretRefW_vis' does not depend on any axioms
'EnsuringRepair.interpretRefW_bind' depends on axioms: [propext, Quot.sound]
'EnsuringRepair.interpretRef_eq_interpretRefW' depends on axioms: [propext]
'EnsuringRepair.interpretRef_forget' depends on axioms: [propext]
'EnsuringRepair.run_interpretRefW' depends on axioms: [propext, Quot.sound]
'EnsuringRepair.statusOfW_word' does not depend on any axioms
'EnsuringRepair.interpretRefW_preserves_wf' depends on axioms: [propext, Quot.sound]
'EnsuringRepair.scopeHandlerW_ensuring' depends on axioms: [propext]
'EnsuringRepair.ensuringT_ok' depends on axioms: [propext]
'EnsuringRepair.ensuring_runs_on_success' depends on axioms: [propext]
'EnsuringRepair.ensuringT_error' depends on axioms: [propext]
'EnsuringRepair.ensuring_runs_on_refusal' depends on axioms: [propext]
'EnsuringRepair.ensuring_runs_on_refusal_of_any_finalizer' depends on axioms: [propext]
'EnsuringRepair.ensuring_never_replaces_the_refusal' depends on axioms: [propext]
'EnsuringRepair.ensuring_separates_the_finalizers' depends on axioms: [propext]
'EnsuringRepair.ensuring_is_not_catch' depends on axioms: [propext]
'EnsuringRepair.scopeHandlerW_catchW' depends on axioms: [propext]
'EnsuringRepair.scopeHandlerW_catch_agrees' depends on axioms: [propext]
'EnsuringRepair.ensuringT_word' depends on axioms: [propext]
'EnsuringRepair.ensuring_preserves_wf' depends on axioms: [propext, Quot.sound]
'EnsuringRepair.ensuring_LIFO' depends on axioms: [propext]
'EnsuringRepair.ensuring_LIFO_reraises' depends on axioms: [propext]
'EnsuringRepair.lifo_finalizers_succeed' depends on axioms: [propext]
'EnsuringRepair.lifo_order_is_observable' depends on axioms: [propext]
'EnsuringRepair.lifo_body_refuses' depends on axioms: [propext]
'EnsuringRepair.lifo_body_word' depends on axioms: [propext]
'EnsuringRepair.ensuring_LIFO_witness' depends on axioms: [propext]
'EnsuringRepair.store_finalizer_is_word_idempotent' depends on axioms: [propext]
'EnsuringRepair.ensuring_reads_the_finalizer_once' depends on axioms: [propext]
'EnsuringRepair.ensuring_reads_the_finalizer_at_least_once' depends on axioms: [propext]
'EnsuringRepair.double_run_would_be_observable' depends on axioms: [propext]
```

## Checks OMITTED

Named because they were considered and not done, not because they were
overlooked.

1. **General word-idempotence of successful store programs.**
   `interpretRef H p w = .ok (a, w') → interpretRef H p w' = .ok (a, w')` is
   plausible (content addressing dedupes puts; `Word.find` is monotone under
   append) and would justify the claim that exactly-once is *unobservable* by
   counting store effects in general. Only the concrete instance
   (`store_finalizer_is_word_idempotent`) is proved. The general statement is
   NOT proved and is not assumed anywhere.
2. **A no-rollback `catchE`.** Now expressible in the word-carrying target;
   neither defined nor proved. Only the rollback variant that matches
   `scopeHandlerR` is exhibited.
3. **`scoped`, `provide`, `raise` in the new target.** Ported so the handler is
   total, but no law is stated about them. `provide` still ignores its key, as
   in `scopeHandlerR`.
4. **Interruption, cancellation, concurrency, fairness.** No model. The LIFO and
   exactly-once results are single-threaded function composition. A production
   finalizer story under interruption is a different model and this file
   supplies no evidence about it.
5. **The elaborated `Prog CasSig` side.** `breaker-exhibits.lean` §4.4 notes
   that `scoped`, `provide` and `ensuring` "survive elaboration into
   `Prog CasSig`". §1 of this file shows the `ensuring` half of that sentence is
   wrong for a finalizer that must run on refusal; the consequences for
   `elaborate` itself are NOT worked out here.
6. **The `EC1-CE045` register row was not edited.** §4 of the Lean file proposes
   replacement text; the packet author owns the register.
7. **No mutation testing.** No deliberately damaged variant of `ensuringT` was
   run against these laws to confirm they turn red.
8. **`GTerm.jump` / `GTerm.brTag` blocks.** Every witness graph uses `.ret`
   blocks at fuel 1. Multi-block control flow inside a scoped child is
   untouched.

## Proposed replacement text for the `EC1-CE045` register row

PROPOSED ONLY. The same text is carried in §4 of the Lean file so the two
cannot drift.

| ID | Exact statement defeated | Witness | State / consequence |
| --- | --- | --- | --- |
| `EC1-CE045` | Sequencing a finalizer with ordinary `Prog.bind` runs it when the body refuses; and the catch-adequate target `ReaderT EnvR (StateT Word (Except Refusal))` of `EC1-CE041` repairs it. | `ensuring_never_finalises_a_refusal`, `ensuring_witness` (`breaker-exhibits.lean` §4.3b) defeat the first clause. `scopeHandlerR_ensuring_still_skips_the_finalizer` and `reraise_is_finalizer_blind` with `reraise_blindness_is_not_vacuous` (`workshop/counterexamples/EnsuringRepair.lean` §1) defeat the second: in that target `Except.error` carries no word, so EVERY clause that re-raises the body's refusal — the half of the law that distinguishes `ensuring` from `catchE` — is blind to its finalizer on that path, and two finalizers leaving demonstrably different words are identified. | `VERIFIED-KERNEL`; `interpretRef_bind` is refusal-strict, AND `EC1-CE041`'s target is insufficient for finalization even though it is sufficient for catch. The forced repair is the transformer ORDER: `ExceptT Refusal (StateT Word Id)`, whose refusals carry the partial word. `interpretRef_forget` and `run_interpretRefW` show this is the estate's own semantics — `interpretRef` with the refusal word retained, and equal to the small-step `run` WORD INCLUDED, which `run_interpretRef_agree` could only state existentially. `ensuring_runs_on_success` / `ensuring_runs_on_refusal` / `ensuring_never_replaces_the_refusal` / `ensuring_LIFO` / `ensuring_reads_the_finalizer_once` close the law there; `scopeHandlerW_catch_agrees` shows the further move is conservative for `catchE`. Still no `HHandler`: `Handler` and `ScopeSig` are unchanged and children stay `BlockId`. |

Evidence command for the row:

```text
cd library/cas
lake env lean ../../.staging/effect-core-v1/workshop/counterexamples/EnsuringRepair.lean
```

Exits zero and prints 44 receipts; ceiling `propext` and `Quot.sound`.

Two scope limits the row should carry, because this file proves neither:
nesting is one level deep in this carrier (so `ensuring_LIFO` is about the
composite of the clause with itself in the target, not about two nested
`ensuring` operations), and exactly-once is stated as dependence rather than as
a count, because content addressing makes store word-effects idempotent.

## Housekeeping

- Nothing under `library/` was modified. No existing packet `.md` was modified.
  `breaker-exhibits.lean` was not modified; it was rerun unmodified as a
  control and still exits zero.
- **The new file is gitignored** by `.gitignore:11` (`.staging/*/*/*`), exactly
  like its untracked siblings would be. `FixedFuel.lean` and `LocalAnchors.lean`
  in the same directory are tracked, so they were force-added at some point. If
  the packet author wants this file tracked it needs the same treatment:
  `git add -f .staging/effect-core-v1/workshop/counterexamples/EnsuringRepair.lean`.
  This lane did not stage or commit anything.
