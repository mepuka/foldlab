# SPEC — THE TRUNK: the front end derived from the algebra

**Status: PRE-GRADE. This document has not been grilled.** It is written
for the operator's grilling pass, in the register `THE-ALGEBRA.md` set
for itself (C4/C5): every claim carries a `file:line` or a law number,
and no soundness word appears without its judgment named. Nothing here
is ratified and nothing here is commissioned; §6 proposes one slice and
§7 lists what it needs ruled.

**Baseline.** `main` @ `a07768ad` ("docs: the trunk — the front end's
central object, as dictated"). Every host and Lean citation below was
resolved at that commit via `git show main:<path>`. **The worktree this
document was written in is at `3ffb5f56`, which is not an ancestor of
`main`** — the file is therefore new and independent, but a reader who
opens the citations from that worktree will not find them. Open them
against `main`.

**Vocabulary.** Law numbers `L1`–`L233` and the four status words —
**PROVED** (a kernel-checked Lean theorem, named), **GATED** (a
decidable executable check carries it), **ASSERTED** (prose only),
**OWED** (relied on, stated nowhere) — are
[`.staging/algebraic-review/THE-ALGEBRA.md`](../algebraic-review/THE-ALGEBRA.md)'s,
used in exactly its senses. `Q1`–`Q19` are its §4 ruling questions.
`FE-B1`–`FE-B8` and "ruling ask N" are
[`../operational-structure/FRONTEND.md`](../operational-structure/FRONTEND.md)'s.
`FE-O1`–`FE-O12` are
[`../ornamentation/PROOF-OBLIGATIONS.md`](../ornamentation/PROOF-OBLIGATIONS.md)'s.

**The design method, stated before anything is designed.** This is a
mapping FROM the algebra, not a feature list checked against it. Every
element below names the law that licenses it, and its easy/hard grade is
derived from that law's *status* — not from implementation effort. An
element with no licensing law is not a hard element; it is not an
element. The inverse discipline is the point: where the algebra is
silent, the front end promises nothing, and says so on its face.

---

## 0. What the algebra ledger does not yet cover — read this first

`THE-ALGEBRA.md`'s baseline is `7dac14d8` and it states outright that
two merge branches "were not read" — `merge/cas-word` and
`merge/daemon-spine` (`THE-ALGEBRA.md:22-26`). **Both have since
landed on `main`.** Verified at `main`:

| Object | At `main` | Ledger row |
|---|---|---|
| `library/cas/Cas/Lang/Worded.lean` | present — `WordSig`, `since`, 7 theorems | **none** |
| `library/cas/Cas/Lang/WordWire.lean` | present — `LogEntry`, `History` | **none** |
| `library/effects/src/cas/WordLog.ts` | present — the host receipts seam | **none** |
| `library/effects/bin/cli/history.ts` | present — `cas history` | **none** |
| `library/effects/SERVING.md` | present — Category 1, ratified | **none** |
| `library/effects/bin/mcp/http.ts` | present — the daemon, two planes | **none** |
| `library/effects/bin/cli/naming.ts` | present — `cas name` | **none** |

So **the front end's central object acquired its laws after the law
ledger was written, and those laws have no ledger rows.** This document
numbers them `W1`–`W7` (§1.3) purely so it can cite them; assigning
them real `L`-numbers is owed to the next pass over `THE-ALGEBRA.md`,
and until then a reader should treat §1.3 as this lane's reading of
landed Lean, not as the ledger's verdict.

**FRONTEND.md's blocker list, re-measured at `main`.** The prior
front-end lane stopped on eight. Five moved:

| Blocker | State at `main` | Evidence |
|---|---|---|
| FE-B1 Effect version split | **closed** | `library/effects/package.json:56-58` — `effect`, `@effect/platform-bun`, `@effect/sql-sqlite-bun` all `4.0.0-rc.112`; `experiments/workbench/package.json:17-18` names the same |
| FE-B2 `check:workbench` invisible to the ledger | **closed** | `docs/lab-core/ENVIRONMENT.json` carries `workbench` (4 occurrences) |
| FE-B3 no agent config in the repo | **open** | no `.mcp.json`, `.vscode/mcp.json`, `.codex/`, or `opencode.json` at `main` |
| FE-B4 no HTTP transport | **closed** | `cas daemon` (`bin/cli/tree.ts:44`), both planes on one port (`bin/mcp/http.ts:20-36`) |
| FE-B5 the word is absent | **closed** | `Cas/Lang/Worded.lean`; `src/cas/WordLog.ts`; `cas history` (`bin/cli/history.ts:122`) |
| FE-B6 `private: true`, bun shebang | **open** | `library/effects/package.json:4,17` |
| FE-B7 `Ts.Decl` cannot spell a view | **open** | `Cas/Backend/Ts.lean:86-90` — three arms, `const`/`prog`/`raw`; `ProgDecl` is one-parameter (`:78-82`) |
| FE-B8 `credentialEnv` has no checker | **ruled, not built** | refuse-first at boot on both hosts (`SERVING.md` §`ServePolicy`); the OWED row stands |

**The one blocker that is new and is not on anyone's list:** the word
landed on the CLI and did not land on the wire. `library/cas/mcp/cas-tools.json`
names six tools — `cas_put`, `cas_load`, `cas_run`, `cas_run_ref`,
`cas_publish_root`, `cas_list_roots` — and none of them is the word.
`/projections` serves seven emitted artifacts (`bin/mcp/http.ts:891-903`)
and store state is not among them. **A browser cannot read this store's
history today.** That is §6's first act.

---

## 1. THE TRUNK

### 1.1 What the trunk is, algebraically

The trunk is the rendering of exactly one object: **the word**.

- `Word` is `List Binding` (`Cas/IR/Word.lean:35`); a `Binding` is
  `(address : Addr32, node : Node)` (`:29-32`).
- The store is `Addr32 → Option Node` (`Cas/Core/Store.lean:21`), and
  `toStore = find`, definitionally (**L75**, `Word.lean:201`).
- The projection is many-to-one: `toStore_append_shadowed` (**L76**,
  `Word.lean:252-265`) proves an occupied append is invisible in the
  store. So the word carries strictly more than the store it projects
  onto, and **the surplus is the history** — which is precisely what a
  front end has to show and a store cannot answer.

That surplus is the trunk's whole subject matter, and the estate says so
in its own words at the carrier: "the `shared-chunk` vector's fifth
binding is history, not content" (`Cas/Lang/Worded.lean:7-9`).

**Two renderings, one object.**

- **The feed** is receipts in admission order. Its wire record is
  `WordWire.LogEntry` — `address`, `at`, `seq`, `size`, `tag`
  (`Cas/Lang/WordWire.lean:50-57`) — and the document a reader receives
  is `History = (next, word : List LogEntry)` (`:62-64`).
- **Identity** is the address. A row's address is the node's name
  because the address is a function of the canonical pre-image
  (**L96**, `addr_congr`, `Cas/Core/Address.lean:42-44`) and the host
  re-derives it on every read (**L195**, GATED, `verifyNodeBytes`,
  `src/cas/Store.ts:135-157`).

**What the running system actually persists is a projection, not the
model's word.** `WordLog.ts:14-22` says it plainly: receipts are "a
PROJECTION of the Lean model's `WordE.since` … not that operation
realized" — the model's answer carries bindings (address AND node), a
receipt deliberately drops the node. Full bindings are the join
`log ⋈ store`, stated at `WordWire.lean:36-40`. **This is the single
most consequential fact for the front end's shape**, and §3 turns it
into a layout rule.

### 1.2 Growth semantics — organic, additive, ten million entries normal

The operator's "organic, additive, ten-million-entry normal" is not an
aspiration to engineer toward; it is a consequence of laws that are
already proved.

| Property | Licensed by |
|---|---|
| A binding, once found, is found in every later word | **L63** `find_append_of_some`, `Word.lean:62-71` |
| A miss resolves in the extension, never re-resolves in the prefix | **L64** `find_append_of_none`, `Word.lean:73-82` |
| A resolved reference stays resolved as the word grows | **L68** `resolvesIn_mono`, `Word.lean:135-138` |
| Appending a resolving binding preserves admission | **L73** `wf_snoc`, `Word.lean:238-246` |
| The word only grows, by a `Sublist` of the declared put shapes, in order | **L130** `runP_puts_sound`, `Defun.lean:1672` |
| A duplicate put leaves the word unchanged | **L92**, `Handler.lean:84-86` via `Admission.lean:184` |

**Why ten million is normal rather than a scaling problem.** The read is
`w.drop mark` (W1 below) — its cost is the *suffix*, not the word — and
the mark is dense by construction, because the log is append-only with
no deletes, so "the log's `seq` order IS admission order"
(`WordWire.lean:27-31`). A trunk with ten million receipts and a cursor
at 9,999,900 pulls a hundred rows. The trunk is large; no read of it is.

**Why the growth is monotone rather than merely usually-append.** The
estate has no merge function because no two distinct values can share a
key (`FRONTEND.md:63`): the object table is a join-semilattice, the
roots table is grow-only, and the only mutable state in the system is
which addresses are published. The trunk therefore has no reconciliation
surface to design — which is the structural reason the liveness the
operator describes ("ever-increasing addition") is cheap here and
expensive in every CRDT-shaped stack.

### 1.3 What the PROVED laws let the trunk promise

These seven are landed Lean at `main` with **no row in the law ledger**
(§0). They are kernel-checked by the estate's own build gate
(`lake build` green in `check:cas`); this lane did not re-run it.

| # | Statement | Site |
|---|---|---|
| **W1** | `since` answers `w.drop mark`, a suffix of the word, **and the state is untouched** | `since_suffix`, `Worded.lean:110-115` |
| **W2** | `since 0` answers the whole history | `since_zero`, `Worded.lean:119-123` |
| **W3** | On a store operation the worded state evolves exactly as `step` evolves the word; roots unchanged | `since_cas_agrees`, `Worded.lean:134-139` |
| **W4** | The worded interpreter preserves word admission | `stepWorded_preserves_wf`, `Worded.lean:144-155` |
| **W5** | **The feed law** — at `w ++ v`, `since w.length` binds exactly `v` | `since_next`, `Worded.lean:163-167` |
| **W6** | **Marks compose** — `since (a+b)` is the page at `a`, re-marked from `b` inside it | `since_compose`, `Worded.lean:176-182` |
| **W7** | Running preserves admission through any fuel | `runWorded_preserves_wf`, `Worded.lean:197-205` |

**The trunk's promises, each traced to its licence:**

- **P1 — A receipt, once shown, never moves and never disappears.**
  W1 (the answer is a suffix), L63/L64 (`find` is stable under
  append), L68 (`resolvesIn_mono`). *Consequence for the UI: completed
  rows never re-render. This is a theorem, not a performance target.*
- **P2 — Reading from your last cursor answers exactly what happened
  since.** W5. *This is what makes a cursor a contract rather than a
  convention.*
- **P3 — A client holding a page may re-mark inside it and the store
  agrees.** W6. *This is what lets nested and paged views share one
  cursor stream with no coordination (§3).*
- **P4 — Reading history changes nothing.** W1's second half (the state
  is untouched). *This is what makes views free: a reader is not a
  writer, and no view can perturb what another view sees.*
