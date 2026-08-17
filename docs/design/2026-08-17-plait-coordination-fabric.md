# Plait — a braided-venue coordination fabric (design commission)

Status: **commissioned exploration**, ordered by the operator 2026-08-17 as a
separate lane beside the active REF program — separate, not distinct: every
construct below is either an estate artifact consumed at its recorded status
or a new proposal marked as such. **Everything new here is PROPOSED pending
the operator's grill.** This document changes no code, no ledger row, no
dispatch spec, and no seam status. The working name "Plait" is itself
unratified (grill sheet, G2).

> **Amended 2026-08-17, same day:** the operator directed that action be
> made a first-class consideration before further formalization. Part 2 —
> [the action plane](2026-08-17-plait-action-plane.md) — adds constructs
> C6–C9 and laws F7–F10, inserts slices 2a/4a, promotes the agentic demo
> scene, and appends grill items G8–G12. Its §8 is the amendment map;
> this document stands otherwise unchanged.

Confidence tiers, used on every load-bearing claim:

| Tier | Meaning |
| --- | --- |
| **ratified** | cites a grill record or standing ruling |
| **proven** | cites a Lean theorem behind a green gate |
| **measured** | cites a ran-it result recorded in a durable estate document |
| **shipped** | cites code on main, read in place this session |
| **proposed** | this document's own design; not yet grilled |
| **lead** | external claim not verified against a primary source this session |

---

## 1. What this is

A design for a **scalable multi-agent coordination framework**: many
software agents (and humans), on many machines, doing frontier-scale data
work together — with the coordination guarantees coming from proved
mathematics rather than from convention. The user-facing API is TypeScript
on **Effect v4** (the estate's pinned `4.0.0-rc.108`). The transport and
control substrate is **NATS JetStream** (the estate's pinned
`nats-server v2.14.4` / `nats.go v1.53.1`, already embedded in the daemon).
The framework is **agent-implementation-agnostic**: a node is anything that
speaks the wire contract and passes a generated conformance harness — an
Effect process, a Go process, a shell script, an LLM behind MCP. Nothing
about a node's inside is ever trusted; only its bytes are.

One sentence for an outsider: *agents coordinate by growing a shared,
content-addressed body of evidence that is safe to replicate sloppily,
plus a tiny number of declared decision points that are not; the mathematics
says exactly which is which, and the framework physically separates them.*

Glossary posture: estate terms (journal, seat, hole, fill, fence, close,
refusal, wall, rung, effector, canonical bytes) are used with their
[CONTEXT.md](../../CONTEXT.md) meanings and glossed at first use. New terms
(fabric, venue, commons, lane, node, anchor floor) are defined where they
first appear and collected in §14.

---

## 2. Result first — the five decisions this design turns on

**2.1 The fabric is the already-ruled scale shape, given machinery.** The
production-architecture lane ruled the shape: *the daemon stays a
single-writer, loopback, file-backed sidecar, and scale arrives as multiple
single-writer venues, never one replicated venue* (measured + proposed,
[orchestration synthesis §2.3](../research/2026-08-16-orchestration-analysis-synthesis.md)).
Plait builds exactly that: a **venue** is one single-writer daemon with its
journals; the **fabric** is venues plus a shared **commons** (evidence
streams, lease registers, blob store) plus any number of **nodes**. There
is no orchestrator anywhere — the estate's coordination doctrine ("an agent
is `(head, writ)`; coordination lives in the protocol value; chat between
agents is residue, not mechanism" — measured,
[dispatch 21](../../scratch/dispatch/21-the-use-catalog.md)) survives the
network unchanged.

**2.2 CALM is the architecture, not a citation.** The estate's ratified
identification of its move calculus — a join-semilattice of
holder-attributed observations (a CvRDT), arbitration declared as a protocol
constant, and the one non-monotone act (close) at a declared coordination
point, exactly where CALM proves one must exist (ratified,
[determination](../research/2026-08-17-proof-support-determination.md)) —
becomes a physical partition. Plait has two planes: a **monotone plane**
(evidence, checkpoints, attestations, sealed-fact records) carried on
JetStream streams under at-least-once, unordered, duplicated delivery,
harmless *by theorem shape*; and a **coordination plane** (close, lease,
epoch) confined to compare-and-swap registers. REF-1 models no network
because its journal is single-homed — a licensed decision with the Gomes
et al. network axioms as the foil (ratified,
[spec 24](../../scratch/dispatch/24-ref1-wire-model-spec.md) §Academic
grounding). Plait is the multi-homed generalization: **the network layer
returns, and each returning axiom is discharged again** — by content
addressing, by all-pairs commutation, by JetStream's substrate contract,
and (the one open row) by the attribution decision. §5.6 gives the table.

**2.3 Semantic coherence is digest equality, and the address space is
semantic, not temporal.** Coherence between heterogeneous agents is never
asserted; it is computed: identity is SHA-256 over RFC 8785 canonical bytes
(shipped; the law itself is REF-2a's incoming theorem,
[spec 23](../../scratch/dispatch/23-ref2a-canonical-value-law-spec.md)),
state is a fold of a verified journal, and agreement is byte equality of
re-derived digests. The fabric's coordinates are content addresses —
sessions pinned by digest, evidence pinned to inputs by certificates,
results keyed by `(fold digest, head)` — so "where are we?" is a position
in a DAG of meanings, not a position in time. No wall clock, no vector
clock, no sequence number ever enters identity.

**2.4 The laws are the API.** Following the estate's declared-rights
discipline (a function enters the public surface only with the law that
licenses it — ratified, ADR-0010 via [CONTEXT.md](../../CONTEXT.md)), every
theorem in §9 surfaces as an Effect v4 capability, and every capability the
theorems do not license is physically absent: there is no ordering
configuration because delivery order is provably irrelevant on the monotone
plane; there is no cache-invalidation API because `(fold digest, head)`
results are immutable truths; partition-parallel deployment is available
only to algebras whose commutativity class earns it. §8.4 gives the table.

**2.5 The demo is a chaos gauntlet with a byte-identical verdict, and it is
honest about what it cannot claim yet.** The proven demo (§11) is a
frontier-data distillation run by heterogeneous nodes under a kill-and-
duplicate chaos harness, accepted by one mechanical check: the final state
digest equals the digest of a sequential single-process reference fold,
plus a live conformance monitor at zero violations, plus negative controls
that each break exactly one law and are refused. Two scope fences,
pre-registered: **attribution** — seat bindings are today unauthenticated
strings and replay launders forgery (measured, synthesis §1.1), so every
multi-party *evidentiary* claim is gated on the estate's pending
attribution decision; and **liveness** — no liveness claim exists anywhere
in the estate ledger, nothing in the surveyed proof landscape supports the
lease-progress half, and the estate has pre-registered fair-retry theorems
as a ratification-gated kind change (ratified, determination D-5a). Plait
claims safety only.

---

## 3. The commission and its posture

The operator's charge: a stream-first, distributed, agent-agnostic
coordination framework; Effect v4 API; NATS/JetStream transport and
control; built on the fold and meaning work; grounded in the proof-support
briefing and its successors; realistic slices to a proven demo; creative
but competent — drawing on proven constructs rather than repeating existing
framework patterns.

Three estate disciplines bind this lane from birth:

1. **Concepts are ratified before machinery exists** (ratified,
   [AGENTS.md](../../AGENTS.md)). This document is the pre-grill artifact.
   No slice dispatches before the grill sheet (§13) is worked.
2. **Generated vectors, not hand-typed** (ratified, AGENTS.md): every
   fixture standing in for the fabric model's answers is emitted by
   executing that model, regenerated byte-identically in CI.
3. **Claims sized to evidence, on the rung ladder** (ratified; R0 fixture
   wall → R5 mechanized proof). Every law in §9 carries a target rung; a
   claim enters VERIFICATION.md only when its gate is met.

And three standing rulings shape what Plait may NOT be:

- **Not MPST.** Ordered-interaction metatheory is refused (ratified,
  [MPST refusal](2026-08-17-mpst-refusal.md)): nothing here blocks, fills
  are total, refusals are data. Plait's protocol story is unordered and
  observational; the refusal's one IOU — a projection-style soundness
  theorem for any per-seat view — is inherited by the fabric frontier
  (§7.3).
- **Not Effect durable execution.** The vendored Effect v4 workflow
  surface's execution identity is a truncated, delimiter-ambiguous,
  developer-asserted pre-image; the lane that ran it produced a cross-tag
  collision, and adoption was refused (measured + ruled, synthesis §3.5,
  §4 "Decided not to do now"). Plait keeps foldlab identity: full SHA-256
  over canonical bytes, re-derived by every reader. Effect supplies the
  runtime discipline (fibers, scopes, layers, schema, streams) — never
  identity, never durability semantics.
