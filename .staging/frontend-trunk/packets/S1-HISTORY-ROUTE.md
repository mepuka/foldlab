# CONTRACT PACKET — S1 / Lane A: `GET /history`

Breaker: opus-5 (Mac coordinator session), 2026-08-31.
Implementer: **not this session, ever** (`implement` skill, two-role law).
Subject: TRUNK-PLAN.md §3 "LANE A — S1: serve the word" and §6
"Lane A (the route)"; SPEC.md §6 FT-1a.

**Read-only to the implementer.** A defect in this packet or in its
battery is a BLOCK back to the breaker, in writing — never an edit.
The implementer's commits touch neither file.

**Pin obligation (CONTRACT.md §The pin).** This packet is staged at
the operator's ordered path. Its same-tree home is
`library/effects/test/contracts/S1-history-route.contract.md`; the
promotion is owed at the operator's commit, and until then the two
battery files carry the staging path in their headers.

---

## CATEGORIES

The dispatch carried **no** taxonomy tags. The breaker assigns these
and says so (BREAKER.md step 1 licenses the addition):

`contracts` · `specification-design` · `abstraction-modules` ·
`representation-invariants` · `termination` · `loops` ·
`arrays-search` · `mutation-frames` · `inductive-data`

Falsifier shapes drawn from those rows, by name: *adequacy gap*
(§1.4), *caller leans on the body* (§1.4/§2.7), *determinism assumed
not granted* (§1.4), *predicate too weak* (§8.0), *the sorting
trinity* read as the page's three conjuncts (§8.0/§8.3),
*α-commutation failure* (§9.3), *valid in, broken out* (§10.1),
*abstraction disagrees* (§10.0/§10.2), *no strict decrease* (§3.0),
*stuck window* (§13.2), *boundary shift* (§12.3/§13.7), *wrong
witness* (§13.1), *unlisted write* (§14.0/§14.2), *round-trip
failure* (§7.0).

## DEGREE — the packet's opening claim

I have shown algebraically that this slice can be implemented to the
degree of: a **total decode at the door**, a **closed-form page
function** with its `next`, a **homomorphism square across the three
seam realizations**, a **terminating drain with a named variant**, an
**empty frame**, and **byte-level conformance to one printed
document**. Every law below carries an executable falsifier against
the TypeScript. No law here is a Lean statement; nothing on this
surface escalates (the wire record is already emitted and byte-gated,
and this slice does not touch it). **No soundness word attaches to any
of it** (estate C5).

## OBLIGATION CLASSES that apply

`domain` · `contract` · **`adequacy`** · `invariant` · `termination` ·
`frame` · `abstraction` · `conformance` · `claim-scope`

`adequacy` is the class this packet turns on: **five of the six ways
this slice goes wrong pass every naive behavioural test.** They are
exhibited in §Adversarial implementations and each is killed by a
named battery case.

---

## The model

Let `w` be the store's word — its receipt list — at the instant of one
read. `|w|` is its length, `w[i]` the receipt at mark `i`, `w.drop m`
the suffix from `m`.

**Density (standing invariant, not this slice's to establish):**
`∀ i < |w|. w[i].seq = i`. Enforced by `INTEGER PRIMARY KEY` +
`COALESCE(MAX(seq),-1)+1` in the SQL realization and by
`markOutOfOrder` in the file realization (`WordLog.ts:347-358`,
`:478-482`). This slice must PRESERVE it and may not repair it.

Write `m'` for the decoded mark and `L'` for the decoded, clamped
limit. Then:

```
page(m, L)  =  (w.drop m').take L'

next(m, L)  =  if m' ≥ |w|  then  |w|            -- the true cursor
                            else  m' + |page|     -- resume here

body(m, L)  =  { next: next(m, L), word: page(m, L) }
```

Both branches are needed and neither is redundant:

- `next = |w|` **always** is wrong under truncation — a client
  resuming at the tip after a truncated page SKIPS every receipt the
  page did not carry.
- `next = m' + |page|` **always** is wrong past the end — a caller who
  overshot is handed back its own out-of-range mark and never learns
  where the word ends, contradicting the seam's standing sentence
  ("A mark past the end still answers the true cursor",
  `WordLog.ts:104-107`).

With `L' ≥ 1` enforced (§L-A6), the branch condition collapses to the
observable one: `page = [] ⟺ m' ≥ |w|`. That biconditional is what
makes SPEC §3.2's EMPTY state decidable from the document alone, and
it is the reason `limit = 0` is refused rather than answered.

### §6's seed is wrong as written — the first strengthening

> §6 Lane A, bullet 1: "`next` ≡ the word's length."

**False under bullet 5's `limit`.** A truncated page's `next` is
`m' + |page|`, which is `< |w|` exactly when the page is truncated.
The seed and the limit contradict each other; TP-17 named the problem
and did not write the formula. The packet writes it, above, and the
battery holds the route to it at both branches.

---

## REQUIRES

- The store is open, its word log readable, and its word `wf` in the
  seam's own sense (dense from zero; `markOutOfOrder` has nothing to
  say about it). A word that is NOT wf is a typed refusal from the
  seam and stays one — this slice does not soften it.
