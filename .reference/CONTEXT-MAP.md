# Context Map

## Contexts

- [Source Provenance](provenance/CONTEXT.md): identifies and resolves the exact external artifacts allowed to inform a claim.
- [Effect Language Semantics](effect-typescript-semantics/CONTEXT.md): names semantic layers, observations, bridges, and claim strength for selected Effect behavior.
- [Schema JSON Codec](schema-json/CONTEXT.md): names the source topology and modeling terms available to a future domain decision.

## Relationships

- **Source Provenance → Effect Language Semantics**: every subject-source, compiler, standard, test-suite, and runtime assertion names a resolved artifact or stays explicitly pending.
- **Source Provenance → Schema JSON Codec**: the codec context accepts only Effect source and external requirements selected by the source lock.
- **Effect Language Semantics → Schema JSON Codec**: the umbrella context supplies the claim vocabulary and keeps model, extraction, implementation, compilation, and host claims distinct.
- **Schema JSON Codec → Effect Language Semantics**: a future domain decision may define a bounded model and conformance bridge; the reference context itself makes no such selection.

## Shared evidence

[The catalog](catalog/REFERENCES.md) is not a domain context. It classifies evidence for all contexts and never owns semantic definitions or pins. Canonical pins live only in Source Provenance.
