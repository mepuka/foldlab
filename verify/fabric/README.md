# Fabric algebra model

`verify/fabric` is a standalone Lean 4.33.0 package with no Lake dependencies.
It states and proves the Plait fabric laws F1, F2, F2b, F3, F4, and F9, then
executes the same definitions to author the runtime conformance corpus at
`packages/plait/fixtures/fabric-conformance.ndjson`.

## Guided tour

- `Fabric/Definitions.lean` owns the objects and executable functions. A
  `Cell` is a finite set of `(holder, observation)` pairs. `foldEvidence`
  inserts a trace into that set. `guardedApply` records every arrival in a
  position-addressed replay buffer and applies only contiguous successors
  before advancing. That successor/contiguity discipline is the protection;
  the floor is the anchor's derived resume coordinate, not a filter.
  `CommutativeAlgebra` declares the laws
  required before partition folds may be merged. `Policy.meet` intersects the
  four set-valued components and takes `Nat.min` across the four ceilings.
- `Fabric/Laws.lean` contains statements only. F1 is cell ACI plus extensional
  convergence; F2 identifies traces with equal observation support; F2b
  states that the in-window support of the raw schedule is exactly the
  contiguous positioned trace, then names the shipped buffer fold in the
  conclusion;
  F3 is checkpoint resumption; F4 is partition/interleaving equivalence under
  a declared commutative algebra; F9 is the full greatest-lower-bound law plus
  descendant attenuation.
- `Fabric/Proofs.lean` contains proofs only. The trace proofs reduce equality
  to finite-set membership. F2b inducts over consecutive positions, and
  `guard_is_redundant` proves that adding a position-floor/window filter before
  the successor drain cannot change its result. F4 first proves append and
  permutation lemmas. F9 proves set intersection and numeric minimum
  componentwise, then follows an action-tree descendant derivation.
- `Fabric/Mutants.lean` contains four variants, each dropping exactly one
  required law. The fourth drops the successor discipline and is killed by the
  order-sensitive 6-before-5 row; it does not claim to drop the redundant
  floor guard. `Fabric/ControlProofs.lean` proves the retained laws and the
  named counterexamples. `ControlMain.lean` emits the committed counterexample
  traces checked by the gate.
- `Fabric/Canonical.lean`, `Fabric/Corpus.lean`, and `Main.lean` are the
  executable emitter. Object keys are sorted; strings occupy a fixed safe
  ASCII grammar; numbers are non-negative integers. The integer rendering
  transliterates the promoted RQ-9 path in
  `docs/research/reference/rq9-rfc8785-numbers/EsNumberToString.lean`: strip
  decimal trailing zeroes, then render ES2019 step 6. No float enters this
  grammar, capped at the RFC 8785 safe-integer ceiling `9007199254740991`.
- `Fabric/BridgeProofs.lean` supplies the concrete theorem instance named by
  every emitted row. It also proves that the F9 emitter's executable Boolean
  policy order is equivalent to `Policy.Le`. The tree row carries a stricter
  second-level request, so its descendant bytes differ from the one-level clamp.
  The gate refuses a vector whose `(kind, name, witness)` triple is not pinned or
  whose witness is absent from the complete theorem and footprint roster.
- `run.sh` is the gate: source hygiene, file partition, build, complete theorem
  roster, proof footprint, four negative controls, pinned vector counts, and
  byte-identical regeneration.

## How a trace walks through `fold`

`fold step initial [a, b, c]` is the left fold
`step (step (step initial a) b) c`. `foldFrom` is the same walk starting from a
checkpointed state. F3 proves that folding `[a, b]`, checkpointing its result,
and resuming with `[c]` is definitionally the same computation as folding
`[a, b, c]` once.

F2 uses a different fold because evidence is a join-semilattice: inserting the
trace into a finite set deliberately forgets both order and multiplicity. F2b
handles non-idempotent steps. A schedule is finite and may be duplicated,
reordered, and prefixed with stale deliveries. `ingestSchedule` traverses the
actual arrivals and records them by position. F2b's explicit
`F2bSerialSuccessorPremise` describes
the raw schedule: inside the window it has exactly the support of the
positioned trace, while duplicates, permutation, and stale deliveries remain
allowed. The proof derives the buffer's coverage from that premise and drains
only consecutive successors. A delivery of 6 before 5 is buffered; the
arrival-order negative control drops the successor discipline, applies
operation 3 immediately, advances the frontier, and skips operation 2. The
order-sensitive append row therefore yields `[3]` in the mutant and `[2, 3]`
in the lawful model. The theorem remains generic in `step`, so counting and
other non-idempotent folds are included.

The original dispatch requested a drop-floor-guard control. The round-3
coordinator ruling on DEV-695 (comment
`7cb08c80-7c12-4a1d-9a7e-0daed812a0e5`, 2026-08-17) records the approved
deviation: `guard_is_redundant` proves that control is unstatable in this
model, so the fourth control drops the load-bearing successor discipline
instead.

## Notation

- `x ∈ cell`: observation `x` is a member of the finite cell.
- `left ∪ right`: cell merge (set union).
- `left ∩ right`: policy-component meet (set intersection).
- `child ≤ parent`: every child set is a subset of the corresponding parent
  set and every child numeric ceiling is at most the parent's.
- `xs.Perm ys`: `ys` contains exactly the elements of `xs` in another order.
- `xs ++ ys`: list concatenation.
- `¬ p` and `x ≠ y`: proposition `p` is false, and `x` and `y` differ.

## What the footprint proves

For every theorem in the roster, the gate asks Lean to print its transitive
axiom dependencies and permits only `propext`, `Classical.choice`, and
`Quot.sound`. This catches proof routes that compile while importing an
additional axiom. Source hygiene separately rejects the known evaluator and
code-generation escape hatches.

The footprint does not prove that the definitions are the right model of a
running broker, that the emitter is RFC 8785-correct outside its narrowed
integer/ASCII grammar, or that a TypeScript/Go consumer corresponds to Lean.
Those are later wall and lockstep obligations. This package proves only the
stated algebra over its definitions; it makes no liveness, NATS, crash, lease,
or runtime-conformance claim.

## Run

```sh
cd verify/fabric
lake build
lake exe emitter
./run.sh
```

The first emitter line records the full command and output path. Never edit the
fixture or a counterexample trace by hand; regenerate them through their
executable.
