# S3A-TRUNK-ENGINE — the contract packet

Breaker: Lane C breaker (engine half), 2026-08-31. **This session does
not implement.** The packet and the battery are read-only to the
implementer; a defect in either is a BLOCK back here in writing, never
an edit (`implement` SKILL.md §Phase I).

- Subject: `../TRUNK-PLAN.md` §3 Lane C / **S3a — the engine** + §6
  "Lane C (the trunk)" seed list.
- Design of record: `../CANVAS.md` §§1–5, §8; `../SPEC.md` N1/N5/N9;
  the aesthetics report §1.3/§1.5/§2.2; the plan review TP-2, TP-4,
  TP-10, TP-13, TP-15, TP-21..24, TP-27, TP-29.
- Lean laws mirrored: `library/cas/Cas/IR/Column.lean`
  (`columnBy_append`, `mem_columnBy_iff`, `columnBy_disjoint`,
  `mem_column_or_unregistered`, `unregistered_append`),
  `library/cas/Cas/IR/View.lean` (`View.run_nil`, `View.run_append`,
  `View.height`, `View.prod`), and **Lane B's `View.lastK`, LANDED in
  this same working tree** (`Cas/IR/View.lean`): `lastK`,
  `lastK_length` (`= min k l.length` — CI-2's licence),
  `lastK_append_eq`, `lastK_left`/`lastK_right`, `lastK_append`,
  `lastK_assoc`, and the two RUNG-0 witnesses that make the host guard
  mandatory rather than tasteful — **`lastK_not_comm`** (the merge does
  not commute, so admission order is semantics: REQUIRES R3) and
  **`lastK_not_idem`** (the merge is not idempotent, so re-delivery
  double-folds). Lane B's own docstring names this packet's law:
  "the trunk's fold drops entries with `seq < mark` (TRUNK-PLAN §3,
  S3a). That guard is not decoration — it is the premise this theorem
  says the algebra will not supply." L-F2 is that premise, executable.
  Note also that `View.lastK`'s merge has NO two-sided unit
  (`merge empty w = lastK k w`, not `w`) — the `View` structure asks
  only for `run_nil` and `run_append`, both of which it has, so the
  fold's algebra below is unaffected; the packet states it so nobody
  reaches for a unit law that is not there.
- Battery, under `experiments/workbench/src/trunk/` — **70 contract
  cases in six files** (the split is oxlint's `max-lines: 300`, not a
  seam; the law groups are what the file names say):

  | file | cases | laws |
  |---|---|---|
  | `model.test.ts` | 10 | L-M1..L-M4, the ground model, TP-29 |
  | `fold.test.ts` | 11 | L-F1..L-F4, OPEN-1 |
  | `fold-carrier.test.ts` | 10 | L-F5..L-F10 |
  | `placement.test.ts` | 15 | L-C1..L-C5, L-C7 |
  | `place.test.ts` | 10 | L-M5, L-P1..L-P3, L-C6, L-P8 |
  | `place-epoch.test.ts` | 14 | L-P4..L-P7, L-P9 |

  plus `fixtures/conformance.test.ts` — **11 HARNESS-VALIDATION cases,
  green today**, counted separately: they import nothing under contract
  and prove the fixtures, `forAll` and `expectValid` are sound, so a
  failure the implementer sees is a contract failure and never a
  harness bug.
- Fixtures: `experiments/workbench/src/trunk/fixtures/*.json`,
  loaded by `fixtures/harness.ts`.

**The declared degree.** I have shown algebraically that S3a can be
implemented to: a monoid-homomorphism statement of the fold with an
executable incremental-equals-fresh equation; a total, exactly-once
coverage statement of the placement with an executable counting
equation; an integer-arithmetic statement of `place` with an
executable disjointness decision procedure and byte-identical
canonical output; and a shape bound on the model with an executable
ceiling. No soundness word attaches to any of it (estate C5) — these
are host laws under a battery, gate class G0/G1.

**CATEGORIES** (assigned here; the dispatch carried none — saying so
per BREAKER.md §1): `algebraic-laws` · `inductive-data` ·
`representation-invariants` · `abstraction-modules` ·
`specification-design` · `arrays-search` · `mutation-frames` ·
`contracts` · `assertions`.

**Obligation classes touched**: `domain`, `contract`, `adequacy`,
`invariant`, `frame`, `abstraction`, `claim-scope`. (`termination`
generates nothing: every function here is a fold or a map over a
finite list. `conformance` generates nothing at S3a: no generated
surface is emitted by this slice — it only *consumes* S0's, and that
consumption is gated by L-M1 below.)

---

## 0. The frozen surface

Four modules under `experiments/workbench/src/trunk/`, following the
skeleton's conventions (sources in `src/`, tests beside them as
`*.test.ts`, `vitest.config.ts` collects `src/**/*.test.ts`, generated
mirrors imported from `src/generated/`).

**Nothing may be renamed.** The battery imports these paths and these
names; a rename is a packet change, which is a breaker commit.

### `src/trunk/model.ts` — the vocabulary, the classifier, the carrier

```ts
export const K_CARRIER: 512                     // TP-29: the CARRIER bound
export const WINDOW: 30                         // TP-29: the visible individuated window

export type LaneId =
  | "schema" | "git" | "cont" | "agent"                          // near-still
  | "step"                                                       // bursty-per-program
  | "manifest" | "tree" | "file"                                 // per-artifact
  | "context" | "entry" | "value" | "annotation" | "query" | "result"  // steady-fast
  | "chunk"                                                      // bursty-fastest
  | "unregistered"                                               // the residue lane

/** The sixteen lanes in RULED order (aesthetics §1.3): speed class
 * ascending, `unregistered` last. Length 16; index into it is `col`. */
export const LANES: ReadonlyArray<LaneId>

/** Where each class boundary falls, for the gutter ladder. Indices into
 * LANES at which a CLASS gutter (30px) replaces an intra gutter (15px);
 * the `unregistered` boundary uses 45px. */
export const CLASS_STARTS: ReadonlyArray<number>   // [0, 4, 5, 8, 14, 15]

export const laneIndex: (lane: LaneId) => number
/** CR-42, one authority: `col` is DERIVED from the receipt's tag.
 * Every tag the generated registry does not name maps to
 * `"unregistered"`. */
export const laneOfTag: (tag: number) => LaneId
/** N9, copied not reinvented (`bin/cli/history.ts:75-78`): the registry
 * name, else bare hex `0x` + two-padded lowercase. */
export const kindName: (tag: number) => string
/** The PINNED micro-tint index (TP-13): the address's first hex nibble
 * mod 5. REQUIRES /^[0-9a-f]/ — established by `decodeHistory`. */
export const tintIndex: (address: string) => 0 | 1 | 2 | 3 | 4

export type Receipt = typeof wordLogEntrySchema.Type   // S0's mirror, not a copy
export type WordHistory = typeof wordHistorySchema.Type

/** One column's IMMUTABLE snapshot (TP-10). Replaced, never mutated. */
export interface Column {
  readonly count: number                    // View.height t — every receipt ever folded into this lane
  readonly tailRevision: number             // DERIVED: seq of the newest receipt in `tail`, or -1
  readonly tail: ReadonlyArray<Receipt>     // View.lastK t k — at most K_CARRIER, newest last
}

export const Status: /* defineTaggedUnion */ {
  Idle: {}, Loading: {}, Live: {}, Refused: { reason: string }
}
export type Status = typeof Status.Type

export interface Model {
  readonly status: Status
  readonly mark: number                      // ONLY ever assigned from a page's `next`
  readonly columns: ReadonlyArray<Column>    // length === LANES.length, in LANES order
}

export const emptyModel: Model               // Idle, mark 0, 16 empty columns
export const columnOf: (model: Model, lane: LaneId) => Column
export const totalCount: (model: Model) => number    // Σ column counts
```

