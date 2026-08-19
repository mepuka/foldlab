# The estate daemon — the server as an owned value, its state as declared facts, the protocol as transcribed vocabulary

Date: 2026-08-19. Status: **SPEC, COMMISSIONED** — operator ruling in
session, 2026-08-19: *adapt the substrate session plane document into a
specification for development of the estate-owned daemon that faithfully
manages the full lifecycle of the server and models the NATS server (with
claims we can eventually prove definitively), as well as adopts the NATS
message protocol so we fully declare and publish state as facts. We adopt
the NATS message protocol as vocabulary over the wire. Substrate session
is a declared fact.* Drafted by the Mac coordinator seat at `main`
`202e9768`.

**What the commission rules, and what it does not.** Four sentences are
RULED by the commission itself and are recorded as rulings in §1. Every
other decision this spec carries — option pins, credential minting,
specific walls — keeps its grill row (§8): recommended options are
stated and priced, none is foreclosed. The spec is grill-ready, not
grill-foregone.

**The posture transition, stated once.** The 2026-08-19 posture ruling —
privileged clients now, daemon later, activation the operator's act —
is not reversed; it is **executed**. This commission is the activation
of the roadmap marker (DEV-829) as a development target. Privileged
clients remain the *running* posture until the daemon's first slice
lands, and the substrate-session-plane record's posture-neutrality
property is what makes the transition safe: the same facts, minted under
either posture, with identical bytes. That property graduates here from
a design nicety to this spec's central provable claim (§5, CL-1).

**Law 10 and this file.** A design record is tracking-land: `file:line`
citations, ticket keys, and commands are lawful here and used
throughout. Nothing in this file is a projection source.

Sources, all read first-hand for this spec:

- `docs/design/2026-08-19-substrate-session-plane.md` — the parent
  record. Its measurements (§1, §3, §7), its three-faces taxonomy (§4),
  its session model (§5), and its decision sheet (§9) are the ground
  this spec stands on; where this spec says "measured", the measurement
  is that record's.
- `docs/research/2026-08-12-nats-server-as-abstraction.md` — the server
  as a Go value; the process-value/resource-plane split; the three
  topologies; mirrors at origin sequence numbers.
- `docs/research/2026-08-12-nats-agent-protocol.md` — the three wire
  shapes and the promotion rule, ratified in use.
- `docs/design/2026-08-19-algebra-engine-unification.md` — the engine:
  every estate sentence goes through the one door; the daemon adds
  carriage, never judgment.
- The kernel language: `verify/kernel/projections/prose.md` (the eight
  generators, the closure list) via the architecture-to-algebra
  discipline.
- Board: DEV-829 (the roadmap marker this activates), DEV-826
  (lifecycle/readiness), DEV-827 (pump disposition), DEV-781 (declared
  connect options), DEV-745 (the shuttle), DEV-779 (the register
  incarnation pin — the fence precedent §2.4 reuses).

---

## 0. For an outsider

Today the estate talks to a stock NATS message broker the way any
program does: it opens client connections to a separately-started server
process and asserts shapes it does not own. The daemon this spec
commissions is an estate-owned Go process that **embeds the server as a
scoped value** — constructs its options, starts it, gates on readiness,
drains it, shuts it down — and treats everything the server is and does
as **facts the estate declares**: what options it runs under, who is
connected, how healthy it is, when it entered lame duck, when it died.
No new protocol is invented: the vocabulary spoken over the wire is the
NATS protocol's own, transcribed from the pinned vendor source, and the
estate's discipline (canonical bytes, digests, append-only lanes, one
admission door) supplies what the product lacks: laws, refusal typing,
and claims a machine can check.

---

## 1. The four rulings the commission makes

- **R-1 — the daemon is commissioned.** DEV-829 graduates from roadmap
  marker to development target. The boundary drawn in the parent
  record's §6 table — which rows the daemon internalises (owner→server
  face wholesale: options, lifecycle, `$SYS`, monitoring, accounts),
  which stay client-plane forever (all of face b), which the daemon
  *enables* (face c: leafnodes, mirrors) — is adopted as the daemon's
  scope. SP-10's "this sheet does not price it" is superseded: this
  spec prices it.