- **P5 — No program of the worded language can un-close a store's
  history.** W4, W7, and **L45** (`step_preserves_wf`,
  `Interp.lean:119-142`).
- **P6 — An address names its bytes; a serving host cannot forge
  content.** **L96/L97** at the model (Level 0 — no injectivity
  premise), **L195** GATED at the host, and `PathReader.ts:9-14`, where
  the host is untrusted *by construction* and corruption surfaces as a
  typed refusal rather than served bytes.
- **P7 — "I cannot show you this" is exhaustive, not a fallback.** The
  refusal family is closed — six arms (`Cas/Lang/Interp.lean:28-34`) —
  and every refusal names the store law it broke (`bin/cas.ts:31`).
- **P8 — A human name is content, and saying it twice says it once.**
  `cas name` stores one annotation and publishes it as a root
  (`bin/cli/naming.ts:1-27`); content addressing makes it idempotent
  (**L197**, GATED).

### 1.4 What the trunk must NOT promise — the rows it would be leaning on

This section is the load-bearing half of the spec. Each item names the
OWED or ASSERTED row and the ruling that gates it.

**N1 — "This is the complete history of this store."** FALSE by the
log's own ruling. Content admitted before a store first opened with the
word log "is present without receipts: history begins when the log
begins" (`WordLog.ts:41-47`). *Surface rule: the trunk states the mark
it begins at; it never implies the store began there.*

