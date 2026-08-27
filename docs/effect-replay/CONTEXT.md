# CONTEXT — the Effect Replay context

Status: RATIFIED by grilling 2026-08-26 (operator, in-session; recommendations
accepted, with one operator strengthening: full independence from the Entity
Store context). Kind: **glossary**. This document owns the context's vocabulary
and nothing else. The design view lives in
[library/effects/IMPLEMENTATION-PLAN.md](../../library/effects/IMPLEMENTATION-PLAN.md);
claims are stamped per [CLAIM-GATES.md](../effect-typescript-semantics/CLAIM-GATES.md).

## Scope and independence

This glossary owns the CAS replay library's vocabulary: minted terms and minted
rules for content-addressed storage of operation histories and their
substitution replay. It owns no behavior (the implementation plan), no claim
standing (the gate ladder), and no source pins (Source Provenance).

The context is fully independent of the Entity Store context: no term below
borrows from it, and shared English words are ordinary usage, not borrowed
judgments. The machine algebra
([MACHINE-ALGEBRA.md](../../library/machine/MACHINE-ALGEBRA.md), pre-grade) is
this context's *pattern source* for canonicalization, framing, and the
hash-hypothesis lattice — attribution, not dependency. The ratified relationship
is a deliberate fork of the machine's obligation shapes; convergence to direct
instantiation is expected only after the machine algebra is itself ratified, and
enters as an ordinary refactor proposal at that time.

### Lexical rules

1. No bare "Admissible" or "Admitted" as a minted judgment name. Every admission
   judgment in this context is compound-named and says what is admitted.
2. Orchestration that follows the documented discipline is **conforming**, never
   "admitted" — admission-family words are reserved for checks a machine runs.
3. "Verdict" does not appear in this context; a session has an **outcome**.
4. "Canonical" follows the machine's `canon` pattern and is glossed on first
   use in any surface that uses it.

---

## Terms

### Operation description
- **Kind:** schema. **Code label:** pending Pass B (provisional `src/Operation.ts`).
- **Form:** stable operation identity, revision, request Schema, success Schema,
  typed-failure Schema, and leaf-replay class for one method of a described
  Effect service.
- **Obligations:** any Schema change is accompanied by a revision bump; a drift
  without a bump is caught at consumption as outcome inadmissibility, never
  silently accepted. Descriptions are explicit; reflection is insufficient.
- **Avoid:** deriving a description from runtime inspection; treating equal
  identities with different revisions as matchable.

### CAS node
- **Kind:** model (carrier). **Code label:** pending Pass B (provisional
  `src/CasNode.ts`, `Effects/Cas.lean`).
- **Form:** versioned kind, canonical payload bytes, and ordered typed
  references — the data-plus-references pattern. References live inside the
  framed body as full-length address bytes in declared order.
- **Obligations:** node admission before store; the obligation column maps to
  the machine's O-shapes through the fork's standing correspondence table (an
  M2 deliverable). Identity is the pre-image bytes, never the storage layout.
- **Avoid:** storing un-admitted bytes; letting archive or storage layout
  participate in identity.

### Content identifier
- **Kind:** model (function with premises). **Code label:** pending Pass B.
- **Form:** digest of the project-owned pre-image
  `versionByte ++ kindTag ++ frame(encode(canon node))`. The hash `H` is
  abstract in the model; the concrete digest is an injected adapter (first:
  SHA-256 via platform crypto). Kind tags are a one-byte plane per scheme
  version; addresses are full digest output, never truncated.
- **Obligations:** the hash-hypothesis lattice. Level 0 (no premise on `H`):
  canon idempotence, framing, kind/version separation, equal-encoding
  deduplication, and collision characterization. Level 1: address equality
  reflects content equality only under an explicit named `hInj` premise.
  Level 2 is empty: no theorem assumes collision resistance. Any
  pre-image-affecting change bumps the scheme version byte.
- **Avoid:** hashing Schema's default JSON encoding; stating an address law
  without its lattice level; "hashing proves identity."

