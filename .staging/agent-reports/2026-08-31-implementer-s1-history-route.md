# IMPLEMENTER REPORT — S1 / Lane A: `GET /history`

Implementer: opus-5 (Mac session), 2026-08-31.
Contract: `.staging/frontend-trunk/packets/S1-HISTORY-ROUTE.md` — read
whole, never edited.
Battery: `library/effects/test/WordLogPaging.test.ts`,
`library/effects/test/DaemonHistoryRoute.test.ts` — read whole, never
edited.

**STATUS: COMPLETE. Not committed.**

- Breaker battery: **23/23 green** (11 seam + 12 route).
- BG-2, the packet's owed seam obligation: **3/3 green**, in a new file.
- Full effects suite: **465 passed (465)**, zero failures, inside
  `check:effects:ts` on a quiet machine.
- All seven required gates green. No dispute with the breaker; no
  battery case was edited, and none needed to be.

---

## 1. Files changed

Nine edited, one added. Every line delta below is this session's alone
(verified against `git diff --numstat`; the rest of the working tree is
other lanes' concurrent work and was not touched, reverted, or
regenerated).

| File | +/− | What |
|---|---|---|
| `library/effects/src/cas/WordLog.ts` | +146 / −18 | `wordLogPageLimit`; `boundedLimit`; `cursorOf`; `limit` on the shape and all three realizations; SQL `LIMIT`; the paging + owed-row section in the header |
| `library/effects/src/Cas.ts` | +1 / −0 | `wordLogPageLimit` on the public surface |
| `library/effects/bin/mcp/http.ts` | +253 / −8 | `historyPath`; `planeOf` gains `history`; the door, the refusals, `historyAnswer`, `layerHistory`; banner line; header co-tenant count |
| `library/effects/bin/cli/history.ts` | +54 / −1 | `drainFrom` — the chained drain; header |
| `library/effects/bin/cli/store.ts` | +5 / −1 | the sqlite composition's `WordLog` wrapper forwards `limit` |
| `library/effects/test/ServingDoc.test.ts` | +8 / −2 | `historyPath` imported and in the drift gate's route set |
| `library/effects/test/WordLog.test.ts` | +1 / −1 | the flaky-log test double forwards `limit` |
| `library/effects/SERVING.md` | +41 / −6 | route table row; "four" co-tenants; a `/history` section; plane vocabulary; refusal-media-type list |
| `library/effects/PROFILE-CAS-HTTP-0.md` | +2 / −1 | §14 co-tenant table row; "declares three" → "declares four" |
| `library/effects/test/WordLogStatement.test.ts` | **new, 172** | BG-2 — the recording `SqlClient`, three cases |

Untouched, deliberately: the packet, both battery files,
`src/cas/generated/WordLogSchema.ts`, `library/cas/Cas/Backend/Mcp.lean`,
every Lean file, every emitter, `flooredMark`'s refusal wording.

## 2. The laws, and the code that discharges each

