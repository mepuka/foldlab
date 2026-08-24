# Reference organization

The reference tree is designed as three deep modules plus one shared catalog. Each module has a small documented interface and owns the complexity behind one clean seam.

All modules are governed by the global [development invariants](../docs/DEVELOPMENT-INVARIANTS.md). In particular, the semantic interface is project-owned and definition-first; external implementations enter later through typed adapters.

## Modules

| Module | Interface | What it owns | What it must not own |
| --- | --- | --- | --- |
| Source Provenance | ../docs/provenance/README.md, ../docs/provenance/CONTEXT.md, and provenance/sources.lock.json | Canonical repository identity, full Git object identity, content digests, evidence resolution, and receipts | Semantic interpretation, theorem statements, or test verdicts |
| Effect Language Semantics | ../docs/effect-typescript-semantics/ README.md, CONTEXT.md, CLAIM-GATES.md, and IMPLEMENTATION-PLAN.md | Semantic layers, observations, refinement, bridge meanings, generic claim gates, and implementation sequence | Git resolution rules or Schema-specific constructor policy |
| Schema JSON Codec | ../docs/schema-json/ README.md, CONTEXT.md, and SOURCE-SURFACE.md | Source topology, canonical discussion terms, and inputs to a future domain decision | Accepted constructors, semantic behavior, theorem targets, or runtime claims |

The [catalog](catalog/REFERENCES.md) is supporting evidence rather than a module. It records why a source matters and what it cannot prove. It may point to a canonical pin, but it never duplicates ownership of that pin.

## Seams

**Evidence resolution seam**:
Source Provenance turns an Evidence Locator into either a Resolved Evidence entry and receipt or a typed resolution failure. Git remotes, object formats, redirects, and byte hashing remain behind this interface.

**Accepted source seam**:
After a domain decision, Schema JSON Codec may turn a raw pinned Schema AST into either an admitted Source Schema or a typed rejection. The reference organization records where this future seam belongs without deciding its accepted forms.

**Semantic seam**:
A future model should expose a small operation over library-owned carriers. Callers should not need to know the TypeScript class layout or Lean representation details to state or test the intended behavior.

**Conformance seam**:
A normalized observation compares a model result with a pinned implementation result. The interface returns evidence; it does not promote sampled agreement into a proof.

## Placement rules

- Put canonical vocabulary only in a context's CONTEXT.md.
- Put immutable source identities only in provenance/sources.lock.json.
- Put generic claim vocabulary in CLAIM-GATES.md; put future semantic commitments only in a separately reviewed domain decision.
- Put source topology in SOURCE-SURFACE.md; record any future accepted/deferred decision only after separate domain review.
- Put implementation order and gates in IMPLEMENTATION-PLAN.md.
- Put source authority and prior-art classification in catalog/REFERENCES.md.
- Put global definition, typing, purity, and proof rules in DEVELOPMENT-INVARIANTS.md.
- Do not copy a pin, term definition, or claim ladder into multiple owners; link to the owner.
- Do not create a new module for a document category. Add a context only when it owns distinct language and decisions.
- Do not introduce a seam until two adapters are justified. Expected first real adapter pairs are local Git versus remote artifact resolution, and Lean model observations versus pinned Effect runtime observations.
- Do not expose an external library type as the semantic interface when a project-owned algebraic carrier and checked translation are required by the development invariants.

## Future implementation shape

Future code should preserve the ownership and seams established by the reference modules:

- Provenance: resolve one lock entry and return one verified artifact or typed failure.
- Source Admission: after a domain decision, validate one raw source value and return one admitted form or typed rejection.
- Formal Core: expose project-owned types, judgments, and pure operations selected by the domain decision.
- Conformance: after a claim decision, compare normalized observations and return a receipt.

Tests should cross those interfaces. Internal parser, hashing, AST traversal, and normalization seams remain private unless a second real adapter makes them external.
