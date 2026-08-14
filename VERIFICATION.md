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
| KV meaning fold — combine and join | R0/R1 (TypeScript); R0 (Go) | **Claimed** at R0 in both languages and R1 in TypeScript; the join is TypeScript only | [go/stream/combine_test.go](go/stream/combine_test.go), [packages/core/test/stream.combine.test.ts](packages/core/test/stream.combine.test.ts), [packages/core/test/kvSemilattice.test.ts](packages/core/test/kvSemilattice.test.ts) |
| Schema identity | interim law only | **Interim**; the owned encoding is ticket 004 | [proto/wire/fixtures/](proto/wire/fixtures/) |
| RFC 8785 canonical JSON | R1 differential | **Claimed** for the stated corpus and its generated sample | [fixtures/jcs-rfc8785.json](fixtures/jcs-rfc8785.json), [packages/core/test/jcs.differential.test.ts](packages/core/test/jcs.differential.test.ts), [go/canonical/differential_fuzz_test.go](go/canonical/differential_fuzz_test.go) |
| Tracer conformance (W1–W10) | R0/R1 | **Claimed**, single daemon | [proto/](proto/) |
| Refusal projection walls (W-COHERENCE, W-SCOPE) | R2 (TLC) + model-level R5 (Lean) | **Claimed** for the repaired rule; the union-refusal mislocation it refutes is **fixed and merged** on `main` (`ab77d6bfc`) — the TLC controls now stand as regression guards over the historical constructor | [verify/implication/](verify/implication/) |
| IR denotational laws (brand/check invisibility, union extensionality, sort-invariance, resolver monotonicity, C5 round trip) | model-level R5 (Lean) | **Claimed** at the model level; code-model correspondence unproved | [verify/ir/](verify/ir/) |
| Create-pipeline snapshot law | R2 (TLC) | **Claimed** for the snapshot rule; the head-read defect it refutes is **fixed and merged** on `main` (`3aebd2ba9`) — the shipped control is now a regression guard; orphan-fact crash residual model-checked (quiescence-guarded) | [verify/pipeline/](verify/pipeline/) |
| Workflow replay soundness (determinacy, schedule irrelevance, replay = execution) | model-level R5 (Lean) + R2 (TLC protocol) | **Claimed** for static DAGs with deterministic bindings; the unguarded (faithless) runner is **REFUTED** in both instruments | [verify/replay/](verify/replay/) |

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

  The model rejects any configured daemon, creator, or value-domain size
  outside `1..4` before state generation. Three independent overrun configs
  are part of the gate, and the natural catalog bound is checked against
  `Cardinality(Vals)`, the domain actually explored.

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
- Bound honesty: the R2 and R3 configurations are inside the model's explicit
  `1..4` daemon/creator/value ceilings. Widening a claim past those ceilings
  requires widening the literal domains; merely raising a config constant is
  mechanically rejected.
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
tampering. The daemon read path is the per-message JetStream management API,
pipelined in a bounded window and verify-on-read folded strictly in sequence
order; it does not enable the direct-get surface.

### Evidence

- R0: frozen fixture walls ([fixtures/](fixtures/)), generated once by
  the Go side, recomputed by both sides forever.
- R1: property and fuzz tests ([go/stream/](go/stream/)).
- R1: journal cursor controls reject forged genesis, tail, and future anchors
  against stored entries, including a causal append-after-refusal check
  ([go/journal/read_cursor_verification_test.go](go/journal/read_cursor_verification_test.go)).
- R1: the public TypeScript reader rejects an evidence-free cursor against a
  real daemon and rejects valid-other-journal plus invalid-journal reply
  substitutions over an independent real NATS responder. The stdio MCP wall
  requires the same locally verified cursor and excludes the raw daemon head
  ([proto/ts/test/client-read-verification.test.ts](proto/ts/test/client-read-verification.test.ts),
  [proto/ts/test/mcp.test.ts](proto/ts/test/mcp.test.ts)).
