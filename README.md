# foldlab

[![gates](https://github.com/mepuka/foldlab/actions/workflows/gates.yml/badge.svg?branch=main)](https://github.com/mepuka/foldlab/actions/workflows/gates.yml)

**foldlab builds Plait: a way for programs on different machines to
work on the same data without stepping on each other — and to prove
it.**

Say you have several programs running at once — services, background
workers, scripts, AI agents behind tool calls — and they all need to
agree about a shared, growing body of information. The usual answer is
a database with locks, or a queue with retries, or a distributed
consensus system, and then a long argument about which operations are
safe to run twice.

Plait's answer is to split that problem in two. Most of what those
programs produce is **evidence**: facts that only ever accumulate.
Evidence can be copied, delayed, duplicated, and delivered out of
order without any harm, so Plait never tries to order it. A much
smaller set of things are **decisions**: exactly one party gets to
commit an outcome. Those get a single, fenced coordination point.

The interesting part is that you do not have to guess which is which.
The mathematics decides, the framework keeps the two kinds physically
apart in different machinery, and the guarantees are machine-checked
proofs that live in this repository and run on your laptop.

Created and directed by [Mepuka Kessy](https://github.com/mepuka).
Licensed [Apache-2.0](LICENSE).

## The bet, in one sentence

> Programs coordinate by growing a shared, content-addressed body of
> evidence that is safe to replicate sloppily, plus a small number of
> declared decision points that are not. The mathematics says which is
> which, and the framework keeps the two physically apart.

Two phrases in that sentence are doing real work.

**Content-addressed** means every piece of evidence is named by the
SHA-256 hash of its own canonical bytes. A reader re-derives the name
from the bytes it received and compares. If they differ, the message
is refused. Nobody is trusted; only bytes are checked.

**Safe to replicate sloppily** means the evidence side tolerates
out-of-order, repeated, and re-delivered messages *by construction* —
not by configuration. There is no ordering knob and no
conflict-resolution strategy to get wrong, because there is no knob.

## Why the proofs are the product

A coordination guarantee is worth exactly what you can check about it.
Most systems ask you to trust a design document. This one ships the
checking, and you can run it:

- **The laws are machine-checked.** A proof assistant verified every
  step down to its kernel; no reviewer's judgement sits in the loop.
  Four proof packages carry more than four hundred rostered results
  between them, and each gate counts its own roster, so a theorem that
  quietly disappears fails the build rather than passing it.
- **The answer keys are generated, never typed.** Where a test needs
  to know what the model says, the model *emits* the answers and the
  gate regenerates them and compares byte for byte. Hand-writing a
  model's verdict is banned outright: a transcription slip makes both
  sides agree on a falsehood, and two sides agreeing is the exact
  thing a differential test exists to check.
- **Every gate ships mutants that must die.** A prover that cannot
  fail proves nothing, so each gate carries deliberately broken
  variants of the code it guards, each committed alongside the trace
  of the diagnostic that kills it. A control that is committed but
  never executed fails the gate.
- **Every claim carries its bounds.** [VERIFICATION.md](VERIFICATION.md)
  records each claim with how strongly it is established, exactly
  where the evidence stops, and the file it is checkable at. **A claim
  absent from that ledger is not made.** If any other document in this
  repository contradicts the ledger, the ledger wins and the document
  is the bug.

That is the reason to look at this one: you can check what you are
being told, at the strength it was told at.

## Run the proofs yourself

Everything below runs from a fresh checkout. The battery needs
[Bun](https://bun.sh) and Go. The Lean proof packages additionally need
[elan](https://github.com/leanprover/elan), which supplies `lake`; the
TLA+ model gates need Java 21.

The whole battery — typecheck, tests, the workspace package gates, and
the Go and tracer suites, in order:

```bash
bun install
bun run gates
```

`bash scripts/gates.sh` and `pwsh -File scripts/gates.ps1` invoke the
same plan, so the Unix and Windows entrypoints cannot drift. Pass
`--self-test` to check that the runner still fails when it should.

The proof packages are deliberately **not** part of that battery —
they are slow and they need a Lean toolchain. Run the one you care
about:

```bash
bash verify/kernel/run.sh        # the language: the one door and its laws
bash verify/unity/run.sh         # the emitter that mints the corpus
bash verify/fabric/run.sh        # the coordination algebra
bash verify/fabric-veil/run.sh   # the register's safety invariants
bash verify/moves/run.sh         # the epistemic move calculus
```

`verify/{ir,projections}/run.sh` are the other Lean gates;
`verify/{catalog,journal,implication,pipeline}/run.sh` are the TLA+
ones. Each is self-contained: it builds, diffs its theorem roster
against a fresh scan of its own sources, sweeps every theorem's axiom
footprint, regenerates its corpus and byte-compares it, and executes
its planted mutants against their committed traces.

The two cross-language walls run on their own:

```bash
cd go
go run ./cmd/plaitwall \
  --corpus ../packages/plait/fixtures/envelopes.ndjson
go test ./register/...
```

## How it fits together

Five things, and the dependency runs one way through all of them.

**1. A Lean model states the language.** [verify/kernel/](verify/kernel/)
defines the whole vocabulary Plait speaks — eight generators, the
closed set of sorts, and one admission function that decides whether a
proposed act is lawful. Unlawful acts are not merely rejected: in the
intrinsic layer of the model they have *no constructor at all*, so
they cannot be spelled. A parallel candidate layer *can* spell them,
which is what makes it possible to prove that the door refuses them.

**2. An emitter mints one corpus file.**
[verify/unity/](verify/unity/) runs that model and writes
`packages/plait/fixtures/kernel-conformance.ndjson` — the model's own
answer key. It carries the closed tables, the encoding vectors, the
admission verdicts for planted candidates, and small multi-step
programs. Every row is *computed* by executing the model, never typed
by a person.

**3. TypeScript surfaces are generated from that corpus.** The tables,
schemas, program builder, plain-TypeScript SDK, refusal vocabulary,
MCP tool schemas, and the human-readable language reference at
[docs/generated/kernel-language.generated.md](docs/generated/kernel-language.generated.md)
are all emitted from the same file and byte-compared by gates. The
house rule is *served equals derived*: a hand-written twin of a
generated surface is refused.

**4. One door judges everything.** `KernelDoor.admit` in
[packages/plait/src/kernel/](packages/plait/src/kernel/) is the single
admission function. Every surface — the Effect API, the CLI, the MCP
tools — routes through that exact function object rather than a
wrapper, and a sweep in the battery fails if a second validator appears
anywhere in the package. A refusal is a value carrying the law it defends and a repair
that would satisfy it, so a caller (human or model) can fix its own
mistake without reading documentation.

**5. Carriers move the admitted acts.** Only after the door admits
does anything touch storage or the network: evidence streams, durable
folds, lattice cells, the fenced register, the catalog, blobs. The
substrate is NATS JetStream. A node is anything that speaks the wire
contract — an Effect process, a Go binary, a shell script, a model
behind a tool interface. Nothing about a node's insides is trusted.

Beside all of that, [go/](go/) carries an independently written Go
twin of the parts that matter most — canonical JSON, the journal, the
register, the corpus reader — so that agreement between two languages
is evidence rather than a shared assumption.

### The eight generators

Everything Plait can be asked to do is one of these, or a composition
of them. Sessions, tasks, workflows, memory, schedules, and search are
not features; they are compositions.

| Generator | What it does |
| --- | --- |
| `declare` | put a value in the catalog under a policy |
| `resolve` | look a value up by its hash |
| `emit` | append a fact to an evidence stream |
| `join` | merge a contribution into a mergeable value |
| `fold` | reduce a stream — every "as of now" read is this |
| `decide` | commit an outcome under a fencing token |
| `trigger` | declare a monotone "when X, do Y" |
| `spawn` | derive new authority |

The MCP face is literally these eight, one tool each, with schemas
read verbatim from the model's own projection.

### Reading the vocabulary

This repository has house terms. Each gets a plain gloss the first
time it appears, and these are the ones you will meet soonest:

| Term | Plain meaning |
| --- | --- |
| **the door** | the one admission function; no second one exists |
| **a refusal** | a "no" carrying its law and a repair, as data |
| **the corpus** | the model's emitted answer key, one file |
| **a sentence** | one lawful use of one generator |
| **a wall** | two implementations, one input, digests compared |
| **a fold** | a declared reduction over a stream, resumable |
| **a head** | a 32-byte commitment to an exact history prefix |
| **a fence** | the one place where exactly one party may win |
| **the planes** | the layer ladder the source tree is sorted into |
| **the grill** | the design ritual: one decision at a time, ratified |
| **a rung** | how strongly a claim is established (see below) |

A **rung** is the ladder [VERIFICATION.md](VERIFICATION.md) grades every
claim against:

| Rung | What it establishes |
| --- | --- |
| R0 | fixture walls |
| R1 | property tests |
| R2 | bounded model check |
| R3 | inductive invariant |
| R4 | lockstep conformance against the running binary |
| R5 | mechanized proof |

## What runs today

Merged on `main` and executable from a fresh checkout. Each item names
the ledger entry that licenses it; the bounds live there, and they are
narrow on purpose.

### The language and the door

The kernel corpus, the generated tables and schemas, the SDK, the MCP
tool schemas, the prose reference, and `KernelDoor.admit` itself. Every
model-emitted admission verdict is replayed against the shipping door,
and a refuse-everything mutant makes a green run mean something.

*Ledger:* [Plait kernel admission door](VERIFICATION.md#plait-kernel-admission-door--r0-differential--executable-no-bypass-control)
— R0 differential plus an executable no-bypass control. **Bound:**
agreement on a finite committed corpus, not a proof over all
candidates. The program-run composition is proved model-side only; no
gate ties it to the running code, and none is claimed.

### The spine

Canonical envelope identity and verified delivery: two processes
exchange envelopes through one local JetStream server, the receiver
re-derives every digest, and a mismatch is refused rather than
absorbed. Refusals ride the Effect error channel across the entire
public surface — a gate derives the manifest of every public call
signature from the barrel and fails on any whose error channel is not
a refusal.

*Ledger:* [Plait spine](VERIFICATION.md#plait-spine--r0-differential--executable-integration)
— R0 differential plus executable integration, four generated envelope
rows, one file-backed `nats-server v2.14.4`, `num_replicas: 1`.

### The durable fold

A declared reduction over an evidence stream that survives being
killed. One stream per declared partition, so stream sequence *is* the
fold position by construction; acknowledgements advance only after the
covering checkpoint lands. The `plait chaos` command runs hard-kill and
protocol-redelivery schedules and compares terminal state digests
against independently computed references.

*Ledger:* Plait durable fold (E4) in
[Status at a glance](VERIFICATION.md#status-at-a-glance) — runtime
level, corpus-walled plus chaos. **Bounds:** no liveness and no
exactly-once vocabulary anywhere; buffer limits are flow control with
no correctness stake.

### The register

The one place the fabric coordinates: a lease keyed by a work digest,
carrying a monotone fencing token. Token monotonicity and
at-most-one-landed-commit are proved as inductive invariants and then
replayed onto real NATS compare-and-set — by the TypeScript service
*and* by an independently written Go twin, one fresh server per row in
both runtimes, with no skips.

*Ledger:* [The Plait register (F5)](VERIFICATION.md#the-plait-register-f5--r3--replay-wall)
— R3 plus a replay wall. **Bounds:** safety only, no liveness; R4
stays reserved at the 15,378-schedule bar; at-most-one landed
*outcome* is not at-most-one external side effect — the register
bounds landings, never attempts.

### Contexts, cells, and stores

Lattice cells with a merge-then-compare-and-set write loop, the
catalog and the payload seam beneath it, a content-addressed blob
store with verification inside the service, and resolved references
whose decode re-derives their digest.

*Ledger:* Plait contexts, runtime half (E6) in
[Status at a glance](VERIFICATION.md#status-at-a-glance). **Bounds:**
all claims hold within one backing-stream incarnation; absence
refusals are head-relative, never global; neither the catalog nor the
payload seam ships a durable layer.

### The engine and the faces

Callers speak a candidate sentence, the door judges it, and only an
admitted sentence reaches a carrier. Configuration is declared
sentences. Closed program declarations execute node by node through
that same door, stopping where a refusal fires. Above the engine sit
the CLI and the MCP face, whose eight tool schemas are the model's own
projection served verbatim.

### The substrate gate

The JetStream properties the design consumes, probed executably rather
than assumed: subject compare-and-set, key-value revision lifecycle,
the application permission scope, `SIGKILL` process recovery,
TypeScript-client parity with refusals pinned wire-indistinguishable,
watch replay and tombstones, and object-store integrity.

*Ledger:* Substrate assumptions gate in
[Status at a glance](VERIFICATION.md#status-at-a-glance). **Bounds:**
single node, one replica, file storage. Watch is advisory — silence
never proves absence. The object store has no ranged read at the pin,
so every byte a reader touches is unverified until the read completes.
Process-crash recovery only, never power loss. No clustering.

### What is designed but not built

The estate daemon's full lifecycle, trigger and spawn carriage, the
action plane, and the harness plane (indexes, search, resources,
directories) are ratified in shape and **not built**. The daemon's
groundwork has landed in [go/daemon/](go/daemon/) — the server is
constructed from declared options, its channels are closed by
declaration rather than by omission, and its incarnation fence is
battery-gated — but the spec's remaining slices are not.

The quickstart and the agent mapping label each of their sections
runs-today or design-only, and their design-only code blocks are
sketches lifted from the design records: copying one will not compile,
by construction and on purpose.

### Numbers from one run

Executed first-hand at `346b296` on this branch, `bun run gates` exited
`0`. Inside it, the Plait package's fast group ran 541 tests across 49
files with 3,307 assertions, and its wall group — every suite that
brings up a real `nats-server` — ran 82 tests across 21 files with
1,155 assertions. The public-effect gate inspected 108 emitted
signatures; the plane-layering gate walked 61 modules and 300 edges;
the corpus regenerated byte-identically.

Those are counts from one run at one revision, not durable claims. The
durable claims are in the ledger, and the counting is done by the gates
themselves.

## Repository map

```
foldlab/
├── packages/            the TypeScript workspace (Effect v4)
│   ├── plait/           Plait itself — see the plane ladder below
│   ├── core/            the RFC 8785 canonical-JSON seam
│   └── moves/           the move-calculus kernel, corpus-walled
├── go/                  the Go twin and the substrate
│   ├── canonical/       RFC 8785 in Go, fuzzed against the TS twin
│   ├── journal/         the hash-chained append-only log
│   ├── register/        an independent twin of the fenced register
│   ├── daemon/          the embedded NATS server as a scoped value
│   ├── substrate/       the executable assumptions gate
│   ├── kmconform/       the Go reader of the kernel corpus
│   └── cmd/             the walls as binaries (plaitwall, …)
├── verify/              the formal models and their gates
│   ├── kernel/          the kernel language, in Lean
│   ├── unity/           the bridge: mints the corpus, emits surfaces
│   ├── projections/     reusable Lean projection tooling
│   ├── fabric/          the coordination algebra, in Lean
│   ├── fabric-veil/     the register's invariants, in Veil
│   ├── moves/           the epistemic move calculus, in Lean
│   ├── ir/              the type grammar with denotational semantics
│   └── catalog|journal|implication|pipeline/   model gates
├── proto/               the tracer bullet: daemon, wire contract, MCP
├── docs/                design records, decisions, research, generated
├── fixtures/            frozen root corpora (do not regenerate lightly)
├── scripts/             the gate runners and repo-wide checks
├── scratch/             tracked task briefs and spikes
└── repos/effect/        vendored Effect at the pin, read-only
```

Inside `packages/plait/src/`, modules are sorted onto a five-rung
ladder and a layer may import only itself and deeper:

```
truth  →  kernel  →  planes  →  carriage  →  surface
```

`truth` is canonical bytes, digests, and the refusal vocabulary.
`kernel` is the language: corpus, generated tables and schemas, the
door. `planes` are the state carriers — lanes, folds, anchors, cells,
registers, catalog, blobs, sessions, environments. `carriage` is the
transport clients and the engine. `surface` is the CLI, the MCP face,
and the curated barrel that *is* the public API. A gate walks every
import edge; one pointing the wrong way fails the battery.

Agent operating contract: [AGENTS.md](AGENTS.md). Module directories
carry their own scoped `AGENTS.md` and `CONTEXT.md`; read those before
editing inside.

## Where to go next

- [packages/plait/QUICKSTART.md](packages/plait/QUICKSTART.md) —
  *what is it like to use?* Ten minutes: boot a local commons, watch
  two processes agree on one digest, cause a refusal on purpose. Each
  minute is labelled runs-today or design-only.
- [docs/generated/kernel-language.generated.md](docs/generated/kernel-language.generated.md)
  — *what exactly can I say?* The whole language: every kind, every
  taught refusal with its law and repair, the encoding vectors. This
  page is generated from the corpus and names its source by digest.
- [packages/plait/FOR-WORKING-AGENTS.md](packages/plait/FOR-WORKING-AGENTS.md)
  — *how does this map onto what I already build?* Tool calling,
  domain schemas, skills, subagents, memory, retrieval — six tasks you
  already solve, each with its Plait shape and what it refuses.
- [VERIFICATION.md](VERIFICATION.md) — *what is actually proven, and
  where does the evidence stop?*
- [packages/plait/README.md](packages/plait/README.md) — *what are the
  modules?* The map of the merged spine, module by module.
- [CONTEXT.md](CONTEXT.md) — *what does this word mean here?* The house
  vocabulary. Consulted during work, not read front to back.

## The proof packages

Each package is a self-contained gate. It builds, diffs its theorem
roster against a fresh scan of its own sources, sweeps every theorem's
kernel axiom footprint down to `{propext, Classical.choice,
Quot.sound}`, regenerates whatever corpus it owns and byte-compares it,
and executes its planted mutants against committed traces. A `sorry`
anywhere is a failed build.

| Package | Rostered results |
| --- | --- |
| [verify/fabric/](verify/fabric/) — the coordination algebra | 206 |
| [verify/kernel/](verify/kernel/) — the language and its door | 127 |
| [verify/moves/](verify/moves/) — the move calculus | 39 |
| [verify/fabric-veil/](verify/fabric-veil/) — register safety | 36 |

Three of those four run in CI. The kernel package and its emitter are
run by hand — the kernel README says so itself, and calls its own
status pre-grill — though the corpus they mint is walled inside the
required battery, so a hand-edited corpus still reddens `bun run
gates`.

**The fabric algebra** proves that cell merge is associative,
commutative and idempotent; that replay is invariant under permutation
and duplication; that resumption is anchored; that partitioned folds
recombine; and that policy meets attenuate. Lean 4.33.0, zero
dependencies.

**The kernel** proves what the door is. Three families are worth
naming. *Refusal stability:* a candidate admitted under a smaller
catalog is admitted under every larger one, and a refusal caused only
by "not here yet" is repairable by growth. *Machine repair:* four
candidate rewrites reach a fixpoint in one step, and whatever refusal
survives there is advisory — which licenses an agent to follow taught
repairs without review, because what remains is exactly what needs
information the candidate does not carry. *Program composition:*
running a closed program is walking its nodes through the one door,
stopping at the first refusal, and seven theorems say precisely what
that composition is. Its gate also carries an honest negative result:
no total priority order on refusal reasons reproduces this door,
because the door arbitrates by position inside a payload sweep.

**The register package** discharges the fencing invariants as
generated verification conditions, with SMT proofs reconstructed in
the Lean kernel (`veil.smt.trust=false`). It exports its own execution
rows, each verified against the module's generated transition relation
at export time, and those rows are what the two runtimes replay.

**The move calculus** proves the epistemic core the fabric's
vocabulary builds on: states `open | filled | disputed | decided` over
a fixed finite carrier, three moves, and the absorb discipline that
makes fills total. Its README states what the model does NOT cover,
which is the more useful half: no crash recovery, no compare-and-set,
no leases, no liveness, and no code-model correspondence.
[packages/moves/](packages/moves/) is the TypeScript kernel that
replays the model's own 2,000-vector emitted corpus byte-identically,
with five planted mutants that each die against it. Agreement is
evidence, not proof, and the ledger says so.

**Planted mutants** are how these gates stay honest. Beyond each proof
package's own controls, `packages/plait/negative-controls/` carries
more than forty broken variants of shipped code, each paired with the
committed trace of the diagnostic that kills it: twenty public-surface
regressions, compile-time controls for the branded sorts and the rung
ladder, a commit path with its token guard removed and killed on a live
key-value bucket, a cell write path with its merge deleted, and a
process control that acknowledges before its checkpoint lands.

## The substrate Plait stands on

Plait did not start from a blank page. It was built on a lab that had
already spent its effort making values *nameable*, and that substrate
is why the coordination guarantees are checkable rather than asserted.
The discipline, in one line: **every value has a canonical byte form,
identity is a digest over those bytes, and every cross-boundary claim
is a checkable digest equality.**

### Canonical bytes

[RFC 8785](https://www.rfc-editor.org/rfc/rfc8785) fixes exactly one
byte form per JSON value, so key order stops being information.
`packages/core` (TypeScript) and `go/canonical` (Go) implement it
independently and are held equal by a differential wall, with RFC
8785's own Appendix B as the outside referee. Both-sides-agree is not
verification: two implementations sharing a bug agree, which is how a
`-0` defect survived until the Appendix was made the oracle.

Constrained decoding is the other half. There is exactly one way in
from bytes — one JSON value, valid UTF-8, unique member names after
unescaping, finite binary64, bounded nesting — and a decoder that
*repairs* its input is naming a different value than the one that
arrived, so it refuses instead.

### The five structures

A journal is an append-only log of events. Fold it one way and you get
what the history *means* (state); fold it another and you get a 32-byte
commitment to *exactly this history prefix* (the head). Two journals
can agree in state and differ in head — the house sentence is *the
chain remembers what the fold forgives*. State tells you where you are;
the head tells you every step of how you got there, and both are
recomputable by anyone holding the events.

Beside the log and its two folds sit two more shapes: the
content-addressed store (name a thing by the hash of what it is, so
entries are immutable and there is nothing to invalidate) and the
version-checked register (a compare-and-swap slot with a monotone
fencing token — the one place writers coordinate). Those five are the
minimal answers to the only five questions a distributed system ever
asks: *what happened?* (the log), *what does it mean?* (the meaning
fold), *is it the same?* (the identity fold), *have we done this
before?* (the store), *who decides?* (the register).

Plenty of systems hold two or three. This repository's bet is to hold
all five under one discipline, at every edge, in two languages — and
the typed refusal is what that discipline sounds like when it says no.
Plait's fabric is those five, given coordination machinery.

### The type grammar and the drift kill

[verify/ir/](verify/ir/) makes a Lean model the executable referee for
the `flb.type.v0` type grammar: the grammar stated once as an algebraic
type with a denotational semantics, and eight prose laws about meaning
turned into theorems — brands are denotationally invisible, union
meaning is a property of the member set, catalog growth never
invalidates conformance. The ledger grades its own result rather than
rounding it up, naming which laws are substantively inductive and
which are near-definitional.

The payoff is a drift kill. That grammar is currently restated across
sixteen sites in this repository — eight in Go, five in TypeScript —
with divergent defaults, and a divergence that a generated vector
exposes is a finding rather than a patch. The referee itself is not
built; the README there names the next rungs.

### The tracer bullet

[proto/](proto/) is an end-to-end vertical slice through every layer,
carrying its own gates: a daemon with a catalog, ingress, fourteen
refusal kinds over two sorts, and the ratified wire laws W1–W10 with
frozen fixtures. Its MCP surface derives its tool schemas from the
daemon's own `contract.describe` reply at startup, so a tool schema
cannot drift from the daemon it fronts. That surface belongs to
`proto/`, not to Plait.

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
declared algebra is Effect v4's own `Reducer` with a content address; a
wall is a differential test that two implementations of one reducer
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
  — what each rung R0–R5 establishes and what its gate requires.
- [proto/wire/CONTRACT.md](proto/wire/CONTRACT.md) and
  [proto/SPEC.md](proto/SPEC.md) — what is on the wire: subjects, body
  shapes, refusal kinds, and the ratified laws with their fixtures.
- [docs/design/2026-08-14-learning-by-refutation.md](docs/design/2026-08-14-learning-by-refutation.md)
  — why refusals teach: a typed refusal's (law, path) pair is a
  version-space refinement, precomputed at the boundary, so one refusal
  value corrects a whole class of mistakes.

## The design records

Plait was designed in the open, ruled item by item, and the rulings are
durable. Read them in this order.

**The kernel algebra** —
[2026-08-18-plait-kernel-algebra.md](docs/design/2026-08-18-plait-kernel-algebra.md)
states the current core: the API is a language, the language is the
algebra, the algebra is already proven. Its build spec is
[2026-08-19-algebra-engine-unification.md](docs/design/2026-08-19-algebra-engine-unification.md).

**The fabric, in three parts** —
[2026-08-17-plait-coordination-fabric.md](docs/design/2026-08-17-plait-coordination-fabric.md)
(venues, the commons, lanes, the law statements F1–F6, the slice
ladder), then
[2026-08-17-plait-action-plane.md](docs/design/2026-08-17-plait-action-plane.md)
(actions, triggers, policies, the model seam, laws F7–F10), then
[2026-08-17-plait-harness-plane.md](docs/design/2026-08-17-plait-harness-plane.md)
(indexes, search, resources, directories).

**The rulings** —
[2026-08-17-plait-ratification-record.md](docs/design/2026-08-17-plait-ratification-record.md)
is what has been ruled and by whom;
[2026-08-17-plait-grill-sheet.md](docs/design/2026-08-17-plait-grill-sheet.md)
is the consolidated grill sheet and its rulings;
[2026-08-17-plait-architecture.md](docs/design/2026-08-17-plait-architecture.md)
is the package and module map, binding for the scaffolds.

**The current wave** —
[2026-08-19-estate-daemon-spec.md](docs/design/2026-08-19-estate-daemon-spec.md)
(the server as an owned value, its state as declared facts),
[2026-08-19-substrate-session-plane.md](docs/design/2026-08-19-substrate-session-plane.md),
and
[2026-08-19-prose-bidirectional-and-program-dag.md](docs/design/2026-08-19-prose-bidirectional-and-program-dag.md).

The full design shelf is [docs/design/](docs/design/). Committed
architectural decisions are in [docs/adr/](docs/adr/).

## Long-running variants

The battery above is the fast path. A few longer runs sit off it on
purpose — they are a human act, not a CI default.

Long JCS differential fuzzing runs the real TypeScript and Go
implementations against each candidate. From PowerShell:

```powershell
$env:FOLDLAB_JCS_FUZZ_RUNS=100000
bun test packages/core/test/jcs.differential.test.ts
Remove-Item Env:FOLDLAB_JCS_FUZZ_RUNS
```

For Go's native fuzzer:

```bash
cd go && go test ./canonical -run=^$ -fuzz=FuzzJCSDifferential -fuzztime=10m
```

`bash verify/catalog/run.sh` is the other one — roughly twelve minutes
of model checking, run weekly by `model-gate.yml`.

## Pinned versions

`effect@4.0.0-rc.108`
([source tag](https://github.com/Effect-TS/effect/tree/effect%404.0.0-rc.108)),
Go 1.26, `nats-server v2.14.4`, `nats.go v1.53.1`, `@nats-io/* 3.4.0`.
Lean 4.33.0 for the kernel, unity, projections, fabric, moves, and IR
packages; Lean 4.28.0 with Veil for the register package.

## How to refute a claim

Refutation is a contribution, and the machinery ships in the repo.
Each kind of claim falls to one kind of artifact:

| Claim kind | What refutes it |
| --- | --- |
| Wall claim | a byte: an input the two implementations disagree on |
| Model claim | a trace violating a named invariant at the bounds |
| Conformance claim | a schedule the binary and the model disagree on |

Counterexamples are kept and committed rather than deleted once fixed;
the repository carries its own, and the findings that produced them
live in [docs/findings/](docs/findings/).

Off-path work — the stream and transform walls, the effector, the
gauntlet lanes, the demo server, the guided tour — was archived whole
on 2026-08-15 at tag `archive/pre-estate-focus`
([manifest](docs/research/2026-08-15-estate-focus-retirement.md)).
[NEXT.md](NEXT.md) is a frozen historical record, not current
direction.

foldlab is a lab rather than a product: nothing here is published, and
the repository takes responsibility for one thing above all — that
every claim it makes is recorded in [VERIFICATION.md](VERIFICATION.md)
with its rung, its bounds, and its residuals.
