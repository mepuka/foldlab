# CALM formats, orchestration primitives, and chiral replicas — an external survey

Status: **SURVEY, informational only.** Commissioned 2026-08-18 by the
operator through the coordinator; written by a Fable research seat.
This memo looks OUTSIDE the estate at three connected questions: (A)
how mainstream relational, file, and format systems decompose into
monotone streams plus fenced commits; (B) how hierarchical
orchestration primitives map onto the estate's algebra or get refused;
(C) prior art and an algebraic formulation for the operator's "chiral
replica" construct — two replicas with identical content-addressed
state and deliberately asymmetric structure or function. It gathers
evidence and prior art; **it decides nothing**, changes no code, and
touches no design status. All URLs were accessed 2026-08-18.

For an outsider, the estate context in one paragraph. The estate is a
coordination substrate for AI-agent fleets in which every value is
named by a **digest** (a cryptographic hash of the value's one
canonical byte form), and every piece of state is one of three shapes:
a **join-semilattice** merged by union-like operations that are
associative, commutative, and idempotent (ACI — so arrival order and
duplication are harmless); a **checkpointed fold** — a reduction over
an append-only per-partition journal, where order carries meaning and
**anchors** (checkpoint facts) make reads "true at a position, never
wrong later"; or a **fenced register** — a one-winner decision slot
advanced by compare-and-swap under a **fencing token** (a strictly
increasing number that decides which commit lands). This is the **CALM
split**: monotone work (facts only accumulate) is coordination-free,
and one-winner acts are the single priced coordination point.
Authority is a meet-semilattice of **writs** (delegation only
narrows). The agent-facing API is an eight-generator algebra
(`declare, resolve, emit, join, fold, decide, trigger, spawn`)
machine-modeled in Lean. A standing **no-orchestrator doctrine** bans
central workflow-engine state as a source of truth. Aggregation
algebras classify on a **rung ladder** (monoid ⊂ commutative monoid ⊂
bounded semilattice, with Abelian groups beside); each equation buys a
distribution right.

Evidence tiers, used on every load-bearing claim:

- **MEASURED** — a paper's or spec's own content, read against a
  primary source fetched this session; "(abstract tier)" marks claims
  verified only against an abstract or a secondary summary.
- **PRACTICE** — vendor documentation, specification text, or
  community convention: what practitioners do and ship, not what
  experiments prove.
- **SYNTHESIS** — this memo's own inference across sources, always
  labeled.
- **LEAD** — found but not verified against a primary source this
  session; a pointer, not evidence.

---

## 1. Result first — the strongest findings on one screen

1. **The mainstream storage world already ships the estate's split,
   without knowing its name.** Every serious modern table format and
   copy-on-write filesystem is an append-only monotone body plus
   exactly one fenced pointer write: Iceberg's spec says all changes
   "create a new metadata file and replace the old metadata with an
   atomic swap," and grounds serializable isolation on that one swap
   (PRACTICE, §2.4); Delta's protocol makes creating log version N a
   one-winner act ("a catalog ... must ratify version v at most
   once", after v−1 — a fenced round ladder in the wild) (PRACTICE,
   §2.4); ZFS accumulates copy-on-write trees and commits them by one
   atomic uberblock update (PRACTICE, secondary, §2.5); Kubernetes
   leader election is a compare-and-swap on one Lease object
   (PRACTICE, §4.1). The estate's (a)/(b)/(c) taxonomy is a fair
   *description* of shipped systems, not just a design stance.
2. **The missing half everywhere is canonical bytes.** No surveyed
   mainstream format guarantees one canonical byte form for logical
   state: Iceberg and Delta mandate no canonical serialization and
   embed wall-clock timestamps in required fields
   (`add.modificationTime` is required in Delta; Iceberg snapshots
   carry `timestamp-ms`) (MEASURED on spec text, §2.4); IPFS could
   give the same file different names (CIDs) depending on chunking
   parameters until a 2025-era profile proposal (IPIP-0499) pinned
   the parameters (PRACTICE, §2.5); tar and zip are non-deterministic
   by default and the reproducible-builds project exists to retrofit
   canonicalization (PRACTICE, §2.5). Content addressing of files is
   only as strong as an explicit canonicalization discipline — the
   estate's "one canonical byte form" rule is the exception outside,
   not the norm.
3. **The CALM lineage gives the estate its exact theoretical
   boundary.** The CALM theorem: a program has a consistent,
   coordination-free distributed implementation **iff** it is
   monotonic (conjectured 2010, proven by Ameloot, Neven, Van den
   Bussche) (MEASURED, abstract tier, §2.1). Monotone relational
   operators: select, project, join, union, intersection, transitive
   closure; non-monotone: negation, universal quantification, set
   difference, aggregation (MEASURED, abstract tier, §2.1). "Keep
   CALM and CRDT On" extends this to *reads*: CRDT merges converge,
   but naive queries over intermediate merge states are unsafe unless
   the query is monotone — which is precisely the estate's
   anchored-read discipline stated as someone else's open problem
   (MEASURED + SYNTHESIS, §2.1).
4. **The Abelian-group rung buys auto-incrementalization and costs
   exactly-once.** DBSP models changes as Z-sets (tuple → integer
   weight, an Abelian group); linear operators are their own
   incremental versions, and the whole relational algebra (joins,
   grouping, recursion) incrementalizes mechanically (MEASURED,
   §2.2). The price: group state is not idempotent — duplicated
   deltas corrupt it — so the group rung demands exactly the
   successor/exactly-once discipline the estate already proves as
   F2b, and negative weights (retractions) are lawful only as *data
   in fold state*, never as journal mutation (SYNTHESIS, §2.2).
5. **Every orchestration primitive surveyed either lands on a kernel
   composition or is refused for the reason the doctrine already
   names.** The full table is §3.1 (27 rows). The sharpest neighbor
   is Temporal: its event history + replay + determinism constraint
   is journal + fold-resumption + the estate's closure list — but
   enforced socially (a replay wall that detects nondeterminism at
   runtime) where the estate enforces structurally (no syntax to
   write a clock read), and the engine holds authoritative mutable
   execution state, timers, and task queues — exactly the state the
   no-orchestrator doctrine refuses (MEASURED/PRACTICE, §3.2).
6. **The chiral pair assembles entirely from shelf parts, but no
   surveyed system composes all three planes.** Function chirality is
   primary/standby with fencing tokens (Kleppmann's argument,
   MEASURED §4.1) and structurally directional chains (CRAQ's tail is
   the commit authority; a node holding a "dirty" version asks the
   tail — the anchor discipline in chain clothing, MEASURED §4.1).
   Structure chirality is HTAP: TiDB's TiFlash holds the SAME logical
   content as the row store in columnar form, synced by Raft-learner
   log shipping, with consistency defined *positionally* (read-index
   wait), never by byte equality (MEASURED §4.2). Exclusivity is
   leases + epoch fencing (Kubernetes, Kafka generations, PRACTICE
   §4.1). What no system surveyed does: define cross-replica
   consistency as **canonical-byte digest equality of logical
   state** — HTAP pairs compare log positions, not digests. That gap
   is the estate's opening, and the digest-equality requirement
   itself *forces* the construct's cleanest property: the role fact
   must live outside the mirrored content, or the twins' digests
   could never be equal — which the estate provides for free because
   registers are a separate state class (SYNTHESIS, §4.3).

---

## 2. Area A — relational, file, and format systems as CALM monotone streams

### 2.1 The CALM lineage: what exactly is proven

**The theorem.** "A program has a consistent, coordination-free
distributed implementation if and only if it is monotonic" — stated
as the CALM conjecture in Hellerstein's 2010 PODS keynote, proven by
Ameloot, Neven, and Van den Bussche via relational transducers, and
presented for a general audience in Hellerstein & Alvaro, "Keeping
CALM: When Distributed Consistency Is Easy" (CACM 63(9), 2020; arXiv
1901.01930). MEASURED, abstract tier: the CACM full text returned 403
this session; the theorem statement and definitions below were
verified against the arXiv abstract and the Morning Paper's quoted
summary (2019-03-06) — flagged again in §5.

**The definitions that matter for the estate.** Consistency is
*confluence*: "an operation is confluent if it produces the same sets
of outputs for any non-deterministic ordering and batching of a set
of inputs" — the estate's sloppy-delivery-is-safe, stated as program
property. Monotonicity: "once we learn something to be true, no
further information can come down the line later on to refute that
fact." Coordination is control messages — waiting, counting, voting —
as opposed to data flow; the theorem's point is that partitioning
data does not require coordination, but non-monotone logic does,
*regardless* of partitioning. (MEASURED, abstract tier.)

