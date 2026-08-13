# VERIFICATION — the claims ledger

Every verification claim the repository makes, with its rung, its
exact bounds, the assumptions it stands on, and the file where it is
checkable. A claim absent from this ledger is not made.

## How to read a rung

A rung names how strongly a contract is established. Rungs are defined
in
[docs/map/tickets/009-the-verification-ladder.md](docs/map/tickets/009-the-verification-ladder.md):

| Rung | What it establishes |
| --- | --- |
| R0 | fixture walls — a wall is a differential test: two implementations, one input, digests compared |
| R1 | property tests |
| R2 | bounded model check |
| R3 | inductive invariant |
| R4 | lockstep conformance against the running binary |
| R5 | mechanized proof |

Every entry below keeps the same four parts: the **claim** it asserts,
the **evidence** that establishes it, the **bounds and residuals**
where that evidence stops, and the file it is **checkable at**. A
status of **HELD** means the claim is written down but not asserted:
its evidence is in repair, and the entry states what must land before
it upgrades.

## Status at a glance

The table points; the entries below carry the bounds.

| Contract | Rung | Status | Checkable at |
| --- | --- | --- | --- |
| Effector (commitment register) | R3 + R4 | **Claimed**; proof artifacts not yet shipped in this repository (ticket 013) | [go/effector/](go/effector/) |
| Catalog + ingress | R2 + R4 | **Claimed** at R2 and R4; R3 **HELD**, in re-proof at repaired bounds | [verify/catalog/](verify/catalog/), [proto/go/catalogr4/](proto/go/catalogr4/) |
| Journal and chain walls | R0/R1 | **Claimed**; no model gate yet (ticket 012) | [fixtures/](fixtures/), [go/stream/](go/stream/), [docs/gauntlet/](docs/gauntlet/) |
| Schema identity | interim law only | **Interim**; the owned encoding is ticket 004 | [proto/wire/fixtures/](proto/wire/fixtures/) |
| RFC 8785 canonical JSON | R1 differential | **Claimed** for the stated corpus and its generated sample | [fixtures/jcs-rfc8785.json](fixtures/jcs-rfc8785.json), [packages/core/test/jcs.differential.test.ts](packages/core/test/jcs.differential.test.ts), [go/canonical/differential_fuzz_test.go](go/canonical/differential_fuzz_test.go) |
| Tracer conformance (W1–W10) | R0/R1 | **Claimed**, single daemon | [proto/](proto/) |

## The effector (commitment register) — R3 + R4

### Claim

Fencing safety (no commit lands below the highest linearized fence)
and unique terminal outcome, for the register
`Absent | Claim(fence, owner, lease) | Done(fence, result)`.

### Evidence

- Apalache inductive invariant, unbounded in fences and interleaving
  depth. Bounded at 3 and 4 owners.
- The identity-free variant: safety survives deleting every
  process-identity clause, including one identity running concurrent
  workers.
- TLC exhaustive at generation caps 2/3/4, matching independent Go and
  TypeScript bounded checkers state-for-state:

  | Generation cap | States |
  | --- | --- |
  | 2 | 584 |
  | 3 | 2,312 |
  | 4 | 6,848 |

- R4: 15,378 schedules replayed in lockstep against the Go
  implementation on embedded NATS. Harness sensitivity: 828/828
  deliberately corrupted schedules detected.

### Bounds and residuals

- The identity-free variant is the generalization argument for
  arbitrary owner counts; it is an argument, not an N-owner proof
  (ticket 013).
- The R4 sample rides on top of the exhaustive small-scope core; the
  count is the bridge to the binary, not the proof.
- Gap, being closed: the proof artifacts live in `.reference/`, an
  untracked predecessor repository that is absent from this checkout,
  so the public repository asserts this claim without shipping its
  evidence. Ticket 013 ports the specs, configs, and counterexample
  files into `verify/effector/`.

### Checkable at

[go/effector/](go/effector/) — the running code and its tests, until
ticket 013 lands the proof artifacts.

## Catalog + ingress — R2 + R4; R3 in re-proof at repaired bounds

### Claim

