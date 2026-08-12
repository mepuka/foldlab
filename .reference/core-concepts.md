# Core concepts — the night's compilation

A field guide to the ideas built and proved in the playground-mech sessions
(2026-08-11/12), written to stand alone. Everything asserted here is backed by
a committed artifact in `.reference/playground-mech/`; nothing is aspiration.
The epistemic discipline is the whole method: every claim is marked **proof**
(machine-checked, unbounded), **bounded check** (exhaustive within stated
bounds), or **sample** (tested schedules/corpora). Conflating those three is
how a refuted protocol once survived three green audits.

---

## 1. The two folds

The single organizing idea. An event stream is a left fold, twice over:

- Folded with a **hash**, you get **identity**: the chain head, 32 bytes
  committing to the exact history — every event, every order, nothing
  forgiven. `h' = SHA-256(h || enc(event))`, O(1) incremental.
- Folded with a **state function**, you get **meaning**: what the history
  did. The fold *forgives* — it identifies histories that converge to the
  same state.

They disagree on purpose. **The chain remembers what the fold forgives** (law
SL1: swapping two adjacent cross-key merge picks leaves the fold-state digest
equal and changes the merged head). Every operation in the system is
characterized by which fold it must preserve:

| Operation | Must preserve |
|---|---|
| fingerprinting | identity (is of canonical bytes, pre-compression, always) |
| compression | both — it's transport; round-trip returns the exact canonical bytes (checked Go-gzip → Bun-gunzip) |
| compaction | **both** — resumed state ≡ full fold AND head recomputed across the boundary ≡ full head (SL3, at every boundary) |
| merge | commits identity where meaning demands it (SL1/SL2) |
| fork | splits identity; shares structure (SL4) |
| replay | reproduces both, deterministically (SL6) |

Canonical encoding precedes hashing: normalize away everything behaviorally
irrelevant, encode fixed-width, *then* hash. Equal states encode equal;
distinct states encode distinct — identity lives in the encoding, the hash is
transport for it. This discipline is what made three independent
implementations (Go, TypeScript, TLA+) agree to the *state count* and the
*byte*.

## 2. The effector: exactly-once commitment (now a theorem)

One authority register per work digest `d`:

```
Register = Absent | Claim(fence, owner, lease) | Done(fence, result)
```

`claim` creates or steals (fence+1, by revision-CAS); `commit` is split into
*begin* (read fence + revision) and *finish* (conditional write at that
revision) — validation and mutation share ONE linearization point. `Done` is
terminal. The withdrawn two-key design (separate claim and outcome registers)
was refuted by bounded search: `claim, begin, steal, finish` lands an outcome
under a superseded fence, because nothing binds the outcome-create to the
fence check.

Status after the model-gate sessions:

- **Proof (unbounded fences, unbounded depth; 3 and 4 owners; Apalache
  inductive invariant):** fencing safety (no commit lands below the maximum
  linearized generation) and unique terminal outcome. The invariant:
  claim-tracks-max + done-tracks-max + **freshness** (a fresh begin-snapshot
  IS the current register — the collapsed revision CAS) + handle discipline.
- **Proof, identity-free:** dropping every process-identity clause and
  allowing one identity to run concurrent workers (self-interleave), the
  register algebra + freshness alone remain inductive. **Safety owes nothing
  to "one id per node."** Identity is payload (who holds, who committed),
  never premise. Fencing is generations, not identity.
- **Bounded check:** TLC exhaustive at generation caps 2/3/4 — 584 / 2,312 /
  6,848 states, matching the Go and TS checkers *exactly*; the two-key spec
  rediscovers its counterexample at the minimal 4 steps.
- **Sample:** 15,378 schedules replayed in lockstep against the real Go
  effector on embedded NATS; 0 divergences; the harness proven able to fail
  (828/828 corrupted schedules caught; negative controls at the proof level
  too — a prover that cannot fail proves nothing).

What the protocol actually assumes, all of it about the substrate register
(JetStream KV in the pinned configuration): atomic create-if-absent, revision
CAS where every successful write moves the revision, linearizable reads, no
deletion/TTL/admin mutation of `Done`. Safety is clock-free and
identity-free; leases and ids matter to *liveness* only.

