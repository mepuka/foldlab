# Plait for working agents

You already build agents. You declare tools, model a domain, bundle instructions,
spawn subagents, keep memory, and retrieve context. This page takes those six
tasks one at a time and shows the concrete Plait shape for each — what you write,
what the substrate does with it, and what it refuses to do.

It is not a pitch. Every section is labelled with what you can run today and what
is designed but unbuilt, because the thing Plait sells is that its claims are
checkable, and a document that blurs the line would be selling the opposite.

## How to read the labels

| Label | Means |
| --- | --- |
| **RUNS TODAY** | executed against `packages/plait` as merged on `main` while writing this page. Console output shown is real output from that run |
| **LANDS WITH E`n`** | designed and ratified in shape, not built. Code blocks are sketches lifted from the design records — **copying them will not compile** |
| **NEEDS A DECISION** | the design records leave this open. Named here, filed as a finding, never invented |

The epics referenced: **E2** the spine (merged), **E3** the fabric model (merged),
**E4** the durable fold, **E5** the register (merged), **E6** contexts and the
catalog, **E9** actions and triggers, **E11** adoption surfaces and MCP, **E12**
the harness plane (indexes, search, resources, directories).

Where a claim has a bound, the bound is in the same sentence as the claim.
`VERIFICATION.md` is the authority; if a sentence here contradicts it, that file
wins and this page is the bug.

## Words this page uses

House vocabulary, glossed once so nothing below needs a decoder ring.

| Term | Meaning here |
| --- | --- |
| **digest** | lowercase hex SHA-256 over a value's canonical (RFC 8785) bytes. A value's identity, re-derived by every reader, never asserted |
| **canonical bytes** | the one byte form RFC 8785 fixes for a JSON value. Key order stops being information |
| **declaration** | configuration expressed as a value rather than a file of prose: it has a digest, it diffs, it is refusable, it is attributable |
| **catalog** | the content-addressed store declarations live in. Resolving a digest re-derives it and refuses on mismatch |
| **lane** | one declared stream of evidence: event schema, partition count, partition-key derivation |
| **evidence** | append-only, holder-attributed observations. Safe to duplicate and reorder — that is a proved property, not a configuration |
| **register** | a lease keyed by a *work digest*, carrying a monotone **fencing token**. The one place the fabric coordinates |
| **work digest** | the digest of an action declaration. It is the register key, so "the same call" and "the same key" are the same fact |
| **anchor** | a fold's checkpoint fact: `(fold digest, partition) → (position floor, state digest, head)` |
| **cell** | a lattice value merged by least upper bound — never overwritten |
| **writ** | what a seat may do, as a value on a meet-semilattice. Compiles to an Effect `Layer` stack |
| **refusal** | a structured "no" carrying the law it enforced, the path that broke, what it got, what it expected, and the legal next steps. A value you read, not a stack trace |
| **structural / absence** | the two refusal sorts. `structural` is permanent (repair it); `absence` means *not here yet* and is the only sort the shipped retry policies touch |

---

## 1 · Tool use and tool calling

**The task.** Declare a tool with typed inputs and outputs, let a model see it,
let the model call it, and make sure the call happens once.

**The Plait shape.** A tool is a **cataloged capability declaration** — schema in,
schema out, and the effect door it opens — not a prose config block (ruling G12:
programs, frames, toolkits are cataloged values with digests and walls, never
files of prose config). A tool *call* is an **action declaration** whose digest is
the register key. So "did this call already happen?" is answered by a lookup on
content, not by a correlation id someone remembered to pass.

### 1a. Declaring a capability — LANDS WITH E9

Sketch from the design records (part 2 §6, architecture §2 `Capability.ts`).
**Does not compile today.**

```ts
import { Schema } from "effect"
import { Capability } from "@foldlab/plait"

const SearchDocs = Capability.declare({
  name: "search-docs",
  input: Schema.Struct({ query: Schema.String, k: Schema.Int }),
  output: Schema.Struct({ hits: Schema.Array(Digest) }),
  door: "read",                     // the writ verb this capability needs
})
// SearchDocs.digest — the capability's identity, versioned by content
```

Two properties fall out of that being a *value*:

- **Versioning is not a policy you adopt.** Change the input schema, change the
  digest. The old declaration keeps resolving from the catalog, so anything
  pinned to it keeps meaning what it meant.
- **The description a model reads is derived, never hand-written.** A toolkit is
  a semantic fold over cataloged capability declarations; each rendered
  description carries its source digest. `Models.generate` takes assembled
  Context Values, not strings, and the API refuses a hand-written tool
  description string (part 2 §6.4). The wall behind that rule is
  *served-equals-derived*, already shipped and digest-walled on the estate's
  daemon MCP layer (architecture §5).

**Bound, stated because it is easy to overread.** Architecture §5 also says the
MCP tool list an agent sees is *projected through its writ* — a worker-seat
connection is served worker-writ tools only. That projection inherits the
frontier's **projection-soundness IOU**, which is still owed. Until it is
discharged, writ-projected tool lists are a design intent with an outstanding
proof obligation, not a delivered guarantee.

### 1b. A call landing exactly one outcome — RUNS TODAY

This is the part you can check right now, because the register merged with E5.
Two workers race the same declaration; both emit evidence, one lands the outcome,
and the loser is told precisely why.

