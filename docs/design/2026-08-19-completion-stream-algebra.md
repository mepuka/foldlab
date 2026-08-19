# The completion-stream algebra — every agent streaming protocol as a claimed fold over deltas

Date: 2026-08-19. Status: **DESIGN, PRE-GRILL.** Written by a
fable-xhigh seat in a worktree branched from `main` at `81b687ff9`, for
DEV-893 (epic DEV-879, stage 2). **RECORD ONLY:** it changes no code, no
gate, no corpus row, no fixture, and no ticket; its only write is this
file. It rules nothing; the operator rules. The build ticket that would
consume a ratification — DEV-894, the codec family — stands beside this
record and dispatches only on that ruling.

**What this record is.** Four things, in order. (1) A candidate
generalization, stated precisely: every agent completion-streaming
protocol is one shape — an ordered sequence of typed deltas accumulating
into a claimed final, plus exactly one terminal and zero-or-more
annotations. (2) A five-row survey holding that shape against real
protocol grammars, each read first-hand from the pinned or vendored
source in this environment, with per-row provenance and a verdict —
fits, fits-with-notes, or a finding recorded with exactly what breaks,
never forced. (3) The ingestion doctrine: how streams enter the estate,
as the one parse boundary generalized, under the two-register split
already ruled for the substrate's own chatter. (4) A grill sheet — four
decisions, recommended option first, alternatives priced.

**What this record is not.** It is not a build: no codec, no schema, no
test, no gate is written here. It mints no kernel vocabulary — every
estate term below is already in the tree, and every vendor term is
transcribed, never redesigned. It does not model vendor internals: what
a vendor's server does between its own events is outside every claim,
exactly as the wire vocabulary treats the substrate. And nothing in it
trusts a language model for anything: the LLM appears only as an
untrusted proposer whose proposals are judged at the door, which is the
epic's standing bound restated, not weakened.

**Law 10 and this file.** Law 10 forbids tracking artifacts — repo-local
ids, ticket keys, paths, and commands — on any surface rendered
*outward*. A design record is tracking-land, not an official document,
so path, gate, and ticket citations are lawful here and are used
throughout, matching every sibling record in this directory. Nothing in
this file is a projection source. If a sentence below is ever promoted
to a rendered surface, it loses its citations on the way.

**The honesty convention.** Every survey row and every doctrine section
opens with a **Ground** block: what exists in a source this seat opened
and read this session, cited to the exact file. Everything outside a
Ground block is reading, derivation, or proposal, and is marked as such.
Confidence tiers as the estate uses them: **ratified** (grill record or
standing ruling) · **proven** (a Lean theorem behind a gate, cited by
name) · **shipped** (code on this branch, read in place) ·
**pinned-vendor-read** (the pinned client's or vendored release's own
bytes, read in place this session) · **proposed** (this record's own
design) · **carried** (a sibling record's claim, cited, not re-verified
here). Nothing in this record is measured; every cost is an ordering
claim. §9 says what I could not verify at all.

---

## 0. Orientation for a reader from outside

This estate runs a coordination substrate for fleets of AI agents.
Every value is named by the hash of its one canonical byte form; every
state change enters through a single admission function that either
admits it or returns a typed refusal that teaches its own repair; and
the concurrency claims behind the storage shapes are machine-checked in
a proof assistant. This record is about the moment a language model's
*streamed* output — the token-by-token flicker every chat interface
shows — meets that discipline.

House terms, one line each, used plainly thereafter:

- **Digest** — the SHA-256 hash of a value's one canonical byte form;
  its permanent name. Two spellings of one value have one digest.
- **Canonical bytes** — the single lawful serialization of a value; the
  thing the digest is computed over.
- **The door** (`admit`) — the one place judgment happens. A candidate
  act goes in; an admitted act or a taught **refusal** (reason, law,
  repair) comes out. Refusals are data, never thrown errors.
- **Candidate** — a proposed act before judgment. A language model
  produces candidates and nothing else.
- **Lane** — an append-only, positioned stream of attributed facts; the
  journal. A **position** is a place in one; an **anchor** is a
  reader's recorded position.
- **Fold** — a declared reduction over a lane, read at an anchor. The
  estate's one read of changing state.
- **Rung** — the algebraic strength a reduction has earned
  (associative, commutative, idempotent…). A rung licenses which
  carrier a fold may read; the **LIST rung** is the bottom: order
  matters, duplicates matter.
- **Chatter vs facts** — the substrate's ruled split: durable facts
  decide; ephemeral chatter (heartbeats, progress, status) may
  *accelerate* what facts determine and may never decide anything.
- **Writ / holder** — the authority scope a connection acts under, and
  the attributed identity it acts as. Attribution, never authority.
- **Plane / seam** — the layering of the runtime (`truth ← kernel ←
  planes ← carriage ← surface`); private adapters carry a `Seam:` tag
  naming the rank they hold.
- **Transcription** — the estate's discipline for foreign vocabularies:
  vendor names carried verbatim as data with per-row provenance, never
  renamed, never subset, never re-designed.
- **Wall / gate** — an executed check with a committed negative
  control; the battery is the set of walls a change must keep green.
- **Delta / terminal / annotation** — this record's three word-classes
  for stream events, defined precisely in §3.
- **Flux register / meaning register** — the two registers of §5:
  what streams through unjudged, and what lands as judged fact.
- **SSE** — Server-Sent Events, the HTTP text format both surveyed LLM
  vendors stream over.

---

## 1. Result first

**1.1 The shape holds, with one honest narrowing.** All five surveyed
protocols are expressible as *ordered typed events over one revealed
sequence* — none needs a second stream, none needs commutativity, and
none is forced. But the ticket's optimism that the lawfulness wall is
"the wall most vendors hand us for free" narrows under first-hand
reading: of the five rows, exactly **one** grammar restates the whole
final beside the deltas in-band (the OpenAI Responses stream), one
supplies per-block sub-claims only (Anthropic), two supply no in-stream
final at all (OpenAI chat-completions; the NATS-native conventions),
and one is the degenerate case with no content deltas to fold (MCP).
The wall is real, free where it exists, and **graded** — §4.6 names the
grade per row, and grill item CS-4 prices where each grade runs.

**1.2 The candidate generalization, in one paragraph.** A completion
stream is a finite word over a closed, transcribed alphabet of typed
events, revealed left to right by the vendor (the coalgebraic half —
the vendor unfolds; the estate observes). The alphabet partitions into
**content deltas** (they accumulate), **structural brackets** (they
open and close accumulation slots), **annotations** (they describe the
run — usage, stop reason, keep-alives — and never touch the
accumulator), and **terminals** (exactly one per lawful stream, last).
The final is the left fold of the content deltas through the bracket
structure; the terminal asserts the fold is *complete*; where the
grammar also restates the final or a sub-value, that restatement is a
**claim** the estate can hold the fold against. A **codec** is a
transcription from one vendor's event grammar into this shape, and a
codec is **lawful** iff the fold of its decoded deltas byte-equals the
decoded final wherever the vendor supplies both — compared over
canonical bytes of the decoded values, never over wire framing.

