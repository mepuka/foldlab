# Plait in ten minutes

Plait is a coordination framework for programs that work on the same data at
the same time on different machines — services, agents, scripts, a person
behind a tool. Its bet, in one sentence:

> Programs coordinate by growing a shared, content-addressed body of evidence
> that is safe to replicate sloppily, plus a small number of declared decision
> points that are not. The mathematics says which is which, and the framework
> keeps the two physically apart.

*Content-addressed* means every piece of evidence is named by the SHA-256 hash
of its own canonical bytes, so any reader can re-derive the name and check it.
*Safe to replicate sloppily* means the evidence side tolerates out-of-order,
repeated, and re-delivered messages by construction — you do not configure that
away, and there is no ordering or conflict-resolution knob to get wrong.

This page is the ten-minute version of that idea. It is honest about which
minutes run today.

## The runnable frontier

| Minute | What you do | Status |
| --- | --- | --- |
| 0–2 | Boot a local commons | **Runs today** — E2, the spine |
| 2–5 | Example 1 — two processes, one digest | **Runs today** — E2 |
| 5–8 | Example 2 — kill it and get the same answer | **Runs today** — E4, the durable fold |
| 8–10 | Example 3 — two workers, one outcome | **Runs today** — E5, the register. One further line makes the worker an LLM action (**E9**) |

E2, E4, and E5 are runnable from this workspace package: lanes own partition
streams, durable folds resume from anchors, `plait chaos` measures hard-kill and
protocol-redelivery schedules, and registers fence one landed outcome. The E5
console output shown below is real output executed against the merged register;
the E9 sketch remains design-only and does not compile against the merged API.

The journey shape here is the ratified one (DEV-697 §3, ratified in the
2026-08-17 grill sheet). The epic labels are what keeps it honest while the
lower slices are still being built.

### Words this page uses

| Term | Meaning here |
| --- | --- |
| **fabric** | the whole system: venues, the commons, and nodes |
| **commons** | the shared NATS JetStream server that carries evidence, registers, and blobs |
| **venue** | one single-writer process with its own journals; the fabric scales by having many, never by replicating one |
| **node** | any process that speaks the wire contract — an Effect program, a Go binary, a shell script, an LLM behind a tool interface. Nothing about a node's insides is trusted; only its bytes are |
| **lane** | one stream of evidence: a declared schema, its partitions, and how keys are derived |
| **envelope** | one message on a lane. A closed record — extra fields are refused, not ignored |
| **digest** | lowercase hex SHA-256 over an envelope's canonical (RFC 8785) bytes. This is the envelope's identity |
| **refusal** | a structured "no" carrying the law it enforced, the path that broke it, what it got, and what it expected. Refusals are values you can read, not stack traces |
| **register** | a lease: work digest → (token, holder, outcome), advanced by compare-and-set. This is where the "decision points that are not sloppy" live (E5, merged) |

## 0–2 · Boot the commons

There is no published package yet. Plait is a workspace package inside the
`foldlab` repo; its `plait chaos` bin runs from source. `plait dev` is a separate
future surface and is not part of this slice.

```bash
git clone https://github.com/mepuka/foldlab
cd foldlab
bun install
```

The commons is one NATS JetStream server. Build the pinned one from the Go
module already in the repo, so you are running the exact version the tests run:

```bash
mkdir -p .plait
(cd go && go build -o ../.plait/nats-server github.com/nats-io/nats-server/v2)
.plait/nats-server -v
# nats-server: v2.14.4

.plait/nats-server -js -sd .plait/store -a 127.0.0.1 -p 4222
```

On Windows the binary is `.plait\nats-server.exe`.

You do not create streams manually. The control client creates one file-backed
R=1 fact/node stream. `Lane.emit` creates one exact file-backed R=1 stream per
declared partition; that stream's dense sequence is the fold position. A client
that finds the wrong shape refuses rather than adapting it.

> A single `plait dev` command that boots this for you is a proposal on the
> board (DEV-697 R4). It has not been ruled, so it is not promised here.

## 2–5 · Example 1 — two processes, one digest

