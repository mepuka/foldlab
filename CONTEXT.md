# foldlab

Streams, entities, and agent-minted types over one discipline: every value
has a canonical byte form, identity is a digest over those bytes, and every
cross-boundary claim is a checkable digest equality. This file is the
glossary; design state lives in NEXT.md, decisions in docs/adr/.

## Language

### The two folds

**Event**:
One received fact — stream identity, position, payload. Arrival order
across streams is not in the event.
_Avoid_: message, record (a record is what a transform *produces*)

**Canonical encoding**:
THE byte form of a value. Everything that names, fingerprints, or ships a
value goes through it, so there is exactly one identity.
_Avoid_: serialization format, wire format (transport encodings are not
canonical)

**Chain head** (or **head**):
A 32-byte commitment to an exact history prefix — the identity fold.
Extending is O(1); recomputing from events is always possible, which is
what makes any head a checkable claim.
_Avoid_: hash, checksum

**Fold state**:
What a history did — the meaning fold. Two histories can agree in state
while differing in head: the chain remembers what the fold forgives.

**Merge fact**:
The committed linearization of a merge: the ordered picks, not the merged
content. The content is derivable; the fact is what is stored and named.
_Avoid_: merge result, merged stream

**Compaction**:
Replacing a prefix by its (head, fold state) pair. What is lost — only ever
by explicit choice — is step-through inside the discarded prefix.

**Anchor**:
An entity's (key, head, state digest) triple: the seen-this-history-before
index entry, and the raw material of provenance.

### Walls

**Wall**:
A test asserting that two implementations of the same algebra take equal
inputs to equal digests — TS ≡ Go, batch ≡ stream, native ≡ wasm.
Equivalence is by digest, never by trusting a port.

**Fixture**:
Frozen digest pins generated once by the Go side. A mismatch means a port
drifted; the fixture is evidence, not a constant to update.

**Transport**:
Anything that moves or regroups bytes without touching identity —
compression, chunking, framing. Identity is always of canonical
uncompressed bytes; nothing ever fingerprints a transport form.

### Transforms

**Transform** (or **Xform**):
A per-event morphism between streams; dropping an event is a return value,
not an exception. Two transforms are the same exactly when they take
equal-head inputs to equal-head outputs.
_Avoid_: mapper, processor

**Fusion**:
Composition that costs one traversal and zero intermediate streams. The
efficiency claim of the transform algebra.

**Pipeline program**:
The serialized description of a composed transform — an ordered list of
primitive digests plus parameters. Programs are data: the same program runs
in-process, over the wire, or via CLI, and is what the registry stores.
_Avoid_: pipeline config, job spec

### Entities and provenance

**Entity**:
The quotient of event traffic by a correlation key: one key, one chained
history, both folds maintained. Consumers hold an entity handle and never
see stream mechanics.

**Correlation key**:
The equivalence that decides which events are the same entity's history.

**Journal**:
The load-bearing event log — domain traffic and LLM/agent traffic alike.
Lineage is a query over the journal, not a separate system.

**Span**:
A segment of journal traffic between anchors. Its id is the segment's chain
head, so a span id is recomputable, not merely assigned.
_Avoid_: trace segment (a trace id is the root anchor)

**Certificate**:
The derivation claim riding on a produced record: schema digest, program
digest, input anchor, span head. Every field is recomputable by an auditor.
_Avoid_: metadata, lineage tag

### The fence

**Schema**:
The declared form of a boundary crossing: a Type side, an Encoded side,
and the transformation between them — never merely a type. Its identity
commits the SHAPES of both sides and nothing else; every other semantic
bit (behavior, brands, defaults, meaning) lives on the tier its author
chooses: a check (narrows the shape — moves identity), an annotation (a
claim — free, uncommitted), or a binding (a claim promoted to fact by a
law). The lab does not decide a domain's semantics; it provides the tiers.
_Avoid_: type (one side of a schema), model, DTO

**Mint**:
The committed operation by which a type, transform, or binding enters the
world: it must typecheck, receive a digest in the registry, and pass its
law before anything may depend on it. Types are minted, never written as
free text.

**Registry**:
The ledger of minted schemas, transforms, and bindings, addressed by
digest. A reference that does not resolve is a typed refusal, not a lookup
miss.

**Handle**:
What mint returns and the only reference agents may compose with — a
structural digest plus its verified bindings.

**Structural digest**:
A schema's identity: a digest over the representation of BOTH its sides,
Type and Encoded, with every annotation stripped. Checks participate —
narrowing a domain is a new schema — annotations and deployment facts
never do: a schema on two subjects is one schema.

**Semantic fold**:
A derivation computed as a fold over a digest-anchored AST or program
value — the meaning-side twin of the structural digest. Every derived
surface (Go twin, JSON Schema, DDL, span preview, codec) is one; derived
surfaces cannot drift because their input has committed identity.
_Avoid_: code generator, compiler pass (those are implementations of one)

**Binding**:
A law-gated deployment fact about a schema — subject, codec, correlation
key, commutativity class — committed to the registry only after its checker
passes. The annotation on the schema is the claim; the registry record is
the fact.
_Avoid_: annotation (an annotation is only the authoring surface)

**Commutativity class**:
Whether events of a type commute under the meaning fold — the type-level
fact that decides entity boundaries and licenses reordering. It never
licenses reordering the identity fold.

**Lane**:
One of the two ways work enters: **compose** (existing primitives, no
toolchain, instant verification) or **derive** (new twin generated and
walled before use).
