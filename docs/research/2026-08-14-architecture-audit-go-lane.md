# Architecture audit, Go lane: protod, effector, stream

Lane report, 2026-08-14. Explore agent (very thorough), coordinator-dispatched;
verified against `main` at `21d77220c`. Companion to the
[authoritative synthesis](2026-08-14-architecture-audit.md); this document is
evidence, the synthesis ranks and decides. Preserved as delivered, light
formatting only.

---

## 1. Component map: `proto/go/protod`

### Transport / dispatch — `dispatch.go`

**Responsibility.** Subject → handler table. Nine request subjects on
`flb.req.>` plus a wildcard ingress surface `flb.ing.>` (`dispatch.go:16-29`),
both subscribed in `Acquire` (`protod.go:228-240`).

**Data shapes.** In: `*nats.Msg` (subject + bytes). Out: `any`, marshalled by
`respond` (`dispatch.go:179-188`).

**Invariants enforced here.**
- W9 — unknown subject yields `KindUnknownRequest` listing every legal subject
  (`dispatch.go:74-92`).
- W8 — no request ever throws; `respond` swallows marshal errors
  (`dispatch.go:183-186`).
- W2 — `decodeBody` (`dispatch.go:130-169`) is the single admission gate for
  request bytes: `canonical.Decode` (I-JSON: valid UTF-8, unique member names,
  finite binary64, depth ≤ 256, no trailing value — `canonical.go:72-91`),
  then `CanonicalizeValue`, and only then `json.Unmarshal` **over the
  canonical bytes**. The comment at `dispatch.go:126-129` states the reason:
  `encoding/json` would silently repair duplicate names and lone surrogates
  before identity is derived.
- A request with `msg.Reply == ""` is dropped (`dispatch.go:50-52`) — "there
  is nowhere to teach into."

### Catalog — `catalog.go`, `certify.go`

**Responsibility.** The catalog is a `journal.Journal` named `catalog`
(`catalog.go:21,38-41`) plus an in-memory `byDigest` index and a `bridges`
set, both rebuilt from a full verified read at `Open` (`catalog.go:48-76`).

**Data shapes.** `catalogFact{Digest, Scheme, Structure any, Submitter, seq}`
(`catalog.go:23-29`) — journal payload is the canonical bytes of the first
four fields (`catalog.go:217-222`); `seq` is *not* in the payload, it is the
journal position. `schemeBridge{Kind, From{Digest,Scheme}, To{...}}`
(`scheme_bridge.go:19-23`) is a second entry kind in the same journal,
discriminated by a `kind` envelope field on rebuild (`catalog.go:53-69`).

`certify` (`certify.go:18-42`) is the *sole* admission entry point, taking raw
request bytes so "malformed envelopes, grammar refusals, identity derivation,
ref-graph closure, and durable commit all make one decision at one seam."
Session commit re-enters through it by re-marshalling a synthetic
`createRequest` (`session.go:391-397`).

**Invariants.**
- W1 — `commitCertified` derives the digest itself and compares against
  `assertedDigest` only afterwards, refusing with both values
  (`catalog.go:175-191`).
- W3 — convergence: `if existing, known := c.byDigest[derived]; known &&
  existing.Scheme == activeScheme.Name()` returns `created:false` with the
  existing fact (`catalog.go:202-209`).
- W4/DAG — every `refUse` must already resolve (`catalog.go:142-159`), then
  `walkRefGraph` re-walks the transitive resolvable closure for cycles
  (`recursion.go:11-69`).
- W10 — every fact carries `Scheme: activeScheme.Name()` = `flb.type.v1`
  (`scheme.go:26-36`), and a `bytes-sha256-v1 → flb.type.v1` bridge is
  appended alongside (`catalog.go:175-177, 232`).

### Ingress — `ingress.go`

**Responsibility.** Only PUBLISH path into a journal; request/reply so a
refusal always has a reply home (`ingress.go:12-17`).

**Data shapes.** In: subject `flb.ing.<name>` + frame bytes, decoded as
`frame{Type string, Payload any}` (`ingress.go:24-27`). Out: `admitReply`
(`ingress.go:29-37`) or `refusalReply`.

**Invariants.**
- Journal-name/reservation gate: regex `^[A-Za-z0-9_-]+$`; `catalog` and the
  `flb_session_v0_` prefix are daemon-reserved (`ingress.go:48-56`).
