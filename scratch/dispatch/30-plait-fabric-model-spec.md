# Dispatch 30 — Plait: the fabric model, `verify/fabric` (executor spec)

Status: dispatched 2026-08-17 under the Plait ratification record
(`docs/design/2026-08-17-plait-ratification-record.md`; laws:
`2026-08-17-plait-coordination-fabric.md` §5/§9,
`2026-08-17-plait-action-plane.md` §4). Board: project `plait`,
epic E3. The issue body is this spec.

## Objective

A standalone, zero-dependency Lean 4 package `verify/fabric` stating
and proving the fabric's algebra laws — F1, F2, F2b, F3, F4, F9 — with
an executable emitter authoring the conformance vector corpus the TS
runtime is walled against. This is where "the transport's sloppiness is
harmless" stops being prose.

## Spec-fixed decisions (the executor edits none of these)

1. **Home**: `verify/fabric/`, its own Lake package, toolchain
   `v4.33.0` (the estate pin), manifest `packages: []` — zero
   dependencies. NOT inside `verify/moves` (ruling G5): the active
   lane's package is not this program's to grow. The gate script
   `verify/fabric/run.sh` follows the house model-gate shape.
2. **Hygiene inherited by construction**: no `sorry`/`partial`/
   `panic!`; no `@[implemented_by]`; no non-allowlisted `@[extern]`;
   footprint gate — `#print axioms` over every rostered theorem stays
   inside `{propext, Classical.choice, Quot.sound}`; partition gate —
   definitions / law statements / proofs in separate files, no law file
   orphaned from the gate.
3. **Objects.** Fabric traces are lists of positioned operations
   (`(position : Nat) × Op`); cells are join-semilattices built from
   finite sets/maps of holder-attributed observations. The semilattice
   proof pattern of `verify/moves/Moves/Model.lean:200-256` is the
   house idiom to follow — followed, not imported: this package
   restates its own objects (the two models are deliberately
   independent; a shared abstraction is a future ratification, not this
   slice's call).
4. **The laws** (statements fixed in kind; exact Lean phrasing is the
   executor's, recorded in the statements file):
   - **F1** cell merge is associative, commutative, idempotent; two
     replicas that verified the same observation set are equal.
   - **F2** the terminal state of an evidence trace is invariant under
     permutation AND duplication of the trace (ACI ops).
   - **F2b** position-floor-guarded application of an arbitrary step
     function over any at-least-once redelivery schedule (duplicates +
     bounded reordering of a positioned trace) equals exactly-once
     sequential application.
   - **F3** `foldFrom (fold xs) ys = fold (xs ++ ys)` — anchors resume
     exactly.
   - **F4** for commutative-class algebras, the merge of per-partition
     folds equals the sequential fold over the interleaved trace.
   - **F9** policies form a meet-semilattice under componentwise
     intersection, and in any action tree every descendant's effective
     policy `≤` the root's (induction on the tree via meet
     monotonicity).
5. **The emitter** (the DEV-670 idiom): an executable Lean driver
   walks trace corpora — including adversarial rows: duplicated
   deliveries, permuted schedules, floor-violating replays,
   non-commuting intruder ops shown *refused from the ACI alphabet*,
   attenuation-violating policy requests shown clamped by meet — and
   prints canonical-bytes vectors with verdicts. JSON output is RFC
   8785-ordered over the narrowed (float-free, integer) grammar; the
   RQ-9 reference integer path
   (`docs/research/reference/rq9-rfc8785-numbers/`) is the promoted
   pattern for number printing — transliterate, cite, do not re-derive.
   Provenance line = the generation command; the gate diffs a fresh
   regeneration byte-for-byte; hand-typed vectors are refused on sight.
6. **Negative controls** (a prover that cannot fail proves nothing) —
   each a variant dropping exactly one law, refuted by a named vector,
   trace committed: drop idempotence → killed by the duplication rows;
   drop commutativity → killed by the permutation rows; drop the floor
   guard → killed by the F2b replay rows; drop meet-clamping → killed
   by the attenuation rows.

## Gates (mechanical)

- `lake build` exit 0; `bash verify/fabric/run.sh` green: roster
  check, footprint check, partition check, negative controls with
  committed traces, vector regeneration byte-identical, counts pinned.
- Every theorem in the roster; every roster line consumed by the gate
  (orphan check).
- The vector corpus lands under `packages/plait/fixtures/` with its
  provenance line (consumer: dispatch 29's wall and epic E4's runtime).

## Non-goals

F5 (the register transition system — epic E5, Veil-pinned package),
F6 (conformance automaton), F7/F8/F10 statements (epics E6/E9 — the
file layout may leave room, stating them is barred here), any TS code,
any daemon change, any VERIFICATION.md edit (ledger rows land with
slices, ruling G6 — the closing report proposes the row text; the
coordinator lands it).

## Closing report extra

A guided tour of the package for a reader learning Lean — what each
file states, how a trace walks through `fold`, what the footprint check
proves and does not prove — glossing all notation (the education rule).

Seats: Eng builds on `agent/<name>/<issue>`; Rev reviews the PR;
coordinator merges. DECISIONS log per house rule.