`Model` is additionally declared as an Effect `Schema.Struct` (the
skeleton's precedent, `src/main.ts:36`) so S3b can hand it to the
foldkit `Runtime` unchanged. The battery does not test the schema
declaration; it tests the values.

### `src/trunk/fold.ts` — the seq-guarded fold

```ts
export type Decoded =
  | { readonly _tag: "Accepted"; readonly history: WordHistory }
  | { readonly _tag: "Malformed"; readonly reason: string }

/** The door. Decodes through S0's generated `wordHistorySchema` and
 * nothing else, then applies the two structural preconditions that make
 * the fold's REQUIRES establishable (L-F7, L-F8). */
export const decodeHistory: (input: unknown) => Decoded

/** The fold. REQUIRES R2..R4, established by `decodeHistory`. */
export const foldPage: (model: Model, page: WordHistory) => Model

/** The seam S3b's `update` actually calls: decode, then fold. On
 * `Malformed` it returns the model with `status: Refused{reason}` and
 * `mark`/`columns` REFERENCE-identical (E6) — the fail-closed
 * transition, owned by the engine rather than by the caller. */
export const foldDocument: (model: Model, input: unknown) => Model

/** Concatenation of two adjacent pages — the host face of the word's
 * own `++`. Defined when `a.next === (b.word[0]?.seq ?? a.next)`. */
export const concatPages: (a: WordHistory, b: WordHistory) => WordHistory
```

### `src/trunk/placement.ts` — index space, the algebra's object

```ts
export type Op =
  | { readonly _tag: "Square"; readonly col: number; readonly row: number; readonly address: string }
  | { readonly _tag: "Strip";  readonly col: number; readonly fromRow: number; readonly count: number }

/** The frozen DOI partition. `floor[col]` is the first INDIVIDUATED row
 * of that column; rows below it are Strip. Recomputed ONLY at a cut
 * (CANVAS §4: "aggregation is a CUT EVENT"). */
export interface Doi {
  readonly window: number
  readonly floor: ReadonlyArray<number>     // length === LANES.length
}

export const initialDoi: Doi                       // floor all zeros
export const cutDoi: (model: Model, window: number) => Doi

/** The FULL, unculled placement. Count honesty is stated here, never on
 * `place`'s culled output. */
export interface Placement {
  readonly doi: Doi
  readonly ops: ReadonlyArray<Op>            // canonical order: col asc, then startRow asc
}
export const placementOf: (model: Model, doi: Doi) => Placement

export const startRow: (op: Op) => number          // row | fromRow
export const covered: (op: Op) => number           // 1 | count
export const opTotal: (p: Placement) => number     // Σ covered
```

### `src/trunk/place.ts` — the ONE function where pixels are born

```ts
export const GEOMETRY: {
  readonly squareCss: 12; readonly gapCss: 3; readonly pitchCss: 15
  readonly laneCss: 12; readonly gutterIntraCss: 15
  readonly gutterClassCss: 30; readonly gutterUnregisteredCss: 45
  readonly canvasWidthCss: 507
}
export const OVERDRAW_CSS: 300      // Perfetto's virtual_canvas.ts, attributed
export const DRIFT_CSS: 200         // Perfetto's, attributed
export const GOLDEN_DPRS: readonly [1, 1.5, 2, 3]     // TP-13

export interface Viewport {
  readonly widthCss: number
  readonly heightCss: number
  /** Document y of the viewport's TOP edge. Document space is anchored
   * at the BASELINE (y = 0) and grows NEGATIVE upward, so a square's
   * document band is a function of (col, row) alone, for life. */
  readonly originYCss: number
}

/** DEVICE pixels, integers, all four fields. `x/dpr` is exactly
 * TP-4's `round(x·dpr)/dpr`; the integer is the representation that
 * makes the laws decidable without float equality. */
export interface Rect {
  readonly x: number; readonly y: number
  readonly w: number; readonly h: number
  readonly of: Op
}

export const columnOriginCss: (col: number) => number
/** Document-space band of a row, INDEPENDENT of the word (L-P1). */
export const rowBandCss: (row: number) => { readonly topCss: number; readonly bottomCss: number }

export const place: (p: Placement, v: Viewport, dpr: number) => ReadonlyArray<Rect>

/** The decidable checker (CR-13/CR-14): `Placement.Disjoint` as a
 * predicate the battery runs on every generated placement. */
export const isDisjoint: (rects: ReadonlyArray<Rect>) => boolean

export interface Epoch {
  readonly viewport: Viewport
  readonly dpr: number
  readonly theme: string
  readonly classifierRevision: number
  readonly doi: Doi
}
export type Terminator =
  | "resize" | "dpr" | "scroll-drift" | "theme" | "classifier" | "cut" | "carrier"
export const terminators: (before: Epoch, after: Epoch, model: Model) => ReadonlyArray<Terminator>

/** The engine's byte gate, and the pinned numbers S3b's SVG goldens
 * must reproduce. Format in §5. */
export const canonicalRects: (rects: ReadonlyArray<Rect>, v: Viewport, dpr: number) => string
```

---

## 1. The algebra

Write `w` for the store word, `⧺` for its append, `t` for a lane.

**The fold is a `View` in the Lean sense** — `run` into the carrier
`(Nat × Word_{≤k})^16`, `merge` componentwise, `empty` the sixteen
empty columns:

```
run(w)[t]        = ( |column t w| , lastK k (column t w) )
merge(a, b)[t]   = ( a.count + b.count , lastK k (a.tail ⧺ b.tail) )
empty[t]         = ( 0 , [] )
```

`run_nil` and `run_append` are `View.height`'s and `View.lastK`'s, one
per component, closed under `View.prod` (View.lean:104). `column_append`
(Column.lean:86) is why merge is componentwise at all;
`mem_column_or_unregistered` (Column.lean:94) with `columnBy_disjoint`
(Column.lean:63) is why the sixteen components partition the word.

**`lastK` is R0 — order sensitive, NOT replay safe.** The host therefore
does not fold a page; it folds the page's *new suffix*:

```
guard(m, p)      = [ e ∈ p.word | e.seq ≥ m.mark ]
foldPage(m, p)   = ( Live , p.next , merge(m.columns, run(guard(m,p))) )
```

The guard is what makes `run_append` usable in a world where the
transport may re-deliver. `foldPage` is then a right action of the
page monoid on models, and every law below is that action's algebra.

**Placement is a total, exactly-once cover of `[0, count)` per column:**

```
ops(t)  =  ( floor[t] > 0  ?  { Strip(t, 0, floor[t]) }  :  ∅ )
        ∪  { Square(t, r, addr(t, r))  |  floor[t] ≤ r < count[t] }
```

with `floor[t] ≤ count[t]` and `count[t] − floor[t] ≤ |tail[t]|` (the
carrier can supply an address for every individuated row — the domain
obligation). Coverage exactly once gives count honesty by construction:
`floor + (count − floor) = count`.

**`place` is an affine map into device space, snapped at the EDGES:**

```
xdev(c)      = round( columnOriginCss(c) · dpr )
ydev(y)      = round( (y − originYCss) · dpr )
rect(op)     = { x: xdev(col), y: ydev(top), w: xdev(col)+lane − xdev(col),
                 h: ydev(bottom) − ydev(top) }
```

Snapping the two EDGES and subtracting is not the same function as
snapping the position and the size independently, and §3's L-P3 exhibits
the word where the difference is a violated invariant.

---

## 2. The headings

```
REQUIRES   Run-relative, over the STARTING model and the delivered page:

  R1  `model` satisfies CI-1..CI-5 (§2a).
  R2  `page` decoded through S0's `wordHistorySchema` — the workbench
      never parses the wire itself (README law: described surfaces are
      generated, never hand-typed).
  R3  `page.word` is strictly increasing in `seq` (W5: no reorder).
      NOT assumed contiguous: gaps are admitted, and count honesty is
      stated over what was FOLDED, never over what the store holds.
  R4  every `address` is /^[0-9a-f]{64}$/ (establishes `tintIndex`'s
      precondition — see OPEN-2).
  R5  for `place`: `dpr > 0`; for the uniform-marks law at its strict
      strength, `GEOMETRY.squareCss · dpr ∈ ℤ` (see L-P6).

  R3 and R4 are ESTABLISHED, not assumed: `decodeHistory` decides them
  and returns `Malformed` otherwise (the §2.10 unestablished-precondition
  falsifier is thereby closed at the door rather than deferred).

ENSURES    Two-state, `old` = the model before the page:

  E1  mark' = page.next.  Unconditionally, including backwards.
  E2  ∀t. count'[t] = count[t] + |{e ∈ guard(old, page) : lane(e.tag) = t}|
  E3  ∀t. tail'[t] = lastK(k, tail[t] ⧺ guarded receipts of t)
  E4  ∀t. tailRevision'[t] = seq of last(tail'[t]), or −1 when empty
  E5  status' = Live
  E6  on refusal: mark' = mark, columns' = columns (reference-identical),
      status' = Refused{reason}
  E7  ∀t not touched by the page: columns'[t] === columns[t] (reference)

DECREASES  Nothing recurses. Every operation is a fold or a map over a
           finite list; |page.word| bounds the fold, |LANES| = 16 bounds
           the placement, |ops| bounds `place`. No variant is owed.

FRAME      foldPage      reads  model.mark, model.columns, page
                         writes model.status, model.mark, model.columns
                         (a NEW Model value; no argument is mutated —
                         `Object.isFrozen` is not required, structural
                         non-mutation is, L-F9)
           placementOf   reads  model.columns[*].count/.tail, doi
                         writes nothing
           place         reads  placement, viewport, dpr
                         writes nothing
           Nothing in S3a reads the DOM, `window`, `document`,
           `devicePixelRatio`, `Date`, `Math.random`, or the network.
           DPR and the viewport ARRIVE as arguments (TP-4). L-P8 decides
           this from the module text.
```

### 2a. The carrier invariant (`Valid`, the `invariant` class)

```
CI-1  columns.length = LANES.length = 16
CI-2  ∀t. tail[t].length = min(K_CARRIER, count[t])
      — the equation `lastK_length` proves, not an inequality
CI-3  ∀t. tail[t] is strictly increasing in seq, and every entry's
      lane is t          (columnBy_disjoint's host face)
CI-4  ∀t. tailRevision[t] = last(tail[t]).seq, or −1 when tail is empty
CI-5  mark ≥ 0
```

Every law below is conditioned on CI-1..CI-5 and re-establishes them —
"Valid in, broken out" (BREAKER.md §10.1) is a live falsifier shape here
and L-F10 executes it.

---

## 3. The laws and their falsifiers

Each law: the equation, the exhibit-form falsifier, the battery file.
`≡` is deep structural equality; `===` is reference equality.

### Model, lanes, classifier (`src/trunk/model.test.ts`)

```
LAW  L-M1   The lane set is the generated registry's, not a hand table.
            sort(LANES \ {"unregistered"}) = sort(KindTagRows.map(.name))
            ∧ LANES.length = 16 ∧ |{LANES}| = 16
FALSIF      exhibit a name in LANES that KindTagRows does not carry, or
            a KindTagRows name absent from LANES.
LICENCE     TP-30 (15 sorts, 16 lanes); the workbench README's law
            ("described surfaces are generated, never typed by hand").
BATTERY     model.test.ts "the lane list is a permutation of the
            generated sort names plus unregistered"

LAW  L-M2   The classifier is the grammar's, one authority (CR-42).
            ∀ row ∈ KindTagRows. laneOfTag(row.tag) = row.name
            ∧ ∀ n ∉ GrammarKindTags. laneOfTag(n) = "unregistered"
FALSIF      exhibit a registry tag classified into the wrong lane, or an
            unregistered tag classified into a sort lane (that receipt is
            then silently DROPPED from the residue strip and count
            honesty dies with it).
LICENCE     Column.lean:75 `column`, :82 `unregistered`,
            :94 `mem_column_or_unregistered`.
BATTERY     model.test.ts "every registry tag lands in its own lane" /
            "every tag outside the registry lands in unregistered"

LAW  L-M3   N9 is COPIED, never reinvented.
            ∀ row. kindName(row.tag) = row.name
            ∧ ∀ n ∉ GrammarKindTags.
                 kindName(n) = "0x" + n.toString(16).padStart(2,"0")
FALSIF      exhibit a tag for which kindName differs from
            `bin/cli/history.ts:75-78`'s answer — two registers of the
            same document disagreeing about what a stored node is called.
LICENCE     SPEC N9: "the trunk copies that exact fallback rather than
            inventing a second one".
BATTERY     model.test.ts "unknown tags render as the CLI's bare hex"

LAW  L-M4   The tint index is PINNED and byte-stable (TP-13).
            ∀ a. tintIndex(a) = parseInt(a[0], 16) mod 5
            ∧ the fixture's addresses realize all five steps
FALSIF      exhibit an address whose tint is not the first nibble mod 5
            — e.g. any implementation reading a[0]'s CHAR CODE, or
            `"a" % 5` (= NaN), the two failures TP-13 names.
LICENCE     aesthetics §2.2 + TP-13.
BATTERY     model.test.ts "the tint index is the first hex nibble mod 5"

LAW  L-M5   The lane ORDER realizes the ruled gutter ladder.
            columnOriginCss(15) + 12 = 507
            ∧ ∀c. columnOriginCss(c+1) − columnOriginCss(c) ∈ {27, 42, 57}
FALSIF      exhibit a lane order or gutter assignment whose canvas width
            is not 507 — the number aesthetics §1.5 derives from
            16·12 + 10·15 + 4·30 + 45 and which must fit --measure 62ch.
LICENCE     aesthetics §1.3 (the speed-class order) + §1.5 (the widths).
BATTERY     place.test.ts "the ruled lane order lays out to 507 css px"
```

### The fold (`src/trunk/fold.test.ts`)

```
LAW  L-F1   INCREMENTAL EQUALS FRESH (run_append's host face).
            foldPage(foldPage(m, p1), p2) ≡ foldPage(m, concatPages(p1,p2))
            for every m satisfying CI-*, and every adjacent p1, p2.
FALSIF      exhibit m, p1, p2 with the two sides unequal.
            The exhibit that kills the naive build: a column whose
            combined length exceeds k — merging two tails without
            re-applying lastK gives a tail of length > k on the left and
            = k on the right.
            The exhibit that kills a COUNTER tailRevision: any p1, p2 at
            all — an opaque per-fold counter reaches 2 incrementally and
            1 freshly. This is why §0 DERIVES tailRevision from content
            (E4); the strengthening is the breaker's, over TP-10's
            unspecified "revision".
LICENCE     View.lean `run_append`, closed under `View.prod`; on the
            bounded component, `lastK_append` (the window localizes over
            append) and `lastK_assoc` (three pages merged left-first and
            right-first give one window — the reason the multi-page case
            needs no separate law). TP-24 (the fold ships gated by this
            property, not by S4's registry).
BATTERY     fold.test.ts "incremental equals fresh" (fixture pages, and
            a property over generated page splits)

LAW  L-F2   SEQ-GUARD REPLAY. Re-delivering a folded page is identity.
            foldPage(foldPage(m, p), p) ≡ foldPage(m, p)
            ∧ ∀ p' ⊆ p with p'.next ≤ (foldPage(m,p)).mark:
                 foldPage(foldPage(m,p), p') ≡ foldPage(m,p) except mark
FALSIF      exhibit a re-delivered page after which Σ counts doubled, or
            a tail carrying a duplicate seq (CI-3 broken out).
            The specific exhibit the fixture carries: `overlapping`
            (seqs 76..83 re-sent after mark 80) — an unguarded fold
            double-counts exactly four receipts.
LICENCE     **`lastK_not_idem`, landed** — `lastK 2 ([x] ++ [x]) ≠ [x]`:
            the algebra will NOT supply replay safety, so the host must.
            TP-14 / Lane B's rung statement (R0). Its sibling
            `lastK_not_comm` licenses REQUIRES R3 in the same breath:
            two deliveries of the same receipts in different orders give
            different windows, so a reordered page is a refusal (L-F7),
            never something to sort.
BATTERY     fold.test.ts "re-delivering a page changes nothing" /
            "a half-overlapping page folds only its new suffix"

LAW  L-F3   THE MARK LAW. model.mark is only ever assigned from `next`.
            ∀ m, p. foldPage(m, p).mark = p.next
            — including p.word = [] and including p.next < m.mark.
FALSIF      exhibit a page where next ≠ max(seq)+1 and the mark takes
            max(seq)+1 instead. The fixture carries three:
            `emptyAtTip` (word empty, next 220), `emptyMidWord`
            (next 80), `truncated` (next 7 delivered at mark 220 —
            the mark must move BACKWARDS; `Math.max(mark, next)` dies
            here).
LICENCE     TP-19b (`mark` is a receipt INDEX); W5 (`next` ≡ the word's
            length); TRUNK-PLAN §3 "mark only from `next`".
BATTERY     fold.test.ts "the mark is the page's next, never a receipt's
            seq" / "a truncation moves the mark backwards"

LAW  L-F4   TOTALITY. Every folded receipt lands in exactly one lane.
            Σ_t count[t] = |accepted receipts|
            ∧ no receipt appears in two lanes' tails
FALSIF      exhibit a receipt counted twice, or one counted nowhere —
            the unregistered tag is the live case: 220 receipts fed,
            Σ counts must be 220 with unregistered = 3 (tags 0xc8 ×2,
            0x2a ×1).
LICENCE     Column.lean:94 `mem_column_or_unregistered` +
            :63 `columnBy_disjoint`.
BATTERY     fold.test.ts "every receipt lands in exactly one lane"

LAW  L-F5   THE MEMO LAW (TP-10, strengthened to reference equality).
            ∀t. foldPage(m,p).columns[t] === m.columns[t]
                ⟺ no guarded receipt of p has lane t
            ∧ key(c) := (c.count, c.tailRevision) satisfies
                 key(c1) = key(c2) ⟺ c1 ≡ c2, within one fold chain
FALSIF      (a) UNDER-invalidation: exhibit a fold that changes a
            column's content while `key` is unchanged — the lazy group
            then renders stale.
            (b) OVER-invalidation: exhibit a fold touching only lane i
            after which lane j's snapshot is a new object — createLazy
            compares by ===, so the memo never hits and every column
            re-renders on every page. THIS is TP-10's actual failure
            ("rebuilds the entire shape array from scratch every frame…
            no memoization of any kind").
LICENCE     TP-10; foldkit's `createLazy` compares the function
            reference, the dispatch, and every argument by ===.
BATTERY     fold.test.ts "a fold touching one lane leaves every other
            lane's snapshot reference-identical" / "the memo key changes
            exactly when the snapshot does"

LAW  L-F6   THE MEMORY LAW. No store mirror, ever.
            (i)  ∀t. tail[t].length ≤ min(count[t], K_CARRIER)
            (ii) receipts reachable from the model ≤ 16 · K_CARRIER = 8192
            (iii) |JSON.stringify(model)| ≤ B, B = 1_400_000 bytes
                  (16 lanes · 512 receipts · ~150 bytes + header slack;
                   CANVAS §3's "~1 MB at 10⁷ across 15 columns, k≈512")
            (iv) after 10⁵ receipts, |serialize(model)| < 10% of the
                 serialized word that produced it
FALSIF      exhibit a word after which any of (i)–(iv) fails: the direct
            exhibit is a model retaining every receipt (tail.length =
            count), which passes every functional test in this battery
            and fails only here.
LICENCE     CANVAS §3 (the bounded carrier); SPEC §6 "no store mirror,
            therefore no second admission authority"; TRUNK-PLAN §6.
MEASURED    100 pages × 1000 synthetic receipts, seqs 0..99_999, lanes
            cycled over all 17 fixture tags, folded from emptyModel;
            then the four assertions. Sub-second; no timing assertion is
            made and none is owed.
BATTERY     fold.test.ts "the model is bounded by f(k, lanes) after 10⁵
            receipts"

LAW  L-F7   FAIL-CLOSED DECODE. A malformed document REFUSES; it never
            partially folds.
            decodeHistory(x)._tag = "Malformed"  for x failing R2/R3/R4
              (and for next < 0, which CI-5 forces through E1)
            ∧ foldDocument(m, x) ≡ {…m, status: Refused{reason}}
              with mark and columns REFERENCE-identical (E6)
FALSIF      exhibit a malformed document after which the model's columns
            or mark moved — a partial fold leaves the carrier in a state
            no law describes (CI-* broken out).
            The exhibits: a document missing `next`; one missing `word`;
            one whose `word` is not an array; `next = -1`; a word out of
            seq order (`outOfOrder`, seqs 0,2,1,3); a receipt whose
            address is not 64 lowercase hex.
LICENCE     TRUNK-PLAN §3 (the four-state union exists precisely because
            "asked and was refused" is not representable without it);
            estate fail-closed discipline.
BATTERY     fold.test.ts "a malformed document refuses and moves nothing"

LAW  L-F8   THE FOUR STATES ARE FOUR. Idle, Loading, Live, Refused are
            distinct inhabited arms; `Idle` ≠ `Refused{…}` as facts.
            foldPage never produces Idle or Loading.
FALSIF      exhibit a Model in which "never asked" and "asked and was
            refused" are the same value — the review's §8 finding that
            `{mark, columns}` alone cannot represent refusal.
LICENCE     TRUNK-PLAN §3 Lane C; the skeleton's own `Probe` precedent
            (`src/main.ts:25-33`).
BATTERY     fold.test.ts "refusal is a distinct fact from never having
            asked"

LAW  L-F9   NO MUTATION OF SNAPSHOTS (the `frame` class).
            foldPage(m, p) leaves m structurally unchanged: a deep clone
            of m taken before the call is deep-equal to m after it, and
            every retained column object is === its original.
FALSIF      exhibit a fold that pushes onto an existing tail array — the
            ring-buffer implementation TP-10 names, which stays === for
            ever and therefore never re-renders.
LICENCE     TP-10 ("an immutable per-column snapshot value replaced (not
            mutated) on each fold").
BATTERY     fold.test.ts "folding does not mutate the model it was given"

LAW  L-F10  VALID IN, VALID OUT.
            CI-1..CI-5 hold of foldPage(m, p) whenever they hold of m.
FALSIF      exhibit m ⊨ CI and p with CI broken on the result — a tail
            longer than k, a tail carrying a foreign lane's receipt, a
            tailRevision disagreeing with its tail's last seq.
LICENCE     BREAKER.md §10.1 "valid in, broken out"; ch. 10.
BATTERY     fold.test.ts "the carrier invariant survives every fold"
            (asserted after EVERY fold in every other case, via
            `expectValid` in the harness)
```

### The placement (`src/trunk/placement.test.ts`)

```
LAW  L-C1   EXACTLY-ONCE COVER. For every column, the ops cover
            [0, count) with no row covered twice and no row uncovered.
FALSIF      exhibit a column whose covered rows are not exactly
            [0, count): a strip and a square overlapping at the window
            boundary (the classic off-by-one, §12.3/§13.7), or a gap
            where floor was computed from a stale count.
LICENCE     Column.lean:94 + :63 lifted to rows; CANVAS §2.
BATTERY     placement.test.ts "the ops cover every row exactly once"

LAW  L-C2   COUNT HONESTY (the Perfetto carry).
            Σ_{Square} 1 + Σ_{Strip} count = Σ_t count[t] = receipts folded
            — stated on the PLACEMENT, never on `place`'s culled output.
FALSIF      exhibit a placement whose op total ≠ the model's total —
            a Strip that forgot its `count` (the collapse that stops
            being honest), or a column dropped because its count is 0
            and the loop `continue`d past the residue lane.
LICENCE     TRUNK-PLAN §6; CANVAS §8 (Perfetto "carries a count through
            the collapse so it stays honest").
BATTERY     placement.test.ts "square count plus strip counts equals the
            total folded"

LAW  L-C3   THE CUT LAW. The DOI floor moves ONLY at a cut.
            placementOf(m', doi).floor = placementOf(m, doi).floor = doi.floor
            for every m, m' — `placementOf` never recomputes the
            partition; `cutDoi` is the only producer of a Doi.
FALSIF      exhibit two folds under one Doi after which a row that was a
            Square is a Strip — the window has slid mid-epoch, which is
            aggregation acting outside a cut event.
LICENCE     CANVAS §4: "At a cut: the DOI partition recomputes
            (aggregation is a CUT EVENT — the ONLY place recency/focus
            may act)".
BATTERY     placement.test.ts "the individuated floor does not move
            between cuts"

LAW  L-C4   THE EXTENSION LAW, epoch-local and per column.
            For terminators(before, after, m') = [] :
              ops(placementOf(m, doi)) is a SUBSEQUENCE of
              ops(placementOf(foldPage(m,p), doi)) under the canonical
              order, every retained op deep-equal to its original.
FALSIF      exhibit a growth under one Doi after which an old op changed,
            moved, or vanished.
            ** The adversarial implementation this kills** (the
            `adequacy` discharge, recorded in §6): lay the column out
            from its TOP — y(row) = (count − 1 − row) · pitch. It renders
            identically to the eye, passes L-C1, L-C2, L-P1's
            integrality, disjointness and determinism, and fails ONLY
            here: every append shifts every existing square by one pitch.
            Baseline anchoring (§0 `rowBandCss`) is what buys the law.
LICENCE     CANVAS §4 (between cuts layout IS monotone); §2 (the measure
            is per-column counts); TRUNK-PLAN §6.
NOTE        The seed line reads "prefix ops identical". SUBSEQUENCE is
            the correct word: growth appends inside each column's block
            and the canonical order is column-major, so the old list is a
            subsequence of the new, not a prefix of it. Strengthened, not
            watered down — the subsequence statement is checkable and the
            prefix statement is false for any model with ≥ 2 non-empty
            lanes. See §4 FLAG-1.
BATTERY     placement.test.ts "growth extends the placement and moves
            nothing"

LAW  L-C5   THE CARRIER FLOOR. A Square is emitted only for a row whose
            receipt is actually held.
            ∀ Square(t, r, a). r ≥ count[t] − tail[t].length
            ∧ a = tail[t][r − (count[t] − tail[t].length)].address
FALSIF      exhibit a Doi with floor[t] < count[t] − k and a placement
            that emits a Square for a row below the carrier — the
            implementation must either invent an address, read
            `undefined`, or crash (all three are the `domain` class).
            CANVAS §3's stated price made executable.
LICENCE     CANVAS §3 ("with a bounded window, a strip's interior
            addresses are not held").
BATTERY     placement.test.ts "no square is emitted without its address"

LAW  L-C6   FULL-PITCH STRIPS (TP-1/TP-2, the ruled reading).
            A Strip's document band equals the union of the bands its
            rows would occupy as Squares: no compression, no band, no
            sediment.
FALSIF      exhibit a Strip whose height ≠ count·pitch − gap — i.e. a v1
            that compressed, which would move positions and void L-C4.
LICENCE     TRUNK-PLAN §1 (TP-1/TP-2): "v1's `Strip` is the
            UNCOMPRESSED, FULL-PITCH run"; aesthetics §1.6 defers the
            band to layer 2.
BATTERY     place.test.ts "a strip occupies exactly the rows it covers"

LAW  L-C7   CANONICAL OP ORDER. ops are sorted by (col asc, startRow
            asc), and a column's Strip precedes its Squares.
FALSIF      exhibit two placements of the same model whose op lists
            differ in order — determinism (L-P5) and the subsequence
            law (L-C4) both rest on this.
LICENCE     the equality this packet states is structural; without a
            canonical order it is not decidable.
BATTERY     placement.test.ts "ops arrive in canonical order"
```

### `place` (`src/trunk/place.test.ts`)

```
LAW  L-P1   POSITION IMMUTABILITY, in DOCUMENT space (CR-5).
            rowBandCss(r) is a function of r alone — no model, no count,
            no viewport, no dpr.  bottom(r) = −r·15, top(r) = −r·15 − 12.
FALSIF      exhibit two words for which one row's document band differs.
            (This is L-C4's premise, isolated so it fails on its own.)
LICENCE     CANVAS §4: "'Positions never move' is a DOCUMENT-space law;
            device space scrolls"; aesthetics §1.5 upward growth from a
            COMMON BASELINE, "keeps every square's offset from the base
            immutable for life".
BATTERY     place.test.ts "a row's document band never depends on the
            word"

LAW  L-P2   DEVICE INTEGRALITY (TP-4).
            ∀ rect ∈ place(P, V, dpr). x, y, w, h ∈ ℤ ∧ w > 0 ∧ h > 0
            ∧ the CSS value x/dpr equals TP-4's round(x·dpr)/dpr
FALSIF      exhibit a rect with a fractional device coordinate — the
            integer-CSS-px reading TP-4 rejects produces one at dpr 1.5
            on every odd row.
LICENCE     TP-4; CANVAS §2 ("every coordinate rounded to integer DEVICE
            pixels"); aesthetics §1.5 (round(x·dpr)/dpr).
BATTERY     place.test.ts "every coordinate is an integer device pixel,
            at all four golden DPRs"

LAW  L-P3   EDGE SNAPPING, NOT SIZE SNAPPING — and the baseline holds.
            ∀ rect. rect.y + rect.h ≤ ydev(baseline = 0)
            ∧ the row-0 op's bottom edge = ydev(0) exactly
FALSIF      **Exhibited, concretely.** dpr = 1.5, originYCss = 0, a
            Strip covering rows 0..1 (count 2). Its CSS band is
            [−27, 0], height 27.
              edge-snapped:  y = round(−40.5) = −40, bottom = round(0) = 0,
                             h = 40 → band [−40, 0]  ✓
              size-snapped:  y = round(−40.5) = −40,
                             h = round(27·1.5) = round(40.5) = 41
                             → band [−40, +1]  ✗ one device pixel BELOW
                                the baseline
            `Math.round` breaks the −40.5/+40.5 tie in opposite
            directions, so |round(a)| ≠ round(|a|) and the two snapping
            disciplines are different functions. The 2-row strip is the
            smallest witness; the fixture's chunk lane supplies plenty.
LICENCE     CANVAS §2 (CR-25/CR-26 snapping discipline); aesthetics §1.5.
BATTERY     place.test.ts "no rect crosses the baseline" /
            "edge snapping and size snapping disagree, and the contract
            takes edges"

LAW  L-P4   DISJOINTNESS, as a decision procedure run on EVERY generated
            placement (CR-13/CR-14).
            isDisjoint(place(P, V, dpr)) for every P, V, dpr — no two
            rects share a device pixel; and isDisjoint is honest
            (it returns false on a hand-built overlapping pair).
FALSIF      exhibit a placement whose rects overlap. Two shapes to try:
            adjacent rows at a dpr where the 3px CSS gap rounds to 0
            device px; adjacent lanes where a lane width of 12 and a
            gutter of 15 both round up.
            ALSO falsify the CHECKER: a checker that always returns true
            passes every other case in this battery.
LICENCE     CANVAS §2: integer-snapped disjoint fills = pixel
            disjointness, "the stated premise under paint-order
            irrelevance"; §1 (CR-40: the paint hom's commutativity is
            BOUGHT by this premise, never assumed).
BATTERY     place.test.ts "no two rects share a device pixel" /
            "the disjointness checker refuses an overlapping pair"

LAW  L-P5   DETERMINISM. Same (Placement, Viewport, DPR) ⇒ deep-equal
            Rect[] ⇒ byte-identical canonicalRects.
            place(P,V,d) ≡ place(P,V,d) ∧
            canonicalRects(place(P,V,d),V,d) = canonicalRects(…) as bytes
FALSIF      exhibit two calls disagreeing — an implementation reading
            `window.devicePixelRatio`, `Date.now()`, iteration order of a
            Map keyed by object, or a Set of lanes.
LICENCE     TRUNK-PLAN §6; CANVAS §5 (agreement is GEOMETRIC — the gate
            compares `place`'s rect lists).
BATTERY     place.test.ts "place is deterministic" / "canonicalRects is
            byte-stable across runs and at all four golden DPRs"

LAW  L-P6   UNIFORM MARKS — presence, never magnitude.
            At every dpr with 12·dpr ∈ ℤ (the four goldens included):
              all Square rects have identical w and h.
            At any other dpr: their w and h vary by at most 1 device px.
FALSIF      exhibit two Squares of different size at dpr ∈ {1,1.5,2,3};
            or exhibit a Square whose size encodes anything about its
            receipt (size in bytes is the tempting one, and it is
            refused: the mark carries presence only).
NOTE        The seed line "all Square rects equal dimensions" is FALSE
            as stated for a CORRECT edge-snapping implementation at
            dpr = 1.1, where 12·1.1 = 13.2 and edge-snapped heights
            alternate 13/14. Stated at its true strength above rather
            than watered down. See §4 FLAG-2.
LICENCE     CANVAS §7 ("squares as uniform presence marks — the
            strongest claim in the set"); aesthetics §1.5.
BATTERY     place.test.ts "every square has the same device dimensions
            at the golden DPRs"

LAW  L-P7   VIRTUALIZATION, and what it does NOT change.
            place culls to [originY − 300, originY + height + 300] CSS
            ∧ culling is by document band only: a rect present at one
              viewport is byte-identical at any viewport containing it
            ∧ |place(P,V,d)| ≤ (16 · ceil((V.heightCss + 600)/15)) + 16
FALSIF      exhibit a rect whose coordinates change when the viewport
            merely grows to include more of the document — culling that
            re-lays out rather than filtering.
            ALSO: exhibit a placement of 10⁵ rows whose place() returns
            10⁵ rects (no virtualization at all — the ruled item TP-15
            found unassigned).
LICENCE     TP-15 (ruled, must be carried by a slice); CANVAS §8's
            two-threshold discipline, attributed to Perfetto's
            `virtual_canvas.ts` (~300 px overdraw, ~200 px drift).
BATTERY     place.test.ts "place culls to the overdrawn viewport" /
            "culling filters, it never re-lays out"

LAW  L-P8   THE ENGINE IS BROWSERLESS AND PURE.
            No module under src/trunk reads `window`, `document`,
            `devicePixelRatio`, `Date`, `performance`, `Math.random`,
            `globalThis`, or `fetch`; DPR and the viewport arrive as
            arguments (TP-4).
FALSIF      exhibit one such reference in the module text — grep is the
            executable form and the battery runs it.
LICENCE     TRUNK-PLAN §3 ("S3a — the engine (pure, browserless)");
            TP-4; the `frame` heading above.
BATTERY     place.test.ts "the engine names no browser global"

LAW  L-P9   EPOCH TERMINATORS, enumerated and decided.
            terminators(e, e, m) = []
            ∧ each of resize / dpr / scroll-drift(≥200 CSS px) / theme /
              classifier / cut / carrier is reported when and only when
              its own field moved
            ∧ L-C4's premise is exactly `terminators(…) = []`
FALSIF      exhibit an epoch change the list does not report, after which
            the extension law is silently assumed — a DPR change with a
            memo kept is the concrete one (every held rect is then wrong
            by a factor).
            ALSO: exhibit a 199 px scroll reported as a terminator
            (thrashing — the single-threshold failure CANVAS §8 names).
LICENCE     CANVAS §4's enumeration, MINUS the four CANVAS §8 deletes
            under CV-3′ (context loss/restore, tab restore, and the
            bitmap-clear repaint are canvas-only and v1 has no canvas;
            HMR/time-travel is carried by the lazy key including
            tailRevision, §8 verbatim). PLUS `carrier`, which the
            breaker adds: when count − floor would exceed the held tail,
            the floor is forced up and the extension law is void
            (see L-C5). See §4 FLAG-3.
BATTERY     place.test.ts "the terminator list reports every epoch
            change, and only real ones"
```

---

## 4. Flags for the grill — where the seed list did not survive contact

```
FLAG-1  §6's "placement(w++δ) extends placement(w) — prefix ops
        identical" is FALSE AS STATED for any model with two non-empty
        lanes, because the canonical op order is column-major and growth
        inserts inside each column's block. Restated as SUBSEQUENCE
        (L-C4), which is checkable and strictly stronger than nothing.
        Additionally: the law is FALSE even per column unless the DOI
        floor is frozen between cuts — otherwise ageing out of the
        window turns a Square into Strip coverage at the same row. The
        packet pins the frozen floor (L-C3) on CANVAS §4's own words.
        If the operator instead rules that the window recomputes every
        fold, L-C3 and L-C4 both change and this packet is amended by
        the breaker, not by the implementer.

FLAG-2  §6's "Uniform marks: all Square rects equal dimensions" is FALSE
        at DPRs where 12·dpr ∉ ℤ, for a CORRECT implementation. Pinned
        at its true strength (L-P6): exact at the four ruled goldens,
        ≤1 device px elsewhere.

FLAG-3  §6's determinism line asks for "byte-identical SVG". S3a has no
        SVG (that is S3b, and this packet's §7 edge forbids it). The
        byte gate is landed at engine level as `canonicalRects` (§5),
        whose numbers S3b's goldens must reproduce verbatim. The
        alternative — defer the byte gate entirely to S3b — leaves S3a's
        determinism claim with no byte-level falsifier at all, which is
        why it was refused.

FLAG-4  `tailRevision` is DERIVED (the tail's last seq, −1 when empty),
        not an opaque counter. TP-10 says "(count, tailRevision)" and
        does not say which. A counter makes L-F1 false on the nose; a
        derived value makes the memo key a content key and L-F1 an
        equality. The breaker chose the derivation and states it as
        contract.

FLAG-5  Rect carries DEVICE INTEGERS, not CSS floats. TP-4's formula
        `round(x·dpr)/dpr` is realized exactly as `x_device/dpr`; the
        integer is the representation. Reason: `round(v·1.5)/1.5·1.5`
        does not round-trip in binary floating point, so a CSS-float
        Rect makes L-P2 undecidable and goldens float-formatting
        dependent. If the operator wants CSS floats on the wire, the
        conversion is S3b's and the law stays here.

FLAG-6  MODULE COUNT. The dispatch proposed
        `src/trunk/{model,fold,placement,place}.ts`; the packet keeps
        exactly those four. The lane order, the classifier, `kindName`
        and `tintIndex` live in `model.ts` — they are the Model's own
        vocabulary and CR-42 wants ONE authority for `col`. A fifth
        `lanes.ts` is a defensible alternative and is not taken.

FLAG-7  FAST-CHECK. `fast-check@4.9.0` IS present in
        `experiments/workbench/node_modules` — as a DIRECT dependency of
        `effect@4.0.0-rc.112`, and NOT declared by the workbench's own
        package.json. Importing it today is a phantom dependency, which
        the breaker refused to introduce (and package.json is outside
        the breaker's write scope). The battery therefore ships a
        hand-rolled deterministic property runner in
        `src/trunk/fixtures/harness.ts` (`forAll`, seeded LCG, fixed
        case counts, no shrinking). **The packet's instruction to the
        implementer:** promote `fast-check` to an explicit
        `devDependencies` entry at `4.9.0` and regenerate `bun.lock`
        (`check:workbench` runs `bun install --frozen-lockfile`, so the
        lock must be regenerated in the same commit), then swap
        `forAll`'s body for `fc.assert(fc.property(...))`. The harness's
        signature was chosen to make that a body swap and not a rewrite.
        Until then the properties run at fixed case counts and REPORT
        no shrinking — a claim-scope fact, stated.

FLAG-8  The `at` field is not read by S3a at all. It is carried in the
        Model's tails (it is part of the receipt) and consumed by S3b's
        inspector. No law here mentions it; that is deliberate, not an
        omission.

FLAG-9  CLAIM SCOPE of the battery itself, stated rather than implied.
        The breaker probed the battery against a deliberately degenerate
        implementation (every function returning an empty or identity
        value; written outside the tree and DELETED — no stub was left
        behind, and the git history shows the breaker committing no
        `src/trunk/*.ts`). **49 of the 70 cases fire against it.** The
        21 that do not are equational and structural laws — `a ≡ b`,
        `x === y`, "the list is ordered", "no terminator fired" — which
        a constant function satisfies by construction. That is a
        property of the law shape, not a hole: the counting laws (L-F4,
        L-C2), the shape laws (L-F6, L-C1) and the arithmetic laws
        (L-M5, L-P1..P3, L-P6) all fire, and they are what pin the
        equational ones to a real implementation. The probe also
        confirmed the battery TYPECHECKS and LINTS clean against the
        frozen signatures, so the implementer's first red is contract
        work and never harness repair. Non-triviality guards were added
        to every equational case the probe caught passing vacuously.
```

### Open rulings the packet could not close

```
OPEN-1  A page whose `next` is BELOW the model's mark (operator
        truncation; `markOutOfOrder` in the log's own repair path) makes
        L-F3 and L-F2 pull against each other: mark moves backwards, and
        the next page's receipts are then no longer guarded out, so they
        fold a second time and L-F4 dies. TRUNK-PLAN files the case
        under S3b's INTEGRATION list; the FOLD's behaviour is S3a's and
        is unruled. Two candidates:
          (a) REFUSE — status Refused{"the store's word is shorter than
              this session's mark"}, mark and columns untouched;
          (b) RESET — discard all columns, refold from the new mark.
        The battery pins only what BOTH satisfy and what count honesty
        licenses on its own: **after a backwards `next` and a subsequent
        page, Σ counts equals the number of DISTINCT seqs ever accepted**
        — i.e. no silent double count. The test is written to accept
        either (a) or (b) and to fail the naive third behaviour. The
        operator's ruling closes it; the implementer BLOCKS rather than
        choosing.

OPEN-2  R4 (addresses are 64 lowercase hex) is a workbench-side
        strengthening of S0's generated `address: Schema.String`. The
        argument for it: `tintIndex` has no honest fallback — a wrong
        tint is silent corruption, unlike N9's bare hex, which is a fact
        rendered as a fact. The argument against it: the generated
        schema is the door, and a second opinion about what a receipt is
        is exactly what the mirrors exist to prevent. Pinned as R4 with
        the refusal at `decodeHistory`; if the operator rules it a second
        opinion, the swap is a total `tintIndex` returning a
        distinguished value that S3b renders at step 2, and L-M4 changes.
```

---

## 5. The pinned golden serialization (binding on S3b)

`canonicalRects(rects, viewport, dpr)` returns, exactly:

```
# dpr=<dpr> vw=<widthCss> vh=<heightCss> oy=<originYCss> n=<rects.length>\n
```
then one line per rect, in `place`'s order, each `\n`-terminated:
```
S <x> <y> <w> <h> <address> <tint>\n          for Square
T <x> <y> <w> <h> <fromRow> <count>\n         for Strip
```

- every numeric field is printed by `String(n)`; x/y/w/h are integers by
  L-P2, so no float formatting enters the bytes;
- `<tint>` is `tintIndex(address)`;
- single ASCII spaces, no trailing space, LF only, file ends with LF.

**S3b's SVG register must reproduce these numbers verbatim**: one
`<rect>` per Rect, in this order, under a single
`<g transform="scale(1/dpr)">` (CANVAS §8's camera-once trick), with
`x`/`y`/`width`/`height` equal to this line's four integers. Goldens are
taken at **dpr 1, 1.5, 2 and 3** (TP-13), at one pinned viewport, and
the `canonicalRects` output for the same inputs is the cross-check that
keeps the two artifacts from drifting.

---

## 6. Breaks

The adversarial implementations the breaker built and refuted while
writing this packet, recorded per CONTRACT.md §"The break ledger". None
has fired against an implementation yet — S3a does not exist. Each is a
`c'` that satisfies a WEAKER reading of §6's seed list while breaking
the intent, and each is the reason a law above is stated as it is.

```
ADEQUACY-1  top-anchored layout: y(row) = (count − 1 − row) · pitch.
            Satisfies count honesty, disjointness, integrality,
            determinism, uniform marks. Breaks L-C4/L-P1 on every
            append. Closed by baseline anchoring (rowBandCss).
ADEQUACY-2  size-snapping: y = round(top·dpr), h = round(height·dpr).
            Satisfies integrality and (for uniform squares) uniformity.
            Breaks L-P3 at dpr 1.5 on a 2-row strip: bottom = +1.
ADEQUACY-3  opaque per-fold `tailRevision` counter. Satisfies TP-10 as
            written. Breaks L-F1 for every pair of pages. Closed by E4.
ADEQUACY-4  window recomputed every fold (floor = count − WINDOW).
            Satisfies count honesty and coverage. Breaks L-C4 whenever a
            column crosses the window. Closed by L-C3's frozen floor.
ADEQUACY-5  `isDisjoint` returning a constant true. Satisfies L-P4 as
            the seed states it. Closed by the checker's own falsifier.
ADEQUACY-6  `mark = max(mark, next)`. Satisfies "mark only from next"
            read loosely. Breaks L-F3's truncation case.
```

---

## 7. The edge — what the implementer may NOT do

**Out of S3a entirely:**

- **No DOM, no SVG, no canvas, no foldkit view, no `Html`/`VNode`.**
  S3a is the engine; L-P8 greps for it.
- **No store mirror in the Model** — no array whose length grows with
  the word beyond `K_CARRIER` per lane (L-F6). SPEC §6: "no store
  mirror, therefore no second admission authority and no cached
  judgment".
- **No second layout arithmetic** (TP-23). `place` is the ONE function
  where pixels are born; the foot band, the labels and the face-facts
  line consume `place`'s column origins in S3b. Adding a parallel CSS
  or DOM calculation is a contract violation, not a style preference.
- **No mutation of a column snapshot** (L-F9). Replace the value; never
  push onto a tail. Not a ring buffer (TP-10).
- **No hand-copied generated tables.** Lane names, tags and the N9
  fallback come from `src/generated/kindTags.ts` and
  `src/generated/WordLogSchema.ts` at run time; L-M1/L-M2/L-M3 decide it.
- **No compression, no sediment band, no `doi.r` geometric ladder**
  (TP-1/TP-2 rule the v1 Strip full-pitch; aesthetics §1.6 defers the
  band to layer 2; CR-10 drops the ladder).
- **No pure `hit`, no `toCanvasPoint`, no CR-21 CSS contract** — TP-22
  retires them for v1; they return with the Canvas2D scale handler.
- **No `Label`, no `Cursor` op** in the Placement union (CR-15, CR-16).
- **No edits to this packet or to the battery.** A defect in either is a
  written BLOCK back to the breaker.
- **No edits to the skeleton's existing tests.** TP-27's deletion of
  `scene.test.ts`'s "Lane B"/"Lane C" panel assertions belongs to the
  S3b implementer, with the panel. The skeleton's lane LETTERS are
  inverted relative to the plan; ignore them.

**Deferred to S3b, explicitly:**

the SVG view and its lazy-per-column groups; the A1 tokens and the
micro-tint's actual hex ladder (S3a pins only the INDEX); rotated
labels and the foot band; the face-facts line (N1/N5); the inspector;
the zero-state; the a11y gate (TP-21's Square-set ↔ list-row-set
correspondence and arrow-keys-equal-clicks); goldens-as-rendered at the
four DPRs; the `check:workbench` browser smoke (TP-8, manual by name);
and every Lane A integration case (404, 403 from the Origin allowlist,
malformed `WordHistory` over the wire, `next` moving backwards live,
the zero-receipt store).

---

## 8. The fixture

`src/trunk/fixtures/word-history.fixture.json` — a HAND-AUTHORED
recording conforming to S0's emitted `wordHistorySchema`. It is decoded
through that mirror in `fixtures/conformance.test.ts`, which is the
proof of conformance; nothing hand-transcribes the schema.

**Honesty note (C6):** the addresses are syntactically valid 64-character
lowercase hex and are **not** content addresses of any real node. No
store minted this file. When Lane A is live, the integration fixture is
a recorded pull; this one is engine-only and must never be cited as
store-minted.

Generation rule, pinned so the file is reproducible:

- 220 receipts, `seq` 0..219 contiguous, `next` = 220.
- runs, in admission order, as `(tag, count)`:
  `(83,1) (71,3) (8,40) (9,12) (10,4) (11,4) (12,4) (13,6) (14,30)
   (15,3) (1,20) (65,9) (73,5) (81,7) (82,7) (200,2) (8,45) (42,1)
   (14,8) (1,5) (83,1) (9,3)`
  — all 15 registry sorts, plus **two distinct unregistered tags**
  (0xc8 and 0x2a), two bursts in one lane (`chunk` 40 then 45, total 85)
  and one 30-long burst in `step`.
- `address(seq)`: the 16-nibble block `n_j = (seq·7 + j·11 + 3) mod 16`
  for j = 0..15, lowercase hex, repeated four times. 7 is coprime to 16,
  so the first nibble takes all sixteen values and all five tint steps
  occur.
- `at(seq) = 1756600000000 + seq·137 + 900000·runIndex(seq)` — strictly
  monotone, with a 15-minute drought at every run boundary and 137 ms
  inside a burst.
- `size(seq) = 32 + (seq·37 mod 991)`.

Resulting lane depths: `chunk` 85, `step` 38, `value` 25, `tree` 15,
`annotation` 9, `query` 7, `result` 7, `context` 6, `agent` 5,
`manifest`/`file`/`entry` 4, `git` 3, `cont` 3, `unregistered` 3,
`schema` 2. Σ = 220. Deep enough to exceed a small k and to put every
column on both sides of a 30-row window.

`word-history.pages.fixture.json` — the SAME word as four pages
(0..79 next 80; 80..159 next 160; 160..219 next 220; empty next 220):
the concatenation, replay and drought cases.

`word-history.marks.fixture.json` — five documents whose `next` is not
`max(seq)+1`: `emptyAtTip` (220/∅), `emptyMidWord` (80/∅), `truncated`
(7/∅ — the backwards mark), `outOfOrder` (seqs 0,2,1,3 — R3's refusal),
`overlapping` (seqs 76..83, next 84 — the half-overlap replay case).

`src/trunk/fixtures/harness.ts` — the breaker's harness: fixture
loaders (`node:fs`, so the fixture is exercised as real JSON bytes, not
as a TypeScript literal), the deterministic `forAll` runner and its
seeded generators, `syntheticPage` (the 10⁵ feed and the property
cases), and `expectValid` (CI-1..CI-5 as one assertion, called after
every fold in the battery). **It imports nothing under contract**, so
it stays loadable while `src/trunk/*.ts` does not exist and its own
correctness is provable today by `fixtures/conformance.test.ts`.

## 9. Where the implementer starts

`bun --bun vitest run` in `experiments/workbench` today gives:

```
Test Files  6 failed | 3 passed (9)
      Tests  17 passed (17)
Error: Cannot find module './model.ts' imported from …/src/trunk/model.test.ts
Error: Cannot find module './fold.ts'  imported from …/src/trunk/fold.test.ts
   (and four more, one per battery file)
```

The six red files are the battery; the three green are the skeleton's
two (6 cases, untouched) and the harness validation (11 cases). The
battery fails at COLLECTION, on the missing modules — not on an
assertion and not on a harness error. The first vertical slice is
`model.ts`, which turns `model.test.ts` from a failed suite into ten
named failures; go law by law from there.