- **Not a replicated venue.** Load-bearing journals never get JetStream
  mirroring or clustered replication in v0: the standing stream-shape gate
  refuses every eviction lever including mirroring (shipped, synthesis
  §2.3), the substrate assumptions gate refuses clustered JetStream and
  R>1 KV (shipped, `go/substrate/assumptions_test.go` per the corpus
  sweep), and the write path does not yet verify the chain link the read
  path checks — a wrong-`prev` entry winning CAS permanently bricks a
  journal the moment a second writer exists (measured, synthesis §2.3).
  Federation is verified replay at the application layer, and slice 3
  closes that write-path hole before any second writer is allowed to
  exist (§10).

One archived-claims honesty note: the effector (the fencing-token lease
register over JetStream KV) is shipped machinery whose *verification
claims* (R3+R4) were archived in the 2026-08-15 estate-focus purge. Plait
re-earns those claims under its own gates (§9, F5); it does not cite the
archive.

---

## 4. Inherited ground

What this design consumes, at the status it actually holds:

| Artifact | Status | What Plait takes |
| --- | --- | --- |
| Move-calculus identification (CvRDT + declared arbitration + CALM close) | ratified | the shape of the monotone plane and the licensed placement of every coordination point |
| `runRepairK_perm`, `fence_deterministic`, `decided_stable`, stability family | proven (model-level R5, footprint-clean) | the theorem shapes F1/F2/F4 restate over fabric objects |
| RFC 8785 canonical bytes + structural digest discipline | shipped (R1 differential); law incoming as REF-2a | the identity function; coherence = digest equality |
| Wire subjects `flb.req.*`, `flb.ing.*`; refusal envelope with kind/sort/law/path/next | shipped | the request plane Plait extends, and the error protocol every node speaks |
| Session/protocol laws (fills idempotent per `(value, seat)`; close atomic at declared authority; final-state digest excludes journal head) | shipped (R0/R1, single daemon) | sessions ride venues unchanged; the fabric adds reach, not semantics |
| Effector shape: one authority value per work digest, version-checked CAS, monotone fencing token | shipped; claims archived | the coordination plane's only primitive — re-verified as F5 |
| "One CAS, two keyings" (journal CAS-append and KV revision CAS are the same server-side check) | measured (synthesis §2.3) | one substrate assumption covers both planes |
| Substrate assumptions gate (atomic create-if-absent, revision CAS, linearizable reads, terminal immutability; refuses clustered JS, R>1, in-memory) | **archived** — corrected 2026-08-17: the executable gate was purged 2026-08-15 with `go/effector/` and lives at `archive/pre-estate-focus`, not on main (wave-2 drafting finding); its *content* is honored as the envelope | the envelope Plait v0 stays inside; re-landing the executable gate rides E5's substrate probes; extending it is a named grill item (G3) |
| Venue ruling (multiple single-writer venues) | measured + proposed (synthesis §2.3) | the topology |
| At-least-once fill safety (redelivered `(value,seat)` replies OK, head unchanged) | shipped | the monotone plane needs no dedup layer for correctness |
| MPST refusal + projection IOU | ratified | the conformance posture (§7) |
| Attribution gap (bindings are bare strings; replay launders forgery) | measured, decision pending | the fabric's hard scope fence (§7.4) |
| REF-0: WASM-preferred kernel, stateless `step(stateBytes, opBytes)` ABI, total by refusal, self-identifying | ratified (grill closed; spike outstanding) | the future portable conformance core any node embeds (§7.2) |
| Effect v4 pin `4.0.0-rc.108`, vendored | law (AGENTS.md) | the API substrate; all sketches checked against the vendored source |
| NATS pins `nats-server v2.14.4`, `nats.go v1.53.1` | shipped (go.mod ×2) | the substrate version envelope |
| Lean landscape verdicts: Veil DEPEND (pinned package, `veil.smt.trust=false`), CSLib DEPEND when the transport/LTS lane opens, Sal LEARN | proposed (landscape exploration, ratification pending) | the proof-package plan (§9.3) — adoption is grill-gated |

---

## 5. The mathematical core

Plait is five constructs and one returning layer. Each construct is stated
with its law, the law's provenance, and what the law buys operationally.
Nothing below is novel mathematics — that is the point. The novelty is the
composition: which proven construct carries which operational burden, so
that the dangerous parts of a distributed system (delivery, retry, crash,
concurrency) land on constructs that are provably indifferent to them.

### 5.0 The objects

Fabric state is four families of objects, all content-addressed:

- **Journals** (per venue): append-only event logs, single-writer,
  CAS-appended, verify-on-read. Unchanged from the estate.
- **Cells** (commons): join-semilattice values — evidence bags, membership
  sets, index anchors — merged by least upper bound.
- **Registers** (commons): lease/epoch authorities — one per work digest,
  advanced only by version-checked CAS, carrying a monotone fencing token.
- **The DAG**: the graph induced by digests-inside-values — sessions pin
  predecessors, certificates pin schema/program/input anchors, checkpoints
  pin heads. Not stored anywhere as a graph; it *is* the values.

A **node** holds no fabric state authoritatively. A node is `(head, writ)`:
what it has verified, and what it may speak. Crash-recovery is therefore
free by construction — restart re-attaches a writ to a head (measured,
dispatch 21 E2).

### 5.1 C1 — the evidence lattice

**Law (F1/F2 in §9): fabric evidence forms a join-semilattice of
holder-attributed observations; merge is associative, commutative,
idempotent; and the terminal state of any evidence trace is invariant
under permutation AND duplication of the trace.**

Provenance: the ACI package and permutation invariance are proven at
model-level R5 in the estate (`runRepairK_perm`; the semilattice laws at
`verify/moves/Moves/Model.lean:200-256`); the convergence framing is
Shapiro et al. 2011; the estate's operation set sits in the degenerate
best corner of the Gomes et al. hypothesis space — `repairK_comm` commutes
*all* pairs, so causal delivery has nothing left to do (ratified framing,
proof-support briefing §2.1, §3.1).

What it buys: **JetStream's real delivery semantics — at-least-once,
redelivery, no cross-consumer order — is the correct delivery semantics
for this plane, not a hazard to engineer around.** Duplicates are no-ops
by idempotence; reorderings are no-ops by commutativity; a redelivery
storm costs bandwidth, never meaning.

### 5.2 C2 — declared arbitration and the CALM boundary

**Law: any sound arbitration rule that is a function of the candidate set
alone decides identically across all interleavings of the same bag
(`fence_deterministic`, proven R5); and the act of fixing "the bag is
complete" is non-monotone, so it requires a coordination point (CALM,
ratified framing).**

Plait inherits both halves as architecture. Arbitration (the fence) is a
declared constant of the protocol value — never derived from timestamps,
which is why the fabric needs no clocks (ratified sentence, determination
D-3). And the coordination points are enumerated, closed, and tiny:
**session close** (at the session's home venue, under its declared close
authority — D104) and **register advance** (lease grant, fenced commit,
epoch bump — on KV CAS). Everything else in the fabric is monotone and
coordination-free. The design rule, stated once and enforced by the API
(§8.5): **evidence is never fenced; only outcomes are.**

A sealed outcome re-enters the monotone plane as a fact: "this authority
sealed digest D at register revision r" is itself an observation, mergeable
and replicable like any other — the inflationary-tombstone trick, standard
in the CRDT literature and already the estate's `decided` idiom
(proof-support briefing §2.5). The coordination plane therefore never needs
to be read synchronously by anyone but the contenders at the moment of
contention.

### 5.3 C3 — content-addressed identity and what "semantic coherence" means

Identity: SHA-256 over RFC 8785 canonical bytes, always re-derived, never
asserted (shipped discipline; theorem incoming at REF-2a). On that base,
coherence between agents is four checkable properties, in increasing
strength:

1. **Identity coherence** — two nodes mean the same value iff their
   re-derived digests are byte-equal. No negotiation, no schema registry
   handshake; the certifier and catalog already give type identity the
   same treatment (shipped).
2. **State coherence** — two nodes that have verified the same evidence
   set hold the same cell state (strong eventual consistency; F1/F2). The
   *set* matters, the *schedule* does not.
3. **Decision coherence** — two nodes that verify the same sealed record
   agree on the outcome forever (`decided_stable` shape; sealed facts are
   terminal for meaning).