**1.3 Deliberately the LIST algebra.** The fold is order-sensitive and
duplicate-sensitive by construction: two identical text deltas are two
tokens, and reordering changes the text. This is the free monoid — the
list — and *not* a commutative rung, which is not a limitation but the
row's content: by the estate's own rung⇒carrier rule, a LIST-rung fold
may only read positioned carriers. Completion flux therefore rides
ordered transports (SSE's in-order delivery; a lane's positions) and
may never ride the set plane or a cell. The estate's discipline and the
vendors' wire behavior agree here without negotiation.

**1.4 The estate already speaks this grammar.** The envelope vocabulary
in `kernel/Wire.ts` — the four monotone observation kinds `emit`,
`attest`, `checkpoint`, `sealed` — reads, off its own names, as the
same shape from the inside: observation, attestation,
fold-checkpoint-at-a-position, terminal. The generalization this record
states is the estate's own wire grammar read outward at the vendors,
which is why no new kernel vocabulary is needed to say it (the kinds
shipped and read in place; the mapping is this record's reading).

**1.5 The doctrine in three sentences.** Entering the estate is the one
parse boundary, generalized to streams: an ingestion source is a
**transport × codec × register policy**. Perceived flux is a transport
property — deltas pass through raw to every watching surface,
immediately, unjudged, ephemeral, and droppable without changing any
fold's value. Meaning is landed values — the completed candidate,
canonicalized, digested, judged at the door — and token deltas never
land as facts (§5, with the three precedents that already rule each
piece).

**1.6 The recommended answers, previewed.** CS-1: keep the free-monoid
+ claimed-fold interface; nesting lives in the bracket alphabet and in
citation between separate folds, because no surveyed vendor opens a
child stream in-band and a richer algebra would model something nobody
speaks. CS-2: checkpoint landings at vendor block boundaries only, and
only for judgeable sub-values — never at declared intervals. CS-3:
codecs live as internal adapters beside the status-vocabulary
precedent — transcription tables seam-tagged as vocabulary, transducers
as carriage — never in surface. CS-4: split the lawfulness wall by what
it costs — in-band arms run per-session live as verify-on-read;
cross-request differential arms run in the walls group only. §8 prices
all of it.

---

## 2. Grounding — the authorities

Every row was opened and read in this environment this session.
Nothing below is grounded on a document this seat did not read.

| Authority | What it carries here | Tier |
| --- | --- | --- |
| `repos/effect/packages/ai/anthropic/src/` — `AnthropicClient.ts`, `AnthropicLanguageModel.ts`, `Generated.ts` | the Anthropic Messages stream grammar and the vendored fold over it (§4.1) | pinned-vendor-read (vendored subtree at `effect@4.0.0-rc.108`) |
| `repos/effect/packages/ai/openai/src/` — `Generated.ts`, `OpenAiSchema.ts`, `OpenAiClient.ts`; `repos/effect/packages/ai/openai-compat/src/` — `OpenAiClient.ts`, `OpenAiLanguageModel.ts` | the OpenAI chat-completions chunk grammar, the `[DONE]` sentinel, the Responses stream grammar, and the vendored folds (§4.2) | pinned-vendor-read |
| `repos/effect/packages/effect/src/unstable/ai/` — `McpProtocol.ts`, `McpSchema.ts` | the MCP protocol pin (`2025-06-18`, the only version the release implements) and its progress/cancellation shapes (§4.3) | pinned-vendor-read |
| `repos/effect/packages/effect/src/unstable/encoding/Sse.ts` | the SSE transport both LLM rows ride — parsing, framing, and its own error vocabulary | pinned-vendor-read |
| `packages/plait/node_modules/@nats-io/nats-core/lib/` — `core.d.ts`, `nats.js`; `@nats-io/jetstream/lib/types.d.ts` | `requestMany` and its four termination strategies at the pin (3.4.0, the exact version `packages/plait/package.json` declares); the JetStream consumer-notification union (§4.4) | pinned-vendor-read (installed bytes; see §9.2) |
| the `multica` CLI, v0.4.20 (commit `93342d04a`) | the observable multica agent-protocol surface: per-execution message logs with sequence numbers, `--since` resumable reads, cancel-task (§4.5) | pinned-vendor-read, weakest — help trees only; §9.4 |
| `packages/plait/src/internal/statusvocabulary.ts` + `internal/statuspump.ts` + `scripts/check-status-vocabulary.ts` | the status-vocabulary transcription precedent: tables as data, vendor names verbatim, full adoption, per-row provenance, the five-clause gate with executed self-test (§5.4) | shipped |
| `packages/plait/src/internal/wirevocabulary.ts` | the wire-vocabulary precedent: emitted-not-written rows, per-row provenance digests of the pinned source region, the three wire shapes, declared-but-unused rows ("omission is how a table starts lying") | shipped |
| `packages/plait/src/truth/Refusal.ts` (`decodeRefusing`) and `packages/plait/src/carriage/Engine.ts` | "the package's only parse boundary" — the seam §5.1 generalizes; the completion seam's run outcomes (`landed` / `refused` / `unspeakable`) | shipped |
| `packages/plait/src/kernel/Wire.ts` | the envelope kinds (`emit`, `attest`, `checkpoint`, `sealed`) — the in-house instance of the shape (§1.4); the measured payload budget the flux tap inherits | shipped |
| `packages/plait/src/surface/mcp.ts` | the estate's MCP face: served-equals-derived tools, every call through the door, and — verified — no progress notifications served today | shipped |
| `docs/design/2026-08-19-estate-daemon-spec.md` R-3 | ratified rider: vendor vocabulary "transcribed from the pinned vendor source, never invented and never twinned"; the three wire shapes and the promotion rule — "*chatter accelerates; facts decide*" | ratified |
| `docs/design/2026-08-19-ops-harness-projection.md` §4.1 | the logging split this record's register policy generalizes: the journal is the log; "host-internal debug exhaust is carrier plane and no fold may read it" | carried (derived-and-cited record) |
| `docs/design/2026-08-18-storage-stack-and-expressibility.md` | the cost-tier ladder (T0–T5, ordering claims), the rung⇒carrier rule, ingress-as-two-planes, and honest-bound 14 (credentials are environmental-band carriage) | carried (pre-grill design) |
| DEV-879 (epic, with 2026-08-19 addendum), DEV-882, DEV-889, DEV-894, DEV-888, DEV-881 | the parked binding clause verbatim ("nothing nondeterministic is ever load-bearing except through admission"); the two-register addendum; the bootstrap declaration-set shape; the build ticket's walls (recorded fixtures + live arm; first-delta-visible-before-terminal); the practitioner gate; run steps as facts | board tickets, read this session |

Standing rulings composed and not reopened: the transcription rule
(daemon spec R-3, ratified); the generated-vectors ruling of 2026-08-15
(hand-authored model verdicts banned — §5.6 applies its shape to
recorded vendor streams); plane layering (standing law 4); one door
(standing law 2); Effect idiomatic (standing law 5).

---

## 3. The shape, stated precisely

Nothing in this section is new machinery; it is a vocabulary for
reading grammars, used by §4 and consumed by DEV-894 if ratified.

### 3.1 Alphabet, stream, well-formedness

A **completion-stream grammar** is a closed alphabet Δ of typed events,
transcribed from one vendor, partitioned into four word-classes:

- **Content deltas** Δc — events that accumulate into the final
  (text fragments, partial tool-call JSON, thinking fragments).
- **Structural brackets** Δb — events that open or close an
  accumulation slot (a content block starting or stopping, an output
  item added or done). Brackets carry the slot's address (an index or
  item id) and give the stream its nesting without a second stream.