- W4 — `d.catalog.resolve(decoded.Type)` gates admission; the refusal law
  sentence is verbatim W4 (`ingress.go:74-90`).
- W2 — what lands in the journal is `canonicalBytes(value)` of the whole
  frame, never sender formatting (`ingress.go:92-106`).
- W5 — the admit reply carries `seq` and `head` from the completed `Append`
  (`ingress.go:112-116`) plus a `next` hint to read it back.
- The stated non-check is in the reply as data: `admitNote`
  (`ingress.go:19-20`), asserted by the conformance test
  (`conformance_test.go:277-280`).

### Read — `read.go`

**Responsibility.** Journals come back as `wireEntry{Seq,Prev,Payload}` plus a
claimed head, with a `note` saying to recompute it (`read.go:17,34-42`).

**Invariants.**
- W6 — `journal.Read` is verify-on-read; `ErrTampered` from a caller-supplied
  cursor becomes a `KindBadCursor` *refusal* and leaks no entries
  (`read.go:78-91`).
- "Lag is absence" — `lookupJournal` refuses `KindUnknownJournal` rather than
  creating on read (`read.go:131-164`). Compare `openJournal`
  (`protod.go:276-288`), which *does* create — the read/publish asymmetry.

### Concierge — `concierge.go`

**Responsibility.** Stateless guided construction. `fill`/`unfill` take the
entire partial in the request and return the entire partial plus a truthful
frontier (`concierge.go:33-38`); the partial *is* the state.

**Data shapes.** `fillRequest{Partial, Path []string, Subtree}` →
`conciergeReply{OK, Partial, Frontier []frontierEntry, Next}`.
`frontierEntry{Path, Legal []frontierChoice, Refs []string}`
(`concierge.go:27-31`).

**Invariants.**
- Pure frontier: `buildFrontierFromSnapshot` takes the resolvable set as an
  argument, documented to cache under exactly `(state, catalog head)`
  (`concierge.go:135-153`).
- W4 for partials — `firstUnknownRef` (`concierge.go:213-234`);
  `teachUnknownRefRepair` mints a *ready-to-send fill body* that holes out
  the bad ref and substitutes a resolvable one (`concierge.go:236-260`) — W7
  taken seriously.
- `replaceTypeNode` (`concierge.go:293-373`) is the path algebra:
  `list/brand→of`, `check→base`, `struct→fields/<name>`, `union→of/<index>`;
  anything else refuses.

### Structure walk — `walk.go`

**Responsibility.** One pass validates the `flb.type.v0` grammar, collects
every ref with its exact path, and (in partial mode) every hole path.

**Data shapes.** `walkResult{refs []refUse, holes [][]string}`
(`walk.go:31-34`). Two entry points differing only in `allowHoles`:
`walkStructure` / `walkPartial` (`walk.go:36-42`).

**Invariants.**
- Closed grammar — unknown `k` refuses (`walk.go:216-224`); unknown *keys*
  refuse per kind via `checkKeys` (`walk.go:330-338`).
- C5 — a `hole` in a non-partial walk refuses (`walk.go:83-87`).
- Ratified amendment 2 — union members unique after canonical-byte sorting
  (`walk.go:167-177`); `optional` UTF-16-sorted, unique, referencing declared
  fields (`walk.go:250-287`), reason stated inline.
- `utf16Less` (`walk.go:360-370`) mirrors `canonical.utf16Less`
  (`canonical.go:387-397`) — duplicated, not shared.

### Journal machinery — `go/journal/journal.go`

**Responsibility.** Hash-chained CAS-append over one JetStream stream per
journal (`J_<name>` on subject `j.<name>`).

**Data shapes.** `Cursor{Seq int, Head string}`;
`canonical.ChainEntry{Seq, Prev, Payload}`; wire form is canonical JSON
`{"payload","prev","seq"}` (`journal.go:52-56, 551-561`). Entry identity is
`canonical.EntryDigest` — a hand-rolled fixed-order encoder, *not* a
re-canonicalization (`canonical.go:246-265`).

**Invariants (JL0–JL7, stated in `journal_test.go:1-13`).**
- JL0 — `badShapeReason` (`journal.go:478-549`) is a 24-clause pin: no
  eviction limits, `DenyDelete`/`DenyPurge`, no rollup, no mirror/source, no
  republish/subject-transform, no per-message TTL, no `AllowDirect`, no
  `AllowAtomicPublish`, no compression. `monitorShape`
  (`journal.go:127-162`) makes it a *standing* gate via the stream-updated
  advisory, latching before the re-check so a reverted violation cannot
  disappear.
