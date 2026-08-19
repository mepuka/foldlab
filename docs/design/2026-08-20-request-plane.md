# The request plane — addressed conversations over the substrate, a door story

Date: 2026-08-20. Status: **DESIGN, PRE-GRILL.** Written by a
fable-xhigh seat in a worktree branched from `main` at `7373b5199`, for
DEV-880 (epic DEV-879, stage 2). **RECORD ONLY:** it changes no code, no
gate, no corpus row, no fixture, and no ticket; its only write is this
file. It rules nothing; the operator rules. The build ticket is cut only
after ratification, as the ticket itself says.

**What this record is.** Four things, in order. (1) The gap named: the
estate has broadcast facts (lanes), merged observations (cells), fenced
exclusive choices (registers), and a served MCP face — and no
first-class *addressed conversation*: one seat asks another and awaits
an answer. The epic calls this row "DOES NOT EXIST — the largest gap."
(2) The derivation, consumed rather than reinvented: the kernel-algebra
record already derives `call`/RPC as a composition — "declare the work,
decide the outcome; the request plane is transport, never meaning" —
and this record supplies exactly what that one line leaves open: how
the ask is announced to a responder, where the answer lands, what the
writ must name, how silence reads, and what the vendor's request-reply
machinery is allowed to be. (3) The door story: every piece of the
conversation is an ordinary act judged at the one door; the kernel
language does not grow by one word. (4) A grill sheet — six decisions,
recommended option first, alternatives priced.

**What this record is not.** It is not a build: no lane is declared, no
event form minted, no seam widened, no gate written. It mints no kernel
vocabulary — no new act kind, no new envelope kind, no new subject
family; the two record-local prose names it does use (*ask lane*,
*answer lane*) name compositions of shipped concepts and brand nothing.
It claims no liveness: nothing here promises a request is delivered, a
responder is running, or an answer arrives — silence is read, never
promised away. It does not design the LLM seat: the eventual first
responder is an untrusted proposer behind the door (the epic's standing
bound), context for this record and not its scope. And it does not
touch authentication: attribution is holder, scope is writ, and
everything beyond that is explicitly future, per the epic's bounds.

**Law 10 and this file.** Law 10 forbids tracking artifacts —
repo-local ids, ticket keys, paths, and commands — on any surface
rendered *outward*. A design record is tracking-land, not an official
document, so path, gate, and ticket citations are lawful here and used
throughout, matching every sibling record in this directory. Nothing in
this file is a projection source. One of Law 10's clauses is
load-bearing *inside* the design too: plait items refer by digest only,
which is why every correlation mechanism proposed below is a digest
citation and never a subject string, an inbox coordinate, or an id.