- R0: the Effect Schema transport wall consumes four live Go-origin
  rows: two non-ASCII text payloads reproduce the Go-computed heads,
  while raw `ff` and `fe` payloads have distinct Go heads and both
  refuse as typed schema failures instead of decoding to U+FFFD.
- Empirical crash evidence: fleet runs under kill-9 storms and cold
  restarts with independently verifiable bundles
  ([docs/gauntlet/](docs/gauntlet/)).
- The retained sequential read and bounded pipelined read return identical
  entries, entry digests, and cursor over the frozen conformance corpus
  (`go/journal/hardening_internal_test.go`). Count-10 before/after throughput
  and the durability price are recorded in
  `docs/bench/2026-08-13-task-19-nats-hardening.md`.

### Bounds and residuals

- Divergence probes are owed per ADR-0007 where domains exceed the
  fixtures.
- The schema wall's text face is deliberately narrower than canonical
  stream events: stream events carry arbitrary payload bytes, while
  `WireEvent` admits Unicode-scalar UTF-8 text only, within the
  canonical u16/u32 field lengths and JavaScript's safe sequence range.
  The live corpus is four directed rows, not an exhaustive UTF-8 proof.
- FINDING, reported and not repaired: the pinned runtime's fatal
  `TextDecoder` strips a leading UTF-8 BOM by default, so Go-origin
  payload bytes `ef bb bf` and empty bytes have distinct Go heads but
  decode to the same `WireEvent`. The opt-in red witness and choices
  are in `packages/core/FINDING-SCHEMA-BOM-001.md`.
- No dedicated model of CAS-append + crash recovery yet; the catalog
  model embeds an abstract CAS. Ticket 012 gives the journal its own
  model gate.
- The new read controls cover one embedded, file-backed daemon and two exact
  attribution corruptions; they do not claim remote-silence diagnosis or
  multi-daemon journal ownership.
- G1's exported bundles prove record consistency, not that the recorded kills
  physically happened. Storm truth is attested by the coordinator's
  in-concert observation, and the fencing evidence assumes effect bodies write
  their ledger line before returning.
- G1 covers one choreographed schedule family: exactly 25 kills, 25 steals,
  25 duplicates, and 5 restarts per final bundle, timed at the hardest crash
  window. It does not establish stochastic-schedule, partition, or clustered
  behavior.
- `crash-durable` acknowledgements cover process/kill-9 failure: acknowledged
  bytes may still be only in kernel buffers, and the pinned server's failsafe
  sync is approximately two minutes. Pull-the-plug/power loss is explicitly
  **not covered**. `power-durable` sets pinned `server.Options.SyncAlways` and
  pays the measured synchronous-write price in the benchmark record above.
- JetStream API internal-queue overflow can still drop requests without an
  error reply. The broker warning is no longer suppressed: protod logs it with
  a monotone `ipq_drops_total`, but that is post-loss evidence, not recovery.
  Operators must collect stderr. The listener impersonation residual is
  discharged for the embedded daemon: every TCP client authenticates with a
  fresh per-Acquire application credential and receives a private NATS account,
  while the distinct in-process credential remains internal.

### Checkable at

[fixtures/](fixtures/), [go/stream/](go/stream/),
[packages/core/test/schema.wall.test.ts](packages/core/test/schema.wall.test.ts), and
[go/journal/hardening_internal_test.go](go/journal/hardening_internal_test.go),
[go/effector/hardening_internal_test.go](go/effector/hardening_internal_test.go),
[proto/go/protod/hardening_test.go](proto/go/protod/hardening_test.go),
[the Task 19 benchmark record](docs/bench/2026-08-13-task-19-nats-hardening.md),
and [docs/gauntlet/](docs/gauntlet/).

## KV meaning fold — combine and join — R0/R1 (TypeScript), R0 (Go)

### Claim

The last-write-wins KV fold has a `combine`: cut a history anywhere,
fold the pieces independently, combine them, and the answer is the
answer the whole history gives. Go and TypeScript both reach the frozen
fold-state digest that way.