- JL2 — the CAS is `jetstream.WithExpectLastSequencePerSubject(entry.Seq)`
  (`journal.go:432`).
- JL3 — a lost CAS is followed by a confirmatory re-read; identical bytes ⇒
  `Duplicate`, otherwise `ErrConflict` after a tail resync
  (`journal.go:441-457`).
- JL5 — `verifyStoredEntry` re-derives the entry digest and requires stored
  wire bytes to *be* canonical (`journal.go:379-381`); `readLocked` requires
  `entry.Prev == cursor.Head` for every entry (`journal.go:310-312`).
- Payload domain: newlines refused (`journal.go:207-209`); invalid UTF-8
  refused with the reason stated — it would launder to U+FFFD and collapse
  distinct payloads to one identity (`journal.go:407-412`).
- Read is windowed 16-wide with parallel `GetMsg` (`journal.go:385-401`), but
  the verification fold is shared with the sequential schedule
  (`journal.go:250-261`).

---

## 2. `go/effector` — the commitment register

### State machine

Three `State` values: `Unclaimed`, `Held`, `Committed` (`effector.go:28-32`).
The *storage* has only two tags — `"claim"` and `"done"`
(`effector.go:67-78`), plus key-absent. `Lookup` (`effector.go:330-355`)
maps:

| stored | `Lookup` | note |
| --- | --- | --- |
| key absent | `Unclaimed` | |
| `tag:"claim"`, `now < Expiry` | `Held` | |
| `tag:"claim"`, `now ≥ Expiry` | `Unclaimed` | key still exists, fence preserved |
| `tag:"done"` | `Committed` | terminal |

The Held→Unclaimed edge is **time-driven, invisible, and not a write**.
`Watch` explicitly refuses to evaluate it (`watch.go:14-15`).

### What compare-and-swap actually does

Two distinct JetStream KV primitives:
- **create-if-absent** — `kv.Create` for the first claim; `ErrKeyExists` is
  re-read and classified into `ErrCommitted` or `ErrHeld`
  (`effector.go:211-227`).
- **revision CAS** — `kv.Update(ctx, key, value, stored.Revision())` for
  claim-steal (`effector.go:256-261`) and commit (`effector.go:302-306`).
  `ErrKeyRevisionMismatch` on commit triggers re-read and re-classification,
  not blind retry (`effector.go:308-327`).

`History:1` is pinned at `Open` (`effector.go:97, 556-558`) — one live value
per work key.

### Fencing and lease semantics

The fence is a **separate logical counter carried in the value**,
`previous.Fence + 1` on each successful steal (`effector.go:246-251`),
starting at 1. Atomicity comes from the revision CAS; the fence is what is
*exposed* and what decides commits.

- `Commit` checks **only** `authority.claim.Fence != claim.Fence`
  (`effector.go:287-295`). Owner never checked; expiry never checked.
  Deliberate, pinned by `TestExpiredButUnsupersededClaimStillCommits`
  (`effector_test.go:620`).
- The lease decides **who may steal**, not who may commit
  (`effector.go:242-244`). Safety is fence-based; mutual exclusion is
  clock-based.
- Terminality: once `tag:"done"`, `Claim` returns `ErrCommitted`
  (`effector.go:221-223, 238-240`); `Commit` routes through
  `classifyCommitted` (`effector.go:507-521`): same fence + same result ⇒
  absorbed `(false, nil)`; same fence + different result ⇒ `ErrCommitted`;
  different fence ⇒ `ErrFenced`.

### Relation to journals

**None in code.** The effector shares the shape-gate pattern with `journal`
(`monitorShape` at `effector.go:132-175` is a near-copy of
`journal.go:127-162`, same latch-then-recheck comment) and shares
`canonical.Canonicalize` for wire values (`effector.go:523-548`, EL9).
Composed only at the transport layer: `go/cmd/journald/main.go:126-130` holds
both maps; `reasonFor` (`main.go:172-187`) flattens
`journal.ErrConflict/ErrTampered` and
`effector.ErrHeld/ErrCommitted/ErrFenced` into five wire reason strings.