**Runs today (E2).** The claim to test: identity on this fabric is not a
convention two programs agree to follow. The receiver re-derives it and refuses
on mismatch.

Create `packages/plait/quickstart/emit.ts`:

```ts
import { Effect, Schema } from "effect"

import { digestOf } from "@foldlab/plait/Digest"
import { Lanes, declare, emit } from "@foldlab/plait/Lane"

const url = process.argv[2] ?? "nats://127.0.0.1:4222"
const DocEvent = Schema.Struct({
  doc: Schema.String,
  terms: Schema.Record(Schema.String, Schema.Number),
})

const program = Effect.gen(function* () {
  const eventSchema = yield* digestOf({ v: 0, kind: "schema", name: "quickstart/DocEvent" })
  const lane = yield* declare({
    handle: "quickstart",
    event: DocEvent,
    eventSchema,
    partitions: 1 as const,
    partitionKey: { path: ["doc"] },
  })
  const event = { doc: "doc-1", terms: { fabric: 2, plait: 1 } }
  const first = yield* emit(lane, event, { holder: "writer-a" })
  console.log(`emitted    ${first.digest}  seq=${first.position}  duplicate=${first.duplicate}`)

  const again = yield* emit(lane, event, { holder: "writer-a" })
  console.log(`re-emitted ${again.digest}  seq=${again.position}  duplicate=${again.duplicate}`)
}).pipe(
  Effect.provide(Lanes.layer({ servers: url })),
  Effect.scoped,
)

await Effect.runPromise(program)
```

And `packages/plait/quickstart/read.ts` — a different process:

```ts
import { Effect, Stream } from "effect"

import { FabricClient } from "@foldlab/plait/FabricClient"
import { evidenceSubject } from "@foldlab/plait/Subjects"

const url = process.argv[2] ?? "nats://127.0.0.1:4222"

const program = Effect.gen(function* () {
  const fabric = yield* FabricClient
  const subject = yield* evidenceSubject("quickstart", 0)
  const messages = yield* fabric.subscribe(subject)

  yield* messages.pipe(
    Stream.take(1),
    Stream.runForEach((received) =>
      Effect.sync(() => {
        console.log(`read       ${received.digest}`)
        console.log(`body       ${JSON.stringify(received.envelope.body)}`)
      })
    ),
    Effect.timeout("5 seconds"),
  )
}).pipe(
  Effect.provide(FabricClient.layer({ servers: url, stream: "PLAIT_SPINE" })),
  Effect.scoped,
)

await Effect.runPromise(program)
```

Run them from `packages/plait`:

```
$ bun run ./quickstart/emit.ts
emitted    7e7d4129a391674e2f5b749b37e22e05b7ffb860ba4b9b7ee928d8ed9ea65b0a  seq=1  duplicate=false
re-emitted 7e7d4129a391674e2f5b749b37e22e05b7ffb860ba4b9b7ee928d8ed9ea65b0a  seq=1  duplicate=true

$ bun run ./quickstart/read.ts
read       7e7d4129a391674e2f5b749b37e22e05b7ffb860ba4b9b7ee928d8ed9ea65b0a
body       {"terms":{"fabric":2,"plait":1}}
```

Two things happened that are worth slowing down for.

**The reader did not take the sender's word for it.** The publisher writes the
digest as the message's `Nats-Msg-Id`; the subscriber re-derives the digest from
the received bytes and compares. If they differ you get a refusal, not a
message. That check is in the client, not in your code: the rule is
`verifyEnvelopeDigest` in `src/kernel/Wire.ts`, and the receive path applies it to every
message before you see it (`src/internal/nats.ts`, `FabricClient.verifyReceived`).

**The second publish returned the same sequence number.** The commons stream
carries a message-id de-duplication window — two minutes on this stream — so a
re-publish of identical bytes inside that window does not append a second copy.
That is a bounded window with a known limit, not a delivery guarantee, and the
slices being built on top of it are held to the same reading: the de-duplication
window is never permitted to become a correctness mechanism, in those words, in
the dispatch spec for the durable fold. Plait makes no exactly-once claim
anywhere; see *What this page does not claim*.

