# foldlab

[![gates](https://github.com/mepuka/foldlab/actions/workflows/gates.yml/badge.svg?branch=main)](https://github.com/mepuka/foldlab/actions/workflows/gates.yml)

foldlab is a lab for verifiable computation over streams, built with
Effect (TypeScript) and Go. Every value has one canonical byte form,
and a value's identity is a SHA-256 digest over those bytes, so any
claim — a type's identity, a history's head, a cross-language port's
equivalence — can be recomputed by anyone rather than taken on trust.
Equivalence between implementations (TypeScript ≡ Go, batch ≡ stream,
native ≡ wasm) is established by digest equality over frozen fixtures.

## Why "foldlab"

The name is literal: everything here is a left fold. A stream is
folded twice over — a hash fold, whose result (the chain head) is the
history's identity, and a state fold, whose result is the history's
meaning. Two histories can agree in state while differing in head;
the chain remembers what the fold forgives, and that gap is what makes
provenance a computable fact instead of an attestation.

The same fold-shape recurs at every level, because algebraic data
types and event streams reduce the same way — a fold over structure
(a value's parts) and a fold over time (an identity's events) are the
same catamorphism. An entity is the fold of one correlation key's
events; composition is a fold of child anchors; a schema's identity is
a fold over its AST; code generation is a semantic fold over that same
AST, so derived artifacts cannot drift from their source. The lab
exists to make each of these folds checkable.

## The theory in brief

Three sorts organize the whole system. Evidence is anything
recomputable from bytes — facts, folds, catalogs — and is never owned:
it federates freely because equal bytes give equal digests anywhere.
Decisions are anything two parties could legitimately dispute — named
bindings, fork adoptions, committed orderings — and each one
single-homes behind the effector, a commitment register per unit of
work: `Register ::= Absent | Claim(fence, owner, lease) | Done(fence,
result)`. Its safety (no commit below the highest fence; exactly one
terminal outcome) is a machine-checked theorem — Apalache inductive
invariant, unbounded, independent of process identity — replayed in
lockstep against the running Go implementation across 15,378
schedules. Absence is the one uniform failure: a digest not yet
present is a typed refusal, and senders own retry.

The register is also where a running program becomes a fact: a live
Effect program is codata (more can always happen), and commitment
through the register turns it into data — one value, one history.
A second theorem falls out of the sort: presence of evidence is
monotone (append-only journals only grow), so ingress can admit
records with a plain check and no lock, while creation checks absence
— which can rot — and therefore writes through a compare-and-swap.
The catalog and ingress protocol carrying both results are
model-checked with TLC: 12,707,989 distinct states at the gate
bounds, four invariants held, four sabotaged variants refuted on
exactly the law each dropped.

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
  [docs/gauntlet/](docs/gauntlet/) — the crash-storm and fleet runs
  with their frozen verifiers.
- [go/effector/](go/effector/) — the proven register, as running Go.

Long JCS differential fuzzing runs the real TypeScript and Go implementations
against each candidate. From PowerShell, use
`$env:FOLDLAB_JCS_FUZZ_RUNS=100000; bun test packages/core/test/jcs.differential.test.ts; Remove-Item Env:FOLDLAB_JCS_FUZZ_RUNS`;
for Go's native fuzzer, use
`cd go; go test ./canonical -run=^$ -fuzz=FuzzJCSDifferential -fuzztime=10m`.

Pinned: `effect@4.0.0-rc.108` ([source tag](https://github.com/Effect-TS/effect/tree/effect%404.0.0-rc.108)),
Go 1.26, `nats-server v2.14.4`, `nats.go v1.53.1`.