| Law | Discharge site |
|---|---|
| **L-A1** suffix identity, positionally, `next` at both branches | `WordLog.ts` `cursorOf` (the two branches, written once) + the three `since` bodies: memory `entries.slice(from, from + bound)`, sql `WHERE seq >= … ORDER BY seq LIMIT …`, file `log.entries.slice(from, from + bound)`. Positional order is the slice's and the `ORDER BY`'s; nothing re-sorts. |
| **L-A2** density preserved, never repaired | No filtering, no renumbering anywhere on the read path. `markOutOfOrder` (file) and `INTEGER PRIMARY KEY` (sql) are untouched; `decodeEntry`'s typed refusal on an undecodable row is untouched. |
| **L-A3** paging composes on a fixed word | `cursorOf` makes `next = mark + |page|` while non-empty, so the chain is gapless and overlap-free; the drain terminates by the same fact. Exercised at three levels: seam (`S-2`/`S-2b`), route (`R-2`), and production (`bin/cli/history.ts` `drainFrom`). |
| **L-A4** reading is state-free | No write on any read path; `historyAnswer` holds no state between calls; the route's cursor lives with the caller. The response is a pure function of `(mark, limit, w)` through one printing. |
| **L-A5** two registers, one document | `bin/mcp/http.ts` `historyAnswer` prints `canonicalJson(Schema.encodeSync(wordHistorySchema)(history))` — literally the CLI's line in `bin/cli/history.ts:historyProgram`. The CLI's `drainFrom` is what keeps its single invocation a whole document now that the seam pages. |
| **L-A6** bounds | (a) `wordLogPageLimit = 10_000`, one export, imported by the route's refusal text and nothing else re-declares it. (b)–(e) `boundedLimit`: absent → cap, `Math.min(floored, cap)` → clamp, `< 1` → typed refusal, and the slice/`LIMIT` is unpadded. (f) `cursorOf` is monotone by construction. |
| **L-A7** the door decodes, never coerces | `wireNumeral = /^(0\|[1-9][0-9]*)$/u` plus `Number(raw) > Number.MAX_SAFE_INTEGER` in `decodeHistoryQuery`; `notANumeral` is the refusal. `flooredMark`'s seam-level leniency is untouched and unreachable from the wire. |
| **L-A8** address-not-value as a FAIL-CLOSED door | `decodeHistoryQuery` walks `parameters.keys()` and refuses any key outside `historyKeys = ["since","limit"]` before reading a value. `unknownKey` splits `from`/`to` ("not yet", scope) from every receipt-field spelling (the QE-A3 line). |
| **L-A9** the refusal wears the plane's media type | `planeOf` gains `path === historyPath ? "history"`, so `refusedResponse` takes its JSON branch and the front door's own 403 does too. Every refusal on the route goes through `refusedResponse(historyPlane, …)`. |
| **L-A10** method and status discipline | `router.add("*", historyPath, …)` with `historyAnswer`'s `request.method !== "GET"` branch → 405 + `allow: GET`, from the co-tenant. 200 on the empty word falls out of `cursorOf(0, 0, 0) = 0`. The Origin gate is untouched. |
| **L-A11** the wire is frozen | The body is the generated schema's encoding and nothing else; no field is added, no header carries a count. `WordLogSchema.ts` is byte-identical to HEAD. |
| **L-A12** the three realizations agree | One `cursorOf` and one `boundedLimit` shared by all three `since` bodies — the square commutes because there is one formula, not three that agree. |
| **L-A13** the bound gate | **BG-1a**: `LIMIT ${bound}` in the SQL statement, so rows past the page are never fetched or decoded. **BG-1b**: the file `since` reads whole-log first, by the corruption law, and the header states the non-claim as an OWED ROW. **BG-2**: discharged in `test/WordLogStatement.test.ts` (see §4). |
| **L-A14** ETag is cut | Nothing sets `etag` or `last-modified`; nothing reads `if-none-match`. Only `content-type` and `cache-control` are set. |
| **L-A15** the record moves with the route | `historyPath` exported; `planeOf`; banner `history=/history`; `ServingDoc.test.ts` imports `historyPath` and puts it in the route loop, so the drift gate now *requires* SERVING.md to name it; SERVING.md's table + co-tenancy paragraph + a `/history` section; PROFILE §14's table and "declares four". |

## 3. The six adversaries

A1 and A6 were **built and run**, not argued. The other four are killed
by assertions that are the direct negation of the adversary's behaviour.

| # | The wrong implementation | Killed by | Evidence |
|---|---|---|---|
| **A1** | unbounded `SELECT` then `.slice(0, L)` in JS | **BG-2** (`WordLogStatement.test.ts`) | **Built it.** With A1 installed the whole seam battery stayed green at **11/11 — S-7 included** — and all three BG-2 cases went red on `expected '\n SELECT seq, address, tag,…' to contain 'LIMIT'`. Restored immediately. This is the packet's own claim confirmed: BG-1a kills read-all-then-DECODE and does *not* kill read-all-then-SLICE. |
| **A2** | `next = \|w\|` always | **S-2 / R-2** | The drain's second pull would be empty and receipts 3..6 silently skipped: `lengths` `[3,0]` against the asserted `[3,3,1,0]`, `marks` `[7,7]` against `[3,6,7,7]`. `cursorOf` returns `mark + page` while non-empty. |
| **A3** | unknown query keys silently ignored | **R-7** | `?tag=1` etc. would answer 200. `decodeHistoryQuery` refuses on the key set before any value is read. R-7's own baseline guard (the route must answer 200 first) means the kill is real and not the absent-route 400. |
| **A4** | `next = m' + \|page\|` always | **S-1 / R-1** | At mark 10 on a 7-receipt word the page is empty and A4 answers `next = 10` — the caller's own out-of-range mark — where both cases assert `7`. `cursorOf`'s empty branch answers the word's length. |
| **A5** | the page re-sorted by `at` or `address` | **S-1 / R-1** | Both assert *positionally* (`word[i].seq === mark + i`, and R-1 compares the address list to the seeded order), which a set assertion would not. Nothing on the read path sorts; the sql read is `ORDER BY seq`. |
| **A6** | `HttpServerResponse.jsonUnsafe(history)` | **R-4** — but see the finding below | **Built it.** A6 passed the route battery **12/12**, R-4 included. See §6, finding F-1. My implementation is the canonical printing regardless — the packet's intended discharge — so the code is not the adversary; the observation is about R-4's discriminating power today. |

## 4. BG-2 — the owed seam obligation, discharged