Run from `packages/plait` against a local commons
(`.plait/nats-server -js -sd .plait/store -a 127.0.0.1 -p 4222`, pinned
`nats-server v2.14.4`):

```ts
import { Effect } from "effect"
import { digestOf } from "@foldlab/plait/Digest"
import { Registers } from "@foldlab/plait/Register"

const program = Effect.gen(function* () {
  // No Capability module yet — but a declaration is just a value, so its
  // digest is computable today with nothing but Digest.
  const capability = yield* digestOf({ name: "search-docs", door: "read" })
  const work = yield* digestOf({ capability, args: { query: "zombie" }, round: null })
  const registers = yield* Registers

  const a = yield* registers.grant(work, "worker-a")
  const b = yield* registers.expireSteal(work, "worker-b")   // a stalls; b takes over

  // worker-a wakes up holding the old token and tries to land its result.
  yield* registers.commit(work, a.token, "outcome:from-zombie").pipe(/* print the refusal */)

  const landed = yield* registers.commit(work, b.token, "outcome:from-winner")
  yield* registers.commit(work, landed.token, "outcome:second-try").pipe(/* print it too */)
}).pipe(Effect.provide(Registers.layer({ servers: url })), Effect.scoped)
```

```
grant        worker-a  token=6
steal        worker-b  token=7
refused      worker-a  kind=stale-register-token  sort=structural
             law=no stale token ever lands
             got=6  expected=7
             next=[{"subject":"register.observe","note":"Observe the register for the current token and landed outcome; this round is superseded; do not retry this commit."}]
committed    worker-b  token=7  outcome=outcome:from-winner
refused      worker-b again  kind=outcome-already-landed  law=an outcome, once set, never changes
```

Read the refusal, not the happy path. It names the law it enforced
(`no stale token ever lands`), gives you the two numbers that differ, and tells
you the *legal next move* — including the instruction not to retry, because this
is a `structural` refusal and no amount of waiting makes a stale token current.
The shipped retry helper (`Refusal.retryAbsence`) will not touch it.

The claim, in the exact words the program uses: **at most one commit lands per
work digest.** It is a safety claim. Nothing promises a commit lands at all, or
that a stalled worker is noticed promptly; Plait makes no liveness claims, and
"exactly once" is not vocabulary this program uses.

**Evidence for that claim, with its rung.** F5 — token monotonicity and
at-most-one-landed-commit — is machine-checked as an inductive invariant of a
five-action Veil module with `veil.smt.trust=false` (reconstructed SMT proofs,
not trusted ones), and carried onto the real substrate by a replay wall: the TS
`Registers` service and an independent Go twin replay all 15 model-exported rows
over real NATS KV revision CAS with verdict, law-name and observed-state
equality. Rung: R3 plus the replay wall; **R4 stays reserved** at the
15,378-schedule bar and no R4 language attaches until a lockstep run at that bar
exists. Bounds: safety only; single non-clustered node, R=1, file storage; every
runtime claim holds within a fixed backing-stream incarnation, and the
incarnation pin at register-open is a recorded deferral. Full row and residuals:
`VERIFICATION.md`, "The Plait register (F5)".

**One DX note from running it.** The fencing token is the KV entry revision, and
NATS KV revisions are stream sequences — so they are bucket-global, not
per-register counters. A first grant on a fresh work digest is not `token=1`
(above it is `6`). Tokens are opaque monotone ordinals; never render one to a
user as "attempt number", and never derive a per-work retry count from one.

### 1c. The bound that matters most

> **At-most-one landed *outcome* is not at-most-one external *side effect*.**
> The register fences Plait's record, not a vendor's API. A worker that called a
> payment API and then lost its lease before committing has already called the
> payment API.

Where a vendor supports an idempotency key, **the work digest is the natural
one** — stable across retries of the same declaration and different for a new
round, both by construction. Where a vendor supports none, the bound is the
bound; the mitigation is declaration granularity (make the fenced unit the
externally-visible unit) plus an ordinary compensating pattern, never a claim
that the fabric made a foreign API transactional. This is ruling G23, and it
rides every page and every ledger row that claims an action property — including
the register's own row in `VERIFICATION.md`, in these words: *the register bounds
landings, never attempts.*

---

## 2 · Domain schemas

**The task.** Model your domain once, validate at the boundary, and get errors an
agent can act on rather than a stack trace a human has to decode.

**The Plait shape.** Effect Schema is the modelling surface — no second schema
language, no registry handshake. What Plait adds is three things: types enter the
**catalog** and get digests; references decode by *resolving* them (verify-on-read
is the schema, not a step you remember to call); and every admission failure is a
**refusal** carrying the law it enforced and the repair that would satisfy it.

### 2a. Declare, digest, carry — RUNS TODAY

```ts
import { Effect, Result, Schema } from "effect"
import { digestOf } from "@foldlab/plait/Digest"
import { decodeEnvelope, encodeEnvelope, type Envelope } from "@foldlab/plait/Wire"

// An ordinary Effect Schema domain type. Nothing Plait-specific about it.
const TermCount = Schema.Struct({
  doc: Schema.String,
  terms: Schema.Record(Schema.String, Schema.Number),
})

const admitted = Schema.decodeUnknownResult(TermCount, { onExcessProperty: "error" })({
  doc: "doc-1",
  terms: { fabric: 2, plait: 1 },
})
```

