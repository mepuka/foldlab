# BREAKER report — Lane A / S1, the `/history` route

Date: 2026-08-31
Role: BREAKER (castle-vs-attack; the `implement` skill's two-role law —
this session wrote the contract packet and the failing battery, and
NEVER implements).
Subject: TRUNK-PLAN.md §3 Lane A + §6 "Lane A (the route)".
Packet: `.staging/frontend-trunk/packets/S1-HISTORY-ROUTE.md`
Battery: `library/effects/test/WordLogPaging.test.ts` (the seam)
         `library/effects/test/DaemonHistoryRoute.test.ts` (the route)

STATUS: complete — packet written, battery RED by construction, no
existing file modified, nothing committed.

---

## 1. What was produced

- **One contract packet**, in the `implement` skill's format
  (CATEGORIES / DEGREE / obligation classes / REQUIRES / ENSURES /
  DECREASES / FRAME / per-law FALSIFIER + BATTERY), with a model
  section that writes the page function and its `next` in closed form,
  an **Adversarial implementations** table of six wrong-but-passing
  implementations, a **Battery index** of all 23 cases, an **edge**
  list of eleven prohibitions, a **must-do** table for TP-16's doc and
  gate scope, and a **Claim scope** section naming everything the
  packet does NOT say.
- **Two battery files**, 23 executable cases, **20 red**, 3 green as
  standing guards. Typecheck passes; the failures are all assertion
  failures about the contract, never import or harness errors.

## 2. The two suite numbers

| Run | Result |
|---|---|
| **Baseline** (before the battery, on the uncommitted tree) | `Test Files 3 failed \| 51 passed (54)` · `Tests 3 failed \| 436 passed (439)` |
| **With the battery present** | `Test Files 2 failed \| 54 passed (56)` · `Tests 20 failed \| 442 passed (462)` |

**The two failing files in the second run are mine and only mine**, and
`442 = 439 + 3` — every one of the 439 pre-existing tests passed in
that run, including the three that timed out in the baseline. The
existing suite is therefore green when my files are excluded, and the
23 new cases are the whole of the delta (3 green guards + 20 red).

**The baseline's three failures are not my doing.** The three
failures are all `Error: Test timed out in 5000ms` on subprocess- or
IO-heavy `it.live` cases:

- `test/WordLog.test.ts > file log: two OS processes appending at once…`
- `test/BrainStem.test.ts > …a program is decoded, put, published, run…`
- `test/FileCas.test.ts:43` (the `replayVectors` disk case)

Re-running those three files **in isolation passes them: 3 files, 17
tests, 1.58 s.** They are load-induced timeouts under full-suite
parallelism on this Mac at the default 5 s per-test timeout, not
defects introduced by the uncommitted `Programs.ts` /
`Programs.test.ts` edits. The 439 total matches the brief's number;
the "green" premise did not hold on this host in the first run and did
hold in the second, which is what "flaky under load" looks like.

**Caveat on both numbers: the working tree moved under this session.**
Other lanes committed nothing but edited plenty — at session start
`git status` named two modified files, and by the end it named ~40,
including `library/effects/bin/mcp/http.ts`. That last one was checked:
its diff is a **comment-only** addition (the D2-cutover rationale above
`projectionSources`), `historyPath` still occurs zero times in it, and
no route was added. The baseline was taken at 02:25 and the
with-battery run at 02:44, against a tree changing between them.

## 3. Where I STRENGTHENED §6's seeds — five places, each said out loud

1. **§6's first seed is FALSE as written.** "Suffix identity (W5):
   body at mark m ≡ the word's suffix at m; **`next` ≡ the word's
   length**" contradicts §6's own fifth seed (`limit`). Under
   truncation `next` is `m + |page|`, strictly less than `|w|`. TP-17
   spotted the problem and did not write the formula; the packet writes
   it, with BOTH branches (`page = [] ⟹ next = |w|`, else
   `next = m + |page|`) and shows that each branch alone is an
   adversary — A2 (`next = |w|` always) makes a draining client SKIP
   receipts; A4 (`next = m + |page|` always) hands an overshooting
   caller its own out-of-range mark back and it never learns the tip.
2. **"No parameter filters by receipt field" is *predicate too weak*
   (§8.0).** It is satisfied by an implementation that silently
   IGNORES `?tag=1` — which is strictly worse than refusing, because
   the client then folds a filtered answer that was never filtered.
   The packet makes the contract the **door**: the route accepts
   exactly `{since, limit}` and refuses every other key, fail-closed,
   so the address-not-value line holds against future creep with no
   further ruling.
3. **"Suffix identity" made POSITIONAL.** Set equality passes a page
   re-sorted by `at` or `address`. The law is `page[i] = w[m+i]` and
   `page[i].seq = m+i`.
