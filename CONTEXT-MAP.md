# Context Map

## Contexts

- [Lab Core](docs/lab-core/CONTEXT.md): owns lab-wide vocabulary — artifacts, grades, evidence.
- [Source Provenance](docs/provenance/CONTEXT.md): identifies and resolves the exact external artifacts allowed to inform a claim.
- [Effect Language Semantics](docs/effect-typescript-semantics/CONTEXT.md): names semantic layers, observations, bridges, and claim strength for selected Effect behavior.
- [Schema JSON Codec](docs/schema-json/CONTEXT.md): names the source topology and modeling terms available to a future domain decision.
- [Entity Store](docs/entity-store/CONTEXT.md): owns the content-addressed store's vocabulary — admissibility, verdicts, canonical spelling, and the store's minted rules.

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

## Shared evidence

[The catalog](.reference/catalog/REFERENCES.md) is not a domain context. It classifies evidence for all contexts and never owns semantic definitions or pins. Canonical pins live only in Source Provenance.
