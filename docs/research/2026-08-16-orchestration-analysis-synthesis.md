# Orchestration analysis — synthesis, 2026-08-16

Status: synthesis for the operator's ratification pass. Five research lanes
plus three gap-filling lanes were dispatched on 2026-08-16 against the daemon
as it stands on branch `agent/codex/kernel-hygiene-gates`. Every lane ran the
system rather than reading it, every lane was re-checked by a second seat that
did not write it and was instructed to refute it, and three holes the critic
found in the first pass were closed by dedicated follow-up runs.

**This document recommends. It changes no code, no ledger row, no seam status,
and no dispatch draft.** It is the only file this workflow writes.

---

## How to read this

The subject is foldlab's daemon (`protod`) and the layer that would sit above
it: an orchestration system in which software agents and humans take turns
filling declared gaps in a declared process, and every step is evidence rather
than testimony. Terms used throughout:

| Term | What it means here |
| --- | --- |
| the daemon | `protod`, a local sidecar process. Clients speak to it over three verbs — read, publish, request — and get back either a fact or a typed refusal |
| a refusal | a *value*, not an error. It carries the law it enforces, the path in your request that broke it, what it got, what it expected, and a `next` hint that is a filled-in retry template. Nothing throws across the seam |
| structural vs absence | the two sorts of refusal. Structural means "these bytes are wrong, repair them". Absence means "not here yet" — a later arrival repeals it |
| a protocol | a *value* with a digest, declaring seats (roles), holes (gaps to fill), which holes must be filled for the round to count as completed, who may close it, and how ties are broken |
| a protocol session | one run of a protocol. Its name is the SHA-256 of its own opening event, so identity is derived, never assigned |
| a hole's states | `open` → `filled` → `disputed` (a second seat disagreed) → `decided` (a declared tie-break rule chose) → `sealed` (fixed at close) |
| the fence | the declared tie-break rule. Today the wire admits exactly one: `seat-authority`, "first seat in this declared order wins" |
| the frontier | a derived answer to "what may I legally do next", served today for type-authoring and *not* for protocol sessions |
| the model | `verify/moves`, a Lean 4 development proving laws about the move calculus. It is not the daemon and does not claim to be |
| a digest | SHA-256 over RFC 8785 canonical bytes. The estate's rule is that a digest is always re-derived by the reader, never asserted by the writer |
| MCP | Model Context Protocol, the wire an LLM client uses to call tools. foldlab serves 15 tools derived from the daemon's own self-description |

Confidence tiers, used on every claim below:

- **ran-it** — executed on this machine 2026-08-16, transcript in the named
  scratch path, and where a verifier re-ran it that is said.
- **primary-source** — quoted from source code read, or from a specification
  page fetched on 2026-08-16.
- **lead** — a secondary source or an unread paper body; recorded, not relied on.
- **unverified** — stated from memory or inference; marked, never load-bearing.

The underlying record is eight scratch reports listed in the Sources appendix.
They live in a session-scoped temporary tree and **will not survive**; anything
load-bearing here should be re-run before it is built on.

---

## 1. Result first — the five decisions this analysis most sharpens

### 1.1 Attribution is the load-bearing decision, and it is worse than "a named gap"

The estate already declares that seat bindings are unauthenticated strings
(D17; the protocol grill's G4; `VERIFICATION.md:488-490`; the model audit's
MOVES-4). What nobody had written down is the **interaction**, and three lanes
independently walked into it:

- **ran-it** — a second connection to the same daemon filled a hole as `bob`
  and closed the round as `alice`; the round reached `outcome: "completed"`
  (production-architecture, transcript `04-seat-authority.txt`).
  *Verifier caveat, material:* that connection was **not** unauthenticated. It
  logged in with the same per-run shared application password the daemon prints
  in its own ready URL (`auth.go:64-68`, `protod.go:229`). The honest statement
  is *any credentialed connection may act as any bound principal — the daemon
  distinguishes connections, not whos.*
- **ran-it** — `principalSeat` (`protocol_session.go:525-532`) compares a
  request-body string to the bindings map, and **the same function is the
  replay-time check** at `:415` (fill) and `:426` (close). Two forced cold
  replays across daemon restarts against the same store produced a
  byte-identical fold with the forged fills sealed and a stable
  `final_state_digest`. Verify-on-read therefore *confirms* a forgery rather
  than detecting it, and it cannot ever dissent on a wire-reachable history
  because `ingress.go:48` refuses all publishes into protocol-session journals
  (gap lane `gap-forgeable-principals-verify-on-read-may-`, `e1-transcript.md`).
- **ran-it** — the MCP surface serves `principal` as a bare `{"type":"string"}`.
  Driving the real stdio face, an LLM granted the human operator's
  authorization, rendered the operator's decision, and closed the round *as the
  operator* in four tool calls (same lane, `e4-mcp.stdout`).

Two consequences that change plans already on the table:

1. The sub-session lane's mitigation "**ship single-seat holes first**" is
   **void and inverted**. Single-seat plus the default `successor-round`
   revision mode lets a forger who fills first lock out the legitimate holder,
   producing a *clean* single-candidate `completed` record with no dispute to
   read (**ran-it**, `e2-transcript.md`). Single-seat removes the fence, which
   is the only machinery that would have made the conflict visible.
2. A new defect, found while probing that: **single-seat + `absorb` + a
   self-differing value wedges the session permanently open, and the daemon is
   silent about it** — one connection, no forgery required (**ran-it**,
   `e3-transcript.md`). A refusal-less dead end is a W8 violation on its face
   and owes a disposition.

Sizing, carefully: W1 ("no asserted identity") is **not** violated — W1 is
scoped to digests, and every digest here re-derives. The honest sentence is
that **the actor is the one asserted identity left in the protocol surface**,
and replay launders it into a repeatedly confirmed record.

**Sharpened decision:** whether any acceptance record that mints
seat-attributed evidence ships before an attribution scheme is decided. Two of
the four acceptance criteria in the `04-ontology-demo` format are satisfiable
by one agent impersonating every seat (**ran-it**, same lane).

### 1.2 The program's headline claim — that an agent can drive this — is currently false, for a mechanical reason nobody had named

The whole analysis is about agent-mediated orchestration, and until the gap run
nobody had put an agent on the surface. The dogfood lane did:

- **ran-it** — a complete multi-seat session driven end to end with the
  official MCP SDK client v1.30.0: open → fills across two seats → a real
  dispute → close. 25 calls, 0 exceptions across the seam, 6 data refusals,
  `outcome: "completed"`, fence-decided verdict, plus a successor round citing
  its predecessor. **The surface works for a caller that already knows the
  vocabulary.** First successful fill took 7 calls.
- **ran-it** — two genuine LLM agent loops, quarantined (no filesystem tools,
  working directory outside the repo, no documentation), given the same goal.
  **Neither converged.** Run 1: 61 tool calls, $5.15, 28.8 minutes. Run 2 (given
  one out-of-band sentence about argument typing): 92 calls, $6.52, 36.4 minutes.
  Both cataloged **zero** protocols and **never reached a fill**.

The cause is one line. `proto/ts/src/codegen.ts:216-217` renders the `opaque`
type as `case "opaque": return {}` — an empty JSON Schema. The five tools that
carry meaning therefore advertise an untyped argument; the agent sends a
JSON-*encoded string* where an object was wanted (150 of 150 untyped arguments
across both runs, zero real JSON values ever); and the daemon answers with one
generic type refusal that masks the field-by-field repair ladder entirely. A
foldlab-free control MCP server pinned the attribution: `{}`, a brand
annotation, and even description-plus-examples all arrive as strings, while
`{"type":"object"}` arrives as an object (**ran-it**, `agent-runs/echo-probe/`).

