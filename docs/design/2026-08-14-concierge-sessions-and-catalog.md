# FROM OPERATOR-DIRECTED RESEARCH

# Concierge sessions and the type catalog: construction that survives time

Author: systems design (Opus), 2026-08-14, isolated worktree. **A design doc —
prose, wire shapes, and laws only. No machinery.** It answers the operator's
question directly: *"you just made this type — what if you want to redo the type?
You wouldn't want to go through the whole trade again. There's a lot of usability
in agent-first. You'd have to search service APIs for the type you just made."*

Labels: **SHIPPED** (walled or tested today), **RATIFIED-UNBUILT** (decided, no
build), **PROPOSED** (this doc, owes a grilling). It lands inside the five-deep-
module map (`docs/design/2026-08-13-capstone-deep-modules.md`, branch
`worktree-agent-a09df0cf34f2ff0a3`, commit `5f82cd4`) and names which module owns
each piece in §5. Nothing here adds a sixth module.

---

## Result first

The estate already contains the session. It is `proto/ts/src/session.ts:27` — a
private array of `TranscriptEntry {step, verb, subject, sent, received}` that
records every request and every reply of an authoring dialogue, in order, and
then **dies with the process**. It is unaddressable, unverifiable, unresumable,
and unsearchable. That array is the whole gap the operator named.

The design is one move: **promote the transcript from a private array to a
journal.** Everything the operator asked for follows without a new concept.

- A session is a journal; its chain head names the exact construction history.
- The partial value is the **meaning fold** of that journal — which is why
  "redo the type" is `branch(session, step)`, a new journal seeded at a prefix,
  and why the parent is untouched by construction rather than by policy.
- A session's anchor is `(session key, chain head, state digest)` — CONTEXT.md's
  anchor triple, unchanged.
- Catalog search is the **meaning fold at a query algebra**, keyed by
  `(fold digest, catalog head)`. The invalidation-free cache that has had no
  consumer since ticket 014 landed (`packages/core/src/foldCache.ts:6-9,158-162`;
  capstone §2.5's "hypothetical seam") is the machine that pays for it.

The concierge stays stateless. The daemon holds no session state: it holds a
journal, which it already holds for everything else (ADR-0005).

**The sharpest finding, stated up front.** The catalog is structurally bad at the
search agents most want. Schema identity commits *shape only* — annotations are
claims, never identity (ticket 004 law 5; CONTEXT.md "Schema"). A field named
`customerId` and a field named `x` are the same type. So "find the customer type"
is not a question this catalog can answer, and no index can fix that, because the
name is exactly the part identity throws away. **Brands are the single naming
channel identity keeps** — ratified precisely so that `UserId ≠ OrderId` at equal
shape (ticket 004 law 4). The design consequence for agents is blunt and
actionable: **brand or be unfindable.** Search-by-shape finds structure;
search-by-brand is the only thing that finds *meaning*, and it works only for
meaning an author was willing to commit to identity at authoring time.

---

## §1 — The construction dialogue as an event stream

### 1.1 What is shipped, and what it costs

The concierge is stateless by ratification (ticket 003 bullet two): "the partial
IS the state and travels in every request/reply, so the daemon holds no
sessions." That is right and this design does not touch it. `serveFill`
(`proto/go/protod/concierge.go:40`) and `serveUnfill` (`:82`) are pure functions
of `(partial, path, subtree)` and the catalog's resolvable set.

The cost of statelessness is that the dialogue lives **only in the agent's
context window** — the least durable store in the system, and the one that gets
compacted. `Session` (`proto/ts/src/session.ts:26-82`) mirrors it into a private
array and the array is not addressable, so nothing outside that process can
resume, branch, audit, or search a construction. That is why redoing a type means
redoing the trade.

### 1.2 The session is a journal; the partial is its meaning fold

Give the transcript a substrate and both folds appear for free.

- **Identity fold.** The session journal's chain head (`go/journal/journal.go`,
  hash-chained CAS-append with verify-on-read) names the exact construction
  history — every move, every refusal, in order, tamper-evident.
- **Meaning fold.** The partial is `ĝ(moves)`. The carrier is the partial tree;
  the step is the move's action on partials; combine is composition. This is the
  **monoid action** form — the one CONTEXT.md says licenses O(1) extension.
- **Anchor.** `(session key, chain head, state digest)`, with the state digest
  defined in §1.5. Identical in shape to every other anchor in the estate
  (`packages/core/src/entity.ts:105-109`).

A session is therefore an **entity**: the quotient of journal traffic by a
correlation key. `packages/core/src/entity.ts:88-90` already names the discipline
in a comment — *"for agent streams: session id, span id, tool call id."* The
collector was built for this consumer and has been waiting for it.

### 1.3 The event grammar — and why the fold's domain is not the journal's schema

The brief proposed five kinds: fill, unfill, refine, abandon-hole, commit. Three
survive, one is rejected outright, one is demoted, and one is added.

