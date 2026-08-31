# Trunk plan review — pre-dispatch audit

- Lane: read-only review lane (Mac coordinator)
- Date: 2026-08-31
- Subject: `.staging/frontend-trunk/TRUNK-PLAN.md` (plan of record, pre-dispatch)
- Consumed by: TRUNK-PLAN.md revision + the lane briefs

Verified against: CANVAS.md (whole), QUERY-ENGINE.md, SPEC.md §§1.3/1.4/6/7,
QUERIES.md §§2/3/4/5/8, the aesthetics report §§1.2–1.9 + §5, the canvas
review (five-to-fix + CR rows), the stream-loop review (§B.0–B.2 +
five-to-settle), the production-canvas report §§2.1–2.8, and the working
tree: `library/effects/src/cas/WordLog.ts`,
`library/effects/src/cas/generated/WordLogSchema.ts`,
`library/effects/bin/mcp/http.ts`, `library/effects/bin/cli/history.ts`,
`library/effects/PROFILE-CAS-HTTP-0.md`, `library/effects/SERVING.md`,
`library/effects/test/ServingDoc.test.ts`, `library/cas/Cas/IR/View.lean`,
`experiments/workbench/**`, and `mise.toml` (whole task graph).

---

## 1. Findings

Severity: BLOCKING = a lane cannot finish its slice as written; HIGH = the
slice ships wrong or ungated; MEDIUM = a real defect with a cheap fix;
LOW = wording.