`library/effects/test/WordLogStatement.test.ts` (new, 172 lines, test
tree only, **no `src` API change**), exactly as the packet specifies:
a `SqlClient` wrapper — a `Proxy` over the real Bun SQLite client whose
`apply` trap compiles and records every statement the seam constructs,
and which reproduces itself through `withoutTransforms()` so it
survives `makeSqlWordLog`'s first move — provided to `makeSqlWordLog`
via `Effect.provideService`.

Three cases:

1. the receipt `SELECT` for `since(0, 2)` carries `LIMIT`;
2. the **default** read (`since(0)`, no bound — the pull QE-A2 actually
   names) carries it too;
3. a read past the end issues exactly one bounded `SELECT` and exactly
   one aggregate, and the aggregate does not reach for the rows.

Each asserts the select was found (`toHaveLength(1)`) before asserting
its text, so none can pass vacuously. No block was needed: the wrapper
is straightforward with the pinned driver.

## 5. Gates

Leaf gates only, as ordered. No `check` / `check:ci`.

| Gate | Result |
|---|---|
| breaker battery, both files | `Test Files 2 passed · Tests 23 passed (23)` |
| BG-2 | `Test Files 1 passed · Tests 3 passed (3)` |
| pre-existing suite | see below |
| `bun run typecheck` | `tsc --noEmit && tsc -p tsconfig.test.json --noEmit` — clean, exit 0 |
| `bun run lint` | **172 warnings, 0 errors** — exactly the stated baseline, no new findings (see §6, J-4) |
| `mise run --force check:effects:ts` | **exit 0.** Includes `check-src-purity`, frozen install, lint, typecheck, the whole suite, build, and the dist-consumer smoke |
| ServingDoc drift gate, with the route visible to it | `Test Files 1 passed · Tests 7 passed` — and it now *requires* `/history` in SERVING.md |
| `mise run --force check:cas` | **exit 0**, twice (before and after the final edits). Untouched-green: no generated file moved, `WordLogSchema.ts` byte-identical to HEAD |

**Suite numbers.**

- Baseline (measured at session start, battery present and red):
  **462 tests, 441 passed, 21 failed** — 20 battery reds exactly as the
  packet predicted, plus one pre-existing flake
  (`FileCas > persistence: a fresh composition over the same directory
  serves every root`). Pre-existing suite = 462 − 23 = **439**, as
  briefed.
- After: **465 tests, 465 passed, 0 failed** (439 + 23 battery + 3
  BG-2), measured inside `check:effects:ts` on a quiet machine.
- One intermediate full run, taken while other lanes were hammering the
  machine, showed 9 failures across 7 files
  (`McpBackpressure`, `McpHost`, `FileCas` ×3, `SchemaMaterialization`,
  `WordLog`, `SchemaGuardednessCost`, `Cli`). **Every one of those
  seven files was re-run in isolation and passed** (12, 10, 5, 9, 11,
  2, 43 respectively), and the quiet-machine full run is 465/465. They
  are load flakes, wider than the three named in the brief but the same
  kind; nothing was touched to fix them.

## 6. Divergences, disputes, findings, judgment calls

**No dispute with the breaker.** No battery case was wrong, none was
edited, and no code meeting a packet law failed a case.

**No divergence from the packet.** Where the packet strengthened
TRUNK-PLAN §6 I implemented the packet: `next`'s two branch laws over
§6's "`next` ≡ the word's length" (which the packet correctly shows is
false under `limit`); the fail-closed `{since,limit}` door over §6's
behavioural "no parameter filters by receipt field"; positional suffix
identity over set equality. TRUNK-PLAN §3's own additions (banner,
drift gate, both docs, the CLI drain) are all done.

### F-1 — R-4 does not currently discriminate adversary A6 (finding, not a dispute)

The packet's table says R-4 kills A6 (`jsonUnsafe`, insertion-order
keys). **It does not, today.** I installed A6 and the route battery
passed 12/12.

The reason is benign: the emitted wire record's field order is
*already* lexicographic — `{next, word}` and
`{address, at, seq, size, tag}` — so `JSON.stringify`'s insertion order
and `canonicalJson`'s sorted order produce the same bytes for this
document. R-4's assertion is correct as written (it does compare bytes);
it simply has nothing to bite on while the record is canonical by
accident of naming.

Consequences, stated so the coordinator can rule:

- My implementation is the canonical printing anyway, so nothing ships
  wrong. R-4 is a true statement about the code.
- The moment `WordWire.lean` grows a field that breaks alphabetical
  order, R-4 starts discriminating — and a route that had drifted to
  `jsonUnsafe` in the meantime would go red then, not now.
- If the coordinator wants A6 killed *today*, that is a breaker-side
  battery change (the packet and battery are read-only to me), not an
  implementer change.