On an enriched state that keeps each event's identity coordinate, the
same fold is a join-semilattice — idempotent, commutative, associative —
and projecting it back onto the shipped `KVState` agrees with the
shipped left fold on histories that are strictly increasing in witness
order with distinct coordinates.

### Evidence

- R0: every split point of the frozen merged corpus, folded in pieces
  and recombined, reproduces `foldStateDigest`
  (`bb947adc8d4623e9340ae0932ac1f7e65dbae211b991b11eaf24817dbe7dafe1`)
  in both languages, and so does every three-way split under either
  grouping. `fixtures/stream-wall.json` regenerates byte-identically.
- R0: the enriched fold, projected, reaches the same frozen digest on
  the same corpus — the corpus is witness-ordered.
- R1 in TypeScript: generated property suites for identity, associativity, the
  concatenation homomorphism, arbitrary split points, and — for the
  join — idempotence, commutativity, associativity, permutation
  invariance, and the projection law. The join generators include both
  sequence boundaries and stream-id prefixes; a separate generated refusal
  corpus includes NaN, infinities, fractions, negatives, and the first unsafe
  integer.
- Negative controls, each refuted on exactly the law it drops:
  `combineKV` fails commutativity and idempotence with minimized
  counterexamples; ordering the witness `(stream, seq)` instead of
  `(seq, stream)` moves the frozen digest to `910950be...`; dropping sequence
  admission makes the minimized NaN join non-commutative.
- The generated law suite now derives commutativity and idempotence
  from a per-algebra claim, and refuses a false one: a last-write-wins
  register claiming commutativity fails that law while passing every
  law it does hold.

### Bounds and residuals

- `combineKV` is a monoid and nothing more. It is NOT commutative and
  NOT idempotent, so it licenses parallel replay of an ordered history
  and does not license coordination-free federation. The design insight
  that one operation could be both is refuted: an unconditional
  concatenation homomorphism plus commutativity would force the fold to
  be order-insensitive, which last-write-wins is not, by construction.
- Go's combine evidence stops at R0: its combine tests are hand-written
  examples and frozen-wall checks, with no generated Combine property or fuzz
  suite. The R1 claim belongs only to TypeScript.
- The join-semilattice is TypeScript only. There is no Go twin and
  therefore no cross-language wall for it; its one wall-anchored claim
  is the projection, because the digest that has to come back was
  frozen by Go.
- The witness sequence domain is `0..Number.MAX_SAFE_INTEGER`. Both folded
  events and structurally supplied join states refuse other numbers as typed
  data before comparison. This is not a u64 claim: current Go journal cursors
  use platform `int`, while chain identity independently refuses above the same
  exact-integer boundary through `canonical.EntryDigest`.
- The projection law holds only on witness-ordered histories with
  distinct coordinates. A two-event counterexample off that domain is
  pinned, as is the count divergence under re-delivery.
- The join's refusal channel does not associate: with two states
  disagreeing at one coordinate and a third holding a later write for
  the same key, one grouping refuses and the other succeeds. The laws
  are therefore stated over the witness-consistent domain.
- The enriched state is O(history) where `KVState` is O(distinct keys),
  because reproducing `count` idempotently requires remembering which
  coordinates were absorbed rather than how many.
- FIXED by Task 30 Addendum 1: `ApplyMerge`'s duplicate refusal is a
  function of its input in both languages. It lists every duplicate-bearing
  `(source, seq, indexes)` tuple, sorted by UTF-8 source bytes and sequence.
  The shared M1 vector includes multiple sources, multiple sequences, more
  than two indexes at one coordinate, and a Unicode pair that distinguishes
  UTF-8 order from UTF-16 order; Go's randomized map walk and TS insertion
  order both reproduce the same value.
- Answered, not a finding: the dense and sparse indexing paths inside
  `ApplyMerge` agree. A duplicate coordinate cannot survive the density
  check, so the fast path never sees one.