4. **Derivation coherence** — every derived record carries a certificate
   (schema digest, program digest, input anchor, span head — shipped
   vocabulary) whose every field an auditor re-derives; a derived surface
   cannot drift from its input because its input has committed identity.

This is the operator's semantic-space thesis made mechanical: the fabric's
notion of "where we are" is a set of digests reachable in the DAG — a
knowable semantic state — and "alignment" between two agents is
intersection of verified sets, not synchronization of clocks. Time appears
in the fabric exactly twice, both non-semantic: venue-local journal
positions (an implementation of "before" within one writer) and lease
deadlines (a liveness heuristic with no meaning-side effect).

### 5.4 C4 — the fold algebra and its declared rights

The estate's fold discipline (CONTEXT.md, shipped): a **declared algebra**
is a monoid named by canonical data — it has a digest, not only a
behavior; a **declared step** likewise; a fold's identity is the digest
over (algebra declaration, step digest); and **declared rights** attach to
proved laws — associativity licenses parallel replay and mid-stream
compaction, the monoid action licenses O(1) extension, uniqueness licenses
the invalidation-free cache keyed `(fold digest, head)`, a declared
homomorphism licenses derived views with no replay, and the
**commutativity class** decides whether cross-partition reordering is
licensed at all.

Plait distributes exactly this and nothing more:

- A **lane** is a declared evidence stream: (event schema digest,
  partition count, partition key derivation) — itself a canonical value
  with a digest, cataloged like any type.
- A deployed fold is a durable consumer whose **anchor** — the checkpoint
  fact `(fold digest, lane, partition) → (position floor, state digest,
  head)` — lives as a commons KV fact, advanced by plain revision CAS
  (single writer per fold-partition; not a merged lattice cell — the
  §6.3 mapping row is authoritative; wording corrected 2026-08-17).
  The anchor is a fact, not a cache:
  keyed by fold identity and history identity, it is an immutable truth
  wherever it federates.
- **Resumption law (F3)**: folding a suffix from a checkpointed state
  equals folding the whole history — `fold (xs ++ ys) = foldFrom (fold xs)
  ys` — so crash-resume produces byte-identical state digests.
- **Partition law (F4)**: for algebras in the commutative class, the merge
  of per-partition folds equals the sequential fold — `Multiset.fold_add`
  is this exact statement in Mathlib (fold of a union equals op of the
  folds, for ACI ops), and the estate's permutation theorems are its
  in-house siblings.
- **The successor discipline (F2b)** manufactures effective idempotence
  for algebras that are not idempotent (counting is the canonical
  example): arrivals are admitted through a window and applied only at
  the contiguous frontier, so any at-least-once redelivery schedule
  applies each event exactly once. The anchor's position floor is the
  *derived record* of that frontier — the resume coordinate — not
  itself the protector (attribution corrected 2026-08-17: the DEV-695
  re-review proved a floor guard observationally redundant given the
  discipline — `guard_is_redundant`, footprint-clean). This is what
  lets non-idempotent folds ride the sloppy plane safely, statable in
  Lean over list-with-positions traces.

### 5.5 C5 — the lease register

The estate's effector, promoted to the fabric's only exclusive-work
primitive: one authority value per work digest; advance by version-checked
CAS; a **monotone fencing token** — not holder identity — decides which
commit lands (shipped shape, CONTEXT.md §Effector). The safety statement
(F5, target R3 inductive invariant, then R4 lockstep): *at every register,
grants carry strictly increasing tokens; a commit is accepted iff its
token equals the register's current token; therefore no two holders ever
both land commits for one work digest, regardless of crashes, retries, and
arbitrary interleavings.* The zombie-holder case — a node that lost its
lease but keeps computing — is harmless by construction: its evidence
remains attributed evidence (monotone plane, welcome), and its *commit*
carries a stale token and is refused (coordination plane, fenced).

"One CAS, two keyings" (measured): the journal's CAS-append and the
register's revision CAS are the same server-side primitive. Plait's whole
coordination plane therefore rests on one substrate assumption, already
gated by an executable test in the estate.

### 5.6 The returning network layer

REF-1 dropped the network locale because a single-homed journal discharges
its axioms by construction (ratified, spec 24). Plait is multi-homed, so
each axiom returns and must be re-discharged. This table is the fabric's
theory heart — the left column is the Gomes et al. Isabelle network locale
verbatim as the estate already carries it:

| Network axiom | What it guards | How Plait discharges it |
| --- | --- | --- |
| `msg_id_unique` | global uniqueness of message identity | content addressing: message id = SHA-256 over canonical envelope bytes; uniqueness is collision resistance, already in the trusted base |
| `histories_distinct` | no duplicate events per node | per-venue CAS-append refuses positionally (unchanged); on the commons plane duplicates are *permitted* and harmless — F2 idempotence / F2b successor discipline |
| `deliver_locally` | a broadcaster sees its own message | JetStream: a publisher reads its own stream; venue journals unchanged |
| `causal_delivery` | delivery order respects happens-before | **vacuous by design**: the fabric's stream alphabet is all-pairs-commuting (the `repairK_comm` discipline extended to fabric ops), so no delivery order is privileged; this is a design *constraint* — any proposed fabric op that does not commute with all others is refused from the alphabet and must ride the coordination plane instead |
| `delivery_has_a_cause` | no message minted by the network | **the one open row.** Within a venue: single writer, verify-on-read (unchanged). Across the fabric: today this rests on transport authentication (per-node NATS credentials) and on SHA-256 self-consistency of envelopes; *who authored an observation* is exactly the estate's undecided attribution scheme. Plait pre-registers the dependency and scopes v0 accordingly (§7.4) |

What is deliberately NOT re-introduced: vector clocks (arbitration is
declared, not derived — the fabric never needs to order concurrent
writes); consensus (the fabric implements none; JetStream's internal RAFT
is a substrate fact outside our claims, and within the v0 envelope R=1
means it is not even exercised); exactly-once delivery (refused as a
claim; the `Nats-Msg-Id` dedup window is a bounded bandwidth optimization,
never a correctness mechanism — correctness is F2/F2b).

### 5.7 Pre-registered candidate law — the estate-of-safety through-line

Every estate audit hunts the law that extends safety by construction. This
commission pre-registers its candidate now, before any build:

> **Meaning cannot be corrupted from the wire.** For every fabric trace,
> including arbitrary messages from arbitrary connections speaking the
> fabric alphabet: (1) every accepted record's digest re-derives; (2)
> venue journals extend append-only with verified chain links; (3) any two
> readers that verified the same evidence set hold byte-identical cell
> states; (4) a sealed outcome never changes, and no stale fencing token
> ever lands a commit. Violations surface as refusals or findings, never
> silently. **Liveness is explicitly outside the candidate**: spam,
> refusal storms, and lease contention may stall progress without bound.

Bounds, stated with the candidate: (1)–(2) rest on SHA-256 collision
resistance plus the substrate assumptions gate; (4) rests on KV
linearizability inside the current non-clustered envelope; and the
candidate speaks of *meaning integrity*, not authorship — who said a thing
is the attribution decision's territory, not this law's. The candidate's
formal life begins at F5/F6 (§9) and its runtime life at every slice's
negative controls (§10).

---

## 6. Architecture

### 6.1 Topology

```
  node (Effect/TS)      node (Go)         node (LLM via MCP)     human seat
      │ writ                │ writ              │ writ                │ writ
      ▼                     ▼                   ▼                     ▼
 ┌─────────┐          ┌─────────┐               │                     │
 │ venue A │          │ venue B │        (req plane over NATS to a venue)
 │ 1 writer│          │ 1 writer│
 │ journals│          │ journals│
 └────┬────┘          └────┬────┘
      │  evidence, checkpoints, sealed facts (monotone plane: streams)
      ▼                     ▼
 ┌──────────────────────────────────────────────┐
 │ commons — evidence lanes (JetStream streams) │
 │           cells + anchors (KV, merged)       │
 │           lease registers (KV, CAS)          │
 │           blobs (object store, by digest)    │
 └──────────────────────────────────────────────┘
```

- **Venue**: one estate daemon (protod-shaped): single-writer, file-backed,
  its own journals, its own catalog authority. Unchanged. Sessions live
  here; close happens here; the wire laws W1–W10 are its contract.