## 3. Merge: a committed linearization

There is no global truth about cross-process order — only what an observer
experienced. The move: record the observed interleaving as a **merge fact** (a
list of `(stream, seq)` picks — tiny, replayable; content derivable), and the
nondeterminism is absorbed: replay steps through the recorded merge,
deterministically, forever (SL6; a gap is a *typed error*, never a silent
skip).

Where a merge *must* commit an order is decidable: events that commute under
the meaning fold (cross-key writes) need no committed order — their
interleaving is bookkeeping. Events that don't commute (same-key writes,
last-write-wins) are exactly the class that forces commitment (SL2). If the
canonical order matters to more than one observer, the merge itself is work:
one digest, claimed and committed through the effector — and by the
identity-free theorem it cannot matter which node wins.

## 4. Fork: two heads, one parent

Histories live in a content-addressed segment store: `segment = (parentHead,
events)`, named by its head. A fork is two segments sharing a parent — O(1),
nothing copied, shared prefix by *structure* (git's answer, for git's reason).
Absence is detectable and **named**: replaying through a missing segment fails
with the missing head's identity, so you know exactly what you don't know.

**Fork resolution is fenced commitment** (SL5): race the candidate heads
through the proved single-key effector (digest = the fork base) and every
schedule yields at most one canonical head; the loser *adopts* — and the
losing branch stays in the store as a counterfactual. Data, not garbage.

## 5. Compaction and compression

Compaction replaces a prefix by `(prefix chain head, fold state)` and keeps
the tail. The law is double: resumed state matches the full fold AND the
final head recomputed from the retained base matches the uncompacted head —
verification crosses the boundary. The only loss is step-through *inside* the
discarded prefix, and it is a chosen loss. A model checkpoint, incidentally,
is a compaction with the journal discarded — state without history — which is
why provenance anxiety around ML has the shape it has.

Compression is transport, never identity: fingerprints are of canonical
uncompressed bytes; a Go-gzipped frame gunzipped in Bun must carry the exact
canonical bytes (checked, cross-runtime). Never fingerprint a compressed
frame — the encoder version would leak into identity.

## 6. Replay, step-through, encapsulation

Determinism contract: state at step k is a pure fold of the first k recorded
facts. So step-through/time-travel is a *corollary*, not a feature; snapshots
are memoized folds. Live vs replay is one program under two interpreters
(`I_live` records, `I_∅` consumes; the oracle law: their exits agree), and the
monad-law suite showed bind-regrouping preserves the journal byte-for-byte
while a path *renaming* forks history — value-equal is not history-equal, so
workflow versioning is a first-class concern.

**Encapsulation** is the anchor move: a completed stream collapses to
`Done(f, ⟨exit, anchor⟩)` — one adoptable fact committing to the entire
ordered history, still verifiable, still steppable by anyone holding the log.

## 7. Entities: series vs decomposition of one

When is a DAG many entities, and when is it one entity's parts? Four cuts,
increasingly operational:

1. **Spatial/temporal:** an ADT is the spatial DAG (structure of a value at
   an instant: products = simultaneous parts, sums = exclusive choice); an
   event chain is the temporal DAG (structure of an identity across time).
   Same fold-math (catamorphism / left fold). Event sourcing = the temporal
   decomposition is primary; state is derived.
2. **Identity:** a node is an *entity* when it has its own name and
   linearization point (chain seed, commitment register, fence) — when others
   can reference, fork, or adopt it independently. Otherwise it's
   decomposition. Content addressing makes part-vs-peer a free choice,
   because immutable substructure aliases safely.
3. **Commutativity (the usable one):** entity boundaries live exactly where
   the fold commutes. Non-commuting events must share a register — one
   entity's timeline. Commuting events may separate — many entities. DDD's
   "aggregate = consistency boundary," with a checkable algebra underneath.
4. **Data/codata:** a running stream is codata (you can only observe more); a
   committed one is data (finite, foldable). **Commitment is the moment
   codata becomes data** — the effector is the type-theoretic crossing where
   "things happening" collapses into "a thing that happened." The anchor is
   the entity-former: before it, a series with provisional boundaries; after
   it, one value with internal structure.

