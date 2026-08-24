---
name: lean-model-invariants
description: Design Lean types, invariants, checked boundaries, and representation layers after a domain contract exists. Use for intrinsic versus extrinsic typing, subtypes, smart constructors, raw/WF data, canonicalization, runtime witnesses, or protocol-state encodings; do not use for proof-only repair.
---

# Lean Model Invariants

Choose an encoding whose proof value exceeds its construction, transport, and boundary costs.

Require a domain contract naming objects, observables, examples, assumptions, and intended theorems.
If none exists, create that pre-model contract first; use `$lean-formalization-strategy` when it is
installed or emit a provisional contract directly before choosing representations. Continue when
unknowns can remain explicit alternatives or assumptions; pause when they change the representation
architecture or require new authority.

## Inventory before encoding

For every invariant record:

- subject: semantic, structural/typing, representation, cache/mechanical, boundary validation, or
  state transition;
- locality and lifetime: stable local fact, changing policy, global trace fact, or environment fact;
- decidability and validation cost;
- whether execution, serialization, or generated code needs a witness/tag;
- which operations must preserve it and whether invalid intermediate states must exist.

Read [representation decision](references/representation-decision.md) to choose the mechanism.

## Build visible boundaries

Default to:

```text
wire/raw -> parse -> validate or elaborate -> checked core -> semantic meaning
```

Use `Except Diagnostic` at user/wire boundaries when failure needs explanation. Prove validator
soundness; prove completeness only when rejection of every valid input matters. Keep an explicit
projection/erasure from checked values to raw or semantic values.

Read [boundaries and erasure](references/boundaries-and-erasure.md) whenever values cross JSON,
schema, FFI, generated-language, database, or process boundaries.

## Name obligations before implementation

Require as applicable:

- smart-constructor/validator soundness;
- preservation by each public mutator/transition;
- normalization soundness and idempotence;
- elaborate/erase or encode/decode round trips;
- checker soundness and optional completeness;
- refinement from optimized/raw representation to stable semantics;
- witnesses for valid states and negative examples for invalid ones.

Complete when the representation record names raw and checked types, constructor authority,
retained versus erased data, validation path, operations, theorem obligations, and facts deliberately
kept extrinsic. When sequencing/effects remain, route the record through `$lean-algebraic-systems`
when installed or an equivalent self-contained systems-model handoff, then return the combined model
for the post-model signature-freeze pass. Otherwise return directly. Use
`$lean-formalization-strategy` for the freeze when installed; otherwise emit the exact declarations,
semantic diff, imports/toolchain, observables, witnesses/counterexamples, assumptions, and unresolved
questions.
