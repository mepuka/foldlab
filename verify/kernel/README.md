# verify/kernel — the Plait kernel algebra, machine-checked model

Status: **EXPLORATORY, pre-grill.** This package realizes the ratified
kernel-algebra design record
(`docs/design/2026-08-18-plait-kernel-algebra.md`) as a Lean 4.33.0
model: the sort system, the two-layer AST (an intrinsic layer where
unlawful acts have no constructor; a candidate layer where they are
spellable and refused at the door with the law named and the repair
taught), the program pin order, hole filling, and an abstract-carrier
semantics. Its run-composition family is cited by the
Plait kernel admission door row of the verification ledger; the rest of
the package claims **no ledger row**. It has **no CI wiring**,
and is imported by nothing — the blast radius is this directory plus
one research record (`docs/research/2026-08-18-kernel-model-notes.md`,
which argues the modeling decisions and carries the KM grill list).

## Agent direction

Read `../AGENTS.md` first for the model-gate laws this package works under.
This is the model, not the runtime, and what leaves here is the language
itself: `verify/unity` requires this package by path, its emitter writes
`packages/plait/fixtures/kernel-conformance.ndjson` at interchange format 2,
and from that one file the runtime generates its kernel tables, schemas, and
program builder. (The status paragraph above predates that consumer — its
"imported by nothing" is filed as a finding, not repaired here.)

What is machine-generated inside this directory is
`negative-controls/*.cex.txt`, each control's executed refutation, which
`./run.sh` re-runs and diffs — a
drifted trace is a red gate, never a stale file to update by hand.
`projections/` is the opposite case: hand-derived sketches that generation
still owes, so a divergence there is a defect in them, not in the model.

Wall: `./run.sh`, described below — no CI workflow runs it. Downstream,
`packages/plait/src/kernel/README.md` names the four regeneration commands and
their byte-identity checks; never hand-edit an artifact below the corpus.

One level deeper: `Kernel/Definitions.lean` for the objects,
`Kernel/Laws.lean` for statements, `Kernel/Proofs.lean` for proofs, and
`negative-controls/` for the executed refutations.

Zero external dependencies; the toolchain and empty-manifest pins are
gate-checked. File partition follows `verify/fabric`: objects in
`Kernel/Definitions.lean`, law statements in `Kernel/Laws.lean`
(one law is stated and deliberately unproven, and the gate enforces
that posture), proofs in `Kernel/Proofs.lean`.

The KM-20 refusal-stability family makes door growth explicit as
membership inclusion in both the admitted catalog and the writ's pinned
universe. `admit_monotone` preserves the exact admitted act;
`intrinsic_fault_refused_everywhere` preserves refused status without
claiming reason identity on multi-fault candidates; and
`relative_refusal_repairable_by_growth` constructs a finite admitting
extension under the load-bearing premise that no intrinsic fault remains.

The KM-21 machine-repair slice models the four candidate-only rewrites
as the partial function `repair` and proves
`machine_repair_clears_reason`: at any destination door the repaired
candidate cannot surface the reason it answers, while admission or a
different remaining refusal is lawful. The last-writer control exercises
that caveat directly by surfacing `clock-read` after clearing
`last-writer-wins`. Fault-set construction, declared priority arbitration,
repair composition, and termination remain outside this slice.

The run-composition family closes the composed-certifier bound: the
plait algebra engine's program run — walk in admission order, complete
each node, judge it at the one door, carry, stop at the first refusal —
is carried here as `walk`, and five laws say what composing those
per-node judgments buys. `run_composes_admissions` is an iff, so a
landed run is exactly a sequence of admitted acts and nothing else is
needed to land one; `run_sequential_composition` says running in two
passes is running in one; `run_tail_unjudged` says two different tails
after a refusing prefix are indistinguishable in the outcome;
`run_refusal_prefix_stands` splits a refusing walk at exactly one node
and leaves the prefix standing as an admitted walk; and
`run_monotone_context` carries the engine's replica claim — growth
never retracts a run's admission. Completion and carriage stay
parameters, and the same bounds the engine claims hold here: one
sequential walk, no concurrency beyond that monotone benignity, no
liveness, no retries, no scheduler.

`./run.sh` is the gate: source hygiene, partition checks, the pinned
law list, `lake build`, the 97-theorem roster with the trusted-base
footprint sweep, twenty-seven executable controls diffed against committed
traces (the closure and signature rows, the lawful twin, the provision
control, three KM-20 mutants, four machine-repair mutants, and two
run-composition mutants — the walk that judges the tail after a refusal
and the walk that erases the prefix a refusal stood on), and the
four-file must-not-compile class — sort-discipline violations the
elaborator itself must refuse, each with a pinned diagnosis and a
compiling witness twin.