**N2 — "N admissions."** The word names two different objects and a
green test asserts the divergence — `THE-ALGEBRA.md` §3.1, the ledger's
**debt rank 1**. **DISCHARGED 2026-08-31 (re-verified; stream-loop
review QE-A10)**: the CX-007 fix (`9bbcb901`) made the host append
fresh-only (`Programs.ts:592`), matching Lean's L92, and the test now
GATES the agreement instead of the divergence. The historical record
of what stood before: Lean appended only on `.fresh` (**L92**) while
the host pushed unconditionally; `shared-chunk` (five put lines, four
distinct addresses) was the registered witness.
*Design rule, derived: **the trunk renders RECEIPTS (the word log),
never `RunOutcome.word`,** until **Q1** is ruled.* The log is on the
model's side of the divergence by construction — "a duplicate put is
the identity on the store and appends nothing, exactly as the Lean
`step` leaves the word unchanged on `duplicate`" (`WordLog.ts:41-44`) —
so the trunk that reads the log is the trunk that does not have to wait
for Q1. A trunk that read a run's reply would.

**N3 — "Go back to mark N" / fork / undo.** The store is append-only,
and fork-by-prefix is the estate's whole undo story
(`PROOF-OBLIGATIONS.md` FE-O7). It rests on **L74** — `wf (w ++ v) →
wf w` — which is **OWED**: verified absent at `main`
(`Cas/IR/Word.lean` carries `wfFrom_append` at `:152` and no prefix
lemma). The docket commissions it as item **D** / `[c7] prefix-wf`
(`GRILLING-DOCKET-2026-08-29.md:177`).
*Surface rule: no view offers fork until the lemma is named.*

**N4 — "Exactly-once delivery" / "a subscription."** PDD-6 states five
laws; **none of the five is proved at `main`.** The branch
`agent/opus-cc-mac/pdd-6` sits at `main` with no work on it, and the
packet's own status is `QUEUED behind the cas-word merge`
(`.staging/wave-1/PDD-6.md:5-8`) — a merge that has since landed, so
the packet is dispatchable and undispatched. What W5/W6 give is the
*shape* of laws 1 and 2, not the laws: W5 is a single pull's answer,
where PDD-6 law 2 is that *consecutive* pulls concatenate. Law 3
(at-most-once / disjointness), law 4 (the empty-at-frontier **iff**),
and law 5 (the funnel) have no statement anywhere.
*Surface rule: the trunk POLLS and says so. "Polling `since` and
streaming it are the same operation under different handlers"
(`bin/cli/history.ts:16-20`) is true of the design and the second
handler does not exist.* The empty half of law 4 is free by computation
(`w.drop w.length = []`); the iff — that a non-empty pull implies the
word grew — is what a UI needs to promise "nothing refreshes without a
new receipt", and it is unstated.

**N5 — "Your two machines show the same history."** The word does not
sync, and this was ruled rather than deferred: "the set syncs. The word
does not. Admission order is when you learned something; it is honest
for it to be per-device" (`FRONTEND.md:70`). The carriers agree:
`at` is "epoch milliseconds on the admitting host's clock" and both
host fields are "per-device honest" (`WordLog.ts:31-35`;
`WordWire.lean:32-37`).
*Surface rule: the trunk names the store and the device. It never
presents a mark as a global position.*

