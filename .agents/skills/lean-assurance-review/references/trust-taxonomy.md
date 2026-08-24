# Trust taxonomy

Inventory and classify:

- `sorry`/`admit`/`sorryAx` and custom axioms;
- classical choice/propext/quotient axioms accepted by policy;
- `native_decide`, `bv_decide`, external solvers and certificate replay;
- `unsafe`, `extern`, FFI, `implemented_by`, runtime overrides and compiler assumptions;
- metaprograms/build scripts that execute during elaboration;
- parser, serializer, schema, generator and generated-source provenance;
- dependency/toolchain revisions and unexpected imports;
- environment/fairness/timing/configuration/physical assumptions.

`#print axioms` is a useful logical-dependency probe
([Mathlib logic notes](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Logic/Basic.html)).
It does not inventory FFI, runtime overrides, compiler correctness, statement faithfulness, or the
world outside the theorem.

Record native/proof-producing mechanisms literally. Trust policy may allow one and prohibit another
even when both close the same proposition.

A theorem accepted with `native_decide` belongs under `proved` only when the exact theorem was
reproduced and the stated policy permits its native axiom/compiler trusted base; annotate that trust
instead of calling the result kernel-only. If policy rejects the mechanism, classify it as proof
debt. `modelChecked` is an independent label used only when the computation exhausts a named model
and bounds; native execution alone does not justify it. Without the theorem, command result, and
policy, record the proof status as unknown.
