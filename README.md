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

### The five structures, and why they keep showing up

Everything in this repository — and every finding below — is built from
five data structures you already use, wearing house names. Knowing the
five makes every entry in this log readable.

1. **The append-only log** (house: *the journal*). Events, in order,
   never edited — the same shape as a git history or a Kafka topic.
   Every question in the system starts here, because "what happened,
   in order" is the one fact everything else can be recomputed from.

2. **The reducer** (house: *the meaning fold*). Run `Array.reduce`
   over the log and you get current state — exactly what every Redux
   store and every `Stream.runFold` does. Fold the same events, get
   the same state, every time.

3. **The hash chain** (house: *the identity fold*, its result *the
   chain head*). Feed the same events through a running SHA-256
   instead — the way each git commit hashes its parent — and you get
   a 32-byte name for *exactly this history*. Two logs can reduce to
   the same state yet have different heads; the repo's favorite
   sentence, "the chain remembers what the fold forgives," is just
   that observation. State tells you where you are; the head tells
   you every step of how you got there.

4. **The content-addressed store** (house: *the catalog*, *the fold
   cache*). Name things by the hash of what they are — git objects,
   the Nix store, a CDN etag. Entries are immutable, so there is
   nothing to invalidate, ever: if the name matches, the content is
   the content. Caching, deduplication, and "have we seen this
   before?" all collapse into one lookup.

5. **The version-checked register** (house: *the effector*). A
   compare-and-swap slot with a monotonically increasing token — the
   optimistic-locking pattern of every database version column, plus
   the fencing tokens distributed-systems books recommend. It is the
   *one* place in the system where writers coordinate. Everything
   else merges freely.

Why do the same five keep arising, here and everywhere else? Because
they are the minimal answers to the only five questions a distributed
system ever asks: *what happened?* (the log), *what does it mean?*
(the reducer), *is it the same?* (the hash), *have we done this
before?* (the store), *who decides?* (the register). Any system that
answers those questions honestly reinvents these shapes — git, Kafka,
Redis, Nix, and every event-sourced app each hold two or three of
them. This repo's bet is simply to hold **all five under one
discipline**: everything is canonical bytes, so everything has a
digest; everything with a digest can be cached, compared, federated,
and replayed; and the mathematics of folds (a tagged union has
exactly *one* structure-respecting fold) turns those habits into
guarantees. Same input, same bytes, same hash — and anything derived
that way is safe to share between two languages, two machines, or
two strangers, because "do we agree?" becomes "do the digests
match?", which is decidable.

That unification is also why the findings below cluster the way they
do. Almost every bug this watch has caught is one of the five
structures betraying its principle at an edge: a hash built from
bytes that were quietly *repaired* rather than refused (a name that
lies), a reducer with two adjacent error dialects (a fold that
answers two ways), a register bucket that deletes the history a
watcher was owed (a log that forgot), a verifier that checks a bundle
against itself (a store trusting its own label). The principles are
common; the discipline of holding them *simultaneously, at every
edge, in two languages* is the actual project.

**2026-08-13 (night) — the docs lanes converge, and the proof demos
itself.** The PC side merged the four design dossiers onto main
(closing the wave-2 hazard
[#30 H1](https://github.com/mepuka/foldlab/issues/30)) and landed
`docs/research/2026-08-14-tangible-examples.md`: the five concepts as
worked examples, calibrated three ways (Effect developer, infra
engineer, skeptical auditor), every output executed rather than
narrated. The Terraform framing earns its keep — *"two streams can
have identical `terraform show` output and different `git log`;
foldlab gives you both digests so you can tell which kind of 'same'
you have"* is the best one-sentence account of the two folds to date.
And the review produced its own evidence: the committed
`packages/core/examples/tour.ts` was written and executed on Windows;
the Mac coordinator re-ran it during review and got **byte-identical
digests** — the cross-platform determinism claim demonstrating itself
inside the review of its own documentation.

**2026-08-13 (evening) — the bug bash reports: five lanes, one day.**
The Go concurrency lane proved the "flake" (#15) is a real eviction
race — the register bucket keeps one message per subject, so writing
the outcome deletes the claim, and a watcher racing that window waits
forever for a transition that no longer exists (causal control:
History=1 loses 2/250, History=10 loses 0/250). It also found the
scariest bug of the day: `Journal.Read` adopts an unverified
caller-supplied cursor, so a prior *read* can poison the next append's
chain link — unrepairably, in a DenyDelete stream
([#34](https://github.com/mepuka/foldlab/issues/34)). The semantics
lane confirmed twelve twin/digest findings — headline: protod decodes
request bodies with plain `encoding/json`, so distinct submissions can
derive one catalog digest
([#36](https://github.com/mepuka/foldlab/issues/36)) — and probed the
gauntlet verifiers adversarially: RG-A held strong; R2 accepted a
bundle whose corpus literally reads "FAKE problem…"
([#37](https://github.com/mepuka/foldlab/issues/37)). Its deliverable
is a ready-to-freeze wall-corpus row list
([#38](https://github.com/mepuka/foldlab/issues/38)). The
anti-tunnel-vision sweep filed the wave-2 dispatch hazards
([#30](https://github.com/mepuka/foldlab/issues/30)), the
dual-canonicalizer divergence
([#31](https://github.com/mepuka/foldlab/issues/31)), the
negative-controls-in-no-gate gap
([#32](https://github.com/mepuka/foldlab/issues/32)), and a 10-item
advisory digest ([#33](https://github.com/mepuka/foldlab/issues/33)).
The decision-preparedness scout ranked twenty decisions the build
order will force, twelve of them this-week class
([#35](https://github.com/mepuka/foldlab/issues/35)) — top regret
forecast: the refusal corpus is being born next week with three
unratified choices. Good news verified along the way: task 24's four
reply mutants each fire exactly once and are caught; the per-test
in-process NATS pattern is why the suite has no shared-state flakes;
zero frozen digests moved through all of it.

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