The output above is from a fresh store. Run `emit.ts` again within two minutes
and the *first* line reports `duplicate=true` as well — same bytes, same digest,
same window. If you want the `false` back, stop the server and delete
`.plait/store`. That the window is invisible from the API is a real rough edge,
not something you are misreading.

### Check the identity yourself

The digest is a function of the envelope's canonical bytes and nothing else — no
server, no connection, no clock. `quickstart/verify.ts`, with the body's keys
written in the *other* order:

```ts
import { Effect } from "effect"

import { digestOf } from "@foldlab/plait/Digest"
import type { Envelope } from "@foldlab/plait/Wire"

const program = Effect.gen(function* () {
  const lane = yield* digestOf({ lane: "quickstart" })
  const envelope: Envelope = {
    v: 0,
    kind: "emit",
    lane,
    key: "doc-1",
    holder: "writer-a",
    body: { terms: { plait: 1, fabric: 2 } },
    pins: [],
  }
  console.log(`derived    ${yield* digestOf(envelope)}`)
})

await Effect.runPromise(program)
```

```
$ bun run ./quickstart/verify.ts
derived    7e7d4129a391674e2f5b749b37e22e05b7ffb860ba4b9b7ee928d8ed9ea65b0a
```

Same digest, no server involved, key order irrelevant — RFC 8785 canonical JSON
fixes one byte form per value. There is no developer-supplied identifier
anywhere in that chain to get wrong.

### Cause a refusal on purpose

The most useful thing to learn early is what the system refuses and how it tells
you. `quickstart/refuse.ts` decodes an envelope with one extra field:

```ts
import { Effect } from "effect"

import { decodeEnvelope } from "@foldlab/plait/Wire"

const tampered = new TextEncoder().encode(JSON.stringify({
  v: 0,
  kind: "emit",
  lane: "015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862",
  key: "doc-1",
  holder: "writer-a",
  body: { terms: { fabric: 2, plait: 1 } },
  pins: [],
  priority: "high",
}))

const refusal = await Effect.runPromise(Effect.flip(decodeEnvelope(tampered)))
console.log(`kind       ${refusal.kind}`)
console.log(`law        ${refusal.law}`)
console.log(`path       ${JSON.stringify(refusal.path)}`)
console.log(`expected   ${JSON.stringify(refusal.expected)}`)
console.log(`sort       ${refusal.sort}`)
```

```
$ bun run ./quickstart/refuse.ts
kind       malformed-envelope
law        Envelope v0 is a closed struct; excess properties are refused.
path       ["priority"]
expected   "no excess property"
sort       structural
```

The refusal names the law it enforced and points at the field. `sort` matters:
`structural` refusals are permanent — no retry policy shipped with Plait will
retry one, because no amount of waiting makes an excess property legal.
`absence` refusals mean *not here yet*, and those are the only class the shipped
retry helper retries (`src/truth/Refusal.ts`, `retryAbsence`).

**What you should believe now:** on this fabric, a name is a checkable claim
about bytes, and the checking is not your job.

### Two things about Example 1 that are the spine's limits, not the design's

- The `lane` field on an envelope is meant to hold the digest of a *lane
  declaration* — its schema, partitions, and key derivation. `Lane.declare`
  builds that identity above. The subject's `quickstart` token remains routing
  sugar: routing never carries identity.
- `key`, `holder`, `body`, `pins`, and the optional `cert` are the closed
  envelope-v0 shape. `cert` is a recomputable derivation claim (which schema,
  which program, which input anchor); the spine carries it, and the machinery
  that checks it arrives with later slices.

## 5–8 · Example 2 — "kill it and get the same answer" — **E4**

**Runs today.** `Lane`, `Algebra`, `Fold`, and `Anchor` are public modules; the
real-NATS gate hard-kills a two-partition counter and resumes to the same state
digests as its uninterrupted arm.

The shape: a word-count fold over a folder of documents. You deploy it, `kill -9`
the process mid-stream, restart it, and diff the result against a
single-process reference run. The digests match.

The deployment API has one verb:

