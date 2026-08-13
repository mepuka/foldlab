# Bootstrap to types: the developer's journey, story by story

FROM OPERATOR-DIRECTED RESEARCH

Author: DX design lane (Opus), 2026-08-15, isolated worktree. Design and
measurement — user stories, a gap table, one executed slice, and three ranked
frictions. **No machinery proposed as built.**

The operator's words: *"start from DX: I want to bootstrap some data into my
system and then create types from it."*

The persona this document serves: a developer with a folder of real JSON — API
payloads, exports, logs — who has read `README.md` and wants something worth
having inside an hour. Not an agent, not an auditor, not a contributor. A person
with data and a terminal.

Every repository claim carries `file:line`, verified against `origin/main` at
`310fc18f399a497f8552ce29cd0ea7d8e15d91ed`. Every **TODAY** verdict marked
*works verbatim* or *works with friction* was **executed on this machine in this
session** against a freshly built `protod`; the transcripts are §3. Verdicts
marked *does not exist* were established by search and are cited to the document
that owns the gap, or marked unowned.

Labels used throughout: **SHIPPED** (executed here or walled in-repo),
**RATIFIED-UNBUILT** (decided, no code), **BRANCH-ONLY** (built, unmerged),
**UNOWNED** (no ticket, no build item, no design doc).

---

## Result first

**The journey has a hole exactly where the operator put the emphasis.** "Bootstrap
data, then create types from it" is, today, the one order the system will not
accept. `W4` is *create before publish* — an unknown identity never enters a
journal (`proto/go/protod/ingress.go:74-90`). So the developer's first act must
be to hand-write a type; and there is no lane anywhere in the repository that
proposes a type from sample data. Not ticket 015 (natural language + examples →
*grammar*), not ticket 016 (digest streams → classification lattice). The
`value → structure` direction has no owner.

**The gap is one convention wide, not one subsystem wide.** `{"k":"opaque"}` is a
final v0 kind (`proto/wire/CONTRACT.md:149-151`). It creates, it catalogs, and
frames claiming it are admitted regardless of payload shape — measured in §3.4:
four payloads of four different shapes, all admitted, all verified back. Its
digest is `714cc72ebf92bfee7564a62f331920cde96ad36fee2d4bb43b36554f02d7456b` and
a client computes it offline, before ever speaking to a daemon. **Data can land
as journaled evidence today, before any type exists, with zero new request
kinds and zero wire change.** That is the cheapest fix in this document and it is
already proven rather than proposed.

**The deploy story is real but it is a test harness wearing a binary's clothes.**
`protod` embeds its own NATS server (`proto/go/protod/protod.go:129-159`) — no
broker to install, no config file, one flag. But it serves *until stdin closes*
(`proto/go/cmd/protod/main.go:43-52`), which is the portable shutdown path for
`Bun.spawn` (`proto/ts/test/harness.ts:39-43`) and a trap for every other
caller. Measured in §3.1: `protod --store ./s &` prints its ready line and is
dead three seconds later.

**Everything downstream of a confirmed type is stronger than the developer will
believe, and everything upstream is weaker.** The refusal loop, the identity
recomputation, the verified read — all executed here, all as advertised. The
catalog search, the type diff, the resumable session, the payload conformance
check, the codegen CLI — none exist.

---

## Method

| What | Command | Result |
|---|---|---|
| Build the daemon | `mise x go@1.26.5 -- go build -o protod ./cmd/protod` (in `proto/go`) | 23 MB binary, clean |
| Install the client | `bun install` (in `proto/ts`) | 21 packages, **644 ms** |
| Bootstrap probe | `bun bootstrap-probe.ts` | 9 transcript steps, **2018 ms** wall |
| Deploy probe | direct `protod --store … --listen 127.0.0.1:4229` | ready line, port open, alive |
| stdin-lifecycle probe | `protod … &` and `nohup protod … &` | **both EXITED** |
| MCP probe | real stdio JSON-RPC against `bun src/mcp-main.ts` | 6 tools, 0 outputSchema |
| Concierge probe | entry move + two deliberate errors | refusals captured verbatim |
| Staging probe | `{"k":"opaque"}` + 4 heterogeneous payloads | 4/4 admitted, head verified |

Toolchain: `bun 1.3.14`, `go 1.26.5` via `mise x go@1.26.5` (the bare `go` on
this machine is 1.25.6 with `GOTOOLCHAIN=local`, and `go.mod` requires `>= 1.26`
— the build fails with a version error until `mise` is interposed; noted as
friction R2 in §4).

---

## 1. The journey — fourteen stories

Strict form: *As a developer with X, I want Y, so that Z* — **TODAY:** verdict.

### Act I — deploy

