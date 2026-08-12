# P0 — Decider

Status: **SPEC RULED — climbing.** The law suite in `packages/kernel/test/` is
the fitness function. This document and that suite are coordinator-owned: an
implementing agent MUST NOT edit them. If a law appears wrong or
unimplementable, stop and report the defect — do not route around it.

## Definition

A pure, total, zero-I/O state machine over schema-governed commands and events,
plus the left fold that is the ONLY meaning-maker for state, plus canonical
codecs for all three sorts. State is derived, never authoritative. No log, no
hash chain, no broker, no Effect runtime, no async appears in the primitive.

The interface (coordinator-owned, `packages/kernel/src/decider.ts`):

```ts
import * as Schema from "effect/Schema"

export interface Decider<C, E, S> {
  readonly name: string
  readonly command: Schema.Codec<C>
  readonly event: Schema.Codec<E>
  readonly state: Schema.Codec<S>   // required: byte equality of encoded state
                                    // is the suite's ONLY equality judgment
  readonly initialState: S
  readonly decide: (command: C, state: S) => ReadonlyArray<E>
  readonly evolve: (state: S, event: E) => S
  readonly isTerminal?: (state: S) => boolean
}

// THE REFERENCE ORACLE. Every other way of maintaining state is compared to it.
export const replay: <C, E, S>(d: Decider<C, E, S>) =>
  (s: S, events: ReadonlyArray<E>) => S
```

Why the state codec is in the interface: the suite's equality judgment is byte
equality of canonical encodings, which is deliberately the same judgment P1's
content addressing will hash. P0's equality IS P1's identity.

## Canonical encoding (`packages/kernel/src/canonical.ts` — to implement)

```ts
export const encode: <A>(schema: Schema.Codec<A>, value: A) => string
export const decode: <A>(schema: Schema.Codec<A>, bytes: string) => A  // may throw: boundary
export const digestHex: (bytes: string) => string                      // sha256, lowercase hex
```

Rules, pinned:

- Payload domain is a JSON-safe subset: no `undefined` values (absent, never
  present-as-undefined), no `NaN`, no `-0`, no non-finite numbers, no
  `Map`/`Set`, no bigint at P0.
- Object keys are serialized in code-unit sorted order at every depth.
- Numbers serialize in the shortest round-trip form (`JSON.stringify` of a
  finite JS number is acceptable and is the ruling).
- Strings are serialized as JSON strings (no unicode normalization is applied;
  the value domain is what the schema decoded).
- No whitespace. The encoding of a value is a single deterministic line.
- `digestHex` = SHA-256 over the UTF-8 bytes of the encoding, lowercase hex.
  `node:crypto` (`createHash("sha256")`) is RULED acceptable (Bun implements
  it). Collision resistance is an assumption of the ladder, not a testable law.

## The incremental machine (`packages/kernel/src/incremental.ts` — to implement)

```ts
export interface Machine<C, E, S> {
  readonly state: () => S
  readonly command: (c: C) => ReadonlyArray<E>  // emitted events, already folded in
}
export const makeIncremental: <C, E, S>(d: Decider<C, E, S>) => Machine<C, E, S>
```

The machine maintains state incrementally (it MUST NOT re-fold from genesis on
every command — it is the state-caching implementation L2 exists to catch).

## The catalog (`packages/kernel/src/catalog.ts` — to implement)

```ts
export interface CatalogEntry {
  readonly name: string
  readonly decider: Decider<unknown, unknown, unknown>
  // pure seeded command generator: same seed -> same command, total on all int32 seeds
  readonly genCommand: (seed: number) => unknown
}
export const catalog: ReadonlyArray<CatalogEntry>  // exactly the six below, these names
export const randomDecider: (seed: number) => Decider<number, number, number>
```

Required entries, by `name`:

1. `counter` — commands Increment/Decrement, events Incremented/Decremented,
   state a bounded int. Commutative; exercises determinism and codecs.
2. `set-union` — commands Add(x), events Added(x), state a sorted array acting
   as a set. Commutative and idempotent at the state level.
3. `lww-register` — commands Write(value, stamp), events Written(value, stamp),
   state keeps the greatest stamp's value (ties: greater value string wins).
4. `bank-balance` — commands Deposit(n)/Withdraw(n), events Deposited/Withdrawn;
   a Withdraw exceeding the balance emits `[]` (rejection-as-silence is the
   ruled semantics; no throws, no negative balances ever).
5. `history-register` — state `{ len: number, digest: string }`;
   `evolve(s, e) = { len: s.len + 1, digest: digestHex(s.digest + encode(event, e)) }`;
   commands Append(payload) emit Appended(payload). Order-, omission-, and
   duplication-sensitive by construction — this instance is what gives L2/L3
   their discriminating power, and it pre-proves P1's chain shape in pure form.
