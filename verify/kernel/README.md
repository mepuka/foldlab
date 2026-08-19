# verify/kernel — the Plait kernel algebra, machine-checked model

Status: **EXPLORATORY, pre-grill.** This package realizes the ratified
kernel-algebra design record
(`docs/design/2026-08-18-plait-kernel-algebra.md`) as a Lean 4.33.0
model: the sort system, the two-layer AST (an intrinsic layer where
unlawful acts have no constructor; a candidate layer where they are
spellable and refused at the door with the law named and the repair
taught), the program pin order, hole filling, and an abstract-carrier
semantics. It claims **no VERIFICATION.md row**, has **no CI wiring**,
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
`last-writer-wins`.

The slice's four remainders now stand, two of them with their bounds
named rather than silently widened.

`faults` is the fault-set construction: the door's own checks, arm for
arm, with every atom fault of the payload it sweeps kept rather than
dropped at the first. `fault_listing_decomposes_door` proves the listing
is a decomposition and not a second opinion — the door's verdict is the
listing's head, and an empty listing is an admission — and
`fault_listing_semilattice` gives the finite-set reading its
associative, commutative, idempotent join.

Arbitration is `arbitrate`, the priority-least member under a declared
total order on reasons; the order leads with the four
machine-applicable rows and ends with the two door-relative ones.
`door_arbitrates_least_fault` proves it agrees with the door exactly
where the listing already leads with its priority-least member, and the
premise is where the honesty is: the unbounded claim is FALSE, because
the door arbitrates by position inside a payload sweep. Two emit rows
carrying the same two atom faults in opposite payload order earn
different answers from the door and the same answer from arbitration,
so no total order on reasons reproduces this door, whatever order is
declared. Making the door arbitrate is a change to the door, not a
theorem about this one.

Composition and termination are the harness's licence. `repair`'s image
lies outside its own domain, so a repaired candidate offers no second
machine move (`repair_composes_to_fixpoint`), the chain is its own
fixpoint from one step on, and every refusal standing at that fixpoint —
at every door, not merely the one that refused — is advisory
(`repair_chain_terminates`). An agent may follow machine-applicable
taught moves to the fixpoint without review per step, and what remains
there is exactly what needs information the candidate does not carry.

Termination does NOT rest on the fault set shrinking, and the recorded
argument that it does is refuted in place. The past-mutation rewrite
builds a successor declaration pinning its predecessor; where the acting
writ's universe does not hold that predecessor, the repaired candidate's
listing carries a door-relative reason its input never had. The
`drop-repair-fault-shrinkage` control commits that candidate, showing a
listing that moves from `past-mutation` to `off-writ-referent` while the
chain still stops.

Outside the slice: repair chaining at RUN scale — re-offering a repaired
node inside a walk — and any runtime that would drive the chain.

The KM-4 composition slice closes the two-doors gap: program admission
checked the DAG discipline while the single-act door judged one sentence,
and the two stood side by side. The run walk composes them — a closed
program walked in admission order, every node routed through that one
door, the walk stopping at the first refusal. Six statements say what the
composition is. `run_composition` splits a run over concatenated node
lists into the prefix's run and the suffix's run from the context the
prefix reached. `run_admitted_sequence` proves a landed run is exactly a
sequence of admitted acts — one step per walked node, in order, each
recording the door admitting that node's candidate at that step's own
context. `run_refusal_decomposition` proves every refusal splits into a
prefix that landed with exactly the steps the outcome reports and a node
whose candidate genuinely refuses at the context that prefix reached.
`run_tail_unjudged` proves the answer is that same refusal for every
tail. `run_context_grows` carries monotone-context benignity. And
`run_landed_closed` proves a landed run's program required nothing, which
is where filling — the valuation's action, upstream of the walk — meets
the run.

Completion and carriage growth are parameters, not fixed functions: the
composition holds for every completion, and only growth's monotonicity is
ever used. Three thinnesses are stated rather than hidden. Completion is
total here, where a carriage may instead fail a node into an error
channel. Carriage is outside the outcome, so a carrier failure after an
admission has no third ending in this model's two-way outcome. And the
program-admission precheck runs before the walk is entered, where the
empty node list lands vacuously — the unit the composition needs. Outside
the slice entirely: concurrency beyond the monotone-growth premise,
liveness, retries, and scheduling.

`./run.sh` is the gate: source hygiene, partition checks, the pinned
law list, `lake build`, the 124-theorem roster with the trusted-base
footprint sweep, thirty-one executable controls diffed against committed
traces (the closure and signature rows, the lawful twin, the provision
control, three KM-20 mutants, four machine-repair mutants, four
repair-chain and arbitration mutants, and the two run-composition
mutants), and the four-file must-not-compile class —
sort-discipline violations the elaborator itself must refuse, each with a
pinned diagnosis and a compiling witness twin.
