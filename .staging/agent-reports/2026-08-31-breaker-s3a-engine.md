# BREAKER report — Lane C / S3a, the trunk engine

Date: 2026-08-31
Role: **BREAKER** (castle-vs-attack; the `implement` skill's two-role law —
this session wrote the contract packet and the failing battery, and NEVER
implements what it broke).
Subject: `.staging/frontend-trunk/TRUNK-PLAN.md` §3 Lane C / S3a + §6
"Lane C (the trunk)".
Packet: `.staging/frontend-trunk/packets/S3A-TRUNK-ENGINE.md`
Battery: `experiments/workbench/src/trunk/{model,fold,fold-carrier,placement,place,place-epoch}.test.ts`
Fixtures + harness: `experiments/workbench/src/trunk/fixtures/`

STATUS: complete — packet written, fixture minted, battery RED by
construction (70 contract cases, 6 files), no existing file modified,
nothing committed.

---

## 1. What was produced

- **One contract packet** in the skill's format (CATEGORIES / declared
  degree / obligation classes / REQUIRES / ENSURES / DECREASES / FRAME /
  per-law FALSIFIER + LICENCE + BATTERY), carrying: the frozen module
  surface (four modules, every signature); the fold stated as a `View`
  homomorphism in closed form; a carrier invariant CI-1..CI-5; **26
  laws** (L-M1..5, L-F1..10, L-C1..7, L-P1..9) each with an
  exhibit-form falsifier and a named licence; **nine FLAGS** where §6's
  seed list did not survive contact; **two OPEN rulings** the packet
  could not close; **six adversarial implementations** in the Breaks
  ledger; the pinned golden serialization binding S3b; an edge list of
  ten prohibitions and the S3b deferral list.
- **Three fixture documents + a harness** under
  `src/trunk/fixtures/` — a 220-receipt recorded word, its four-page
  split, and five mark-edge documents.
- **70 contract cases in six battery files, all RED**, plus **11
  harness-validation cases, green**, counted separately.

## 2. The two suite numbers

| Run | Result |
|---|---|
| **Skeleton alone** (`src/story.test.ts`, `src/scene.test.ts`) | `Test Files 2 passed (2)` · `Tests 6 passed (6)` |
| **Whole workbench, with the battery present** | `Test Files 6 failed \| 3 passed (9)` · `Tests 17 passed (17)` |

`17 = 6 skeleton + 11 harness validation`. The six failed files are mine
and only mine; the skeleton's two are untouched and green. No existing
file was edited — `git status` for the workbench shows exactly one new
untracked directory, `src/trunk/` (plus S0's `src/generated/`, which is
not mine).

**The red tail, verbatim:**

```
 ❯ src/trunk/place-epoch.test.ts (0 test)
 ❯ src/trunk/placement.test.ts (0 test)
 ❯ src/trunk/fold.test.ts (0 test)
 ❯ src/trunk/fold-carrier.test.ts (0 test)
 ❯ src/trunk/model.test.ts (0 test)
 ❯ src/trunk/place.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/trunk/model.test.ts [ src/trunk/model.test.ts ]
Error: Cannot find module './model.ts' imported from …/src/trunk/model.test.ts
 FAIL  src/trunk/fold.test.ts [ src/trunk/fold.test.ts ]
Error: Cannot find module './fold.ts' imported from …/src/trunk/fold.test.ts
 FAIL  src/trunk/fold-carrier.test.ts …  Cannot find module './fold.ts'
 FAIL  src/trunk/place.test.ts …          Cannot find module './fold.ts'
 FAIL  src/trunk/placement.test.ts …      Cannot find module './fold.ts'
 FAIL  src/trunk/place-epoch.test.ts …    Cannot find module './fold.ts'

 Test Files  6 failed | 3 passed (9)
      Tests  17 passed (17)
```

The battery fails at COLLECTION on the missing modules — never on an
assertion, never on a harness error. That is the intended red.