### Node admission
- **Kind:** model (judgment). **Code label:** pending Pass B.
- **Form:** raw node to admitted node or clause-named typed CAS error
  (address mismatch, non-canonical bytes, unknown kind, dangling or wrong-kind
  reference). Closure and kind-typing are checked at `put`; `load` verifies
  address recomputation, canonical decode, and known kind.
- **Obligations:** fail-closed; the readable store is well-formed by
  construction. CAS errors are a distinct typed family from mismatch
  categories.
- **Avoid:** renormalize-on-read (a named defect, same standing as live
  fallback); checking closure only at load; folding CAS errors into the
  mismatch taxonomy.

### History entry
- **Kind:** model (carrier). **Code label:** pending Pass B (provisional
  `Effects/History.lean`).
- **Form:** one logical operation occurrence: operation identity and revision,
  canonical request, decision, outcome envelope, and predecessor information.
- **Obligations:** the outcome envelope is channel-preserving two-case data —
  success of the declared success Schema or failure of the declared
  typed-failure Schema — and substitution re-injects through the native Effect
  channels so recovery combinators fire exactly as they did live. Failures are
  Schema-tagged data values; stack traces, host error identity, and cause
  chains are not recorded.
- **Avoid:** recording an outcome as a bare value that erases the channel;
  collapsing defect or interruption into the envelope (they are deferred, not
  merged).

### Occurrence identity
- **Kind:** model (identity discipline). **Code label:** pending Pass B.
- **Form:** structural `(executionId, index)`. Under exact positional matching,
  position is the semantics; identity and matching rule coincide.
- **Obligations:** identical invocation content never collapses occurrences —
  the store deduplicates request nodes while history keeps entries distinct.
  Request-content-keyed reuse answering an occurrence is a named defect.
- **Avoid:** content-derived occurrence identifiers; nonce machinery before
  frames or migration demand it.

### Replay session
- **Kind:** model (state machine). **Code label:** pending Pass B (provisional
  `src/Replay.ts`).
- **Form:** mode (record or replay), execution identity, history root, flat
  cursor, ordered decision trace, and poisoned state.
- **Obligations:** a record-mode append failure poisons the session — every
  later wrapped operation fails with a typed error, so histories are truthful
  prefixes, never gapped subsequences. Replay mode is hermetic: no live service
  exists in its environment, and tripwire Clock/Random defaults surface ambient
  use as a `Violated` outcome (mechanism verified against the pinned source,
  2026-08-26: both are `Context.Reference` keys overridable per scope with
  `Effect.provideService`).
- **Avoid:** recording past an append failure; giving a replay session a live
  dependency.

### Decision trace
- **Kind:** model (observable). **Code label:** pending Pass B (provisional
  `src/Decision.ts`).
- **Form:** the ordered decisions emitted by the pure reducer. Minimum cases:
  live delegation, record-mode occurrence append, recorded substitution,
  history consumption, typed rejection, completion.
- **Obligations:** the primary observation of the differential suite; "was a
  live adapter requested" is a derived projection of the trace, never a
  separate oracle.
- **Avoid:** comparators that drop live-delegation or rejection decisions.

### Mismatch category
- **Kind:** taxonomy. **Code label:** pending Pass B.
- **Form:** six categories. Request-side, checked against the entry at the
  cursor: operation mismatch, revision mismatch, request mismatch, history
  exhausted. Completion-side: unconsumed suffix. Outcome-side, checked at
  consumption: outcome inadmissible.
- **Obligations:** request-side compatibility and outcome-side admissibility
  are distinct checks with distinct categories; the set is caller-visible API.
- **Avoid:** an "order mismatch" category (it always manifests as a
  request-side case at the current position); folding CAS storage failures in
  (distinct typed family); folding ambient violations in (a session-outcome
  case, not a category).

### Session outcome
- **Kind:** model (tagged result). **Code label:** pending Pass B.
- **Form:** `Completed` with the terminal; `Rejected` with category, position,
  and — for the unconsumed-suffix case only — the program's terminal so far; or
  `Violated` with the ambient-service violation.