**`protod` does not use the effector at all.** `Daemon` (`protod.go:86-100`)
holds only journals, sessions, catalog. "Sessions never use the effector"
(`contract.go:233`); the session-stale refusal law reads "stale evidence is
refused without an effector" (`session.go:669`).

### Laws claimed

EL0–EL10 in the `effector_test.go:1-17` obligation table — the header cites
`docs/primitives/P3-effector.md`, **which does not exist in this repo**.
`docs/LAWS.md:127-160` confirms: "These eleven test functions ARE the spec.
That is the honest status." WL1–WL4 are weaker still — section comments, not
names.

`FINDING-WATCH-EVICTION-001.md` is an open, unratified finding: `History:1`
deterministically evicts a `held` transition owed to an already-established
watcher, with a `History:2` causal control. The recommendation (restate
WL1/WL2 as best-effort) matches `watch.go:28-31`'s prose but has not been
applied to the law text.

---

## 3. `go/stream` (brief)

Pure Go, zero NATS/JetStream imports (`stream.go:27-38`). Organizing idea at
`stream.go:7-12`: an event stream is a left fold twice over — hash → identity,
state function → meaning; "the two folds disagree on purpose."

- **Chain heads.** `Head [32]byte`; `StreamSeed(name)` and `MergeSeed()` are
  distinct empty-history heads (`stream.go:113-127`); `Extend` is O(1)
  incremental (`stream.go:140-146`). This is a *different* chain encoding
  from `go/journal`'s `EntryDigest` — the two lanes do not share an identity
  function.
- **Merge.** A `MergeFact` is a list of `Pick{stream,seq}` — the
  linearization is the stored fact, content derivable (`stream.go:161-173`).
  `ApplyMerge` is total over unique coordinates and returns typed refusals
  `MergeGap`/`MergeDuplicateSequence` (deterministic, sorted by UTF-8 source
  then seq) rather than silent skip or LWW collapse (`stream.go:213-253`).
- **Combine.** `CombineKV` (`stream.go:425-456`) is the meaning-fold monoid.
  Doc comment states it is a **monoid, not a semilattice** — order is LWW
  semantics, self-combination double-counts. The homomorphism law
  `CombineKV(FoldKV(xs), FoldKV(ys)) == FoldKV(xs++ys)` is validated against
  a frozen fixture corpus cut at every split point (`combine_test.go`). The
  join-semilattice alternative has **no Go twin** (`stream.go:439-441`).
- **Compaction.** `Compact` explicitly disclaims licensing session-journal
  compaction (`stream.go:472-476`), matching `session.go:772-784`.

---

## 4. End-to-end data flow

### (a) `type.create`

1. `handleRequest` (`dispatch.go:56`) → `serveCreate` (`dispatch.go:96`) →
   `d.certify(ctx, msg.Data)` (`certify.go:18`).
2. `decodeBody` (`dispatch.go:130`): `canonical.Decode(body)` → must be
   `map[string]any` → `CanonicalizeValue` → `json.Unmarshal` into
   `createRequest`. **The typed decode runs over canonical bytes, never the
   raw wire.**
3. Nil-structure check (`certify.go:26-35`), then `catalog.commitCertified`
   (`catalog.go:132`).
4. `walkStructure(structure, ["structure"])` — grammar (`catalog.go:138`).
5. Ref resolution loop — each `refUse` must be in `byDigest`, else
   `KindUnknownRef` (`catalog.go:142-159`).
6. `walkRefGraph` — transitive acyclicity over the resolvable closure
   (`catalog.go:160`); re-walks the top-level structure (`recursion.go:22`).
7. `normalize(structure)` (`catalog.go:164`) — sorts union members by
   canonical bytes of their normalized children (`normalize.go:88-118`).
8. **← Digest derivation here.** `canonicalBytes(normalized)`
   (`catalog.go:169`), then `attested := bytesSHA256V1.Derive(bytes)` and
   `derived := activeScheme.Derive(bytes)` (`catalog.go:175-176`) — both
   SHA-256 over the *same* RFC-8785 bytes, differing in preimage contract
   (`scheme.go:9-12`).
9. **← W1 refusal minted here**, after derivation (`catalog.go:178-191`).
10. `json.Unmarshal(bytes, &canonicalValue)` — "what the digest actually
    commits to" (`catalog.go:194-198`).
11. `c.mu.Lock()` (`catalog.go:200`). Convergence check (`:202`) → return
    existing, appending only a missing bridge. Otherwise build `fact`,
    `canonicalBytes` the payload, `c.journal.Append` (`:226`), index
    (`:231`), `appendBridge` (`:232`).