- **R-2 — the substrate session is a declared fact.** SP-1 is ADOPTED
  at its recommended option: at establishment, groups 1–3 (the
  substrate's INFO declaration, the process's declared connect options,
  the estate's writ and asserted-shape set) fold into one canonical
  value; its digest is the session's name; reconnect mints a successor
  naming its predecessor; disconnection, drain, and close are facts
  citing the digest. The name **substrate session** is adopted to keep
  the three-session distinction (read session / protocol session /
  substrate session) load-bearing.
- **R-3 — the NATS protocol is the wire vocabulary, by transcription.**
  SP-4's transcription rule generalises from the client's eleven status
  events to the whole surface the estate speaks: protocol verbs,
  `$JS.API` subjects, `$SYS` event subjects, status event types, and
  the server's lifecycle surface are **transcribed from the pinned
  vendor source, never invented and never twinned**. A hand-designed
  state union, event name, or admin verb is the drift class this ruling
  refuses. The three wire shapes (journal facts / commitment registers
  / ephemeral chatter) and the promotion rule — *chatter accelerates;
  facts decide* — are confirmed as the carriage discipline.
- **R-4 — state is fully declared and published as facts.** Everything
  the estate knows about the substrate is either a declared value
  (options, schedules, shapes) or an emitted fact citing declared
  values (sessions, heartbeats, transitions, incarnations). A default
  nobody chose, a callback nobody else can see, and a status page
  nobody reads are the three shapes of undeclared state this ruling
  retires. Which *values* the pins take (reconnect bound, sync mode,
  `NoLog`) remain priced grill rows — R-4 rules that they become
  declared data, not what they are declared to be.

---

## 2. The algebra mapping

The engine stance governs: **admit and eval are the only two functions
that mean anything; everything the daemon adds is carriage.** The daemon
decides nothing — the door decides; the daemon carries. A "service"
below is a bundle of declared folds + a root + a writ.

### 2.1 The system, restated

One Go process owns one embedded NATS server whose durable identity is
its store directory. Estate processes (and the daemon itself, as its own
first client) hold client connections; each connection's establishment
folds into a substrate-session fact; heartbeats, transitions, and
teardown are further facts citing it. Presence, health, and lifecycle
are anchored folds over those lanes — never queries against the broker.
The broker's own event machinery (`$SYS`, status callbacks, monitoring
endpoints) is chatter and carriage: it may accelerate what the facts
determine and may never decide anything.

### 2.2 Truth plane — facts that accumulate

| Fact | Kind | Emitted by | Why never retracted |
| --- | --- | --- | --- |
| connect-options declaration | declared value (client config) | the connecting process, at spine build | a configuration spoken is a sentence; revision is a successor declaration |
| server-options declaration | declared value (server config) | the daemon, before start (interim: the harness, transcribed) | same; "we changed the reconnect bound" becomes a truth-plane difference |
| substrate-session established | evidence, session lane | the status pump (client posture) / the daemon (in-process) | identity of one TCP connection's establishment; a reconnect is a *new* fact, never an edit |
| substrate-session ended | evidence, session lane | same emitter | cites the session digest and the terminal cause the pin reports (`nc.closed()` resolves it — measured) |
| heartbeat tick | evidence, heartbeat lane | the heartbeat seat holding a declared schedule | `{session, schedule, firing, claimed, health, health-source}` — the occurrence key makes racing emitters byte-identical |
| connection transition | evidence, session lane | the status pump | one fact per transcribed status event; the four non-transition events (`ping`, `slowConsumer`, `update`, `error`) are readings-within-a-state, emitted as observations, never states |
| incarnation established / retired | evidence, incarnation lane | the daemon supervisor | one server run over one store dir; successor names predecessor; a crash leaves an unretired incarnation whose heartbeat lane goes quiet — absence, honestly |
| asserted-shape set | declared value, cited by the session fact | the connecting layer at open | fixes DEV-781's empty-memo ambiguity: re-assertion after reconnect has a declared target |
| readiness observation | evidence, incarnation lane | the daemon (in-process `Healthz`) / interim: the probe SP-6 prices | an observation at a position; never a promise |