### F-2 — a live defect found and fixed: the sqlite composition dropped the bound

`bin/cli/store.ts:567` wrapped the word log as
`since: (mark) => Telemetry.timeSql(reads.since(mark))`. TypeScript
accepts a one-parameter function where a two-parameter one is expected,
so this compiled and **silently discarded `limit` on the sqlite
backend** — the daemon's own backend. Every route request would have
been answered the default page. Caught by the battery (R-5/R-2), fixed,
and commented at the site. Worth naming because it is the exact shape
of the hazard the packet's L-A12 was written against: the bound written
more than once, and one of the writings forgetting.

### J-1 — duplicate query keys are refused (judgment call)

The packet pins the accepted key *set*; it does not rule on
`?since=1&since=2`. I refuse it (`repeatedKey`), on the fail-closed
reading: answering either value silently answers a question that was
not asked. No battery case exercises it either way. Lift it to
last-wins if the coordinator prefers.

### J-2 — `cache-control: no-cache` is set (judgment call, against an OPEN ROW)

The packet names `Cache-Control` UNRULED and asserts nothing about it,
explicitly declining to mint a rule from a preference. A header is
nonetheless present or absent, so I had to choose: I follow the sibling
co-tenant's precedent (`/projections` sends `no-cache`) because the
packet also names the hazard — "a caching intermediary in front of a
1 Hz poll would be a defect nobody has ruled on" — and this is the
choice that cannot cause it. **The open row stands and is the
operator's;** nothing tests this, and removing the header would break
no case.

### J-3 — `next` is computed from the page's length, not the last row's `seq`

In the sql realization I replaced `last.seq + 1` with the shared
`cursorOf(from, word.length, …)`. Under the density invariant the two
are equal; using one formula is what makes L-A12's square structural
rather than coincidental. It is a *weaker* read of the row (it trusts
density instead of re-deriving from it) — density is a standing
invariant this slice may not repair, and `decodeEntry`'s typed refusal
still stands guard. Flagged because it is a real choice.

### J-4 — three files put into house style to hold the lint baseline

My first draft added exactly 3 `foldlab(prefer-pipe)` warnings
(172 → 175), all for `Effect.gen` in new code. I rewrote all three in
pipe form — `makeMemoryWordLog.since` (flatMap/map),
`bin/cli/history.ts` `drainFrom` (a stack-safe `Effect.flatMap`
recursion under `Effect.suspend`, the same idiom `takeLock` already
uses), and `layerHistory` (`Effect.all` over the two services, with the
handler lifted out as the named `historyAnswer`). Back to **172
exactly**. The `historyAnswer` extraction is an improvement
independently: the handler is now a named function of
`(log, request)` rather than a closure buried in a layer.

### J-5 — one line changed in a non-battery test file

`test/WordLog.test.ts:113`'s flaky-log test double was
`since: (mark) => receipts.since(mark)` — the same silently-drops-the-bound
shape as F-2. Updated to forward `limit`. Harmless today (that test only
calls `since(0)`), fixed so a future case in that file cannot be quietly
wrong.

## 7. The packet's edge list — all eleven held

1. No ETag / `If-None-Match` / `304` / `Last-Modified`. ✓
2. No `from`/`to`; refused, and the face text is "not yet". ✓
3. No receipt-field parameter, in any spelling. ✓
4. No `Mcp.lean` edit, no seventh tool, no manifest event. ✓ (byte-identical)
5. No edit to `generated/WordLogSchema.ts`, no new field. ✓ (byte-identical)
6. No writes on the route; no admission path; no repair on read. ✓
7. `flooredMark`'s refusal wording untouched. ✓
8. No `/live`, no streaming, no subscription. ✓
9. No widening of the Origin/Host allowlists. ✓
10. No edit to the packet or to either battery file. ✓
11. No commits; leaf gates only. ✓

## 8. Owed rows carried forward (unchanged by this slice)

- PDD-6 law 2 — consecutive pulls concatenate across **growth** — still
  OWED. `W6` covers the fixed word; nothing here asserts or promises
  the growth half, and `drainFrom`'s doc says so in as many words.
- The file realization's read is unbounded. Now **stated in the seam
  header as an OWED ROW** and gated as a non-claim by S-8.
- ETag's correctness is unruled; only the cut ships.
- `Cache-Control` on this route: open row, see J-2.
- The cas-http/0 byte plane does not receipt (the breaker's
  out-of-scope finding). Untouched — not this slice's, and nothing here
  depends on it.
- The packet's pin obligation: promotion to
  `library/effects/test/contracts/S1-history-route.contract.md` is owed
  at the operator's commit. Not mine to perform.

**No soundness word attaches to any of this** (C5). The battery
refutes or fails to refute; it does not prove.