```
schema id    58927c8f7aedb36874471c4669abd522f21efe0339a69ec6130c49b4feab3784
envelope     c17bb2bd52274f5d51a0cdeb84b217944ef80c3b6eaf61dc724565f726a8fb45
body id      18088fc4c547f3e779176db3b5e7d89c432bb548c3021bc5c931674b22112a5f
reordered    18088fc4c547f3e779176db3b5e7d89c432bb548c3021bc5c931674b22112a5f   equal=true
```

`body id` and `reordered` are the same value written with its keys in the other
order. Same digest — canonical bytes fix one form per value, so field order is
not information and no developer-supplied identifier exists anywhere in that
chain to get wrong.

The envelope carrying it also carries an optional **certificate**: which schema,
which program, which input anchor, which span head. That is a *recomputable*
derivation claim — an auditor re-derives every field. The spine carries the
certificate today; the machinery that checks it arrives with later slices.

### 2b. Refusals with taught next steps — RUNS TODAY

The most useful thing to learn early is what the admission door refuses. Two
real refusals from the same run — one for a field the domain never declared, one
for a body over the inline threshold:

```
refused      kind=malformed-envelope  sort=structural
             law=Envelope v0 is a closed struct; excess properties are refused.
             path=["confidence"]  expected="no excess property"
             next=[{"subject":"decode","note":"Submit one closed Envelope v0 value with the expected field shape."}]

refused      kind=inline-body-too-large  path=["body"]  got=300013  expected=262144
             next=[{"subject":"decode","note":"Store the body as a blob and submit the exact {blob: Digest} form.","body":{"blob":"0000…0000"}}]
```

Note the second one hands back a **skeleton of the correct shape** in `next.body`.
The refusal contract is `kind, sort, law, path, got, expected, next` — a
structure. That matters more for agents than for people: an agent can branch on
`sort`, cite `law` in a report, and follow `next` without a model having to
parse English. `sort: "absence"` is the only class the shipped retry policies
touch, and structural refusals pass through once, by construction
(`src/truth/Refusal.ts`, `retryAbsence`).

Where other stacks give you "closed struct, excess properties refused" as a
strictness setting you can turn off, here it is the law the wire contract is
defined by. That is a real cost: you cannot ship an extra field to production
ahead of the schema change. The trade is that no consumer ever silently ignores
a field it did not expect.

### 2c. References that decode by resolving — LANDS WITH E6

The architecture record's Schema-R move. Sketch; **does not compile today.**

```ts
// Decoding requires the Catalog (and Payloads for large bodies) from the
// environment; decode re-derives the digest of what it fetched and refuses on
// mismatch. Service channels propagate, so resolved values may themselves hold
// resolved references.
export interface ResolvedOf<A, RD = never, RE = never>
  extends Schema.Codec<A, Digest, Catalog | Payloads | RD, RE> {}
```

Three consequences worth the ink, each a deliberate DX property:

- **The type documents its substrate dependencies.** An envelope whose body
  embeds `Resolved(TermMap)` type-requires `Catalog | Payloads`. A handler that
  decodes it cannot compile without those services. What a message needs from
  the fabric is visible in its type, not in prose.
- **Re-derivation is unskippable.** There is no decode path that trusts an
  asserted digest.
- **Encode is total and does not publish.** `encode` computes the digest and
  writes nothing, so derivation, replay, and memo-key computation stay runnable
  with no environment at all; publishing is a separate explicit act.

**A small compile-time win you get today.** The package is built under
`exactOptionalPropertyTypes`, so the common TypeScript idiom
`{ ...envelope, cert: undefined }` is a *type error* before it is ever a runtime
refusal — an optional key is genuinely optional, not "present and undefined". If
you reach the runtime refusal for that case (an untyped caller, a JS consumer),
it fires as `non-canonical-value` with `path: ["cert"]`, correctly locating the
field; its `next` says "replace the value" where "omit the key" is the actual
repair. Minor, filed as **F-4**.

---

## 3 · Skills

**The task.** Bundle instructions, a set of tools, and a permission profile into
a named thing you can hand to an agent, share across a fleet, and upgrade.

**The Plait shape.** A skill is not a new construct — it is a triple of things
Plait already has, each cataloged:

| Skill part | Plait construct | Lands with |
| --- | --- | --- |
| the instructions | a **frame** — a cataloged context value, volatility class `static` | E6 |
| the tools | a **toolkit** — a semantic fold over cataloged capability declarations | E9 |
| the permissions | a **policy** with its writ profile, a value on the meet-semilattice | E9 |

Loading is by digest reference. Upgrading means publishing a new declaration,
which yields a new digest — so "which version of the skill produced this output"
is answerable from the output's own certificate, not from a changelog.

### 3a. What the contrast actually is

Against a skill defined by a directory of prose config files:

| | Prose-config skill | Plait skill |
| --- | --- | --- |
| identity | a path and a version string someone maintains | the digest of the bundle's declarations |
| diff | a text diff of files | a value diff; the digest changes iff the meaning changed |
| attribution | whoever last touched the file | the declaration's admission record |
| tool descriptions | hand-written, drift from the implementation silently | derived from the capability declarations the runtime executes, walled served-equals-derived |
| "which skill version produced this?" | inferred | on the certificate |