12. Back in `serveCreate`: `head := d.catalog.journal.Head()`
    (`dispatch.go:109`) — **outside the catalog lock**, **after the bridge
    append**.
13. Reply carries `next` pointing at `flb.ing.data` with a filled body
    template (`dispatch.go:115-122`).

**Refusal mint sites on this path:** `decodeBody` (malformed),
`certify.go:27` (missing structure), `walk.go:structureRefusal` (grammar),
`catalog.go:144` (unknown ref), `recursion.go:29` (cycle), `catalog.go:179`
(digest mismatch). `refuse()` (`refusal.go:102-112`) stamps `Sort` and
normalizes `Next` to non-nil.

### (b) ingress publish

1. `handleIngress` (`ingress.go:39`) → `serveIngress` (`ingress.go:46`).
2. Subject-name gate → `KindBadJournal` (`ingress.go:47-56`).
3. `decodeBody(body, &frame)` — same canonical-first path
   (`ingress.go:59-62`).
4. `hexDigest` shape check on `type` → `KindMalformed` (`ingress.go:63-73`).
5. `d.catalog.resolve(type)` → **W4 refusal** `KindUnknownIdentity`
   (`ingress.go:74-90`).
6. `json.Unmarshal(body, &value)` then `canonicalBytes(value)` — **the whole
   frame**, not just `{type,payload}` (`ingress.go:92-106`).
7. `d.openJournal(ctx, name)` — **creates the stream if absent**
   (`protod.go:276-288`).
8. `journalHandle.Append(ctx, string(bytes))` (`ingress.go:112`) — inside,
   `Seq = cursor.Seq+1`, `Prev = cursor.Head`, `Nats-Msg-Id = EntryDigest`,
   published with `ExpectLastSequencePerSubject` (`journal.go:211-220,
   425-432`).
9. `journalHandle.Head()` (`ingress.go:116`) — a separate lock acquisition
   from the append.

**Content-addressing on this path:** the *frame* is never digested for
identity — only the claimed `type` digest is checked for membership, and the
chain-entry digest is computed inside `journal.appendEntry`. No frame-level
content address.

---

## 5. Where CAS and atomicity actually live

**Both, in disjoint subsystems, with no shared abstraction.**

| Mechanism | Location | Guards |
| --- | --- | --- |
| JetStream expected-last-sequence-per-subject | `journal.go:432` | journal/catalog/session append position |
| JetStream KV create-if-absent | `effector.go:211` | first claim |
| JetStream KV revision CAS | `effector.go:256, 302` | claim steal, commit |
| Process-local `sync.Mutex` | `catalog.go:32`, `journal.go:42`, session mu | index/cursor coherence in one process |

`protod` uses only the first and fourth. The effector's register is not in
the protod picture at all.

### Is the catalog append atomic with respect to the head it claims?

**No.** Three defects, increasing severity:

1. **The reply pairs a seq with a head at least one entry ahead of it.**
   Fact at seq N, bridge unconditionally at N+1 (`catalog.go:226-232`);
   `serveCreate` reads `Head()` (`dispatch.go:109`) — that head commits to
   the *bridge*, not the fact. `catalogHead` and `catalogSeq` in
   `createReply` do not name the same journal position, and nothing in the
   reply says so.
2. **The head read is outside the catalog lock.** `commitCertified` releases
   `c.mu` before `dispatch.go:109` runs; a concurrent create can advance the
   head between. The codebase *knows* the right pattern —
   `frontierSnapshot`, "prevents a reply from pairing one head with another
   head's resolvable set" (`catalog.go:111-126`) — used by `sessionReply`
   (`session.go:590`), not by `serveCreate`.
3. **`catalogHead` and `catalogSeq` are asserted by no test.** Greps over
   `conformance_test.go`, `session_conformance_test.go`, `lifecycle_test.go`
   find neither identifier. The W6 test (`conformance_test.go:294`)
   re-derives the *data journal* head from a read reply, not the catalog
   head from a create reply.

Two-entry commits (fact + bridge) are also **not atomic**: if `appendBridge`
fails after the fact lands, `commitCertified` returns an error with the fact
durable and indexed (`catalog.go:232-236`). The comment claims a retry
observes and repairs — true, but the caller's reply is *dropped*, so the
client sees a timeout for a create that succeeded.