**`bun run typecheck` and `bun run lint` are also red**, on the same
four `TS2307 Cannot find module` errors and their implicit-`any`
cascade. `check:workbench` runs lint → typecheck → test → build, so the
gate is red for Lane C until the implementer lands the four modules.
That is the castle-first design working as ruled; it is not a defect to
route around.

## 3. The battery, case by case, with its licence

Every case names its law; every law names its licence in the packet.

### `model.test.ts` — the vocabulary and the classifier (10)

| case | law | licence |
|---|---|---|
| the lane list is the generated registry's, plus unregistered | L-M1 | TP-30; the workbench README's generation law |
| the lane ORDER is the ruled speed-class order | L-M1 | aesthetics §1.3 |
| every registry tag lands in its own lane — one authority | L-M2 | CR-42; `Column.lean:75` |
| every tag outside the registry lands in unregistered, never dropped | L-M2 | `Column.lean:82/94` |
| named kinds come off the registry, never a hand table | L-M3 | decision 25 |
| an unnamed tag renders as the CLI's bare hex (N9) | L-M3 | SPEC N9; `bin/cli/history.ts:75-78` |
| the micro-tint index is the address's first hex nibble mod 5 | L-M4 | TP-13; aesthetics §2.2 |
| the tint ladder is five steps, and reads the NIBBLE not the char code | L-M4 | TP-13's two named failures |
| the empty model satisfies the carrier invariant and counts nothing | CI-1..5 | ch. 10 |
| the carrier bound and the visible window are two numbers | TP-29 | TP-29 |

### `fold.test.ts` — the homomorphism and the mark (11)

| case | law | licence |
|---|---|---|
| incremental equals fresh, on the recorded pages | L-F1 | `View.run_append`, `View.prod` |
| incremental equals fresh, at every split point (property, 120 cases) | L-F1 | same |
| incremental equals fresh across three pages, past the carrier bound | L-F1 | `View.lastK` (Lane B) |
| re-delivering a page immediately changes nothing | L-F2 | TP-14 / R0 |
| re-delivering an older page never adds a receipt | L-F2 | TP-14 |
| a half-overlapping page folds only its new suffix | L-F2 | TP-14 |
| the mark is the page's next, never a receipt's seq | L-F3 | TP-19b; W5 |
| a truncation moves the mark BACKWARDS | L-F3 | TP-12 (`markOutOfOrder`) |
| a backwards mark never double-counts what follows it | OPEN-1 | count honesty alone |
| every receipt lands in exactly one lane | L-F4 | `mem_column_or_unregistered` + `columnBy_disjoint` |
| an unregistered tag surfaces, it is never dropped | L-F4 | `Column.lean:82` |

### `fold-carrier.test.ts` — the memo, the memory, the door (10)

| case | law | licence |
|---|---|---|
| a fold touching one lane leaves every other snapshot `===` | L-F5 | TP-10 (`createLazy` compares by `===`) |
| an empty page leaves every snapshot `===` | L-F5 | TP-10 |
| the memo key changes exactly when the snapshot does | L-F5 | TP-10 |
| the model is bounded by f(k, lanes) after 100 000 receipts | L-F6 | CANVAS §3; SPEC §6 "no store mirror" |
| a malformed document is refused at the door (6 exhibits) | L-F7 | fail-closed; the four-state union |
| a refusal moves neither the mark nor a single column | L-F7 / E6 | TRUNK-PLAN §3 |
| refusal is a distinct fact from never having asked | L-F8 | the review's §8 finding |
| folding a good page produces Live, never Idle or Loading | L-F8 | TRUNK-PLAN §3 |
| folding does not mutate the model it was given | L-F9 | TP-10 (not a ring buffer) |
| the carrier invariant survives an arbitrary fold sequence (property, 60) | L-F10 | BREAKER.md §10.1 |

### `placement.test.ts` — index space (15)