The load-bearing half of that table is the last two rows, and only one of them is
shipped anywhere yet: served-equals-derived is enforced by digest wall on the
estate's existing daemon MCP layer, which is the precedent Plait generalizes.
The frames-and-toolkits half is E6/E9 work.

### 3b. What is genuinely undecided

Nothing in the ratified records mints a `Skill` declaration kind. Two readings
are open, and they are not equivalent:

1. a skill is **sugar** — a petname in a `Directory` (E12) resolving to three
   independent digests, with no bundle identity of its own;
2. a skill is a **declaration kind** whose digest covers the triple, so the
   bundle itself is a citable, pinnable value.

Reading 2 is what makes "this output came from skill S@`digest`" a single fact
rather than three. Reading 1 costs nothing to build. This is filed as **F-1**,
because a document that picks one silently would be inventing ratified content.

Also unresolved and *already owned elsewhere*: what publishing a successor
declaration licenses for consumers pinned to the predecessor. That is the
declaration-upgrade law, deferred to its owner by ruling G22 and flagged in part
3's gap table (row 11) as "flagged, not answered". Until it lands, "upgrade a
skill by publishing a new declaration" describes the *write*, and says nothing
about what already-deployed folds, anchors and cached results keyed by the old
digest are entitled to do.

---

## 4 · Subagents and delegation

**The task.** Have an agent hire helpers, give them less authority than it has,
and be sure that stays true down an arbitrarily deep chain.

**The Plait shape.** A seat holds a **writ**. Spawning is defined as
`child = parent ⊓ requested` — the meet on the policy semilattice, componentwise:
writ bits AND, budgets min, allowlists intersected, class floors min. There is no
other spawn form, so escalation is not a case that gets checked, it is a case
that is unrepresentable.

**The law.** **F9 (attenuation):** in any action tree, every descendant's
effective policy ≤ the root's. Induction on the tree; meet monotonicity does the
work. It is proved at the model level in the zero-dependency `verify/fabric` Lean
package (73 rostered theorems, axiom footprint censused inside
`{propext, Classical.choice, Quot.sound}`, law-dropping negative controls each
dying on their named vectors, model-emitted vectors regenerating byte-for-byte in
the gate). Run it: `bash verify/fabric/run.sh`.

**The bound, and it is a big one.** That is a proof about the *model* — policies
and trees as Lean objects. Nothing in the running code consumes that model's
corpus today, so there is no proof that any shipped code implements the proved
model. The faithfulness wall and the required-battery tripwire land with the E4
and CI dispatches. The honest sentence is "the mathematics is checked; the wiring
to the code is not."

### 4a. Writ as the R channel — LANDS WITH E9

Sketch from part 2 §6.1. **Does not compile today.**

```ts
const WorkerSeat = Policy.declare({
  name: "distill-worker",
  modelClass: "compact",          // capability floor, provider-free
  effortClass: "low",
  writ: { emit: true },           // and nothing else
  context: [DistillWorkerProgram],
  budgets: { tokensPerAction: 20_000, costPerAction: usd(0.05) },
})

const FrontierSeat = Policy.declare({
  name: "distill-lead",
  modelClass: "frontier",
  effortClass: "high",
  writ: { emit: true, fill: true, dispute: true, closeParticipate: true,
          spawn: { max: 32, atMost: WorkerSeat } },   // attenuation: ⊓ enforced
  context: [LeadProgram, ReviewProgram],
  budgets: { tokensPerAction: 400_000, costPerRound: usd(8) },
})

// R = Contexts | Models | Lanes — exactly the worker writ. Adding a
// Registers.commit here is a type error under WorkerSeat's layer.
const extract = Actions.handler(ExtractTerms, (input) =>
  Effect.gen(function* () {
    const ctx = yield* Contexts.assemble(DistillWorkerProgram, input.anchors)
    const out = yield* Models.generate({ context: ctx, output: TermsSchema })
    yield* Lanes.emit(DistillLane, { body: out, cert: ctx.certificate })
    return out.digest
  })
)
```

`Policy.layer(p)` provides exactly the services `p`'s writ licenses. A worker
handler that tries to commit an outcome does not fail at runtime — it fails to
compile, because `Registers` is not in its Layer stack.

**Say the honesty box out loud, every time:** *type-level writ is developer
experience, not security.* A malicious node ignores your types. The security half
is server-side refusal — CAS, close authority, daemon validation, NATS
permissions — plus an attribution decision that has not been made. Ruling G10
carries that bound and it is restated wherever the writ story appears, including
here.

There is a measured finding behind that caution, not a hypothetical: seat
bindings are unauthenticated strings today, and any credentialed connection may
act as any bound principal. Consequently **Plait can partition tenants and cannot
yet claim isolation between them.** A deployment may run many tenants under one
operator's credentials; a deployment may not advertise cross-tenant isolation
until the attribution decision lands.

### 4b. Model tiers are policy, not code

`compact | standard | frontier` are **capability classes**, and provisioning is a
`LayerMap` keyed by class, bound to concrete provider layers at deployment
configuration. Provider names in a policy are refused (part 2 §6.4). Tiering is
configuration; the fabric never learns a vendor name.

The consequence worth having: the same lattice covers a small-model worker, a
frontier-model lead, a test harness, and a human reviewer. A human approving a
step is a seat filling a hole — the fabric cannot tell the difference and does
not care. That is the agent-agnosticism thesis at the action layer: **a tier is a
policy, a policy is a value, and the fabric coordinates values.**

