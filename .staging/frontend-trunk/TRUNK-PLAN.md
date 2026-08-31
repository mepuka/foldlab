# TRUNK-PLAN — the plan of record for the trunk build (v3)

Status: **PLAN OF RECORD — ruled 2026-08-31; v2 under the
pre-dispatch audit (TP-1..30); v3 same day** — decision 42 stamped
(QA-4 + OPEN-1/OPEN-2), lane statuses current, and §6's seeds
CORRECTED by the breakers (the packets now carry the law; §6 keeps
the seed history + the corrections ledger). Castle-vs-attack binds:
a BREAKER writes each lane's battery before its IMPLEMENTER touches
the castle; the packet is the only thing that crosses.

## 0. Lane status (2026-08-31, live)

| lane | state |
|---|---|
| S0 mirrors + CI wiring | **LANDED** (report banked; mirrors untracked → ride the commit) |
| S1 breaker | **LANDED** — packet `packets/S1-HISTORY-ROUTE.md` (15 laws, 6 adversaries), battery red-by-design (20/23) |
| S1 implementer | **IN FLIGHT** (the last blocker before the operator's commit) |
| S2 Lane B (lastK + cut law + Edge witness) | **LANDED** — `lastK_append_eq` master lemma; rung PROVED; the ofQuery unitality boundary; cut law in `CasValues`; choice-forced String axioms measured |
| S3a breaker | **LANDED** — packet `packets/S3A-TRUNK-ENGINE.md` (26 laws, CI-1..5, degenerate-probe-hardened 70-case battery, 220-receipt fixture) |
| S3a implementer | **DISPATCHING** — spike first; OPEN-1/2 ruled (decision 42) |
| S3b / S4 / deferred ladder | queued as §3 |

## 1. The ruled decisions

As v1 §1 (decision 41: A1–A6, CV-1..6 + CV-3′, QE-1..4), with the
review's corrections:

- **The strip question, ruled once** (TP-1/TP-2, reconciling A3 with
  CR-29): v1's op union is `Square + Strip`, where a v1 `Strip` is
  the UNCOMPRESSED, FULL-PITCH run covering rows before the last-k
  window — no compression, no sediment band (those stay layer 2 per
  A3). Rows past k therefore render as full-pitch strips;
  scroll-back reaches them; they are not yet clickable and the face
  says "not yet" — NOT "cannot", since `since+limit` already is a
  ranged read (TP-7).
- **`place` snaps to integer DEVICE pixels and takes DPR in its
  signature** — `Placement × Viewport × DPR → Rect[]`,
  `round(x·dpr)/dpr` (TP-4). Goldens at DPR 1, 1.5, 2, 3 (TP-13).
  Micro-tint index PINNED: `parseInt(address[0], 16) % 5` — the
  first hex nibble (TP-13).
- **ETag/304 is CUT from v1** — unruled scope creep, and its
  correctness premise is falsified by the log's own truncation
  repair (`markOutOfOrder`) (TP-12). May return as its own ruled
  slice, correctly scoped (any range, invalidated by truncation).
- **SSR is demoted** from a v1 job to a claimed-later affordance —
  foldkit hydration/SSR is `@experimental` and nothing in v1 runs a
  server. The one-artifact sentence is FOUR jobs: golden register,
  a11y fallback, tests, live render (TP-28).
- **CV-3′ is PROVISIONAL until the spike passes** (TP-9): Lane C
  opens with a half-day spike — ~2,000 `<rect>`s under one
  `<g transform>` inside `createLazy` groups; verify SVG namespace
  handling, verify a column actually memoizes, measure frame cost.
  Canvas2D via `Mount` is the named fallback if it fails.
- **CV-3′ retires, for v1**: the pure `hit`, `toCanvasPoint`, and
  CR-21's CSS contract — the browser owns hit-testing on SVG
  (TP-22). CR-19's `Hit` union and CR-20's side condition RETURN
  with the Canvas2D scale handler; recorded, not lost.
- **QA-4 (the patchability law as standing surface rule)** is
  co-ruled by implication of CV-5 and rides decision 41 — flagged
  for the operator's one-word explicit confirmation (TP-11).
- Numbers reconciled: **k = 512 is the CARRIER bound; ~30 rows is
  the visible individuated WINDOW** (TP-29). **15 sorts, 16 lanes**
  (`unregistered` is a lane, not a sort) (TP-30). The face-facts
  `mark` field is a receipt INDEX, never hex (TP-19b).

## 2. The corpus map — unchanged from v1 (audited accurate, TP §6)

## 3. The slices — S0 first, then three parallel lanes, castle-first

**The castle-vs-attack law binds S1 and S3**: a breaker lane writes
the contract packet + the FAILING battery from §6's must-be-true
lists before the implementer dispatches; breaker ≠ implementer,
ever. S0 is mechanical emission (no packet). Lane B is Lean — the
kernel is its breaker.

### S0 — the workbench mirrors (FIRST; the parallelism enabler, TP-3/6/26)

Inside `library/cas` + `mise.toml`, one small edit set:

1. Extend `emitword` + `emitgrammar` with second outputs under
   `experiments/workbench/src/generated/` (wordHistory schema,
   kindTags, names.json) — the workbench README's own law: described
   surfaces are generated, never hand-typed.
2. Add `gen:workbench-word`/`-grammar` to `gen` AND `gen:ci` AND the
   `check:cas --check` line (the environment ledger forces the
   first two to stay in step).
3. Add `mise run --force check:workbench` to `check:ci` (TP-6 — it
   is in `check` but NOT CI today; Lane C's whole gate set is
   otherwise unenforced).

After S0, the lanes' HAND-WRITTEN trees are disjoint; generated
crossings are deterministic regenerations each lane commits with its
work (TP-26). The true conflict set (mise.toml,
environment.META.json, EmitWord.lean) all lives in S0 and dies with
it.

### LANE A — S1: serve the word (effects; breaker packet first)

Scope (TP-16 additions in bold):

- `limit` on the seam, ALL THREE realizations named (TP-5/17):
  SQL `LIMIT` in `makeSqlWordLog`; slice cap in `makeMemoryWordLog`;
  `makeFileWordLog` pages the ANSWER, not the read — the file
  realization's unbounded read is carried as an OWED row, stated in
  the seam doc (the sqlite backend is the bounded one). **Default =
  cap = 10⁴ receipts** (stream-review parameter #11). Under
  truncation `next` means RESUME HERE; a truncated page does not
  teach the tip, and v1 needs no "more remains" fact (the face count
  is the fold's) (TP-17).
- `GET /history?since&limit` beside `/projections`; **export
  `historyPath`; extend `planeOf`; extend `ServingDoc.test.ts`'s
  route set; update `SERVING.md`'s route table + `PROFILE-CAS-HTTP-0.md`
  §14's co-tenant table (additive at `/0`); the startup banner
  line** (TP-16).
- The CLI's chained-drain change is NAMED SCOPE (not a parenthesis):
  `bin/cli/history.ts` drains by chaining pulls; the gate proves
  identity (TP finding, scope-creep note).
- Gates (restated per TP-16/25): **route-drained vs CLI-SINGLE-CALL
  byte identity at the same mark**; paging concatenation (fixed-word
  half licensed by landed **W6** `since_compose`; the growth half
  stays PDD-6 law 2, owed and cited); refusal drills on malformed
  `since`/`limit`; a bound gate asserting rows-read/bytes-held under
  `limit` on the sql realization (the QE-A2 closure, TP §4).
- Explicitly NOT: ETag (cut), `from`/`to` (deferred on SCOPE, not
  capability — TP-7), any receipt-field predicate (QE-1's line).

### LANE B — S2: the Lean minis (library/cas; after S0 — same package)

1. **`View.lastK (t : Grammar.Ty) (k : Nat) : View Word` —
   COLUMN-INDEXED**, built over `View.column t` (TP-14); the generic
   `lastK_append` list lemma is the reusable mint; `run_append` =
   `column_append` + the lemma. **Rung stated: R0** — order-
   sensitive, NOT replay-safe (the client fold must guard by `seq`;
   see S3a). The `ofQuery` form + `View.ext` equality: owed and
   landed with it (cheap).
2. The cut law `IsCutting` + one proved reference cutter, as v1.
3. Optional: mechanize the Edge counterexample.
- Gates: full `check:cas` battery run as LEAF task; axiom ceiling;
  ledgers via emitters.

### LANE C — S3, split (TP §5): S3a ENGINE then S3b APP (workbench; breaker packet first)

**S3a — the engine** (pure, browserless; starts right after S0):

- **The spike first** (TP-9), gating the rest; Canvas2D-via-Mount
  named fallback.
- Model: `{status, mark, columns}` — **status is a four-state union
  on the skeleton's own precedent** (Idle / Loading / Live /
  Refused{reason}) — the review's §8 finding: `{mark, columns}`
  cannot represent "asked and was refused". Refusal rendering ruled:
  keep the last placement, stale-mark the face line, back off the
  poll. First-paint vs empty-store are DIFFERENT sentences (the
  CLI's two wordings, verbatim).
- The fold: seq-guarded (drop entries with `seq < mark` — the R0
  replay protection, TP-14), mark only from `next`, per-column
  IMMUTABLE snapshots replaced on fold — **the `createLazy` memo key
  is the column's `(count, tailRevision)`** (TP-10), with the test
  that a fold touching column *i* re-renders only column *i*.
- `Placement` (Square + Strip per §1) + `place` (device-pixel
  snapping, DPR in signature) + **viewport virtualization with the
  epoch-terminator list** (TP-15; thresholds named and attributed:
  ~300 px overdraw / ~200 px drift — Perfetto's; ~10 ms budget —
  RAIL's).
- **The two generic fast-check properties ride S3a** (TP-24):
  incremental-equals-fresh (run_append's face) and seq-guard replay
  — no registry needed; v1's fold is thereby NOT ungated.
- **The fixture** — the review's highest-value unlisted item (§8): a
  recorded `WordHistory` fixture + a seeded store script; serves the
  fake seam, stories, goldens, the zero-state, and the smoke.
- Gates: goldens at 4 DPRs; extension-law + disjointness-checker +
  count-honesty (Σ squares + Σ strip counts = Σ column counts)
  properties; the memo test; Scene stories on the fixture.

**S3b — the app** (after S3a; the spike's renderer):

- The SVG view (lazy per column), tokens (A1 values), micro-tint
  (pinned index), rotated labels + face-facts **positioned FROM
  `place`'s column origins — no second layout arithmetic** (TP-23),
  **N9's bare-hex fallback for unnamed tags** copied from
  `history.ts:75-78` (TP-20), inspector appends (receipt fields +
  `GET /cas/{hex}` bodies), zero-state design (the first thing every
  new user sees — §8).
- A11y **with its gate named** (TP-21): the Square-set ↔
  list-row-set correspondence property, and arrow-keys emitting the
  SAME Messages as clicks; the list view on the same page.
- Skeleton trip hazards named (TP-27): `scene.test.ts`'s
  "Lane B/Lane C" panel assertions are deleted with the panel; the
  skeleton's lane LETTERS are inverted relative to this plan —
  ignore them.
- **Integration step** (needs Lane A live): the A/C seam tests the
  review found missing (§8) — 404, 403 from the Origin allowlist
  (`--allow-origin` REQUIRED and documented in the brief), malformed
  `WordHistory`, `next` moving backwards after operator truncation,
  zero-receipt store. HMR/time-travel note: the lazy key includes
  `tailRevision`, so a time-travelled Model re-renders correctly.
- **Done means, split honestly** (TP §3): "GATED-GREEN" = everything
  above on the fixture, no daemon; "DONE" = SPEC §6's browser
  sentence against live `cas daemon` + Lane A — **plus one manual
  browser-smoke acceptance step, named as manual** (TP-8;
  `check:workbench` is VNode-only and cannot see it).

### S4 — QuerySpec AST + registry (AFTER S2 AND S3 — TP §5)

QE-2 grills the AST against the trunk's real entries, which exist
only once S3a's fold settles. Unchanged otherwise.

### Deferred ladder — unchanged from v1, plus: ETag (re-scoped),
`from`/`to` + clickable strips, the six-tab connection note carried
as a known localhost limit (§8).

## 4. Standing constraints on every lane

Lanes run **LEAF gates only** (`check:cas`, `check:effects:ts`,
`check:workbench`) — the `check`/`check:ci` chains run
`git diff --exit-code` and the uncommitted tree reds them for
everyone (TP-18); the operator's commit lifts this. Reports persist
early and incrementally. No commits by lanes. Breaker ≠ implementer.
Partition claim scoped to HAND-WRITTEN files (TP-26). The
`effectProvenance: PENDING` note in the workbench package is
confirmed-or-refreshed before S3b claims anything provenance-backed
(TP §3).

## 5. Owed rows — v1's list, plus: the file-realization unbounded
read (TP-5); PDD-6 law 2 for the growth half of paging (W6 covers
the fixed-word half); CR-19/20's hit laws parked with the scale
handler; SSR as untested affordance; and the S1 breaker's
out-of-scope finding (2026-08-31): **the cas-http/0 byte plane does
not receipt** — `CasServerCore` requires ByteReader/Writer/RootStore
and never WordLog (`src/server/Core.ts:51,71-73`), so a put arriving
over the wire plane enters the store but NOT the word; SPEC §6's
done-sentence holds for CLI and tool-plane writers only. Whether the
byte plane should receipt is an ARCHITECTURE RULING for the
operator's docket, not S1's scope; the trunk's battery seeds through
`Cas.Store` and is unaffected either way.

## 6. The castle — the seeds, and the corrections the breakers made

**The packets supersede this section**: `packets/S1-HISTORY-ROUTE.md`
and `packets/S3A-TRUNK-ENGINE.md` carry the law; the lists below are
the seed history. **The corrections ledger** (where the seeds did
not survive the attack — kept so the next seeder learns):

- S1: "next ≡ word length" was FALSE as written (contradicts the
  limit seed) — both branch laws now stand, each alone an adversary.
  "No receipt-field params" was predicate-too-weak — now a
  fail-closed door: exactly `{since, limit}`, all else 400. Suffix
  identity made positional; refusals given a grammar
  (`/^(0|[1-9][0-9]*)$/`, ≤ 2⁵³−1); two laws added
  (α-commutation across realizations; PROFILE §14 status
  discipline). `limit=0` REFUSES; `limit>cap` CLAMPS.
- S3a: "prefix ops identical" false twice — the law is SUBSEQUENCE
  (column-major order) and needs the DOI floor frozen between cuts.
  "All squares equal dims" false at fractional DPR — exact at the
  four golden DPRs, ≤1 device px elsewhere. "Byte-identical SVG"
  unreachable in the engine — `canonicalRects` with a pinned format
  binds S3b's goldens instead. `tailRevision` is DERIVED, never a
  counter (a counter falsifies incremental-equals-fresh). `Rect`
  carries device integers (CSS floats make integrality
  undecidable). A SEVENTH epoch terminator: `carrier`.
- Decision 42 ruled the packets' OPENs: backwards `next` REFUSES
  AND SURFACES (reset only by explicit user action); address
  validity is DOCUMENT-BOUNDARY (the fold refuses the page at the
  seam decode; never per-op).
- Lane B's boundary finding feeds both: `lastK` is lawful-View-but-
  not-Query (unitality — the monoid lives on the bounded subtype);
  the seq-guard is where replay safety comes from, BY THEOREM
  (`lastK_not_idem`/`lastK_not_comm`).
- S3a implementation round (coordinator adjudication 2026-08-31,
  packet §10): THREE battery cases were UNSATISFIABLE — the dual of
  vacuity. `Doi.window` contradicted L-P8's own substring scan
  (renamed `span`); L-P7's ">9000 ops" and L-P1-growth's
  post-carrier individuation both contradicted CI-2's equation —
  while the same battery's L-C5 cases stated the carrier boundary
  correctly. New breaker duty: after the degenerate-probe, a
  SATISFIABILITY probe — magnitudes vs the invariant class, scans
  vs the packet's own frozen surface, sibling-case consistency.

The seed lists (historical):

**Lane A (the route):**
- Suffix identity (W5): body at mark m ≡ the word's suffix at m;
  `next` ≡ the word's length. No row not in the word, no reorder.
- Paging composes on a fixed word (W6): chained pulls ≡ one pull.
- Reading is state-free (W1): a pull changes nothing — repeated
  identical pulls are byte-identical; store bytes untouched.
- Two registers, one document: route-drained ≡ CLI-single-call.
- Bounds: default=cap=10⁴; `limit` beyond the suffix answers the
  suffix; `next` monotone per pull chain; malformed params refuse
  typed, never coerce.
- The address-not-value line: no parameter filters by receipt field.

**Lane C (the trunk):**
- Incremental-equals-fresh: fold(page₁)⋄fold(page₂) ≡
  fold(page₁++page₂) (run_append's host face).
- Seq-guard replay: re-delivering any page changes nothing.
- Totality (mem_column_or_unregistered): every receipt lands in
  exactly one lane; Σ column counts + unregistered = total.
- Count honesty (the Perfetto carry): Σ Squares + Σ Strip.count =
  Σ column counts — nothing dropped, nothing doubled.
- Extension (epoch-local): placement(w++δ) extends placement(w) —
  prefix ops identical, positions immutable.
- Disjointness: the checker passes on every generated placement —
  no two rects share a device pixel.
- Determinism: same (Placement, Viewport, DPR) ⇒ byte-identical
  SVG; every coordinate an integer device pixel.
- The mark law: model.mark only ever assigned from `next`.
- The memory law: model size bounded by f(k, lanes) regardless of
  receipts fed (no store mirror, ever).
- Uniform marks: all Square rects equal dimensions (presence, never
  magnitude).
- Fail-closed rendering: an unknown tag SURFACES (unregistered lane
  + bare-hex), never drops.
- A11y equivalence: keyboard traversal ≡ click Messages; list rows
  ≡ Square set.