```ts
const run = Effect.fn("distill.run")(function* () {
  const handle = yield* Folds.deploy(TermCounts, { checkpointEvery: 512 })
  yield* handle.await
})
```

Look at what is *absent*. There is no `durability` setting, no `reset`, no
`rebuild`, no `invalidate`, and no offset management. `Folds.deploy` is
to be the only verb: it resumes from the anchor if one exists and starts fresh
if it does not, because the anchor is a fact keyed by `(fold digest, partition)`
rather than a piece of mutable bookkeeping.

That absence is the point, and it is downstream of two laws: **F3**, that folding
a resumed prefix and then the rest equals folding the whole, and **F2b**, that a
*successor discipline* — buffer arrivals by position and apply only at the
contiguous frontier, never over a gap — applies each event once over an
at-least-once redelivery schedule. F2b's in-window contiguity premise is part of
the statement, not a caveat on it: arbitrary reordering without that discipline
is out of scope by the theorem's own wording. If those hold, a durability setting
would have nothing left to choose between, so the API does not offer one.

Get the attribution right, because it is easy to state backwards and the estate
amended its own wording to fix exactly that. **The successor discipline protects;
the anchor floor records.** The floor is the derived resume coordinate, not the
mechanism that keeps a duplicate from being applied twice — and this is not a
stylistic preference. The Lean package carries `guard_is_redundant`, the proof
that a position-floor guard would be observationally redundant given the
discipline. So the runtime ships no such guard: the estate declines to defend
against a scenario the model proves cannot arise.

**Status, stated plainly:** F3 and F2b are machine-checked *at the model level*.
The Lean package that carries them — `verify/fabric`, epic E3 — is merged on
`main`, and `bash verify/fabric/run.sh` is green: every rostered theorem has its
axiom footprint checked, every law-dropping control is refuted on the law it
dropped, and the 15-row model-emitted corpus regenerates byte-for-byte.

Read the scope of that exactly, because the distinction is the whole product. It
is a proof about the *model* — schedules, positions, and a merge algebra as Lean
objects. The runtime wall consumes the eleven E4 rows by exact name with zero
skips inside a consumed family and names the four rows owned elsewhere. That is
an R0/R1 correspondence wall, not a proof of the TypeScript: **the runtime is
walled against the model that is proven; the runtime itself is never called
proven.**

## 8–10 · Example 3 — "two workers, one outcome", then **E9**

**Runs today (E5).** The shape: two processes race for the same shard of work.
One wins a lease. The other takes the lease over, and then the first process
wakes up and tries to commit its result anyway. You print the register and see
what happened.

`quickstart/race.ts`:

```ts
import { Effect } from "effect"

import { digestOf } from "@foldlab/plait/Digest"
import { Registers } from "@foldlab/plait/Register"

const program = Effect.gen(function* () {
  const shard = yield* digestOf({ shard: "doc-1", round: null })
  const registers = yield* Registers

  const a = yield* registers.grant(shard, "worker-a")       // worker-a holds the lease
  const b = yield* registers.expireSteal(shard, "worker-b") // worker-a stalls; b takes over

  // worker-a wakes up holding the old token and tries to land its result.
  yield* registers.commit(shard, a.token, "terms:doc-1@a").pipe(/* print the refusal */)

  const landed = yield* registers.commit(shard, b.token, "terms:doc-1@b")
  const seen = yield* registers.observe(shard)
}).pipe(Effect.provide(Registers.layer({ servers: url })), Effect.scoped)
```

```
$ bun run ./quickstart/race.ts
granted    worker-a  token=1
stolen     worker-b  token=2
refused    worker-a  kind=stale-register-token  sort=structural
           law=no stale token ever lands
           got=1  expected=2
committed  worker-b  token=2  outcome=terms:doc-1@b
observed   token=2  outcome=terms:doc-1@b
```

The late-waking worker's *evidence* is welcome — it goes onto a lane like any
other observation, attributed and harmless, because the evidence plane is the
sloppy-safe side. Its *commit* is refused: the token it holds is no longer
current, and the refusal says so in those words, with both numbers.

