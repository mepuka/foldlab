# The algebra engine and the duplex substrate

Status: EXPLORATORY consultation note, coordinator-written 2026-08-18
at the operator's direction, answering the harness-anatomy framing
(the LangChain agent-harness post read as "any complex software
system") and the operator's stack sketch: Lean proofs → algebra
engine → Go transport on NATS JetStream → TypeScript language layer;
Go daemon as liveness; LLM→MCP and Human→Language converging on the
same engine. It composes only standing material: the ratified kernel
algebra (K-1..K-10, PR #91), the REF-0 extraction ruling of
2026-08-16 (WASM-preferred kernel, stateless ABI, OCaml lane killed),
the generated-vectors ruling of 2026-08-15 (model↔runtime fixtures
are executed out of the model, byte-identical), the provision lane
(the Effect correspondence and the provisionFold/greatestAt
theorems), and the session surveys. Nothing here is adopted; §9 is a
decision sheet for the grill. Standing fences ride the document:
safety only — no liveness or convergence promises; attribution fence
— every "who" is a credentialed connection under a writ.

---

## 0. The stance, in one sentence

**You do not compile the model into the system; you hold the system
to the model.** Everything below is that sentence applied five times
— to Lean, to storage, to duplex flow, to addressing, and to the
harness checklist.

## 1. The engine is two stateless functions

Strip the "algebra engine" to what the ratified model actually
defines and it is two functions, both pure, both total, both already
theorem-covered:

    admit : Candidate → Act ⊕ Refusal     -- the door
    eval  : Anchor × FoldDecl → Value     -- the read canon

`admit` is the admission door: it takes any raw term of the candidate
grammar and returns either the intrinsic act or a refusal carrying
reason, law, repair, applicability (refusal parity). `eval` is the
anchored read: given a position bound and a declared fold, it
produces the fold's value. Decide is not a third function — a fenced
act passes `admit` like everything else and becomes exclusive only at
its carrier (§4.5). Triggers are standing `eval`s whose results
re-enter as candidates.

Everything else in the stack — NATS, Go, TypeScript, Effect, MCP, UI
— is **carriage**: moving candidate bytes to the door and moving
admitted bytes to readers. The engine holds no state (this is the
REF-0 stateless-ABI ruling restated as architecture): state lives in
carriers; the engine is a judgment, not a place.

This gives the semantic-coherence property the operator wants by
construction rather than by discipline: LLM→MCP, human→language, and
TS→API are three surfaces feeding **one door**. Agreement between
tool, model, and user is not maintained; it is inherited, because
all three speak projections of one signature and are judged by one
`admit`. The three projections shipped this session (kernel.ts,
tools.schema.json, prose.md) are the existing evidence that the
surfaces can be 100%-fidelity images of the signature.

The stack, redrawn with the arrows labeled honestly:

    law plane       Lean model + gate        proves; generates vectors; referees
                      ║  conformance (byte-identical vector replay — NOT compilation)
    kernel plane    admit + eval             stateless; WASM-preferred; embedded in every host
    truth plane     CAS                      one digest space; kinds; join-plane facts
    directory plane KV (name → digest)       arbitrated bindings; fenced rebinds
    position plane  JetStream streams        sequences, sessions; advisory order
    host plane      Go daemon                consumers, triggers, carriers, heartbeats
    surface plane   TS/Effect · MCP · prose  term builders; projections; humans and LLMs

The operator's sketch had "lean proofs → algebra engine" as a
production arrow. The correction that formalizes the whole approach:
that arrow is a **conformance** arrow. Lean does not produce the
engine; Lean produces the *obligations* the engine is held to.

## 2. Lean, honestly

Direct answer to "am I being stupid by using Lean": no — and the
mistake available to you is not the language, it is a promotion. Lean
is load-bearing exactly where it sits (model, laws, closure list,
refusal typing, vector generation, refereeing) and wrong as the
runtime. The estate already ruled this once: REF-0 closed 2026-08-16
with WASM-preferred kernel + stateless ABI, and this note reaffirms
rather than reopens it.

The technical facts under that ruling, stated plainly:

- **Lean 4's C output is real.** Every definition compiles to C; lake
  links native executables; the elaborator itself is self-hosted, so
  symbolic performance is respectable. For a CLI reference
  interpreter and vector generator (what ControlMain.lean already
  is), it is production-grade today.
- **"Runtime-viable" fails operationally, not on speed.** The
  generated C is welded to the Lean runtime: reference-counted object
  representation, GMP for integers, its own initialization. Embedding
  that in a Go daemon means cgo against a large foreign runtime;
  embedding in Node means a native addon; the browser build exists
  (lean4web) but ships tens of megabytes of runtime. You would own a
  toolchain whose one job is to avoid rewriting two small functions.
- **Extraction would not buy the no-loss chain anyway.** The dream —
  proofs → AST → types → executable code, lossless — founders on a
  scoping fact, not a tooling gap: the Lean model covers `admit` and
  `eval`. It does not and should not cover NATS, persistence,
  sessions, schedulers. Those hosts must be held by vectors
  regardless of how the kernel is produced. Once the vector gate is
  load-bearing for the hosts, letting it also carry the kernel costs
  nothing — and the gate is the piece the estate has already
  hardened (generated vectors, byte-identical, hand-authored files
  deleted).

So the realistic allocation of rigor, which is also the formalization
of "algebra as the engine":

1. **Prove once** — laws live in Lean and nowhere else.
2. **Project statements** — signatures, types, schemas, prose are
   mechanical images of the model (this session demonstrated 100%
   fidelity is reachable).
3. **Conform behavior** — every host and the kernel replay the
   generated vectors byte-identically at the gate.

Nothing transports proofs across languages, and nothing needs to: the
vectors are the proofs' images. This is how every polyglot protocol
that actually holds together does it — a reference model plus a
conformance suite — with the estate's upgrade that the suite is
*generated by executing the model*, so the suite cannot drift from
the theorems.

Honest bound: conformance is not verification. Behavior off the
vectored surface is where drift lives. The mitigation is already the
ruling: keep the kernel two functions, stateless, WASM-single-source,
so every host embeds the *same bytes* and drift has no per-host
corner to hide in. (In Go, wazero embeds WASM with no cgo; in TS,
WASM is native. One kernel, N hosts.)

## 3. The engine in simple math

Four constructions, one paragraph each, glossed for outsiders:

1. **Candidates are free terms.** The candidate grammar is the free
   construction over the eight generators: anyone — human, LLM,
   program — may write any term. Freedom lives here; nothing is
   checked yet. This is why the language can be populated by
   unreliable writers safely.
2. **The door is a characteristic function that explains itself.**
   `admit` decides membership in the lawful sublanguage, and where a
   classical type checker returns a bare no, the door returns the
   witness: which law, why, and the repair. Mathematically it is the
   quotient map onto the lawful algebra with its kernel — everything
   collapsed to "no" — materialized as typed refusals instead of
   discarded. The refusal plane is the complement of the language,
   made into data.
3. **The journal is a free join-semilattice; folds exist by
   initiality.** Admitted facts form finite sets under union —
   order-free, duplicate-free, monotone (the CALM plane). Because
   the state is a free object, every lawful fold is the *unique*
   homomorphism out of it: the measurement canon is not a library of
   handy functions but the initial-algebra guarantee that each
   declared reduction has exactly one meaning. That uniqueness is
   the "extreme cohesion" property, proved rather than maintained.
4. **The fence is the one non-free act.** Exclusive choice (decide)
   is quarantined, priced by token, and — §4.5 — has an exact
   carrier primitive.

## 4. The storage answer: the free-object chain IS the storage stack

The operator's question — duplicate the CAS? channels for metadata vs
regular vs persistence? one CAS with algebra on top? — has a
canonical answer already sitting in the ratified algebra table. F2
(the factorization chain of free objects):

    sequences  Σ*  ↠  multisets  ↠  finite sets
    (order, dupes)    (dupes)        (neither)

Read as architecture, that chain is the layering, and NATS happens to
ship a carrier for each stage:

| Quotient stage | What it remembers | NATS carrier | Estate construct |
|---|---|---|---|
| Σ* — sequences | arrival order + duplicates | JetStream stream (subject sequence numbers) | positioned plane; `positionedOf` |
| multisets | counts, not order | stream + dedup window (Nats-Msg-Id = digest) | count-class measurements |
| finite sets | membership only | CAS (digest space; Object Store / FS / R2 carriers) | the join plane; truth |
| directory (named cells) | greatest binding per name | **KV bucket, last-per-subject** | `greatestAt` / `provisionFold` |

Two of these rows are theorems from this session wearing an ops
uniform. NATS KV is implemented as a stream with last-value-per-
subject reads: subject = hole name, stream sequence = position, read
= greatest position per name. That is **exactly**
`provision_positioned_correspondence` — the provision fold is a
positioned greatest-read. The directory/provision algebra was proved
before we noticed the substrate already sells it as a product. The
estate adds what the product lacks: laws, refusal typing, anchored
reads.

### 4.1 One equality, many carriers

So: **do not duplicate the CAS; duplicate carriers.** "One CAS" is a
logical claim — one digest space, one equality — never a physical
claim about buckets or streams. The wasteful/limiting worry
dissolves once those are separated:

- NATS session and indexing limits are per-carrier engineering.
  Shard streams by kind and partition, put blobs in Object Store or
  the filesystem or R2, and record *where bytes sleep* as placement
  facts. The algebra never sees placement; it sees digests.
- The expressive power is not wasted by unity — it is **enabled** by
  it. Folds compose across kinds only because every fact shares one
  digest space. Split truth into three CASes and you must re-prove
  pairwise coherence forever; that tax is exactly the unease the
  operator reported ("you still have to model coherence between
  them"). The tax is real, so never split truth. Split carriers.

### 4.2 Metadata is kinds, not channels

"Metadata digests vs regular digests" is already solved by the brand
machinery: metadata about digest d is more join-plane facts *keyed by
d* on a meta lane, discriminated by kind — never a second address
space. The `Digest kind` coproduct is the discrimination; a second
CAS would be a second equality, which is the one thing the estate
must never have two of (CP-1: sameness IS root-digest equality).

### 4.3 Coherence is pre-paid

Coherence between planes is not a protocol to design; it is a
refusal the model already owns. Every carrier read is verify-on-read
(hash the bytes, compare the digest), and a mismatch is
`unverifiedRead` — one of the four machine-applicable refusals, with
a mechanical repair (re-fetch, re-verify). Carriers are therefore
allowed to be stale, partial, or wrong: they are hint planes. Truth
never degrades because truth is the equality, not the carrier.

### 4.4 The rung⇒carrier rule

The operator's third mental image — "each defined algebra
corresponds to some kind of structure??" — is a theorem-shaped
instinct. State it as a rule:

**A fold may read from the deepest quotient its algebra respects.**

- Commutative + idempotent (bounded semilattice rung) → may read the
  set plane (CAS). Redelivery and reordering are free.
- Commutative, not idempotent (counting monoids) → needs the
  multiset presentation; dedup by content-digest makes at-least-once
  delivery harmless.
- Non-commutative / positional (provision, latest-wins, sequences) →
  must read the positioned plane, and its anchor must carry
  positions (the `AnchorFact fold partition` brands already type
  this).

Publishing a result *down* the chain (e.g., claiming a positional
fold as a set-plane fact) requires exactly the homomorphism condition
of F2 — invariance under the quotient. KM-17's rung brands make the
rule enforceable in the TypeScript surface: the carrier a fold may
read becomes a type error, not a code review. This single rule is
the formal content of all three of the operator's images (§6 handles
the other two).

### 4.5 The fence has a native carrier

JetStream supports publish with an expected-last-subject-sequence
header — compare-and-set on a subject. That is `decide`'s carrier:
the fenced act publishes with the expected position; the race loser
gets a rejection that maps to a refusal with a mechanical repair
(re-read, re-decide). KV's update-with-revision is the same primitive
on the directory plane, so fenced rebinding of names uses it too.
The one place where order is truth gets the one primitive where the
carrier enforces order. Everywhere else, JetStream's ordering is
demoted to advisory — positions are read material, never authority.

### 4.6 What sessions are

NATS's native gift, in algebra terms: a **session is read-plane
state** — a consumer's position in a stream plus a writ scoping what
it may resolve. Sessions never touch truth; they are where the
coalgebra (§5) keeps its place. This is why holding
JetStream first-class is safe: it supplies positions and sessions
(read plane) and CAS supplies equality (truth plane), and neither
can corrupt the other.

## 5. Duplex, formally

The operator wants duplex — streaming in and out, meaning and
material — as first-class, "a property of living things." There is
an exact formal home for this, and it is the categorical dual of
everything already built:

- **Ingestion is algebra.** Folds (catamorphisms) consume the
  journal; the door admits; state accretes. This side is proved.
- **Emission is coalgebra.** A consumer is a state plus a step
  function producing an observation and a next state; streams are
  final coalgebras; subscriptions, watches, views, MCP responses,
  and UI projections are all unfolds (anamorphisms). JetStream
  consumers are *literally* this — ack floor as coalgebra state.
- A live behavior (an agent, the daemon, a view server) pairs the
  two: it observes by coalgebra and writes by algebra, and its whole
  I/O boundary is typed by those two faces.

This reading dissolves the daemon's specialness into something
statable: **the truth plane needs no liveness (a set is not alive);
the system is alive iff its coalgebras are productive.** "The system
is alive if this is running" becomes: the daemon is the host of the
unfolds. And aliveness itself obeys house discipline — heartbeats
are emitted facts, so "alive" is a *reader's fold* over recent
positions with a staleness tolerance: observed, never promised.
There is no "alive now" sentence, only "productive through position
p" — the semantic-space-not-time thesis applied to the runtime
itself.

Material and meaning both flow both ways: facts in (door) and bytes
in (carrier ingest); views out (folds) and verified bytes out
(serving reads). Both directions are meterable by the measurement
canon, which is what makes the metabolism observable.

**Pre-registered law candidate (estate-of-safety through-line).** The
door gives ingress totality: every state change is the image of an
admitted act. Duplex closure needs the dual, an **egress law**:

> Every outbound byte is the image of an anchored read under a
> declared, writ-scoped fold.

No unlogged output; no view that is not a declaration; no read
outside a writ. A view that would reveal beyond its writ becomes a
*refusal*, not a breach. Proposed as stated-only initially (the F13
pattern: gate-enforced statement, proofs staged). One carve-out to
keep it honest: host-internal debug exhaust (Go logs) is carrier
plane, non-semantic, and must never be read by folds; anything
semantic must be emitted as facts or it does not exist.

## 6. Addressing is the language — confirmed

The operator's instinct ("it essentially is the language I guess?")
is correct and already partially ratified. KM-15: environments are
directories. KM-16: paths resolve from explicit roots. The formal
statement:

**An address is an iterated resolve.** `/a/b/c` from root R is
`resolve c ∘ resolve b ∘ resolve a` applied to R — a path IS a
program, a composition of the resolve generator, evaluated by the
directory algebra (which is `greatestAt`, which is NATS KV). The
"filesystem service" is therefore not a service to design; it is
sugar over three pieces that exist:

    eval      : Root × Path → Digest ⊕ Refusal   (iterated resolve)
    placement : Digest → facts about carriers     (monotone hint plane)
    read      : Carrier × Digest → Bytes          (verify-on-read)

Compose them and that is the whole storage subsystem: "where is this
data?" → address → digest → carriers → verified bytes. Mounting a
blob store is declaring a root. Two additions make it a full
filesystem replacement, both already lawful: listing is a directory
fold; watching is a KV subscription (coalgebra).

The other two mental images land here:

- **"Peel back slices per dot"** — the slices are not inside the dot
  (bytes inside the dot would change its digest and break equality).
  They are **facets**: the fibers over the digest in adjacent planes
  — placement facts, provenance facts, metadata facts — each a
  monotone fact-set keyed by the digest, each addressable in its own
  plane. Peeling = resolving the same digest against another plane.
  The columnar spike's 2D dot (meaning × storage) is the two-facet
  special case; the general form is any number of planes fibered
  over one digest space.
- **"Each dot a cell in a database you can fold over"** — that is
  what kinded facts on lanes already are; the spike's layout algebra
  showed the columnar projection of it.

So the three images were never competing designs; they are the same
design seen from three planes (facets, cells, rungs).

## 7. The harness is the fourth projection

The LangChain anatomy reads as a requirements list because it is
one — but for the estate it is not a list of subsystems to build; it
is a list of *derivations to publish*. Same move as prose/TS/schema:
project the one signature into ops vocabulary. The derivation table:

| Harness row | Derivation in the algebra | Carrier | Refusal surface |
|---|---|---|---|
| Logging | `emit` — the journal IS the log; levels are kinds; there is no second telemetry plane | JetStream lanes | unattributed emit |
| Persistence / filesystem | addressing stack (§6): iterated resolve + placement facts + verify-on-read | KV + Object Store/FS/R2 | `unverifiedRead` (machine-applicable) |
| Git-like versioning | already native: Merkle DAG + fenced rebinding of names (git is a sibling species — CAS + refs) | CAS + KV CAS-update | fence race → re-read repair |
| Search / index | a declared reduction (KM-11) maintained by a consumer; index snapshots are dots with placement | stream → index carrier | rung⇒carrier violations |
| Memory | lanes + anchored reads + distillation folds | CAS + lanes | forward reference (door-relative) |
| Compaction | distillation fold emits summary + lineage pin; **fenced rebind of the read root; nothing deleted** — a view change, not a data change | KV rebind | seal without writ |
| Code execution | `spawn` under a writ; sandbox spec = a root directory (KM-15) + a token; outcomes journal back | daemon + streams | off-writ referent |
| Sandboxing | writ narrowing — authority meets downward; the environment handed to a process is literally a directory root | tokens | writ escalation |
| Web/MCP ingestion | external reads enter as *attributed claims* (G27 claims tier), untrusted until verified | claims lanes | unverified promotion |
| Skills / tools | a skill is a declared, digested program with a schema — a resolvable dot; MCP surface = the 8 kernel tools + declared derivations | CAS + tools.schema.json | schema mismatch |
| Planning / loops | a plan is a ProgramDecl with holes; planning = provision (proved lane); loops = triggers on evidence-appears; **completion is a read (holes exhausted), not a promise** | KV (provision!) + consumers | intrinsic refusals on unlawful plans |
| Verification | the door + the gate — already the core | kernel + CI | the whole refusal plane |

Two things the table shows. First, the **provision lane is the
existence proof of the method**: take a harness subsystem (Effect's
dependency environment), find its algebra (holes + newest-wins
fold), prove the correspondence (four theorems), and the carrier
falls out (NATS KV, exactly). The remaining rows repeat that loop.
Second, the classical harness treats logging as exhaust and the
store as a peripheral; the estate inverts this — the log is the
substrate and everything else is a fold over it. That inversion is
why the rows derive instead of accrete.

## 8. What does NOT fall out

Honest bounds; each is host engineering or future proof work, and
pretending the algebra covers it would violate house discipline:

1. **Scheduling and liveness policy.** Who wakes when, trigger
   fairness, retry pacing — coalgebra hosting. The algebra makes any
   schedule *safe* (idempotent joins make at-least-once free — the
   estate never needs exactly-once, distributed systems' most
   expensive lie); it does not make any schedule *good*.
2. **Retention economics.** What carriers drop and when is policy;
   dropping a sole carrier of a live digest must itself be fenced.
   Unmodeled.
3. **Backpressure and flow control.** NATS pull consumers give the
   primitives; the algebra is silent.
4. **Key custody.** The convergent-encryption results compose with
   the digest plane, but the spike's crypto is simulated and stays
   labeled so.
5. **Conformance ≠ verification.** The vector gate covers the
   vectored surface; the mitigation is minimality (two functions,
   one WASM source), not a proof.
6. **The egress law is a candidate.** Stated here, unproved,
   ungrilled.

## 9. Decision sheet

| # | Decision | Recommendation |
|---|---|---|
| AE-1 | Kernel embodiment: reaffirm REF-0 — single-source WASM `admit`+`eval`, embedded via wazero (Go) and native WASM (TS); Lean = referee, never runtime | **Hold ruling** |
| AE-2 | Adopt the free-object chain as the storage stack (stream ↠ dedup ↠ CAS; KV = directory), with the rung⇒carrier rule typed via KM-17 brands | **Adopt** — flagship result of this note |
| AE-3 | `decide` carrier = expected-last-sequence publish (streams) / revision-guarded update (KV) | **Adopt** |
| AE-4 | Egress law ("every outbound byte is the image of an anchored read under a declared, writ-scoped fold") as the duplex closure | **Pre-register; stated-only** (F13 pattern), proofs after the unity bridge |
| AE-5 | Write the harness/ops projection as the fourth projection document (§7 table is its skeleton) | **Adopt**, sequenced behind the unity lane |
| AE-6 | Addressing sugar: no new machinery — path grammar = iterated resolve (KM-16), mounts = root declarations (KM-15), facets = per-plane fact fibers | **Fold into existing KM rows** |
| AE-7 | Cost-ladder measurement harness: produce the estate's own "numbers table" (T0–T4 of §10 measured on the live NATS deployment, per-stage ingress/egress) | **Adopt when the daemon lands** |

One closing symmetry, because it is the answer to the original
worry: the harness post derives features from "behaviors the model
can't deliver on its own." The estate runs the same derivation with
one substitution — behaviors the *language* can't deliver on its own
are exactly the carriers — and then holds every carrier to the
language by vectors and refusals. That is what "the algebra is the
engine" means in practice: not that algebra executes, but that
nothing else gets to decide what execution meant.

---

## 10. Addendum (same session): the cost ladder — physics prices bytes, logic prices meaning

Operator follow-up: build the "numbers every programmer should know"
comparison (L1/RAM/disk/network) for harness needs, mapped to the
algebra-derived functionality on ingress and egress.

The transposition that makes the table possible: the classical ladder
is priced by physics (speed of light, seek time, round trips); the
estate ladder is priced by **logic** — an operation's tier is
determined by which laws its algebra satisfies. The search for
efficiency is therefore the search for stronger laws: optimization
becomes proof, and the rung brands (KM-17) make cheap-tier access a
typed right instead of a hope. Corollary for "services": a service is
a bundle of declared folds + a root + a writ (§7), so its performance
envelope is legible at declaration time from the rungs of its folds —
**SLA from signature**. Strengthening its laws is the only way to
move it down the ladder.

### 10.1 The ladder

Classical anchors are public folklore numbers (order of magnitude).
Estate tiers are COST CLASSES, deliberately unmeasured — AE-7
commissions the measurement.

| Tier | Estate operation | Cost class (classical anchor) | What lives here |
|---|---|---|---|
| T0 | kernel judgment — `admit` intrinsic checks, `eval` on in-hand bytes | function call (L1 ≈1 ns … µs) | stateless WASM; all intrinsic refusals are FREE |
| T1 | verified local read — digest-keyed cache hit; local carrier + hash | RAM→NVMe (≈100 ns – 100 µs) | hot dots; maintained index carriers; hashing ≈GB/s |
| T2 | positioned read/append — KV get, stream publish, consumer step | same-DC round trip (≈0.5 ms) | journal appends; directory reads; watches; door-relative checks |
| T3 | remote carrier fetch — placement lookup + fetch + verify | WAN (≈10–150 ms) | cold blobs; replay; parallel from UNTRUSTED sources — verification is local |
| T4 | the fence — expected-sequence publish, ×(1 + contention) | consensus (RTT × rounds) | `decide` only; the one mandatory wait |
| T5 | ratification — grill, seal, writ grant | minutes–days; never printed on classical charts | the human plane; the design exists to keep this rung rare |

Three inversions against the classical table:

1. **Cache invalidation is deleted.** A digest-keyed entry is valid
   forever (referential transparency of content addressing). Names
   are the only mutable plane, and there "invalidation" is a new
   greatest position — a pushed event, not a guess.
2. **Speculation is free on the join plane.** Optimistic work can
   never conflict where everything is monotone; the only rollback
   surface is the fence, and a fence-race loss is a cheap typed
   retry — the branch-mispredict analog.
3. **The expensive instruction is not the disk seek; it is
   coordination** — and the ladder gains a rung (T5) the classical
   table never had. CALM is the demotion theorem: monotone ⇔ may
   skip T4.

Also: the KM-20 stability split doubles as the admission cost model
— intrinsic checks price at T0 (no world knowledge needed),
door-relative checks at T2 (one directory read).

### 10.2 The two pipelines (duplex, priced per stage)

    INGRESS  candidate ─T0 admit─▶ T2 append fact ─▶ [large payload: T3 carrier put + T2 placement fact]
             door-relative checks add one T2 read; indexes maintain themselves at T2 in the background

    EGRESS   query ─T2 resolve name (cacheable)─▶ T1 eval on maintained fold ─▶ T1 verify + serve
             cold path: T3 replay; subscriptions push deltas at T2

Ingress totality (the door) and egress totality (§5's candidate law)
are the same statement made twice: nothing enters unjudged, nothing
leaves undeclared.

### 10.3 Harness needs on the ladder

| Harness need | Classical analog | Estate construct | Steady-state tier | Law that buys the tier |
|---|---|---|---|---|
| working context | registers/RAM | session consumer + anchored reads | T1–T2 | positions are read-plane |
| long-term memory | disk | resolve name → fetch dot | T2, then T1 forever | digests never invalidate |
| search | on-disk index | declared reduction, incrementally maintained | T1 query / T2 maintain | associativity ⇒ incrementality |
| logging | append-only file | `emit` — the journal IS the log | T0+T2 | idempotent join ⇒ retries free |
| deps / config | DI container, env | provision fold = KV greatest-read | T2 | the proven correspondence |
| locks / coordination | mutex, consensus | `decide`, expected-sequence | T4 | CALM: only non-monotone pays |
| cache | L1/L2 | digest-keyed memo | T1 | content addressing |
| replication / durability | RAID, backup | placement facts; ≥k as a measured fold | T3 background | placement = hint plane |
| compaction / GC | defrag | distillation fold + fenced rebind | T3 background + one T4 | view change, not data change |
| runtime verification | CI, hope | the door, always on | T0 intrinsic / T2 relative | KM-20 split = cost split |
| escalation | page the on-call | grill / seal | T5 | fences price authority |

### 10.4 The license table: optimization = proof

Every classical optimization has a lawful precondition that classical
systems assert by hope (or test) and the estate holds by brand:

| Classical optimization | The law that licenses it | When unlicensed |
|---|---|---|
| shard / parallelize | commutativity | rung⇒carrier type error |
| retry, at-least-once | idempotence | never needed — exactly-once refused as vocabulary |
| incremental / delta views | associativity (monoid fold) | replay from anchor |
| fuse passes | fold composition under KM-19 combinators | leaves-the-variety refusal |
| memoize forever | content addressing | `unverifiedRead` on mismatch |
| pushdown to storage | homomorphism (F2 invariance) | quotient violation |
| speculate | monotonicity of the join plane | fence races only, typed retry |
| approximate in constant space | bounded-semilattice sketches (HLL/CMS/MinHash) | non-mergeable sketch refused |
| skip coordination | CALM: monotone ⇔ coordination-free | unfenced decide refused |

### 10.5 Bounds

Tier assignments are ordering claims, not measurements; constants
(hash throughput on large blobs, WASM boundary crossings, NATS
locality, fence contention) move real numbers within and across
adjacent tiers. AE-7 commissions the estate's own numbers table from
the live deployment; until it lands, this section licenses design
decisions, not capacity plans.