| case | law | licence |
|---|---|---|
| the ops cover every row of every column exactly once | L-C1 | `columnBy_disjoint` + coverage, lifted to rows |
| coverage holds for every generated model and window (property, 50) | L-C1 | same |
| squares plus strip counts equals the total folded | L-C2 | TRUNK-PLAN §6; Perfetto's carried `count` |
| count honesty survives an unregistered-only word | L-C2 | `Column.lean:94` |
| an empty model places no op and totals zero | L-C2 | run_nil |
| the individuated floor does not move between cuts | L-C3 | CANVAS §4 (aggregation is a CUT EVENT) |
| a cut is the only thing that moves the floor | L-C3 | CANVAS §4 |
| growth extends the placement and moves nothing (subsequence) | L-C4 | CANVAS §4; FLAG-1 |
| a top-anchored layout would move every op — the adversary dies here | L-C4 | ADEQUACY-1 |
| growth under a stale Doi never un-covers a row (property, 40) | L-C4 | CANVAS §4 |
| no square is emitted without its address | L-C5 | CANVAS §3's stated price |
| rows below the carrier are covered by a strip, not invented | L-C5 | CANVAS §3 |
| ops arrive in canonical order | L-C7 | decidability of the stated equalities |
| a column's strip precedes its squares | L-C7 | same |
| the window and the carrier are different numbers, and both bite | TP-29 | TP-29 |

### `place.test.ts` — where pixels are born (10)

| case | law | licence |
|---|---|---|
| the ruled lane order lays out to 507 css px | L-M5 | aesthetics §1.3 + §1.5 |
| a row's document band never depends on the word (property, 200) | L-P1 | CR-5; aesthetics §1.5 upward-from-baseline |
| growth does not move a placed square in document space | L-P1 | CANVAS §4 |
| every coordinate is an integer device pixel, at all four golden DPRs | L-P2 | TP-4; CANVAS §2 |
| the rects realize the contract's affine map, edge by edge | L-P2 | TP-4 |
| a fractional viewport origin still lands on device pixels | L-P2 | CR-25/26 |
| **the two-row strip at dpr 1.5 — edge snapping, not size snapping** | L-P3 | ADEQUACY-2, exhibited concretely |
| no rect ever crosses the baseline | L-P3 | aesthetics §1.5 |
| a strip occupies exactly the rows it covers, at full pitch | L-C6 | TP-1/TP-2 |
| the engine names no browser global | L-P8 | TRUNK-PLAN §3 "pure, browserless"; TP-4 |

### `place-epoch.test.ts` — disjointness, determinism, epochs (14)

| case | law | licence |
|---|---|---|
| no two rects share a device pixel, on every generated placement (property, 60) | L-P4 | CR-13/CR-14; CR-40 |
| the disjointness checker refuses an overlapping pair | L-P4 | ADEQUACY-5 |
| the gutters survive at every golden DPR | L-P4 | CANVAS §2 (1-device-pixel gutters) |
| place is deterministic | L-P5 | TRUNK-PLAN §6 |
| canonicalRects is byte-stable, and byte-different per DPR | L-P5 | TP-13 (4 DPRs) |
| the canonical register has the pinned shape | L-P5 | packet §5 |
| every square has the same device dimensions at the golden DPRs | L-P6 | CANVAS §7 |
| place culls to the overdrawn viewport | L-P7 | TP-15; Perfetto's 300 px |
| culling filters — it never re-lays out | L-P7 | CR-5 |
| an unchanged epoch reports no terminator | L-P9 | CANVAS §4 |
| every epoch change is reported, and only real ones | L-P9 | CANVAS §4 minus §8's four deletes |
| a scroll below the drift threshold is not a terminator | L-P9 | CANVAS §8 (a single threshold thrashes) |
| carrier exhaustion is a terminator | L-P9 | breaker addition; see FLAG-3 note |
| an empty model places nothing at every golden DPR | ground | run_nil |

### `fixtures/conformance.test.ts` — HARNESS VALIDATION, green (11)