| id | sev | plan line hit | finding | fix direction |
|---|---|---|---|---|
| **TP-1** | **BLOCKING** | §1 Aesthetics ("**No strip in v1**") vs §5 ("**strips unclickable in v1, said on the face**") vs §3 Lane C ("Square, **Strip reserved**") | The plan says three different things about strips in one document. CANVAS §3 rules "**v1 ships with unclickable strips and says so on the face**"; aesthetics A3 rules "Ship v1 with **no** density strip (pure Regime A, scroll)". Both are quoted as adopted. Lane C's "Strip reserved" resolves toward A3. | Rule ONE reading. A3's "strip" is the *compressed* band; CANVAS's `Strip` is the *unindividuated run*. Say so explicitly: v1 emits `Strip` ops at full pitch for the pre-window tail, with no compression and no band. Then A3 and CR-29 are both satisfied and Lane C's union is `Square + Strip`, not "Strip reserved". |
| **TP-2** | **BLOCKING** | §1 CV ("carrier = `View.prod (View.height t) (View.lastK t k)`, k≈512") + §3 Lane C ("per-column `{count, lastK ring}`") + A3 (no strip) | **The rows past `k` have no renderer.** `Square {col,row,address}` needs an address; the carrier holds only the last k addresses; `Strip` is the op for the rest, and under TP-1's A3 reading v1 emits none. A column with 10 000 admissions has 9 488 rows that are neither a Square nor a Strip. Scroll-back past k is likewise unreachable: it needs a ranged read the plan defers (CV-6). | Settling TP-1 settles this if the answer is "Strip ships". If the answer is "no Strip", then v1 must either clamp the viewport to the last-k window and say so on the face, or `from`/`to` rides v1 (see TP-7). Do not dispatch Lane C until one of the three is chosen. |
| **TP-3** | **BLOCKING** | §3 preamble ("builds against a fake seam **from the frozen wire shape** first"); §3 Lane C ("Schema-defined", "`names.json` labels", "the receipt's tag under the sorts classifier") | **The frozen wire shape is not importable by the workbench today, and no slice owns making it so.** `wordHistorySchema` lives at `library/effects/src/cas/generated/WordLogSchema.ts` — Lane A's package; `kindTags.ts` and `grammar/names.json` are beside it. `experiments/workbench/package.json` depends only on `effect` and `foldkit`; there is **no root `package.json` and no workspace** — each package carries its own `bun.lock` and `check:workbench` runs `bun install --frozen-lockfile` in its own directory. And the workbench's own README forecloses the shortcut: *"any surface the store language already describes must be generated, never typed by hand… it comes from a `mise run gen:` task under this directory. There is no such task yet."* Lane C therefore needs three generated artifacts it cannot reach and may not hand-copy. | Cut a **slice S0** dispatched BEFORE A/B/C: extend `lake exe emitword` (and `emitgrammar`) to emit a second mirror under `experiments/workbench/src/generated/`, add `gen:workbench-word` to `gen` + `gen:ci` + the `check:cas --check` line, and add `check:workbench` to `check:ci` in the same edit. Small, mechanical, and it removes the only true cross-lane blocker. |
| **TP-4** | **HIGH** | §3 Lane C ("`place` to integer **CSS** px") vs §1 CV ("integer **device**-pixel snapping") | Self-contradiction, and the CSS reading is the wrong one. CANVAS §2: "every coordinate rounded to integer DEVICE pixels"; aesthetics §1.5: "`round(x * dpr) / dpr` on every rect… the disjointness the Scene guarantees is only visible if edges land on device pixels". Integer CSS px at DPR 1.5 is a half-device-pixel edge — precisely CR-25/26's failure. It also silently drops DPR from `place`'s signature, which CANVAS §2 declares as `Placement × Viewport × DPR → Rect[]`. | Restate Lane C's bullet as "`place` to `round(x·dpr)/dpr`, DPR an explicit argument". And pin the DPR the goldens are taken at (see TP-13). |
| **TP-5** | **HIGH** | §3 Lane A ("SQL `LIMIT` in `SqlWordLog`, **slice cap in the memory realization**") | **`makeFileWordLog` is not named, and it is the realization the OOM lives in.** There are three: `makeMemoryWordLog`, `makeSqlWordLog`, `makeFileWordLog` (`WordLog.ts:147/230/413`). The file log's `readLog` does `fs.readFileString(path)` — the **whole** JSONL — then decodes every line before slicing (`:443–489`). A `limit` that caps the returned array leaves the OOM exactly where QE-A2 found it, for the default store shape. | Name all three realizations. For the file log the honest v1 answer is either a streaming line reader bounded by `limit`, or a stated non-claim ("the file realization pages the ANSWER, not the READ; the sqlite backend is the bounded one") carried as an owed row. Do not let "limit on the seam" imply a memory bound it does not deliver. |
| **TP-6** | **HIGH** | §3 Lane C ("`check:workbench` in the chain") | **`check:workbench` is in `mise run check` but NOT in `mise run check:ci`** (`mise.toml:725–745` vs `:746–762`), and CI runs `check:ci` — the file says so in its own comment: *"CI runs `mise run check:ci`, never `mise run check`."* Lane C's entire gate set is therefore unenforced. SPEC §6's "Gate: it already exists" inherits the same hole. | Add `mise run --force check:workbench` to `check:ci`. Fold into S0 (TP-3) so only one lane edits `mise.toml`. |
| **TP-7** | **HIGH** | §1 CV-6 ("`/history` gains `limit` NOW…; `from`/`to` later"); §5 ("strips unclickable in v1") | **`since=a&limit=n` IS a ranged read.** It answers `w[a, a+n)` — the same segment `from`/`to` would. So the price CR-29 makes v1 pay ("a strip's interior addresses are not held, and individuating one needs a RANGED read — Q-SEG served — which v1 does not have") is paid for a capability v1 is shipping in the same slice. Note also that QUERIES.md's segment-composition law carries **no `file:line`**, which by that file's own provenance rule (:391) makes it PROPOSED, not landed. | Either (a) admit that strip-click is capability-reachable in v1 and defer it on scope grounds, saying that instead — the face text changes from "cannot" to "not yet"; or (b) state the actual difference (`limit` is a page of a suffix, `from`/`to` a bounded window) and why it does not serve Q-SEG. As written the plan claims an incapacity it does not have. |
| **TP-8** | **HIGH** | §3 Lane C gates; "Done means SPEC §6's sentence: **a browser tab shows** this store's history growing" | **No gate in Lane C runs a browser, and none can.** `check:workbench` is `bun install / lint / typecheck / vitest / vite build`. `vitest.config.ts` and the package's own README say Story and Scene run "on VNodes; no DOM, no jsdom". The production-canvas report confirms: Scene is "**VNode-only**… what it cannot verify: **canvas rendering**, DOM measurements, animation execution, and CSS computed styles beyond inline properties." The done-condition is a browser sentence; the gate set stops at VNodes. | Add one browser smoke to Lane C's brief (CANVAS §6 already promises "one browser smoke") and say where it runs — it cannot ride `check:workbench` as configured. If no browser gate is affordable, weaken the done-means to what is actually gated and record the browser check as a manual acceptance step. |
| **TP-9** | **HIGH** | §1 ("**CV-3′: v1's live renderer is SVG in foldkit's vdom** — rects under one `<g transform>`, `createLazy` per column") | **The single load-bearing premise of the v1 renderer is backed by one `.d.ts` type list and nothing else.** The production-canvas report's SVG paragraph (its §2.8, one paragraph, the only SVG mention in §§2.1–2.8) reasons from `TagName` membership to four behavioural guarantees. It does **not** cover: SVG namespace handling (`createElementNS`, snabbdom's namespace module — the word "namespace" does not occur); `createLazy` demonstrated on an SVG subtree (all `createLazy` discussion is canvas-vnode); any SVG performance figure or element-count ceiling; and there is **no SVG example in foldkit's own repo** (its five are `canvas-art`, `charting`, `generative-art`, `map`, `pixel-art`). Two of the four guarantees are contradicted elsewhere in the same report — "server-renderable" (hydration and server rendering are `@experimental`, "the API may change in any release") and "visible to Scene's locators" (true for locating; Scene has **no `pointerMove` and no `wheel` step**). | Put a half-day SPIKE at the head of Lane C: render 2 000 `<rect>`s under `<g transform>` inside a `createLazy` group, confirm namespace correctness and that a column memoizes, and measure. Gate the rest of the slice on it. Alternatively state CV-3′ as provisional with Canvas2D as the named fallback. Do not dispatch a slice whose architecture rests on an unexecuted type-list reading. |
| **TP-10** | **HIGH** | §3 Lane C ("one `createLazy` group per column") + ("per-column `{count, **lastK ring**}`") | **`createLazy` memoizes on `===` of the function reference, the dispatch, and every argument.** A ring buffer mutated in place stays `===` forever — the column never re-renders. A freshly-built array each fold is never `===` — the memo never hits. The plan specifies a ring and a per-column lazy group and does not say which side of that it lands on. foldkit's own showcase does the losing thing: it "**rebuilds the entire shape array from scratch every frame**… No memoization, no `createLazy`, no caching of any kind." Two further shipped constraints apply: a cached VNode "must be rendered at exactly one position in the tree", and `createKeyedLazy` entries "are **never evicted, so keys must be bounded**" (16 lanes is bounded — fine). | Specify the memo key explicitly: an immutable per-column snapshot value replaced (not mutated) on each fold, with the column's `(count, tailRevision)` as the lazy argument. Add a test that a fold touching column *i* re-renders only column *i*. |
| **TP-11** | **HIGH** | §1 ("the patchability law (QUERIES §4)" listed under "**Prior rulings this plan stands on**"); CANVAS §4 ("it **was ruled** and simply had not been applied here") | **The patchability law is an OPEN ruling ask, not a prior ruling.** QUERIES.md §8: *"Open asks below: QA-2 (annex posture), **QA-4 (patchability as standing surface rule)**, QA-5…"*. The epoch law — the core of CV-5 and the thing CR-1 called the decision "nothing else on this list can be specified until", is derived from it. | Either fold QA-4 into the ruled slate explicitly (it is one line and the operator is ruling anyway), or restate the epoch law's licence as "derived from QUERIES §4, whose ratification (QA-4) is asked in the same breath". A plan may not list an open ask as a prior ruling. |
| **TP-12** | **HIGH** | §3 Lane A ("closed-range answers carry `ETag = next` and 304 on `If-None-Match` (append-only makes this correct)"); "ETag/304 tests" | **Unruled scope creep, aimed at the wrong case, resting on a false premise.** `ETag`/`If-None-Match`/`304` occur **nowhere** in SPEC.md, CANVAS.md, QUERY-ENGINE.md, QUERIES.md, the aesthetics/canvas/stream-loop reports, `PROFILE-CAS-HTTP-0.md`, `SERVING.md`, or `bin/mcp/http.ts`. Three problems: (1) it is a new HTTP surface on a co-tenant route with no ruling; (2) restricting it to *closed* ranges excludes the only case that matters — the 1 Hz poll at the open tip, where an unchanged `next` is exactly a valid strong validator for a fixed URL; (3) "append-only makes this correct" is falsified by the seam's own documented repair path — `markOutOfOrder` (`WordLog.ts:347–358`) instructs the operator to **truncate** the log, after which `next` moves backward and a cached validator is stale-but-fresh-looking. | Cut it from S1 and dispatch it separately if wanted, correctly scoped (any range, validator = `next`, invalidated by the truncation repair). It is not in the ruled slate and it is not load-bearing for Lane C's loop. |
| **TP-13** | **HIGH** | §3 Lane C ("golden SVG snapshots of `place`'s output (the layout laws' byte gate)") | **The golden gate does not test what it is for.** Once `place` takes DPR (TP-4), the goldens are DPR-specific; a set taken at DPR 1 exercises none of the snapping the rule exists for. And the micro-tint that must be "byte-stable in the SVG register" is specified as `Index = address[0] mod 5` — in TypeScript `address[0]` is a *character*, and `"a" % 5` is `NaN`. The ladder is under-determined (first hex nibble? char code?) and the goldens will freeze whichever guess Lane C makes. | Take goldens at DPR 1, 1.5, 2 and 3 (aesthetics §1.5 names exactly those). Pin the tint index as an explicit arithmetic expression over the address's first hex nibble in the brief, before goldens exist. |
| **TP-14** | **MEDIUM/HIGH** | §3 Lane B item 1 ("**`Word.View.lastK`**… carrier `List Binding` bounded at k; `merge a b = lastK k (a ++ b)`") | **Specified un-indexed by column, but the trunk's carrier is per-column.** CANVAS §3 and the plan's own §1 both write `View.lastK **t** k`. As Lane B has it, `run = fun w => lastK k w` is the *global* tail; `prod (height t) (lastK k)` then gives a column's count paired with the store's global tail — wrong by construction. The correct shape composes with `Word.column t`, so `run_append` needs `column_append` as well as the list lemma, and the "four-line case split" belongs to the lemma alone. Separately: QA-1 landed `View.ofQuery` + `View.ext` with "the three landed views proved STRUCTURALLY EQUAL to their `ofQuery` forms" — the brief does not say whether `lastK` owes its `ofQuery` form too. Finally, `lastK`'s merge is neither commutative nor idempotent, so the trunk's carrier is **R0**: order-sensitive and **not replay-safe**, which is worth stating since the poll loop can re-deliver a page. | Brief it as `View.lastK (t : Grammar.Ty) (k : Nat) : View Word` built over `View.column t`, with the generic `lastK_append` lemma as the reusable mint; state the rung (R0) and say whether `ofQuery`/`View.ext` is owed. |
| **TP-15** | **MEDIUM/HIGH** | §1 CV-5 ("**viewport virtualization with the epoch-terminator list** (CV-5)") vs §3 Lane C's scope | **Ruled, and no slice carries it.** Lane C's bullets run Model → Messages/update → Placement/place/SVG → tokens → a11y → gates. Virtualization appears in none of them, nor do the epoch terminators CANVAS §4 enumerates (resize, DPR change, scroll, tab restore, DOI cut, theme change, HMR, classifier change). The production-canvas numbers the plan would need are also not foldkit's — 300 px overdraw / 200 px drift / 100 px margin are **Perfetto's** `virtual_canvas.ts`, and ~10 ms is web.dev/RAIL; nothing in that report gives a foldkit figure or a `slow` default threshold. | Either add virtualization + the terminator list to Lane C's scope with the thresholds named and attributed, or move it to the deferred list with a stated v1 bound on rendered rects. Do not leave a ruled item unassigned. |
| **TP-16** | **MEDIUM/HIGH** | §3 Lane A gates ("byte-identity of a full chained drain vs `cas history --json`") | **The route's own gate is weaker than SPEC's and the drift gate that should catch the rest does not fire.** SPEC :643–647 asks "the route's body at mark *m* is byte-identical to `cas history --json --since m`". With `limit` that identity is gone for any truncated page, so the plan's "chained drain" restatement is necessary — but if the CLI also chains (the plan says it "keeps full-drain by chaining pulls"), the gate risks comparing the CLI to itself. Separately, `test/ServingDoc.test.ts` re-derives the route table from the **named exports** `mcpPath`/`metricsPath`/`projectionsPath` — a fourth route is invisible to it, so `SERVING.md`'s table and `PROFILE-CAS-HTTP-0.md` §14's co-tenant table (its "`cas daemon` declares three") go stale silently. `planeOf` (`http.ts:236–240`) must also claim the prefix or the request is attributed to `cas-http/0` and falls to the profile's wildcard. | Spell the gate as *route-drained vs CLI-single-call at the same mark*. Add to Lane A's scope: export `historyPath`, extend `planeOf`, extend `ServingDoc.test.ts`'s route set, update the `SERVING.md` route table and the §14 co-tenant table (additive at `/0`, same as decision 32(c)), and the startup banner line at `http.ts:1146`. |
| **TP-17** | **MEDIUM/HIGH** | §3 Lane A ("`limit` ON THE SEAM") | **No default and no maximum are stated** — which is the whole of QE-A2. The stream-loop review's parameter #11 gives the number: "`/history` page limit — **10⁴ receipts (≈900 KB)**". Without a *default*, `GET /history?since=0` is the unbounded pull it is today; without a *cap*, `limit=10^9` restores it. `since`'s existing contract also has to be extended: today `next` means "where the word ends" (`WordLog.ts:77–79`, and `since` documents "A mark past the end still answers the true cursor"); under a limit it must mean "resume here", and a consumer can no longer learn the tip from a truncated page. | State default = cap = 10⁴ (or whatever is ruled), and state what `next` means under truncation. Decide whether the document needs a "more remains" fact at all — Lane C's loop does not, but the face-facts line's admission count does. |
| **TP-18** | **MEDIUM** | §4 ("Build on the **uncommitted tree** (five green lanes; the operator's commit is pending)") | **The standing gate chain cannot go green on that tree.** Both `mise run check` and `mise run check:ci` run `git diff --exit-code` immediately after `gen`. The tree has 57 modified tracked files right now (`git diff --quiet` exits 1). Every lane asked to run its chain hits a red gate that belongs to none of them. | Land the operator's commit before dispatch, or tell each lane in its brief to run the *leaf* tasks (`check:cas`, `check:effects:ts`, `check:workbench`) and never the chain, and say why. |
| **TP-19** | **MEDIUM** | §3 Lane C ("face-facts line with `--owed` conditional"), adopting aesthetics §1.9's line `12 847 admissions · 15 sorts · mark 7bfa…c1 · cut 14:22:07 · 0 unregistered` | Two things. (a) **An admissions counter is still listed in SPEC's own not-done table** — SPEC :682 `| any admissions counter | **Q1** (N2) |` — even though N2 is **DISCHARGED** at SPEC :219 and :581. The plan ships the counter and never cites the discharge; SPEC :702–704 still asks to ratify a rule premised on unruled Q1 and still calls it "debt rank 1". (b) The mock renders `mark 7bfa…c1` — hex, i.e. an address. A mark is "a zero-based word index — a count of receipts, never a timestamp" (`WordLog.ts:138`). | Cite the discharge in the plan, retire SPEC :682 and :702–704 (this is the stream-loop review's five-to-settle #5, which no slice currently carries), and fix the face-facts mock's mark field. `--owed` on non-zero `unregistered` stands. |
| **TP-20** | **MEDIUM** | §3 Lane C (no mention of N9 / bare-hex fallback) | **A ruled surface rule that no slice carries.** SPEC N9 (:304–309): *"a tag it does not name renders as bare hex — the ruled fallback… the trunk copies that exact fallback rather than inventing a second one."* CR-41 names N9 alongside N1/N5 as the three facts with no home in the op union. Lane C carries N1/N5 into the aria-label and the face-facts line, and carries `names.json` labels — but not the fallback. `bin/cli/history.ts:75–78` is the exact code to copy. | Add N9's fallback to Lane C's scope, beside the `names.json` labels. |
| **TP-21** | **MEDIUM** | §3 Lane C ("**A11y (A5)**: roles + aria-label…; the addressable list view") | **The conformance claim has no gate.** A5's WCAG 2.5.8 argument works only through the *Equivalent control* exception: a 12 × 12 px square (aesthetics §1.5) is far under the 24 × 24 minimum, so the list view must (i) be on the same page and (ii) reach **every** target the canvas reaches. Nothing in the gate list tests that correspondence. Scene can drive `click`, `focus`, `keydown` — enough to test it. | Name the gate: a property that the set of `Square` addresses in the Placement equals the set of addressable rows in the list view, and that arrow-key traversal emits the same `SelectedSquare` Messages as clicks. State that the list view is on the same page. |
| **TP-22** | **MEDIUM** | §3 Lane C ("click→Message"); CANVAS §5 (`Hit = Square addr \| Aggregate \| Miss`, "`update` runs the pure `hit` (CR-22)") and §7 ("own hit-testing" survived unweakened) | **CANVAS contradicts itself across §5/§7 and §8, and the plan inherits it silently.** §8's CV-3′ says SVG gives "browser hit-testing… for free", which retires the pure `hit`; §5 and §7 still carry it as law, along with CR-19's `Hit` union, CR-20's ≥1-device-pixel side condition, and CR-21's CSS contract for `toCanvasPoint`. Lane C's "click→Message" quietly picks the browser. Consequence: hit injectivity and the `Aggregate` arm have no home and no gate in v1. | Say in the plan that CV-3′ retires the pure `hit`, `toCanvasPoint` and CR-21's CSS contract for v1, and that CR-19/CR-20 return with the Canvas2D scale handler. Then the deletion is a ruling rather than an omission. |
| **TP-23** | **MEDIUM** | §3 Lane C ("labels rotated −90° in the foot band (DOM)") | **Two geometry authorities.** CR-16 puts labels in the DOM; CANVAS §2 makes `place` "the ONE function where pixels are born". A DOM label band at a 27 px lane pitch (aesthetics §1.8: 96 px band, −90°, "forced arithmetic" against a 66 px longest label) must therefore be positioned *from* `place`'s output, not from a parallel CSS calculation. The plan does not say. | One line in the brief: the foot band and the face-facts line consume `place`'s column origins; no second layout arithmetic exists. |
| **TP-24** | **MEDIUM** | §3 Lane C ("Model… the TS mirror of `View.prod(height, lastK)`") vs QUERY-ENGINE §"What is genuinely new work" item 4 | **The fold core ships ungated.** QUERY-ENGINE requires "the generic fold core… gated by the vectors and the properties", and the vectors are S4 — sequenced behind S2 and dispatched later. So v1's fold is hand-written, hand-tested, and outside the trust chain QUERY-ENGINE §"trust chain" item 2/3 describes. | Either state that v1's fold is deliberately ungated and carry it as an owed row, or pull the two generic fast-check properties (incremental-equals-fresh, replay) forward into Lane C — they need no registry, only the Model's own merge. |
| **TP-25** | **MEDIUM** | §3 Lane A gates ("paging tests (consecutive pulls concatenate — HOST-level gate; PDD-6 law 2 stays an owed Lean law)") | Honest but under-cited: **W6 is landed and is the composition law for a fixed word** — "Marks compose — `since (a+b)` is the page at `a`, re-marked from `b` inside it" (`since_compose`, `Worded.lean:176–182`). SPEC :249–250 draws the line the plan is groping for: "W5 is a single pull's answer, where PDD-6 law 2 is that *consecutive* pulls concatenate." The plan never mentions W6. | Cite W6 for the static-word half and keep PDD-6 law 2 owed for the growth half. It costs nothing and makes the owed row precise. |
| **TP-26** | **MEDIUM** | §3 Lane B ("Gates: full `check:cas` battery; … **ledgers regenerated via emitters**") | `check:cas`'s `sources` include `../effects/src/cas/generated/**` and `../effects/test/generated/**`, and the emitters it gates **write into `library/effects/`** (`gen:backend-word` → `../effects/src/cas/generated/WordLogSchema.ts`, and six more). Conversely `gen:trust` reads `../effects/src/**/*.ts`, `../effects/bin/**/*.ts`, `../effects/test/**/*.ts` and writes `library/cas/meta/out/trust.META.json`. The "packages partition the work" claim is false at the generated boundary in both directions. See §2. | Keep the claim but qualify it: the partition holds for *hand-written* files; the generated boundary crosses, and each lane commits its own regenerated ledgers. |
| **TP-27** | **MEDIUM** | §3 Lane C ("story tests against a fake seam", replacing `src/store/seam.ts` and `src/main.ts`) | Two concrete trip hazards in the landed skeleton. (a) `src/scene.test.ts` asserts `text("Lane B")` and `text("Lane C")` exist on the page — Lane C's rewrite deletes that panel and reds the suite. (b) The skeleton's lane letters are **inverted** relative to the plan: `main.ts` attributes screens to "Lane B" and the store contract to "Lane C", while the plan makes Lane B `library/cas` and Lane C the workbench. | Name both in the brief so the implementer does not try to preserve the old assertions or the old lettering. |
| **TP-28** | **MEDIUM** | §1 CV-3′ ("the golden register, **SSR**, a11y, tests, and the live render are ONE artifact") | **SSR is `@experimental` and unreachable in v1's dev loop.** The production-canvas report: hydration and server rendering are "marked `@experimental` in the shipped types… the API may change in any release, advising pinning the exact deployed version"; server rendering "does **not** execute Commands, Subscriptions, or ManagedResources"; only `makeApplication` hydrates (the workbench does use it). There is no workbench server, so nothing in v1 exercises the SSR job. | Demote SSR from a v1 job to a claimed-later one, or state it as an untested affordance. Five jobs is a stronger sentence than four; it should not be bought with an experimental API nothing runs. |
| **TP-29** | **LOW** | §1 CV-5 ("k≈512") vs aesthetics §1.5 ("individuated window — **30 rows = 450 px**") | Two numbers for adjacent concepts, never reconciled: 512 is the carrier bound, 30 is the visible window. CANVAS §4 conflates them ("the individuated window is the last-k tail"). At 15 px pitch, 512 rows is 7 680 px. | One sentence distinguishing carrier bound from viewport window, in whichever document survives. |
| **TP-30** | **LOW** | §1 ("decision 40 (the sort batch, 15 columns)") vs aesthetics §1.5 ("canvas width **507 px** = 16 lanes × 12 + 10 intra × 15 + 4 class × 30 + 45") | 15 sorts, 16 lanes (the 16th is `unregistered`, which "is not a sort"). Arithmetic verified correct. The stream-loop review says "× 15 cols" for the carrier, which under-counts `unregistered`. | Say "15 sorts, 16 lanes" once and let both numbers stand. |

### Ruled but carried by no slice

- CV-5's **viewport virtualization + the epoch-terminator list** (TP-15).
- SPEC **N9**'s bare-hex fallback (TP-20).
- The stream-loop review's five-to-settle **#5** — retiring the stale N2 rows at SPEC :682 and :702–704 (TP-19). The plan's corpus map does discharge the SEARCH-CARRIERS half ("CA-1/2 discharged") and QUERY-ENGINE adoption 6 fixes the "landed" wording, so this is the one third left unassigned.
- QE-2's registry **rung** column for the trunk's own carrier (TP-14).

### In a slice but not ruled anywhere (scope creep)

- **ETag / `If-None-Match` / 304** (TP-12) — no source in any corpus document or in the code.
- Lane A's CLI change ("the CLI keeps full-drain by chaining pulls") is a real behaviour rewrite of `bin/cli/history.ts` that follows from the seam change but is not itself ruled; it is fine, but it should be named as scope rather than parenthesised as "(behavior identical)", since identity is exactly what the gate has to prove.

---

## 2. The verified file-conflict matrix

Enumerated from `mise.toml`'s `sources`/`outputs` declarations, the landed
code, and the workbench's package boundary. "Ripple" = a file a lane does
not edit by hand but whose regenerated content its edits change.

| file / tree | Lane A (effects) | Lane B (cas) | Lane C (workbench) | verdict |
|---|---|---|---|---|
| `library/effects/src/cas/WordLog.ts` | **edit** | — | — | clean |
| `library/effects/bin/mcp/http.ts` | **edit** (route, `planeOf`, banner :1146, export `historyPath`) | — | — | clean |
| `library/effects/bin/cli/history.ts` | **edit** (chained drain) | — | — | clean |
| `library/effects/test/{DaemonHttp,WordLog,CliHistory,ServingDoc}.test.ts` | **edit** | — | — | clean |
| `library/effects/{SERVING.md, PROFILE-CAS-HTTP-0.md}` | **edit** (§14 co-tenant table) | — | — | clean; currently missing from the plan (TP-16) |
| `library/cas/Cas/IR/View.lean` | — | **edit** (`lastK`) | — | clean |
| `library/cas/Cas/**` (new cut-law module) | — | **edit** | — | clean |
| `library/cas/meta/out/{surface,obligations,laws,debts,axioms,strata}.META.json` | — | **ripple** | — | clean (B only) |
| **`library/cas/meta/out/trust.META.json`** | **ripple** (`gen:trust` sources `../effects/src\|bin\|test/**/*.ts`) | *runs the emitter* | — | **partition violation, low conflict risk.** A's edits change a file inside B's package. No textual conflict if B's regen is a no-op, but A must commit it. |
| **`library/effects/src/cas/generated/**`** | reads (imports `WordLogSchema.ts`) | **owns** (`gen:backend-word/wire/gate/architecture/meta`) | *needs* (TP-3) | **no conflict for A/B as scoped** — `lastK` and the cut law do not touch `WordWire.lean`, so the emitted bytes are stable. Becomes a conflict the moment C's mirror is emitted from here. |
| `library/effects/test/generated/**` | **ripple** (`gen:effects-materialize` sources `src/**/*.ts`) | **ripple** (`gen:backend-programs/layers/materialize`) | — | both regenerate; deterministic ⇒ no textual conflict, but both lanes must commit identical output |
| **`mise.toml`** | possible (a new gate task) | possible (a new `lean_exe` ⇒ new lines in `check:cas`, `gen`, **and** `gen:ci`) | **required** (`gen:workbench-*`, `check:workbench` into `check:ci`) | **REAL CONFLICT.** The one file all three plausibly touch. The environment ledger's own refusal makes `gen`/`gen:ci` drift a red gate, so edits must be exact and simultaneous. |
| **`library/cas/meta/out/environment.META.json`** | ripple if A adds a task | ripple if B adds an exe/task | **ripple** (new task + `check:ci` line) | **REAL CONFLICT**, downstream of the row above: a generated JSON of the task graph, in B's package, changed by C's need. |
| **`library/cas/tools/EmitWord.lean` (+ `EmitGrammar.lean`)** | — | **B's package** | **C's prerequisite** (TP-3) | **REAL CROSS-LANE DEPENDENCY.** C's "fake seam from the frozen wire shape" requires an emitter edit inside B's package. |
| `experiments/workbench/{src/**, index.html, styles.css}` | — | — | **edit** | clean |
| `experiments/workbench/{package.json, bun.lock}` | — | — | **edit** if any dep is added | clean; note `check:workbench` runs `--frozen-lockfile`, and `check:lift-roundtrip` is already excluded from the chain because a sibling `bun.lock` "does not resolve under bun 1.4.0" — the precedent for how brittle these standalone lockfiles are |
| `experiments/workbench/dist/**` | — | — | build output | gitignored (`/dist`) — not a conflict |
| `.staging/agent-reports/*` | write | write | write | one file each; clean |

**The true conflict set is three rows: `mise.toml`, `library/cas/meta/out/environment.META.json`, and `library/cas/tools/EmitWord.lean`.** All three trace to the same cause — Lane C's dependency on generated surfaces it cannot reach.

**Sequencing fix.** Cut **S0** and land it before A/B/C dispatch. S0 is one small edit set, all inside `library/cas` + `mise.toml`:

1. Extend `emitword` (and `emitgrammar` for `kindTags`/`names.json`) with a second output under `experiments/workbench/src/generated/`.
2. Add `gen:workbench-word` to `gen` **and** `gen:ci` **and** the `check:cas --check` run line (the environment ledger enforces the first two staying in step).
3. Add `mise run --force check:workbench` to `check:ci` (TP-6).

After S0, A/B/C touch disjoint hand-written trees; the only remaining crossings are deterministic regenerations each lane commits with its own work. Without S0, Lane C's first step lands in Lane B's package while Lane B is editing it.

**Second sequencing note.** The plan's own S2→S4 ordering is right (same package, no concurrency), but S4 should not be described as "QuerySpec work" riding v1 at all — QE-2 grills the AST "with the trunk's first registry entries", and those entries do not exist until Lane C's fold shape is settled. S4 belongs after S3 as well as after S2. See §5.

---

## 3. Dependency honesty — the fake-seam-first claim, tested

**Is the `WordHistory` wire shape frozen?** Yes. `library/effects/src/cas/generated/WordLogSchema.ts` is `GENERATED — do not edit`, emitted from `library/cas/Cas/Lang/WordWire.lean` by `lake exe emitword`, byte-identity-gated inside `check:cas`. It is two structs:
`wordLogEntrySchema = {address: String, at/seq/size/tag: Int}` and
`wordHistorySchema = {next: Int, word: Array(entry)}`. Lane A's `limit`
does not change either — the response stays `{next, word}` — so the shape
genuinely is frozen against S1.

**Is it importable today? No.** See TP-3. There is no workspace, no root
`package.json`, the workbench depends on `effect` and `foldkit` only,
`@foldlab/cas` is `private: true` with `exports` pointing at `./dist/*`
(so a consumer needs `bun run build` first), and the workbench's own
README forbids hand-typing a surface the language already describes. Three
artifacts are needed, not one: `wordHistorySchema`, `kindTags.ts` (the
sorts classifier, CR-42's "one authority"), and `grammar/names.json` (the
column labels).

**What does C's final integration step actually need from A?** Less than
the plan implies, and that is the good news. It needs: the route to exist
at a known path; `limit`'s default and cap (TP-17); and `next`'s meaning
under truncation (TP-17). It needs nothing from A's ETag work, nothing
from A's CLI change, and nothing from the seam's internals. The wire
document it decodes is already frozen.

**Can C's "done means" be reached with A unfinished? No** — and the plan
should say so plainly rather than implying the flip is cosmetic. The
done-condition is SPEC §6's sentence: *"a browser tab shows this store's
history growing while another process puts into it."* That requires a live
`cas daemon` serving `/history`. Everything short of it — Model, update,
Placement, `place`, the SVG view, tokens, a11y, goldens, story tests — is
reachable against a fake seam. So the honest statement is: **C can reach
"gated and green" without A; it cannot reach "done" without A.** Those are
different milestones and the brief should name both.

**One more honesty item.** `experiments/workbench/package.json` carries
`effectProvenance.status: "PENDING"` with the note that the lock "resolves
`effect@4.0.0-rc.111`… foldkit@0.154.0 peer-pins `effect@4.0.0-rc.112`
exactly, which is NOT yet in the lock. This package therefore names an
UNRESOLVED effect pin. Nothing here may be cited as provenance-backed
until the lock records rc.112." `library/effects` names the same rc.112
*with* a provenance commit. So the two packages agree on the version and
the C6 note may simply be stale — but as long as it stands, nothing Lane C
ships is provenance-backed, and the plan claims no such thing, so this is
a note rather than a finding. Worth confirming before dispatch.

---

## 4. Gate sufficiency, failure mode by failure mode

| named failure mode | source | gate the plan proposes | does it catch it? |
|---|---|---|---|
| **CR-30 cold start** (paging leans on PDD-6 law 2) | canvas review | "paging tests (consecutive pulls concatenate — HOST-level gate)" | **Yes**, at host level, and the owed Lean row is honestly cited. Improvable: cite W6 for the fixed-word half (TP-25). |
| **QE-A2 OOM** (`since` unbounded ⇒ cold start is an OOM, not a slow path) | stream-loop review | "SQL `LIMIT`… slice cap in the memory realization" | **No.** The file realization is unnamed and reads the whole log before slicing (TP-5); no default and no cap are stated (TP-17); and no gate asserts a bound on rows read or bytes held. This is the one QE finding the plan believes it has closed and has not. |
| **the extension law** (append extends the placement; positions immutable within an epoch) | CR-1/CR-3 | "as vitest properties" | **Yes in shape**, if the property is over `layoutAt`/`Placement` and not over rendered output. Add the epoch-terminator cases (TP-15) or the property tests only the trivial half. |
| **the a11y conformance claim** (WCAG 2.5.8 via Equivalent control) | A5 | "Scene locator tests"; "roles + aria-label" | **No.** Locator existence is not equivalence. The claim needs a Square-set ↔ list-row-set correspondence test and a same-Message test for arrow keys (TP-21). |
| **agreement / snapping** (CR-24, CR-25/26) | canvas review | "golden SVG snapshots of `place`'s output" | **Partly.** Goldens at one DPR test none of the snapping the rule exists for (TP-13), and the plan's own "integer CSS px" defeats it outright (TP-4). |
| **hit correctness / injectivity** (CR-19/CR-20/CR-22) | canvas review | *nothing* | **No gate, and no implementation** — CV-3′ hands hit-testing to the browser and the plan never says the laws are retired (TP-22). |
| **incremental-equals-fresh / replay** (QUERY-ENGINE trust chain 3) | QUERY-ENGINE | deferred to S4's vectors | **Not in v1** (TP-24). The two generic properties need no registry and could ride S3. |
| **the route's document identity** (SPEC's two-register law) | SPEC :643–647 | "byte-identity of a full chained drain vs `cas history --json`" | **Yes if restated** so the two sides are the route and a single CLI call (TP-16). |
| **doc drift on the new route** | `ServingDoc.test.ts` | not mentioned | **No** — the drift gate keys on three named exports and cannot see a fourth (TP-16). |
| **"a browser tab shows…"** | SPEC §6 done-means | `check:workbench` | **No browser anywhere** (TP-8), and `check:workbench` is not in CI at all (TP-6). |
| **SVG in foldkit's vdom actually works** | CV-3′ | *nothing* | **No spike, no gate** (TP-9). The premise is a type list. |
| **`createLazy` actually memoizes a column** | CV-3′ | *nothing* | **No gate** (TP-10), and both failure modes are silent — one renders too much, the other never re-renders. |