---

## 6. Modeling smells

### The grammar is `any` + a predicate, not a type

The load-bearing one. `flb.type.v0` — a closed grammar — is
`map[string]any` everywhere. No `TypeNode` sum. Consequences:

- **Four independent `switch node["k"]` dispatches with no exhaustiveness
  check and divergent default behaviour**: `walkNode` (`walk.go:76-224`,
  default = refuse), `normalizeNode` (`normalize.go:65-119`, **no default —
  unknown kinds pass through unchanged**), `replaceTypeNode`
  (`concierge.go:309-372`, default = refuse), `normalizeSessionPartial`
  (`session.go:701-750`, **default = shallow clone**). Adding a production
  requires finding all four; only `frontier_tripwire_test.go` guards one
  facet.
- A fifth restatement in `completion.go:24-92` (`closedTypeGrammar`) and a
  sixth as data in `sessionGrammarDescriptor` (`session.go:161-184`), whose
  digest is a wire-visible constant (`session.go:194-200`).
- `walkResult` (`walk.go:31-34`) returns *facts about* the tree, not a
  parsed tree — every downstream consumer re-traverses the untyped `any`.

### Partial functions relying on prior checks

- `normalize` is "defined on grammar-valid terms" (`normalize.go:10-11`);
  broken ordering ⇒ silent identity, not refusal.
- `ingress.go:95-97` — `json.Unmarshal` with `// unreachable`, returning
  `nil` (dropped reply) if the assumption breaks.
- `catalog.go:164-174` — two error returns commented as unreachable; a
  domain bug becomes a client hang.
- `effector.go:241, 287, 326, 351` — `*authority.claim` dereferenced under
  "outcome == nil ⇒ claim != nil"; `authorityValue` (`effector.go:80-83`) is
  two nilable pointers where a sum type is meant. `Lookup` returns
  `(State, Outcome, error)` with `Outcome` meaningful only when
  `Committed` — the same missing sum at the public API.

### Circular grammar/normal-form dependency

`walkNode`'s union case calls `normalize` on each member
(`walk.go:150-163`) while `normalize` documents that `walkStructure` must
run first. Not wrong at runtime (children already walked), but mutually
presupposing; members are normalized twice per create.

### Domain logic in transport

- **`journald` makes the fencing token client-supplied.** `main.go:265-269`
  reconstructs `effector.Claim{Digest, Fence, Owner}` from wire fields;
  `Commit` checks only the fence (`effector.go:287`), so any client that
  guesses or observes a fence can commit another worker's claim. A genuine
  authority leak at the seam, not in the effector.
- **`reasonFor`** (`journald/main.go:172-187`) flattens two packages' error
  taxonomies into five untyped strings — transport deciding what a refusal
  *is*.
- **`requireRequestFields` / `requireSessionFields`** re-parse the raw body
  with plain `json.Unmarshal` (`concierge.go:406-418`, `session.go:786-798`),
  bypassing the canonical domain `decodeBody` established — and both return
  `nil` (no refusal) if that parse fails. They also disagree: the concierge
  version treats `null` as absent **only for `path`** (`concierge.go:413`);
  the session version for **every** field (`session.go:793`).
- **`contract.go`** — 300 hand-written lines of `flb.type.v0` describing the
  daemon's reply shapes, no derivation from the Go structs.
  `contract_describe`'s reply is `vOpaque()` (`contract.go:215`) — cannot
  describe itself, correctly noted (`contract.go:8-11`), but every other
  entry can drift silently.

### Error-vs-refusal boundary

Stated rule: refusal = data, error = substrate, substrate failures drop the
reply (`dispatch.go:99-102`). Leaks:

- **A lost journal CAS is a domain-visible conflict delivered as a
  timeout.** `serveIngress` returns `nil` on any `Append` error including
  `journal.ErrConflict` (`ingress.go:112-115`); `serveCreate` likewise via
  `certify`. `ErrConflict` means "a rival holds this position"
  (`journal.go:453-456`) — a fact about the world, no `next` hint.
- **`sessionReply` drops the reply** when `sessionStateDigest` or
  `walkPartial` fails on committed state (`session.go:584, 588`) — a
  corrupted-but-stored session becomes an unexplained hang.
- **`refuse()` panics** on an unclassified kind (`refusal.go:105`) in a
  handler goroutine — first use crashes the daemon.
