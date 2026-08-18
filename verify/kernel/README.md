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

Zero external dependencies; the toolchain and empty-manifest pins are
gate-checked. File partition follows `verify/fabric`: objects in
`Kernel/Definitions.lean`, law statements in `Kernel/Laws.lean`
(one law is stated and deliberately unproven, and the gate enforces
that posture), proofs in `Kernel/Proofs.lean`.

`./run.sh` is the gate: source hygiene, partition checks, the pinned
law list, `lake build`, the full theorem roster with the trusted-base
footprint sweep, seventeen door controls diffed against committed
traces (fourteen closure rows, two signature-discipline refusals, and
the lawful twin that refutes a door refusing everything), and the
four-file must-not-compile class — sort-discipline violations the
elaborator itself must refuse, each with a pinned diagnosis and a
compiling witness twin.