---

## 5. Sizing and slicing

**S3 (Lane C) is too big for one lane, and it splits cleanly.** Its bullets
contain at least four independently-gateable bodies of work: (i) the fold
engine — Model, Messages, `update`, the poll command and backoff, the fake
seam; (ii) the layout engine — `Placement`, `place`, snapping, the
extension-law properties, the goldens; (iii) the app — the SVG view,
tokens, micro-tint, labels, face facts, inspector, empty states; (iv)
a11y — arrow-key nav, the list view, the equivalence gate. (i) and (ii)
are pure, browserless, and testable today against the fake seam; (iii)
depends on TP-9's spike; (iv) depends on (ii) and (iii). The engine half
(i + ii) is also the half that needs **nothing** from S0 except the wire
mirror, so it can start immediately.

Recommended cut: **S3a engine** (fold + Placement + `place` + properties +
goldens) and **S3b app** (SVG view + tokens + a11y + integration). One
lane can run them in series, or two if the operator has the agents; the
seam between them is `place`'s output type, which is already the plan's
own agreement boundary.

**S1 (Lane A) is correctly sized** once ETag is cut (TP-12) and the doc /
`planeOf` / drift-gate work is added (TP-16) — those roughly cancel.

**S2 (Lane B) is on the small side but is correctly its own dispatch** — it
is the only Lean lane, its gate battery is the slowest in the estate, and
its "optional if cheap" third item (mechanizing the Edge counterexample)
gives it slack. Do not merge it into anything.

