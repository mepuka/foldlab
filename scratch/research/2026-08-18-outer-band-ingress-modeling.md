# Message ingress from outer-band nodes: the boundary applying the inner discipline

Status: **EXPLORATORY consultation note**, written 2026-08-18 at the
operator's direction. Companion to
`scratchpad/cas-motion-and-ingress.md` (§3, the two-plane split) and
the estate's ratified inner discipline. **This record invents no
machinery.** Every mechanism below is either cited to a source read
this session, or marked as an open question the sources do not settle.
Standing fences ride throughout: **safety only** — no liveness claim
anywhere; **the attribution fence** — every "who" means "which
credentialed connection under which writ" (G4 pending); and **the
meaning/carriage split** — layout is never meaning.

Sources carried, each read in place this session:

| Source | What it settles for this note |
| --- | --- |
| `scratchpad/cas-motion-and-ingress.md` §3 | one class as bytes, many kinds as meaning, any layout as carriage; the saying is a fact, the said is a claim; retention splits by plane |
| `docs/design/2026-08-18-plait-kernel-algebra.md` §4.2 | `emit` — "everything an agent learns arrives through this door"; attributed; duplicate-safe; **no point-to-point send**; `declare`'s **two carriers** (canonical values → catalog; opaque byte payloads → blob store); `join`/`decide` writ-premised (R10, `f9_tree_attenuation`) |
| ibid. §4.3 | `send(to,msg)` derived not primitive; `readLatest`, `delete`/`update`, `assert`/`axiom`, `lock` refused, each with its law |
| ibid. §5.3 | the fourteen closure rows — clock reads, absence reasoning from local views, off-writ referents, secret carriers, silent mutation of the past |
| ibid. §5.4 | refusal parity: **the refusals are half the grammar**; a door predicate without its paired refusal behavior is an unfinished rule (K-9) |
| `docs/research/2026-08-12-nats-agent-protocol.md` | three wire shapes (journal facts / commitment registers / ephemeral chatter) and **the promotion rule** — "if a message must be exactly-once-meaningful, it is not a message" |
| `docs/adr/0009-journal-roles-authority-and-replica.md` | authority imports nothing; a replica is a JetStream **mirror** of exactly one authority; **lag is absence, never wrong data**; SOURCES renumber and are disqualified |
| `docs/design/2026-08-18-plait-agent-plane.md` §8 (the shuttle) | the Go agent-comms daemon; **translate-only**; the daemon is a node, the harnesses behind it are its insides "which the fabric never trusts. Only its bytes"; everything it emits is connection-attributed; **harness self-reports are never certificates**; G23 rides the adapter verbatim |
| ibid. §4.3, §4.5, §5 | the probabilistic arrow "quarantined, not denied" — raw reply journaled as an opaque-leaf value *whether or not it parses*; relations are **claims-tier**; the admission ceremony's four acts (attest · writ grant · directory · handshake) |
| `docs/research/2026-08-12-nats-server-as-abstraction.md` §5 | leaf nodes with their own JetStream domain (offline-capable), mirrors preserving origin sequence, "UnknownDigest-under-lag is absence-not-corruption" |
| `packages/plait/src/Refusal.ts:25-60` | the shipped closed structural union, 34 kinds — read in full for §5 below |

---

## 1. The frame: one shape, five instances

### 1.1 The ingress node is the only thing that exists

The estate already answered this question once, for one class, and the
answer generalizes without a new construct. The shuttle's own words:
the daemon "is itself a node — credentialed, `(head, writ)`, admitted
by attest like any other — and the harnesses behind it are its
insides, which the fabric never trusts. Only its bytes"
(agent-plane §8.1).

Read that as the boundary's general law:

> **An outer-band party never holds a fabric credential. A credentialed
> node inside the trusted plane fronts it, and everything that node
> emits is attributed to the node's own credential. The outer-band
> party's identity claim rides inside the payload as testimony.**

