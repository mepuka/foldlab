# Schema JSON Codec

This context defines the canonical terms for the library-owned schema
universe, its JSON codec, and its typed correspondence to foreign
language surfaces. Admission of the complete Effect Schema source AST
remains a separate future boundary.

## Language

**Raw Schema AST**:
The complete pinned SchemaAST.AST presented to source admission before any lowering.
_Avoid_: Schema Core, schema definition

**Source Schema**:
A Raw Schema AST that satisfies a future reviewed domain contract.
_Avoid_: Effect Schema, valid schema

**Schema Core**:
The library-owned first-order `Cas.Schema.Ast` carrier used for semantic
reasoning and canonical identity.
_Avoid_: Schema AST, normalized TypeScript

**Schema Well-Formed**:
The inductive judgment that a Schema Core and all of its children satisfy the admitted structural and semantic side conditions.
_Avoid_: Valid, type-correct

**Source Value**:
A library-owned representation of the value accepted by the admitted Source Schema before JSON encoding.
_Avoid_: JavaScript value, Domain Value

**Encoded JSON Value**:
A strict value-level JSON result, distinct from JSON text and from arbitrary JavaScript values.
_Avoid_: JSON, serialized JSON

**Codec JSON Encoding**:
The total `Cas.Schema.encode` transformation from a Schema Core denotation
to an Encoded JSON Value. Its inverse is partial and its forward and
image-exactness laws are established over Schema Well-Formed codes.
_Avoid_: JSON.stringify, JSON Schema generation

**Described Type**:
A native Lean carrier paired with one Schema Core code, a proof of Schema
Well-Formedness, and mutually inverse translations between the carrier and
the code's denotation. **Kind:** schema. **Obligations:** both inverse laws;
the generic codec laws are inherited through the translations.
_Avoid_: serializable type, JSON type, validation annotation

**Foreign Type Representation**:
A typed correspondence record for a Described Type in one target language:
its decoded target type, encoded target type, and codec value, retained
structurally rather than as display strings. **Kind:** schema.
**Obligations:** name the selected public target surface and preserve the
decoded/encoded distinction; this record is correspondence data, not an
implementation-agreement theorem.
_Avoid_: foreign type string, generated binding, equivalent type

**TypeScript Effect Schema Representation**:
The TypeScript instance of Foreign Type Representation: a TypeScript type
expression for the decoded value, a separate expression for the encoded
value, and the term-level Effect Schema value with separate decoding- and
encoding-service types. **Kind:** schema. **Obligations:** render the pinned
Effect v4 generic
`Schema.Codec<Decoded, Encoded, DecodingServices, EncodingServices>` and
never collapse `Decoded` and `Encoded` merely because one fixture happens
to use identical carriers.
_Avoid_: TypeScript schema, Effect type, encoded JSON type

**Encoding Failure**:
A typed terminal result showing that an admitted operation's preconditions were not met.
_Avoid_: Exception, defect, stuck state

**Observation Normalization**:
The declared relation that removes representational differences before a model observation is compared with a pinned Effect observation.
_Avoid_: Equality, cleanup

**Supported Constructor**:
A Raw Schema AST constructor admitted by a future reviewed domain contract together with every required side condition.
_Avoid_: Implemented node, valid node

**Deferred Feature**:
A source feature explicitly excluded until a later context revision supplies its carriers, observations, failures, and obligations.
_Avoid_: Unsupported forever, TODO
