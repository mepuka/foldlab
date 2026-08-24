# Reference manifest

This is the human-readable companion to [manifest.json](manifest.json). The JSON file is the canonical inventory; this document explains how to maintain it and provides a review-friendly index.

## Inventory

| ID | Path | Kind | Owner | Status |
| --- | --- | --- | --- | --- |
| root-index | [README.md](README.md) | index | reference corpus | active |
| machine-manifest | [manifest.json](manifest.json) | machine-readable inventory and maintenance rules | reference corpus | active |
| organization | [ORGANIZATION.md](ORGANIZATION.md) | organization contract | reference corpus | active |
| development-invariants | [DEVELOPMENT-INVARIANTS.md](../docs/DEVELOPMENT-INVARIANTS.md) | global development contract | reference corpus | active |
| context-map | [CONTEXT-MAP.md](../CONTEXT-MAP.md) | context map | reference corpus | active |
| provenance-interface | [provenance/README.md](../docs/provenance/README.md) | module interface and resolution contract | Source Provenance | draft |
| provenance-language | [provenance/CONTEXT.md](../docs/provenance/CONTEXT.md) | canonical glossary | Source Provenance | active |
| source-lock | [provenance/sources.lock.json](provenance/sources.lock.json) | machine-readable source lock | Source Provenance | Effect snapshot pinned; other sources pending |
| effect-index | [effect-typescript-semantics/README.md](../docs/effect-typescript-semantics/README.md) | module index | Effect Language Semantics | active |
| effect-language | [effect-typescript-semantics/CONTEXT.md](../docs/effect-typescript-semantics/CONTEXT.md) | canonical glossary | Effect Language Semantics | active |
| claim-gates | [effect-typescript-semantics/CLAIM-GATES.md](../docs/effect-typescript-semantics/CLAIM-GATES.md) | claim vocabulary | Effect Language Semantics | draft; no scope selected |
| implementation-plan | [effect-typescript-semantics/IMPLEMENTATION-PLAN.md](../docs/effect-typescript-semantics/IMPLEMENTATION-PLAN.md) | sequencing plan | Effect Language Semantics | sketch |
| schema-index | [schema-json/README.md](../docs/schema-json/README.md) | module index | Schema JSON Codec | active |
| schema-language | [schema-json/CONTEXT.md](../docs/schema-json/CONTEXT.md) | canonical glossary | Schema JSON Codec | draft |
| schema-source-surface | [schema-json/SOURCE-SURFACE.md](../docs/schema-json/SOURCE-SURFACE.md) | source inventory notes | Schema JSON Codec | research notes; not accepted scope |
| catalog-index | [catalog/README.md](catalog/README.md) | shared evidence index | shared | active |
| reference-ledger | [catalog/REFERENCES.md](catalog/REFERENCES.md) | evidence catalog | shared | initial sweep |
| effect-surface | [catalog/EFFECT-SURFACE.md](catalog/EFFECT-SURFACE.md) | keyword catalog | shared | initial sweep |

## Maintenance contract

When adding or moving a document:

1. choose its owning module before choosing its filename;
2. update manifest.json and this inventory in the same change;
3. update the owning README when the document is part of that module's interface;
4. update every inbound relative link; and
5. validate that all manifest paths and local Markdown links resolve.

When changing a source pin:

1. edit only provenance/sources.lock.json as the canonical identity;
2. verify the full commit, root tree, exact path, Git blob, SHA-256 content digest, and byte length;
3. record unresolved sources rather than filling them with moving branch URLs; and
4. update catalog descriptions only when their supported claim or explicit non-claim changes.

When changing vocabulary:

1. edit the single owning CONTEXT.md;
2. use the canonical term in plans, catalogs, and future code;
3. list rejected synonyms under Avoid when ambiguity is likely; and
4. do not turn CONTEXT.md into an implementation specification.

## Review checklist

- manifest.json parses;
- every manifest path exists;
- every local Markdown link resolves;
- one context owns each canonical term;
- project-owned formal interfaces follow the definition-first typed functional invariant;
- one lock owns each canonical pin;
- catalogs contain evidence classification rather than copied contracts;
- source notes are not presented as accepted scope;
- implementation status is not overstated; and
- no agent-bootstrap file is introduced or modified by reference maintenance.