That sentence is the attribution fence stated at the boundary, and it
is derived, not invented: `emit` is attributed (kernel §4.2); the
shuttle already carries per-harness `holder` strings "verbatim and
unauthenticated" (agent-plane §8.3); the ontology precedent already
files unverified assertions as **claims-tier** (agent-plane §4.5,
fence 1). Nothing new is being asked of the machinery.

The consequence worth naming loudly, because it prices every class
below: **a multi-party outer band behind one ingress node is one
principal.** The shuttle says so of harnesses ("a multi-harness
deployment under one shuttle is one principal until the attribution
decision lands"), and it is true of every ingress node for the same
reason. Partitioning is not isolation, and an ingress node may not
claim isolation between the parties it fronts.

### 1.2 What ingress may do, and the mechanism that bounds it

The brief's requirement — *nothing outer-band ever writes a cell,
lands a decision, or rebinds a name directly* — needs no new gate. It
is `spawn` plus R10:

- `join` writes cells, `decide` lands outcomes, and a directory rebind
  **is** a `decide` (kernel §4.2, §8 row 11). Each type-requires the
  writ bits its class names (R10).
- An ingress writ is a `spawn` from the estate writ — `child = parent
  ⊓ request` — licensing `emit` and the blob-put carrier of `declare`
  and nothing else. `f9_tree_attenuation` makes over-grant
  unrepresentable rather than reviewed-for, "allowlist fields
  included" (T19), and an escalating request is **clamped**, not
  refused (kernel §4.2, generator 8).
- G10's honesty split rides: the typed writ is developer experience,
  the server-side refusal is the security. Both halves are cited, not
  re-derived.

So "outer-band writers are emit-only" is not a policy anyone has to
remember. It is a meet in the policy semilattice, and the theorem is
already green.

### 1.3 The two-plane split at the boundary, sharpened

`cas-motion-and-ingress.md` §3 rules the split. Composing it with
`declare`'s two carriers (kernel §4.2) yields one sharpening the
scratch note leaves implicit, and it decides most of §2 below:

> **Outer-band bytes are a blob dot, not a catalog dot.** The content
> plane for ingress runs through `declare`'s *opaque byte payload*
> carrier, under the same content-addressing discipline, because an
> outer-band payload is not a canonical value until something proves it
> is. The catalog stays the estate's own admitted world.

And a corollary that must be stated before anyone is surprised by it:

> **The raw dot and the promoted dot are different digests.** RFC 8785
> canonicalization changes bytes; a payload that decodes successfully
> canonicalizes to a *different* byte string, hence a different digest.
> Promotion therefore mints a second dot and records a fact linking the
> two. This is a feature: the sample survives (agent-plane §4.3 step 3
> — a failed decode "never destroys the sample") and retention splits
> cleanly (`cas-motion-and-ingress.md` §3, retention paragraph) — the
> raw dot is cheap cold evidence, the promoted dot is meaning.

The three ingress steps, in the fold's own vocabulary:

```
outer-band message
  ├─ content plane   raw bytes → blob-put → RAW DOT (dedup free: same bytes, same digest)
  ├─ event plane     emit a kinded, attributed fact on an ingress lane,
  │                  citing the raw dot; the saying is a fact
  └─ claims tier     the said is a claim until a declared VERIFICATION FOLD
                     constrained-decodes it, `declare`s the canonical value
                     (the PROMOTED DOT), and emits the link fact
```

The verification fold is an ordinary declared fold (kernel §4.2,
generator 5): resumption exact (`f3_resume_exact`), non-idempotent
steps under the successor discipline (`f2b_guarded_exactly_once`),
queries functions of support and query alone (`f11_query_deterministic`).
Promotion is exactly the NATS protocol's promotion rule applied to
meaning rather than delivery: *chatter accelerates; facts decide* —
here, *ingress records; folds decide.*

---

## 2. The five classes

### 2.0 The one distinction that cuts across all five

Every outer-band party sorts on one question: **can it pass attest?**
Nodehood is already defined — "admitted by `plait attest`", the
generated conformance corpus on a real local NATS, and the harness "is
implementation-language-agnostic because it speaks only bytes on
subjects" (agent-plane §5.1).

- **Attestable** parties are not really outer-band. They run the
  admission ceremony's four acts (attest · writ grant · directory ·
  handshake), receive a narrow spawned writ, and are low-writ nodes
  inside the plane. The boundary work is writ attenuation, not
  translation.
