# foldlab

Streams, entities, and cataloged types over one discipline: every value
has a canonical byte form, identity is a digest over those bytes, and every
cross-boundary claim is a checkable digest equality. This file is the
seam-level glossary — module-local vocabulary lives in each module's own
CONTEXT.md and may not leak here; design state lives in NEXT.md,
decisions in docs/adr/. Module-local vocabulary stays local unless the
claims ledger itself speaks it: a term VERIFICATION.md uses by name earns
a cross-seam headword here, and that headword must point at the module
CONTEXT.md that owns it.

## Language

### The two folds

**Event**:
One received fact — stream identity, position, payload. Arrival order
across streams is not in the event.
_Standard term_: message, record — we say event because a message is the
transport framing that carried the fact, and a record is what a transform
*produces*; the event is the received fact itself.

**Canonical encoding**:
THE byte form of a value. Everything that names, fingerprints, or ships a
value goes through it, so there is exactly one identity.
_Standard term_: serialization format, wire format — we say canonical
encoding because there is exactly one such form per value; transport
encodings are many, and none of them is it.

**Constrained decode**:
The only way in from bytes: exactly one JSON value, valid UTF-8 and
Unicode scalars, member names unique after unescaping, finite
binary64, at most 256 nested containers. Acceptance is part of
identity — a decoder that repairs its input is naming a different
value than the one that arrived.
_Standard term_: parse, deserialize — we say constrained decode because a
parser may repair its input; this decode refuses.

**Chain head** (or **head**):
A 32-byte commitment to an exact history prefix — the identity fold.
Extending is O(1); recomputing from events is always possible, which is
what makes any head a checkable claim.
_Standard term_: hash, checksum — we say chain head because it commits to
an exact history prefix rather than to the bytes in hand, and it extends
in O(1) as that history grows.

**Fold state**:
What a history did — the meaning fold. Two histories can agree in state
while differing in head: the chain remembers what the fold forgives.

**Merge fact**:
The committed linearization of a merge: the ordered picks, not the merged
content. The content is derivable; the fact is what is stored and named.
_Standard term_: merge result, merged stream — we say merge fact because
what is stored and named is the ordered picks; the merged content is
derived from them, never the other way round.

**Compaction**:
Replacing a prefix by its (head, fold state) pair. What is lost — only ever
by explicit choice — is step-through inside the discarded prefix. The generic
stream primitive does not license session-journal compaction: that journal
refuses until `flb.certification.v0` can export structural refusals, let absence
refusals die with the trace, and preserve the state digest plus corpus digest as
evidence of the summarized prefix.

**Anchor**:
An entity's (key, head, state digest) triple: the seen-this-history-before
index entry, and the raw material of provenance.

### Walls

**Wall**:
A test asserting that two implementations of the same algebra take equal
inputs to equal digests — TS ≡ Go, batch ≡ stream, native ≡ wasm.
Equivalence is by digest, never by trusting a port.
_Standard term_: differential test, conformance test, golden-fixture test
— we say wall because a change that moves a digest cannot pass it. A
wall is not input validation: bytes are admitted by the **Certifier**,
and the parse-don't-validate step is **Constrained decode**.

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
_Standard term_: mapper, processor — we say transform because sameness
here is judged by digest (equal-head inputs to equal-head outputs), not
by what the function does inside.

**Fusion**:
Composition that costs one traversal and zero intermediate streams. The
efficiency claim of the transform algebra.

**Pipeline program**:
The serialized description of a composed transform — an ordered list of
primitive digests plus parameters. Programs are data: the same program runs
in-process, over the wire, or via CLI, and is what the catalog stores.
_Standard term_: pipeline config, job spec — we say pipeline program
because it is data the catalog stores and runs unchanged in-process, over
the wire, or via CLI; a config is read by one runner.

### The fold algebra

**Declared algebra**:
A monoid named by canonical data — a small grammar of primitives plus
product and mapped combinators. Behavior is a function; identity exists
only where the same behavior also has a declaration. Anonymous algebras
run fine and refuse identity: nothing without a canonical form is
cacheable or catalogable.
_Standard term_: Reducer — in effect v4 a `Reducer` is exactly this
shape, an `initialValue` plus a `combine` (`Reducer.ts`); classically it
is a monoid instance. We say declared algebra because ours additionally
carries a content address: the instance is itself canonical data, so it
has a digest and not only a behavior. If what you are looking for is the
tagged-union / sum-of-products idea, that is this repo's *grammar* — the
node kinds a language admits, in Effect terms a `Schema.Union` of tagged
structs — and not this entry.

**Declared step**:
The event-to-state map, likewise named by canonical data. A fold's
identity is the digest over (algebra declaration, step digest), so the
same declaration is the same fold anywhere — which is what makes a
result keyed by (fold digest, head) an immutable truth rather than a
cache entry needing invalidation.

**Homomorphism** (or **hom**):
A declared structure-preserving map between algebras. It licenses a
derived view with no replay, because folding then mapping and mapping
then folding are the same computation.

**Declared right**:
What passing a law earns. Associativity licenses parallel replay and
mid-stream compaction; the monoid action licenses O(1) extension;
uniqueness licenses the invalidation-free cache. Rights follow proofs —
a function claiming one ships the generated law suite that grants it
(ADR-0010). ADR-0010's *lawful surface* is that policy stated for the
public API: an admission rule about which functions may enter a library,
each shipping its generated law tests (fast-check property suites).
_Standard term_: law testing as an API admission policy — it is not a
smart constructor over values; the smart constructor here is the
**Certifier**.