- Law-scope decision: the short-lived universal wording “packages/core is
  total by refusal” was intentionally narrowed to the exact walled boundaries
  named in [packages/core/CONTEXT.md](packages/core/CONTEXT.md). `kvStep`
  deliberately forgives an excluded payload in the meaning fold, lower-level
  canonical writers retain documented range errors, and the genuine-
  declaration re-host remains a pinned gap; a package-wide claim would
  therefore be false.

### Checkable at

[go/stream/combine_test.go](go/stream/combine_test.go),
[go/stream/merge_paths_test.go](go/stream/merge_paths_test.go),
[go/stream/merge_refusal_test.go](go/stream/merge_refusal_test.go),
[packages/core/test/stream.combine.test.ts](packages/core/test/stream.combine.test.ts),
[packages/core/test/stream.merge-refusal.test.ts](packages/core/test/stream.merge-refusal.test.ts),
[packages/core/test/kvSemilattice.test.ts](packages/core/test/kvSemilattice.test.ts),
and [packages/core/test/fold.laws.test.ts](packages/core/test/fold.laws.test.ts).

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
NATS subjects. Its twelve refusal kinds are total over two ontological sorts:
structural refusals reproduce unchanged across catalog heads; absence
refusals are repealed when the missing evidence lands. Every daemon refusal
persists the sort on the wire, and the complete kind-to-sort manifest is
frozen under a grammar digest so archived values are not silently re-sorted.

### Evidence

The TypeScript and Go conformance suites, all twelve refusal kinds, restart
survival, and the issue #57 shared reply corpus ([proto/](proto/)). The corpus
contains twelve fixed create/admit/refusal values: both decoders agree on
three admissions and nine rejections spanning recursive excess fields,
daemon `local:true` costumes, bad digest/head coordinates, and negative
sequence positions. Client controls additionally execute journal attribution,
claimed-sequence/head verification, repair-bearing local refusals, injective
MCP derivation, and owned send-ordered transcripts against real or controlled
daemon seams.
The request-admission control submits duplicate member names, a lone surrogate
escape, and raw invalid UTF-8 through a real NATS `type.create` request. Each
must return `malformed` before mutation, while the existing hostile-formatting
control proves lawful alternate formatting retains the same identity.
The shared combined-grammar refusal-sort vector has an independently recomputed
manifest digest; per-kind structural reproducibility and absence
repealability laws, strict decoder controls, and restart survival pin the
persisted classification.

### Bounds and residuals

Unexercised, by stated scope: replica roles (ratified in ADR-0009,
unbuilt), union resolution across daemons, ingress payload conformance
(admission checks identity resolution only — the contract says so). The reply
wall is corpus-sized accept/refuse equivalence for the create/admit/refusal
branches, not exhaustive equivalence over all JSON or every future reply kind.
The request-byte claim is likewise bounded to the three sharp constrained-
decode classes plus the existing generated and differential canonical corpus;
it is not an exhaustive proof over all byte strings.

### Checkable at

[proto/](proto/).

## Refusal projection walls — R2 (TLC) + model-level R5 (Lean); the refuted constructor is fixed on `main`

### Claim

The union-member-uniqueness mislocation this development refutes is
**fixed and merged** (`ab77d6bfc`, ancestor of HEAD): the constructor
that reported the duplicate's index in the **sorted local copy's**
coordinates as a path into the **submitted** term (`Path`/`Got`
contradicting each other) is gone; the shipped walk now reports
`submittedIndex`/`submittedValue` (`proto/go/protod/walk.go:174-188`).
The historical defect was established three independent ways — a
live-daemon execution probe (research note §5), a Lean theorem over the
old constructor (`shipped_incoherent`, witness `[1,1,0]`), and a TLC
trace found without the witness (`<<0,1,0>>`, committed as `*.cex.txt`).
Those controls now stand as **regression guards** over the historical
rule, not as descriptions of shipped code.