- **Annotations** Δa — events describing the run without touching any
  accumulator: usage counts, stop reasons, keep-alive pings, progress
  gauges.
- **Terminals** Δt — the events after which a lawful stream carries
  nothing: completion, error, cancellation.

A **stream** is a finite word in Δ* — the free monoid — revealed left
to right. The vendor holds the unfold (the coalgebraic half: from its
own hidden state it emits an event and a next state, or ends); the
estate holds only the observed word. **Well-formedness** is a decidable
sublanguage W ⊆ Δ*: brackets balance (a Dyck condition over slot
addresses), exactly one terminal occurs, and it occurs last. A word
outside W is a transport defect, refused at the parse boundary, never
repaired by guessing.

### 3.2 The fold and the claim

The **fold** is a left fold `step : Acc × Δc → Acc` threaded through
the bracket structure (a stack of open slots), with an initial
accumulator that is empty unless the grammar's head event claims a
prefix (§4.1 Ground: the Anthropic `message_start` can carry
pre-populated content). Annotations fold into a separate annotation
record and never touch `Acc`. The **final** is the accumulator at the
terminal.

The **claim** is whatever the grammar itself asserts about that final:

- a **completeness claim** — the bare terminal ("the fold is done");
  every surveyed LLM grammar has at least this;
- a **sub-value claim** — a bracket-close that restates or constrains
  its slot's accumulated value (an item-done event carrying the whole
  item; a tool-call block whose concatenated JSON must parse);
- a **whole-final claim** — a terminal carrying the entire final
  value;
- a **running claim** — an annotation asserting a cumulative property
  mid-stream (token usage "thus far").

### 3.3 Codec, and codec lawfulness

A **codec** is a transcription from one vendor grammar into the shape
above: a table assigning each vendor event its word-class and its
decoded meaning, plus the decode functions themselves. Transcription in
the ruled sense (§5.4): the vendor's own event names, verbatim, full
alphabet, per-row provenance, never a hand-designed subset.

> **CANDIDATE (codec lawfulness).** A codec is lawful iff
> `canonical(fold(decoded deltas))` byte-equals
> `canonical(decoded claim)` for every claim its grammar supplies —
> whole-final, sub-value, and running claims alike — over the canonical
> bytes of the decoded values, never over wire framing.

Marked CANDIDATE: it is this record's proposal for the wall DEV-894
would execute, and the operator has not ruled it. Two properties worth
stating now. It is *graded* — a grammar with no claims (NATS
requestMany, §4.4) makes the wall inapplicable, not failed, and the
codec's verdict says so rather than pretending. And it is
*vendor-relative* — it holds the vendor to the vendor's own asserted
fold; it says nothing about whether the content is true, which is the
door's business, not the codec's.

### 3.4 Why the LIST algebra, spelled out

The free monoid is the list: concatenation is associative, and nothing
else is promised. Deliberately **not commutative** and **not
idempotent** — token order is meaning, and a repeated delta is a
repeated token. Under the estate's rung⇒carrier rule (carried from the
storage record; the rung brands are shipped in `truth/Algebra.ts`) a
fold at this rung may read only positioned carriers, where order is
transported: the SSE byte stream in arrival order, or a lane at its
positions. It may never read a cell (union merges would dedup tokens)
and never a partitioned set-plane carrier (reordering would scramble
text). No stronger rung is claimable for the content fold, and none is
needed: the fold runs once, in one process, over one connection's
arrival order. The moment its *result* lands, the result is an ordinary
digested value and every downstream read enjoys the truth plane's usual
strengths. The weak rung is confined to the flux register on purpose.

### 3.5 What the shape does not claim

No liveness: nothing here promises a stream progresses, completes, or
terminates — a terminal is recognized if it arrives, and a stream that
never ends is handled by the register policy (flux is droppable),
never by a claim. No vendor-internal modeling: what a vendor does
between events is unmodeled, exactly as the wire vocabulary treats the
substrate's server. No trust: a lawful codec makes the vendor's own
claims checkable; it does not make them true.

---

## 4. The survey

Five rows. Each opens with **Ground** — what was read, where, at what
pin — then the reading against §3, then the verdict. A row that does
not fit is recorded with exactly what breaks.

### 4.1 The Anthropic Messages stream

**Ground.** Read in place this session, in the vendored subtree at
`effect@4.0.0-rc.108`: `repos/effect/packages/ai/anthropic/src/AnthropicClient.ts`
(the `MessageStreamEvent` union, its doc block, and the stream
constructor that filters `ping` before any consumer sees it),
`Generated.ts` (the event and delta schemas, including the field-level
doc strings), and `AnthropicLanguageModel.ts` (`makeStreamResponse`,
the vendored fold). The grammar: seven event types —
`message_start` (carries an initial `Message`, including usage and
possibly pre-populated content blocks), `content_block_start` (opens a
block at an integer `index`), `content_block_delta` (a delta addressed
to an index; five payload kinds: `text_delta`, `input_json_delta`
carrying `partial_json`, `thinking_delta`, `signature_delta`,
`citations_delta`), `content_block_stop` (closes an index),
`message_delta` (top-level delta: `stop_reason`, `stop_sequence`, and a
usage block whose fields the vendor's own doc strings call
"cumulative"), `message_stop` (bare: `{ type: "message_stop" }`), and
an error event — plus `ping`, a keep-alive. The vendored fold is
literal accumulation: for tool-use blocks,
`contentBlock.params += delta` per `input_json_delta`, with the
concatenated string JSON-parsed at `content_block_stop`
(`Tool.unsafeSecureJsonParse`); text and thinking deltas pass through
under their index; usage and stop reason latch from `message_delta`;
the finish part is emitted at `message_stop`.

**Reading against the shape.** Δc = the five delta payloads. Δb =
`content_block_start` / `content_block_stop`, addressed by index —
the bracket alphabet carrying the nesting. Δa = `ping`, the usage and
stop-reason halves of `message_start` / `message_delta`. Δt =
`message_stop` and the error event. Order: SSE arrival order, with
block interleaving addressed by index. Initial accumulator: claimed by
`message_start` (the pre-populated-content case is handled explicitly
in the vendored fold). Claims supplied: completeness (`message_stop`);
sub-value claims at every tool-use block close (the concatenated
`partial_json` must parse as the block's typed input — an implicit
restatement: the parse either yields the final sub-value or the stream
was unlawful); a running claim in `message_delta`'s cumulative usage.
**No whole-final claim in-band**: `message_stop` restates nothing, so
fold-vs-whole-final is checkable only cross-request, against the same
pinned client's non-streaming `Message` (same `Generated.ts` shape).

**Worth recording:** tool calling — including *server-executed* tools
(`server_tool_use`, `mcp_tool_use`, `mcp_tool_result`,
`code_execution_tool_result`, web search and fetch results) — arrives
**flat**, as more indexed blocks in the same one stream, correlated by
`tool_use_id`. The vendor with the richest in-stream tool story opens
no child stream. CS-1 leans on this.