**Which relational operators are monotone.** Selection, projection,
join, union, intersection, and transitive closure are monotone (they
are existentially quantified: more input can only produce more
output). Negation / NOT EXISTS, universal quantification, set
difference, and aggregation are non-monotone: a COUNT or an
"absent" verdict over a growing set can be invalidated by one more
arrival. (MEASURED, abstract tier.) The classical discipline for
running the non-monotone part is **stratification**: evaluate the
monotone stratum to fixpoint, *seal* it, then apply negation or
aggregation to the sealed result — coordination appears exactly at
stratum boundaries. The paper's worked contrast: distributed deadlock
detection is monotone (a cycle, once observed, never un-exists);
distributed garbage collection is not ("unreachable" can be refuted
by a later edge). (MEASURED, abstract tier.)

**Bloom and Bloom^L.** Bloom (Alvaro et al., CIDR 2011) is Datalog-
based dataflow whose CALM analysis flags "points of order" — program
locations where non-monotonicity requires coordination. Bloom^L
(Conway, Marczak, Alvaro, Hellerstein, Maier, SoCC 2012) generalizes
set-monotonicity to arbitrary join-semilattices: state is typed as
lattices, methods are annotated non-monotone / monotone / homomorphic
(morphisms distribute over join; every morphism is monotone, not
conversely), and a program composed of monotone methods over lattice
state needs no coordination. (MEASURED, abstract tier.) SYNTHESIS:
Bloom^L is the closest published ancestor of the estate's typed
split — lattice sorts for class (a), an annotation discipline where
the estate has branded algebra declarations with earned rungs
(KM-17), and "points of order" where the estate has exactly one
generator (`decide`).

**Keep CALM and CRDT On** (Laddad, Power, Milano, Cheung, Crooks,
Hellerstein, PVLDB 16(4), 2022; fetched-primary PDF). The paper's
observation: CRDT literature guarantees convergence of *updates*, but
applications act on *reads* of CRDT state, and a read taken from one
replica mid-merge is an unstable intermediate value — a counter
threshold check can fire falsely, set containment can flicker across
replicas. Their program: classify queries by monotonicity (lattice
morphisms / monotone functions are safe from any replica state,
because later merges can only refine, never refute); non-monotone
queries require coordination or must be deferred to sealed states.
(MEASURED; extraction machine-mediated over the fetched PDF.)
SYNTHESIS, the estate mapping: this is precisely the estate's
read discipline already ruled — unanchored "latest" reads have no
syntax (G20-shaped closure), lattice reads are lower-bound facts
("at least this," never "not present"), and the lawful way to act on
a non-monotone verdict is the deadline seat's fenced act over a
sealed position. The estate's answer to Laddad's agenda is: anchors
are the seal, and `decide` is the coordination they price.

### 2.2 Incremental and streaming relational: what the group rung buys