| Invariant | What it asserts |
| --- | --- |
| No admission on faith | every admitted frame's type digest was committed before admission |
| Convergence | equal bytes yield one fact per authority journal, any interleaving, any daemon |
| Resolution monotonicity | the resolvable set never shrinks |
| Mirror integrity | a replica holds only a prefix of its origin |

### Evidence

- R2: TLC 2.19, bounds 2 daemons / 3 values / 2 creators / data cap 2:
  12,707,989 distinct states to closure, depth 24. All four invariants
  held. Four sabotaged variants were each refuted; traces committed:

  | Sabotaged variant | Refuted at depth |
  | --- | --- |
  | blind ingress | 2 |
  | asserted identity | 3 |
  | forged mirror | 4 |
  | resetting mirror | 5 |

- **R4 against the coarsened wire refinement (CreateAtomic); the
  split-CAS branch's conformance is ticket 012's obligation.** TLC
  checked that every coarse atomic create is a legal uninterrupted
  split Begin;Finish trace (or the resolving Begin's stutter) at the R2
  domains: 281,269 distinct wire states to closure, depth 17. The
  faithless bridge control violated `AtomicRefinement` at depth 2.
  This is the named map by which the split model's R3 safety transfers
  to the public wire model.
- R4 binary evidence: three directed schedules plus 128 deterministic
  depth-24 uniform random walks, 131 schedules / 3,079 steps total,
  replayed against fresh real protod instances over embedded NATS with
  **zero divergences**. Before that honest run, the tagged
  asserted-identity daemon was caught and **131/131** corrupted
  expected-state schedules diverged. Coverage: 1,077 raw model states
  (0.008474984% of the 12,707,989-state R2 closure), 3/3 coarse action
  disjuncts, 5/5 semantic branches.

### Bounds and residuals

- R3 — IN RE-PROOF, claim held (external review C4, 2026-08-13): the
  original run's induction hypothesis was generated at catalog `Gen(2)`
  while reachable IndInv states have catalog length 3, so consecution
  and action safety were discharged over a strict subset; the
  state-safety obligation was additionally a tautology (now a labeled
  drift tripwire). The R4 merge also briefly broke Apalache
  re-checkability (untyped accessors; FINDING-R3-001) — repaired with
  certified-inert type annotations, so the obligations run at HEAD
  again. The repaired hypothesis (catalog `Gen(3)` = the exact natural
  maximum; mirror/creators above theirs; data at a written cutoff
  argument with an empirical insensitivity control) is committed in
  `CatalogInd.tla` with its bounds stated as part of the claim;
  obligations 1 (base) re-verified NoError; consecution and action
  safety plus both negative controls are re-running on two platforms
  (macOS at the argued bounds, Windows independently at wider bounds).
  This entry upgrades to a claim only when those verdicts land. The
  wire-refinement transfer above inherits this status until the
  re-proof lands.
- Specificity caveat on the R2 controls (external review,
  FINDING-R3-EVIDENCE-002): the forged-mirror trace violates two other
  laws besides the one checked, so "exactly its dropped law" is not yet
  licensed for every control; per-clause controls are in flight on the
  hardening lane. A bounded check certifies only its bounds.
- Bridge instrument note (FINDING-BRIDGE-001, disposition
  operator-ratified): the action property can only check the CREATING
  half — `[][_]_vars` discharges stuttering steps, so the resolving
  half is checked by the state invariant `ResolvingCreateAgrees`
  (sensitivity control: a stutter-faking create result, caught at depth
  2). The binary lockstep layer was never affected: both no-op branches
  are driven in the corpus with post-state comparison.
- Model abstractions, stated: digests are modeled as the identity
  function on values (content addressing plus the collision-resistance
  assumption below); the harness maps those values to real derived
  digests. The resolve index is a definition (a pure fold of the
  journal); R4 samples that abstraction against state extracted through
  the narrow writ — the client's three-verb capability set (read /
  publish / request).
- R4's `MirrorAdvance` is a named re-create-and-project substitute
  while replica roles are unbuilt. It exercises derivation and union
  resolution, but not ADR-0009 origin-position copy, prefix
  preservation, replica read-only enforcement, lag transport, or
  authority/mirror separation.

### Checkable at