Two things about that transcript. The refusal is `structural`, so no shipped
retry policy will touch it — no amount of waiting makes a stale token current,
and the refusal's `next` step says to observe the register rather than retry.
And the token is the KV entry revision, which is a stream sequence: it is
bucket-global, not a per-register counter. On a fresh store a first grant reads
`token=1`, as above; on a store with history it will not. Treat a token as an
opaque monotone ordinal, never as an attempt number.

The **E9** shape for the same thing — the lease held around a whole body of
work, with the evidence emitted unfenced inside it — is the design record's
sketch (part 1 §8.3), and **it does not compile against the merged API**, whose
`hold` takes `(work, holder, use)` positionally:

```ts
const claimShard = Effect.fn("distill.claim")(function* (shard: Digest) {
  yield* Registers.hold({ work: shard }, (token) =>
    Effect.gen(function* () {
      const out = yield* distill(shard)
      yield* Lanes.emit(DistillLane, out)                       // monotone: unfenced
      yield* Registers.commit({ work: shard, token,             // outcome: fenced
                                outcome: out.digest })
    })
  )
})
```

The claim, in the exact words the program uses: **at most one commit lands per
work digest.** That is the F5 statement — lease tokens strictly increase, and a
commit is accepted only against the current token. Read the quantifier
carefully. It is an at-most-one claim, and it is a safety claim. Nothing here
promises a commit lands at all, or that a stalled worker is noticed promptly;
Plait makes no liveness claims. "Exactly once" is not the claim and is not
vocabulary this program uses.

Read the *noun* as carefully as the quantifier. **At-most-one landed OUTCOME is
not at-most-one external side effect:** an external call may fire and then fail
to land its outcome — the register bounds landings, never attempts (ruled G23;
this sentence rides every action-consuming claim). A worker that called a
payment API and then lost its lease has already called the payment API. Where a
vendor supports an idempotency key the work digest is the natural one, stable
across retries of the same declaration by construction; where none exists, the
bound is the bound.

Unlike F3 and F2b, F5 is proved in a separate Veil-pinned package —
`verify/fabric-veil`, which merged with E5. It is a machine-checked safety
theorem over a five-action transition system: tokens strictly increase under
grant and steal, and at most one commit lands per work digest. Its proofs are
discharged as *reconstructed* SMT proofs rather than trusted ones
(`veil.smt.trust=false`), because trusting the solver would smuggle an axiom past
the very gate the estate keeps — and a committed trusted-mode control shows the
axiom census refusing a genuinely trusted discharge.

F5 is also the one law on this page carried onto the running substrate rather
than left at the model level: a replay wall drives all 15 model-exported rows
through the TS `Registers` service *and* an independent Go twin over real NATS KV
revision CAS, with verdict, law-name and observed-state equality and zero skips.
The rung is **R3 plus that replay wall**; **R4 stays reserved** at the
15,378-schedule bar and no R4 language attaches until a lockstep run at that bar
exists. The bounds are in the ledger and one of them binds this example: every
runtime claim holds within a **fixed backing-stream incarnation** — the
incarnation pin at register-open is a recorded deferral, so a bucket destroyed
and recreated underneath you is outside the guard. Read the whole row and its
residuals in `VERIFICATION.md`, "The Plait register (F5)"; check it yourself with
`bash verify/fabric-veil/run.sh`.

### The one-line change — **E9**

Then change one line: the shard handler calls `Models.generate` instead of a
local function.

```ts
const out = yield* Models.generate({ context: ctx, output: TermsSchema })
```

Nothing else moves. The same register fences it, the same evidence lane carries
its output, the same refusal appears if the token is stale. That is the thesis
in one diff: **an agent is a fenced action.** A model call is not a special kind
of participant with its own coordination story — it is an action that happens to
be non-deterministic, holding the same lease as anything else.

## The closing move — `plait chaos`

This quickstart is designed to end one step past "it worked" — at "it worked
under a kill schedule, and here is the law that says it had to."

`plait chaos` ships as E4's thin harness entry. Its scope is deliberately
fenced:

