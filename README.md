# foldlab

[![gates](https://github.com/mepuka/foldlab/actions/workflows/gates.yml/badge.svg?branch=main)](https://github.com/mepuka/foldlab/actions/workflows/gates.yml)

foldlab is a lab for verifiable computation over streams, built with
Effect (TypeScript) and Go. Created and directed by
[Mepuka Kessy](https://github.com/mepuka). Licensed
[Apache-2.0](LICENSE).

```
$ bun packages/core/examples/tour.ts

two histories, same two facts, different order

  A head           c0f9c11ccb06bc3c18f4de601b85f44aaf682c83f09090a2c536fa1488d40816
  B head           cbf009894aea951acfd7e7f8157c514fd5144aa6efd7960698855c464533c7ff
  A state digest   62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
  B state digest   62ca5ca464cbce85942499596ae21def9299236f26b68a29f3aaec37cc44733f
  heads equal?     false
  states equal?    true
```

Two histories record the same two facts in opposite orders. They agree
about what they mean and disagree about which they are, and both
answers are digests any reader can recompute from the same events
rather than claims anyone has to accept.
[The first ten minutes](docs/tutorial/first-ten-minutes.md) walks that
command and three others.

foldlab is a lab rather than a product: nothing here is published,
`proto/` is a tracer bullet carrying its own gates, and the repository
takes responsibility for one thing above all — that every claim it
makes is recorded in [VERIFICATION.md](VERIFICATION.md) with its rung,
its bounds, and its residuals. A claim absent from that ledger is not
made.

## The registers

Each document answers one kind of question. Reading the wrong one first
is the usual way in.

| Register | Document | The question it answers |
| --- | --- | --- |
| Tutorial | [docs/tutorial/first-ten-minutes.md](docs/tutorial/first-ten-minutes.md) | What does this do? Four commands and their real output, with every term named only after it has been touched. |
| Explanation | [docs/explanation/why-two-folds.md](docs/explanation/why-two-folds.md), [docs/explanation/theory.md](docs/explanation/theory.md) | Why is it built this way? Why a chain head is kept when the fold state already answers; the three sorts and the fold-shape behind them. |
| Language reference | [CONTEXT.md](CONTEXT.md) | What does this word mean here? The ubiquitous language — folds, heads, journals, catalogs, refusals. Consulted during work, not read front to back. |
| Wire reference | [proto/wire/CONTRACT.md](proto/wire/CONTRACT.md), [proto/SPEC.md](proto/SPEC.md) | What is on the wire? Subjects, body shapes, the refusal kinds, and the ratified laws (W1–W10) with their frozen fixtures. |
| Claims ledger | [VERIFICATION.md](VERIFICATION.md) | What is actually proven, and where does the evidence stop? Every claim with its rung, bounds, assumptions, and the file where it is checkable. |

Landmarks below those five:

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

## What does this have to do with Effect?

Everything here is written against [Effect](https://effect.website),
and not for convenience. Effect is the most widely learned projection
of the discipline this repo is built on: **make the computation a
value.** An `Effect<A, E, R>` is not a running computation — it is a
description of one, with its failure modes (`E`) and its requirements
(`R`) carried in the type. Errors are data — the typed refusal,
before we digest it. A `Layer` is a description of how a system is
assembled. A `Schema` is a description of a data shape, interpretable
into codecs, generators, and documentation. Every one of these is the
same move: reify the thing, so it composes by algebra instead of by
side effect. More and more developers are learning exactly this way
of thinking, in TypeScript, where they already work.

foldlab takes the same move one step further: **give the descriptions
identity.** Canonical bytes, then a digest — so a fold, a grammar, a
topology, or a refusal is not just a value you can compose but a
value two machines, two languages, or two strangers can name, cache,
compare, and verify. Effect made computations values; foldlab makes
the values addressable. That is the entire relationship, and it is
why every house concept has an exact Effect-vocabulary name: the
meaning fold is `Stream.runFold`; the certifier is a smart
constructor at the process boundary; a declared algebra is Effect
v4's own `Reducer` with a content address; the wall is a differential
test that two implementations of one reducer agree byte-for-byte.

And structured concurrency — the part of Effect most developers
learn first — is closer to a Merkle tree than it looks. Structured
concurrency organizes running work into a tree: every fiber has a
parent, children cannot outlive their scope, and the parent's outcome
is computed from its children's outcomes. That is a fold over a tree,
evaluated bottom-up. A Merkle tree is the **same fold with a
different algebra**: a parent's digest is computed from its
children's digests. One shape, two projections — join the children's
*results* and you have the runtime tree (structured concurrency);
hash the children's *identities* and you have the provenance tree
(Merkle). Both enforce the same law, and it is the law that matters:
**no orphans.** A fiber cannot leak past its scope for the same
reason a reference cannot dangle in a content-addressed DAG — the
whole is accountable for its parts. That correspondence is why
deterministic workflow replay works at all: a structured execution is
a tree, a tree folds to a digest, and a digest can be journaled,
compared, and replayed. A live fiber tree is codata — more can always
happen; closing the scope is the fold arriving at its root, and
commitment through the register (above) is what turns that closed
tree into data: one value, one history.

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

## Where to look

Start with the ledger and the language, then pick a shelf. The design
shelf is where the last two days of parallel work landed: each
document was produced by a dispatched research lane, reviewed by a
second, and merged with its evidence intact — the dates in the
filenames are dispatch dates, and every claim inside carries the file,
line, or executed output that backs it.

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

The design shelf — the recent research and design lanes, merged:

- [docs/research/2026-08-14-tangible-examples.md](docs/research/2026-08-14-tangible-examples.md)
  — the five concepts as worked, executed examples, each calibrated
  three ways (Effect developer, infra engineer, skeptical auditor).
  The best on-ramp in the repository; its companion scripts
  ([packages/core/examples/tour.ts](packages/core/examples/tour.ts),
  [proto/ts/examples/refusals.ts](proto/ts/examples/refusals.ts)) run
  with one command and reproduce byte-identically across Windows and
  macOS.
- [docs/design/2026-08-14-mcp-surface-deep-read.md](docs/design/2026-08-14-mcp-surface-deep-read.md)
  — every MCP protocol feature vs. what the pinned Effect rc.108
  server actually implements, feature by feature with file:line, and
  what foldlab can safely build on (tools with typed refusal
  envelopes; not sessions, not sampling).
- [docs/design/2026-08-14-concierge-sessions-and-catalog.md](docs/design/2026-08-14-concierge-sessions-and-catalog.md)
  — guided construction that survives time: an authoring dialogue as
  an event stream, so "redo the type" is a branch from a prefix and
  the type catalog is searchable by digest, shape, provenance, and
  semantics.
- [docs/design/2026-08-14-the-language-surface.md](docs/design/2026-08-14-the-language-surface.md)
  — what was said, separately from what we decided it meant:
  transcripts as evidence, interpretations as decisions with
  provenance, and exactly where determinism lives when a model sits
  in the loop.
- [docs/design/2026-08-14-systems-as-data.md](docs/design/2026-08-14-systems-as-data.md)
  — a service topology as a canonical value with a digest: what
  Effect's `Layer` already gives, what breaks under reification, and
  the honest line between describing a system and attesting to what
  is running (Nix, Terraform, and Dhall confronted as prior art).
- [docs/design/2026-08-14-learning-by-refutation.md](docs/design/2026-08-14-learning-by-refutation.md)
  — the thesis, sharpened to a theorem: a typed refusal's (Law, Path)
  pair is the version-space refinement, precomputed by the certifier;
  content addressing makes negatives federate; one refusal value
  teaches the human and steers the model.
- [docs/research/2026-08-14-counterexample-algebra-dossier.md](docs/research/2026-08-14-counterexample-algebra-dossier.md)
  — why refusals teach: Gold's theorem (positive examples cannot
  correct an over-general learner), and foldlab's sharper version — a
  typed refusal refutes a whole class at once, so the system
  accumulates capability outside the model's weights.
- [docs/design/2026-08-14-federated-fold-cache.md](docs/design/2026-08-14-federated-fold-cache.md)
  — the fold cache as Effect services and Layers: content-keyed,
  immutable, coordination-free to federate, with eviction that can
  shrink the cache but never wrong it.
- [docs/design/2026-08-14-estate-structures-map.md](docs/design/2026-08-14-estate-structures-map.md)
  — the demand inventory: every structure the laws require, working
  backwards, with the build-first ranking the current wave follows.

## The live watch

A coordinator seat runs continuous review over the parallel build —
monitoring lanes, bug-bash lanes, and first-consumer dogfooding — and
this log gets the results as they land. Newest first. Every finding
links to its issue; every claim there carries executed evidence.

**2026-08-13 (late) — the flywheel measured, licensed, and told.** A
dogfood lane drove the concierge as a **true stdio MCP client** — 21
JSON-RPC messages captured verbatim
(`demo/mcp-concierge-session.md`, on review branch
`worktree-agent-ac12a6acee3504305` pending merge): **11 tool calls from first intent
to a certified, content-addressed type** (clean path: 7), 1–6 ms per
call. The first refusal is the best evidence in the transcript: asked
for "a record type," the model wrote `"k":"record"` — the human's own
word leaking into structure — and repaired it in one round-trip from
`expected` alone. Identity-is-content proven twice live (identical
resubmit and reordered union both converge to one digest). Findings
filed: every tool mislabeled `destructiveHint:true` including pure
reads ([#40](https://github.com/mepuka/foldlab/issues/40)), and
`unknown-ref` is the one refusal that doesn't teach its own repair
([#41](https://github.com/mepuka/foldlab/issues/41)), plus live
confirmation on [#17](https://github.com/mepuka/foldlab/issues/17)
that the missing outputSchema is one mapping away from data the
daemon already serves. The repo is now licensed
**Apache-2.0** with NOTICE — foldlab is created and directed by
[Mepuka Kessy](https://github.com/mepuka) — and the story went public:
[the concierge flywheel, on mepuka.com](https://mepuka.com/blog/foldlab-concierge-flywheel).

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
session: `emptyKV` had exported one shared mutable `Map` — a consumer
mutation could poison every later fold in the process
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