**DBSP** (Budiu, Chajed, McSherry, Ryzhyk, Tannen, PVLDB 16(7), 2023,
best paper; fetched-primary PDF). The carrier is the **Z-set**: a
function from tuples to integer weights with finite support. Z-sets
form an Abelian group (pointwise addition; inverses exist), and
streams of Z-sets support two mutually inverse operators —
differentiation (state → deltas) and integration (deltas → state).
The headline: **linear operators are their own incremental
versions**, and a mechanical transformation incrementalizes arbitrary
DBSP circuits — the full relational algebra, grouping (the grouping
function is linear for any partitioning function, "so the group-by
implementation in DBSP is automatically incremental"), joins
(bilinear), and stratified recursion. Deletions ride for free as
negative weights: a retraction is just a delta with weight −1.
(MEASURED.) The costs the paper is honest about: `DISTINCT` and other
non-linear operators need maintained integrals (state proportional to
history's support); memory for those integrals is the price of
incrementality. (MEASURED, extraction machine-mediated.)
**Differential dataflow** (McSherry, Murray, Isaacs, Isard, CIDR
2013) is the engineering ancestor — collections as weighted
multisets, incremental updates over partially ordered timestamps;
DBSP presents itself as the algebraic simplification of that line.
(LEAD for the CIDR paper itself; the relationship is stated in the
fetched DBSP text.)

SYNTHESIS — the rung-ladder reading, sharpened for KM-17. The
Abelian group sits *beside* the semilattice chain, not on it, and
DBSP shows exactly what each side buys. The semilattice rung buys
**sloppiness**: idempotence makes duplication harmless, so at-least-
once delivery suffices. The group rung buys **incrementality**:
inverses make change propagation mechanical, but idempotence is lost
— replaying one delta twice corrupts a Z-set — so every group-valued
fold demands exactly-once application. The estate has already priced
this: F2b's guarded exactly-once successor discipline is precisely
the admission ticket for group-rung fold algebras, and "negative
weight" is lawful only as *data inside fold state* (a retraction
recorded), never as a journal act (the journal stays append-only;
nothing unbecomes). A DBSP-shaped auto-incrementalization right for
group-branded algebras is a real, evidenced payoff the ladder could
name — priced as CR-3.

### 2.3 Local-first SQL over CRDTs: what merge actually is, and what honestly breaks

**cr-sqlite** (vlcn-io; fetched-primary: README and column-CRDT
docs). Tables are upgraded to "conflict-free replicated relations"
(CRRs), citing the CRR literature (Yu & Ignat's line of work). Merge
is row-by-primary-key, then **column-wise**: each column is a CRDT,
default **last-write-wins register**; versions are tracked by
`db_version` and per-column `col_version` counters (logical, not
wall-clock); on concurrent writes "the largest value is taken" —
value-order as the deterministic tiebreak. Other column types:
fractional index (ordering); counters listed but "not yet supported"
at the fetched docs. (PRACTICE/MEASURED on vendor docs.) SYNTHESIS:
column-LWW under a logical clock is exactly the estate's
**positioned greatest-read** (KM-15's directory shape): the position
is the version counter, merge keeps the greatest position, the value
tiebreak arbitrates ties by data — a derived read over an
accumulating fact set, isomorphic to an LWW-register CRDT but with
the order carried as explicit data. Notable honest absence: the
fetched cr-sqlite docs say **nothing** about uniqueness constraints,
foreign keys, or cross-peer transactions — the invariant question is
unaddressed rather than answered (flagged in §5).

**ElectricSQL** (fetched-primary: "Introducing Rich-CRDTs",
2022-05-03, now at electric.ax). The honest statements the
commission asked for exist here. Rich-CRDTs are "conflict-free data
types ('CRDTs') extended to provide additional ('Rich') database
guarantees," and the mechanisms are tiered by how much coordination
they smuggle back: **compensations** preserve referential integrity
without coordination (a delete concurrent with a child insert is
repaired by a compensating re-insert or touch — forward-only, note
the saga shape); **reservations** handle numeric bounds and
uniqueness by pre-partitioning rights (escrow) — and the decision
tree bottoms out at "use lock based reservations" for global
sequential identifiers. (MEASURED on the vendor's own text.)
SYNTHESIS: this is CALM in the wild, stated by practitioners —
column merge is free; *global invariants* (uniqueness, foreign keys
under concurrent delete, numeric bounds, gapless sequences) are
non-monotone claims and every honest system either coordinates
(locks/reservations = the priced `decide`), compensates (successor
declarations), or drops the invariant. The later ElectricSQL pivot
away from active-active CRDT sync toward a read-path sync engine is
consistent with that cost accounting (LEAD — pivot noted from
secondary comparison material, not verified against a primary
statement this session).

### 2.4 Lakehouse table formats: the estate's shape, shipped at industrial scale

**Apache Iceberg** (fetched-primary: the format spec, apache/iceberg
`format/spec.md`). The monotone body: data files, manifests (Avro),
manifest lists, and metadata files are all immutable once written
("Once written, data and metadata files are immutable until they are
deleted"); a snapshot is a complete description of table state at a
point. The fence: "All changes to table state create a new metadata
file and replace the old metadata with an atomic swap"; writers are
optimistic — build the new metadata assuming the base version holds,
then "commit by swapping the table's metadata file pointer from the
base version to the new version"; on conflict, rebase and retry. The
isolation claim rides the fence directly: "An atomic swap of one
table metadata file for another provides the basis for serializable
isolation." The swap is delegated to the **catalog** (a database, a
metastore, a REST service) — i.e., the register lives outside the
files, in a service that can do compare-and-swap. Sequence numbers
are "a monotonically increasing long that tracks the order of
changes" (a per-table position); snapshot ids are "unique long"
values (generation method unspecified in the spec); snapshots carry
`timestamp-ms`. Row-level deletes (v2) are **delete files** — new
immutable files encoding deleted positions or equality predicates,
merged at read time ("merge-on-read"): deletion as accumulated data
over immutable bases, not mutation. (PRACTICE, spec text.)

**Delta Lake** (fetched-primary: delta-io PROTOCOL.md). The monotone
body: `_delta_log/` holds zero-padded numbered JSON commit files of
newline-delimited actions, plus derived checkpoints; data files are
immutable; state is the fold of actions up to version N. The fence:
version files are a contiguous ladder and creating version N must
have exactly one winner — in the fetched protocol text the
catalog-managed form is explicit: "A catalog must not ratify version
v until it has ratified version v − 1, and it must ratify version v
at most once." On plain object stores the same one-winner property
is obtained from storage-level put-if-absent (S3 conditional writes;
historically a DynamoDB-backed LogStore provided the mutual
exclusion — "for any number of concurrent writers ... only one
writer will win"; vendor blog, PRACTICE). Deletes: `remove` actions
are explicit **tombstones** that "remain in the state of the table
... until ... expired" (expiry by wall-clock threshold), and
deletion vectors mark rows logically deleted inside still-present
files. (PRACTICE, protocol text; the S3/DynamoDB detail is vendor
blog tier.)

SYNTHESIS — the two formats in estate vocabulary. Both are
journal-plus-derived-state with ONE register: manifests/log entries
are `emit` (append-only evidence), table state is a `fold` (replay
of actions / manifest resolution), a snapshot/version is an anchor
(a position plus the state reachable at it — time travel is exactly
"at a position, never wrong later"), and the commit is a `decide`
(fenced by catalog CAS or put-if-absent; optimistic retry is the
raced-claim shape whose duplicate work is harmless and duplicate
*landing* impossible). Delta's contiguous version ladder is even
round-shaped: v lands at most once, and only after v−1 — a fencing
ladder in protocol prose.

**The canonical-bytes verdict, both formats: refused.** Neither spec
mandates canonical serialization (Iceberg: JSON metadata and Avro
manifests with no byte-level canonicalization language; Delta:
newline-delimited JSON with no key-order or whitespace constraint —
both confirmed absent in the fetched texts). Both embed wall-clock
in meaning-adjacent fields: Delta *requires* `add.modificationTime`,
uses timestamps for tombstone expiry, and adds `inCommitTimestamp`
under a feature flag; Iceberg snapshots carry `timestamp-ms`.
Identity is by version number / snapshot id, never by content
digest; two byte-different logs can describe one logical table, and
nothing in either format can say so. (MEASURED on spec text;
consequence SYNTHESIS.) For the estate this is the sharp edge: the
lakehouse world validates the monotone+fenced architecture
completely and the content-addressed identity discipline not at all.

### 2.5 Filesystems: monotone bodies, fenced roots, and canonicalization as a precondition

**The append-only lineage.** Log-structured filesystems (Rosenblum &
Ousterhout, SOSP 1991) made the whole disk an append-only log with
periodic checkpoint regions — journal-plus-anchor at the block layer
(LEAD, classic). Copy-on-write trees are the modern form: **ZFS**
never overwrites live blocks; changes accumulate in a transaction
group, the new tree is written beside the old, and the commit is one
atomic **uberblock** update — "a power loss at any point ... leaves
the filesystem tree in a consistent state, either ... the old data
or the new data, never a torn mix" (PRACTICE, secondary summaries of
OpenZFS internals). btrfs is the same CoW-to-root class (LEAD). The
estate reading: CoW filesystems do not make non-monotone POSIX
operations monotone — they make them *atomic at a single fenced
root swap*, which is the (b)+(c) decomposition again (SYNTHESIS).

**POSIX's own registers.** The POSIX spec requires `rename()` to be
atomic — a concurrent observer sees the old binding or the new,
never neither (PRACTICE, Open Group spec via secondary). And
`open(O_CREAT|O_EXCL)` is a native one-winner primitive: exactly one
creator succeeds — the register Delta leans on when object stores
expose it as put-if-absent (SYNTHESIS on PRACTICE). The non-monotone
POSIX surface is exactly the operations the estate's closure list
refuses as acts: `rename` (rebind), `unlink` (retraction),
`truncate`/overwrite (mutation of the past). Caveat from practice:
POSIX atomicity is with respect to concurrent observers, not crash —
crash atomicity of rename is filesystem-specific (PRACTICE,
secondary).

**Content-addressed filesystems.** git's object store is the
canonical-bytes existence proof: blobs, trees, and commits have one
canonical encoding, are named by their hash, and the entire mutable
surface is refs — pointers updated by per-ref compare-and-swap
(LEAD, universally documented). **ostree** applies the same model to
OS trees: "git for operating system binaries" — a content-addressed
object store with refs, checkouts as hardlink farms (requiring
immutability of checked-out files), and atomic all-or-nothing
deployments (PRACTICE, project docs via search). **casync** does
content-defined chunking of filesystem images into a chunk store
(LEAD). **IPFS/UnixFS** is the cautionary tale the commission asked
for: chunk size, DAG layout, width, and codec are all tunable, so
*the same file yields different CIDs* across tools and settings —
"the same file or directory uploaded with Kubo, Helia, or
Singularity could produce three different CIDs" — and the fix,
IPIP-0499 (2025-era), is to pin **named CID profiles**
(`unixfs-v1-2025`) making derivation deterministic given the profile
(PRACTICE, IPFS specs PR and foundation writeup). SYNTHESIS: content
addressing is only as strong as the canonicalization function is
fixed; "digest of what, exactly" is a *ruled parameter*, not a given
— which is the estate's RFC-8785-shaped one-canonical-byte-form law
seen from outside as the lesson a decade of IPFS operations had to
learn.

**Reproducible archives.** The reproducible-builds project documents
the canonicalization checklist for tar/zip: filesystem `readdir`
order leaks into archives (fix: `--sort=name`, or `find | LC_ALL=C
sort -z`); mtimes (fix: `--mtime="@${SOURCE_DATE_EPOCH}"`); owners
and modes (fix: `--owner=0 --group=0 --numeric-owner`); PAX headers
smuggle atime/ctime/PIDs (fix: `--pax-option=...,delete=atime,
delete=ctime`); zip needs `-X` and post-processing
(`strip-nondeterminism`) because the tool "does not offer an easy
way" natively. (PRACTICE, reproducible-builds.org "Archive
metadata".) SYNTHESIS: this is the estate's certifier discipline
applied post hoc to formats that never had a door — every listed
flag deletes exactly one ambient input (clock, uid, locale,
filesystem order) from the byte form, the same inventory the
kernel's closure list refuses at admission.

### 2.6 The formats table

Legend: **monotone part** = what only accumulates (safe under
reordering/duplication of transport); **fenced part** = the
one-winner act; **canonical bytes** = does one logical state have
one byte form suitable for content addressing?

| System | Monotone part | Fenced part | Canonical-bytes status |
| --- | --- | --- | --- |
| Apache Iceberg | immutable data files, manifests, manifest lists, metadata files; monotone sequence numbers | ONE atomic swap of the current-metadata pointer at the catalog (CAS + optimistic retry) | REFUSED: no canonical serialization mandated (JSON + Avro); `timestamp-ms` in snapshots; identity by snapshot id, not digest |
| Delta Lake | append-only `_delta_log` action files; immutable data files; derived checkpoints | creation of version N: exactly one winner (put-if-absent / catalog ratifies v at most once, after v−1) | REFUSED: NDJSON with no key-order/whitespace constraint; `add.modificationTime` REQUIRED; tombstones expire by wall clock |
| cr-sqlite | per-column versioned writes (col_version/db_version logical clocks); changesets exchanged any order | none inside merge (by design); global invariants unaddressed | PARTIAL: merge is deterministic given clocks (greatest position, value tiebreak); no canonical file bytes (SQLite storage not canonical) |
| git | content-addressed object store (blobs/trees/commits); fetch = object-set union | ref update = per-ref compare-and-swap | YES for objects (canonical encodings hashed); refs are the one mutable plane (LEAD tier) |
| ostree | content-addressed OS object store; commits with dirtree/dirmeta | ref/deployment flip; atomic all-or-nothing upgrades | MOSTLY: file content checksummed; commit objects embed timestamps (metadata) |
| IPFS UnixFS | Merkle-DAG chunk store; add = union; pinning monotone | none in UnixFS itself (mutability lives outside: IPNS) | HISTORICALLY REFUSED: CID varies with chunker/layout/codec; IPIP-0499 named profiles restore determinism |
| casync | content-defined chunk store | index names a root | LEAD: chunking-parameter caveat presumed (same class as IPFS), unverified |
| ZFS (CoW class) | copy-on-write block trees per transaction group; snapshots immutable | one atomic uberblock (root pointer) update per txg | N/A as interchange: internal checksummed tree, not a canonical exchange format |
| Log-structured FS | the log itself (segments append-only) | checkpoint region write | N/A (LEAD, classic) |
| POSIX ops | append writes; `O_EXCL` create (native one-winner); link | `rename()` atomic replace (spec-atomic vs observers; crash caveat) | REFUSED: no canonical anything; mtimes/uids/order are the reproducibility bug list |
| tar/zip (default) | archive contents (order-bearing container) | n/a | REFUSED by default: readdir order, mtime, uid/gid, PAX atime/ctime; deterministic ONLY under the reproducible-builds flag set + SOURCE_DATE_EPOCH |

---

## 3. Area B — hierarchical orchestration primitives in the algebra

Gloss for outsiders: the mapping targets below are the estate's
composition families — **spawn-meet chains** (authority trees where
each child's writ is parent ⊓ request), **program DAGs** (cataloged
node/edge programs referenced by digest), **sessions** (venue
journals with idempotent seat fills and a fenced close),
**triggers** (monotone reactions from a closed five-production
predicate grammar: evidence-appears, cell-reaches, hole-reaches,
outcome-landed, head-advanced-past), **registers/rounds** (fenced
one-winner decisions; iteration = successor declarations), **folds
at anchors** (all derived reads), the **deadline seat** (the one
lawful authority for acting on absence/time, fed by tick facts), and
**outside meaning** (liveness machinery — leases, heartbeats,
cancellation — that the runtime provides and the grammar never
sees).

### 3.1 The primitive-mapping table

| # | Primitive (source) | Composition — or REFUSED | Reason / license |
| --- | --- | --- | --- |
| 1 | Supervision tree structure (Erlang/OTP) | spawn-meet chain | the tree IS an authority derivation: child = parent ⊓ child-spec; over-grant unrepresentable (F9 attenuation) |
| 2 | Restart from known state (one_for_one; permanent/transient/temporary) | outside meaning + fold anchor | restart machinery is liveness (lease loss → re-claim); "known state" = resume exactly from anchor (F3); duplicated effort harmless because landings dedup (F5 I2) |
| 3 | Dependency-group restarts (one_for_all, rest_for_one) | program DAG + outside meaning | the dependency order is DAG edges (data); tearing down siblings is lease revocation, not a meaning act |
| 4 | Max restart intensity → supervisor dies, escalates | REFUSED as meaning; lawful as evidence + deadline seat | "gave up" is a liveness judgment; the giving-up FACT lands by `emit`, and marking work abandoned is a fenced act by a declared authority — never automatic un-declaration |
| 5 | Nursery / scope (Trio; Kotlin scopes; Effect `Scope`) | lexical DAG position + session close | children are nodes pinned under the parent program digest (C7); "parent cannot exit until children exit" = close requires children's outcomes landed — a sync-join over evidence, fenced at the close `decide` |
| 6 | Cancellation scopes, timeouts | outside meaning (lease loss); deadline seat for the deadline PATH | `Scope` bounds the lease; loss interrupts the fiber (ratified part 1 §5.3); a timeout that *means* something is tick facts + a deadline-seat `decide` |
| 7 | Child failure cancels siblings, error propagates (structured concurrency) | emit + trigger (+ liveness cancel) | the failure is evidence on a lane; reactions are monotone trigger firings (evidence-appears); the sibling cancellation itself is runtime liveness |
| 8 | Durable execution: event history + replay (Temporal/Cadence) | journal + fold + anchors | history = per-execution partition journal (append-only, exactly the estate's class (b)); replay = anchored resumption (F3 shape); see §3.2 for what does NOT map |
| 9 | Activity execution + retry policies (Temporal) | C7 rounds at registers | declare the work (digest = register key), `decide` the outcome; a retry is a successor round pinning its predecessor; at-most-one landed outcome per round (F5), G23 caveat rides (landing ≠ external side effect) |
| 10 | Durable timers / sleep (Temporal) | REFUSED as engine state | schedules are declared values; firings are tick facts arriving by `emit` (G32); the acting door is the deadline seat's `decide`; no clock exists in the grammar to sleep on |
| 11 | Engine-held mutable execution state, task queues, sticky caches (Temporal service) | REFUSED as source of truth (G34) | central workflow-engine state is the no-orchestrator doctrine's named target; queues are transport; caches may cache (A-8a) but never answer |
| 12 | Determinism constraint on workflow code (Temporal) | already-by-construction | Temporal polices clock/random/IO socially and detects violations at replay; the kernel's carriers have no parameter to read ambient inputs through (T23) — the same list, enforced as unrepresentability, not review |
| 13 | Saga = sequence of steps (Garcia-Molina & Salem 1987) | program DAG + rounds | each step an action declaration; the saga's identity is the program digest; interleaving tolerance is the paper's own point |
| 14 | Compensation (sagas; BPMN compensation handlers) | successor declarations, forward-only | the 1987 semantics is already forward-only: the compensator "does not necessarily return the database to the state that existed" — semantic undo is a NEW act pinning what it compensates; never rollback (nothing unbecomes, closure row 12) |
| 15 | Choreography (EDA: events + local reactions, no center) | the doctrine itself: emit + trigger + spawn | decentralized reaction to events under local autonomy IS monotone reaction under writs; the known pain (no holistic view) is answered by anchored fold views, which are derived and authority-free |
| 16 | Orchestrator (central controller commanding steps) | REFUSED as authority; lawful as a VIEW | engine state as truth is G34; an "orchestration view" reconstructed as an anchored fold over the journals is lawful precisely because it decides nothing |
| 17 | HTN compound task + decomposition methods | program DAGs by digest + `decide` on method choice | decomposition = child program referenced by digest (composition is referencing); choosing among alternative methods for one goal is one-winner per round; the planner's SEARCH is outside meaning — the resulting plan is a declared value |
| 18 | BPMN parallel split (AND-split) | program DAG fan-out | two nodes, no edge; no coordination needed to start independent work |
| 19 | BPMN synchronization (AND-join) | trigger over conjunction of evidence | conjunction of stable predicates is stable (F10 stability); "all inputs arrived" is monotone — the join fires on evidence, never un-fires |
| 20 | BPMN exclusive choice (XOR-split, data-based) | `decide` | exactly-one-branch is a one-winner act; CALM prices it; register I2 is the mechanism |
| 21 | BPMN simple merge (XOR-join, no synchronization) | trigger (first evidence enables) | monotone pass-through; duplicate enables are deduped at the next fenced act |
| 22 | BPMN multi-choice (OR-split) | independent triggers | each condition a monotone predicate; branches enable independently; no winner needed |
| 23 | BPMN synchronizing merge (OR-join) | REFUSED as monotone; routes to deadline seat | the OR-join must know no further branch can still deliver — an absence claim with famously non-local semantics; absence is sealed by a fenced act, never inferred from a local view (closure rows 2/11) |
| 24 | BPMN deferred choice (event-based gateway) | `decide` keyed by the choice | racing environmental events are claims; the first landing wins the round; the losers' events remain harmless evidence — withdrawal of the untaken paths is the register's dedup, not retraction |
| 25 | BPMN timer boundary event / deadline path | deadline seat | tick facts by `emit` (G32); "nothing by Friday" is a completeness judgment; the act is a `decide` under declared authority (G9) |
| 26 | BPMN cancel region / terminate | outside meaning + a landed abort outcome | killing work is lease revocation (liveness); the RECORD that the case ended aborted is a fenced outcome so meaning has one answer |
| 27 | Human/manual task, worklists (BPMN; engines) | session seat | a fill idempotent per (value, seat) on the session's venue journal; completion of the human step is the seat's fill; case close is the one non-monotone act a session contains |

### 3.2 Notes per family — the load-bearing comparisons

**Erlang/OTP** (fetched-primary: OTP "Supervisor Behaviour" system
docs). The strategies are exactly quoted: one_for_one restarts only
the failed child; one_for_all "all remaining child processes are
terminated" then all restarted; rest_for_one terminates and restarts
the children *after* the failed one in start order. Restart intensity:
"If more than MaxR number of restarts occur in the last MaxT seconds,
the supervisor terminates all the child processes and then itself" —
escalation up the tree. (PRACTICE.) SYNTHESIS, the split the
commission named: restart strategies are pure **liveness** — they
decide when to re-run effort, never what is true. The estate keeps
the tree's *authority shape* (spawn-meet), gets restart-safety from
resumption (F3) plus landing-dedup (F5) instead of process
discipline, and refuses only the automatic escalation-as-meaning:
"this work is dead" is a deadline-seat verdict, not a crash counter.

**Structured concurrency** (fetched-primary: N.J. Smith, "Notes on
structured concurrency, or: Go statement considered harmful", 2018).
The core rule: "the nursery block doesn't exit until all the tasks
inside it have exited — if the parent task reaches the end of the
block before all the children are finished, then it pauses there and
waits for them"; unhandled child errors cancel siblings and re-raise
in the parent — the black-box abstraction restored for concurrency.
(PRACTICE/essay.) Kotlin's coroutine scopes and Effect's `Scope`
carry the same discipline (LEAD for Kotlin; Effect's `Scope` is the
estate's own vendored pin, ratified as the lease boundary).
SYNTHESIS: scope trees are *lexical DAG position* — the estate
expresses the structure as program-DAG pinning (a child is a node
under the parent's digest, C7 well-founded), the wait-for-children
as evidence-join at the close, and the cancellation half as lease
machinery outside meaning. Nothing in structured concurrency is
refused; it decomposes without remainder — which is itself evidence
that the algebra's session/scope story is not exotic.

**Temporal/Cadence** (fetched-primary: Temporal docs on workflow
execution and workflow definition). What matches, precisely: the
Event History is a durable append-only log per execution ("If a
failure occurs, the Workflow Execution picks up where the last
recorded event occurred in the Event History"); progress resumes by
**replay** ("During a Replay the Commands that are generated are
checked against an existing Event History"); and workflow code "must
be deterministic to support replay" — no ambient clock, randomness,
or I/O; external interactions go through Activities; non-determinism
is grounds for replay failure. (PRACTICE.) SYNTHESIS — how close,
and where the line is. Close: journal + fold + rounds is a fair
description of history + replay + activity-completion; Temporal's
determinism list is the kernel's closure list; Temporal's
versioning/patching maps to successor program declarations. The
line, in three parts. (1) **Where enforcement lives**: Temporal
detects a clock read at replay time, as a wall; the kernel's fold
carrier has no clock parameter, as a door — unrepresentable beats
detected. (2) **What the engine owns**: the service holds
authoritative mutable execution state, durable timers, task queues,
sticky caches — the exact inventory the no-orchestrator doctrine
refuses as sources of truth; in the estate those become anchored
folds (views), tick facts + deadline seat (timers), and transport
(queues). (3) **History hygiene**: Temporal histories are truncated
by continue-as-new when they grow; the estate's analog is fenced
compaction above a derived horizon preserving (head, state digest) —
same operational need, met as a priced meaning act rather than an
engine feature. The honest positioning sentence this suggests —
"durable execution with the engine's authority deleted" — is priced
as CR-4, because F13 (bound-execution replay) is stated, not proven,
and the estate must not claim Temporal-grade replay before its law
lands.

**Sagas** (abstract tier: Garcia-Molina & Salem, SIGMOD 1987, via
ACM listing and summaries). A long-lived transaction as a sequence
of short transactions, each with a compensating transaction; the
system guarantees either all complete or compensations run for the
completed prefix; compensation is semantic, not physical restore.
SYNTHESIS: sagas are the forward-only discipline the estate already
mandates — the only amendment the algebra makes is identity:
steps, their outcomes, and their compensations are all declared
values pinned into one lineage, so "which saga is this compensation
part of" is a digest walk, not an engine's bookkeeping.

**Choreography vs orchestration** (PRACTICE: Camunda and adjacent
practitioner literature). Orchestration: "the control logic resides
with a central controller"; choreography: event-driven, each service
reacts autonomously; the cited cost of choreography is lost global
visibility and hard troubleshooting. SYNTHESIS: the estate is
choreography with receipts — reaction is monotone triggers, autonomy
is writs, and the global view choreography loses is recovered as an
anchored fold (derived, citable, authority-free), which dissolves
the classic trade-off's sharpest horn without re-centralizing
control.

**HTN planning** (abstract tier: Georgievski & Aiello's overview,
arXiv 1403.7426, and adjacent surveys). Compound tasks decompose via
methods (precondition + subtask network) down to primitive tasks;
multiple methods per task encode alternative decompositions.
SYNTHESIS: an HTN *domain* is a family of program templates (typed
holes = the method's parameters), a *plan* is a cataloged program
DAG, method *choice* is a per-round `decide` when exclusive, and the
planner is a seat whose search happens outside meaning — the estate
hosts HTN artifacts, not HTN search.

**BPMN / workflow patterns** (PRACTICE: workflowpatterns.com pattern
definitions and BPMN mappings via the patterns documentation). The
basic control patterns split cleanly on monotonicity, exactly as the
commission predicted: parallel-split and AND-join are monotone
(fan-out; conjunction over evidence); exclusive-choice and
deferred-choice are one-winner acts (`decide` — the deferred variant
is the register racing environmental claims); the OR-join is the
famous non-local case and lands on the deadline seat because it is
an absence claim ("no more tokens can arrive"); timer paths are the
deadline seat by construction. Rows 18–27 above carry the verdicts.

---

## 4. Area C — chiral replicas: identical CAS twins, asymmetric structure or function

The construct, restated once. Two replicas whose **state** is
identical and content-addressed — equality is one digest comparison,
sync is anti-entropy until root digests match — but whose
**structure** (physical organization) or **function** (role:
who executes, who serves what) is deliberately asymmetric: mirror
twins, "chiral." Plus the exclusivity refinement: only one twin
executes tasks at a time ("synced task-exclusive").

### 4.1 Prior art — function chirality (same content, different role)

**Primary/standby with fencing** (fetched-primary: Kleppmann, "How
to do distributed locking", 2016-02-08). The argument the role plane
must inherit: a lease alone cannot make "I am the active one" safe —
"if the GC pause lasts longer than the lease expiry period ... it
may go ahead and make some unsafe change"; the repair is a fencing
token, "simply a number that increases ... every time a client
acquires the lock," checked at the *resource*: "the storage server
remembers that it has already processed a write with a higher token
number ... and so it rejects the request." Token generation itself
needs a linearizable source (his examples: ZooKeeper's zxid;
Redlock fails exactly here). His efficiency/correctness split:
locks-for-efficiency may fail cheaply; locks-for-correctness demand
the token check at the landing door. (MEASURED.) SYNTHESIS: the
estate's `decide` IS the landing door with the token check built in
— Kleppmann's repair is the register's definition, and
"task-exclusive" therefore costs nothing new: the standby's landings
are already unlandable (`no_stale_token_lands`), only its *external
side effects* remain out of reach (the standing G23 caveat, which
rides this construct verbatim).

**Leader election as a two-element register** (PRACTICE: Kubernetes
Lease API and client-go leader election, via docs and practitioner
writeups). A Lease object holds `holderIdentity`; standbys watch;
on expiry candidates race to update it, and "since the Kubernetes
API server disallows updates to stale objects, only a single standby
node will successfully be able to update the Lease" — optimistic
concurrency via `resourceVersion` as the fence. Singleton
controllers are exactly lease-based task-exclusivity in production.
(PRACTICE.) SYNTHESIS: this is the role plane with a weak token
(resourceVersion CAS rather than an exposed monotone number carried
to every downstream write) — Kubernetes fences the *rebind* but
mostly does not fence the *work*, which is the gap Kleppmann's
argument names and the estate's register closes.

**Chain replication and CRAQ** (fetched-primary: Terrace & Freedman,
USENIX ATC 2009; the paper restates van Renesse & Schneider's OSDI
2004 chain replication). Chain replication is a *structurally
directional line over identical content*: writes enter at the head,
propagate down, commit at the tail; reads at the tail only. CRAQ
lets every node serve reads by keeping clean vs dirty versions: a
node whose latest version is dirty (written but not tail-committed)
"queries the tail for the last committed version"; the tail is the
commit authority. (MEASURED.) SYNTHESIS: CRAQ independently
reinvented the estate's read split — a clean version is a read at an
anchor (committed position, never wrong later); a dirty version is
beyond-the-anchor speculation; and the "ask the tail" hop is anchor
resolution against the authority for the committed floor. Chirality
lesson: a chain is *role-asymmetric per position* while
content-symmetric at the committed prefix — asymmetry of function
over symmetry of state is a proven, high-throughput arrangement.

**Dual-run / referee replicas** (PRACTICE: GitHub Scientist README
and blog). Refactor validation runs control and candidate on live
traffic; results are compared and recorded; **only the control's
return value is ever used** — the referee observes and never
decides. (PRACTICE.) The estate's own two-runtime replay wall is
this exact shape (one authoritative carrier, one referee,
byte-compare per hop) — noted as an in-estate cross-reference, not
external evidence. SYNTHESIS: referee-chirality is the cheapest
function asymmetry — no fencing needed at all, because the referee
owns no landing door.

### 4.2 Prior art — structure chirality (same content, different physical section)

**TiDB / TiFlash** (fetched-primary: Huang et al., "TiDB: A
Raft-based HTAP Database", PVLDB 13(12), 2020). The row store
(TiKV) runs Raft with leaders and followers; the columnar store
(TiFlash) joins each Raft group as a **learner** — it receives the
log asynchronously, does not vote, and cannot be elected: role
asymmetry embedded in the consensus membership itself. Content: the
learner applies the same log, transformed row-to-column (the
DeltaTree engine), so the pair holds *logically identical content in
two physical organizations*. Consistency between the chiral halves
is **positional, not byte-level**: on a read at timestamp ts, the
learner obtains the leader's latest commit index (read-index), waits
until its applied index reaches it, then serves a snapshot-
isolation-consistent MVCC read. (MEASURED; extraction machine-
mediated over the fetched PDF.) SYNTHESIS: "wait until applied ≥
read-index, then read at ts" is the anchor discipline in Raft
clothing — the pair's sync claim is "equal at this position," which
is exactly the estate's digest-equality-at-anchors with the digest
replaced by a log index the protocol trusts instead of re-derives.

**F1 Lightning** (abstract tier: Yang et al., PVLDB 13(12), 2020).
The loosely-coupled variant: change-data-capture (Changepump) from
an OLTP database into LSM-tree analytical replicas; reads are
"snapshot consistent with respect to the original OLTP database,"
with every change retaining its original commit timestamp; the
replica is explicitly a *service over someone else's system of
record* — structure chirality across an organizational boundary.
(MEASURED, abstract tier.)

**SingleStore Universal Storage** (PRACTICE: vendor docs). The
opposite pole: rather than a chiral pair, one table type absorbs
both natures — columnstore gains single-row seeks and updates,
rowstore gains compression — chirality internalized into a single
hybrid section. (PRACTICE.) SYNTHESIS: the design space is a line —
two stores with a log between (TiDB), two stores across a boundary
(Lightning), one store with two behaviors (SingleStore) — and the
chiral-pair construct is the *first* point on that line, chosen for
verifiability (two sections can referee each other; one hybrid
cannot).

**Write-optimized vs read-optimized twins generally.** LSM trees vs
B-trees over one log is the textbook version (O'Neil et al. for LSM
— LEAD, classic); TiFlash's DeltaTree and Lightning's LSM stores are
shipped instances of "the read-optimized twin is itself a fold of
the write log" (SYNTHESIS).

**State-plane sync.** Anti-entropy to digest equality is standard
art: Dynamo synchronizes replicas by Merkle trees — "if the hash
values of the root of two trees are equal, then the values of the
leaf nodes in the tree are equal ... the nodes require no
synchronization," with descent localizing differences (MEASURED,
abstract tier: DeCandia et al., SOSP 2007, via summaries). git and
ostree pulls are object-set union into content-addressed stores
(LEAD/PRACTICE). The state plane of the chiral pair is therefore the
best-understood plane of the three.

### 4.3 The formulation — three planes over one pair

SYNTHESIS throughout this subsection; this is the memo's own
assembly, offered for the grill.

Let the pair be (A, B) over one declared **base**: the logical
content — the content-addressed store plus the per-partition
journals, exactly the estate's meaning planes.

**State plane — symmetric.** Both twins replicate the base. Sync is
anti-entropy on the object set: union of immutable content-addressed
values — ACI, arrival-order-free, duplication-harmless — the
estate's class (a) at the store carrier. "Synced" is the decidable
fact `rootDigest(A) = rootDigest(B)` over a pinned anchor set;
because objects are immutable and content-addressed, digest equality
is state equality (extensionality), one comparison at the root,
Merkle descent for the diff. The claim is per-anchor, never "now":
new writes keep arriving, so the honest sync fact is "equal at these
positions" — and it should itself be a declared value (a **sync
certificate** pinning both twins' anchors and the shared root
digest), so that synced-ness is evidence triggers can react to
monotonically.

**Role plane — antisymmetric.** Roles form the two-element set with
the swap involution σ (σ∘σ = id; σ has no fixed point — there is no
"both" role). The current assignment is exactly ONE fenced fact: a
role register keyed by the pair's declaration digest, holding
(token, assignment). Failover/handover = a `decide` with a strictly
greater token — the fenced rebind, the directory's greatest-seal
shape. Everything Kleppmann demands lands here: the token is minted
by the register (monotone by I1), and it is *checked at every task
landing door*, so a superseded twin's work is unlandable rather than
forbidden. Two fences ride verbatim: at-most-one **landed** outcome
is not at-most-one external side effect (G23 — the demoted twin that
already sent the email is outside meaning's reach); and
exactly-one-active is a **liveness** claim the model must not make —
safety owns at-most-one, availability owns at-least-one, and the
safety-only rule keeps the second out of the Lean statement.

**Structure plane — chirality proper: two sections over one base.**
The fibration reading, made plain: over each logical object sits a
fiber of possible physical residences (row pages, columnar segments,
LSM runs, B-tree pages, cache tiers); a **section** chooses one
residence per object; twin A and twin B are two *different* sections
over the *same* base. Chirality = the sections differ by design
(write-optimized vs read-optimized, row vs column, hot vs archival);
mirror-ness = the base is shared and digest-checked. The coherence
obligation is per-twin and already the estate's law: decode∘layout =
id, discharged by verify-on-read (re-derive the digest of whatever
the section returns — a section can never lie undetected). The
cross-twin claim — both sections' derived reads agree at equal
anchors — is the two-runtime replay wall generalized, and it is
F13-shaped: state it, wall it with generated corpora replayed on
both twins, and do not claim it proven before the estate's F13
ruling lands (the KM-8 posture, inherited whole).

**Exclusivity — two variants, one mechanism.** (i) Global: task
registers admit claims only under the current (token, assignment) —
"synced task-exclusive" is the role register scoped over task
classes. (ii) Partitioned: ownership is a declared partition of the
key universe, each twin exclusive over its cells — chirality as
complementary ownership (Kafka's consumer groups are the shipped
precedent: partitions exclusively owned, every rebalance a new
generation, the coordinator validating ownership at offset-commit —
epoch fencing at the commit door; PRACTICE). The partition map is
data: disjointness is checkable at admission; *covering* is claimed
only relative to the declared universe (an absolute "every key is
owned" would be an absence claim).

**The forced separation, worth stating as a law.** If the role fact
lived inside the mirrored content, the twins could never be
digest-equal while disagreeing on who is active — the construct
would contradict itself. Digest-equality of state therefore *forces*
role out of the state plane and into a separate carrier. The estate
already has that carrier (registers are class (c), not content), so
the chiral pair is well-posed in the estate by construction, where a
naive KV-store implementation would have to invent the separation.

### 4.4 Candidate invariants for a Lean-modelable chiral pair

Named CP-1..CP-9; each mapped to the existing law family it
instantiates, per the no-new-physics discipline. All SYNTHESIS —
candidates for a future model, not claims.

| # | Candidate invariant | Statement sketch | Existing shape it instantiates |
| --- | --- | --- | --- |
| CP-1 | sync extensionality | equal root digests ↔ equal verified object sets (per anchor set) | F1 extensionality at the store carrier; hash injectivity stays in the trusted base (standing precedent) |
| CP-2 | sync inflationarity | anti-entropy steps only grow each twin's object set; no sync deletes | `cell_absorb_inflationary` / `interp_inflationary` shape |
| CP-3 | at-most-one-active | per incarnation of the role register, at most one landed assignment | F5 I2 (`at_most_one_landed_commit`) instantiated at the role register |
| CP-4 | fenced swap | a rebind lands only with a strictly greater token | `token_monotone` + `no_stale_token_lands` |
| CP-5 | swap involution | σ∘σ = id on assignments; a landed assignment determines both roles (σ total, fixed-point-free: active(x) ↔ ¬active(σx)) — exactly-one-active deliberately NOT claimed (liveness) | new small lemma family over a two-element carrier; the safety-only fence scopes it |
| CP-6 | digest-equality-at-anchors | if both twins hold the same anchor fact (fold, partition, floor, state digest, head), every anchored derived read agrees | F11 query-determinism corollary read at two carriers |
| CP-7 | stale execution unlandable | a task outcome carrying a superseded (token, assignment) never lands | `no_stale_token_lands` at the task-register family |
| CP-8 | section coherence | per twin, resolve-after-layout returns the declared value (verify-on-read); cross-twin: both sections replay byte-equal per hop at equal anchors | verify-on-read law; the cross-twin half is F13-shaped — state and wall, do not prove ahead of the ruling |
| CP-9 | complementary ownership (partitioned variant) | the declared ownership map's cells are pairwise disjoint (admission-checkable); covering claimed only over the declared key universe | admission door check + the no-absence-claims closure row |

What the pair is deliberately NOT, so nobody hunts for missing
machinery: not consensus (no quorum — the register is the one
coordination point, and the pair has exactly one register fact per
scope); not active-active multi-master (the state plane's join
already covers concurrent writers lawfully); not a failover
*detector* (deciding the old active is dead is the deadline seat's
judgment over tick facts and heartbeat evidence — liveness feeding
one fenced act, never an automatic transition).

---

## 5. What the survey could NOT verify — honest absences

1. **The CALM paper's full text was not read this session.** CACM
   returned 403; the arXiv PDF fetched as un-extractable binary. The
   theorem statement, definitions, operator classification, and the
   Ameloot-et-al. attribution rest on the arXiv abstract plus the
   Morning Paper's quoted summary — consistent with each other, but
   secondary. Anything load-bearing built on the *fine print* of
   coordination-freeness (e.g., the relational-transducer model's
   exact assumptions) needs the primary before ratification.
2. **Bloom^L details are abstract-tier.** The
   monotone/homomorphic method distinction and built-in lattice
   family come from search-level reading of the SoCC paper's
   descriptions, not a fetched PDF.
3. **cr-sqlite's exact clock semantics are thinner than the memo
   would like.** The fetched docs state column-wise LWW, logical
   `db_version`/`col_version`, and "concurrent → largest value";
   whether a site identifier participates in tie-breaking, and the
   precise causal-delivery assumptions, were not confirmed from
   primary sources this session.
4. **Delta's storage-level atomicity wording.** The fetched
   PROTOCOL.md excerpt carried the catalog ratification rule
   (at-most-once per version, in order) but not the classic
   filesystem-requirements sentence; the put-if-absent and
   DynamoDB-LogStore mechanics are from the project's own blog
   (vendor tier), not the protocol text proper.
5. **Iceberg snapshot-id generation** (random vs derived) is an
   implementation detail the spec does not fix; the spec text only
   requires uniqueness. Immaterial to the mapping, material to any
   canonical-bytes retrofit claim.
6. **F1 Lightning, SingleStore, HTN, choreography literature, Dynamo
   anti-entropy, Kafka generation fencing, Kubernetes lease
   internals**: abstract/practitioner tier — no primary PDF or spec
   was fetched for these this session.
7. **casync, log-structured FS, btrfs, differential dataflow (CIDR
   2013), Kotlin scope docs, git object-model internals, POSIX spec
   text**: LEAD-tier classics cited from general knowledge and
   search-level confirmation; none fetched primary this session.
8. **Machine-mediated extraction caveat.** The fetched PDFs (Laddad,
   DBSP, CRAQ, TiDB) were summarized by an extraction model; short
   quotes were cross-checked against the search layer where
   possible, but page-level verbatim verification was not performed.
   Treat block quotes from those four as high-fidelity paraphrase
   unless independently confirmed.
9. **The central Area-C absence, which is a finding:** no surveyed
   system defines cross-replica consistency as canonical-byte digest
   equality of *logical* state. HTAP pairs define it positionally
   (Raft indexes, commit timestamps); Dynamo's Merkle equality is
   over one storage organization, not across chiral organizations.
   The chiral pair's sync claim as formulated (CP-1/CP-6) appears to
   be genuinely unoccupied ground — with the corresponding burden
   that nobody else's operational scars exist to learn from.
10. **No quantitative evidence anywhere in Area C.** The chirality
   sections rest on system designs (MEASURED/PRACTICE for
   mechanisms), but the survey found no measurements of, e.g.,
   dual-run referee costs or digest-sync overheads for the specific
   composed construct. The formulation is design-plausible, not
   evidence-costed.

---

## 6. Grill-ready open questions

- **CR-1 — the lakehouse reading as a committed appendix.** Iceberg
  and Delta decompose exactly as manifest-journal + fold + one
  fenced pointer (§2.4/§2.6). Does the estate adopt "an export to
  Iceberg/Delta is a declared fold projection whose commit is a
  `decide` at an external register" as the canonical compatibility
  sentence — making lakehouse interop a composition rather than a
  connector?
- **CR-2 — canonicalization at the boundary.** Every mainstream
  format refuses canonical bytes and embeds wall-clock (§2.6). When
  estate values cross into external formats, does the export lane
  carry a reproducible-builds-style canonicalization shim (pinned
  order, zeroed ambient fields, SOURCE_DATE_EPOCH-class discipline),
  or does the estate refuse content-addressing claims past the
  boundary entirely?
- **CR-3 — the group rung's admission ticket.** DBSP shows Abelian-
  group fold algebras buy auto-incrementalization and cost
  exactly-once (§2.2). Does KM-17's ladder gain an explicit group
  rung whose elaboration rule demands the F2b successor discipline
  at deploy time — retraction lawful as fold-state data, journal
  append-only unchanged?
- **CR-4 — the Temporal sentence.** Is "durable execution with the
  engine's authority deleted" a defensible outward positioning line
  before F13 is proven — or does the two-lane discipline (gauntlet
  beside the map) require the comparison to stay inside until the
  replay wall runs?
- **CR-5 — the BPMN subset as compatibility surface.** Rows 18–27
  map the basic control patterns; OR-join and timers route through
  the deadline seat. Does the mapping table graduate into a
  committed "hosted BPMN fragment" document (with the refused
  constructs named), or stay reference material?
- **CR-6 — one register or two for the role plane.** The
  formulation puts the whole role assignment in ONE register fact
  (the involution needs a single arbiter). The alternative — one
  lease per twin — reintroduces the split-brain window between two
  facts. Confirm the one-register reading before any model work.
- **CR-7 — the sync certificate as a declared value.** Should
  "synced at anchors (A₁..Aₙ, root digest D)" be a cataloged
  declaration kind (evidence both twins can emit and triggers can
  react to), making synced-ness first-class rather than an
  operational observation? (CP-1/CP-6 assume yes.)
- **CR-8 — safety-only scoping of the involution.** CP-5 claims
  at-most-one-active plus totality of the landed assignment, and
  deliberately not exactly-one-active. Confirm that failover
  latency and at-least-one-active stay unclaimed liveness, so the
  Lean statement inherits the standing safety-only fence.
- **CR-9 — HTAP as an estate composition.** TiFlash is "a columnar
  fold of the row log with positional consistency" (§4.2). Does the
  estate ever want an analytics twin as a *declared fold* over its
  own journals (C10 indexes-are-folds, no new machinery), making
  structure chirality an instance rather than an architecture?
- **CR-10 — which chirality lands first in a model.** Global
  active/passive (one role register; CP-3/4/5/7) and partitioned
  ownership (per-cell registers; CP-9) are different first slices.
  The global variant exercises the involution; the partitioned
  variant exercises admission-checked disjointness. Pick one for
  the first Lean pass rather than modeling both.

---

## 7. Sources

All URLs accessed 2026-08-18.

### Fetched-primary (document retrieved and read this session)

- Apache Iceberg Table Spec — apache/iceberg `format/spec.md` (raw),
  https://raw.githubusercontent.com/apache/iceberg/main/format/spec.md
  (spec text: atomic swap, immutability, serializable isolation,
  sequence numbers, v2 delete files).
- Delta Lake PROTOCOL.md — delta-io/delta (raw),
  https://raw.githubusercontent.com/delta-io/delta/master/PROTOCOL.md
  (log structure, catalog ratification at-most-once/in-order,
  required `modificationTime`, tombstones, deletion vectors, no
  canonical serialization).
- Laddad, Power, Milano, Cheung, Crooks, Hellerstein — "Keep CALM
  and CRDT On", PVLDB 16(4), 2022,
  https://www.vldb.org/pvldb/vol16/p856-power.pdf.
- Budiu, Chajed, McSherry, Ryzhyk, Tannen — "DBSP: Automatic
  Incremental View Maintenance for Rich Query Languages", PVLDB
  16(7), 2023 (VLDB best paper),
  https://www.vldb.org/pvldb/vol16/p1601-budiu.pdf.
- Terrace, Freedman — "Object Storage on CRAQ: High-throughput chain
  replication for read-mostly workloads", USENIX ATC 2009,
  https://www.cs.princeton.edu/~mfreed/docs/craq-usenix09.pdf.
- Huang et al. — "TiDB: A Raft-based HTAP Database", PVLDB 13(12),
  2020, https://www.vldb.org/pvldb/vol13/p3072-huang.pdf.
- Kleppmann — "How to do distributed locking", 2016-02-08,
  https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html.
- vlcn-io cr-sqlite — README,
  https://raw.githubusercontent.com/vlcn-io/cr-sqlite/main/README.md,
  and "Column CRDTs" docs,
  https://vlcn.io/docs/cr-sqlite/crdts/column-crdts.
- ElectricSQL — "Introducing Rich-CRDTs", 2022-05-03,
  https://electric.ax/blog/2022/05/03/introducing-rich-crdts
  (redirect target of electric-sql.com).
- Temporal documentation — "Workflow Execution overview",
  https://docs.temporal.io/workflow-execution, and "Workflow
  Definition" (determinism),
  https://docs.temporal.io/workflow-definition.
- Erlang/OTP — "Supervisor Behaviour", OTP system documentation,
  https://www.erlang.org/doc/system/sup_princ.html.
- Smith — "Notes on structured concurrency, or: Go statement
  considered harmful", 2018,
  https://vorpus.org/blog/notes-on-structured-concurrency-or-go-statement-considered-harmful/.
- reproducible-builds.org — "Archive metadata",
  https://reproducible-builds.org/docs/archives/.
- Hellerstein, Alvaro — "Keeping CALM: When Distributed Consistency
  Is Easy", arXiv abstract page,
  https://arxiv.org/abs/1901.01930 (abstract only; full text not
  extractable this session — see §5.1).

### Abstract-tier (verified against abstracts or quoted secondary summaries)

- The Morning Paper (Colyer) — "Keeping CALM: when distributed
  consistency is easy", 2019-03-06,
  https://blog.acolyer.org/2019/03/06/keeping-calm-when-distributed-consistency-is-easy/
  (quoted theorem text, monotone/non-monotone operator lists,
  deadlock-vs-GC example, Ameloot attribution).
- Conway, Marczak, Alvaro, Hellerstein, Maier — "Logic and Lattices
  for Distributed Programming", SoCC 2012,
  https://www.neilconway.org/docs/socc2012_bloom_lattices.pdf
  (lattice types; monotone/homomorphic method annotations).
- Alvaro et al. — "Consistency Analysis in Bloom: a CALM and
  Collected Approach", CIDR 2011,
  https://people.ucsc.edu/~palvaro/cidr11.pdf (points of order).
- Garcia-Molina, Salem — "Sagas", SIGMOD 1987,
  https://dl.acm.org/doi/10.1145/38714.38742 (compensation
  semantics via listing and summaries).
- Yang et al. — "F1 Lightning: HTAP as a Service", PVLDB 13(12),
  2020, https://www.vldb.org/pvldb/vol13/p3313-yang.pdf
  (Changepump CDC; snapshot consistency with original commit
  timestamps).
- DeCandia et al. — "Dynamo: Amazon's Highly Available Key-value
  Store", SOSP 2007, via
  https://www.allthingsdistributed.com/2007/10/amazons_dynamo.html
  (Merkle-tree anti-entropy).
- Georgievski, Aiello — "An Overview of Hierarchical Task Network
  Planning", arXiv 1403.7426,
  https://arxiv.org/pdf/1403.7426 (HTN primitives/compound
  tasks/methods).
- IPFS IPIP-0499 — "UnixFS CID Profiles", ipfs/specs PR 499,
  https://github.com/ipfs/specs/pull/499, and
  https://ipfsfoundation.org/ipip-0499-updating-ipfs-standards-for-consistent-reproducible-cids/
  (CID nondeterminism and the named-profile fix).
- Kubernetes — Lease concept docs,
  https://kubernetes.io/docs/concepts/architecture/leases/, plus
  practitioner walkthroughs of client-go leader election
  (holderIdentity, resourceVersion CAS).
- Apache Kafka — consumer-group protocol materials: KIP-848,
  https://cwiki.apache.org/confluence/display/KAFKA/KIP-848%3A+The+Next+Generation+of+the+Consumer+Rebalance+Protocol,
  and Confluent consumer documentation (generation ids, ownership
  validation at offset commit, zombie fencing).
- Workflow Patterns Initiative — control-flow pattern definitions
  (exclusive choice WCP-4, parallel split, synchronization, deferred
  choice), http://www.workflowpatterns.com/patterns/control/, with
  the BPMN mapping documents at
  https://www.omg.org/bpmn/Documents/Notations_and_Workflow_Patterns.pdf.
- Delta Lake blog — "Multi-cluster writes to Delta Lake Storage in
  S3", 2022-05-18,
  https://delta.io/blog/2022-05-18-multi-cluster-writes-to-delta-lake-storage-in-s3/
  (put-if-absent and the DynamoDB LogStore).
- GitHub Scientist — https://github.com/github/scientist and "
  Scientist: Measure Twice, Cut Once",
  https://github.blog/developer-skills/application-development/scientist/
  (control/candidate dual-run; control's value always returned).
- OpenZFS internals summaries — transaction groups and uberblock
  commit (e.g.,
  https://utcc.utoronto.ca/~cks/space/blog/solaris/ZFSUberblockWrites
  and derived documentation) — CoW to an atomic root update.
- SingleStore — "Universal Storage" documentation,
  https://docs.singlestore.com/cloud/create-a-database/columnstore/universal-storage/.
- OSTree — "OSTree Overview",
  https://ostreedev.github.io/ostree/introduction/ ("git for
  operating system binaries"; hardlink checkouts; atomic
  deployments).
- The Open Group Base Specifications — `rename()`,
  https://pubs.opengroup.org/onlinepubs/9799919799/functions/rename.html
  (atomicity requirement; located via search, spec text not fetched).
- Camunda — "Orchestration vs Choreography", 2023,
  https://camunda.com/blog/2023/02/orchestration-vs-choreography/.

### Lead (pointers, not verified this session)

- van Renesse, Schneider — "Chain Replication for Supporting High
  Throughput and Availability", OSDI 2004 (the original chain paper;
  its mechanics were read only as restated inside the fetched CRAQ
  paper).
- McSherry, Murray, Isaacs, Isard — "Differential dataflow", CIDR
  2013, https://www.cidrdb.org/cidr2013/Papers/CIDR13_Paper111.pdf.
- Rosenblum, Ousterhout — "The Design and Implementation of a
  Log-Structured File System", SOSP 1991.
- O'Neil, Cheng, Gawlick, O'Neil — "The Log-Structured Merge-Tree",
  Acta Informatica 1996.
- Ameloot, Neven, Van den Bussche — "Relational transducers for
  declarative networking", JACM 2013 (the CALM proof vehicle; known
  only through the CACM paper's attribution).
- Kuhn/Ignat CRR line — "Conflict-Free Replicated Relations for
  Multi-Synchronous Database Management at Edge" and "Towards a
  General Database Management System of Conflict-Free Replicated
  Relations" (cited by cr-sqlite's README).
- Poettering — casync announcement,
  https://0pointer.net/blog/casync-a-tool-for-distributing-file-system-images.html.
- Pro Git — "Git Internals: Git Objects" (content-addressed object
  model), https://git-scm.com/book/en/v2/Git-Internals-Git-Objects.
- Kotlin coroutines — structured concurrency documentation,
  https://kotlinlang.org/docs/coroutines-basics.html.
- btrfs CoW design documentation (same CoW-to-root class as ZFS).
- ElectricSQL's later pivot to a read-path sync engine (Electric
  "Next") — noted from comparison material only.
- Temporal event-history size limits (the 51200-event / 50MB
  figures circulate in docs and forums; not confirmed on a fetched
  page this session).