What is claimed positively: **the walls are satisfiable by
construction** — a repaired projection rule (report the least submitted
index having an equal earlier member, submitted member as `Got`)
satisfies **W-COHERENCE** and **W-SCOPE** for every submission, proved
in Lean (`fixed_coherent`, `fixed_in_scope`) at the model level and
model-checked at the TLC caps. **Caveat, surfaced by adversarial review
(2026-08-14) and machine-checked:** the *shipped* Go rule is a
**different function** from the Lean `fixed` — it sorts by
`(canonicalBytes, submittedIndex)` and reports the later element of the
first canonical-byte-adjacent duplicate pair, whereas `fixed` reports
the least-index later-twin (they diverge, e.g. submitted `[b,s,s,b]`:
Lean path 2, Go path 4). Both satisfy both walls, but only the Lean
rule is proved here; the *shipped* rule is walled by the Go conformance
tests (`create`/union coverage), not by this Lean development. The
defect is **report-only**: both rules refuse exactly the
duplicate-bearing submissions (`WDecision`, checked at bounds).

Alongside, the collapse lemma (`QTree.collapse`): pair-query evidence
is redundant up to a uniform 2× simulation. **Precise hypothesis
(review-clarified):** the operative premise is not decidability alone
but that the teacher's pair answer **factors through the two membership
bits**, `g(A x, A y)`, and the learner knows `g` — decidability makes
queries answerable, the factoring is what forces redundancy. ICE evades
the lemma precisely because its teacher holds a relation *not* so
factorable. This is the formal ground for freezing
`flb.certification.v0` without ICE-style implication fields.

### Evidence

`verify/implication/run.sh` — the five-verdict gate: Lean `lake build`
(no `sorry`, core only); TLC clean config; two faithless controls
(`Rule = "sorted"`, the constructor as shipped) each refuted on exactly
its named invariant with traces committed; one independence control
passing `WDecision` under the shipped rule.

### Bounds and residuals

TLC caps: submissions of length ≤ 4 over two member ranks, exhaustive
below the caps (31 submissions, 93 states, depth 2). Lean's fixed-rule
walls and the collapse lemma are unbounded but **model-level**:
code-model correspondence with `walk.go` is empirical (the execution
probe), not proved. Decision equivalence (`WDecision`) has no unbounded
proof yet — it needs sorted-permutation lemmas, stated as the next
rung in the README. The walls cover the union-uniqueness law; the
other three shipped relational laws (`optional` declared / unique /
ordered) project coherently today because their loops never reorder,
and are covered by the model only insofar as their shape matches.

### Checkable at

[verify/implication/](verify/implication/) (Lean project, spec,
configs, committed counterexample traces, run record in README) and
[docs/research/2026-08-14-implication-refusals-formalized.md](docs/research/2026-08-14-implication-refusals-formalized.md)
(the definitions the machines check).

## IR denotational laws — model-level R5 (Lean)

### Claim