### 2.3 Directory plane — names

| Name | Who rebinds (writ) | Read discipline |
| --- | --- | --- |
| the substrate (per store-dir digest) | the daemon supervisor's writ, fenced | greatest incarnation fact — "the current server" is a greatest-position read, exactly the provision fold |
| current server options | operator-scoped config writ | greatest declared options value; a running incarnation cites the exact options digest it started under (pinned read) |
| current connect options (per layer) | transport writ | greatest per layer; the session fact pins the digest it connected under |
| `ServerName` | operator (SP-7 row) | if left unset it aliases a per-restart NUID — the one human coordinate the session fact would carry; the row stays priced |

### 2.4 Fence inventory — survivors of the demotion challenge

Every candidate fence was pushed toward demotion first; two survived,
two demoted, one is out of the algebra entirely.

| Exclusive act | The failed demotion | Token/writ holder |
| --- | --- | --- |
| run the server over a store dir | two servers over one `StoreDir` corrupt the store — the world outside needs exactly one; both-run-and-choose-later is not available | the incarnation register, revision-CAS with the DEV-779 incarnation-pin discipline; `decide` lands the incarnation |
| lame-duck / shutdown disposition | "close is a decide at the declared authority" — the one non-monotone act a session contains; racing dispositions would race an external side effect (the drain) | the daemon supervisor's token at the incarnation register; the `ldm` fact is what the shuttle (DEV-745) reacts to |
| **demoted:** readiness | "the daemon must wait until ready" needs no winner — readiness observations are facts; the gate is carriage ordering, not meaning | — (liveness plane, §2.6) |
| **demoted:** presence | "who is connected" needs no authority — both `/connz` and `$SYS` were candidate oracles and both are refused as authorities; presence is a fold (parent record §5.4, measured: `$SYS` is unreachable at the pins anyway) | — (fold table) |
| **outside the algebra:** minting a system-account credential | an operator act with blast radius (kick, reload); T5 on the cost ladder | operator (SP-3, still open) |

### 2.5 Fold table — every question the system answers

| Question | Reduction | Rung | Carrier | Anchor policy |
| --- | --- | --- | --- | --- |
| who is connected (presence) | per-session: established ∧ ¬ended, keyed by session digest | commutative + idempotent → set plane | session lane; fold state in CAS | reader's anchor; head-minus-anchor is the honest staleness |
| how stale is session s | head of heartbeat lane minus greatest firing citing s | positional | heartbeat lane (positioned) | anchor carries positions; no clock on either side |
| what incarnation is current | greatest incarnation fact per store-dir digest | positional (greatest-position read — the proven provision fold) | incarnation lane / KV last-per-subject | greatest at anchor; ties refuse (Environment.ts discipline) |
| what options does connection c run under | resolve the options digest the session fact pins | — (resolve; immutable) | CAS | none — a digest read is never stale |
| lifecycle history of the substrate | the incarnation chain walked by predecessor digest | positional | incarnation lane | pinned anchor for audits; the chain is the audit |
| is the substrate healthy through position p | fold of readiness observations and heartbeat health values up to p | positional | incarnation + heartbeat lanes | reader-tolerance staleness; "healthy now" is unsayable (§2.7) |

### 2.6 Liveness plane — coalgebras