- **Run-relative:** every law below is stated about ONE word `w`,
  the word as of the pull. Laws quantified over a growing word are
  named as such and are OWED (§Claim scope).
- The request has passed the front door (Host + Origin allowlists,
  `decideDoor`, `http.ts:714-760`). This slice changes nothing there:
  a browser on another origin still needs `--allow-origin`.

## ENSURES  (two-state; `old` = the word at the start of the pull)

1. `body = { next: next(m,L), word: page(m,L) }` for the decoded
   `(m', L')`, over `w = old(w)`.
2. `w = old(w)` — the word is unchanged, and so is every other plane.
3. The response body is the **canonical printing** of
   `wordHistorySchema`'s encoding of `body` — the same bytes
   `cas history --json` prints.
4. A request that does not decode produces a typed refusal on the
   `history` plane, and NO read is attempted.

## DECREASES

The drain chain `m₀ = m`, `mₖ₊₁ = next(mₖ, L)`.
Variant: `d(k) = max(0, |w| − mₖ)` into `(ℕ, <)`.
While `mₖ < |w|`: `L' ≥ 1` ⟹ `|page| ≥ 1` ⟹ `mₖ₊₁ ≥ mₖ + 1` ⟹ `d`
strictly decreases. At `mₖ ≥ |w|`, `next = |w|` is a fixpoint and the
chain has drained.

**`limit = 0` is refused because of this line, not by taste.** A page
of zero is the §13.2 *stuck window*: the variant does not decrease and
a draining client spins forever on a store that is answering it 200.

## FRAME

- **Reads:** the word log's read side only — `cas_word` rows on the
  SQL realization, `word.jsonl` on the file realization, the entries
  array on the memory one.
- **Writes:** ∅. Not the byte plane, not `cas_roots`, not the word.
  No repair, no renumbering, no lock taken.
- **Aliasing:** none. The route holds no client state between pulls;
  the cursor lives with the caller (SPEC §2.2(a)).

---

## THE LAWS, their licences, and their falsifiers

Battery files:
- **`library/effects/test/WordLogPaging.test.ts`** — the seam (`S-*`).
- **`library/effects/test/DaemonHistoryRoute.test.ts`** — the route,
  the registers, the door, the record (`R-*`).

### L-A1 — Suffix identity, positionally

```
LAW        For every m with 0 ≤ m and |w| ≤ cap and the default limit:
             body(m).word[i] = w[m'+i]  for all i < |page|
             |page| = |w| − m'          when m' ≤ |w|
             body(m).next  = |w|
LICENCE    W5 `since_next` (Worded.lean:163-167) for the feed; W1
           `since_suffix` (:110-115) for suffix-ness; W2 `since_zero`
           (:119-123) for m = 0.
FALSIFIER  exhibit m and i with body(m).word[i] ≠ w[m'+i], or a page
           whose length is not |w| − m', or next ≠ |w| on an
           untruncated read.
BATTERY    R-1 (marks 0, 1, |w|−1, |w|, |w|+3), S-1
```

The positional form is deliberate and is a **strengthening** of §6's
"no row not in the word, no reorder": set equality passes an
implementation that re-sorts by `at`; `word[i] = w[m'+i]` does not.
(*wrong witness*, §13.1.)

### L-A2 — Density is preserved, never repaired

```
LAW        ∀ i. body(m).word[i].seq = m' + i
LICENCE    the seam's own order law (WordLog.ts:225-228: "order is
           semantics and a filtered row would silently renumber
           history"); invariant class.
FALSIFIER  exhibit a page whose seqs are not m', m'+1, …; or a word
           with a defect where the route ANSWERS instead of refusing.
BATTERY    R-1, S-1, S-8
```