Budgets are liveness machinery and say so: they pace and interrupt (exhausted
budget → interruption → lease lapses → another claimant steals), they never enter
identity, they never gate meaning, and no ledger claim will ever be made about
them beyond measured scoreboard numbers.

---

## 5 · Memory and state

**The task.** Keep what the agent learned, resume after a crash, and be able to
answer "why did it think that?" a week later.

**The Plait shape.** Four kinds of memory, each with a different law, and none of
them a conversation buffer.

| Kind | Construct | The law | Lands with |
| --- | --- | --- | --- |
| working state | **cell** — a lattice value, merged by least upper bound | **F1/F2**: merge is associative, commutative, idempotent; the terminal state is invariant under permutation *and* duplication of the trace | E6 |
| checkpoints | **anchor** — `(fold digest, partition) → (position floor, state digest, head)` | **F3**: folding a resumed prefix then the rest equals folding the whole | E4 |
| long-term declarative | **catalog** — the store of admitted declarations | verify-on-read: resolve re-derives the digest and refuses on mismatch | E6 |
| the record | **journals and lanes** — append-only, holder-attributed | **F2b**: the successor discipline applies each event once over an at-least-once redelivery schedule | E4 |

### 5a. Merge, never overwrite

```ts
// Read revision r, merge locally (⊔), CAS at r; on race, re-read and re-merge.
yield* Cells.update(membershipCell, (current) => Lattice.join(current, mine))
```

`Cells.update` takes only a join. There is no ordering parameter, no
conflict-resolution strategy, no last-write-wins register — not because those
were left out, but because F1 says two nodes that verified the same evidence set
hold the same state regardless of the order it arrived in, and a knob would have
nothing left to choose between. Convergence of the value is the proved shape;
termination of the retry loop is liveness and carries no claim.

The same law is why redelivery is invisible to your code. JetStream's real
delivery semantics — at-least-once, redelivery, no cross-consumer order — is the
*correct* delivery semantics for the evidence plane, not a hazard to engineer
around. Duplicates are no-ops by idempotence; reorderings are no-ops by
commutativity; a redelivery storm costs bandwidth, never meaning.

### 5b. Resume is the only verb

```ts
const handle = yield* Folds.deploy(TermCounts, { checkpointEvery: 512 })
yield* handle.await
```

Look at what is *absent*: no `durability` setting, no `reset`, no `rebuild`, no
`invalidate`, no offset management. `Folds.deploy` resumes from the anchor if one
exists and starts fresh if it does not, because the anchor is a fact keyed by
`(fold digest, partition)` rather than mutable bookkeeping. That absence is
downstream of F3 and F2b: if those hold, a durability setting has nothing to
choose between.

Get the attribution right, because it is easy to state backwards: **the successor
discipline protects; the anchor floor records.** The floor is the derived resume
coordinate, not the mechanism keeping a duplicate from applying twice. The Lean
package carries `guard_is_redundant`, the proof that a position-floor guard would
be observationally redundant given the discipline — so the runtime ships no such
guard. The estate declines to defend against a scenario its model proves cannot
arise.

**Status:** F1, F2, F2b, F3, F4 and F9 are machine-checked at the model level in
`verify/fabric` (merged, gate green). F2b's in-window contiguity premise is part
of the statement, not a caveat on it — arbitrary reordering without that
discipline is out of scope by the theorem's own wording. Nothing running consumes
that model's corpus yet.

### 5c. Head-relative truth — the contrast that matters

**F8: a context assembled at heads H is never *wrong* later.** It is a true record
of a position in the DAG. Staleness is head-relative **absence** — repealed by
reassembling at newer heads — never corruption. (F8 is ruled a *corollary*, not a
theorem: its safety content is F7 at pinned inputs plus F3's resumption plus the
absence-sort refusal semantics. No gate refusal cites F8 by name.)

Against a conversation buffer, the difference is not size, it is what a stale
entry means. In a buffer, an old summary is *wrong* and you need an eviction
policy to stop it poisoning the next turn. Here it is *true at its anchor*, and
the newer view is a different value with a different digest, pinned to the old
one. Re-prompting gets a semantics: a fresh attempt is a new round with a new
context digest pinning its predecessor. Nothing is invalidated; things are
superseded, and the supersession is a fact you can walk.

---

## 6 · Retrieval and RAG

**The task.** Retrieve relevant material, put it in the prompt, and be able to
answer afterwards: what exactly did the model see, and why that rather than
something else.

**The Plait shape.** An **index is a fold whose state answers questions** (C10):
same declaration shape as any fold — lanes, algebra, step, partitions, key —
plus one new field, a declared **query algebra**, a pure function
`(state, query) → result`. It deploys through `Folds.deploy`'s discipline, so it
inherits anchored resumption for free.

Retrieval then enters context assembly as **one selector production** (ruling
G17):

```
selector  retrieval  search(index, anchor, query, k)
```

and that is the whole answer to reproducible RAG with provenance: **the assembled
context value's digest commits the index, the anchor, the query, and k.** An
auditor reconstructs exactly what the model was shown, including why it was shown
that. It costs one selector production and no new mathematics.

### 6a. A context program with retrieval in it — LANDS WITH E6 + E12