**S4 should not ride v1, and the plan is right to sequence it behind S2 —
but the sequencing is under-specified.** QE-2 grills the QuerySpec AST
"with the trunk's first registry entries", and those entries are exactly
the generators Lane C is hand-writing in S3. Dispatching S4 after S2 but
before S3 lands would grill the AST against entries that do not exist yet.
S4 belongs after **both** S2 and S3.

**S0 (new, from TP-3/TP-6) is small and must be first.** It is the only
thing standing between the plan's parallelism claim and reality.

---

## 6. What stands

Most of the plan is sound, and the parts that are sound are the load-bearing ones.

- **The corpus map is accurate.** Every document listed holds what the plan says it holds; the SEARCH-CARRIERS "CA-1/2 discharged" annotation and QUERY-ENGINE's adoption-6 wording correction both land the stream-loop review's re-citation demands.
- **The address-not-value line (QE-1/QE-A3) is correctly applied.** Lane A's "Explicitly NOT: … any receipt-field predicate" is exactly the testable rule, and `since`/`limit` are word-index arithmetic, which the rule permits.
- **`lastK`'s law is true.** `lastK k (w ++ v) = lastK k (lastK k w ++ lastK k v)` holds by the case split the plan describes, and `View`'s structure (`Cas/IR/View.lean:56–61`) admits it with no new machinery. The carrier arithmetic (~1 MB at 10⁷ across 15 columns at k = 512, vs ~1.5–2 GB) is right.
- **The route-not-tool argument is right and still holds.** `PROFILE-CAS-HTTP-0.md` §14 is additive at `/0` and `/projections` is the landed precedent; nothing about `/history` requires a `Mcp.lean` edit or a manifest versioning event.
- **The 1 s active / 5 s idle poll, and "the mark comes ONLY from `next`"**, match the stream-loop review's parameters #10 and #16 exactly. #16 is the one that prevents permanently-skipped receipts, and the plan states it in the right place.
- **The epoch law applied to layout, pure-recency v1 DOI, and dropping `doi.r`** are the review's own recommendations, adopted whole and correctly summarized.
- **The deferred list is well-ordered** and its dependencies are real: materializer → `/live` → sediment band + `from`/`to` → Regime B → LOD registry → Canvas/WebGL via Mount → streaming lane. Nothing in it is smuggled forward except the two items TP-7 and TP-19 flag.
- **§5's owed rows are honest and mostly complete** — PDD-6 law 2, L228, `owed(reach-search-memoized)`, Exchange G2/G3, G4, the Lean twin of Placement's laws. The plan carries L228 without being asked to, which is exactly right.
- **The geometry arithmetic checks out.** 507 px = 16 × 12 + 10 × 15 + 4 × 30 + 45, and the class/intra gutter counts follow from decision 40's five speed classes.
- **The aesthetics slate is coherent** and A1/A4/A6 are unproblematic. The `--owed` discipline (one saturated colour, spent only on `unregistered`) is the strongest small ruling in the set.