Decodes all three fixtures through S0's `wordHistorySchema`; checks the
registry coverage, the five tint steps, monotone `at` with 21 droughts,
the lane depths, page concatenation, the five mark documents, that the
fixture is JSON bytes and not a TS literal, and self-checks `forAll`
(determinism, seed reporting) and `expectValid` (accepts a valid
carrier, refuses each of CI-1..CI-4 broken individually).

## 4. The fixture

`src/trunk/fixtures/word-history.fixture.json` — 220 receipts, seq
0..219 contiguous, `next` 220, generated by the deterministic rule
pinned in packet §8 (runs of `(tag, count)`; `address(seq)` a 16-nibble
block repeated four times; `at` with a 15-minute drought at every run
boundary; `size` a fixed modular sequence). It carries **all 15 registry
sorts**, **two distinct unregistered tags** (0xc8 twice, 0x2a once),
**two bursts in one lane** (`chunk` 40 then 45 = 85) and one 30-long
`step` burst, and it reaches **all five micro-tint steps**. Lane depths
run 85 down to 1, so every column sits on both sides of a 30-row window
and one lane exceeds any small k.

`word-history.pages.fixture.json` — the same word as four pages
(80/80/60/empty-at-tip). `word-history.marks.fixture.json` — five
documents whose `next` is not `max(seq)+1`: `emptyAtTip`,
`emptyMidWord`, `truncated` (the backwards mark), `outOfOrder` (seqs
0,2,1,3) and `overlapping` (76..83 at next 84).

**Provenance, stated (C6):** the addresses are syntactically valid
64-character lowercase hex and are **NOT** content addresses of any real
node. No store minted this file; it is a hand-authored recording for an
engine that is browserless and storeless. It must never be cited as
store-minted. Lane A's integration fixture, when it exists, is a
recorded pull and is a different artifact.

## 5. Where I STRENGTHENED or REFUSED §6's seeds — said out loud

Six places. Each is a FLAG in the packet.

1. **"placement(w++δ) extends placement(w) — prefix ops identical" is
   FALSE as written**, twice over. (a) The canonical op order is
   column-major, so growth inserts *inside* each column's block: the old
   list is a SUBSEQUENCE of the new, never a prefix, for any model with
   two non-empty lanes. (b) Even per column it fails unless the DOI
   floor is FROZEN between cuts — otherwise a square ageing out of the
   window becomes strip coverage at the same row. The packet pins the
   frozen floor on CANVAS §4's own words ("aggregation is a CUT EVENT —
   the ONLY place recency/focus may act") and restates the law as a
   subsequence with every retained op deep-equal. Strengthened, not
   watered down. (FLAG-1)
2. **"Uniform marks: all Square rects equal dimensions" is FALSE at any
   DPR where `12·dpr ∉ ℤ`** — for a *correct* edge-snapping
   implementation. At dpr 1.1 the heights alternate 13/14. Pinned at its
   true strength: exact at the four ruled goldens, ≤1 device pixel
   elsewhere. (FLAG-2)
3. **The determinism seed asks for "byte-identical SVG", which S3a
   cannot produce** (no SVG in the engine — that is S3b, and the edge
   forbids it). Rather than drop the byte gate, the packet lands
   `canonicalRects` at engine level with a pinned line format, and binds
   S3b's goldens to reproduce its numbers verbatim at DPR 1, 1.5, 2, 3.
   (FLAG-3)
4. **`tailRevision` is DERIVED, not a counter.** TP-10 writes
   "(count, tailRevision)" and does not say which. An opaque per-fold
   counter makes incremental-equals-fresh false for *every* pair of
   pages; deriving it as the tail's last seq makes the memo key a
   CONTENT key and L-F1 an equality on the nose. (FLAG-4, ADEQUACY-3)
5. **Rect carries device INTEGERS.** TP-4's `round(x·dpr)/dpr` is
   realized exactly as `x_device/dpr`; the integer is the
   representation. `round(v·1.5)/1.5·1.5` does not round-trip in binary
   floating point, so a CSS-float Rect makes integrality undecidable and
   makes goldens float-formatting dependent. (FLAG-5)