**The honesty convention.** Every doctrine section opens with a
**Ground** block: what exists in a source this seat opened and read
this session, cited to the exact file. Everything outside a Ground
block is reading, derivation, or proposal, and is marked as such.
Confidence tiers as the estate uses them: **ratified** (grill record or
standing ruling) · **proven** (a machine-checked theorem behind a gate)
· **shipped** (code on this branch, read in place) ·
**pinned-vendor-read** (the pinned client's installed bytes, read in
place this session) · **proposed** (this record's own design) ·
**carried** (a sibling record's claim, cited, not re-verified here).
Nothing in this record is measured; every cost is an ordering claim.
§11 says what I could not verify at all.

---

## 0. Orientation for a reader from outside

This estate runs a coordination substrate for fleets of AI agents.
Every value is named by the hash of its one canonical byte form; every
state change enters through a single admission function that either
admits it or returns a typed refusal that teaches its own repair; and
the concurrency claims behind the storage shapes are machine-checked.
This record is about the moment one agent asks another agent a question
and waits for the answer — the request/reply everybody else's stack
does with an RPC call — done under that discipline.

House terms, one line each, used plainly thereafter:

- **Digest** — the SHA-256 hash of a value's one canonical byte form;
  its permanent name. Two spellings of one value have one digest.
- **Canonical bytes** — the single lawful serialization of a value; the
  thing the digest is computed over.
- **The door** (`admit`) — the one place judgment happens. A candidate
  act goes in; an admitted act or a taught **refusal** (reason, law,
  repair) comes out. Refusals are data, never thrown errors.
- **Candidate** — a proposed act before judgment.
- **The eight generators** — the whole act language: `declare` (let
  this value exist, under a writ), `resolve` (what does this digest
  denote — re-derived, never trusted), `emit` (add attributed testimony
  to a lane), `join` (merge a contribution into a shared cell), `fold`
  (reduce a lane at an anchor), `decide` (land one fenced outcome at a
  register), `trigger` (a standing monotone conditional), `spawn` (mint
  a child seat with narrowed authority). Nothing else is a verb.
- **Lane** — an append-only, positioned stream of attributed facts,
  declared as canonical data; its declaration's digest is its name. A
  **partition** is one of its ordered sub-streams; a **position** is a
  place in one. There is no time on a landed fact, deliberately.
- **Fold** — a declared reduction over a lane, read at an **anchor**
  (a checkpointed position). The estate's one read of changing state.
  An anchored answer is never wrong later, only earlier.
- **Cell** — a set-union-merged bag of holder-attributed observations;
  the carrier for "what is known here includes at least this."
- **Register** — the one priced carrier: per work key, at most one
  outcome lands, fenced by a monotone token. States read as absent /
  held / landed; landed is terminal.
- **Writ / holder** — the declared scope a seat acts under (a holder
  plus the view digests it may image), and the attributed identity it
  acts as. Attribution, never authority; today a writ is a declaration,
  not a guard — the guard is a later epic stage.
- **Envelope** — the one wire shape a lane carries: version, one of
  four monotone kinds (`emit`, `attest`, `checkpoint`, `sealed`), the
  lane digest, a routing key, the holder, the body, optional
  certificate, and **pins** — an array of digests the value cites.
- **Chatter vs facts** — the substrate's ruled split: durable facts
  decide; ephemeral chatter may *accelerate* what facts determine and
  may never decide anything.
- **Flux vs meaning** — the epic-wide two-register doctrine: flux is
  what streams through unjudged and droppable; meaning is landed,
  digested, judged values.
- **Tick facts** — clock readings landed as ordinary emitted facts by a
  seat that owns a clock, so that time enters the record as testimony
  and never as an ambient input.
- **Seat** — one running party (an agent, a daemon, a human's tool)
  holding a connection, a holder name, and a writ.
- **Ask lane / answer lane** — this record's names for the paired
  declared lanes a conversation rides. Prose vocabulary of this record,
  not kernel vocabulary.
- **Transcription** — the estate's discipline for foreign vocabularies:
  vendor names carried verbatim as data with per-row provenance, never
  renamed, never subset, never re-designed.

---

## 1. Result first

**1.1 One sentence.** A request is an ordinary emitted fact onto a
declared ask lane, judged at the door under the asker's writ like every
emit; an answer is an ordinary landed fact on a declared answer lane
that **cites the request's digest**; awaiting is folding; silence is a
position-bounded reading and never a verdict; and the vendor's
request-reply machinery is transport that may accelerate all of this
and may decide none of it. No kernel vocabulary grows. The whole plane
is a *usage pattern over shipped generators*, which is why this record
can be short where it matters and priced where it isn't.

**1.2 Three conversation shapes, one discipline.** A **query** — the
answer is a pure function of the request — is one ask fact and one
answer fact, correlated by digest citation; duplicates on either side
are harmless by construction. A **commission** — the work has a side
effect or must happen at most once — adds the already-ruled register
discipline: the work is declared, its digest keys a register, the
answer of record is the fenced outcome, and the answer fact announces
it. A **streamed answer** — many parts, then done — is a completion
stream in the sibling record's exact sense, carried on the answer
lane's positioned partition with the estate's own envelope kinds
supplying the claim the vendors mostly don't (§6.3). The three shapes
share the ask, the correlation, the writ story, and the refusal path;
they differ only in what the answer is.

**1.3 The door story, compressed.** What is judged: the ask is an
`emit` candidate; the asked work, when the responder runs it, is a
program whose every node is judged; the answer is an `emit` (and, for a
commission, a `decide`) — three ordinary judgments, no new act kind,
and no judgment that would not have happened anyway. What is
attributed: every envelope carries its holder verbatim. What the writ
scopes: the asker's writ must reach the responder's ask lane; the
responder's writ must name the fold over its own ask lane and reach its
answer lane and register family; askable *is* a set of declarations,
which makes the service directory a read, not a mechanism (§4.4).

**1.4 Silence.** A request nobody answers reads as "no answer citing
this digest through position p of my view" — a statement about a
position, never about the world, never about the responder, and never a
verdict on the conversation. The estate already refuses every stronger
reading three separate ways, and the door itself cannot even spell the
timeout trigger (§5). Retry is re-emitting the identical value —
at-least-once plus idempotency-by-digest, already the emit seam's own
taught repair — and the fence covers the non-idempotent remainder.
*Acting* on silence (substituting a default, re-dispatching, giving up
on the record) is a fenced act of a deadline seat fed by tick facts,
never a kernel behavior.

**1.5 The claim.** What asserts an answer is complete: for a single
fact, the fact is the whole final (the degenerate completion stream);
for a commission, the register's landed outcome is terminal by the
proved fence; for a streamed answer, exactly one `sealed` envelope
citing the request digest — the in-band whole-final claim the
completion-stream survey found only one vendor supplies, here available
by construction because the estate owns the wire (§6). Finding F-1 of
that record is consumed, not rediscovered.

**1.6 The wire.** Conversations are paired declared lane families —
positions, retention, attribution, judgment — and that is the meaning
register. The pinned client's `request`/`requestMany` surface is
transport: it supplies ordered replies and no claim, no attribution, no
writ, and a broker-negative ("no responders") the estate refuses as
meaning; its lawful station is acceleration under the ruled chatter
promotion rule, and the record prices exactly what an accelerator may
carry (§7).

**1.7 The recommended answers, previewed.** RQ-1: the ask is an emit
onto a declared ask lane; the answer is a landed fact citing the
request digest, plus the fenced outcome where the work is exclusive —
spawn is not the ask and declare-only is not an announcement. RQ-2:
holder on every envelope; askable = three declarations (the ask lane,
the responder's standing trigger, the responder's writ naming the
queue fold); nothing per-conversation is minted. RQ-3: absence at a
position; identical-bytes retries; the deadline seat owns every act
taken on silence. RQ-4: the envelope kinds are the claim carrier; a
response stream *is* a completion stream with the estate as its own
vendor. RQ-5: paired responder-owned lane families, correlated by
digest; vendor request-reply as optional accelerator only, under an
erasure law. RQ-6: a refused ask is *answered* with the taught row
verbatim; the door teaches, carriage passes through, and the two
refusal vocabularies stay distinct on the wire. §10 prices all of it.

---

## 2. Grounding — the authorities

Every row was opened and read in this environment this session.
Nothing below is grounded on a document this seat did not read.

| Authority | What it carries here | Tier |
| --- | --- | --- |
| `packages/plait/src/kernel/KernelDoor.ts` + `KernelTables.generated.ts` + `KernelBuilder.generated.ts` + `KernelSdk.generated.ts` | the eight generators and their exact fields (`emit(lane, body)`, `spawn(parent: policy, request: policy)`, `decide(register, token, outcome)`, `trigger(predicate, declaration)`); the five monotone trigger predicates including `outcomeLanded`; the refusal table — `absence-trigger` refused for `onAbsence`/`negation`/`deadline` candidates, `absence-claim`, `clock-read`, `unfenced-decide` | shipped (the door module hand-written over schemas the corpus generates; the tables, builder, and SDK generated, provenance digest in the tables module) |
| `packages/plait/src/kernel/Wire.ts` | envelope v0: the four monotone kinds `emit`/`attest`/`checkpoint`/`sealed`; `holder` ("attribution, never authority"); `pins: Array(Digest)`; the measured payload budget and the `{blob: Digest}` overflow form; digest-as-message-id verification | shipped |
| `packages/plait/src/kernel/Subjects.ts` | the whole routing grammar: `flb.fab.ev.<lane>.<part>`, `flb.fab.fact.<venue>`, `flb.fab.node.<node>`, and the one literal-token alphabet | shipped |
| `packages/plait/src/planes/Lane.ts` + `internal/lanes.ts` | declared lanes as canonical data; partition derivation from a declared key path (`digest(key) mod partitions`); `LandedFact` with partition/position/digest/holder and deliberately no time; `tail`/`follow` reads; the emit envelope spelled `kind: "emit"` with `msgID` = envelope digest; the per-`(lane, partition)` exact stream named by the declaration digest; the two-minute duplicate window; the taught retry note ("re-emit; duplicate delivery is harmless, the envelope digest is the message id") | shipped |
| `packages/plait/src/planes/Register.ts` | `grant`/`renew`/`commit`/`expireSteal`/`observe`; absent/held/landed with landed terminal; token as the only authority; the stated direction that the register key IS a work digest | shipped (walled against the proved register model, per its own header) |
| `packages/plait/src/planes/Session.ts` | the writ declaration `{holder, views}` — "a declaration, not a guard"; the writ re-judged on every read step | shipped |
| `packages/plait/src/planes/Fold.ts` | rung⇒carrier at the type level: one partition reads positioned, more read the multiset presentation | shipped |
| `packages/plait/src/planes/Resolved.ts` | verify-on-read: no decode path trusts an asserted digest | shipped |
| `packages/plait/src/carriage/Engine.ts` | the run discipline: complete → judge → carry per node; `RunOutcome` = landed / refused / unspeakable with the standing steps kept as evidence; taught rows passed through verbatim (`rowOf`); "the engine holds no clock, no retry, and no queue, so re-running is the caller's act"; a decide lands the outcome's cataloged *address* | shipped |
| `packages/plait/src/internal/connectionfold.ts` | the first precedent, verbatim: "**This fold never says live.** It reports the last state the facts it walked support, and nothing about now" — staleness is a position difference the reader computes | shipped |
| `packages/plait/DECISIONS.md`, the incarnation-succession entry (U10, 2026-08-19) | the second precedent, verbatim: "crash is not a fact, and refusing to succeed an unretired incarnation would make recovery after a crash impossible without forging one" | shipped (decision log) |
| `packages/plait/src/internal/heartbeatlane.ts` + `internal/sessionfacts.ts` | tick facts on a one-partition lane; the pattern this record reuses twice — a lane's handle is the digest of its declared event form | shipped |
| `packages/plait/src/internal/wirevocabulary.ts` | the transcription discipline (emitted-not-written rows, per-row provenance digests, declared-but-unused rows); the vendor's own reply-to convention already transcribed (`PUB <subject> [reply-to] …`); the system-account inbox row classified chatter: "It accelerates a request-reply round trip and decides nothing"; the broker-presence promotion note: the broker's view of who is connected is "both late and, for reaped connections, wrong" | shipped |
| `packages/plait/src/surface/mcp.ts` + `fixtures/tools.schema.json` | the served tool artifact: the eight `kernel_*` tools, served-equals-derived; every call through the engine; "an unlawful sentence returns the taught row"; the two refusal vocabularies kept distinct on the wire | shipped |
| `packages/plait/node_modules/@nats-io/nats-core/lib/core.d.ts` + `lib/errors.d.ts` at the primary checkout, version 3.4.0 (the exact pin `packages/plait/package.json` declares) | `request(subject, payload?, {timeout, headers, noMux, reply})` resolving on the *first* response; `requestMany` with `RequestStrategy = "timer" \| "count" \| "stall" \| "sentinel"`; the muxed `_INBOX` reply subscription and `createInbox`; `Msg.reply`/`respond`; `RequestError` with `TimeoutError`/`NoRespondersError` causes, no-responders failing "as soon as the server processes it" | pinned-vendor-read (installed bytes; §11.2) |
| the installed `@nats-io` scope at the primary checkout | exactly five packages installed — `nats-core`, `jetstream`, `kv`, `obj`, `transport-node` — and **no services/micro framework**; the declared dependencies match | pinned-vendor-read (finding F-A) |
| `docs/design/2026-08-18-plait-kernel-algebra.md` §5.3 | the derivation this record consumes, quoted verbatim in §3.1: the `call`/RPC row and the `send(to, msg)` row; R7 (the register key IS a declaration digest — no anonymous decision); R8 (repetition is the successor round) | carried (sibling record; its K-series rulings ratified 2026-08-18) |
| `docs/design/2026-08-19-completion-stream-algebra.md` | F-1 (the NATS-native convention has no carrier for the claim; the estate's envelope kinds are the unlock); the completion-stream shape (§3 there) this record's streamed answers instantiate; CS-2's checkpoint discipline | carried (pre-grill sibling, same epic and stage) |
| `docs/design/2026-08-19-estate-daemon-spec.md` R-3, adopted verbatim into the daemon epic | the three wire shapes (journal facts / commitment registers / ephemeral chatter) and the promotion rule — "*chatter accelerates; facts decide*"; the epic's limit that no child slice invents a wire word: a new subject enters only as "a lane subject derived from a declaration digest" | ratified (operator ruling 2026-08-19) |
| the agent-harness epic DEV-879 (with its addendum) and DEV-880, DEV-881, read on the board this session | the gap row ("invoke an agent, await answer — the request plane — DOES NOT EXIST"); the bounds (the kernel language does not grow; no liveness; holder+writ only; the LLM last); "Spawn is the call instruction; the writ is the calling convention" for *subroutines*; the two-register flux/meaning doctrine as epic-wide law; run steps landing as facts (the sibling slice this record's traces compose with) | board tickets |
| `.agents/skills/architecture-to-algebra/` (SKILL.md + the generators reference) | the battery-pinned teaching material: the not-a-generator table (`call`/RPC derived; `send` derived; `onAbsence`/`timeout` triggers refused), the closure list (row 11: absence reasoning from local views), and "deadlines belong to a fenced authority fed by tick facts" | shipped (teaching material, held byte-identical by the skills wall) |

Standing rulings composed and not reopened: one door (standing law 2);
plane layering (standing law 4); Effect idiomatic (standing law 5);
served equals derived (standing law 3); the transcription rule (daemon
spec R-3); the chatter promotion rule (same); Law 10; the epic's
two-register addendum; the epic's binding nondeterminism clause
("nothing nondeterministic is ever load-bearing except through
admission"), carried verbatim and not reinterpreted.

---

## 3. The conversation, stated precisely

### 3.1 The derivation this record consumes

**Ground.** The kernel-algebra record's not-a-generator table, read in
place this session, carries two rows verbatim:

> `call` / RPC | derived | an action: `declare` the C7 declaration (the
> work digest is the register key), `decide` the outcome; the request
> plane is transport, never meaning

> `send(to, msg)` | derived | `emit` on a lane both parties' writs
> reach; there is no point-to-point primitive because
> delivery-to-a-party is a liveness claim the fabric refuses to make

And its R7: "`decide` is well-formed only against a declared work
digest — the register key IS a declaration digest, so no anonymous
decision exists." The same two rows ride the battery-pinned
architecture-to-algebra skill, byte-held against drift.

**Reading (this record's frame).** The composition is already ruled;
what it deliberately does not say is the *conversation*: how a specific
responder learns a specific asker wants something, where the answer
lands so the asker finds it, and what everyone's writ must name. Those
are exactly the six ruled questions of §10. Note the row's own
downgrade of this record's namesake: "the request plane is transport,
never meaning." This record keeps that sentence as its spine — every
meaning-bearing piece below is an ordinary lane, register, or catalog
landing; the only thing that is *specifically* request-plane-shaped is
transport and convention, priced as such.

### 3.2 The ask

**Ground.** `Lane.emit` (shipped): an admitted event is enveloped with
`kind: "emit"`, the lane's declaration digest, a routing key derived
from the declared key path, the holder verbatim, the body, and pins;
the envelope's canonical-bytes digest is the substrate message id; the
declared `(lane, partition)` pair owns one exact append-only stream.
The trigger generator (shipped, generated): `evidenceAppears(lane,
pattern)` is a monotone predicate the door admits; the epic notes the
reaction runtime that would *act* on admitted triggers is its own
later slice.

**Proposed.** An **ask** is one emitted fact onto a declared **ask
lane** the responder owns. The event body is the request value itself —
what is asked, in a declared event form — or, for a commission, a
reference: the digest of a separately declared work value (§3.5). The
ask's name, for the rest of its life, is its envelope digest. The
address is the lane: asking *this* responder means emitting onto the
ask lane *this* responder declared, and no other addressing exists —
no subject aimed at a party, no inbox, no point-to-point primitive,
exactly per the `send` row's refusal to promise delivery-to-a-party.

### 3.3 The answer

**Ground.** The envelope carries `pins: Array(Digest)` (shipped); the
register lands the outcome's cataloged *address*, never a rendered
value (`Engine.decide`, shipped, with the comment saying exactly that);
`resolve` re-derives every digest it fetches (`Resolved.ts`, shipped).

**Proposed.** An **answer** is a landed fact on a declared **answer
lane**, whose envelope pins the request's digest and whose body is the
answer value (or `{blob: Digest}` past the inline threshold, the wire
grammar's own overflow form). For a commission, the answer of record is
the register's landed outcome — an address the asker resolves under
verify-on-read — and the answer fact on the lane is its announcement,
pinning both the request digest and the outcome address. So: **is an
answer a landing? Yes — it is one or two of the landings the estate
already has** (a lane landing always; a register landing when fenced),
and never a third kind of thing.

### 3.4 Correlation is citation

**Proposed, and pre-registered as this record's law candidate.**

> **CANDIDATE (correlation-by-citation).** An answer is an answer only
> by citing its request's digest (in its pins, and in its body's
> declared form). Correlation is citation — never a subject coordinate,
> an inbox, a session, an id, or a clock. A fact that answers without
> citing answers nothing.

This is Law 10's digest-only discipline doing conversational work, and
it is what makes the conversation a *value*: the pair (request digest,
the set of landed facts citing it) is derivable by any reader from the
lanes alone, with no runtime state anywhere. It is also what makes
duplicates harmless (§5.3) and what a streamed answer's parts share
(§6.3).

### 3.5 The three shapes

**Proposed.** One discipline, three compositions, chosen by the work's
own nature — the fence demotion challenge applied to conversations:

| Shape | The ask | The answer | The claim of completeness | When |
| --- | --- | --- | --- | --- |
| **query** | emit onto the ask lane; body = the request value | one landed fact citing the request digest | the fact itself (the whole final in one envelope) | the answer is a pure function of the request; two answers agree byte-for-byte, so nobody needs a winner |
| **commission** | `declare` the work value (its digest = the register key, per R7), then emit the ask citing it | the fenced outcome landed at the work's register; an announcing fact on the answer lane citing request + outcome | the register landing — terminal by the proved fence, at most one lands | the work has an external side effect or must land at most once |
| **streamed answer** | as query or commission | an ordered run of envelopes on one answer-lane partition, all citing the request digest; deltas as `emit`, sub-claims as `checkpoint`, exactly one `sealed` last | the `sealed` envelope, citing the request digest and pinning the final's digest | the answer has parts and a watcher should see the first before the last exists |

The query is the default; a conversation is fenced only when its
demotion fails ("could both answers land, with the choice deferred to
a read?" — for a pure query, yes, so no fence). The commission's fence
is not new machinery: it is the already-shipped register discipline
keyed exactly as R7 directs. A retry of a commission races the grant
and at most one commit lands — the model's claim, not this record's.

### 3.6 What a conversation is not

**Proposed, answering the ticket's relation questions directly.**

- **A conversation is not a lane.** The lanes are shared carriage: one
  ask lane carries many conversations from many askers; one answer lane
  carries many answers. The conversation is the *citation-closed set of
  facts around one request digest* — a derived value, not a carrier.
  Nothing needs declaring per conversation, which is why opening one
  costs one emit.
- **A conversation is not a session.** A session is a reader's position
  under a writ (shipped meaning); a conversation is facts. An asker may
  crash, resume at its anchor, and find its answer — that is the whole
  point of answers being landings.
- **A conversation is not a spawn.** `spawn` is the kernel's
  authority-narrowing act — parent policy, request policy, child speaks
  with at most the meet — the *call instruction for subroutines* in the
  epic's own words: it mints a speaker. The request plane addresses a
  speaker that already exists. They compose (§4.4's bound: a spawner
  seat may answer asks by spawning a child to do the work) and must not
  be conflated: one changes who exists, the other changes only the
  record.
- **A conversation is not a wire exchange.** The vendor request-reply
  round trip, where used at all, is an accelerator (§7.4). An in-flight
  conversation — the watching, the streaming, the inbox hop — is flux;
  what landed is the conversation.

---

## 4. The door story

### 4.1 What is judged: nothing new

**Ground.** `FabricClient.admit` and `Engine.admit` are the kernel
function itself — "carriage adds no validator" (shipped, both files);
every `Engine` write path judges before carrying; the MCP face routes
every tool call through the engine (shipped). The candidate grammar is
closed: eight generators, and the door's own refused shapes
(`trustBytes`, `readLatest`, `updateInPlace`) are refused with taught
rows (shipped, generated).

**Proposed.** The request plane adds **no act kind** — the ticket's
bound, honored strictly. The ask is judged as an emit (the asker's
door). The asked work, when the responder runs it, is judged node by
node like any program run — the responder's door, `RunOutcome` with the
standing steps kept. The answer is judged as an emit (and a decide,
when fenced). A request is therefore *a candidate act at the door* in
exactly the sense everything else is, and "the request plane" names a
usage pattern plus transport, never a judgment path. There is no
request-shaped door, which means there is nothing request-shaped that
can rot into a second door. One consumption worth stating: because the
plane is only shipped generators, it is *speakable through the served
tool artifact today* — an agent asks with `kernel_emit`, awaits with
`kernel_fold`, and closes a commission with `kernel_decide`; no ninth
tool exists to serve, and any later convenience surface is projection,
not vocabulary.

### 4.2 Attribution

**Ground.** Every envelope carries `holder` — "attribution, never
authority" (shipped, `Wire.ts`); `LandedFact` exposes it on every read
(shipped); the register's holder is descriptive and only the token is
authority (shipped).

**Proposed.** The ask carries the asker's holder; every answer part
carries the responder's; the fenced outcome carries the responder's
holder at the register. Nothing new — and deliberately nothing more:
the epic bounds identity at holder-attribution plus writ-scope, so this
record states plainly that a holder string is a *claim of identity, not
evidence of it*, and prices nothing on top.

### 4.3 What the writ must name

**Ground.** The writ is `{holder, views}` — declared, digest-named, "a
declaration, not a guard," judged at subscribe and re-judged on every
read step (shipped, `Session.ts`). The door refuses referents outside
the catalog (`forward-reference`) and outside the writ's pinned
universe (`off-writ-referent`) (shipped, generated table). Stage 4 of
the epic is where writs become guards at act ingress.

**Proposed.** Symmetric and small:

- **To ask:** the asker's writ pins the responder's ask-lane referent
  (so the emit's lane reference is inside its universe), and names the
  fold over its own answer view (so it may read what comes back).
- **To be askable:** the responder's writ names the fold over its own
  ask lane — the queue view — and pins its answer lane and, for
  commissions, its register family.
- **Nothing per-conversation.** Writs scope standing capability; the
  conversation is identified by digest. No writ, key, or channel is
  minted per ask, which is what keeps opening a conversation at one
  emit.

Stated bound, not glossed: until stage 4 lands, all of this is
*declared* scope — the same declared-not-guard posture every writ in
the tree has today — so the request plane inherits exactly the
enforcement the estate has, no more, and claims no more.

### 4.4 Askable is three declarations

**Ground.** The trigger generator binds a monotone predicate to a
program declaration; `evidenceAppears(lane, pattern)` is one of the
five predicates (shipped, generated). The engine notes admitted
triggers are world-identity today — "hints are a derived read... the
reaction machinery [is its] own slice" (shipped). Lanes are declared
canonical values whose handles derive from declaration digests — the
heartbeat and session lanes both already spell their handle as the
digest of their declared event form (shipped, both files).

**Proposed.** A responder is **askable** when three declarations stand
in the catalog, all ordinary:

1. **The ask lane** — a declared lane whose event form is the request
   schema; handle derived from the declaration digest per the ruled
   subject-minting limit.
2. **The standing trigger** — `trigger(evidenceAppears(askLane, …),
   program)`: the responder's admitted, digest-named statement "when an
   ask appears here, hint this program." This *is* the service
   registration, and it costs no new vocabulary. Until the reaction
   slice lands, the responder's runtime honors it by folding its ask
   lane (`follow`), which is the same intent executed by the shipped
   read path; the trigger declaration is what makes the intent a fact
   rather than a habit.
3. **The writ rows of §4.3.**

Because all three are declarations, "who can I ask, and for what?" is a
fold over the catalog — a *service directory as a read* — and needs no
registry service. That read is deliberately not designed here; it is a
view a later surface declares.

One composition stated for the record: a **spawner** is a responder
whose program answers asks by `spawn` — the conversation plane and the
subroutine instruction meeting exactly where the epic put them, with
the ask supplying the request policy the spawn's writ-meet narrows
against. Stated only; the spawn consumer is a stage-3 slice.

---

## 5. Silence — timeout as absence, never verdict

### 5.1 The precedents, first-hand

**Ground.** Three independent statements of one posture, each read in
place this session:

- The connection fold: "**This fold never says live.** It reports the
  last state the facts it walked support, and nothing about now… What
  is missing from a read is the distance between the fold's position
  and the lane's head, and that distance is a POSITION difference the
  reader computes, never an age this module invents."
- The incarnation decision (U10): "**crash is not a fact**, and
  refusing to succeed an unretired incarnation would make recovery
  after a crash impossible without forging one."
- The door itself: candidate predicates `onAbsence`, `negation`, and
  `deadline` are **refused** with the `absence-trigger` row;
  `absentEverywhere` is refused with `absence-claim` (shipped,
  `KernelDoor.predicateRefusal`). The kernel cannot spell "fire when no
  answer arrives," so timeout-as-trigger is not merely discouraged — it
  has no syntax.

Also ground: the cell plane's own bound "no absence may ever be
inferred from a watch" (shipped, `Cell.ts` header), and the closure
list's row — a replica claims "at least this," never "not present
anywhere."

**Proposed.** The conversation inherits all of it unchanged. The
asker's read is: *fold my answer view at my anchor; the set of facts
citing digest D is empty through position p.* That reading is exact,
replayable, and never wrong later — only earlier. It says nothing about
the responder (crashed? slow? never heard?), nothing about the network,
and nothing about the future. A conversation fold therefore has **no
timed-out arm**: its honest states are *answered*, *refused-as-
answered* (§8), and *unanswered-through-p*. The third is a coordinate,
not a state of the world.

### 5.2 Retry: at-least-once plus idempotency-by-digest

**Ground.** The emit seam's taught transport repair, verbatim:
"Reconnect and re-emit; F2 makes duplicate delivery harmless, and the
envelope digest is the message id" (shipped, `internal/lanes.ts`). The
declared partition stream suppresses a same-digest republish within its
pinned two-minute window; `duplicate` on the acknowledgement means
exactly that and nothing more (shipped, `Lane.ts`, with the bound
spelled: a window, not a world).

**Proposed.** A retry is **the identical value emitted again**: same
canonical bytes, same digest, same message id. Within the window the
substrate absorbs it; beyond the window it may land twice, and both
landings *are one conversation* under correlation-by-citation — the
fold keys by request digest, so a duplicate ask is one conversation
twice supported, never two conversations. The discipline this imposes
on ask bodies is stated as law-shaped prose: **an ask body carries no
attempt counter, no timestamp, and no nonce** — each would mint a fresh
digest per retry (a new conversation per retry), and the latter two are
`clock-read`/`minted-identifier` refusals waiting to happen anyway. A
genuinely *new* round of the same work — different inputs, a
supersession — is R8's successor declaration citing its predecessor,
not a mutation of the old ask.

For commissions, idempotency-by-digest covers the *asking* and the
fence covers the *doing*: retried asks converge on one work digest, and
racing executors converge on one landed outcome. Nothing exactly-once
is needed anywhere, which is the estate's standing posture.

### 5.3 Acting on silence: the deadline seat

**Ground.** "Deadlines belong to a fenced authority fed by tick facts"
(the teaching reference, battery-pinned; the same sentence in the
kernel-algebra record's trigger prose). Tick facts exist in the tree
today: the heartbeat lane lands clock readings as ordinary emitted
facts on a one-partition positioned lane (shipped).

**Proposed.** Reading absence is free and verdict-less; **doing
something about it is an act, and acts have actors.** Substituting a
default answer, re-dispatching the ask to another responder, or
recording abandonment is a `decide` by a **deadline seat** — a seat
whose declared program folds tick facts against the conversation's
positions and lands its verdict at a register under its own token and
holder. Three properties fall out. It is *attributed*: "we gave up" has
an author. It is *fenced*: a give-up and a late answer cannot both be
the outcome of record — the register arbitrates, and a late answer
after a landed give-up is still a landed fact on the answer lane
(nothing unbecomes), just not the outcome. And it is *optional*: a
conversation that needs no consequence on silence simply has no
deadline seat, and costs nothing.

The asker's own process may of course stop waiting whenever it likes —
pacing is the caller's, per the engine's stated bound — but stopping is
host behavior and leaves no mark unless the asker chooses to land one.

### 5.4 Broker negatives are not verdicts

**Ground.** The pinned client fails a request "as soon as the server
processes it" when nobody subscribes to the subject
(`NoRespondersError`, pinned-vendor-read); the wire vocabulary's
promotion notes classify the broker's connectivity view as chatter —
"both late and, for reaped connections, wrong" (shipped).

**Proposed.** "No responders" is the broker's opinion about *interest
at an instant*, two removes from "the responder does not exist" and
three from "the work will not be done." Where the accelerator of §7.4
is in play, a no-responders bounce may accelerate the asker toward
retrying sooner or toward the deadline seat — and decides nothing,
lands nothing, and never reaches a fold. The same sentence covers the
vendor's `TimeoutError`: it is the accelerator's own giving-up, not the
conversation's.

---

## 6. The claim story

### 6.1 What "the answer is complete" means here

**Ground.** The sibling completion-stream record's F-1, carried: the
NATS-native conventions supply ordered deltas and **no carrier for the
claim** — three out-of-band termination heuristics and an untyped
empty-message sentinel; "the unlock is already in the tree: a
completion carried *over* NATS by the estate speaks the envelope
vocabulary — `emit` deltas, `checkpoint` claims, `sealed` terminal."
The envelope kinds are shipped grammar (`Wire.ts`); the register's
landed state is terminal by the proved fence (shipped).

**Proposed.** This record consumes F-1 as its claim story wholesale,
per shape:

- **Query:** the answer fact is the whole final in one envelope — the
  degenerate completion stream, exactly the shape the sibling survey's
  MCP row wears. Completeness needs no assertion beyond the fact
  itself.
- **Commission:** the landed register outcome is the terminal claim,
  and a stronger one than any wire grammar offers: at most one lands,
  ever, by the fence. `outcomeLanded(register)` is even a kernel
  trigger predicate, so "await the answer" has a monotone, admitted
  spelling.
- **Streamed answer:** §6.3.

### 6.2 A response stream IS a completion stream

**Proposed, stating the relation the ticket asks for.** A streamed
answer is a completion stream in the sibling record's §3 sense, with
the estate as its own vendor:

| Sibling record's word-class | The streamed answer's carrier |
| --- | --- |
| content deltas | `emit` envelopes on one answer-lane partition, each citing the request digest |
| structural brackets | none in v0 — flat, like every surveyed vendor; nesting, if ever needed, is separate conversations correlated by citation |
| annotations | `attest` / `checkpoint` envelopes citing the same digest (progress, sub-claims) |
| terminal | exactly one `sealed` envelope citing the request digest and pinning the digest of the assembled final |
| the claim | the `sealed` pin — an in-band whole-final claim |
| order | the lane's positions; the partition key (the request digest) routes every part of one answer to one partition, so the LIST-rung fold reads a positioned carrier exactly as rung⇒carrier requires |
| well-formedness | one `sealed` per request digest, last; a second `sealed` citing the same digest is a defect a fold can flag, since both are landed and neither unbecomes |

Two consequences worth spelling. First, the estate hands *itself* the
wall the sibling survey found only one vendor supplies in-band (its
grade A): fold the deltas, canonicalize, compare against the sealed
pin — verify-on-read over its own wire, free by construction. Second,
the flux tap comes for free: a watcher `follow`ing the answer partition
sees the first delta before the terminal exists, which is the epic
addendum's perceived-flux posture with no extra machinery — the deltas
*are* landed facts here, so this stream is meaning that also serves as
flux, the one place the two registers coincide.

### 6.3 The honest note under it

**Ground.** Of the four envelope kinds, exactly one has a writer today:
the lane emit seam spells `kind: "emit"` and nothing in `src` spells
`attest`, `checkpoint`, or `sealed` (verified by search this session;
finding F-B).

**Proposed.** The streamed-answer shape mints no vocabulary — the kinds
are admitted grammar — but it does require the build to widen one seam
(the lane emit path taking a kind, or a sibling landing path for the
non-`emit` kinds), plus the well-formedness fold. That is build scope,
priced at RQ-4, and this record deliberately does not pretend the
writers exist.

---

## 7. The wire

### 7.1 The two registers, applied

**Ground.** The ruled promotion rule — "*chatter accelerates; facts
decide*" — with its three wire shapes (ratified, daemon spec R-3); the
epic addendum's two-register doctrine (flux = transport, meaning =
landed values) as epic-wide law; the derivation row's own words: "the
request plane is transport, never meaning."

**Proposed.** An in-flight conversation is flux: the asker's watch on
its answer view, the responder's watch on its ask queue, any inbox hop,
any streamed delta as it flickers past a UI. What lands on the lanes
and registers is the conversation. Dropping every flux frame changes no
fold's value; recovery from a missed watch is a read of landings — the
substrate's ruled posture, inherited without amendment.

### 7.2 The meaning register: paired responder-owned lane families

**Ground.** A declared `(lane, partition)` is one exact file-backed
stream (shipped, `internal/lanes.ts`); partition = digest(key) mod
partitions, computable by any holder of the declaration (shipped,
`Lane.partition`); lane handles derive from declaration digests
(shipped precedent, twice); the daemon epic's limit: a new subject
enters only that way (ratified).

**Proposed.** Each responder declares **one ask lane and one answer
lane** — a pair, both under its own writ, both with partition keys
that route by conversation:

- ask lane: partition key = a declared path over the request form,
  normally the whole event, so one conversation's ask is one key;
- answer lane: partition key = the request-digest field of the answer
  form, so *every part of one answer shares one partition* and the
  asker computes which partition to follow from its own request digest
  with the shipped derivation — no subscription handshake, no reply-to
  coordination, nothing minted at ask time.

The subjects underneath are the existing evidence grammar
(`flb.fab.ev.<handle>.<part>`); no new family. The asker finds answers
by the citation fold; ordering within one streamed answer is the
partition's own; ordering across conversations is deliberately not
claimed (two partitions' positions do not compare — the shipped
posture).

Stated plainly because the ticket asks the relation: this is
"conversations as paired lane families, correlated by digest," and the
correlation does the work an inbox does elsewhere.

### 7.3 The vendor surface, read at the pin

**Ground (pinned-vendor-read, 3.4.0).** `request()` publishes with a
reply inbox (muxed by default, `_INBOX`-prefixed, `createInbox`),
resolves on the **first** response, times out client-side in
milliseconds, and fails fast on no-responders. `requestMany()` gathers
an ordered sequence under four strategies — `timer`, `count`, `stall`,
`sentinel` — three out-of-band heuristics and an untyped empty-message
sentinel (the sibling record's F-1, re-verified at the same installed
bytes). Replies live and die with the connection: the pinned `close()`
doc says it "will terminate all pending requests and subscriptions."
The vendor's own wire vocabulary for all of it is already
transcribed in the estate's tables: `PUB <subject> [reply-to] …`, and
the system-account inbox row classified chatter with the promotion note
"accelerates a request-reply round trip and decides nothing." **No
service framework exists at the pin**: the installed `@nats-io` scope
carries core, jetstream, kv, obj, and the node transport, and no
services/micro package (finding F-A).

**Reading.** Measured against what a conversation needs, the vendor
round trip is missing every meaning-bearing part at once: no position
(nothing to anchor or resume), no retention (a missed reply is gone),
no holder or writ on the frame, no judgment (bytes reach the asker
having met no door), and no claim (first-response wins; "done" is a
timer). None of that is a defect of the vendor — it is a transport
being a transport — and all of it is why the meaning register cannot
ride it. It is, in the estate's own ruled classification, chatter.

### 7.4 What an accelerator may carry

**Proposed.** Where the build later wants the vendor round trip's
latency (and nothing in v0 requires it — `follow` on the answer
partition is already a push), its lawful shape is a **hint**: the
responder answers the inbox with the landed coordinate and digest of
the real answer ("your answer landed; here is where and what"), and the
asker still reads the lane or resolves the digest — verify-on-read, so
the accelerator can lie about nothing. Pre-registered beside the
citation law:

> **CANDIDATE (conversation erasure).** Deleting every accelerator
> message of a conversation — every inbox reply, every no-responders
> bounce, every vendor timeout — changes no conversation fold's value.
> This is the daemon epic's chatter-erasure claim (its CL-2 shape)
> instantiated at the request plane, stated-only here.

Adopting the accelerator would also owe transcription: the client-side
request/reply surface it speaks enters the wire-vocabulary tables under
R-3 (rows exist already for the wire verbs; the client API rows would
join the status-vocabulary discipline). Priced at RQ-5; not spent in
v0.

---

## 8. Refusals on the wire

**Ground.** Refusals are data carrying reason, law, repair, and
applicability, generated from the model's table; the engine passes rows
through verbatim and constructs none (`rowOf`, shipped); a refused run
keeps its standing steps (shipped); the MCP face already serves exactly
this over a wire — "an unlawful sentence returns the taught row… and a
seam refusal… returns the estate refusal's own fields. The two
vocabularies stay distinct on the wire" (shipped).

**Proposed.** Three refusal moments, kept apart because they happen at
different doors:

1. **The ask refused at the asker's own door.** Judgment precedes
   carriage, so a refused ask *never reaches the wire*: no conversation
   opened, the asker holds the row locally, nothing to correlate.
2. **The asked work refused at the responder's door.** The responder
   ran the requested program (or judged the requested act) and the door
   said no. The refusal is the responder's **answer**: an answer fact
   citing the request digest whose body is the taught row verbatim —
   reason, law, repair, applicability, the generated table's own words,
   passed through by the responder's carriage exactly as the engine and
   the MCP face already do. For a commission, the outcome landed at the
   register is the refusal-carrying answer value's address, so the
   conversation is closed of record. **An answered refusal is an
   answer:** the asker's fold reads it as *refused-as-answered*, and
   absence stays reserved for silence. Who teaches: the door, always —
   the responder neither re-words the row nor may soften it, which is
   what "the responder's door pass-through" means.
3. **Seam refusals** — a malformed digest, an absent carrier, a
   non-canonical value — speak the seam vocabulary (kind, sort, path,
   taught next) and are never dressed as door rows, per the shipped
   precedent. On the wire they are answer bodies too, in their own
   declared variant.

The teaching loop the epic's demo wants falls out: an asker whose ask
produced a refused-as-answered row holds the repair, follows it, and
re-asks — a *new* request value (new digest, new conversation, citing
its predecessor per R8 where lineage matters), because the repaired ask
is a different sentence, not a retry of the old one.

---

## 9. Findings

Recorded with what breaks and what would unlock each; none is repaired
here.

**F-A — No service framework exists at the pin.** The ticket's charge
to read "the pinned @nats-io clients' request/reply and service
surfaces" resolves to: the request/reply surface exists in
`nats-core@3.4.0` and was read (§7.3); a *service* surface (the
micro/services framework with discovery, stats, and endpoint
conventions) is **not installed and not declared** — the `@nats-io`
scope at the primary checkout carries exactly `nats-core`, `jetstream`,
`kv`, `obj`, `transport-node`. There is nothing to transcribe today,
and adopting the vendor's service framework would cost a new dependency
pin *plus* its transcription group before its first use. The
recommended design needs none of it: askable-as-three-declarations
(§4.4) covers what a service registry would, as a read.

**F-B — Of the four envelope kinds, one has a writer.** The grammar
admits `emit`, `attest`, `checkpoint`, `sealed` (shipped); the only
spelling anywhere in `src` is the lane seam's `kind: "emit"` (verified
by search this session). The streamed answer's terminal and sub-claims
therefore name admitted-but-unwritten kinds. Unlock: the build widens
the landing seam to spell the other kinds under the same judgment path
— a seam change, zero vocabulary. Until then, the query and commission
shapes are buildable with what ships, and the streamed shape is not;
the grill sheet stages accordingly.

**F-C — The single-shot request API supplies no claim either, and its
negatives are broker opinions.** The sibling record's F-1 covered
`requestMany`; re-read at the same installed bytes, `request()` has the
same property in miniature: it resolves on the *first* response
(first-response-wins is not a completeness assertion), its timeout is
a client-side milliseconds budget, and its distinguished failure —
no-responders — is the broker's instantaneous view of subscription
interest, the same class of broker-negative the estate's own promotion
notes call "late and… wrong" for presence. Consequence consumed in
§5.4 and §7: nothing the vendor round trip says may land, including
its saying nothing.

**F-D — The register key's tightening is assumed, cheaply.** R7 rules
the register key IS a declaration digest; the shipped `WorkKey` is
still the literal-token sort with the tightening stated as direction in
its own doc comment (read in place). A 64-hex digest already satisfies
the token grammar, so commissions can key registers by work digest
today with no seam change; the record notes the dependency so the
tightening ticket knows a consumer arrived.

---

## 10. The grill sheet

House style: one decision per item; recommended option first;
alternatives priced; reversal stated. All six are **PROPOSED**; the
operator rules. Costs are ordering claims, never measurements.

### RQ-1 — What is judged: which existing generator carries the ask, and what is the response?

**Recommended: the ask is an `emit` onto a declared ask lane; the
response is a landed answer fact citing the request digest — plus the
fenced register outcome exactly where the work is non-idempotent
(§3.5's three shapes).** A new act kind is forbidden and unneeded; no
new judgment path exists. This is the ratified `call`/RPC derivation
completed with an announcement step, and the announcement must be an
emit because emitting is the only act that is simultaneously
*addressable* (the lane is the address), *positioned* (so awaiting is
folding and resuming is an anchor), and *trigger-visible*
(`evidenceAppears` is a lane predicate — the responder's activation
has a kernel spelling). Price: one emit per ask; one declare per
commission's work value; zero declarations per conversation.

**Alternative (priced): the ask is a `spawn`.** Refused as the
carrier. Spawn's fields are `parent: policy, request: policy` — it is
the authority-narrowing act that mints a child seat ("let this child
speak with at most the authority I hold"); the model interprets it as
world-identity, nothing consumes it today, and the epic assigns it to
*subroutines* ("spawn is the call instruction"). Spending it as "ask"
would conflate creating a speaker with addressing one, would give the
ask no position and no queue (spawns land nothing), and would make
every query mint authority nobody asked for. The lawful composition —
a spawner responder that answers asks by spawning — is stated in §4.4
and costs this decision nothing.

**Alternative (priced): declare-only — the asker declares the work and
the responder discovers it.** Refused as incomplete. A declaration
lands in the catalog under its digest; catalog reads are resolves *by
name*, and no trigger predicate fires on catalog growth — the five
predicates are lane-, cell-, hole-, register-, and position-shaped. A
responder would have to learn the digest out of band, which is the
announcement problem restated. Declare-first is kept exactly where it
earns its cost: the commission's work value (R7's register key).
Reversal for the recommendation: none needed — emit-as-ask composes
left and right (declare before, decide after) without moving.

### RQ-2 — Attribution and scope: what must the writs name?

**Recommended: §4.3's symmetric rows — the asker's writ pins the
responder's ask lane and names its own answer view; the responder's
writ names its ask-queue fold and pins its answer lane and register
family; askable is the three standing declarations of §4.4; nothing is
minted per conversation.** Price: writ declarations only — small,
standing, and inspectable; the service directory becomes a fold over
the catalog rather than a service. Declared-not-guard today, stated as
the inherited bound, hardening wholesale at the epic's stage 4 with
every other writ.

**Alternative (priced): per-conversation writs** (mint a scoped writ
per ask, carried in the ask). Refused on cost and on category: writs
scope standing capability, and a per-ask writ would put an
authorization ceremony on the hot path of every query while adding no
authority the fence and the citation do not already provide. Where a
*narrower* authority per work item is genuinely wanted, that is the
spawn composition — the subroutine lane — not a conversation cost.

**Alternative (priced): a registry service** ("register your service
here"). Refused as a second directory: the catalog is the directory,
and a mutable roster beside it would be the estate's own
second-source-of-truth failure mode. The read that renders "who
serves what" is a later surface's declared view. Reversal: adding such
a view later is an ordinary fold declaration; nothing here blocks it.

### RQ-3 — Timeout and retry discipline

**Recommended: the full §5 posture — absence is a position-bounded
reading with no timed-out arm in any conversation fold; retries re-emit
identical bytes (at-least-once + idempotency-by-digest, the emit seam's
own taught repair); non-idempotent work is fenced and retries race the
grant; every act *taken on* silence belongs to a deadline seat — a
fenced decide over tick facts, attributed and optional.** Grounds: the
two named precedents plus the door's own refusal of absence and
deadline predicates — the kernel cannot spell the alternative, so this
recommendation is mostly the recording of a fact. Price: zero new
machinery for reading and retrying; a deadline seat, where wanted, is
one declared program plus a register — both shipped shapes.

**Alternative (priced): a timeout arm in the conversation fold**
("unanswered after N ticks ⇒ timed-out"). Refused: it would make a
fold's value a function of something other than delivered support and
query (the tick stream makes it *expressible*, but baking the verdict
into the shared fold makes one reader's tolerance everyone's world —
the connection fold's own design explicitly keeps staleness a
per-reader computation). Any reader may *compose* ticks with the
conversation view at its own tolerance; the fold itself stays silent
about silence.

**Alternative (priced): vendor timeout as the timeout.** Refused as
meaning (F-C): a client-side milliseconds budget expiring says nothing
a fact could cite. As acceleration toward the deadline seat it is
lawful chatter. Reversal for the recommendation: adding a deadline
seat later is additive; removing a baked-in timeout arm later would be
a breaking fold change — the asymmetry is the argument.

### RQ-4 — The claim story and the completion-stream relation

**Recommended: the envelope kinds are the claim carrier, per shape
(§6): the fact itself for queries, the fenced landing for commissions,
and for streamed answers exactly one `sealed` citing the request digest
and pinning the final's digest — with the fold-versus-pin byte-compare
run as verify-on-read, since the estate is grade A to itself.** The
relation ruled in one sentence: **a response stream IS a completion
stream** (the sibling record's shape) whose transport is one answer-
lane partition and whose claim carrier is the estate's own envelope
vocabulary — F-1's unlock consumed, not rediscovered. Price: the
query and commission shapes cost nothing beyond what ships; the
streamed shape owes the build one seam widening (F-B: writers for the
non-`emit` kinds) and one well-formedness fold (one `sealed` per
digest, last).

**Alternative (priced): terminal-by-convention** (a `done: true` field
in an ordinary emit). Refused: it twins the kind vocabulary inside a
body — a hand vocabulary beside a generated one, the exact drift class
the estate refuses everywhere else — and it forfeits the free wall
(nothing pins the final's digest).

**Alternative (priced): stage the streamed shape out entirely** (v0 =
query + commission only). Genuinely cheap and honest, and the
recommendation is compatible with it as a build order: nothing in
RQ-1..RQ-3 depends on streams. Priced as the fallback if the seam
widening is heavier than expected; the shape above is then the already-
ruled target it grows toward. Reversal either way is additive.

### RQ-5 — The wire: vendor request-reply vs paired lane families

**Recommended: paired responder-owned lane families as the meaning
register (§7.2) — correlation by digest, partition routing by request
digest, subjects from the existing evidence grammar — and the vendor
round trip admitted only as the §7.4 accelerator, later, under the
erasure candidate, with its client surface transcribed under R-3 if
and when adopted. v0 spends nothing on it: `follow` is already push.**
Price: two lane declarations per responder (each partition an exact
stream — the shipped carriage cost, linear in responders, constant in
conversations); zero per-conversation setup; the flux requirement
satisfied by the deltas being landed facts.

**Alternative (priced): vendor request-reply as THE transport.**
Refused for meaning on five independent grounds read at the pin: no
position, no retention, no attribution, no judgment, no claim (§7.3,
F-C) — and adopting it would put an unjudged ingress beside the door,
which is the second-door defect in transport clothing. It also prices
badly even on its own terms: the muxed inbox is per-connection state,
so a crashed asker's in-flight conversations evaporate, which is
exactly the resumability the epic's table already claims as done via
anchors.

**Alternative (priced): one lane per (asker, responder) pair.**
Refused on carriage: streams multiply as pairs × partitions (each
declared partition is one exact stream), writs grow per counterparty,
and the digest-keyed partition already buys per-conversation order on
the shared pair. The honest residual it *would* buy — lane-granular
privacy between askers — is recorded as bound 6 instead, because
visibility is writ- and lane-granular today and finer confidentiality
is outside this record's authentication bound. A party that needs a
private conversation family declares a private pair; the design
composes, it just refuses to make pairs the default. Reversal: moving
a hot counterparty to a dedicated pair later is two declarations and a
re-aim, with old conversations left readable where they landed.

### RQ-6 — Refusals on the wire

**Recommended: §8 whole — a refused ask never leaves the asker; a
refused work is answered with the generated row verbatim (the
responder's door pass-through, the MCP face's exact arrangement), landed
like any answer and citing the request digest; seam refusals keep their
own vocabulary in their own declared variant; an answered refusal is an
answer and absence stays reserved for silence; the repaired re-ask is a
new conversation citing its predecessor.** Price: one declared variant
in the answer event form; zero new vocabulary — the rows are the
generated table's and the two-vocabulary split is shipped precedent.

**Alternative (priced): a dedicated refusal lane.** Refused: a second
log for a subset of answers, splitting one conversation's record across
carriers and forcing every reader to join two lanes to know whether a
request was answered. The answer lane is the log of answers; refusals
are answers.

**Alternative (priced): refusals only as register outcomes.** Refused
as incomplete: queries have no register, and would either gain one (a
fence with no failed demotion — the exact smell the fence inventory
refuses) or lose their refusal path. For commissions the register
*does* carry the refusal outcome — as the recommendation already says —
so this alternative is the recommendation minus the queries it cannot
serve. Reversal: none needed; the recommendation subsumes it.

---

## 11. What I could not verify

Stated plainly, because a record that hides its gaps is the thing the
provenance discipline exists to refuse.

1. **The Lean kernel model itself was not re-opened.** Every claim
   about the eight generators, the refusal table, and the trigger
   predicates is grounded on the generated TypeScript projections read
   in place (`KernelDoor.ts`, `KernelTables.generated.ts`,
   `KernelBuilder.generated.ts`) — the corpus's committed emissions,
   conformance-gated elsewhere — not on the model sources under
   `verify/kernel/`. For a design record consuming the language this is
   the right authority (the projections are what the runtime speaks),
   but it is one remove from the model.
2. **The NATS bytes were read from the primary checkout's installed
   tree.** This worktree has no installed dependencies, so
   `@nats-io/nats-core` 3.4.0 was read at
   `packages/plait/node_modules/@nats-io/` in the primary checkout —
   the exact version this worktree's `packages/plait/package.json`
   declares, with the installed `package.json` version field checked —
   but installed bytes are per-checkout and I did not hash them against
   the registry. The absence of a services framework is likewise a
   claim about this checkout's installed scope and the declared
   dependency block, not about the vendor's catalog.
3. **No battery, no gate, no measurement.** This change is one new file
   under `docs/design/`; nothing was executed beyond reads, searches,
   and the board lookups. Every cost above is an ordering claim. The
   file-existence sweep the sibling record scripted was not repeated;
   instead every cited path in §2 was opened directly this session,
   which is the stronger check and the reason the table exists.
4. **Ratification tiers of sibling records were taken from the records
   and the board, not re-adjudicated.** The kernel-algebra record's
   §5.3 rows and R7/R8 were read first-hand and are quoted exactly; that
   its K-series stands ratified is carried from the estate's own
   memory of the 2026-08-18 session, and this record leans on the rows'
   *content*, which §3.1 quotes, more than on their tier.
5. **The reaction runtime's eventual shape is assumed only as "its own
   slice."** §4.4 makes the standing trigger the service registration
   while the runtime that acts on triggers is unbuilt; the fallback
   (the responder folds its own ask lane) is shipped machinery, but the
   claim that the trigger declaration and the fold express the same
   intent is this record's reading, not a wall.
6. **Multi-seat behavior was not exercised.** Everything about racing
   retries, duplicate suppression windows, and fence races is grounded
   on the shipped seams' own documented and modeled claims, read in
   place — not re-run here.

---

## 12. Honest bounds

1. **No liveness, anywhere.** Nothing promises an ask is heard, a
   responder runs, an answer arrives, or a deadline seat is awake. The
   plane's whole posture is that silence is readable and consequence-
   bearing acts on silence have accountable actors. Delivery-to-a-party
   is a liveness claim the fabric refuses to make, and this record
   repeats the refusal rather than papering it.
2. **The kernel language does not grow.** No act kind, no envelope
   kind, no subject family, no sort. The two CANDIDATE items are *laws*
   (correlation-by-citation; conversation erasure), stated-only, for
   the grill — not vocabulary. *Ask lane* and *answer lane* are this
   record's prose, brandless.
3. **Writs are declared, not guards, until stage 4.** Every scope
   sentence in §4 is real as declaration and judgment-at-the-seams
   today and becomes enforcement exactly when writs do, estate-wide.
   Nothing here jumps that queue.
4. **Attribution is a claim.** A holder string identifies nobody
   evidentially; authentication beyond holder+writ is the epic's
   explicit future, and this record adds no interim substitute.
5. **Privacy is lane-granular.** Every reader a writ admits to a lane's
   views sees that lane's facts; conversations on shared pairs are
   visible to the pair's readership. Finer confidentiality (per-
   conversation secrecy, encryption) is outside scope and unpriced; the
   composition that exists — declare a private pair — is stated at
   RQ-5, not dressed up as more.
6. **The streamed-answer shape is not buildable as the tree stands**
   (F-B: one envelope kind has a writer). The record stages it behind a
   seam widening rather than claiming it ships.
7. **The LLM seat is context.** The eventual first responder proposes
   candidates and is trusted for nothing; the one binding line —
   nothing nondeterministic is load-bearing except through admission —
   is carried verbatim and this plane adds no exception: an LLM's
   answer is meaning only as a landed, judged fact like anyone else's.
8. **Retention economics, scheduling, backpressure, and pacing are host
   engineering.** How often a responder polls its queue, how a deadline
   seat schedules its reads, and how long answer lanes are retained
   are outside the algebra and deliberately outside this record.
9. **Nothing dispatches from this record.** The build ticket is cut
   only after the operator rules the sheet; the run-step slice, the
   reaction slice, the spawn consumer, and the writ-guard stage own
   their own tickets. This record ends where the ticket said to stop:
   at the sheet.