- It drives *your declared fold* — not an arbitrary program — through the
  kill/restart/drain and duplicate-redelivery harnesses E4 uses in its gates
  anyway. Redeliveries are manufactured through the consumer protocol, not faked.
- Its output is a measured scoreboard plus the digest-equality verdict.
- **It does not prove anything at runtime.** The machine-checked half arrives by
  citation — the law names and the corpus digest — not by re-deriving a proof
  while your fold runs. A green run is a measurement that agrees with a proved
  model, which is a different and weaker thing than a proof about your program.
- Arrival reorder ships; partition reorder prints `n/a` and is deferred. The
  full distillation gauntlet (E10) is not pulled forward.

```bash
PLAIT_NATS_URL=nats://127.0.0.1:4222 bun run ./src/surface/cli.ts chaos \
  ./my-fold.ts --pin-head --axis kill --axis duplicate --axis reorder --output json
```

## What this page does not claim

Read this section as part of the quickstart, not as fine print.

- **No exactly-once.** The de-duplication window you saw in Example 1 is a
  bounded window on a stream. The coordination-plane property is at-most-one
  commit landed per work digest, and it is a safety property. **At-most-one
  landed outcome is not at-most-one external side effect** — the register bounds
  landings, never attempts (ruled G23).
- **No liveness.** Nothing here claims work completes, a lease is reclaimed
  promptly, or a partition heals. The commons in this configuration is a single
  non-clustered JetStream node — one process, and if it stops, everything stops.
- **Proved about a model is not proved about the code.** F1, F2, F2b, F3, F4 and
  F9 are proved in `verify/fabric` (E3, merged, gate green), at the model level,
  and F2b carries an in-window contiguity premise that is part of the statement
  rather than a caveat on it. The E4 wall consumes the named corpus vectors,
  which checks correspondence at those rows but does not prove the TypeScript.
  **F5 is a separate claim**: it is proved in
  the Veil-pinned `verify/fabric-veil` (E5, merged) *and* carried onto the real
  substrate by a 15-row replay wall across two independent runtimes — rung R3
  plus that wall, with R4 reserved at the 15,378-schedule bar, and every runtime
  claim scoped to a fixed backing-stream incarnation. Claims enter
  `VERIFICATION.md` only as slices land, and that file states each claim's
  bounds.
- **The spine's own recorded claim is narrow.** Four generated envelope rows,
  digest-equal across an independent Go implementation, plus a two-process round
  trip — including across a consumer restart — over one local file-backed
  `nats-server v2.14.4` with one replica. It makes no claim about server crash
  recovery, durable consumers, federation, clustering, attribution, or liveness.
  Blob *content* retrieval is out of scope: the wire gate checks the digest
  reference shape and the 256 KiB inline-body threshold, nothing more.
- **No performance numbers.** There are none on this page on purpose. When
  Plait publishes one it will publish the harness that produced it.
- **No comparison claims.** Where Plait sits relative to other tools is a
  question with a documented answer elsewhere; it is not something to assert in
  passing here.

## Where to go next

- `packages/plait/README.md` — the module map of the spine.
- `docs/design/2026-08-17-plait-coordination-fabric.md` — part 1: the fabric,
  the law statements, and the slice ladder.
- `docs/design/2026-08-17-plait-action-plane.md` — part 2: actions, triggers,
  policies, and the model seam.
- `docs/design/2026-08-17-plait-ratification-record.md` — what has been ruled,
  and by whom.
- `verify/fabric/` — the Lean package behind F1–F4, F2b and F9, with the
  negative controls that show each law is load-bearing. Run the gate yourself
  with `bash verify/fabric/run.sh`.
- `verify/fabric-veil/` — the Veil package behind F5, the law under Example 3.
  `bash verify/fabric-veil/run.sh`.
- `packages/plait/FOR-WORKING-AGENTS.md` — the same substrate mapped onto the
  jobs you already do: tool calling, domain schemas, skills, subagents, memory,
  retrieval.
- `VERIFICATION.md` — every claim the estate makes, its evidence rung, and its
  bounds. If a sentence anywhere contradicts this file, this file wins.