### L-A3 — Paging composes on a FIXED word

```
LAW        For w unchanged across the chain and any L ≥ 1:
             concat(page(m₀,L), page(m₁,L), …) = w.drop m₀
           with mₖ₊₁ = next(mₖ,L), and the chain terminating.
LICENCE    W6 `since_compose` (Worded.lean:176-182) — "since (a+b) is
           the page at a, re-marked from b inside it". THE FIXED-WORD
           HALF ONLY.
FALSIFIER  exhibit a fixed w, L, m₀ where the concatenation has a gap,
           an overlap, a duplicated receipt, or does not terminate.
BATTERY    S-2 (memory), S-2b (sqlite + file), R-2 (over HTTP)
```

**Which side this stands on (TP-25, executed).** W6 is landed and
covers a word that does not grow. The GROWTH half — that consecutive
pulls across an APPEND concatenate — is **PDD-6 law 2 and is OWED**
(`.staging/wave-1/PDD-6.md`; SPEC :248-252). No battery case asserts
it, deliberately. The battery therefore freezes the word for every
composition case, and the packet records the gap rather than papering
it with a green test that would claim an unproved law.

### L-A4 — Reading is state-free

```
LAW        pull ; pull  ≡  pull            (as answers)
           w_after = w_before               (as state)
LICENCE    W1's second half — the state is untouched
           (`since_suffix`, Worded.lean:110-115); SPEC P4.
FALSIFIER  (a) exhibit two identical pulls with different bytes;
           (b) exhibit a pull after which since(0) differs;
           (c) [file realization] exhibit a pull after which
               word.jsonl's bytes differ.
BATTERY    R-3 (a,b), S-3 (b,c)
```

**Judgment call, stated.** §6 says "store bytes untouched". The
battery asserts that **at the word's own observable everywhere**, and
at the **filesystem only on the file realization**. SQLite in WAL mode
may legitimately touch `-wal`/`-shm` on a read connection; a
filesystem-level assertion against the SQL store would be flaky-or-
false and would say nothing about the word. Narrowing it is honesty,
not weakening: the claim that matters is that the WORD does not move.

### L-A5 — Two registers, one document

```
LAW        assemble(route-drained at m)  =  cas history --json --since m
           byte for byte, canonical printing.
LICENCE    the ratified two-register law (SPEC §6 FT-1a "Gate"; the
           law `cas put --program --json` falsifies as L220 ✗ — the
           new surface is born on the right side of it); TP-16's
           restatement.
FALSIFIER  exhibit m where the two byte strings differ.
BATTERY    R-4
```