Both agents *did* correctly infer the dispute semantics from the tool
descriptions alone, and run 1 independently diagnosed the string-vs-object
transport defect with its own control experiment. The vocabulary is learnable;
the transport is not usable.

**Sharpened decision:** the untyped-schema defect is fixed before the frontier
work, not after. This inverts the priority every lane assumed.

### 1.3 The frontier field: correctly priced at last, and the shape everyone asked for cannot be built

Adding a `frontier` to the protocol-session state reply was the single
most-recommended change across the analysis (pattern-catalog R2, MCP R5, echoed
by two more lanes as the DX deficit). The two lanes that priced it contradicted
each other, and the gap lane found **both wrong, in opposite directions**:

- The cheap pricing ("does NOT enter any digest preimage") is **false**: adding
  the field moves `contract.describe`'s canonical bytes, 19,244 → 19,671, sha
  `59ca06b1` → `8711a886` (**ran-it**). The field is the `reply` member of the
  `protocol.session.state` descriptor at `contract.go:363-367`
  (**primary-source**, confirmed).
- The expensive pricing's causal chain breaks at two of three links (**ran-it**):
  reply shapes never reach the MCP `outputSchema` — `toolsFromContract` reads
  only `request.body`, and every tool's success schema is the fixed
  `McpOutputEnvelope`, measured `outputSchema.properties = ['ok','refusal']` —
  and **there is no contract digest in this estate at all**. Nothing digests the
  describe reply, no fixture pins it, and the one place a contract digest was
  considered it appears among *rejected* alternatives
  (`proto/DECISIONS.md:2714`, **primary-source**, confirmed).
- The genuine cost is a **cross-language lockstep**: emitting the field with the
  TypeScript left untouched turns exactly **one** test red —
  `protocol-moves.test.ts` — because `wire.ts:237` is a closed `Schema.Struct`
  decoded with `onExcessProperty: "error"`. The honest change is 3 edits and
  **zero** fixture regenerations (**ran-it**).

More consequentially, the *shape* both lanes asked for — per-hole `legal`
choices with a worked example the daemon guarantees to accept — **cannot be met
for protocol holes** (**ran-it**):

- an `opaque`-typed protocol hole admitted **7 of 7 mutually incompatible
  values** (`value_check.go:33` returns nil for opaque), so `legal` for that
  hole enumerates the entire JSON value domain;
- the same type-legal value is accepted for one seat and refused
  `seat-unauthorized` for another, so `legal` has no principal-independent
  truth value;
- the type-authoring frontier's alphabet is finite (12 kinds); a protocol
  hole's value domain is not.

So no C4-style "every offered example is directly accepted" obligation is
dischargeable here. And the biggest unpriced finding, missed by all five
original lanes: a **catalog-derived** frontier on this reply passes the entire
Go suite including every reopen-equivalence gate, yet changes the served bytes
1,440 → 1,507 **with an unchanged head and no session move** (**ran-it**). The
type side anchors exactly this with a `catalogHead` in the same reply;
`vProtocolStateReply` has no such anchor, so the reply would silently stop
being a fold of the session journal alone.

Finally: this is **not** blocked on `FINDING-FRONTIER-001`'s grammar question
(disposition 1 was taken and encoded as the tripwire) but **is** blocked on its
unratified semantic half — what `legal` asserts (**primary-source**,
`proto/go/protod/FINDING-FRONTIER-001.md:40-53`).

**Sharpened decision:** ship a *state-anchored, seat-relative* frontier — per
hole: state, declared seats, type digest, whether it counts toward completion,
and its fence rule — and explicitly **not** a `legal`-enumerating one. Add a
catalog anchor if any catalog-derived field enters.

### 1.4 The next acceptance demo is P2, and it is downstream of 1.1

The pattern lane ran the process-design pattern end to end against a stock
daemon and measured its defining claim: the SHA-256 over RFC 8785 bytes of the
sealed design value equals the `protocol.create` digest equals the run
session's `protocol` field — `33e39ac6…` three times (**ran-it**). Zero new
wire. That is "the process we ran is the process we designed" as a checkable
equality rather than testimony, and it exercises the level-crossing that the
already-drafted `04-ontology-demo` does not.

Two residuals must ship with it, not one:

1. the designed-process hole is `opaque`, which **admits any value by law**;
   the daemon does not check the tie, the reader re-derives it;
2. *(verifier-added, material)* **there is no on-wire link between the two
   sessions at all.** Session identity is a pure function of
   `(protocol, bindings, predecessor)` (**primary-source**,
   `protocol_session.go:141-149`, confirmed), so the run session carries no
   reference to the design session and vice versa. The equality is verifiable
   only by a reader handed both coordinates out of band. The lane applies
   exactly this standard to disqualify two other patterns and does not apply it
   to P2's own coordinate.

And per 1.1, the record this demo mints is seat-attributed, so its evidentiary
value is capped by the attribution decision.

### 1.5 Where proof effort goes: REF-1 first, TLA+ for the transport, and one absence worth closing

- The two theorems a sub-session hole would need (`sealed_stable`;
  monotone-gate confluence) **cannot currently be stated** in `verify/moves` —
  session status, outcome, sealed, and the completion arithmetic do not exist
  there. That places them downstream of REF-1 (`Moves.Wire`), which is already
  specced. *Verifier caveat, material:* the lane's supporting grep does not
  reproduce, and it concealed that `single_seat_stable`
  (`Model.lean:1546`, **primary-source**, confirmed) already *is* a conditional
  filled-stability theorem under a `SeatConsistent` premise, permutation-closed.
  The single-seat configuration is better covered than the lane claimed — which
  matters less than it would have, because 1.1 voids the single-seat plan.
- The MCP question is a **schedules** question, not a values question: MCP at
  the 2026-07-28 revision has no protocol-level session left, so what remains
  to model is an at-least-once, unordered, no-resume transport over a fold that
  claims order-independence. That is TLA+ shaped, about the size of the existing
  `Pipeline.tla`. *Verifier caveat, material:* the lane's stated authority for
  routing this away from Lean — "spec 24 explicitly forbids" — rests on a
  composite quotation whose second clause is not in spec 24. The conclusion
  stands on its own merits; the authority citation does not.
- **Do not add `plurality` to the wire yet.** The proved-law-to-shipped-right
  move is correct in shape, but this instance's demand signal is miscast
  (§3.6), and the genuine absence is elsewhere: the **shipped** fence is
  seat-priority, neither of the two rules `Violations.lean` analyses, and it has
  no mechanized manipulation profile anywhere.

---

## 2. Per-lane synthesis

Each section states what the lane established, folds in what the verifier and
the gap runs changed, and marks claims accordingly. **One fatal finding is
excluded outright and said to be excluded.** Material findings carry their
caveat inline.

### 2.1 The sub-session hole (G1–G9)

Record: `…\scratchpad\wf\subsession-hole\report.md`.

Five of the nine grill questions turn out to be **already answered by shipped
code nobody had connected to the proposal**, two need theorems that can be
named exactly, and two are genuine operator decisions.

**What is settled by shipped machinery.** The `predecessor` path
(`protocol_session.go:450-474`) is a working sub-session resolver: given
`(session, final_state_digest)` it replays the child journal and refuses unless
the fold is closed and the digest re-derives (**primary-source**). Conformance
checks a certificate can carry — child protocol digest equality, outcome
discrimination — are already expressible in the shipped type vocabulary as
literals and unions, enforced at fill time *and* again on replay (**ran-it**).
And recursion needs no depth bound: a protocol-digest cycle would be a SHA-256
fixed point, provided the child protocol is pinned **by digest inside the parent
protocol value**. The lane is careful, and right, to add that `walkRefGraph`
would *not* cover this — a digest embedded as a `literal` string is invisible to
the type-ref walk — so the recursion ban must not be cited here.