`flb.type.v0` stated once as an algebraic type (`TyX H`; the hole is a
type parameter, so the closed and authoring grammars are one definition
at two instantiations) with a denotational semantics `Conforms ρ t v`,
and the estate's prose laws about meaning proved over it: brands are
denotationally invisible (the fiber theorem's premise); a ref means
exactly its resolution; union meaning is a property of the member set,
so the canonical member sort — under any comparator — never moves the
denotation (identity moves, meaning does not); catalog growth never
invalidates conformance (presence-of-evidence monotone, denotationally);
and the C5 embed/close round trip. Structs are denotationally closed,
derived from the shipped json-schema target (`additionalProperties:
false`). No `sorry`, core Lean only.

**Scope of the "invisible" laws (review-clarified, 2026-08-14).**
`Conforms` models the **identity/daemon semantics** — what the digest
commits to and what the certifier admits, where the daemon validates no
payloads (`proto/SPEC.md:83`, "checks declared-metadata only"). At that
level brands *and* checks are invisible, and `brand_invisible` holds
across every codegen target. **`check_invisible` does NOT hold of the
validation semantics**: two of the three codegen targets emit real
refinements from a check (`proto/ts/src/codegen.ts:97-105` maps six
check names to Effect-Schema refinements; `:268/:272` emit
`minLength`/`pattern` into JSON Schema), so `check(string, minLength≥1)`
and `string` accept *different* value sets under a generated validator.
The Lean law is therefore a **modeling stipulation of the identity
semantics**, not a claim that a generated codec ignores checks. The
`Semantics.lean` `check_invisible` docstring records this. `brand`,
`check`, `deferred_blame` and the two-fuel brand/check laws are
near-definitional (they unfold the `Conforms` clause); the substantive
inductive laws are `union_extensional`, `sort_preserves_meaning`,
`resolver_mono`, and `ref_unfold`.

### Evidence

`verify/ir/run.sh` (= `lake build`), Lean 4.33.0.

### Bounds and residuals

Model-level: the Lean grammar is the reference the Go/TS restatements
should mirror (architecture audit §3); no correspondence proof ties it to
`walk.go` or `codegen.ts`. Numerics abstracted to `Int`; check args to
the check name; ref resolution fuel-indexed with DAG-depth sufficiency
noted, not proved. Well-formedness residual laws and the parse theorem
are the named next rungs in the README.

### Checkable at

[verify/ir/](verify/ir/) and
[docs/research/2026-08-14-architecture-audit.md](docs/research/2026-08-14-architecture-audit.md) §5.

## Create-pipeline snapshot law — R2 (TLC); the head-read defect is fixed on `main`

### Claim

The snapshot law — every `created:true` reply names the head its facts
were read under; for `type.create`: `seq` addresses the op's fact,
`head = seq + 1` (a model coordinate; on the wire the head is a digest,
so this arithmetic is not implementation-checkable — see bounds), `head`
addresses the op's bridge — holds for the repaired rule (reply captured
inside the critical section, the `frontierSnapshot` pattern) at the gate
bounds, with crashes enabled. The head-read defect it refutes is **fixed
and merged** (`3aebd2ba9`): the shipped `serveCreate` no longer reads
`Head()` after the lock, it forwards `certificate.CatalogHead` captured
under `c.mu` (`catalog.go:246`). The `Rule = "shipped"` control models
the pre-fix `dispatch.go:109` and now stands as a **regression guard**.
The orphan-fact residual (crash between fact and bridge leaves a durable
fact, no bridge, dropped reply — `catalog.go:232-236`) is model-checked
under a **quiescence-guarded** invariant (`NoOrphanFact` refutes only
when a *terminal* `crashed` op has a factless bridge; a mutation test
confirms deleting `CrashInLock` makes the control pass, so the crash
action is load-bearing — this repairs a review finding that the earlier
unguarded invariant fired on a benign in-lock transient). **Caveat:**
the model's orphan is permanent, whereas shipped protod repairs a
missing bridge on retry (`catalog.go:240-243`), so the model is stricter
than the code here. Even the shipped rule never replies without a
durable bridge — the defect was head provenance only.

### Evidence

`verify/pipeline/run.sh` — four verdicts (clean, two refutation
controls with committed traces, one independence control).

### Bounds and residuals

Two concurrent creates, certification always succeeds, no
convergence/duplicate path, head abstracted to journal position. The
spec is the ratification artifact for Task 32's `catalog_head`
provenance; the journal gate (ticket 012) and replay soundness are the
named next increments.

### Checkable at

[verify/pipeline/](verify/pipeline/) (spec, configs, committed traces,
run record in README).

## Workflow replay soundness — model-level R5 (Lean) + R2 (TLC)

### Claim