A context program is *data*, not code. This is the artifact:

```
program review/lead@<digest>:
  static   frame     catalog:flb.frame.review-lead@<digest>
  policy   writ      policy:<self>
  session  protocol  session:<self>.protocol
  session  retrieved search(index:<TermIndex digest>,
                            anchor:<pinned anchor digest>,   // ← session class
                            query:<query digest>, k:20)
  live     frontier  frontier(session, seat=<self>)
  turn     hole      hole:<digest>
```

Segments are ordered by declared **volatility class**: `static ≺ policy ≺ session
≺ live ≺ turn`, stable first. Note what is absent: no timestamps, no session
UUIDs in prose, no "current date". Time-shaped facts enter as journaled evidence
with digests, like everything else.

The volatility class of a retrieval segment falls out of its anchor, and this is
where DX rides the law rather than fighting it:

| Selector form | Class | Consequence |
| --- | --- | --- |
| `search(index, **pinned anchor**, q, k)` | `session` | stable prefix; identical bytes across a fleet; reproducible on replay |
| `search(index, **head-relative**, q, k)` | `live` | fresh; ordered after the stable segments; reassembles to a new digest as the index advances |

Because assembled contexts are deterministic bytes ordered stable-first, and
provider-side prompt caching is byte-prefix matching, **the pinned form is
simultaneously the reproducible one and the provider-cacheable one.** The cheap
path and the auditable path are the same path, so nobody has to be told to prefer
it. Cache invalidation tracks meaning: the prefix bytes change iff some input
digest changed, and there are no silent invalidators to hunt. Priced honestly as
measured-tier DX — a cache-hit-rate number on a scoreboard, never a ledger claim.

### 6b. Freshness is a fact; staleness is a refusal

```
Search.anchor(index)                             // the fact: floor, state digest, head
Search.query({ index, query, k })                // read at the current anchor
Search.query({ index, query, k, atLeastHead: h })
  // refuses with sort:"absence" until the anchor passes h
```

There is no `waitForFreshness`, no staleness tolerance in milliseconds, and no
blocking read. The caller's freshness need becomes typed backpressure — an
`absence` refusal, repealed by later presence, and the only sort the shipped
retry policies touch. A blocking freshness wait is on the refuse list (part 3
§7.3).

### 6c. Embeddings and the honest treatment of ANN

An embedding is a **derived record**: `{ input: <digest>, embedder: <capability
digest>, vector: [...] }` with the ordinary certificate. Producing one is an
ordinary action, so at most one outcome lands per `(input, embedder)` declaration
no matter how many workers race.

The payoff is a failure mode that stops being representable. **Model drift is
visible by construction**: the embedder's capability digest is in every embedding
record, hence in the index's inputs. A new model, a new revision, a changed
truncation rule — each is a new capability digest, hence a new index digest.
Re-embedding is a *new fold*, and the old index stays a true record at its own
anchor. The partially re-embedded index that silently mixes two embedding
spaces — the thing every vector-store deployment eventually hits — is not a bug
you avoid here; it is two indexes with two digests.

**And where Plait refuses.** Approximate indexes (HNSW, IVF and relatives) build
structures whose shape depends on insertion order and random level assignment.
That is a non-commutative algebra, so the existing rights table sorts it with no
new rule:

| Right | Exact embedding index | Approximate (ANN) index |
| --- | --- | --- |
| anchored resumption (F3) | yes | yes — the structure is part of the anchored state |
| partition-parallel merge (F4) | yes — the `commutative` brand is earned | **no** — the brand is absent, so `partitions > 1` does not type-check |
| determinism | by the set | by `(index digest, declared seed, anchor)`; the seed is declaration data or the declaration refuses |
| recall | n/a | **measured, never claimed** — a scoreboard number against exact search at the same anchor, never a ledger row |

v0 ships exact search only (ruling G15). For an embedding index whose state is a
grow-only set of `(input digest, vector)` pairs, exact k-NN is a total
deterministic function once ties break by identity order; cost is O(N·d) per
query per partition, which is unremarkable at the corpora this program works on,
and the approximate machinery waits for a measured consumer. **If you need ANN at
scale today, Plait v0 is the wrong tool and this page is not going to pretend
otherwise.** What it will not do is give you a partitioned ANN index and a
correctness claim in the same breath — the awkwardness shows up as an absent
brand rather than as a caveat in prose.

Brands, generally, are earned and never asserted: `Algebra.commutative`'s only
constructor derives a digest-seeded, distinct law suite, and `partitions > 1` type-requires the
brand. Rights follow proofs, in the type system.

### 6d. What retrieval never claims

**Relevance.** F11 (and F7 above it) govern the identity and provenance of
results, never their usefulness. **Ranking is a declared fold, else catalog
order.** A model-ranked result set may absolutely be produced — but it is an
action outcome with its own certificate and its own attribution, and it never
wears the index's certificate.

**Status of F11.** *Query determinism* — `query(I, A, q)` is a function of
`(index digest, anchor, query digest)` — was ratified as its own minimally-scoped
statement (grill sheet item 12), target rung R5, home `verify/fabric`. It is
**stated, not proven.** Its content is the purity side conditions: no wall clock,
no `now`, no ambient locale, no undeclared seed, ties broken by identity order.
Those are enforced at declaration admission with refusals that cite F11 by name.
Without F11, a context program containing a retrieval selector has no assembly
determinism and F7 is silently voided for every RAG-shaped program — which is
exactly why it got its own name instead of a corollary note.

