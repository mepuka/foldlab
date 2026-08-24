# Schema JSON Codec

This context defines the canonical terms for discussing a possible Effect Schema and JSON formalization. It does not select accepted source forms or semantic behavior.

## Language

**Raw Schema AST**:
The complete pinned SchemaAST.AST presented to source admission before any lowering.
_Avoid_: Schema Core, schema definition

**Source Schema**:
A Raw Schema AST that satisfies a future reviewed domain contract.
_Avoid_: Effect Schema, valid schema

**Schema Core**:
The library-owned algebraic carrier a future domain decision may define for semantic reasoning.
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
The name reserved for a future modeled value transformation related to pinned Effect Schema toCodecJson behavior.
_Avoid_: JSON.stringify, JSON Schema generation

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
