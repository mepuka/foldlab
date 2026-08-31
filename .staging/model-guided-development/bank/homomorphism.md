---
id: HOMOMORPHISM
version: 3
carriers:
  - "Prog free-monad interpretation (handlers)"
  - "representation strata / tower collapse"
applicability:
  - "Is there a structure map (interpret, project, lift) that should commute with operations?"
  - "Do two composition paths exist that must land in the same place (a square)?"
templates:
  - name: monad-morphism
    form: "interpret(bind m k) = bind (interpret m) (interpret ∘ k) — for every handler"
  - name: op-commutes
    form: "interpret(op e κ) = handlerOp e (interpret ∘ κ)"
  - name: abstraction-square
    form: "α(op_rep r) = op_abs(α r) on valid representations (the book's Valid()/α square)"
falsifiers:
  - name: break-one-path
    mutation: "reassociate or reorder one side of the square only"
    detects: "tests that only exercise one composition path"
checkers: [lean-decide, fast-check, manual]
claimCeiling: heuristic
---

# HOMOMORPHISM

A structure map commutes with operations; handler agreement squares.

## Sites

- `library/cas/Cas/Lang/Handler.lean:52-59` `interpret_bind` — the monad-morphism law, every handler
- `library/cas/Cas/Lang/Representation.lean:115` `interpret_op`
- `library/cas/Cas/Lang/Tower.lean:71` `interpret_through`
- `library/cas/Cas/Backend/Universal.lean:175,178,181` unit/associativity of the lawful backend monad
- Archived richer sentence (session-reducer carrier): `library/effects/archive/lean-model-0.3/Effects/Conformance/Instances/CMP001.lean`

## Positive examples

(pending curation)

## Negative examples

- CX-011 (RUN-002, checker-witnessed): put-SEQUENCE commutativity
  fails off the admissible orders — a ref-carrying node put before its
  dependency refuses `DanglingReference`. Commutativity is join-level
  (`toStore (w₁ ++ w₂)` under honesty), or holds across topological
  reorderings only. Never state it over raw sequences.

## Implication examples

(pending curation)

## Counterexample history

- CX-011 (put-sequence commutativity vs admissibility, RUN-002)

## Outcome history

- RUN-002 (2026-08-30, scout): the join-algebra run — handoff items
  1, 4, 5, 6, 7, 8, 9, 11 sit in this family (join-realization over
  held `Honest.append`/`toStore_append_shadowed`, RefsOk transport,
  duplicate-identity, refusal-preserves-word, exact fresh-fold,
  step/put arm agreement, closure-local agreement, fuel-frame);
  CX-011 banked here; counts in [../runs.md](../runs.md).

## Annotations

gpt-5.6-luna 2026-08-30, receipt `7d3b9eb6` (full JSON local). Distilled:

- Template adds: `pure-commutes` (`interpret(h, pure a) = pure a` —
  the unit half my seed omitted); `tower-collapse` as an equation
  (`interpret(h, interpret(t, p)) = interpret(Handler.through(t,h), p)`).
- Falsifier adds: `break-pure-case`; `break-associativity-assumption`
  (target monad violating associativity while the interpretation
  equations still hold — probes the LawfulMonad premise).
- Negative-example add: a target with only a `Monad` instance, no
  `LawfulMonad` — the laws' hypotheses matter.
- Open questions kept: two cited line numbers (`Tower.lean:71`,
  `Universal.lean:175-181`) need re-verification against the files;
  archived CMP001's carrier remains uncurated.

## Open questions

(none)