**Verdict: FITS-WITH-NOTES.** The notes: the whole-final claim is
absent in-band (wall grade B, §4.6); the initial accumulator can be
non-empty (a claimed prefix — codecs must not assume ε); the error
event is a second terminal kind (refusal-shaped, not a defect).

### 4.2 The OpenAI chat-completions stream

**Ground.** Read in place, same vendored pin:
`repos/effect/packages/ai/openai/src/Generated.ts` —
`CreateChatCompletionStreamResponse` (`object: "chat.completion.chunk"`;
`choices[]` each carrying `delta`, a latchable `finish_reason`
(`"stop" | "length" | "tool_calls" | "content_filter" | "function_call" | null`),
and an `index`; an optional `usage` object; `CreateChatCompletion200Sse`
aliases it as the SSE payload), `ChatCompletionStreamResponseDelta`
(optional `content`, `role`, `refusal`, `tool_calls[]`), and
`ChatCompletionMessageToolCallChunk` (an `index`, optional `id`,
optional `function.name` / `function.arguments` fragments). The
consumer read beside it:
`repos/effect/packages/ai/openai-compat/src/OpenAiClient.ts` — the
stream is `Stream.takeUntil((event) => event === "[DONE]")`, the
sentinel being a **bare string, not JSON**, typed in the event union as
`ChatCompletionChunk | UnknownChatCompletionEvent | "[DONE]"` — and
`OpenAiLanguageModel.ts`, whose fold concatenates text deltas,
accumulates tool-call arguments per index
(``activeToolCall.arguments = `${activeToolCall.arguments}${argumentsDelta}` ``),
latches `finish_reason` and `usage`, and JSON-parses each tool call's
accumulated arguments at flush.

**Reading against the shape.** Every event is one uniform chunk type;
the word-classes live in the chunk's *fields* rather than in its type
tag — a transcription note, not an obstacle (the codec's table
classifies by field presence, exactly as the vendored fold does). Δc =
`delta.content` fragments and `tool_calls[].function.arguments`
fragments; Δb = implicit brackets (a tool call opens at the first chunk
naming its index; text opens at first content) — the vendor supplies
open events implicitly and close events not at all, the slot closing
only at the terminal or at a `finish_reason`; Δa = `role`, `usage`,
`logprobs`, `finish_reason`; Δt = the `[DONE]` sentinel. Two indexed
families: `choices[].index` (n parallel completions in one stream) and
`tool_calls[].index` within a choice — so one stream is a **product of
folds**, one per address, each individually the LIST shape. Claims
supplied: completeness (`[DONE]`, which asserts nothing and carries
nothing — the weakest surveyed terminal); per-tool-call sub-value
claims (arguments must parse); usage as a single trailing annotation.
**No whole-final claim in-band**; the cross-request target is the
non-streaming `chat.completion` in the same `Generated.ts`.

**The Responses stream, read beside it (same pin, recorded because it
is the strongest instance surveyed).** `OpenAiSchema.ts` declares
nineteen known event types where **every event carries
`sequence_number: Int`** — the vendor makes position explicit data —
and the claims come at *three* granularities: `response.created`
carries an initial snapshot (a claimed initial); every
`response.output_item.done`, `response.function_call_arguments.done`
(carrying the complete `arguments` string beside the deltas that
spelled it), and `response.code_interpreter_call_code.done` restate
their slot's fold (sub-value claims, explicit rather than
parse-implicit); and the terminals `response.completed` /
`response.incomplete` / `response.failed` each carry the **entire final
response object** (the whole-final claim). The union also carries a
typed unknown-event fallback (`UnknownResponseStreamEvent`) — the
vendor's own forward-compatibility row, which a transcription must
carry rather than drop. `OpenAiClient.ts` terminates on exactly the
three terminal types.

**Verdict: FITS-WITH-NOTES** (chat-completions), **FITS** (Responses —
the reference instance). Notes for chat-completions: the terminal is
untyped and content-free; brackets are implicit and never individually
closed; the stream is an indexed product of folds; the wall's in-band
arm reaches only tool-call parses (grade C, §4.6).

### 4.3 MCP progress and streaming shapes

**Ground.** The estate serves MCP from `effect/unstable/ai` — verified
in `packages/plait/src/surface/mcp.ts`, which imports `McpProtocol` and
`McpServer` from exactly that module path. Read at the vendored pin:
`repos/effect/packages/effect/src/unstable/ai/McpProtocol.ts` — the
release implements **exactly one protocol version, `2025-06-18`**
(no JSON-RPC batches; version header required) — and `McpSchema.ts`:
`ProgressNotification` (`notifications/progress`) carries a
`progressToken` correlating it to the request it describes, an optional
`progress` number whose own doc string says it "should increase every
time progress is made, even if the total is unknown", an optional
`total`, and an optional `message`; `CancelledNotification`
(`notifications/cancelled`) ends a request out of band. A search of the
whole schema for partial/stream/chunk/delta shapes: none exist at this
pin. A tool call's result arrives whole, as the RPC response. The
estate's own MCP face serves no progress notifications today (verified:
no occurrence in `surface/mcp.ts`).

**Reading against the shape.** Δc is **empty**. Δb empty. Δa =
progress notifications — a monotone gauge, drop-tolerant by the
vendor's own semantics (tokens optional; association by token; nothing
downstream folds it). Δt = the RPC response itself (carrying the whole
final) or the cancellation. The fold over an empty delta alphabet is
the identity on the initial accumulator, and the whole-final claim is
the response: `fold(ε) = final` holds vacuously.

**Verdict: FITS (degenerate).** Recorded as the degenerate instance
rather than forced into deltas it does not have — and the degeneracy is
itself the survey's cleanest evidence for §5: MCP already speaks the
two-register split natively. Progress is flux (ephemeral, unjudged,
correlated but never load-bearing); the response is meaning (one whole
value). The codec for MCP is the identity codec plus a progress tap;
the lawfulness wall is vacuous (grade D). One forward note, not priced
here: if the estate later *serves* completion flux to its own agents
over MCP, `notifications/progress` (its `message` field) is the pinned
vehicle the protocol offers — a transcription decision for DEV-894's
scope only if ratified there.

### 4.4 The NATS-native service and agent conventions

**Ground.** Read from the installed bytes of the exact pin
`packages/plait/package.json` declares (`@nats-io/*` 3.4.0; see §9.2
for where the bytes live). `nats-core/lib/core.d.ts`:
`requestMany(subject, payload?, opts?) → Promise<AsyncIterable<Msg>>`
with `RequestStrategy = "timer" | "count" | "stall" | "sentinel"`.
`nats-core/lib/nats.js` (the implementation): `count` cancels after
`maxMessages`; `stall` cancels after a 300 ms quiet window; `timer`
cancels at `maxWait`; `sentinel` cancels when a message arrives whose
`data.length === 0` — an **empty-payload message**; and the
no-responders convention is an empty payload with a `503` status
header. `jetstream/lib/types.d.ts`: consumer deliveries ride stream
sequence numbers, and `ConsumerNotification` is a fifteen-way union of
status events (`heartbeats_missed`, `flow_control`, heartbeat,
ordered-consumer recreated, and so on) delivered *beside* the
messages — the chatter register in vendor form, which is exactly what
the estate's transcribed wire vocabulary already classifies
(`internal/wirevocabulary.ts`, three wire shapes with per-row
provenance digests).