- **Non-attestable** parties stay outside and are fronted by a
  translate-only ingress node. The boundary work is translation plus
  quarantine.

That is the real class axis. The five named classes are populations
that sit at characteristic points on it.

### 2.1 Foreign / partner agent

**Door.** Splits on attest. A partner agent that speaks the wire and
passes the corpus becomes a node with a spawned writ — its foreignness
is expressed entirely as writ narrowness, and §1.2's meet does the
work. One that does not, or will not, is fronted by a shuttle adapter:
"one harness protocol: stdio JSON-lines event frames in, refusals and
prompts out" (agent-plane §8.2). The adapter plane is the designed
place for an agent that has "never heard of Effect" to land outcomes
under the same laws (§8.1).

**Credential.** The shuttle's own, or the partner's own if attested.
Never both: per-harness credentials are explicitly OUT of shuttle v0,
"blocked on attribution, named, not worked around" (§8.4).

**Two planes.** Assistant messages and turn completions are
opaque-leaf evidence emits, holder-attributed (§8.3 mapping table row
2). Tool-call proposals become **action declarations** — data, and
"submitting it fences nothing yet" (row 3). Kinds discriminate exactly
as the scratch note requires: claim, tool-call proposal, tool result,
refusal, repair are different kinds because folds and writs operate
per-kind.

**Claims-tier quarantine.** Two bounds, both already stated: **a
harness's account of its own context is a self-report, never a
certificate** — the shuttle "can journal what the harness says it saw
— attributed evidence, welcome — but no context digest exists and no
certificate claims one" (§8.3 bound 1). And a foreign agent's claim
about *its* estate, *its* authority, or *its* identity is testimony in
the payload.

**Carriage.** Shuttle adapter plane for non-attestable; plain client
connection for attestable.

### 2.2 Edge device

**Door.** A leaf node running a local credentialed daemon; the device
speaks to the daemon, never to the hub. Leaf nodes carry their own
JetStream domain and are explicitly documented for the disconnected
case: "provide a local NATS network even when the connection to a hub
or the cloud is down"; mirroring a hub stream makes access
"independent of the leaf node connection being online"
(nats-server-as-abstraction §5.1).

**Credential.** The leaf daemon's. A device with no fabric identity is
testimony inside the payload, exactly as §1.1 requires.

