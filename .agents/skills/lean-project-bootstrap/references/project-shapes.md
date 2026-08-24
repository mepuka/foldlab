# Project shapes

Choose from the operational need, not from a universal template.

| Shape                                  | Start with                                                | Add only when needed                          |
| -------------------------------------- | --------------------------------------------------------- | --------------------------------------------- |
| Small executable or verified algorithm | Core/Std, one executable, focused tests                   | Batteries for additional utilities            |
| Reusable CS/model library              | Syntax/model, semantics, proofs, and tests                | Executable oracle or trace runner             |
| Mathematics-heavy formalization        | Mathlib at the exact compatible revision                  | Domain-specific downstream libraries          |
| Reference model for another runtime    | Pure semantics plus decoder/encoder and conformance tests | FFI/native code behind an explicit relation   |
| Lean compiler contribution             | Compiler repository build and stage toolchains            | Never treat as an ordinary `lake new` package |

For a system model, prefer module boundaries that expose trust transformations:

```text
Raw/Boundary -> Model -> Semantics -> Theorems
                         \-> ExecutableOracle/Tests
```

There is no universal representation layout: checked extrinsic syntax and intrinsically typed cores
are both serious designs. Setup should preserve room for the later modeling decision.