**N6 — "This program will do exactly what this summary says."** The
envelope's two over-approximations are PROVED **by exhibited witnesses**
(**L138**, `Defun.lean:2135`, `:2149`), and the `puts` index and the
`dataflow` index are **different numberings** (**L140**;
`THE-ALGEBRA.md` §3.24 exhibits a consumer that reads "put 0 consumes
line 0's answer" about a put sitting at line 1).
*Surface rule: a program preview states expected kinds and does not
pair an operand with a put — the same limit `ProgProse` states in its
own file, and the reason `FRONTEND.md:250` calls that self-limiting
honesty the product.*

**N7 — "Here are the roots, in order."** Three carriers give three
answers: Lean's `stepRooted` answers `[a, a]` in publication order, the
TypeScript `RootStore` answers `[a]` in insertion order, the MCP
`cas_list_roots` answers `[a]` sorted (`THE-ALGEBRA.md` §3.8).
`publish` documented as idempotent is **L192 ASSERTED ✗**; `list` order
documented as unspecified is **L193 ASSERTED ✗**. **Q14** is unruled.
*Surface rule: a roots or names panel names the carrier it read and
does not claim an order that carrier does not promise.*

**N8 — "Verified."** Two rows forbid the word at the surface.
`Graph.verify` "succeeds exactly when the backend faithfully serves the
whole graph" is **L201 ASSERTED ✗** — neither direction proved or
gated, "faithfully" undefined — and its enumerated refusal set omits a
clause it enforces (**L202 ASSERTED ✗**, `Graph.ts:200-202` against
`:171-176`); a Lean shadow for the verb is **L203 OWED**. Separately,
SHA-256 through WebCrypto called "proved by the conformance gate" is
**L199 ASSERTED ✗** — a known-answer gate is γ-class evidence, not π.
*Surface rule: `cas verify`'s rendering says "verify reported ok" and
cites the verb. **L221** (verify reports a verdict per root, never
stopping at the first refusal) is GATED and is what the rendering may
lean on; the word "verified" is not.*

**N9 — "Every kind has a viewer."** The kind-tag registry is emitted
and gated (`generated/grammar/kindTags.ts`), and a tag it does not name
renders as bare hex — the ruled fallback, already implemented at
`bin/cli/history.ts:75-78`. *Surface rule: the trunk copies that exact
fallback rather than inventing a second one. An unnamed tag is a fact,
rendered as a fact.*

---

## 2. VIEWS AS CACHED REGISTERS

### 2.1 The move

R10 rules that a semantics is a `Handler` and `interpret` is the
induced morphism; `REGISTER-HANDLER.md:34-36` generalizes it — "the
register a person meets the system in is a choice of handler, not a
property of the system." A **view is a handler of the same word into a
surface language.** It is not a data model over the store; the front end
"never has a data model of its own" (`REGISTER-HANDLER.md:110-112`).

What makes this mechanically sound rather than a slogan is W1: reading
is **total and state-free**. A view cannot perturb what another view
sees, so views compose the way handlers do and nothing has to arbitrate
between them.

### 2.2 THE VIEW RULE — stated once, not decided per widget

> **A view holds session state only for what is not a function of the
> word. Everything that is a function of the word is recomputed from
> the wave and cached by mark — never mirrored.**

**Why this is licensed rather than chosen.** A cache keyed by `mark` is
a memo of a pure function: W1 says the answer at a mark is `w.drop
mark` with no state change, W6 says a page re-marks inside itself and
the store agrees, W5 says the cursor is trustworthy across growth, and
L130 says the word only grows. Together these mean **invalidation does
not exist** — there is only extension. That is the entire reason a
`mark` is a sufficient cache key, and it is why the decision is a rule
and not a per-view judgment call.

**The three legitimate kinds of view state, and nothing else:**

**(a) THE CURSOR — one number.** The client never computes it. The
store answers `next` in the document itself (`WordWire.lean:62-64`;
"so a client never computes its own cursor", `WordLog.ts:76-79`).
*Rule: a view stores `next` as received and sends it back unmodified.
A view that derives its own mark has left the contract.*

**(b) THE FOLD — `(mark, value)`.** A value accumulated over receipts,
stamped with the mark it is current at. Advanced by
`fold(value, since(mark))`; sound because pulls are ordered and compose
(W6). *Rule: a fold is only ever advanced or discarded to `(0, empty)`.
It is never rebuilt at an intermediate mark, because the algebra gives
no law that a partial rebuild agrees with an advance.*

**(c) THE INTENT — what the person is doing that the store has not
learned yet.** The unsent input line, the open disclosure, the filter
predicate. *Rule: intent is per-viewer, never written into the trunk,
and where it selects it must be reconstructible from the URL — the
prior lane's W-D4 (`FRONTEND.md:280`) and FE-O10.*

**What is forbidden as view state: a mirror of the store.** Any map
`address → node` held across pulls is a second store that has not
passed the read law. The read law re-derives the address on every load
(**L195**, GATED, `Store.ts:135-157`) and `PathReader` treats the
serving host as untrusted by construction (`PathReader.ts:9-14`). A
mirror discards exactly that. *Rule: cache the BYTES if the transport
cost demands it; never cache the JUDGMENT.* This is the same argument
that refused the writing browser store as a second admission authority
(`FRONTEND.md:92`), applied one level up.

### 2.3 The views, and what each holds

| View | Renders | Session state | Recomputed from the wave | Licensed by | OWED before it ships |
|---|---|---|---|---|---|
| **The trunk feed** | receipts in admission order | cursor `next`; scroll intent | every row | W1, W5, L63/L64 | — |
| **A node** | one address's bytes, decoded by kind | which address (intent) | the load, every time | L195 GATED; `kindTags.ts` dispatch | — |
| **A program** | envelope prose, kinds expected | which program | the envelope | **L4**-class projection (`ProgProse`) | N6's pairing limit must be on the face |
| **Roots / names** | published entry points, human names | which carrier | the list | `naming.ts:17-26`; L197 | **Q14** (N7) |
| **Verdicts** (`doctor`, `verify`) | per-root ok/refused, per-clause | none | the verb's answer | **L221** GATED | N8's wording; FE-O5 has no type yet |
| **The daemon** | heartbeat, metrics, refusal counts | none | the scrape | `SERVING.md` §Telemetry, GATED by `test/ServingDoc.test.ts` | — |
| **Projections** | the seven emitted artifacts | none | the fetch | `bin/mcp/http.ts:891-903`; decision 32(a) | packaging OWED (repo-checkout scope) |
| **A fork** | two futures side by side | the two marks | both prefixes | — | **L74** (N3). Does not ship. |

**On the CLI and MCP sitting near each other** (`REGISTER-HANDLER.md:165-167`):
the algebra already says why they can. The tool register **is** a
signature — `McpTool` params and results are `Ast` codes
(`Cas/Backend/Mcp.lean:6-18`), ratified as decision 18 — and both hosts
gate on the same emitted manifest before the transport is constructed
(`SERVING.md` §The two hosts). So a view of "the tools" and a view of
"the verbs" are two renderings of one described value, and putting them
adjacent is a projection, not a layout preference. What is missing is
not a design: it is that the manifest has no component-facing surface,
which is FE-O1 and is blocked (§5).

---

## 3. HOLES

### 3.1 The hole's contract is a reader

> **The UI is a surface of typed holes the trunk's additions fill.
> A hole's contract is a reader: a cursor with one operation, pull.**

PDD-6 pins the model: "a READER is a cursor — a position in the word —
with one operation, pull: `since(n)` answers the suffix beyond `n` and
the new frontier. **No other read primitive exists for reactive
surfaces**" (`PDD-6.md:25-29`).

The type is landed on both sides:

- **Model:** `WordE.since (mark : Nat)` answering `Word`
  (`Worded.lean:65-71`), with `WordedSig := StoreSig ⊕ₛ WordSig`
  (`:77`) — history entered as its own signature summand on `RootSig`'s
  exact precedent, and `CasSig` stayed frozen (`Worded.lean:25-28`).
- **Wire:** `History = (next, word : List LogEntry)`
  (`WordWire.lean:62-64`).
- **Host:** `WordLogShape.since` (`src/cas/WordLog.ts:108`), rendered by
  `cas history --json` (`bin/cli/history.ts:98-106`).

A hole is therefore `(mark, filter) → History`. That is the whole
data-flow contract.

### 3.2 The three hole states — each a theorem or a named OWED row

| State | What it means | Carrier |
|---|---|---|
| **EMPTY** | the word has not grown past this cursor | `w.drop w.length = []`, by computation from W1. **The iff — non-empty pull ⟺ the word grew — is PDD-6 law 4 and is OWED.** |
| **FILLED** | exactly what happened since | **W5** `since_next`, PROVED |
| **REFUSED** | the hole shows its clause | closed refusal family, `Interp.lean:28-34`; FE-O8 asks that adding an arm break the front end's typecheck |

*A hole never shows a spinner where it means EMPTY.* The distinction
matters and the CLI already writes both sentences — "no history yet —
receipts begin when a store first opens with the word log" versus
"nothing since mark N" (`bin/cli/history.ts:109-113`). Reuse the
wording; it is N1 rendered honestly.

### 3.3 Composition, and why a hole tree needs no coordinator

Two holes over one trunk share one cursor stream because **marks
compose** (W6): nesting a hole inside a page is `since (a + b)`, and
the theorem says what the store answers at the composed mark IS the
page re-marked from inside. So a parent may hand a child a sub-range of
its own page without a round trip, and the store will agree when the
child later pulls for itself. *That is the licence for a hole tree with
no coordinator — the property most component systems buy with a
scheduler.*

### 3.4 The one thing a hole may not do — and the layout rule it forces

A receipt is `address`, `at`, `seq`, `size`, `tag`
(`WordWire.lean:50-57`). It is deliberately less than a binding: "the
store already holds the bytes, so the log never becomes a second byte
plane" (`WordLog.ts:37-40`). The node half is the join `log ⋈ store`
(`WordWire.lean:36-40`), and every such load re-derives its address
(**L195**).

**Consequence, and it is the trunk's layout rule:** a **row** is
computable from the receipt alone and costs nothing at ten million; a
**body** requires a load and costs one read law per open. Therefore
the trunk is **rows-first, bodies on demand** — not as a performance
convention but because the two are different objects with different
carriers. This is also the mechanical form of the prior lane's
density rule, which derived exactly two levels of resolution from
`VOCABULARY.md`'s everyday/protocol split (`FRONTEND.md:279-281`) and
called it "the single strongest 'our language gives us the UI' claim
available".

### 3.5 Pinned holes are filters today, not subscriptions

A hole pinned to an address set is **PDD-6 law 5, the funnel** — "a
reader pinned to an address set receives exactly the receipts whose
address lies in the set — no loss on the pins, no leakage across them"
(`PDD-6.md:45-48`). It is OWED. *Until it lands, a pinned hole is
implemented as filter-after-pull and must be described as such. Calling
it a subscription would claim law 5 and law 3 at once, and neither is
stated.*

---

## 4. PROGRAM VISIBILITY

"At the limit you peek at the daemon or the Lean process running, as an
effect, rendered" (`REGISTER-HANDLER.md:150-152`).

### 4.1 Renderable today, with its carrier

**(a) The daemon's own life — and this is the cheapest, highest-value
surface in the whole document.** The heartbeat is one logfmt line every
2 s carrying the full metric snapshot, `lateMs` is the measured stall,
and **a missing beat is a stall in progress** — "the only sensor that
works when the event loop is blocked, because it is the absence of
output" (`SERVING.md` §Telemetry). The log field vocabulary is
*versioned law*: `message=request` with `seq`/`plane`/`method`/`path`/
`status`/`ms`, `message=heartbeat`, the per-tool lines, the boot banner
(`SERVING.md` §The log stream), and **the whole factual vocabulary is
re-derived against the document by `test/ServingDoc.test.ts` on every
test run** — "a fact here that drifts from the estate is a red gate,
not a stale sentence" (`SERVING.md:14-21`). A liveness panel is
therefore a rendering of a gate-checked field set, buildable today,
with drift caught by an existing gate.

**(b) Metrics.** Eight named instruments at `/metrics`
(`SERVING.md` §Telemetry), including `cas.host.refused` **by clause** —
which is the verdict surface's raw material — and `cas.replica.age_ms`
where `-1` means unmeasured and one startup line says why.
*Rule: `-1` renders as "unmeasured", never as `0`. That is the estate's
own `—`-never-`0` discipline (`FRONTEND.md:296`) meeting a carrier that
already refuses the silent zero.*

**(c) The projections.** Seven emitted, byte-gated artifacts served
read-only at `/projections` (`bin/mcp/http.ts:891-903`), released to the
daemon by **decision 32(a)**. An un-emitted projection answers 404,
"because an un-emitted projection is a fact" (`SERVING.md:63-65`), with
`mise run gen` named as its fix. This is tier-0 serving and it is live —
`FRONTEND.md`'s static-host story is superseded here.

**(d) A program before it runs.** `Cas.Lang.Envelope` is computed from
the table alone and `ProgProse` verbalizes it — "a projection, not a
generation" — with its limits stated in the same file
(`FRONTEND.md:250`). Renderable, subject to N6.

**(e) The store's own history.** `cas history --json`
(`bin/cli/history.ts:122-142`), emitting the registered spelling
canonically printed — "the exact document the front end renders and a
subscription will replay" (`:102-105`).

### 4.2 What needs a lane — named, not built

**(f) The word over the wire. THE MISSING WIRE.** Verified at `main`:
`cas-tools.json` names six tools and none is the word; `projectionSources`
lists seven artifacts and store state is not among them. So (e) is
CLI-only. **The daemon can serve a browser everything about itself and
nothing about the store's history.** This is §6's first act and it is
the shortest path from the landed algebra to a rendered trunk.

**(g) The Lean process, as an effect.** Not licensed by anything landed.
The only oracle-shaped signature is `LlmSig` (`Cas/Lang/Ops.lean:36-43`),
and its handler `handleLlm` is one of the three semantics that live
*outside* the handler algebra R10 says every semantics is
(`THE-ALGEBRA.md` §3.4(a); **L30/L31/L32 OWED**, **Q4** adjacent).
*So "peek at the Lean run as an effect" has no carrier today.* Its first
honest form is (a)+(b): decision 20 already made the argument — "the
word is already the trace; self-awareness is the police lane applied to
the running estate" (`docs/SPECS.md`, decision 20).

**(h) Streaming.** The design says polling and streaming are one
operation under two handlers (`history.ts:16-20`). The second handler is
what PDD-6 laws 3–5 would license (N4).

---

## 5. EASY / HARD — derived, not estimated

### 5.1 EASY, and the law that makes it easy

| Element | Easy because | Carrier |
|---|---|---|
| the feed, in admission order | reading is a total, state-free suffix | **W1**, **W2** |
| incremental append; completed rows never re-render | the word only grows and `find` is stable under it | **L63**, **L64**, **L68**, **L130** |
| ten million entries | the pull costs the suffix; `seq` dense by construction | **W1**; `WordWire.lean:27-31` |
| a cursor a client can trust | the store computes `next` | **W5**; `WordWire.lean:63`; `WordLog.ts:76-79` |
| paged and nested views, no coordinator | marks compose | **W6** |
| a cache keyed by mark | no invalidation exists, only extension | **W1** + **W6** + **L130** |
| views cannot interfere | reading changes nothing | **W1** |
| the address chip as identity | address is a function of the canonical pre-image; re-derived on every read | **L96/L97**; **L195** GATED |
| an untrusted serving host | the read law is above the seam; corruption is a typed refusal | `PathReader.ts:9-14` |
| exhaustive "cannot show you this" | the refusal family is closed | `Interp.lean:28-34` |
| the environment/liveness page | ledgers emitted and gated; serving facts re-derived against the doc | `ENVIRONMENT.json`; `SERVING.md:14-21` |
| human names on nodes | names are annotations published as roots; idempotent by addressing | `naming.ts:1-27`; **L197** |
| density with two levels, not a slider | derived from the everyday/protocol register split | `FRONTEND.md:279-281` |
| no merge function to design | no two distinct values share a key | `FRONTEND.md:63` |

### 5.2 HARD, and the row that makes it hard

| Element | Hard because | Row | Gating ruling |
|---|---|---|---|
| **any count of "admissions"** | ~~the word names two objects~~ **DISCHARGED 2026-08-31**: host and model agree fresh-only (`9bbcb901`; L210/L227 re-verified) — counts are now safe; Q1's residue is L228 (cross-host binding-level word equality, compared nowhere) | L210 ✓, L227 ✓, L228 open | Q1 softened to L228's residue |
| **fork / undo / "go back"** | prefix admission has no named lemma | **L74 OWED** (absent at `Word.lean`) | docket **D** / `[c7] prefix-wf` (`GRILLING-DOCKET:177`); FE-O7 |
| **a subscription rather than a poll** | at-most-once, the empty-at-frontier iff, and the funnel are unstated | PDD-6 laws 3, 4, 5 | **PDD-6 dispatch** — QUEUED behind a merge that has landed |
| **a browser reading history at all** | there is no word tool and no history route | `cas-tools.json` (6 tools); `http.ts:891-903` | FRONTEND **ask 3** — **absent from the docket** (`PROOF-OBLIGATIONS.md` §0) |
| **a generated component per described kind** | the Ts fragment cannot spell a view | `Ts.lean:86-90`; `ProgDecl` one-parameter `:78-82` | FRONTEND **ask 6** — **absent from the docket**; blocks FE-O1/O2/O3 entirely |
| **a roots / names list with a stated order** | three carriers, three answers | **L192 ✗**, **L193 ✗**; §3.8 | **Q14** |
| **a program's dataflow, drawn** | two different numberings; the envelope over-approximates, exhibited | **L138** (witnesses), **L140**; §3.24 | none — statable today; the surface must not pair operands |
| **the word "verified" anywhere** | the verb's biconditional is unproved and its refusal set under-reported | **L201 ✗**, **L202 ✗**, **L203 OWED**; also **L199 ✗** | none — C5 forbids the word until a judgment is named |
| **a browser that writes** | a second admission authority in the least-controlled process | `FRONTEND.md:92` | FRONTEND ask 2 — tier 2 behind its own ruling |
| **remote / multi-user** | credentialed reads refuse at boot, by ruling | `SERVING.md` §`ServePolicy`, §OWED | FRONTEND **ask 4** — **absent from the docket** |
| **`npx cas`** | `private: true` + a bun shebang | `package.json:4,17` | FRONTEND ask 11 → decision 26 seat 2 |
| **an agent config a client can read** | none exists in the repo | verified absent at `main` | FE-1 `emitagents` — decision 23 wave 2 |
| **components as store content** | `Html = VNode \| null` is an opaque runtime object; only the DESCRIPTOR is addressable | `FRONTEND.md:169` | — (say it before anyone designs it) |
| **MCP protocol currency** | revision `2026-07-28` is not offered; it needs a stateless adapter at a future pin | `SERVING.md` §The protocol ceiling | FRONTEND ask 10 → docket Tier 2 item 17 |

**The pattern worth naming.** Nine of the fourteen hard rows are hard
for the same structural reason: **the algebra is silent about a
distinction the surface would have to make** — how many admissions,
which prefix, which delivery, which order. None of them is hard because
of rendering, layout, or framework. That is the design method paying:
the front end's real cost curve is the law ledger's, not the UI's.

---

## 6. THE FIRST SLICE — FT-1

**Constraints it must satisfy, all four:** blockers-first
(`FRONTEND.md` §1); foldkit is the chassis (decision 21 addendum); no
new abstractions (decision 2); and it must not wait on a ruling that
has not been asked. It must also not collide with the ornamentation
lane, whose ranked #1 is the `Ts.Decl` arrow arm — which is blocked and
un-docketed (`PROOF-OBLIGATIONS.md` §0), so **FT-1 routes around the
component emitter rather than queuing behind it.**

### FT-1a — SERVE THE WORD

Add one read-only host route to the daemon that answers the document the
CLI already answers.

- **Shape.** `GET /history?since=<mark>` on the daemon's host plane,
  beside `/projections` and `/metrics`, answering the canonical JSON of
  `wordHistorySchema` — byte-for-byte the document
  `cas history --json` prints (`bin/cli/history.ts:98-106`).
- **Why a host route and not a seventh tool.** The tool plane is
  documents-in/documents-out and its table is emitted from
  `Cas/Backend/Mcp.lean`, which both `THE-ALGEBRA.md` and PDD-6 fence
  off ("`Cas/Backend/Mcp.lean` untouched", `PDD-6.md:72`). A seventh
  tool is a Lean edit plus a manifest versioning event. A read-only
  co-tenant route is what **decision 32(c)**'s additive §14 already
  ruled the port may carry (`SERVING.md` §Co-tenancy), and
  `/projections` is its landed precedent.
- **Nothing is minted.** The seam exists (`WordLog.ts:108`), the record
  is registered and byte-gated (`generated/WordLogSchema.ts`, emitted
  from `WordWire.lean` by `lake exe emitword`), the router pattern
  exists (`bin/mcp/http.ts:866-946`), and the refusal shape exists
  (`refusedResponse`, `:928`).
- **What it must not do.** No writes. No trust in a client-supplied
  mark beyond its use as a `drop` index — W1 makes that safe by
  construction, and it is the only safety claim made. The Origin and
  Host allowlists apply unchanged (`SERVING.md` §Security posture): a
  front end served from another origin needs `--allow-origin`.
  Credentialed stores stay refused at boot.
- **Gate.** One test that the route's body at mark *m* is byte-identical
  to `cas history --json --since m` over one store. That is the ratified
  two-register law applied to a new surface — the law
  `cas put --program --json` currently falsifies (**L220 ✗**), so the
  new surface should be born on the right side of it.

### FT-1b — THE TRUNK, ONE HOLE, IN THE WORKBENCH

One foldkit view over one reader.

- **The model is `(mark, rows)` and nothing else** — the cursor and the
  fold of §2.2, and no third thing. No store mirror, therefore no second
  admission authority and no cached judgment.
- **A row is the receipt alone:** `seq`, `at`, `address`, kind, `size`.
  Kind names come off the generated registry, with **the exact fallback
  the CLI already uses** — bare hex for a tag the registry does not name
  (`bin/cli/history.ts:75-78`, decision 25's rule).
- **Growth is `since(next)` on an interval, appending only.** Completed
  rows never re-render — licensed by L63/L64, not by memoization
  discipline. This is also why the graph view stays refused: a
  force layout reflows on every put (`FRONTEND.md:282`).
- **Empty is a sentence, not a spinner** — reuse `history.ts:109-113`'s
  two wordings verbatim.
- **On its face, always:** which store, from which mark the log begins,
  and whose clock the timestamps are (N1, N5).
- **Hand-written, not emitted.** It is the "author the presentation"
  half of decision 21's ruled split, and it becomes the first
  *registered override* when the component emitter lands — never a
  fork.
- **Gate: it already exists.** `check:workbench` is in the `check` chain
  and in `ENVIRONMENT.json` (FE-B2 closed), so this slice ships under a
  gate nobody has to build.

### What FT-1 deliberately does not do

| Not done | Waiting on |
|---|---|
| fork / undo | **L74** (N3) |
| a subscription | PDD-6 laws 3–5 (N4) |
| ~~any admissions counter~~ **RETIRED 2026-08-31** — N2 discharged (see §1.4 N2); counters are safe and the face-facts line ships one (TRUNK-PLAN) | — |
| a roots panel | **Q14** (N7) |
| generated components | FRONTEND ask 6 (un-docketed) |
| any write from the browser | FRONTEND ask 2, tier 2 |

**Done means:** with `cas daemon` running, a browser tab shows this
store's history growing while another process puts into it; every row is
a receipt the CLI prints identically; nothing in the tab can change the
store; and the tab says which store, from which mark, and on whose
clock.

---

## 7. Ruling asks from this spec

1. **Serve the word — where?** `GET /history` as a daemon host route
   beside `/projections` (this spec's recommendation, because it needs
   no Lean edit and rides decision 32(c)'s ruled co-tenancy), or the
   word becomes the seventh MCP tool — a `Mcp.lean` event that both
   PDD-6 and this spec fence off.
2. **~~Ratify the receipts rule~~ — RETIRED 2026-08-31.** The premise
   (Q1 open, debt rank 1) is DISCHARGED: host and model agree
   fresh-only (`9bbcb901`; §1.4 N2). Receipts-first remains the
   trunk's design as a matter of architecture (the log is the
   object), no longer as a quarantine.
3. **Recognize `prefix-wf` as the front end's licence.** Docket item
   **D** / `[c7] prefix-wf` and **L74** and FE-O7 are plausibly one
   lemma. Confirming that at merge, rather than duplicating it, gives
   the product's most-used gesture a named carrier.
4. **FRONTEND ask 6 is still absent from the docket.** The `Ts.Decl`
   N-parameter arrow arm blocks FE-O1/O2/O3 and every "components as
   projections" claim. FT-1 routes around it; the component lane cannot.
5. **Dispatch PDD-6.** Its stated blocker (the cas-word merge) has
   landed; its branch is empty; its laws 3–5 are exactly the difference
   between a trunk that polls and a trunk that subscribes.

---

## Provenance

Estate citations resolve at `main` @ `a07768ad` and were read via
`git show main:<path>` on 2026-08-30. Law numbers, status words, and
`Q`-numbers are `THE-ALGEBRA.md`'s (itself **PRE-GRADE and ungrilled**);
`W1`–`W7` are this document's local numbering for landed theorems the
ledger has no rows for (§0), and assigning them real numbers is owed to
the next pass over that document. No gate was run by this lane: where a
Lean theorem is called kernel-checked, the judgment named is the
estate's own `lake build` in `check:cas`, not a re-run here. No external
source is cited.

*Pre-grade. Awaiting the operator's grilling pass.*