---

## 7 · What Plait refuses, and why

A short table, because the refusals *are* the product and burying them would be
the wrong kind of marketing.

| You want | Plait's answer | The reason |
| --- | --- | --- |
| an exactly-once delivery flag | refused | no such property is claimed anywhere; the coordination-plane property is at-most-one *landed outcome*, a safety claim |
| a conflict-resolution or ordering knob on shared state | refused | F1/F2 make it a knob with nothing to choose between |
| `reset` / `rebuild` / `invalidate` on a fold | refused | F3 makes resumption the only verb; anchors are facts |
| a partitioned ANN index | refused | non-commutative algebra, brand absent, `partitions > 1` will not type-check |
| a hand-written tool description | refused | derive it from the capability declaration or it drifts; served-equals-derived is walled |
| a trigger on *absence* ("if nothing by Friday") | refused | deciding a candidate set is complete is non-monotone; it belongs to a declared **deadline seat** whose act is journaled, attributed and fenced — a door, not a wall |
| a blocking freshness wait | refused | the freshness precondition refuses with `absence`; the shipped retry policy is the door |
| a spawn without a policy meet | refused | escalation is unrepresentable, not merely checked |
| an unanchored "latest" resolve | refused | there is no ambient latest; `resolve` takes an anchor and journals its act |
| a secret inside a declaration | refused | the wire grammar admits no secret carrier; the declaration names the credential, the environment holds it |
| a wall-clock timestamp in an identity-bearing position | refused | arbitration is a declared constant of the protocol value, which is why the fabric needs no clocks |
| performance numbers | none published | when Plait publishes one it will publish the harness that produced it |

---

## 8 · Addendum — the codegen pair (proposal, not built)

Two small generators, both semantic folds over committed inputs, both walled by
regeneration diff, homes in `unstable/codegen` with generators invoked by a
battery stage. These are demoted from this run's scope and are offered as a
follow-up dispatch, not delivered here.

1. **The generated error catalogue.** Source: the shipped refusal union
   (`StructuralRefusalKind` — fifteen kinds today — plus each refusal's `law`
   and its `next` steps). Output: one reference page, every refusal kind with its
   law, its sort, and the repair it teaches. It is the highest-leverage adoption
   page Plait can ship cheaply, because the refusals already carry every field
   the page needs and a hand-written version would drift the day a kind is
   added. Wall: served-equals-derived — the committed page must equal a fresh
   regeneration byte-for-byte.
2. **The outward glossary.** Source: `CONTEXT.md`'s standard terms. Output: the
   gloss table an outsider-facing page needs (the one at the top of this
   document is hand-written and would be replaced by the generated one). Same
   wall.

Both are listed in the next-phase plan as an early E11 ticket, day-0-startable,
consuming only surfaces that exist today. Their build cost is small and their
main risk is the ordinary one for generators: a page that regenerates but is not
*read* is ceremony. The mitigation is to make the catalogue the target of the
refusal `law` strings, so a refusal is a link.

---

## 9 · Findings

Filed, not fixed — house law. Each is something the ratified records leave open
or something checkable that was wrong; the coordinator routes them. Two have
since been routed and closed and are marked in place rather than deleted, so the
record of what was found stays legible next to what was done about it.

**F-1 · A skill has no ratified home.** §3 above can describe a skill as
frame + toolkit + policy because all three are ratified constructs, but nothing
mints the bundle. Reading A: a `Directory` petname over three digests (E12, zero
new machinery). Reading B: a declaration kind whose own digest covers the triple,
so "produced under skill S@`digest`" is one citable fact rather than three. The
readings differ in what a certificate can say. Consumers: the E9 toolkit
derivation, the E11 MCP configuration plane, and any fleet that wants to pin a
capability bundle. **Blocker for any DevRel page that uses the word "skill"
concretely.**

**F-2 · RULED AND CLOSED (`fe7fb3ac6`, `06e38b8`+).** *Ruling G23's standing
bound was absent from the merged ledger row and from every reader-facing page.*
The counter-reading below was considered and rejected by the coordinator: the
row's at-most-one claim is exactly what readers over-read, so the register row is
**action-consuming** and carries the sentence. It now sits in that row's Bounds,
and in `QUICKSTART.md` beside the at-most-one claim and in its does-not-claim
list. Kept here as the record. — G23 ratified that the external-effect bound
("at-most-one landed outcome is not at-most-one external side effect") rides the
design *and every action-touching* `VERIFICATION.md` row. Checked: the phrase
appears in `docs/design/2026-08-17-plait-grill-sheet.md`,
`docs/design/2026-08-17-plait-harness-plane.md` and `docs/design/plait-api-log.md`
— and nowhere in `VERIFICATION.md`, `packages/plait/README.md`, or
`packages/plait/QUICKSTART.md`. Meanwhile `QUICKSTART.md` already states
"at most one commit lands per work digest" to a reader-facing audience with no
adjacent bound. The counter-reading is fair and should be ruled on rather than
assumed: the merged F5 row is arguably a *coordination-plane* row rather than an
*action* row, since C7 actions are E9 and unlanded. Either way the reader-facing
page is the clearer gap. Requested: a ruling on whether the F5 row carries the
sentence, and a one-line addition to `QUICKSTART.md` regardless.