The reason the grammar comes out this small is a discipline the estate already
uses: **the journal admits anything; the fold defines the domain.** Ingress checks
identity resolution only and explicitly does not check payload conformance
(`proto/wire/CONTRACT.md:111-113`). The entity meaning-fold forgives out-of-domain
payloads as a no-op while the head still commits to them
(`packages/core/src/entity.ts:64-73`). Applied here: the session journal may carry
the whole transcript — reads, describes, refusals, notes — and the **session fold
reads four kinds and forgives the rest**. There is nothing to legislate about what
may be journaled.

The four kinds in the fold's domain, `flb.session.v0`:

```
open   { grammar: <digest>, seed: <partial>, author: <string>,
         from?: { session: <key>, step: <int>, head: <hex64> } }
fill   { path: [<edge>...], subtree: <partial> }
unfill { path: [<edge>...] }
commit { digest: <hex64>, scheme: <string>, catalogSeq: <int>, catalogHead: <hex64> }
```

**`open` appears exactly once, at position 1.** Any second `open` refuses. It
carries the grammar digest because §2.3's soundness question is undecidable
without it, and carrying the grammar on every move would let a session disagree
with itself. This mirrors the journal's own shape gate (`go/journal/journal.go`,
the refuse-on-import/eviction gate the capstone cites at §1.1).

**`refine` is rejected as a primitive.** Refining a filled node is
`unfill(π) · fill(π, narrower)` — two events. Making it one primitive would give
the move algebra an operation with no inverse and would break the two-element
statement of C2. It stays a client-side macro that emits both events; the
frontier transiently widens between them, which is honest and visible. Cost: one
extra journal entry per refinement.

**`abandon-hole` is rejected.** It has no sound reading. Frontier-empty ⇔
catalogable is law C3 (`proto/AGENTS.md:24-27`), so a hole you may skip would
make the frontier a liar. The two things an agent actually means by it already
exist: *"I don't want to describe this"* is `fill(π, {"k":"opaque"})` — the
ratified escape hatch (ticket 004 addendum 8) — and *"I'm done with this
session"* is abandoning the session, which needs no event because journals are
append-only and a session that stops is a session that stops. Giving
`abandon-hole` a name would create a second way to say `opaque`, which is a
second admission path in miniature.

**`commit` is added and is load-bearing.** It records what `type.create`
returned: the digest the *daemon* derived, never one the agent asserts (W1,
`proto/go/protod/catalog.go:117-132`). It is what makes provenance a query
instead of a field (§3.4), and it carries a checkable claim (L7).

Everything else — refusals, reads, `contract.describe` calls, notes — is journaled
if the client wants it and folded as a no-op. That is not laxity; it is the
`applySync` rule (`entity.ts:73`) applied one level up, and §1.4 shows it doing
real work.

### 1.4 What `unfill ∘ fill = identity` induces on the fold

C2 as shipped is a **left inverse at a path**, not a group law: for a partial `p`
with a hole at `π`, `unfill(fill(p, π, s), π) = p`. The reverse order does not
hold unless `s` is exactly what was there. `unfill` is a retraction, and the
partials-preserve-union-positions decision exists to make it exact
(`proto/go/protod/walk.go:139-143`).

Five laws follow.

**L1 — Totality (from SENSIBILITY).** Every reachable partial is well-formed, so
every prefix of a session has a defined fold state and therefore a state digest
(ticket 003, 2026-08-13 amendment). Consequence: **a session can be branched at
any step.** SENSIBILITY is not a nicety about shareable half-built grammars; it is
the precondition that makes revision total.

**L2 — The kernel is inhabited by construction.** `ker(ĝ)` — what the chain
remembers that the fold forgives (`docs/design/2026-08-13-the-unified-fold.md`
§1.2) — contains three generated families here:

1. **round trips**: `fill(π,s) · unfill(π)` for every legal `(π,s)`, by C2;
2. **idempotent unfills**: `unfill(π) · unfill(π)`, since replacing a hole with a
   hole is a no-op (`concierge.go:250-259` with `requireHole=false`);
3. **refusals and reads**: every out-of-domain entry, by §1.3.

This is the first place in the estate where `ker(ĝ)` is *enumerable* rather than
merely named. "The chain remembers what the fold forgives" stops being a slogan
and becomes a property test with generated witnesses: build a dialogue, insert a
kernel element, assert equal state digests and unequal heads. The fold cache
already behaves correctly under it and says so —
`packages/core/src/foldCache.ts:243-245`: *"A key names a history, not the state
that history folded to. Two different histories reaching the same state are
stored separately."*

**L3 — The action is a monoid action, so extension is O(1) and results cache.**
State keyed on `(fold digest, session head)` is an immutable truth with no
invalidation (`foldCache.ts:6-9,158-162`). Resuming a session is a cache read.