6. **A seventh epoch terminator, `carrier`, added.** CANVAS §4's list
   minus §8's four canvas-only deletes (context loss/restore, tab
   restore, bitmap-clear repaint — v1 has no canvas; HMR is carried by
   the lazy key) plus `carrier`: when a column's `count − floor` would
   exceed the held tail, the floor is forced up and the extension law is
   void whether or not anyone called for a cut. Without it, L-C4's
   premise is unstatable. (FLAG-9 in the packet's §3 note; the deletes
   are cited to CANVAS §8 verbatim.)

## 6. What I could NOT close — two open rulings

**OPEN-1 — a page whose `next` is below the model's mark.** L-F3 (mark
:= next, unconditionally) and L-F2 (the seq guard) pull against each
other here: the mark moves backwards, the next page's receipts are no
longer guarded out, they fold a second time, and count honesty dies.
TRUNK-PLAN files this under S3b's INTEGRATION list, but the FOLD's
behaviour is S3a's and is unruled. Two candidates — REFUSE (status
Refused, model untouched) or RESET (discard the columns, refold from the
new mark). The battery pins only what **both** satisfy and what count
honesty licenses alone: after a backwards `next` and a following page,
Σ counts never exceeds the distinct receipts accepted, and no tail
carries a duplicate seq. **The implementer BLOCKS rather than choosing.**

**OPEN-2 — `decodeHistory` refuses an address that is not 64 lowercase
hex.** This is a workbench-side strengthening of S0's generated
`address: Schema.String`. For it: `tintIndex` has no honest fallback — a
wrong tint is silent corruption, unlike N9's bare hex, which is a fact
rendered as a fact, and the four-state union's `Refused` arm exists for
exactly this. Against it: the generated schema is the door, and a second
opinion about what a receipt is is what the mirrors exist to prevent.
Pinned as REQUIRES R4 with the refusal at the door; the swap, if the
operator rules the other way, is a total `tintIndex` returning a
distinguished value that S3b renders at step 2.

## 7. Judgment calls flagged for the grill