- **`sessionCompaction`** returns a `*Refusal` from an unexported function
  reachable only from `session_test.go:287`; `sessionRetentionPlan` has no
  non-test caller.

### Ingress is not strict where the catalog is

`frame` (`ingress.go:24-27`) has no `checkKeys` equivalent. A frame
`{"type":"<cataloged>","extra":{...}}` is admitted and the *extra key is
canonicalized into the journal* (`ingress.go:92-106`) because
`canonicalBytes` runs over the whole body. `payload` is not required either.
Directly contradicts the walk's rationale — "unknown keys refuse — a strict
grammar is what makes refusals teachable" (`walk.go:14-15`) — at the one
seam where author bytes become durable. No test covers it.

### Duplicated invariants

`utf16Less` twice (`walk.go:360`, `canonical.go:387`). `hexDigest`
(`walk.go:17`) = `validDigest` (`effector.go:56`). `validJournalName`
(`ingress.go:22`) = `journal.validName` (`journal.go:39`). `monitorShape`
duplicated between journal and effector with the same latch-ordering comment.

---

## 7. What is not modeled

**Concurrency inside one daemon.**
- The `(seq, head)` pairing in `createReply` has no atomicity (§5); the
  correct pattern exists next door and is unused.
- `catalog.resolve` under one short lock, append under a later one
  (`catalog.go:143` vs `:200`) — safe only because the catalog is
  append-only and ref resolution monotone, an invariant nothing states or
  tests.
- `journal.readLocked` mutates `j.cursor` from a *read*
  (`journal.go:319-321`) — concurrent readers advance the writer's append
  position. Correct, undeclared.
- `concierge.buildFrontier` uses unpaired `resolvableDigests`
  (`concierge.go:131`) while `sessionReply` uses the paired
  `frontierSnapshot` (`session.go:590`) — currently harmless only because
  `conciergeReply` has no `catalogHead` field.

**Multi-daemon.** A spec non-goal (`SPEC.md:146`); the code refuses
clustered JetStream, `KVReplicas > 1`, memory storage
(`protod.go:116-133`). Residual unchecked: nothing prevents two `protod`
processes on the same `StoreDir` — the journal CAS catches position
conflicts, but `ErrConflict` becomes a dropped reply, and each process's
`catalog.byDigest` silently diverges from the journal until reopen.

**Clocks.** Effector mutual exclusion (EL1) compares local `time.Now()`
(`effector.go:197`) against an `Expiry` written as `UnixMilli` by a possibly
different process (`effector.go:412-419, 436`). Skew never bounded,
measured, or mentioned. Package doc claims "a monotonically increasing
fence, **never** the holder's identity or clock, decides which commit may
land" (`effector.go:2-5`) — true for `Commit`, false for `Claim`. `Lookup`
reports `Unclaimed` for an expired claim on the reader's clock alone
(`effector.go:351`) — two processes can disagree with no write in between.

**Watch losslessness.** Open, deterministic, unratified —
`FINDING-WATCH-EVICTION-001.md`. NATS caps KV history at 64, so no history
depth makes the current WL1/WL2 reading true.

**Payload conformance at ingress.** Deliberate non-goal, correctly surfaced
*as data* in the admit reply (`ingress.go:19-20`) — modeled well.

**Session transcript events.** `applySessionEvent` (`session.go:572-577`)
accepts `refusal`/`read`/`utterance`/`proposal`/`adoption` as no-ops **and
has a bare `default` that also returns state unchanged** — an unknown event
kind in a session journal is silently forgiven on replay while the identity
chain commits to it. The five named kinds are never written by any handler
in this package.

**Bridge-append failure.** §5: fact durable, reply dropped, no compensating
record.

**`ErrConflict` recovery for sessions.** `serveSessionMove` converts it to
`KindSessionStale` (`session.go:313-316`) — the only place a CAS conflict
becomes a refusal rather than a dropped reply. Ingress and create do not.

**Law statements.** `docs/primitives/P3-effector.md` and
`docs/primitives/P2b-journal.md` are cited by both obligation tables and
**neither exists**. `docs/LAWS.md:152-160` states the consequence: the tests
are the spec. W1–W10 are better: `proto/SPEC.md` is a real
coordinator-owned statement and `conformance_test.go` binds W1–W8 and W10 by
name. **W9 has no named test** — only an incidental comment at
`conformance_test.go:416`.