[verify/catalog/](verify/catalog/) (spec, configs, counterexample
traces, run record) and [proto/go/catalogr4/](proto/go/catalogr4/)
(executable oracle and driver).

## Journal and chain walls — R0/R1, model pending

### Claim

TypeScript and Go implementations of the stream algebra take equal
inputs to byte-identical digests; the journal's verify-on-read detects
tampering.

### Evidence

- R0: frozen fixture walls ([fixtures/](fixtures/)), generated once by
  the Go side, recomputed by both sides forever.
- R1: property and fuzz tests ([go/stream/](go/stream/)).
- Empirical crash evidence: fleet runs under kill-9 storms and cold
  restarts with independently verifiable bundles
  ([docs/gauntlet/](docs/gauntlet/)).

### Bounds and residuals

- Divergence probes are owed per ADR-0007 where domains exceed the
  fixtures.
- No dedicated model of CAS-append + crash recovery yet; the catalog
  model embeds an abstract CAS. Ticket 012 gives the journal its own
  model gate.

### Checkable at

[fixtures/](fixtures/), [go/stream/](go/stream/), and
[docs/gauntlet/](docs/gauntlet/).

## Schema identity — interim, greenfield build in progress

### Claim

Interim law only: a type's identity is SHA-256 over its submitted
canonical bytes; the daemon refuses any digest it cannot re-derive.

### Evidence

The flb.type.v0 grammar — a tagged union of node kinds, in Effect terms
a `Schema.Union` of tagged structs — and both codecs are pinned by a
frozen fixture ([proto/wire/fixtures/](proto/wire/fixtures/)).

### Bounds and residuals

Byte-coarse identity is a stated limitation; the owned encoding with
ratified semantic laws is ticket 004.

### Checkable at

[proto/wire/fixtures/](proto/wire/fixtures/).

## RFC 8785 canonical JSON — R1 differential

### Claim

`packages/core` and `go/canonical` either refuse the same input byte
stream or emit byte-identical RFC 8785 output. Their constrained
decoders accept exactly one valid UTF-8/I-JSON value, reject duplicate
member names after unescaping, reject lone surrogates and non-finite
binary64 values, and share a 256-container nesting bound.

### Evidence

- Identity-domain closure (2026-08-13): chain-entry identity refuses
  invalid UTF-8 and unpaired surrogates in BOTH runtimes, and refuses
  sequence positions outside JavaScript's exact-integer range; a
  shared frozen vector proves the Go and TypeScript refusal domains
  agree, including the accepted 2^53-1 edge. Checkable at:
  [go/canonical/probes/](go/canonical/probes/) (the two-runtime gate
  and its retained red finding) plus the entry-refusal suites in both
  languages.
- Independent oracle: all 26 IEEE-754 rows from RFC 8785 Appendix B are
  committed with provenance in
  [fixtures/jcs-rfc8785.json](fixtures/jcs-rfc8785.json) and checked by
  both implementations.
- Normal gates: Bun fast-check runs 160 generated values and 160
  arbitrary byte streams at recorded seeds, while a persistent Go probe
  evaluates every candidate and every shrink. Go runs 160 deterministic
  PCG cases, the shared sharp corpus, and every native-fuzz seed
  against a persistent Bun probe
  ([packages/core/test/jcs.differential.test.ts](packages/core/test/jcs.differential.test.ts),
  [go/canonical/differential_fuzz_test.go](go/canonical/differential_fuzz_test.go)).

### Bounds and residuals

- Corpus domain: ±(2^53) neighbors, negative zero, 1e21 and
  small-exponent boundaries, long mantissas, control characters,
  surrogate pairs and lone escapes, duplicate keys, invalid UTF-8,
  trailing values, and depths on both sides of the shared limit. A
  green bounded run certifies this corpus and its generated sample, not
  all byte streams.
- Long local variants are documented in [README.md](README.md). Native
  Go fuzz failures enter Go's minimized corpus; fast-check failures
  report the minimized bytes, seed, replay path, and shrink count
  before stopping.

### Checkable at

