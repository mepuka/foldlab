# foldlab

[![gates](https://github.com/mepuka/foldlab/actions/workflows/gates.yml/badge.svg?branch=main)](https://github.com/mepuka/foldlab/actions/workflows/gates.yml)

foldlab is a lab for verifiable computation over streams, built with
Effect (TypeScript) and Go. Created and directed by
[Mepuka Kessy](https://github.com/mepuka). Licensed
[Apache-2.0](LICENSE). Its premier project is **Plait**.

## Plait

**Plait is a coordination framework for programs that work on the same
data at the same time on different machines** — services, agents,
scripts, a person behind a tool. Its bet, in one sentence:

> Programs coordinate by growing a shared, content-addressed body of
> evidence that is safe to replicate sloppily, plus a small number of
> declared decision points that are not. The mathematics says which is
> which, and the framework keeps the two physically apart.

*Content-addressed* means every piece of evidence is named by the
SHA-256 hash of its own canonical bytes, so any reader re-derives the
name and checks it instead of trusting the sender. *Safe to replicate
sloppily* means the evidence side tolerates out-of-order, repeated, and
re-delivered messages by construction — there is no ordering or
conflict-resolution knob to get wrong, because there is no knob.

The API is TypeScript on Effect v4. The substrate is NATS JetStream. A
node is anything that speaks the wire contract — an Effect process, a
Go binary, a shell script, a model behind a tool interface. Nothing
about a node's insides is trusted; only its bytes are.

### Why the proofs are the product

A coordination guarantee is only worth what you can check about it.
Plait ships the checking, in the repository, runnable by you:

- **Machine-checked laws — 123 of them behind two green gates.**
  *Machine-checked* means a proof assistant verified every step down to
  the kernel; no reviewer's judgement sits in the loop. 87 rostered
  theorems cover the fabric algebra — merge, replay, resumption,
  partitioning, policy attenuation ([verify/fabric/](verify/fabric/),
  Lean 4.33.0) — and 36 generated verification conditions discharge the
  register's two safety invariants ([verify/fabric-veil/](verify/fabric-veil/),
  Veil on Lean, SMT proofs reconstructed in the kernel with
  `veil.smt.trust=false`). Both counts are the ones
  [VERIFICATION.md](VERIFICATION.md) records for the Plait fabric
  algebra and Plait register rows. Every rostered theorem's kernel
  axiom footprint is censused in-build to
  `{propext, Classical.choice, Quot.sound}`, so a `sorry` anywhere is a
  failed build rather than a passing one.
- **Model-emitted corpora, replayed by two runtimes.** The register
  model exports its own execution rows —
  `lake exe fabric_veil_export`, 15 rows, each verified against the
  module's generated transition relation at export time. The
  TypeScript `Registers` service and an independently written Go twin
  ([go/register/](go/register/)) each replay all 15 against real NATS
  KV compare-and-set — one fresh server per row in both runtimes, with
  verdict, law-name, and observed-state equality and zero skips. Each
  corpus is regenerated and byte-diffed by the gate that owns it, so a
  hand-edited fixture fails. Hand-authored model verdicts are banned
  outright ([AGENTS.md](AGENTS.md), Working precepts): a transcription
  error makes both sides agree on a falsehood, and two sides agreeing
  is exactly what a wall is supposed to be testing.
- **Negative controls that die for a stated reason.** A prover that
  cannot fail proves nothing. `packages/plait/negative-controls/`
  carries 22 planted mutants, each paired with the committed trace of
  the diagnostic that kills it — twenty public-surface regressions, one
  narrowed substrate field set, and one commit path with its token
  guard removed, killed on a live KV bucket. The Lean packages carry
  mutants that each drop exactly one law, die on their named vectors,
  and provably retain the laws they did not drop. A control that is
  committed but never run fails the gate.
- **A claim ledger where every sentence carries its bounds.**
  [VERIFICATION.md](VERIFICATION.md) records every claim with its rung,
  its exact bounds, the assumptions it stands on, and the file it is
  checkable at. **A claim absent from that ledger is not made.** When a
  document elsewhere in this repository contradicts the ledger, the
  ledger wins and the document is the bug.

The pedigree is not a footnote on the product. It is the reason to
adopt this one: you can check what you are being told, at the rung it
was told at.

### What runs today

Merged on `main` and executable from a fresh checkout. Each row names
the ledger entry that licenses it — the bounds live there, and they are
narrow on purpose.

| Surface | What it does today | Ledger row |
| --- | --- | --- |
| **The spine** (`packages/plait/`) | Canonical envelope identity and verified delivery: two processes exchange envelopes through one local JetStream server, the receiver re-derives every digest, and a mismatch is refused rather than absorbed. Refusals ride the Effect error channel across the whole public surface. | [Plait spine](VERIFICATION.md#plait-spine--r0-differential--executable-integration) — R0 differential + executable integration, four generated envelope rows, one file-backed `nats-server v2.14.4`, `num_replicas: 1` |
| **The fabric model** (`verify/fabric/`) | The coordination algebra proved: cell merge is associative/commutative/idempotent, replay is invariant under permutation and duplication, resumption is anchored, partitioned folds recombine, policy meets attenuate. | [Plait fabric algebra](VERIFICATION.md#status-at-a-glance) — model-level R5. **Bound, stated in the same breath:** nothing running consumes the emitted corpus yet, so no claim says the shipped code implements the proved model |
| **The register** (`packages/plait/src/Register.ts`, `go/register/`) | The one place the fabric coordinates: a lease keyed by a work digest, carrying a monotone fencing token. Token monotonicity and at-most-one-landed-commit with no stale-token landing, proved as inductive invariants and replayed onto real NATS KV. | [The Plait register (F5)](VERIFICATION.md#the-plait-register-f5--r3--replay-wall) — R3 + replay wall. **Bounds:** safety only, no liveness; R4 stays RESERVED at the 15,378-schedule bar; at-most-one landed *outcome* is not at-most-one external side effect — the register bounds landings, never attempts (ruled G23) |
| **The substrate gate** (`go/substrate/`, `packages/plait/test/{SubstrateParity,KVWatchSemantics,ObjectStoreSemantics}.test.ts`) | The JetStream properties the design consumes, probed executably rather than assumed: subject CAS, KV revision lifecycle, CAS-before-dedup precedence, the application ACL scope, SIGKILL process recovery, TS-client parity with the refusals pinned wire-indistinguishable, KV watch replay/coalescing, tombstones, resume, and a bounded reconnect schedule, and object-store put/get integrity, chunk boundaries, delete, and metadata stability. | [Substrate assumptions gate](VERIFICATION.md#status-at-a-glance) — executable integration at the pinned envelope; single node, R=1, file storage; watch is advisory (`isUpdate` is not an initial/live boundary and silence never proves absence); the object store has no ranged read at the pin and its whole-object digest is checked only at the last chunk, so every byte a reader touches is unverified until the read completes; process-crash recovery only, never power loss; no clustering |

Everything else Plait's design records describe — the durable fold, the
context catalog, actions and triggers, the harness plane — is designed
and ratified in shape and **not built**. The quickstart and the agent
mapping label each of their sections runs-today or design-only, and
their design-only code blocks are sketches from the design records:
copying one will not compile, by construction and on purpose.

Run the surfaces above yourself:

```bash
bun install
bun run --filter '@foldlab/plait' test          # unit + local-NATS suite, corpus byte-diff, conformance gates
(cd go && go run ./cmd/plaitwall --corpus ../packages/plait/fixtures/envelopes.ndjson)
(cd go && go test ./register/...)
```

Executed at `3e38b97` on 2026-08-17: the package suite ran 31 tests
across 12 files with 301 assertions and no failures in 27.6 s (it
builds the pinned `nats-server v2.14.4` from the checksum-locked Go
module first); `CORPUS: PASS (byte-identical regeneration)`;
`PUBLIC EFFECT GATE: PASS (25 emitted signatures inspected)`;
`PUBLIC EFFECT CONTROL: PASS (twenty public-surface regressions
refused)`; `SUBSTRATE PARITY CONTROL: PASS`;
`PLAIT WALL: PASS (4 envelopes)`; `ok foldlab/register`. Those are
counts from one run at one revision, not a durable claim — the durable
claims are in the ledger.

### The doors

| Door | The question it answers |
| --- | --- |
| [packages/plait/QUICKSTART.md](packages/plait/QUICKSTART.md) | *What is it like to use?* Ten minutes: boot a local commons, watch two processes agree on one digest, cause a refusal on purpose. Each minute is labelled runs-today or design-only. Note: its Example 3 still labels the register design-only — the register landed after that page was written, and the ledger is the authority on which is which. |
| [packages/plait/FOR-WORKING-AGENTS.md](packages/plait/FOR-WORKING-AGENTS.md) | *How does this map onto what I already build?* Tool calling, domain schemas, skills, subagents, memory, retrieval — six tasks you already solve, each with the concrete Plait shape, what it refuses, and what is still undecided. |
| [VERIFICATION.md](VERIFICATION.md) | *What is actually proven, and where does the evidence stop?* Every claim with its rung, bounds, assumptions, and checkable file. |
| [packages/plait/README.md](packages/plait/README.md) | *What are the modules?* The map of the merged spine, module by module. |
| [CONTEXT.md](CONTEXT.md) | *What does this word mean here?* The house vocabulary — folds, heads, journals, catalogs, refusals. Consulted during work, not read front to back. |

### The design records

Plait was designed in the open, ruled item by item, and the rulings are
durable. This is the index; read it in this order.

| Record | What it holds |
| --- | --- |
| [2026-08-17-plait-coordination-fabric.md](docs/design/2026-08-17-plait-coordination-fabric.md) | Part 1 — the fabric: venues, the commons, lanes, the law statements F1–F6, and the slice ladder. |
| [2026-08-17-plait-action-plane.md](docs/design/2026-08-17-plait-action-plane.md) | Part 2 — the action plane: actions, triggers, policies, and the model seam, with laws F7–F10. |
| [2026-08-17-plait-harness-plane.md](docs/design/2026-08-17-plait-harness-plane.md) | Part 3 — the harness: indexes, search, resources, directories, and the production verbs that ride the proved constructs. |
| [2026-08-17-plait-architecture.md](docs/design/2026-08-17-plait-architecture.md) | The package and module map, ruled binding for the scaffolds. Amendable only by findings. |
| [2026-08-17-plait-ratification-record.md](docs/design/2026-08-17-plait-ratification-record.md) | What has been ruled, and by whom: G1–G12 pre-qualified on the recommended option, plus the program charter. |
| [2026-08-17-plait-grill-sheet.md](docs/design/2026-08-17-plait-grill-sheet.md) | The consolidated grill sheet — items 1–21 (G13–G24 included) and their rulings. |
| [2026-08-17-plait-next-phase-plan.md](docs/design/2026-08-17-plait-next-phase-plan.md) | The model-completion slice and the parallel fan-out, ratified across thirteen items. |
| [2026-08-17-plait-effect-affordances.md](docs/design/2026-08-17-plait-effect-affordances.md) | Effect-native affordances for the content-addressed surfaces: catalog, audit, routing. Grill items G-1..G-7 open. |
| [2026-08-17-plait-pm-retro.md](docs/design/2026-08-17-plait-pm-retro.md) | The program's own retrospective on how it is being run. |

The full design shelf, including the estate records the Plait design
consumes, is [docs/design/](docs/design/). Committed architectural
decisions are in [docs/adr/](docs/adr/).

## The substrate Plait stands on

Plait did not start from a blank page. It was built on top of a lab
that had already spent its effort making values *nameable* — and that
substrate is the reason the coordination guarantees are checkable
rather than asserted. Its discipline, in one line: **every value has a
canonical byte form, identity is a digest over those bytes, and every
cross-boundary claim is a checkable digest equality.**

Two histories can record the same two facts in opposite orders. They
agree about what they mean and disagree about which they are — and in
this lab both answers are digests any reader recomputes from the same
events, rather than claims anyone has to accept.

### Canonical bytes

[RFC 8785](https://www.rfc-editor.org/rfc/rfc8785) fixes exactly one
byte form per JSON value, so key order stops being information.
`packages/core` (TypeScript) and `go/canonical` (Go) implement it
independently and are held equal by a differential wall — a test that
runs one input through two implementations and compares digests — with
RFC 8785's own Appendix B as the outside referee. Both-sides-agree is
not verification: two implementations sharing a bug agree, which is how
a `-0` defect survived until the Appendix was made the oracle. Ledger
row: RFC 8785 canonical JSON, R1 differential.

Constrained decoding is the other half. There is exactly one way in
from bytes — one JSON value, valid UTF-8, unique member names after
unescaping, finite binary64, bounded nesting — and a decoder that
*repairs* its input is naming a different value than the one that
arrived, so it refuses instead.

### Journals and the two folds

A journal is an append-only log of events. Fold it one way and you get
what the history *means* (state); fold it another and you get a 32-byte
commitment to *exactly this history prefix* (the chain head). Two
journals can agree in state and differ in head — the house sentence is
*the chain remembers what the fold forgives*. State tells you where you
are; the head tells you every step of how you got there, and both are
recomputable by anyone holding the events.

Beside the log and its two folds sit two more shapes: the
content-addressed store (name a thing by the hash of what it is, so
entries are immutable and there is nothing to invalidate) and the
version-checked register (a compare-and-swap slot with a monotone
fencing token — the one place writers coordinate). Those five are the
minimal answers to the only five questions a distributed system ever
asks: *what happened?* (the log), *what does it mean?* (the meaning
fold), *is it the same?* (the identity fold), *have we done this
before?* (the store), *who decides?* (the register). Plenty of systems
hold two or three. This repository's bet is to hold all five under one
discipline, at every edge, in two languages — and the typed refusal is
what that discipline sounds like when it says no: a structured value
carrying the law it enforced, the path that broke, what it got, and
what it expected. Plait's fabric is those five, given coordination
machinery. [go/journal/](go/journal/) and
[go/canonical/](go/canonical/) carry the Go side;
[packages/core/](packages/core/) carries the TypeScript seam.

### The move calculus

[verify/moves/](verify/moves/) proves the epistemic core whose
vocabulary the fabric design builds on: state
`open | filled | disputed | decided` over an arbitrary fixed finite
hole carrier, three moves, and the absorb discipline that makes fills
total. Thirty-nine gated axiom reports — strong no-loss, meaning and
evidence confluence under permutation, schedule-free fences, per-move
refusal characterized as an iff — against a SHA-256-pinned frozen spec,
with nine planted hygiene controls each refuted on its named check. Its
README states what the model does NOT cover, which is the more useful
half: no crash recovery, no CAS, no leases, no liveness, and no
code-model correspondence. No refinement map ties this model to the
running daemon, and the ledger says so rather than implying otherwise.

[packages/moves/](packages/moves/) is the TypeScript kernel that
replays the model's own 2000-vector emitted corpus byte-identically,
with five planted mutants that each die against it. Agreement is
evidence, not proof, and the ledger says so.

### The REF lane

The other active lane makes the Lean ground-truth model the executable
referee for the `flb.type.v0` type grammar
([verify/ir/](verify/ir/)): the grammar stated once as an algebraic
type with a denotational semantics, and eight prose laws about meaning
turned into theorems — brands are denotationally invisible, union
meaning is a property of the member set, catalog growth never
invalidates conformance. The ledger grades its own result rather than
rounding it up: it names `union_extensional`, `sort_preserves_meaning`,
`resolver_mono` and `ref_unfold` as the substantive inductive laws and
marks the brand/check family near-definitional, and it records exactly
which semantics the "invisible" laws are about. The payoff is a drift
kill: the grammar is
currently restated roughly six times in Go and four in TypeScript with
divergent defaults, and a divergence a generated vector exposes is a
finding rather than a patch. The referee itself is not built; the
README there names the next rungs.

### The tracer bullet

[proto/](proto/) is an end-to-end vertical slice through every layer,
carrying its own gates: a daemon with a catalog, ingress, twelve
refusal kinds total over two ontological sorts, and the ratified wire
laws W1–W10 with frozen fixtures. Its MCP surface derives its tool
schemas from the daemon's own `contract.describe` reply at startup, so
a tool schema cannot drift from the daemon it fronts; when a request
breaks a law the reply is a typed refusal carrying the path, the legal
alternatives, and a worked example, so an agent repairs its own mistake
without reading documentation. That surface belongs to `proto/`, not to
Plait — Plait's own adoption surfaces are unbuilt.

### What Effect has to do with it

Everything here is written against [Effect](https://effect.website),
and not for convenience. Effect's central move is **make the
computation a value**: an `Effect<A, E, R>` is a description of a
computation with its failure modes and requirements carried in the
type; a `Layer` describes how a system is assembled; a `Schema`
describes a data shape. Errors are data — the typed refusal, before we
digest it.

foldlab takes that one step further: **give the descriptions
identity.** Canonical bytes, then a digest, so a fold, a grammar, a
topology, or a refusal is not just a value you can compose but one that
two machines, two languages, or two strangers can name, cache, compare,
and verify. Effect made computations values; foldlab makes the values
addressable. That is why every house concept has an exact
Effect-vocabulary name: the meaning fold is `Stream.runFold`; a
declared algebra is Effect v4's own `Reducer` with a content address;
a wall is a differential test that two implementations of one reducer
agree byte-for-byte.

Structured concurrency is closer to a Merkle tree than it looks. It
organizes running work into a tree where a parent's outcome is computed
from its children's outcomes — a fold over a tree, bottom-up. A Merkle
tree is the same fold with a different algebra: a parent's digest is
computed from its children's digests. Join the children's *results* and
you have the runtime tree; hash their *identities* and you have the
provenance tree. Both enforce the same law, and the law is what
matters: **no orphans.** A fiber cannot leak past its scope for the
same reason a reference cannot dangle in a content-addressed DAG — the
whole is accountable for its parts. That correspondence is why
deterministic replay works at all.

### Further reading on the substrate

- [docs/research/2026-08-14-tangible-examples.md](docs/research/2026-08-14-tangible-examples.md)
  — the five structures as worked, executed examples, each calibrated
  three ways (Effect developer, infra engineer, skeptical auditor). The
  best on-ramp in the repository. Its companion
  [proto/ts/examples/refusals.ts](proto/ts/examples/refusals.ts) still
  runs; the tour it names is archived.
- [docs/explanation/why-two-folds.md](docs/explanation/why-two-folds.md)
  and [docs/explanation/theory.md](docs/explanation/theory.md) — why a
  chain head is kept when the fold state already answers, and the fold
  shape behind the three sorts.
- [docs/map/tickets/009-the-verification-ladder.md](docs/map/tickets/009-the-verification-ladder.md)
  — what each rung R0–R5 establishes and what its gate requires. Read
  this to know what a rung stamp in the ledger buys you.
- [proto/wire/CONTRACT.md](proto/wire/CONTRACT.md) and
  [proto/SPEC.md](proto/SPEC.md) — what is on the wire: subjects, body
  shapes, refusal kinds, and the ratified laws with their fixtures.
- [docs/design/2026-08-14-learning-by-refutation.md](docs/design/2026-08-14-learning-by-refutation.md)
  — why refusals teach: a typed refusal's (law, path) pair is a
  version-space refinement, precomputed at the boundary, so one refusal
  value corrects a whole class of mistakes.

## Repository layout

| Path | What lives there |
| --- | --- |
| [packages/plait/](packages/plait/) | Plait: the merged spine and register, with the quickstart, the agent mapping, and the negative controls |
| [packages/core/](packages/core/) | The RFC 8785 seam and the fold algebra (TypeScript) |
| [packages/moves/](packages/moves/) | The move-calculus kernel that replays the Lean model's corpus |
| [go/](go/) | The Go substrate: `canonical`, `journal`, `register`, `substrate` (the assumptions gate), and `cmd/` (the walls: `plaitwall`, `registerwall`, `jcsprobe`) |
| [proto/](proto/) | The tracer bullet — daemon, wire contract, MCP derivation, and its own gates |
| [verify/](verify/) | Model gates: `fabric` and `fabric-veil` (Plait), `moves`, `ir`, `catalog`, `implication`, `pipeline` |
| [fixtures/](fixtures/) | Frozen corpora. `golden-conformance.json` and `jcs-rfc8785.json` do not move without an explicit, reasoned regeneration |
| [docs/](docs/) | [design/](docs/design/) records, [adr/](docs/adr/) decisions, [research/](docs/research/), [map/](docs/map/) tickets, [gauntlet/](docs/gauntlet/) frozen specs |
| [scripts/](scripts/) | The gate runners (`gates.ts`, `gates.sh`, `gates.ps1`) |
| [scratch/](scratch/) | Tracked task briefs — a brief no agent can read is a brief that does not exist |
| [repos/effect/](repos/effect/) | The vendored Effect release at the pin, read-only reference material, outside every gate |

Agent operating contract: [AGENTS.md](AGENTS.md). Module directories
carry their own scoped `AGENTS.md` and `CONTEXT.md`; read those before
editing inside.

Off-path work — the stream/transform walls, the effector, the gauntlet
lanes, the demo server, the guided tour — was archived whole on
2026-08-15 at tag `archive/pre-estate-focus`
([manifest](docs/research/2026-08-15-estate-focus-retirement.md)).
[NEXT.md](NEXT.md) is a frozen historical record, not current
direction. The 2026-08-13 review-watch log moved to
[docs/review-watch-log.md](docs/review-watch-log.md).

## Gates

One command runs the whole battery — root typecheck and tests, the
workspace package scripts, and the `go`, `proto/go`, and `proto/ts`
gates in order:

```bash
bun run gates
```

`bash scripts/gates.sh` and `pwsh -File scripts/gates.ps1` invoke the
same plan, so the Unix and Windows entrypoints cannot drift. Pass
`--self-test` to check that the runner still fails when it should.

The model gates are separate and are **not** part of that battery. Run
the one your change touches:

```bash
bash verify/fabric/run.sh        # Plait F1–F4, F2b, F9 — also regenerates its corpus byte-for-byte
bash verify/fabric-veil/run.sh   # Plait F5 — the register's inductive invariants
bash verify/moves/run.sh         # the move calculus
```

`verify/{catalog,ir,implication,pipeline}/run.sh` follow the same
shape.

Long JCS differential fuzzing runs the real TypeScript and Go
implementations against each candidate. From PowerShell, use
`$env:FOLDLAB_JCS_FUZZ_RUNS=100000; bun test packages/core/test/jcs.differential.test.ts; Remove-Item Env:FOLDLAB_JCS_FUZZ_RUNS`;
for Go's native fuzzer, use
`cd go; go test ./canonical -run=^$ -fuzz=FuzzJCSDifferential -fuzztime=10m`.

## Pinned versions

`effect@4.0.0-rc.108`
([source tag](https://github.com/Effect-TS/effect/tree/effect%404.0.0-rc.108)),
Go 1.26, `nats-server v2.14.4`, `nats.go v1.53.1`, `@nats-io/* 3.4.0`.
Lean 4.33.0 for the Plait fabric, moves, and IR packages; Lean 4.28.0
with Veil for the register package.

## How to refute a claim

Refutation is a contribution, and the machinery ships in the repo. A
wall claim falls to a byte — inputs on which the two implementations
disagree. A model claim falls to a trace at the stated bounds. A
conformance claim falls to a divergence — a schedule on which the
binary and the model disagree. Counterexamples are kept and committed;
the repository already carries five of its own.

foldlab is a lab rather than a product: nothing here is published, and
the repository takes responsibility for one thing above all — that
every claim it makes is recorded in [VERIFICATION.md](VERIFICATION.md)
with its rung, its bounds, and its residuals.