**L4 — The commutativity class of `flb.session.v0` is path-disjointness.** Two
moves commute exactly when neither path is a prefix of the other. Sibling struct
fields commute; sibling union indices commute *because* partials preserve
positions (`walk.go:139-143`); nested paths do not. Per CONTEXT.md, a
commutativity class "decides entity boundaries and licenses reordering" and
"never licenses reordering the identity fold." Here it licenses two concrete
things: parallel fan-out on independent holes (§6.3) and the soundness criterion
for rebase (§2.2). L4 is the workhorse of this design, and it is a free
consequence of a decision already made for C2.

**L5 — The frontier is a function of state, not of history.** For any two
dialogues `u, v` with `ĝ(u) = ĝ(v)` against the same catalog head,
`frontier(u) = frontier(v)` byte-identically. This is true today by construction
(the daemon is stateless; law C1 already says repeating a request against the
same catalog returns byte-identical data). Stating it as a law makes it a
**constraint on all future frontier work**: no "you already tried that", no
history-dependent ranking, ever, inside the frontier. History-derived advice is
legitimate and belongs in a separate surface the agent computes from the session
journal. Without L5, resume stops being exact and the fold stops being a fold.

### 1.5 The state digest, and a correction owed to ticket 004

The session's meaning-fold state digest must be
`SHA-256(RFC 8785(normalize(partial)))` — **normalize-then-digest**, ticket 004
addendum 9. It cannot be a digest over the stored partial, because the stored
partial deliberately preserves union member positions (`walk.go:139-143`) while
the certify path **sorts union members by canonical bytes in place before
encoding** (`walk.go:158-163`, then `catalog.go:88` → `catalog.go:111`).

Two consequences.

**L7 — Commit convergence.** At a zero-hole prefix, the session's state digest
equals the digest `type.create` will derive. The dialogue's meaning fold lands
exactly on the type's identity: **construction terminates precisely when the
meaning fold of the dialogue reaches a value the identity fold can name.** That is
the through-line of this whole design, and it is checkable — an auditor recomputes
`Derive(canonicalBytes(normalize(replay(prefix))))` and compares it to the digest
the `commit` event claims. Call this **provenance soundness**: a session cannot
lie about which type it produced.

**The correction.** Ticket 004 addendum 9 states that `normalize` "is the identity
function today." At the union node it is not: `walk.go:158-163` is a
normalization, performed before digest, on the certify path only. Nothing is
broken — the sort happens in the right place and the digest is right — but the
addendum's wording hides an existing non-identity normalize, and this design needs
`normalize` to be a *nameable* function applicable to partials in order to state
L7. **Owed to the 004 grilling: name the union sort as `normalize`, or restate
addendum 9 to say normalization is currently spelled inside canonical encoding.**

---

## §2 — Revision without replaying the trade

### 2.1 Rewind is branch; there is no rewind verb

Rewinding in place would mean truncating a journal. Journals are append-only, so
the operation does not exist — which is exactly what makes "a redo never silently
changes committed history" structural rather than policed. Three verbs, sharply
distinguished:

- **`resume(session)`** — continue the same journal. Exactness is trivial: it is
  the same chain. Returns the current partial, frontier, head, and step.
- **`branch(session, step)`** — a **new** journal whose `open` carries
  `from: {session, step, head}` and `seed: ĝ(prefix)`. The parent is not written
  to. The branch point is a checkable claim: recompute the parent's head at
  `step` and compare to `from.head`.
- **`replay(session, onto: grammar)`** — re-run the dialogue's moves against a
  different grammar (§2.3).

```
flb.req.session.open   { grammar, seed?, author, from? }
                       → { ok, session, head, step, partial, frontier, anchor, next }
flb.req.session.move   { session, expectedHead, op: "fill"|"unfill", path, subtree? }
                       → { ok, session, head, step, partial, frontier, next } | Refusal
flb.req.session.state  { session, at?: <step> }
                       → { ok, session, head, step, partial, frontier, anchor, next }
flb.req.session.branch { from: { session, step }, author, rebase?: bool }
                       → { ok, session, head, step, partial, frontier, rebase?, next }
flb.req.session.commit { session, expectedHead }
                       → { ok, digest, scheme, catalogSeq, catalogHead, head, next }
```

`session.move` adds no capability: it is `serveFill`/`serveUnfill` unchanged, plus
a journal append under a head precondition (§6.3). That is the standing rule for
the session facade — *"sugar strictly above the writ... a session can do nothing a
bare three-verb client cannot"* (`proto/ts/src/session.ts:1-3`;
`proto/AGENTS.md:16-17`). The session key is content-addressed: SHA-256 over the
canonical bytes of the `open` event, under a reserved journal-name prefix. Opening
the same session twice converges rather than erroring — W3's discipline, applied
to sessions. Reserving the prefix is a one-line shape gate mirroring the existing
`catalog` reservation (`proto/wire/CONTRACT.md:21`).

### 2.2 Rebase: replaying the suffix onto the branch

Branching gives you the prefix for free. The usability win the operator actually
wants is not re-*deciding* the later moves either — replay the parent's suffix on
top of the changed node. L4 makes this decidable with no search:

> **Rebase soundness.** A parent-suffix move replays onto a branch **iff** its
> path is disjoint from every path edited since the branch point. Disjointness is
> prefix comparison; the check is O(1) per move and the whole rebase is O(suffix).

Moves that fail are not dropped silently and are not repaired. The reply carries
the partial as far as it got, the frontier at that point, and the list of
unreplayable moves with the path and law for each — a refusal that names the legal
next moves, per U1. In the common case ("I changed the type of one field, keep the
other twelve"), every remaining move is path-disjoint and the entire suffix
replays.

### 2.3 What survives a grammar-version bump

The `open` event commits the grammar digest, so the question is well-posed. Three
cases:

**Extension (nodes added; nothing removed, no kind's shape changed).** Every old
move stays legal, so replay is sound. This is *provable*, not assumed: the closure
law (ticket 004 addendum 10) requires every admitted node kind to preserve
regularity of the induced tree language, which keeps **inclusion decidable**. So
"is this grammar bump replay-safe?" is a theorem about two tree automata rather
than a judgement call. This is the closure law's first concrete payoff outside
frontier liveness, and it should be recorded as one.

**Restriction or shape change.** Some move may now be illegal. Replay is attempted
and **refuses at the first illegal move**, naming the move index, the path, the
law, and the frontier at that point, so the agent resumes construction from the
last sound prefix. Never silently repaired — a repaired replay is naming a
different dialogue, by the same argument that makes a repairing decoder name a
different value (CONTEXT.md "Constrained decode").

**Normalization change.** If `normalize` changes, digests move even when every
move replays. Rule: the replayed session is a **new session with a new identity**,
and the old `commit`'s digest is never re-derived under the new normalize and
silently equated. Addendum 9 already requires termination, confluence, and a
fixture wall before a normalize touches identity; the session layer adds the
migration consequence.

**This settles 004's open migration question in favour of dual-record.** Ticket
004 defers "whether interim digests are re-derived or dual-recorded... until the
prototype shows real records." Sessions are the real records: a `commit` event is
a **journal fact naming a digest under a scheme**, and re-deriving would falsify a
committed fact in an append-only, tamper-evident log. Re-derivation is not
available to us once dialogues are journaled. **Dual-record, and the argument is
now available to the 004 grilling.**

### 2.4 Structural diff over a Merkle-annotated tree

The "shared subtree digests make diff O(changed)" story is **not paid for today**.
Only the whole structure is digested; `ref` nodes are the only content-addressed
children, and they are explicit cross-type references
(`proto/wire/CONTRACT.md:162-167`).

What pays for it is one more semantic fold over the existing walk: annotate every
node with `SHA-256(RFC 8785(normalize(subtree)))`, bottom-up, one traversal. This
is the unified-fold doc's Face B (§1.1) applied at every node instead of only at
the root, so it introduces no new mechanism. Two properties follow:

- **Diff is O(changed · depth).** Compare root digests; equal means identical in
  O(1); unequal means recurse only into children whose digests differ.
- **The annotation is O(depth) per move, not O(size).** A `fill` at path π
  changes digests only along the spine from π to the root, so a session maintains
  the annotation incrementally within its existing per-move budget.

Diff output is a **move script**: unfill each changed subtree root, fill with the
new subtree. That closes the loop — a diff *is* a branch suffix, so "show me the
difference between these two types" and "make this type into that one" are the
same machinery. Honest bound: the script is **sound, not minimal**. Minimal tree
edit scripts are expensive and we do not need them; §6.5 records the edge.

---

## §3 — The type catalog as a search surface

### 3.1 The one architectural claim

**Catalog search is not a new subsystem. It is the meaning fold at a query
algebra, keyed by `(fold digest, catalog head)`.**

A shape query's result set is a set of digests; the combine is union; `setUnion`
is already a declared primitive algebra with pinned semantics
(`packages/core/src/algebra.ts:76`, `"sorted-unique-unicode-strings-utf16"`). The
step is "does this catalog entry match the pattern → `{digest}` or `{}`", and it
needs one new `StepSpec` op carrying the pattern as canonical data — the same
shape as the existing path-carrying steps (`algebra.ts:108-125`). So a query is
`defineFold(setUnion, structureMatches(pattern))` (`fold.ts:126`), and:

- **A query has a digest** — over (algebra declaration, step declaration), with
  the pattern inside the step. Queries are content-addressed values. You can share
  a query by hash, pin to it, and re-run it anywhere.
- **A query result is a fold-cache entry** — `(query digest, catalog head)` names
  exactly one result set, permanently, with no invalidation state
  (`foldCache.ts:6-9,158-162`). A longer catalog simply has a different head and a
  different key.

This is the consumer the capstone's Top Recommendation said was missing. Capstone
§2.5 records the Fold as "proven deep but leverage unrealized — one adapter (the
wall) is a hypothetical seam." The catalog query surface is a **second consumer
family that needs no new substrate at all**: one `StepSpec` op, one request kind,
and algebras that already ship. Ticket 020's `JournalMessageStorage` remains the
right first build (it converts three hypothetical seams at once); this is the
cheaper second.

### 3.2 The four query modes, with build-cost verdicts

| Mode | What pays for it today | Verdict |
|---|---|---|
| **1. By digest (exact)** | `catalog.resolve` + the `byDigest` index rebuilt by verify-on-read (`catalog.go:37-63`) | **Paid for internally; needs a surface.** There is no `type.get` request kind — `dispatch.go:52-60` has exactly five subjects — so an agent must read the whole catalog journal. One request kind. **Trivial.** |
| **2. By shape (structural)** | The grammar walk classifies every node; `walkPartial` already treats holes as wildcards-in-waiting (`walk.go:44-52`) | **Cheap new work.** The query language is *the grammar itself*: a query is a partial, holes are wildcards. Matching is a co-walk of pattern and structure — the walk's **fifth** consumer. Add the Merkle annotation (§2.4) and exact-subtree search becomes a hash lookup. |
| **3. By provenance (anchor triple)** | Journals, the entity collector, `anchors()` (`entity.ts:105-109`), and `submitter` on every catalog fact (`catalog.go:26,150`) | **Richest machinery, poorest surface.** Once sessions are journals, provenance is already a query: fold session journals by `commit.digest`. No new mechanism, gated only on §1 existing. |
| **4. By semantic classification (FCA)** | Nothing — ticket 016 is blocked by 004 and needs a scale type, an exploration journal, and a fallible oracle | **Expensive, gated, correctly last** — *but splits*. See below. |

**Mode 4 splits, and the cheap half is worth building first.** Ticket 016's engine
needs a formal context (objects × attributes). A large, useful class of attributes
is **derived, not asked**: "has a field named `id`", "contains a brand named X",
"is a union of ≥ 3 members", "references digest D". Every one is computable by a
fold over the structure and needs no oracle and no question budget. So a
**derived-attribute formal context is free** — one more declared fold over the
same catalog — and only genuinely semantic attributes ("is a customer record")
need 016's oracle. Building the derived context first means attribute exploration
starts from a non-trivial context rather than nothing, which directly reduces the
`max_questions` budget that ticket 016 makes contract (016 point 2).

### 3.3 What a query returns: certificates, with an honest asymmetry

A result row is the catalog fact plus its position:
`{ digest, scheme, structure, catalogSeq, catalogHead, submitter }`.

The caller re-derives `Derive(canonicalBytes(normalize(structure)))` and checks it
equals `digest`, and verifies `catalogHead` by reading the catalog journal locally
— heads are claims (W6, `proto/wire/CONTRACT.md:96-100`). So **search cannot lie
about identity**: a buggy or hostile index can return wrong rows, never forged
ones.

The asymmetry is the honest part:

> **Soundness is free; completeness is expensive.** Per-row re-derivation costs
> the caller one hash. Certifying that the result set is *every* match requires
> the caller to re-fold the catalog to the named head — O(catalog). The reply
> therefore carries `overCatalogHead` and `queryDigest`, which fully specify that
> recomputation, and the daemon pays it once per head via the fold cache.

```
flb.req.catalog.query { by: { digest } | { shape: <partial-as-pattern> }
                            | { provenance: {...} } | { attributes: [...] },
                        from?: <catalog cursor>, max?: int }
                      → { ok, results, overCatalogHead, queryDigest, note, next }
flb.req.type.get      { digest } → <catalog fact> | Refusal
```

Absence stays a typed refusal, never a lookup miss (CONTEXT.md "Catalog").

### 3.4 The frontier's `refs` is the first consumer

`buildFrontier` advertises `resolvableDigests(16)` — the **lexicographically first
sixteen** cataloged digests (`concierge.go:9,124-136`;
`proto/wire/CONTRACT.md:84`). That is a placeholder, and as the catalog grows it
becomes actively misleading: the agent is offered sixteen arbitrary types at every
hole.

The fix is the query fold: the frontier's `refs` at a hole should be the top-k
results of a **shape query for what fits that hole**. This stays lawful under L5,
because the frontier remains a function of `(state, catalog head)` — which is
exactly what C1 already says — and the per-fill cost is absorbed by the fold cache
keyed on `(query digest, catalog head)`. **This is the concrete answer to "you'd
have to search service APIs for the type you just made": you would not search;
the type you just made is offered at the next hole that fits it.**

### 3.5 Hanging it on MCP

The MCP work for this design is **zero beyond adding request kinds**: the tool
surface is derived from `contract.describe` at startup (`proto/ts/src/mcp.ts:28-58`),
so a new request kind grows a tool with no hand-written list to drift.

Three upstream surfaces are worth using, and one is worth refusing
(`repos/effect/packages/effect/src/unstable/ai/McpServer.ts`, rc.108):

- **Resource templates** (`McpServer.ts:1430-1455`) fit exactly: `flb://type/${digest}`
  and `flb://session/${key}` are addresses, and our addresses are digests. A read
  returns the certificate row of §3.3.
- **Completions** (`McpServer.ts:1389-1400`) are the best mapping in the whole
  surface. A completion handler on a template's `digest` parameter *is* a catalog
  query. **The frontier's ref advertisement and MCP argument completion are the
  same query fold**, served to two different callers.
- **Pagination**: the schema has `cursor`/`nextCursor` but every list handler
  ignores them (`McpServer.ts:1997-2047`). We should not depend on it — our cursor
  is a **journal cursor** (`{seq, head}`), which verifies, whereas an opaque cursor
  does not. Ours rides in the payload.
- **Elicitation** (`McpServer.ts:1828`) — server asks client for input — is
  tempting for the teaching loop and should be **refused**. It inverts the writ
  (the daemon would request of the client) and would create a second construction
  path alongside the concierge. Ticket 015 deliverable 1 permits no second
  admission path; the same reasoning applies to construction.

One honest constraint: resource subscribe/update notifications are hard-disabled
over HTTP (`McpServer.ts:1957-1960`), so live "another agent extended this
session" notifications work only on stdio transports.

---

## §4 — Agent-first usability laws

Five laws. Each: statement, what enforces it, which rung of the ladder
(`docs/map/tickets/009-the-verification-ladder.md`) it sits on.

**U1 — Every refusal names a legal next move.**
*Statement.* Every refusal from a session or catalog verb carries `next` with at
least one subject-and-body the daemon will accept, given the current state —
possibly in a *different* verb when no move is legal here.
*Enforced by.* The frontier derived from tree-automaton successors, never a
hand-written table (ticket 003 amendment); C4 (advertised examples never
dead-end); and the existing pattern where an unresolvable ref hints
`type.create` first (`concierge.go:205-212`).
*Rung.* C4 is at **R1** today. The new obligation extends ticket 009's climb 5
from "every refusal kind is witnessed by a test" to "every refusal's `next` is
**executed** and accepted" — a mechanical **R0/R1** gate.

**U2 — Search results are certificates, not hints.**
*Statement.* Every row re-certifies: the caller re-derives its digest from its
structure and gets equality. The set names the catalog head and query fold digest
it was computed at.
*Enforced by.* Rows carrying `structure`, not just `digest`; W1's
derive-from-bytes discipline; the `(fold digest, head)` key.
*Rung.* **R0** for per-row re-derivation (a frozen query-result fixture whose rows
re-derive), **R1** for set completeness (recomputed fold equals returned set at
the named head).
*Corollary — provenance is a query, never a field.* Nothing about origin is stored
on a type. The catalog fact's fields are `{digest, scheme, structure, submitter}`
(`catalog.go:23-29`) and `submitter` is the only author claim, explicitly
untrusted. Everything else is folded from journals (ADR-0005). Keeping the fact's
shape frozen is what keeps U2 true.

**U3 — Resume is exact; a branch is a new identity.**
*Statement.* `resume(s)` returns a state whose head equals what a full replay
computes. `branch(s, k)` never appends to `s`, and the child's `open.from.head`
equals the parent's head at `k`, recomputable by the caller.
*Enforced by.* Append-only journals — there is no truncate verb, so a redo
*cannot* alter committed history; verify-on-read; the content-addressed session
key.
*Rung.* **R0** (a frozen session fixture: one recorded dialogue with its per-step
heads and state digests) then **R1** (property over generated dialogues, with the
kernel-element witnesses of L2).

**U4 — The frontier is a function of state, not of history.**
*Statement.* For dialogues `u, v` with `ĝ(u) = ĝ(v)` at the same catalog head,
`frontier(u) = frontier(v)` byte-identically.
*Enforced by.* Daemon statelessness (law C1); and, going forward, a standing
prohibition on the frontier reading the session journal.
*Rung.* **R1**, with a natural negative control — a frontier that memoizes
"already tried this" fails the property, which is exactly the prover-that-can-fail
requirement (`AGENTS.md`).

**U5 — Every intermediate is addressable; none is catalogable.**
*Statement.* Every prefix of a session has a state digest; no partial containing a
hole enters the catalog, generated code, or the identity fixtures.
*Enforced by.* SENSIBILITY (ticket 003 amendment) and law C5, which is green after
the D46/D47 cycle (`proto/DECISIONS.md:555-604`: the widened property found
`toGoSource` emitting `type Hole any` for a hole-bearing union, the disposition
made every target refuse at the same path, and the red property went green).
*Rung.* **R1** (C5, shipped, with a permanent regression case).

---

## §5 — Where this lands in the five deep modules

Nothing here is a sixth module.

**① Certifier (with its concierge face)** — owns the most. Move semantics, the
frontier, the grammar-bump legality check, `normalize` lifted to partials (§1.5),
the Merkle node-digest annotation (§2.4), and the shape-query pattern matcher
(§3.2). The last two matter for the capstone's strongest earns-its-keep argument:
the grammar walk had **three** consumers (certify, concierge, `contract.describe`);
this design takes it to **five** (add pattern-match and node-digest). A query
pattern is a partial and matching is a co-walk, so the search surface reuses
`walkPartial` rather than inventing a query language.

**② SemanticFold** — no new target is *required*, but session transcript
renderings and diff renderings are the natural place someone will add one. Stated
so nobody exempts themselves: any new target joins CROSS-TARGET DERIVABILITY
CONSISTENCY — all targets derive, or all refuse at the same path
(`proto/AGENTS.md:28-35`, D46 disposition).

**③ Journal** — owns the session itself. A session is a journal; a branch is a new
journal; there is no new storage. Capstone §2.4 counted two real adapters (the
daemon's journals and the catalog); sessions make a third, alongside ticket 020's
`JournalMessageStorage` as a fourth.

**④ Fold** — the module this design most enriches. Four declared algebras with
real callers: the session meaning fold, the catalog query fold, the provenance
fold, and the derived-attribute context fold. Capstone §2.5's honest verdict was
that the Fold's leverage is unrealized because only the wall calls it. Unlike
ticket 020, this consumer family needs **no new substrate** — one `StepSpec` op
and declared patterns.

**⑤ Effector** — owns exactly one thing here: **named-version adoption**, i.e.
which branch is *the* `CustomerType`. That is a decision two parties could
legitimately disagree on, so it is single-homed (NEXT.md ownership decision 5).
It owns **nothing** about session concurrency — see §6.3.

**Floor (jcs, grammar walk)** — state digests are `encodeJsonValue` + SHA-256;
queries, patterns, and session events are canonical data; constrained decode
governs every one.

---

## §6 — What we cannot do

### 6.1 Cross-grammar migration of half-built values

We can replay a *dialogue* against a new grammar and refuse at the first illegal
move (§2.3). We **cannot migrate a partial value** across grammars. A partial is a
term of a specific grammar and there is no general term translation. The safe case
is exactly the case where migration is unnecessary: when the new grammar provably
includes the old (decidable, by the closure law), the partial is already a term of
the new grammar. Outside inclusion, we refuse and the agent reconstructs from the
last sound prefix. And even a successful replay inherits the standing cap: whether
the replayed dialogue *means* what it meant is the semantic gap
(`docs/design/2026-08-13-the-unified-fold.md` Part 4). **Recomputability of what
was built, never fidelity to intent.**

### 6.2 Search over meanings

Without ticket 016 built out, mode 4 is shape-only. With it, the lattice
classifies by *declared* attributes under a *declared* scale, and whether an
attribute means what it says is oracle-dependent and fallible — 016 point 7 leaves
the fallible-oracle consistency number open, and its answer decides whether a
consistency protocol must precede the architecture.

The deeper limit is the one in the Result-first box and it is not fixable by
indexing: **identity commits shape only**, so field names — the thing agents
actually search by — are annotations and are thrown away by design (ticket 004
law 5). Brands are the one naming channel identity keeps (law 4), which makes
brands the only search key that reaches meaning, and only for meaning an author
committed at authoring time.

### 6.3 Concurrent editing of one session

**Sessions do not go through the effector, and should not.** Under the ratified
evidence/decisions/absence sort (NEXT.md), a session move is **evidence** — it is
recomputable from bytes — so it federates and converges and needs no single home.
What it needs is optimistic concurrency:

> A `session.move` carries `expectedHead` and refuses if that is not the session's
> current head, returning the current head and the current partial. Stale is not
> disagreement; it is recomputable staleness, and the refusal teaches.

This is not optional. Without it there is a real hazard: the concierge validates
against the partial *in the request*, so two agents can each fill the same hole
against the same stale partial, both fills validate, both append — and **replay
then finds the second move illegal**, breaking L1 totality. The head precondition
is what keeps the fold total.

What we **cannot** do: merge two branches that edited **overlapping** paths. L4
gives commutation only for path-disjoint moves, so disjoint fan-out merges by
committing an order (a merge fact, `packages/core/src/stream.ts`) and the content
is derivable. Overlapping edits are a genuine disagreement — a decision — and go
to the effector or to an adjudicating agent. There is no automatic resolution and
we should not invent one.

### 6.4 We cannot tell you *when*, and we cannot rank

Time is not in an event (CONTEXT.md "Event": stream identity, position, payload;
arrival order across streams is not in the event). A timestamp is a payload field
— an author claim, not recomputable evidence. Ordering *within* a journal is
evidence; ordering *across* journals is not, absent a merge fact or an effector
decision. So "show me recent types" has an honest answer only per-authority:
*"highest catalog sequence on this daemon."* Across federated catalogs there is no
global order.

Similarly, relevance ranking is not evidence unless the ranking function is a
declared fold. An LLM-ranked result set is an author claim wearing a certificate's
clothes. Rule: **rank by a declared fold, or return catalog order.**

### 6.5 Two smaller edges

**Diffs are sound, not minimal.** The Merkle diff yields a correct unfill/fill
script in O(changed · depth); computing a *minimal* script is tree edit distance
and is out of scope.

**Compaction trades branch points for size.** A long dialogue can be compacted —
replacing a prefix by its `(head, fold state)` pair, which for a session means
keeping the head and the partial and discarding the moves
(`packages/core/src/stream.ts:312-340`). What is lost is exactly what CONTEXT.md
says is lost: step-through inside the discarded prefix. **You can no longer branch
inside a compacted prefix.** That is the honest price and it should always be an
explicit choice, never a background job.

---

## §7 — Build order

Ordered by realized leverage per unit of new interface, the capstone's metric.

1. **The session journal** (§1) — the transcript gets a substrate. New: a
   reserved journal-name prefix, four request kinds composing existing verbs, and
   the `flb.session.v0` step. Reuses: journal, entity collector, fold cache.
   Unblocks everything else here. Gate: U3's R0 fixture (a recorded dialogue with
   per-step heads and state digests) plus the L2 kernel property.
2. **`normalize` on partials + `type.get`** (§1.5, §3.2) — the smallest pieces,
   and L7 (commit convergence) is not statable without the first. Carries a
   correction back to the ticket 004 grilling.
3. **`catalog.query` with the shape mode** (§3.1–3.3) — one `StepSpec` op, one
   request kind, `setUnion` and the fold cache unchanged. First real non-test
   consumer of the fold algebra that needs no new substrate.
4. **Frontier `refs` from the query fold** (§3.4) — retires the
   lexicographically-first-sixteen placeholder and directly answers the operator's
   question.
5. **Merkle node annotation, then branch + rebase** (§2.4, §2.2) — diff and redo
   are the same machinery once the annotation exists.
6. **Derived-attribute formal context** (§3.2) — free, and it lowers ticket 016's
   question budget before 016 starts.

---

## Appendix — grounding ledger

**Shipped code cited.** `proto/ts/src/session.ts:1-3,26-82` (the transcript that
dies with the process); `proto/go/protod/concierge.go:9,40,82,124-136,205-212,250-259`
(fill/unfill, frontier, ref limit, teaching refusals, hole replacement);
`proto/go/protod/walk.go:44-52,139-143,158-163` (the walk, partials preserving
union positions, the union normalization sort); `proto/go/protod/catalog.go:23-29,37-63,88,111,117-132,150`
(catalog fact shape, resolve index, walk-then-canonicalize-then-derive, W1);
`proto/go/protod/dispatch.go:52-60` (the five request subjects that exist today);
`packages/core/src/entity.ts:64-73,88-90,105-109` (one meaning fold, the session-id
correlation comment, anchors); `packages/core/src/foldCache.ts:6-9,158-162,243-245` (no
invalidation state; a key names a history, not a state);
`packages/core/src/algebra.ts:76,108-125` (`setUnion`, `StepSpec`);
`packages/core/src/fold.ts:126` (`defineFold`); `packages/core/src/stream.ts:312-340`
(compaction); `proto/ts/src/mcp.ts:28-58` (tools derived from `contract.describe`);
`proto/wire/CONTRACT.md:21,84,96-100,111-113,162-167,176` (journal names, the ref
limit, heads are claims, identity-only admission, refs, the interim scheme);
`proto/AGENTS.md:16-17,24-35` (the writ and the session facade; C1–C5; cross-target
consistency); `proto/DECISIONS.md:555-604` (D46/D47 — C5 red, then green).

**Ratified, unbuilt.** Ticket 003 (concierge laws: SENSIBILITY, CONSTRUCTION
REACHABILITY, PREFIX PROPERTY); ticket 004 laws 4–5 and addenda 8–10 (brands
identity-bearing, annotations are claims, `opaque`, normalize-then-digest, the
closure law); ticket 009 (the ladder); ticket 015 (certifier as sole admission
path, the teaching loop, GF reversibility); ticket 016 (attribute exploration, the
question budget, the fallible-oracle number); ticket 020 (the Effect surface and
`JournalMessageStorage`).

**Upstream, rc.108.** `repos/effect/packages/effect/src/unstable/ai/McpServer.ts:1389-1400`
(completions), `:1430-1455` (resource templates), `:1828` (elicitation),
`:1957-1960` (subscribe disabled over HTTP), `:1997-2047` (list handlers ignore
pagination).

**Design lineage.** `docs/design/2026-08-13-the-unified-fold.md` (§1.1 Face B, §1.2
the kernel, Part 4 the semantic gap);
`docs/design/2026-08-13-capstone-deep-modules.md` (§2.2 the concierge as the
Certifier's constructive face, §2.4 the Journal's adapters, §2.5 the Fold's
unrealized leverage, the Top Recommendation).

**Owed grillings.** (1) The `normalize` correction to ticket 004 addendum 9
(§1.5). (2) Dual-record over re-derive for 004's migration question, on the new
grounds that a `commit` event is a journal fact (§2.3). (3) Whether the session
journal-name prefix is reserved by the same gate that reserves `catalog`. (4)
Whether `session.move`'s head precondition belongs in a request kind or as an
ingress precondition (§6.3 argues the former).