4. **"Malformed params refuse typed" given a grammar.** At the wire the
   input is a string, so the door DECODES rather than coerces:
   `/^(0|[1-9][0-9]*)$/`, ≤ 2^53−1. `?since=-5` refuses instead of
   floors — the seam's leniency (`flooredMark`) exists for a caller who
   already holds a `number` and is left untouched.
5. **Two laws §6 does not have at all**: the **α-commutation square**
   across the three realizations (L-A12 — `limit` is being written
   three times per TP-5, and three paging implementations never held to
   each other is how this defect normally ships), and **§14 status
   discipline** (L-A10 — a co-tenant prefix must answer its own 405,
   never let the profile's status table answer 400 inside it; and an
   empty word is 200, never 404).

## 4. Where a seed was UNTESTABLE as stated — said, not watered down

**The bound gate** (TRUNK-PLAN §3 Lane A: "a bound gate asserting
rows-read/bytes-held under `limit` on the sql realization"). Split
honestly into three:

- **BG-1a — executable, in the battery (S-7).** A sqlite row BEYOND
  the page that does not decode does NOT refuse the page. Surviving a
  damaged row at `seq = 4` while reading a page of 2 is a *witness*
  that rows beyond the page were never decoded — and QE-A2's OOM is
  precisely the decode ("every row is schema-decoded into a JS array
  (:268-278)"). **This case is red today for exactly the right reason:
  the current seam IS adversary A1**, and it says so in its own words
  (`REFUSED: word log row is not a receipt`).
- **BG-1b — executable, in the battery (S-8), as a NON-CLAIM gate.**
  A damaged mid-file line still refuses the FILE log under any limit,
  because `makeFileWordLog` refuses mid-file corruption by a ruled law.
  So TP-5's owed row — "the file realization pages the ANSWER, not the
  READ" — is **derived**, not merely asserted, and gating it stops a
  later "optimisation" from turning the file log into one that
  silently tolerates corruption.
- **BG-2 — NOT faked; the seam is specified instead.** BG-1a kills
  read-all-then-DECODE but not read-all-then-SLICE-then-decode, which
  still transfers every row. No black-box observation distinguishes
  them through this seam. The packet requires the implementer to commit
  **one** assertion, in the test tree and with no `src` API change,
  that the statement issued carries `LIMIT` (a recording `SqlClient`
  wrapper). If that proves impossible with the pinned driver it is a
  **written BLOCK back to the breaker** — never a dropped obligation
  and never a substituted timing test.

**The route-level cap clamp** is also a stated composition rather than
a 10 001-receipt HTTP seeding: the cap is gated at the seam (S-4b,
10 001 appends into the memory realization, ~6 ms), and the route is
gated by the exported constant's value, by `limit=10⁹` answering 200
rather than refusing, and by the default page being the seam's. Flagged
in the packet as a judgment call.

## 5. Judgment calls flagged (the operator may overrule any of them)

| Call | Ruled | Why |
|---|---|---|
| `limit = 0` | **REFUSE** (400) | the DECREASES variant needs `L ≥ 1`; it is §13.2's *stuck window* and there is no meaning-preserving clamp. It also restores `page = [] ⟺ m ≥ \|w\|`, which is what makes SPEC §3.2's EMPTY state decidable from the document |
| `limit > cap` | **CLAMP** (200) | "at most n" is still true at the cap, and the truncation is observable through `next`; refusing would kill the only client the route exists for |
| `?since=-5`, `1.5`, `01` | **REFUSE** at the route | the wire hands a string, so this is a decode; `01` is the sharpest edge and the operator may relax the grammar to `/^[0-9]+$/` — the falsifier stands either way |
| state-freedom at the BYTES | asserted on the **file** realization only | SQLite may legitimately touch `-wal`/`-shm` on a read connection; a filesystem assertion against the SQL store would be flaky-or-false and would say nothing about the word. The word-level claim is asserted everywhere |
| plane label | pinned **`"history"`**, banner token `history=/history` | needed a pin so `planeOf` and the drift gate have something to agree on |
| cap constant | pinned **`wordLogPageLimit`** in `src/cas/WordLog.ts`, ONE of them | the route may not declare a second |
| ETag | the **CUT** is asserted; its correctness is not | TP-12 leaves the door open to a correctly-scoped slice later |
| `Cache-Control` | **UNRULED, untested** — carried as an OPEN ROW | `/projections` sends `no-cache`; a caching intermediary in front of a 1 Hz poll is a defect nobody has ruled on, and a breaker's preference is not a rule |
| packet location | staged at the ordered path; same-tree promotion owed | CONTRACT.md §The pin wants `test/contracts/…` beside the battery; the operator's path wins for now and the obligation is recorded in the packet |

## 6. The red tail (one line per case, `--reporter=verbose`)

```
 ✓ WordLogPaging      S-1  suffix identity, positionally               (guard)
 ×                    S-2  → expected [ 7, +0 ] to deeply equal [ 3, 3, 1, +0 ]
 ×                    S-2b → expected { lengths: [ 7, +0 ], …(2) } to deeply
                             equal { lengths: [ 3, 3, 1, +0 ], …(2) }
 ✓                    S-3  reading is state-free                       (guard)
 ×                    S-4a → expected undefined to be 10000
 ×                    S-4b → expected 10001 to be 10000
 ✓                    S-4c limit beyond the suffix                     (guard)
 ×                    S-5  → limit=0 must refuse, not answer: expected
                             'ANSWERED {"next":4,"word":[{"address"…' to
                             contain 'REFUSED:'
 ×                    S-6  → expected [ …(6) ] to deeply equal
                             [ { next: 1, seqs: [ +0 ] }, …(5) ]
 ×                    S-7  → BG-1a: a page that refuses because a row BEYOND
                             it did not decode is an UNBOUNDED read: expected
                             'REFUSED: word log row is not a receip…' to be
                             'seqs=0,1 next=2'
 ×                    S-8  → expected [ +0, 1, 2, 3, 4, 5 ] to deeply equal
                             [ +0, 1 ]
 × DaemonHistoryRoute R-1  → GET /history?since=0: expected 400 to be 200
 ×                    R-2  → every pull in the chain must answer 200:
                             expected [ 400 ] to deeply equal [ 200 ]
 ×                    R-3  → expected 400 to be 200
 ×                    R-4  → expected 400 to be 200
 ×                    R-5  → expected 400 to be 200
 ×                    R-6  → expected 400 to be 200
 ×                    R-7  → the refusals below only discriminate once the
                             route answers: expected 400 to be 200
 ×                    R-8  → expected 'timestamp=… le…' to contain
                             'plane=history'
 ×                    R-9  → expected 400 to be 200
 ×                    R-10 → expected 400 to be 200
 ×                    R-11 → expected 400 to be 200
 ×                    R-12 → bin/mcp/http.ts must export historyPath:
                             expected undefined to be '/history'

 Test Files  2 failed (2)
      Tests  20 failed | 3 passed (23)
```

**The failure mode is the contract's, not the harness's.** Every `R-*`
red is `400 → 200`: the route is absent, so the wildcard hands the
request to cas-http/0 and its status table answers 400 — exactly "route
absent". Every `S-*` red is a paging assertion: one page of 7 where four
of ≤3 are owed, `wordLogPageLimit` undefined, 10 001 rows where 10 000
is the cap, `limit=0` answered instead of refused, and the bound gate
firing in the seam's own words. **Nothing fails on an import.**
`bun run typecheck` (both `tsconfig` projects) is clean, which is why:
the two shims the battery needs (`since(mark, limit)` and the two
not-yet-existing exports) are read through casts, documented in each
file's header, so the battery is red on its assertions rather than on
its imports. The casts stay correct after the implementation lands and
need no edit.

## 7. Findings outside the packet's scope, surfaced

**The cas-http/0 wire plane does not receipt.** `CasServerCore`
requires `ByteReader | ByteWriter | RootStore | AddressScheme` and
never `WordLog` (`library/effects/src/server/Core.ts:51,71-73`), so a
`PUT /cas/{hex}` admits bytes with **no receipt**, while `cas put` and
MCP `cas_put` both go through `Cas.Store` and do receipt
(`library/effects/bin/mcp/handlers.ts:199,236,264`). SPEC §6's "Done
means" — "a browser tab shows this store's history growing while
another process puts into it" — therefore holds for the CLI and the
tool plane and **not** for the byte plane. Not S1's to fix (it is a
store-law question about which door is the admission door), and the
battery is built not to depend on it: every seeding goes through
`Cas.Store`. Recorded in the packet's Claim scope.

**A test that would have passed for the wrong reason.** R-7 (the
fail-closed door) passed on its first run — because while the route is
absent EVERY request answers 400 from the wildcard's status table, so
every refusal assertion was vacuous. That is §1.1's *sampling as
proof*, inside a battery. Fixed by an explicit baseline guard
(`?since=0&limit=2` must answer 200 before a refusal means anything).
S-6 and S-8 got the same treatment: S-6 is now pinned to its expected
corner rather than to mere cross-realization agreement (three
identically wrong realizations would agree), and S-8 asserts the page
bound on the UNDAMAGED log before damaging it.

## 8. Discipline

- No existing file modified. Two new test files, one new packet, this
  report. Nothing committed. Nothing reverted.
- Leaf gates only (TRUNK-PLAN §4): `bun run typecheck`,
  `bun --bun vitest run` inside `library/effects`. The `check` chains
  were not run — they carry `git diff --exit-code` and the uncommitted
  tree reds them for everyone.
- No soundness word attaches to any of this (C5). The battery REFUTES
  or fails to refute.