## 8. Effect, streams, and semantic coherence

Effect models programs as reified monadic continuations, which buys three
things a trace-only world lacks:

- **Counterfactuals:** a trace says what happened; a continuation lets you
  ask what *would have* happened — feed the recorded prefix, hand bind k a
  different value. Forking programs, not just data.
- **Binds are syntactic linearization points:** journaling granularity,
  outcome-branching exploration, and virtualization seams (clock, random)
  attach to *places in the program*.
- **Codegen over transcription:** program-as-value means the Go driver and
  the TLA+ table can be *derived* instead of restated — equality by
  construction instead of by fixture wall. Caveat: continuations are opaque
  past a dynamic bind; the resolution is ops-as-data (an initial encoding)
  with monadic glue, and laws pinning the two presentations' agreement.

Stream combinators are merge-policy, reified: `concatMap` = sequential
children (no fact needed); `mergeMap(n)` = concurrent children (a MergeFact
is *required* — the runtime already makes those picks and normally discards
them); `switchMap` = fork-and-abandon (cancellation is journalable);
`scan` = the fold materialized (step-through as a stream); buffering and
backpressure = transport/liveness, off-ledger by design. A journaled Stream
runtime is one that keeps the picks it already makes.

## 9. The business reading: trees, censuses, crowded rooms

If agentic DAG workflows become the operational surface, then: the
"seen-this-tree-before" query is the model checker's visited-set lifted to
business scale — canonical fold → anchor, recognition compositional (know a
subtree by its committed anchor), O(1) lookup. Prediction splits into **the
model gives the support** (what *can* happen next — enumerable, provable) and
**the corpus gives the measure** (what *does* — journal statistics). Behavior
change is two-rate: within a version, drift is a measurable distribution
shift over branches; across versions, history forks loudly (new digests) —
change cannot be smooth-morphed silently, except inside effect bodies
(off-ledger, the honest boundary). Traffic analysis of a commitment-based
agent fabric recovers tree topology from metadata alone; the same property is
internal observability and external leak surface — a naming-scheme dial.

## 10. LLMs in this frame

An LLM is a *learned fold paired with an unfold*: its context representation
is a lossy meaning-fold whose equivalence classes (what to forgive) were
learned, not specified; generation is the unfold. That pair traverses the
data/codata line in both directions — series → entity (summarize) and entity
→ series (unroll) — which is why compression-and-prediction feels like the
fundamental calculation; formally, they are the same quantity.

The sharpening: the LLM's traversal is **sampled, not committed** — a functor
up to plausibility, not identity. Its fold forgives unknowably much; its
unfold is not an inverse. On the epistemic ladder it is the sample rung,
industrialized. Hence the architecture: **LLM proposes, ledger commits.**
Journals for identity, models for meaning, fences where they touch. An entity
with an edge in compression can propose better quotients — redraw entity
boundaries for others (what API design, org design, and refactoring are) —
but proposing is not committing; adoption through the fence is what makes a
proposed entity *the* entity.

---

## Artifact index (in `.reference/playground-mech/`)

- `docs/research/effector-model-gate.md` — the full model-gate report: TLC
  counts, the rediscovered two-key trace, the Apalache verdict, epistemic
  placement.
- `docs/research/mech-library.md`, `mech-production-spec.md` — the TS
  explicit-state checker and its production-law proposal.
- `docs/primitives/MECH-attempts.md` — the climb log, one line per attempt.
- `specs/` — Effector.tla (the transition table, stated once), EffectorInd.tla
  (the inductive invariants incl. identity-free), the two-key counterexample
  artifact, all TLC/Apalache configs.
- `go-effector/` — the Go model, bounded checker, and the NATS trace-
  conformance driver. `mech-src/`, `mech-test/` — the TS mirror, the algebra
  laws (ML/WL/SL suites), the engine conformance.
- This repo's `src/stream.ts`, `go/stream/` and `fixtures/stream-wall.json`
  are the live copy of the stream lane, wall included.