[fixtures/jcs-rfc8785.json](fixtures/jcs-rfc8785.json),
[packages/core/test/jcs.differential.test.ts](packages/core/test/jcs.differential.test.ts),
[go/canonical/differential_fuzz_test.go](go/canonical/differential_fuzz_test.go),
and [go/canonical/probes/](go/canonical/probes/).

## Tracer conformance — R0/R1, single daemon

### Claim

The daemon's laws (W1–W10) are each witnessed by black-box tests over
NATS subjects.

### Evidence

60 TypeScript tests, the Go conformance suite, all nine refusal kinds,
restart survival ([proto/](proto/)).

### Bounds and residuals

Unexercised, by stated scope: replica roles (ratified in ADR-0009,
unbuilt), union resolution across daemons, ingress payload conformance
(admission checks identity resolution only — the contract says so).

### Checkable at

[proto/](proto/).

## Standing assumptions

1. SHA-256 collision resistance. Identity claims reduce to it.
2. RFC 8785 canonicalization agreement across implementations — tested
   by the R1 differential lane above, the official Appendix B corpus,
   and the older golden conformance fixture
   ([fixtures/golden-conformance.json](fixtures/golden-conformance.json)).
3. JetStream properties at the pinned versions in the single embedded,
   file-backed, R1 server configuration. The executable gate is
   [go/substrate/assumptions_test.go](go/substrate/assumptions_test.go),
   one named test per assumption:

   | Property | Test |
   | --- | --- |
   | Atomic create-if-absent | `TestAtomicCreateIfAbsent` |
   | Revision CAS | `TestRevisionCAS` |
   | Linearizable reads | `TestLinearizableReads` |
   | Terminal immutability | `TestTerminalImmutability` |

   The fourth property is enforced only inside the certified capability
   envelope: application credentials are refused KV `Delete` and
   `Purge`, and the same gate scans production effector/daemon source
   for destructive register call sites. Its required negative control
   proves privileged admin credentials can still erase `Done`, after
   which `Lookup` reports `Unclaimed` and a new fence-1 claim succeeds.
   Admin erasure is therefore a stated residual — not prevented or
   detected today;
   [ticket 017](docs/map/tickets/017-done-outlives-the-register.md)
   adds hash-chained outcome facts so it becomes detectable. Source
   context remains in
   [the source-verification report](docs/research/2026-08-12-jetstream-guarantees-source-verified.md).
   `protod.Acquire` enforces the envelope: application credentials have
   only the three-verb writ, and clustered JetStream, R>1 KV buckets,
   or in-memory storage refuse before startup with a typed lifecycle
   error naming the uncovered assumption
   ([proto/go/protod/lifecycle_test.go](proto/go/protod/lifecycle_test.go)).
4. Safety only. No liveness claim is made anywhere: leases, retries,
   and progress under contention are liveness machinery and are
   untested formally.

## Stated limitations, ahead of their surfaces

Recorded 2026-08-13 so no future surface overclaims (evidence:
docs/research/2026-08-13-language-ontology-frontier.md):

- Positive-example-only grammar authoring is unlearnable in principle
  (Gold 1967); any NL→DSL surface therefore requires the refusal
  round-trip — the teaching loop is load-bearing, not UX.
- Grammar-constrained decoding distorts an LLM's conditional
  distribution (Grammar-Aligned Decoding, NeurIPS 2024): forced
  validity is a syntactic claim, never a semantic one.
- The semantic gap — whether an induced grammar/ontology means what
  the description meant — is irreducible; foldlab's claim is
  recomputability of what was built, never fidelity to intent.
- Exploration bounds are minimum-cardinality, not small: the
  canonical basis can be exponential and next-question computation is
  coNP-complete; budgets and partial-basis refusals are the honest
  interface to that edge.

## How to refute a claim

Refutation is a contribution, and the machinery ships in the repo.
Each kind of claim falls to one kind of artifact:

| Claim kind | What refutes it |
| --- | --- |
| Wall claim | a byte: inputs on which the two implementations disagree |
| Model claim | a trace: a TLC run violating a named invariant at the stated bounds (the sabotaged variants show what a violation looks like) |
| Conformance claim | a divergence: a schedule on which the binary and the model disagree |

Counterexamples are kept and committed — the repository already
carries five of its own.
