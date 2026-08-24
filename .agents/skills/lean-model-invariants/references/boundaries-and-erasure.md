# Boundaries and erasure

Proofs in `Prop`, including subtype proof fields, are erased. This can make checked Lean values
runtime-cheap, but it does not make validation free and does not transmit the proof to another
runtime ([Lean propositions](https://lean-lang.org/doc/reference/latest/The-Type-System/Propositions/),
[subtypes](https://lean-lang.org/doc/reference/latest/Basic-Types/Subtypes/)).

Use retained `Type`-valued data (`Sigma`, ordinary fields, tags, certificates) when execution or
serialization must inspect a witness. A dependent package whose second component is only a `Prop`
proof does not automatically retain that proof at runtime. Keep structural DTO fields separate from
domain refinements:

```text
bytes/JSON -> Raw -> Except Diagnostic Checked -> Semantic
Semantic/Checked -> canonical projection -> bytes/JSON
```

For each crossing record:

- ownership and version of the wire schema;
- integer/range/encoding checks;
- omitted refinements that schemas or target types cannot express;
- canonicalization and round-trip notion;
- whether foreign code can forge a supposedly checked value;
- FFI/ABI, serializer, parser, and generator trust assumptions;
- validation and conformance tests in the receiving runtime.

A private constructor restricts construction through the Lean API; it is not by itself a theorem
that foreign bytes, unsafe code, or an `extern` implementation preserve the invariant.
