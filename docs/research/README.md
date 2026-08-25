# Foldlab research corpus

Status: repository index  
Corpus snapshot: 2026-08-25

This directory contains Foldlab's research notes and scoping reports. These
documents inform project decisions; they are not themselves formal
specifications, proof artifacts, or implementation-conformance claims. Each
report states its own evidence boundary and research snapshot.

## Recommended reading path

1. [`effect-operational-semantics-reference-sweep.md`](effect-operational-semantics-reference-sweep.md)
   establishes the initial semantic vocabulary, claim ladder, and first proof
   boundary.
2. [`effect-runtime-ground-truth-extraction-scope.md`](effect-runtime-ground-truth-extraction-scope.md)
   scopes a pinned-source runtime-core model, accepted subset, extraction
   pipeline, proof conditions, and conformance harness.
3. [`effect-modeling-wasm-interoperability-optimization-frontier.md`](effect-modeling-wasm-interoperability-optimization-frontier.md)
   surveys effect calculi, portable data and component boundaries, concurrency,
   equivalence, and optimization.
4. [`lean4-llm-language-modeling-tooling-reference.md`](lean4-llm-language-modeling-tooling-reference.md)
   records Lean project policy, LLM-assisted theorem-solving practice, and
   language-modeling tooling options.
5. [`language-verification-ecosystems.md`](language-verification-ecosystems.md)
   compares representative high-assurance language and verification ecosystems
   across several distinct assurance categories.
6. [`formal-artifact-grades-open-standards.md`](formal-artifact-grades-open-standards.md)
   surveys proof-certificate, assurance-case, attestation, and provenance
   standards and proposes a Foldlab assurance profile.
7. [`github-starred-tooling-reference.md`](github-starred-tooling-reference.md)
   evaluates the repository owner's starred projects against Foldlab's research
   direction and records adopt, borrow, watch, and exclude dispositions.

## Corpus map

| Area | Primary report | Intended use |
| --- | --- | --- |
| Effect and Schema semantics | `effect-operational-semantics-reference-sweep.md` | Vocabulary, first model boundary, and source-to-claim discipline |
| Effect runtime core | `effect-runtime-ground-truth-extraction-scope.md` | Implementation specifications, formal architecture, milestones, and claim gates |
| Effects, Wasm, and optimization | `effect-modeling-wasm-interoperability-optimization-frontier.md` | Long-range architecture and research-frontier map |
| Lean and LLM tooling | `lean4-llm-language-modeling-tooling-reference.md` | Toolchain and proof-assistance decisions |
| Verification ecosystems | `language-verification-ecosystems.md` | Comparative prior art and language-specific verification lanes |
| Assurance artifacts | `formal-artifact-grades-open-standards.md` | Machine-readable claims, evidence, provenance, and grades |
| Candidate tooling | `github-starred-tooling-reference.md` | Adoption and experimentation backlog |

## Repository policy

- Research reports belong in this directory and use descriptive, stable file
  names.
- Time-sensitive inventories record a snapshot date. Source-dependent claims
  should additionally record exact repository revisions, specifications, and
  tool versions.
- Project requirements derived from research move into a charter, project
  specification, ADR, source ledger, or claim registry. A research note is not
  silently upgraded into normative policy.
- Formal results use the gate vocabulary in
  [`../effect-typescript-semantics/CLAIM-GATES.md`](../effect-typescript-semantics/CLAIM-GATES.md).
  Runtime or
  translation claims must identify their accepted domain and observation.
- External papers and specifications are linked to authoritative sources rather
  than treated as Foldlab-authored artifacts. Temporary downloads are not part
  of this corpus unless their redistribution and provenance policy is recorded.