**S1. One command, one process, no broker.**
As a developer with `go` and `bun` on `PATH` and no appetite for installing
message brokers, I want a single command that stands the whole system up
locally, so that I am talking to a live daemon before I lose interest.
**TODAY: works with friction.** `protod` is one static binary that starts its own
JetStream-backed NATS server on loopback and prints
`{"ready":true,"url":"nats://127.0.0.1:PORT"}` on stdout
(`proto/go/cmd/protod/main.go:30-39`; server construction at
`proto/go/protod/protod.go:129-159`). The friction is the lifecycle: it exits
when stdin reaches EOF (`main.go:43-52`), so the idiomatic
`protod --store ./store &` dies within seconds — measured, §3.1. The working
incantation is `sleep infinity | protod --store ./store`, which appears in no
document. There is also no `--version`, no `--help` beyond flag defaults, no
`docker run`, and no npm/Homebrew artifact: the binary must be built from source.

**S2. My agent can use it without me writing a client.**
As a developer who already runs an MCP-capable editor, I want to register
foldlab as an MCP server, so that my agent can author types for me.
**TODAY: works with friction.** `proto/ts/src/mcp-main.ts:3` is the entry point —
`FLB_URL=nats://127.0.0.1:PORT bun src/mcp-main.ts`. Tools are *derived* from the
daemon's own `contract.describe` reply through the JSON-Schema codegen target
(`proto/ts/src/mcp.ts:28-58`), so a tool list cannot drift from the daemon it
fronts. Three frictions, all measured (§3.3): (a) it is a **second** process
requiring the daemon's URL, so the MCP config must hard-code a port the daemon
picks at random unless `--listen` is pinned; (b) every one of the six tools is
annotated `destructiveHint:true, readOnlyHint:false` — *including*
`journal_read` and `contract_describe`
([#40](https://github.com/mepuka/foldlab/issues/40), reproduced independently
here at HEAD); (c) no tool advertises an `outputSchema`
([#17](https://github.com/mepuka/foldlab/issues/17); cause is
`success: Schema.Unknown` at `proto/ts/src/mcp.ts:71`), so the refusal envelope
that carries all the teaching arrives undeclared.

**S3. I learn the surface from the surface.**
As a developer who will not read a wire specification first, I want the system to
describe itself, so that I can discover what it does from one call.
**TODAY: works verbatim.** `flb.req.contract.describe`
(`proto/go/protod/dispatch.go:21,60-61`) returns every request kind and body
shape. Measured: `type_create, type_fill, type_unfill, journal_read,
contract_describe` plus the ingress pattern `flb.ing.<journal>`. This is the
strongest single moment in the onboarding and nothing in `README.md` tells the
developer to make this call first.

### Act II — bootstrap

**S4. I point it at my folder and the data lands as journaled evidence.**
As a developer with 300 JSON files on disk, I want one command that loads them
into a journal, so that my real data — not a toy — is what I reason about.
**TODAY: does not exist (gap G-BULK, UNOWNED).** The only write path is one
request/reply per frame on `flb.ing.<journal>` (`proto/go/protod/ingress.go:39-44`).
There is no bulk loader, no directory walker, no format adapter for NDJSON, CSV,
JSONL logs, or an HTTP archive, and no `flb` CLI of any kind: the repository has
no binary between `protod` and the test harness. In §3.2 the loop that does this
is twelve lines I wrote myself. It is fast — **3 ms for 3 files** — so the gap is
ergonomic, not architectural.

**S5. I can land data before I know its shape.**
As a developer whose whole reason for being here is "I have data and I don't have
types," I want to stage raw payloads first and shape them afterwards, so that the
tool matches the order I actually work in.
**TODAY: does not exist as a named path — but is one convention away.** The law
runs the other direction: `W4`, *create before publish*, refuses an uncataloged
identity (`ingress.go:74-90`), and a frame with no `type` at all is refused as
`malformed` (`ingress.go:63-73`) — measured verbatim in §3.2. This is the
operator's sentence colliding with the estate's oldest ratified law, and the law
should win. **The convention that resolves it exists and was executed here:**
`{"k":"opaque"}` — "any well-formed v0 value not structurally described here"
(`proto/wire/CONTRACT.md:149-151`) — creates as a normal type, and frames
claiming it are admitted whatever their payload. §3.4: four payloads of four
different shapes, 4/4 admitted, journal head verified locally. Its digest is
fixed and client-computable offline. What is missing is not machinery; it is a
name, a paragraph, and an example.

**S6. I am told exactly what was and was not checked.**
As a developer who has been burned by silent coercion, I want the system to state
its own limits in the success reply, so that I never mistake "accepted" for
"validated."
**TODAY: works verbatim, and is the best-kept promise in the system.** Every admit
reply carries `admitted on identity resolution only; payload conformance against
the claimed structure was NOT checked` (`proto/go/protod/ingress.go:19-21`).
Measured: a payload of `{"totally":"wrong"}` against an `Order` struct digest was
admitted, with that note attached. A developer who reads it knows precisely where
they stand. One asks the same question about the read path: an empty read echoes
the submitted head back under a field named `verified`
([#39](https://github.com/mepuka/foldlab/issues/39)) — the one place the system's
naming outruns its checking.

### Act III — type population

**S7. I ask for types from my data.**
As a developer with a journal full of orders, I want to say "propose a type for
this journal" and get a candidate structure back, so that I never hand-write a
schema I could have read off my own data.
**TODAY: does not exist (gap G-INFER, UNOWNED — no ticket, no build item, no
design doc).** The repository's data flow is strictly `type → artifact` and never
`value → type`: `proto/ts/src/author.ts` renders Effect Schema *into*
`flb.type.v0`, `proto/ts/src/codegen.ts` renders `flb.type.v0` *out* to three
targets, and the concierge fills holes in a partial the caller already supplies.
A repository-wide search for `infer`, `induce`, `generalize`, `sample`,
`fromValue`, `shape detection` returns nothing but a TypeScript `infer` keyword
at `packages/core/src/algebra.ts:308`. The two adjacent tickets do not cover it:
**015 the grammar foundry** takes natural language plus examples and emits a
*grammar*, with `synthesize(grammar, examples)` taking the grammar as an *input*
(`docs/map/tickets/015-the-grammar-foundry.md:43-46`); **016 the ontology
explorer** ingests *digest streams* — already-cataloged types — and emits a
classification lattice (`docs/map/tickets/016-the-ontology-explorer.md:12-19`).
Neither has a `value → structure` step.
*The honest dependency:* an inference lane cannot be a trusted producer. The
certifier is the only path to the catalog and the synthesizer is permanently
untrusted (`015:19-25`), and Gold's theorem is scoped in
`docs/design/2026-08-14-learning-by-refutation.md:558-562` to say induction
belongs to the foundry, not the concierge. So the story's shape is forced:
inference proposes a *partial*, the concierge and the certifier dispose of it,
and nothing inferred reaches the catalog without passing the same wall a
hand-written type passes. That framing costs nothing to ratify now and is the
one decision this story is blocked on.

**S8. I confirm or repair the proposal in a conversation, not a spec review.**
As a developer looking at a proposed type, I want to correct it one field at a
time and be told immediately when a correction is illegal, so that I converge
without reading a grammar.
**TODAY: works with friction — this is the strongest shipped loop in the
repository.** `type.fill` / `type.unfill` are stateless functions of
`(partial, path, subtree)` (`proto/go/protod/concierge.go:40,82`); the reply
carries the updated partial plus a frontier of every remaining hole with its
legal fills. The measured evidence is the branch-only dogfood transcript
(`demo/mcp-concierge-session.md`, commit `5227f51`, branch
`worktree-agent-ac12a6acee3504305` — **not on main**): a real stdio MCP client,
21 JSON-RPC messages, **11 tool calls from first intent to a certified
content-addressed type, of which the clean path is 7**, 1–6 ms per call. Three
frictions, all reproduced at HEAD in §3.5:
- the entry move — fill the root hole *with a root hole* — is undiscoverable from
  the tool surface (`proto/wire/CONTRACT.md:73-77` documents it; nothing the
  agent can call says so);
- the refusal a shape-guessing developer will hit most often, an extra key on a
  node, ships **no `example`** — `checkKeys` passes `nil` and the field is
  `omitempty` (`proto/go/protod/walk.go:329-347`; analysis at
  `docs/design/2026-08-14-learning-by-refutation.md:252-272`). Captured verbatim
  in §3.5: `law`, `path`, `got`, `expected`, `next` — and no witness;
- `unknown-ref` echoes the bad digest back in `next[0].body`, so replaying the
  hint reproduces the refusal byte-for-byte
  ([#41](https://github.com/mepuka/foldlab/issues/41)); reproduced at HEAD. Two
  of the four overhead round-trips in the measured session were this one kind.
- and the frontier hands **every** hole the same twelve legal kinds and the same
  lexicographically-first sixteen catalog digests (`concierge.go:9,124-136`),
  which is `frontierChoices`' constant table
  ([#19](https://github.com/mepuka/foldlab/issues/19)).

**S9. The type I confirmed has a name anyone can recompute.**
As a developer who will hand this type to a colleague, I want its identity derived
from its content and re-derivable by them, so that "same type" is decidable rather
than negotiated.
**TODAY: works verbatim.** `type.create` canonicalizes and digests server-side and
refuses an asserted digest it cannot re-derive (`W1`). Measured in §3.2: the
client recomputed `structureDigest(orderStructure)` locally and it equalled the
daemon's `digest` — two computations, opposite sides of a socket, one hex string.
Resubmission converges to `created:false` rather than erroring
(`proto/wire/CONTRACT.md:43-45`), measured in §3.4.

### Act IV — the certified catalog

**S10. My types generate my code.**
As a developer who wants this to be load-bearing, I want to emit an Effect Schema,
a JSON Schema, and a Go struct from a cataloged digest, so that one identity backs
every language in my stack.
**TODAY: works with friction — the lane is shipped, the surface is not.**
`proto/ts/src/codegen.ts` emits all three targets: `toEffectSchema` (`:136`, a
live `Schema` value), `toJsonSchema` (`:235`, draft 2020-12), `toGoSource`
(`:319`, `package flbtypes` with a `DO NOT EDIT` header). Each is a fold over the
same 13-kind AST and refuses as data rather than throwing (`:26-30`). But **only
`toJsonSchema` has a runtime consumer** — MCP input schemas (`mcp.ts:33,43`).
`toEffectSchema` and `toGoSource` are called from tests only; there is no CLI, no
npm script, no `bin` entry, and `proto/ts/package.json` has no `scripts` block at
all. `packages/codegen/src/index.ts` is `export {}`. *This is one story here and
belongs to the codegen lane;* the pointer is `NEXT.md:346-350` (graduate
`ts/codegen` → `packages/codegen`) and `proto/AGENTS.md:76-78`. One live defect on
the path: `toJsonSchema` emits `additionalProperties:false` (`codegen.ts:186`)
while `ingress.go` admits extra frame keys, so the derived publish tool forbids
frames the daemon accepts (`docs/design/2026-08-14-estate-structures-map.md:151`,
row E18, no issue number).

**S11. Once I have a type, the daemon enforces it.**
As a developer who has now spent twenty minutes getting a type right, I want the
daemon to reject payloads that do not conform, so that the type earns its keep.
**TODAY: does not exist — ratified as later, by design.** Admission is identity
resolution only; conformance "arrives later as a codegen-derived codec"
(`proto/go/protod/ingress.go:12-17`, `proto/wire/CONTRACT.md:112-115`). The
reply says so honestly (S6), which converts a missing feature into a stated
bound. Worth naming here because it is the story a developer *assumes* is already
true, and the gap between assumption and fact is where trust is lost quietly.

### Act V — day two

**S12. I search my catalog.**
As a developer returning a week later, I want to find the type I made — by digest,
by shape, by what I called it — so that I do not rebuild it from scratch.
**TODAY: does not exist (RATIFIED-UNBUILT; owner: task 34).** There is no
`type.get` and no `catalog.query`; the five request kinds are fixed at
`proto/go/protod/dispatch.go:17-21`. What exists is that the catalog *is a
journal*, so the client reads it and greps — measured in §3.2, one entry, the
whole structure inline. The design is settled:
`docs/design/2026-08-14-concierge-sessions-and-catalog.md:363-366` — "catalog
search is not a new subsystem; it is the meaning fold at a query algebra, keyed
by `(fold digest, catalog head)`" — with `type.get` costed as "one request kind.
**Trivial**" (`:394-398`, mirrored as row G3 at
`estate-structures-map.md:178`). It is item 5 of the short-term build order
(`NEXT.md:279-281`). The deeper limit is worth telling the developer now:
identity commits *shape only*, field names are annotations and are thrown away,
so search by meaning requires brands — "brand or be unfindable"
(`concierge-sessions-and-catalog.md:616-621`).

**S13. I diff two types.**
As a developer holding two digests that ought to be the same, I want to be shown
where they differ, so that I can decide whether it is a change or a mistake.
**TODAY: does not exist (RATIFIED-UNBUILT; owner: E10 Merkle node annotation,
gated on the session journal).** Today the developer's only tool is
digests-equal-or-not. The design costs `O(changed · depth)` and `O(depth)` per
move to maintain (`concierge-sessions-and-catalog.md:346-350`), and the map ranks
it a runner-up precisely because "it is only useful once A11 exists"
(`estate-structures-map.md:428-437`).

**S14. I resume yesterday's session, or branch it.**
As a developer who got the type 80% right and then went home, I want to pick up
where I stopped — or fork from step 4 and try a different fifth field — so that a
wrong turn costs one move rather than the whole dialogue.
**TODAY: does not exist (RATIFIED-UNBUILT; owner: task 37).** The session exists
and dies with the process: `proto/ts/src/session.ts:27` is a private array of
`TranscriptEntry`, "unaddressable, unverifiable, unresumable, and unsearchable"
(`concierge-sessions-and-catalog.md:21-26`). Measured: the probe's transcript had
9 steps and vanished at exit. The design is the whole of that dossier —
`flb.session.v0` with four event kinds, resume/branch/rebase, and the totality law
(L1) that makes "branch at any step" well-defined (`:109-117,152-208`). It is
wave-2 item 9 (`NEXT.md:296-298`).

---

## 2. The gap table

`BO` = short-term build-order item (`NEXT.md:270-282`); `W2` = wave 2
(`NEXT.md:294-298`); `MAP` = row in `docs/design/2026-08-14-estate-structures-map.md`.

| # | Story | What exists (file:line) | What is missing | Owner | Collision |
|---|---|---|---|---|---|
| S1 | One-command deploy | embedded NATS + JetStream, `protod.go:129-159`; ready line `cmd/protod/main.go:30-39` | a lifecycle that survives backgrounding; `--help`/`--version`; a distributable artifact | **new ticket, DX-1** (4-line flag) | none — no wire change |
| S2 | Agent registration | derived tools, `mcp.ts:28-58`; entry `mcp-main.ts` | correct annotations (#40), `outputSchema` (#17), single-process or discoverable URL | **BO 7 / task 29** (MCP output envelope) | none; #40 is the same mapping as #17, plausibly one PR |
| S3 | Self-describing surface | `dispatch.go:21,60-61` | a README line telling the developer to call it first | docs | none |
| S4 | Bulk load a folder | ingress `ingress.go:39-44`; 3 ms for 3 frames | a loader, format adapters, any CLI at all | **new ticket, DX-2 (client-side)** | **none if client-side.** A `flb.req.data.load` request kind WOULD collide — see the warning below |
| S5 | Land data before types | `W4` refuses (`ingress.go:74-90`); `{"k":"opaque"}` admits anything (§3.4) | a named staging convention + one worked example | **docs + `proto/DECISIONS.md` entry** | none — zero new subjects, zero wire change |
| S6 | Stated limits | admit note `ingress.go:19-21` | the `verified` naming on empty reads (#39) | #39 | none |
| S7 | **Types from my data** | **nothing** | the whole lane: a proposer, a widening algebra, a confidence/coverage report, and the ratification that it produces *partials*, never catalog entries | **UNOWNED — new ticket, DX-3**; nearest neighbour is 015 | **flag: if it lands as a daemon request kind it hits the row-7 collision** |
| S8 | Confirm loop | `concierge.go:40,82`; measured 11 calls / 7 clean (`demo/mcp-concierge-session.md`, branch-only) | `example` on `checkKeys` (`walk.go:344-346`); repair payload for `unknown-ref` (#41); per-hole legality (#19); discoverable entry move | #41, #19, **BO 4 / task 33** (no-dead-ends) | none — refusal payload fields only |
| S9 | Recomputable identity | `W1`; measured local ≡ remote digest | — | shipped | — |
| S10 | Types generate code | three targets, `codegen.ts:136,235,319` | a CLI, `packages/codegen` graduation, E18 `additionalProperties` fix | `NEXT.md:346-350`; **E18 needs an issue** | none |
| S11 | Conformance on ingest | honest note only | the codegen-derived codec | ratified-later, `CONTRACT.md:112-115` | would touch ingress semantics — sequence after task 36 |
| S12 | Search the catalog | catalog-is-a-journal read | `type.get`, `catalog.query` | **BO 5 / task 34**; `MAP` G1–G3 | **row-7 collision: task 34 already claims `dispatch.go` + `CONTRACT.md` + wire fixtures** |
| S13 | Diff two types | digest equality | Merkle node annotation | `MAP` E10, gated on A11 | inherits task 37's file claims |
| S14 | Resume / branch | private array `session.ts:27` | `flb.session.v0` + 5 request kinds | **W2 / task 37**; `MAP` A11+A12 | **row-7 collision: five new subjects in `dispatch.go`** |

### Collision warning — the row-7 rule applies to every story here

[#35](https://github.com/mepuka/foldlab/issues/35) row 7: *"Three lanes, one
file, issue-granularity claims: tasks 29/34/37 all add request kinds to
`dispatch.go` / `CONTRACT.md` / frozen wire fixtures."* Task 34 adds
`catalog.query` and `type.get`; task 37 adds five `flb.req.session.*` kinds; task
29 rewrites the MCP reply envelope that every one of them is described through.
`dispatch.go:45-78` is a single `switch` over `msg.Subject`, `CONTRACT.md`'s
subject table is hand-maintained, and `proto/wire/fixtures/` is frozen with
regeneration gated on `-force` plus a committed reason
(`proto/wire/CONTRACT.md:183-186`).

**Therefore: none of the DX gaps in this document should be built as a new
daemon request kind while wave 2 is in flight.** Each of them can be satisfied
client-side or by convention:

- **S4 (bulk load)** — a client-side loader that loops `flb.ing.<journal>`. No
  new subject. If someone proposes `flb.req.data.load`, it is a fourth lane in
  the same file and it must claim on #22 first.
- **S5 (staging)** — a *convention over an existing kind*. Zero new subjects.
- **S7 (inference)** — belongs client-side or in a separate process for exactly
  this reason. A `flb.req.type.propose` kind would be a fifth claim on
  `dispatch.go`, would need a frozen fixture, and would put an untrusted producer
  behind the daemon's own seam — which ticket 015 already prohibits (`:19-25`).
- **S1 (lifecycle flag)** — `cmd/protod/main.go` only. No wire surface.

The one gap that genuinely wants a request kind is **S12**, and task 34 already
owns it.

---

## 3. The first slice

The smallest coherent path a developer can run end to end today, with manual
steps left visible. Everything below was executed in this session against
`origin/main` at `310fc18`. Lines beginning `#` are commentary; `⟨…⟩` marks a
placeholder for something that does not exist.

### 3.1 — Stand the daemon up

```console
$ cd proto/go
$ mise x go@1.26.5 -- go build -o /tmp/protod ./cmd/protod
# 23 MB. No broker to install: NATS + JetStream are linked in.
# (bare `go build` fails here: go.mod requires >= 1.26, PATH go is 1.25.6
#  with GOTOOLCHAIN=local. This is machine-local, but it is the first wall.)

$ /tmp/protod --store /tmp/store --listen 127.0.0.1:4229 &
{"ready":true,"url":"nats://127.0.0.1:4229"}
$ sleep 3 && kill -0 $!
# EXITED. The daemon serves until stdin closes; a backgrounded stdin is EOF.

$ sleep infinity | /tmp/protod --store /tmp/store --listen 127.0.0.1:4229 &
{"ready":true,"url":"nats://127.0.0.1:4229"}
$ nc -z 127.0.0.1 4229
Connection to 127.0.0.1 port 4229 [tcp/*] succeeded!
# This incantation appears in no document in the repository.
```

### 3.2 — Bootstrap the folder (the twelve lines I had to write)

```console
$ cd ../ts && bun install
21 packages installed [644.00ms]
# Required and, until docs/tutorial/first-ten-minutes.md:174-184, undocumented:
# proto/ts is its own bun project; effect is not hoisted to the root.

$ ls ~/payloads
order-001.json  order-002.json  order-003.json

$ ⟨flb load ~/payloads --journal orders⟩       # DOES NOT EXIST (S4)
# Written by hand instead — readdirSync + JSON.parse + session.publish, 12 lines.

# First attempt: publish a payload with no type.
### publish a raw payload with no type claim
{
  "ok": false,
  "refusal": {
    "kind": "malformed",
    "law": "a canonical frame claims its type as a 64-char lowercase hex digest in \"type\"",
    "path": ["type"],
    "got": "",
    "expected": "64 lowercase hex characters",
    "example": { "payload": {}, "type": "0000…0000" },
    "next": [{ "subject": "flb.req.contract.describe", … }],
    "local": false
  }
}
# The refusal is exemplary. The order it enforces is the reverse of the ask (S5).
```

### 3.3 — Register the agent (optional, and the honest state of it)

```console
$ FLB_URL=nats://127.0.0.1:4229 bun src/mcp-main.ts
# spoken to as a real stdio JSON-RPC client:
type_create        | annotations: {"readOnlyHint":false,"destructiveHint":true,…} | outputSchema: ABSENT
type_fill          | annotations: {"readOnlyHint":false,"destructiveHint":true,…} | outputSchema: ABSENT
type_unfill        | annotations: {"readOnlyHint":false,"destructiveHint":true,…} | outputSchema: ABSENT
journal_read       | annotations: {"readOnlyHint":false,"destructiveHint":true,…} | outputSchema: ABSENT
contract_describe  | annotations: {"readOnlyHint":false,"destructiveHint":true,…} | outputSchema: ABSENT
publish            | annotations: {"readOnlyHint":false,"destructiveHint":true,…} | outputSchema: ABSENT
tool count: 6
# A cautious MCP host prompts the human before every read. (#40, #17)
```

### 3.4 — Stage the data first (the fix that already works)

```console
$ # Compute the staging identity offline, before touching the daemon:
$ bun -e 'console.log(structureDigest({k:"opaque"}))'
714cc72ebf92bfee7564a62f331920cde96ad36fee2d4bb43b36554f02d7456b

$ # Catalog it once, then publish anything.
type.create({k:'opaque'}) -> 714cc72e…456b created: true
admitted seq 0        # {"id":"ord_001","amount":1299,"currency":"USD"}
admitted seq 1        # {"evt":"login","ts":"…","nested":{"deep":[1,2,3]}}
admitted seq 2        # "a bare string"
admitted seq 3        # 42
verified read of staged journal: 4 entries, head f177902fe8def7240d5516b4925da6d8b77d3d677535b3db30ca6673f5a69505
resubmit converges: true
# Four shapes, one lawful identity, chain head recomputed client-side.
# W4 is satisfied, not bypassed: the identity resolves; it just says
# "structurally undescribed", which is exactly true at this point in the journey.
```

### 3.5 — Get a type (the manual half, and where the loop bites)

```console
$ ⟨flb propose-type --journal raw⟩             # DOES NOT EXIST (S7)
# So: hand-write the structure, or drive the concierge.

$ # Concierge entry move — undocumented on the tool surface:
$ #   type_fill {partial:{k:"hole"}, path:[], subtree:{k:"hole"}}
### entry move -> frontier
holes: 1
legal choices offered at hole 0: string,bool,int,float,null,opaque,literal,list,struct,union,brand,check
refs offered at hole 0: []
# Twelve kinds at this hole; the same twelve at every hole, forever (#19).

$ # The characteristic mistake of anyone guessing a shape — a plausible extra key:
### refusal for an extra key
{
  "kind": "invalid-structure",
  "law": "flb.type.v0: a \"string\" node carries exactly its declared keys — unknown keys refuse",
  "path": ["partial","fields","currency","format"],
  "got": ["format"], "expected": ["k"],
  "next": [{ "subject": "flb.req.type.fill", "body": { …the same bad subtree… } }]
}
# NO `example`. The refusal a shape-guesser hits most is the one that ships no
# witness (walk.go:329-347). `next[0].body` hands the mistake straight back.
# Also: `next` names the NATS subject `flb.req.type.fill`, not the MCP tool
# `type_fill` an agent can actually call.

$ # Hand-written instead:
type.create({k:"struct",fields:{amount:{k:"int"},currency:{k:"string"},id:{k:"string"}},optional:[]})
digest: aff98c27400d3088ba8ec1d86687c3e5987e96ad6272f6bd21679824118f48f1 created: true
local recompute agrees: true
```

### 3.6 — Load against the real type, and read it back

```console
### bulk load: 3/3 admitted in 3ms

### a payload that does NOT match the claimed type
ADMITTED ANYWAY. note: admitted on identity resolution only; payload conformance
against the claimed structure was NOT checked
# The system tells the truth about its own limits, in the success reply. (S6, S11)

### verified read: 4 entries, locally folded head
a277e8dcb01fa85f0fa9884fba2b2bf9583a03eabeb646f65b12e95258dedb3c
# The client re-folded the chain itself. The daemon's claim was checked, not trusted.
```

### 3.7 — Day two

```console
$ ⟨flb catalog search --shape '{"k":"struct","fields":{"id":{"k":"hole"}}}'⟩   # S12
$ ⟨flb type diff aff98c27… 714cc72e…⟩                                          # S13
$ ⟨flb session resume ses_…⟩                                                   # S14
# None exist. What exists:
### day-2: search the catalog for the type I just made
catalog is a journal: 1 entries; the client greps it itself
entry payload: {"digest":"aff98c27…","scheme":"bytes-sha256-v1","structure":{…},"submitter":"bootstrap-probe"}
```

**Elapsed, warm:** 2018 ms for the whole probe (§3.2 + §3.6), of which ~2000 ms
is the one-time `go build` inside the harness. **Elapsed, honest, for a human
from a cold checkout:** the build, the two `bun install`s, the toolchain wall,
the stdin trap, and hand-writing both the loader and the type. Under an hour if
nothing surprises them. Every surprise above is one of the fourteen stories.

---

## 4. DX verdicts — the three worst frictions, ranked

Ranked by *how many developers hit it* × *how far into the journey they get
before they do* — a friction at minute two costs more than a better one at minute
forty, because nobody is left at minute forty.

### R1 — The journey runs backwards from the sentence that sold it

The operator's ask is *bootstrap data, then create types from it*. Step one of
the actual system is *hand-write a type*. There is no inference lane (S7,
UNOWNED) and `W4` refuses everything else (S5). A developer with a folder of JSON
and no schema has, today, nowhere to put their data and no help writing the type
that would let them. This is the whole persona, blocked at minute two.

**Cheapest fix — ratify a staging convention. Zero code in the daemon.** Name
`{"k":"opaque"}` the staging identity; publish its digest
(`714cc72ebf92bfee7564a62f331920cde96ad36fee2d4bb43b36554f02d7456b`) as a
well-known constant; document the two-phase story — *stage now, type later,
republish under the real digest when you have it*. It is one `proto/DECISIONS.md`
entry, one paragraph in `CONTRACT.md`, and one example script. **Proven in §3.4,
not proposed:** four heterogeneous payloads admitted, journal head verified, the
resubmit converged. It satisfies `W4` rather than bending it, adds no request
kind, and therefore cannot collide with tasks 29/34/37.

*Second-cheapest, and the one worth a ticket:* a client-side type proposer that
reads a staged journal and emits a **partial** for the concierge to dispose of —
never a catalog entry. That respects `015:19-25` (the synthesizer is permanently
untrusted), needs no daemon change, and turns S7 from "unowned" into "one script
and a grilling."

### R2 — The deploy is a harness, not a deploy

`protod` backgrounded in any normal shell prints its ready line and dies —
measured twice (`&` and `nohup`, §3.1). The working incantation,
`sleep infinity | protod …`, is written nowhere. Compounding it: the binary must
be built from source, the build fails on a stock `go` because `go.mod` requires
1.26, `proto/ts` needs its own `bun install`
([#26](https://github.com/mepuka/foldlab/issues/26)'s hoisting friction, sized at
644 ms and one confusing error), and the MCP entry point needs a URL the daemon
chooses at random unless `--listen` is pinned. Four separate walls before the
first request.

**Cheapest fix — one flag.** `--detach` (or `--no-stdin-shutdown`) in
`proto/go/cmd/protod/main.go:43-52`: skip the `io.Copy(io.Discard, os.Stdin)`
goroutine and wait on the signal channel alone. Four lines, no wire surface, no
collision. Pair it with three lines in `docs/tutorial/first-ten-minutes.md`
naming the toolchain requirement and the `--listen` pin. The distributable
artifact and the single-process MCP mode are real asks but they are tickets, not
frictions to fix this week.

### R3 — The two refusals a bootstrapping developer hits most are the two that do not teach

The whole value proposition is *the refusal carries its own repair*, and it holds
beautifully for the typo case — `{"k":"strng"}` repairs in one round-trip from
`example` alone, standing-tested at `proto/ts/test/smoke.test.ts:59`. But the
developer arriving from a folder of JSON is not making typos; they are guessing
shapes. Their two characteristic errors are **an extra key on a node** and **a
mistyped reference**, and both were captured failing at HEAD in §3.5:
`checkKeys` ships no `example` at all (`walk.go:329-347`), and `unknown-ref`'s
`next[0].body` hands the bad digest straight back (#41 — and two of the four
overhead round-trips in the only measured session were this one kind). A third
edge in the same family: `next` speaks NATS subjects (`flb.req.type.fill`) to a
caller who can only invoke MCP tools (`type_fill`).

**Cheapest fix — two payload edits, no new law.** (a) In `walk.go:344-346`, pass
the offending node *with the unknown key removed* as `example`; it is already
computed and it is by construction admissible at that path, which is exactly the
`C4` property the frontier already promises. (b) In the `unknown-ref` refusal,
populate `next[0].body` from `catalog.resolvableDigests` — the same call
`buildFrontier` already makes at `concierge.go:125` — so the hint is a *different*
request rather than the same one. Neither touches `dispatch.go`, `CONTRACT.md`'s
subject table, or a frozen fixture; both are refusal-payload fields, and the
existing conformance suite covers the shape. (c) One line in each `next[].note`
naming the MCP tool alongside the subject, or the mapping carried structurally —
this one overlaps task 29 and should be claimed there rather than done twice.

*Runner-up, deliberately not in the top three:* every MCP tool annotated
`destructiveHint:true` (#40) makes a cautious host prompt before every read. It
is cheap and it is real, but it bites agents rather than the developer at the
keyboard, and task 29 already owns the same mapping.

---

## 5. What this document does not know

- **The measured concierge session is branch-only.** The 11-calls/7-clean number
  comes from `demo/mcp-concierge-session.md` at commit `5227f51` on branch
  `worktree-agent-ac12a6acee3504305`. It is **not on `main`**, though
  `README.md:241` cites it as if it were. Everything else quantified here was
  re-measured in this session.
- **n = 1, and the 1 is a model.** Every timing and round-trip count above came
  from probes an agent wrote and ran. There is no human trial, no held-out
  condition, no "with docs" arm. The sizing note at
  `docs/design/2026-08-14-learning-by-refutation.md:821-828` applies to this
  document too, and the first real DX finding will probably refute one of the
  fourteen stories' verdicts.
- **The staging convention has not been grilled.** §3.4 proves it *runs*. It does
  not prove it is *right*: staging under one shared digest means every staged
  frame in every journal shares an identity, which may be exactly wrong for
  provenance, and the re-publish step (staged frame → typed frame) duplicates
  data in the journal with no stated relationship between the two entries. That
  is one decision, and it is owed before the paragraph is written.
- **Nothing here was run on Windows**, where the primary development machine
  lives. The stdin-shutdown design exists precisely because Windows has no
  `SIGTERM` worth sending (`proto/ts/test/harness.ts:1-4`), so the `--detach`
  fix in R2 must be checked against that constraint before it is built.
- **No load beyond four frames.** The 3 ms / 3 files number says nothing about a
  developer's actual folder. Ticket 026 (the scale gauntlet) is the right home
  for that question, not this document.