6. `order-fulfillment` — the workflow-shaped instance. Commands
   PlaceOrder/ReservePayment/RecordPaymentResult(ok|failed)/Ship/Cancel; events
   with guards (e.g. Ship before payment recorded emits `[]`); explicit terminal
   states Shipped and Cancelled; `isTerminal` DECLARED (mandatory for
   workflow-shaped deciders); any command against a terminal state emits `[]` —
   the pure form of "already terminal = success".

`randomDecider(seed)`: bounded int state; `decide`/`evolve` derived from a pure
seeded hash over `(state, input)` selecting the next state and 0–3 emissions.
Pure by construction; used as an unbiased generator arm for L1–L5.

Ruled semantics (apply to every catalog entry):

- **Rejection**: an invalid-but-well-typed command emits `[]` or explicit
  rejection events — NEVER a throw. Malformed commands are excluded at the
  schema boundary before `decide` and are not `decide`'s concern.
- **Emission bound**: `decide` returns at most 8 events per command (a suite
  constraint so shrinking stays tractable, not a semantic law).
- **No command dedup in P0**: replaying a command emits again. Exactly-once is
  founded at P3 on the P1 entry digest, never on command ids inside `decide`.

## Laws

Each law is one named property test; the obligation table in the test file maps
law → test 1:1. Equality in every assertion is byte equality of canonical
encodings — `deepEqual` never appears in an assertion.

- **L1 — Determinism/purity.** For reachable `(c, s)`: two calls of
  `decide(c, s)` yield byte-identical encodings of the emission list; likewise
  `evolve(s, e)` for state encodings. Falsified by any clock, randomness,
  ambient read, or iteration-order leak.
- **L2 — Replay equivalence (the master law).** The incremental machine's state
  after any command sequence byte-equals cold `replay` of the accumulated
  emitted events from `initialState`. The oracle keeps ONLY the raw event list.
  Runs against `makeIncremental`, never against the reference reduce itself.
- **L3 — Fold segmentation (resume ≡ replay).** For reachable event sequences
  `es` and any split `k`:
  `replay(replay(init, es[0..k]), es[k..]) ≡ replay(init, es)` (byte equality).
  The universal property of foldl; the pure ancestor of P2's cursor and
  snapshot laws.
- **L4 — Totality and schema fidelity.** Driving any generated command sequence
  from `initialState`: `decide`/`evolve` never throw; every emitted event and
  every intermediate state survives encode→decode→encode byte-stably.
- **L5 — Identity-grade canonical codec.** For each codec (command, event,
  state): (a) `decode(encode(x))` re-encodes to the same bytes;
  (b) `encode(decode(b)) === b` for valid `b`; (c) INJECTIVITY: deep-equal
  values (including key-order permutations of the same value) yield byte-equal
  encodings; (d) digests are stable across runs and processes, checked against
  committed golden fixtures (`packages/kernel/fixtures/golden-digests.json`,
  generated once by `packages/kernel/scripts/gen-golden.ts`, then frozen;
  hex digest + encoded line, language-neutral so the same fixtures gate the Go
  encoder at P2).
- **L6 — Terminal absorption.** For every catalog decider declaring
  `isTerminal`: once terminal, `decide(c, s) = []` for EVERY command and no
  emittable event leaves the terminal state (state byte-stable under arbitrary
  command suffixes). Anchors P3's idempotent completion.

Coverage assertions (mandatory, or L4/L6 degrade to vacuous passes): across the
generated corpus, `order-fulfillment` must reach at least one terminal state,
produce at least one non-empty emission, and produce at least one rejection.

## Verification

`bun run typecheck && bun test packages/kernel` — entirely in-process, zero
I/O beyond reading the committed fixture file, sub-second by design (the
wall-clock is itself a purity smell test). States are generated ONLY by driving
command sequences from `initialState` — arbitrary states are never conjured.
Counterexamples shrink to a minimal command sequence.

## References

- Chassaing, "Functional Event Sourcing Decider" (2021) — decide/evolve shape.
- Hutton, "A tutorial on the universality and expressiveness of fold" (JFP
  1999) — L3's universal property.
- Schneider, "Implementing Fault-Tolerant Services Using the State Machine
  Approach" (ACM CS 1990) — L2 as the replication kernel.
- RFC 6962 / Crosby & Wallach 2009 — the chain laws `history-register`
  pre-proves and P1 inherits.
- Temporal, "Deterministic constraints for Workflow code" — deterministic
  replay as the durability contract, pure form.
- Helland, "Immutability Changes Everything" (CIDR 2015).
- Equinox (jet/equinox) — production fold/evolve separation.
- Local: tailtalk (obligation-table discipline, fold-as-meaning-maker), Cotal
  (canonical encoding, CAS), multica ("already terminal = success").