**Reading against the shape.** `requestMany` supplies the free monoid
half perfectly: an ordered sequence of messages on one inbox. It
supplies **none of the claim half**. Three of the four termination
strategies are out-of-band heuristics — a timer, a count, a quiet
window — under which "done" and "slow" are indistinguishable by
construction; the fourth is in-band but **untyped and content-free**
(any empty message), and no strategy asserts what the accumulated
sequence should be. There is no claimed final anywhere in the
convention, so codec lawfulness has nothing to hold the fold against.
JetStream consumer deliveries are the estate's own lane carrier and fit
the positioned-plane reading natively — but as a *completion* protocol
they lack a terminal altogether: a stream has no end, and "caught up"
is a frontier reading, not an assertion.

**Verdict: FINDING (recorded, not forced) — F-1 in §7.** The
NATS-native conventions fit the ordered-deltas half and have **no
carrier for the claim**: no typed terminal, no final restatement, no
completeness assertion. A codec over `requestMany` can transcribe
deltas and recognize the sentinel; its lawfulness wall is inapplicable
(grade E), and the record refuses to pretend otherwise. The estate-side
consequence is already in the tree: the estate's own envelope kinds
(§1.4) are what a NATS-carried completion would speak *instead* —
`sealed` is the typed terminal the raw convention lacks.

### 4.5 The multica agent protocol

**Ground — and the provenance is the weakest of the five, stated
first.** Sources available in this environment: the installed CLI's
help trees (`multica` v0.4.20, commit `93342d04a`, built 2026-08-06),
read this session. What they reveal: per-execution message logs —
`multica issue run-messages <task-id>` with `--since <int>`, documented
as "Only return messages after this **sequence number**" — an
anchored, resumable, positioned read at message granularity;
`multica issue runs` (execution history); `multica issue cancel-task`
("interrupts in-flight agent") — an out-of-band terminal act;
`multica chat thread` with opaque pagination cursors; a local runtime
daemon (`multica daemon`, stopped in this environment; its `logs -f`
is the only follow-mode surface the trees show). What could **not** be
observed: the daemon↔server wire itself, any push transport, and any
sample message — every `runs` probe against this board's tickets
returned an empty history (the board's work was done by seats outside
the multica runtime), so not even the message JSON shape was
obtainable. No public spec was consulted (§9.4).

**Reading against the shape.** What is visible is the **meaning
register's outer half**, and it fits it exactly: landed whole messages
with explicit sequence numbers, resumable by position — a lane read,
with `--since` as the anchor. Whether the protocol carries token-level
deltas beneath message granularity, what its terminal event is, and
whether any final is restated are all **undetermined from this seat**.

**Verdict: FITS-WITH-NOTES at message granularity; UNDETERMINED at
delta granularity.** Marked weaker accordingly. The row still earns its
place: it corroborates the doctrine's landing-side shape (positioned,
resumable, message-granular) from an independent agent product, and its
gap is recorded as F-3 rather than papered over.

### 4.6 The verdict table, and the wall's grades

| Row | Provenance | Verdict | Order | Brackets | Terminal | In-band claims | Wall grade |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Anthropic Messages | vendored pin, read in place | FITS-WITH-NOTES | SSE arrival | explicit, indexed | typed (`message_stop`) + error | per-block parses; cumulative usage; claimed prefix | **B** — sub-value + running in-band; whole-final cross-request |
| OpenAI chat-completions | vendored pin | FITS-WITH-NOTES | SSE arrival | implicit open, no close | untyped `[DONE]` | per-tool-call parses; trailing usage | **C** — sub-value only; whole-final cross-request |
| OpenAI Responses | vendored pin | FITS (reference instance) | explicit `sequence_number` | explicit, addressed | typed, three-way | initial snapshot; item-done restatements; **whole final in terminal** | **A** — whole wall in-band, free |
| MCP `2025-06-18` | vendored pin (the estate's own serving source) | FITS (degenerate) | n/a (no deltas) | none | the response / cancellation | the response IS the final | **D** — vacuous |
| NATS-native (`requestMany`, JetStream) | installed pin 3.4.0 | **FINDING F-1** | inbox / stream sequence | none | 3 of 4 out-of-band; sentinel untyped | **none** | **E** — inapplicable |
| multica | CLI trees v0.4.20 only | FITS-WITH-NOTES (outer); undetermined (inner) | message sequence numbers | — | not observable | not observable | not gradable from this seat |

Grades: **A** — the vendor restates the whole final in-band (the wall
runs per-stream for free). **B** — sub-value and running claims in-band;
whole-final only cross-request. **C** — sub-value claims only.
**D** — vacuous (no deltas to fold). **E** — inapplicable (no claim
exists). CS-4 prices which grades run live.

---

## 5. The ingestion doctrine

The record's second half: how streams enter the estate. Everything
here composes three precedents already in the tree; the two sentences
that are genuinely new are marked CANDIDATE and go to the grill.

### 5.1 One parse boundary, generalized to streams

**Ground.** `truth/Refusal.ts` names `decodeRefusing` "the package's
only parse boundary": the one seam where foreign bytes become typed
values, with `Refusal` — never a bare schema issue — on the error
channel. `carriage/Engine.ts` holds candidate decoding to "the one
parse boundary" in the same words, and the estate's MCP face routes
every call through the engine so judgment is the door's.

**The generalization (proposed).** A stream does not get a second,
softer boundary. It gets the same boundary applied at the right
granularity twice: each *frame* is decoded against the transcribed
event schema as it arrives (a frame that fails is a transport defect,
graded by the seam vocabulary — `malformed-value`,
`non-canonical-value` — exactly as any foreign value), and the
*completed candidate* — the fold's result, transcribed into a kernel
candidate — passes through `decodeRefusing` and the door like every
other candidate, with no streaming exemption. Nothing about arriving
gradually earns a value a gentler judge.

### 5.2 An ingestion source is transport × codec × register policy

**Proposed, as the ticket frames it.** The three factors are
independent and separately swappable:

- **Transport** — what carries frames in order: SSE
  (`effect/unstable/encoding/Sse`, read at the pin: parsing, its own
  bounded-event-size error vocabulary), a NATS inbox, a JetStream
  consumer, an MCP notification channel. Transport is carriage: it may
  be slow, chunked, re-connected, or dropped, and none of that is
  meaning.
- **Codec** — the transcription of §3.3: vendor frames in, typed
  events out, with the word-class table as data and the lawfulness
  wall over it.
- **Register policy** — which of the two registers (§5.3) each
  word-class feeds, and where checkpoints land (CS-2).

The bootstrap ties the first factor to a declared value: "completions
endpoint connected" is one bootstrap-shaped declaration (§6).

### 5.3 The two registers

**Ground, the precedent chain.** Three rulings, each read this
session. (1) The logging split: the journal is the log, and
"host-internal debug exhaust is carrier plane and no fold may read it"
(`docs/design/2026-08-19-ops-harness-projection.md` §4.1, derived
against the shipped tree). (2) The substrate's promotion rule, ratified
as rider R-3 of the daemon spec: the three wire shapes — journal facts
/ commitment registers / ephemeral chatter — and "*chatter accelerates;
facts decide*". (3) The epic addendum (DEV-879, operator-directed):
"PERCEIVED FLUX IS A MEASURED DELIVERABLE… every watching surface (API
stream, UI, MCP progress) defaults to pass-through streaming of
transport flux while meaning waits for landings. The two-register
doctrine (flux = transport, meaning = landed values; token deltas never
land as facts) is the epic-wide law for every ingestion surface."

