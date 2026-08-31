# CORE-ABSTRACTIONS-PLAN — decision 28's planning pass

Status: PLANNING ARTIFACT, pre-grade, awaiting the Opus 5 hard review
(decision 28: "one Fable writes the plan, Opus 5 hard-reviews it —
plans cited, proofs sketched and decomposed, hard parts named").
Written by the Fable planner, 2026-08-29 late. NOT committed by this
pass; the review lands before the commit.

Mandate (SPECS.md:385-403, decision 28 "AGREED ON ALL COUNTS"): plan
the execution of the ratified grilling docket
(GRILLING-DOCKET-2026-08-29.md) — the nine Tier-1 rulings, the
proof-grill batch A–H, the Tier-2 postures' propagation into their
owning specs' queues, and decision 30's productization question
(SPECS.md:411-417).

Method: statement triage first (decision 26 second addendum,
SPECS.md:362-369 — "EVIDENCE IS THE LICENSE"). Every estate claim
below was verified in the working tree at main `5e9d8ad3` or on the
named merge branch before being cited. Claims that could not be
verified are marked **PENDING-VERIFICATION** inline. File:line
citations are to main unless a branch is named.

Standing constraints every lane inherits:

- **No new abstractions** (decision 2, SPECS.md:102-105): no new
  sorts (decision 23, SPECS.md:316-318 — "the sort registry's
  stillness is the discipline"); kinds grow by arms; carriers are not
  minted where a seat exists.
- **The Mcp.lean fence** (SPECS.md:367): `Cas/Backend/Mcp.lean` is
  touched by no lane below. Its `manifestVersion` moves only by
  ruling (Cas/Lang/Fragments.lean:156-161), and no ruling in this
  docket moves it.
- **The A bar** (decision 25, SPECS.md:329-339): every refusal any
  slice adds answers at grade A — everyday register, defect named,
  fix named.
- **Firefight etiquette / merge floor**: nothing below edits a file
  the two merging branches carry until they land (§0).

---

## 0. The floor — what tonight's merges make true

Verified against the live refs:

- **main = `5e9d8ad3`** (decisions 28–30 landed).
- **merge/daemon-spine = `0aeeefd7`**, parent `c042afa3`. Adds:
  `library/effects/bin/mcp/http.ts` (930 lines, the daemon's HTTP/MCP
  plane), `bin/cli/daemon.ts`, `docs/lab-core/SERVING.md` (296 lines
  — including "The protocol ceiling (a stated pin, not an accident)",
  SERVING.md:148 on the branch), `test/DaemonHttp.test.ts`,
  `test/RpcFrameCapPin.test.ts`, `test/ServingDoc.test.ts`.
- **merge/cas-word = `ad44b40b`**, parent `c042afa3`. Adds:
  `library/cas/Cas/Lang/Worded.lean` (WordSig/`since`, seven laws:
  `since_suffix`, `since_zero`, `since_cas_agrees`,
  `stepWorded_preserves_wf`, `since_next`, `since_compose`,
  `runWorded_preserves_wf`), `Cas/Lang/WordWire.lean` (`LogEntry`
  receipt: seq/at/address/tag/size; `History` document with `next`),
  `tools/EmitWord.lean` → `src/cas/generated/WordLogSchema.ts` (the
  registered word-log spelling, byte-gated), `src/cas/WordLog.ts`,
  `bin/cli/history.ts`, `src/internal/canonicalJson.ts`, tests.
- Both branches were cut BEFORE the docket landed on main, so their
  diffs "delete" `GRILLING-DOCKET-2026-08-29.md` and the SPECS rows —
  a stale-base artifact. **Merge instruction: the docket and decisions
  28–30 survive both merges; whoever merges verifies
  `docs/SPECS.md:385-417` intact afterwards.**
- **In review, not yet on a merge branch**: the CLI naming seat
  (verdict MERGE-WITH-FIXES, two blockers: hand-written everyday word
  off-registry; help verb outside the `--json` law — docket:224-228)
  and rescue `dd54bc5f` (MERGE-WITH-FIXES). Lane H depends on the
  naming seat's landing; nothing else below does.

Sequencing rule: lanes touching `Cas/Lang/*`, `Cas/IR/Word.lean`,
`bin/cli/*`, `src/cas/*` (Lanes D, G, H, I) start from the
POST-MERGE floor. Lanes A, B, C, E, F touch files neither branch
modifies and may start now (verified against both diffs).

---

## 1. Overtaken-by-events ledger — docket entries the estate has already discharged

The docket was assembled at 20:15 from the 13-file extraction sweep;
commits `698b2f18` (17:45) and `659a909d` (16:41) overtook four of
its entries. Evidence is the license — each is VERIFIED, not assumed:

| Docket entry | Status | Evidence |
|---|---|---|
| Proof-grill **F** — "FRAME-1's last step... prose AHEAD of proof" | **CLOSED on main.** | `runPFrom_frame_sound` (Cas/Lang/Defun.lean:1944), `runP_frame_sound` (:1965), `runPFrom_append_done` (:1887), `PProg.answersFrom_prefix` (:1868), `runP_absent_sound` (:1839); commit `698b2f18` "MS-1 — hash-determination named, and FRAME-1 closed". Fragments.lean:49-53 now cites the theorem, and the theorem exists. |
| Proof-grill **E** — "HD-1 statement + HD-2 counter-witness (handleLlm half-exists)" | **CLOSED on main.** | `PLine.HashDetermined` (Defun.lean:1480), `PLine.hashDetermined` (:1496); the HD-2 counter-witness is the closing `example` of Defun.lean (:2185-2199): one program over `AgentSig`, two oracles, two answer histories, `by decide`. |
| Tier-1 **4**'s lowering half — "the emitter reads the table but does not lower from it" | **LOWERING LANDED.** | `Cas/Backend/EmitProg.lean` header "The lowering goes through PProg" (:22-30); `lowerTree : Tree t → StateM (Array PLine) Nat` (:55), `treeProg` (:85), `progStmts : Nat → PProg → Option (List Stmt)` (:110) walks the TABLE; `treeProgram = progProgram doc name (treeProg tr)` (:129-131). Commit `659a909d` also landed the Lift → PProg decoder and its round trip. What REMAINS of item 4 is the theorem half (Lane D). |
| Tier-1 **5**'s implementation half — CANON-1 | **RULED AND IMPLEMENTED at the door.** | `Cas/Schema/System.lean:89-100` ("CANON-1, ruled: canonicalize at the AUTHORING door, never here"; renormalize-on-read named a defect); `EmitLayer.canonServices` (Cas/Backend/EmitLayer.lean:220), `isCanonServices` (:226), the authoring composition normalizes (:232); `tools/EmitLayers.lean:178-233` guards every authored list at elaboration. STATE-OF-MECHANIZATION.md:38 records "CANON-1 guard live". What REMAINS is the theorem pair (Lane E). |

Also partially overtaken: Tier-2 item 10 — the freshness mechanism is
landed and armed (STATE-OF-MECHANIZATION.md:43-45: "sources/outputs +
blake3 freshness + forced gen:ci mirror with envledger refusal —
fired twice tonight, correct both times"); what remains is the
posture ROW and the BS-2 fresh-clone-mtime claim, which
BUILD-SEMANTICS.md:278 admits was reasoned, never tested (§4, lane J).

**First slice of the whole plan (gatekeeper-compatible, decision 27):
land this ledger as docket strikeouts + STATE-OF-MECHANIZATION row
updates, in one commit, so no lane re-plans discharged work.**

---

## 2. The lanes

Ten lanes. Each: objective — ruling(s) executed — slices in order —
gates — theorems (sketches live in §3) — must-not-touch — edges.

### Lane A — References and recursion (C6)

- **Objective.** Grow the schema plane's admitted subset with
  `Suspend`/`Reference` and the references table, closing Slice C's
  last step and the tree-sitter materializer lane's remaining half.
- **Rulings.** Docket Tier-1 item 1 (docket:35-42), ruled per
  decision 28: "reference name = target's content address (or
  annotated name), Document.references assembled from store words at
  materialization." Owning queue rows: SCHEMA-MATERIALIZATION.md
  ruling 2 (:198-202) and item 16 (:402-405); libfree D2's counter
  feeds it (dsl-proposal.md:1659).
- **Verified base.** `Ast` today has NO reference-into-table
  constructor — the universe is null/bool/int/str/lit/arr/struct/
  ref(tag)/decl/union/enum/tuple (Cas/Schema/Ast.lean:66-161).
  Rev-1 `references` is emitted `{}` and unreachable from Lean
  (SCHEMA-MATERIALIZATION.md:137). Effect's own codegen route for
  recursion is `Schema.suspend` (:60-62).
- **Slices.**
  1. **Spelling probe** (read-only): pin the exact rev-1 JSON keys
     Effect emits for `Suspend`/`Reference` and the `references`
     table out of the pinned source
     (node_modules/effect/src/SchemaRepresentation.ts — the node
     interfaces around :329-460). PENDING-VERIFICATION: exact key
     spellings; the slice's first act is to pin them in a probe test
     before any Lean is written.
  2. **Carrier**: `Ast.susp (name : String)` (one constructor; the
     name is a references-table key). `WF` extension: name nonempty.
     The ADDRESS discipline (name = target's content address, or an
     annotated name) is deliberately NOT in `WF` — it is the door's
     and the materializer's question, per the ruling's own text.
  3. **Document plane**: the references table decoded/emitted
     (`ofRepresentationJson`/`toRepresentationJson` for the document
     envelope — today's envelope key lists are read off the
     projection, Cas/Backend/Admission.lean:24-39, so the table rides
     the same discipline). Guardedness check at admission (§3, C6-WF).
  4. **Materialization**: `Document.references` assembled from store
     words — a MultiDocument assembly step in `CanonicalSchema.ts` /
     `Materialize.ts`, checked against the word: every
     address-named reference must resolve in the store at the schema
     kind (the existing `WrongKindReference` door fires — precedent
     Cas/Schema/Annotation.lean:76-80).
  5. **Byte gate on a recursive fixture**: one self-referential
     struct (linked-list shape) admitted through both doors; the
     verdicts corpus gains the recursive rows; `emitgate`/`verdicts`
     regenerate.
- **Gates**: `lake build` green, `check:cas` byte gates (schemas,
  addresses, verdicts, gate table) — a new `Ast` constructor moves
  the admission table, which is exactly what the gate is for.
- **Theorems**: C6-WF (guardedness decidable) and the round trip
  extension — §3 addendum below the batch.
- **Must not touch**: `El`'s denotation (v1 does NOT extend
  denotation to `susp` — see HARD PARTS 2); `Cas/Backend/Mcp.lean`;
  the checks layer.
- **Edges**: independent of the merges; unblocks the tree-sitter
  materializer lane (MATERIALIZER-LANE row, SPECS.md Category 2) and
  libfree D2. Feeds Lane B2's full-fidelity goal.

### Lane B1 — The annotation bag, stored (SM-21)

- **Objective.** Make the Lean decoder ADMIT AND CARRY Effect's
  annotation bag, so the three adopted declaration rows round-trip
  AS ACTUALLY STORED and the 100%-fidelity mandate (decision 13,
  SPECS.md:178-189) stops being false at the door.
- **Rulings.** Docket Tier-1 item 2 (docket:43-49): STORE, grow the
  Lean decoder. Owning row: SCHEMA-MATERIALIZATION.md item 21
  (:470-482); the divergence's record is
  Cas/Backend/Admission.lean:52-62.
- **Verified base.** In the pinned rc.111 source the bag is NOT
  declaration-only: `annotations?:` appears on the representation
  node interfaces at SchemaRepresentation.ts:147, 160, 178, 329,
  364, 447, 460, on checks at :508-540, and the persisted node
  schemas attach `annotations: AnnotationsSchema` at :953-986, 1031,
  1048; `pruneAnnotations` (:927) strips symbol keys at persistence.
  **The growth is a cross-cutting optional key, not a decl field** —
  this is the "true size" the docket flags, confirmed.
- **Slices.**
  1. **Measurement first (the docket's own demand).** No instrument
     measures Effect-side bags today: the verdicts corpus is
     Lean-emitted (structurally blind — SM-21's own finding, :476),
     and `experiments/parser-census` counts TypeScript declarations,
     not representation nodes (census README; out/histogram.json).
     Slice: one probe test in `library/effects/test` (precedent:
     `CanonicalSchemaPin.test.ts`) running `toJson` over the four
     registry declaration rows plus a representative wildtype set,
     counting non-empty bags PER NODE FAMILY. The count decides
     slice 2's scope; an unmeasured scope is refused
     (D1-OPTION-A-SCOPING.md:138's stamped-counts discipline applies
     here too). Corpus-scale numbers wait for OXC ingestion (Lane
     B2) and are stamped provisional.
  2. **Carrier growth, triaged** (§3, BAG-1 for the statement):
     pick (b) of three candidates — one `Ast.annotated
     (bag : List (String × Json.Value)) (inner : Ast)` wrapper whose
     PROJECTION splices the `annotations` key into the inner node's
     canonical object. Candidate (a), a bag field on every
     constructor, is refused: it ripples every WF/codec/El/Described
     proof for data the kernel never inspects — the exact ripple
     stipulation S2 exists to prevent
     (Cas/Schema/Annotation.lean:12-17). Candidate (c), strip to
     sidecar annotation nodes, is refused by the ruling itself (the
     bag is STORED in the code; stripping makes byte-identity
     round-trip a reassembly claim). WF: no double wrap; bag keys
     sorted; values are `Json.Value`. `El (annotated b a) = El a`
     (denotation-inert).
  3. **Door growth**: `ofRepresentationJson` consumes the
     `annotations` key into the wrapper; `toRepresentationJson`
     splices it back; the admission table gains the key as
     OPTIONAL (the generated interpreter already tolerates it —
     Admission.lean:57-62 — so the TS door's behavior is preserved
     while the Lean door stops refusing it).
  4. **The gate flip**: round-trip theorem on the three adopted rows
     AS STORED (`Schema.Date` with
     `{"annotations":{"expected":"a valid Date"}}`) — ingestBytes →
     project → byte-identical. This converts SM-21's structural
     blind spot into a standing gate; the verdicts corpus gains
     bag-carrying rows.
- **Gates**: schemas/addresses/verdicts/emitgate byte gates; the new
  round-trip `#guard`s.
- **Must not touch**: checks' bags (:508-540) — they ride the checks
  layer slice (admissible-subset table row, SM.md:136), not this
  lane; address stability of bagless codes (empty bag must be
  UNSPELLED, not spelled empty, or every existing address moves —
  a named acceptance criterion).
- **Edges**: independent; feeds Lane B2's fidelity claim.

### Lane B2 — D1 re-ruled: the instrument/capability split made evidence

- **Objective.** Execute Tier-1 item 6's six asks as one act and
  produce the measured, stamped parse-fidelity table that makes the
  split evidence.
- **Rulings.** Docket item 6 (docket:75-82) answering
  D1-OPTION-A-SCOPING.md's six asks (:169-176): (i) NO FORK — A′
  dies, decision 13 made OXC the capability instrument; (ii)
  tree-sitter legs gate only themselves; (iii) upstream #364 as
  goodwill, unsequenced; (iv) Schema.ts is the OXC leg's to parse;
  (v) census counts grammar-rev-stamped, provisional, refused
  unstamped; (vi) no binding fork.
- **Verified base.** The census instrument exists and ran
  (STATE-OF-MECHANIZATION.md:59-60: 140,583 decls; a twin divergence
  found and UNRULED — the defaulted-parameter form axis, on the
  operator's waiting list :109). OXC leg: 6/6 vendored rc.111 files
  parse clean (S-o-M.md:29).
- **Slices.**
  1. Record the six answers where they are owed: a ruling block in
     D1-OPTION-A-SCOPING.md; strike Option A language from
     SPECS.md decision 7's addendum context (a pointer row, the
     decision text itself is archival and stays); the libfree D1 row
     (dsl-proposal.md:1650) marked superseded-by-ruling.
  2. **The parse-fidelity table**: one emitted artifact (home:
     `experiments/parser-census/out/`, beside the histogram) — per
     instrument (tsc API / tree-sitter twin / OXC) × per corpus
     stratum: parse-clean rate, ERROR/MISSING counts, grammar rev
     stamp. Schema.ts's row is the split made visible: unparseable
     under tree-sitter at any known pin (D1b, scoping report :39),
     clean under OXC (S-o-M.md:29). Refuse any unstamped count at
     the gate (the C2-gate test's discipline).
  3. Stamp `corpus-manifest.json` declCounts with grammar rev +
     provisional flag (ask 5's exact shape, scoping :175).
  4. Tree-sitter register narrowing: TOOLS.md's tree-sitter rows
     annotated "gates the tree-sitter legs only" (ask ii). #364
     goodwill noted in the row, unsequenced (ask iii).
- **Gates**: census C1/C2 test gates; the new table's own byte gate.
- **Must not touch**: the grammar pin, the binding, any vendored
  clone (NO FORK is the ruling); the twin's landed gates.
- **Edges**: independent. Together with B1 it prices the Great
  Hoovering (decision 5); the UNRULED twin-divergence axis stays on
  the operator's list — this lane does not decide it.

### Lane C — RootStore over SQL: compare-and-set, recorded; the browse verb licensed

- **Objective.** Execute the design ruling: roots move by
  compare-and-set on the named head, or the backend refuses the
  RootStore role; keep every refusal a compile error, not a fake.
- **Rulings.** Docket Tier-1 item 3 (docket:50-57); decision 28's
  text: "RootStore-over-SQL answered by compare-and-set,
  RootStore.list unimplementable until then."
- **Verified base.** `RootStoreShape` is publish + list, grow-only
  (src/cas/Backend.ts:85-92). `KvsBackend` deliberately provides the
  byte plane only — "Serving this backend is therefore a compile
  error until that decision is made, which is the intended outcome"
  (src/cas/KvsBackend.ts:10-18). `SqlRootStore` publish is
  `INSERT … ON CONFLICT DO NOTHING` (SqlRootStore.ts:25,100);
  `cas_list_roots` exists as a tool over `Cas.RootStore`
  (bin/mcp/tools.ts:238-243; Lean row Cas/Backend/Mcp.lean:531) and
  compiles wherever a RootStore layer is provided (FileBackend, SQL)
  — the non-compiling composition is KVS-served, exactly as designed.
  Lean side: `RootSig` publish/listRoots with `publish_mem`
  (Cas/Lang/Roots.lean:29-48,111).
- **The honest reading of the ruling** (this is a design ruling; the
  docket itself says "the compile error IS the gate"): today roots
  NEVER move — the set only grows, and no verb removes
  (tools.ts:232). "Named head" presupposes names on roots, which is
  Lane H's ruling (naming publishes) plus queue item 23's index. So
  this lane RECORDS the primitive and refuses to build a mover
  without a consumer (decision 2).
- **Slices.**
  1. The ruling recorded in three homes: BACKEND.md's seam law (the
     RootStore section, :63-92 — add the compare-and-set clause and
     the KVS refusal's reason: `KeyValueStore` carries no atomic
     compare-and-set, so the KVS backend refuses the ROLE, not just
     the listing); `Backend.ts:85-92`'s docstring;
     `Cas/Lang/Roots.lean`'s header (the Lean mirror of the
     future primitive's law: a head moves only by CAS — stated as
     the DESIGN bound, no Lean carrier minted now).
  2. `Cas/Architecture.lean`'s capability matrix: the kvs row
     already pins read/write-only (Architecture.lean:129-132);
     SCHEMA-MATERIALIZATION item 31 (:580-584) records the SQL-roots
     row addition as a PAIRED change (TS value + Lean + shared pin) —
     execute it here, one slice, both sides.
  3. A refusal-shaped test: serving KVS without a RootStore is a
     type error — pin it as a compile-time expectation (the estate's
     `@ts-expect-error` discipline) so the gate outlives the person
     who knows it is intended.
- **Theorems**: none — a design ruling. The falsifier is someone
  shipping a `RootStore.list` fake over KVS; the compile error and
  the matrix pin are the gates.
- **Must not touch**: the CAS mover itself (no consumer yet); the
  root layout (`rootRelativePath`, Backend.ts:108).
- **Edges**: item 31's paired row rides here. Lane H's
  naming-publishes row cites this lane's recorded primitive.

### Lane D — Program identity, theorem-ized (Tier-1 item 4 close-out + grill C)

- **Objective.** Name `progAddr` and prove it injective; discharge
  `hsep` once for every injective digest; land the store-shaped
  decoder direction the language ranking owes.
- **Rulings.** Docket Tier-1 item 4's proof clause (docket:58-64);
  proof-grill C (docket:176-177); language ranking item 2
  (docket:189-192, the decode direction owed); brain-stem P1–P3
  (PROPOSED-LOGIC.md:57-75).
- **Verified base.** `progAddr` exists NOWHERE in library/cas
  (verified by repo grep) — the host asserts "the address is the
  program's identity" and `EmitPrograms.contAddressOf`
  (tools/EmitPrograms.lean:100-103) computes exactly
  `H (encodeNode (tableNode H p))` inline, unnamed. All raw material
  is landed: `encodeNode_injOn` (Cas/Codec/NodeCodec.lean:268),
  `readLine_exact` (Cas/Lang/Defun.lean:764), `lineAddr` (:836),
  `tableNode` (:841), `encodeProg` (:847), `decodeProg` (:939) with
  the threaded `hsep` premise (:913,975,1000), and the
  hsep-necessity witness (:1015-1053).
- **Slices.**
  1. `progAddr` named in Defun.lean + `progAddr_inj` (§3, sketch C1).
  2. `lineAddr_sep_of_injective` (§3, C2); re-thread the three
     consumers (`decodeProg_encodeProg` :1000,
     `runP_decodeProg_encodeProg` :1053-1068, the :2116 corollary)
     with the discharged form — the hsep premise stays available for
     non-injective H, the new lemma serves every real digest.
  3. `decodeProgAt` — the store-shaped decoder (§3, C3). This makes
     `cont`'s lineCount field load-bearing in Lean; today the TS
     decoder is its only consumer (PROPOSED-LOGIC.md:70-75, "host
     policy wearing a law's look").
  4. The P4 witness (starting-word relevance,
     PROPOSED-LOGIC.md:77-80) — one `example`, the queue-22
     correction's falsifier.
  5. EmitPrograms stamps read off the named def: `contAddressOf p`
     becomes `hexS (progAddr sha256Addr p).val` — one spelling.
- **Gates**: `lake build`; `emitprograms --check` byte-stable
  (renaming an internal def must not move emitted bytes — if the
  stamp bytes move, the slice is wrong); VectorPrograms cross-host
  run gate stays green.
- **Must not touch**: `Cas/Backend/Mcp.lean` (RunParams already
  speaks PProg; nothing here changes the surface); wire tags.
- **Edges**: after merge/cas-word lands (Defun.lean untouched by the
  branch — verified in the diff — but Lang.lean's import block is;
  start post-merge to avoid the trivial conflict).

### Lane E — CANON-1's theorem pair (Tier-1 item 5 close-out)

- **Objective.** Prove the canonicalization the door already
  performs: idempotence, and address stability under authored
  permutation.
- **Rulings.** Docket Tier-1 item 5 (docket:65-74); the audit's
  CANON-1 (BUILD-MODELING-AUDIT.md:154, §3D(4) :130) and ruling ask
  5 (:178).
- **Verified base** (§1): implementation landed —
  `canonServices = (dedup xs).mergeSort (·.key ≤ ·.key)`
  (EmitLayer.lean:220-221), authoring guards live
  (tools/EmitLayers.lean:229-233).
- **Theorems**: §3, E1/E2. The permutation statement has a genuine
  duplicate-key subtlety (HARD PARTS 5).
- **Gates**: `lake build`; `emitlayers --check` unchanged (theorem
  slices move no bytes).
- **Must not touch**: the `SystemNode` carrier ("this kind still
  means the term it was given", System.lean:96-98); the load path
  (renormalize-on-read is a named defect, System.lean:97-99 citing
  Cas/Core/Canonicalize.lean:40-42).
- **Edges**: none. Smallest lane; a good first Lean slice for the
  batch agent.

### Lane F — The annotation tag, the subject arms, and the tag law (Tier-1 item 7 + grill B)

- **Objective.** One versioning event: mint `AnnotationKindTag` with
  Lean+TS counterparts; settle the remaining subject arm; land
  `tag_trichotomy` and the working-tag register it licenses.
- **Rulings.** Docket Tier-1 item 7 (docket:83-91); SM-9 as
  sharpened (SCHEMA-MATERIALIZATION.md:262-278);
  PLAIN-LANGUAGE ask 5 (:222); proof-grill B (docket:174); the
  working-tag register is Tier-3 work ruled in wave 3 (docket:152).
- **Verified base.** `AnnotationSubject` is ALREADY the five-arm
  union — exchange/git/program/schema/system
  (Cas/Schema/Annotation.lean:127-132), landed by the naming merge
  `e4b5d743`; the `program` arm the docket names is IN. The
  remaining named arm is **`theorem`** — and no addressable theorem
  plane exists to reference (HARD PARTS 6). Annotations reside at
  caller tags today (`pinAnnotationKindTag := 0x41`, "the caller's
  tag", Annotation.lean:161-173); `exchangeKindTag = 0x58` is
  spelled INSIDE the exchange code and is therefore part of the
  fixture's address while remaining an unreserved working tag
  (SM.md:267-278). The tag partition's carriers: the generated
  registry (`src/cas/generated/grammar/kindTags.ts`, emitted from
  `Cas.Grammar.manifestV0`) and the hand half
  (`src/internal/kindTags.ts:38` `ReservedKindTags`); the CLI
  already SAYS working tags out loud (`workingTagNote`,
  bin/cli/commands.ts:455-458 — decision 25's clause, implemented).
- **Slices.**
  1. **The mint, one event**: `annotationKindTag` as a Lean constant
     beside the kind (Annotation.lean) + a row in the reserved set's
     Lean source of truth, projected into `kindTags.ts` — NOT a
     grammar sort (decision 23: new sorts NO; the reserved-tag plane
     is `ReservedKindTags`' and the manifest's `.reserved` machinery,
     kept unpopulated for exactly this — SM.md:543-547). Ratify
     `0x58` for the exchange kind in the same event (SM-9's own
     "one degree more forced"). Both move addresses of nodes put at
     the new tags and of the exchange-referencing codes — the
     versioning event is documented in the schemas/addresses
     receipts exactly as the union widening was
     (Annotation.lean:85-97). Byte choice for the annotation tag:
     propose keeping `0x41` (the suite's standing convention —
     Annotation.lean:161-163, SchemaAnnotation.test.ts) so no stored
     test fixture moves; the operator confirms the byte at review.
  2. **The `theorem` arm: REFUSED for now, on the record.** An arm
     must name a tag (Annotation.lean:44-47); no theorem plane has
     one; minting a plane to feed an arm inverts the consumer-gated
     discipline. The arm lands with the literature emitter's kind
     when E5/the literature slice defines it (PLAIN-LANGUAGE.md:221
     ask 4 is that lane). Recorded as the arm's named blocker, not
     silence.
  3. **`tag_trichotomy`** (§3, B1): the classifier as data, the
     partition proved, the projection gated.
  4. **The working-tag register**: emitted from the same classifier
     — the register of tags the estate uses without rows (0x41
     annotation suite, 0x58 exchange, replay tags per
     src/internal/kindTags.ts:20-38) — each row `#guard`-classified
     `working`. Ratifying a tag later flips the guard red: the
     register is an obligation, not a table (the docket's exact
     demand, :90-91).
- **Gates**: emitgrammar/emitgate/schemas/addresses byte gates; the
  new register's own `--check`.
- **Must not touch**: `Ty` (no sort); `Cas/Backend/Mcp.lean`;
  `Exchange.lean`'s stored fixtures beyond the ratification event.
- **Edges**: slices 1-2 are one versioning event with Lane B1's
  address receipts regenerated once if both land close together
  (coordinate the regen, not the code).

### Lane G — The word registry reconciliation (Tier-1 item 8 + grill D)

- **Objective.** One registered word spelling after the cas_word
  merge, with the non-injectivity theorem as its license and
  prefix-wf as its safety.
- **Rulings.** Docket Tier-1 item 8 (docket:92-98); proof-grill D
  (docket:178).
- **Verified base.** Seat 3's spelling is on merge/cas-word:
  `LogEntry`/`History` (WordWire.lean), `EmitWord.lean` →
  `WordLogSchema.ts`, the seven `since` laws (§0). The witness is
  real: `vectors/shared-chunk.json` carries **5 bindings, 4 distinct
  addresses** (verified by direct count). `Word.toStore` is
  Cas/IR/Word.lean:201; `Word.wf` :149 with `wfFrom_append` :152.
  **PENDING-VERIFICATION**: c7's competing artifact
  ("bindings/next over bindingSchema") was not located in any
  tracked file — it appears to be advice-thread material, not a
  landed spelling. If the merge surfaces no second spelling, the
  reconciliation is a no-op beyond the theorems; the merger confirms.
- **Slices.**
  1. At merge: seat 3's spelling wins wherever both appear; no
     ad-hoc JSON row survives (decision 26 addendum (a),
     SPECS.md:353-361).
  2. `Word.toStore_not_injective` (§3, D1) beside `toStore` in
     Cas/IR/Word.lean — the license: a receipt may carry less than a
     binding BECAUSE the word carries more than the store; history
     is not recoverable from content, so the log is not redundant.
  3. `Word.wf_take` (§3, D2) — prefix-wf: every prefix of an
     admitted history is an admitted history; the paging safety of
     `since`/`next` (a client reading a prefix never holds an
     inadmissible word).
  4. One `#guard` tying the vector witness: the registry's
     shared-chunk word has length 5 and 4 distinct addresses
     (readable off `Cas.Vectors.Registry`'s `blobSharedChunk`,
     tools/EmitPrograms.lean:56-58 names the row).
- **Gates**: `lake build`; `emitword --check` (branch tooling);
  WordLog tests.
- **Must not touch**: the `since` laws (landed, reviewed); the CLI
  history verb's surface.
- **Edges**: strictly after merge/cas-word lands.

### Lane H — The CLI's laws: naming publishes; the resolution theorems; the register laws (grill A + H)

- **Objective.** Land the naming-publishes decision row; theorem-ize
  the phantom-store class; put the two-register agreement on a gate.
- **Rulings.** Docket addendum 1 (docket:212-228), ruled by decision
  28: "NAMING PUBLISHES (roots carry annotations until item 23's
  index exists)". Proof-grill A and H (docket:171-172,183); CLI
  P1–P4 (PROPOSED-LOGIC.md:13-35).
- **Verified base.** Resolution order and its law are prose today:
  bin/cli/store.ts:4-12 ("init is the only creator... The store
  location is host territory — the Lean model deliberately says
  nothing about paths"); `locateStore` :357-386 with exactly the two
  branches P2 names (explicit :368-376, walk-up :385);
  `isStoreRoot` :329. The register seam: VOCABULARY.md is the seed;
  `vocabularyWords` (bin/cli/vocabulary.ts:23-40) is the gated hand
  copy, `test/Cli.test.ts` the gate (vocabulary.ts:4-10). The house
  precedent for "contract as Lean data + guards + TS pin" is
  `Cas/Architecture.lean:44-152`.
- **Slices.**
  1. **The decision row**: "naming publishes; roots carry
     annotations until item 23's index exists" — recorded in
     SPECS.md's decision record (it is decision 28's own clause,
     already at :397-398 — the slice POINTS the naming seat's code
     and VOCABULARY.md's roots gloss ("the addresses published as
     entry points", vocabulary.ts:32) at it, so the `cas ls`
     surprise the reviewer exhibited is a documented behavior with a
     sunset (item 23), not drift). Lands WITH the naming seat's
     merge, after its two blockers are fixed.
  2. **P1/P2, triaged** (§3, A1/A2): the resolution CONTRACT as
     Lean data on the Architecture.lean precedent; the theorems over
     the contract; the TS implementation pinned to the contract's
     decision table by fixture gate. A free-standing Lean model of
     the filesystem is REFUSED (triage argument in §3).
  3. **P3/P4 → gates now, theorems when the carrier exists** (§3,
     H1/H2): `everyday_closure` and `registers_agree` are gated
     differentially at the TS seam today; their Lean statements wait
     for help-as-described-document (VOCABULARY.md:17-21 names that
     rider) — stated as the named dependency, not silently dropped.
- **Gates**: Cli.test.ts (the vocabulary gate); the new
  resolution-fixture gate; every refusal at the A bar.
- **Must not touch**: verb surfaces (no new verbs); `--json` shapes.
- **Edges**: after the naming seat and rescue `dd54bc5f` land.

### Lane I — The refusal taxonomy, unified (Tier-2 item 9 — the one Tier-2 item that is a build)

- **Objective.** One Lean home for refusal identity, projected: TS
  `CasError` tags and the cas-http status table read off it, R11
  byte gate on the mirror.
- **Rulings.** Docket Tier-2 item 9 (docket:102-104), subsuming
  SM-14 (SCHEMA-MATERIALIZATION.md:388-390) and B21.
- **Verified base.** Three live Lean/TS carriers, one wire table:
  `Cas.Lang.Refusal` (Cas/Lang/Interp.lean:28, the run plane);
  `IngestRefusal` (Cas/Schema/Ingest.lean:86, five names, already
  table-ized with `refusalName` at Cas/Backend/Admission.lean:97-105
  and checked name-for-name by the verdicts gate, SM.md:431-443);
  TS `CasError` — seven tagged errors (src/cas/Node.ts:59-114);
  the profile's status table as two exhaustive matchers
  (src/server/Protocol.ts:5,283-293). Transport-plane refusals
  (MalformedBody/MethodNotAllowed/...) are a DIFFERENT plane.
- **Slices.**
  1. **Statement triage**: do NOT collapse the planes into one
     inductive — run refusals, ingest refusals, and store errors
     answer different doors; a single sum type would be a new
     abstraction serving no consumer (decision 2). The unified thing
     is the REGISTER: a described refusal table in
     `Cas/Backend` (Admission.lean's clause-table pattern, :41-48)
     enumerating every refusal family — plane, tag string, everyday
     prose, HTTP status where the wire serves it — with totality
     `#guard`s per plane (every `Refusal` constructor has a row;
     every `IngestRefusal` name matches `refusalName`; the row count
     equals the TS union's arity).
  2. Emit it: the TS `CasError` tag strings and Protocol.ts's status
     matcher read off the generated module; byte gate in `check:cas`
     (exactly `emitgate`'s discipline, SM.md:445-452).
  3. The CLI's refusal prose joins the same table (the A bar's
     mechanical home: defect named, fix named, per row).
- **Theorems**: totality by construction (the `#guard`s ARE the
  proof — decidable, no new theorem machinery); the mirror gate is
  the falsifier.
- **Must not touch**: refusal SEMANTICS (no refusal is added,
  renamed, or re-routed in this lane — identity only); Mcp.lean.
- **Edges**: after merge/daemon-spine (Protocol.ts/http.ts are the
  branch's floor). SM-14's "emptyUnion name available on order"
  stays an order, not taken silently.

### Lane J — The propagation lane (Tier-2 postures into their owning queues)

- **Objective.** Decision 28's closing clause: "Propagation of each
  ruling into its owning spec's queue rides the planning lane."
  Every Tier-2 posture becomes a RULED row in the spec that owns the
  ask, with the docket line and decision 28 cited. One agent, one
  commit series, no code.
- **The table** (posture → owning home → the row's content):

| # | Posture (docket line) | Owning home | Row |
|---|---|---|---|
| 10 | CI freshness (docket:106-109) | BUILD-SEMANTICS.md §8 asks 1-3 (:277-279) | RULED: skipped gen:* OK locally never CI; blake3 contents-hash ON. Mechanism largely landed (S-o-M.md:43-45); **BS-2's fresh-clone-mtime claim stays flagged untested** (BUILD-SEMANTICS.md:278) — one verification slice owed before the row closes (§4 HP-8). |
| 11 | Ledger predicate (docket:109-111) | BOOTSTRAP.md ask 4 (:126) + SPECS.md:7-10 | RULED: the ledger's domain is AUTHORITY DOCUMENTS; one Category-3 SET row per era subtree (the Category 3 table already practices this, SPECS.md:77-90). Unblocks the police lane's gate (BOOTSTRAP.md:124's B7 list can now be judged). |
| 12 | Obligation vocabulary + namespace (docket:112-114) | LANGUAGE-POLICE.md asks 1-3 (:289-291) | RULED as proposed: closed set {owed, obligation, parked, un-parked, discharged, pin pending, sub-obligation}; discharged stays (history over hygiene); SM- prefix binds before any index (the queue rows above already practice SM-n). |
| 13 | Plain-language plane + witness + home (docket:115-118) | PLAIN-LANGUAGE.md asks 1-3 (:218-220) | RULED: register plane is Ast/PProg/Envelope; attested-only-by-witness (the manifestV0 witness discipline extended, PL.md:167); REGISTER.md emitted by an `emitregister` exe, byte-gated; PL-2's mode/order rows ride the identity ruling. R25–R60 are a later host-plane document. |
| 14 | Float ceiling posture (docket:119-121) | SCHEMA-MATERIALIZATION item 15 (:391-401) | RULED: "full Effect Schema coverage" is DECLARED coverage-minus-floats; a float is a versioning event on `Value`, never a patch. The row states the bound where the claim is made (EFFECTS-BACKEND's coverage language gets the one-line pointer). |
| 15 | Upstream defects (docket:122-125) | SM items 13 (:364-387) and 20 (:456-468) | RULED: report both upstream with minimal repros (an operator-visible task — the estate does not post on its own); literal-oneOf excluded from reliance on Effect text generation (the measured address-drift row, :375-387, is the repro); empty struct stays admitted with the hole recorded — no gate can close it, honesty over theater. |
| 16 | Accepted-exception lists (docket:126-129) | BOOTSTRAP.md asks 2,5,6,7 (:124-129) | RULED: every pin drift / excluded gate / gen asymmetry becomes a declared exception WITH REASON or scheduled debt WITH OWNER; the ratchet starts non-green honestly. The concrete lists (9 forward + 8 reverse, the v4.32.0 pin, five excluded gates, gen:effects:research) are the police/bootstrap lanes' first slice inputs. |
| 17 | UI + protocol postures (docket:130-133) | FRONTEND.md asks 2,7,10 (:303,308,311) | RULED: browser tier 1 read-only v0, tier 2 gated behind its own ruling; generated-viewer-default/authored-override ratified; the 2025-11-25 MCP ceiling is a stated pin — **already written on the daemon branch** (SERVING.md:148, merge/daemon-spine); the row points there. 2026-07-28 enters only when a consumer demands statelessness. |
| 18 | Build hygiene (docket:134-136) | BUILD-SEMANTICS asks 6,7,8 (:282-284) | RULED: build steps authored+emitted, never recovered; mise task `cache` refused BY NAME with the reason on the record; `surface` gets its own task + cadence (it is 77% of check:cas's real work, BS.md:284). The surface split is one mise.toml slice, owner: bootstrap lane. |
| 19 | Libfree second grill (docket:137-141) | dsl-proposal.md D2-D10 (:1659-1764) + SPECS.md Category-2 row | RULED: each recommendation as it stands, with two counters elevated: D4 — word-gate ceremony on emitted files adds no evidence, L3 suffices (take the counter); D9 — free-fixture authoring is Goodhart pressure; decoys require a second author's sign-off. |
| 20 | Replay reactivation before Utterance (docket:142-143) | SM item 25 (:521-527) + PLAIN-LANGUAGE ask 6 (:223) | RULED: yes — the dormant effect-replay vocabulary is reactivated BEFORE any Utterance slice; no Utterance slice starts first. |
| 21 | SM small postures (docket:144-149) | SM queue | One-liners, each on its own row: 1 ratify the admissible-subset table (:126-143); 3 Integer = rev-1 bare isInt canonical (spelling only, :204-207 + :453-455); 4 brands YES escape hatch (:207-209); 7 ratify the three adopted rows (:255-258); 8 stays open by construction (:259-261); 12 promote the wire-identity table to REGISTRY.md (:360-362); 15a ratify the derived-union tag-string sort (:227-233). |

- Also rides here: POLICE asks 5-8 confirmations (docket:164-167 →
  LANGUAGE-POLICE.md:293-296) and the stale-defect strike (POLICE
  ask 9, :297 — SM.md:608's line is already struck through;
  verify-and-close).
- **Gates**: none mechanical — the SPECS.md maintenance law
  (SPECS.md:12-17): each row lands in the owning spec and, where the
  spec's domain has an AGENTS.md pointer, in the same change.
- **Edges**: item 17's row after merge/daemon-spine; everything else
  immediate. This lane is deliberately boring: it is bookkeeping
  with citations, and it prevents every future sweep from re-asking
  answered questions.

---

## 3. The proof-grill batch — statements, decompositions, falsifiers

Commissioned as one Lean batch (docket:170-185), statement triage
first. Landed items E and F are struck (§1). House acceptance for
every slice: `lake build` green, `#print axioms` clean, no `sorry`,
witnesses `decide` where claimed, byte gates unmoved unless the
slice's contract says which bytes move.

### A — `only_init_creates` + `locate_preserves_roots` (Lane H)

**Triage — three candidate homes, one pick.**
1. *A Lean model of the CLI over a modeled filesystem.* REFUSED:
   store.ts:11-12 rules paths host territory; a filesystem model is
   a new carrier with no other consumer (decision 2), and it would
   drift from the real resolution code it claims to govern.
2. *TS property tests only.* REFUSED as the whole answer: the docket
   commissions the class "theorem-ized"; a test exhibits, it does
   not state.
3. **PICK: the contract-as-data pattern of `Cas/Architecture.lean`**
   (:44-152 — capabilities as Lean data, `#guard`s over the
   composition, a shared pin confronted by the TS suite). A
   `resolution` table in Lean states the decision function
   abstractly; the theorems are proved OVER the table; the TS
   implementation is pinned to the table's decision rows by a
   fixture gate (MemoryFsHarness exists —
   test/MemoryFsHarness.ts).

**Statements.** Over an abstract host state `s : HostState` (a
finite set of paths marked store-roots — data, not a filesystem) and
the verb table `V` (one row per CLI verb, each row carrying its
declared store-set effect):

- `locate_preserves_roots :
   ∀ (explicit : Option Path) (s : HostState) (r : Path),
     locate explicit s = some r → r ∈ s.storeRoots`
  — proved by cases on the two branches (explicit: the candidate is
  answered only under `isStoreRoot`; walk-up: every candidate tested
  by the same predicate). The bug class was exactly the branches
  disagreeing (PROPOSED-LOGIC.md:20-24).
- `only_init_creates :
   ∀ (v : Verb) (s s' : HostState), v ≠ .init →
     step v s = s' → s'.storeRoots = s.storeRoots`
  — proved row-by-row over the verb table: every non-init row's
  effect is declared roots-preserving, and `step` is the table's
  fold. The theorem's real content is that the TABLE is total over
  the shipped verbs — an added verb with an undeclared effect fails
  the totality `#guard`, which is the regression the phantom store
  was (PROPOSED-LOGIC.md:13-18).

**Needs from existing code**: the verb list (bin/cli/commands.ts —
init :185, status :324, ls :379, show :410, put :602, run :671,
publish :713, serve :762, doctor :1040, verify :1119, history on the
cas-word branch, daemon on the daemon branch); `locateStore`'s two
branches (store.ts:357-386); `isStoreRoot` (:329).

**Falsifiers**: the pre-fix `put` over a non-root path (the live
counterexample the CLI audit found — CLI-AUDIT.md's PHANTOM STORE);
for the gate, a fixture where an explicit `--store` names a
non-store and the harness asserts refusal, not creation (decision
25's ruled behavior).

### B — `tag_trichotomy` (Lane F)

**Statement.** Define the classifier as data, not a predicate
triple:

```
inductive TagClass | registered | working | refused
def TagClass.of (t : UInt8) : TagClass
```

reading the grammar manifest: a ratified row → `.registered`; a held
`.reserved` row → `.refused`; no row → `.working`. Then:

- totality + exclusivity are BY CONSTRUCTION (a function into a
  three-arm inductive) — the docket's `registered ∨ working ∨
  refused, exclusive` (PROPOSED-LOGIC.md:37-41) needs no disjunction
  proof, and stating it as one would be weaker than the definition;
- the CONTENT is the agreement obligations:
  `#guard ∀ t, (TagClass.of t = .registered) = (Ty.ofTag t).isSome`
  (decidable over 256 cases), and the projection gate — the emitted
  class table IS what `src/internal/kindTags.ts:38`'s
  `ReservedKindTags` and the generated
  `grammar/kindTags.ts` are derived from, byte-gated.

**Needs**: `Cas.Grammar.manifestV0` + `Ty.ofTag`
(Cas/Grammar/Sorts.lean; the `.reserved` machinery kept unpopulated,
SM.md:543-547); the value door's refusal of registered tags
(src/cas/Value.ts:394).

**Falsifier**: the working-tag register (Lane F slice 4): a tag the
estate uses without a row `#guard`s `working`; ratifying it flips
the guard red — the register is the standing counterexample
generator. Names the E19 stderr note in the model (paperwork D6,
docket:17).

### C1 — `progAddr_inj` (Lane D)

**Statement** (PROPOSED-LOGIC.md:59-64, confirmed against the
carriers):

```
def progAddr (H : Bytes → Addr32) (p : PProg) : Addr32 :=
  H (encodeNode (tableNode H p))

theorem progAddr_inj (hInj : Function.Injective H)
    {p q : PProg} (hp : ∀ l ∈ p, l.WF) (hq : ∀ l ∈ q, l.WF)
    (hlp : p.length < 4294967296) (hlq : q.length < 4294967296) :
    progAddr H p = progAddr H q → p = q
```

**Decomposition.**
1. `hInj` collapses the outer digest:
   `encodeNode (tableNode H p) = encodeNode (tableNode H q)`.
2. `encodeNode_injOn` (Cas/Codec/NodeCodec.lean:268) needs
   `Node.WF` of both table nodes — a `tableNode_wf` lemma is the
   first new carrier: payload is the nat32 line count
   (bounded by `hlp`), refs are `lineAddr`s (32-byte by
   construction), count bounded. (Verify while building: whether an
   `encodeProg_wf`-adjacent lemma already carries this —
   Defun.lean:847-913 region. PENDING-VERIFICATION at slice time.)
3. Equal table nodes → equal ref lists, pointwise
   `lineAddr H lᵢ = lineAddr H l'ᵢ` and equal lengths.
4. Per line: `lineAddr H l = H (encodeNode (encodeLine l))`
   (:836-839, :578), so `hInj` + `encodeNode_injOn` (needs
   `encodeLine`'s node WF under `PLine.WF` — second small lemma) give
   `encodeLineBody l = encodeLineBody l'`, and the line round trip
   (`readLine_exact` :764 with the landed
   `readLine`/`encodeLineBody` agreement) gives `l = l'`.
5. `List.ext`-style zip closes `p = q`.

**Falsifier**: drop `hInj` and the statement is false — a constant
`H` gives every program one address; the estate already exhibits the
style at the hsep witness (Defun.lean:1015-1053). The premise
placement (injectivity of H, not separation) is the point: this is
the STATEMENT the host asserts ("the address is the program's
identity") under the standing digest assumption, not a new trust
claim — SHA-256 injectivity is never proved, exactly as
`Cas/IR/Word.lean:222-224` already postures ("no digest injectivity
premise is assumed for SHA-256"; the runtime boundary checks).

### C2 — `lineAddr_sep_of_injective` (Lane D)

```
theorem lineAddr_sep_of_injective (hInj : Function.Injective H)
    {p : PProg} (hwf : ∀ l ∈ p, l.WF) :
    ∀ l ∈ p, ∀ l' ∈ p, lineAddr H l = lineAddr H l' → l = l'
```

Decomposition = step 4 of C1 alone. No `Nodup` premise — equal
lines are trivially fine (PROPOSED-LOGIC.md:66-69). Consumers
(`decodeProg_encodeProg` :1000, its run corollary :1053, the tail
corollary :2116) gain injective-H forms and stop threading `hsep`;
the raw `hsep` forms REMAIN (they are strictly weaker premises and
the necessity witness :1015 depends on having them).

### C3 — `decodeProgAt` (Lane D; ranking item 2's decode direction)

**Statement** (PROPOSED-LOGIC.md:70-75): a store-shaped decoder —
`decodeProgAt (w : Word) (root : Addr32) : Option PProg` — lookup
the cont node at `root` in `w`, read its lineCount and ref list,
resolve each step node by `Word.find`, `readLine` each; with

```
theorem decodeProgAt_encodeProg (hInj : Function.Injective H)
    {p : PProg} (hwf : …) (hlen : …) :
    decodeProgAt (encodeProg H p ++ v) (progAddr H p) = some p
```

(the `++ v` form matters: recovery from a LARGER word — the store a
host actually holds — via `Word.find_append_of_some`,
Cas/IR/Word.lean:62). Under C2 the separation premise is discharged.
This makes `cont.lineCount` load-bearing in Lean; today the TS
decoder is its only consumer — host policy wearing a law's look.
**Falsifier**: `decodeProg` cannot be implemented against a store
(`getLast` has no store meaning — PROPOSED-LOGIC.md:82-84); if
`decodeProgAt` ends up needing the word's tail order, the design is
wrong and the slice stops.

### D1 — `Word.toStore_not_injective` (Lane G)

```
theorem toStore_not_injective :
    ∃ w₁ w₂ : Word, w₁ ≠ w₂ ∧ Word.toStore w₁ = Word.toStore w₂
```

**Decomposition**: witness `w₁ = [⟨a, n⟩]`, `w₂ = [⟨a, n⟩, ⟨a, n⟩]`;
inequality by length; function equality by `funext` + unfolding
`find` (:56): both answer `some n` at `a`, `none` elsewhere — a
two-case `by_cases` on `b = a`. The vector-scale witness
(shared-chunk, 5 bindings/4 addresses — verified) is pinned by
`#guard` beside it (Lane G slice 4), tying the abstract theorem to
the registry fixture. **License reading, stated in the docstring**:
the word is strictly more than the store (history ≠ content), which
is (i) why `since` exists as an operation rather than a store
query, and (ii) why a `LogEntry` receipt may carry less than a
binding — the join `log ⋈ store` recovers it (WordWire.lean, branch).

### D2 — `Word.wf_take` (Lane G)

```
theorem wf_take {w : Word} (h : wf w = true) (n : Nat) :
    wf (w.take n) = true
```

**Decomposition**: `w = w.take n ++ w.drop n`
(`List.take_append_drop`); `wfFrom_append` (Cas/IR/Word.lean:152)
splits the scan; first conjunct is the goal. Three lines.
**Falsifier**: none expected — wf is a prefix-closed scan by
construction; if this fails, `wfFrom` is not the scan the docstring
claims, which would itself be a finding.

### E1/E2 — CANON-1's pair (Lane E)

```
theorem canonServices_idem (xs : List ServiceRef) :
    canonServices (canonServices xs) = canonServices xs

theorem canonServices_perm {xs ys : List ServiceRef}
    (hnd : (xs.map (·.key)).Nodup) (hperm : xs.Perm ys) :
    canonServices xs = canonServices ys
```

**Decomposition (E1)**: `dedup` output has `Nodup` keys (lemma on
`hasKey`/`dedup`, EmitLayer.lean:198-206); `dedup` is the identity
on Nodup-key lists; `mergeSort` output is a permutation, preserving
Nodup; `mergeSort` is idempotent on sorted input (toolchain lemmas:
`List.mergeSort_eq_self`-family / sorted-of-mergeSort; verify names
at slice time against the pinned toolchain).
**Decomposition (E2)**: with Nodup keys, dedup xs ~perm~ xs; sorting
two key-Nodup permutations by a total key order yields one list —
needs antisymmetry-on-keys lifted to `ServiceRef`, which the Nodup
premise supplies (equal keys → same element). **The Nodup premise is
load-bearing and honest**: with duplicate keys carrying DIFFERENT
refs, `dedup` keeps the later occurrence (:203-206), so permutation
can change WHICH ref survives — E2 is FALSE without it (HARD PARTS
5; the falsifier is that two-element example, stated as a
counter-`example` beside the theorem, house style).
**Corollary (the docket's falsifiable claim)**: address stability —
two authored orders of one key-Nodup service set produce equal
`SystemNode` terms after the authoring door, hence one address
(`addr` is a function of the encoded node; no new address theory
needed). The `#guard`s in tools/EmitLayers.lean:229-233 stay as the
elaboration-time enforcement; the theorems license them.

### G — `runS_scoped` (SPEC-2) — GATED, not started

SPEC-2's statement (`runS_scoped q w = runS q w`,
BUILD-MODELING-AUDIT.md:148) quantifies over an L-S carrier that
DOES NOT EXIST: `SProg` is designed, owed
(Cas/Lang/Fragments.lean:106-161), and its first consumer is named
(`agentStep`, ruling P7, Fragments.lean:150-155). Sequencing is
therefore forced: L-S carrier + embedding theorems (`L-A ↪ L-S`,
`L-S ↪ L-P`, Fragments.lean:143-149) land first, SPEC-2 rides them.
This plan does NOT commission L-S — it is its own slice with its own
manifest-version consequences (Fragments.lean:156-161) and the
docket stages it after the batch. What this batch DOES land now:
**the refusal on the record** — SPEC-1's "free speculation" equality
is FALSE AS DESIGNED (the word is the observation; `put` appends;
`ObsEq` does not quotient the success word —
BUILD-MODELING-AUDIT.md:94,146) — recorded as a REFUSED row in
STATE-OF-MECHANIZATION's L0 list (already drafted there, :92) and in
the Fragments.lean L-S section's owed-theorems note. No document may
claim selective gives speculation for free; the refusal row is the
citation target.

### H1/H2 — `everyday_closure` + `registers_agree` (Lane H; staged after A–G per docket:183)

**Triage.** Both quantify over RENDERERS (bin/cli/render.ts, the
per-verb prose/JSON pairs). Modeling TypeScript renderers in Lean is
the P3 hard part the proposer already flagged
(PROPOSED-LOGIC.md:29). Candidates:
1. *Lean model of the renderers* — REFUSED for now: model drift
   against live TS with no shared carrier; no consumer for the model
   besides the theorem.
2. **PICK (staged)**: (i) NOW — the differential gate at the TS
   seam: per verb, extract a common fact record from both registers
   and assert equality (`show` recorded as the deliberate exception
   — its `--json` is the canonical document, PROPOSED-LOGIC.md:34);
   extend the existing vocabulary gate (test/Cli.test.ts over
   vocabulary.ts:23-40) from word-list agreement to
   output-closure: every word a renderer emits on the everyday
   surface is in the register. (ii) THEN — when help/refusal
   surfaces become described documents (VOCABULARY.md:17-21's rider:
   "help is a described document, loaded and rendered"), the Lean
   statements become theorems over those documents' codes — the
   carrier exists at that point and the theorem is cheap. The
   dependency is NAMED (the rider's slice), not assumed.

**Falsifier for the gate**: F2-class drift — a renderer emitting a
protocol word unprompted; the CLI audit's E-transcript found the
class live (CLI-AUDIT.md, F1-F5).

### Addendum — Lane A's theorem obligations (C6-WF), stated here for one batch home

- `references_guarded_decidable`: the document's references table
  induces a finite edge relation; the admission check decides
  "every cycle passes through a `susp`" (equivalently: the
  non-suspend edge relation is acyclic) by a fuel-bounded DFS whose
  fuel is the table's size. Decidability is the theorem; the check
  IS the door.
- Round trip: `ofRepresentationJson`/`toRepresentationJson` extended
  per constructor exactly as every Slice-C growth before it
  (SM.md:169-174 names the ripple list; the SelfCodec round-trip and
  RepNormal obligations extend by one case each).
- **Deliberately NOT stated**: denotational adequacy for recursive
  codes (El over `susp`) — v1 refuses the claim; see HARD PARTS 2.
- Cross-door recursive-value agreement (verdict triples for
  recursive schemas) is bounded to ADMISSION agreement in v1; value
  triples for recursive codes need fuel-indexed Lean decode and are
  the named follow-on.

### Deliberately not commissioned (the docket's own exclusion, kept)

RESID-1's stronger form — "the emitted layer provides exactly
`residual.provides`" crosses the language boundary; DESIGN.md:362-365
rules the estate GATES there, never proves. Only the weaker internal
statement (resolveAll order-independence up to children-first;
residual monotone under provision — BUILD-MODELING-AUDIT.md:150) may
ever be stated, and it is NOT in this batch: EmitLayer's differential
gate (12/12, S-o-M.md:37) is the operative evidence and no consumer
demands the internal theorem yet.

---

## 4. HARD PARTS — where this plan cannot yet be honest

Named per the mandate. Each carries what would make it honest.

1. **The annotation-bag growth's true size is measured, not assumed
   — and the corpus-scale number does not exist yet.** Verified: the
   bag rides essentially every representation node family and the
   checks layer in the pinned source (SchemaRepresentation.ts:147-
   1048), so "grow the decoder" is NOT a decl-field patch. What no
   instrument measures today: how many WILDTYPE schemas carry
   non-empty bags, per family (the verdicts corpus is Lean-emitted —
   blind by its own record, SM.md:476; parser-census counts TS
   declarations, not representation nodes). Lane B1 slice 1 builds
   the probe; until it runs, the wrapper-vs-restricted-scope choice
   in slice 2 is a proposal, and the plan says so. Corpus-scale
   truth arrives only with OXC ingestion and is stamped provisional.
2. **C6 denotation.** `El` is a closed structural function; a
   reference's target lives OUTSIDE the code (in the references
   table / the store). Extending denotation to `susp` needs either
   fuel-indexed semantics or store-relative El — both real theory,
   neither commissioned. v1's honest line: Lean proves
   decode/encode/guardedness; LIVE validation of recursive schemas
   is the TS door's (`fromRepresentation` handles `Schema.suspend`
   natively, SM.md:60-62), gated differentially at admission only.
   The value-plane verdict gap for recursive codes is a KNOWN,
   RECORDED hole in v1 — the SM-20 posture (honesty over theater)
   applied in advance.
3. **The CLI theorems' carrier does not exist.** P1/P2's pick (§3 A)
   rests on the Architecture.lean contract-as-data pattern; the
   verb-effect table is NEW data (small, but new — defensible under
   decision 2 only because it is a statement of shipped behavior,
   not machinery; the hard review should check this judgment).
   P3/P4's Lean forms are honestly BLOCKED on
   help-as-described-document; the plan stages gates now, theorems
   then. If the review rejects the verb table as an abstraction,
   the fallback is fixture-gates only and the docket's
   "theorem-ized" is renegotiated with the operator — flagged, not
   fudged.
4. **Prop canonical spelling (ranking item 7) — flagged HARD,
   deliberately unplanned.** The Described-analogue for propositions
   drags universe polymorphism, implicit-argument canonicalization,
   and defeq-vs-syntactic identity — the load-bearing unknown c7
   named (docket:201-203). This plan commissions ONLY a
   statement-triage scout: enumerate 3 candidate carriers (deep
   embedding of a Prop fragment; the literature emitter's row as the
   proposition's registered spelling; theorem-as-content via its
   STATEMENT's pretty-printed canonical form + `#guard`ed
   elaboration), each with its defeq hazard named, and STOP. No
   carrier is minted. Anything more before that scout reports is
   dishonest planning.
5. **CANON-1's permutation theorem is false without Nodup keys.**
   `dedup` keeps the later duplicate (EmitLayer.lean:203-206), so
   two orders of a duplicate-key list can canonicalize differently.
   The honest theorem carries the Nodup-keys premise and the
   counter-example beside it (§3 E2). The authored fixtures satisfy
   the premise (the elaboration guards would have caught a
   duplicate); the door does NOT enforce it for arbitrary callers —
   whether it should is a one-line ruling the hard review should
   flag to the operator.
6. **The `theorem` arm has no plane.** Docket item 7 says "add
   program/theorem arms"; `program` is landed (verified,
   Annotation.lean:130), and a `theorem` arm cannot be spelled — an
   arm names a tag (Annotation.lean:44-47) and no theorem-plane tag
   exists. Lane F refuses the arm on the record and ties it to the
   literature emitter's future kind. If the operator intended
   otherwise, that is a divergence to surface, not resolve (C2).
7. **The word-registry "conflict" may be a ghost.** c7's competing
   spelling was not found in any tracked artifact
   (PENDING-VERIFICATION, Lane G). If it exists only in an advice
   thread, item 8 reduces to landing the theorems — cheaper than
   docketed. The merger confirms at merge time.
8. **BS-2's fresh-clone-mtime mechanism is still untested.**
   BUILD-SEMANTICS.md:278: "I reasoned the third from mise's source,
   I did not test it." The forced `gen:ci` mirror landed and fired
   correctly twice (S-o-M.md:43-45), which is a DIFFERENT mechanism
   from the mtime claim. Lane J's row 10 closes only after a
   fresh-clone verification run — one CI slice, already the
   RELEASING.md floor (check:ci-on-fresh-clone), so the verification
   may be as cheap as reading tonight's package-seat CI receipt.
   PENDING-VERIFICATION either way.
9. **`tableNode`'s WF lemma is assumed present-or-cheap** (§3 C1
   step 2). If the encodeProg region does not already carry it, it
   is a bounded-arithmetic lemma — small, but the plan has not read
   every line of the 2200-line module and says so.

---

## 5. Decision 30 — the productization question, answered from the surfaces

Decision 30 (SPECS.md:411-417): harness and productize the
algebraic-effect coding semantics for real developers doing
AI-driven development; no compromise on the sanctity of rigor;
software exists to abstract complexity — name where that calling is
met and where more of the complexity of design, language, and
operations is conquered. Answered from what EXISTS, each conquest
with its cost.

**The thesis the surfaces already embody**: the developer's trust
object is the content address, and every convenience is a projection
of proved carriers. That is the abstraction-of-complexity move
nobody else makes: not hiding complexity behind a service, but
DISCHARGING it into gates so the surface can afford to be simple.

**Conquest 1 — setup and environment: the doctor + emitted ledgers +
emitted agent configs.** `cas doctor` is a runtime READER of four
emitted ledgers — Environment/Law/Obligation/Admission
(bin/cli/ledgers.ts:55-104): "a ledger says what it says, and this
verb never re-derives, never invents" (:13-16). A developer — or
their agent — asks one verb what this store is and what the lab has
proved, and the answer is generated paperwork, not documentation.
FE-1 (emitagents — FRONTEND.md:309, S-o-M.md:73-74) extends the
same conquest to agent onboarding: four MCP client configs emitted
and byte-gated from `cas-tools.json` + `ENVIRONMENT.json`; pi gets a
CLI skill, not a fabricated MCP row. *Cost*: FE-1 is a ready slice
(both inputs gated, no ruling needed); the ledgers' currency rides
`check:cas`, already paid.

**Conquest 2 — the refusal that teaches: the A bar as product.**
Every refusal answers at grade A — everyday register, defect named,
fix named (decision 25) — and the vocabulary is CONSUMER-GATED: a
word enters `--help` only when a verb speaks it (VOCABULARY.md:26-31),
with the hand copy gated against the seed (vocabulary.ts:4-10,
test/Cli.test.ts). For AI-driven development this is load-bearing:
an agent's recovery loop is only as good as the error text, and here
the error text is a governed register. *Cost*: Lane I gives refusal
identity one generated home (statuses, tags, prose); the everyday
closure gate (§3 H1) keeps registers from drifting. Both are
in-plan.

**Conquest 3 — receipts over logs: history as semantics.** With
cas-word landed, "what happened" is an OPERATION of the language
(`since`, with proved suffix/cursor laws — Worded.lean) and a
receipt document (`cas history --json`: seq/at/address/tag/size,
`next` never client-computed — WordWire.lean). The word is the
trace (decision 20); the log stream is the daemon's floor
(SERVING.md:200, branch). A developer debugging an agent's run
replays receipts against content, not grep against prose. *Cost*:
already merging tonight; Lane G's theorems license the receipt's
economy (it may carry less than a binding because history is not
content — D1's docstring clause).

**Conquest 4 — generated code that can prove what it projects.**
Every generated program module is STAMPED with the content address
of the term it projects (R7's stamp clause, discharged —
tools/EmitPrograms.lean:72-103), lowered through the same `PProg`
the decoder answers (EmitProg.lean:22-30), and cross-host run-gated
binding-for-binding (S-o-M.md:26). Codegen's classic complexity —
"is this generated artifact still the thing?" — is conquered by
digest check, not by review. *Cost*: Lane D names `progAddr` so the
stamp reads off a law; the 27g codegen full push inherits the gate
discipline for free.

**Conquest 5 — the pre-execution audit: programs refused by
envelope, not sandboxed after damage.** A submitted L-A table's read
set, write shapes, and dataflow closure are computed WITHOUT running
(`PProg.envelope`), and the frame condition is now proved for every
run, refusing runs included (`runP_frame_sound`, Defun.lean:1965;
interop contract Fragments.lean:195-238). This is decision 16's
code-mode story made safe: submission → envelope → grant check →
run; the gates carry all trust, so an agent's generated program is
ADMITTED, never merely trusted. No mainstream AI-dev stack has a
statically-decidable effect budget for model-proposed programs.
*Cost*: L-A only today (no branches) — the L-S rung with `agentStep`
as consumer is the priced growth (Fragments.lean:150-161); honest
until then: branchy plans stay host code.

**Conquest 6 — one identity across host languages: the MCP that
speaks typed operations.** The tool table is Lean data; the manifest,
the typed TS table, and the served handlers are one value projected
(S-o-M.md:32: "boot gate refuses drift"); the served surface after
tonight is stdio + daemon HTTP on one port with policy honored per
transport (SERVING.md:20-95, branch). Decision 18's direction —
tools are operations; plans become store-resident programs — is the
same conquest extended. *Cost*: the Mcp.lean fence and
manifest-version-by-ruling ARE the cost discipline; paid by
governance, not code.

**Where the calling is NOT yet met — the honesty list, cited**:
floats refuse at the door ("full coverage" is coverage-minus-floats
— Lane J row 14; SM.md:391-401); by-address program RECOVERY in
Lean is owed (C3 — a saved program should re-run from the store
under a proved decoder, not host policy); the browser store is
tier-1 read-only by ruling (FRONTEND.md:303); prose registers E2/E5
(verdict notes, the literature) are owed (S-o-M.md:103-105); and
"intelligible and usable" is UNMEASURED — the dogfood waves exist
to answer it (decision 24) and no productization claim outruns
them.

**The standing question, answered in one line**: where the estate
meets the calling is exactly where a complexity is conquered BY A
GATE a developer can re-run — address, envelope, receipt, ledger,
register; where more remains is wherever a claim would still need a
person's memory — and every such place above carries a named lane.

---

## 6. Sequencing — the dependency graph

```
tonight:  merge/daemon-spine ──┐
          merge/cas-word ──────┼── the floor (verify SPECS.md:385-417 survives)
          naming seat (2 fixes)┘
             │
§1 strikeout commit (docket + S-o-M rows) — first, so no lane re-plans landed work
             │
now (touch nothing the merges carry):
  Lane E (CANON-1 theorems)      — smallest; batch warm-up
  Lane A (C6 references)          — longest pole in the schema plane
  Lane B1 (annotation bag)        — slice 1 measurement immediately
  Lane B2 (D1 six asks + table)   — records + census stamps
  Lane C (RootStore ruling rows)  — includes SM-31 paired row
  Lane J (propagation)            — all rows except item 17's
post-merge:
  Lane D (progAddr/lineAddr_sep/decodeProgAt)   — after cas-word
  Lane G (word theorems + reconciliation check) — after cas-word
  Lane I (refusal register)                     — after daemon-spine
  Lane J item-17 row                            — after daemon-spine
post-naming-seat:
  Lane H (naming publishes; resolution contract; register gates)
staged after the batch (docket's own order):
  H1/H2 Lean forms (on help-as-described-document)
  L-S carrier → SPEC-2 (consumer: agentStep)
  Prop-spelling scout (statement triage only)
```

Cross-lane regeneration discipline: Lanes A, B1, F each move schema
receipts (`schemas/*.json`, `addresses.json`); they coordinate regen
order at merge, never share a working tree, and each declares its
byte-gate delta in its landing message (the backend-materialize
skill's law). All Lean work under the production method of decision
26's second addendum: statement triage, the axiom trio, citations,
ledgers regenerated, every gate green — evidence is the license.