| Outflow / process | Consumer state | Productivity measured by |
| --- | --- | --- |
| the status pump | position in the pin's status iterable; emits transition facts | transition facts advancing on the session lane; the pump is built **once as a fact source**, not twice as callbacks (parent record §5.5) |
| the heartbeat seat | schedule declaration + last firing n | heartbeat lane head advancing |
| the daemon supervisor | anchored read over incarnation + heartbeat lanes; acts by `decide` at the incarnation register | its own heartbeat; acting on prolonged silence is its fenced act, fed by tick facts, never a timer in meaning |
| `$SYS` / advisories / monitoring endpoints | none durable — chatter | may accelerate the folds (tell them to look sooner); dropping every message changes no fold value (CL-2); the Go advisory gate (`go/journal/journal.go:124-159`) is the lawful pattern |
| served projections (a future `varz`-shaped view) | a declared, writ-scoped fold + subscription | the egress-law shape: every outbound byte the image of an anchored read (AE-4's candidate, DEV-850) |

### 2.7 Sentences

Lawful (the engine speaks them through the one door):

1. *declare* — "Let this connect-options value exist, under the name
   that is its own bytes, as a configuration — under the transport
   writ."
2. *declare* + *emit* — "Let the session value folded from INFO I,
   CONNECT C, and writ W exist; I observed session-established citing
   its digest s — add it to the record."
3. *emit* — "I observed the n-th firing of schedule d for session s,
   claimed time t, health h, health read from the client's own status —
   add it to the record."
4. *fold* — "As of this checkpoint on the session lane, presence is at
   least {s₁, s₃}."
5. *decide* — "Let incarnation i be the one running server for store
   σ — by right of this token."
6. *trigger* — "Whenever the heartbeat head advances past position p,
   hint the supervisor's staleness-review declaration." (The verdict on
   silence is the supervisor's fenced `decide`, never the trigger's.)
7. *spawn* — "Let the status pump speak with at most the transport
   writ, narrowed to the session lane."
8. *resolve* — "What value does session digest s denote?"

Unsayable, by construction (closure rows from the kernel language):

1. "The server is alive **now**." — closure 1 (no clock reads in
   meaning); aliveness is productive-through-position-p, a reader's
   fold.
2. "Session s is gone — delete its record." — closure 12 (no silent
   mutation of the past); teardown is a *fact*, history is the point.
3. "`/connz` says nobody is connected, so nobody is." — closure 11
   (absence reasoning from a local view) and closure 5 (unverified
   read); `/connz` is chatter and also shows connections the server has
   not reaped — the dual failure the fold does not have.
4. "Reconnected — update the session fact's `client_id`." — closure 12;
   a reconnect mints a successor naming its predecessor.
5. "No heartbeat for two minutes, so time it out." — closure 2 (no
   absence/deadline predicates in triggers); the deadline seat decides,
   fenced, fed by tick facts.

---

## 3. The daemon: process value and resource plane

The server-as-abstraction split is adopted as the daemon's architecture:

1. **The process value** — `server.Options` → `NewServer` →
   `go Start()` → `ReadyForConnections` gate → `Shutdown` /
   `WaitForShutdown`, with `LameDuckShutdown` as the drain path. Only
   Go can hold it; its durable identity is `StoreDir` — restart is a
   new incarnation over the same store, and the incarnation chain is
   the truth-plane image of exactly that.
2. **The resource plane** — streams, consumers, KV buckets are *data*
   over the subject-addressed API, identical in-process and remote
   ("all API based even in single server mode",
   `server/stream.go:3513-3514`). The daemon speaks face (b) like any
   client; the existing shape gates keep working unchanged because they
   gate config-as-data, not Go objects.

**Topology (D-1, recommended):** the A/B hybrid — a Go-owned daemon
embeds the server as a scoped value, configured from declared data,
listening on localhost so TypeScript processes connect as
clients-at-most (the embedding constraint is physics: nats.js is
client-only). `DontListen` hermeticity remains available wherever no TS
client is needed — the Go tests keep it. The `journald` sidecar
(topology A) is the lifecycle-ownership proof; the derived-node plan
(topology B) is the configured-by-declared-data proof; the daemon is
their composition.

**The daemon is carriage.** It imports the engine and speaks sentences
through the one door like every other surface; it holds no second door,
no private truth, and no judgment. Face (a) — the owner surface it
internalises — becomes: options are declared values, lifecycle acts are
`decide`s at the incarnation register, monitoring reads are in-process
carriage feeding emitted observations, `$SYS` is natively-held chatter.