**Applied to completion streams (proposed wording; the substance is
the addendum's).**

> **CANDIDATE (the flux register).** Perceived flux is a transport
> property. Content deltas and annotations pass through raw to every
> watching surface of the session that opened the completion —
> immediately, unjudged, ephemeral. Dropping every flux frame changes
> no fold's value; flux may accelerate what landings determine and may
> never decide anything.

> **CANDIDATE (the meaning register).** Meaning is landed values. What
> lands is the completed candidate: the fold's result, canonicalized,
> digested, judged at the door; plus the checkpoint landings CS-2
> rules, if any. Token deltas never land as facts.

Both are the chatter rule with "status event" replaced by "token
delta", which is why this record expects them to grill cheaply — the
shape is already ratified once. Three consequences worth spelling out.
*Loss.* A watcher that missed flux missed nothing recoverable-by-right:
recovery is a read of landings, exactly the substrate's ruled posture
for its own watch surfaces. *Order.* The flux tap preserves arrival
order per stream (the LIST rung needs nothing more) and makes no
cross-stream ordering claim. *Scope.* The tap is scoped to the opening
session's watchers; whether a writ must license watching flux rides
the egress-law candidate (AE-4, its grill already ticketed) and is
deliberately not widened here.

### 5.4 Vendor event names are transcribed, never re-spelled

**Ground, the exemplar this discipline cites.** The status vocabulary:
`internal/statusvocabulary.ts` carries every status event type the
pinned NATS client declares — "in the order it declares them", "every
name is the vendor's own and none is renamed", "all eleven rows are
transcribed even where this estate has no consumer for a row today,
because a subset is a design decision wearing a transcription's
clothes" — with per-row provenance (the vendor's own type-alias name)
and the pin carried as data. The tables are *values*, because "a
switch statement over eleven cases cannot be byte-compared against the
vendor's declaration, and byte-comparing them is what the transcription
gate does": `check:status-vocabulary` runs five clauses against the
installed bytes, and its `--self-test` plants five mutations — a row
renamed away from the vendor's name among them — each required to
refuse on its own clause. Beside it, `internal/wirevocabulary.ts`
extends the discipline with per-row provenance *digests* of the exact
pinned source region and carries rows the estate never speaks as
`declared-but-unused` — "omission is how a table starts lying". The
generalization to the whole substrate surface is ratified (daemon spec
R-3): "transcribed from the pinned vendor source, never invented and
never twinned".

**Applied (proposed).** Each codec's event table is the same artifact
one vendor over: every event type the pinned grammar declares, the
vendor's spelling verbatim (`message_stop`, `[DONE]`,
`response.completed`, `notifications/progress`), full adoption
including events the estate never consumes, per-row provenance naming
the vendored declaration, the pin as data, and a transcription gate
with a planted-drift control (one renamed vendor event reddens —
DEV-894 already commissions exactly this). The word-class column
(§3.1) is the estate's *classification* of a row, kept apart from the
vendor's spelling exactly as the status vocabulary keeps its sorts
apart from the vendor's event names — classifying is lawful; renaming
is the drift class the ruling refuses.

### 5.5 The one binding nondeterminism clause

**Ground.** The epic carries it verbatim, as the completion seam's one
binding line while the formal note stays parked by the operator's word:
"nothing nondeterministic is ever load-bearing except through
admission" (DEV-879; restated in DEV-882 as "Nothing nondeterministic
is load-bearing except through admission").

**Applied (reading, not new law).** The stream is nondeterministic
end to end — token choice, chunk boundaries, event interleaving, even
whether usage arrives. Under the clause, none of it may bear load
anywhere except as an admitted candidate's content: no retry policy
keyed off token text, no fold reading flux, no checkpoint semantics
derived from chunk boundaries (vendor chunking is transport, §3.3's
wall deliberately compares decoded values, never framing). The one
gate through which nondeterminism reaches meaning is the door, and the
door judges a completed, deterministic *value* — by the time judgment
happens, nondeterminism has already collapsed into canonical bytes
with a digest. The clause is why the two-register split is not merely
tidy but load-bearing: it is the mechanical arrangement that makes the
parked line true by construction.

### 5.6 Fixtures are recorded, never composed