**Two of the proposal's own instincts are wrong, and the machine shows it.**

- "Pin to head" is the wrong noun. A closed session's head keeps moving as
  post-close evidence receipts append, while its final-state digest does not:
  head `5b8a5c76…` → `1bea7845…`, digest `e46e0d60…` unchanged, and the pin
  still validates (**ran-it**). The pin's coverage boundary — meaning-at-close,
  with the post-close evidence tail outside it — must be written down or it
  reads as a defect on discovery.
- "Parent hole filled with a closed child" is not a stable predicate.
  `filled` is demoted to `disputed` by any clashing fill, in both the model and
  the real daemon (**ran-it**). *Verifier caveat, material:* the lane's claim
  that no filled-stability theorem exists is too strong —
  `single_seat_stable` is one, under a value-consistency premise.

**The load-bearing negative result.** The shipped conformance checker admitted
a fabricated certificate naming a session that has never existed, the parent
hole went to `filled`, and — worse — a seat-authority fence then decided the
parent hole *for the fabrication* over a real child, and the parent closed
`completed` (**ran-it**). *Verifier caveat, minor:* the lane's headline calls
this a W1 violation citing `refusal.go:32`; W1 is scoped to identities the
daemon commits or cites as identity, not to arbitrary strings inside an opaque
fill value. The design conclusion — a resolver is required in the impure half —
survives intact.

**On whether the one-state-digest invariant lifts to trees:** it does not, and
the reason is exact. The permutation theorem rests on a move's effect being a
function of the hole's cell alone; a gate consulting "has this child closed
yet" is not. *Verifier caveat, material:* the experiment offered as the
mechanical kill is engineered rather than observed — the gate flips because of
a move in the *parent's* bag, a coupling no shipped mechanism has. The
conclusion is carried by the argument, not by that run, and the lane never
tested whether an *independent monotone* gate breaks anything. That inflates the
apparent need for the proposed monotone-gate theorem.

**Two findings against shipped code fall out**, both worth acting on:

- "Child still open" is misclassified as `digest-mismatch`/structural when it is
  head-relative absence, and it teaches badly (`Expected` for an open child is
  the empty string) (**ran-it**). Under a sub-session hole this becomes the
  normal case, and a structural refusal tells an agent's repair policy "do not
  retry" when the correct advice is "retry after the child closes".
- Protocol sessions are content-addressed by their open event, so
  `(protocol, bindings, predecessor)` **is** the session key — half the
  certificate is derivable client-side with zero I/O (**ran-it**, reproduced).

**Where the gap run changes the conclusions.** The lane's R7 ("ship single-seat
sub-session holes first") is void per §1.1. Its R4 (leave child bindings free,
carried in the certificate, provisional pending principal authentication) is
strengthened, not weakened: with attribution forgeable, freezing bindings in a
parent hole type would be security theatre over bare strings.

*Verifier caveat, minor:* two experiment-numbering schemes collide in the
report's prose (E-labels exist only in probe 1), so cross-references such as
"E4", "E8", "E9" misroute a checker. The structured findings use the correct
`probeN-transcript.txt PN` form.

### 2.2 The pattern catalog (P1–P6), measured

Record: `…\scratchpad\wf\pattern-catalog\report.txt`.

The lane executed each of the six proposed use patterns against a live daemon
rather than reasoning about them. Verdicts, all **ran-it**:

| Pattern | Verdict | Smallest missing piece |
| --- | --- | --- |
| P2 process design | runs today, end to end, with a re-derivable link | none for a demo |
| P3 research protocol | runs today, end to end | a convention: the report's bytes are ingested so its digest resolves |
| P6 human intake | one reply field short | `frontier` on the state reply (§1.3) |
| P5 LLM-task holes | runs, with the wrong fence | see §3.6 |
| P1 extraction | blocked twice | an identity-bearing subject coordinate on the open event |
| P4 action holes | does not run at all | an engine; nothing of it exists in this tree |

Three results deserve to travel beyond the lane.

**P1's second blocker is a versioning decision, not a field addition.** Two
`protocol.session.open` calls with identical protocol and bindings return the
*same* session; varying one principal string produces a distinct one; and the
open request body has no slot for what the session is *about* (**ran-it**). So
N documents cannot each get a session of one protocol under one binding set.
Every workaround corrupts something (smuggling the item into a principal string
corrupts seat semantics; citing `predecessor` asserts successor-round semantics
falsely; minting one protocol per document destroys the protocol digest's
meaning). Because the open event is the session-identity preimage, adding the
coordinate changes the most consequential preimage in the protocol surface —
and must be settled **before** the DEV-670 corpus freezes semantics.

**P1's first blocker is that provenance is shape-only.** A hole typed with a
provenance struct accepted a nonexistent corpus journal, sequence 99999, and a
fabricated document digest — admitted, `filled` (**ran-it**). The only
resolvable reference in the type grammar resolves a *type*, not evidence.

**P4's catalog text overshoots this tree.** The claim that "a pipeline program
is already data with a digest" is false here: the effector and the pipeline
program exist only under `.reference/playground-mech/`, and a grep for pipeline
programs outside it returns zero files (**ran-it**, reproduced). *Verifier
caveat, minor:* the draft paragraph already opens "Requires the external-binding
engine", so the correction should target the one sentence, not the paragraph's
posture. A second minor: the lane characterizes `session.go:673` as prose
asserting the effector is unused, when it is the `Law` string of a live
staleness refusal.

**Two hygiene notes that any dispatch must carry forward.** Three cited line
anchors drift by 1–5 lines (all quoted text exists and says what is claimed).
And "both suites green" is pinned to HEAD `0b75a6c0` and dated — correctly —
but is **not** a present-tense fact: at `157ee53f5` with the tree dirty from
concurrent lanes, `go test ./protod/` fails at
`TestSessionFixtureRederivesEveryPrefix` with "session version/grammar drifted".
Re-run gates on your own tree.

### 2.3 Production architecture beyond the core

Record: `…\scratchpad\wf\production-architecture\report.txt`.

The strongest structural contribution is a shape ruling: **the daemon should
stay a single-writer, loopback, file-backed sidecar, and scale should arrive as
multiple single-writer venues rather than one replicated venue.** Everything in
the certified envelope points the same way, and unusually, the envelope is
*executable data*: four lifecycle refusals fire before any resource is acquired,
each naming the substrate assumption the bad configuration uncovers
(**ran-it**). A standing stream-shape gate then refuses every eviction lever
JetStream has — including mirroring — and re-asserts itself on any post-open
configuration change (**primary-source**). *Verifier caveat, minor:* the gate
has 23 refusal clauses, not the 25 the report's summary claims; every clause it
enumerates is real.

**Cross-venue replication already works and is byte-exact and idempotent.**
Replaying one venue's verified entries into a second venue reproduced the head
exactly, and a second pass stored nothing and reported three duplicates
(**ran-it**). The write path, however, does **not** verify the chain link the
read path checks, so a single wrong-`prev` entry that wins the CAS permanently
bricks a journal that can never be purged. Inside the current single-writer
daemon this is unreachable; it becomes reachable exactly when a second writer is
introduced — which is what mirroring is. *Verifier caveat, material:* the
report's claim that replication "is unreachable from the wire" is **false for
data journals** — republishing the same frames through `ingress` reproduces the
identical chain. It holds only for the catalog and session journals, which is
where the proposed import verb's justification actually lives.