### Entities and provenance

**Entity**:
One equivalence class of event traffic under a correlation key (the key induces the quotient; an entity is one of its classes): one key, one chained
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
_Standard term_: trace segment — we say span because a span id is the
segment's chain head and therefore recomputable; what a tracer calls a
trace id is, here, the root anchor.

**Certificate**:
The derivation claim riding on a produced record: schema digest, program
digest, input anchor, span head. Every field is recomputable by an auditor.
_Standard term_: metadata, lineage tag — we say certificate because
metadata is asserted, while every field of this claim is recomputable by
an auditor.

### Schemas and identity

The fence vocabulary (mint, registry, handle, binding, lane) was rolled
back 2026-08-12, and the schema-identity machinery was wiped the same
day (see NEXT.md; ADR-0008). Identity was then re-ratified greenfield —
the laws live in map ticket 004; the build (the owned structure's spec
and its fixture wall) is pending.

**Schema**:
The declared form of a boundary crossing: a Type side, an Encoded side,
and the transformation between them — never merely a type. Its identity
commits the SHAPES of both sides and nothing else; every other semantic
bit (behavior, brands, defaults, meaning) lives on the tier its author
chooses: a check (narrows the shape — moves identity) or an annotation (a
claim — free, uncommitted). The lab does not decide a domain's semantics;
it provides the tiers.
_Standard term_: type, model, DTO — we say schema because a type is only
one side of it: the declared form carries a Type side, an Encoded side,
and the transformation between them.

**Structural digest**:
A schema's identity: SHA-256 over the RFC 8785 bytes of the
NORMALIZED foldlab-owned structure — the flb.type.v0 walk the
certifier already owns (ticket 004 resolution, 2026-08-14: identity
runs on the owned walk; any vendor-AST fold is derivation machinery,
never identity). Both sides enter; declared checks and brands move
identity; annotations never do, except a Declaration's required
identifier; anonymous checks and identifier-less declarations refuse.
Deployment facts never move identity: a schema on two subjects is one
schema. Interim, until the owned scheme ships: a digest over
submitted canonical bytes, honestly attestation-grade.

**Identity order**:
RFC 8785's UTF-16 code-unit sort over member names — the order
identity's bytes already use, and therefore the order EVERY derivation
target walks. It is what makes "the first path that refuses" a
well-defined fact: construction history never leaks into evidence.
_Standard term_: alphabetical order, locale sort — we say identity order
because neither of those is this order: it is RFC 8785's UTF-16
code-unit sort, the one identity's own bytes already use.

**Certifier**:
The one proved entry point admitting bytes to the catalog:
`certify(bytes) → Certificate | Refusal`, discharging well-formedness,
identity, and whatever closure laws the grammar declares. Whoever
synthesized the bytes is permanently untrusted, the trusted base's size
is published, and no second admission path is ever added.
_Standard term_: validator — in Effect terms, the smart constructor at a
process boundary: the single entry point doing the job of
`Schema.decodeUnknownEffect` narrowed by `check`/`refine`, and the only
way to obtain the admitted type. We say certifier because a validator
advises; a certifier admits.

**Catalog**:
The journal of created types: per-daemon authority, mirrored elsewhere,
union-resolved. A record is {structural digest, canonical encoding bytes,
submitter}; the daemon recomputes every digest it commits — an asserted
identity it cannot derive is refused. Absence is a typed refusal, never a
lookup miss.
_Standard term_: registry — we say catalog because "registry" is
rolled-back mint-era vocabulary (NEXT.md), and because this is a journal
of created types rather than a mutable name-to-value table.

**Semantic fold**:
A derivation computed as a fold over a digest-anchored AST or program
value — the meaning-side twin of the structural digest. Every derived
surface (Go twin, JSON Schema, DDL, span preview, codec) is one; derived
surfaces cannot drift because their input has committed identity.
_Standard term_: code generator, compiler pass — we say semantic fold
because those are implementations of one: the derivation is a fold over
an AST whose identity is already committed.

**Commutativity class**:
Whether events of a type commute under the meaning fold — the type-level
fact that decides entity boundaries and licenses reordering. It never
licenses reordering the identity fold.

### Decisions and absence

**Effector**:
Where a decision single-homes: one authority value per unit of work,
keyed by that work's digest, advanced only by a version-checked
compare-and-swap over NATS JetStream KV, so that a monotone fencing
token — not the holder's identity — decides which commit may land. The
standard name for the shape is a fencing-token lease register; the
compare-and-swap is how it is implemented, not what it is. Evidence
federates freely because equal bytes give equal digests anywhere;
anything two parties could legitimately dispute goes through here
instead. The module-local vocabulary (Register, Fence, Steal, Lease,
Outcome) is owned by [go/CONTEXT.md](go/CONTEXT.md); the headword lives
here only because VERIFICATION.md states a claim about the effector by
name.

**Refusal**:
The value returned when something is not admitted — an absent digest, a
rejected encoding, a law that did not hold. It is tagged, and it carries
both what was wrong and a legal next step, so a sender can repair without
reading documentation. Daemon refusals persist their ontological `sort`:
structural evidence remains true under its pinned grammar, while absence is a
head-relative observation that later presence can repeal. A refusal is data:
never an exception, never a null.
_Standard term_: a typed error — the `E` of Effect's `Effect<A, E, R>`, a
tagged union (`Data.TaggedError`) rather than a thrown value. We say
refusal because the same shape is also the wire answer a daemon gives,
where "error channel" would name a language feature the caller does not
share.