**Ground.** The generated-vectors ruling (2026-08-15, standing in
AGENTS.md's working precepts): a fixture that stands in for a model's
answers is generated by executing that model; hand-typed bridge
fixtures are refused because "a transcription error makes both sides
agree on a falsehood". DEV-894 commissions "recorded fixture streams
AND a live arm".

**Applied (proposed).** A codec's fixture stream is a *recording* of
the pinned vendor — captured frames with a provenance line naming
endpoint, model, and capture command — never a hand-composed sequence
of what the vendor "would" send. A hand-typed vendor stream is the
same twin the ruling banned: the codec would be tested against the
transcriber's beliefs, and both could agree on a falsehood. The live
arm exists because a recording pins the past; the walls-group live run
is what notices the vendor moving (CS-4).

---

## 6. The usability claim, made measurable

**Ground.** The epic addendum names the deliverable: perceived flux is
*measured*, "executed and timed in the practitioner-surface gate,
never asserted". DEV-889 defines the bootstrap as a declaration set —
canonical values with digests, idempotent re-derivation, refusals that
teach at first contact. DEV-894 requires "a wall that observes
first-delta-visible before terminal, not after". DEV-888 owns the
practitioner gate that would run the demo.

**The path, named (proposed, as a gate this record states and does not
run).** From **"completions endpoint connected"** — one declared value
in the bootstrap's own shape: `{ endpoint, model name, key reference }`,
minted like every DEV-889 declaration (canonical bytes, a digest,
idempotent re-mint, per-row provenance), where the key *reference*
names a credential in the environmental band and the key itself never
enters a declared value, because a secret in canonical bytes would be a
secret in the content-addressed store (the storage record's
honest-bound 14, carried) — to **"visible streamed interaction"**: the
first content delta of a live completion, opened through that declared
endpoint, observed on a watching surface strictly before the stream's
terminal. Stated as an *executed demo gate*: the practitioner-surface
ticket runs it and times it; the codec build's first-delta-before-
terminal wall is its streaming half; and no number is asserted here or
anywhere until that gate produces one. A record that quoted a
milliseconds figure now would be the exact failure the
dogfood-runs-the-artifact rule exists to refuse.

---

## 7. Findings

Recorded with what breaks and what would unlock each; none is
repaired here.

**F-1 — The NATS-native convention has no carrier for the claim.**
`requestMany` at the pin supplies ordered deltas and four termination
strategies of which three are out-of-band heuristics and the fourth is
an untyped empty message; no strategy asserts completeness and nothing
restates a final (§4.4 Ground). The claimed-fold half of the shape has
no vendor-supplied referent, so codec lawfulness is inapplicable —
grade E, honestly, rather than a forced fit. **The unlock is already
in the tree:** a completion carried *over* NATS by the estate speaks
the envelope vocabulary — `emit` deltas, `checkpoint` claims, `sealed`
terminal (`kernel/Wire.ts`, shipped) — which supplies exactly the
typed terminal and claim the raw convention lacks. The finding prices
the difference between transcribing a vendor and owning a wire.

**F-2 — The in-band wall is rarer than the ticket's premise.** The
ticket reads "the wall most vendors hand us for free". First-hand:
one surveyed grammar hands the whole wall in-band (OpenAI Responses,
grade A); Anthropic hands sub-value and running claims (grade B);
chat-completions hands per-tool-call parses only (grade C); MCP is
vacuous (D); NATS inapplicable (E). The generalization survives — the
*shape* fits everywhere it has content — but the lawfulness wall's
free coverage is graded, and CS-4's pricing is built on the grades
rather than on the premise. Recorded so the ratified spec inherits
the corrected claim, not the hopeful one.

**F-3 — The multica inner protocol is not observable from this seat.**
The CLI trees expose the landing surface (positioned message logs,
resumable reads, out-of-band cancel) and nothing beneath it: no wire,
no push transport, no message sample (every execution-history probe
returned empty — the board's work was done outside the multica
runtime). The row is verdicted only at the granularity actually seen
(§4.5) and marked weaker. The unlock is cheap and stated: one real
multica-run task on this board would let a later seat read
`run-messages` output shapes first-hand; a wire read would need the
daemon running and a capture, which is its own decision, not this
record's.

---

## 8. The grill sheet

House style: one decision per item; recommended option first;
alternatives priced; reversal stated. All four are **PROPOSED**; the
operator rules. Tier letters are the estate's cost classes (carried
from the storage record's ladder) and are ordering claims, never
measurements.

### CS-1 — Is free-monoid + claimed-fold the ruled interface, or does tool-calling demand a richer algebra?

**Recommended: free monoid + claimed fold, with nesting in the
bracket alphabet and in citation between folds — no richer algebra.**
The survey's evidence is uniform: no vendor opens a child stream
in-band. Anthropic's server-executed tools — the richest in-stream
tool story surveyed — arrive as flat indexed blocks correlated by
`tool_use_id` (§4.1); OpenAI addresses items by `output_index` /
`item_id` under one explicit `sequence_number` order (§4.2); MCP has
no deltas at all. Nesting is therefore a property of the *alphabet*
(brackets with slot addresses; well-bracketing checked at decode as
part of W, §3.1), not of the carrier. The genuinely recursive case —
a completion that spawns a subagent whose own completion streams — is
two sessions, two streams, two folds, correlated by citation: the
parent's landed candidate cites the child (`spawn` is the estate's
call instruction, the epic's words), and composition happens at the
meaning plane between landed values, never by splicing flux. Price:
zero new vocabulary; codecs stay transcriptions; the Dyck check is a
decode-time validation the fixtures exercise.

**Alternative (priced): a tree- or graded-coalgebra interface** —
deltas addressed by paths, child streams as first-class branches. It
would (a) mint kernel-adjacent vocabulary this ticket's bounds forbid,
(b) have no vendor grammar to transcribe it from — every codec would
*invent* structure, the exact drift class the transcription ruling
refuses, and (c) buy nothing the bracket alphabet plus citation does
not already express, while making every surveyed grammar — all of them
flat — pay a re-shaping cost on every event. Reversal if the flat interface later
pinches: the bracket alphabet is forward-compatible — a genuinely
nested vendor grammar would transcribe as brackets first, and a richer
interface could be grilled then with a real grammar on the table,
which is cheaper than un-inventing one now.

### CS-2 — Chunked checkpoint landings: never / at tool boundaries / at declared intervals

**Recommended: at vendor block boundaries only, and only for
judgeable sub-values — with "never" as the default for everything
else.** Precisely: a landing may occur where the vendor itself closes
a delimited sub-value (`content_block_stop`,
`response.output_item.done`, `function_call_arguments.done`) *and*
that sub-value is candidate-shaped (a completed tool-call proposal the
loop must judge before acting anyway). At such a boundary the loop has
already materialized, parsed, and canonicalized the value —
transcription, digest, and judgment are owed regardless — so the
landing costs one positioned append (T2) on a lane the run-step slice
(DEV-881) is already commissioned to feed. No second landing path, no
new grammar, and the landing is act-shaped, which is what lanes carry.
Mid-block and time-based checkpoints stay refused: token deltas never
land as facts, and a partial text is a flux snapshot, not a candidate.

**Alternative (priced): never — terminal-only landings.** Simplest to
state, but incoherent the moment a stream carries a mid-stream tool
call the loop *executes*: judgment precedes carriage, so the tool-call
candidate was judged — and a judged, executed act that never lands
contradicts the run-step discipline (the execution log would have a
hole exactly where the run acted on the world). "Never" is only
coherent for streams with no mid-stream judgeable blocks, which makes
it the degenerate case of the recommendation, not a rival lane.

**Alternative (priced): at declared intervals** (every N seconds or N
deltas). Two sub-shapes, both priced and neither recommended:
*cumulative snapshots* land the prefix each time — O(k) landings of
O(n) bytes is O(k·n) lane bytes, quadratic-shaped as intervals shrink,
all of it restating flux nobody may fold anyway; *digest-only
attestations* (the `attest` / `checkpoint` envelope kinds exist for
exactly this) are constant-size per landing (T2 each) and honest — but
they have **no consumer today**: no fold reads mid-completion
attestations, resumability is not bought (no surveyed vendor stream is
resumable from the estate's side at these pins), and the estate builds
behind consumers. Reversal: interval attestations can be added later
as a pure landing-policy row without touching the codec interface,
which is why refusing them now costs nothing.

### CS-3 — Where codecs live in the plane layout

**Recommended: internal adapters beside the precedent that already
answers this — transcription tables and transducers in
`packages/plait/src/internal/`, seam-tagged; the public face arrives
only as the effectful completion Layer consumes them.** The layering
argument, in the direction the layering law runs: a codec imports the
vendored grammar's shapes and the estate's truth vocabulary (canonical
bytes, digests, refusals) — truth-seam material — and its transducer
half moves frames and claims no meaning until the door — carriage
posture. It must never import surface, and surface must be free to
consume its raw tap (the flux pass-through an API stream or UI serves)
without the codec knowing watchers exist. That is exactly the
status-pump arrangement, shipped: `internal/statusvocabulary.ts`
(tables as data, `Seam: truth`) beside `internal/statuspump.ts` (the
one consumer that walks them), consumed by the spine, served by
surfaces that the pump never sees. Codecs are the same species one
vendor over — the completion vocabulary and the completion pump.
Price: zero layout change, the `Seam:` ranking and `check:layering`
wall apply unmodified, and Law 1's staged-debt convention (the
hand-carried transcription owing a future emitter group, exactly as
the status vocabulary states today) carries over verbatim.

**Alternative (priced): public modules in `carriage/`.** Wrong twice.
Carriage's public modules today are runtime carriers (`Engine`,
`FabricClient`) — a vocabulary table is not a carrier — and a public
surface before a second consumer exists violates build-behind-
consumers; the effectful completion (DEV-882) is the one consumer, and
adapters graduate to a public plane home when a second caller makes
the seam real. Reversal cost of the recommendation is exactly that
graduation — a rename under the layering wall — which is the cheap
direction; un-publishing a public module is the expensive one.