**Two planes.** Device readings are the archetypal `emit` case:
duplicate-safe by theorem shape (`f2_trace_invariant`), so an
intermittently-connected device may replay its buffer without harm.
Kinds per class: measurement facts, device-ops facts (started/exited/
crashed — the shuttle's row 1 shape), tick facts if the device claims
a time — and **claimed time is observation data, never a coordinate**
(G32; kernel §5.3 row 1).

**Claims-tier.** A measurement is a claim about the world; the fact
that the device said it is truth. A device's self-reported identity,
firmware version, or calibration state is testimony.

**Carriage.** Leaf node + mirror, and this is the class the topology
was designed for. Failure mode is native and honest: **lag is
absence** — the mirror is a verified *prefix*, "a digest minted
upstream but not yet replicated resolves as *absent* locally —
UnknownDigest-under-lag is absence-not-corruption" (§5.2). Absence
refusals are retryable, and the closure list's row 11 rides: a replica
is a lattice lower bound — "at least this," never "not present
anywhere."

### 2.3 Webhook and web read

These are two different shapes wearing one name, and only one of them
is settled.

**Web read (settled).** Already ruled: an **edge capability** — action
out, attributed evidence in; "the raw reply survives as evidence
whether or not it parses"; indexes over results are anchored folds
(kernel §8 row 10). Generators: `declare` + `decide` + `emit`, then
`fold`. G23 rides verbatim — at most one landed outcome is not at most
one external side effect. Nothing here needs designing.

**Webhook (unsettled).** An unsolicited inbound push is the one shape
in this note with no estate precedent. The kernel refuses
point-to-point delivery outright — "there is no point-to-point message
primitive because delivery-to-a-party is a liveness claim the fabric
refuses to make" (§4.3) — and no HTTP listener exists anywhere in the
sources read. Modeled honestly, a webhook receiver is an ingress node
holding a credential and a narrow writ, minting a raw dot for the
request body and emitting an attributed fact on a webhook lane; the
HTTP layer is carriage, outside meaning. **But whether the estate
wants a push surface at all, versus modelling every webhook as a
polled web read, is not settled by any source and is filed as open
question OQ-3.** Note what pulls against push: the estate's whole
posture is that chatter may be lost without breaking a theorem, and a
webhook that may be lost is a webhook the sender believes was
delivered.

**Claims-tier.** Everything a webhook body asserts, including its
signature header, is testimony until a verification fold that holds
the signing key promotes it. A signature check is a fold, and its
verdict is a fact.

**Carriage.** Plain client connection from the receiver node; blob
carrier for bodies over the inline threshold
(`inline-body-too-large` is a shipped refusal kind).

### 2.4 Human client

**Door.** The estate's MCP layer — "the introspection door is the
estate's MCP layer" (agent-plane §8.4) — with tools **derived and
writ-projected** (§5.5), so "a human and an agent see one truth" and
progressive disclosure is by construction: "an agent sees what its
writ licenses, and can always go one digest deeper" (kernel §8 row 13).

**Credential.** A seat's. Humans are already first-class in the tier
list — "model seats · human seats · harnesses behind the shuttle"
(agent-plane, agents figure). A human seat is a credentialed
connection like any other; the fence is the same one — the credential
is what is attributed, the person behind it is not.

**Two planes.** A human utterance is a session fill: an `emit` onto
the session's venue journal, **idempotent per `(value, seat)`** —
shipped machinery (kernel §4.3). Session close is a `decide` at the
declared authority, and it is the one non-monotone act a session
contains. A human's dashboard is not a separate mechanism: "the UI
itself is a coalgebra: it subscribes (a watch is a consumer), receives
pushed deltas, and never polls" (`cas-motion-and-ingress.md` §2), and
"consuming a lane IS deploying a fold" (kernel §4.3).

**Claims-tier.** A human instruction is an instruction kind, not an
authority grant. Authority is the writ; the payload cannot enlarge it
(closure row: `assert`/`axiom` refused — "policy and authority content
enters as declared values and decidable predicates, never as trusted
assertions").

**Carriage.** Plain client connection. Leaf node + mirror if the human
is at a disconnected site and needs local reads — the same offline
story as the edge device, for the same reason.

### 2.5 Sibling estate

The hardest class, and the one where the note's honest yield is a
sharp question rather than a design.

**Door.** ADR-0009 already rules the shape of cross-authority reading:
"a REPLICA is a JetStream MIRROR of exactly one authority: it stores
facts at origin sequence numbers with resync-on-gap enforced, so
hash-chain verify-on-read carries over unchanged and lag is absence,
never wrong data." A replica is locally read-only. **SOURCES are
disqualified** — they renumber, which destroys the position-occupancy
reading (ADR-0009; §5.2 of the abstraction survey). And the rejected
alternative is named: replicas re-appending facts through their own
journal is "the assigned-correlation mistake applied to replication."

So: **a sibling estate's facts arrive as a mirror of its authority,
read-only, verified by our own verify-on-read, lagging as absence.**
That much is settled and needs no new machinery.

**What is free.** Content addressing is universal. If the bytes cross,
the digest agrees — "equal names are equal things; every cross-boundary
claim is a digest equality" (nats-agent-protocol, property 2). Two
estates that never coordinate still agree on every dot they both hold.
This is the strongest cross-estate property in the estate and it costs
nothing.

**What is not settled.** Their journal is their authority under *their*
door, *their* writ universe, *their* language version. A fact admitted
by their certifier was admitted against their world, not ours. So:

> **OQ-1 (the sharpest structural question): does a mirrored sibling
> fact enter our world as an admitted declaration, or only as evidence
> citing digests our catalog does not hold?** `declare`'s admission
> requires that references resolve to already-admitted digests — "the
> catalog is a DAG by construction" — so a foreign digest cited in a
> body is an unresolved reference until its whole transitive closure
> has crossed and been admitted. Either we walk and admit the closure
> (our door grows our world by their say-so, which the attribution
> fence should make us flinch at), or we hold foreign facts as
> evidence-with-dangling-references (which makes them unresolvable and
> therefore, by the estate's own rules, un-foldable). **No source read
> this session settles this, and it should not be settled here.**

Note that KM-20's `relative_refusal_repairable_by_growth` gives the
*shape* of the answer without choosing it: an unresolved-referent
refusal is door-relative and "admits unchanged at some larger world"
— someone declares the referent. What it does not say is who is
allowed to be that someone across an estate boundary.

**Claims-tier.** Everything from a sibling estate is a claim about
their world. Their admission facts, their certificates, their attest
verdicts: all testimony to us, all facts to them. The two readings do
not conflict — that is what the two-plane split is for.

---

## 3. Carriage topologies and their failure modes

Carriage is layout, and layout is never meaning
(`cas-motion-and-ingress.md` §3). Three topologies, and when each is
right.

| Topology | Right when | Failure modes |
| --- | --- | --- |
| **Leaf node + mirror** (own JetStream domain; local authority streams plus mirrors of hub streams) | the outer band is intermittently connected, geographically remote, or must keep working offline — edge devices, disconnected human sites | **lag** is the only honest degradation: the mirror is a verified prefix, so a not-yet-replicated digest reads as *absence*, retryable (§5.2). Domain addressing (`$JS.<domain>.API.>`) is a real operational surface. Sources are disqualified for carrying a journal. Local-authority writes at the leaf make the leaf the origin of its own facts; writes never address a replica — they are subject-addressed and route to the authority daemon, "so location transparency costs nothing" (ADR-0009) |
| **The shuttle's adapter plane** (supervisor · adapter · translator · fabric client · attest passage) | the outer band speaks a process/stream protocol and cannot or will not attest — foreign harnesses, partner agents behind a CLI | one principal per shuttle: partitioning is not isolation (§8.3). Self-reports are never certificates — the chain "enters at the declaration hop, not the context hop" (§8.3 bound 1). G23 verbatim: a harness that called a vendor API and died has already called it. Crash window between effect and commit is irreducible (Two Generals; the register makes reruns *refusable*, not impossible) |
| **Plain client connection** (credentialed connection; MCP surface for introspection/configure tools) | the outer party can hold a credential and speak the wire but is not a server — human seats, attested partner agents, webhook receivers | no offline story and no local authority: every read is a round trip. The MCP surface is writ-projected, so under-granting shows up as invisibility rather than as an error — a taught-refusal gap worth watching. Reads must be `resolve` (anchor-free) or a `fold` at an anchor; `readLatest` has no syntax |

One rule spans all three, from the NATS protocol record: **chatter
accelerates; facts decide.** Presence, progress, wakeups, and token
streams may be dropped without breaking a theorem — the shuttle's
mapping table already files token/progress streams as "transport only
... never identity-bearing, never journaled beyond the final record."
Anything at the boundary that must be exactly-once-meaningful is not a
message: it gets promoted — named by digest, decided in a register,
recorded as a journal fact.

---

## 4. Backpressure and abuse at the boundary

The brief's requirement is the estate's own discipline: **bounds are
refusals — taught, loud — never silent drops.** Refusal parity makes
this law rather than preference: "a door predicate without its paired
refusal behavior is an unfinished rule" (K-9), and "the refusals are
half the grammar" (§5.4).

**What the deny surface must prove.** Three properties, each stated so
a wall can check it:

1. **Conservation.** Offered = admitted + refused. Every message that
   crossed the door produced either a fact or a refusal envelope.
   This is the no-silent-drop property, and it is countable — which
   makes it wallable.
2. **Taught repair.** Every refusal carries `kind · sort · law · path
   · got/expected · next`, and `next` is *data the writer acts on*
   (the shipped W7 replies-teach discipline; agent-plane §4.3 step 4).
   A bound refusal that does not say what bound, and what to do, is an
   unfinished rule.
3. **Attribution.** Every refusal is attributed to the same credentialed
   connection its admitted siblings would have been. A refusal is
   evidence; a refused flood is a fact about a connection, and "who is
   flooding" is then an ordinary anchored fold — no new metrics plane.

**And here the sources run out.** The refusal *sort* family is exactly
two: **structural** (closed union, permanent, repair them) and
**absence** (open kind, retryable — "not-here-yet at this node's
horizon"). A rate-bound or budget-bound refusal is neither. It is not
a defect in the bytes to be repaired, and it is not a value that has
not arrived. Reading the shipped union in full
(`packages/plait/src/Refusal.ts:25-60`, 34 kinds) confirms there is no
home for it: the closest kinds are `inline-body-too-large` (a size
bound, and the one shipped precedent for bound-as-structural-refusal)
and `fold-buffer-overflow` (a consumer-side capacity refusal). Neither
generalizes cleanly to "your connection has offered too much, too
fast."

> **OQ-2 (the sharpest open question in this note): what sort is a
> bound refusal?** The forks, each with its price. **(a) Grow the
> structural union** — a bound refusal is structural, the writer
> repairs by slowing down or splitting. Price: the union is closed and
> shipped at 34 kinds, so this is a ruling plus a language successor
> declaration, never a patch (K-1's growth rule; §7.1's language
> declaration carries the refusal table as data). **(b) Read it as
> absence** — "capacity is not here yet," retryable, no new kind.
> Price: absence currently means a value's non-presence at a horizon,
> and overloading it makes `retryAbsence` policy indistinguishable
> from backoff — a real conflation in a package whose whole posture is
> that sorts do not blur. **(c) Outside meaning** — bounds are
> transport, handled substrate-side. Price: this makes them **silent
> drops**, which the brief and the refusal-parity law both refuse.
> There is no free option, and the estate should rule rather than
> drift.

Two things that need *no* ruling, because they are already law:
**writ bounds** — `spawn`'s budget component is part of the meet
carrier, and "spawn-bound exhaustion" is already a named refusal
(kernel §4.2, generator 8); and **size bounds** —
`inline-body-too-large` is shipped, and the blob threshold is the
lawful escape ("large payloads ride the blob store by digest
reference; identity is unchanged by placement", §8 row 12).

Two abuse shapes worth naming even though the sources handle them:
**duplicate flooding** is harmless by theorem shape
(`f2_trace_invariant`) but not free by cost, so it is a bounds
question, not a correctness one; and **dot-collision spam** is not a
thing — same bytes dedup to the same dot, which is the content plane's
free consequence.

---

## 5. The refusal surface catalogue for ingress

What an outer-band writer must be taught, per class. Shipped kinds are
named from `Refusal.ts`; proposed items are marked, and nothing here
mints a kind.

**Structural wire refusals (shipped; apply to every class).**
`non-canonical-value`, `malformed-envelope`, `inline-body-too-large`,
`malformed-blob-reference`, `invalid-subject-token`, `digest-mismatch`,
`invalid-partition-key`, `invalid-lane-declaration`. These are the
adapter's own negative controls in the shuttle's gate list — "a
planted non-canonical frame refused at the adapter, a planted
excess-property envelope refused" (§8.4) — and they cross the boundary
unchanged for every class.

**Absence refusals (shipped sort; retryable).** Unresolved reference to
a digest not yet at this node's horizon. Under lag this is the *normal*
edge-device and sibling-estate condition, and it is repairable by world
growth, not by rewriting (`relative_refusal_repairable_by_growth`). The
teaching sentence is the discriminator: *wait or ask, don't rewrite.*

**Off-writ refusals.** The class the brief asks for, and it needs an
honesty note: the shipped 34-kind union contains **no** kind named for
an off-writ act. The off-writ-referent refusal is **proposed** (K-8,
closure row 13). Today, off-writ enforcement is G10's server-side
half — NATS permissions plus door refusal — with the typed writ as
developer experience. So "your writ does not license `join`" is a real
refusal at the substrate but not yet a taught kind in the language's
refusal table. **Filed as OQ-4.**

**Claims-tier violations.** Also proposed rather than shipped. The
violations an ingress door must be able to name:

- an ingressed payload asserting an attribution ("I am agent X") and
  expecting it honored — refused as testimony-not-attribution;
- an ingressed payload attempting to `declare` into the catalog rather
  than mint a raw dot — the catalog door is the certifier's, and outer
  bytes reach it only through a verification fold;
- a fold or view treating an unpromoted claim as truth — this is the
  one that cannot be refused at the door at all, only prevented by
  kinding: claims and promoted facts must be **different kinds on
  different lanes**, because "flattening to one 'message' class forces
  re-parsing meaning downstream, the exact failure the kind system
  exists to prevent" (`cas-motion-and-ingress.md` §3).

**Per class, the refusal a writer will meet first:**

| Class | First refusal | Sort | Teaching |
| --- | --- | --- | --- |
| foreign agent | `non-canonical-value` / excess property at the adapter | structural | repair the frame; the adapter's corpus is the spec |
| edge device | unresolved reference under lag | absence | wait; your view is a lower bound, not a denial |
| webhook | `inline-body-too-large` | structural | put to the blob carrier, cite by reference |
| human client | writ-projected tool invisibility, then off-writ | (OQ-4) | ask for a grant; authority shrinks by meet, it never grows by asking harder |
| sibling estate | unresolved foreign referent | absence (OQ-1) | the closure has not crossed |

---

## 6. Ticket candidates — tracer bullets in dependency order

Five slices, each one session, each with its wall. Sized against the
estate's measured cadence (the shuttle epic's calibration anchors:
`go/register` plus its replay wall was one seat run; the spine's corpus
wall was one slice).

**T1 — Ingress dot minting: the two-carrier split, walled.**
*Blocks everything below.* An ingress path that takes arbitrary
outer-band byte payloads, blob-puts them to a raw dot, and emits one
kinded, attributed evidence envelope citing that dot. No decoding, no
promotion, no bounds.
*Wall:* a generated corpus of raw payloads (generated, never
hand-typed — the generated-vectors law); dedup proven by digest
equality when the same payload is offered through two different
ingress nodes; and the emitted envelope bytes re-derived byte-for-byte
by an independent implementation — the `go/cmd/plaitwall` precedent,
which already re-derives the TS-emitted envelope corpus with digest
equality per row.

**T2 — The verification fold: promotion, and the sample that survives.**
*Depends on T1.* A declared fold over an ingress lane that
constrained-decodes each raw dot against a cataloged schema; on
success `declare`s the canonical value and emits the link fact (raw
dot → promoted dot); on failure emits the structural refusal as
evidence with the raw dot intact.
*Wall:* a planted corpus of N payloads, M valid. Three rows: (a) every
failure preserves its raw dot and its refusal carries `next`; (b)
replay from any anchor reproduces the same promotion set
byte-identically (`f3_resume_exact`); (c) a valid-but-non-canonical
payload promotes to a **different** digest than its raw dot, and the
link fact records both — the §1.3 corollary made mechanical.

**T3 — The ingress writ: attenuation as a negative-control family.**
*Parallel to T2; depends on T1.* Spawn an ingress writ licensing
`emit` plus blob-put and nothing else; plant attempts at `join`, at
`decide`, and at a directory rebind from that writ.
*Wall:* each planted act refused with its law named, traces committed;
plus a must-not-compile row for the TS surface (the acl1836#6 unit-space
discipline applied to writ premises). This slice is where "nothing
outer-band writes a cell, lands a decision, or rebinds a name" stops
being a sentence and becomes a gate.

**T4 — Bounds as taught refusals.** *Depends on T1 and on the OQ-2
ruling — do not start it before the ruling.* Size and rate bounds at
the ingress door, each over-bound message answered with a typed refusal
carrying law and `next`.
*Wall:* a generated flood corpus proving **conservation** — offered =
admitted + refused, counted; every refusal envelope carries a `next`;
zero messages produced neither a fact nor a refusal. The counting
property is the whole point: silent drops are detectable by
arithmetic.

**T5 — Sibling-estate mirror read (spike, not a build).**
*Independent of T1–T4; produces a finding, not a surface.* Mirror one
foreign authority journal into a local domain and re-run ADR-0009's
properties against it: origin positions preserved, verify-on-read
unchanged, substitution trips `ErrTampered`, a not-yet-replicated
digest reads as absence rather than corruption. Then attempt one
foreign-referent resolution and record exactly what happens.
*Wall:* the ADR-0009 property rows re-run green on a foreign origin,
plus a written finding answering OQ-1 with evidence rather than
preference. A spike that ends in a design opinion without the run is a
failed spike.

Dependency edges: `T1 → T2`, `T1 → T3`, `(T1, OQ-2 ruling) → T4`, `T5`
standalone. T4 is the only slice gated on a ruling, and that gating is
deliberate — building bounds before the sort is ruled would smuggle the
ruling into code.

---

## 7. Open questions — carried, not decided

1. **OQ-1 — cross-estate admission.** Does a mirrored sibling fact
   enter our world as an admitted declaration (walking and admitting
   its transitive closure through our own door) or as evidence citing
   digests our catalog does not hold? The first grows our world by a
   foreign authority's say-so; the second yields facts that cannot be
   folded. No source read this session settles it. (§2.5)
2. **OQ-2 — the sort of a bound refusal.** Structural (grow the closed
   union by ruling), absence (overload a sort), or outside meaning
   (silent drops, which the parity law refuses). Three priced options,
   no free one. **This is the sharpest question in the note** because
   it blocks a whole slice and because every wrong answer is cheap to
   adopt and expensive to leave. (§4)
3. **OQ-3 — does the estate want a push ingress surface at all?** No
   HTTP listener exists in any source read; the kernel refuses
   point-to-point delivery on liveness grounds. Webhook-as-polled-web-read
   is a real alternative that keeps every existing law and costs the
   sender's delivery illusion. (§2.3)
4. **OQ-4 — off-writ has no taught refusal kind.** Enforcement is
   server-side (G10's security half) but the language's refusal table
   has no kind for it, and K-8's off-writ-referent row is proposed, not
   shipped. Since the refusals are half the grammar, an outer-band
   writer that cannot be *taught* why it was refused has not been
   taught the language. (§5)
5. **OQ-5 — ingress lane families are unnamed.** The scratch note rules
   that kinds discriminate and folds operate per-kind, but which lane
   families exist per outer-band class (one ingress lane per class? per
   connection? per correlation key?) is a naming decision no source
   makes. The NATS record's inbox precedent — "Journal per correlation
   key ... an inbox IS an entity" — is the nearest available shape and
   is offered, not assumed.
6. **OQ-6 — one ingress node fronting many outer parties is one
   principal.** Stated as a bound throughout, inherited from the
   shuttle. Whether that bound is acceptable per class (it is clearly
   fine for one edge device, clearly uncomfortable for a public webhook
   surface) is a per-class deployment ruling that lands with G4, not
   before it.

---

## 8. Honest bounds on this note

No measurement appears anywhere here; no rate, size, or cost figure is
claimed. Nothing above licenses a build: the register is exploratory,
and the ticket candidates in §6 are candidates for the board's own
sizing, not a plan. Two of the five classes (webhook-push, sibling
estate) rest substantially on open questions rather than on ruled
machinery, and this note deliberately leaves them open rather than
resolving them by consultation. Every "who" in every sentence above
means "which credentialed connection under which writ," and the
attribution decision (G4) remains the program risk at the boundary
exactly as it is inside it.
