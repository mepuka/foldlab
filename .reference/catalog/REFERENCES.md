# Reference ledger

Status: curated initial reference sweep  
Snapshot: 2026-08-24

This ledger separates normative authority, subject-source evidence, mechanization technique, prior art, conformance corpora, and contextual reading. Only the first two categories may directly own an external behavior requirement.

## Pinned subject source

| Source | Pin and role | Supports | Does not support |
| --- | --- | --- | --- |
| [Effect repository commit](https://github.com/Effect-TS/effect/commit/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07) | Commit 0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07; package effect 4.0.0-rc.111 | Exact public source selected for the local reference snapshot | Behavior of another release, a runtime host, or a semantic-preservation theorem |
| [Schema.ts](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/Schema.ts) | Pinned public Schema surface | Constructors, codecs, domain-model entry points | Validity or algebraic laws by itself |
| [SchemaAST.ts](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/SchemaAST.ts) | Pinned runtime AST carrier | The discriminated AST variants and shared annotations, checks, encoding, and context | A proof that all nodes are well formed or semantically coherent |
| [SchemaParser.ts](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/SchemaParser.ts) | Pinned parsing and encoding runner surface | Operations to classify and observe | A formal operational semantics |
| [JsonSchema.ts](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/JsonSchema.ts) | Pinned JSON Schema conversion surface | Feature inventory and differential target | Whole-draft conformance |
| [SchemaRepresentation.ts](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/SchemaRepresentation.ts) | Pinned document/revival representation surface | Later elaboration and output boundary | Invertibility or preservation without proof |
| [Effect tsgo](https://github.com/Effect-TS/tsgo) | Must receive an exact revision before use | Effect diagnostics and the pinned TypeScript-Go relationship | Runtime semantics, TypeScript soundness, or emitted-code preservation |

Full object and content identities are owned by the provenance [source lock](../provenance/sources.lock.json).

## Normative language and data authorities

| Authority | Pinning unit | Role and key boundary |
| --- | --- | --- |
| [NIST FIPS 202](https://doi.org/10.6028/NIST.FIPS.202) | DOI plus local SHA-256 `1592607831ff0908cc590632ce371c6c95e94025bb1a0c8ae90a4d0ec1ed025e` | Normative SHA-3 algorithm and parameter definitions for `formal/sha3`; does not establish transcription or implementation correctness |
| [NIST SHA-3 byte-oriented test vectors](https://csrc.nist.gov/Projects/Cryptographic-Algorithm-Validation-Program/Secure-Hashing) | Direct archive and selected-response digests in [`sha3.lock.json`](../provenance/sha3.lock.json) | T8/T9 literals and four selected executable guards; sampled evidence, not CAVP validation or exhaustive conformance |
| [XKCP Keccak-f[1600] test vector](https://github.com/XKCP/XKCP/blob/eb5244d6b95fb1c434b211bac293093e18aa8fd1/tests/TestVectors/KeccakF-1600-IntermediateValues.txt) | Commit `eb5244d6b95fb1c434b211bac293093e18aa8fd1`, file blob and content digest in [`sha3.lock.json`](../provenance/sha3.lock.json) | T7's zero-state 25-lane witness only |
| [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259.html) | RFC number | JSON text grammar, parser/generator requirements, and interoperability hazards including duplicate names, number range, Unicode, and security |
| [ECMA-404](https://www.ecma-international.org/publications-and-standards/standards/ecma-404/) | 2nd edition | JSON syntax; related to but not a replacement for RFC 8259 interoperability guidance |
| [JSON Schema Core 2020-12](https://json-schema.org/draft/2020-12/json-schema-core) | Draft and published document | Instance data model, equality, dialects, vocabularies, references, annotations, applicators, and outputs |
| [JSON Schema Validation 2020-12](https://json-schema.org/draft/2020-12/json-schema-validation) | Draft and published document | Validation vocabulary; format is annotation by default unless the assertion vocabulary is selected |
| [ECMA-262 edition 2026](https://tc39.es/ecma262/2026/) | Stable edition candidate | JavaScript values and algorithms, including JSON.parse and JSON.stringify, if a future domain decision admits that layer |
| [ECMA-262 hosts](https://tc39.es/ecma262/2026/multipage/overview.html#sec-hosts-and-implementations) | Same edition candidate | Explicit host-defined boundary; ECMA-262 is not a complete Node, Bun, Deno, or browser event-loop specification |
| [TypeScript erased types](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html#erased-types) | Page revision plus compiler pin later | Types are erased before runtime execution |
| [TypeScript design goals](https://github.com/microsoft/TypeScript/wiki/TypeScript-Design-Goals) | Wiki revision plus compiler pin later | Structural erasability and the explicit non-goal of a sound/provably correct type system |

## Lean foundations

| Source | Authority class | Use |
| --- | --- | --- |
| [Lean 4 paper](https://lean-lang.org/papers/lean4.pdf) | Language paper | Overall design, extensibility, dependent type theory, compilation, and metaprogramming context |
| [Theorem Proving in Lean 4](https://lean-lang.org/theorem_proving_in_lean4/) | Official book | Dependent type theory, inductive types, recursion, structures, typeclasses, propositions, and proof technique |
| [Lean definitions reference](https://lean-lang.org/doc/reference/latest/Definitions/) | Official reference; pin toolchain/source for frozen claims | Definitions, inductive families, structures, classes, and declaration behavior |
| [Elaboration and compilation](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/) | Official reference | Syntax-to-core elaboration and executable compilation boundaries |
| [Validating Lean proofs](https://lean-lang.org/doc/reference/latest/ValidatingProofs/) | Official reference | Kernel acceptance, axiom reporting, and independent checking |
| [Metaprogramming overview](https://leanprover-community.github.io/lean4-metaprogramming-book/main/02_overview.html#elaboration-and-delaboration) | Community implementation guide | Syntax, Expr, elaboration, delaboration, and formatter technique; not normative over the official reference |
| [How to Prove It with Lean](https://djvelleman.github.io/HTPIwL/) | Tutorial | Proof-writing and onboarding only |
| [HashCloak Lean tutorial](https://hashcloak.com/blog/tutorial-introduction-to-formal-verification-with-lean-%28part-1%29) | Tutorial | Applied introductory examples only |

## Operational semantics and preservation patterns

| Source | Reuse class | Relevant pattern | Boundary |
| --- | --- | --- | --- |
| [Programming Language Foundations](https://softwarefoundations.cis.upenn.edu/plf-current/toc.html) | Pattern | Inductive judgments, small-step/multi-step semantics, normal forms, type safety, subtyping, equivalence, normalization, and partial evaluation | Rocq teaching development, not Effect semantics |
| [CompCert correctness overview](https://compcert.org/man/manual001.html) | Pattern | Pass-by-pass simulation, composed semantic preservation, and precise compiler trust boundaries | C compiler theorem, not TypeScript or Effect |
| [Aeneas use case](https://lean-lang.org/use-cases/aeneas/) and [repository](https://github.com/AeneasVerif/aeneas) | Pattern/adapt | Functional translation, explicit supported Rust subset, extrinsic proofs, generated versus handwritten models | Safe-Rust subset; no transferred guarantee for TypeScript |
| [Cedar specification](https://github.com/cedar-policy/cedar-spec) | Pattern/adapt | Definitional Lean engine, typechecker, symbolic compiler, theorems, and differential randomized testing against Rust | Cedar-specific semantics and trust boundary |
| [Lean4Lean](https://github.com/digama0/lean4lean) | Pattern | Executable checker connected to an abstract theory | Not independent evidence merely because it is a second implementation |
| [Strata](https://github.com/strata-org/Strata) | Pattern | Extensible language dialects, symbolic evaluation, and verification-condition generation | Active project; APIs and trust boundaries require a pin |

## JavaScript and TypeScript prior art

| Source | Relevance | Limitation |
| --- | --- | --- |
| [JSCert](https://jscert.org/) | Inductive ECMAScript semantics plus executable reference interpreter | ECMAScript 5, not current Effect targets |
| [K JavaScript semantics](https://github.com/kframework/javascript-semantics) | Executable semantics and conformance feature accounting | Historical and incomplete built-ins |
| [ESMeta](https://github.com/es-meta/esmeta) | Extracted ECMA-262 model, execution, analysis, and Test262 runs | Executable spec tooling, not a Lean proof of engine/compiler correctness |
| [Thales](https://github.com/jessealama/thales) | Narrow TypeScript-to-Lean sidecar generation | Experimental strict subset; no full Effect/async/mutation semantics |

No located project establishes end-to-end Lean 4 semantic preservation for current full TypeScript, current ECMAScript, Effect, and a named host. No whole-system conclusion may be inferred from these partial and heterogeneous references.

## JSON and JSON Schema prior art

| Source | Reuse class | Use and caution |
| --- | --- | --- |
| [Lean Json sources](https://github.com/leanprover/lean4/tree/master/src/Lean/Data/Json) | Adapt after toolchain pin | Possible carrier/parser/printer infrastructure; existence is not an RFC 8259 theorem |
| [Predictable Machines open-source ecosystem](https://predictablemachines.com/open-source/) | Pattern | Lean package structure and varied language/tooling examples |
| [lean4-json-schema](https://github.com/predictable-machines/lean4-json-schema) | Adapt/pattern after revision and license review | Direct Lean schema/validation prior art; inspect its declared incomplete coverage and proof scope |
| [Modern JSON Schema formalization](https://arxiv.org/abs/2307.10034) | Research pattern | Formal semantics and complexity for modern validation; informative, not normative |
| [Type Safety with JSON Subschema](https://arxiv.org/abs/1911.12651) | Research pattern | Subschema checking and static typing relation; do not conflate with Effect or TypeScript subtyping |

## Conformance corpora

| Corpus | Required pin | Permitted evidence |
| --- | --- | --- |
| [JSON Schema Test Suite](https://github.com/json-schema-org/JSON-Schema-Test-Suite) | Exact commit and selected-case manifest | Reproducible observed agreement for the supported vocabulary |
| [Test262](https://github.com/tc39/test262) | Exact commit and selected-case manifest | Reproducible observed agreement for admitted ECMAScript behavior |

Passing either corpus is not a completeness proof, and an excluded case must remain visible.

## Observed candidate baselines

These revisions were observed during the 2026-08-24 sweep. They are discovery aids, not project pins; only the provenance source lock can promote a candidate into a canonical project identity.

| Source | Observed candidate | Why retain it |
| --- | --- | --- |
| [Effect tsgo](https://github.com/Effect-TS/tsgo/tree/eba879be6067a82df8483660a351d239af1b3e01) | eba879be6067a82df8483660a351d239af1b3e01; embedded TypeScript-Go 1bcfa18d79a3be41772223d5c05dfe4480e614ff | Reproducible starting point for future diagnostic/compiler-tooling research |
| [Lean 4](https://github.com/leanprover/lean4/releases/tag/v4.33.1) | v4.33.1; tag commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6 | Candidate kernel, elaborator, compiler, and core-library environment |
| [JSON Schema Test Suite](https://github.com/json-schema-org/JSON-Schema-Test-Suite/tree/b01af8c8d50244a2eb4dd3e01073e24823aa8691) | b01af8c8d50244a2eb4dd3e01073e24823aa8691 | Candidate conformance-corpus snapshot |
| [Test262](https://github.com/tc39/test262/tree/3655e7464de3d52643ecddd4b5f9f4f3e7f62398) | 3655e7464de3d52643ecddd4b5f9f4f3e7f62398 | Candidate ECMAScript corpus snapshot |
| [Aeneas](https://github.com/AeneasVerif/aeneas/tree/74a460a2f80ecea481bbdf1a08f881633c3bb097) | 74a460a2f80ecea481bbdf1a08f881633c3bb097 | Candidate functional-translation prior-art snapshot |
| [Cedar Lean](https://github.com/cedar-policy/cedar-spec/blob/e6c3e1f1f5c997ba1d09a80902db314643a26f5f/cedar-lean/README.md) | e6c3e1f1f5c997ba1d09a80902db314643a26f5f | Candidate definitional-semantics and differential-testing prior-art snapshot |
| [CompCert](https://compcert.org/man/manual001.html) | release 3.17, February 2026 | Candidate semantic-preservation and trust-boundary reference |

## Architecture and context only

| Source | Useful lesson | Prohibited inference |
| --- | --- | --- |
| [Lean Agent Protocol](https://github.com/arkanemystic/lean-agent-protocol) | Project separation, worker boundary, typed projection, audit artifacts, explicit implemented/partial/not-implemented accounting | Do not copy its trading or investment domain, policies, or compliance claims |
| [Unison in production](https://www.unison-lang.org/blog/experience-report-unison-in-production/) | Hash-addressed definitions, typed distributed values, serialization, versioning, runtime behavior, ecosystem, and human ergonomics all matter | No theorem about Effect, JavaScript, or this model |
| [Effect worktree article](https://www.effect.website/blog/the-one-weird-git-trick-that-makes-coding-agents-more-effect-ive) | Clean worktree-based development isolation | No semantic or verification guarantee |

## Reference priority

1. pinned Effect public source;
2. RFC 8259, ECMA-404, JSON Schema 2020-12, and a stable ECMA-262 edition;
3. the pinned Lean toolchain, official reference, and proof-validation guidance;
4. PLF and CompCert for proof shape;
5. pinned official conformance corpora;
6. Aeneas, Cedar, Lean4Lean, ESMeta, JSCert, K, Strata, Thales, and lean4-json-schema as bounded prior art; and
7. tutorials and experience reports for education and design context only.

## Unison theory basis (E1 lineage)

Local copies live in [papers/](../papers/), pinned by digest in the [paper
lock](../provenance/papers.lock.json). These two sources carry per-source role
scoping here; the rest of the local corpus is role-scoped by cluster in
[PAPERS.md](PAPERS.md).

| Source | Pin and role | Supports | Does not support |
| --- | --- | --- | --- |
| [Dunfield & Krishnaswami 2013, Complete and Easy Bidirectional Typechecking for Higher-Rank Polymorphism](https://arxiv.org/abs/1306.6032) | arXiv 1306.6032; local copy pinned in the [paper lock](../provenance/papers.lock.json) | The declarative and algorithmic bidirectional systems with soundness and completeness; the documented basis of Unison's typechecker; the specification shape for any typechecker-equivalence claim | Unison's implementation details, abilities, or content addressing |
| [Lindley, McBride & McLaughlin 2016, Do Be Do Be Do (Frank)](https://arxiv.org/abs/1611.09259) | arXiv 1611.09259; local copy pinned in the [paper lock](../provenance/papers.lock.json) | The effect-handler calculus behind Unison's abilities: operators, adjustments, and handling as first-class | Unison's exact ability implementation or hashing discipline |