---

## 4. The lifecycle contract

Transcribed, not invented (R-3): the lifecycle vocabulary is the pin's
own surface — `NewServer`, `Start`, `ReadyForConnections`, `Running`,
`LameDuckShutdown`, `Shutdown`, `WaitForShutdown`, `ClientURL`,
`InProcessConn`, `EnableJetStream` (`server/server.go`, table in the
server-as-abstraction record §1.1). The contract, phase by phase:

| Phase | Carriage (the pin's surface) | Meaning (facts) |
| --- | --- | --- |
| acquire | construct `Options` from the greatest declared server-options value; `NewServer` | the options digest the incarnation will cite |
| start | `go Start()`; `decide` wins the incarnation register for σ | incarnation-established, citing options digest and predecessor |
| ready | `ReadyForConnections` + in-process `Healthz` (js-enabled) | readiness observations onto the incarnation lane — the ports-file signal retires (DEV-826 deliverable 1, daemon form) |
| serve | client connections in and out; the daemon's own connection is client zero | substrate-session facts, heartbeats, transitions — §2.2 |
| drain | `LameDuckShutdown`; the `ldm` status event reaches every client | a lame-duck fact on the session lane; the shuttle and every long-lived client react to the *fact*, not to a callback (DEV-745) |
| stop | `Shutdown` + `WaitForShutdown` | incarnation-retired with the cause; drain-then-stop and kill differ in the fact chain — the two teardown semantics stay distinguishable, checkably (DEV-826 deliverable 3) |
| crash | nothing — that is the point | an unretired incarnation whose lanes stop advancing; absence, read honestly, refusable at the supervisor's fence |

Interim (privileged-client posture, until S4 lands): the same facts are
minted from the client side — INFO-block session facts, status-pump
transitions, harness-held lifecycle. The fact schemas are identical by
construction; that identity is CL-1 and it is walled, not assumed.

---

## 5. The model track — claims to prove definitively

The commission asks for a modeled server "with claims we can eventually
prove definitively." The path is the estate's standard one: conformance
walls first (R0/R1), the machine-checked model behind its own gate
after (R2/R3), rows in VERIFICATION.md with honest bounds throughout.
The model home is a new `verify/substrate/` package under the model-gate
laws (D-4).

Pre-registered claims — all **CANDIDATE, stated-only** until proven:

- **CL-1 — carriage invariance (posture neutrality).** The substrate
  session fact is invariant under mint carriage: a privileged client
  folding the INFO block and the daemon folding `server.Options` plus
  the registration produce identical bytes, hence one digest. *This is
  the theorem that makes the posture transition safe, and it is the
  first to wall (S1/S4 differential) and the first to prove.*
- **CL-2 — chatter erasure.** Deleting every chatter message (`$SYS`,
  advisories, status readings not promoted to facts) changes no fold
  value — the promotion rule as a theorem, not a slogan.
- **CL-3 — presence honesty.** The presence fold never reports a
  session without an established fact (no false "connected"), and its
  one lossy direction (kill-9: established, never ended, lanes quiet)
  reads as absence, never as presence.
- **CL-4 — lifecycle machine soundness.** The connection machine over
  the transcribed eleven-event vocabulary (states = transitions;
  `ping`/`slowConsumer`/`update`/`error` = readings-within-states;
  drain and close distinct paths to a shared end state) is total over
  the vocabulary, and the terminal absorbing state is reachable —
  the measured 20.7-second close is a *theorem about the defaults*,
  which is precisely why the defaults become declared data.
- **CL-5 — incarnation chain integrity.** Successor-names-predecessor
  over one store-dir digest is acyclic and at most one incarnation is
  landed-current per σ at any register revision — the KM-shape brought
  to the substrate.
- **CL-6 — heartbeat replay determinism.** A replayed history contains
  the same heartbeats at the same positions; every fold over them is a
  function of delivered support and query alone.

Bounds on the track, stated now: no liveness theorem (the algebra
observes liveness, never promises it); no clustering/consensus claims
(single-server posture); the vendor's own internals are not modeled —
the model covers the estate's *use* of the transcribed surface, with
the vendor honored as an assumption set the substrate-assumption gate
already refuses to exceed.

## 6. The wire vocabulary — adoption by transcription

R-3 made mechanical:

- **The vocabulary is a generated table family, eventually
  corpus-side.** Interim: transcription modules pinned to the vendor
  source with `file:line` provenance (the SP-4 pattern — the eleven
  status events, the lifecycle surface, the `$SYS` subject table, the
  `$JS.API` subjects the permission projection already writes). Target:
  the model's emitter grows a substrate-vocabulary group so the tables
  are emitted, not hand-carried — the same waiver-then-emitter-growth
  path the MCP wire-name mapping walks (DEV-844); until then each
  transcription wears its A5-shape waiver naming the owed group.
- **The three shapes place every message.** History → journal-shaped
  lanes (facts); decisions → the fenced registers; everything else —
  presence hints, advisories, `$SYS`, status readings — is chatter
  under the promotion rule. A message that must be exactly-once
  meaningful is not a message: it is promoted (digest, register,
  journal fact).
- **No estate-invented wire words.** A subject, event name, or state
  the pinned vendor surface does not carry may enter only as a declared
  estate value (a lane subject derived from a declaration digest), never
  as a hand-named protocol extension.

---

## 7. The slice plan — vertical slices, each to a measured wall

Battery discipline as ruled: every slice lands with the full package
battery green, exits read unmasked.

| # | Slice | Wall (measured, executed) |
| --- | --- | --- |
| S1 | The session fact: schema, mint at connect in the TS spine, session lane; connect options become declared data (SP-5's declared-data half) | derivability: two independent mints over the same three groups are byte-identical; reconnect mints a successor citing its predecessor; the session fact pins the options digest |
| S2 | The status pump as fact source: the eleven-event transcription table with provenance; transition facts; the machine table | kill the server under the suite: `disconnect`→`reconnecting`×n→`close` arrive as facts in order; the four readings-within-states emit as observations, never states; nothing consumes `status()` twice |
| S3 | Heartbeat seat + presence fold + staleness read | presence over a kill-9 shows the session absent-by-silence, never falsely connected (CL-3's wall); duplicate firings absorbed byte-identically |
| S4 | The daemon skeleton (Go): embedded server as scoped value from declared options; localhost listen; in-process session-fact mint; readiness by `ReadyForConnections`+`Healthz` | **the CL-1 differential**: daemon-minted and client-minted session facts byte-equal over the same groups; readiness observations land; the ports-file poll retires in daemon-backed suites |
| S5 | Incarnation register + lifecycle facts: fenced start, lame-duck as fact, drain/stop/crash distinguishable | one incarnation lands per σ under racing starts (register wall); drain-then-stop vs kill produce distinct fact chains; the shuttle-shaped consumer reads `ldm` from the lane |
| S6 | Server options as declared data + the closed-channel refusal (SP-7 declared-data half, SP-8) | enabling WebSocket/MQTT/cluster/gateway on a declared config refuses with a taught repair; the running incarnation cites its exact options digest |
| S7 | `verify/substrate/` first slice: CL-1, CL-4, CL-5 modeled and gated; conformance walls from S1–S5 cited as the runtime differentials | the model gate green with executed negative controls (a mutated INFO field must move the digest; a mixed drain/close path must be refused); VERIFICATION.md rows opened with rungs and bounds |

Order: S1→S2→S3 are the client-posture fact machinery and land under
the ruled interim posture; S4 is the daemon's first breath and executes
the CL-1 wall; S5–S6 complete lifecycle ownership; S7 opens the proof
track. DEV-826 and DEV-827 build against S2/S5's fact vocabulary rather
than callbacks; DEV-781's requirement is S1's second clause.

---

## 8. The decision sheet

Rows RULED by the commission: R-1..R-4 (§1). Rows carried, recommended
option first, none foreclosed:

- **D-1 — topology.** Recommended: the A/B hybrid (§3): Go daemon,
  embedded listening server, TS clients-at-most. Price: TS never gains
  lifecycle authority; every TS-visible capability crosses as data.
  Alternatives: pure sidecar with op-protocol (journald grown up) —
  strongest boundary, re-exposes NATS op by op; external server
  supervised (topology C) — weakest ownership, already what the
  harness does.
- **D-2 — the daemon speaks the kernel language.** Recommended: the
  daemon imports the engine; configuration is declared sentences;
  lifecycle acts are `decide`s; no daemon-private write path.
  Price: the daemon cannot ship before the engine's carriage reaches
  its lanes. Alternative: a free-standing daemon walled later — the
  drift class this estate exists to refuse.
- **D-3 — SP-2 (health provenance), adopted-shape.** The heartbeat's
  health value names its source (client-observed vs server-reported) —
  R-4 makes the field mandatory in spirit; the row stays open only on
  schema shape.
- **D-4 — the model home.** Recommended: `verify/substrate/` under the
  model-gate laws, zero external deps, own `run.sh`. Alternative:
  extend `verify/kernel` — refused: the substrate model cites the
  kernel, and the kernel must not import its carriers' concerns.
- **D-5 — SP-5/SP-7 value pins.** The *declared-data* half is R-4;
  the *values* (reconnect `-1`, sync mode, `NoLog`, `ServerName`,
  `HTTPPort` interim) remain the parent record's priced rows, to be
  ruled at the S1/S6 dispatch respectively. The Go client is ruled in
  the same act as the TS client or the two drift (parent §7.1).
- **D-6 — SP-3 (system credential).** Under the daemon the question
  dissolves ($SYS is held natively); for the interim posture it stays
  the operator's, unpriced here. `$SYS` remains chatter in both
  postures — that is settled by R-3's promotion rule, not by this row.
- **D-7 — SP-9 (connections per process).** Unchanged by the daemon
  (client-plane); the recommended keep-and-declare stands; the daemon's
  own in-process connection is client zero and mints a session fact
  like any other.
- **D-8 — vocabulary.** One term is minted by this spec and offered for
  the glossary: **incarnation** (one server run over one store dir,
  successor-chained) — an extension of the register incarnation pin's
  existing use, not a new concept. Every other term is inherited.

## 9. Honest bounds

1. **Single-server, single-host.** Cluster, gateway, supercluster, and
   R≥3 replication are out of scope; the durability posture is the
   parent record's (sync-interval residual stated, jepsen `#7549` open
   at the pin — a single-bit `.blk` error can lose acked writes with no
   peer to reconcile from).
2. **Attribution is unauthenticated.** A session fact is
   connection-attributed mechanics, not an evidentiary "who", until the
   estate's attribution decision lands (the agent plane's standing
   bound, unchanged).
3. **Scheduling, retry pacing, backpressure, key custody** stay host
   engineering. The supervisor's *pacing* is host; only its verdicts
   are meaning.
4. **The model covers the estate's use, not the vendor's internals.**
   CL-4 is a theorem about the transcribed vocabulary and the declared
   defaults; it says nothing about the server's implementation of them.
5. **The parent record's measurements are tonight's, one host.** The
   shapes are the claims; the milliseconds are illustrative; S-slice
   walls re-derive what they depend on.
6. **Face (c) is enabled, not built.** Leafnodes and mirrors (and the
   gate bifurcation replica journals imply) are ADR-scale and wait on
   their own record; this spec only keeps the daemon shaped so they
   remain possible.
7. **The engine dependency is real** (D-2): the daemon's lanes, cells,
   and registers are declared through the door, so slice order inherits
   the engine's carriage maturity. Trigger/spawn carriage (the reaction
   runtime) is NOT assumed anywhere above — the supervisor acts by
   anchored reads and fenced decides, both of which exist today.