**Prior art, run rather than cited.** Effect v4 rc.108's durable-execution
identity is a 128-bit truncation of a delimiter-ambiguous, developer-asserted,
uncanonicalised pre-image — the lane reimplemented the two functions exactly and
produced a cross-tag collision (**ran-it**), and real durability drags in SQL
plus shard runners. Git's object id is a typed, length-prefixed pre-image that
type-checks before minting identity, re-derived by hand (**ran-it**); the one
thing foldlab adds is canonical form — the same JSON value in two key orders
gets two Git blob ids and one foldlab digest (**ran-it**). Nix and Effect both
truncate, and Nix puts the store location inside identity; both refused, for
reasons the estate's own rules already supply. And the journal's CAS and the
effector's KV CAS are literally the same server-side primitive, differently
keyed — a simplification worth writing down, because one substrate assumption
then covers both.

**Two claims to resize before use.** The proposed client-side "run certificate"
— a canonicalized, digested transcript — is offered as something with which
"the caller can prove what it sent and what it was told". A digest over a
self-authored log proves internal consistency, not what any counterparty said;
nothing in the design carries a daemon signature or a daemon-minted head
(*verifier caveat, material*). The affordance is a stable, diffable local
record, which is worth having under that name. Separately, the claim that
per-fill attribution is the only record of who acted is fill-scoped: the close
event also carries the principal and is tiered never-discardable
(*verifier caveat, minor*), and protocol-session compaction has no code path at
all today, so the forecast is a design warning rather than a blocked path.

### 2.4 MCP as a modeled device

Record: `…\scratchpad\wf\mcp-core-device\report.md`.

The derived-surface claim holds **for half the descriptor**, and the lane
established both halves mechanically. Served and derived tool lists are
byte-identical over `{name, description, inputSchema, annotations, _meta}` —
digest `fc806f99…9ca7` over contract `59ef16e2…58a9`, reproduced independently
by the verifier (**ran-it**). The refusal-kind vocabulary in the served
`outputSchema`, however, is **hand-written** in `mcp.ts:31-50` and walled
against nothing but a fifth hand-written copy in its own test — a drift editing
both together passes green (**primary-source**). That is the cheapest closed
drift channel in the whole analysis: one assertion, already passing, absent from
the suite.

*Verifier caveat, material, and it lands on the lane's own instrument:* the
served `annotations` object carries **four** keys, not three. `openWorldHint:
true` is served on all 15 tools, comes from the pinned library's default rather
than from foldlab's contract, and is silently dropped by the lane's projection —
and the shipped wall shares the blind spot. So the byte-identity claim is true
of a 3-of-4 subset, and this is a **fourth** instance of the very defect the
lane's own capability law was written to catch: a wire claim advertised by
inheritance from the pin rather than declared by foldlab.

**Envelope totality survives the death of the authority behind it**: killing
the daemon mid-session yields an `unreachable` refusal envelope at
`isError: false` (**ran-it**). Two holes remain — an unknown tool escapes as a
JSON-RPC protocol error although the daemon owns an `unknown-request` refusal
kind, and a rejected handler promise would flatten to a generic error string.

**A new defect not in the existing finding:** the served `inputSchema` declares
`additionalProperties: false` and **nobody enforces it** — not the MCP layer,
not the daemon (**ran-it**, both paths). An advertised law with no enforcer
anywhere. The gap run refined the blast radius usefully: the dangerous case the
lane named — a misspelled `expectedHead` — is **safe**, caught by
`requireSessionFields`; but a misspelled *optional* field is not. `predecesor`
silently opens a handle to the predecessor round itself with `ok: true`, and
`assertedDigst` silently skips the caller's identity pin (**ran-it**).

**Elicitation stays refused, and the reason hardens.** At the 2026-07-28
revision elicitation became a value inside a result, and foldlab's
refusal-plus-`next`-plus-session-head is already that shape and strictly
stronger on the axis that matters: the spec's request state is a decision
clients must not read, foldlab's travelling state is evidence they must verify.
The mechanism is still refused because a fill is a seat-attributed journal
append with no place for a form-sourced principal, and because the flat-schema
subset would carry some holes and not others. *Verifier caveat, material:* the
proposed posture's stated cost names the wrong constraint — the binding
requirement is the server-side integrity **MUST** on request state that
influences business logic, and the spec's one escape hatch (omit integrity only
when tampering can cause nothing worse than request failure) is the argument
that needed making.

**The lane's strongest on-thesis contribution** is the frontier deficit: the
daemon knows the legal moves and discloses them **only on refusal**, so a client
learns what it may do only after doing something wrong (**ran-it**, six round
trips measured). The gap dogfood then settled the priority: that is the
*second* defect, not the binding one (§1.2), and it measured the contrast — 16
round trips with 13 undetermined guesses on the protocol path, versus 1 round
trip and 12 worked examples on the type path that *has* a frontier.

*Verifier caveats, material, on evidence hygiene:* the refusal-vocabulary check
ran against **one** tool with an undisclosed longest-enum-wins heuristic and
compared against a TypeScript constant rather than the pinned manifest the law
names; and a RAN-IT badge sits on a lost-response-retry-against-close paragraph
whose central case was never run (the two cited transcripts are a first close
and a post-close fill). Both conclusions may well be right; neither is carried
by the run as recorded.

### 2.5 Verified prior art — CRDTs, content addressing, mechanized proofs

Record: `…\scratchpad\wf\verified-prior-art\report.md`.

**One finding is excluded as fatal and is not used anywhere in this document.**
The lane's claim that `@foldlab/moves` is a *shipped, published* kernel exposing
a forgery channel to external consumers — and the semver/breaking-change cost
and reversal built on it — is contradicted by the very file cited as evidence:
`packages/moves/package.json` reads `"private": true`, `"version": "0.0.0"`
(**primary-source**, confirmed here). There are no external consumers. The
underlying fact survives and is worth keeping: the model's move alphabet
(fill/dispute/decide) strictly contains the wire's (fill/close), so the model
over-approximates the daemon.

The lane's real value is elsewhere, and it is high: it **ran the Lean model**
rather than reading it, and priced three design choices with executed
experiments (§3).

Three further caveats the parent should carry:

- *material* — the headline "the estate presents bag-union-removes-clocks as a
  finding" is false. The estate already cites Shapiro et al. and disclaims
  novelty in nearly the same words (`docs/design/2026-08-14-learning-by-refutation.md:432`:
  "This is not a new theorem"). The genuinely new import is **Burckhardt et al.,
  POPL 2014**, which appears nowhere in the estate and supplies the defensible
  sentence (§3.1).
- *material* — the CALM framing is likewise already in the estate's research
  corpus with identical citations. What is new is applying it to close
  authority, which is sound and worth stating.
- *material* — "the estate's confluence theorem is strictly stronger than
  Gomes et al.'s" is a category error: a generic framework result over an
  arbitrary operation set necessarily assumes commutation and causal
  consistency; a theorem about one operation set where everything commutes is a
  special case, not a strengthening. The report's own body concedes this.
- *material* — the plurality self-supersession result is real (§3.2) but "this
  is what ships" is wrong twice: the shipped fence is seat-priority, and the
  bootstrap protocol declares `successor-round`, under which the exact probed
  self-correction refuses.
- *minor* — `canonicalRepairCandidates` is a model identifier; the daemon's
  function is `canonicalCandidates` (`protocol_step.go:125`). The behavioural
  claim (disputes are synthesized, never accepted from a caller) is correct.

### 2.6 The three gap runs

All three closed holes the critic identified after the first pass, and all
three changed conclusions rather than merely confirming them.