For a static workflow DAG (topological numbering; labels-as-identity,
the ratified v0 position) with deterministic bodies, under the register
step axioms (first commit wins, commits only of ready nodes, duplicate
commits absorbed, crashed attempts invisible): every committed value is
the denotation (`exec_coherent`), any two executions agree on everything
both committed (`determinacy`), any two schedules **complete over the
same node set agree pointwise on that set** — the committed
linearization is a decision about order, never about values
(`schedule_irrelevance`; the theorem quantifies over nodes `< k` for a
completion frontier `k`, review-corrected from an unqualified "pointwise
equal") — and fold-over-Done from any reachable store reproduces the
denotation at every node — **replay is execution** (`replay_sound`). The
ready guard is load-bearing, not hygiene: without it, two schedules of a
two-node workflow commit different values at the same node, proved as a
Lean counterexample (`faithless_diverges`) and independently found by
TLC (`SpecEval` refuted). **Scope of the TLC check (review-corrected,
2026-08-14).** The bounded TLC model exercises the register protocol
shape — two workers, lease-expiry steals with fence bumps, fence-checked
commits — and mutation-testing confirms its **ready-guard** discriminator
is load-bearing (removing it makes the faithless control pass). But
`SpecEval` is **by design insensitive to the fence mechanism itself**:
because bodies are deterministic and `Done` is terminal, *who* commits
and *at which fence* cannot change *what* is committed, so removing the
fence bump or the commit-side authority check leaves the verdicts
unchanged. The fence's *safety* (no double-commit, unique terminal
outcome) is the effector's own EL laws (`go/effector`, claimed R3+R4),
**not** what this gate checks. This gate checks value-invariance under
the ready guard; it does not re-verify the register.

### Evidence

`verify/replay/run.sh` — three verdicts: `lake build` (no `sorry`, core
only), TLC clean, TLC faithless control refuted on exactly `SpecEval`.

### Bounds and residuals

Lean: model-level — the register step axioms are DISCHARGED IN PROSE by
the effector's proven laws (fence safety, unique terminal outcome), not
by a machine-checked refinement; that correspondence is the R4-style
obligation once tickets 008/020 build the engine. Dynamic control flow
is out of scope by design (choices must enter as committed facts;
design §3 staging). TLC: DAG `1 → 3 ← 2`, two workers, fence cap 3, 376
states. This entry is the pre-build license the workflow design named:
the engine may now be built against a proved contract.

### Checkable at

[verify/replay/](verify/replay/) (Lean project, spec, configs, committed
trace, run record in README) and
[docs/design/2026-08-14-workflow-authoring-and-emission.md](docs/design/2026-08-14-workflow-authoring-and-emission.md) §5.1.

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
   error naming the uncovered assumption. Each application connection is also
   isolated in a private NATS account with only the writ service-imported: a
   two-client black-box control proves an `_INBOX.>` subscription cannot read
   another client's replies or the daemon's JetStream responses, while the
   victim's own request/reply succeeds and forged inbox publication remains
   permission-refused
   ([proto/go/protod/lifecycle_test.go](proto/go/protod/lifecycle_test.go)).
   Acquisition also requires an
   explicit `crash-durable` or `power-durable` sync mode; journal and effector
   gates refuse async stream persistence and latch every pinned stream-update
   advisory after Open
   ([proto/go/protod/lifecycle_test.go](proto/go/protod/lifecycle_test.go)).
4. NATS operational census: duplicate-window metadata persists across restart,
   but journal correctness relies on expected-sequence CAS plus digest re-read;
   client pending overflow is a loud disconnect, JetStream API IPQ loss is the
   counted-log residual above, and per-stream internal queues may drop under
   burst (mostly mitigated, not eliminated, by synchronous acknowledgements);
   `journald` sets the Go runtime memory limit to 512 MiB and `protod` defaults
   to 512 MiB while its command flag may explicitly override that value (direct
   library embedders own their process limit);
   both daemons build server options programmatically and load no config file,
   so include/file precedence is outside this envelope. Daemon-owned and bundled
   client connections have app/version/purpose names; arbitrary NATS clients are
   not required to supply one.
5. Safety only. No liveness claim is made anywhere: leases, retries,
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
