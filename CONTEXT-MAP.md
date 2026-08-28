# Context Map

## Contexts

- [Lab Core](docs/lab-core/CONTEXT.md): owns lab-wide vocabulary — artifacts, grades, evidence.
- [Source Provenance](docs/provenance/CONTEXT.md): identifies and resolves the exact external artifacts allowed to inform a claim.
- [Effect Language Semantics](docs/effect-typescript-semantics/CONTEXT.md): names semantic layers, observations, bridges, and claim strength for selected Effect behavior.
- [Schema JSON Codec](docs/schema-json/CONTEXT.md): owns the schema universe,
  described native carriers, JSON codec, and typed foreign-language
  representation vocabulary; full Effect Schema source admission remains
  deferred.
- [Entity Store](docs/entity-store/CONTEXT.md): owns the content-addressed store's vocabulary — admissibility, verdicts, canonical spelling, and the store's minted rules.
- [Effect Replay](docs/effect-replay/CONTEXT.md): owns the CAS replay library's vocabulary — operation descriptions, histories, sessions, decision traces, the mismatch taxonomy, witnesses, and the replay contract's minted rules — AND the store language's vocabulary: canonical schema, materializer, handler, the tower, representation strata, the TypeScript backend, program vectors, and the direction law (design basis: [EFFECTS-BACKEND](library/cas/EFFECTS-BACKEND.md), ratified 2026-08-28). Fully independent of the Entity Store context.

## Relationships

- **Lab Core → all contexts**: supplies the artifact, grade, and evidence vocabulary every context uses for standing and lifecycle.
- **Source Provenance → Effect Language Semantics**: every subject-source, compiler, standard, test-suite, and runtime assertion names a resolved artifact or stays explicitly pending.
- **Source Provenance → Schema JSON Codec**: the codec context accepts only Effect source and external requirements selected by the source lock.
- **Effect Language Semantics → Schema JSON Codec**: the umbrella context supplies the claim vocabulary and keeps model, extraction, implementation, compilation, and host claims distinct.
- **Schema JSON Codec → Effect Language Semantics**: a future domain decision may define a bounded model and conformance bridge; the reference context itself makes no such selection.
- **Lab Core → Entity Store**: supplies the grade and evidence vocabulary; the store's claim stamps come from the shared gate ladder.
- **Source Provenance → Entity Store**: the pinned Effect bytes behind MAPPING's dispositions name resolved artifacts or stay pending.
- **Effect Language Semantics → Entity Store**: supplies the claim vocabulary; the correspondence lane's model-vs-pinned-implementation business stays its own, gated separately.
- **Entity Store → Schema JSON Codec**: the store's carrier is the lab-owned projection the codec context described; dispositions live in the store context's MAPPING.
- **Lab Core → Effect Replay**: supplies the artifact, grade, and evidence vocabulary.
- **Source Provenance → Effect Replay**: the pinned Effect revision and any runtime-file evidence name resolved artifacts or stay explicitly pending.
- **Effect Language Semantics → Effect Replay**: supplies the claim ladder and layer vocabulary; model, extraction, implementation, compilation, and host claims stay distinct.

## Shared evidence

[The catalog](.reference/catalog/REFERENCES.md) is not a domain context. It classifies evidence for all contexts and never owns semantic definitions or pins. Canonical pins live only in Source Provenance.