- **Obligations:** completion means the program reached a terminal (success or
  declared typed failure) *and* the cursor equals the history length, uniformly
  across both terminal kinds. Transport from wrapped methods to the session
  boundary is a named defect-class seam with its own trust statement:
  caller-facing method types stay byte-identical across live, record, and
  replay, and the internal defect is plumbing, never modeled defect semantics.
- **Avoid:** "verdict"; widening wrapped-method error unions with replay
  errors; presenting the transport defect as modeled defect behavior.

### Replay witness
- **Kind:** schema. **Code label:** pending Pass B (provisional
  `src/Witness.ts`).
- **Form:** mode, execution identity, consumed history, decision trace, and
  session outcome, immutable.
- **Obligations:** carries execution identity, never program identity;
  compatibility is behavioral — emitted stream against recorded stream — never
  nominal.
- **Avoid:** any field or prose implying "this is the program that recorded
  it" or "the code is unchanged"; reading a witness as evidence the external
  world would answer the same today.

### Service kit
- **Kind:** module. **Code label:** pending Pass B (provisional
  `src/ServiceAdapter.ts`).
- **Form:** one kit constructor per described service, minting an internal live
  role tag and returning the record construction (requires the live role and
  the replay service) and the replay construction (requires the replay service
  only). A by-value overload builds on it.
- **Obligations:** wrapper bodies never resolve the public tag — a named defect
  with a must-fail fixture. Produced services carry a runtime string-keyed
  brand checked at construction; double wrapping is rejected with a typed
  error, never normalized.
- **Avoid:** type-level brands (ruled out by caller-facing type identity);
  reflection-derived wrapping.

### Conforming orchestration
- **Kind:** taxonomy (discipline class). **Code label:** none — a documented
  discipline, not a machine-checked judgment.
- **Form:** orchestration whose replay-relevant leaves are wrapped and which
  performs no ambient host effect and consults no default Clock, Random, or
  jittered Schedule except through a described leaf operation.
- **Obligations:** `R = never` is never treated as evidence of purity; the two
  leak counterexamples (direct `Date.now`; jittered retry through default
  services) are permanent fixtures; G2 traceability states the quantifier
  mismatch between Lean-reified programs and discipline-conforming TypeScript.
- **Avoid:** "admitted orchestration"; presenting model theorems as universal
  over ordinary TypeScript programs.

---

## Rules (each kind: adr; ratified in the M0 grilling, 2026-08-26)

### history-is-an-underapproximation
Every recorded entry corresponds to a live action that occurred, in the
recorded order; the converse is never claimed. **Why:** the live-action/append
crash gap is unclosable from inside the library; poisoning keeps histories
prefix-truthful, and replaying a short prefix fail-closes on its own (history
exhausted). **Avoid:** exactly-once language; treating a witness as proof of
external completeness.

### no-live-fallback
A replay mismatch is terminal for the attempt; nothing falls through to a live
adapter. Replay-mode construction makes this structural: the live service is
absent from the environment, so fallback is unexpressible rather than merely
forbidden. **Avoid:** retry-with-live "resilience" inside replay mode;
capturing a live reference before replay construction.

### behavioral-compatibility-only
Replay compatibility compares emitted request streams against recorded
streams; program identity is absent, not inferred. Pure refactors replay old
histories; changed programs fail lazily at first divergence, harmlessly,
because replay performs no external effects. **Why:** program identity cannot
be retrofitted onto arbitrary TypeScript closures; it returns, if ever, as a
content-addressed reified program in a generator lane. **Avoid:** witness
wording that names a program; "replay passed, so the code is unchanged."

### reject-first-ambient-policy
The first slice rejects time, randomness, and jittered scheduling from
conforming orchestration rather than adjudicating per-combinator determinism.
Replay-mode tripwire defaults convert the Effect-mediated leak into a
`Violated` outcome; the raw-host channel stays discipline plus permanent
fixtures; deterministic overrides arrive only when a fixture demands one.
**Why:** the boundary between sequence-deterministic and
sequence-nondeterministic schedule use is subtle enough that drawing it is
later work; declining all of it is honest. **Avoid:** treating `R = never` as
purity; adjudicating individual combinators ad hoc.