- **Frontier pricing** (`…\wf\gap-settle-the-frontier-contradictory-cost-a\`) —
  settled §1.3. Both disputing lanes wrong in opposite directions; the real cost
  is a cross-language lockstep; the requested shape is undischargeable for
  protocol holes; and a catalog-derived frontier would break the reply's
  fold-of-one-journal property.
- **Agent dogfood** (`…\wf\gap-nobody-has-driven-a-protocol-session-wit\`) —
  settled §1.2. All five suites were re-run green on that tree first and the
  repo was not modified. The evidence index lists every JSON-RPC frame in both
  directions.
- **Forgeable principals under replay**
  (`…\wf\gap-forgeable-principals-verify-on-read-may-\`) — settled §1.1, voided
  one recommendation, found one new defect, and evaluated the question in Lean:
  no theorem's meaning depends on an authentic holder, because a single forger
  reproduces the exact evidence pair-set two genuine holders would produce, as
  the same term, and all frozen theorems remain kernel-clean (**ran-it**).

---

## 3. Refutations — where an experiment or the literature contradicts an estate assumption

These get top billing because they are the analysis's most valuable output.

### 3.1 "Bag union removes the need for vector clocks" is 2011 — but the estate already knew, and the real import is different

The per-hole evidence set is a grow-only set of holder-attributed pairs — the
textbook convergent-replicated-datatype example — and the convergence result is
Shapiro et al., INRIA RR-7506 (2011) (**primary-source**). The estate already
cites it and already disclaims novelty, so the *refutation* is smaller than
claimed. **What is genuinely absent is Burckhardt et al., POPL 2014**, whose
visibility/arbitration vocabulary gives the sentence the estate should be
making: *arbitration is a declared constant of the protocol value rather than a
function of the execution.* Last-writer-wins derives arbitration from
timestamps, which is why it needs clocks; foldlab declares it at authoring time.
That claim is both stronger and more defensible than the one currently written.

### 3.2 Keeping every candidate is not strictly better than a clock-pruned conflict set

**ran-it** (Lean model evaluated directly): a seat that corrects its own fill
leaves both values in the bag, and the plurality rule then returns the
**retracted** one, counting the seat's own superseded fill as a vote against its
live one. Self-supersession is inexpressible without causal metadata — precisely
the cost a multi-value register pays version vectors to avoid. The trade is
better on provenance and worse on supersession, and it is written down in
neither `VERIFICATION.md` nor `SLICE.md`.

*Sizing correction (verifier, material):* the shipped fence is seat-priority,
and the bootstrap protocol declares `successor-round`, under which a
contributing seat's differing value refuses. So this is not live product
behaviour. **What the gap run then found is live and worse:** single-seat plus
`absorb` plus a self-differing value wedges the session permanently open with
daemon **silence** — one connection, no forgery (**ran-it**).

### 3.3 "The fence removes the need for coordination" would be false

Read the hypotheses precisely: the fence-determinism theorem quantifies over
runs of the **same bag** (**primary-source**). It says any sound rule decides
identically given the same candidate set; it does not say two parties who have
seen different sets agree. Something must still establish that the candidate set
is complete — and the estate has built exactly that as declared close authority.
That is the coordination point the CALM result predicts is unavoidable, and it
should be *stated* as such, because the false sentence is an easy one to write.

### 3.4 "Canonical bytes is canonical bytes"

**ran-it**: RFC 8785 and IPLD DAG-CBOR disagree about the order of two **ASCII**
keys — 3 of 7 probed pairs diverge, including `"z"` vs `"ab"` and `"b"` vs
`"aa"` — because DAG-CBOR's sort key includes the length prefix and RFC 8785
sorts by UTF-16 code units. A digest is an identity only relative to a *named*
canonicalization, which is why naming RFC 8785 in the definition of structural
digest is right rather than pedantic. DAG-CBOR independently forbids NaN and
infinities and discourages negative zero — corroboration from a second standards
lineage that dropping the float leaf is the direction the field converges on
when it wants determinism.

### 3.5 Do not adopt Effect's durable-execution surface for the action-hole engine

**ran-it**: the execution identity is a 128-bit prefix of SHA-256 over a
delimiter-ambiguous pre-image, and the key function is developer-supplied with
no canonicality requirement — the obvious implementation is key-order sensitive,
so the same *value* can yield two identities. The collision is narrower than it
first appears (the workflow name is carried outside the digest by the entity
addressing), and the lane checked that specifically rather than reporting an
exploit. **primary-source**: real durability requires a shard-runner control
plane and SQL storage beside a daemon whose entire substrate is a directory.

### 3.6 The demand signal offered for a plurality fence does not support it

*Verifier finding, material.* The lane's motivating measurement — "two of three
methods produced the identical answer and the fence ignored it" — does not hold:
the three candidate **values** are all distinct (they agree only on one
subfield; their method records differ). The proved plurality rule ranks by
multiplicity of the **whole value**, so a shipped plurality rule would have
scored 1/1/1 and fallen through to the same tie-break. It would not have counted
the agreement either. The underlying gap (the wire's fence vocabulary is a
singleton, `protocol.go:173`) is real and independently sourced; only the
evidence is miscast. Separately, the cited impossibility ceiling is under
disposition, not established: `VERIFICATION.md:44` and `:776` reclassify the
framing pending MOVES-2, which the model audit calls a pigeonhole triviality.

**The genuine absence:** the shipped seat-priority fence — a dictatorship in
social-choice terms, where the first fence-order seat holding any candidate
decides unconditionally — has **no** mechanized manipulation analysis anywhere.
`Violations.lean` analyses the two rules that are not shipped.

### 3.7 Multiparty session types should be explicitly refused

**primary-source**, with the machine-checked artifacts enumerated: the MPST
family's central theorems are about deadlock freedom and session fidelity under
*ordered* interaction. foldlab has no ordered interactions and nothing blocks —
fills are total, refusals are data with a `next`. Adopting MPST would mean
reintroducing sequencing in order to prove the absence of a hazard sequencing
creates. The refusal should be written down, because "protocol" is a word that
will keep drawing reviewers there. **One idea is worth reusing:** *projection* —
a mechanically derived per-seat statement of what you may do, with a soundness
theorem relating it to the global object. That is what a frontier wants to be,
and the estate has no theorem relating its per-seat surface to the protocol
value. **Absence recorded:** no machine-checked prior art was found for
unordered, completion-set protocol semantics.

### 3.8 Two smaller refutations of the proposal's own instincts

- "Pin to head" → the head of a closed session keeps moving; pin to the
  final-state digest (**ran-it**, §2.1).
- "A parent hole filled with a closed child is a stable predicate" → `filled` is
  demoted by any clashing fill (**ran-it**), with the verifier's correction that
  a conditional stability theorem does exist for value-consistent single-seat
  runs.

### 3.9 A Lean CRDT framework now exists, and it confirms the hygiene gates

**primary-source**: *Sal* (arXiv:2603.27202, PaPoC 2026) is a Lean 4 framework
verifying 30 replicated datatypes. "There is no Lean CRDT prior art" was true
until 2026-03 and is now false. Its default SMT stage **admits goals** rather
than reconstructing proofs — precisely the channel `verify/moves`'s
axiom-footprint gate exists to catch. The gates are not paranoia about a
hypothetical; the field's newest Lean tool ships that channel on by design.
Adopting Sal is separately priced and declined: the model today has **zero**
dependencies, not even Mathlib, and Sal needs Mathlib, a solver fork, and Z3, at
a different toolchain pin.

---

## 4. The focused development sequence

Ranked. Each entry names its evidence, its grill status (**PROPOSED** means the
concept is ungrilled and the grill questions are listed), its consumer, its
cost, and its reversal. Items 1–3 are the ones that change what the system *is*;
the rest are hygiene, ordering, and proof.

### 1. Type the meaning-carrying tool arguments at the MCP seam

**Evidence** — **ran-it**: two quarantined agent runs, 153 tool calls, $11.67,
zero protocols created, zero fills reached; 150/150 untyped arguments arrived as
JSON-encoded strings; a foldlab-free control server attributes the cause to the
empty schema (`codegen.ts:216-217`), with `{"type":"object"}` arriving correctly.

**Grill: PROPOSED.** Questions: (a) is `{"type":"object"}` *honest* for an
`opaque` hole, given opaque legitimately admits scalars too — or does the fix
belong in argument coercion at the MCP layer rather than in schema derivation?
(b) does the daemon owe a refusal that starts the field-by-field ladder when it
receives a string where a struct was declared, instead of today's single generic
type refusal? (c) this moves the *derived* surface (inputSchema feeds the tool
list) but not the contract — confirm against the tool-list wall before landing.

**Consumer** — any LLM driving the MCP surface, which is the headline claim of
the entire orchestration program.

**Cost** — a change in what is advertised on the wire, so the tool-list
projection digest moves and any wall pinned to it regenerates. If the daemon
also gains a teaching refusal, that is a wire-behaviour change with fixture
movement. Adds nothing to the trusted base.

**Reversal** — cheap: the schema derivation is one `switch` arm and the wall
regenerates. Expensive only if a client is written against the untyped shape in
the interim, which is an argument for doing it now.

### 2. Decide the attribution scheme, and gate attributed-evidence demos on it

**Evidence** — §1.1, three independent **ran-it** results plus a Lean check that
no current theorem's meaning depends on an authentic holder.

**Grill: PROPOSED** — the *assumption* is already declared (D17, protocol grill
G4, MOVES-4); the *interaction* and the staging are not. Questions: (a) is a
connection-identity check worth shipping first, given a shared application
password makes it inert without per-principal credentials? (b) does
`signed-principals` become a new declared identity-scheme value, or an in-place
redefinition of `trusted-principals` under the hard-cutover ruling? (c) does
`expectedHead` join the protocol fill request — required, since journals are
world-readable and an unbound signature is replayable? (d) what does
verify-on-read then owe: re-verify a signature, or keep re-deriving a seat? (e)
key rotation costs a session because bindings are immutable and in identity — is
that correct, or a defect? (f) the wedged-session defect (single-seat + absorb +
self-differing value, daemon silent) needs its own disposition regardless.

**Consumer** — every acceptance record that mints seat-attributed evidence (P2,
P5, the ontology demo), the sub-session hole, and any multi-agent use at all.

**Cost** — stage one needs an authentication service to operate and adds one
refusal kind. Stage two is a hard in-place redefinition of the protocol and
session grammars: every existing session key changes, and one signature
primitive enters the trusted base (available dependency-free on both runtimes,
**ran-it**).

**Reversal** — stage one is cheap and changes no grammar. Stage two is the most
expensive item in this document; reversing it means a second in-place
redefinition and a second invalidation of every session key.

### 3. Add a state-anchored, seat-relative frontier to the protocol-session state reply

**Evidence** — §1.3, entirely **ran-it**: the true cost (3 edits, 1 red test,
zero fixture regenerations, contract bytes move but nothing digests them), the
undischargeability of the `legal`-with-examples shape for protocol holes, and
the catalog-coupling hazard (1,440 → 1,507 bytes with an unchanged head and no
session move).

**Grill: PROPOSED.** Questions: (a) exact payload — per hole: state, declared
seats, type digest, counts-toward-completion, fence rule. Does it carry a worked
example at all, given the probes say that obligation is undischargeable for
`opaque` holes? (b) if any field is catalog-derived, does the reply gain a
catalog-head anchor as the type-authoring side already has — and does that make
the reply no longer a pure fold of one journal? (c) `FINDING-FRONTIER-001`'s
semantic half is unratified: what does "legal" assert — immediate acceptance, or
admits-a-closed-completion? (d) is a per-principal projection honest while
principals are forgeable (interacts with item 2)? (e) does a `decided_by:
{rule, seat}` field ship at the same time — it is derivable, not new
information, and closes the same six-hop problem for closed rounds.

**Consumer** — every human-facing and agent-facing client rendering "what may I
do next"; today each one re-implements the same join and the join can drift from
the daemon's own step semantics.

**Cost** — a daemon slice plus its wall, plus the TypeScript decoder in
lockstep. The contract's canonical bytes move, which costs nothing today
*because* nothing pins them — a fact worth noticing rather than relying on.

**Reversal** — one revert while no consumer exists, which is an argument for
doing it before a consumer exists.

### 4. Split the predecessor refusal: "child not closed yet" is absence

**Evidence** — **ran-it**, four rows read off the wire; today an open child
yields `digest-mismatch`/structural with an empty `Expected`.

**Grill: PROPOSED, small.** Questions: (a) a new refusal kind forces a new
refusal-sort grammar digest and a re-pin of all four restatements — acceptable
now, or batched with item 2's refusal kind? (b) is "the child has not closed
yet" absence relative to *this venue's* head or to the child's status? They
differ the moment a second venue exists.

**Consumer** — any agent repair policy. A structural refusal says "do not
retry"; the correct advice is "retry after the child closes". Rare today, normal
under a sub-session hole.

**Cost** — one refusal kind, one digest re-pin, no trusted-base change.
**Reversal** — trivial in code; the digest re-pin would be redone.

### 5. Close the two cheapest MCP drift channels

**Evidence** — **ran-it**, reproduced by the verifier: served-equals-derived at
byte level for the projected fields; the refusal-kind enum agrees today and is
walled by nothing; and the annotations object carries a **fourth** served key
that both the lane's projection and the shipped wall drop.

**Grill: none needed** — these are tests, not concepts.

**Consumer** — anyone who believes the file header's claim that "drift is
structurally impossible", which is currently true of half the descriptor.

**Cost** — roughly 45 lines across two test files plus one generated fixture
pinning the **pair** (contract digest → tool-list digest); pinning the tool-list
digest alone would freeze the surface and forbid the daemon from growing a
request. Per the generated-vectors ruling the fixture is emitted by executing
the daemon and must regenerate byte-identically. The wall must cover the whole
annotations object, not a 3-of-4 subset.

**Reversal** — delete the files. Free.

### 6. Decide the `additionalProperties` claim

**Evidence** — **ran-it**: advertised at the seam, enforced by neither the MCP
layer nor the daemon; a misspelled *required* session field is safe, but
`predecesor` silently opens a handle to the predecessor round with `ok: true`
and `assertedDigst` silently skips the caller's identity pin.

**Grill: PROPOSED.** Questions: (a) constrained decode applied to the request
envelope, not only the value — is that the rule, and does it apply to every
handler uniformly? (b) or does the advertised schema stop claiming it? (c)
either way, `predecesor`-class silent semantic changes need their own answer,
since those are not typos in an unread field but typos that change what round
you are in.

**Consumer** — every client that trusts the advertised schema; the estate's own
"constrained decode refuses, never repairs" law.

**Cost** — option (a) is a wire-behaviour change that moves refusal fixtures and
could break any caller sending extra fields today. Option (b) permanently
forecloses typo detection at the seam and leaves the advertised schema weaker
than the grammar.

**Reversal** — (a) is a one-line revert plus fixture regeneration; (b) is not
reversible in a shipped client's expectations.

### 7. Dispatch the P2 process-design acceptance demo — after item 2 is decided

**Evidence** — **ran-it**, digest equality measured three times; both residuals
named in §1.4; the fabricated-certificate control exists and must ship beside
the honest run.

**Grill: not required** for the demo itself; the *ordering* is the ruling the
operator owes.

**Consumer** — the tower's middle (a protocol produced *inside* a closed session
and then run), and the sub-session grill, which would then open with
measurements instead of instincts.

**Cost** — one dispatch slice, no daemon change, no new wire. It adds a
*convention* to the trusted base — "the designed-process hole is opaque and the
reader re-derives the tie" — and a record that omits either residual would be
selling an unchecked hole as a checked one.

**Reversal** — delete the runner and revert one commit. No wire changed, no seam
status moved.

### 8. Land REF-1 (the session-status layer in `Moves.Wire`)

**Evidence** — **primary-source**: status, outcome, sealed, and the completion
arithmetic are absent from the Lean model, so both sub-session theorems cannot
be *stated*. Spec 24 already wants this layer.

**Grill: already specced** (`scratch/dispatch/24-ref1-wire-model-spec.md`);
this is dispatch, not grill.

**Consumer** — the two sub-session theorems, and the refinement equation one
rung up.

**Cost** — more proved surface to keep green. **Reversal** — this only orders
work already wanted; nothing is spent that would be wasted.

### 9. Give the shipped fence a mechanized manipulation profile

**Evidence** — **primary-source**: `Violations.lean` analyses the minimum and
plurality rules; the shipped rule is neither.

**Grill: PROPOSED.** Question: does the operator want the shipped rule's
dictatorship property written down as a theorem, or as prose in the ledger? The
theorem has a consumer only under the first answer — and one of this analysis's
own drift findings is that proposing theorems without consumers is exactly the
failure mode the estate's build-behind-consumers rule forbids.

**Cost** — one theorem plus a roster entry; the gate's orphan rule makes the
surface grow. It will state plainly that the shipped rule is a dictatorship,
which is true and deliberate but currently unwritten.

**Reversal** — delete theorem and roster line; the gate makes the removal
visible rather than silent.

### 10. Small, cheap, and independently justified

Each is a one-liner with a real cost stated:

- **Stop printing the daemon credential on stdout** — any log capture is a
  credential capture. Cost: every harness parsing the ready line changes.
  Reversal: trivial.
- **Name the Windows power-durable caveat in the substrate envelope** —
  power-durable delivers synchronous file writes but no directory-metadata fsync
  on the operator's own platform (**primary-source**, pinned server source).
  Cost: either a fifth lifecycle refusal that refuses the operator's platform,
  or a weakened declared assumption there. Reversal: trivial. Silence is the one
  option the honesty ladder does not allow.
- **Write down "one CAS, two keyings"** — the journal and the effector share one
  subject-scoped compare-and-set, keyed by position and by revision. Cost: the
  writing. It collapses two apparent subsystems into one substrate assumption.
- **Tell the compaction lane about the parent-replayability coupling** — a
  sub-session hole would make a child's journal load-bearing for its parents'
  replay. Cost: a constraint on an unstarted lane. Reversal: free now, very
  expensive if compaction ships first.
- **Correct the P4 sentence in the use-catalog draft** — "a pipeline program is
  already data with a digest" is false of this tree. Cost: a prose edit; leaving
  it could license a slice with no substrate.

### Decided *not* to do now

- **Do not add `plurality` to the wire** (§3.6) — the demand signal offered does
  not exercise what the law computes, and a fence-rule name is identity-bearing
  in every protocol that uses it.
- **Do not adopt Effect's durable-execution surface** (§3.5) — rebuild the
  vendored effector instead, keeping the re-derived work digest as identity.
- **Do not adopt elicitation** (§2.4) — but pre-decide the posture in one
  paragraph, sized against the server-side integrity requirement rather than the
  client-side inspection clause.
- **Do not adopt MPST** (§3.7) — and write the refusal down.
- **Do not adopt Sal into `verify/moves`** (§3.9) — read it for its
  counterexample machinery; record the consideration and the reason.
- **Do not build a session-tree gauntlet yet** — no such instrument exists for
  this object, and its specification is downstream of items 2 and 8.

---

## 5. Sources

### Underlying scratch records (this workflow, 2026-08-16)

All under
`C:\Users\kokok\AppData\Local\Temp\claude\C--Users-kokok-Dev-foldlab\3c6800bd-d259-4f7d-a6b7-4817e42a5c9c\scratchpad\wf\`.
**Session-scoped and ephemeral — re-run before building on any of it.**

- `subsession-hole\report.md` — G1–G9, with `probe1-transcript.txt` (TypeScript
  kernel), `probe2-transcript.txt` and `probe3-transcript.txt` (live daemon over
  embedded JetStream), `demangeon-honda.txt` (local PDF text extraction).
- `pattern-catalog\report.txt` — P1–P6 executed, with `task49.stdout`,
  `p2.stdout`, `p3.stdout`, `p5p1.stdout`, `p6.stdout`, `ident.stdout`,
  `subsession.stdout`, `mcp.stdout`, both suite logs, and before/after
  `git status` captures.
- `production-architecture\report.txt` — with `transcripts\01-…11-…`, notably
  `04-seat-authority.txt`, `06-effect-execid.txt`, `07-git-cas.txt`,
  `08-git-vs-canonical.txt`, `09-cross-venue-mirror.txt`, `11-ed25519.txt`.
- `mcp-core-device\report.md` — with `out\01-…41-…` including
  `11-diff-report.json` (the byte diff), `21-refusal-kind-agreement.json`,
  `23-after-kill.json`, and `99-raw-transcript.txt`.
- `verified-prior-art\report.md` — with `Probe.lean`, `Probe2.lean`,
  `probe-transcript.txt`, `sortdiverge.ts`, and the Git derivation artifacts.
- `gap-settle-the-frontier-contradictory-cost-a\` — `BASELINE.txt`,
  `probe-protocol-holes.txt`, `probe-catalog-coupling.txt`, `mod2-ts.txt`, and
  baseline/modified suite logs on both sides.
- `gap-nobody-has-driven-a-protocol-session-wit\EVIDENCE-INDEX.txt` — plus
  `transcripts\` (every JSON-RPC frame both directions) and `agent-runs\`
  (`run4`, `run5-typed`, `echo-probe`, `echo-strict` streams).
- `gap-forgeable-principals-verify-on-read-may-\` — `e1-transcript.md` through
  `e7-transcript.md`, `E5Probe.lean`, `e5-lean-transcript.txt`,
  `e4-mcp.stdout`.

### Repository, read 2026-08-16 on `agent/codex/kernel-hygiene-gates`

- `proto/go/protod/contract.go` — `vFrontierEntry` (:86-92); the
  `protocol.session.state` descriptor and its `reply` member (:363-367).
- `proto/go/protod/protocol_session.go` — session key derivation (:140-149);
  fill and close seat checks (:207-215, :300-307); replay re-checks (:415, :426);
  `principalSeat` (:525-532); `validatePredecessor` (:450-474); retention marks.
- `proto/go/protod/protocol_step.go` — the pure step seam; `fenceChoice`
  (:349-360); `protocolFinalStateDigest` (:367-383); `canonicalCandidates` (:125).
- `proto/go/protod/value_check.go`, `catalog.go`, `recursion.go`, `refusal.go`,
  `ingress.go` (:47-49), `session.go`, `concierge.go`, `dispatch.go`, `auth.go`,
  `protod.go`, `protocol.go` (:173, :220, :235-236).
- `proto/go/protod/FINDING-FRONTIER-001.md` — the three grammar dispositions
  (:40-53), disposition 1 taken, semantic half unratified.
- `proto/ts/src/` — `codegen.ts` (:216-217, the `opaque` case), `mcp.ts`
  (:31-65, :112-118, :123-181, :197-270), `wire.ts` (:28-43, :237-249),
  `client.ts`, `session.ts`, `jcs.ts`, `protocol.ts`.
- `proto/ts/test/` — `mcp.test.ts`, `refusal-sort.test.ts`,
  `protocol-moves.test.ts`.
- `proto/ts/FINDING-MCP-001.md`, `FINDING-MCP-PATH-001.md`,
  `FINDING-MCP-EMPTY-CATALOG-001.md` — three open, unratified findings.
- `proto/wire/CONTRACT.md`; `proto/wire/fixtures/` (no contract fixture exists).
- `proto/DECISIONS.md` — :2714 lists "add the digest to `contract.describe`"
  among rejected alternatives; D104 close authority (:2562-2580).
- `go/journal/journal.go` — the standing shape gate, CAS append, verify-on-read.
- `packages/moves/package.json` — `"private": true`, `"version": "0.0.0"`;
  `packages/moves/src/kernel.ts`.
- `verify/moves/Moves/Model.lean` — `single_seat_stable` (:1546),
  `SeatConsistent` (:1501), `runRepair_single_seat` (:1504), `repairK_comm`
  (:1789), `runRepairK_perm` (:1806-1810), fence rules (:1280-1400),
  `no_fair_resolute_fence` (:1948); `Spec.lean`; `SpecProofs.lean`;
  `Violations.lean`; `lakefile.toml`, `lake-manifest.json` (`packages: []`),
  `lean-toolchain` (v4.33.0).
- `VERIFICATION.md` — the E2 claim row (:44); the bounds paragraph and the
  MOVES-2 reclassification (:770-784).
- `SLICE.md`; `CONTEXT.md`; `AGENTS.md`; `docs/gauntlet/`.
- `docs/design/2026-08-14-learning-by-refutation.md` (:419-432),
  `docs/design/2026-08-14-mcp-surface-deep-read.md`,
  `docs/design/2026-08-16-ref0-extraction-grill-record.md`.
- `docs/research/2026-08-13-expressive-power-dossier.md`,
  `2026-08-13-number-determinism-dossier.md`,
  `2026-08-14-lit-monotone-determinism.md`,
  `2026-08-15-model-audit-findings.md`, `2026-08-16-rq9-rfc8785-numbers.md`.
- `scratch/dispatch/` — `17-the-refinement-ladder.md`,
  `21-the-use-catalog.md`, `22-kernel-hygiene-gates.md`,
  `24-ref1-wire-model-spec.md`, `04-ontology-demo.md`.

### Vendored dependency source, read in place 2026-08-16

- `repos/effect/packages/effect/` at 4.0.0-rc.108 — `unstable/ai/McpServer.ts`
  (unconditional capability advertisement :1937-1943; unknown-tool :297; defect
  mapping :1337), `unstable/ai/Tool.ts` (:1292, "handler receives `unknown`, no
  validation"), `unstable/workflow/Workflow.ts` (:59, :317),
  `unstable/workflow/internal/crypto.ts`, `unstable/cluster/Sharding.ts`.
- `nats.go@v1.53.1/jetstream/kv.go`; `nats-server@v2.14.4/server/stream.go`
  (:6441-6465), `server/filestore.go` (:13946-13962, the Windows
  directory-fsync exclusion).

### External sources, retrieved 2026-08-16

- Shapiro, Preguiça, Baquero, Zawirski. *A comprehensive study of Convergent and
  Commutative Replicated Data Types.* INRIA RR-7506, 2011.
- Burckhardt, Gotsman, Yang, Zawirski. *Replicated Data Types: Specification,
  Verification, Optimality.* POPL 2014. **The genuinely new import.**
- Gomes, Kleppmann, Mulligan, Beresford. *Verifying Strong Eventual Consistency
  in Distributed Systems.* OOPSLA 2017; AFP entry, `Convergence.thy` and
  `Network.thy` quoted verbatim. Paper body unread — **lead**.
- Baquero, Almeida, Shoker. *Pure Operation-Based Replicated Data Types.*
  arXiv:1710.04469; DAIS 2014.
- Hellerstein, Alvaro. *Keeping CALM.* CACM 2020; original proof Ameloot, Neven,
  Van den Bussche, JACM 2013.
- Kleppmann, Howard. *Byzantine Eventual Consistency…* arXiv:2012.00472;
  Kleppmann, *Making CRDTs Byzantine Fault Tolerant*, PaPoC 2022 — the shape of
  cure for §1.1.
- Ramesh, Soundarapandian, Sivaramakrishnan. *Sal: Multi-modal Verification of
  Replicated Data Types.* arXiv:2603.27202, 2026-03-28; repo
  `github.com/fplaunchpad/sal`. Not run — **primary-source** on repository text.
- Demangeon, Honda. *Nested Protocols in Session Types.* CONCUR 2012; PDF
  retrieved and text-extracted locally. Typing rules and proofs unread.
- Castro-Perez, Ferreira, Gheri, Yoshida. *Zooid.* PLDI 2021; Scalas, Yoshida,
  *Less is More*, POPL 2019; *Complete Multiparty Session Type Projection with
  Automata*, CAV 2023.
- IPLD DAG-CBOR specification (status "Descriptive — Draft").
- Model Context Protocol specification, revision 2026-07-28 — changelog,
  `basic/patterns/mrtr`, `server/tools`, `server/utilities/completion`, and
  SEP-2484 (Final).
- Temporal *Workflow Definition*; Kurrent/EventStoreDB *Appending events*;
  Apache Kafka *Log Compaction* (**one remove from primary** — the canonical
  page did not render to automated retrieval); Nix manual 2.28 *Store Path*
  (**documentary only** — Nix is not installed here); NATS *Source and Mirror*.
- Secondary, recorded as **lead** and not relied on: MCP schema-drift blog
  literature; two MCP security papers surfaced but not fetched; agent-coordination
  and provenance-extraction preprints surfaced by the pattern lane.

---

## 6. Honest gaps — what this whole analysis could not establish

1. **Nobody built the sub-session hole.** Every claim about how it would compose
   is composition reasoning over probes that stand in for the real thing.
2. **Everything is single-daemon, single-store, loopback.** Cross-venue trust,
   journal mirroring, divergent catalog heads, and federation were reasoned from
   doctrine or exercised in one process, never across a network.
3. **No scale measurement anywhere.** Journals of 3–11 entries; the catalog scan
   that a client-side frontier requires was measured at 11 entries, not 11,000;
   no benchmark of the per-fill journal replay a sub-session gate would add.
4. **The upstream MCP conformance suite was never run** — named by its own lane
   as the single highest-value unrun experiment, and it would produce a number
   that cannot be un-known.
5. **No pin bump.** Every claim about the 2026-07-28 MCP revision is spec text,
   not observed behaviour; the shipped adapter implements the prior revision.
6. **The monotone-gate confluence theorem is stated, not formalized.** Whether
   the fairness assumption can even be expressed in the model's idiom is
   unchecked, and no independent monotone gate was tested.
7. **Signed moves are designed, not prototyped.** Primitive availability was
   verified on both runtimes; the wire-shape cost is estimated from the grammar.
8. **Two agent runs are not a sample.** Same model family, same harness, same
   goal file. The failure mode is mechanically attributed, but the *rate* is not
   measured, and no run was attempted after a fix.
9. **The `additionalProperties` blast radius is partially measured** — two
   silent-semantic-change cases found, no exhaustive per-handler sweep.
10. **The parent→child lock order is a deadlock surface identified and not
    exercised**, as is the per-session mutex under a parent/child pair.
11. **Several sources are one remove from primary or unread**: the Kafka design
    docs, the Gomes et al. body, the Demangeon-Honda typing rules, Nix (not
    installed), Sal (not run), Isabelle (not installed).
12. **The working tree moved throughout.** Concurrent lanes edited the model,
    the daemon, and the contract during this analysis; one lane's "suites green"
    is pinned to an earlier HEAD and a Go test failed later on a dirty tree.
    **Any dispatch acting on this document must re-run its gates on its own
    tree first.**
13. **The sweep's own instrument needs the reproduce-the-transcript
    discipline.** One fatal finding rested on a fabricated premise contradicted
    by the file it cited; two material findings traced to a recorded "I ran it"
    that did not reproduce; one RAN-IT badge sat over a case never run. All four
    were caught by verification rather than by the lanes, which is the system
    working — and is also the reason no claim here should be believed at a
    strength above the tier printed beside it.
