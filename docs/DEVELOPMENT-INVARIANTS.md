# Development invariants

These invariants govern code developed by Foldlab. They organize how definitions, implementations, proofs, and adapters may relate; they do not select a semantic feature scope.

## I-001 — Definition-first typed functional core

Every project-owned semantic capability begins as a project-owned definition before it becomes an implementation integration.

The required order is:

1. name the concept and its observable meaning;
2. define project-owned algebraic carriers and constructors;
3. define well-formedness, typing, equality, and refinement judgments as needed;
4. define operations as pure functions or explicit relations with typed inputs, results, and failures;
5. state preservation, progress/totality, determinism, coherence, or type-soundness obligations appropriate to those definitions;
6. prove the obligations for the formal core; and
7. only then add extraction, compiler, runtime, storage, network, or foreign-library adapters at explicit seams.

An external type may be used as an implementation carrier only after its interpretation is explicit. It must not silently become the project's semantic definition.

## I-002 — Strict functional core

The formal core must prefer:

- immutable algebraic data;
- referentially transparent definitions;
- total functions over a clearly declared domain;
- structural recursion or an explicit well-founded measure;
- typed success and failure values;
- explicit state transitions;
- explicit environment and capability requirements; and
- explicit representations of nondeterminism, divergence, concurrency, and external effects when they are admitted.

The formal core must not hide:

- mutation or shared state;
- exceptions, defects, or process termination inside an ordinary result;
- partial pattern matches;
- unchecked casts;
- ambient clocks, randomness, environment variables, files, networks, or schedulers;
- callback behavior imported without a semantic contract; or
- native, FFI, unsafe, generated, or solver behavior inside a kernel-checked claim.

Such behavior belongs behind a named seam with a typed adapter and a separate trust statement.

## I-003 — Soundness is relational

A type is not called sound merely because a compiler accepts it or because its constructors look algebraic. “Sound” must name the relation it preserves.

Depending on the module, the obligation has one of these forms:

- construction soundness: every public constructor produces a well-formed value;
- operation preservation: a well-formed input and satisfied precondition produce a well-formed result;
- typing soundness: a value accepted by a typing judgment cannot evaluate to a result outside the stated semantic type, except for explicitly modeled failures;
- translation preservation: an admitted source artifact translates to a model with the declared observations;
- refinement: an implementation produces no observation forbidden by its specification; or
- codec soundness: successful encoding and decoding results belong to their declared value relations.

Each use of “sound,” “type safe,” “verified,” “equivalent,” or “preserves semantics” must link to its exact judgment and theorem. Until the theorem exists, the obligation is pending.

## I-004 — Project-owned semantic types

Semantic interfaces expose Foldlab-owned types. Raw Effect, TypeScript, JavaScript, JSON text, Git, host, and third-party values enter through boundary representations and checked translations.

This provides:

- one canonical meaning independent of dependency layout;
- explicit rejection of values outside the modeled domain;
- stable theorem statements across dependency upgrades;
- local control over equality, normalization, and serialization; and
- a visible place to prove preservation before external behavior is trusted.

Project-owned does not mean reimplement every utility. A dependency may supply storage, parsing, collections, tactics, or execution machinery when its semantic role and trust cost are declared. It does mean that the project owns the definitions appearing in its public formal claims.

## I-005 — Proof before promotion

Development may use examples, executable checks, and temporary hypotheses while exploring. A definition is promoted into a public formal interface only when:

- its meaning and observables are recorded;
- its constructors and invalid cases are explicit;
- its theorem obligations are stated;
- its dependency and trust surface is recorded; and
- its claimed soundness obligations are proved or visibly marked pending.

Compilation, tests, generated output, or differential agreement may supplement these gates but cannot replace a proof about the formal core.