**Alternative (priced): `surface/`.** A category error the one-door
law already prices: surface modules are entry points serving
projections, and a codec is an ingress adapter. Codecs in surface
would scatter the parse boundary per-surface — each entry point
privately deciding what vendor bytes mean — which is the streaming
form of the second-door defect. Refused rather than priced further.

### CS-4 — The lawfulness wall: per-session live, or walls-group only?

**Recommended: split by grade (§4.6), which is to say by what each arm
costs.** The **in-band arms run per-session, live, always**: whole-
final equality where the grammar supplies it (grade A — one
canonicalization and byte-compare of a value the codec already decoded;
O(final bytes), trivial beside the completion itself), sub-value
equality at every block close (grade B/C — the parse-or-restatement
check the vendored folds already perform), and running-claim checks
(cumulative usage never decreasing). This is verify-on-read applied to
the transport: the estate re-derives rather than trusts, and a live
mismatch is a typed seam refusal at the parse boundary — the transport
lied about its own fold, and the completed candidate never reaches the
door wearing bytes the stream did not spell. Trusting the vendor's
fold at runtime because a gate passed last week would be trust, which
is the one thing the seam is not allowed to extend. The
**cross-request differential arms run in the walls group only**:
streamed-fold versus the non-streaming endpoint's final for the same
request (grades B and C's missing half) costs a second paid vendor
call per check and belongs beside DEV-894's recorded fixtures and live
arm — executed, scheduled, and priced as a gate, never as a per-session
tax.

**Alternative (priced): walls-group only.** Zero runtime cost, and a
vendor drifting between gate runs streams unverified folds into
candidates until the next battery — the door still judges *values*,
so lawfulness of acts is not breached, but the estate would land
candidates whose provenance claim ("this is what the vendor's stream
folded to") went unchecked while a free check existed. Cheap is not
the reason to skip verify-on-read anywhere else in the tree; it is
not a reason here.

**Alternative (priced): everything per-session, differentials
included.** Doubles vendor spend per completion (a second API call)
to re-check what fixtures and the walls-group live arm already cover
on cadence. Refused on price with nothing bought.

**Reversal for the recommendation:** demoting an in-band arm to
walls-group later is deleting a check from a hot path (cheap);
promoting a walls-only arm to live later needs no design, because the
check is the same function run in a different place — the split is a
policy row, not an architecture.

---

## 9. What I could not verify

Stated plainly, because a survey that hides its gaps is the thing the
provenance discipline exists to refuse.

1. **The vendor grammars were read one remove from the vendors.** Rows
   4.1–4.3 were read from the vendored Effect release's generated
   schemas and clients (`repos/effect` at `effect@4.0.0-rc.108`, the
   subtree AGENTS.md pins) — the ecosystem's transcription of the
   vendors' interface documents, not the vendors' own repositories or
   live wires. No public spec was fetched; no live vendor stream was
   captured. For the build's purpose this is the *right* provenance —
   DEV-894's codecs will speak through exactly these pinned clients,
   and the estate transcribes the pin it speaks through, precisely as
   the status vocabulary transcribes the pinned NATS client rather
   than the NATS server — but a claim about what a vendor's wire
   "truly" carries is one grade weaker than a claim about what the
   pin carries, and every §4 verdict is a claim about the pin.
2. **The NATS bytes were read from the primary checkout's installed
   tree.** This worktree has no installed dependencies, so
   `@nats-io/*` was read at
   `packages/plait/node_modules/@nats-io/` in the primary checkout —
   the same 3.4.0 pin this worktree's `packages/plait/package.json`
   declares, but installed bytes are per-checkout and I did not hash
   them against the registry.
3. **The multica row's whole inner protocol** (§4.5, F-3): no wire, no
   push transport, no message sample. Verdicted only at the observed
   granularity.
4. **The Generated.ts provenance chain.** The vendored
   `Generated.ts` modules carry no in-file generation command; their
   provenance here is the vendored release tag itself. I did not
   reconstruct which vendor OpenAPI document versions they were
   generated from.
5. **No battery, no measurement.** This change is one new file under
   `docs/design/`; the worktree has no installed dependencies and no
   gate was run. Every cost in §8 is an ordering claim carried from
   the storage record's ladder. What I did run, bare: a mechanical
   existence check over every backtick-cited repository path in this
   record, each resolved against an ordered root list — the worktree,
   its plait package and src, and the primary checkout (including its
   `@nats-io` scope, for the installed bytes §9.2 locates there) —
   `checked=38 missing=0`, `PATH CHECK: PASS`, exit 0; and its
   self-test, which planted two bogus paths into a copy and reddened
   on exactly those two by name. The script is session scratch, not a
   tree artifact, and it checks existence only: a cited file that said
   something other than what this record claims would pass it, which
   is what the Ground blocks' first-hand quotes are for.
6. **Sibling-record claims were carried, not re-verified.** The
   ops-harness projection's §4.1 sentences, the storage record's
   ladder and bounds, and the daemon spec's rider text were each read
   first-hand this session — so the quotes are exact — but the tree
   and substrate claims underneath them were not re-derived here.

---

## 10. Honest bounds

1. **This is a survey and a doctrine, not a proof.** No theorem is
   claimed anywhere; the one formal object (§3) is a reading
   discipline for grammars, and its lawfulness wall is a CANDIDATE
   check, not a proved property.
2. **The shape's fit is a fit at the pins.** Five grammars at five
   pinned versions fit (or don't, F-1) as read this session. A vendor
   moving its grammar moves the survey; the transcription gates and
   the walls-group live arm are the mechanism that notices, and
   nothing here claims stability the pins do not give.
3. **The wall is graded, not free (F-2).** One grammar of five hands
   the whole in-band wall; the record prices the rest instead of
   assuming them.
4. **Liveness is claimed nowhere.** Not for vendor streams (a stream
   may hang forever; flux is droppable and the register policy is the
   whole answer), not for the demo path (§6 states a gate others run,
   and no number exists until it runs).
5. **The LLM is trusted for nothing**, and this record adds no
   exception: flux reaches eyes, never folds; only judged landings are
   meaning; and the one binding clause (§5.5) is carried verbatim,
   not reinterpreted.
6. **Two findings stand open** (F-1, F-3) and one premise is corrected
   rather than inherited (F-2). None is softened, and no unlock is
   started here.
7. **Nothing dispatches from this record.** The codec build (DEV-894)
   is gated on the operator ruling the grill sheet; the effectful
   completion (DEV-882) consumes the build; the bootstrap (DEV-889)
   and practitioner gate (DEV-888) own their own tickets. This record
   ends where the ticket said to stop: at the sheet.
