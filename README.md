# foldlab

[![gates](https://github.com/mepuka/foldlab/actions/workflows/gates.yml/badge.svg?branch=main)](https://github.com/mepuka/foldlab/actions/workflows/gates.yml)

foldlab is a lab for verifiable computation over streams, built with
Effect (TypeScript) and Go. Every value has one canonical byte form,
and a value's identity is a SHA-256 digest over those bytes, so any
claim — a type's identity, a history's head, a cross-language port's
equivalence — can be recomputed by anyone rather than taken on trust.
Equivalence between implementations (TypeScript ≡ Go, batch ≡ stream,
native ≡ wasm) is established by digest equality over frozen fixtures:
digest pins generated once by the Go side and recomputed by both sides
thereafter.

## Why "foldlab"

The name is literal: everything here is a left fold — one accumulator
carried across a sequence, one element at a time. A stream is folded
twice over: a hash fold, whose result (the chain head) is the
history's identity — a running Merkle-style hash chain, not a reducer
anyone writes — and a state fold, whose result is the history's
meaning, which is an ordinary `Stream.runFold` over the events with
your own reducer. The repo names them the identity fold and the
meaning fold. Two histories can agree in state while differing in head;
the chain remembers what the fold forgives, and that gap is what makes
provenance a computable fact instead of an attestation.

The same fold-shape recurs at every level, because algebraic data
types and event streams reduce the same way: a fold over structure
(a value's parts) and a fold over time (an identity's events) are the
same catamorphism, the one recursion scheme that collapses a structure
into a single value. An entity is the fold of one correlation key's
events; composition is a fold of child anchors; a schema's identity is
a fold over its AST; code generation is a semantic fold over that same
AST, so derived artifacts cannot drift from their source. The lab
exists to make each of these folds checkable.

## The theory in brief

Three sorts organize the whole system: evidence, decisions, and
absence. Evidence is anything recomputable from bytes — facts, folds,
catalogs — and is never owned: it federates freely because equal bytes
give equal digests anywhere. Decisions are anything two parties could
legitimately dispute — named bindings, fork adoptions, committed
orderings — and each one single-homes behind the effector: it has
exactly one writer, a commitment register per unit of work:
`Register ::= Absent | Claim(fence, owner, lease) | Done(fence, result)`.
Absence is the one uniform failure: a digest not yet present is a typed
refusal — a tagged value in the error channel, not an exception and not
a null — and senders own retry.

The register's safety (no commit below the highest fence; exactly one
terminal outcome) is a machine-checked theorem — Apalache inductive
invariant, unbounded, independent of process identity — replayed in
lockstep against the running Go implementation across 15,378
schedules. The register is also where a running program becomes a
fact: a live Effect program is codata (more can always happen), and
commitment through the register turns it into data — one value, one
history.

A second theorem falls out of the sort: presence of evidence is
monotone (append-only journals only grow), so ingress can admit
records with a plain check and no lock. Creation instead checks
absence, an observation that can go stale, and therefore writes
through a compare-and-swap. The catalog and ingress protocol carrying
both results are model-checked with TLC, the explicit-state TLA+ model
checker: 12,707,989 distinct states at the gate bounds, four
invariants held, four sabotaged variants each refuted. The same
protocol is conformance-tested against the running daemon (R4, the
ladder's rung for lockstep against the running binary): 131 schedules
replayed lockstep with zero divergences against the named coarsened
wire map, controls first. The inductive proof above the bounded check
(R3) is in re-proof at repaired hypothesis bounds — the claim is
deliberately HELD until those verdicts land; the ladder and its honest
status live in [VERIFICATION.md](VERIFICATION.md).

## The MCP surface

MCP (Model Context Protocol) is the open protocol that lets an LLM
client — Claude, an IDE, any agent runtime — call tools served by an
external process, with each tool described by a JSON Schema the model
reads. foldlab's daemon serves its own wire contract as data
(`contract.describe`), and the MCP tools are derived from that reply
at startup, so a tool schema cannot drift from the daemon it fronts.
An agent authors types by submitting the canonical structure itself,
publishes records against them, and reads verified journals back —
three verbs in total. When a request breaks a law, the reply is a
typed refusal carrying the path, the legal alternatives, and a worked
example, so an agent repairs its own mistake without documentation.

This surface is the first of a planned family of tools for the agent
era whose guarantees are recomputable rather than reputational: every
reply carries facts the agent, or anyone auditing it, can re-derive.

## Where to look

- [VERIFICATION.md](VERIFICATION.md) — the claims ledger: every
  verification claim with its rung, bounds, assumptions, and the file
  where it is checkable.
- [CONTEXT.md](CONTEXT.md) — the ubiquitous language: folds, heads,
  journals, catalogs, refusals.
- [proto/SPEC.md](proto/SPEC.md) and
  [proto/wire/CONTRACT.md](proto/wire/CONTRACT.md) — the ratified
  laws (W1–W10) and the wire contract with its frozen fixtures.
- [proto/go/protod/](proto/go/protod/) — the daemon: catalog,
  ingress, refusals, and the black-box conformance suite.
- [proto/ts/src/mcp.ts](proto/ts/src/mcp.ts) — the MCP derivation;
  [proto/ts/test/smoke.test.ts](proto/ts/test/smoke.test.ts) — a full
  agent session, typo to self-repair to verified read.
- [verify/catalog/](verify/catalog/) — the TLA+ model gate:
  `Catalog.tla`, the four counterexample traces from the sabotaged
  variants, and the run record in its README.
- [docs/map/tickets/009-the-verification-ladder.md](docs/map/tickets/009-the-verification-ladder.md)
  — which contract sits on which proof rung, and what each rung's
  gate requires.
- [docs/adr/](docs/adr/) — the committed decisions;
  [docs/gauntlet/](docs/gauntlet/) — the gauntlets: adversarial test
  campaigns (crash storms, fleet runs), each with a frozen spec and a
  frozen verifier that checks the exported run bundle by recomputation.
- [go/effector/](go/effector/) — the proven register, as running Go.

## Long differential fuzz runs

JCS is RFC 8785's JSON Canonicalization Scheme. Long JCS differential
fuzzing runs the real TypeScript and Go implementations against each
candidate. From PowerShell, use
`$env:FOLDLAB_JCS_FUZZ_RUNS=100000; bun test packages/core/test/jcs.differential.test.ts; Remove-Item Env:FOLDLAB_JCS_FUZZ_RUNS`;
for Go's native fuzzer, use
`cd go; go test ./canonical -run=^$ -fuzz=FuzzJCSDifferential -fuzztime=10m`.

## Pinned versions

`effect@4.0.0-rc.108` ([source tag](https://github.com/Effect-TS/effect/tree/effect%404.0.0-rc.108)),
Go 1.26, `nats-server v2.14.4`, `nats.go v1.53.1`.

## The live watch

A coordinator seat runs continuous review over the parallel build —
monitoring lanes, bug-bash lanes, and first-consumer dogfooding — and
this log gets the results as they land. Newest first. Every finding
links to its issue; every claim there carries executed evidence.

**2026-08-13 — the invisible Unicode wall is closed.** `MapValueUpper`
now uppercases only ASCII `a`–`z` bytes on both sides and preserves all
non-ASCII bytes verbatim, removing both runtime Unicode tables from the
digest path. The individual suites exhaust every Unicode scalar and byte;
the built wasm wall pins the 27 reported drift scalars. CI now builds that
wall and carries a missing-artifact canary, so a fresh checkout cannot turn
the cross-runtime evidence into a silent skip ([#27](https://github.com/mepuka/foldlab/issues/27)).

**2026-08-13 — foundations audit at `074947f`: INTACT, with one wall
red and invisible.** Zero frozen digests moved across 82 commits of
two-machine parallel landing — mechanically proven (no removed hex
constants in the diff walk; `streamfix` regenerates the fixture
byte-identically). But the wasm wall auto-skips on fresh checkouts
(`describe.if(built)` + gitignored `dist/`) and is **failing today**
when built: exactly 27 Unicode scalars diverge TS vs Go, because
`toUpperCase` follows the JS engine's Unicode 16 tables while Go ships
15.0.0 — two external tables, neither pinned, guarding a digest path
([#27](https://github.com/mepuka/foldlab/issues/27)). Ledger/doc drift
from the flurry consolidated in
[#28](https://github.com/mepuka/foldlab/issues/28).

**2026-08-13 — first-consumer dogfood of the fresh KV surface.** The
parallel-replay demo works in a 70-line consumer script: sequential ≡
split-and-combine ≡ enriched-semilattice, one digest; swapping the
halves breaks the order-sensitive route (by design) and commutes on
the semilattice route (by law). Two catches filed from the same
session: `emptyKV` exports one shared mutable `Map` — a consumer
mutation would poison every later fold in the process
([#25](https://github.com/mepuka/foldlab/issues/25)) — and the
adjacent-file refusal-channel split (`applyKV` returns an Effect,
`foldSeqKV` a union) executes as a false "refused" under an
untypechecked consumer ([#26](https://github.com/mepuka/foldlab/issues/26)).

**2026-08-13 — the KV combine, proven and merged.** The briefed goal
(one operation, homomorphic AND commutative) was internally
contradictory — together those force order-insensitivity, and
last-write-wins is order-sensitive by construction. Split instead:
`combineKV` (associative segment recombination — every split of the
frozen corpus recombines to the frozen digest: the parallel-replay
license) and `combineSeqKV` (true join-semilattice on the enriched
carrier, projection reproducing the frozen digest byte-for-byte). The
tie-break rule was decided by the frozen corpus, not taste: `(seq,
stream)` reproduces the pinned digest; the other order provably
elects a different winner. Generated commutativity/idempotence laws
landed with a discriminating negative control
([#20](https://github.com/mepuka/foldlab/issues/20) delivered), and
the suspected dense/sparse merge divergence was refuted by a deciding
test — which surfaced a real cross-language finding instead: Go's
duplicate refusal blames a map-order-random source, TS blames
deterministically ([#21](https://github.com/mepuka/foldlab/issues/21)).

**2026-08-13 — the review cycle in issues.** The Rosetta pass
(vocabulary bridge to the common Effect knower, corrected twice by
its own audit lanes: [#14](https://github.com/mepuka/foldlab/issues/14)),
the MCP pin conformance findings
([#16](https://github.com/mepuka/foldlab/issues/16),
[#17](https://github.com/mepuka/foldlab/issues/17)), the refusal-corpus
sort split ([#18](https://github.com/mepuka/foldlab/issues/18)), the
frontier finding whose premise was then properly refuted by a deeper
lane and converted to a tripwire
([#19](https://github.com/mepuka/foldlab/issues/19)), and the
semilattice law gap ([#20](https://github.com/mepuka/foldlab/issues/20)).