- **Commons**: a NATS system (in v0: one non-clustered JetStream node,
  R=1 — inside the substrate envelope) hosting the shared planes. The
  commons is a **liveness** single point of failure and a **meaning**
  nobody: every value it carries is content-addressed and re-derivable,
  every cell is a lattice element reconstructible from evidence, every
  register outcome is sealed into the monotone plane. A commons outage
  stalls the fabric; it cannot corrupt it (candidate law, §5.7). Moving
  the commons to clustered JetStream is a later slice that must first
  extend the substrate assumptions gate — named honestly as G3 rather
  than assumed.
- **Node**: any process holding NATS credentials for the fabric, speaking
  the writ. Nodes are cattle; their state is anchors plus verified heads.

### 6.2 Subject grammar

Extends the shipped `flb.*` table (`proto/wire/CONTRACT.md`); subjects
route, envelopes identify — no digest-as-identity ever rides a subject
token alone, and nothing semantic depends on subject structure:

```
flb.req.>                        (shipped request plane, unchanged; remote
                                  seats reach a venue's daemon through it)
flb.fab.ev.<lane>.<part>         evidence lanes: lane = short lane handle
                                  (the lane *declaration* is cataloged and
                                  content-addressed; the handle is routing
                                  sugar), part = declared partition
flb.fab.fact.<venue>             sealed facts + checkpoints announced by a
                                  venue or authority
flb.fab.node.<node>              advisory presence/heartbeat; no meaning
KV flb-fab-cell                  lattice cells (membership, indexes)
KV flb-fab-anchor                fold anchors: (foldDigest,lane,part) →
                                  (floor, stateDigest, head)
KV flb-fab-reg                   lease registers: workDigest → (token,
                                  holder, outcome?)
OBJ flb-fab-blob                 payloads > inline threshold, named by
                                  digest
```

### 6.3 The JetStream mapping, with its real semantics

