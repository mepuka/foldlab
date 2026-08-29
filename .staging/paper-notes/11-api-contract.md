# Lane C · CONTRACT — the minimum API and the remaining stack

Exploration-grade. `.staging/` is pre-grade: nothing here is minted, claimed, or
gated, and no gate stamp G0–G6 attaches to anything below. Written 2026-08-29
against `main` at `67e20b43`, read-only on the repo.

**C6 — provenance, explicitly pending.** Nothing external cited here is resolved
into `.reference/provenance/`. foldkit's documentation was retrieved this session
from `https://foldkit.dev/llms-full.txt` (the file states it was generated
2026-08-27); the docs say foldkit is pre-1.0 and that "minor releases can still
change public surface", and **no foldkit version number appears anywhere in
them** — so every API shape quoted below is unpinned and may move under a minor
release. `foldkit@0.154.0` is the version observed in
`.staging/explore/cas-ui-history-from-history.md` and now installed by Lane A in
`experiments/workbench`; it is a resolved install, not a resolved provenance
pin. Turso/libSQL is an **assumption** stated in the
brief and never verified here; I did not read `turso_tok.md`. Every claim about
libSQL replication behaviour below is marked PENDING at the point of use.

**C5 — claim discipline.** No word below carries "sound", "verified",
"equivalent", or "preserves" about anything not already carrying a theorem in
`library/cas`. Where the design needs a theorem it does not have, it says
**PENDING** and names the obligation.

---

## 0. The finding that reorganizes this lane

**The contract's one genuine addition is not a set of operations. It is one
noun: the word.**

The store persists a *set* — address ⇀ bytes, grow-only, a join-semilattice
(`src/cas/Backend.ts`). The language's semantics is a *word* — bindings in
admission order, and `Cas/IR/Word.lean` says so in as many words: *"The word is
not an implementation convenience standing in for the store: the order IS
semantics."*

The word exists in four places and not one of them is a running store:

| Where | What it is |
|---|---|
| `Cas/Lang/Interp.lean` | the reference handler's state, threaded by `step` |
| `Cas/Lang/Roots.lean` | one half of `RootedState := Word × List Addr32` |
| `cas_run`'s reply | *that run's* history — ephemeral, per call |
| `library/cas/vectors/*.json` | a serialized word with a name — a fixture |

`grep -rn "word" library/effects/src` returns doc comments and the conformance
-vector schema. **`@foldlab/cas` never persists a word and no operation reads
one.**

Every workbench requirement in the brief is a request for the word:

- "you **see the chain heads as you move and add to them**" — the word's tail
- "**the CAS is the user's history**" — the word, by definition
- "**admission order is the reading order**" — the word's order, by definition
- browse / enumerate — the word, sliced
- subscribe to change — the word's tail, again

And no program of `CasSig` can reconstruct it. The decisive witness is already
in the corpus: the `shared-chunk` vector is **5 bindings, 4 nodes, 1 dedup**
(`.staging/explore/cas-ui-history-from-history.md`, finding 3). `load` answers
content by address and can never recover the fifth binding, because the fifth
binding is not content — it is history. The word is *strictly more information
than the store*, so it is genuinely absent rather than a projection.

Everything else the workbench needs already exists. That asymmetry is the whole
report.

---

## 1. Which of the four workbench needs are already programs of `CasSig`

The brief asks this directly. Answers, one line each, then the reasoning.

| Need | Verdict | Surface |
|---|---|---|
| enumerate / browse | **already an operation** (partly) | `listRoots` / `cas_list_roots` |
| resolve a chain head | **already a program** | `listRoots` then `load` following ref 1 |
| run a program | **already an operation** | `cas_run` |
| subscribe to change | **genuinely absent** | — |
| read the history | **genuinely absent** | — |

**Browse is `cas_list_roots`, and the CLI already ships it.** `bin/cli/commands.ts`'s
`ls` verb is exactly this: list the published roots, load and re-verify each as
it is listed. `Cas/Lang/Roots.lean` gives it a signature (`RootSig` = `publish` /
`listRoots`, `StoreSig := CasSig ⊕ₛ RootSig`) with `stepRooted_cas_agrees`,
`stepRooted_preserves_wf`, and `publish_mem` proved. The MCP manifest already
projects it. Nothing to add.

But note three things the front end will hit within the first hour:

1. **`RootStore.list` order is unspecified.** The docstring says so; the CLI
   compensates with `published.toSorted()` — sorted by *address*, which is a
   digest, which is noise. That is a direct contradiction of "admission order is
   the reading order", and the CLI ducked it because there is nowhere to get the
   order from. (There will be, once the word is readable.)
2. **`publish` is grow-only and there is no unpublish.** Every historical chain
   head stays published forever. So "the current head" has no backing: after ten
   commits the roots registry holds ten roots and cannot say which is latest.
   **Lane B: any "current" or "recent" affordance is unbacked today.**