| call | what I did | the alternative |
|---|---|---|
| **module paths** | exactly the four the dispatch proposed: `src/trunk/{model,fold,placement,place}.ts`; lane order, classifier, `kindName` and `tintIndex` live in `model.ts` because CR-42 wants ONE authority for `col` | a fifth `lanes.ts` |
| **an added export** | `foldDocument(model, unknown) → Model` (decode + fold, Refused on malformed). Without it the fail-closed transition E6 has no owner and no falsifier — the caller would own it, in S3b, ungated | leave decoding to S3b's `update` |
| **fast-check** | present at 4.9.0 in `node_modules` but only as a transitive dep of `effect`, and NOT declared by the workbench. I refused the phantom dependency (and package.json is outside a breaker's write scope). The battery ships a hand-rolled seeded `forAll` with fixed case counts and **no shrinking**, self-checked green. The packet instructs the implementer to promote fast-check to an explicit devDependency and regenerate `bun.lock` (`check:workbench` runs `--frozen-lockfile`), then swap `forAll`'s body | import it as-is today |
| **serialization** | `canonicalRects` at engine level: `# dpr=… vw=… vh=… oy=… n=…` header, then `S x y w h address tint` / `T x y w h fromRow count`, single spaces, LF only, trailing LF. All fields integers, so no float formatting enters the bytes. Binds S3b's `<rect>` numbers under one `<g transform="scale(1/dpr)">` | defer the byte gate entirely to S3b, leaving S3a's determinism claim with no byte-level falsifier |
| **file split** | six battery files rather than four, purely because oxlint enforces `max-lines: 300`. The law groups are what the names say; no seam is implied | four files with the rule suppressed |
| **fixture location** | `src/trunk/fixtures/`, not `test-fixtures/` — `vitest.config.ts` collects `src/**/*.test.ts` and `tsconfig.json` includes only `src`, so a sibling directory would be outside both | `experiments/workbench/test-fixtures/` |
| **JSON via `node:fs`** | the fixture is read as bytes and decoded through the generated schema, so it is exercised as the wire document it imitates. `resolveJsonModule` is not set in the workbench tsconfig, so a JSON import would not have typechecked anyway | a TypeScript literal |

## 8. Verification the breaker performed on its own battery

The battery was probed against a deliberately degenerate implementation
(every function returning an empty or identity value), written outside
the tree, copied in, measured, and **deleted**. `git status` confirms no
`src/trunk/*.ts` exists and the breaker committed nothing.

- **typecheck: clean** against the packet's frozen signatures. Every
  `tsc` error in the real run is a `TS2307 Cannot find module` or its
  implicit-`any` cascade; none is a battery defect.
- **lint: clean.** (Five real oxlint defects in my own files were found
  and fixed: `preserve-caught-error`, four `no-array-sort`,
  `consistent-function-scoping`, `no-loop-func`, and two `max-lines`
  overruns that forced the file split.)
- **49 of the 70 cases fire against the degenerate implementation.** The
  21 that do not are equational and structural laws — `a ≡ b`, `x ===
  y`, "the list is ordered", "no terminator fired" — which a constant
  function satisfies by construction. That is the law shape, not a hole:
  the counting laws (L-F4, L-C2), the shape laws (L-F6, L-C1) and the
  arithmetic laws (L-M5, L-P1..P3, L-P6) all fire, and they are what pin
  the equational ones. **Non-triviality guards were added to every
  equational case the probe caught passing vacuously** (six edits), and
  the count went 43 → 49.
- **No failure routes through the harness.** Every one is an
  `expect` in a battery file, or a `forAll` re-throw naming the case
  index and seed.

## 9. Lane B landed mid-session, and it licenses this packet exactly

`library/cas/Cas/IR/View.lean` changed under this session: Lane B's
`View.lastK` is in the tree, complete (`check:cas` exit 0, G1 Model).
Three consequences, absorbed into the packet before it was finished:

1. **L-F2's licence upgraded from a plan bullet to a proved theorem.**
   `lastK_not_idem : lastK 2 ([x] ++ [x]) ≠ [x]` — the algebra will NOT
   supply replay safety. Lane B's own docstring names this packet's
   obligation: "the trunk's fold drops entries with `seq < mark`
   (TRUNK-PLAN §3, S3a). That guard is not decoration — it is the
   premise this theorem says the algebra will not supply." L-F2 is that
   premise made executable on the host.
2. **REQUIRES R3 (strictly increasing `seq`, no reorder) gained a
   witness.** `lastK_not_comm` — two deliveries of the same receipts in
   different orders give different windows. So a reordered page is a
   REFUSAL (L-F7's `outOfOrder` exhibit), never something the engine
   quietly sorts. That is why R3 is established at the door rather than
   assumed.
3. **CI-2 STRENGTHENED from a bound to an equation.**
   `lastK_length : (lastK k l).length = min k l.length`. The packet and
   `expectValid` now assert `tail.length === min(k, count)` exactly; a
   tail that is merely short enough is wrong. Also recorded: `lastK`'s
   merge has **no two-sided unit** (`merge empty w = lastK k w`, not
   `w`) — the `View` structure asks only for `run_nil`/`run_append`, so
   the fold's algebra is unaffected, but the packet says so plainly
   rather than leaving a unit law available to be reached for.
   `lastK_assoc` additionally licenses the three-page case with no
   separate law.

## 10. Scope discipline

Touched: the packet, this report, and new files under
`experiments/workbench/src/trunk/` only. **No existing file was
modified** — `scene.test.ts`'s TP-27 panel assertions are untouched and
belong to the S3b implementer with the panel. Nothing was committed. No
Lane A, Lane B, S0 or skeleton file was read-modify-written. The S1
breaker's `packets/` directory is shared and its file
(`S1-HISTORY-ROUTE.md`) was not opened or altered.