| Fabric object | JetStream mechanism | Semantics relied on | Semantics refused |
| --- | --- | --- | --- |
| venue journal | file-backed stream, CAS-append via expected-last-sequence-per-subject precondition | atomic conditional append; per-subject total order (the CAS cursor is the global stream sequence of the subject's latest message, not a per-subject ordinal) | replication, mirroring, any eviction lever. Terminal immutability is supplied by the credential/shape guard, not by the mechanism — an authorized client's revision-checked delete and purge both succeed (probe-verified) — and no live guard exists on main today; the archived assumptions gate must be re-landed before "standing shape gate" is claimed again |
| evidence lane | stream, limits-based retention by declared policy | at-least-once delivery; durable consumers; per-subject order within a partition | exactly-once (dedup window is bounded); cross-partition order (none exists) |
| fold frontier | durable pull consumer; explicit ack; ack floor advances only after the anchor CAS lands | redelivery of unacked messages after crash | ack as a correctness mechanism (correctness is F3 + F2b; ack is flow control) |
| cell / anchor | KV bucket; merge-then-`update(rev)` loop for cells; plain `update(rev)` for anchors | revision CAS; linearizable read within the (non-clustered) envelope | last-writer-wins as a merge (cells merge by ⊔ before write; a lost CAS race re-reads and re-merges — convergent by F1) |
| lease register | KV `create` (grant) / `update(rev)` (renew, commit, steal-after-expiry) | revision CAS = the fencing token's total order per key | holder identity as authority (the token decides, never the who) |
| blob | object store, digest-named | content-addressed chunked storage | any identity role for object-store metadata |
| work distribution | work-queue-retention stream of claim *hints* | each hint delivered to one active consumer; redelivery on ack timeout; overlapping consumer filters refused by the server | exclusivity (a hint is advisory; exclusivity is the register's job — a raced hint costs duplicate work, never duplicate commits) |
| dedup | `Nats-Msg-Id` = envelope digest | bandwidth suppression inside the per-stream window (default 2m0s; a suppressed duplicate returns the original sequence marked `duplicate: true`). Probe-verified exception: on a publish that also carries the CAS precondition the server checks CAS *before* dedup — an exact retry of an already-landed CAS append is refused `400/10071`, never answered `duplicate: true`; and once the predicate passes, suppression is by ID alone, stream-wide, regardless of subject or bytes. An ambiguous CAS outcome is therefore resolved by reading the subject's last message back and comparing it to the intended append, never by expecting a duplicate PubAck | correctness (F2/F2b carry it); any ID-uniqueness scope below the whole stream |

The probe-verified entries above were validated against the pinned
substrate on 2026-08-17 (DEV-704): `nats-server v2.14.4` places the CAS
check before the dedup lookup (`server/stream.go:6440-6466` vs
`:6671-6690`), and KV revision-checked delete/purge succeed for an
authorized client (`nats.go v1.53.1`, `jetstream/kv.go:1153-1205`). One
client sharp edge rides with them: every wrong-last-sequence refusal is
API code `10071`, so adapters classify by operation context plus code —
never by `ErrKeyExists` alone. The register slice consumes the full
finding set through its dispatch seam.

Payloads: the server's default max payload is 1 MiB (raisable; 8 MiB is
the documented recommended ceiling); the fabric inlines
values below a declared threshold (proposed: 256 KiB canonical bytes) and
carries `blobRef: <digest>` above it. Identity is always of the canonical
uncompressed value bytes, never of the transport form (CONTEXT.md law) —
so inline-vs-blob is invisible to identity, and the wall that checks it is
cheap.

Delivery honesty, in one paragraph an outsider can hold: a consumer sees
its stream in order, except that redeliveries of unacknowledged messages
arrive late and interleaved; with parallel in-flight processing,
effective application order inside a node is arbitrary; across partitions
and across streams there is no order at all; duplicates occur. Plait's
response is not configuration but algebra: everything on this plane is
ACI or applied at the contiguous frontier by the successor discipline,
so *the semantics the transport actually has* is
already the semantics the theorems require. This is the design's center
of gravity, inherited directly from the estate's at-least-once fill law
(shipped): the transport was made safe by making the operations
indifferent, not by making the transport careful.

Substrate corroboration, worth one paragraph: the server line itself has
been converging on this center. NATS 2.12 shipped CRDT **counter
streams** (`Nats-Incr`, ADR-49) — the substrate vendor reaching for the
same mathematics — and the current delivery docs recommend consume-side
double-ack *only* "when reprocessing a message would be harmful and you
can't make the handler idempotent" (fetched 2026-08-17). Plait's answer
is that every handler on the monotone plane is idempotent by law, so the
stronger machinery is never needed; and it does not adopt server
counters, because they are not content-addressed — the lattice discipline
stays in the fabric, where its identity and its proofs live. Likewise
2.12's server-side `partition(n)` subject transform is noted and not
used for meaning: partition derivation is identity-bearing (it enters the
lane declaration digest), so it stays declared client-side; a server
transform may only ever mirror it as routing.

### 6.4 Federation

Cross-venue replication is verified replay through ingress — re-derive
every digest, re-check every chain link, append through the same CAS —
which the production-architecture lane measured as byte-exact and
idempotent (measured, synthesis §2.3). Plait adopts it with one
non-negotiable addition, closing the lane's own finding before it becomes
reachable: **verify-on-ingest** — the fabric's replication path re-checks
the `prev` chain link *before* the CAS attempt, and slice 3's negative
control is precisely a planted wrong-`prev` frame shown refused. JetStream
mirroring stays refused for load-bearing journals (shape gate); evidence
lanes, being ACI, may later use mirroring as a bandwidth optimization
without a correctness stake — noted as future work, not v0.

### 6.5 Failure model

| Failure | Plane it touches | Consequence |
| --- | --- | --- |
| node crash | none | restart = re-attach writ to head; fold resumes from anchor (F3); lease expires and is stolen with a higher token (F5) |
| duplicate / reordered / redelivered messages | monotone | no-ops by F1/F2/F2b |
| commons outage | liveness only | evidence production stalls or queues locally; no meaning moves; recovery is reconnection |
| venue outage | liveness of its sessions | its journals are terminal-immutable; remote reads of federated copies still verify; close waits |
| zombie holder | none | evidence welcome and attributed; commit refused by stale token (F5) |
| forged authorship | **open** | meaning integrity holds (digests re-derive; lattice converges); *evidentiary* value of seat attribution is capped until the attribution decision — pre-registered fence (§7.4) |
| wrong-`prev` replication frame | meaning, if unchecked | refused by verify-on-ingest (slice 3 gate) |
| SHA-256 collision, substrate assumption violation | trusted base | outside all claims; the substrate gate and the ledger's bounds prose name them |

---

## 7. The node contract — agent-implementation agnosticism, made mechanical

### 7.1 What a node is

A node is `(head, writ)` with credentials. The writ stays the estate's
three verbs — read, publish, request — and the fabric adds **no new verb**:
evidence emission is publish to a lane; lease traffic is request/CAS
against registers; session moves are requests to a venue. W9's shape
(clients implement no authority protocol) survives: every authority check
— chain CAS, revision CAS, close authority, fence — executes server-side;
a node only ever states preconditions and receives refusals.

The monotone-plane envelope (constrained-decoded, closed struct, excess
properties refused — the shipped `wire.ts` discipline):

```
{ v: 0,
  kind: "emit" | "attest" | "checkpoint" | "sealed",
  lane:  <lane declaration digest>,
  key:   <correlation value, canonical>        // partition derivation input
  holder:<principal string>                    // v0: bare string, see §7.4
  body:  <wire-grammar value> | { blob: <digest> },
  cert?: { schema, program, inputAnchor, spanHead },   // derivation claim
  pins:  [<digest>...] }                       // DAG edges
```

All four kinds are monotone observations — `sealed` is the record *that* an
authority sealed something, not the sealing itself (§5.2). The envelope's
digest is its message id. Anything not decoding refuses structurally;
absence-sorted refusals (not-here-yet) are the retry class; structural
refusals are the repair class — the estate's two sorts, now doing transport
duty as typed backpressure.

### 7.2 Conformance is observational, and vectors are generated

MPST-style endpoint typing is refused and unavailable anyway — foreign
agents cannot be statically typed, only observed. Plait's conformance
posture:

1. **The fabric model executes** (§9.4). It emits the conformance corpus:
   traces in, states/digests/refusals out, negative rows included —
   generated by the model, regenerated byte-identically in CI
   (generated-vectors ruling, inherited whole).
2. **`plait attest`** is the admission harness: a candidate node
   implementation is driven through the corpus over a real local NATS
   (publish these frames, expect these digests, expect these refusals,
   crash here, resume, expect this anchor). Passing attest is what "is a
   node" *means*. The harness is per-implementation-language-agnostic: it
   speaks only bytes on subjects.
3. **The conformance monitor** folds live per-lane traffic through the
   model's acceptance automaton — an `Acceptor`-style instance over the
   envelope alphabet (CSLib's typeclass is the sanctioned home when that
   adoption ratifies; until then the monitor runs against the generated
   transition table). A violating node is quarantined *advisorily*
   (liveness act); its already-accepted bytes stand or fall on their own
   digests (meaning act) — the two planes again.
4. **The projection IOU is inherited.** The fabric frontier — "what may
   this node legally do next" — owes, when built, a soundness theorem in
   the `fence_deterministic` style relating any per-seat view to the
   global object (MPST refusal §IOU). Until that theorem exists the
   frontier ships as the synthesis ruled for the daemon: state-anchored
   and seat-relative, never `legal`-enumerating (synthesis §1.3).

Further out, one REF-0 dividend is reserved rather than spent: the
extraction grill's WASM-preferred, stateless, total-by-refusal kernel ABI
(ratified) means a future fabric can hand every node — Go, TS, anything
with a WASM runtime — *the same proven kernel* for canonicalization and
step semantics, self-identifying by build digest. Agent agnosticism then
stops costing per-language reimplementation of the meaning core. Nothing
in v0 depends on this; it is why the node contract keeps the kernel-shaped
seam (§8.3's codec service) rather than fusing canonicalization into
application code.

### 7.3 What conformance does NOT claim

No claim about a node's internals, model, vendor, or honesty. A conformant
node can be malicious; the candidate law (§5.7) is exactly the statement
that this costs liveness and evidentiary weight, never meaning integrity.
No liveness claim: attest measures behavior on the corpus, not
availability.

### 7.4 Attribution — the pre-registered fence

The estate's measured finding stands: seat bindings are unauthenticated
strings; any credentialed connection may act as any bound principal; replay
confirms rather than detects the forgery (measured, synthesis §1.1). The
attribution scheme is an undecided estate grill (synthesis §4 item 2), and
Plait does not decide it by the back door. Scoping, proposed:

- **v0 trust domain = one operator.** All nodes run under credentials the
  operator issues; the demo's multi-agent claims are about coordination
  mechanics, not adversarial attribution.
- **Connection identity now, principal identity later.** Each node gets
  distinct NATS credentials (the account/user machinery the pinned server
  already ships); `holder` strings are carried verbatim; the envelope
  reserves the signature seam (a detached signature over the envelope
  digest) so that when the estate's decision lands (signed principals or
  otherwise), the fabric adopts it as a field addition plus a gate, not a
  redesign.
- **Gated claims.** Any fabric demo record that would mint seat-attributed
  *evidence of who did what* inherits the estate's gate: it ships only
  after the attribution decision, or ships explicitly labeled
  connection-attributed. The distillation gauntlet's headline claim
  (digest equality under chaos) is deliberately attribution-free.

---

## 8. The Effect v4 API

Package: `@foldlab/plait`, workspace member beside `packages/core` and
`packages/moves` (proposed; G1). Runtime dependencies: `effect@4.0.0-rc.108`
(pinned) and the official NATS TS client family —
`@nats-io/{nats-core,transport-node,jetstream,kv,obj}`, candidate pin
**3.4.0** (the current modular line, released 2026-05-08 with nats-server
2.14 feature support; the legacy `nats` package is deprecated in its
favor — confirmed against the npm registry and the `nats-io/nats.js` repo
2026-08-17, re-pinned mechanically at slice 0). The client exposes both
CAS primitives the mapping table relies on, by name: publish with
`{ expect: { lastSubjectSequence } }` and KV `update(key, data, version)`
beside fail-if-exists `create` — so §6.3 is written against shipped API,
not hope. Every sketch below
was shape-checked against the vendored `repos/effect` source
(`Context.Service`, `Effect.fn`, `Stream.fromAsyncIterable(iterable,
onError)`, `Reducer.make(combine, initialValue)`, `Schema.Class`,
`Schema.TaggedError`); exact signatures are re-confirmed against
`node_modules/effect/dist/*.d.ts` when the package lands (AGENTS.md rule).

### 8.1 Design rules

1. **Refusals ride the error channel as values.** `Effect<A, Refusal, R>`
   with `Schema.TaggedError` unions mirroring the wire refusal envelope —
   kind, sort, law, path, got/expected, next. Nothing throws across any
   seam (W8). `sort: "absence"` is the only class the built-in retry
   policies touch.
2. **Streams are the read surface everywhere.** Lanes, journals, cell
   watches, fact feeds — all `Stream`s. Requests are `Effect`s. There is
   no callback surface.
3. **Scopes own lifecycles.** Connection, consumer, and lease lifetimes
   are `Scope`-bound; **lease loss interrupts the holder's fiber** —
   Effect interruption is the runtime meaning of "your token is stale."
4. **Laws gate capabilities** (§8.4). Capability-bearing types are earned
   through declaration + generated law suites, never asserted.

### 8.2 The service surface

```
FabricClient   connection + credentials (Layer; LayerMap keyed by venue)
Lanes          declare / emit / consume evidence lanes
Folds          declare algebras & steps (digest identity); deploy; anchors
Cells          lattice cells: get / merge-write / watch
Registers      lease-hold / renew / fenced-commit / observe
Venues         the request plane: sessions, fills, close, frontier, catalog
Blobs          content-addressed payload store
Attest         the conformance harness + live monitor
```

### 8.3 Sketches

A lane and a declared fold — identity from declarations, capability from
laws:

```ts
import { Context, Effect, Layer, Schema, Reducer, Stream } from "effect"
import { Lane, Fold, Algebra } from "@foldlab/plait"

class DocEvent extends Schema.Class<DocEvent>("distill/DocEvent")({
  doc: Digest, terms: Schema.Record(Schema.String, Schema.Int)
}) {}

// A lane is a declared, cataloged, content-addressed coordinate — not a topic string.
const DistillLane = Lane.declare({
  name: "corpus-distill", event: DocEvent,
  partitions: 8, partitionKey: (e) => e.doc
})

// Algebra.commutative is a *claim* that must be earned: it attaches the
// generated law suite (associativity, commutativity, identity) that runs
// in CI; only the earned brand unlocks partitioned deployment (F4).
const TermCounts = Fold.declare({
  lane: DistillLane,
  algebra: Algebra.commutative(
    Reducer.make<TermMap>(mergeCounts, emptyTermMap)
  ),
  step: (state, e: DocEvent) => addCounts(state, e.terms)
})
```

Deploying the fold — the resumption law as the only verb:

```ts
// No "reset", no "rebuild", no offset management: deploy resumes from the
// anchor or starts fresh, and the anchor is a fact keyed (foldDigest, part).
// Ack floor advances only after the anchor CAS lands (F3 + F2b at runtime).
const run = Effect.fn("distill.run")(function* () {
  const handle = yield* Folds.deploy(TermCounts, {
    checkpointEvery: 512
  })
  yield* handle.await   // fiber-supervised; interruption = clean detach
})
```

Exclusive work — the register as structured concurrency:

```ts
// Registers.hold acquires by KV create/CAS, heartbeats within the Scope,
// and interrupts the body if the lease is lost. Only Registers.commit
// carries the fencing token; a stale token refuses (F5). Evidence emitted
// inside needs no fencing at all — it is monotone and attributed.
const claimShard = Effect.fn("distill.claim")(function* (shard: Digest) {
  yield* Registers.hold({ work: shard }, (token) =>
    Effect.gen(function* () {
      const out = yield* distill(shard)
      yield* Lanes.emit(DistillLane, out)                 // monotone: unfenced
      yield* Registers.commit({ work: shard, token,       // outcome: fenced
                                outcome: out.digest })
    })
  )
})
```

Consuming a lane as a Stream (transport adapted once, at the edge):

```ts
const consume = Effect.fn("Lanes.consume")(function* (lane: LaneHandle) {
  const consumer = yield* FabricClient.pullConsumer(lane)   // Scope-bound
  const messages = yield* Effect.promise(() => consumer.consume())
  return Stream.fromAsyncIterable(messages, (cause) =>
    new TransportRefusal({ sort: "absence", cause })
  ).pipe(
    Stream.mapEffect(Envelope.decodeConstrained),  // closed struct; excess refuses
    Stream.mapEffect(verifyDigests)                // identity re-derived, always
  )
})
```

A cell write — convergence as a loop, not a lock:

```ts
// Read revision r, merge locally (⊔), CAS at r; on race, re-read and
// re-merge. Termination of the loop is liveness (no claim); convergence
// of the value is F1 (proven shape).
yield* Cells.update(membershipCell, (current) => Lattice.join(current, mine))
```

### 8.4 Laws → capabilities (the declared-rights table)

| Proved law (§9) | API consequence |
| --- | --- |
| F1 ACI merge | `Cells.update` takes only a join; there is no ordering, locking, or conflict-resolution parameter anywhere on the monotone plane |
| F2/F2b delivery robustness | no delivery-tuning surface (no dedup config, no ordered-consumer requirement); redelivery is invisible to user code |
| F3 resumption | `Folds.deploy` is the only verb — no rebuild/reset/invalidate API exists; anchors are facts, `(foldDigest, head)` results are immutable truths |
| F4 partition merge | `partitions > 1` type-checks only for `Algebra.commutative`-branded algebras (the brand is earned by the generated law suite) |
| F5 token safety | `Registers.commit` is the only effectful authority verb and demands the token; no API accepts holder identity as authority |
| REF-2a canonical law (incoming) | `Digest.of` is total on the wire grammar and *is* the coherence check; the API has no "compare semantically" escape hatch |
| `fence_deterministic` (proven) | fences are declared data on protocol values; the API offers no runtime arbitration hooks |

### 8.5 What the API refuses to expose

Raw NATS publish/subscribe on fabric subjects (the envelope is the only
door); wall-clock timestamps in any identity-bearing position; an
unfenced outcome write; a fenced evidence write (the confusion would
reintroduce coordination where none is needed); LWW registers;
exactly-once flags; consumer offset manipulation.

### 8.6 Prior art considered

- **`@effect-messaging/nats`** (0.7.6, published 2026-06-03; effectful
  wrappers for NATS connection + JetStream with publisher-to-subscriber
  tracing — primary-source, repo and registry fetched 2026-08-17). Read
  for its seam choices; not adopted: it is a 0.x surface with a standing
  breaking-changes warning, and the thin part it covers (transport
  wrapping) is not where Plait's value lives — the law/identity layer is,
  and that cannot be imported.
- **Synadia's "Agent Protocol for NATS"** and the NATS-native AI-agent
  protocol blog line (leads, not evaluated in depth): messaging
  conventions for agent fleets without content-addressed identity or
  proved merge laws — the exact axis this design exists on. AGNTCY ACP
  and Google A2A are HTTP/JSON-based; no NATS binding was findable.
- **Effect cluster/workflow** — refused above (§3), for cause the estate
  measured.

---

## 9. The proof plan

### 9.1 The assurance ladder

Adopting Sal's verification-distance honesty (its `whiteboard/
verification-distance.md` is the field's best template — lead, cited from
the landscape report): every fabric claim states which layer carries it.

```
L0  Lean model (theorems F1–F6)                       rung R5 target
L1  generated vectors emitted by executing L0          the bridge; byte-diff gated
L2  TS/Go runtimes passing the vectors + walls         rung R0/R1
L3  NATS substrate (assumptions gate, extended)        executable gate
L4  the running demo under chaos                       rung R4-flavored gauntlet
```

The deployed system is L2–L4. Nothing at L2+ is "proven"; it is *walled
against the model that is*. This sentence appears wherever the demo is
described (dogfood rule: never oversell a bound).

### 9.2 The theorems

| # | Statement (informal but exact) | Provenance / novelty | Target rung |
| --- | --- | --- | --- |
| F1 | fabric cell merge is a join-semilattice (ACI); same verified set ⇒ same state | restates proven estate laws (`Model.lean:200-256` shapes) over fabric cells; Shapiro '11 | R5 |
| F2 | terminal state of an evidence trace is invariant under permutation + duplication | permutation half is `runRepairK_perm`'s shape; duplication half is new but small (idempotent union) | R5 |
| F2b | successor-discipline application (buffer by position, apply only at the contiguous frontier) of any step function over an at-least-once redelivery schedule applies each event exactly once; the anchor floor is the derived resume record, not the protector | proven (`verify/fabric`, DEV-695); `guard_is_redundant` pins the attribution | R5 |
| F3 | `foldFrom (fold xs) ys = fold (xs ++ ys)` — anchors resume exactly | classical (`List.foldl_append` shape; Mathlib carries it); restated in-house | R5 |
| F4 | for commutative-class algebras, merge of per-partition folds = sequential fold | `Multiset.fold_add` is this statement in Mathlib; in-house restatement over lane partitions | R5 |
| F5 | lease register safety: tokens strictly increase; commit accepted iff token current; hence never two landed commits per work digest | new for the fabric; the archived effector claims re-earned. Transition system + inductive invariant — Veil's exact home turf (landscape verdict) | R3 (inductive invariant), then R4 (lockstep vs the running register) |
| F6 | conformance soundness: the acceptance automaton accepts exactly the traces the step model admits (per-lane, fill fragment first) | new; `Acceptor`/DA instance over the envelope alphabet (CSLib's typeclass when adopted) | R5 for the automaton–model equivalence; R0 for runtime monitors |

Pre-registered non-theorems (kind-change discipline, determination D-5a
honored): no fair-retry/eventual-progress statement, no lease-expiry
liveness, no convergence-under-fairness — each would move a family from
safety to liveness, exceeding every stated bound in the ledger; any future
want of one is its own ratification. FLP's mechanization in CSLib is the
standing reason to distrust anyone who offers such a theorem cheaply.

### 9.3 Homes and toolchains — three pins, deliberately

The landscape exploration's verdicts (proposed, ratification pending)
split cleanly, and the toolchain facts force the split anyway (estate
4.33.0; Veil/Sal 4.28.0; CSLib 4.34.0-rc1 — one package cannot import
across them):

- **`verify/fabric/` — zero-dependency, estate toolchain (4.33.0).** Home
  of F1–F4 + F2b, in the house style: definitions / statements / proofs
  partitioned, hygiene gates (no `sorry`/`partial`/`panic!`), footprint
  check `{propext, Classical.choice, Quot.sound}`, negative controls each
  refuting exactly one dropped law. These theorems are small (the estate
  hand-proved the semilattice package in ~55 lines); zero-dep keeps them
  inside the extraction-lane posture and the existing gate idiom. NOT in
  `verify/moves` — the active lane's package is not this commission's to
  grow (G5).
- **`verify/fabric-veil/` — separately pinned Veil package (4.28.0), F5.**
  Adopted per the landscape verdict's conditions: `veil.smt.trust=false`
  mandatory for any claimed proof (trusted mode injects `sorryAx` — the
  exact channel the hygiene gates exist to refuse), safety-only scope,
  Windows caveat carried (the cvc5 patch in
  `docs/research/reference/lean4-landscape-2026-08-17/`). The register is
  a five-action transition system (grant, renew, commit, expire-steal,
  observe) — squarely `#check_invariants` material, with `#model_check`
  enumerating small instances and the trace-JSON export feeding L1.
- **`verify/fabric-cslib/` — CSLib-pinned package (4.34.0-rc1), F6, when
  the adoption ratifies.** The landscape verdict is literally "DEPEND when
  the transport/LTS lane opens" — this commission is that lane opening.
  Until ratified, F6's automaton ships as an in-house transition table
  generated from `verify/fabric`'s step model, and the CSLib instance is
  the upgrade path.

Each adoption is a grill row (G5), priced with disk/toolchain costs from
the landscape report, reversible by package deletion.

### 9.4 Generated vectors — the L0→L2 bridge

- `verify/fabric` executes: a `#eval`-driven emitter (the DEV-670 idiom)
  walks trace corpora — including adversarial rows: duplicates, permuted
  schedules, stale tokens, wrong-`prev` frames, non-commuting alphabet
  intruders — and prints canonical-bytes vectors with verdicts. Provenance
  line = the generation command; CI diffs a fresh regeneration
  byte-for-byte; hand-typed vectors refused on sight (ruling inherited).
- The Veil package exports the F5 corpus via its trace JSON
  (`ToJson (Trace ρ σ l)`) with `Trace.isValid` proved over exported
  runs — vectors that are *theorems about themselves* (verified directly
  against the pinned Veil source: `Veil/Core/Tools/ModelChecker/Trace.lean`
  — `ToJson (Trace ρ σ l)`, `Trace.isValid`, `push_isValid`; citation
  corrected 2026-08-17, the earlier "§D" pointer was dangling). The
  unproven wrapper glue (widget-to-CLI) is named in the trusted
  base, not hidden.
- `plait attest` (L2) replays vectors against implementations over a real
  local NATS; the same corpus drives the TS runtime, the Go twin, and any
  third-party node. Walls, not trust: TS ≡ Go ≡ model, by digest.

### 9.5 The trusted base, named

SHA-256; RFC 8785 (via the estate's walled implementations, and the
REF-2a theorem when it lands); the substrate assumptions gate's contract
(extended, not assumed, for anything the fabric newly relies on — G3);
the NATS client bindings at their pins; Lean's kernel; for F5, cvc5 with
proof reconstruction on (`trust=false`), else the interactive fallback;
the vector-emitter glue. Listed in the eventual VERIFICATION.md rows, per
house law.

---

## 10. Slices

Each slice lands with mechanical gates only — the artifact runs, digests
match, negative controls refute — and each has a named consumer (the
build-behind-consumers rule). Nothing dispatches before the grill (§13).

**Slice 0 — the spine.** `packages/plait` skeleton: envelope schema
(constrained decode), subject grammar, digest discipline over the existing
`packages/core` JCS seam; toolchain pins for the NATS TS client family;
two processes exchange envelopes over a local NATS; the Go side re-derives
every digest. Gates: cross-runtime digest wall (TS ≡ Go over an envelope
corpus); a planted excess-property frame refused; a planted transport-form
fingerprint (digest over compressed bytes) refused by the wall. Consumer:
every later slice.

**Slice 1 — the durable fold.** `verify/fabric` lands F1–F4+F2b with the
emitter; `Folds.deploy` implements anchor-guarded consumption; kill -9
mid-stream, resume, byte-identical state digest vs an uninterrupted
reference; duplicate-injection harness (redeliver everything twice,
shuffled within JetStream's real semantics) — same digest. Gates: vectors
regenerate byte-identically; chaos digest equality; negative controls: a
fold deployed with `partitions: 2` over a non-commutative algebra is
refused at declaration (the brand is absent), and a build with the
successor discipline dropped — arrivals applied on receipt instead of at
the contiguous frontier — fails the duplication-and-reorder vector. A
floor-guard-removal control is deliberately not demanded here:
`guard_is_redundant` proves that build observationally identical, so the
mutant that can die is the discipline-dropped one (amended 2026-08-17,
proof-program audit A-4). Consumer: slice 5's workers.

**Slice 2 — the register.** `verify/fabric-veil` lands F5 (invariant
green under `trust=false`); the TS `Registers` service + the Go twin
implement it over KV CAS; an interleaving harness (two contenders, crash
mid-hold, steal, zombie commit) driven by the Veil-exported corpus. Gates:
model-exported interleavings replayed on the real substrate with verdict
equality; negative control: a build that accepts a stale token is killed
by a named vector. Consumer: slice 5's shard claims. (This is also where
the archived effector claims are formally re-earned — the ledger entry
says so in those words.)

**Slice 3 — federation with verify-on-ingest.** Two venues; replication by
verified replay; the wrong-`prev` hole closed. Gates: byte-exact head
reproduction (re-establishing the synthesis's measured result in-tree);
idempotent second pass (zero new entries); planted wrong-`prev` frame
refused with a structural refusal naming the chain law. Consumer: any
multi-venue deployment; the compaction lane's constraint list.

**Slice 4 — sessions over the fabric + the monitor.** Remote seats drive a
real protocol session on its home venue through `flb.req.*` over the
fabric's connection layer; the state-anchored seat-relative frontier is
served to nodes; the conformance monitor (F6's generated table) folds lane
traffic live. Gates: a full multi-seat session transcript (open → fills →
dispute → close) executed by two heterogeneous nodes, `final_state_digest`
re-derived identically by three independent readers (TS, Go, model
vector); monitor at zero violations on the honest run and exactly one on
a planted alphabet intruder. Consumer: the demo; the ontology test bed's
future distributed runs.

**Slice 5 — the gauntlet (§11).**

Sequencing note: slices 0–2 are independent of the REF program's critical
path and touch none of its packages; slice 4 consumes shipped daemon
surface only. The known collision to watch is the MCP untyped-argument
defect (synthesis item 1) if an LLM node joins slice 5's optional scene —
that fix belongs to the estate's own queue, not this lane, and the scene
waits for it rather than working around it.

---

## 11. The proven demo — the distillation gauntlet

**Scenario.** A document corpus (the estate's own `docs/research/` tree is
the dogfood candidate) is distilled — per-document term/link/reference
extraction, corpus-wide merged index — by a fleet of heterogeneous nodes:
at minimum one Effect/TS node and one Go node (reusing `go/` journal +
register code), N instances each. Shards are claimed through registers,
evidence flows through one lane, the merged index is a commutative-class
fold, the final index is sealed by a close at the coordinating venue.

**Chaos schedule (scripted, committed).** Kill -9 one node mid-shard;
restart it; duplicate-redeliver a tranche; force a lease expiry and steal
mid-computation (the dispossessed zombie completes and attempts its
commit); restart the commons; run one conformance-violating node speaking
a foreign frame.

**Acceptance, entirely mechanical (`demo/run.sh`, one command):**

1. Final index state digest **byte-equal** to a sequential, single-process,
   single-thread reference fold over the same corpus (F3/F4 at L4).
2. Every sealed record's digest re-derives across three independent
   readers.
3. Zero landed commits with stale tokens; exactly one landed commit per
   shard (F5 at L4) — checked from the registers' own history.
4. Conformance monitor: zero violations from conformant nodes; the
   planted violator flagged on its exact first illegal frame.
5. Negative controls re-run in the same invocation: successor discipline
   dropped → digest diverges (and the run says so); verify-on-ingest disabled →
   planted frame lands (in a sacrificial copy) and the gate names the
   missing law.
6. The wire scoreboard the estate's dogfood rule demands: counts of
   refusals by kind/sort, redeliveries absorbed, steals, anchor writes —
   measured, not narrated.

**What the demo claims, in the ledger's voice:** *under this chaos
schedule, on this substrate envelope, the deployed L2 runtimes walled
against the L0 theorems produced the theorem-predicted digests.* It does
not claim liveness, does not claim attribution, does not claim Byzantine
tolerance beyond meaning integrity, and does not claim the L0 theorems
verify the L2 code — the walls and vectors carry that correspondence at
R0/R1, and the sentence saying so ships inside the demo's report.

**The optional second scene (gated, §7.4 and §10):** LLM-driven seats join
a design-review protocol session over the fabric — nondeterministic
contributors whose *content* is opaque and unreproducible but whose
identity, provenance, merge behavior, and sealed outcome are lawful. The
scene demonstrates the semantic-coherence claim where it actually lives
for agentic work: not "agents are deterministic" but "what agents said,
saw, and decided is content-addressed, convergent, and re-derivable." It
ships only behind the attribution decision and the MCP typing fix.

---

## 12. Risks and honest gaps

1. **Attribution is the program risk.** Decided elsewhere (estate item 2);
   everything evidentiary here is fenced on it. If the decision is a hard
   in-place grammar redefinition (the priced stage-two), fabric session
   identity moves with it — federation replay makes that a re-key, not a
   data loss, but the cost is real and named.
2. **The commons is a liveness SPOF in v0** by deliberate envelope
   discipline. The exit (clustered commons) requires extending the
   substrate assumptions gate with claims about clustered KV
   linearizability that nobody has verified here — G3 keeps that honest.
3. **rc-pinned foundations.** Effect `4.0.0-rc.108` is a release
   candidate; the NATS TS client candidate pin is `@nats-io/*@3.4.0`
   (confirmed current 2026-08-17), finalized at slice 0. Both pins are
   vendored/lockstepped and API drift is absorbed at pin bumps with
   walls re-run — the estate has done this dance before; it costs time,
   not correctness.
4. **KV growth and retention.** Registers and anchors accrete; the
   estate's compaction discipline (explicit, evidence-preserving) is not
   yet extended to fabric KV history, and slice 2 must state its retention
   posture rather than inherit a default silently.
5. **Lane partition counts are declared and identity-bearing** (they enter
   the lane declaration digest). Re-partitioning is a new lane plus a
   replay — correct by construction, operationally noisy; the demo's lane
   picks a count once and says why.
6. **The F6 equivalence is scoped** to the fill-fragment alphabet first;
   the close/authority fragment's automaton needs REF-4's semantics to be
   stated against — sequenced behind the estate's own ladder, named as a
   dependency, not raced.
7. **Two verdicts in this design rest on one measured lane each**
   (byte-exact federation replay; the one-CAS observation). Both are
   re-established in-tree by slice gates rather than cited forward —
   the synthesis's own instruction.
8. **Model-code correspondence is walls, not proofs** (L2 is R0/R1).
   Anyone wanting more buys the REF program's ladder; this lane does not
   duplicate it.

---

## 13. The grill sheet

Per house style: one decision at a time, recommended option first.

- **G1 — charter and home.** Recommended: adopt this lane as a commissioned
  exploration; code home `packages/plait` + `verify/fabric*`; docs home
  this file; board entry on Multica; slices 0–1 as the first codex
  dispatch after ratification (Fable coordinates, codex executes).
  Alternatives: sibling repository (cleaner isolation, loses the walls'
  shared fixtures and the Go twin); park the design (record stands, no
  cost).
- **G2 — the name.** Recommended: **Plait** (strands folded over one
  another into one braid — single-writer journals keeping their identity
  inside a coordinated whole; short; foldlab-flavored). Alternatives:
  Weft, Loom, or a plain descriptive name ("fabric") if the operator
  prefers no coinage.
- **G3 — commons posture.** Recommended: v0 commons = one non-clustered
  JetStream node (R=1), inside the existing substrate gate, liveness SPOF
  named in the ledger row. Alternative: extend the substrate assumptions
  gate now for clustered KV and start replicated (costs a verification
  effort nobody has scoped; buys availability the demo does not need).
- **G4 — attribution scoping.** Recommended: the §7.4 posture —
  connection-identity now, signature seam reserved, evidentiary claims
  gated on the estate decision, demo headline attribution-free.
  Alternative: block the whole lane on the attribution grill (safest,
  costs the months the mechanics work does not need to wait).
- **G5 — proof homes.** Recommended: three packages as §9.3 (zero-dep
  F1–F4; Veil-pinned F5 with `trust=false`; CSLib-pinned F6 deferred
  until its own ratification). Alternatives: all in-house (cheapest
  toolchain, F5 loses `#check_invariants`/model-checking and the exported
  trace corpus); all-Veil (wrong tool for the algebra half).
- **G6 — ledger timing.** Recommended: fabric claims enter VERIFICATION.md
  only as slices land, each with bounds prose written the day it lands.
  Alternative: a standing "commissioned, unclaimed" ledger section now
  (visibility at the price of ledger noise).
- **G7 — dependency admissions.** Recommended: admit `effect` (pinned) and
  the official `@nats-io` TS client family (pinned at slice 0) as
  `packages/plait` runtime dependencies — the task justifies them under
  the no-new-TS-dependency rule; nothing else (no framework, no ORM, no
  workflow engine). Alternative: none realistic; hand-rolling a NATS
  client is refused as unserious.

G8–G12 (action plane: adoption, monotone trigger algebra, policy
lattice, model seam, cataloged context programs) live in
[part 2 §10](2026-08-17-plait-action-plane.md).

---

## 14. New-term glossary

| Term | Meaning |
| --- | --- |
| fabric | the whole coordination system: venues + commons + nodes |
| venue | one single-writer estate daemon with its journals; sessions close here |
| commons | the shared NATS system carrying lanes, cells, registers, blobs; a meaning-nobody, liveness-somebody |
| node | any credentialed process speaking the writ; `(head, writ)`; admitted by `plait attest` |
| lane | a declared, content-addressed evidence stream (schema, partitions, key derivation) |
| cell | a lattice value in commons KV, merged by join |
| register | a lease/epoch authority: work digest → (token, holder, outcome), CAS-advanced |
| anchor floor | the per-partition applied-position in a fold's checkpoint fact — the derived record of the successor discipline's contiguous frontier (the resume coordinate); the discipline, not the floor, manufactures exactly-once application |
| monotone plane / coordination plane | the CALM split: what may be delivered sloppily vs the enumerated CAS points |
| attest | the generated-vector conformance harness whose passing defines nodehood |

---

## 15. Sources

Estate documents, read in place this session on main at d79e3607e (plus
the untracked 2026-08-16/17 corpus): `AGENTS.md`; `CONTEXT.md`;
`docs/research/2026-08-16-proof-support-briefing.md`;
`docs/research/2026-08-17-proof-support-determination.md`;
`docs/research/2026-08-17-lean4-landscape-exploration.md` (via sweep);
`docs/research/2026-08-16-orchestration-analysis-synthesis.md`;
`docs/design/2026-08-17-mpst-refusal.md`;
`docs/design/2026-08-16-ref0-extraction-grill-record.md` (via sweep);
`scratch/dispatch/{17,21,23,24,28}` (23/24 in place; 17/21/28 via sweep);
`verify/ir/README.md`, `verify/moves/README.md`, `VERIFICATION.md`,
`proto/wire/CONTRACT.md`, `proto/SPEC.md`, `go/CONTEXT.md` (via sweep);
`go/go.mod`, `proto/go/go.mod` (NATS pins, in place);
`packages/{core,moves}/package.json` (in place).

Vendored source, read in place: `repos/effect` at `4.0.0-rc.108`
(`LLMS.md`; `src/Stream.ts:1277`; `src/Reducer.ts`; module roster);
`repos/cslib`, `repos/sal`, `repos/veil` (via the landscape sweep, with
`docs/research/reference/lean4-landscape-2026-08-17/` artifacts).

NATS ecosystem, fetched 2026-08-17 (web, primary sources): the npm
registry (`@nats-io/{nats-core,transport-node,jetstream,kv,obj}` at
3.4.0; legacy `nats` deprecated); `github.com/nats-io/nats.js` (v3.4.0
release notes 2026-05-08; jetstream/kv/obj READMEs and typedoc —
`consume()`/`fetch()`/ack family, publish expects, KV
`update(k, data, version)`/`create`/`watch`, object store);
`github.com/nats-io/nats-server` releases (v2.11.0 per-message TTLs and
priority groups; v2.12.0 atomic batch publish, counter streams/ADR-49,
`partition(n)` transforms; v2.14.0 fast ingest and schedules; v2.14.5
current stable 2026-08-12); `docs.nats.io` (dedup window default 2m0s
with `duplicate: true` PubAck; retention policies incl. work-queue
overlapping-consumer refusal; at-least-once posture and double-ack
guidance; replication/Raft; max payload 1 MiB default);
`spiko-tech/effect-messaging` (+ npm registry) for
`@effect-messaging/nats`; nats.io blog and synadia.com agent pages
(leads).

External anchors carried at the estate's recorded tiers, not re-fetched:
Shapiro et al. 2011; Burckhardt et al. POPL 2014; Gomes et al. OOPSLA
2017 (`Convergence.thy`/`Network.thy`); CALM (Ameloot et al. JACM 2013;
Hellerstein & Alvaro CACM 2020); FLP via CSLib's mechanization; Sal
(PaPoC 2026); Veil (CAV 2025).