3. **Enumerating *all content* is not expressible at all** and is not the same
   question as browse. The CLI's `status` counts objects by walking
   `objects/**` on the filesystem — host territory, outside the language, and
   not available over the SQL backend at all. Do not build on it.

**Chain-head resolution is a program, not an operation.** An `entry` node (tag
12) carries no payload; its refs *are* the commit — one to content, one to the
parent. So walking a chain is `load` in a loop, which is an ordinary
`Prog CasSig` (the free monad admits any continuation). It needs no new verb.

One caveat worth stating precisely, because it will be misread: the walk is
**not** expressible in the *defunctionalized straight-line* fragment. `PLine`
(`Cas/Lang/Defun.lean`, F3's first bite) is put/load with positional operands —
no branching, no loops. R10 names this exactly: *"ITrees' `MonadIter` obligation
returns exactly when F3 adds loops."* So a chain walk runs as a host program and
cannot yet be store-resident content.

**Running a program is `cas_run`** — instructions in admission order, refs
naming earlier answers by index, reply is the word. Note what `cas_run` cannot
do: **run a program held at an address.** `encodeProg_wf` is proved (the encoded
table admits as a word), but `Defun.lean`'s own owed list includes *"the
table-level decoder `Word → Option PProg` with its round trip against
`encodeProg` (recovering the program from content)"*, and
`decodeLine_encodeLine` is marked ROLLED BACK. **PENDING: `run(address)` needs
that decoder and that round-trip theorem.** Until then a stored program is
write-only, which is worth saying out loud because "programs are content" (R7)
reads as if it already round-trips.

**Subscription is absent, and so is history** — §4 and §6 below.

### The R2 discipline, applied to myself

The brief points at the JIT survey's *"Explicitly not proposed: … a `VerifySig`"*
and R2's consumer gate (*a signature enters only with a real consumer*). The
survey refused `VerifySig` because `decode` **performs no operation** — R14a-P1.
That test is the right one and it cuts cleanly here:

- `verify` is a pure function of values already in hand → no signature. Refused,
  correctly.
- `word` is a **read of interpreter state** — the same category as `listRoots`,
  which reads the *other* component of `RootedState := Word × List Addr32`.
  `listRoots` set the precedent; reading the word is the same move on the other
  half of the same pair.
- Its consumer is real, named, and is the product: the workbench's history pane
  and its change feed.

So exactly one operation is proposed, and only one.

---

## 2. DECISION — transport, not in-process. Generated text, not a package import.

**This is the biggest decision in the lane and it has a single answer that also
dissolves a blocking version conflict.**

**Decided:** the front end talks to the store **over a transport**. It imports
**no runtime code** from `@foldlab/cas`. It imports **generated TypeScript**
emitted into its own tree by a Lean emitter, exactly as
`src/cas/generated/ConformanceVectorSchema.ts` is emitted today.

**Rejected: in-process.** Three reasons, in ascending order of force.

1. *Platform.* `@effect/sql-sqlite-bun` is a bun-native binding. The store
   composition that actually exists — `layerStore ∘ layerKvsBackend ∘
   KeyValueStore.layerSql({table:"cas_objects"}) ∘ SqliteClient.layer({filename})`
   (`test/KvsSqlite.test.ts`, called "THE production composition") — does not run
   in a browser. Neither does `layerFileBackend`.

2. *It would work anyway, and that is the trap.* foldkit's docs name
   `@effect/platform-browser`, which ships `BrowserKeyValueStore`. So
   `layerKvsBackend` **does** compose in a browser, over localStorage/IndexedDB.
   The result is not "CAS in the browser" — it is **a second, unsynced
   authority**. Two stores, two admitted sets, no reconciliation between them,
   and the sync DB syncing the one the user isn't looking at. Reject on that
   ground, not on impossibility.

3. *Admission.* `src/cas/Backend.ts`: *"a backend cannot weaken the store's
   invariants."* The store law judges every candidate before `putBytes` is ever
   called. Putting that judgment inside a browser tab moves the estate's only
   gate into the least-controlled, least-versioned process in the system. The
   direction law says materialize flows denotation → code, byte-gated, never
   reverse; admission running in unversioned client code is that seam's soft
   underbelly. Admission stays on one side of one seam.

**And the version conflict makes it forced, not merely preferable.**

| Package | `effect` |
|---|---|
| `@foldlab/cas` | `4.0.0-rc.111` (provenance-pinned to commit `0dd7825e…`) |
| foldkit (peer, **exact**) | `4.0.0-rc.112` |
| `experiments/lift-harness` | `4.0.0-rc.112` |

foldkit's getting-started says the peer pin is exact and that stable Effect v3
does not satisfy it. Two copies of `effect` in one bundle is not a workaround:
`Context.Service` tags are per-module-instance, so two Effect copies means two
service registries and silent layer-resolution failure.

The transport decision dissolves this **for the contract**: an emitter writes
`import { Schema } from "effect"` as *text* into the front-end package, where it
compiles against foldkit's rc.112. Version-agnostic by construction. The
conflict survives only for anyone importing `@foldlab/cas` runtime code — which
this decision says nobody in the front end does.

It does **not** dissolve for the store host, and that stays owed (§7, OWED-1).

**Corollary that Lane A must action:** `@foldlab/cas`'s `exports` map has one
entry (`.` → `dist/index.js`), and `src/Cas.ts` re-exports `FileBackend.ts`,
which imports `FileSystem`. There is today **no way to import the pure plane
(`Node`, `ContentId`, canonical JSON, kind tags) without dragging platform code
in**. If anything ever does want an in-process pure import, the package needs a
second export condition. Named, handed to **Lane A**.

---

## 3. DECISION — the protocol is the MCP manifest. Not `cas-http/0`.

**Decided:** the front end speaks the operation set described in
`library/cas/mcp/cas-tools.json`, generated by `lake exe mcpspec` from
`Cas/Backend/Mcp.lean`. It does not speak `cas-http/0`.

R11 is the whole argument and it is already law: *"One described manifest owns
the protocol; both language surfaces are generated from it."* The manifest is
that document. It is generated from the signatures (`tools` is `CasSig` and
`RootSig`, projected), its params and replies are canonical schema codes, and
its node document is **reused** from the conformance-vector wire format —
`Mcp.lean` says so: *"one node document across vectors, replay, and MCP; no
second spelling."* Writing a second contract by hand crosses the direction law.
Consequently **almost nothing below is new text; it is a projection.**

`cas-http/0` is not a competitor at the same layer, and conflating them is the
mistake §9 refuses.

Two honest observations about the state of both:

- **Nothing serves the manifest.** `grep -rn "cas_run\|cas_put" library/effects`
  returns nothing. The manifest is a described contract with no host in any
  language.
- **Nothing serves `cas-http/0` either.** `Server.httpApp` exists and is
  exercised only by tests and the archived remote plane; `bin/cli` has no
  `serve` verb — `serveLine` prints configuration and nothing listens.

So both transports are a slice of work and the choice is genuinely free. Choose
the one R11 already designated.

**Transport binding, minimum:** JSON-over-HTTP POST, one path per tool
(`POST /op/cas_load`), body = the tool's `params`, reply = its `result`, both
already described as canonical schema codes. The manifest carries no error
vocabulary today (§7, OWED-4). This binding is deliberately not MCP-over-stdio:
the same tool table can be served to the operator's agents over MCP *and* to the
browser over HTTP, because the tool table is the contract and the transport is
handler composition (R10).

---

## 4. DECISION — the sync DB IS the store. Three tables; two synced, one not.

**Decided: the sync DB is the store.** CAS bindings live in SQLite; replication
is replication of the admitted set. Session and viewport state live beside it in
a *separate* local database and are never content-addressed.

**Rejected: the DB beside the store** (SQLite for session/UI, CAS content in
files). It means two durability stories, two backup stories, and a sync engine
replicating the half that does not matter. It also throws away work that is
already done and already checked.

### Why the store, positively

1. **It already is.** The SQLite composition is shipped, tested
   (`test/KvsSqlite.test.ts`: *"a fresh composition over the same file serves
   what the first admitted"*), and there is a **replication check**:
   `scripts/litestream-check.ts` replays every Lean conformance vector into a
   SQLite CAS, replicates, restores to a different file, and re-loads every
   recorded address through the full read law. Its own framing is the exact
   question this decision asks: *"whether a database restored from a replica
   still answers every address the Lean model computed … or whether replication
   is a place where identity can silently drift."* That harness is the shape of
   the acceptance test for any sync engine adopted here.

2. **The conflict model is trivial, and this is the strongest argument.**
   Content is immutable and content-addressed, so the object table's key is the
   digest of its own value. Two replicas that admit the same content produce the
   *same row*. Last-writer-wins on that row **is the identity** —
   `KvsBackend.ts` already states the algebra: *"re-insertion of identical bytes
   IS the identity."* There is no merge function to write, because there is no
   pair of distinct values that can share a key.

   Except one, and it is the one that matters: **a digest collision.** Same key,
   different bytes, is precisely what the store *refuses* today
   (`makeMemoryBackend` fails with `BackendFailure`; the file backend and
   `cas-http/0` `409` do the same). **A sync engine that silently LWWs that row
   erases a refusal.** In a single-primary topology it cannot arise — but that
   is a property of the topology, not of the store, so it must be stated rather
   than assumed. **PENDING / RULING OWED: what the sync layer does on a
   same-key-different-bytes row, and whether the answer is "the topology forbids
   it" or a real conflict handler.**

3. **The word is what a sync engine actually threatens — so do not sync it.**
   Two replicas admitting different content concurrently produce two different
   admission orders, and order is semantics. Merging two words is not free and
   the estate has no theorem for it. But the *set* merges perfectly: it is a
   join-semilattice, and history-independence means the set-tree root does not
   depend on maintenance order. So:

   > **The set syncs. The word does not.** Admission order is when *you* learned
   > something; it is honest for it to be per-device.

### The tables

| Table | Contents | Synced? | Conflict model |
|---|---|---|---|
| `cas_objects` | address → canonical bytes | **yes** | none possible; key is the digest of the value |
| `cas_roots` | published addresses | **yes** | grow-only set; join |
| `cas_word` | `(seq, address)`, append-only | **no** | local by decision |

`cas_objects` is the existing `KeyValueStore.layerSql({ table: "cas_objects" })`
table, unchanged.

**PENDING — the libSQL granularity question.** I do not know whether a libSQL
embedded replica can exclude one table from replication; I did not fetch Turso's
documentation and must not assert it. If it cannot (the likely case — embedded
replicas replicate frames, not tables), the shape is **two database files**:
`cas.db` (objects + roots, synced) and `session.db` (word + viewport, local).
*What changes if the Turso assumption is wrong:* nothing above the seam. The
library speaks `KeyValueStore` and never names a database
(`KvsBackend.ts`: *"nothing here knows what a database is"*), so swapping libSQL
for plain SQLite + Litestream — which is the composition already checked — costs
one layer. That insulation is the reason to make the call now rather than wait.

### What this decision costs, stated plainly

- **BLOCKING: the KVS backend has no roots seam.** `KvsBackend.ts` provides
  `ByteReader` and `ByteWriter` and *never* `RootStore`, deliberately:
  *"`KeyValueStore` carries no key enumeration … Publishing over a key-value
  store is a compare-and-set question of its own and is not answered here …
  Serving this backend is therefore a compile error until that decision is
  made, which is the intended outcome, not a gap."*
  **So if the sync DB is the store, `cas_list_roots` does not compile today** —
  and `cas_list_roots` is the browse verb. This is the first thing the front end
  trips over. See OWED-2.
- **Presence reads bytes.** Documented: `has` over the SQL store would base64 the
  value before discarding it, so presence materializes rows. Fine at 24 objects.
- **A re-put still writes a row**, so re-admitting resident content costs
  replication traffic a presence check would have avoided. Documented.

### What `merkle-set-reconciliation-design.md` is actually for

The brief asks whether it is already the answer. **It is the answer to the next
question, not this one**, and the two do not conflict.

- **Turso / libSQL embedded replica** = the deployment answer for one user's
  devices, today. Single primary, local reads, offline queue. It replicates
  *frames*, so it is completely opaque to the store's own laws: it cannot tell
  you what a replica is missing except by the store doing its own presence walk.
- **Merkle set reconciliation** = the estate's own answer, for peer-to-peer and
  multi-authority, later. Logarithmic rounds, bytes proportional to the symmetric
  difference, a stated join theorem with an explicit collision disjunct, and a
  Lean model (§3, "Effect maximal, Lean minimal"). Its slices S1–S5 are proposed,
  not ratified.

They converge on the same admitted set, so adopting the second later does not
invalidate the first. Take Turso now; keep the merkle lane as the reconciliation
plane it was designed to be. Its §6 already assumes foldkit for its own demo,
which is precedent, not coincidence.

### The line between what is content and what is not

The operator's invariant — *"the CAS is the user's history: their use of
schemas, their use of the language"* — argues that some session state **is**
content, and it is right. The line:

> **Anything with a denotation is content. Anything that is only a viewport is
> not.**

Content: the programs you ran (already encodable — `PProg`, tags 14/15), the
schemas you decoded with, the answers you got, the nodes you admitted.
Not content: selection, scroll position, register level, pane widths, the word
cursor. Admitting a pane width would mint an address and a binding, and the
history would stop being your use of the language and start being noise.

---

## 5. DECISION — no subscription in v0. `since` is the feed.

**Decided:** v0 has no subscription. The front end's Model accumulates the word
from the replies to its own requests.

The argument is short and I think it is airtight for v0: **the word only grows,
and in a single-user workbench the only writer is the user.** `cas_run`'s reply
*is* the word for that run — `Mcp.lean` says so: *"The reply is the word — the
run's history, byte-decidable evidence."* The front end therefore already knows
everything that changed, at the moment it changed, in admission order, with no
feed at all. A subscription in v0 subscribes to your own writes.

A second writer arrives in a predictable order, and each one is a real trigger:

1. **an asynchronous agent** (if `infer` runs inside the same `cas_run` call, its
   admissions are already in that call's reply word — still no subscription);
2. **the MCP host** the operator's agents already use — a second writer by
   construction;
3. **a sync pull** from another device.

**When one arrives, the feed is `since`, and it is neither a DB change-stream
nor polling.**

- **Not a DB change-stream** (SQLite update hooks / libSQL CDC). It reports
  *rows* — addresses in write order, carrying no admission order — from *below*
  the seam where admission lives. Subscribing to it means the UI learns about
  content before the store has judged it, which inverts the one invariant
  `Backend.ts` exists to protect.
- **Not polling `cas_list_roots`.** Roots is an unordered grow-only set. A poll
  tells you a new root exists and nothing about what happened.
- **The word's tail is the only feed whose elements are the language's own
  citizens.** One `Binding`, in admission order, is exactly what the model calls
  history.

And `since(n)` **is** both: polling it and streaming it are the same operation
under different handlers, which is R10's entire point (*transports are handler
composition; seam effects get signatures*). So no subscription signature is
needed at v0 or at v1 — a `Stream` realization of `since` is a realization, not
a language change.

**foldkit shape** (PENDING — from docs retrieved 2026-08-29, unpinned). A
foldkit `Subscription` entry maps a Model slice to a dependency record to a
scoped `Stream<Message>`, and the runtime **tears the scope down and reopens it
when the dependency changes**. So the dependency must be the *authority
identity*, never the word length — gating on length would tear down and reopen
the stream on every binding. The stream keeps its own cursor and emits
`WordAdvanced({ bindings })`; `update` appends. Handed to **Lane A** as an
implementation note.

---

## 6. The minimum initial contract

Consistent with R11: **this is a projection of `Cas/Backend/Mcp.lean`, and all
but one row of it already exists.** The five present rows are reproduced from
the generated manifest, not restated by hand.

### Already there — no change

| Tool | Params | Reply |
|---|---|---|
| `cas_put` | node document (`version`, `tag`, `payload`, `refs`) | `{ address }` |
| `cas_load` | `{ address }` | node document |
| `cas_run` | `{ instructions }` — straight-line, refs by index | `{ word: [{ address }] }` |
| `cas_publish_root` | `{ address }` | `{}` |
| `cas_list_roots` | `{}` | `{ roots: [string] }` |

Note `cas_run`'s reply is **addresses only**, and that is correct, not a gap: the
client sent the nodes, so it already holds them. Changing it would alter the
meaning of an existing exchange and cost a manifest version (`manifestVersion:
0`); adding a tool is additive, on the same rule `cas-http/0` states for itself.

### The one addition

| Tool | Params | Reply |
|---|---|---|
| `cas_word` | `{ since: Integer }` | `{ bindings: [Binding], next: Integer }` |

- `since` is a **word index**, zero-based, half-open — not a timestamp. The doc
  line must say so, because "since" reads as time in every other API.
- `bindings` reuses the **existing** `bindingSchema` — `{ address, node }` —
  already generated into `src/cas/generated/ConformanceVectorSchema.ts` by
  `lake exe emitwire`. **The tool is new; not one document shape is.**
- Bindings rather than addresses, because the history pane renders a sort and a
  payload reading per row; addresses alone would cost one `cas_load` per row.
- `next` is returned so the client never computes its own cursor.
- **The cursor is authority-scoped and not portable.** Index 12 means something
  only relative to one authority's word; a client that switches authority
  restarts at 0. This follows directly from §4's "the set syncs, the word does
  not" and must be in the doc line.
- `since(0)` is the whole history; `since(len)` is what is new; an empty
  `bindings` is "nothing happened". Browse, history, and change feed are one
  operation because the word is append-only.

### What generates it

Add to `Cas/Lang/`, by exact analogy with `Roots.lean`:

```lean
inductive WordE where
  | since (from : Nat)

abbrev WordE.Ans : WordE → Type
  | .since _ => List Binding

def WordSig : Sig := ⟨WordE, WordE.Ans⟩
```

summed as `CasSig ⊕ₛ RootSig ⊕ₛ WordSig`, interpreted over the state
`stepRooted` already carries (`RootedState := Word × List Addr32` — `listRoots`
reads the second component; `since` reads a suffix of the first). Then
`Mcp.lean`'s `tools` list gains one row and `lake exe mcpspec` regenerates
`cas-tools.json` under its existing byte gate. **No hand-written contract at
any point.**

**PENDING — theorems owed**, the analogues of `Roots.lean`'s own:

- `since_suffix` — `since n` is a suffix of the word, and `since 0` is the word;
- `since_cas_agrees` — a Cas operation evolves the word exactly as `step` does
  and leaves nothing else changed (the shape of `stepRooted_cas_agrees`);
- `stepWorded_preserves_wf` — the extended interpreter preserves `Word.wf`.

### The rejected alternative, named

**Make the word a host concern, like `countObjects` is** — a table the host
writes and an endpoint that reads it, with no signature at all. This is the
R2-minimal answer and it deserved a real hearing. Rejected because the word then
has no denotation, no reference handler, no conformance vector, and the front
end's central object sits outside the language — the precise failure the estate
exists to prevent. The tiebreaker is that the word is *already* the estate's most
thoroughly modelled object (`Word.wf`, `find`, `wf_toStore_closed`, and every
conformance vector is one); only the operation that reads it is missing.

---

## 7. Decisions OWED — the ones that must be made early, that I am not making

Ordered by what breaks soonest.

**OWED-1 — the `effect` version. The most concrete blocker in the estate right
now.** `@foldlab/cas` is on `4.0.0-rc.111` with a provenance pin naming commit
`0dd7825e…`; foldkit's peer is exactly `4.0.0-rc.112`; `experiments/lift-harness`
is already on rc.112. AGENTS.md: *"Exact versions only … The `effect` npm version
and the provenance source pin must name each other; when one moves, the
correspondence is re-recorded."* Lane A reached the same finding independently
this session and marked it in `experiments/workbench/package.json` under
`foldlab.effectProvenance.status: "PENDING"` — the workbench installs an
**unresolved** effect pin, and nothing in it may be cited as provenance-backed
until the lock records rc.112 or the two packages agree.
**Who decides:** the operator, because re-recording a provenance pin is a gated
act. **If deferred:** §2's generated-text route keeps the *front end* compiling,
but the store host — which imports both `@foldlab/cas` and its bun SQL driver —
stays on rc.111 while the estate drifts to rc.112, and every shared type between
host and client is generated text rather than a shared type. Deferring is
survivable; leaving it unstated is not.

**OWED-2 — `RootStore` over SQL.** The compare-and-set question `KvsBackend.ts`
explicitly declines to answer. **BLOCKING** for §4 + browse: with the sync DB as
the store, `cas_list_roots` does not compile. **Who decides:** whoever owns the
store package, with a grill — the docstring says the compile error *is* the
intended outcome until a decision is made, so this is a ruling, not a patch.
**If deferred:** the workbench has no browse verb, or ships on the file backend
and the sync-DB decision is not actually taken.

**OWED-3 — the kind-name table, generated.** `Ty.wireTag` / `Ty.ofTag` and
`REGISTRY.md` are the contract on every wire, and there is **no generated
projection of them**. The CLI already hit this and ducked it in writing:
*"Kind names are owed to the Lean-emitted registry (materialize, byte-gated);
until that surface exists, tags render as bare hex."* Also note `REGISTRY.md`'s
table omits the `git` sort (`0x47`) that `Sorts.lean` carries — a hand-maintained
table drifting from its source, which is the argument for generating it.
**Who decides:** nobody — it is a ruling already implied by P4; it needs one
small emitter. **If deferred:** the front end hand-writes a tag→name map, which
is a P4 violation in the most visible place in the product, and Lane B's screens
inherit it.

**OWED-4 — the manifest's error vocabulary.** `cas-tools.json` describes params
and results and **no errors**. Lean has `Refusal` (six clauses: `notWellFormed`,
`dangling`, `wrongKind`, `collision`, `noObject`, `failed`); TypeScript has the
`CasError` family; `cas-http/0` has a status→event table. Three vocabularies, no
projection. **Who decides:** the manifest's owner, under R11 (*"commands,
replies, **errors**, constraints, byte encoding"* — errors are already named in
the ruling, just not built). Note B21 already flags two refusal taxonomies
(`Refusal`, `IngestRefusal`) needing a merge ruling. **If deferred:** the front
end renders refusals as strings, and "refusal is a value with a named clause" —
the thing that makes the product's verdict column meaningful — degrades to a
toast.

**OWED-5 — the verdict vocabulary.** The design's premise is that hue is spent
on `owed`, that verdicts have three orthogonal axes (provenance, economy,
lifecycle), and that `owed` propagates because `⊕ₛ`. **No such type exists in
Lean.** The only verdict type in the estate is `Gate.Verdict` — four words
(`wrote` / `ok` / `missing` / `differs`) about *byte gates*, not about programs.
The nearest real thing is structural: a program answered by `infer` is
`Prog AgentSig A`, not `Prog CasSig A` — the colour genuinely is the type — but
nothing projects that into a value a renderer can read. **Who decides:** this is
a domain-modelling and grilling act, not an implementation one. **If deferred:**
the token set in §8 is hand-written CSS with no derivation, which is a knowing,
narrow P4 violation — acceptable for v0 *if written down*, which is what this
row does.

**OWED-6 — collision under replication.** §4's ruling: what the sync layer does
with a same-key-different-bytes row, and whether "the topology forbids it" is
the answer. **If deferred:** the store's only genuine refusal can be silently
resolved by a database.

**OWED-7 — `run(address)`.** Needs `Word → Option PProg` and its round trip
against `encodeProg` (`Defun.lean`'s own owed list; `decodeLine_encodeLine`
rolled back). **If deferred:** every program is sent inline forever, "programs
are content" is true only in the write direction, and a saved program cannot be
re-run — which is a feature the product obviously wants and cannot honestly
ship.

**OWED-8 — where the front end lives. ANSWERED in-flight by Lane A.** The grade
argument: an application is not a distributable library, so `library/` is wrong;
`.staging/` is where the prototype correctly sits now; `experiments/` is artifact
grade (*"functionally organized and fully regenerable from declared sources; no
hand-maintained derived files"*), which an app can satisfy. The merkle design's
§6 already places its demo's tree core *"under `experiments/`"*. Lane A landed
`experiments/workbench` with a `check:workbench` task during this session; that
matches, and this row closes.

---

## 8. Stack decisions still open, resolved

**Bundler — Vite, and it is not a choice.** foldkit's docs state twice, in
identical words, *"Do not build a Foldkit app without it"*, referring to
`@foldkit/vite-plugin`, which does real compiler work: it brands view-function
VNodes with identity so the differ knows when to patch versus replace, and
compiles `FOLDKIT_BUILD_ID`. **My earlier instinct — `Bun.serve` + `bun build`,
no Vite — is wrong and I am recording the correction rather than the
conclusion.** bun remains fine as package manager and script runner (`bun dev`),
which is what the scaffolder actually offers. *(PENDING per C6: unpinned docs.)*
Lane A landed exactly this in-session: `vite@8.2.2` + `@foldkit/vite-plugin@0.19.0`
+ `foldkit@0.154.0` in `experiments/workbench`, with `bun` running the scripts.

**Styling — plain CSS custom properties, no Tailwind. A deliberate deviation.**
foldkit's scaffold ships `src/styles.css: Tailwind CSS entry point` and every
doc example uses `h.Class('flex flex-col gap-2')`. But `h.Class` takes a
*string* and does not care what it means, so hand-authored class names cost
nothing.

The design in `owed.html` is **eleven tokens and three font roles**:
`--paper`, `--paper-2`, `--ink`, `--ink-70/45/28`, `--rule`, `--rule-firm`,
`--owed` (`#A8560B` light / `#E9A94A` dark), `--owed-soft`, `--shadow`; Source
Serif 4 for content, IBM Plex Sans for chrome (uppercase, tracked `.085em`,
never touching content), IBM Plex Mono for data and addresses.

Tailwind's default palette is 22 hues × 11 steps. The product's central argument
is that **hue is scarce and spent on one verdict**. Adopting a framework whose
primary affordance is the thing the design forbids means configuring it *down*
to eleven tokens and then policing `text-orange-600` in review forever. The
design is also typographic, not utility-shaped — `clamp(38px, 6.2vw, 62px)`,
`68ch` measures, `.085em` tracking, `text-wrap: balance` — none of which a
spacing scale helps with. Reject CSS-in-JS separately: foldkit's `view` is pure,
and injecting styles at render makes it impure in the one place the architecture
promises purity. *Fair counter, recorded: Tailwind v4's `@theme` can be reduced
to these tokens with the default palette disabled. If someone takes that route,
disabling the default palette is not optional.*

**Routing — foldkit's own, one route union.** The framework ships a bidirectional
route biparser (`defineRouteUnion`, `Route.oneOf`, `Navigation.pushUrl`), so a
third-party router would be strictly worse *and* would put routing state outside
the Model. And the shareable object here is an **address** — 64 hex characters,
the most naturally URL-shaped thing imaginable. So: one route union,
`{ Word: {}, Node: { address } }`, wired through `makeApplication`'s
`routing: { onUrlRequest, onUrlChange }`. **If Lane B's screens need more than
one surface, this changes and it is theirs to say.**
*(PENDING per C6: unpinned docs.)*

**How Lean-generated TypeScript reaches the front end — committed generated text
with a byte gate.** The machinery exists and needs no new idea: `EmitWire.lean`
carries `defaultTarget := "../effects/src/cas/generated/ConformanceVectorSchema.ts"`
— the emitter knows its own target — `mise run gen` regenerates, `check:cas`
runs `lake exe emitwire --check`, and `mise run check` asserts a clean tree. Add
one emitter (or one registry row) whose target is the front-end package's
`src/generated/`. Lane A's `mise.toml` already reserves the hook in a comment —
*"No `gen:workbench` task yet, deliberately … The moment a surface arrives that
the store language already describes … its TypeScript is emitted by a task here
and never typed by hand."* This section names what those surfaces are.

Rejected: **a generated npm package** — a package boundary buys nothing and adds
a publish step. Rejected: **running Lean at front-end build time** — B14 is
explicit that Lake does not track non-`.lean` inputs, and the estate's rule is
committed generated text checked by a gate, never generated at consumer build
time.

What should be emitted, in value order:

1. **The kind registry** (OWED-3). Smallest, unblocks the CLI too.
2. **The MCP tool codes as Effect Schemas.** `EmitWire`'s machinery already
   lowers `Ast → Effect Schema TS`; the tool params and replies are `Ast`. This
   is the entire client contract, generated. No hand-written client.
3. **The payload readings** — `tree` = `u32 leafIndex, u32 byteLength`,
   `manifest` = `u32 recipe, u64 totalBytes, u32 leaves`, `file` =
   length-prefixed strings. The prototype hand-transcribed these and said so.
   **PENDING:** this emits *decoders*, not schemas — the `materialize` register,
   not the `emitwire` one, and materially harder. Flag, do not promise.

**Package manager / runtime:** bun 1.4.0 is already pinned in `mise.toml`. Note
for Lane A: `@foldlab/cas` builds under **typescript 7.0.2 with `@effect/tsgo`**
(`effect-tsgo patch --typescript --oxlint`), not stock `tsc`. **PENDING:** I have
not verified tsgo/Vite interop. foldkit's own lint story is `oxlint` +
`@foldkit/oxlint-plugin`, which matches the estate's `oxlint` + `effect-oxlint`
— a rare free alignment.

---

## 9. What I would refuse

**Serving the workbench over `cas-http/0`.**

It looks like the obvious answer and it is the wrong one. It is implemented,
ratified, house-styled, and already has `GET /cas/{hex}`, `PUT /cas/{hex}`,
`/roots/{hex}`, capabilities, and find-missing. Every instinct says reuse it.

It fails for one structural reason: **`cas-http/0` is a byte-plane profile.** Its
resources are node *bytes*; every body is a closed binary framing and *"the
profile carries no JSON"*; §11 scopes presence to an authority with no global
query. It has no `run`, so a program becomes N round trips and stops being a
program. `PUT /cas/{hex}` takes bytes at an address **you must have already
computed**, which means the client computes addresses — admission logic in the
browser, by the back door, after §2 rejected it at the front. And the *word* —
the object this entire product is about — is not a resource in it at all, so
history would be re-derived client-side from an unordered set, which §0 shows is
impossible.

> **The wire profile is how a store talks to a store. The manifest is how a
> caller talks to the language.** Using the former for the latter loses the
> language, which is the only thing here worth having.

Second, briefly, because it is the same error one layer up: **putting front-end
state in CAS because everything else is content-addressed.** Admission is the
only gate; admitting a pane width mints an address and a binding, and the word
stops being the user's use of the language and becomes a log of window resizes.
§4's line — denotation in, viewport out — is the guard.

---

## 10. Where this lane forces the others

**Lane A · SETUP**

- Vite is required (`@foldkit/vite-plugin`), not optional. bun stays the package
  manager and script runner.
- A generated-TS target in the front-end package, joining `mise run gen` and
  `check:cas` with a `--check` byte gate. Not a package; not a build-time Lean
  invocation.
- `@foldlab/cas` has one export entry and it pulls in platform code; a pure-plane
  subpath is needed if anything ever imports it in a browser.
- The store host is a separate bun process. Neither transport has a `serve` verb
  today — both `Server.httpApp` (unwired) and the MCP manifest (unhosted) are a
  slice of work.
- Toolchain note: typescript 7.0.2 + `@effect/tsgo`, not stock `tsc`.
- foldkit's own layout pattern (`entry.ts` / `main.ts` / `model|message|update|
  view|subscription.ts`, `page/`, `domain/`, barrel `index.ts`) is documented and
  yours to adopt or not.
- Subscription note (§5): gate on authority identity, never on word length.

**Lane B · WORKBENCH**

- **There is no "current" or "latest".** Roots is grow-only and unordered; every
  historical chain head stays published. Any recency affordance is unbacked
  until the word is readable.
- **Sort names are not available as data** (OWED-3). The CLI renders bare hex
  today and says why.
- **Refusal clauses are not available as data** (OWED-4). Three vocabularies, no
  projection.
- **Verdict vocabulary does not exist** (OWED-5). `owed`/`held` has no type; the
  nearest real thing is the signature a program is typed at.
- **Payload readings are hand-transcribed** in the prototype and stay that way
  until an emitter exists — a knowing P4 violation, flagged.
- A saved program cannot be re-run (OWED-7).
- What you **do** have, free: the three histories over one word (admission /
  structure / journal), from `.staging/explore/cas-ui-history-from-history.md`,
  and the finding that the `entry` sort makes commit lineage and content strata
  the same relation — one walk renders both.

---

## 11. My lane's minimum — the smallest genuinely professional thing

Not the smallest thing that runs.

1. One transport process serving the five existing manifest tools plus
   `cas_word`, over JSON-over-HTTP, backed by the SQLite composition that already
   has a replication check.
2. `cas_word` landed the way `Roots.lean` landed: a signature, an interpreter
   clause over state that already exists, the three named theorems, a manifest
   row, a regenerated `cas-tools.json` under its existing byte gate.
3. `RootStore` over SQL, ruled and implemented (OWED-2) — without it there is no
   browse.
4. The kind registry emitted (OWED-3) — without it every rendered sort name is
   hand-written.
5. The front end importing **only** generated text: the tool schemas, the
   binding schema, the kind registry. No `@foldlab/cas` runtime import.
6. The `effect` version decided and re-recorded (OWED-1).

Six items, of which two are rulings and one is a version bump. Nothing here is
new machinery: five of the six are projections or completions of surfaces the
estate already built.