**The anti-tautology clause (TP-16's worry, closed).** The two sides
must differ in TRANSPORT: one is N HTTP requests against a booted
daemon, assembled BY THE TEST; the other is one invocation of a real
`bun bin/cas.ts history --json --since m` child process. The
assembly on the route side is the test's own code, never shared
production code. A gate that drove the CLI to produce both sides
would be comparing the CLI to itself and is refused here by
construction.

**What this law does and does not do.** If the route prints through
the same `canonicalJson(Schema.encodeSync(wordHistorySchema)(…))` the
CLI uses — which is the intended discharge — then L-A5 is nearly a
tautology and proves little on its own. **L-A1 is the load-bearing
law**; L-A5 is the register law on top of it. Stated so the
implementer does not mistake a green L-A5 for a proved route.

### L-A6 — Bounds, decided and stated

```
LAW   (a) default = cap = 10 000 receipts, ONE exported constant,
          NAMED: `wordLogPageLimit`, exported from src/cas/WordLog.ts.
          The route imports it; it does not declare a second.
      (b) L absent            ⟹ L' = cap
      (c) L > cap             ⟹ L' = cap        (CLAMP, status 200)
      (d) L = 0               ⟹ REFUSED, typed  (status 400)
      (e) L beyond the suffix ⟹ the suffix, unpadded, status 200
      (f) next is monotone non-decreasing along any chain, and
          strictly increasing while the page is non-empty
LICENCE    stream-loop review parameter #11 (10⁴ ≈ 900 KB); QE-A2;
           TP-17; the DECREASES line above for (d).
FALSIFIER  (a) exhibit two constants that can drift, or a cap ≠ 10⁴;
           (c) exhibit limit=cap+1 answering cap+1 rows (unclamped),
               OR exhibit limit=10⁹ REFUSED (over-refusal breaks the
               only client the route exists for);
           (d) exhibit limit=0 answering 200;
           (e) exhibit a page longer than the suffix, or a refusal;
           (f) exhibit a chain where next moves backwards or stalls.
BATTERY    S-4 (a,b,c,e), S-5 (d), R-5 (b,c,d,e), R-2/S-2 (f)
```

**Ruling: over-cap CLAMPS, zero REFUSES. Both are the breaker's
call and both are stated as calls.**

- *Clamp* because `limit` means "at most n": answering at most 10⁴ to
  a request for at most 10⁹ is a **true** answer to the question
  asked, and the truncation is fully observable through `next`. The
  seam's own prohibition — "a seam that silently answers a different
  question than the one it was asked is the one thing the receipts
  plane must never do" (`WordLog.ts:129-131`) — is not engaged,
  because the question's truth conditions are preserved. Refusing
  instead would kill the browser that hardcodes a large page rather
  than paging it.
- *Refuse* at zero because there is no meaning-preserving clamp: 1
  answers more than asked, the cap answers vastly more, and 0 itself
  is the *stuck window*. The variant argument above is the whole
  reason.

**Cap testability — a stated composition, not a fake.** The cap is
tested at the SEAM (10 001 appends into the memory realization —
cheap, deterministic) and at the ROUTE by (i) the exported constant's
value, (ii) `limit=10⁹` answering 200 rather than refusing, and (iii)
the route's default page being the seam's default page. The route's
clamp is thereby established by composition with S-4 rather than by
seeding 10 001 receipts through HTTP. Flagged as a judgment call.

### L-A7 — The door decodes; it does not coerce

```
LAW        A query parameter is a STRING at the wire, and mark/limit
           are DECODED from it, totally:
             accepted ⟺ /^(0|[1-9][0-9]*)$/ and ≤ 2^53−1
           `since` absent ⟹ 0 (W2). `limit` absent ⟹ cap.
           Everything else REFUSES 400: "-1", "1.5", "1e3", "+1",
           " 1", "0x10", "01", "", "abc", "NaN", "Infinity",
           "9007199254740993".
LICENCE    §6 "malformed params refuse typed, never coerce", read at
           its strongest; the estate's decode-at-the-boundary posture
           (`decodeEntry`'s "a table is external data, whatever the
           query's nominal type says", WordLog.ts:270-271); the
           daemon's fail-closed door.
FALSIFIER  exhibit any string outside the grammar that answers 200.
BATTERY    R-6
```

**A second strengthening, stated.** The SEAM floors a negative or
fractional mark (`flooredMark`, `WordLog.ts:132-141`) and that stays
untouched — it is gated wording (`CliHistory.test.ts:188-200`). The
ROUTE is stricter: `?since=-5` answering the whole history is exactly
the "different question" hazard, and at the wire there is no `number`
to be lenient about. The accepted set is the canonical decimal
encodings of ℕ — one string per mark — which also keeps the parse
total and the door's answer set free of aliases. **Refusing `01` is
the sharpest edge of this ruling; the operator may relax it to
`/^[0-9]+$/` and the falsifier stands either way.**

### L-A8 — The address-not-value line, as a FAIL-CLOSED door

```
LAW        The route accepts EXACTLY the query keys {since, limit}
           and REFUSES 400 on any other key — including but not
           limited to tag, address, column, size, at, kind, q, from,
           to, filter, etag.
LICENCE    QE-A3 as adopted (QUERY-ENGINE.md:130-137): "the server may
           execute anything whose answer is an ADDRESS, and nothing
           whose answer is a computed VALUE… refuses any ?tag=/?column=
           route… Word-INDEX arithmetic (mark/limit/from/to) is safe;
           receipt-FIELD predicates are not." QE-1. TRUNK-PLAN §3
           Lane A "Explicitly NOT".
FALSIFIER  exhibit a request carrying an unknown key that answers 200.
BATTERY    R-7
```

**The third strengthening, and the one that matters most.** §6's seed
is "no parameter filters by receipt field" — a **behavioural** claim,
and it is *predicate too weak* (§8.0). An implementation that silently
IGNORES `?tag=1` satisfies it while being strictly worse than one that
refuses: the client believes it received a filtered answer and folds
a lie. The contract is therefore the **door**, not the behaviour. This
also makes the line hold against future creep with no further ruling:
the day someone adds `?column=`, an existing red test says no.

`from`/`to` are refused here **on scope, not on capability** (TP-7):
`since+limit` already IS a ranged read. The refusal is the packet's,
and lifting it is a ruling, not an implementation choice.

### L-A9 — The refusal wears the plane's own media type

```
LAW        planeOf("/history") = "history" ≠ "cas-http/0".
           Every refusal on the route answers JSON {refused, why, fix}
           through `refusedResponse`, and every request logs
           plane=history.
LICENCE    SERVING.md §The log stream + `refusedResponse`'s own law
           ("a plane's content type is its law, and a body in the
           wrong one is worse than no body", http.ts:632-643).
FALSIFIER  exhibit a refused /history request whose body is EMPTY, or
           a request log line with path=/history and plane=cas-http/0.
BATTERY    R-8
```

**Why `planeOf` is contract and not a chore (TP-16, sharpened).**
`refusedResponse` branches on the plane: an unextended `planeOf`
returns `"cas-http/0"`, and every refusal on this route goes out
**octet-bare with no body at all** — the operator sees a naked 400 and
the client sees nothing. The doc chore and the correctness of the
refusal surface are the same edit.

### L-A10 — Method and status discipline under §14

```
LAW        GET /history            → 200 (never 404, even on an empty
                                     word: {"next":0,"word":[]})
           POST|PUT|DELETE /history→ 405 from the CO-TENANT
                                     (never 400 from the profile table)
           foreign Origin          → 403, unchanged
LICENCE    PROFILE-CAS-HTTP-0 §14: the profile's status table "does not
           answer exchanges inside a declared co-tenant prefix", and
           §14's /mcp row shows the shape ("405 on the wrong method is
           the adapter's").
FALSIFIER  exhibit an empty store answering 404; exhibit POST /history
           answering 400; exhibit a foreign Origin answering 200.
BATTERY    R-9
```

A 404 on the empty word would make "no history yet" indistinguishable
from "no route" — the exact confusion SPEC §3.2 forbids ("A hole never
shows a spinner where it means EMPTY").

### L-A11 — The wire is FROZEN; truncation teaches nothing extra

```
LAW        Object.keys(body).sort() = ["next","word"]
           Object.keys(body.word[i]).sort() =
             ["address","at","seq","size","tag"]
           No hasMore, no total, no tip, no cursor, no _links.
LICENCE    `generated/WordLogSchema.ts` is emitted from
           `Cas/Lang/WordWire.lean` and byte-identity-gated; adding a
           field is an emitter change plus a gate, i.e. a different
           slice. TP-17: "v1 needs no 'more remains' fact (the face
           count is the fold's)".
FALSIFIER  exhibit a response body carrying a key outside the frozen
           record.
BATTERY    R-10
```

Asserted on the **parsed JSON's keys**, not through `Schema.decode` —
Effect's struct decoding strips excess properties by default, so a
decode-round-trip would pass a body carrying `hasMore` and the
round-trip falsifier (§7.0) would be answered by the wrong equation.

### L-A12 — The three realizations agree (the homomorphism square)

```
LAW        For every word content, mark and limit:
             body_memory(m,L) = body_sql(m,L) = body_file(m,L)
           i.e. `since_L` commutes with the choice of realization.
LICENCE    abstraction class; §9.3 α-commutation; the seam's own claim
           that "the same history comes out of a directory store and a
           database store" (CliHistory.test.ts header).
FALSIFIER  exhibit a word, m, L where two realizations disagree in any
           field, in `next`, or in refusing.
BATTERY    S-6
```

Not in §6's seed. Added because `limit` is being written **three
times** (TP-5) and three hand-written paging implementations that were
never held to each other is the standard way this defect ships.

### L-A13 — The bound gate (QE-A2's closure), in two parts

```
BG-1a (SQL, EXECUTABLE NOW)
LAW        A row BEYOND the page that does not decode as a receipt
           does not refuse the page.
WHY IT IS  QE-A2's OOM is specifically "every row is schema-decoded
THE GATE   into a JS array (:268-278)… since(0) decodes ten million
           rows into one array". A page that survives an undecodable
           row at seq = m+L+1 is a WITNESS that the rows beyond the
           page were never decoded.
FALSIFIER  exhibit a sqlite word with a corrupt row past the page
           where since(0, 2) refuses.
BATTERY    S-7

BG-1b (FILE, EXECUTABLE NOW — the OWED ROW made a NON-CLAIM GATE)
LAW        A LINE beyond the page that does not decode DOES refuse the
           page — the file realization's read is whole-log by the
           corruption law, and `limit` pages the ANSWER, not the READ.
WHY        `makeFileWordLog` must keep refusing mid-file corruption
           (WordLog.ts:469-472, "Anywhere else an undecodable line is
           corruption and the typed failure propagates"). The owed row
           TP-5 asks for is therefore DERIVED, not merely asserted —
           and gating it stops a later "optimisation" from turning the
           file log into one that silently tolerates corruption.
FALSIFIER  exhibit a file word with a corrupt mid-file line where
           since(0, 2) SUCCEEDS.
BATTERY    S-8

BG-2 (SQL, SEAM OWED BY THE IMPLEMENTER — NOT FAKED HERE)
LAW        The statement `makeSqlWordLog.since` issues carries a
           bound: rows are not transferred beyond the page.
WHY NOT    BG-1a kills read-all-then-DECODE. It does not kill
IN THE     read-all-then-SLICE-then-decode, which transfers every row
BATTERY    and is still QE-A2's OOM at the driver. No black-box
           observation distinguishes the two through this seam.
SEAM       The implementer commits ONE assertion, in the test tree
OWED       (no src API change), that the statement issued carries
           `LIMIT`: a `SqlClient` wrapper provided to `makeSqlWordLog`
           that records statement text. If that proves impossible with
           the pinned driver, it is a **BLOCK back to the breaker** —
           not a quietly dropped obligation and not a substituted
           timing test.
```

### L-A14 — ETag is CUT

```
LAW        No `etag`, `if-none-match`, `304`, `last-modified` on this
           route. A request carrying `If-None-Match` answers 200 with
           the full body.
LICENCE    TP-12 — unruled scope creep, mis-scoped to closed ranges,
           and its correctness premise falsified by the log's own
           truncation repair (`markOutOfOrder` instructs the operator
           to truncate, after which `next` moves BACKWARD and a cached
           validator is stale-but-fresh-looking).
FALSIFIER  exhibit an `etag` response header, or a 304.
BATTERY    R-11
```

**Claim scope, exactly.** The battery asserts the CUT, not a judgment
that conditional requests are wrong. Whether `/history` should ever
carry a validator is **unruled**; TP-12 says it may return as its own
ruled slice, correctly scoped (any range, invalidated by truncation).

### L-A15 — The record moves with the route (TP-16)

```
LAW        historyPath is exported from bin/mcp/http.ts and equals
           "/history"; SERVING.md's route table names it; PROFILE-
           CAS-HTTP-0.md §14's co-tenant table names it and no longer
           says "declares three"; the startup banner carries
           history=/history; and test/ServingDoc.test.ts's route set
           NAMES historyPath — the drift gate must be able to SEE the
           fourth route.
LICENCE    TP-16; SERVING.md's own drift law (:14-21, "a fact here
           that drifts from the estate is a red gate, not a stale
           sentence"); decision 32(c)'s additive-at-/0 precedent.
FALSIFIER  exhibit a checkout where the route answers and any one of
           the five documents/gates does not name it.
BATTERY    R-12 (all five, one case each)
```

The drift-gate extension **is itself contract**: a fourth route
invisible to `ServingDoc.test.ts` means SERVING.md and §14 go stale
silently forever after. R-12 asserts the gate file names
`historyPath`; the implementer folds the route into that gate's own
route list as named scope.

---

## Adversarial implementations (the `adequacy` discharge)

Six wrong-but-passing implementations, exhibited before any code
exists. Each is the reason a specific battery case is in the file.

| # | The wrong implementation | What it passes | Killed by |
|---|---|---|---|
| **A1** | `SELECT … WHERE seq ≥ m ORDER BY seq` unbounded, then `.slice(0, L)` in JS | every behavioural law in this packet | **S-7** (BG-1a) |
| **A2** | `next = |w|` always | every untruncated case; every single-pull case | **R-2/S-2** (the truncated chain skips receipts) |
| **A3** | unknown query keys silently ignored | §6's seed "no parameter filters by receipt field" | **R-7** (fail-closed door) |
| **A4** | `next = m' + |page|` always | every truncated case | **R-1/S-1** (past-the-end answers the caller's own mark) |
| **A5** | the page re-sorted by `at` (or by `address`) | any set-equality or length assertion | **R-1/S-1** (positional identity) |
| **A6** | `HttpServerResponse.jsonUnsafe(history)` — insertion-order keys | any `toEqual` on the parsed body | **R-4** (byte identity against the canonical printing) |

A1 is the one the plan believed it had closed and had not (TP §Cover,
QE-A2 row: "This is the one QE finding the plan believes it has closed
and has not").

## Battery index — 23 cases, 20 RED at the packet's date

Run: `cd library/effects && bun --bun vitest run test/WordLogPaging.test.ts
test/DaemonHistoryRoute.test.ts` (leaf gate only — TRUNK-PLAN §4).

| Case | Law | Licence | 2026-08-31 |
|---|---|---|---|
| S-1 | L-A1, L-A2 | W1/W2/W5 | green — standing guard (kills A4, A5 once `limit` exists) |
| S-2 | L-A3, DECREASES | W6 | **RED** — one page of 7 where four of ≤3 are owed |
| S-2b | L-A3, L-A12 | W6 | **RED** — same, on sqlite and file |
| S-3 | L-A4 | W1's second half | green — standing guard |
| S-4a | L-A6a | parameter #11 | **RED** — `wordLogPageLimit` is undefined |
| S-4b | L-A6b, L-A6c | QE-A2, TP-17 | **RED** — 10 001 rows answered where 10 000 are the cap |
| S-4c | L-A6e | W1 | green — standing guard |
| S-5 | L-A6d | the DECREASES line, §13.2 | **RED** — `limit=0` is answered, not refused |
| S-6 | L-A12 | abstraction / §9.3 | **RED** — the square is pinned to its corner, not just to agreement |
| S-7 | L-A13 BG-1a | QE-A2 | **RED** — the read is unbounded TODAY, and says so in its own words |
| S-8 | L-A13 BG-1b | the corruption law | **RED** on its baseline; the NON-CLAIM half is green and must stay green |
| R-1 | L-A1, L-A2 | W1/W2/W5 | **RED** — 400 (route absent) |
| R-2 | L-A3, L-A6f | W6 | **RED** |
| R-3 | L-A4 | W1 | **RED** |
| R-4 | L-A5 | the two-register law | **RED** |
| R-5 | L-A6 | parameter #11, TP-17 | **RED** |
| R-6 | L-A7 | decode-at-the-boundary | **RED** |
| R-7 | L-A8 | QE-A3 / QE-1 | **RED** — and it carries an explicit baseline guard, because while the route is absent EVERY request is 400 and the refusals would pass for the wrong reason |
| R-8 | L-A9 | SERVING.md, `refusedResponse` | **RED** — `plane=cas-http/0` |
| R-9 | L-A10 | PROFILE §14 | **RED** |
| R-10 | L-A11 | the emitted wire | **RED** |
| R-11 | L-A14 | TP-12 | **RED** |
| R-12 | L-A15 | TP-16 | **RED** — `historyPath` is undefined |

Three cases are GREEN by construction (S-1, S-3, S-4c): they hold
today and must keep holding. They are standing guards, not falsifiers
of an absent route, and the implementer should read a break in any of
them as a regression rather than as progress.

## Breaks

*(empty — no falsifier has fired yet; the battery is red by
construction because the route does not exist, which is not a break.
A packet with an empty ledger and a GREEN battery would say the laws
were never seriously attacked; this one is not green.)*

---

## The edge — what the implementer may NOT do

1. **No ETag / `If-None-Match` / `304` / `Last-Modified`** (L-A14, TP-12).
2. **No `from`/`to`** — deferred on SCOPE, not capability (TP-7). The
   face text is "not yet", never "cannot".
3. **No receipt-field parameter**, in any spelling (L-A8, QE-A3).
4. **No edit to `library/cas/Cas/Backend/Mcp.lean`**, no seventh MCP
   tool, no manifest versioning event (SPEC §6 FT-1a; PDD-6.md:72).
   This is a read-only host co-tenant route and nothing else.
5. **No edit to the generated wire** `src/cas/generated/WordLogSchema.ts`
   and no new field in the document (L-A11).
6. **No writes** on the route; no new admission path; no repair of a
   damaged log on read.
7. **No change to `flooredMark`'s refusal wording** — gated by
   `CliHistory.test.ts:188-200`.
8. **No `/live`, no streaming, no subscription** (N4; PDD-6 laws 3–5
   are unproved and unstated).
9. **No widening of the Origin/Host allowlists.** `--allow-origin`
   stays REQUIRED for a browser on another origin, and is documented
   in Lane C's brief.
10. **No edit to this packet or to either battery file.** A defect in
    either is a written BLOCK back to the breaker.
11. **No commits to a shared branch**, no `mise run check` chain while
    the tree is uncommitted (TRUNK-PLAN §4 — leaf gates only:
    `bun --bun vitest run`, `bun run typecheck` inside
    `library/effects`).

## The scope the implementer MUST do (TP-16), each with its line

| Item | Where | Its battery line / obligation |
|---|---|---|
| `limit` on `WordLogShape.since`, all three realizations | `src/cas/WordLog.ts` | S-1…S-8 |
| one exported cap constant, `= 10 000` | `src/cas/WordLog.ts` | S-4, R-5 |
| `GET /history?since&limit` | `bin/mcp/http.ts` | R-1…R-11 |
| `historyPath` exported | `bin/mcp/http.ts` | R-12a |
| `planeOf` claims it (`"history"`) | `bin/mcp/http.ts` | R-8, R-12b |
| startup banner line | `bin/mcp/http.ts:1146` | R-12c |
| `ServingDoc.test.ts` route set | `test/ServingDoc.test.ts` | R-12d (the gate file names `historyPath`) |
| SERVING.md route table + co-tenancy paragraph | `library/effects/SERVING.md` | R-12e |
| PROFILE §14 co-tenant table, "declares four" | `library/effects/PROFILE-CAS-HTTP-0.md` | R-12f |
| the CLI drains by chaining | `bin/cli/history.ts` | R-4 (the CLI single invocation must still print ONE whole document) |
| the seam doc states the file realization's non-claim | `src/cas/WordLog.ts` header | owed row, §Claim scope |

---

## Claim scope — what this packet does NOT say

- **PDD-6 law 2 (consecutive pulls concatenate across GROWTH) is
  OWED.** W6 covers the fixed word only. No battery case asserts the
  growth half, and the trunk may not promise it.
- **PDD-6 laws 3–5** (at-most-once, the empty-at-frontier *iff*, the
  funnel) are unstated anywhere. The route POLLS and says so.
- **The file realization's read is unbounded** (TP-5). `limit` pages
  the answer; the whole log is read and decoded first, by the
  corruption law. The sqlite backend is the bounded one. S-8 gates
  the non-claim so it cannot silently change.
- **BG-2 is owed**, not discharged (L-A13).
- **ETag's correctness is unruled** (L-A14); only the cut is asserted.
- **`Cache-Control` on this route is UNRULED and untested.** An OPEN
  ROW for the operator: `/projections` sends `no-cache`, and a caching
  intermediary in front of a 1 Hz poll would be a defect nobody has
  ruled on. The battery asserts nothing about it rather than minting
  a rule from a breaker's preference.
- **OPEN ROW, found while breaking, outside this slice:** the
  **cas-http/0 wire plane does not receipt.** `CasServerCore` requires
  only `ByteReader | ByteWriter | RootStore | AddressScheme`
  (`src/server/Core.ts:51,71-73`) and never `WordLog`, so a `PUT
  /cas/{hex}` admits bytes with **no receipt**, while `cas put` (CLI)
  and MCP `cas_put` (`bin/mcp/handlers.ts:199,236,264`, through
  `Cas.Store`) both receipt. SPEC §6's "Done means" — "a browser tab
  shows this store's history growing while another process puts into
  it" — therefore holds for the CLI and the tool plane and **not** for
  the byte plane. This is NOT S1's to fix (it is a store-law question
  about which door is the admission door), and the battery does not
  depend on it: every seeding in the battery goes through `Cas.Store`
  or the CLI. Named here because the trunk would otherwise be built on
  a promise the daemon does not keep.
- **No soundness word attaches to any TypeScript here** (C5). The
  battery REFUTES or fails to refute; it does not prove.