---

## 7. Ranked shortlist — what to change before the lanes dispatch

1. **Cut S0 and dispatch it first** (TP-3, TP-6, TP-26). Emit the workbench's wire/kind/name mirrors; add `gen:workbench-*` to `gen` + `gen:ci` + `check:cas`; add `check:workbench` to `check:ci`. This is the only true blocker to the parallelism claim, and it is an hour of mechanical work.
2. **Rule the strip question once** (TP-1, TP-2). "No strip in v1" and "strips unclickable in v1" cannot both be adopted. Whichever way it goes, say what renders rows past `k` and what happens when the user scrolls back.
3. **Fix `place`'s snapping to device pixels and put DPR in its signature** (TP-4), and pin the golden DPRs and the micro-tint index expression (TP-13).
4. **Put a spike at the head of Lane C for CV-3′** (TP-9) and specify `createLazy`'s memo key (TP-10). The renderer ruling currently rests on a type list, and the memo has two silent failure modes.
5. **Cut the ETag clause** (TP-12) — unruled, mis-scoped, and its correctness argument is falsified by the log's own truncation repair.
6. **Close QE-A2 properly** (TP-5, TP-17): name all three realizations, state `limit`'s default and cap, state what `next` means under truncation, and gate the bound.
7. **Assign the ruled-but-unowned items** (TP-15 virtualization + epoch terminators, TP-20 N9's bare-hex fallback, TP-19 the stale N2 rows at SPEC :682/:702–704).
8. **Fix Lane B's `lastK` brief** to be column-indexed, with the generic `lastK_append` lemma named as the mint, the rung (R0) stated, and the `ofQuery`/`View.ext` question answered (TP-14).
9. **Add the missing Lane A scope**: `planeOf`, `historyPath` export, `ServingDoc.test.ts`, the `SERVING.md` route table, `PROFILE-CAS-HTTP-0.md` §14's co-tenant table, the banner line (TP-16).
10. **Name the a11y gate** (TP-21) and add a browser smoke or weaken the done-means (TP-8).
11. **Split S3 into engine and app** (§5), and move S4 behind S3 as well as S2.
12. **Demote "the patchability law" from prior ruling to co-ruled ask** (TP-11) — QA-4 is open in its own home document.
13. **Resolve §4's "build on the uncommitted tree"** (TP-18): either land the commit or tell the lanes to run leaf tasks only, because `git diff --exit-code` reds the chain for all three today.

---

## 8. What a production-canvas / Elm-architecture reviewer would say is missing entirely

Not defects in what the plan says — things the plan does not mention at all.

- **Integration testing across the A/C seam.** The plan has A-side gates and C-side gates and nothing that exercises the pair. Nothing tests: a 404 from the route, a 403 from the Origin allowlist (the most likely first-run failure — `--allow-origin` is required and the plan never mentions it), a malformed `WordHistory`, a `next` that goes backwards after an operator truncation, or a store with zero receipts. The seam is where the two lanes' assumptions meet and it has no test at either end.
- **Error and refusal rendering.** `RefusedHistory` appears once in Lane C's Message list and never again. There is no ruling on what a refusal *looks like* — whether the canvas keeps the last-known Placement or clears, whether the face-facts line goes stale-marked, whether a refusal is dismissible, whether repeated refusals back off. The skeleton already models this well (four states, "refusal carries its reason, and 'never asked' is not the same fact as 'asked and was refused'") and the plan's Model — `{mark, columns}` — has nowhere to put it. **The Model as specified cannot represent "I asked and was refused."**
- **Loading states and first paint.** Between `init` and the first `PulledHistory` there is a state the Model does not name. With SSR in the picture (TP-28) there are two: server-rendered-empty and client-pre-first-poll. "Empty states as sentences" covers the *empty store*, not the *unloaded store*, and those are different sentences — the CLI's own wordings distinguish them ("no history yet — receipts begin when a store first opens with the word log" vs "nothing since mark N").
- **The empty-store first-run experience.** A fresh store renders sixteen empty lanes, a 96 px label band, and a face-facts line reading `0 admissions`. Is that the intended first impression, or does the trunk say something before it has anything to draw? The aesthetics report never mocks the zero state and the plan never asks for it. It is the state every new user sees first.
- **Dev-loop ergonomics.** `check:workbench` runs frozen-install, lint, typecheck, vitest and a production build — a full cold gate, not an inner loop. There is no watch task, no `dev` in any mise task, and no fixture store to develop against, so a Lane C implementer's inner loop is `bun run dev` plus a hand-started `cas daemon` plus a hand-built store, none of it written down. **A seeded fixture store (or a recorded `WordHistory` fixture the fake seam replays) is the single highest-value unlisted item in the whole plan** — it serves the fake seam, the story tests, the goldens, the empty-store question, and the browser smoke at once.
- **HMR and time-travel.** CANVAS §4 lists "HMR/time-travel (foldkit preserves the Model…)" as an epoch terminator, and foldkit ships DevTools with a bounded history. Under CV-3′ the vdom carries this for free — but the `createLazy` memo does not, and a time-travelled Model with referentially-equal column snapshots will show a stale canvas. Worth one line.
- **What happens at 6 tabs.** The stream-loop review's parameter #15 records that HTTP/1.1 caps at six connections per browser per origin and that a seventh tab's polls queue. v1 polls rather than streams, so this is milder — but it is a known, reachable localhost failure that the plan inherits and does not mention.