**F-3 · Two legitimately-distinct identical tool calls collide on one work
digest.** Part 2 §6.2 rules that a model's mid-generation tool calls execute as
nested actions under the same policy; C7 rules that a *retry* re-claims the same
work digest (idempotent by the register) while a *revision* is a new declaration
with `round` pinned. Compose them: a model that calls the same tool twice with
byte-identical arguments inside one generation — a poll, a re-read after a
side-effecting call, a deliberate second sample — produces one work digest, and
the register treats the second call as a retry of the first. The second call's
outcome cannot land. The only field that separates them is `round`, and **nothing
ratified says who assigns it or at what granularity** (per call site? per
position in the call sequence? per generation turn?). This is not a corner case;
polling and re-reading are ordinary agent behaviour. Consumers: the E9 action
register client, the toolkit derivation, and the E10 gauntlet's agentic scene.
Recommended as a grill item for the E9 dispatch.

**F-4 · A refusal's taught repair is wrong for optional keys.** Passing
`{ ...envelope, cert: undefined }` produces
`kind: "non-canonical-value", path: ["cert"]` — correct location — with
`next: "Replace the refused value at the named path with one RFC 8785 wire
value."` The actual repair is to omit the key; `cert` is `optionalKey`, so no
wire value substitution satisfies it. Severity is low and stated as such: the
package is built under `exactOptionalPropertyTypes`, so a TypeScript caller gets
a compile error first (verified with `tsgo`). It bites untyped callers and
non-TS nodes, which the node contract explicitly welcomes.

**F-5 · REPAIRED in this document's second round.** *`QUICKSTART.md` was stale
against the ledger in two places* (reported because it is the honesty-pattern
page this document is modelled on, and it under-claimed relative to
`VERIFICATION.md`, which is declared the winner on conflict). Minute 8–10 now
reads *Runs today*, with a real executed transcript replacing the design-record
sketch; the F5 sentences now carry the Veil proof, the replay wall, R4-reserved,
and the fixed-incarnation bound. Kept here as the record. — Its
runnable-frontier table marked minute 8–10 as
"**E5**, the register — design only", and its closing section says "F5 is not
proved at all yet; it lands with E5." Both were true when written and are not
now: the register merged (`591aeec`, 09:15) and its ledger row landed
(`5004471`, 12:08) after the page's last edit (`ee14c9e`, 07:39) on the same day.
F5 is Claimed at R3 plus the replay wall, with R4 reserved. Example 3 in that
page runs today — §1b of this document is that example, executed. Repaired on
coordinator dispatch after the finding was routed, not on discovery.

Two further items are **already owned elsewhere** and are cited rather than
filed: the declaration-upgrade law (ruling G22, part 3 gap-table row 11 — what a
successor declaration licenses for consumers pinned to the predecessor), and the
projection-soundness IOU behind writ-projected MCP tool lists (architecture §5).

---

## 10 · What this page does not claim

Read this as part of the page, not as fine print.

- **No exactly-once.** Anywhere. The coordination-plane property is at-most-one
  landed outcome per work digest, and it is a safety property.
- **No liveness.** Nothing here claims work completes, a lease is reclaimed
  promptly, or a partition heals. The commons in this configuration is a single
  non-clustered JetStream node — one process, and if it stops, everything stops.
- **Proved about a model is not proved about the code.** F1, F2, F2b, F3, F4 and
  F9 are proved in `verify/fabric` at the model level; nothing running consumes
  that corpus yet, so no sentence here says the shipped code implements the
  proved model. F5 is different and stronger — it is proved in the Veil package
  *and* carried onto the real substrate by a 15-row replay wall across two
  independent runtimes — and its bounds are in `VERIFICATION.md`. F7, F10, F11
  and F12 are stated, not proved.
- **Type-level writ is DX, not security**, and tenancy partitioning is not a
  tenancy isolation claim. Both wait on the attribution decision.
- **No comparison claims.** This page names *tasks* and compares Plait's shape
  against the general shape of other orchestration approaches. Where a specific
  competing product's documented behaviour is at issue, that belongs in an
  evidence-tier document with per-claim sourcing, not in a page like this one.
- **No performance numbers**, on purpose.
- **The runnable claims are narrow.** §1b, §2a and §2b were executed against
  `packages/plait` at commit `6f5be87` on one local file-backed
  `nats-server v2.14.4`, R=1, on Windows. Everything else is a sketch and is
  labelled as one.

## Where to go next

- `packages/plait/QUICKSTART.md` — ten minutes, three examples, from zero.
- `packages/plait/README.md` — the module map of what is merged.
- `VERIFICATION.md` — every claim, its rung, its bounds. It wins every conflict.
- `docs/design/2026-08-17-plait-coordination-fabric.md` — part 1: the fabric and
  the law statements.
- `docs/design/2026-08-17-plait-action-plane.md` — part 2: actions, policies,
  triggers, the model seam.
- `docs/design/2026-08-17-plait-harness-plane.md` — part 3: indexes, search,
  resources, directories.
- `verify/fabric/` — the Lean package behind F1–F4, F2b and F9, with the negative
  controls that show each law is load-bearing. `bash verify/fabric/run.sh`.
- `verify/fabric-veil/` — the Veil package behind F5.
