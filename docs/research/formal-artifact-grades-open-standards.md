# Open standards for formal-verification artifacts and assurance grades

**Status:** research note and design recommendation, not an adopted Foldlab specification  
**Snapshot date:** 2026-08-24  
**Scope:** open formats and standards for exchanging proof evidence, describing assurance arguments, and authenticating verification claims

**Method.** This note uses standards-body publications, official specification repositories, official project documentation, and original papers. It treats a research format, an industry specification, and a formally adopted standard as different maturity classes even when all three are openly readable.

## Executive answer

This survey found no universal, cross-prover standard that defines grades such as “modeled,” “kernel proved,” “source conformant,” and “semantics preserving” for software artifacts. The standards landscape is compositional instead:

- proof domains have genuine but specialized certificate and witness formats, including SV-COMP witnesses, the Certification Problem Format (CPF), TPTP/TSTP, LRAT, VeriPB, Alethe, and LFSC;
- [OMG SACM 2.3](https://www.omg.org/spec/SACM/2.3/About-SACM) and [GSN Community Standard Version 3](https://scsc.uk/gsn-standard) represent assurance claims, arguments, and evidence, but neither defines proof validity or a formal-verification grade scale;
- [ECMA-424, CycloneDX 1.7](https://ecma-international.org/publications-and-standards/standards/ecma-424/) is the most deployment-ready generic carrier found for a Foldlab assurance profile: its Definitions and Declarations can express standards, requirements, named levels, targets, assessors, attestations, claims and counterclaims, evidence and counter-evidence, conformance, confidence, and reasoning;
- [in-toto Attestation](https://github.com/in-toto/attestation/tree/main/spec), [DSSE](https://github.com/secure-systems-lab/dsse), [Sigstore bundles](https://github.com/sigstore/protobuf-specs), and [SCITT RFC 9943](https://www.rfc-editor.org/rfc/rfc9943.html) can bind those assertions to content-addressed artifacts, identities, signatures, and transparency receipts, but do not make the assertions true;
- Common Criteria EALs and DO-333 are assurance or certification regimes. They are useful comparisons, not open proof-artifact formats.

The recommended direction is therefore **profile, preserve, bind, and check**:

1. Define G0–G5 as a versioned open assurance profile, with requirements and evidence rules, rather than inventing a new proof language.
2. Represent the profile and its claim/evidence graph in CycloneDX 1.7 Declarations, using SACM concepts to keep the assurance model disciplined.
3. Preserve every native proof, witness, trace, fixture corpus, and checker result by media type and cryptographic digest. A generic envelope must not flatten proof-native semantics.
4. Bind the CycloneDX document to subjects with the registered in-toto CycloneDX predicate type; authenticate it with DSSE/Sigstore; add an SCITT receipt when a transparency service is useful.
5. Use in-toto SCAI for small, early attribute assertions and SLSA VSA only as a policy-verifier summary. Define a custom proof predicate only if stable requirements emerge that CycloneDX and SCAI cannot represent without loss.

Most importantly, a Foldlab gate is a property of a **claim under an exact scope**, not a transferable quality badge for a repository. Logical proof, model/source correspondence, translation preservation, hosted behavior, provenance, and reproducibility are distinct assurance dimensions.

## What an assurance grade must keep separate

A machine-readable Foldlab artifact record needs to distinguish at least the following:

| Dimension | Question | Typical evidence |
| --- | --- | --- |
| Claim | What exact proposition is asserted? | Stable claim ID and statement digest |
| Scope | Which source slice, symbols, observation, versions, and assumptions does it cover? | Source lock, symbol list, observation definition, exclusions |
| Logical validity | Did a named checker accept a proof in a named logic? | Proof object/source, checker result, axiom and trust report |
| Model correspondence | Does the formal object represent the named source surface? | Traceability links, fixtures, independently checked translation |
| Semantic preservation | Does a translation preserve the stated observation? | Translation definition and preservation theorem |
| Execution correspondence | Does a named runtime or compiled artifact exhibit the covered behavior? | Differential/integration evidence and environment identity |
| Provenance | Who or what produced each item, from which inputs and process? | Content digests, activity/tool identities, signed attestations |
| Reproducibility | Can the evidence be regenerated and independently checked? | Invocation, dependency lock, checker version, policy digest |

Collapsing these into one scalar produces misleading inferences. A kernel proof about a Lean model does not imply conformance of TypeScript source, emitted JavaScript, or a runtime. A reproducible build does not imply a theorem. A high Common Criteria EAL does not identify a portable proof object. Foldlab's current G0–G5 order is useful because it names a path across these boundaries, but each gate remains valid only for its recorded claim scope.

## Standards landscape by role

| Class | Standards and formats | What they standardize | What they do **not** standardize |
| --- | --- | --- | --- |
| Proof/certificate/witness interchange | SV-COMP witness formats; CPF; TPTP/TSTP/SZS; LRAT; VeriPB; Alethe; LFSC; OpenTheory; Dedukti encodings | Domain problems, derivations, witnesses, proof rules or checker inputs | A universal software-assurance grade, source/model correspondence, or runtime conformance |
| Assurance case and evidence model | SACM 2.3; GSN v3 | Claims, arguments, evidence references, reasoning, packaging, notation | A proof calculus, checker, or shared G0–G5 vocabulary |
| Generic evidence and attestation carriers | CycloneDX 1.7; in-toto Statement/SCAI; DSSE; Sigstore; SCITT; W3C PROV | Evidence graphs, artifact digests, signed statements, identities, provenance, transparency receipts | The truth or mathematical meaning of a formal-verification claim |
| Adjacent software-report formats | SLSA provenance/VSA; SPDX; SARIF; VEX | Build integrity, package metadata, analysis findings, vulnerability status | Deductive validity or a proof-assurance taxonomy |
| Open verification-program profiles | Verify Rust Std challenge and tool templates | Pinned targets, scoped goals, assumptions, success criteria, accepted tools, review, automated CI, and audit expectations | A standards-body schema, portable proof calculus, or universal assurance grade |
| Regulated assurance levels | Common Criteria EAL1–EAL7; DO-333 with DO-178C/DO-278A | Evaluation rigor, lifecycle objectives, acceptable formal-method activities | Open proof interchange or a cross-prover artifact manifest |
| Research architectures and proposals | Proof-carrying code; foundational proof-carrying code; foundational proof certificates | How a small trusted checker or kernel may validate imported evidence | A widely adopted, current, cross-ecosystem grade registry |

## 1. Actual proof, certificate, and witness interchange

### SV-COMP verification witnesses

The [SV-COMP 2026 rules](https://sv-comp.sosy-lab.org/2026/rules.php) define machine-readable verification witnesses and validation procedures. The ecosystem supports GraphML witness format 1.0 and YAML witness formats 2.0/2.1. A violation witness supplies evidence for a false verification task; a correctness witness supplies evidence for a true task. Independent witness validation is a core part of the competition protocol.

This is a real open interchange mechanism, but its semantics are tied to specified program-analysis tasks, properties, languages, and validator capabilities. Coverage is not uniform across categories, and a validated witness does not by itself establish Foldlab's model/source or source/runtime correspondence boundaries.

### Certification Problem Format and CeTA

The [Certification Problem Format](https://arxiv.org/abs/1410.8220) is an XML format for certificates concerning term-rewriting properties such as termination, complexity, confluence, and completion. The original [CPF/CeTA paper](https://cgi.cse.unsw.edu.au/~eptcs/paper.cgi?UITP2014.8.pdf=) describes a shared format checked by CeTA, whose checker is generated from the Isabelle Formalization of Rewriting.

CPF demonstrates an important pattern for Foldlab: standardize a certificate vocabulary for a bounded domain, publish its schema, and validate it with an independently scrutinized checker. It is not a general carrier for program semantics or arbitrary Lean propositions.

### SMT-LIB, Alethe, and LFSC

[SMT-LIB 2.7](https://smt-lib.org/papers/smt-lib-reference-v2.7-r2025-04-09.pdf) standardizes SMT theories, terms, commands, responses, and result statuses. Although the language contains `get-proof`, the returned proof term remains solver-specific. SMT-LIB therefore standardizes the problem and request surface much more strongly than the proof object.

[Alethe](https://verit.gitlabpages.uliege.be/alethe/specification.pdf) is a collaborative SMT proof format using an SMT-LIB-like syntax. It is designed to permit both coarse and elaborated steps and is supported across tools including veriT, cvc5, Carcara, Isabelle, and Rocq integrations. [Carcara](https://github.com/ufmg-smite/carcara) provides an independent checker and elaborator. Theory and rule coverage still matter, so “Alethe proof” must be accompanied by format version, supported fragment, producer, checker, and checker result.

[LFSC](https://github.com/cvc5/LFSC) is a logical framework used for proof certificates, with signature files that define rules and may use side-condition programs. It can reduce trust compared with trusting the original solver, but the certificate's meaning depends on the selected LFSC signatures and checker. It is a framework for families of certificates rather than a universal proof vocabulary.

### TPTP, TSTP, and the SZS ontology

The [TPTP/TSTP quick guide](https://tptp.org/UserDocs/QuickGuide/) specifies common representations for automated-theorem-proving problems and derivations. The [SZS ontology](https://tptp.org/UserDocs/SZSOntology/) standardizes result statuses and output data forms, including distinctions such as theorem, unsatisfiable, proof, incomplete proof, and verified-good or verified-bad output.

SZS is the closest mature example found of an open ontology for theorem-prover result kinds. Its vocabulary is valuable prior art, but it does not describe source-to-model correspondence, compiler/runtime boundaries, or a portable trusted-computing-base declaration for arbitrary proof assistants.

### SAT, pseudo-Boolean, and rewriting certificates

The SAT ecosystem has unusually strong proof-artifact practice. [SAT Competition 2026](https://satcompetition.github.io/2026/output.html) requires proof output and validation for unsatisfiable results in relevant tracks. [LRAT](https://arxiv.org/abs/1612.02353) was designed for efficient, formally verified checking of clausal proofs. [VeriPB](https://gitlab.com/MIAOresearch/software/VeriPB) checks pseudo-Boolean proof logs for satisfiability, optimization bounds, enumeration, and output guarantees.

These formats provide excellent examples of producer/checker separation, streaming proof logs, and small-checker validation. Their calculi are deliberately domain-specific.

### OpenTheory and Dedukti

[OpenTheory's article format](https://www.gilith.com/opentheory/article.html) exchanges theory packages and proof commands across members of the HOL family. It is portable within a deliberately restricted logical family, not across arbitrary dependent type theories or operational-semantics artifacts.

[Dedukti](https://deducteam.gitlabpages.inria.fr/) uses the λΠ-calculus modulo rewriting as a logical framework and supports translations from multiple proof systems. It is important interoperability infrastructure, but a translation into Dedukti is itself a semantic object whose adequacy, rewrite properties, and trusted checker must be recorded. It does not supply universal assurance grades.

### Prover-native artifacts

Proof-assistant source files, compiled proof environments, theorem databases, and kernel objects are often the strongest available evidence for their own ecosystem but are not portable formats. For Lean specifically, the official [Validating Lean Proofs](https://lean-lang.org/doc/reference/latest/ValidatingProofs/) guidance distinguishes ordinary builds, axiom inspection, fresh checking with `lean4checker`, and comparison with an external checker. That is a useful internal assurance ladder. A `.lean` source file, `.olean`, theorem name, or successful `lake build` should not be advertised as a cross-prover certificate without also recording the Lean version, dependencies, options, axioms, unsafe boundary, checker, and exact result.

Foldlab should preserve these native artifacts rather than translating them prematurely. Translation can improve interoperability, but it adds another correspondence claim that must itself be gated.

## 2. Assurance cases and evidence metamodels

### OMG SACM 2.3

[Structured Assurance Case Metamodel 2.3](https://www.omg.org/spec/SACM/2.3/About-SACM), published October 2023, is the strongest applicable open metamodel for Foldlab's claim discipline. It defines machine-readable model elements for claims, argument reasoning, asserted relationships, artifact assets and references, terminology, and assurance-case packaging. In particular, `AssertedEvidence` relates cited artifacts to claims while `ArgumentReasoning` records why a relationship is warranted.

SACM is deliberately neutral about the substantive domain. It can say that a kernel-check report is evidence for a claim and that a preservation theorem supports a correspondence claim. It cannot determine that the proof is valid, prescribe Lean's trust boundary, or assign Foldlab's gate.

SACM should influence Foldlab's semantics even if the wire representation is CycloneDX:

| SACM concept | Foldlab/CycloneDX use |
| --- | --- |
| Claim | Claim-registry item with exact statement and status |
| ArtifactAsset / ArtifactReference | Content-addressed proof, source, trace, report, fixture, or policy |
| AssertedEvidence | Typed relationship from evidence to the requirement or claim it supports |
| ArgumentReasoning | Explanation of why evidence licenses this claim and which inference rule is used |
| AssuranceCasePackage | Versioned bundle for one source slice and observation |
| TerminologyPackage | Definitions for gate, observation, conformance, checker, assumption, and exclusion |

### GSN

[Goal Structuring Notation Community Standard Version 3](https://scsc.uk/gsn-standard) standardizes a graphical notation and good practice for structured assurance arguments. It is effective for human review of goals, strategies, contexts, assumptions, justifications, solutions, and modules. GSN and SACM are related but not interchangeable: GSN is primarily a notation and method; SACM is an exchange metamodel. Neither should be used as the proof object itself.

## 3. Attestation, provenance, and generic evidence carriers

### CycloneDX 1.7 / ECMA-424, second edition

[CycloneDX 1.7 became ECMA-424 second edition in December 2025](https://ecma-international.org/publications-and-standards/standards/ecma-424/). Its [Attestations capability](https://cyclonedx.org/capabilities/attestations/) goes well beyond a traditional bill of materials:

- `definitions.standards` can define a standard, its requirements, and named levels composed from those requirements;
- `declarations.targets` identify the components, services, or other subjects under assessment;
- assessors, attestations, claims, counterclaims, evidence, counter-evidence, reasoning, conformance, confidence, and affirmation describe the evaluation;
- formulation and component metadata can identify tools, workflows, inputs, and outputs;
- signatures and external references support binding and retrieval.

This makes CycloneDX the best current generic carrier for a Foldlab G0–G5 profile. It does **not** define a formal-verification vocabulary, decide which evidence satisfies a gate, or validate a proof. Foldlab must publish those requirements and semantics.

CycloneDX confidence is not a substitute for deductive validity. A theorem checker either accepts, rejects, or fails to decide under a declared trust base. Confidence values may be meaningful for an assessor's belief about test coverage, source mapping, or external evidence; they should not turn “kernel checked” into a probabilistic score.

The in-toto project lists CycloneDX as a vetted predicate type, [`https://cyclonedx.org/bom`](https://github.com/in-toto/attestation/blob/main/spec/predicates/README.md). That provides a standardized way to bind a CycloneDX assurance document to content-addressed in-toto subjects.

### in-toto Statement, SCAI, SVR, and VSA

An [in-toto Statement v1](https://github.com/in-toto/attestation/blob/main/spec/v1/statement.md) separates content-addressed `subject` resources from a URI-identified `predicateType` and its domain-specific `predicate`. This is an appropriate outer binding for formal-assurance metadata, not a proof language.

[Software Chain of Custody and Attribute Integrity (SCAI) v0.3](https://github.com/in-toto/attestation/blob/main/spec/predicates/scai.md), whose predicate type is `https://in-toto.io/attestation/scai/v0.3`, is immediately useful for compact Foldlab assertions. It associates domain-defined attributes and conditions with a target and authenticated evidence resource descriptors. SCAI intentionally leaves attribute vocabularies and evidence formats to their domains. Foldlab could therefore publish URI-valued attributes such as `https://foldlab.dev/assurance/gate/G2` during experimentation without defining a new predicate. SCAI can point to the richer CycloneDX/SACM-style case and native proof artifacts.

The [Simple Verification Result](https://github.com/in-toto/attestation/blob/main/spec/predicates/svr.md) records a verifier, policies, verification time, and verified property strings. It is a concise result receipt, but intentionally omits enough process detail that it cannot replace the evidence bundle.

[SLSA 1.2](https://slsa.dev/spec/v1.2/) defines source- and build-integrity tracks, levels, provenance, and verification practices for software supply chains. Its levels address how source and artifacts were produced and protected; they do not grade semantic correctness, theorem coverage, or model/source correspondence. A `SLSA_BUILD_LEVEL_3` result therefore has no ordinal relationship to Foldlab G3.

[SLSA 1.2 Verification Summary Attestation](https://slsa.dev/spec/v1.2/verification_summary) similarly records the verifier and version, policy URI and digest, input attestations, `PASSED`/`FAILED`, and `verifiedLevels`. It explicitly permits custom level strings that do not start with `SLSA_`. A Foldlab verifier could therefore issue `FOLDLAB_G2` as a summary after evaluating a versioned policy. That value must not be confused with a SLSA build level, and the VSA must remain a policy receipt rather than the proof-specific evidence schema.

### DSSE, Sigstore, and SCITT

[DSSE](https://github.com/secure-systems-lab/dsse) defines a simple signature envelope for arbitrary typed bytes and uses pre-authentication encoding to bind payload type and content. It deliberately does not define proof semantics, identity policy, or key management.

[Sigstore's protobuf specifications](https://github.com/sigstore/protobuf-specs) define interoperable bundles containing signatures and verification material, including transparency-log evidence. A Sigstore bundle can make a Foldlab attestation independently distributable and verifiable. Signature verification shows who signed which bytes under a policy; it does not establish theorem correctness.

[IETF RFC 9943](https://www.rfc-editor.org/rfc/rfc9943.html), *An Architecture for Trustworthy and Transparent Digital Supply Chains*, became a Proposed Standard in June 2026. SCITT defines content-agnostic signed statements and receipts with transparency, auditability, and non-equivocation properties. It intentionally does not standardize the detailed semantics of every statement. It is therefore an optional publication/transparency layer for Foldlab attestations, not a replacement for the CycloneDX declaration, proof checker, or gate policy.

### W3C PROV

[W3C PROV-DM](https://www.w3.org/TR/prov-dm/) and [PROV-O](https://www.w3.org/TR/prov-o/) represent entities, activities, agents, derivation, generation, use, and attribution. They fit Foldlab's interests in tracing, digestion, and content-addressed transformations: a source snapshot, elaborated model, proof, extracted artifact, and checker report can be entities linked by activities and agents. PROV supplies lineage, not proof meaning or assurance level, so it is best used as a composable provenance view rather than the primary gate schema.

### SPDX, SARIF, and VEX

[SPDX 3.0.1](https://spdx.github.io/spdx-spec/v3.0.1/) provides a broad software metadata graph with external references and annotations. It can link a package or file to an assurance artifact, but it lacks CycloneDX Declarations' explicit standard/requirement/level and claim/evidence structures.

[SARIF 2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/os/sarif-v2.1.0-os.html) is an OASIS standard for static-analysis results. It records tools, runs, artifacts, hashes, locations, code flows, results, invocations, and policies. A model checker or conformance tool may emit useful subsidiary evidence as SARIF, but SARIF does not define a proof calculus or formal-assurance grade.

CycloneDX [VEX](https://cyclonedx.org/capabilities/vex/) and analogous vulnerability-exploitability formats answer whether a known vulnerability affects a product. They are not generic verification-evidence or formal-proof formats. Their applicability-status pattern may be instructive, but reusing VEX for theorem assurance would misstate its domain.

## 4. Regulated assurance levels are comparative context

### Common Criteria

The [Common Criteria](https://www.commoncriteriaportal.org/cc/index.cfm) defines Evaluation Assurance Levels EAL1 through EAL7 as packages of security assurance requirements with increasing scope, depth, and rigor. [CC:2022 Part 3](https://www.commoncriteriaportal.org/files/ccfiles/CC2022PART3R1.pdf) defines the assurance components and evaluation packages. Higher levels can require formal security-policy models, formal specifications, and formal correspondence activities.

An EAL is an evaluated package under a security target, not a universal percentage of verified code and not a proof-object format. “EAL7” must not be mapped directly to “G5,” nor should formal-method requirements at high EALs be summarized as a wholly formally verified implementation.

### DO-333

[DO-333](https://www.rtca.org/do-178/) supplements DO-178C/DO-278A with objectives and guidance for using formal methods in airborne software assurance. The [FAA's AC 20-115D](https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_20-115D.pdf) recognizes this standards family for software approval. DO-333 governs a certification argument and the satisfaction or replacement of lifecycle objectives; it does not prescribe a public, cross-prover proof interchange format or artifact-grade manifest.

These regimes reinforce two design choices: assurance claims need context and accepted evidence criteria, and an assurance level denotes satisfaction of a package of requirements—not the intrinsic “strength” of an isolated proof file.

## 5. Open verification-program prior art

### Verify Rust Std

The [Verify Rust Standard Library effort](https://model-checking.github.io/verify-rust-std/intro.html) is not an open standard, but it is unusually relevant prior art for defining an operational assurance profile. The project is tool-agnostic within a governed set of accepted tools and decomposes the broad goal of a safe Rust standard library into reviewable challenges. Its [general rules](https://model-checking.github.io/verify-rust-std/general-rules.html) require a fixed verification target, a single pull-request solution, automation in repository CI, prior integration of the verification tool, explicit challenge acceptance criteria, and committee review. Its [challenge template](https://model-checking.github.io/verify-rust-std/challenge_template.html) makes goal, motivation, description, assumptions, success criteria, status, solution, and tracking issue explicit. Its [tool template](https://github.com/model-checking/verify-rust-std/blob/main/doc/src/tool_template.md) additionally asks for capability scope, comparison with other tools, licensing, use instructions, artifacts and audit mechanisms, versioning, support, and CI integration.

This provides a practical analogue for a Foldlab profile:

- a grade is awarded to a scoped challenge claim over a named target, not inherited by an entire language or repository;
- the success criteria determine what counts as evidence, while CI establishes repeatability and a review committee governs acceptance;
- a tool is admitted through a separate capability-and-audit process, so acceptance of a tool does not automatically validate every result it produces; and
- proof artifacts live beside the implementation and executable workflow, making regeneration part of the assurance case.

The [SIMD contracts challenge](https://model-checking.github.io/verify-rust-std/challenges/0015-intrinsics-simd.html) is especially instructive because it distinguishes three layers: contracts used as testable Rust specifications, proofs that those contracts are sound against a hand-written model, and downstream verification tools that consume the contracts. It also states the residual trust explicitly: the hand-written instruction semantics must match Intel/Arm documentation, and the verification tool must soundly encode Rust under a documented model. This is the same boundary Foldlab must preserve between executable observations, a formal model, a proof in that model, and source/runtime conformance.

The limitation is equally important. Verify Rust Std currently concentrates on memory safety and selected undefined behaviors, and its accepted solutions may use different verification technologies. Its process supplies governed claim profiles and completion evidence, not a common cross-tool proof format or ordinal assurance vocabulary. Foldlab should borrow its challenge/profile discipline while using CycloneDX/SACM/in-toto to make the resulting evidence graph portable.

## 6. Research architectures and active gaps

### Proof-carrying code and foundational certificates

[Proof-carrying code](https://personal.utdallas.edu/~hamlen/Papers/necula96.pdf) proposed shipping code with a proof that a consumer checks against a safety policy. [Foundational proof-carrying code](https://www.cs.princeton.edu/~appel/papers/fpcc.pdf) reduces the trusted base by targeting foundational logic. The [ProofCert project](https://www.lix.polytechnique.fr/~dale/ProofCert/) and foundational proof certificate work explore certificate specifications that can guide independent proof reconstruction across logics.

These are essential architectural precedents: policy must be explicit, checking belongs with the consumer, and the trusted base should be small and named. They have not converged into a universally deployed standard for grades of formally verified software.

### Why no universal grade standard has emerged

The survey found no standards-body specification or broadly adopted open format that jointly standardizes:

1. a cross-logic proof representation;
2. source-language and runtime semantics;
3. model/source/translation correspondence;
4. trusted computing base and axiom disclosure;
5. evidence packaging, provenance, identity, and signatures; and
6. a common ordered assurance scale.

The fragmentation is visible in the standards themselves. SMT-LIB standardizes `get-proof` but not a common proof response; Alethe, LFSC, LRAT, TSTP, CPF, and SV-COMP each choose different calculi and domains; SACM has no domain proof semantics; supply-chain attestations are content-agnostic. The [Dagstuhl report on universality of proofs](https://drops.dagstuhl.de/entities/document/10.4230/DagRep.6.10.75) records the continuing difficulty of exchanging and independently checking proofs across proof assistants.

This is not a reason to wait for a universal format. It is a reason to keep the layers explicit and define only the missing Foldlab vocabulary.

> **False friend:** the organization using the name “Open Proof Standards Foundation” at [opsf.org](https://opsf.org/) concerns proof claims about privacy and regulatory data-use obligations. Its proposed Proof Claims Token is not a machine-checked theorem/proof artifact standard, and its site described foundation formation as pending. It is unrelated to this problem despite the name.

## Foldlab G0–G5 as an open assurance profile

The existing gates map cleanly to a requirements-and-evidence profile. The
table describes the minimum evidence shape; it does not change the normative
language in
[`CLAIM-GATES.md`](../effect-typescript-semantics/CLAIM-GATES.md).

| Gate | Normative subject of the claim | Required machine-addressable evidence | Applicable existing carriers | Forbidden inference |
| --- | --- | --- | --- | --- |
| G0 — pinned | Exact Effect source snapshot/package/slice is identified | Repository, commit, package/version, lock digest, modeled symbols | in-toto subject/resource descriptor; CycloneDX component/external reference; W3C PROV entity | The source is modeled, correct, or verified |
| G1 — modeled | Operation X is represented by declared formal objects | Model source digest; carrier, constructors, judgments, observations; source mapping; elaboration result | CycloneDX claim/evidence; SACM claim/asserted evidence; Lean-native artifacts | The model conforms to source behavior |
| G2 — proved in model | The Lean model satisfies law L | Theorem ID/source; kernel/checker version and result; no-admission scan; axiom report; logic/dependency/option pins | Native Lean evidence by digest; CycloneDX declaration; SCAI attribute; optional VSA/SVR receipt | The TypeScript implementation satisfies L |
| G3 — source-conformant | Pinned Effect slice conforms under observation O | Reproducible fixtures or independently checked translation; coverage/domain; source and tool versions; discrepancies/counter-evidence | SARIF or test-result artifacts as evidence; CycloneDX claim/evidence; SACM reasoning | Whole-library or unobserved behavior conforms |
| G4 — semantics-preserving | Translation T preserves O under stated assumptions | Translation definition; source/target semantics; preservation theorem; checker/axiom report; domain assumptions | Native proof plus CycloneDX/SACM relationship and content-addressed subjects | Compilers, bundlers, or runtime preserve unmodeled observations |
| G5 — host/artifact conformant | Named runtime/compiler artifact conforms under O | Compiled artifact digest; runtime/compiler versions; environment; differential/integration result; link to G4 or explicit weaker rationale | in-toto provenance and subject; CycloneDX formulation/evidence; SARIF/test result; SCAI/VSA receipt | Portability to other hosts, versions, or observations |

The following invariants should be normative in any future profile:

- **Claim-scoped grade:** `gate` belongs to a claim, never implicitly to an entire repository, package, or executable.
- **Exact boundary:** source revision, symbols/slice, observation, versions, assumptions, and exclusions are required fields.
- **No scope laundering:** a higher gate includes lower evidence only when all boundary fields match exactly or an explicit refinement relationship is independently justified.
- **Content addressing:** subjects, policies, source locks, models, proofs, fixtures, translations, reports, and executables are identified by cryptographic digest.
- **Producer/checker separation:** record both, even when the same tool performs the roles. Identify the checker policy and result independently.
- **Native evidence preservation:** record proof/witness format and version, media type, checker, logic, supported fragment, and retrieval location; never substitute a prose attestation for the proof artifact.
- **Trust disclosure:** list axioms, admissions, unsafe declarations, oracle use, imported trust, runtime/compiler dependencies, and the trusted computing base relevant to the claim.
- **Ternary status:** distinguish `PASSED`, `FAILED`, and `INDETERMINATE`; absence of a counterexample is not proof.
- **Counter-evidence:** retain failed fixtures, rejected proof steps, unsupported theories, and scope exceptions as first-class evidence.
- **Validity is not confidence:** do not assign a probabilistic confidence score to kernel acceptance. If confidence is used, state which empirical or assessor judgment it measures.

## Recommended representation stack

### 1. Publish the profile in CycloneDX Definitions

Create a versioned standard definition—provisionally “Foldlab Formal Artifact Assurance Profile”—whose requirements are stable URIs such as source-pin integrity, model traceability, kernel acceptance, axiom disclosure, observational fixture coverage, preservation proof, and host identity. Define G0–G5 as CycloneDX levels containing those requirement references.

This reuses an open ECMA schema and makes each level inspectable. The Foldlab profile, not CycloneDX itself, remains authoritative for the meaning of G0–G5.

### 2. Emit a declaration per assurance case

For a source slice and observation, use CycloneDX Declarations to identify:

- target subjects and exact digests;
- claims, counterclaims, status, scope, and exclusions;
- the requirements being attested;
- evidence and counter-evidence resource references;
- assessor/verifier identity and tool formulation;
- reasoning that explains why each evidence item supports the requirement; and
- affirmation/signature data where appropriate.

Use SACM's claim/evidence/reasoning separation as the conceptual model. A later SACM export can be added if an assurance-case tool needs native SACM interchange; maintaining two normative models initially would add avoidable complexity.

### 3. Keep domain certificates native

Attach Lean sources and checker reports, SV-COMP witnesses, Alethe/LFSC proofs, SARIF results, fixtures, traces, or compiled artifacts without rewriting them into one universal proof language. The declaration should identify each artifact by digest, URI, media type, native format/version, producer, checker, and checker policy.

### 4. Bind and authenticate with in-toto

Use an in-toto Statement whose subject is the artifact or source slice and whose registered predicate type is `https://cyclonedx.org/bom`. Sign the statement using DSSE and a documented identity policy; a Sigstore bundle is a suitable interoperable packaging choice. Publish to an SCITT transparency service only when durable registration, auditability, or non-equivocation is required.

For early experiments, SCAI v0.3 can assert URI-valued Foldlab gate attributes and link to authenticated native evidence. It is preferable to a new predicate while the vocabulary is still evolving. An SVR or SLSA VSA may summarize a completed policy decision for release automation, but neither replaces the declaration or proof evidence.

## Minimal predicate shape if a custom format later becomes necessary

The following is an illustrative design constraint, **not** an implemented or registered schema. The placeholder predicate URI must not be treated as stable. Its purpose is to show the minimum information that must survive if CycloneDX/SCAI prove insufficient.

```json
{
  "_type": "https://in-toto.io/Statement/v1",
  "subject": [
    {
      "name": "effect-result-slice",
      "digest": { "sha256": "<subject digest>" }
    }
  ],
  "predicateType": "https://foldlab.dev/attestation/formal-verification/v0.1",
  "predicate": {
    "profile": {
      "uri": "https://foldlab.dev/assurance/gates/v1",
      "digest": { "sha256": "<profile digest>" }
    },
    "claims": [
      {
        "id": "RES-003",
        "gate": "G2",
        "status": "PASSED",
        "statement": {
          "uri": "<claim-statement URI>",
          "digest": { "sha256": "<statement digest>" }
        },
        "scope": {
          "sourceRevision": "<repository and commit>",
          "symbols": ["Result.map"],
          "observation": "<observation ID and digest>",
          "assumptions": [],
          "exclusions": []
        },
        "requirements": ["kernel-accepted", "no-admissions", "axioms-reported"],
        "evidence": ["lean-proof", "checker-report", "axiom-report"]
      }
    ],
    "evidence": [
      {
        "id": "lean-proof",
        "kind": "kernel-proof-source",
        "artifact": {
          "uri": "<artifact URI>",
          "mediaType": "text/plain",
          "format": "Lean 4 source",
          "digest": { "sha256": "<artifact digest>" }
        },
        "producer": { "name": "Lean", "version": "<version>" },
        "checker": {
          "name": "lean4checker",
          "version": "<version>",
          "policy": { "uri": "<policy URI>", "digest": { "sha256": "<digest>" } },
          "result": "PASSED"
        },
        "trust": {
          "logic": "Lean 4 dependent type theory",
          "axioms": [],
          "admissions": [],
          "unsafeDeclarations": [],
          "trustedComponents": ["Lean kernel", "checker binary <digest>"]
        }
      }
    ],
    "assuranceCase": {
      "conceptualModel": "https://www.omg.org/spec/SACM/2.3",
      "uri": "<assurance-case URI>",
      "digest": { "sha256": "<case digest>" }
    }
  }
}
```

A real schema would also need canonicalization/versioning rules, media-type registration, status and error semantics, URI governance, extensibility, privacy guidance, and conformance tests. Those should follow demonstrated use cases rather than be designed speculatively.

## Adoption sequence

1. **Now:** keep G0–G5 normative in `CLAIMS.md`; require claim scope, digests, checker identity, trust disclosures, and native evidence in project resources.
2. **First interchange experiment:** define G0–G5 requirements/levels in a CycloneDX 1.7 Definitions profile and represent one existing G2 claim as a Declaration. Validate it against the official CycloneDX schema.
3. **Signed distribution:** wrap that CycloneDX document as the vetted in-toto CycloneDX predicate and package its DSSE signature plus verification material in a Sigstore bundle.
4. **Compact receipts:** use SCAI for URI-valued gate attributes. If CI needs a final policy result, emit SVR or VSA referencing the full evidence attestation.
5. **Transparency when justified:** register signed statements with an RFC 9943-compatible SCITT service when independent audit or non-equivocation becomes a requirement.
6. **Only after multiple proof domains:** evaluate whether recurring proof-specific fields justify a custom predicate. If so, publish schemas, examples, conformance tests, URI/media-type policy, and migration rules openly.

## Conclusion

Foldlab does not need to invent a universal grade standard, and should not claim that one already exists. It needs a precise open **profile** that composes established layers:

- native proof and witness formats establish domain-specific evidence;
- CycloneDX 1.7 carries requirements, levels, claims, evidence, and assessments;
- SACM supplies the assurance-case semantics;
- in-toto binds the case to content-addressed subjects;
- DSSE/Sigstore authenticates the statement and identity material;
- SCITT can add transparent registration and receipts;
- SCAI, SVR, or VSA can expose compact attributes or policy results without replacing the evidence.

This composition matches Foldlab's philosophy of meaning-preserving transformations. Every projection—from proof object to checker result, from checker result to claim, from claim to grade, and from grade to signed receipt—must retain enough identity, scope, and semantics for a consumer to reconstruct what was actually established.
